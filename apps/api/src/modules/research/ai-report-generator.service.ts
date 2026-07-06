import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CoverageService } from './coverage.service';
import { ApprovalStatus, DataCoverage, FinalDecision } from '@prisma/client';
import OpenAI from 'openai';

@Injectable()
export class AiReportGeneratorService {
  private readonly logger = new Logger(AiReportGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private coverageService: CoverageService,
  ) {}

  /**
   * Generates or refreshes the AI vehicle report cache for a variant using strictly APPROVED data.
   * Marked as APPROVED automatically because inputs are verified.
   */
  async generateReportCache(variantId: string, languageCode: string = 'tr'): Promise<any> {
    // 1. Fetch variant and related APPROVED entities only
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        problems: {
          where: { status: ApprovalStatus.APPROVED },
          include: {
            sources: {
              include: { source: true },
            },
          },
        },
        recalls: {
          where: { status: ApprovalStatus.APPROVED },
        },
        checklists: {
          where: { status: ApprovalStatus.APPROVED },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Vehicle variant not found.');
    }

    // 2. Count approved items for coverage calculation
    const approvedProblems = variant.problems;
    const approvedRecalls = variant.recalls;
    const approvedChecklists = variant.checklists;

    const totalApprovedCount = approvedProblems.length + approvedRecalls.length + approvedChecklists.length;
    const dataCoverage = this.coverageService.calculateDataCoverage(totalApprovedCount);

    // 3. Extract sources from approved problems for coverage score
    const approvedSources: Array<{ url: string; sourceKind: any }> = [];
    for (const prob of approvedProblems) {
      for (const cs of prob.sources) {
        if (cs.source && cs.source.status === ApprovalStatus.APPROVED) {
          approvedSources.push({
            url: cs.source.url,
            sourceKind: cs.source.sourceKind,
          });
        }
      }
    }
    const coverageScore = this.coverageService.calculateCoverageScore(approvedSources);

    // 4. Check if there are no approved items (NONE or LIMITED with 0 count)
    if (totalApprovedCount === 0) {
      // Return a basic warning report without invoking AI (cost saving and no hallucination)
      const report = await this.prisma.aiVehicleReport.upsert({
        where: { variantId_languageCode: { variantId, languageCode } },
        create: {
          variantId,
          languageCode,
          summary: {
            title: languageCode === 'tr' ? 'Veri Kapsamı Yetersiz' : 'Insufficient Data Coverage',
            message: languageCode === 'tr'
              ? 'Bu araç varyantı için onaylanmış detaylı kronik sorun veya geri çağırma kaydı bulunmamaktadır.'
              : 'No approved chronic problems or recall records found for this vehicle variant.',
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
            title: languageCode === 'tr' ? 'Veri Kapsamı Yetersiz' : 'Insufficient Data Coverage',
            message: languageCode === 'tr'
              ? 'Bu araç varyantı için onaylanmış detaylı kronik sorun veya geri çağırma kaydı bulunmamaktadır.'
              : 'No approved chronic problems or recall records found for this vehicle variant.',
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

    // 5. Generate structured report using AI or Mock
    const apiKey = process.env.OPENAI_API_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    let aiOutput: any;

    if (!isProduction && !apiKey) {
      this.logger.log('Mocking AI Report generation in development/test environment.');
      aiOutput = this.generateMockReport(variant, languageCode);
    } else {
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured in production.');
      }
      aiOutput = await this.invokeReportAI(variant, languageCode, apiKey);
    }

    // 6. Save or update AiVehicleReport
    const report = await this.prisma.aiVehicleReport.upsert({
      where: {
        variantId_languageCode: { variantId, languageCode },
      },
      create: {
        variantId,
        languageCode,
        summary: aiOutput.summary,
        riskScore: aiOutput.riskScore,
        buyabilityScore: aiOutput.buyabilityScore,
        finalDecision: aiOutput.finalDecision as FinalDecision,
        biggestRisks: aiOutput.biggestRisks,
        sellerQuestions: aiOutput.sellerQuestions,
        inspectionChecklist: aiOutput.inspectionChecklist,
        dataCoverage,
        coverageScore,
        status: ApprovalStatus.APPROVED,
        generatedAt: new Date(),
        approvedAt: new Date(),
      },
      update: {
        summary: aiOutput.summary,
        riskScore: aiOutput.riskScore,
        buyabilityScore: aiOutput.buyabilityScore,
        finalDecision: aiOutput.finalDecision as FinalDecision,
        biggestRisks: aiOutput.biggestRisks,
        sellerQuestions: aiOutput.sellerQuestions,
        inspectionChecklist: aiOutput.inspectionChecklist,
        dataCoverage,
        coverageScore,
        status: ApprovalStatus.APPROVED,
        generatedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    return report;
  }

  /**
   * Mark all AI reports for a variant as STALE.
   */
  async markReportStale(variantId: string): Promise<void> {
    await this.prisma.aiVehicleReport.updateMany({
      where: { variantId },
      data: { status: ApprovalStatus.STALE },
    });
    this.logger.log(`Marked AI Vehicle Reports for variant ${variantId} as STALE.`);
  }

  private async invokeReportAI(variant: any, languageCode: string, apiKey: string): Promise<any> {
    const openai = new OpenAI({ apiKey });

    const problemsText = variant.problems
      .map((p: any) => `- ${p.title}: ${p.description} (Risk: ${p.riskLevel})`)
      .join('\n');
    const recallsText = variant.recalls
      .map((r: any) => `- ${r.title}: ${r.description}`)
      .join('\n');
    const checklistText = variant.checklists
      .map((c: any) => `- ${c.title}: ${c.description || ''}`)
      .join('\n');

    const systemPrompt = `You are a vehicle report cache compiler AI. You take approved vehicle data and summarize it into a structured vehicle purchase advice report.
Output JSON format only:
{
  "summary": {
    "title": "Short descriptive title",
    "summary": "Detailed overview summary of the vehicle reliability, explaining exactly why the risk and buyability scores were set to their respective values",
    "shouldBuyComment": "A clear, actionable purchase advice recommendation comment explaining the final decision"
  },
  "riskScore": 0-100 score,
  "buyabilityScore": 0-100 score,
  "finalDecision": "BUY" | "BUY_CAREFULLY" | "RISKY" | "AVOID",
  "biggestRisks": ["Risk 1", "Risk 2"],
  "sellerQuestions": ["Question 1", "Question 2"],
  "inspectionChecklist": ["Check item 1", "Check item 2"]
}`;

    const userPrompt = `Target Vehicle: ${variant.year} ${variant.brand.name} ${variant.model.name} (${variant.engine.code}, ${variant.transmission.name})
Language: ${languageCode === 'tr' ? 'Turkish' : 'English'}

Approved Chronic Problems:
${problemsText}

Approved Recalls:
${recallsText}

Approved Checklists:
${checklistText}

Generate the summarized report JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private generateMockReport(variant: any, languageCode: string): any {
    const isTr = languageCode === 'tr';
    const decision = variant.problems.some((p: any) => p.riskLevel === 'HIGH')
      ? 'BUY_WITH_CAUTION'
      : 'BUYABLE';

    return {
      summary: {
        title: isTr
          ? `${variant.brand.name} ${variant.model.name} Detaylı AI Raporu`
          : `${variant.brand.name} ${variant.model.name} Detailed AI Report`,
        text: isTr
          ? `Bu araç varyantı için onaylanmış ${variant.problems.length} sorun tespit edilmiştir.`
          : `We identified ${variant.problems.length} approved issues for this vehicle variant.`,
        engineNotes: isTr ? 'Motor performansı ve contaları kontrol edilmeli.' : 'Check engine sealings.',
        transmissionNotes: isTr ? 'Şanzıman geçişleri kontrol edilmeli.' : 'Check transmission shifting.',
      },
      riskScore: variant.problems.some((p: any) => p.riskLevel === 'HIGH') ? 60 : 25,
      buyabilityScore: variant.problems.some((p: any) => p.riskLevel === 'HIGH') ? 65 : 85,
      finalDecision: decision,
      biggestRisks: variant.problems.map((p: any) => p.title),
      sellerQuestions: ['Şanzıman bakımı ne zaman yapıldı?'],
      inspectionChecklist: ['Silindir kapak contası yağ sızıntısı kontrolü'],
    };
  }
}
