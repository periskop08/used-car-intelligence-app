import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { VehicleReportPromptService } from './vehicle-report-prompt.service';
import { VehicleReportSemanticValidationService } from './vehicle-report-semantic-validation.service';
import { VehicleReportNarrativeQualityService } from './vehicle-report-narrative-quality.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { ComprehensiveVehicleReport, VehicleReportGeneratedContent } from '@used-car-intelligence/shared';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

type AIProvider = 'gemini' | 'openai' | 'none';

@Injectable()
export class VehicleReportProviderService implements OnModuleInit {
  private readonly logger = new Logger(VehicleReportProviderService.name);
  private geminiModelName: string;
  private openaiModelName: string;
  private activeProvider: AIProvider = 'none';
  private runtimeHealthStatus: 'HEALTHY' | 'DEGRADED' = 'HEALTHY';

  constructor(
    private promptService: VehicleReportPromptService,
    private semanticValidation: VehicleReportSemanticValidationService,
    private narrativeQualityService: VehicleReportNarrativeQualityService,
    private fallbackService: VehicleReportFallbackService,
  ) {
    this.geminiModelName = process.env.GEMINI_REPORT_MODEL || 'gemini-2.5-flash';
    this.openaiModelName = process.env.OPENAI_REPORT_MODEL || 'gpt-4o';
  }

  onModuleInit() {
    this.detectActiveProvider();
  }

  private detectActiveProvider() {
    const preferredProvider = (process.env.VEHICLE_REPORT_PRIMARY_PROVIDER || 'gemini').toLowerCase() as AIProvider;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Try preferred provider first
    if (preferredProvider === 'openai' && openaiKey) {
      this.activeProvider = 'openai';
      this.logger.log(`[PROVIDER] OpenAI aktif (model: ${this.openaiModelName}) — tercih: ${preferredProvider}`);
    } else if (preferredProvider === 'gemini' && geminiKey) {
      this.activeProvider = 'gemini';
      this.logger.log(`[PROVIDER] Gemini aktif (model: ${this.geminiModelName}) — tercih: ${preferredProvider}`);
    } else if (geminiKey) {
      // Fallback to gemini if available
      this.activeProvider = 'gemini';
      this.logger.log(`[PROVIDER] Gemini aktif (fallback — tercih "${preferredProvider}" için key bulunamadı)`);
    } else if (openaiKey) {
      // Fallback to openai if available
      this.activeProvider = 'openai';
      this.logger.log(`[PROVIDER] OpenAI aktif (fallback — tercih "${preferredProvider}" için key bulunamadı)`);
    } else {
      this.activeProvider = 'none';
      this.runtimeHealthStatus = 'DEGRADED';
      this.logger.warn(`[PROVIDER] Hiçbir AI API key tanımlı değil. Deterministik fallback aktif.`);
    }
  }

  getRuntimeHealthStatus(): 'HEALTHY' | 'DEGRADED' {
    return this.runtimeHealthStatus;
  }

  getActiveProvider(): AIProvider {
    return this.activeProvider;
  }

