import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AiReportGeneratorService } from '../research/ai-report-generator.service';
import { VehicleService } from '../vehicle/vehicle.service';
import { CompareVehiclesDto, ComparisonChatDto } from './comparison.dto';
import { FeatureKey, ApprovalStatus, SubscriptionTier, UsagePeriodType } from '@prisma/client';
import OpenAI from 'openai';
import { getFuelTypeTr } from '../vehicle/vehicle-filters.controller';
import { createHash } from 'crypto';
import {
  ComparisonPriority,
  ComparisonVehicleProfile,
  VehicleComparisonResult,
  ComparisonVehicleCard,
  ScenarioScore,
  DataWarning,
  RiskComparisonItem,
  RecallComparisonItem,
  formatFuelType,
  sanitizeComparisonResult,
  validateComparisonSemantics,
} from '@used-car-intelligence/shared';

export interface ComparisonGenerationDiagnostics {
  comparisonId: string;
  generationMode: 'AI' | 'FALLBACK';
  provider?: string;
  model?: string;
  requestStartedAt: string;
  requestCompletedAt?: string;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  validationFailed?: boolean;
  validationErrors?: string[];
  repairAttempted?: boolean;
  repairSucceeded?: boolean;
  fallbackReason?: 'PROVIDER_TIMEOUT' | 'PROVIDER_ERROR' | 'INVALID_JSON' | 'ZOD_VALIDATION_FAILED' | 'SEMANTIC_VALIDATION_FAILED' | 'REPAIR_FAILED' | 'TOKEN_LIMIT' | 'CONFIGURATION_ERROR';
}

