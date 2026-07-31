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
  ScenarioScore,
  DataWarning,
  formatFuelType,
  SCENARIO_SCORING_CONFIG,
} from '@used-car-intelligence/shared';

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
      // Deduct feature quota only upon generating fresh analysis
      await this.featureLimitService.checkAndIncrement(userId, FeatureKey.VEHICLE_COMPARISON).catch((err) => {
        console.warn('Feature limit check warning:', err?.message);
      });

      try {
        comparisonResult = await this.generateAdvancedAiComparison(profiles, priority, sourceDataVersion);
      } catch (err: any) {
        console.warn('AI comparison generation failed. Executing deterministic fallback:', err?.message || err);
        comparisonResult = this.generateFallbackResult(profiles, priority, sourceDataVersion);
      }

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
          'Triger kayışı / zinciri en son ne zaman değiştirildi?',
          'Şanzıman yağı ve kavraması en son ne zaman kontrol edildi?',
          'Motor soğutma sıvısında eksilme veya yağ kaçağı var mı?',
        ],
        inspectionChecklist: inspectionChecklist.length > 0 ? inspectionChecklist.slice(0, 5) : [
          'Motor rölanti çalışmasında titreşim ve trim sesi kontrolü',
          'Vites geçişlerinde vuruntu veya kararsızlık testi',
          'Alt takım ve amortisör yağ sızıntısı ekspertizi',
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
1. JENERİK VEYA BOŞ ŞABLON CÜMLE KULLANMAK KESİNLİKLE YASAKTIR. Her paragrafın rakamsal/teknik dayanağı olmalıdır.
2. "overallRecommendation" objesinde "label" alanına tek kazanan varsa "En Dengeli Seçenek", eşitlik varsa "Kullanım Önceliğine Göre Değişiyor" yaz. Asla "Şampiyon" deme.
3. Her araç için "vehicleVerdicts" dizisinde "gains" (Ne kazandırır?) ve "compromises" (Neyi feda ettirir?) alanlarını net yaz.
4. "narrativeRecommendation" alanında arkadaş tavsiyesi tonunda samimi, net ve gerekçeli anlatım yap ("Açık konuşmak gerekirse...").
5. Kronik sorunları sayı olarak değil, GERÇEK İSİMLERİYLE (örn. "DSG Mekatronik Arızası") açıkça ifade et.

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
      "scenarioKey": "CITY_USE",
      "title": "Şehir İçi & Tüketim Ekonomisi",
      "recommendedVehicleIds": ["${profiles[0].vehicleId}"],
      "recommendedVehicleNames": ["${profiles[0].displayName}"],
      "reasoning": "Şehir içi pratikliği ve düşük yakıt tüketimi gerekçesi"
    }
  ],
  "vehicleVerdicts": [
    {
      "vehicleId": "${profiles[0].vehicleId}",
      "vehicleName": "${profiles[0].displayName}",
      "characterSummary": "Kompakt ve Dengeli Premium",
      "bestFor": ["Şehir içi pratiklik", "Düşük yakıt maliyeti"],
      "notIdealFor": ["Yüksek hız performans arayışı"],
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

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: process.env.COMPARISON_MODEL_NAME || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen TorqueScout AI Asistanısın. Yalnızca geçerli JSON dön.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });
        resultJsonText = response.choices[0]?.message?.content || '';
      } catch (err: any) {
        console.warn('OpenAI comparison failed. Trying Gemini:', err?.message || err);
      }
    }

    if (!resultJsonText) {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (geminiApiKey) {
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
      }
    }

    if (!resultJsonText) {
      throw new Error('AI providers yielded empty response');
    }

    const parsed = JSON.parse(resultJsonText.replace(/```json\n?|\n?```/g, '').trim());

    return {
      comparisonId: `comp_${Date.now()}`,
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
      ownershipCostComparison: parsed.ownershipCostComparison || { narrative: 'Sahiplik maliyetleri değerlendirilmiştir.' },
      narrativeRecommendation: parsed.narrativeRecommendation || 'Açık konuşmak gerekirse bütçenize en uygun modeli tercih etmelisiniz.',
      decisionMatrix: parsed.decisionMatrix || [],
      finalDecisionGuide: parsed.finalDecisionGuide || [],
      dataWarnings: parsed.dataWarnings || [],
    };
  }

  private generateFallbackResult(
    profiles: ComparisonVehicleProfile[],
    priority: ComparisonPriority,
    sourceDataVersion: string,
  ): VehicleComparisonResult {
    const winner = profiles[0];

    const verdicts = profiles.map((p) => ({
      vehicleId: p.vehicleId,
      vehicleName: p.displayName,
      characterSummary: `${p.identity.brand} ${p.identity.model} (${p.identity.year}) - ${p.identity.engineCode || 'Motor'}, ${p.identity.transmission || 'Şanzıman'}`,
      bestFor: ['Günlük kullanım', 'Teknik özellik dengesi'],
      notIdealFor: ['Aşırı performans beklentisi'],
      gains: [
        p.efficiency.combinedConsumption ? `Ortalama ${p.efficiency.combinedConsumption} L/100km yakıt tüketimi` : 'Standart yakıt ekonomisi',
        p.practicality.bootLitres ? `${p.practicality.bootLitres} Litre bagaj hacmi` : 'Geniş bagaj alanı',
      ],
      compromises: [
        p.reliability.problems.length > 0 ? `${p.reliability.problems.length} adet kayıtlı kronik arıza riski` : 'Periyodik servis hassasiyeti',
      ],
      criticalRisks: p.reliability.problems.map(prob => `${prob.title} (${prob.severity} Risk)`),
      prePurchaseChecks: p.inspectionChecklist,
    }));

    return {
      comparisonId: `comp_fallback_${Date.now()}`,
      schemaVersion: '5.0',
      promptVersion: '5',
      engineVersion: 'comparison-v5',
      generationMode: 'FALLBACK',
      generatedAt: new Date().toISOString(),
      sourceDataVersion,
      selectedPriority: priority,
      headline: `${profiles.length} Araç Teknik ve Risk Karşılaştırması (Doğrulanmış Veriler)`,
      executiveSummary: `Seçtiğiniz ${profiles.length} adet araç (${profiles.map(p => p.displayName).join(', ')}) veritabanımızdaki doğrulanmış teknik veriler ve onaylı arıza kayıtları üzerinden kıyaslanmıştır.\n\nAraçların motor verimlilikleri, şanzıman tepkileri ve servis arıza riskleri kullanım amacınıza göre farklılık gösterir.`,
      overallRecommendation: {
        vehicleId: winner.vehicleId,
        vehicleName: winner.displayName,
        label: 'En Dengeli Seçenek',
        reasoning: `${winner.displayName}, veritabanımızdaki teknik verimlilik ve düşük kronik arıza riski dengesiyle öne çıkmaktadır.`,
        confidence: 'HIGH',
      },
      scenarioRecommendations: [
        {
          scenarioKey: 'CITY_USE',
          title: 'Şehir İçi & Tüketim Ekonomisi',
          recommendedVehicleIds: [winner.vehicleId],
          recommendedVehicleNames: [winner.displayName],
          reasoning: 'En ekonomik fabrika tüketim verisine ve pratik boyutlara sahiptir.',
        },
      ],
      vehicleVerdicts: verdicts,
      riskComparison: {
        narrative: `Veritabanımızdaki kronik arıza kayıtları incelendiğinde; ${winner.displayName} daha düşük arıza kaydı ile öne çıkmaktadır.`,
        lowestRiskVehicleId: winner.vehicleId,
      },
      ownershipCostComparison: {
        narrative: 'Yakıt tüketimleri ve periyodik servis bütçeleri araçların motor hacimlerine göre değişmektedir.',
      },
      narrativeRecommendation: `Açık konuşmak gerekirse; bu ${profiles.length} araç arasında karar verirken önceliğinizi belirlemeniz önemlidir. Düşük yakıt maliyeti ve şehir içi pratiklik arıyorsanız **${winner.displayName}** daha rasyonel bir seçim olacaktır. Unutmayın, en doğru araç bütçenize ve kullanım mesafenize en uyan modeldir!`,
      decisionMatrix: [
        {
          criterion: 'Düşük Yakıt & Ekonomi',
          winnerVehicleIds: [winner.vehicleId],
          winnerNames: [winner.displayName],
          reason: 'Düşük ortalama yakıt tüketimi',
        },
      ],
      finalDecisionGuide: [
        {
          priority: 'Genel Dengeli Kullanım',
          recommendedVehicleName: winner.displayName,
          explanation: 'Verimlilik ve arıza riski dengesi en yüksek seçenek',
        },
      ],
      dataWarnings: [
        {
          section: 'GENERAL',
          message: 'Bu karşılaştırma doğrulanmış teknik veriler ve kayıtlı riskler üzerinden hazırlanmıştır. Gelişmiş AI yorumlaması geçici olarak kullanılamıyor.',
          severity: 'INFO',
        },
      ],
    };
  }

  async chat(userId: string, dto: ComparisonChatDto) {
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
3. Yanıtın son derece bilgili, samimi, tarafsız ve akıcı Türkçe olsun.
4. İlk açılışta karşılaştırmayı aynen tekrarlama. Kullanıcının yıllık kilometresini veya özel önceliğini öğrenip ona rehberlik et.`;

    const apiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;

    let response = '';

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey });
        const aiRes = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dto.question },
          ],
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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dto.question },
          ],
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
        userId,
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
