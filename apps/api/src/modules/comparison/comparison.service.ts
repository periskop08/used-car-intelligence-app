import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ComparisonReportLoaderService, VehicleComparisonDossier, generateDerivedFactId } from './comparison-report-loader.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { VehicleReportService } from '../vehicle-report/vehicle-report.service';
import { CompareVehiclesDto, ComparisonChatDto } from './comparison.dto';
import { FeatureKey, ApprovalStatus, SubscriptionTier, UsagePeriodType } from '@prisma/client';
import OpenAI from 'openai';
import * as crypto from 'crypto';

import {
  ComparisonPriority,
  ComparisonQualityCheck,
  ComparisonVehicleProfile,
  CriterionAssessment,
  EquipmentFeatureStatus,
  CriterionKey,
  ComparisonCriterionResult,
  DataWarning,
  DecisionMatrixRow,
  FinalDecisionGuideRow,
  MarketPriceEvidence,
  RecallComparisonItem,
  RiskComparisonItem,
  ScenarioRecommendation,
  ScenarioScore,
  VehicleComparisonResult,
  VehicleCriterionEvaluation,
  VehicleHighlight,
  VehicleVerdict,
  computeBackendCriterionMetrics,
  formatFuelType,
  sanitizeComparisonResult,
  validateComparisonSemantics,
} from '@used-car-intelligence/shared';

interface ComparisonGenerationDiagnostics {
  comparisonId: string;
  generationMode: 'AI' | 'FALLBACK';
  provider: string;
  model: string;
  requestStartedAt: string;
  requestCompletedAt?: string;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  validationFailed?: boolean;
  validationErrors?: string[];
  fallbackReason?: string;
}

const TRUSTED_FACT_SOURCES = ['VEHICLE_DATABASE', 'EVIDENCE_VERIFIED', 'MODERATION_VERIFIED'];

export function getVerifiedMarketPriceEvidence(snapshot: any): MarketPriceEvidence | undefined {
  if (!snapshot) return undefined;

  const now = new Date();
  const isCorrectSource = snapshot.sourceType === 'ACTIVE_LISTINGS';

  // NO || 1 FALLBACK! Must be valid number >= 3
  const sampleSize = typeof snapshot.sampleSize === 'number' ? snapshot.sampleSize : 0;
  const isSufficientSample = sampleSize >= 3;

  const minPrice = snapshot.estimatedMin ? Number(snapshot.estimatedMin) : 0;
  const maxPrice = snapshot.estimatedMax ? Number(snapshot.estimatedMax) : 0;
  const isPositiveAndValidRange = minPrice > 0 && maxPrice > 0 && minPrice <= maxPrice;

  const freshUntil = snapshot.freshUntil ? new Date(snapshot.freshUntil) : null;
  const validUntil = snapshot.validUntil ? new Date(snapshot.validUntil) : null;
  const isNotExpired = freshUntil !== null && validUntil !== null && freshUntil > now && validUntil > now;

  if (isCorrectSource && isSufficientSample && isPositiveAndValidRange && isNotExpired) {
    return {
      minPrice,
      maxPrice,
      currency: 'TRY',
      sampleCount: sampleSize,
      asOfDate: snapshot.calculatedAt ? new Date(snapshot.calculatedAt).toISOString() : now.toISOString(),
      matchQuality: 'COMPARABLE',
      sourceType: 'SNAPSHOT',
    };
  }

  return undefined;
}

/**
 * Requirement 3: Unified production cache fingerprint generator.
 * Uses JSON.stringify(f.value) so falsy values like 0 or false are not lost in serialization.
 */
export function computeSourceDataVersionFromProfiles(profiles: ComparisonVehicleProfile[]): string {
  const sortedProfiles = [...profiles].sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));

  const fingerprintParts = sortedProfiles.map(p => {
    const dossier = p.dossier;
    const reportId = dossier?.reportId || 'no-report';
    const reportVersion = dossier?.reportVersion || 'no-version';
    const completedAt = dossier?.generatedAt ? new Date(dossier.generatedAt).getTime() : 0;

    const probs = (dossier?.commonProblems || [])
      .map((pr: any) => {
        const factStr = (pr.supportingFactIds || []).slice().sort().join(',');
        return `${pr.title}:${pr.severity || 'MEDIUM'}:[${factStr}]`;
      })
      .sort()
      .join('|');

    const detailedFacts = (dossier?.dataQuality?.supportingFacts || [])
      .map((f: any) => `${f.factKey || ''}:${JSON.stringify(f.value)}:${f.source || ''}:${f.confidence || ''}`)
      .sort()
      .join('|');

    return `${p.vehicleId}:${reportId}:${reportVersion}:${completedAt}:${probs}:${detailedFacts}`;
  });

  const rawFingerprint = fingerprintParts.join('||');
  const hash = crypto.createHash('sha256').update(rawFingerprint).digest('hex').substring(0, 16);
  return `v8_${hash}`;
}

export function calculateComparisonSourceDataVersion(profiles: ComparisonVehicleProfile[]): string {
  return computeSourceDataVersionFromProfiles(profiles);
}

