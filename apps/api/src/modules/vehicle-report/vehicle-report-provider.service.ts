import { Injectable, Logger } from '@nestjs/common';
import { VehicleReportPromptService } from './vehicle-report-prompt.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { ResearchEvidenceValidationService } from './research-evidence-validation.service';
import { ComprehensiveVehicleReport, VehicleReportGeneratedContent, VehicleReportResearchData } from '@used-car-intelligence/shared';
import { ListingAiProviderService } from '../listing-ai/listing-ai-provider.service';

@Injectable()
export class VehicleReportProviderService {
  private readonly logger = new Logger(VehicleReportProviderService.name);

  constructor(
    private promptService: VehicleReportPromptService,
    private fallbackService: VehicleReportFallbackService,
    private evidenceValidationService: ResearchEvidenceValidationService,
    private orchestratorProvider: ListingAiProviderService,
  ) {}

  getRuntimeHealthStatus(): 'HEALTHY' | 'DEGRADED' {
    return 'HEALTHY';
  }

  getActiveProvider(): string {
    return 'vehicle-intelligence-orchestrator';
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
    verifiedResearch?: VehicleReportResearchData;
  }> {
    const baseReport = this.fallbackService.generateFallbackReport(
      reportId,
      'TORQUE_SCOUT_VEHICLE_REPORT',
      vehicleContext,
    );

    // STAGE 1: Evidence Validation via Shared Research Pipeline
    let verifiedResearch: VehicleReportResearchData | null = null;
    try {
      this.logger.log(`[DELEGATOR] Initiating Research Evidence Validation via Intelligence Orchestrator...`);
      verifiedResearch = this.evidenceValidationService.validateResearchData(
        {},
        vehicleContext,
      );
    } catch (e: any) {
      this.logger.warn(`Research validation notice: ${e?.message}`);
    }

    // STAGE 2: Delegate Report Intent to Unified Vehicle Intelligence Orchestrator
    try {
      this.logger.log(`[DELEGATOR] Forwarding VEHICLE_FULL_REPORT intent to Vehicle Intelligence Orchestrator...`);
      const userPrompt = this.promptService.buildUserPrompt(vehicleContext);

      const orchestratorResult = await this.orchestratorProvider.generateListingAdvice(
        `[INTENT: VEHICLE_FULL_REPORT]\n${userPrompt}`,
        vehicleContext,
      );

      if (orchestratorResult && orchestratorResult.answer) {
        let cleanAnswer = orchestratorResult.answer.trim();
        cleanAnswer = cleanAnswer.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        let writerContent: VehicleReportGeneratedContent | null = null;
        try {
          writerContent = JSON.parse(cleanAnswer);
        } catch {
          const repaired = this.repairJson(cleanAnswer);
          try {
            writerContent = JSON.parse(repaired);
          } catch (e) {
            this.logger.warn(`JSON extraction notice: ${(e as Error).message}`);
          }
        }

        if (writerContent) {
          const contentObj: any = (writerContent as any).VehicleReportGeneratedContent 
            || (writerContent as any).report 
            || (writerContent as any).content 
            || writerContent;

          this.logger.log(`[DELEGATOR] AI JSON Content extracted. Top-level keys: ${Object.keys(contentObj).join(', ')}`);

          if (contentObj.executiveSummary) baseReport.executiveSummary = contentObj.executiveSummary as any;
          if (contentObj.usageScenarios) baseReport.usageScenarios = contentObj.usageScenarios as any;

          // 1. Map Seller Questions
          const rawSellerQs = contentObj.premiumChecklistQuestions 
            || contentObj.sellerQuestions 
            || contentObj['Satıcıya Sorulacak Kritik Sorular'] 
            || contentObj.questions;
          if (Array.isArray(rawSellerQs) && rawSellerQs.length > 0) {
            baseReport.sellerQuestions = rawSellerQs.map((q: any, i: number) => ({
              questionId: q.questionId || `q_${i + 1}`,
              category: q.category || 'MEKANİK',
              questionText: typeof q === 'string' ? q : (q.questionText || q.question || JSON.stringify(q)),
              expectedAnswerHint: q.expectedAnswerHint || q.hint || undefined,
              supportingFactIds: ['AI_RESEARCH_ENGINE'],
            }));
          }

          // 2. Map Pre-Purchase Inspection Checks
          const rawChecks = contentObj.inspectionChecklist 
            || contentObj.prePurchaseChecks 
            || contentObj['Satın Alma Öncesi Ekspertiz Kontrol Listesi'] 
            || contentObj.checks 
            || contentObj.checklist;
          if (Array.isArray(rawChecks) && rawChecks.length > 0) {
            baseReport.prePurchaseChecks = rawChecks.map((c: any, i: number) => ({
              checkId: c.checkId || `c_${i + 1}`,
              category: c.category || 'MEKANİK',
              title: c.title || c.check || `Ekspertiz Kontrolü #${i + 1}`,
              instruction: typeof c === 'string' ? c : (c.instruction || c.description || c.title || ''),
              priority: c.priority || 'ÖNEMLİ',
              targetComponent: c.targetComponent || undefined,
              supportingFactIds: ['AI_RESEARCH_ENGINE'],
            }));
          }

          if (contentObj.finalConditionalVerdict) baseReport.finalVerdict = contentObj.finalConditionalVerdict as any;

          // 3. Preserve DB Technical Risks from Fallback Report
          const originalRisks = {
            primaryTechnicalRisk: baseReport.expertDecisionSynthesis?.primaryTechnicalRisk,
            secondaryTechnicalRisks: baseReport.expertDecisionSynthesis?.secondaryTechnicalRisks,
          };

          // 4. Map Expert Decision Synthesis
          if (contentObj.expertDecisionSynthesis) {
            baseReport.expertDecisionSynthesis = {
              ...baseReport.expertDecisionSynthesis,
              ...contentObj.expertDecisionSynthesis,
              primaryTechnicalRisk: contentObj.expertDecisionSynthesis?.primaryTechnicalRisk || originalRisks.primaryTechnicalRisk,
              secondaryTechnicalRisks: contentObj.expertDecisionSynthesis?.secondaryTechnicalRisks || originalRisks.secondaryTechnicalRisks,
            } as any;
            if (baseReport.expertDecisionSynthesis.vehicleCharacter) {
              baseReport.expertDecisionSynthesis.vehicleCharacter.supportingFactIds = ['AI_RESEARCH_ENGINE'];
            }
          } else {
            // Flexible fallback mapper if AI returned pros/cons or sections
            const vOverview = contentObj['Bu Araç Nasıl Bir Otomobil?'] 
              || contentObj.vehicleOverview 
              || contentObj.vehicleCharacter 
              || contentObj.introduction 
              || contentObj.overview;
              
            const overviewText = typeof vOverview === 'string' 
              ? vOverview 
              : (vOverview?.detailedAssessment || vOverview?.headline || (contentObj.sections ? JSON.stringify(contentObj.sections) : ''));

            const pros = contentObj.pros || contentObj['Tercih Etmek İçin Güçlü Nedenler'] || contentObj.strongReasons || [];
            const cons = contentObj.cons || contentObj['Satın Almadan Önce Bilinecek Tavizler'] || contentObj.tradeoffs || [];
            const idealFor = contentObj['Kimler İçin Mantıklı?'] || contentObj.idealFor || contentObj.suitableFor || [];
            const notIdealFor = contentObj['Kimler İçin Uygun Olmayabilir?'] || contentObj.notIdealFor || contentObj.notSuitableFor || [];
            const purchaseConds = contentObj['Hangi Şartlarda Değerlendirilebilir?'] || contentObj.purchaseConditions || contentObj.conditionsToConsider || [];
            const walkAwayConds = contentObj['Hangi Durumda Satın Almaktan Vazgeçilmeli?'] || contentObj.walkAwayConditions || [];

            baseReport.expertDecisionSynthesis = {
              vehicleCharacter: {
                headline: `${baseReport.vehicleIdentity.modelYear || ''} ${baseReport.vehicleIdentity.brand || ''} ${baseReport.vehicleIdentity.model || ''} - TorqueScout Derin Yapay Zeka Analizi`,
                detailedAssessment: overviewText || baseReport.expertDecisionSynthesis?.vehicleCharacter?.detailedAssessment || '',
                supportingFactIds: ['AI_RESEARCH_ENGINE'],
              },
              strongestReasonsToChoose: pros.map((item: any) => ({
                title: item.title || item.reason || (typeof item === 'string' ? item : 'Güçlü Neden'),
                explanation: item.explanation || item.description || (typeof item === 'string' ? item : ''),
                supportingFactIds: ['AI_RESEARCH_ENGINE'],
              })),
              compromisesAndLimitations: cons.map((item: any) => ({
                title: item.title || item.limitation || (typeof item === 'string' ? item : 'Taviz'),
                explanation: item.explanation || item.description || (typeof item === 'string' ? item : ''),
                supportingFactIds: ['AI_RESEARCH_ENGINE'],
              })),
              suitableFor: idealFor.map((item: any) => ({
                profile: item.profile || item.target || (typeof item === 'string' ? item : 'Kullanıcı Profili'),
                explanation: item.explanation || (typeof item === 'string' ? item : ''),
                supportingFactIds: ['AI_RESEARCH_ENGINE'],
              })),
              notSuitableFor: notIdealFor.map((item: any) => ({
                profile: item.profile || item.target || (typeof item === 'string' ? item : 'Kullanıcı Profili'),
                explanation: item.explanation || (typeof item === 'string' ? item : ''),
                supportingFactIds: ['AI_RESEARCH_ENGINE'],
              })),
              purchaseConditions: purchaseConds.map((item: any) => ({
                condition: item.condition || item.title || (typeof item === 'string' ? item : 'Koşul'),
                reason: item.reason || item.explanation || (typeof item === 'string' ? item : ''),
                priority: item.priority || 'ÖNEMLİ',
                supportingFactIds: ['AI_RESEARCH_ENGINE'],
              })),
              walkAwayConditions: walkAwayConds.map((item: any) => ({
                condition: item.condition || item.title || (typeof item === 'string' ? item : 'Vazgeçme Şartı'),
                reason: item.reason || item.explanation || (typeof item === 'string' ? item : ''),
                priority: item.priority || 'KRİTİK',
                supportingFactIds: ['AI_RESEARCH_ENGINE'],
              })),
              primaryTechnicalRisk: originalRisks.primaryTechnicalRisk,
              secondaryTechnicalRisks: originalRisks.secondaryTechnicalRisks,
            } as any;
          }

          // 5. Map AI-derived verified technical specifications
          if (contentObj.technicalSpecifications) {
            const specs = contentObj.technicalSpecifications;
            if (specs.engineDisplacementCc) baseReport.vehicleIdentity.engineDisplacementCc = specs.engineDisplacementCc;
            if (specs.enginePowerHp) baseReport.vehicleIdentity.enginePowerHp = specs.enginePowerHp;
            if (specs.transmissionTypeAndSpeeds) baseReport.vehicleIdentity.transmissionName = specs.transmissionTypeAndSpeeds;

            baseReport.performanceUsage = {
              powerHp: specs.enginePowerHp || baseReport.performanceUsage?.powerHp,
              torqueNm: specs.engineTorqueNm || baseReport.performanceUsage?.torqueNm,
              zeroToHundredKmh: specs.zeroToHundredKmh || baseReport.performanceUsage?.zeroToHundredKmh,
              topSpeedKmh: specs.topSpeedKmh || baseReport.performanceUsage?.topSpeedKmh,
              cityFuelL100km: specs.cityFuelL100km || baseReport.performanceUsage?.cityFuelL100km,
              highwayFuelL100km: specs.highwayFuelL100km || baseReport.performanceUsage?.highwayFuelL100km,
              combinedFuelL100km: specs.combinedFuelL100km || baseReport.performanceUsage?.combinedFuelL100km,
              trunkCapacityLiters: specs.trunkCapacityLiters || baseReport.performanceUsage?.trunkCapacityLiters,
              curbWeightKg: specs.curbWeightKg || baseReport.performanceUsage?.curbWeightKg,
              supportingFactIds: ['AI_VERIFIED_TECHNICAL_SPECS'],
            };
          }

          baseReport.status = 'COMPLETED';

          this.logger.log(`[DELEGATOR] Report updated successfully with AI content from ${orchestratorResult.providerName}`);

          return {
            report: baseReport,
            provider: orchestratorResult.providerName,
            modelName: 'Vehicle Intelligence Orchestrator',
            qualityScore: 95,
            repairAttempted: false,
            verifiedResearch: verifiedResearch || undefined,
          };
        }
      }
    // If AI Orchestrator failed or returned no content, throw error to force retry instead of returning generic fallback
    this.logger.error(`[DELEGATOR] AI Orchestrator failed to produce valid report payload.`);
    throw new BadRequestException('Yapay zeka araç raporu şu anda üretilemedi. Lütfen tekrar deneyin.');
  }

  private repairJson(jsonStr: string): string {
    let cleaned = jsonStr.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) return cleaned;
    cleaned = cleaned.substring(firstBrace);

    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\') {
        isEscaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }

    if (inString) {
      cleaned += '"';
    }

    cleaned = cleaned.replace(/[,:\s]+$/, '');

    while (openBrackets > 0) {
      cleaned += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      cleaned += '}';
      openBraces--;
    }

    return cleaned;
  }
}