@Injectable()
export class ComparisonService {
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
    private subscriptionService: SubscriptionService,
    private aiReportGeneratorService: AiReportGeneratorService,
    private vehicleService: VehicleService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async getComparisonHistory(userId: string) {
    return this.prisma.vehicleComparison.findMany({
      where: { userId },
      include: {
        variant1: { include: { brand: true, model: true } },
        variant2: { include: { brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);
  }

  async getUserChatbotQuota(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && (user.role === 'ADMIN' || ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email.toLowerCase()))) {
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
    const monthlyRemaining = Math.max(0, tierLimit - used);

    return monthlyRemaining + buyerCredits;
  }

  async getUserTierAndLimit(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const tier = await this.subscriptionService.getEffectiveTier(userId);
    const maxAllowed = (user && (user.role === 'ADMIN' || ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email.toLowerCase())))
      ? 10
      : tier === SubscriptionTier.PROFESYONEL ? 10 : tier === SubscriptionTier.YETKIN ? 5 : 2;

    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    return {
      userTier: tier,
      userLimit: maxAllowed,
      remainingChatbotMessages,
    };
  }

  async compare(userId: string, dto: CompareVehiclesDto) {
    // 1. Extract requested variant IDs array
    let requestedIds: string[] = [];
    if (dto.variantIds && Array.isArray(dto.variantIds) && dto.variantIds.length > 0) {
      requestedIds = Array.from(new Set(dto.variantIds.filter(Boolean)));
    } else if (dto.variant1Id && dto.variant2Id) {
      requestedIds = Array.from(new Set([dto.variant1Id, dto.variant2Id].filter(Boolean)));
    }

    if (requestedIds.length < 2) {
      throw new BadRequestException('Karşılaştırma yapmak için en az 2 adet farklı araç seçmelisiniz.');
    }

    // 2. Validate package limits (ASCII tier names: GUEST=2, TANISMA=2, FREE=2, YETKIN=5, PROFESYONEL=10)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const tier = await this.subscriptionService.getEffectiveTier(userId);

    const maxAllowed = (user && (user.role === 'ADMIN' || ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email.toLowerCase())))
      ? 10
      : tier === SubscriptionTier.PROFESYONEL ? 10 : tier === SubscriptionTier.YETKIN ? 5 : 2;

    if (requestedIds.length > maxAllowed) {
      throw new BadRequestException(`Mevcut ${tier} abonelik paketiniz ile tek seferde en fazla ${maxAllowed} araç karşılaştırabilirsiniz.`);
    }

    const priority: ComparisonPriority = (dto.selectedPriority as ComparisonPriority) || 'BALANCED';

    // 3. Ensure vehicle reports exist in DB for missing variants
    await this.ensureVehicleReportsExist(requestedIds);

    // 4. Build normalized vehicle profiles from DB
    const profiles = await this.buildComparisonVehicleProfiles(requestedIds);
    if (profiles.length < 2) {
      throw new BadRequestException('Bu araç kombinasyonu için yeterli veritabanı kaydı bulunamadı.');
    }

    // 5. Generate SHA-256 data version hash
    const sourceDataVersion = createHash('sha256')
      .update(profiles.map(p => `${p.vehicleId}_${p.reliability.problems.length}`).sort().join('_'))
      .digest('hex')
      .substring(0, 12);

    const sortedIds = requestedIds.slice().sort().join('_');
    const cacheKey = `comparison:v5:TR:tr-TR:priority=${priority}:variants=${sortedIds}:data=${sourceDataVersion}`;

    // 6. Safe Cache Lookup
    const cachedReport = await this.prisma.aiVehicleComparisonCache.findUnique({
      where: { cacheKey },
    }).catch(() => null);

    let comparisonResult: VehicleComparisonResult;

    if (cachedReport && cachedReport.analysisJson) {
      comparisonResult = cachedReport.analysisJson as unknown as VehicleComparisonResult;
    } else {
      // Deduct feature quota upon generating fresh analysis (both for AI or Fallback success)
      await this.featureLimitService.checkAndIncrement(userId, FeatureKey.VEHICLE_COMPARISON).catch((err) => {
        console.warn('Feature limit check warning:', err?.message);
      });

      try {
        comparisonResult = await this.generateAdvancedAiComparison(profiles, priority, sourceDataVersion);
      } catch (err: any) {
        console.warn('AI comparison generation failed. Executing deterministic fallback:', err?.message || err);
        comparisonResult = this.generateFallbackResult(profiles, priority, sourceDataVersion);
      }

      // Sanitize raw markdown from result text
      comparisonResult = sanitizeComparisonResult(comparisonResult);

      await this.prisma.aiVehicleComparisonCache.create({
        data: {
          variant1Id: profiles[0].vehicleId,
          variant2Id: profiles[1].vehicleId,
          cacheKey,
          verdict: comparisonResult.overallRecommendation?.reasoning || comparisonResult.headline || '',
          analysisJson: comparisonResult as any,
        },
      }).catch((err) => {
        console.warn('Comparison cache write skipped:', err?.message);
      });
    }

    // Atomic history log
    await this.prisma.vehicleComparison.create({
      data: {
        userId,
        variant1Id: profiles[0].vehicleId,
        variant2Id: profiles[1].vehicleId,
      },
    }).catch(() => null);

    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    return {
      success: true,
      comparisonResult,
      vehicles: profiles.map(p => ({
        id: p.vehicleId,
        name: p.displayName,
        brand: p.identity.brand,
        model: p.identity.model,
        year: p.identity.year,
        trim: p.identity.trim,
        engine: p.identity.engine,
        transmission: p.identity.transmission,
        fuelType: formatFuelType(p.identity.fuelType),
        problemsCount: p.reliability.problems.length,
      })),
      remainingChatbotMessages,
    };
  }

  private async ensureVehicleReportsExist(variantIds: string[]) {
    for (const variantId of variantIds) {
      try {
        const existingReport = await this.prisma.aiVehicleReport.findUnique({
          where: { variantId_languageCode: { variantId, languageCode: 'tr' } },
        });

        if (!existingReport) {
          await this.vehicleService.populateVariantDetails(variantId).catch(() => null);
          await this.aiReportGeneratorService.generateReportCache(variantId, 'tr').catch((err) => {
            console.warn(`Auto-generating report for variant ${variantId} warning:`, err?.message || err);
          });
        }
      } catch (err: any) {
        console.warn(`Report existence check failed for ${variantId}:`, err?.message || err);
      }
    }
  }

  private async buildComparisonVehicleProfiles(variantIds: string[]): Promise<ComparisonVehicleProfile[]> {
    const rawVariants = await this.prisma.vehicleVariant.findMany({
      where: { id: { in: variantIds }, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        specs: true,
        problems: {
          where: { status: ApprovalStatus.APPROVED },
        },
        recalls: {
          where: { status: ApprovalStatus.APPROVED },
        },
        questions: {
          where: { status: ApprovalStatus.APPROVED },
        },
        checklists: {
          where: { status: ApprovalStatus.APPROVED },
        },
      },
    });

    const profiles: ComparisonVehicleProfile[] = [];

    for (const id of variantIds) {
      const v = rawVariants.find(x => x.id === id);
      if (!v) continue;

      const aiReport = await this.prisma.aiVehicleReport.findUnique({
        where: { variantId_languageCode: { variantId: id, languageCode: 'tr' } },
      }).catch(() => null);

      const specData: Record<string, any> = (v.specs?.specs as Record<string, any>) || {};

      const problems = (v.problems || []).map(p => ({
        title: p.title,
        affectedComponent: (p as any).affectedComponent || (p as any).category || undefined,
        severity: (p.riskLevel || 'MEDIUM') as any,
        frequency: 'COMMON' as any,
        inspectionHint: p.checkRecommendation || undefined,
        preventiveAction: p.description || undefined,
        confidence: 'HIGH' as any,
      }));

      const recalls = (v.recalls || []).map(r => ({
        title: r.title,
        description: r.description,
        safetyRisk: r.riskLevel ? `${r.riskLevel} Risk Seviyesi` : undefined,
      }));

      const sellerQuestions = (v.questions || []).map(q => q.question);
      const inspectionChecklist = (v.checklists || []).map(c => c.title);

      const hp = specData.horsepower ? Number(specData.horsepower) : undefined;
      const torque = specData.torqueNm ? Number(specData.torqueNm) : undefined;
      const zeroToHundred = specData.acceleration0to100 ? Number(specData.acceleration0to100) : undefined;
      const topSpeed = specData.topSpeed ? Number(specData.topSpeed) : undefined;
      const combinedConsumption = specData.averageFuelConsumption ? Number(specData.averageFuelConsumption) : undefined;
      const bootLitres = specData.luggageCapacity ? Number(specData.luggageCapacity) : undefined;

      // Calculate scenario scores with >= 70% (HIGH) / 40-69% (LOW) / < 40% (null) tiering
      const scenarioScores: Record<string, ScenarioScore> = {
        cityUse: {
          score: combinedConsumption ? Math.max(20, Math.min(100, Math.round(100 - combinedConsumption * 7.5))) : null,
          confidence: combinedConsumption ? 'HIGH' : 'LOW',
          positiveFactors: combinedConsumption && combinedConsumption <= 6.5 ? ['Düşük şehir içi yakıt tüketimi'] : [],
          negativeFactors: combinedConsumption && combinedConsumption > 8.0 ? ['Yüksek yakıt maliyeti'] : [],
          missingInputs: !combinedConsumption ? ['Ortalama yakıt verisi eksik'] : [],
        },
        highwayUse: {
          score: hp ? Math.max(30, Math.min(100, Math.round(hp * 0.45 + (torque || 0) * 0.1))) : null,
          confidence: hp ? 'HIGH' : 'LOW',
          positiveFactors: hp && hp >= 120 ? ['Güçlü motor ve tork rezervi'] : [],
          negativeFactors: hp && hp < 90 ? ['Sınırlı sollama performansı'] : [],
          missingInputs: !hp ? ['Motor güç verisi eksik'] : [],
        },
        fuelEconomy: {
          score: combinedConsumption ? Math.max(10, Math.min(100, Math.round(110 - combinedConsumption * 10))) : null,
          confidence: combinedConsumption ? 'HIGH' : 'LOW',
          positiveFactors: combinedConsumption && combinedConsumption <= 5.5 ? ['Fabrika verisi son derece tasarruflu'] : [],
          negativeFactors: combinedConsumption && combinedConsumption > 7.5 ? ['Yüksek ortalama tüketim'] : [],
          missingInputs: !combinedConsumption ? ['Fabrika tüketim verisi eksik'] : [],
        },
        reliability: {
          score: Math.max(20, Math.min(100, 95 - problems.length * 15)),
          confidence: 'HIGH',
          positiveFactors: problems.length === 0 ? ['Onaylı kronik arıza kaydı veritabanında yok'] : [],
          negativeFactors: problems.length > 0 ? [`${problems.length} kayıtlı kronik arıza riski`] : [],
          missingInputs: [],
        },
      };

      profiles.push({
        vehicleId: v.id,
        displayName: `${v.brand.name} ${v.model.name} ${v.year} (${v.trim.name})`,
        identity: {
          brand: v.brand.name,
          model: v.model.name,
          generation: v.generation.name,
          year: v.year,
          bodyType: v.generation.bodyType,
          engine: v.engine.code,
          engineCode: v.engine.code,
          transmission: v.transmission.name,
          fuelType: formatFuelType(v.fuelType),
          trim: v.trim.name,
        },
        performance: {
          horsepower: hp,
          torqueNm: torque,
          zeroToHundred: zeroToHundred,
          topSpeed: topSpeed,
        },
        efficiency: {
          combinedConsumption: combinedConsumption,
        },
        practicality: {
          bootLitres: bootLitres,
        },
        comfortAndHandling: {},
        ownership: {},
        reliability: {
          buyabilityScore: aiReport?.buyabilityScore || 75,
          riskScore: aiReport?.riskScore || 25,
          problems: problems.slice(0, 6),
          recalls: recalls.slice(0, 4),
        },
        sellerQuestions: sellerQuestions.length > 0 ? sellerQuestions.slice(0, 5) : [
          `${v.brand.name} ${v.model.name} (${v.year}) triger kayışı / zinciri en son ne zaman değiştirildi?`,
          `${v.brand.name} ${v.transmission?.name || 'Şanzıman'} yağı ve kavraması en son ne zaman kontrol edildi?`,
          `${v.engine?.code || v.brand.name} motor soğutma sıvısında eksilme veya yağ kaçağı var mı?`,
        ],
        inspectionChecklist: inspectionChecklist.length > 0 ? inspectionChecklist.slice(0, 5) : [
          `${v.brand.name} ${v.model.name} motor rölanti çalışmasında titreşim ve trim sesi kontrolü`,
          `${v.brand.name} ${v.transmission?.name || 'Şanzıman'} vites geçişlerinde vuruntu veya kararsızlık testi`,
          `${v.brand.name} ${v.generation?.bodyType || 'Gövde'} alt takım ve amortisör yağ sızıntısı ekspertizi`,
        ],
        evidenceQuality: {
          confidence: 'HIGH',
          missingFields: [],
        },
        calculatedScenarioScores: scenarioScores,
      });
    }

    return profiles;
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
      const probsText = p.reliability.problems.length > 0
        ? p.reliability.problems.map(prob => `    * ${prob.title} (${prob.severity} Risk)`).join('\n')
        : '    * Onaylı kronik arıza veritabanında bulunmuyor (Düşük Risk).';

      return `ARAÇ ${i + 1} ID: "${p.vehicleId}"
Tam İsim: ${p.displayName}
Motor: ${p.identity.engineCode || 'Belirtilmedi'} (${p.identity.fuelType || 'Benzin'})
Şanzıman: ${p.identity.transmission || 'Belirtilmedi'}
Yakıt Tüketimi: ${p.efficiency.combinedConsumption ? p.efficiency.combinedConsumption + ' L/100km' : 'Veri yok'}
0-100 km/h: ${p.performance.zeroToHundred ? p.performance.zeroToHundred + ' sn' : 'Veri yok'}
Bagaj Hacmi: ${p.practicality.bootLitres ? p.practicality.bootLitres + ' Litre' : 'Veri yok'}
Kronik Arızalar:
${probsText}`;
    }).join('\n\n');

