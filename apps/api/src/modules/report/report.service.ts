import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { GenerateReportDto, AskChatDto } from './report.dto';
import { FeatureKey, ApprovalStatus, PriorityLevel, ResearchScope } from '@prisma/client';
import { AiReportGeneratorService } from '../research/ai-report-generator.service';
import { CoverageService } from '../research/coverage.service';
import { ResearchService } from '../research/research.service';
import { ListingAiProviderService } from '../listing-ai/listing-ai-provider.service';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
    private reportGenerator: AiReportGeneratorService,
    private coverageService: CoverageService,
    private researchService: ResearchService,
    private providerService: ListingAiProviderService,
  ) {}

  async generateReport(userId: string, dto: GenerateReportDto & { force?: boolean }) {
    const lang = dto.languageCode || 'tr';
    if (lang !== 'tr' && lang !== 'en') {
      throw new BadRequestException('Desteklenen diller yalnızca "tr" ve "en" dilleridir.');
    }

    // 1. Transaction-safe limit check & usage increment
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_REPORT);

    // 2. Fetch variant with relations
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variantId },
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true,
      },
    });
    if (!variant || variant.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Bu kombinasyon için net varyant verisi bulunamadı. Lütfen seçimleri kontrol edin.');
    }

    // Verify all critical fields are populated
    if (
      !variant.brand?.name ||
      !variant.model?.name ||
      !variant.year ||
      !variant.bodyType ||
      !variant.engine?.code ||
      !variant.fuelType ||
      !variant.transmission?.name ||
      !variant.trim?.name
    ) {
      throw new BadRequestException('Bu kombinasyon için net varyant verisi bulunamadı. Lütfen seçimleri kontrol edin.');
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

    const hasFullSummary = existingReport && existingReport.summary && typeof existingReport.summary === 'object' && (existingReport.summary as any).summary;
    if (existingReport && existingReport.status === ApprovalStatus.APPROVED && !dto.force && hasFullSummary) {
      return existingReport;
    }

    if (dto.force) {
      if (existingReport && (existingReport.summary as any)?.trimWarning) {
        throw new BadRequestException('Böyle bir araç kombinasyonu gerçekte üretilmediği için yeniden araştırma yapılamaz.');
      }
      try {
        await this.researchService.requestResearch(
          dto.variantId,
          userId,
          lang,
          'TR',
          ResearchScope.FULL_REPORT,
          PriorityLevel.HIGH,
        );
        await this.researchService.processNextJob();
      } catch (err: any) {
        console.error('Failed to trigger or process research job in generateReport:', err.message);
      }
    }

    // 4. Generate and cache report
    const report = await this.reportGenerator.generateReportCache(dto.variantId, lang);
    return report;
  }

  async askChatQuestion(userId: string, dto: AskChatDto) {
    // 1. Transaction-safe limit check
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

    // 2. Fetch approved variant along with its approved problems and recalls
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: { id: dto.variantId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
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

    // Build structured vehicle context object
    const contextJson = {
      vehicle: {
        brand: variant.brand?.name,
        model: variant.model?.name,
        generation: variant.generation?.name,
        year: variant.year,
        engine: variant.engine?.code,
        transmission: variant.transmission?.name,
        fuelType: variant.fuelType,
        bodyType: variant.bodyType,
        trim: variant.trim?.name,
      },
      verifiedDatabaseVehicleReport: {
        problemsCount: variant.problems.length,
        recallsCount: variant.recalls.length,
        knownDatabaseProblems: variant.problems.map((p) => ({ title: p.title, description: p.description, riskLevel: p.riskLevel })),
        recalls: variant.recalls.map((r) => ({ title: r.title, description: r.description })),
      },
    };

    // Use unified ListingAiProviderService engine
    const result = await this.providerService.generateListingAdvice(dto.question, contextJson);

    // Log the chat question
    await this.prisma.aiChatLog.create({
      data: {
        userId,
        variantId: variant.id,
        prompt: dto.question,
        response: result.answer,
      },
    });

    return { response: result.answer };
  }
}
