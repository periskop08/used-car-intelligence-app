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
    this.geminiModelName = process.env.GEMINI_REPORT_MODEL || 'gemini-1.5-flash';
    this.openaiModelName = process.env.OPENAI_REPORT_MODEL || 'gpt-4o-mini';
  }

  onModuleInit() {
    this.detectActiveProvider();
  }

  private detectActiveProvider() {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      this.activeProvider = 'gemini';
      this.logger.log(`[PROVIDER] Gemini aktif (model: ${this.geminiModelName})`);
    } else if (openaiKey) {
      this.activeProvider = 'openai';
      this.logger.log(`[PROVIDER] OpenAI aktif (model: ${this.openaiModelName})`);
    } else {
      this.activeProvider = 'none';
      this.runtimeHealthStatus = 'DEGRADED';
      this.logger.warn(`[PROVIDER] Hiçbir AI API key tanımlı değil.`);
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
    const baseReport = this.fallbackService.generateFallbackReport(
      reportId,
      'TORQUE_SCOUT_VEHICLE_REPORT',
      vehicleContext,
    );

    const systemPrompt = this.promptService.buildSystemPrompt();
    const userPrompt = this.promptService.buildUserPrompt(vehicleContext);
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    let generatedContent: VehicleReportGeneratedContent | null = null;
    let usedModel = '';
    let usedProvider = '';

    // 1. Try Gemini first
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (geminiKey) {
      try {
        this.logger.log(`[AI-REPORT] Calling Gemini API (model: ${this.geminiModelName})...`);
        const result = await this.callGemini(fullPrompt);
        if (result.content) {
          generatedContent = result.content;
          usedModel = this.geminiModelName;
          usedProvider = 'gemini';
        }
      } catch (geminiErr: any) {
        this.logger.error(`[AI-REPORT] Gemini API error: ${geminiErr?.message}`);
      }
    }

    // 2. Try OpenAI if Gemini failed or key not available
    if (!generatedContent && process.env.OPENAI_API_KEY) {
      try {
        this.logger.log(`[AI-REPORT] Calling OpenAI API (model: ${this.openaiModelName})...`);
        const result = await this.callOpenAI(systemPrompt, userPrompt);
        if (result.content) {
          generatedContent = result.content;
          usedModel = this.openaiModelName;
          usedProvider = 'openai';
        }
      } catch (openaiErr: any) {
        this.logger.error(`[AI-REPORT] OpenAI API error: ${openaiErr?.message}`);
      }
    }

    if (generatedContent) {
      this.logger.log(`[AI-REPORT] Successfully generated AI report content via ${usedProvider} (${usedModel})`);
      baseReport.executiveSummary = generatedContent.executiveSummary as any;
      baseReport.expertDecisionSynthesis = generatedContent.expertDecisionSynthesis as any;
      baseReport.usageScenarios = generatedContent.usageScenarios as any;
      baseReport.sellerQuestions = generatedContent.premiumChecklistQuestions as any;
      baseReport.prePurchaseChecks = generatedContent.inspectionChecklist as any;
      baseReport.finalVerdict = generatedContent.finalConditionalVerdict as any;
      baseReport.status = 'COMPLETED';

      return {
        report: baseReport,
        provider: usedProvider,
        modelName: usedModel,
        qualityScore: 95,
        repairAttempted: false,
      };
    }

    this.logger.warn(`[AI-REPORT] All AI providers failed. Returning deterministic DB fallback.`);
    return {
      report: baseReport,
      provider: 'DETERMINISTIC_FALLBACK',
      modelName: 'TorqueScout DB Engine',
      repairAttempted: false,
      fallbackReason: 'AI API hatası veya key yapılandırması eksik',
    };
  }

  private async callGemini(fullPrompt: string): Promise<{ content: VehicleReportGeneratedContent | null }> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) throw new Error('Gemini API key eksik');

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = Array.from(new Set([
      this.geminiModelName,
      'gemini-1.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
    ]));

    let lastErr: any = null;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
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
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              return { content: JSON.parse(jsonMatch[0]) };
            } catch {}
          }
        }
      } catch (err: any) {
        lastErr = err;
        this.logger.warn(`Gemini model ${modelName} call notice: ${err?.message}. Trying next model...`);
      }
    }

    throw lastErr || new Error('All Gemini model candidates failed');
  }

  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ content: VehicleReportGeneratedContent | null }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key eksik');

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: this.openaiModelName,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
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