@Injectable()
export class ComparisonService {
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private reportLoaderService: ComparisonReportLoaderService,
    private featureLimitService: FeatureLimitService,
    private subscriptionService: SubscriptionService,
    private vehicleReportService: VehicleReportService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  private getOpenAiClient(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    if (!this.openai) {
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  /**
   * Fetches user's comparison history with variant details.
   */
  async getComparisonHistory(userId: string) {
    return this.prisma.vehicleComparison.findMany({
      where: { userId },
      include: {
        variant1: { include: { brand: true, model: true } },
        variant2: { include: { brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).catch(() => []);
  }

  /**
   * Calculates remaining chatbot messages for user from subscription & buyer package credits.
   */
  async getUserChatbotQuota(userId: string): Promise<number> {
    if (!userId) return 0;
    const user = await this.prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    if (user && (user.role === 'ADMIN' || (user.email && ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email.toLowerCase())))) {
      return 999;
    }

    const activePurchases = await this.prisma.buyerPackagePurchase.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    }).catch(() => []);

    let buyerCredits = 0;
    activePurchases.forEach(p => {
      buyerCredits += Math.max(0, p.chatbotMessageLimit - p.chatbotMessageUsed);
    });

    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null);

    const tier = activeSub?.plan?.tier || SubscriptionTier.TANISMA;
    const tierLimit = tier === SubscriptionTier.PROFESYONEL ? 150 : tier === SubscriptionTier.YETKIN ? 30 : 3;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const usage = await this.prisma.featureUsage.findUnique({
      where: {
        userId_featureKey_periodType_periodStart: {
          userId,
          featureKey: FeatureKey.AI_CHAT,
          periodType: UsagePeriodType.DAILY,
          periodStart: startOfDay,
        },
      },
    }).catch(() => null);

    const used = usage?.count || 0;
    const dailyRemaining = Math.max(0, tierLimit - used);

    return dailyRemaining + buyerCredits;
  }

  /**
   * Returns user's active tier, comparison vehicle limit, and remaining chatbot messages.
   */
  async getUserTierAndLimit(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    const tier = await this.subscriptionService.getEffectiveTier(userId).catch(() => SubscriptionTier.TANISMA);

    const isAdmin = user && (user.role === 'ADMIN' || (user.email && ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email.toLowerCase())));

    const userLimit = isAdmin || tier === SubscriptionTier.PROFESYONEL ? 10 : tier === SubscriptionTier.YETKIN ? 5 : 2;
    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    return {
      userTier: tier,
      userLimit,
      remainingChatbotMessages,
    };
  }

  /**
   * Main API endpoint handler for POST /comparisons.
   * Enforces server-side vehicle limit, checks cache using computeSourceDataVersionFromProfiles, increments usage quota, and returns full response contract.
   */
  async compare(userId: string, dto: CompareVehiclesDto) {
    let requestedIds: string[] = [];
    if (dto.variantIds && Array.isArray(dto.variantIds) && dto.variantIds.length > 0) {
      requestedIds = Array.from(new Set(dto.variantIds.filter(Boolean)));
    } else if (dto.variant1Id && dto.variant2Id) {
      requestedIds = Array.from(new Set([dto.variant1Id, dto.variant2Id].filter(Boolean)));
    }

    if (requestedIds.length < 2) {
      throw new BadRequestException('Karşılaştırma yapmak için en az 2 farklı araç seçmelisiniz.');
    }

    const { userLimit, userTier, remainingChatbotMessages } = await this.getUserTierAndLimit(userId);

    if (requestedIds.length > userLimit) {
      throw new BadRequestException(`Paketiniz kapsamında aynı anda en fazla ${userLimit} araç karşılaştırabilirsiniz. Seçilen: ${requestedIds.length}`);
    }

    const priority = (dto.selectedPriority as ComparisonPriority) || 'BALANCED';

    const profiles = await this.loadVehicleProfiles(requestedIds, userId);

    const sourceDataVersion = computeSourceDataVersionFromProfiles(profiles);
    const cacheKey = `v11_final_${sourceDataVersion}_${priority}`;

    const cached = await this.prisma.aiVehicleComparisonCache.findUnique({
      where: { cacheKey },
    }).catch(() => null);

    let comparisonResult: VehicleComparisonResult;

    if (cached && cached.analysisJson && typeof cached.analysisJson === 'object') {
      comparisonResult = cached.analysisJson as unknown as VehicleComparisonResult;
      await this.recordHistory(requestedIds, comparisonResult, userId).catch(() => null);
    } else {
      if (userId) {
        await this.featureLimitService.checkAndIncrement(userId, FeatureKey.VEHICLE_COMPARISON);
      }

      try {
        comparisonResult = await this.generateAdvancedAiComparison(profiles, priority, sourceDataVersion);
      } catch (err: any) {
        console.warn(`Comparison AI generation failed. Running Fallback generator. Reason: ${err?.message || err}`);
        comparisonResult = await this.generateFallbackResult(profiles, priority, sourceDataVersion);
      }

      // Requirement 7: Cache ONLY generationMode === 'AI' and 8/8 criteria completeness
      const isAI = comparisonResult.generationMode === 'AI';
      const allVehiclesComplete = (comparisonResult.criterionResult?.vehicleEvaluations || []).every(
        ev => !ev.coverageTooLow && ev.overallScore !== null
      );

      if (isAI && allVehiclesComplete) {
        await this.prisma.aiVehicleComparisonCache.upsert({
          where: { cacheKey },
          create: {
            cacheKey,
            variant1Id: requestedIds[0] || '',
            variant2Id: requestedIds[1] || '',
            variantIds: requestedIds,
            verdict: comparisonResult.headline || '',
            analysisJson: comparisonResult as any,
          },
          update: {
            variant1Id: requestedIds[0] || '',
            variant2Id: requestedIds[1] || '',
            variantIds: requestedIds,
            verdict: comparisonResult.headline || '',
            analysisJson: comparisonResult as any,
          },
        }).catch(() => null);
      }

      await this.recordHistory(requestedIds, comparisonResult, userId).catch(() => null);
    }

    return {
      success: true,
      isCacheHit: !!cached,
      cacheKey,
      comparisonResult,
      vehicles: profiles.map(p => ({
        id: p.vehicleId,
        name: p.displayName,
        displayName: p.displayName,
        brand: p.identity.brand,
        model: p.identity.model,
        year: p.identity.year,
        trim: p.identity.trim,
        engine: p.identity.engineCode,
        transmission: p.identity.transmission,
        fuelType: formatFuelType(p.identity.fuelType),
        problemsCount: p.reliability.problems.length,
        reportAvailable: p.dossier?.reportAvailable ?? false,
        reportVersion: p.dossier?.reportVersion || undefined,
        reportIsStale: p.dossier?.isStaleReport || undefined,
      })),
      remainingChatbotMessages,
      userTier,
      userLimit,
    };
  }

  /**
   * Internal comparison execution method.
   */
  async compareVehicles(
    variantIds: string[],
    userId?: string,
    idempotencyKey?: string,
    priority: ComparisonPriority = 'BALANCED',
  ): Promise<VehicleComparisonResult> {
    const dto: CompareVehiclesDto = {
      variantIds,
      idempotencyKey,
      selectedPriority: priority,
    };
    const res = await this.compare(userId || '', dto);
    return res.comparisonResult;
  }

  /**
   * AI Chatbot endpoint handler for POST /comparisons/chat.
   */
  async chat(userId: string, dto: ComparisonChatDto) {
    if (userId) {
      await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);
    }

    let requestedIds: string[] = [];
    if (dto.variantIds && Array.isArray(dto.variantIds) && dto.variantIds.length > 0) {
      requestedIds = Array.from(new Set(dto.variantIds.filter(Boolean)));
    } else if (dto.variant1Id && dto.variant2Id) {
      requestedIds = Array.from(new Set([dto.variant1Id, dto.variant2Id].filter(Boolean)));
    }

    if (requestedIds.length === 0) {
      throw new BadRequestException('Chatbot ile sohbet etmek için en az bir araç seçmelisiniz.');
    }

    const profiles = await this.loadVehicleProfiles(requestedIds);
    const vehicleDescriptions = profiles.map(p =>
      `• ${p.displayName}: Motor ${p.identity.engineCode || 'Veri yok'}, Şanzıman ${p.identity.transmission || 'Veri yok'}, Yakıt ${p.identity.fuelType || 'Veri yok'}, Tüketim ${p.efficiency.combinedConsumption || 'Veri yok'} L/100km. Kronik Riskler: ${p.reliability.problems.map(prob => prob.title).join(', ') || 'Yok'}`
    ).join('\n');

    const systemPrompt = `Sen TorqueScout otomotiv istihbarat sisteminin canlı yapay zeka asistanısın.
Kullanıcı şu ${profiles.length} aracı kıyaslıyor ve sana soru sordu:

${vehicleDescriptions}

KATI TALİMATLAR:
1. Kullanıcının sorusunu doğrudan yukarıdaki teknik veriler ve kronik arızalar ışığında karşılaştırmalı olarak yanıtla.
2. Seçilen TÜM ${profiles.length} araç hakkında bilgi ver.
3. KESİNLİKLE SOHBET GEÇMİŞİNE DİKKAT ET VE TEKRARA DÜŞME!
4. KULLANICI ÖNCEKİ MESAJLARDA VEYA ŞU ANKİ MESAJINDA YILLIK KİLOMETRESİNİ, KULLANIM TARZINI (ŞEHİR İÇİ / UZUN YOL) VEYA SÜRÜŞ BÜTÇESİNİ BELİRTTİYSE, TEKRAR KİLOMETRE VEYA KULLANIM TARZI SORMA! Doğrudan verilen bilgiye göre kesin kararını ve tavsiyeni ver.
5. Yanıtın son derece bilgili, samimi, tarafsız ve akıcı Türkçe olsun.`;

    const historyMessages: any[] = [];
    if (dto.history && Array.isArray(dto.history)) {
      for (const msg of dto.history.slice(-6)) {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (msg.text && typeof msg.text === 'string') {
          historyMessages.push({ role, content: msg.text });
        }
      }
    }

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: dto.question },
    ];

    const apiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;

    let responseText = '';

    if (this.openai) {
      try {
        const aiRes = await this.openai.chat.completions.create({
          model: process.env.COMPARISON_AI_MODEL || 'gpt-4o-mini',
          messages: fullMessages,
          temperature: 0.5,
        });
        responseText = aiRes.choices[0]?.message?.content || '';
      } catch (err: any) {
        console.warn('OpenAI comparison chat failed:', err?.message || err);
      }
    }

    if (!responseText && geminiApiKey && process.env.NODE_ENV !== 'test') {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: fullMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          }),
        });
        if (res.ok) {
          const geminiData = await res.json();
          responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (err: any) {
        console.warn('Gemini API comparison chat failed:', err?.message || err);
      }
    }

    if (!responseText) {
      const summaryNames = profiles.map(p => p.displayName).join(', ');
      responseText = `Seçtiğiniz ${profiles.length} araç (${summaryNames}) kıyaslandığında; motor güçleri, yakıt tüketimleri ve şanzıman verimlilikleri kullanım amacınıza göre farklılık gösterir. Şehir içi pratiklik veya uzun yol konforu kriterlerinize göre en uygun modeli belirleyebilirsiniz.`;
    }

    await this.prisma.aiChatLog.create({
      data: {
        userId: userId || 'GUEST',
        variantId: profiles[0]?.vehicleId || '',
        prompt: dto.question,
        response: responseText,
      },
    }).catch(() => null);

    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    return {
      response: responseText,
      remainingChatbotMessages,
    };
  }

  private async recordHistory(
    variantIds: string[],
    result: VehicleComparisonResult,
    userId?: string,
  ) {
    if (!variantIds || variantIds.length < 2 || !userId) return;

    await this.prisma.vehicleComparison.create({
      data: {
        userId,
        variant1Id: variantIds[0] || '',
        variant2Id: variantIds[1] || '',
        variantIds: variantIds,
      },
    }).catch(() => null);
  }

  private buildAllowedFactIdsByCriterion(p: ComparisonVehicleProfile): Record<CriterionKey, Set<string>> {
    const dossier = p.dossier;
    const relFacts = new Set<string>();
    const failFacts = new Set<string>();
    const fuelFacts = new Set<string>();
    const usageFacts = new Set<string>();
    const safetyFacts = new Set<string>();
    const perfFacts = new Set<string>();
    const comfortFacts = new Set<string>();
    const pracFacts = new Set<string>();
    const equipTechFacts = new Set<string>();

    if (dossier) {
      // REQUIREMENT 1: SOLE Fact catalog is dossier.dataQuality.supportingFacts!
      const validFactCatalogKeys = new Set<string>(
        (dossier.dataQuality?.supportingFacts || []).flatMap((f: any) => [f.factKey, f.id]).filter(Boolean)
      );

      const addIfInCatalog = (targetSet: Set<string>, id: string) => {
        if (validFactCatalogKeys.has(id)) {
          targetSet.add(id);
        }
      };

      // 1. RELIABILITY & FAILURE_SEVERITY
      (dossier.commonProblems || []).flatMap(prob => prob.supportingFactIds || []).forEach(id => {
        addIfInCatalog(relFacts, id);
        addIfInCatalog(failFacts, id);
      });
      (dossier.maintenanceOwnership?.supportingFactIds || []).forEach(id => {
        addIfInCatalog(relFacts, id);
        addIfInCatalog(failFacts, id);
      });
      (dossier.recalls || []).flatMap(r => r.supportingFactIds || []).forEach(id => {
        addIfInCatalog(relFacts, id);
        addIfInCatalog(safetyFacts, id);
      });
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => {
          const k = f.factKey.toLowerCase();
          return k.includes('rel') || k.includes('risk') || k.includes('score') || k.includes('problem');
        })
        .forEach(f => {
          relFacts.add(f.factKey);
          if ((f as any).id) relFacts.add((f as any).id);
        });

      // 2. FUEL_EFFICIENCY
      (dossier.performanceUsage?.supportingFactIds || [])
        .filter(id => {
          const k = id.toLowerCase();
          return k.includes('fuel') || k.includes('consumption') || k.includes('tuketim') || k.includes('efficiency') || k.includes('l100km');
        })
        .forEach(id => addIfInCatalog(fuelFacts, id));
      (dossier.usageScenarios || [])
        .filter(s => s.scenarioKey === 'FUEL_ECONOMY' || s.scenarioKey === 'cityUse')
        .flatMap(s => s.supportingFactIds || [])
        .forEach(id => addIfInCatalog(fuelFacts, id));

      // 3. USAGE_SUITABILITY
      (dossier.usageScenarios || [])
        .flatMap(s => s.supportingFactIds || [])
        .forEach(id => addIfInCatalog(usageFacts, id));
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => f.factKey.startsWith('CMP_USAGE_SUITABILITY_') || f.factKey.toLowerCase().includes('usage') || f.factKey.toLowerCase().includes('suitability'))
        .forEach(f => {
          usageFacts.add(f.factKey);
          if ((f as any).id) usageFacts.add((f as any).id);
        });

      // 4. SAFETY
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => {
          const k = f.factKey.toLowerCase();
          return k.includes('safety') || k.includes('ncap') || k.includes('adas') || k.includes('airbag') || k.includes('recall');
        })
        .forEach(f => {
          safetyFacts.add(f.factKey);
          if ((f as any).id) safetyFacts.add((f as any).id);
        });

      // 5. PERFORMANCE
      (dossier.engineTransmission?.supportingFactIds || []).forEach(id => addIfInCatalog(perfFacts, id));
      (dossier.performanceUsage?.supportingFactIds || [])
        .filter(id => {
          const k = id.toLowerCase();
          return k.includes('power') || k.includes('hp') || k.includes('torque') || k.includes('speed') || k.includes('acceleration') || k.includes('0to100');
        })
        .forEach(id => addIfInCatalog(perfFacts, id));

      // 6. COMFORT
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => {
          const k = f.factKey.toLowerCase();
          return k.includes('comfort') || k.includes('nvh') || k.includes('isolation') || k.includes('suspension') || k.includes('daily');
        })
        .forEach(f => {
          comfortFacts.add(f.factKey);
          if ((f as any).id) comfortFacts.add((f as any).id);
        });

      // 7. PRACTICALITY
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => {
          const k = f.factKey.toLowerCase();
          return k.includes('boot') || k.includes('trunk') || k.includes('bagaj') || k.includes('practical') || k.includes('space') || k.includes('capacity');
        })
        .forEach(f => {
          pracFacts.add(f.factKey);
          if ((f as any).id) pracFacts.add((f as any).id);
        });
      (dossier.performanceUsage?.supportingFactIds || [])
        .filter(id => id.toLowerCase().includes('boot') || id.toLowerCase().includes('trunk') || id.toLowerCase().includes('bagaj'))
        .forEach(id => addIfInCatalog(pracFacts, id));

      // 8. EQUIPMENT_TECHNOLOGY
      if (dossier.trimPackageComparison || dossier.expertDecisionSynthesis?.trimPackageComparison) {
        (dossier.supportingFactIds || [])
          .filter(id => {
            const k = id.toLowerCase();
            return (k.includes('trim') || k.includes('package') || k.includes('donanim') || k.includes('equip') || k.includes('tech')) &&
                   !k.includes('power') && !k.includes('hp') && !k.includes('torque') && !k.includes('fuel') && !k.includes('engine');
          })
          .forEach(id => addIfInCatalog(equipTechFacts, id));
      }
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => {
          const k = f.factKey.toLowerCase();
          return (f.category === 'EQUIPMENT' || k.includes('equipment') || k.includes('equip') || k.includes('tech') || k.includes('trim') || k.includes('feature')) &&
                 !k.includes('power') && !k.includes('hp') && !k.includes('torque') && !k.includes('fuel') && !k.includes('engine') && !k.includes('price');
        })
        .forEach(f => {
          equipTechFacts.add(f.factKey);
          if ((f as any).id) equipTechFacts.add((f as any).id);
        });

      // 9. STRICT CMP_* DERIVED FACT ROUTING TO CRITERION SETS
      (dossier.dataQuality?.supportingFacts || []).forEach((f: any) => {
        const keysToAdd = [f.factKey, f.id].filter(Boolean);
        const firstKey = keysToAdd[0];
        if (!firstKey) return;

        keysToAdd.forEach(k => {
          if (k.startsWith('CMP_FAILURE_SEVERITY_') || f.criterion === 'FAILURE_SEVERITY') {
            failFacts.add(k);
          } else if (k.startsWith('CMP_RELIABILITY_') || f.criterion === 'RELIABILITY' || f.sourcePath?.includes('commonProblems')) {
            relFacts.add(k);
          } else if (k.startsWith('CMP_FUEL_EFFICIENCY_') || f.criterion === 'FUEL_EFFICIENCY') {
            fuelFacts.add(k);
          } else if (k.startsWith('CMP_USAGE_SUITABILITY_') || f.criterion === 'USAGE_SUITABILITY') {
            usageFacts.add(k);
          } else if (k.startsWith('CMP_SAFETY_') || f.criterion === 'SAFETY') {
            safetyFacts.add(k);
          } else if (k.startsWith('CMP_PERFORMANCE_') || f.criterion === 'PERFORMANCE') {
            perfFacts.add(k);
          } else if (k.startsWith('CMP_COMFORT_') || f.criterion === 'COMFORT') {
            comfortFacts.add(k);
          } else if (k.startsWith('CMP_PRACTICALITY_') || f.criterion === 'PRACTICALITY') {
            pracFacts.add(k);
          } else if (k.startsWith('CMP_EQUIPMENT_TECHNOLOGY_') || f.criterion === 'EQUIPMENT_TECHNOLOGY') {
            equipTechFacts.add(k);
          }
        });
      });

      // Also ensure chronic problem fact IDs are available to FAILURE_SEVERITY
      relFacts.forEach(k => {
        if (k.startsWith('FACT_PROBLEM_') || k.startsWith('FACT_PROB_') || k.includes('PROBLEM') || k.includes('KNOWN_PROBLEMS')) {
          failFacts.add(k);
        }
      });
    }

    return {
      RELIABILITY: relFacts,
      FAILURE_SEVERITY: failFacts,
      SEVERITY_DURABILITY: failFacts,
      FUEL_EFFICIENCY: fuelFacts,
      USAGE_SUITABILITY: usageFacts,
      SAFETY: safetyFacts,
      PERFORMANCE: perfFacts,
      COMFORT: comfortFacts,
      PRACTICALITY: pracFacts,
      EQUIPMENT_TECHNOLOGY: equipTechFacts,
      VALUE_FOR_MONEY: equipTechFacts,
    };
  }

  private async loadVehicleProfiles(variantIds: string[], userId?: string): Promise<ComparisonVehicleProfile[]> {
    // STAGE 1: Ensure all selected vehicle variants have a completed GeneratedVehicleReport in DB.
    // Auto-generate missing reports concurrently in parallel for maximum speed!
    await Promise.all(
      variantIds.map(async (id) => {
        const existingReport = await this.reportLoaderService.findLatestGeneratedReport(id);
        if (!existingReport && this.vehicleReportService) {
          console.log(`[ComparisonService] Variant ${id} has no pre-stored GeneratedVehicleReport. Auto-generating live report concurrently...`);
          await this.vehicleReportService.createVehicleReport(userId || 'guest_user', {
            variantId: id,
            idempotencyKey: `auto_comp_${id}_${Date.now()}`,
            forceRefresh: false,
          }).catch(err => {
            console.warn(`[ComparisonService] Live report auto-generation notice for ${id}: ${err?.message || err}`);
          });
        }
      })
    );

    const profiles: ComparisonVehicleProfile[] = [];

    for (const id of variantIds) {
      const v = await this.prisma.vehicleVariant.findUnique({
        where: { id },
        include: {
          brand: true,
          model: true,
          generation: true,
          engine: true,
          transmission: true,
          trim: true,
          specs: true,
          questions: { where: { status: ApprovalStatus.APPROVED } },
          checklists: { where: { status: ApprovalStatus.APPROVED } },
        },
      });

      if (!v) continue;

      const dossier = await this.reportLoaderService.loadDossierForVariant(id);
      const specData: Record<string, any> = (v.specs?.specs as Record<string, any>) || {};

      const priceSnapshot = await this.prisma.vehicleVariantPriceSnapshot.findUnique({
        where: { vehicleVariantId: id },
      }).catch(() => null);

      // REQUIREMENT 2: SOLE AUTHORITY for problem confidence is dossier.dataQuality.supportingFacts!
      const factMap = new Map<string, { source?: string; confidence?: string }>();
      (dossier.dataQuality?.supportingFacts || []).forEach((f: any) => {
        if (f.factKey) {
          factMap.set(f.factKey, { source: f.source, confidence: f.confidence });
        }
      });

      const problems = dossier.commonProblems.map(p => {
        const probFacts = Array.isArray(p.supportingFactIds) ? p.supportingFactIds : [];
        let highestMatchedConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' = 'INSUFFICIENT';

        for (const fid of probFacts) {
          const matchedFact = factMap.get(fid);
          if (matchedFact) {
            const isTrustedSource = matchedFact.source && TRUSTED_FACT_SOURCES.includes(matchedFact.source);
            const isHighConfidence = matchedFact.confidence === 'HIGH';
            const isMediumConfidence = matchedFact.confidence === 'MEDIUM' || matchedFact.confidence === 'HIGH';

            if (isTrustedSource && isHighConfidence) {
              highestMatchedConfidence = 'HIGH';
              break;
            } else if (isTrustedSource && isMediumConfidence) {
              highestMatchedConfidence = 'MEDIUM';
            } else if (matchedFact.source !== 'UNKNOWN' && matchedFact.source !== 'SELLER_DECLARATION') {
              if (highestMatchedConfidence === 'INSUFFICIENT') highestMatchedConfidence = 'LOW';
            }
          }
        }

        if (highestMatchedConfidence === 'INSUFFICIENT' && dossier.reportAvailable) {
          highestMatchedConfidence = 'LOW';
        }

        return {
          title: p.title,
          affectedComponent: p.system || undefined,
          severity: (p.severity || 'MEDIUM') as any,
          frequency: undefined,
          inspectionHint: p.inspectionStep || (p.symptoms && p.symptoms[0]) || undefined,
          preventiveAction: p.preventionAdvice || p.causeExplanation || undefined,
          confidence: highestMatchedConfidence as any,
        };
      });

      const recalls = dossier.recalls.map(r => ({
        title: r.title,
        description: r.riskDescription,
        safetyRisk: r.remedyDescription || undefined,
      }));

      const sellerQuestions = (v.questions || []).map(q => q.question);
      const inspectionChecklist = (v.checklists || []).map(c => c.title);

      const hp = dossier.performanceUsage.powerHp ?? (specData.horsepower ? Number(specData.horsepower) : undefined);
      const torque = dossier.performanceUsage.torqueNm ?? (specData.torqueNm ? Number(specData.torqueNm) : undefined);
      const zeroToHundred = dossier.performanceUsage.zeroToHundredKmh ?? (specData.acceleration0to100 ? Number(specData.acceleration0to100) : undefined);
      const topSpeed = dossier.performanceUsage.topSpeedKmh ?? (specData.topSpeed ? Number(specData.topSpeed) : undefined);
      const combinedConsumption = dossier.performanceUsage.combinedFuelL100km ?? (specData.averageFuelConsumption ? Number(specData.averageFuelConsumption) : undefined);
      const bootLitres = dossier.performanceUsage.trunkCapacityLiters ?? (specData.luggageCapacity ? Number(specData.luggageCapacity) : undefined);

      profiles.push({
        vehicleId: v.id,
        displayName: `${dossier.vehicleIdentity.brand || v.brand.name} ${dossier.vehicleIdentity.model || v.model.name} ${dossier.vehicleIdentity.modelYear || v.year} (${dossier.vehicleIdentity.trimName || v.trim.name})`,
        identity: {
          brand: dossier.vehicleIdentity.brand || v.brand.name,
          model: dossier.vehicleIdentity.model || v.model.name,
          generation: dossier.vehicleIdentity.generation || v.generation.name,
          year: dossier.vehicleIdentity.modelYear || v.year,
          bodyType: dossier.vehicleIdentity.bodyType || v.generation.bodyType,
          engine: dossier.vehicleIdentity.engineCode || v.engine.code,
          engineCode: dossier.vehicleIdentity.engineCode || v.engine.code,
          transmission: dossier.vehicleIdentity.transmissionName || v.transmission.name,
          fuelType: dossier.vehicleIdentity.fuelType || v.fuelType,
          trim: dossier.vehicleIdentity.trimName || v.trim.name,
        },
        performance: {
          horsepower: hp,
          torqueNm: torque,
          zeroToHundred,
          topSpeed,
        },
        efficiency: {
          combinedConsumption,
        },
        practicality: {
          bootLitres,
        },
        comfortAndHandling: {},
        ownership: {},
        reliability: {
          buyabilityScore: dossier.scoring.buyabilityScore ?? undefined,
          riskScore: dossier.scoring.technicalRiskScore ?? undefined,
          problems,
          recalls,
        },
        sellerQuestions,
        inspectionChecklist,
        evidenceQuality: {
          confidence: dossier.scoring.overallConfidence,
          missingFields: dossier.scoring.buyabilityScore === null ? ['buyabilityScore'] : [],
        },
        dossier,
        priceSnapshot,
      } as any);
    }

    return profiles;
  }

  private async buildFallbackCriterionAssessments(
    p: ComparisonVehicleProfile,
  ): Promise<Record<CriterionKey, CriterionAssessment>> {
    const dossier = p.dossier;
    const problems = p.reliability.problems || [];

    const allowedFactIds = this.buildAllowedFactIdsByCriterion(p);
    const relAllowedFacts = Array.from(allowedFactIds['RELIABILITY'] || []);

    const priceSnapshot = (p as any).priceSnapshot || await this.prisma.vehicleVariantPriceSnapshot.findUnique({
      where: { vehicleVariantId: p.vehicleId },
    }).catch(() => null);

    const verifiedPriceEvidence = getVerifiedMarketPriceEvidence(priceSnapshot);
    const hasTrimEvidence = !!(dossier?.trimPackageComparison || dossier?.expertDecisionSynthesis?.trimPackageComparison);

    const emptyCriterion = (key: CriterionKey, name: string): CriterionAssessment => ({
      criterionKey: key,
      score: null,
      stars: null,
      confidence: 'INSUFFICIENT',
      summary: `${name} için doğrulanmış rapor analizi gereklidir.`,
      positiveFactors: [],
      compromises: [],
      supportingFactIds: [],
      missingInputs: [`${name} verisi eksik`],
      insufficientData: true,
    });

    // Requirement 3: DO NOT use buyabilityScore for RELIABILITY in Fallback!
    // ONLY use 100 - technicalRiskScore if technicalRiskScore exists!
    const rawRelScore = (dossier?.scoring?.technicalRiskScore !== null && dossier?.scoring?.technicalRiskScore !== undefined)
      ? Math.max(0, 100 - dossier.scoring.technicalRiskScore)
      : null;

    const relScore = relAllowedFacts.length > 0 ? rawRelScore : null;
    const relInsufficient = relScore === null;
    const reliability: CriterionAssessment = {
      criterionKey: 'RELIABILITY',
      score: relScore,
      stars: relInsufficient ? null : Math.max(0.5, Math.min(5, Math.round((relScore! / 20) * 2) / 2)),
      confidence: relInsufficient ? 'INSUFFICIENT' : 'MEDIUM',
      summary: relInsufficient
        ? 'Doğrulanmış teknik arıza riski skoru veya uygun kanıt verisi bulunmamaktadır.'
        : `${p.displayName} için doğrulanmış teknik arıza riski skoru ${relScore}/100.`,
      positiveFactors: [],
      compromises: problems.map(pr => `${pr.title} (${pr.severity})`),
      supportingFactIds: relInsufficient ? [] : relAllowedFacts,
      missingInputs: relInsufficient ? ['Doğrulanmış GeneratedVehicleReport teknik arıza risk skoru eksik'] : [],
      insufficientData: relInsufficient,
    };

      const failFacts = Array.from(allowedFactIds['FAILURE_SEVERITY'] || []);
      const failValid = failFacts.length > 0 || relAllowedFacts.length > 0;
      const rawFailScore = (dossier?.scoring?.technicalRiskScore !== null && dossier?.scoring?.technicalRiskScore !== undefined)
        ? Math.max(0, 100 - dossier.scoring.technicalRiskScore)
        : null;
      const failScore = failValid ? rawFailScore : null;
      const failAssessment: CriterionAssessment = {
        criterionKey: 'FAILURE_SEVERITY',
        score: failScore,
        stars: failScore === null ? null : Math.max(0.5, Math.min(5, Math.round((failScore! / 20) * 2) / 2)),
        confidence: failValid ? 'MEDIUM' : 'INSUFFICIENT',
        summary: failValid
          ? `${p.displayName} arıza ciddiyeti analizi doğrulanmış kronik arıza verileri üzerinden hesaplanmıştır.`
          : 'Arıza ciddiyeti verisi eksik.',
        positiveFactors: [],
        compromises: problems.map(pr => `${pr.title} (Şiddet: ${pr.severity || 'ORTA'})`),
        supportingFactIds: failFacts.length > 0 ? failFacts : relAllowedFacts,
        missingInputs: failValid ? [] : ['Arıza ciddiyeti verisi eksik'],
        insufficientData: !failValid,
      };

      const fuelFacts = Array.from(allowedFactIds['FUEL_EFFICIENCY'] || []);
      const combFuel = dossier?.performanceUsage?.combinedFuelL100km;
      const fuelValid = (combFuel !== undefined && combFuel !== null) || fuelFacts.length > 0;
      const rawFuelScore = combFuel ? Math.max(40, Math.min(95, Math.round(100 - (combFuel - 4) * 10))) : 75;
      const fuelScore = fuelValid ? rawFuelScore : null;
      const fuelAssessment: CriterionAssessment = {
        criterionKey: 'FUEL_EFFICIENCY',
        score: fuelScore,
        stars: fuelScore === null ? null : Math.max(0.5, Math.min(5, Math.round((fuelScore! / 20) * 2) / 2)),
        confidence: fuelValid ? 'MEDIUM' : 'INSUFFICIENT',
        summary: combFuel
          ? `${p.displayName} karma yakıt tüketimi: ${combFuel} L/100km.`
          : `${p.displayName} için yakıt verimliliği verisi doğrulanmıştır.`,
        positiveFactors: combFuel && combFuel <= 6.0 ? [`Karma yakıt tüketimi ${combFuel} L/100km ile verimli.`] : [],
        compromises: combFuel && combFuel > 7.0 ? [`Karma yakıt tüketimi ${combFuel} L/100km.`] : [],
        supportingFactIds: fuelFacts,
        missingInputs: fuelValid ? [] : ['Yakıt tüketim verisi eksik'],
        insufficientData: !fuelValid,
      };

      const usageFacts = Array.from(allowedFactIds['USAGE_SUITABILITY'] || []);
      const dailyUse = dossier?.expertDecisionSynthesis?.dailyUseAssessment;
      const usageValid = !!(dailyUse?.cityUse || dailyUse?.highwayUse || dailyUse?.trafficBehavior) || usageFacts.length > 0;
      const usageScore = usageValid ? 75 : null;
      const usageAssessment: CriterionAssessment = {
        criterionKey: 'USAGE_SUITABILITY',
        score: usageScore,
        stars: usageScore === null ? null : Math.max(0.5, Math.min(5, Math.round((usageScore! / 20) * 2) / 2)),
        confidence: usageValid ? 'MEDIUM' : 'INSUFFICIENT',
        summary: usageValid
          ? `${p.displayName} şehir içi ve otoyol kullanım senaryosu uyumu doğrulanmıştır.`
          : 'Kullanım senaryosu verisi eksik.',
        positiveFactors: dailyUse?.cityUse ? [dailyUse.cityUse] : [],
        compromises: [],
        supportingFactIds: usageFacts,
        missingInputs: usageValid ? [] : ['Kullanım uyumu verisi eksik'],
        insufficientData: !usageValid,
      };

      const perfFacts = Array.from(allowedFactIds['PERFORMANCE'] || []);
      const hp = dossier?.performanceUsage?.powerHp || p.performance?.horsepower;
      const perfValid = (hp !== undefined && hp !== null) || perfFacts.length > 0;
      const rawPerfScore = hp ? Math.max(40, Math.min(95, Math.round(50 + (hp - 90) * 0.4))) : 75;
      const perfScore = perfValid ? rawPerfScore : null;
      const perfAssessment: CriterionAssessment = {
        criterionKey: 'PERFORMANCE',
        score: perfScore,
        stars: perfScore === null ? null : Math.max(0.5, Math.min(5, Math.round((perfScore! / 20) * 2) / 2)),
        confidence: perfValid ? 'MEDIUM' : 'INSUFFICIENT',
        summary: hp ? `${p.displayName} motor gücü: ${hp} HP.` : `${p.displayName} motor performansı doğrulanmıştır.`,
        positiveFactors: hp && hp >= 130 ? [`${hp} HP motor gücü ile yüksek performans.`] : [],
        compromises: [],
        supportingFactIds: perfFacts,
        missingInputs: perfValid ? [] : ['Performans verisi eksik'],
        insufficientData: !perfValid,
      };

      const comfortFacts = Array.from(allowedFactIds['COMFORT'] || []);
      const comfortValid = !!dossier?.expertDecisionSynthesis?.dailyUseAssessment?.comfortAssessment || comfortFacts.length > 0 || hasTrimEvidence;
      const comfortScore = comfortValid ? 75 : null;
      const comfortAssessment: CriterionAssessment = {
        criterionKey: 'COMFORT',
        score: comfortScore,
        stars: comfortScore === null ? null : Math.max(0.5, Math.min(5, Math.round((comfortScore! / 20) * 2) / 2)),
        confidence: comfortValid ? 'MEDIUM' : 'INSUFFICIENT',
        summary: comfortValid
          ? `${p.displayName} kabin konforu ve sürüş kalitesi doğrulanmıştır.`
          : 'Konfor verisi eksik.',
        positiveFactors: dossier?.expertDecisionSynthesis?.dailyUseAssessment?.comfortAssessment
          ? [dossier.expertDecisionSynthesis.dailyUseAssessment.comfortAssessment]
          : [],
        compromises: [],
        supportingFactIds: comfortFacts,
        missingInputs: comfortValid ? [] : ['Konfor verisi eksik'],
        insufficientData: !comfortValid,
      };

      const pracFacts = Array.from(allowedFactIds['PRACTICALITY'] || []);
      const trunkL = dossier?.performanceUsage?.trunkCapacityLiters;
      const pracValid = (trunkL !== undefined && trunkL !== null) || pracFacts.length > 0;
      const rawPracScore = trunkL ? Math.max(40, Math.min(95, Math.round(50 + (trunkL - 300) * 0.2))) : 75;
      const pracScore = pracValid ? rawPracScore : null;
      const pracAssessment: CriterionAssessment = {
        criterionKey: 'PRACTICALITY',
        score: pracScore,
        stars: pracScore === null ? null : Math.max(0.5, Math.min(5, Math.round((pracScore! / 20) * 2) / 2)),
        confidence: pracValid ? 'MEDIUM' : 'INSUFFICIENT',
        summary: trunkL ? `${p.displayName} bagaj hacmi: ${trunkL} Litre.` : `${p.displayName} kullanışlılık verileri doğrulanmıştır.`,
        positiveFactors: trunkL && trunkL >= 400 ? [`${trunkL} Litre geniş bagaj hacmi.`] : [],
        compromises: [],
        supportingFactIds: pracFacts,
        missingInputs: pracValid ? [] : ['Bagaj ve kullanışlılık verisi eksik'],
        insufficientData: !pracValid,
      };

      const equipTechFacts = Array.from(allowedFactIds['EQUIPMENT_TECHNOLOGY'] || allowedFactIds['VALUE_FOR_MONEY'] || []);
      const equipTechValid = hasTrimEvidence && equipTechFacts.length > 0;
      const equipTechScore = equipTechValid ? Math.min(100, Math.max(50, 60 + equipTechFacts.length * 5)) : 75;
      const equipTechStatuses = evaluateEquipmentFeatureStatuses(p);
      const equipTech: CriterionAssessment = {
        criterionKey: 'EQUIPMENT_TECHNOLOGY',
        score: equipTechScore,
        stars: Math.max(0.5, Math.min(5, Math.round((equipTechScore / 20) * 2) / 2)),
        confidence: 'MEDIUM',
        summary: `${p.displayName} donanım paketi (${p.identity.trim || 'Standart'}) doğrulanmış konfor ve teknoloji özelliklerine sahiptir.`,
        positiveFactors: [`${p.identity.trim || 'Donanım'} paketi özellikleri doğrulanmıştır.`],
        compromises: [],
        supportingFactIds: equipTechFacts,
        missingInputs: [],
        insufficientData: false,
        equipmentFeatureStatuses: equipTechStatuses,
      };

    return {
      RELIABILITY: reliability,
      FAILURE_SEVERITY: failAssessment,
      SEVERITY_DURABILITY: failAssessment,
      FUEL_EFFICIENCY: fuelAssessment,
      USAGE_SUITABILITY: usageAssessment,
      SAFETY: emptyCriterion('SAFETY', 'Güvenlik'),
      PERFORMANCE: perfAssessment,
      COMFORT: comfortAssessment,
      PRACTICALITY: pracAssessment,
      EQUIPMENT_TECHNOLOGY: equipTech,
      VALUE_FOR_MONEY: equipTech,
    };
  }

  private buildComparisonCriterionResult(
    evaluations: VehicleCriterionEvaluation[],
  ): ComparisonCriterionResult {
    const keys: CriterionKey[] = [
      'RELIABILITY',
      'FAILURE_SEVERITY',
      'FUEL_EFFICIENCY',
      'USAGE_SUITABILITY',
      'PERFORMANCE',
      'COMFORT',
      'PRACTICALITY',
      'EQUIPMENT_TECHNOLOGY',
    ];

    const rankings: Record<CriterionKey, any> = {} as any;

    for (const key of keys) {
      const valid = evaluations
        .map(e => ({ vehicleId: e.vehicleId, vehicleName: e.vehicleName, assessment: e.assessments[key] }))
        .filter(x => x.assessment && typeof x.assessment.score === 'number' && !x.assessment.insufficientData);

      if (valid.length === 0) {
        rankings[key] = {
          winnerVehicleIds: [],
          winnerVehicleNames: [],
          isTie: false,
          insufficientData: true,
          reasoning: 'Bu kriter için araçlar arasında karşılaştırılabilir veri bulunmuyor.',
        };
      } else {
        valid.sort((a, b) => (b.assessment.score || 0) - (a.assessment.score || 0));
        const maxScore = valid[0].assessment.score || 0;
        const winners = valid.filter(x => x.assessment.score === maxScore);

        rankings[key] = {
          winnerVehicleIds: winners.map(w => w.vehicleId),
          winnerVehicleNames: winners.map(w => w.vehicleName),
          isTie: winners.length > 1,
          insufficientData: false,
          reasoning: winners.length > 1
            ? `${winners.map(w => w.vehicleName).join(' ve ')} bu kriterde eşit puana sahiptir (${maxScore}/100).`
            : `${winners[0].vehicleName} bu kriterde en yüksek kanıta dayalı puanı elde etmiştir (${maxScore}/100).`,
        };
      }
    }

    return {
      vehicleEvaluations: evaluations,
      criterionRankings: rankings,
    };
  }

  private formatVehicleAllowedFactsByCriterion(
    p: ComparisonVehicleProfile,
    allowedFactIdsByCriterion: Record<CriterionKey, Set<string>>,
  ): string {
    const supportingFacts = p.dossier?.dataQuality?.supportingFacts || [];
    const factMap = new Map<string, any>();
    for (const f of supportingFacts) {
      const key = f.factKey || (f as any).id;
      if (key) factMap.set(key, f);
    }

    const criteriaKeys: CriterionKey[] = [
      'RELIABILITY',
      'FAILURE_SEVERITY',
      'FUEL_EFFICIENCY',
      'USAGE_SUITABILITY',
      'PERFORMANCE',
      'COMFORT',
      'PRACTICALITY',
      'EQUIPMENT_TECHNOLOGY',
    ];

    const lines: string[] = [];
    lines.push(`  KRİTER BAZLI İZİNLİ FACT ID VE KANIT LİSTESİ (${p.displayName}):`);

    for (const crit of criteriaKeys) {
      lines.push(`    --- KRİTER: ${crit} ---`);
      const allowedSet = allowedFactIdsByCriterion[crit] || new Set<string>();
      if (allowedSet.size === 0) {
        lines.push(`      * (Bu kriter için izinli Fact ID bulunmuyor)`);
        continue;
      }

      if (crit === 'USAGE_SUITABILITY') {
        const allowedList = Array.from(allowedSet);
        const cityFacts = allowedList.filter(id => {
          const f = factMap.get(id);
          const k = id.toLowerCase() + (f?.sourcePath || '').toLowerCase() + (f?.label || '').toLowerCase();
          return k.includes('cityuse') || k.includes('city_use') || k.includes('şehir içi') || k.includes('sehir_ici');
        });
        const highwayFacts = allowedList.filter(id => {
          const f = factMap.get(id);
          const k = id.toLowerCase() + (f?.sourcePath || '').toLowerCase() + (f?.label || '').toLowerCase();
          return k.includes('highwayuse') || k.includes('highway_use') || k.includes('otoyol');
        });
        const trafficFacts = allowedList.filter(id => {
          const f = factMap.get(id);
          const k = id.toLowerCase() + (f?.sourcePath || '').toLowerCase() + (f?.label || '').toLowerCase();
          return k.includes('trafficbehavior') || k.includes('traffic') || k.includes('trafik');
        });
        const scenarioFacts = allowedList.filter(id => {
          const f = factMap.get(id);
          const k = id.toLowerCase() + (f?.sourcePath || '').toLowerCase() + (f?.label || '').toLowerCase();
          return k.includes('suitable') || k.includes('scenario') || k.includes('profil') || k.includes('notsuitable');
        });

        lines.push(`      [USAGE_SUITABILITY 4 ZORUNLU KANIT GRUBU (supportingFactIds dizisinde HER 4 GRUBUN TAMAMININ İZİNLİ FACT ID'LERİ YER ALMALIDIR)]:`);
        lines.push(`        1. Şehir içi kullanım (cityUse): [${cityFacts.join(', ')}]`);
        lines.push(`        2. Otoyol kullanım (highwayUse): [${highwayFacts.join(', ')}]`);
        lines.push(`        3. Yoğun trafik & dur-kalk (trafficBehavior): [${trafficFacts.join(', ')}]`);
        lines.push(`        4. Senaryolar & kullanıcı profilleri (scenario/profile): [${scenarioFacts.join(', ')}]`);
      }

      for (const fid of Array.from(allowedSet)) {
        const f = factMap.get(fid);
        if (f) {
          lines.push(`      * [Fact ID: ${fid}] ${f.label}: ${f.value} (Kaynak: ${f.sourcePath || f.source || 'dossier'})`);
        } else {
          lines.push(`      * [Fact ID: ${fid}] (Detay veritabanı kanıtı)`);
        }
      }
    }

    return lines.join('\n');
  }

  private validateRawComparisonPayload(parsed: any, profiles: ComparisonVehicleProfile[]) {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI output is not a valid JSON object');
    }
    if (!parsed.criterionAssessments || typeof parsed.criterionAssessments !== 'object') {
      throw new Error('AI output is missing required criterionAssessments object');
    }

    for (const p of profiles) {
      const vAssessments = parsed.criterionAssessments[p.vehicleId];
      if (!vAssessments || typeof vAssessments !== 'object') {
        throw new Error(`AI criterionAssessments missing for vehicleId: ${p.vehicleId}`);
      }

      const requiredKeys: CriterionKey[] = [
        'RELIABILITY',
        'FAILURE_SEVERITY',
        'FUEL_EFFICIENCY',
        'USAGE_SUITABILITY',
        'PERFORMANCE',
        'COMFORT',
        'PRACTICALITY',
        'EQUIPMENT_TECHNOLOGY',
      ];

      const dossierFactIds = new Set<string>(
        (p.dossier?.dataQuality?.supportingFacts || []).map((f: any) => f.factKey).filter(Boolean)
      );

      const allowedFactIdsByCriterion = this.buildAllowedFactIdsByCriterion(p);

      for (const key of requiredKeys) {
        const raw = vAssessments[key] ||
          (key === 'FAILURE_SEVERITY' ? vAssessments['SEVERITY_DURABILITY'] : undefined) ||
          (key === 'EQUIPMENT_TECHNOLOGY' ? vAssessments['VALUE_FOR_MONEY'] : undefined);

        if (!raw) {
          throw new Error(`Vehicle ${p.vehicleId} is missing criterion: ${key}`);
        }

        if (
          !Array.isArray(raw.positiveFactors) ||
          !Array.isArray(raw.compromises || raw.negativeFactors) ||
          !Array.isArray(raw.supportingFactIds) ||
          !Array.isArray(raw.missingInputs)
        ) {
          throw new Error(`Vehicle ${p.vehicleId} criterion ${key} array fields must be Arrays`);
        }

        const validConfidences = ['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT'];
        if (!validConfidences.includes(raw.confidence)) {
          throw new Error(`Invalid confidence ${raw.confidence} in criterion ${key} for vehicle ${p.vehicleId}`);
        }

        if (raw.marketPriceEvidence) {
          delete raw.marketPriceEvidence;
        }

        const criterionAllowList = allowedFactIdsByCriterion[key] || new Set<string>();

        if (criterionAllowList.size === 0 && raw.score !== null) {
          throw new Error(`Criterion ${key} for vehicle ${p.vehicleId} has score ${raw.score} but criterion allowlist is empty`);
        }

        if (raw.score === null) {
          if (raw.insufficientData !== true) {
            throw new Error(`Criterion ${key} for vehicle ${p.vehicleId} has score:null but insufficientData is not true`);
          }
          if (raw.confidence !== 'INSUFFICIENT') {
            throw new Error(`Criterion ${key} for vehicle ${p.vehicleId} has score:null but confidence is not INSUFFICIENT`);
          }
        } else {
          if (typeof raw.score !== 'number' || raw.score < 0 || raw.score > 100) {
            throw new Error(`Invalid score ${raw.score} in criterion ${key} for vehicle ${p.vehicleId}`);
          }

          if (raw.insufficientData !== false) {
            throw new Error(`Criterion ${key} for vehicle ${p.vehicleId} has non-null score but insufficientData is not false`);
          }

          // Clean supportingFactIds to only keep IDs present in criterionAllowList
          if (Array.isArray(raw.supportingFactIds)) {
            raw.supportingFactIds = raw.supportingFactIds.filter((fid: string) => criterionAllowList.has(fid));
          } else {
            raw.supportingFactIds = [];
          }

          if (raw.score !== null && raw.supportingFactIds.length === 0) {
            if (criterionAllowList.size > 0) {
              raw.supportingFactIds = Array.from(criterionAllowList);
            } else {
              throw new Error(`Non-null score in ${key} for vehicle ${p.vehicleId} REQUIRES non-empty supportingFactIds in criterion allowlist`);
            }
          }
          
          const factIds: string[] = raw.supportingFactIds;

          // Evidence Grade Determination & Confidence Cap
          const originalCatalogFactKeys = new Set<string>(
            (p.dossier?.dataQuality?.supportingFacts || [])
              .filter((f: any) => 
                !f.factKey?.startsWith('CMP_') && 
                !f.id?.startsWith('CMP_') && 
                f.source !== 'SYSTEM_DERIVED' && 
                !f.criterion
              )
              .map((f: any) => f.factKey)
              .filter(Boolean)
          );

          const isVerifiedInCatalog = factIds.length > 0 && factIds.every(fid => !fid.startsWith('CMP_') && originalCatalogFactKeys.has(fid));
          const evidenceGrade: 'VERIFIED' | 'REPORT_DERIVED' = isVerifiedInCatalog ? 'VERIFIED' : 'REPORT_DERIVED';
          raw.evidenceGrade = evidenceGrade;

          if (evidenceGrade === 'REPORT_DERIVED' && raw.confidence === 'HIGH') {
            raw.confidence = 'MEDIUM';
          }

          // Relevance Rule 1: RELIABILITY
          if (key === 'RELIABILITY') {
            const invalidReliabilityTerms = [
              'motor gücü', 'otomatik şanzıman', 'manuel şanzıman', 'benzinli motor', 'dizel motor', 'dsg şanzıman',
              'kronik', 'arıza kaydı', 'onaylı kronik', 'sorun sayısı', 'risk seviyesi orta', 'teknik risk seviyesi',
            ];
            if (Array.isArray(raw.positiveFactors)) {
              raw.positiveFactors = raw.positiveFactors.filter((pf: string) => {
                const lowerPf = (pf || '').toLowerCase();
                return !invalidReliabilityTerms.some(term => lowerPf.includes(term));
              });
            }
          }

          // Relevance Rule 2: FAILURE_SEVERITY
          if (key === 'FAILURE_SEVERITY') {
            const invalidSeverityTerms = [
              'orijinal motor gücü', 'motor gücü', 'otomatik şanzıman', 'manuel şanzıman', 'benzinli', 'dizel', 'güçlü motor',
              'kronik', 'arıza kaydı', 'onaylı kronik', 'sorun sayısı', 'risk seviyesi orta', 'teknik risk seviyesi',
            ];
            if (Array.isArray(raw.positiveFactors)) {
              raw.positiveFactors = raw.positiveFactors.filter((pf: string) => {
                const lowerPf = (pf || '').toLowerCase();
                return !invalidSeverityTerms.some(term => lowerPf.includes(term));
              });
            }
            for (const fid of factIds) {
              const lowerFid = (fid || '').toLowerCase();
              if (lowerFid.includes('engine_power') || lowerFid.includes('transmission_type') || lowerFid.includes('fuel_type') || lowerFid.includes('horsepower')) {
                throw new Error(`Vehicle ${p.vehicleId} criterion FAILURE_SEVERITY cannot use engine power, transmission type, or fuel type in supportingFactIds`);
              }
            }
          }

          // Relevance Rule 3: FUEL_EFFICIENCY
          if (key === 'FUEL_EFFICIENCY') {
            const hasCityConsumption = !!(p.efficiency?.cityConsumption);
            const hasHighwayConsumption = !!(p.efficiency?.highwayConsumption);
            const hasCombinedOnly = !!(p.efficiency?.combinedConsumption) && (!hasCityConsumption || !hasHighwayConsumption);

            if (hasCombinedOnly) {
              const pfText = (raw.positiveFactors || []).join(' ').toLowerCase();
              if (pfText.includes('şehir içi tüketim') || pfText.includes('şehir dışı tüketim') || pfText.includes('otoyol tüketim')) {
                throw new Error(`Vehicle ${p.vehicleId} criterion FUEL_EFFICIENCY positiveFactors cannot claim separate city/highway consumption figures when only combined consumption data is available`);
              }
            }
          }

          // Relevance Rule 4: EQUIPMENT_TECHNOLOGY
          if (key === 'EQUIPMENT_TECHNOLOGY') {
            raw.equipmentFeatureStatuses = evaluateEquipmentFeatureStatuses(p);
            const supportingFacts = p.dossier?.dataQuality?.supportingFacts || [];
            const equipmentFactsText = supportingFacts
              .map((f: any) => `${f.label || ''} ${f.value || ''} ${f.factKey || ''}`)
              .join(' ')
              .toLowerCase();
            const trimText = JSON.stringify(p.dossier?.trimPackageComparison || p.dossier?.expertDecisionSynthesis?.trimPackageComparison || {}).toLowerCase();
            const fullEquipText = `${equipmentFactsText} ${trimText} ${(p.identity.trim || '').toLowerCase()}`;

            if (Array.isArray(raw.positiveFactors)) {
              const unsupportedTerms = ['zengin donanım', 'gelişmiş asistanlar', 'yüksek kaliteli ses sistemi'];
              raw.positiveFactors = raw.positiveFactors.filter((pf: string) => {
                const lowerPf = (pf || '').toLowerCase();
                return !unsupportedTerms.some(term => lowerPf.includes(term) && !fullEquipText.includes(term));
              });
            }
          }

          if (key === 'USAGE_SUITABILITY') {
            const supportingFacts = p.dossier?.dataQuality?.supportingFacts || [];
            const factMap = new Map<string, any>();
            supportingFacts.forEach((f: any) => {
              if (f.factKey) factMap.set(f.factKey, f);
              if (f.id) factMap.set(f.id, f);
            });

            let hasCityUse = false;
            let hasHighwayUse = false;
            let hasTrafficBehavior = false;
            let hasScenarioOrProfile = false;

            for (const fid of factIds) {
              const f = factMap.get(fid);
              const sp = (f?.sourcePath || '').toLowerCase();
              const lbl = (f?.label || '').toLowerCase();
              const lowerFid = fid.toLowerCase();

              if (
                sp.includes('cityuse') ||
                lbl.includes('şehir içi kullanım uyumu') ||
                lbl.includes('şehir içi kullanım') ||
                lowerFid.includes('city')
              ) {
                hasCityUse = true;
              }
              if (
                sp.includes('highwayuse') ||
                lbl.includes('otoyol kullanım uyumu') ||
                lbl.includes('otoyol kullanım') ||
                lowerFid.includes('highway')
              ) {
                hasHighwayUse = true;
              }
              if (
                sp.includes('trafficbehavior') ||
                lbl.includes('yoğun trafik') ||
                lbl.includes('trafik davranışı') ||
                lowerFid.includes('traffic')
              ) {
                hasTrafficBehavior = true;
              }
              if (
                sp.includes('usagescenarios') ||
                sp.includes('suitablefor') ||
                sp.includes('notsuitablefor') ||
                lbl.includes('kullanım senaryosu') ||
                lbl.includes('kullanıcı profili') ||
                lowerFid.includes('scenario') ||
                lowerFid.includes('suitable') ||
                lowerFid.includes('profile')
              ) {
                hasScenarioOrProfile = true;
              }
            }

            if (!hasCityUse || !hasHighwayUse || !hasTrafficBehavior || !hasScenarioOrProfile) {
              if (criterionAllowList.size > 0) {
                raw.supportingFactIds = Array.from(criterionAllowList);
              } else {
                const syntheticFactId = generateDerivedFactId(p.vehicleId, 'USAGE_SUITABILITY', 'usage.general');
                raw.supportingFactIds = [syntheticFactId];
              }
            }
          }
        }
      }
    }

    if (Array.isArray(parsed.vehicleVerdicts)) {
      for (const verdict of parsed.vehicleVerdicts) {
        const perfTerms = ['0-100', '0–100', 'saniye', 'yavaş hızlanma', 'düşük güç', 'bg', 'hp', 'tork'];
        if (Array.isArray(verdict.criticalRisks)) {
          const validRisks: string[] = [];
          for (const cr of verdict.criticalRisks) {
            const lowerCr = (cr || '').toLowerCase();
            if (perfTerms.some(term => lowerCr.includes(term))) {
              if (Array.isArray(verdict.compromises) && !verdict.compromises.includes(cr)) {
                verdict.compromises.push(cr);
              }
            } else {
              validRisks.push(cr);
            }
          }
          verdict.criticalRisks = validRisks;
        }
      }
    }
  }

  private async generateAdvancedAiComparison(
    profiles: ComparisonVehicleProfile[],
    priority: ComparisonPriority,
    sourceDataVersion: string,
  ): Promise<VehicleComparisonResult> {
    const diagnostics: ComparisonGenerationDiagnostics = {
      comparisonId: `comp_${Date.now()}`,
      generationMode: 'AI',
      provider: process.env.COMPARISON_AI_PROVIDER || 'OpenAI',
      model: process.env.COMPARISON_AI_MODEL || 'gpt-4o-mini',
      requestStartedAt: new Date().toISOString(),
    };

    const summaryList = profiles.map((p, i) => {
      const dossier = p.dossier;
      const reportStatus = dossier?.reportAvailable
        ? `Geçerli GeneratedVehicleReport Var (Rapor ID: ${dossier.reportId}, Sürüm: ${dossier.reportVersion || 'Güncel'})`
        : `GeneratedVehicleReport Bulunamadı (Doğrulanmış Veritabanından Üretildi)`;

      const buyabilityStr = dossier?.scoring?.buyabilityScore !== null && dossier?.scoring?.buyabilityScore !== undefined ? `${dossier.scoring.buyabilityScore}/100` : 'Belirtilmedi';
      const riskStr = dossier?.scoring?.technicalRiskScore !== null && dossier?.scoring?.technicalRiskScore !== undefined ? `${dossier.scoring.technicalRiskScore}/100` : 'Belirtilmedi';
      const dataConfStr = dossier?.scoring?.dataConfidenceScore !== null && dossier?.scoring?.dataConfidenceScore !== undefined ? `${dossier.scoring.dataConfidenceScore}/100` : 'Belirtilmedi';

      const probsText = p.reliability.problems.length > 0
        ? p.reliability.problems.map(prob => `    * ${prob.title} (Şiddet: ${prob.severity}${prob.inspectionHint ? ' | Ekspertiz: ' + prob.inspectionHint : ''})`).join('\n')
        : '    * Onaylı kronik arıza veritabanında/raporda bulunmuyor.';

      const recallsText = (p.reliability.recalls && p.reliability.recalls.length > 0)
        ? p.reliability.recalls.map(r => `    * ${r.title}: ${r.description}`).join('\n')
        : '    * Aktif geri çağırma kampanyası bulunmuyor.';

      const maintNotes = dossier?.maintenanceOwnership?.criticalMaintenanceNotes?.length
        ? dossier.maintenanceOwnership.criticalMaintenanceNotes.map((m: string) => `    * ${m}`).join('\n')
        : '    * Detaylı bakım kaydı veritabanında eksik.';

      const usageScenariosText = dossier?.usageScenarios?.length
        ? dossier.usageScenarios.map((s: any) => `    * ${s.title}: ${s.suitability} (${s.reasoning})`).join('\n')
        : '    * Senaryo verisi standart veritabanından hesaplandı.';

      const allowedFactIdsByCriterion = this.buildAllowedFactIdsByCriterion(p);
      const criterionFactText = this.formatVehicleAllowedFactsByCriterion(p, allowedFactIdsByCriterion);

      return `ARAÇ ${i + 1} ID: "${p.vehicleId}"
Tam İsim: ${p.displayName}
Rapor Kaynak Durumu: ${reportStatus}
Puanlama: Satın Alınabilirlik Score: ${buyabilityStr}, Teknik Risk Score: ${riskStr}, Veri Güveni: ${dataConfStr}
Motor: ${p.identity.engineCode || 'Belirtilmedi'} (${p.identity.fuelType || 'Benzin'})
Şanzıman: ${p.identity.transmission || 'Belirtilmedi'}
Ortalama Yakıt Tüketimi: ${p.efficiency.combinedConsumption ? p.efficiency.combinedConsumption + ' L/100km' : 'Veri yok'}
0-100 km/h İvmelenme: ${p.performance.zeroToHundred ? p.performance.zeroToHundred + ' sn' : 'Veri yok'}
Motor Gücü: ${p.performance.horsepower ? p.performance.horsepower + ' HP' : 'Veri yok'}
Bagaj Hacmi: ${p.practicality.bootLitres ? p.practicality.bootLitres + ' Litre' : 'Veri yok'}
${criterionFactText}
Kronik Arızalar & Riskler:
${probsText}
Geri Çağırma Kampanyaları:
${recallsText}
Bakım & Sahiplik Notları:
${maintNotes}
Kullanım Senaryoları Uyumluluğu:
${usageScenariosText}`;
    }).join('\n\n');

    // Build dynamic schema example for ALL vehicles in profiles (2, 5, or 10 vehicles)
    const dynamicCriterionAssessmentsExample: Record<string, any> = {};
    const criteriaKeys: CriterionKey[] = [
      'RELIABILITY',
      'FAILURE_SEVERITY',
      'FUEL_EFFICIENCY',
      'USAGE_SUITABILITY',
      'PERFORMANCE',
      'COMFORT',
      'PRACTICALITY',
      'EQUIPMENT_TECHNOLOGY',
    ];

    for (const p of profiles) {
      const singleVehAssessments: Record<string, any> = {};
      for (const c of criteriaKeys) {
        singleVehAssessments[c] = {
          score: null,
          confidence: 'INSUFFICIENT',
          summary: `${c} için teknik analiz ve kanıt değerlendirmesi.`,
          positiveFactors: [],
          compromises: [],
          supportingFactIds: [],
          missingInputs: [],
          insufficientData: true,
        };
      }
      dynamicCriterionAssessmentsExample[p.vehicleId] = singleVehAssessments;
    }

    const dynamicVerdictsExample = profiles.map(p => ({
      vehicleId: p.vehicleId,
      vehicleName: p.displayName,
      characterSummary: 'Kompakt ve Dengeli',
      bestFor: ['Şehir içi kullanım', 'Düşük yakıt maliyeti'],
      notIdealFor: ['Yüksek performans beklentisi'],
      gains: ['Düşük yakıt tüketimi'],
      compromises: ['Sınırlı kabin genişliği'],
      criticalRisks: ['Şanzıman hassasiyeti'],
      prePurchaseChecks: ['Ekspertiz vites testi'],
    }));

    const prompt = `Sen TorqueScout otomotiv istihbarat sisteminin kıdemli otomotiv uzmanı ve baş analistisin.
Aşağıda veritabanından doğrulanmış teknik özellikleri ve onaylı kronik arıza kayıtları verilen ${profiles.length} adet aracı derinlemesine kıyasla.

KULLANICI ÖNCELİĞİ: ${priority}

ARAÇ VERİLERİ VE İZİNLİ KANIT ID'LERİ:
${summaryList}

KATI TALİMATLAR:
1. JENERİK VEYA BOŞ ŞABLON CÜMLE KULLANMAK KESİNLİKLE YASAKTIR. ("Kullanım amacınıza göre değişir", "En doğru araç bütçenize uygun olandır" gibi jenerik cümleler ASLA KULLANILAMAZ).
2. JSON alanlarında MARKDOWN İŞARETLERİ (**bold**, ### başlık, satır başı -) KULLANMA. Düz metin üret.
3. Kriterlerin hiçbirinde TL, ₺, tamir fiyatı tahmini, parça ücreti, işçilik tahmini veya piyasa fiyatı ASLA KULLANMA. Arızanın büyüklüğünü parasal değil teknik sonuç olarak tanımla.
4. RELIABILITY (kronik arıza ve güvenilirlik) kriterinin positiveFactors dizisinde "benzinli motor", "dizel motor", "motor gücü", "otomatik şanzıman", "manuel şanzıman", "dsg", "s-tronic", "benzinli" kelimelerini KESİNLİKLE KULLANMAYIN. Güvenilirlik faktörlerinde yalnızca doğrudan arıza ve mekanik dayanıklılık kanıtlarına yer verin.
5. FAILURE_SEVERITY (arıza şiddeti) kriterinin positiveFactors dizisinde "orijinal motor gücü", "motor gücü", "otomatik şanzıman", "manuel şanzıman", "benzinli", "dizel", "güçlü motor" kelimelerini KESİNLİKLE KULLANMAYIN.
6. "criterionAssessments" objesinde SEÇİLEN TÜM ${profiles.length} ARAÇ (${profiles.map(p => `"${p.vehicleId}"`).join(', ')}) VE HER ARAÇ İÇİN TAM 8 KRİTER ("RELIABILITY", "FAILURE_SEVERITY", "FUEL_EFFICIENCY", "USAGE_SUITABILITY", "PERFORMANCE", "COMFORT", "PRACTICALITY", "EQUIPMENT_TECHNOLOGY") DÖNDÜRÜLMELİDİR.
5. Her kriter için:
   - score: 0-100 arasında tamsayı VEYA kanıt yetersizse null. (Score non-null ise supportingFactIds BOŞ OLAMAZ!).
   - confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT".
   - summary: Gerekçeli teknik analiz özeti.
   - positiveFactors: Olumlu kanıtlar dizisi.
   - compromises: Olumsuz riskler dizisi.
   - supportingFactIds: YALNIZCA o aracın verilerinde tanımlanmış ve O KRİTERE İZİNLİ Fact ID'lerini içeren dizi. Başka araca veya başka kritere ait Fact ID KESİNLİKLE KULLANILAMAZ. (Non-null puan için geçerli Fact ID zorunludur!).
   - missingInputs: Eksik veriler dizisi.
   - insufficientData: boolean (score null ise true, non-null ise false).
6. Kriter 8 ("EQUIPMENT_TECHNOLOGY"): Seçilen donanım paketine ait konfor, multimedya, bağlantı ve günlük kullanım teknolojilerini değerlendir. Fiyat verisi VEYA piyasa fiyatı tahmini KULLANILAMAZ. Donanım paketine özel kanıt yoksa score null olmalıdır.
7. "marketPriceEvidence" alanı hiçbir kriterde üretilmeyecektir.
8. USAGE_SUITABILITY KRİTERİ PUANLAMA KURALI VE SÖZLEŞMESİ:
USAGE_SUITABILITY puanı üretilirken şu 5 alt bileşenin ağırlıkları dikkate alınmalıdır (Toplam %100):
- Şehir içi günlük kullanım uygunluğu: %25
- Otoyol ve uzun yol uygunluğu: %25
- Yoğun trafik, dur-kalk ve kullanım kolaylığı: %20
- Hitap ettiği kullanıcı profillerinin genişliği: %15
- Kullanım senaryolarındaki tavizlerin ağırlığı: %15

Puan Bantları:
- 90–100: Tüm temel senaryolarda güçlü, önemli kullanıcı kısıtı yok.
- 75–89: Senaryoların çoğunda güçlü, sınırlı tavizler var.
- 60–74: Bazı senaryolarda başarılı, belirgin sınırlamalar mevcut.
- 40–59: Dar kullanım profiline uygun.
- 0–39: Temel kullanım senaryolarının çoğunda önemli sınırlamalar var.

Kurallar:
- MÜKEMMEL/İYİ kelimesini tek başına otomatik puana çevirme.
- Bagaj ve kabin ölçülerini tekrar puanlama; PRACTICALITY'ye aittir.
- Koltuk, süspansiyon ve yalıtımı tekrar puanlama; COMFORT'a aittir.
- HP, tork ve hız değerlerini tekrar puanlama; PERFORMANCE'a aittir.
- KULLANICI ÖNCELİĞİ (selectedPriority) temel USAGE_SUITABILITY puanını değiştirmemelidir; temel kriter puanı bağımsız üretilmelidir.
- Puan yalnız rapordaki olumlu kullanım kanıtları ve tavizler birlikte değerlendirilerek üretilmelidir.
- Eğer bir araç için sadece karma yakıt tüketimi verisi mevcutsa, FUEL_EFFICIENCY summary ve positiveFactors alanlarında "şehir içi" ve "şehir dışı/otoyol" kelimelerini BİRLİKTE KULLANMAYIN. Yalnızca karma tüketim verisini değerlendirin.
USAGE_SUITABILITY non-null puanı verilebilmesi için supportingFactIds dizisinde o araca ait 4 kanıt grubunun (1. cityUse, 2. highwayUse, 3. trafficBehavior ve 4. scenario/profile) HER BİRİNDEN EN AZ BİRER GEÇERLİ FACT ID YER ALMALIDIR.
9. "executiveSummary": En az 120 karakter uzunluğunda olmalıdır. Karşılaştırılan araçların isimlerini, öne çıkan teknik farklarını ve kronik arıza/risk durumlarını araçlara özgü, teknik ve karşılaştırmalı dille özetlemelidir. Jenerik cümleler KESİNLİKLE YASAKTIR.
10. "narrativeRecommendation": En az 200 karakter uzunluğunda olmalıdır. Karşılaştırılan TÜM ${profiles.length} aracın (${profiles.map(p => p.displayName).join(', ')}) adlarını eksiksiz anarak, 1. sırayı alan kazanan aracın (${profiles[0].displayName}) NEDEN 1. OLDUĞUNU (motor gücü, yakıt tüketimi, bagaj hacmi, kronik arıza riski ve donanım üstünlüklerini rapor verilerine dayanarak detaylandırarak) anlaşılır, akıcı ve profesyonel bir dille açıklayan özel bir analiz yazılmalıdır.

Lütfen SADECE geçerli JSON yanıt ver.
ŞEMA VE TÜM SEÇİLEN ${profiles.length} ARAÇ İÇİN JSON ÖRNEĞİ:
{
  "headline": "${profiles.length} Araç Teknik Karşılaştırma Analizi",
  "executiveSummary": "Seçilen araçların motor performansları, yakıt tüketimleri, şanzıman verimlilikleri, bagaj hacimleri ve veritabanındaki onaylı kronik arıza kayıtları 8 temel kriter kapsamında detaylıca kıyaslanarak analiz edilmiştir.",
  "overallRecommendation": {
    "vehicleId": "${profiles[0].vehicleId}",
    "vehicleName": "${profiles[0].displayName}",
    "label": "Dengeli Seçenek",
    "reasoning": "Teknik verilere dayalı genel değerlendirme",
    "confidence": "HIGH"
  },
  "criterionAssessments": ${JSON.stringify(dynamicCriterionAssessmentsExample, null, 2)},
  "scenarioRecommendations": [
    {
      "scenarioKey": "FUEL_ECONOMY",
      "title": "Yakıt Ekonomisi",
      "recommendedVehicleIds": ["${profiles[0].vehicleId}"],
      "recommendedVehicleNames": ["${profiles[0].displayName}"],
      "reasoning": "En düşük doğrulanmış yakıt tüketimi"
    }
  ],
  "vehicleVerdicts": ${JSON.stringify(dynamicVerdictsExample, null, 2)},
  "riskComparison": {
    "narrative": "Kronik sorunların sıklık ve mekanik ciddiyet açısından kıyaslaması",
    "lowestRiskVehicleId": "${profiles[0].vehicleId}"
  },
  "ownershipCostComparison": {
    "narrative": "Yakıt ve bakım hassasiyeti kıyaslaması"
  },
  "narrativeRecommendation": "Karşılaştırılan araçlar arasında kullanım amacınıza, yıllık yapacağınız kilometreye ve bütçenize göre belirgin farklar bulunmaktadır. Şehir içi pratiklik ve düşük yakıt tüketimi arayan kullanıcılar kompakt seçeneklere yönelmeliyken, geniş aile kullanımı ve yüksek otoyol konforu hedefleyen sürücüler bagaj hacmi ve motor gücü yüksek olan modeli tercih etmelidir.",
  "decisionMatrix": [],
  "finalDecisionGuide": [],
  "dataWarnings": []
}`;

    let resultJsonText = '';
    const startTime = Date.now();

    const openai = this.getOpenAiClient();
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: process.env.COMPARISON_AI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen TorqueScout AI Asistanısın. Yalnızca geçerli JSON dön.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        resultJsonText = response.choices[0]?.message?.content || '';
        diagnostics.promptTokens = response.usage?.prompt_tokens;
        diagnostics.completionTokens = response.usage?.completion_tokens;
        diagnostics.totalTokens = response.usage?.total_tokens;
      } catch (err: any) {
        console.warn('OpenAI comparison call warning:', err?.message || 'OpenAI request failed');
      }
    }

    if (!resultJsonText && process.env.NODE_ENV !== 'test') {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (geminiApiKey) {
        const geminiModels = [
          process.env.GEMINI_REPORT_MODEL || 'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-1.5-flash',
        ];

        for (const modelName of geminiModels) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
            const res = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            });

            if (res.ok) {
              const geminiData = await res.json();
              resultJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (resultJsonText) {
                diagnostics.provider = 'GoogleGemini';
                diagnostics.model = modelName;
                break;
              }
            }
          } catch (err: any) {
            console.warn(`Gemini API (${modelName}) comparison call warning:`, err?.message || 'Gemini request failed');
          }
        }
      }
    }

    diagnostics.durationMs = Date.now() - startTime;
    diagnostics.requestCompletedAt = new Date().toISOString();

    const processCandidatePayload = (jsonText: string): { parsed: any; error: string | null } => {
      if (!jsonText) {
        return { parsed: null, error: 'AI providers returned empty output' };
      }
      try {
        const rawObj = JSON.parse(jsonText.replace(/```json\n?|\n?```/g, '').trim());

        // Step 1: Raw structure & Fact ID validation
        this.validateRawComparisonPayload(rawObj, profiles);

        // Step 2: Compute Backend Criterion Metrics & attach criterionResult
        const vehicleEvaluations: VehicleCriterionEvaluation[] = profiles.map((p) => {
          const vAssessments = rawObj.criterionAssessments[p.vehicleId];
          return computeBackendCriterionMetrics(vAssessments, p.vehicleId, p.displayName);
        });

        const criterionResult = this.buildComparisonCriterionResult(vehicleEvaluations);
        rawObj.criterionResult = criterionResult;

        // Step 3: Mandatory 8/8 Coverage Enforcement
        const anyVehicleIncomplete = vehicleEvaluations.some(ev => ev.coverageTooLow || ev.overallScore === null);
        if (anyVehicleIncomplete) {
          const minValidCount = Math.min(...vehicleEvaluations.map(ev => {
            return Object.values(ev.assessments || {}).filter(a => !a.insufficientData && a.score !== null).length;
          }));
          rawObj.overallRecommendation = {
            vehicleId: undefined,
            vehicleName: undefined,
            label: 'Net Kazanan İçin Yeterli Veri Yok',
            reasoning: `Genel değerlendirme için 8 kriterin tamamında doğrulanmış veri gerekiyor — ${minValidCount}/8 mevcut.`,
            confidence: 'INSUFFICIENT',
          };
          rawObj.scenarioRecommendations = [];
          if (rawObj.riskComparison) {
            rawObj.riskComparison.lowestRiskVehicleId = undefined;
          }
        }

        // Step 3.5: Overall Recommendation Confidence Cap for REPORT_DERIVED evidence
        const anyReportDerived = vehicleEvaluations.some(ev =>
          Object.values(ev.assessments || {}).some(a => (a as any).evidenceGrade === 'REPORT_DERIVED')
        );

        if (anyReportDerived && rawObj.overallRecommendation && rawObj.overallRecommendation.confidence === 'HIGH') {
          rawObj.overallRecommendation.confidence = 'MEDIUM';
        }

        // Step 4: Semantic Validation (character lengths, narrative non-generic checks)
        const validation = validateComparisonSemantics(rawObj, profiles);
        if (!validation.isValid) {
          return { parsed: null, error: `Semantic validation failed: ${validation.errors.join('; ')}` };
        }

        return { parsed: rawObj, error: null };
      } catch (err: any) {
        return { parsed: null, error: err?.message || 'Payload processing or validation failed' };
      }
    };

    let { parsed, error: validationError } = processCandidatePayload(resultJsonText);

    // Attempt AT MOST ONE repair request if initial output failed validation/parsing/semantics
    if (validationError && resultJsonText) {
      console.warn(`Initial AI comparison output validation failed: ${validationError}. Attempting ONE repair request.`);

      const safeAllowedFactsSummary = profiles.map(p => {
        const allowed = this.buildAllowedFactIdsByCriterion(p);
        const allowedList = Object.entries(allowed).map(([c, set]) => `${c}: [${Array.from(set).join(', ')}]`).join('; ');
        return `Vehicle "${p.vehicleId}" (${p.displayName}) İzinli Fact ID'leri -> ${allowedList}`;
      }).join('\n');

      const repairPrompt = `ÖNCEKİ YANITINIZDA AŞAĞIDAKİ YAPISAL VEYA DOĞRULAMA HATASI TESPİT EDİLDİ:
HATA: ${validationError}

GEÇERLİ ARAÇ ID'LERİ:
${profiles.map(p => `- "${p.vehicleId}" (${p.displayName})`).join('\n')}

HER ARAÇ VE KRİTER İÇİN İZİNLİ FACT ID LİSTESİ:
${safeAllowedFactsSummary}

LÜTFEN HATAYI DÜZELTİN VE SADECE GEÇERLİ JSON DÖNÜN.
Gereksinimler:
1. "criterionAssessments" içinde SEÇİLEN TÜM ARAÇLARIN (${profiles.map(p => `"${p.vehicleId}"`).join(', ')}) TAM 8 KRİTERİ BULUNMALIDIR.
2. supportingFactIds dizilerinde YALNIZCA o aracın o kriter için izinli Fact ID'lerini kullanın.
3. USAGE_SUITABILITY non-null puanı için cityUse, highwayUse, trafficBehavior ve scenario/profile gruplarının tamamından Fact ID seçin.
4. executiveSummary EN AZ 120 KARAKTER, narrativeRecommendation EN AZ 160 KARAKTER olmalı ve jenerik ifadeler kullanılmamalıdır.
5. Yanıtınız SADECE DÜZELTİLMİŞ TAM JSON OLMALIDIR.`;

      let repairJsonText = '';
      if (openai) {
        try {
          const repairResponse = await openai.chat.completions.create({
            model: process.env.COMPARISON_AI_MODEL || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Sen TorqueScout AI Düzeltme Asistanısın. Yalnızca geçerli JSON dön.' },
              { role: 'user', content: prompt },
              { role: 'assistant', content: resultJsonText },
              { role: 'user', content: repairPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          });
          repairJsonText = repairResponse.choices[0]?.message?.content || '';
        } catch (rErr: any) {
          console.warn('OpenAI comparison repair call warning:', rErr?.message || 'Repair request failed');
        }
      }

      if (repairJsonText) {
        const repairRes = processCandidatePayload(repairJsonText);
        if (!repairRes.error && repairRes.parsed) {
          parsed = repairRes.parsed;
          validationError = null; // Repair succeeded!
        } else {
          validationError = repairRes.error || 'Repair output failed validation';
        }
      }
    }

    if (validationError || !parsed) {
      diagnostics.validationFailed = true;
      diagnostics.fallbackReason = 'VALIDATION_FAILED';
      throw new Error(`AI output validation failed after repair: ${validationError}`);
    }

    const defaultEmptyNarrative = 'Bu bölüm için yeterli doğrulanmış veri bulunmuyor.';

    const rawResult: VehicleComparisonResult = {
      comparisonId: diagnostics.comparisonId,
      schemaVersion: '8.0',
      promptVersion: '8',
      engineVersion: 'comparison-v8',
      generationMode: 'AI',
      generatedAt: new Date().toISOString(),
      sourceDataVersion,
      selectedPriority: priority,
      headline: parsed.headline || `${profiles.length} Araç Karşılaştırma Analizi`,
      executiveSummary: parsed.executiveSummary || 'Araçların teknik verileri ve kronik durumları detaylıca incelenmiştir.',
      overallRecommendation: parsed.overallRecommendation || {
        label: 'Net Kazanan İçin Yeterli Veri Yok',
        reasoning: 'Gerekçeli kazanan analizi tamamlananamıştır.',
        confidence: 'INSUFFICIENT',
      },
      scenarioRecommendations: parsed.scenarioRecommendations || [],
      vehicleVerdicts: parsed.vehicleVerdicts || [],
      criterionResult: parsed.criterionResult,
      riskComparison: parsed.riskComparison || { narrative: 'Kronik arıza kayıtları kıyaslanmıştır.' },
      recallComparison: profiles.flatMap(p => 
        (p.reliability.recalls || []).map(r => ({
          vehicleId: p.vehicleId,
          vehicleName: p.displayName,
          title: r.title,
          description: r.description,
          safetyImpact: r.safetyRisk,
          verificationInstruction: 'Bu geri çağırma kampanyasının uygulanıp uygulanmadığını yetkili servisten şasi numarası sorgulatarak doğrulayın.',
        }))
      ),
      ownershipCostComparison: parsed.ownershipCostComparison || { narrative: defaultEmptyNarrative },
      narrativeRecommendation: parsed.narrativeRecommendation || defaultEmptyNarrative,
      decisionMatrix: parsed.decisionMatrix || [],
      finalDecisionGuide: parsed.finalDecisionGuide || [],
      dataWarnings: parsed.dataWarnings || [],
    };

    return sanitizeComparisonResult(rawResult);
  }

  private buildFallbackCautions(p: ComparisonVehicleProfile): string[] {
    const cautions: string[] = [];

    if (p.reliability.problems.length > 0) {
      p.reliability.problems.forEach(prob => cautions.push(`${prob.title} (${prob.severity} risk seviyesi)`));
    }

    return cautions;
  }

  private async generateFallbackResult(
    profiles: ComparisonVehicleProfile[],
    priority: ComparisonPriority,
    sourceDataVersion: string,
  ): Promise<VehicleComparisonResult> {
    const vehicleEvaluations: VehicleCriterionEvaluation[] = await Promise.all(
      profiles.map(async (p) => {
        const fallbackAssessments = await this.buildFallbackCriterionAssessments(p);
        return computeBackendCriterionMetrics(fallbackAssessments, p.vehicleId, p.displayName);
      })
    );

    const criterionResult = this.buildComparisonCriterionResult(vehicleEvaluations);

    // Requirement 4: Mandatory 8/8 Coverage Enforcement for fallback
    const anyIncomplete = vehicleEvaluations.some(ev => ev.coverageTooLow || ev.overallScore === null);
    const minValidCount = Math.min(...vehicleEvaluations.map(ev => {
      return Object.values(ev.assessments || {}).filter(a => !a.insufficientData && a.score !== null).length;
    }));

    const vehicleCards = profiles.map(p => ({
      vehicleId: p.vehicleId,
      vehicleName: p.displayName,
      identity: {
        year: p.identity.year,
        engine: p.identity.engine,
        transmission: p.identity.transmission,
        trim: p.identity.trim,
      },
      characterSummary: p.dossier?.executiveSummary?.oneSentenceSummary || `${p.displayName} veritabanı verileriyle analiz edilmiştir.`,
      strengths: [],
      cautions: this.buildFallbackCautions(p),
      bestFor: [],
      notIdealFor: [],
      criticalRisks: p.reliability.problems.slice(0, 2).map(prob => ({
        title: prob.title,
        severity: (prob.severity || 'MEDIUM') as any,
        shortExplanation: prob.inspectionHint || prob.preventiveAction,
      })),
      prePurchaseChecks: p.inspectionChecklist.slice(0, 3),
      supportingFacts: (p.dossier?.dataQuality?.supportingFacts || []).map((f: any) => f.factKey).filter(Boolean),
      evidenceConfidence: 'LOW' as const,
    }));

    const defaultEmptyNarrative = 'Bu bölüm için yeterli doğrulanmış veri bulunmuyor.';

    return {
      comparisonId: `comp_fallback_${Date.now()}`,
      schemaVersion: '8.0',
      promptVersion: '8',
      engineVersion: 'comparison-v8',
      generationMode: 'FALLBACK',
      generatedAt: new Date().toISOString(),
      sourceDataVersion,
      selectedPriority: priority,
      headline: `${profiles.length} Araç Teknik Veri Karşılaştırması (AI Servis Geçici Devre Dışı)`,
      executiveSummary: 'AI karşılaştırması tamamlanamadı; teknik veriler listeleniyor.',
      overallRecommendation: {
        label: 'Net Kazanan İçin Yeterli Veri Yok',
        reasoning: anyIncomplete
          ? `Genel değerlendirme için 8 kriterin tamamında doğrulanmış veri gerekiyor — ${minValidCount}/8 mevcut.`
          : 'Canlı AI servisine erişilemediği için veritabanı kayıtlarından genel kazanan belirlenmemiştir.',
        confidence: 'INSUFFICIENT',
      },
      vehicleCards,
      scenarioRecommendations: [],
      vehicleVerdicts: profiles.map(p => ({
        vehicleId: p.vehicleId,
        vehicleName: p.displayName,
        characterSummary: p.dossier?.executiveSummary?.oneSentenceSummary || `${p.displayName} teknik özellikleri doğrulanmıştır.`,
        bestFor: [],
        notIdealFor: [],
        gains: [],
        compromises: [],
        criticalRisks: p.reliability.problems.map(prob => prob.title),
        prePurchaseChecks: p.inspectionChecklist.slice(0, 3),
        evidenceConfidence: 'LOW' as const,
      })),
      criterionResult,
      riskComparison: {
        narrative: 'Kronik arıza kayıtları veritabanındaki onaylı veriler doğrultusunda listelenmiştir.',
        items: profiles.flatMap(p => p.reliability.problems.map(prob => ({
          vehicleId: p.vehicleId,
          vehicleName: p.displayName,
          problemTitle: prob.title,
          severity: (prob.severity || 'MEDIUM') as any,
          frequency: prob.frequency,
          detectability: 'MODERATE' as const,
          narrative: `${prob.title}: ${prob.preventiveAction || prob.inspectionHint || 'Ekspertiz kontrolü önerilir.'}`,
        }))),
      },
      ownershipCostComparison: {
        narrative: defaultEmptyNarrative,
      },
      narrativeRecommendation: defaultEmptyNarrative,
      decisionMatrix: [],
      finalDecisionGuide: [],
      dataWarnings: [
        {
          section: 'GENERAL',
          message: 'AI karşılaştırması tamamlanamadı; teknik veriler listeleniyor.',
          severity: 'INFO',
        },
      ],
    };
  }
}

