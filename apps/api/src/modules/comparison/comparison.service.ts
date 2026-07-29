import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { CompareVehiclesDto } from './comparison.dto';
import { FeatureKey, ApprovalStatus } from '@prisma/client';
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
    });
  }

  async compare(userId: string, dto: CompareVehiclesDto) {
    if (dto.variant1Id === dto.variant2Id) {
      throw new BadRequestException('Aynı araç varyantını kendisiyle karşılaştıramazsınız.');
    }

    const cacheKey = [dto.variant1Id, dto.variant2Id].sort().join('_');

    // 1. Check DB Cache first
    const cachedReport = await this.prisma.aiVehicleComparisonCache.findUnique({
      where: { cacheKey },
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
      // Feature Limit Check
      await this.featureLimitService.checkAndIncrement(userId, FeatureKey.VEHICLE_COMPARISON);

      // Generate AI Comparison Report
      aiAnalysis = await this.generateAiComparison(variant1, variant2, v1FullName, v2FullName);

      // Save to Cache Table
      await this.prisma.aiVehicleComparisonCache.create({
        data: {
          variant1Id: dto.variant1Id,
          variant2Id: dto.variant2Id,
          cacheKey,
          verdict: aiAnalysis.verdict || '',
          analysisJson: aiAnalysis,
        },
      }).catch(err => {
        console.warn('Cache write warning:', err?.message);
      });
    }

    // Save user comparison history log
    await this.prisma.vehicleComparison.create({
      data: {
        userId,
        variant1Id: dto.variant1Id,
        variant2Id: dto.variant2Id,
      },
    }).catch(() => null);

    return {
      isCached: !!cachedReport,
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

  private async generateAiComparison(v1: any, v2: any, v1Name: string, v2Name: string): Promise<any> {
    const prompt = `Aşağıdaki iki aracı karşılaştıran detaylı ve tarafsız bir otomotiv analiz raporu oluştur.
Araç 1: ${v1Name} (Motor: ${v1.engine.code}, Şanzıman: ${v1.transmission.name}, Yakıt: ${v1.fuelType}, Kronik Sorun Sayısı: ${v1.problems.length})
Araç 2: ${v2Name} (Motor: ${v2.engine.code}, Şanzıman: ${v2.transmission.name}, Yakıt: ${v2.fuelType}, Kronik Sorun Sayısı: ${v2.problems.length})

Lütfen SADECE aşağıdaki JSON formatında yanıt ver:
{
  "verdict": "Net sonuç ve kazanan araç tavsiyesi (2-3 cümle)",
  "recommendedVehicle": "${v1Name}" veya "${v2Name}" veya "Eşit",
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
            { role: 'system', content: 'Sen uzman bir otomotiv mühendisi ve ikinci el araç danışmanısın. Yalnızca geçerli JSON dön.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          return JSON.parse(content);
        }
      } catch (err) {
        console.warn('OpenAI call failed, falling back to structured synthesis:', err);
      }
    }

    // Fallback structured synthesis when OpenAI is not active
    const v1BetterPerformance = (v1.specs?.specs?.['topSpeed'] || 0) >= (v2.specs?.specs?.['topSpeed'] || 0);
    const winnerName = v1.problems.length <= v2.problems.length ? v1Name : v2Name;

    return {
      verdict: `Yapay zeka analizimize göre; ${winnerName}, kronik risk dengesi ve kullanım ekonomisi açısından bir adım önde değerlendirilmiştir.`,
      recommendedVehicle: winnerName,
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