    const prompt = `Sen TorqueScout otomotiv istihbarat sisteminin kıdemli otomotiv uzmanı ve baş analistisin.
Aşağıda veritabanından doğrulanmış teknik özellikleri ve onaylı kronik arıza kayıtları verilen ${profiles.length} adet aracı derinlemesine kıyasla.

KULLANICI ÖNCELİĞİ: ${priority}

ARAÇ VERİLERİ:
${summaryList}

KATI TALİMATLAR:
1. JENERİK VEYA BOŞ ŞABLON CÜMLE KULLANMAK KESİNLİKLE YASAKTIR. ("Kullanım amacınıza göre değişir", "En doğru araç bütçenize uygun olandır" gibi jenerik cümleler ASLA KULLANILAMAZ).
2. JSON alanlarında MARKDOWN İŞARETLERİ (**bold**, ### başlık, satır başı -) KULLANMA. Düz metin üret.
3. "vehicleVerdicts" dizisinde SEÇİLEN TÜM ${profiles.length} ARAÇ İÇİN o aracın kendi markasına, modeline, motoruna, şanzımanına, bagajına ve fabrika verilerine ÖZGÜ BENZERSİZ "gains", "compromises", "bestFor", "notIdealFor" ve "prePurchaseChecks" dizilerini eksiksiz doldur. Hiçbir iki aracın metinleri aynı olamaz!
4. "scenarioRecommendations" dizisinde SEÇİLEN ARAÇLAR ARASINDAN EN AZ 3-4 FARKLI SENARYO (Yakıt Ekonomisi, Geniş Aile & Bagaj, Otoyol & Performans, Şehir İçi Pratiklik) için kazanan araçları gerekçeleriyle belirt. Tek bir senaryo kartı dönme!
5. "overallRecommendation" objesinde "label" alanına tek kazanan varsa "En Dengeli Seçenek", eşitlik varsa "Kullanım Önceliğine Göre Değişiyor" yaz. Asla "Şampiyon" deme.
6. "narrativeRecommendation" alanında arkadaş tavsiyesi tonunda samimi, net ve gerekçeli anlatım yap ("Açık konuşmak gerekirse...").

Lütfen SADECE geçerli JSON yanıt ver (VehicleComparisonResult formatında):
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
      "notIdealFor": ["Aşırı performans beklentisi"],
      "gains": ["Düşük yakıt tüketimi", "Kolay park etme"],
      "compromises": ["Daha sınırlı kabin genişliği"],
      "criticalRisks": ["Şanzıman vuruntu ve bakım hassasiyeti"],
      "prePurchaseChecks": ["Ekspertiz vites geçiş testi"]
    }
  ],
  "riskComparison": {
    "narrative": "Kronik sorunların sıklık ve maliyet açısından kıyaslaması",
    "lowestRiskVehicleId": "${profiles[0].vehicleId}"
  },
  "ownershipCostComparison": {
    "narrative": "Yakıt, periyodik bakım ve parça maliyetleri kıyaslaması"
  },
  "narrativeRecommendation": "Açık konuşmak gerekirse...",
  "decisionMatrix": [
    {
      "criterion": "Şehir İçi Kullanım",
      "winnerVehicleIds": ["${profiles[0].vehicleId}"],
      "winnerNames": ["${profiles[0].displayName}"],
      "reason": "Düşük tüketim ve pratik boyut"
    }
  ],
  "finalDecisionGuide": [
    {
      "priority": "Düşük Tüketim",
      "recommendedVehicleName": "${profiles[0].displayName}",
      "explanation": "En ekonomik fabrika tüketim verisine sahip"
    }
  ],
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

    if (!resultJsonText) {
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
      console.warn('Comparison AI diagnostics:', diagnostics);
      throw new Error('AI providers returned empty output');
    }

    const parsed = JSON.parse(resultJsonText.replace(/```json\n?|\n?```/g, '').trim());

    // Execute 12-criteria Semantic Validation
    const validation = validateComparisonSemantics(parsed, profiles);
    if (!validation.isValid) {
      diagnostics.validationFailed = true;
      diagnostics.validationErrors = validation.errors;
      console.warn('AI Output failed semantic validation. Triggering Fallback generator. Errors:', validation.errors);
      diagnostics.fallbackReason = 'SEMANTIC_VALIDATION_FAILED';
      console.warn('Comparison AI diagnostics:', diagnostics);
      throw new Error(`Semantic validation failed: ${validation.errors.join('; ')}`);
    }

    const rawResult: VehicleComparisonResult = {
      comparisonId: diagnostics.comparisonId,
      schemaVersion: '5.0',
      promptVersion: '5',
      engineVersion: 'comparison-v5',
      generationMode: 'AI',
      generatedAt: new Date().toISOString(),
      sourceDataVersion,
      selectedPriority: priority,
      headline: parsed.headline || `${profiles.length} Araç Karşılaştırma Analizi`,
      executiveSummary: parsed.executiveSummary || 'Araçların teknik verileri ve kronik durumları detaylıca incelenmiştir.',
      overallRecommendation: parsed.overallRecommendation || {
        vehicleId: profiles[0].vehicleId,
        vehicleName: profiles[0].displayName,
        label: 'En Dengeli Seçenek',
        reasoning: `${profiles[0].displayName} toplam verimlilik ve arıza dengesiyle öne çıkmaktadır.`,
        confidence: 'HIGH',
      },
      scenarioRecommendations: parsed.scenarioRecommendations || [],
      vehicleVerdicts: parsed.vehicleVerdicts || [],
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
      ownershipCostComparison: parsed.ownershipCostComparison || { narrative: 'Sahiplik maliyetleri değerlendirilmiştir.' },
      narrativeRecommendation: parsed.narrativeRecommendation || 'Açık konuşmak gerekirse bütçenize en uygun modeli tercih etmelisiniz.',
      decisionMatrix: parsed.decisionMatrix || [],
      finalDecisionGuide: parsed.finalDecisionGuide || [],
      dataWarnings: parsed.dataWarnings || [],
    };

    return sanitizeComparisonResult(rawResult);
  }

  private buildFallbackCautions(p: ComparisonVehicleProfile): string[] {
    if (p.reliability.problems.length > 0) {
      return p.reliability.problems.map(prob => `${prob.title} (${prob.severity} risk seviyesi)`);
    }

    const cautions: string[] = [];

    if (p.efficiency.combinedConsumption && p.efficiency.combinedConsumption > 6.8) {
      cautions.push(`Ortalama ${p.efficiency.combinedConsumption} L/100km fabrika tüketimi ile nispeten yüksek yakıt maliyeti`);
    }

    if (p.practicality.bootLitres && p.practicality.bootLitres < 400) {
      cautions.push(`${p.practicality.bootLitres} Litre ile sınırlı bagaj hacmi`);
    }

    if (p.identity.transmission && /otomatik|dsg|dct|cvt|s tronic/i.test(p.identity.transmission)) {
      cautions.push(`${p.identity.brand} ${p.identity.transmission} şanzıman periyodik yağ ve kavrama kontrol ihtiyacı`);
    }

    if (p.performance.horsepower && p.performance.horsepower < 110) {
      cautions.push(`${p.performance.horsepower} HP motor gücü ile tam yük altında sınırlı sollama performansı`);
    }

    if (cautions.length === 0) {
      cautions.push(`${p.displayName} periyodik yetkili servis motor ve alt takım bakım hassasiyeti`);
    }

    return cautions;
  }

  private buildFallbackBestFor(p: ComparisonVehicleProfile): string[] {
    const bestFor: string[] = [];
    const body = (p.identity.bodyType || '').toLowerCase();
    const hp = p.performance.horsepower || 0;
    const boot = p.practicality.bootLitres || 0;
    const cons = p.efficiency.combinedConsumption || 99;

    if (body.includes('suv') || body.includes('crossover')) {
      bestFor.push('Geniş aile kullanımı', 'Yüksek oturma pozisyonu & görüş');
    } else if (body.includes('hatchback') || body.includes('coupe')) {
      bestFor.push('Şehir içi pratik kullanım & kolay park', 'Kıvrak sürüş ve günlük prestij');
    } else if (body.includes('sedan') || body.includes('station')) {
      bestFor.push('Uzun yol & otoyol sürüş konforu', 'Dengeli kabin genişliği arayanlar');
    }

    if (hp >= 160) {
      bestFor.push('Seri ivmelenme & sollama gücü arayanlar');
    } else if (cons <= 6.2) {
      bestFor.push('Düşük yakıt bütçeli günlük kullanım');
    }

    if (boot >= 500) {
      bestFor.push('Büyük bagaj ve yük taşıma ihtiyacı olanlar');
    }

    if (bestFor.length === 0) {
      bestFor.push(`${p.identity.brand} ${p.identity.model} günlük sürüş`, 'Teknik verimlilik arayanlar');
    }

    return Array.from(new Set(bestFor)).slice(0, 3);
  }

  private buildFallbackNotIdealFor(p: ComparisonVehicleProfile): string[] {
    const notIdealFor: string[] = [];
    const body = (p.identity.bodyType || '').toLowerCase();
    const hp = p.performance.horsepower || 0;
    const cons = p.efficiency.combinedConsumption || 99;

    if (body.includes('suv') || body.includes('crossover')) {
      notIdealFor.push('Dar sokaklarda ultra kompakt park arayanlar', 'Alçak sportif viraj tutkunları');
    } else if (body.includes('hatchback') || body.includes('coupe')) {
      notIdealFor.push('Çok çocuklu aile uzun yol bagaj yüklemeleri', 'Bozuk arazi yolları');
    } else if (body.includes('sedan')) {
      notIdealFor.push('Yüksek arazi oturuşu ve yerden yüksek araç isteyenler');
    }

    if (hp >= 160) {
      notIdealFor.push('Sadece minimum yakıt tüketimi hedefleyenler');
    }

    if (cons > 7.2) {
      notIdealFor.push('Ultra düşük işletme maliyeti arayanlar');
    }

    if (notIdealFor.length === 0) {
      notIdealFor.push(`${p.displayName} aşırı zorlu arazi koşulları`);
    }

    return Array.from(new Set(notIdealFor)).slice(0, 2);
  }

  private buildFallbackPrePurchaseChecks(p: ComparisonVehicleProfile): string[] {
    const checks: string[] = [];

    if (p.reliability.problems.length > 0) {
      p.reliability.problems.forEach(prob => {
        checks.push(`${prob.title} tespiti için ${prob.inspectionHint || 'özel ekspertiz kontrolü'}`);
      });
    }

    checks.push(
      `${p.identity.brand} ${p.identity.model} ${p.identity.transmission || 'Şanzıman'} vites geçiş, kavrama ve yağ kaçak ekspertizi`,
      `${p.identity.engineCode || p.identity.brand} motor rölanti sesi, kompresyon ve soğutma sıvısı kontrolü`,
      `${p.identity.brand} yetkili servis geçmişi ve şasi numarası tramer kayıt sorgusu`
    );

    return Array.from(new Set(checks)).slice(0, 4);
  }

  private generateFallbackResult(
    profiles: ComparisonVehicleProfile[],
    priority: ComparisonPriority,
    sourceDataVersion: string,
  ): VehicleComparisonResult {
    // Find lowest consumption vehicle
    const sortedByConsumption = profiles
      .slice()
      .filter(p => p.efficiency.combinedConsumption)
      .sort((a, b) => (a.efficiency.combinedConsumption || 99) - (b.efficiency.combinedConsumption || 99));
    const lowestFuelVehicle = sortedByConsumption[0] || profiles[0];

    // Find highest boot volume vehicle
    const sortedByBoot = profiles
      .slice()
      .filter(p => p.practicality.bootLitres)
      .sort((a, b) => (b.practicality.bootLitres || 0) - (a.practicality.bootLitres || 0));
    const highestBootVehicle = sortedByBoot[0] || profiles[0];

    // Find highest horsepower vehicle
    const sortedByHp = profiles
      .slice()
      .filter(p => p.performance.horsepower)
      .sort((a, b) => (b.performance.horsepower || 0) - (a.performance.horsepower || 0));
    const highestHpVehicle = sortedByHp[0] || profiles[0];

    // Find lowest chronic problems vehicle
    const sortedByReliability = profiles
      .slice()
      .sort((a, b) => a.reliability.problems.length - b.reliability.problems.length);
    const mostReliableVehicle = sortedByReliability[0] || profiles[0];

    const cards: ComparisonVehicleCard[] = profiles.map((p) => {
      const cautions = this.buildFallbackCautions(p);
      const bestFor = this.buildFallbackBestFor(p);
      const notIdealFor = this.buildFallbackNotIdealFor(p);
      const checks = this.buildFallbackPrePurchaseChecks(p);

      return {
        vehicleId: p.vehicleId,
        vehicleName: p.displayName,
        identity: {
          year: p.identity.year,
          engine: p.identity.engineCode,
          transmission: p.identity.transmission,
          trim: p.identity.trim,
        },
        characterSummary: `${p.identity.brand} ${p.identity.model} (${p.identity.year}) - ${p.identity.engineCode || 'Motor'}, ${p.identity.transmission || 'Şanzıman'}`,
        strengths: [
          p.efficiency.combinedConsumption ? `Ortalama ${p.efficiency.combinedConsumption} L/100km fabrika tüketimi` : `${p.identity.brand} yakıt verimliliği`,
          p.practicality.bootLitres ? `${p.practicality.bootLitres} Litre bagaj hacmi` : `${p.identity.brand} bagaj kullanımı`,
          p.performance.horsepower ? `${p.performance.horsepower} HP motor gücü` : `${p.identity.model} motor performansı`,
        ],
        cautions,
        bestFor,
        notIdealFor,
        criticalRisks: p.reliability.problems.map(prob => ({
          title: prob.title,
          severity: prob.severity,
          shortExplanation: prob.inspectionHint || 'Ekspertiz kontrolü önerilir.',
        })),
        prePurchaseChecks: checks,
        supportingFacts: [
          `Model Yılı: ${p.identity.year}`,
          p.performance.horsepower ? `Motor Gücü: ${p.performance.horsepower} HP` : `Motor: ${p.identity.engineCode || 'Standart'}`,
        ],
        evidenceConfidence: 'HIGH' as const,
      };
    });

    const highlights = profiles.map(p => ({
      vehicleId: p.vehicleId,
      vehicleName: p.displayName,
      strengths: [
        p.efficiency.combinedConsumption ? `Ortalama ${p.efficiency.combinedConsumption} L/100km fabrika tüketimi` : `${p.identity.brand} yakıt verimliliği`,
        p.practicality.bootLitres ? `${p.practicality.bootLitres} Litre bagaj hacmi` : `${p.identity.brand} geniş bagaj`,
      ],
      cautions: this.buildFallbackCautions(p),
      supportingFacts: [
        `Model Yılı: ${p.identity.year}`,
        p.performance.horsepower ? `Güç: ${p.performance.horsepower} HP` : `Motor: ${p.identity.engineCode || 'Standart'}`,
      ],
      confidence: 'HIGH' as const,
    }));

    const verdicts = profiles.map((p) => {
      const cautions = this.buildFallbackCautions(p);
      const bestFor = this.buildFallbackBestFor(p);
      const notIdealFor = this.buildFallbackNotIdealFor(p);
      const checks = this.buildFallbackPrePurchaseChecks(p);

      return {
        vehicleId: p.vehicleId,
        vehicleName: p.displayName,
        characterSummary: `${p.identity.brand} ${p.identity.model} (${p.identity.year}) - ${p.identity.engineCode || 'Motor'}, ${p.identity.transmission || 'Şanzıman'}`,
        bestFor,
        notIdealFor,
        gains: [
          p.efficiency.combinedConsumption ? `Ortalama ${p.efficiency.combinedConsumption} L/100km yakıt tüketimi` : `${p.identity.brand} yakıt ekonomisi`,
          p.practicality.bootLitres ? `${p.practicality.bootLitres} Litre bagaj hacmi` : `${p.identity.model} bagaj pratikliği`,
        ],
        compromises: cautions,
        criticalRisks: p.reliability.problems.map(prob => `${prob.title} (${prob.severity} Risk)`),
        prePurchaseChecks: checks,
        evidenceConfidence: 'HIGH' as const,
      };
    });

    const riskItems: RiskComparisonItem[] = profiles.flatMap(p => 
      p.reliability.problems.map(prob => ({
        vehicleId: p.vehicleId,
        vehicleName: p.displayName,
        problemTitle: prob.title,
        severity: prob.severity,
        detectability: 'MODERATE' as const,
        narrative: `${prob.title} kaydı ekspertiz kontrolünde ve motor rölanti dinlemesinde önceden tespit edilebilir.`,
      }))
    );

    const recallItems: RecallComparisonItem[] = profiles.flatMap(p => 
      (p.reliability.recalls || []).map(r => ({
        vehicleId: p.vehicleId,
        vehicleName: p.displayName,
        title: r.title,
        description: r.description,
        safetyImpact: r.safetyRisk,
        verificationInstruction: 'Bu kampanyanın aracınıza uygulanıp uygulanmadığını yetkili servisten şasi numarası sorgulatarak doğrulayın.',
      }))
    );

    const scenarios = [
      {
        scenarioKey: 'FUEL_ECONOMY',
        title: 'Yakıt Ekonomisi & Düşük Tüketim',
        recommendedVehicleIds: [lowestFuelVehicle.vehicleId],
        recommendedVehicleNames: [lowestFuelVehicle.displayName],
        reasoning: `${lowestFuelVehicle.displayName}, doğrulanmış ortalama ${lowestFuelVehicle.efficiency.combinedConsumption || 'düşük'} L/100km fabrika tüketimi ile en tasarruflu seçenek.`,
        confidence: 'HIGH' as const,
      },
      {
        scenarioKey: 'FAMILY_USE',
        title: 'Geniş Aile & Bagaj Pratikliği',
        recommendedVehicleIds: [highestBootVehicle.vehicleId],
        recommendedVehicleNames: [highestBootVehicle.displayName],
        reasoning: `${highestBootVehicle.displayName}, ${highestBootVehicle.practicality.bootLitres || 'Geniş'} Litre bagaj hacmi ile aile kullanımı için öne çıkıyor.`,
        confidence: 'HIGH' as const,
      },
      {
        scenarioKey: 'HIGHWAY_USE',
        title: 'Otoyol & Seri İvmelenme',
        recommendedVehicleIds: [highestHpVehicle.vehicleId],
        recommendedVehicleNames: [highestHpVehicle.displayName],
        reasoning: `${highestHpVehicle.displayName}, ${highestHpVehicle.performance.horsepower || 'Güçlü'} HP motor gücü ile otoyol sürüşünde en yüksek sollama performansını sunuyor.`,
        confidence: 'HIGH' as const,
      },
      {
        scenarioKey: 'RELIABILITY',
        title: 'Sorunsuzluk & Düşük Arıza Riski',
        recommendedVehicleIds: [mostReliableVehicle.vehicleId],
        recommendedVehicleNames: [mostReliableVehicle.displayName],
        reasoning: `${mostReliableVehicle.displayName}, veritabanımızdaki ${mostReliableVehicle.reliability.problems.length} adet kayıtlı arıza riski ile uzun vadede en düşük kronik sorun profiline sahip.`,
        confidence: 'HIGH' as const,
      },
    ];

    const rawResult: VehicleComparisonResult = {
      comparisonId: `comp_fallback_${Date.now()}`,
      schemaVersion: '5.0',
      promptVersion: '5',
      engineVersion: 'comparison-v5',
      generationMode: 'FALLBACK',
      generatedAt: new Date().toISOString(),
      sourceDataVersion,
      selectedPriority: priority,
      headline: `${profiles.length} Araç Doğrulanmış Teknik Veri Karşılaştırması`,
      executiveSummary: `Seçtiğiniz ${profiles.length} adet araç (${profiles.map(p => p.displayName).join(', ')}) veritabanımızdaki doğrulanmış teknik veriler ve onaylı arıza kayıtları üzerinden kıyaslanmıştır.`,
      overallRecommendation: {
        vehicleId: lowestFuelVehicle.vehicleId,
        vehicleName: lowestFuelVehicle.displayName,
        label: 'Kullanım Önceliğine Göre Değişiyor',
        reasoning: `${lowestFuelVehicle.displayName}, doğrulanmış düşük yakıt tüketimi (${lowestFuelVehicle.efficiency.combinedConsumption || 'Standart'} L/100km) ile yakıt tasarrufu odağında öne çıkmaktadır.`,
        confidence: 'HIGH',
      },
      vehicleCards: cards,
      vehicleHighlights: highlights,
      scenarioRecommendations: scenarios,
      vehicleVerdicts: verdicts,
      riskComparison: {
        narrative: riskItems.length > 0
          ? `Veritabanımızdaki onaylı kronik arıza kayıtları detaylandırılmıştır. Ekspertiz esnasında listelenen kontroller mutlaka yapılmalıdır.`
          : `Bu araçlar için veritabanında onaylanmış kronik arıza kaydı bulunmamaktadır. Bu durum araçların tamamen risksiz olduğu anlamına gelmez.`,
        items: riskItems,
        lowestRiskVehicleId: mostReliableVehicle.vehicleId,
      },
      recallComparison: recallItems,
      ownershipCostComparison: {
        narrative: `Yakıt ve bakım verilerine göre ${lowestFuelVehicle.displayName} yakıt tarafında tasarruf sağlarken, ${highestHpVehicle.displayName} yüksek güç vaat ediyor.`,
      },
      narrativeRecommendation: `Seçtiğiniz ${profiles.length} araç arasında ${lowestFuelVehicle.displayName} yakıt tasarrufuyla öne çıkarken, ${highestBootVehicle.displayName} geniş bagajıyla aile kullanımına uygun.`,
      decisionMatrix: [
        {
          criterion: 'Yakıt Tasarrufu',
          winnerVehicleIds: [lowestFuelVehicle.vehicleId],
          winnerNames: [lowestFuelVehicle.displayName],
          reason: 'En düşük ortalama tüketim',
        },
        {
          criterion: 'Bagaj Hacmi',
          winnerVehicleIds: [highestBootVehicle.vehicleId],
          winnerNames: [highestBootVehicle.displayName],
          reason: 'En geniş bagaj',
        },
        {
          criterion: 'Motor Performansı',
          winnerVehicleIds: [highestHpVehicle.vehicleId],
          winnerNames: [highestHpVehicle.displayName],
          reason: 'En yüksek HP motor gücü',
        },
      ],
      finalDecisionGuide: [
        {
          priority: 'Düşük Yakıt Tüketimi',
          recommendedVehicleName: lowestFuelVehicle.displayName,
          explanation: 'En ekonomik fabrika ortalama tüketim verisine sahip',
        },
        {
          priority: 'Geniş Aile & Bagaj',
          recommendedVehicleName: highestBootVehicle.displayName,
          explanation: 'En yüksek bagaj litre kapasitesi',
        },
        {
          priority: 'Otoyol Gücü & Performans',
          recommendedVehicleName: highestHpVehicle.displayName,
          explanation: 'En yüksek HP motor gücü',
        },
      ],
      dataWarnings: [],
    };

    return sanitizeComparisonResult(rawResult);
  }

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

    const profiles = await this.buildComparisonVehicleProfiles(requestedIds);
    const vehicleDescriptions = profiles.map(p => 
      `• ${p.displayName}: Motor ${p.identity.engineCode}, Şanzıman ${p.identity.transmission}, Yakıt ${p.identity.fuelType}, Tüketim ${p.efficiency.combinedConsumption || 'Veri yok'} L/100km. Kronik Riskler: ${p.reliability.problems.map(prob => prob.title).join(', ') || 'Yok'}`
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

    let response = '';

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey });
        const aiRes = await openai.chat.completions.create({
          model: process.env.COMPARISON_AI_MODEL || 'gpt-4o-mini',
          messages: fullMessages,
          temperature: 0.5,
        });

        response = aiRes.choices[0]?.message?.content || '';
      } catch (err: any) {
        console.error('OpenAI comparison chat failed:', err?.message);
      }
    }

    if (!response && geminiApiKey) {
      try {
        const geminiOpenai = new OpenAI({
          apiKey: geminiApiKey,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        });
        const aiRes = await geminiOpenai.chat.completions.create({
          model: 'gemini-flash-latest',
          messages: fullMessages,
          temperature: 0.5,
        });

        response = aiRes.choices[0]?.message?.content || '';
      } catch (err: any) {
        console.error('Gemini OpenAI-compatible comparison chat failed:', err?.message);
      }
    }

    if (!response) {
      const summaryNames = profiles.map(p => p.displayName).join(', ');
      response = `Seçtiğiniz ${profiles.length} araç (${summaryNames}) kıyaslandığında; motor güçleri, yakıt tüketimleri ve şanzıman verimlilikleri kullanım amacınıza göre farklılık gösterir. Şehir içi pratiklik veya uzun yol konforu kriterlerinize göre en uygun modeli belirleyebilirsiniz.`;
    }

    await this.prisma.aiChatLog.create({
      data: {
        userId: userId || 'GUEST',
        variantId: profiles[0].vehicleId,
        prompt: dto.question,
        response,
      },
    }).catch(() => null);

    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    return {
      response,
      remainingChatbotMessages,
    };
  }
}
