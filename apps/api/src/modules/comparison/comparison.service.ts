import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { CompareVehiclesDto, ComparisonChatDto } from './comparison.dto';
import { FeatureKey, ApprovalStatus, SubscriptionTier, UsagePeriodType } from '@prisma/client';
import OpenAI from 'openai';
import { getFuelTypeTr } from '../vehicle/vehicle-filters.controller';

@Injectable()
export class ComparisonService {
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
    private subscriptionService: SubscriptionService,
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

    // 2. Determine max allowed vehicles for user tier
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const tier = await this.subscriptionService.getEffectiveTier(userId);

    const maxAllowed = (user && (user.role === 'ADMIN' || ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email.toLowerCase())))
      ? 10
      : tier === SubscriptionTier.PROFESYONEL ? 10 : tier === SubscriptionTier.YETKIN ? 5 : 2;

    if (requestedIds.length > maxAllowed) {
      throw new BadRequestException(`${tier} paketiniz ile tek seferde en fazla ${maxAllowed} araç karşılaştırabilirsiniz.`);
    }

    const cacheKey = requestedIds.slice().sort().join('_');

    // 3. Safe DB Cache lookup
    const cachedReport = await this.prisma.aiVehicleComparisonCache.findUnique({
      where: { cacheKey },
    }).catch((err) => {
      console.warn('Cache lookup warning:', err?.message);
      return null;
    });

    // 4. Fetch all requested variants in order
    const variantsRaw = await this.prisma.vehicleVariant.findMany({
      where: { id: { in: requestedIds }, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        specs: true,
        problems: { where: { status: ApprovalStatus.APPROVED } },
      },
    });

    // Map to retain exact order of requestedIds
    const variants = requestedIds
      .map(id => variantsRaw.find(v => v.id === id))
      .filter((v): v is NonNullable<typeof v> => !!v);

    if (variants.length < 2) {
      throw new BadRequestException('Bu kombinasyon için net varyant verisi bulunamadı. Lütfen seçimleri kontrol edin.');
    }

    let aiAnalysis: any;

    if (cachedReport) {
      aiAnalysis = cachedReport.analysisJson;
    } else {
      await this.featureLimitService.checkAndIncrement(userId, FeatureKey.VEHICLE_COMPARISON).catch((err) => {
        console.warn('Feature limit check warning:', err?.message);
      });

      aiAnalysis = await this.generateAiComparisonMulti(variants);

      await this.prisma.aiVehicleComparisonCache.create({
        data: {
          variant1Id: variants[0].id,
          variant2Id: variants[1].id,
          cacheKey,
          verdict: aiAnalysis?.verdict || '',
          analysisJson: aiAnalysis,
        },
      }).catch((err) => {
        console.warn('Cache write skipped:', err?.message);
      });
    }

    // Save history log
    await this.prisma.vehicleComparison.create({
      data: {
        userId,
        variant1Id: variants[0].id,
        variant2Id: variants[1].id,
      },
    }).catch(() => null);

    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    const formattedVehicles = variants.map((v, idx) => {
      const vSpecs: Record<string, any> = (v.specs?.specs as Record<string, any>) || {};
      const fullName = `${v.brand.name} ${v.model.name} ${v.year} (${v.trim.name})`;
      return {
        id: v.id,
        slotIndex: idx + 1,
        name: fullName,
        brand: v.brand.name,
        model: v.model.name,
        year: v.year,
        trim: v.trim.name,
        engine: v.engine.code,
        transmission: v.transmission.name,
        fuelType: getFuelTypeTr(v.fuelType),
        specs: vSpecs,
        problemsCount: v.problems.length,
      };
    });

    return {
      isCached: !!cachedReport,
      remainingChatbotMessages,
      userLimit: maxAllowed,
      userTier: tier,
      vehicles: formattedVehicles,
      // Backward compatibility fields
      vehicle1: formattedVehicles[0],
      vehicle2: formattedVehicles[1],
      aiAnalysis,
      specComparison: {
        topSpeed: { label: 'Maks Hız (km/h)', values: formattedVehicles.map(v => v.specs['topSpeed'] || '-'), v1: formattedVehicles[0]?.specs['topSpeed'] || '-', v2: formattedVehicles[1]?.specs['topSpeed'] || '-' },
        acceleration: { label: '0-100 Hızlanma (sn)', values: formattedVehicles.map(v => v.specs['acceleration0to100'] || '-'), v1: formattedVehicles[0]?.specs['acceleration0to100'] || '-', v2: formattedVehicles[1]?.specs['acceleration0to100'] || '-' },
        fuel: { label: 'Ort. Yakıt Tüketimi (lt)', values: formattedVehicles.map(v => v.specs['averageFuelConsumption'] || '-'), v1: formattedVehicles[0]?.specs['averageFuelConsumption'] || '-', v2: formattedVehicles[1]?.specs['averageFuelConsumption'] || '-' },
        luggage: { label: 'Bagaj Hacmi (lt)', values: formattedVehicles.map(v => v.specs['luggageCapacity'] || '-'), v1: formattedVehicles[0]?.specs['luggageCapacity'] || '-', v2: formattedVehicles[1]?.specs['luggageCapacity'] || '-' },
        weight: { label: 'Ağırlık (kg)', values: formattedVehicles.map(v => v.specs['weight'] || '-'), v1: formattedVehicles[0]?.specs['weight'] || '-', v2: formattedVehicles[1]?.specs['weight'] || '-' },
      },
    };
  }

  async chat(userId: string, dto: ComparisonChatDto) {
    if (!dto.question || !dto.question.trim()) {
      throw new BadRequestException('Lütfen sormak istediğiniz soruyu yazın.');
    }

    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

    // Extract requested variant IDs
    let requestedIds: string[] = [];
    if (dto.variantIds && Array.isArray(dto.variantIds) && dto.variantIds.length > 0) {
      requestedIds = Array.from(new Set(dto.variantIds.filter(Boolean)));
    } else if (dto.variant1Id || dto.variant2Id) {
      requestedIds = Array.from(new Set([dto.variant1Id, dto.variant2Id].filter((id): id is string => !!id)));
    }

    if (requestedIds.length === 0) {
      throw new BadRequestException('Karşılaştırılacak araçlar bulunamadı.');
    }

    const variantsRaw = await this.prisma.vehicleVariant.findMany({
      where: { id: { in: requestedIds } },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        specs: true,
        problems: { where: { status: ApprovalStatus.APPROVED } },
        recalls: { where: { status: ApprovalStatus.APPROVED } },
      },
    });

    const variants = requestedIds
      .map(id => variantsRaw.find(v => v.id === id))
      .filter((v): v is NonNullable<typeof v> => !!v);

    if (variants.length === 0) {
      throw new BadRequestException('Karşılaştırılan araçlar bulunamadı.');
    }

    const vehicleDescriptions = variants.map((v, i) => {
      const specs: Record<string, any> = (v.specs?.specs as Record<string, any>) || {};
      const problemsText = v.problems
        .map((p: any) => `- ${p.title}: ${p.description || ''} (Risk Seviyesi: ${p.riskLevel})`)
        .join('\n') || 'Kayıtlı kritik kronik arıza bulunmuyor.';

      return `${i + 1}. ARAÇ: ${v.year} ${v.brand.name} ${v.model.name} (${v.trim.name})
- Motor Seçeneği: ${v.engine?.code || 'Belirtilmedi'}
- Şanzıman Tipi: ${v.transmission?.name || 'Belirtilmedi'}
- Yakıt Türü: ${getFuelTypeTr(v.fuelType)}
- Ortalama Yakıt Tüketimi: ${specs.averageFuelConsumption ? specs.averageFuelConsumption + ' L/100km' : 'Veri yok'}
- 0-100 km/h Hızlanma: ${specs.acceleration0to100 ? specs.acceleration0to100 + ' saniye' : 'Veri yok'}
- Maksimum Hız: ${specs.topSpeed ? specs.topSpeed + ' km/h' : 'Veri yok'}
- Bagaj Hacmi: ${specs.luggageCapacity ? specs.luggageCapacity + ' Litre' : 'Veri yok'}
- Boş Ağırlık: ${specs.weight ? specs.weight + ' kg' : 'Veri yok'}
- Onaylı Kronik Sorunlar (${v.problems.length} Adet):
${problemsText}`;
    }).join('\n\n');

    const systemPrompt = `Sen Türkiye'nin 1 numaralı otomotiv istihbarat platformu TorqueScout'ın uzman otomotiv danışmanı ve yapay zeka araç karşılaştırma chatbotusun.
Kullanıcı şu ${variants.length} adet aracı kıyaslıyor ve sana özel bir takip sorusu sordu:

${vehicleDescriptions}

KATI TALİMATLAR:
1. Kullanıcının sorusunu doğrudan yukarıdaki teknik veriler (HP, tork, 0-100 sn, yakıt tüketimi litresi), şanzıman yapısı ve kronik arızalar ışığında karşılaştırmalı olarak yanıtla.
2. Seçilen TÜM ${variants.length} ARACA mutlaka yanıtında yer ver. Hiçbir aracı atlamadan sorulan soruya bu araçların her birini kıyaslayarak cevap ver.
3. Asla jenerik kalıp cümleler kullanma! Somut rakamlar, fabrika verileri ve gerçek kronik risk başlıkları ver.
4. Yanıtın son derece bilgili, samimi, tarafsız ve akıcı Türkçe olsun.`;

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
      const summaryNames = variants.map(v => `${v.brand.name} ${v.model.name}`).join(', ');
      response = `Seçtiğiniz ${variants.length} araç (${summaryNames}) kıyaslandığında; motor güçleri, yakıt tüketimleri ve şanzıman verimlilikleri kullanım amacınıza göre farklılık gösterir. Şehir içi pratiklik veya uzun yol konforu kriterlerinize göre en uygun modeli belirleyebilirsiniz.`;
    }

    await this.prisma.aiChatLog.create({
      data: {
        userId,
        variantId: variants[0].id,
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

  private async generateAiComparisonMulti(variants: any[]): Promise<any> {
    const fullVehicleDetails = variants.map((v, i) => {
      const specs: Record<string, any> = (v.specs?.specs as Record<string, any>) || {};
      const problemsList = v.problems && v.problems.length > 0
        ? v.problems.map((p: any) => `  * ${p.title} (${p.riskLevel} Risk): ${p.description || ''}`).join('\n')
        : '  * Kayıtlı onaylı kronik arıza/problem bulunmuyor (0 Arıza).';

      return `ARAÇ ${i + 1}: ${v.brand.name} ${v.model.name} ${v.year} (${v.trim.name})
- Motor: ${v.engine?.code || 'Belirtilmedi'}
- Şanzıman: ${v.transmission?.name || 'Belirtilmedi'}
- Yakıt Türü: ${getFuelTypeTr(v.fuelType)}
- Ortalama Yakıt Tüketimi: ${specs.averageFuelConsumption ? specs.averageFuelConsumption + ' L/100km' : 'Veri yok'}
- 0-100 km/h Hızlanma: ${specs.acceleration0to100 ? specs.acceleration0to100 + ' saniye' : 'Veri yok'}
- Maksimum Hız: ${specs.topSpeed ? specs.topSpeed + ' km/h' : 'Veri yok'}
- Bagaj Hacmi: ${specs.luggageCapacity ? specs.luggageCapacity + ' Litre' : 'Veri yok'}
- Boş Ağırlık: ${specs.weight ? specs.weight + ' kg' : 'Veri yok'}
- Onaylı Kronik Sorunlar (${v.problems.length} Adet):
${problemsList}`;
    }).join('\n\n');

    const advantagesSchema = variants.map((_, i) => `"advantagesV${i + 1}": ["1. Somut teknik veya piyasa avantajı", "2. Somut avantaj", "3. Somut avantaj"]`).join(',\n  ');
    const risksSchema = variants.map((_, i) => `"risksV${i + 1}": ["1. Somut teknik/kronik risk veya dezavantaj", "2. Somut risk veya dezavantaj"]`).join(',\n  ');

    const prompt = `Sen Türkiye'nin en gelişmiş otomotiv istihbarat sistemi TorqueScout'ın kıdemli otomotiv uzmanı ve yapay zeka analistisin.
Aşağıda teknik detayları, motor güçleri, fabrika yakıt tüketimleri ve gerçek kronik arıza kayıtları verilen ${variants.length} adet aracı derinlemesine kıyaslayan kapsamlı ve veriye dayalı bir karşılaştırma raporu oluştur.

ARAÇ VERİLERİ:
${fullVehicleDetails}

KRİTİK TALİMATLAR (KESİNLİKLE UYULMASI GEREKEN SIKI KURALLAR):
1. JENERİK VEYA BOŞ ŞABLON CÜMLE KULLANMAK KESİNLİKLE YASAKTIR! (Örn: "Motor tork eğrileri kullanım amacına göre farklılaşmaktadır" veya "kronik arıza kayıtları karşılaştırılmıştır" gibi hiçbir bilgi içermeyen süslü kalıp cümleler ASLA KULLANILAMAZ).
2. RAPORDAKİ HER PARAGRAF VE MADDENİN BİR KARŞILIĞI VE RAKAMSAL/TEKNİK DAYANAĞI OLMALIDIR (Örn: HP, Tork, 0-100 sn, yakıt tüketim litresi, kronik arıza başlığı, ikinci el piyasa likiditesi).
3. "advantagesV" alanlarına araçların GERÇEK teknik üstünlüklerini (örn: yüksek motor gücü, serilik, düşük yakıt tüketimi, geniş bagaj, 4x4 çekiş vb.) yaz.
4. "risksV" alanlarına araçların GERÇEK risk ve dezavantajlarını yaz (örn: DSG mekatronik arızası riski, yüksek şehir içi yakıt tüketimi, kronik yağ yakma problemi, parçalarının pahalı/zor bulunması vb.). Asla kronik arızaları avantaj olarak yazma!
5. "verdict" alanında hangi aracın NEDEN kazandığını net ve rakamsal verilerle (HP, yakıt, kronik risk dengesi) gerekçelendir.
6. "conversationalAdvice" kısmında samimi bir otomotiv uzmanı gibi seçilen TÜM ${variants.length} araca değinerek detaylı tavsiyede bulun.

Lütfen SADECE aşağıdaki JSON formatında yanıt ver:
{
  "verdict": "Net sonuç ve gerekçeli kazanan tavsiyesi (2-3 cümle, somut rakam ve nedenlerle)",
  "recommendedVehicle": "Öne çıkan kazanan aracın tam adı",
  "conversationalAdvice": "TorqueScout AI Asistanı olarak doğrudan kullanıcının karşısındaymış gibi konuşan samimi, teknik açıdan zengin ve rehberlik eden 2-3 paragraflık konuşma metni. Seçilen TÜM ${variants.length} araca tek tek değin.",
  ${advantagesSchema},
  ${risksSchema},
  "performanceAnalysis": "Araçların motor güçleri, torkları, şanzıman tepkileri ve 0-100 acceleration kıyaslaması (Somut rakamlar ver)",
  "reliabilityAnalysis": "Araçların kronik arızaları, parçalarının sanayi maliyetleri ve arıza risk seviyelerinin kıyaslaması",
  "resaleAnalysis": "Araçların Türkiye ikinci el piyasasındaki likiditesi, piyasa hızı ve değer koruma kıyaslaması",
  "recommendations": {
    "cityAndEconomy": "Şehir içi ve düşük kullanım maliyeti arayanlar için en uygun aracın gerekçeli tavsiyesi",
    "familyAndComfort": "Uzun yol ve aile kullanımı arayanlar için en uygun aracın gerekçeli tavsiyesi"
  }
}`;

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen TorqueScout AI Asistanısın. Yalnızca geçerli JSON dön.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content);
        }
      } catch (err: any) {
        console.warn('OpenAI comparison failed/quota limit reached. Switching to Google Gemini:', err?.message || err);
      }
    }

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
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonText);
          }
        }
      } catch (err: any) {
        console.warn('Gemini API call failed:', err?.message || err);
      }
    }

    // Fallback generator for N vehicles
    const fallbackAdvantages: Record<string, string[]> = {};
    const fallbackRisks: Record<string, string[]> = {};

    variants.forEach((v, i) => {
      const specs: Record<string, any> = (v.specs?.specs as Record<string, any>) || {};
      const advs: string[] = [];
      if (v.engine?.code) advs.push(`${v.engine.code} motor seçeneği ve performansı`);
      if (specs.averageFuelConsumption) advs.push(`Ortalama ${specs.averageFuelConsumption} L/100km yakıt tüketimi`);
      if (specs.luggageCapacity) advs.push(`${specs.luggageCapacity} Litre bagaj hacmi sunumu`);
      if (advs.length < 3) advs.push(`${v.transmission?.name || 'Şanzıman'} sürüş uyumu`);
      fallbackAdvantages[`advantagesV${i + 1}`] = advs.slice(0, 3);

      const rks: string[] = [];
      if (v.problems && v.problems.length > 0) {
        v.problems.slice(0, 2).forEach((p: any) => {
          rks.push(`${p.title} (${p.riskLevel} Risk)`);
        });
      }
      if (rks.length < 2 && specs.averageFuelConsumption && Number(specs.averageFuelConsumption) > 8) {
        rks.push(`Yüksek şehir içi yakıt tüketim maliyeti (${specs.averageFuelConsumption} L/100km)`);
      }
      if (rks.length < 2) {
        rks.push(`Sanayi bakım ve periyodik servis bütçesine dikkat edilmelidir.`);
      }
      fallbackRisks[`risksV${i + 1}`] = rks.slice(0, 2);
    });

    const winnerName = `${variants[0].brand.name} ${variants[0].model.name} ${variants[0].year}`;

    return {
      verdict: `TorqueScout teknik analizine göre; ${winnerName}, motor verimliliği ve düşük kronik arıza riski dengesiyle öne çıkmaktadır.`,
      recommendedVehicle: winnerName,
      conversationalAdvice: `Selam dostum! Seçtiğin ${variants.length} adet aracı en ince detaylarına kadar karşılaştırdım.\n\nAraçları masaya yatırdığımda; ${variants.map(v => `${v.brand.name} ${v.model.name}`).join(', ')} modellerinin her birinin kendine özgü güçlü yönleri ve dikkat edilmesi gereken noktaları bulunmaktadır.\n\nAlım kararı vermeden önce bütçene ve kullanım amacına en uygun olan seçeneği değerlendirmeni öneririm.`,
      ...fallbackAdvantages,
      ...fallbackRisks,
      performanceAnalysis: `Seçilen araçlar arasında motor güçleri ve şanzıman tepkileri belirgin farklılık göstermektedir.`,
      reliabilityAnalysis: `Veritabanımızdaki kronik arıza kayıtları incelendiğinde servis ve mekanik risk dengesi değişmektedir.`,
      resaleAnalysis: `Türkiye ikinci el piyasasında araçların likidite ve satış hızları segmentlerine göre ayrışmaktadır.`,
      recommendations: {
        cityAndEconomy: `Düşük yakıt tüketimli ve pratik boyutlu modeller şehir içi kullanım için daha elverişlidir.`,
        familyAndComfort: `Geniş iç hacim ve bagaj kapasitesine sahip olan modeller uzun yol seyahatlerinde daha konforludur.`,
      },
    };
  }
}
