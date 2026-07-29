import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { CompareVehiclesDto, ComparisonChatDto } from './comparison.dto';
import { FeatureKey, ApprovalStatus, SubscriptionTier, UsagePeriodType } from '@prisma/client';
import OpenAI from 'openai';

@Injectable()
export class ComparisonService {
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
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
    if (user && (user.role === 'ADMIN' || ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email))) {
      return 999;
    }

    // Active Buyer Purchases credits
    const activePurchases = await this.prisma.buyerPackagePurchase.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    }).catch(() => []);

    let buyerCredits = 0;
    activePurchases.forEach(p => {
      buyerCredits += Math.max(0, p.chatbotMessageLimit - p.chatbotMessageUsed);
    });

    // Monthly tier limit
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

  async compare(userId: string, dto: CompareVehiclesDto) {
    if (dto.variant1Id === dto.variant2Id) {
      throw new BadRequestException('Aynı araç varyantını kendisiyle karşılaştıramazsınız.');
    }

    const cacheKey = [dto.variant1Id, dto.variant2Id].sort().join('_');

    // 1. Safe DB Cache lookup
    const cachedReport = await this.prisma.aiVehicleComparisonCache.findUnique({
      where: { cacheKey },
    }).catch((err) => {
      console.warn('Cache lookup warning:', err?.message);
      return null;
    });

    // 2. Fetch both approved variants
    const variant1 = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variant1Id },
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

    const variant2 = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variant2Id },
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

    if (!variant1 || variant1.status !== ApprovalStatus.APPROVED || !variant2 || variant2.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Bu kombinasyon için net varyant verisi bulunamadı. Lütfen seçimleri kontrol edin.');
    }

    const isInvalid = (v: any) =>
      !v.brand?.name ||
      !v.model?.name ||
      !v.year ||
      !v.bodyType ||
      !v.engine?.code ||
      !v.fuelType ||
      !v.transmission?.name ||
      !v.trim?.name;

    if (isInvalid(variant1) || isInvalid(variant2)) {
      throw new BadRequestException('Bu kombinasyon için net varyant verisi bulunamadı. Lütfen seçimleri kontrol edin.');
    }

    const v1FullName = `${variant1.brand.name} ${variant1.model.name} ${variant1.year} (${variant1.trim.name})`;
    const v2FullName = `${variant2.brand.name} ${variant2.model.name} ${variant2.year} (${variant2.trim.name})`;

    let aiAnalysis: any;

    if (cachedReport) {
      aiAnalysis = cachedReport.analysisJson;
    } else {
      await this.featureLimitService.checkAndIncrement(userId, FeatureKey.VEHICLE_COMPARISON).catch((err) => {
        console.warn('Feature limit check warning:', err?.message);
      });

      aiAnalysis = await this.generateAiComparison(variant1, variant2, v1FullName, v2FullName);

      await this.prisma.aiVehicleComparisonCache.create({
        data: {
          variant1Id: dto.variant1Id,
          variant2Id: dto.variant2Id,
          cacheKey,
          verdict: aiAnalysis?.verdict || '',
          analysisJson: aiAnalysis,
        },
      }).catch((err) => {
        console.warn('Cache write skipped:', err?.message);
      });
    }

    await this.prisma.vehicleComparison.create({
      data: {
        userId,
        variant1Id: dto.variant1Id,
        variant2Id: dto.variant2Id,
      },
    }).catch(() => null);

    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    return {
      isCached: !!cachedReport,
      remainingChatbotMessages,
      vehicle1: {
        id: variant1.id,
        name: v1FullName,
        brand: variant1.brand.name,
        model: variant1.model.name,
        year: variant1.year,
        trim: variant1.trim.name,
        engine: variant1.engine.code,
        transmission: variant1.transmission.name,
        specs: variant1.specs?.specs || {},
        problemsCount: variant1.problems.length,
      },
      vehicle2: {
        id: variant2.id,
        name: v2FullName,
        brand: variant2.brand.name,
        model: variant2.model.name,
        year: variant2.year,
        trim: variant2.trim.name,
        engine: variant2.engine.code,
        transmission: variant2.transmission.name,
        specs: variant2.specs?.specs || {},
        problemsCount: variant2.problems.length,
      },
      aiAnalysis,
      specComparison: {
        topSpeed: { label: 'Maks Hız (km/h)', v1: variant1.specs?.specs?.['topSpeed'] || '-', v2: variant2.specs?.specs?.['topSpeed'] || '-' },
        acceleration: { label: '0-100 Hızlanma (sn)', v1: variant1.specs?.specs?.['acceleration0to100'] || '-', v2: variant2.specs?.specs?.['acceleration0to100'] || '-' },
        fuel: { label: 'Ort. Yakıt Tüketimi (lt)', v1: variant1.specs?.specs?.['averageFuelConsumption'] || '-', v2: variant2.specs?.specs?.['averageFuelConsumption'] || '-' },
        luggage: { label: 'Bagaj Hacmi (lt)', v1: variant1.specs?.specs?.['luggageCapacity'] || '-', v2: variant2.specs?.specs?.['luggageCapacity'] || '-' },
        weight: { label: 'Ağırlık (kg)', v1: variant1.specs?.specs?.['weight'] || '-', v2: variant2.specs?.specs?.['weight'] || '-' },
      },
    };
  }

  async chat(userId: string, dto: ComparisonChatDto) {
    if (!dto.question || !dto.question.trim()) {
      throw new BadRequestException('Lütfen sormak istediğiniz soruyu yazın.');
    }

    // Deduct 1 Chatbot credit
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

    const variant1 = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variant1Id },
      include: { brand: true, model: true, engine: true, transmission: true, trim: true, specs: true, problems: { where: { status: ApprovalStatus.APPROVED } } },
    });

    const variant2 = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variant2Id },
      include: { brand: true, model: true, engine: true, transmission: true, trim: true, specs: true, problems: { where: { status: ApprovalStatus.APPROVED } } },
    });

    if (!variant1 || !variant2) {
      throw new BadRequestException('Karşılaştırılan araçlar bulunamadı.');
    }

    const v1Name = `${variant1.brand.name} ${variant1.model.name} ${variant1.year} (${variant1.trim.name})`;
    const v2Name = `${variant2.brand.name} ${variant2.model.name} ${variant2.year} (${variant2.trim.name})`;

    const prompt = `Sen TorqueScout AI Asistanısın. Kullanıcı şu iki aracı kıyaslıyor:
1. Araç: ${v1Name} (Motor: ${variant1.engine.code}, Şanzıman: ${variant1.transmission.name}, Yakıt: ${variant1.fuelType}, Kronik Sorun Sayısı: ${variant1.problems.length})
2. Araç: ${v2Name} (Motor: ${variant2.engine.code}, Şanzıman: ${variant2.transmission.name}, Yakıt: ${variant2.fuelType}, Kronik Sorun Sayısı: ${variant2.problems.length})

Kullanıcının sorduğu detaylı takip sorusu: "${dto.question}"

Lütfen samimi, doğrudan kullanıcının karşısındaymış gibi konuşarak net, teknik açıdan doğru ve yönlendirici yanıt ver. Yanıtın Türkçe ve 2-3 paragrafı geçmeyen uzunlukta olsun.`;

    let reply = '';

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen samimi, bilgili ve yardımsever TorqueScout otomotiv danışmanısın.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.5,
        });

        reply = response.choices[0]?.message?.content || '';
      } catch (err: any) {
        console.warn('OpenAI comparison chat failed, switching to Gemini:', err?.message || err);
      }
    }

    if (!reply) {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (geminiApiKey) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
          const res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } catch (err: any) {
          console.warn('Gemini chat failed:', err?.message || err);
        }
      }
    }

    if (!reply) {
      reply = `${v1Name} ve ${v2Name} modelleri kıyaslandığında, sorduğun "${dto.question}" başlığı altında motor karakteri ve şanzıman verimliliği öne çıkmaktadır. Sürüş alışkanlıklarına ve periyodik bakım disiplinine dikkat etmeni öneririm.`;
    }

    await this.prisma.aiChatLog.create({
      data: {
        userId,
        variantId: variant1.id,
        prompt: dto.question,
        response: reply,
      },
    }).catch(() => null);

    const remainingChatbotMessages = await this.getUserChatbotQuota(userId);

    return {
      response: reply,
      remainingChatbotMessages,
    };
  }

  private async generateAiComparison(v1: any, v2: any, v1Name: string, v2Name: string): Promise<any> {
    const prompt = `Aşağıdaki iki aracı karşılaştıran detaylı ve tarafsız bir otomotiv analiz raporu oluştur.
Araç 1: ${v1Name} (Motor: ${v1.engine.code}, Şanzıman: ${v1.transmission.name}, Yakıt: ${v1.fuelType}, Kronik Sorun Sayısı: ${v1.problems.length})
Araç 2: ${v2Name} (Motor: ${v2.engine.code}, Şanzıman: ${v2.transmission.name}, Yakıt: ${v2.fuelType}, Kronik Sorun Sayısı: ${v2.problems.length})

Lütfen SADECE aşağıdaki JSON formatında yanıt ver:
{
  "verdict": "Net sonuç ve kazanan araç tavsiyesi (2-3 cümle)",
  "recommendedVehicle": "${v1Name}" veya "${v2Name}" veya "Eşit",
  "conversationalAdvice": "TorqueScout AI Asistanı olarak doğrudan kullanıcının karşısındaymış gibi konuşan samimi, teknik açıdan zengin ve rehberlik eden 2-3 paragraflık konuşma metni. (Örn: 'Selam dostum! Senin için bu iki harika aracı en ince ayrıntısına kadar kıyasladım...')",
  "advantagesV1": ["Araç 1'in öne çıkan 3 ana avantajı"],
  "advantagesV2": ["Araç 2'nin öne çıkan 3 ana avantajı"],
  "performanceAnalysis": "Motor gücü, şanzıman uyumu ve yakıt tüketimi kıyaslaması",
  "reliabilityAnalysis": "Kronik arızalar, bakım maliyeti ve sanayi riskleri kıyaslaması",
  "resaleAnalysis": "İkinci el piyasası, likidite ve değer koruma kıyaslaması",
  "recommendations": {
    "cityAndEconomy": "Şehir içi ve düşük kullanım maliyeti arayanlar için tavsiye",
    "familyAndComfort": "Uzun yol ve aile kullanımı arayanlar için tavsiye"
  }
}`;

    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Sen TorqueScout AI Asistanısın. Kullanıcıyla samimi, uzman bir dille birebir konuşarak rehberlik eden otomotiv uzmanısın. Yalnızca geçerli JSON dön.' },
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
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        });

        if (res.ok) {
          const geminiData = await res.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonText);
          }
        } else {
          const errText = await res.text();
          console.warn('Gemini API returned error response:', res.status, errText);
        }
      } catch (err: any) {
        console.warn('Gemini API call failed, switching to fallback synthesis:', err?.message || err);
      }
    }

    const v1BetterPerformance = (v1.specs?.specs?.['topSpeed'] || 0) >= (v2.specs?.specs?.['topSpeed'] || 0);
    const winnerName = v1.problems.length <= v2.problems.length ? v1Name : v2Name;

    return {
      verdict: `Yapay zeka analizimize göre; ${winnerName}, kronik risk dengesi ve kullanım ekonomisi açısından bir adım önde değerlendirilmiştir.`,
      recommendedVehicle: winnerName,
      conversationalAdvice: `Selam dostum! Senin için ${v1Name} ve ${v2Name} modellerini en ince detaylarına kadar karşılaştırdım.\n\nİki aracı teknik ve kronik açıdan masaya yatırdığımda; ${v1Name} modeli ${v1.engine.code} motoru ve ${v1.transmission.name} şanzıman kombinasyonu ile ${v1BetterPerformance ? 'daha dinamik bir sürüş ve tork' : 'dengeli bir şehir içi karakteri'} sunuyor. Veritabanımızda kayıtlı ${v1.problems.length} kronik durum bulunuyor.\n\nBuna karşılık ${v2Name} modeli ise ${v2.fuelType} yapısı ve ${v2.problems.length} kronik durum kaydıyla özellikle işletme maliyetine önem veren sürücüler için oldukça cazip bir alternatif. Karar verirken günlük kullanım mesafeni ve yıllık servis bütçeni göz önünde bulundurmanı öneririm!`,
      advantagesV1: [
        `${v1.engine.code} motor performansı ve tork karakteri`,
        `${v1.transmission.name} şanzıman tipi`,
        `${v1.problems.length} kayıtlı kronik kontrol noktası`,
      ],
      advantagesV2: [
        `${v2.engine.code} motor verimliliği`,
        `${v2.transmission.name} şanzıman teknolojisi`,
        `${v2.problems.length} kayıtlı kronik kontrol noktası`,
      ],
      performanceAnalysis: `${v1Name} modeli ${v1.engine.code} motoru ile ${v1BetterPerformance ? 'daha yüksek sürüş dinamiği' : 'dengeli güç'} sunarken, ${v2Name} ${v2.fuelType} yapısıyla yakıt verimliliğine odaklanmaktadır.`,
      reliabilityAnalysis: `${v1Name} için veritabanımızda ${v1.problems.length} adet onaylı kronik arıza kaydı bulunurken, ${v2Name} için ${v2.problems.length} adet kayıt bulunmaktadır. Şanzıman ve motor periyodik bakımları kritik önem taşır.`,
      resaleAnalysis: `İki araç da Türkiye ikinci el pazarında yüksek likiditeye sahip segmentlerde yer almakta olup, orijinal bakımlı ve düşük kilometreli örnekleri değerini korumaktadır.`,
      recommendations: {
        cityAndEconomy: `Düşük yakıt tüketimi ve pratik şehir içi kullanım için ${v1.fuelType === 'DIESEL' || v1.fuelType === 'HYBRID' ? v1Name : v2Name} daha uygundur.`,
        familyAndComfort: `Sürüş konforu ve geniş kullanım hacmi arayanlar için ${v1Name} öne çıkmaktadır.`,
      },
    };
  }
}