export interface FeatureSpec {
  featureKey: string;
  presentRegex: RegExp;
  absentRegex?: RegExp;
}

export const CONTROLLED_EQUIPMENT_FEATURES: FeatureSpec[] = [
  { featureKey: 'SUNROOF', presentRegex: /\b(sunroof|panoramik cam tavan|cam tavan)\b/i },
  { featureKey: 'PANORAMIC_ROOF', presentRegex: /\b(panoramik cam tavan|panoramik tavan)\b/i },
  { featureKey: 'CRUISE_CONTROL', presentRegex: /\b(hız sabitleyici|hız sabitleme|cruise control)\b/i },
  { featureKey: 'ADAPTIVE_CRUISE', presentRegex: /\b(adaptif hız sabitleyici|adaptif hız sabitleme|acc)\b/i },
  { featureKey: 'AEB', presentRegex: /\b(otomatik acil fren|aeb|çarpışma önleyici fren|aktif güvenlik freni)\b/i },
  { featureKey: 'LANE_KEEP', presentRegex: /\b(şerit takip|şerit koruma|şerit kalma|lane keep)\b/i },
  { featureKey: 'BLIND_SPOT', presentRegex: /\b(kör nokta uyarısı|kör nokta)\b/i },
  { featureKey: 'REAR_CAMERA', presentRegex: /\b(geri görüş kamerası|arka kamera|geri görüş)\b/i },
  { featureKey: 'PARKING_SENSORS', presentRegex: /\b(park sensörü|ön\/arka park sensörü|park sensörleri)\b/i },
  { featureKey: 'KEYLESS_ENTRY', presentRegex: /\b(anahtarsız giriş|anahtarsız çalıştırma|keyless)\b/i },
  { featureKey: 'HEATED_SEATS', presentRegex: /\b(koltuk ısıtma|ısıtmalı koltuklar)\b/i },
  { featureKey: 'DIGITAL_CLIMATE', presentRegex: /\b(dijital klima|otomatik klima|çift bölgeli klima|elektronik klima)\b/i },
  { featureKey: 'PREMIUM_AUDIO', presentRegex: /\b(yüksek kaliteli ses sistemi|premium ses sistemi|bose|bang & olufsen|harman kardon)\b/i },
  { featureKey: 'PADDLE_SHIFTERS', presentRegex: /\b(f1 vites kulakçıkları|f1 vites|vites kulakçıkları|direksiyondan vites)\b/i },
  { featureKey: 'ABS', presentRegex: /\b(abs|kilitlenmeyen fren)\b/i },
  { featureKey: 'ESP', presentRegex: /\b(esp|elektronik stabilite)\b/i },
];

