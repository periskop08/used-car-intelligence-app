import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { GenerateReportDto, AskChatDto } from './report.dto';
import { FeatureKey, ApprovalStatus, FinalDecision, DataCoverage } from '@prisma/client';
import { AiReportGeneratorService } from '../research/ai-report-generator.service';
import { CoverageService } from '../research/coverage.service';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
    private reportGenerator: AiReportGeneratorService,
    private coverageService: CoverageService,
  ) {}

  async generateReport(userId: string, dto: GenerateReportDto) {
    const lang = dto.languageCode || 'tr';
    if (lang !== 'tr' && lang !== 'en') {
      throw new BadRequestException('Desteklenen diller yalnızca "tr" ve "en" dilleridir.');
    }

    // 1. Transaction-safe limit check & usage increment
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

    // 2. Fetch variant
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant) {
      throw new NotFoundException('Araç varyantı bulunamadı.');
    }

    // 3. Check for existing APPROVED AiVehicleReport cache
    const existingReport = await this.prisma.aiVehicleReport.findUnique({
      where: {
        variantId_languageCode: {
          variantId: dto.variantId,
          languageCode: lang,
        },
      },
    });

    if (existingReport && existingReport.status === ApprovalStatus.APPROVED) {
      return existingReport;
    }

    // 4. Count APPROVED related entities (problems, recalls, checklists)
    const approvedProblemsCount = await this.prisma.commonProblem.count({
      where: { variantId: dto.variantId, status: ApprovalStatus.APPROVED },
    });
    const approvedRecallsCount = await this.prisma.recall.count({
      where: { variantId: dto.variantId, status: ApprovalStatus.APPROVED },
    });
    const approvedChecklistsCount = await this.prisma.inspectionChecklistItem.count({
      where: { variantId: dto.variantId, status: ApprovalStatus.APPROVED },
    });

    const totalApprovedCount = approvedProblemsCount + approvedRecallsCount + approvedChecklistsCount;

    if (totalApprovedCount === 0) {
      // 0 APPROVED records -> dataCoverage NONE
      const report = await this.prisma.aiVehicleReport.upsert({
        where: {
          variantId_languageCode: {
            variantId: dto.variantId,
            languageCode: lang,
          },
        },
        create: {
          variantId: dto.variantId,
          languageCode: lang,
          summary: {
            title: lang === 'tr' ? 'Veri Kapsamı Yetersiz' : 'Insufficient Data Coverage',
            message: lang === 'tr' 
              ? 'Bu araç varyantı için onaylanmış detaylı kronik sorun veya geri çağırma kaydı bulunmamaktadır.' 
              : 'No approved chronic problems or recall records found for this vehicle variant.',
          },
          riskScore: 0,
          buyabilityScore: 100,
          finalDecision: FinalDecision.INSUFFICIENT_DATA,
          dataCoverage: DataCoverage.NONE,
          coverageScore: 0,
          status: ApprovalStatus.APPROVED,
          generatedAt: new Date(),
        },
        update: {
          summary: {
            title: lang === 'tr' ? 'Veri Kapsamı Yetersiz' : 'Insufficient Data Coverage',
            message: lang === 'tr' 
              ? 'Bu araç varyantı için onaylanmış detaylı kronik sorun veya geri çağırma kaydı bulunmamaktadır.' 
              : 'No approved chronic problems or recall records found for this vehicle variant.',
          },
          riskScore: 0,
          buyabilityScore: 100,
          finalDecision: FinalDecision.INSUFFICIENT_DATA,
          dataCoverage: DataCoverage.NONE,
          coverageScore: 0,
          status: ApprovalStatus.APPROVED,
          generatedAt: new Date(),
        },
      });

      return report;
    }

    // 5. Generate and cache report if approved data exists
    const report = await this.reportGenerator.generateReportCache(dto.variantId, lang);
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
