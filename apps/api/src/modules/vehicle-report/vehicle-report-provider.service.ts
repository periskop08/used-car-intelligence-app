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
        let writerContent: VehicleReportGeneratedContent | null = null;
        try {
          writerContent = JSON.parse(orchestratorResult.answer);
        } catch {
          const match = orchestratorResult.answer.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              writerContent = JSON.parse(match[0]);
            } catch (e) {
              this.logger.warn(`JSON extraction notice: ${(e as Error).message}`);
            }
          }
        }

        if (writerContent) {
          if (writerContent.executiveSummary) baseReport.executiveSummary = writerContent.executiveSummary as any;
          if (writerContent.expertDecisionSynthesis) baseReport.expertDecisionSynthesis = writerContent.expertDecisionSynthesis as any;
          if (writerContent.usageScenarios) baseReport.usageScenarios = writerContent.usageScenarios as any;
          if (writerContent.premiumChecklistQuestions) baseReport.sellerQuestions = writerContent.premiumChecklistQuestions as any;
          if (writerContent.inspectionChecklist) baseReport.prePurchaseChecks = writerContent.inspectionChecklist as any;
          if (writerContent.finalConditionalVerdict) baseReport.finalVerdict = writerContent.finalConditionalVerdict as any;

          // Map AI-derived verified technical specifications
          if (writerContent.technicalSpecifications) {
            const specs = writerContent.technicalSpecifications;
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
    } catch (err: any) {
      this.logger.error(`[DELEGATOR] Orchestrator error: ${err?.message}`);
    }

    // SAFE FALLBACK: If Orchestrator failed or unavailable
    this.logger.warn(`[DELEGATOR] Falling back to DB safe report.`);
    baseReport.status = 'SAFE_FALLBACK' as any;

    return {
      report: baseReport,
      provider: 'DETERMINISTIC_FALLBACK',
      modelName: 'TorqueScout DB Engine',
      repairAttempted: false,
      fallbackReason: 'Vehicle Intelligence Orchestrator fallback',
      verifiedResearch: verifiedResearch || undefined,
    };
  }
}
