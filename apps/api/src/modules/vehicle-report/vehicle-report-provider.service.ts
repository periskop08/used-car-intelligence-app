import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { VehicleReportPromptService } from './vehicle-report-prompt.service';
import { VehicleReportSemanticValidationService } from './vehicle-report-semantic-validation.service';
import { VehicleReportNarrativeQualityService } from './vehicle-report-narrative-quality.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { ComprehensiveVehicleReport, VehicleReportGeneratedContent } from '@used-car-intelligence/shared';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class VehicleReportProviderService implements OnModuleInit {
  private readonly logger = new Logger(VehicleReportProviderService.name);
  private modelName: string;
  private runtimeHealthStatus: 'HEALTHY' | 'DEGRADED' = 'HEALTHY';

  constructor(
    private promptService: VehicleReportPromptService,
    private semanticValidation: VehicleReportSemanticValidationService,
    private narrativeQualityService: VehicleReportNarrativeQualityService,
    private fallbackService: VehicleReportFallbackService,
  ) {
    this.modelName = process.env.GEMINI_REPORT_MODEL || 'gemini-2.5-pro';
  }

  onModuleInit() {
    this.validateGeminiConfig();
  }

  private validateGeminiConfig() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      this.logger.warn(`[GEMINI CONFIG] GEMINI_API_KEY ortam değişkeni tanımlı değil. Rapor üretiminde deterministik altyapı kullanılacaktır.`);
      this.runtimeHealthStatus = 'DEGRADED';
      return;
    }
    this.logger.log(`[GEMINI CONFIG] Model '${this.modelName}' kilitlendi ve Gemini 2.5 adaptörü aktif.`);
  }

  getRuntimeHealthStatus(): 'HEALTHY' | 'DEGRADED' {
    return this.runtimeHealthStatus;
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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      return {
        report: baseReport,
        provider: 'DETERMINISTIC_FALLBACK',
        modelName: 'TorqueScout DB Engine',
        repairAttempted: false,
        fallbackReason: 'AI API key unconfigured, served deterministic DB evidence report',
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.25,
          topP: 0.85,
          responseMimeType: 'application/json',
        },
      });

      const systemPrompt = this.promptService.buildSystemPrompt();
      const userPrompt = this.promptService.buildUserPrompt(vehicleContext);

      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
        ],
      });

      const responseText = result.response.text();
      let generatedContent: VehicleReportGeneratedContent | null = null;
      try {
        generatedContent = JSON.parse(responseText);
      } catch (parseErr) {
        this.logger.warn(`Gemini 2.5 JSON parse notice for report ${reportId}: ${parseErr}`);
      }

      if (generatedContent) {
        // Validate Narrative Quality (0-100 score, 75 threshold)
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
            `Report ${reportId} quality score ${qualityResult.totalScore}/100 is below 75 threshold. Reasons: ${qualityResult.rejectionReasons.join(', ')}. Triggering repair attempt 1.`,
          );
          repairAttempted = true;
          try {
            const repairPrompt = `${systemPrompt}\n\nÖNCİKİ ÜRETİM UYARI ALDI:\n${qualityResult.rejectionReasons.join('\n')}\n\nLütfen kurallara tam uyarak düzeltilmiş VehicleReportGeneratedContent JSON yapısını üretin.`;
            const repairResult = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: `${repairPrompt}\n\n${userPrompt}` }] }],
            });
            const repairedText = repairResult.response.text();
            const repairedJson = JSON.parse(repairedText);
            if (repairedJson) {
              generatedContent = repairedJson;
              qualityResult = this.narrativeQualityService.validateReportNarrativeQuality(
                repairedJson,
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
          provider: 'gemini',
          modelName: this.modelName,
          qualityScore: qualityResult.totalScore,
          repairAttempted,
        };
      }

      return {
        report: baseReport,
        provider: 'DETERMINISTIC_FALLBACK',
        modelName: 'TorqueScout DB Engine',
        repairAttempted: false,
        fallbackReason: 'AI output parse failed, served deterministic fallback',
      };
    } catch (err: any) {
      this.logger.error(`AI Generation error: ${err?.message}. Executing deterministic fallback.`);
      this.runtimeHealthStatus = 'DEGRADED';
      return {
        report: baseReport,
        provider: 'DETERMINISTIC_FALLBACK',
        modelName: 'TorqueScout DB Engine',
        repairAttempted: false,
        fallbackReason: err?.message || 'Gemini 2.5 API error',
      };
    }
  }
}
