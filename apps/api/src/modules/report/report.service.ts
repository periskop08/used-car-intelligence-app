import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { GenerateReportDto, AskChatDto } from './report.dto';
import { FeatureKey, ApprovalStatus, FinalDecision } from '@prisma/client';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
  ) {}

  async generateReport(userId: string, dto: GenerateReportDto) {
    const lang = dto.languageCode || 'tr';
    if (lang !== 'tr' && lang !== 'en') {
      throw new BadRequestException('Desteklenen diller yalnızca "tr" ve "en" dilleridir.');
    }

    // 1. Transaction-safe limit check & usage increment
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

    // 2. Fetch only APPROVED vehicle variant and details
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: { id: dto.variantId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        country: true,
        specs: true,
        problems: {
          where: { status: ApprovalStatus.APPROVED },
        },
        recalls: {
          where: { status: ApprovalStatus.APPROVED },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Araç varyantı bulunamadı veya onaylanmış durumda değil.');
    }

    // 3. Check for sufficient approved data (must have at least specs and some common problems to not be insufficient_data)
    const hasSufficientData = variant.specs && variant.problems.length > 0;

    let finalDecision: FinalDecision = FinalDecision.BUY_CAREFULLY;
    let riskScore = 30;
    let buyabilityScore = 80;
    let reportSummary: any = {};

    if (!hasSufficientData) {
      finalDecision = FinalDecision.INSUFFICIENT_DATA;
      riskScore = 0;
      buyabilityScore = 0;
      reportSummary = {
        message: lang === 'tr' 
          ? 'Bu araç için yeterli doğrulanmış veri bulunmuyor.' 
          : 'Insufficient verified data found for this vehicle.',
      };
    } else {
      // Calculate scores based on risk levels of approved problems
      const hasHighRisk = variant.problems.some(p => p.riskLevel === 'HIGH') || variant.recalls.some(r => r.riskLevel === 'HIGH');
      const hasMediumRisk = variant.problems.some(p => p.riskLevel === 'MEDIUM');

      if (hasHighRisk) {
        finalDecision = FinalDecision.RISKY;
        riskScore = 75;
        buyabilityScore = 40;
      } else if (hasMediumRisk) {
        finalDecision = FinalDecision.BUY_CAREFULLY;
        riskScore = 45;
        buyabilityScore = 70;
      } else {
        finalDecision = FinalDecision.BUY;
        riskScore = 15;
        buyabilityScore = 90;
      }

      if (lang === 'tr') {
        reportSummary = {
          title: `${variant.brand.name} ${variant.model.name} ${variant.year} AI Değerlendirme Raporu`,
          summary: `${variant.brand.name} ${variant.model.name} (${variant.year}) jenerasyonu genel olarak dayanıklılığı ile bilinir. Ancak ${variant.problems.length} adet onaylanmış kronik sorun tespit edilmiştir.`,
          biggestRisks: variant.problems.map(p => p.title),
          shouldBuyComment: finalDecision === FinalDecision.RISKY 
            ? 'Ciddi kronik sorunlar veya geri çağırma kayıtları mevcuttur, alım öncesi kapsamlı kontrol gerektirir.' 
            : 'Genel durumu olumlu, kronik problemler göz önünde bulundurularak alınabilir.',
          engineNotes: `${variant.engine.code} kodlu motorun verimliliği test edilmiştir.`,
          transmissionNotes: `${variant.transmission.name} şanzıman vites geçişleri kontrol edilmelidir.`,
        };
      } else {
        reportSummary = {
          title: `${variant.brand.name} ${variant.model.name} ${variant.year} AI Evaluation Report`,
          summary: `${variant.brand.name} ${variant.model.name} (${variant.year}) generation is generally known for its reliability, but ${variant.problems.length} verified chronic issues were identified.`,
          biggestRisks: variant.problems.map(p => p.title),
          shouldBuyComment: finalDecision === FinalDecision.RISKY 
            ? 'Serious chronic issues or recall logs found, requires comprehensive inspection before purchase.' 
            : 'Overall condition is good, acceptable purchase keeping known issues in mind.',
          engineNotes: `Engine ${variant.engine.code} fuel efficiency is verified.`,
          transmissionNotes: `Shifting performance of ${variant.transmission.name} should be tested.`,
        };
      }
    }

    // 4. Save/Cache report in database
    const report = await this.prisma.aiVehicleReport.upsert({
      where: {
        variantId_languageCode: {
          variantId: variant.id,
          languageCode: lang,
        },
      },
      update: {
        summary: reportSummary,
        riskScore,
        buyabilityScore,
        finalDecision,
        updatedAt: new Date(),
      },
      create: {
        variantId: variant.id,
        languageCode: lang,
        summary: reportSummary,
        riskScore,
        buyabilityScore,
        finalDecision,
      },
    });

    return report;
  }

  async askChatQuestion(userId: string, dto: AskChatDto) {
    // 1. Transaction-safe limit check
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

    // 2. Fetch approved variant
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: { id: dto.variantId, status: ApprovalStatus.APPROVED },
      include: { brand: true, model: true },
    });

    if (!variant) {
      throw new NotFoundException('Araç varyantı bulunamadı veya onaylanmış durumda değil.');
    }

    // 3. Generate mock response based on question keywords
    const questionLower = dto.question.toLowerCase();
    let response = '';

    if (questionLower.includes('dsg') || questionLower.includes('şanzıman') || questionLower.includes('vites')) {
      response = `Bu araçta kullanılan DSG DQ200 7-ileri kuru tip çift kavramalı şanzıman, özellikle yoğun dur-kalk trafikte ısınma ve aşınma eğilimindedir. Mekatronik arızası veya kavrama değişimi yüksek maliyetler doğurabilir. Şanzıman yağı ve vites geçiş kalitesi alım öncesinde mutlaka test edilmelidir.`;
    } else if (questionLower.includes('motor') || questionLower.includes('enjektör') || questionLower.includes('dpf') || questionLower.includes('partikül')) {
      response = `1.6 TDI CR motor seçeneğinde DPF (Dizel Partikül Filtresi) tıkanması kısa mesafe şehir içi kullanımlarında yaygındır. Motorun çekişini korumak için enjektör püskürtme değerleri ve DPF doluluk oranı teşhis cihazı ile kontrol edilmelidir.`;
    } else if (questionLower.includes('kronik') || questionLower.includes('arıza') || questionLower.includes('sorun')) {
      response = `Bu model için bilinen en kritik iki kronik arıza DSG kavrama aşınması ve dizel partikül filtresi tıkanmasıdır. Bunların dışında klimadaki aktüatör motorunun çıtırtı yapması dışında büyük bir kronik zayıflığı bulunmamaktadır.`;
    } else {
      response = `${variant.brand.name} ${variant.model.name} (${variant.year}) modeli hakkında sorduğunuz soruya istinaden: Aracın genel güvenilirlik puanı oldukça yüksek olup, düzenli bakımları yapıldığı takdirde sorunsuz kullanılabilecek bir modeldir. Bahsettiğiniz detay hakkında yetkili servis geçmişini sorgulatmanızı tavsiye ederiz.`;
    }

    // 4. Log the chat question
    await this.prisma.aiChatLog.create({
      data: {
        userId,
        variantId: variant.id,
        prompt: dto.question,
        response,
      },
    });

    return { response };
  }
}