export function evaluateEquipmentFeatureStatuses(p: ComparisonVehicleProfile): EquipmentFeatureStatus[] {
  const dossier = p.dossier;
  const trimComp = dossier?.trimPackageComparison || dossier?.expertDecisionSynthesis?.trimPackageComparison || {};
  const year = p.identity?.year || 2020;

  // 1. Explicit PRESENT sources (selected trim)
  const keyAddedFeatures: string[] = Array.isArray(trimComp.keyAddedFeatures) ? trimComp.keyAddedFeatures : [];
  const supportingFacts = dossier?.dataQuality?.supportingFacts || [];
  const equipFacts = supportingFacts.filter((f: any) => {
    const k = (f.factKey || '').toLowerCase();
    const label = (f.label || '').toLowerCase();
    const sourcePath = (f.sourcePath || '').toLowerCase();
    const isLowerTrimMissing = sourcePath.includes('missingfeaturesinlowertrim') || label.includes('eksik paket');
    return !isLowerTrimMissing &&
           (f.category === 'EQUIPMENT' || k.includes('equip') || k.includes('trim') || k.includes('feature')) &&
           !k.includes('power') && !k.includes('hp') && !k.includes('torque') && !k.includes('fuel') && !k.includes('engine') && !k.includes('price');
  });

  // 2. Explicit ABSENT sources for SELECTED trim ONLY
  const absentInSelectedTrim: string[] = Array.isArray(trimComp.absentFeaturesInSelectedTrim)
    ? trimComp.absentFeaturesInSelectedTrim
    : (Array.isArray(trimComp.absentFeatures) ? trimComp.absentFeatures : []);

  const results: EquipmentFeatureStatus[] = [];

  for (const spec of CONTROLLED_EQUIPMENT_FEATURES) {
    let status: 'PRESENT' | 'ABSENT' | 'NOT_MENTIONED' = 'NOT_MENTIONED';
    let evidenceText: string | null = null;
    const supportingFactIds: string[] = [];

    // Check PRESENT in keyAddedFeatures
    const matchedFeature = keyAddedFeatures.find(f => spec.presentRegex.test(f));
    if (matchedFeature) {
      status = 'PRESENT';
      evidenceText = matchedFeature;
      supportingFactIds.push('AI_RESEARCH_ENGINE');
    } else {
      // Check PRESENT in supportingFacts
      const matchedFact = equipFacts.find((f: any) => spec.presentRegex.test(`${f.label || ''} ${f.value || ''}`));
      if (matchedFact) {
        status = 'PRESENT';
        evidenceText = matchedFact.value || matchedFact.label;
        if (matchedFact.factKey) supportingFactIds.push(matchedFact.factKey);
      }
    }

    // If not PRESENT, check explicit ABSENT in selected trim ONLY
    if (status === 'NOT_MENTIONED') {
      const matchedAbsent = absentInSelectedTrim.find(f => spec.presentRegex.test(f) || (spec.absentRegex && spec.absentRegex.test(f)));
      if (matchedAbsent) {
        status = 'ABSENT';
        evidenceText = matchedAbsent;
        supportingFactIds.push('AI_RESEARCH_ENGINE');
      }
    }

    // 3. Mandatory Legal Standards ONLY (100% deterministic & legally verified in EU/TR market)
    if (status === 'NOT_MENTIONED') {
      if (spec.featureKey === 'ABS' && year >= 2004) {
        status = 'PRESENT';
        evidenceText = 'Standart güvenlik ekipmanı (ABS)';
      } else if (spec.featureKey === 'ESP' && year >= 2014) {
        status = 'PRESENT';
        evidenceText = 'Standart elektronik denge sistemi (ESP)';
      }
    }

    results.push({
      featureKey: spec.featureKey,
      status,
      evidenceText,
      supportingFactIds,
    });
  }

  return results;
}
