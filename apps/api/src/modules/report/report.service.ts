import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { GenerateReportDto, AskChatDto } from './report.dto';
import { FeatureKey, ApprovalStatus, FinalDecision, DataCoverage, PriorityLevel, ResearchScope } from '@prisma/client';
import { AiReportGeneratorService } from '../research/ai-report-generator.service';
import { CoverageService } from '../research/coverage.service';
import { ResearchService } from '../research/research.service';
import OpenAI from 'openai';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
    private reportGenerator: AiReportGeneratorService,
    private coverageService: CoverageService,
    private researchService: ResearchService,
  ) {}

  async generateReport(userId: string, dto: GenerateReportDto & { force?: boolean }) {
    const lang = dto.languageCode || 'tr';
    if (lang !== 'tr' && lang !== 'en') {
      throw new BadRequestException('Desteklenen diller yalnızca "tr" ve "en" dilleridir.');
    }

    // 1. Transaction-safe limit check & usage increment
    await this.featureLimitService.checkAndIncrement(userId, FeatureKey.AI_CHAT);

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
      } catch (err) {
        console.error('Failed to trigger or process research job in generateReport:', err.message);
      }
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
            summary: lang === 'tr' 
              ? 'Bu araç varyantı için onaylanmış detaylı bir satın alma veya geri çağırma kaydı bulunmamaktadır.' 
              : 'No approved chronic problems or recall records found for this vehicle variant.',
            shouldBuyComment: lang === 'tr'
              ? 'Araç hakkında yeterli veri bulunmadığı için yapay zeka tarafından satın alma tavsiyesi oluşturulamadı.'
              : 'AI purchase advice could not be generated due to insufficient chronic problem and service data.',
          },
          riskScore: 0,
          buyabilityScore: 0,
          finalDecision: FinalDecision.INSUFFICIENT_DATA,
          dataCoverage: DataCoverage.NONE,
          coverageScore: 0,
          status: ApprovalStatus.APPROVED,
          generatedAt: new Date(),
        },
        update: {
          summary: {
            title: lang === 'tr' ? 'Veri Kapsamı Yetersiz' : 'Insufficient Data Coverage',
            summary: lang === 'tr' 
              ? 'Bu araç varyantı için onaylanmış detaylı bir satın alma veya geri çağırma kaydı bulunmamaktadır.' 
              : 'No approved chronic problems or recall records found for this vehicle variant.',
            shouldBuyComment: lang === 'tr'
              ? 'Araç hakkında yeterli veri bulunmadığı için yapay zeka tarafından satın alma tavsiyesi oluşturulamadı.'
              : 'AI purchase advice could not be generated due to insufficient chronic problem and service data.',
          },
          riskScore: 0,
          buyabilityScore: 0,
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

    // 2. Fetch approved variant along with its approved problems and recalls
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: { id: dto.variantId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
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

    const apiKey = process.env.OPENAI_API_KEY;
    let response = '';

    if (!apiKey) {
      // Dynamic fallback mock if key not set
      const problemNames = variant.problems.map(p => p.title).join(', ');
      response = `Bu araç (${variant.brand.name} ${variant.model.name} ${variant.generation?.name || ''}) için onaylanmış sorunlar arasında ${
        problemNames || 'herhangi bir kritik kronik sorun bulunmamaktadır'
      }. Detaylı bilgi için teknik raporu inceleyebilirsiniz.`;
    } else {
      const openai = new OpenAI({ apiKey });
      const problemsText = variant.problems
        .map((p: any) => `- ${p.title}: ${p.description} (Risk: ${p.riskLevel})`)
        .join('\n');
      const recallsText = variant.recalls
        .map((r: any) => `- ${r.title}: ${r.description}`)
        .join('\n');

      const systemPrompt = `You are an expert car buying assistant and AI vehicle advisor.
The user is asking a question about a specific vehicle: ${variant.year} ${variant.brand.name} ${variant.model.name} (${variant.engine?.code || ''}, ${variant.transmission?.name || ''}).

Here are the approved chronic problems for this vehicle:
${problemsText || 'No major chronic problems recorded.'}

Here are the approved recalls:
${recallsText || 'No recalls recorded.'}

Answer the user's question accurately based on this data. Do not hallucinate external issues that contradict this data. Always answer in Turkish, and keep your tone helpful, informative, and objective. Keep it concise but detailed enough to answer their question.`;

      try {
        const aiResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: dto.question }
          ],
          temperature: 0.7,
        });

        response = aiResponse.choices[0]?.message?.content || 'Yanıt oluşturulamadı.';
      } catch (err: any) {
        response = `Yapay zeka yanıtı oluşturulurken hata meydana geldi: ${err.message}`;
      }
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
