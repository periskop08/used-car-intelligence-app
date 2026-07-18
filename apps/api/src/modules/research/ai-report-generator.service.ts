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


    // 5. Generate structured report using AI or Mock
    const apiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    let aiOutput: any;

    if (!isProduction && !apiKey && !geminiApiKey) {
      this.logger.log('Mocking AI Report generation in development/test environment.');
      aiOutput = this.generateMockReport(variant, languageCode);
    } else {
      const openai = apiKey ? new OpenAI({ apiKey }) : null;
      if (openai) {
        try {
          aiOutput = await this.invokeReportAI(variant, languageCode, openai);
        } catch (err: any) {
          if (geminiApiKey) {
            this.logger.error(`OpenAI Report generation failed: ${err.message}. Trying Gemini fallback...`);
            aiOutput = await this.invokeReportGemini(variant, languageCode, geminiApiKey);
          } else {
            throw err;
          }
        }
      } else if (geminiApiKey) {
        aiOutput = await this.invokeReportGemini(variant, languageCode, geminiApiKey);
      } else {
        throw new Error('Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured.');
      }
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

  private async invokeReportAI(variant: any, languageCode: string, openai: OpenAI): Promise<any> {
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
    "summary": "Detailed overview summary in Turkish Markdown. You MUST structure it EXACTLY under three H3 headers: '### ⚙️ Motor ve Şanzıman Kombinasyonu', '### 👍 Avantajları', and '### ⚠️ Dikkat Edilmesi Gerekenler ve Sık Karşılaşılan Durumlar'. Under each header, provide highly technical, specific, bulleted details. Even if the list of approved chronic problems provided is brief or empty, you MUST use your extensive internal automotive knowledge about this specific vehicle variant to populate these sections with rich, precise details (e.g. details about the engine code like N20B20, transmission models like ZF 8HP, timing chain chain stretch, oil pump failures, etc.). Highlight key facts in **bold**. CRITICAL: You must strictly respect the vehicle's engine and fuel specifications. If the vehicle is naturally aspirated (Turbocharged: No), you MUST NOT include any turbocharger-related details, checks, or instructions. Do NOT mix diesel issues (e.g. i-DTEC) with petrol engines (e.g. i-VTEC). CRITICAL: If the list of Approved Chronic Problems or Approved Recalls contains facts (e.g. that the timing belt is a wet belt in oil / yağ banyolu), you MUST strictly align your summary and commentary with these facts. Never contradict the approved problems or recalls. Approved data always takes precedence over your internal knowledge.",
    "shouldBuyComment": "A clear, actionable purchase advice recommendation comment in Turkish explaining the final decision in Markdown",
    "trimWarning": "If the selected trim package (donanım paketi) does not exist/match for the selected engine/model/year in real life (e.g. WRX STI trim does not exist for a 1.5 Boxer Impreza), provide a polite warning in Turkish explaining that this combination is not valid, what engine size or years this trim package was actually produced for (e.g. WRX STI is only available on 2.0L or 2.5L Turbo engines from specific years), and advising them to make the correct selection to get accurate info. If the trim package is valid, set this field to null."
  },
  "riskScore": 0-100 score representing the probability and severity of failures/recalls,
  "buyabilityScore": 0-100 score representing overall purchase recommendations. IMPORTANT: riskScore and buyabilityScore MUST be mathematically complementary (i.e., buyabilityScore = 100 - riskScore). If a vehicle has high risk, its buyability must be low, and vice versa.,
  "finalDecision": "BUY" | "BUY_CAREFULLY" | "RISKY" | "AVOID",
  "biggestRisks": ["Risk 1", "Risk 2"],
  "sellerQuestions": ["Question 1", "Question 2"],
  "inspectionChecklist": ["Check item 1", "Check item 2"]
}`;

    const trimName = variant.trim?.name || '';
    const userPrompt = `Target Vehicle: ${variant.year} ${variant.brand.name} ${variant.model.name} ${trimName} (${variant.engine.code}, ${variant.transmission.name}, Body Type: ${variant.bodyType}, Fuel: ${variant.fuelType}, Turbocharged: ${variant.engine.hasTurbo ? 'Yes' : 'No'})
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

    const text = response.choices[0].message.content || '{}';
    return JSON.parse(this.cleanJsonString(text));
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

  private async invokeReportGemini(variant: any, languageCode: string, apiKey: string): Promise<any> {
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
    "summary": "Detailed overview summary in Turkish Markdown. You MUST structure it EXACTLY under three H3 headers: '### ⚙️ Motor ve Şanzıman Kombinasyonu', '### 👍 Avantajları', and '### ⚠️ Dikkat Edilmesi Gerekenler ve Sık Karşılaşılan Durumlar'. Under each header, provide highly technical, specific, bulleted details. Even if the list of approved chronic problems provided is brief or empty, you MUST use your extensive internal automotive knowledge about this specific vehicle variant to populate these sections with rich, precise details (e.g. details about the engine code like N20B20, transmission models like ZF 8HP, timing chain chain stretch, oil pump failures, etc.). Highlight key facts in **bold**. CRITICAL: You must strictly respect the vehicle's engine and fuel specifications. If the vehicle is naturally aspirated (Turbocharged: No), you MUST NOT include any turbocharger-related details, checks, or instructions. Do NOT mix diesel issues (e.g. i-DTEC) with petrol engines (e.g. i-VTEC). CRITICAL: If the list of Approved Chronic Problems or Approved Recalls contains facts (e.g. that the timing belt is a wet belt in oil / yağ banyolu), you MUST strictly align your summary and commentary with these facts. Never contradict the approved problems or recalls. Approved data always takes precedence over your internal knowledge.",
    "shouldBuyComment": "A clear, actionable purchase advice recommendation comment in Turkish explaining the final decision in Markdown",
    "trimWarning": "If the selected trim package (donanım paketi) does not exist/match for the selected engine/model/year in real life (e.g. WRX STI trim does not exist for a 1.5 Boxer Impreza), provide a polite warning in Turkish explaining that this combination is not valid, what engine size or years this trim package was actually produced for (e.g. WRX STI is only available on 2.0L or 2.5L Turbo engines from specific years), and advising them to make the correct selection to get accurate info. If the trim package is valid, set this field to null."
  },
  "riskScore": 0-100 score representing the probability and severity of failures/recalls,
  "buyabilityScore": 0-100 score representing overall purchase recommendations. IMPORTANT: riskScore and buyabilityScore MUST be mathematically complementary (i.e., buyabilityScore = 100 - riskScore). If a vehicle has high risk, its buyability must be low, and vice versa.,
  "finalDecision": "BUY" | "BUY_CAREFULLY" | "RISKY" | "AVOID",
  "biggestRisks": ["Risk 1", "Risk 2"],
  "sellerQuestions": ["Question 1", "Question 2"],
  "inspectionChecklist": ["Check item 1", "Check item 2"]
}`;

    const trimName = variant.trim?.name || '';
    const userPrompt = `Target Vehicle: ${variant.year} ${variant.brand.name} ${variant.model.name} ${trimName} (${variant.engine.code}, ${variant.transmission.name}, Body Type: ${variant.bodyType}, Fuel: ${variant.fuelType}, Turbocharged: ${variant.engine.hasTurbo ? 'Yes' : 'No'})
Language: ${languageCode === 'tr' ? 'Turkish' : 'English'}

Approved Chronic Problems:
${problemsText}

Approved Recalls:
${recallsText}

Approved Checklists:
${checklistText}

Generate the summarized report JSON.`;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'];
    let lastError: Error | null = null;

    for (const modelName of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt + "\n\n" + userPrompt }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini model ${modelName} returned status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        return JSON.parse(this.cleanJsonString(text));
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Gemini model ${modelName} failed inside invokeReportGemini: ${err.message}. Trying next model...`);
      }
    }

    throw lastError || new Error('All Gemini models failed inside invokeReportGemini');
  }

  private cleanJsonString(str: string): string {
    let cleaned = str.trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    let inString = false;
    let escaped = '';
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '"' && (i === 0 || cleaned[i - 1] !== '\\')) {
        inString = !inString;
        escaped += char;
      } else if (inString && char === '\n') {
        escaped += '\\n';
      } else if (inString && char === '\r') {
        escaped += '\\r';
      } else if (inString && char === '\t') {
        escaped += '\\t';
      } else {
        escaped += char;
      }
    }
    return escaped;
  }
}