  async generateReport(
    reportId: string,
    vehicleContext: any,
  ): Promise<{
    report: ComprehensiveVehicleReport;
    provider: string;
    modelName: string;
    qualityScore?: number;
    repairAttempted: boolean;
    fallbackReason?: string;
  }> {
    // 1. Generate base deterministic report structure
    const baseReport = this.fallbackService.generateFallbackReport(
      reportId,
      'TORQUE_SCOUT_VEHICLE_REPORT',
      vehicleContext,
    );

    if (this.activeProvider === 'none') {
      return {
        report: baseReport,
        provider: 'DETERMINISTIC_FALLBACK',
        modelName: 'TorqueScout DB Engine',
        repairAttempted: false,
        fallbackReason: 'AI API key yapılandırılmamış, deterministik veritabanı raporu sunuldu',
      };
    }

    try {
      const systemPrompt = this.promptService.buildSystemPrompt();
      const userPrompt = this.promptService.buildUserPrompt(vehicleContext);
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      let generatedContent: VehicleReportGeneratedContent | null = null;
      let usedModel = '';

      if (this.activeProvider === 'gemini') {
        const result = await this.callGemini(fullPrompt);
        generatedContent = result.content;
        usedModel = this.geminiModelName;
      } else if (this.activeProvider === 'openai') {
        const result = await this.callOpenAI(systemPrompt, userPrompt);
        generatedContent = result.content;
        usedModel = this.openaiModelName;
      }

      if (generatedContent) {
        const brandName = vehicleContext?.vehicleIdentity?.brand;
        const modelName = vehicleContext?.vehicleIdentity?.model;
        let qualityResult = this.narrativeQualityService.validateReportNarrativeQuality(
          generatedContent,
          brandName,
          modelName,
        );

        let repairAttempted = false;

        // Attempt 1 repair call if quality is below threshold
        if (!qualityResult.passed) {
          this.logger.warn(
            `Report ${reportId} quality score ${qualityResult.totalScore}/100 below 75. Reasons: ${qualityResult.rejectionReasons.join(', ')}. Triggering repair.`,
          );
          repairAttempted = true;
          try {
            const repairSystemPrompt = `${systemPrompt}\n\nÖNCEKİ ÜRETİM SORUNLARI:\n${qualityResult.rejectionReasons.map(r => `- ${r}`).join('\n')}\n\nBu sorunları düzelterek aynı araç için kurallara tam uyarak yeni VehicleReportGeneratedContent JSON üretin.`;

            let repairedContent: VehicleReportGeneratedContent | null = null;
            if (this.activeProvider === 'gemini') {
              const repairResult = await this.callGemini(`${repairSystemPrompt}\n\n${userPrompt}`);
              repairedContent = repairResult.content;
            } else if (this.activeProvider === 'openai') {
              const repairResult = await this.callOpenAI(repairSystemPrompt, userPrompt);
              repairedContent = repairResult.content;
            }

            if (repairedContent) {
              generatedContent = repairedContent;
              qualityResult = this.narrativeQualityService.validateReportNarrativeQuality(
                repairedContent,
                brandName,
                modelName,
              );
            }
          } catch (repairErr) {
            this.logger.warn(`Repair attempt failed: ${repairErr}`);
          }
        }

        // Assemble final report with narrative content merged into base report
        baseReport.generatedContent = generatedContent;
        if (generatedContent.expertDecisionSynthesis) {
          baseReport.expertDecisionSynthesis = generatedContent.expertDecisionSynthesis;
        }
        if (generatedContent.executiveSummary) {
          baseReport.executiveSummary = generatedContent.executiveSummary;
        }
        if (generatedContent.usageScenarios) {
          baseReport.usageScenarios = generatedContent.usageScenarios;
        }
        if (generatedContent.premiumChecklistQuestions) {
          baseReport.sellerQuestions = generatedContent.premiumChecklistQuestions;
        }
        if (generatedContent.inspectionChecklist) {
          baseReport.prePurchaseChecks = generatedContent.inspectionChecklist;
        }
        if (generatedContent.finalConditionalVerdict) {
          baseReport.finalVerdict = generatedContent.finalConditionalVerdict;
        }

        baseReport.status = 'COMPLETED';
        baseReport.qualityScore = qualityResult.totalScore;
        baseReport.repairAttempted = repairAttempted;

        return {
          report: baseReport,
          provider: this.activeProvider,
          modelName: usedModel,
          qualityScore: qualityResult.totalScore,
          repairAttempted,
        };
      }

      return {
        report: baseReport,
        provider: 'DETERMINISTIC_FALLBACK',
        modelName: 'TorqueScout DB Engine',
        repairAttempted: false,
        fallbackReason: 'AI çıktısı parse edilemedi, deterministik rapor sunuldu',
      };
    } catch (err: any) {
      this.logger.error(`AI Generation error: ${err?.message}. Executing deterministic fallback.`);
      this.runtimeHealthStatus = 'DEGRADED';
      return {
        report: baseReport,
        provider: 'DETERMINISTIC_FALLBACK',
        modelName: 'TorqueScout DB Engine',
        repairAttempted: false,
        fallbackReason: err?.message || 'AI API hatası',
      };
    }
  }

  private async callGemini(fullPrompt: string): Promise<{ content: VehicleReportGeneratedContent | null }> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) throw new Error('Gemini API key eksik');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: this.geminiModelName,
      generationConfig: {
        temperature: 0.3,
        topP: 0.85,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    });

    const responseText = result.response.text();
    try {
      return { content: JSON.parse(responseText) };
    } catch {
      this.logger.warn(`Gemini JSON parse failed, trying to extract JSON...`);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return { content: JSON.parse(jsonMatch[0]) };
        } catch {
          return { content: null };
        }
      }
      return { content: null };
    }
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<{ content: VehicleReportGeneratedContent | null }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key eksik');

    const openai = new OpenAI({ apiKey });

    // Explicitly instruct OpenAI NOT to wrap the output
    const strictUserPrompt = `${userPrompt}\n\nÖNEMLİ: Yanıtın doğrudan expertDecisionSynthesis, executiveSummary, usageScenarios, premiumChecklistQuestions, inspectionChecklist ve finalConditionalVerdict alanlarını içeren düz JSON olmalıdır. Hiçbir wrapper key (örn. "VehicleReportGeneratedContent") kullanma.`;

    const response = await openai.chat.completions.create({
      model: this.openaiModelName,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: strictUserPrompt },
      ],
    });

    const responseText = response.choices[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(responseText);
      // Unwrap if OpenAI nested the output in a key
      if (parsed && typeof parsed === 'object') {
        // Direct match: has expertDecisionSynthesis or executiveSummary at root
        if (parsed.expertDecisionSynthesis || parsed.executiveSummary) {
          return { content: parsed as VehicleReportGeneratedContent };
        }
        // Wrapped: {"VehicleReportGeneratedContent": {...}} or any single top-level key
        const keys = Object.keys(parsed);
        if (keys.length === 1) {
          const inner = parsed[keys[0]];
          if (inner && typeof inner === 'object' && (inner.expertDecisionSynthesis || inner.executiveSummary)) {
            return { content: inner as VehicleReportGeneratedContent };
          }
        }
        // Try to find expertDecisionSynthesis in any nested key
        for (const key of keys) {
          const val = parsed[key];
          if (val && typeof val === 'object' && (val.expertDecisionSynthesis || val.executiveSummary)) {
            return { content: val as VehicleReportGeneratedContent };
          }
        }
      }
      return { content: parsed as VehicleReportGeneratedContent };
    } catch {
      this.logger.warn(`OpenAI JSON parse failed`);
      return { content: null };
    }
  }
}
