import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ComparisonReportLoaderService, VehicleComparisonDossier } from './comparison-report-loader.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CompareVehiclesDto, ComparisonChatDto } from './comparison.dto';
import { FeatureKey, ApprovalStatus, SubscriptionTier, UsagePeriodType } from '@prisma/client';
import OpenAI from 'openai';
import * as crypto from 'crypto';

import {
  ComparisonPriority,
  ComparisonQualityCheck,
  ComparisonVehicleProfile,
  CriterionAssessment,
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
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
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

    const profiles = await this.loadVehicleProfiles(requestedIds);

    const sourceDataVersion = computeSourceDataVersionFromProfiles(profiles);
    const cacheKey = `comp_${sourceDataVersion}_${priority}`;

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

      await this.recordHistory(requestedIds, comparisonResult, userId).catch(() => null);
    }

    return {
      success: true,
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
        (dossier.dataQuality?.supportingFacts || []).map((f: any) => f.factKey).filter(Boolean)
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
        .forEach(f => relFacts.add(f.factKey));

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
        .forEach(f => usageFacts.add(f.factKey));

      // 4. SAFETY
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => {
          const k = f.factKey.toLowerCase();
          return k.includes('safety') || k.includes('ncap') || k.includes('adas') || k.includes('airbag') || k.includes('recall');
        })
        .forEach(f => safetyFacts.add(f.factKey));

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
        .forEach(f => comfortFacts.add(f.factKey));

      // 7. PRACTICALITY
      (dossier.dataQuality?.supportingFacts || [])
        .filter(f => {
          const k = f.factKey.toLowerCase();
          return k.includes('boot') || k.includes('trunk') || k.includes('bagaj') || k.includes('practical') || k.includes('space') || k.includes('capacity');
        })
        .forEach(f => pracFacts.add(f.factKey));
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
        .forEach(f => equipTechFacts.add(f.factKey));

      // 9. STRICT CMP_* DERIVED FACT ROUTING TO CRITERION SETS
      (dossier.dataQuality?.supportingFacts || []).forEach((f: any) => {
        const key = f.factKey || f.id;
        if (!key) return;

        if (key.startsWith('CMP_RELIABILITY_') || f.criterion === 'RELIABILITY') {
          relFacts.add(key);
        } else if (key.startsWith('CMP_FAILURE_SEVERITY_') || f.criterion === 'FAILURE_SEVERITY') {
          failFacts.add(key);
        } else if (key.startsWith('CMP_FUEL_EFFICIENCY_') || f.criterion === 'FUEL_EFFICIENCY') {
          fuelFacts.add(key);
        } else if (key.startsWith('CMP_USAGE_SUITABILITY_') || f.criterion === 'USAGE_SUITABILITY') {
          usageFacts.add(key);
        } else if (key.startsWith('CMP_SAFETY_') || f.criterion === 'SAFETY') {
          safetyFacts.add(key);
        } else if (key.startsWith('CMP_PERFORMANCE_') || f.criterion === 'PERFORMANCE') {
          perfFacts.add(key);
        } else if (key.startsWith('CMP_COMFORT_') || f.criterion === 'COMFORT') {
          comfortFacts.add(key);
        } else if (key.startsWith('CMP_PRACTICALITY_') || f.criterion === 'PRACTICALITY') {
          pracFacts.add(key);
        } else if (key.startsWith('CMP_EQUIPMENT_TECHNOLOGY_') || f.criterion === 'EQUIPMENT_TECHNOLOGY') {
          equipTechFacts.add(key);
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

  private async loadVehicleProfiles(variantIds: string[]): Promise<ComparisonVehicleProfile[]> {
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

    const equipTechFacts = Array.from(allowedFactIds['EQUIPMENT_TECHNOLOGY'] || allowedFactIds['VALUE_FOR_MONEY'] || []);
    const equipTechValid = hasTrimEvidence && equipTechFacts.length > 0;
    const equipTech: CriterionAssessment = {
      criterionKey: 'EQUIPMENT_TECHNOLOGY',
      score: equipTechValid ? 70 : null,
      stars: equipTechValid ? 3.5 : null,
      confidence: equipTechValid ? 'MEDIUM' : 'INSUFFICIENT',
      summary: equipTechValid
        ? `${p.displayName} donanım paketi (${p.identity.trim || 'Standart'}) doğrulanmış konfor ve teknoloji özelliklerine sahiptir.`
        : 'Seçili donanım paketine özel doğrulanmış detaylı teknoloji verisi bulunmamaktadır.',
      positiveFactors: equipTechValid ? [`${p.identity.trim || 'Donanım'} paketi özellikleri doğrulanmıştır.`] : [],
      compromises: [],
      supportingFactIds: equipTechValid ? equipTechFacts : [],
      missingInputs: equipTechValid ? [] : ['Donanım ve teknoloji kanıtı eksik'],
      insufficientData: !equipTechValid,
    };

    return {
      RELIABILITY: reliability,
      FAILURE_SEVERITY: emptyCriterion('FAILURE_SEVERITY', 'Arıza ciddiyeti'),
      SEVERITY_DURABILITY: emptyCriterion('SEVERITY_DURABILITY', 'Arıza ciddiyeti'),
      FUEL_EFFICIENCY: emptyCriterion('FUEL_EFFICIENCY', 'Yakıt verimliliği'),
      USAGE_SUITABILITY: emptyCriterion('USAGE_SUITABILITY', 'Kullanım senaryosu ve kullanıcı uyumu'),
      SAFETY: emptyCriterion('SAFETY', 'Güvenlik'),
      PERFORMANCE: emptyCriterion('PERFORMANCE', 'Motor performansı'),
      COMFORT: emptyCriterion('COMFORT', 'Kabin konforu'),
      PRACTICALITY: emptyCriterion('PRACTICALITY', 'Kullanışlılık'),
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

      const factList = (dossier?.dataQuality?.supportingFacts || []).map((f: any) => `      [Fact ID: ${f.factKey}] ${f.label}: ${f.value} (${f.source})`).join('\n');
      const factIdsText = dossier?.supportingFactIds?.length
        ? `Kullanılabilir Fact ID'leri: ${dossier.supportingFactIds.join(', ')}\n${factList}`
        : 'Kullanılabilir Fact ID bulunmuyor.';

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
${factIdsText}
Kronik Arızalar & Riskler:
${probsText}
Geri Çağırma Kampanyaları:
${recallsText}
Bakım & Sahiplik Notları:
${maintNotes}
Kullanım Senaryoları Uyumluluğu:
${usageScenariosText}`;
    }).join('\n\n');

    const prompt = `Sen TorqueScout otomotiv istihbarat sisteminin kıdemli otomotiv uzmanı ve baş analistisin.
Aşağıda veritabanından doğrulanmış teknik özellikleri ve onaylı kronik arıza kayıtları verilen ${profiles.length} adet aracı derinlemesine kıyasla.

KULLANICI ÖNCELİĞİ: ${priority}

ARAÇ VERİLERİ:
${summaryList}

KATI TALİMATLAR:
1. JENERİK VEYA BOŞ ŞABLON CÜMLE KULLANMAK KESİNLİKLE YASAKTIR. ("Kullanım amacınıza göre değişir", "En doğru araç bütçenize uygun olandır" gibi jenerik cümleler ASLA KULLANILAMAZ).
2. JSON alanlarında MARKDOWN İŞARETLERİ (**bold**, ### başlık, satır başı -) KULLANMA. Düz metin üret.
3. Kriterlerin hiçbirinde TL, ₺, tamir fiyatı tahmini, parça ücreti, işçilik tahmini veya piyasa fiyatı ASLA KULLANMA. Arızanın büyüklüğünü parasal değil teknik sonuç olarak tanımla.
4. "criterionAssessments" objesinde SEÇİLEN TÜM ${profiles.length} ARAÇ VE HER ARAÇ İÇİN TAM 8 KRİTER ("RELIABILITY", "FAILURE_SEVERITY", "FUEL_EFFICIENCY", "USAGE_SUITABILITY", "PERFORMANCE", "COMFORT", "PRACTICALITY", "EQUIPMENT_TECHNOLOGY") DÖNDÜRÜLMELİDİR.
5. Her kriter için:
   - score: 0-100 arasında tamsayı VEYA kanıt yetersizse null. (Score non-null ise supportingFactIds BOŞ OLAMAZ!).
   - confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT".
   - summary: Gerekçeli teknik analiz özeti.
   - positiveFactors: Olumlu kanıtlar dizisi.
   - compromises: Olumsuz riskler dizisi.
   - supportingFactIds: YALNIZCA o aracın verilerinde tanımlanmış ve O KRİTERE UYGUN geçerli Fact ID'lerini içeren dizi. (Non-null puan için geçerli Fact ID zorunludur!).
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

Lütfen SADECE geçerli JSON yanıt ver:
{
  "headline": "Kısa ve çarpıcı karşılaştırma başlığı",
  "executiveSummary": "2-3 paragraflık derin teknik ve mantıksal karar özeti",
  "overallRecommendation": {
    "vehicleId": "${profiles[0].vehicleId}",
    "vehicleName": "${profiles[0].displayName}",
    "label": "En Dengeli Seçenek",
    "reasoning": "Gerekçeli kazanan açıklaması",
    "confidence": "HIGH"
  },
  "criterionAssessments": {
    "${profiles[0].vehicleId}": {
      "RELIABILITY": {
        "score": null,
        "confidence": "INSUFFICIENT",
        "summary": "Doğrulanmış kanıt metinleri analiz edilmektedir.",
        "positiveFactors": [],
        "compromises": [],
        "supportingFactIds": [],
        "missingInputs": ["Doğrulanmış kanıt verisi bekleniyor"],
        "insufficientData": true
      },
      "FAILURE_SEVERITY": {
        "score": null,
        "confidence": "INSUFFICIENT",
        "summary": "Arıza ciddiyet analizi bekleniyor.",
        "positiveFactors": [],
        "compromises": [],
        "supportingFactIds": [],
        "missingInputs": [],
        "insufficientData": true
      },
      "FUEL_EFFICIENCY": { "score": null, "confidence": "INSUFFICIENT", "summary": "Veri bekleniyor.", "positiveFactors": [], "compromises": [], "supportingFactIds": [], "missingInputs": [], "insufficientData": true },
      "USAGE_SUITABILITY": { "score": null, "confidence": "INSUFFICIENT", "summary": "Kullanım senaryosu ve kullanıcı uyumu verisi bekleniyor.", "positiveFactors": [], "compromises": [], "supportingFactIds": [], "missingInputs": [], "insufficientData": true },
      "PERFORMANCE": { "score": null, "confidence": "INSUFFICIENT", "summary": "Veri bekleniyor.", "positiveFactors": [], "compromises": [], "supportingFactIds": [], "missingInputs": [], "insufficientData": true },
      "COMFORT": { "score": null, "confidence": "INSUFFICIENT", "summary": "Veri bekleniyor.", "positiveFactors": [], "compromises": [], "supportingFactIds": [], "missingInputs": [], "insufficientData": true },
      "PRACTICALITY": { "score": null, "confidence": "INSUFFICIENT", "summary": "Veri bekleniyor.", "positiveFactors": [], "compromises": [], "supportingFactIds": [], "missingInputs": [], "insufficientData": true },
      "EQUIPMENT_TECHNOLOGY": {
        "score": null,
        "confidence": "INSUFFICIENT",
        "summary": "Donanım ve teknoloji verisi bekleniyor.",
        "positiveFactors": [],
        "compromises": [],
        "supportingFactIds": [],
        "missingInputs": [],
        "insufficientData": true
      }
    }
  },
  "scenarioRecommendations": [
    {
      "scenarioKey": "FUEL_ECONOMY",
      "title": "Yakıt Ekonomisi & Düşük Tüketim",
      "recommendedVehicleIds": ["${profiles[0].vehicleId}"],
      "recommendedVehicleNames": ["${profiles[0].displayName}"],
      "reasoning": "En düşük doğrulanmış yakıt tüketimine sahip"
    }
  ],
  "vehicleVerdicts": [
    {
      "vehicleId": "${profiles[0].vehicleId}",
      "vehicleName": "${profiles[0].displayName}",
      "characterSummary": "Kompakt ve Dengeli Premium",
      "bestFor": ["Şehir içi pratiklik", "Düşük yakıt maliyeti"],
      "notIdealFor": ["Düşük devirde tork beklentisi"],
      "gains": ["Düşük yakıt tüketimi", "Kolay park etme"],
      "compromises": ["Daha sınırlı kabin genişliği"],
      "criticalRisks": ["Şanzıman vuruntu ve bakım hassasiyeti"],
      "prePurchaseChecks": ["Ekspertiz vites geçiş testi"]
    }
  ],
  "riskComparison": {
    "narrative": "Kronik sorunların sıklık ve mekanik ciddiyet açısından kıyaslaması",
    "lowestRiskVehicleId": "${profiles[0].vehicleId}"
  },
  "ownershipCostComparison": {
    "narrative": "Yakıt ve bakım hassasiyeti kıyaslaması"
  },
  "narrativeRecommendation": "Açık konuşmak gerekirse...",
  "decisionMatrix": [],
  "finalDecisionGuide": [],
  "dataWarnings": []
}`;

    let resultJsonText = '';
    const startTime = Date.now();

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
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
        console.warn('OpenAI comparison call warning:', err?.message || err);
      }
    }

    if (!resultJsonText && process.env.NODE_ENV !== 'test') {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (geminiApiKey) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
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
          }
        } catch (err: any) {
          console.warn('Gemini API comparison call warning:', err?.message || err);
        }
      }
    }

    diagnostics.durationMs = Date.now() - startTime;
    diagnostics.requestCompletedAt = new Date().toISOString();

    if (!resultJsonText) {
      diagnostics.fallbackReason = 'PROVIDER_ERROR';
      throw new Error('AI providers returned empty output');
    }

    const parsed = JSON.parse(resultJsonText.replace(/```json\n?|\n?```/g, '').trim());

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

      // REQUIREMENT 1: Authoritative dossierFactIds MUST come ONLY from dataQuality.supportingFacts!
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

        // Clean up legacy marketPriceEvidence in comparison-v7
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

          const factIds: string[] = raw.supportingFactIds;
          if (factIds.length === 0) {
            throw new Error(`Non-null score in ${key} for vehicle ${p.vehicleId} REQUIRES non-empty supportingFactIds`);
          }

          if (dossierFactIds.size === 0) {
            throw new Error(`Non-null score in ${key} for vehicle ${p.vehicleId} rejected because vehicle dossier has empty fact list`);
          }

          const hasInvalidFactId = factIds.some(fid => !criterionAllowList.has(fid));
          if (hasInvalidFactId) {
            throw new Error(`Invalid supportingFactId in ${key} for vehicle ${p.vehicleId}: Fact ID is not allowed for criterion ${key}`);
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
              throw new Error(
                `Non-null USAGE_SUITABILITY score for vehicle ${p.vehicleId} REQUIRES all 4 mandatory evidence categories (cityUse, highwayUse, trafficBehavior, and scenario/profile)`
              );
            }
          }
        }
      }
    }

    const vehicleEvaluations: VehicleCriterionEvaluation[] = profiles.map((p) => {
      const vAssessments = parsed.criterionAssessments[p.vehicleId];
      return computeBackendCriterionMetrics(vAssessments, p.vehicleId, p.displayName);
    });

    const criterionResult = this.buildComparisonCriterionResult(vehicleEvaluations);
    parsed.criterionResult = criterionResult;

    // Requirement 4: Mandatory 8/8 Coverage Enforcement
    const anyVehicleIncomplete = vehicleEvaluations.some(ev => ev.coverageTooLow || ev.overallScore === null);
    if (anyVehicleIncomplete) {
      const minValidCount = Math.min(...vehicleEvaluations.map(ev => {
        return Object.values(ev.assessments || {}).filter(a => !a.insufficientData && a.score !== null).length;
      }));
      parsed.overallRecommendation = {
        vehicleId: undefined,
        vehicleName: undefined,
        label: 'Net Kazanan İçin Yeterli Veri Yok',
        reasoning: `Genel değerlendirme için 8 kriterin tamamında doğrulanmış veri gerekiyor — ${minValidCount}/8 mevcut.`,
        confidence: 'INSUFFICIENT',
      };
      parsed.scenarioRecommendations = [];
      if (parsed.riskComparison) {
        parsed.riskComparison.lowestRiskVehicleId = undefined;
      }
    }

    const validation = validateComparisonSemantics(parsed, profiles);
    if (!validation.isValid) {
      diagnostics.validationFailed = true;
      diagnostics.validationErrors = validation.errors;
      throw new Error(`Semantic validation failed: ${validation.errors.join('; ')}`);
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
      criterionResult,
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
