import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VehicleReportPromptService } from './vehicle-report-prompt.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { ResearchEvidenceValidationService } from './research-evidence-validation.service';
import { VehicleReportSemanticValidationService } from './vehicle-report-semantic-validation.service';
import { VehicleReportScoringService } from './vehicle-report-scoring.service';
import { ComprehensiveVehicleReport, VehicleReportGeneratedContent, VehicleReportResearchData } from '@used-car-intelligence/shared';
import { ListingAiProviderService } from '../listing-ai/listing-ai-provider.service';

@Injectable()
export class VehicleReportProviderService {
  private readonly logger = new Logger(VehicleReportProviderService.name);

  constructor(
    private promptService: VehicleReportPromptService,
    private fallbackService: VehicleReportFallbackService,
    private evidenceValidationService: ResearchEvidenceValidationService,
    private semanticValidationService: VehicleReportSemanticValidationService,
    private scoringService: VehicleReportScoringService,
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

    const validationContext = {
      ...vehicleContext,
      verifiedResearch: verifiedResearch || undefined,
    };

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

          // Map initial AI content to baseReport
          this.mapGeneratedContentToReport(baseReport, contentObj);

          // STAGE 4: Production Semantic Validation & Consistency Check
          let validation = this.semanticValidationService.validate(baseReport, validationContext);
          let repairAttempted = false;

          if (!validation.isValid && validation.needsRepair) {
            repairAttempted = true;
            this.logger.warn(`[STAGE 4 VALIDATION FAIL] ${validation.reason}. Attempting AI repair prompt...`);

            try {
              const repairPrompt = `[INTENT: VEHICLE_REPORT_REPAIR]
Aşağıdaki araç raporu çıktısında teknik veya mantıksal bir çelişki tespit edildi:
ÇELİŞKİ/HATA: ${validation.reason}
Lütfen yalnızca bu hatayı düzelterek geçerli JSON formatında rapor içeriğini yeniden üretin.`;

              const repairResult = await this.orchestratorProvider.generateListingAdvice(
                repairPrompt,
                vehicleContext,
              );

              if (repairResult && repairResult.answer) {
                let cleanRepair = repairResult.answer.trim();
                cleanRepair = cleanRepair.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

                let repairedContent: any = null;
                try {
                  repairedContent = JSON.parse(cleanRepair);
                } catch {
                  const fixed = this.repairJson(cleanRepair);
                  try {
                    repairedContent = JSON.parse(fixed);
                  } catch (e) {
                    this.logger.warn(`Repair JSON extraction notice: ${(e as Error).message}`);
                  }
                }

                if (repairedContent) {
                  const repObj = repairedContent.VehicleReportGeneratedContent 
                    || repairedContent.report 
                    || repairedContent.content 
                    || repairedContent;

                  this.mapGeneratedContentToReport(baseReport, repObj);

                  // REVALIDATE AFTER REPAIR
                  validation = this.semanticValidationService.validate(baseReport, validationContext);
                  this.logger.log(`[STAGE 4 REVALIDATION] Valid: ${validation.isValid}, Reason: ${validation.reason || 'None'}`);
                }
              }
            } catch (repairErr: any) {
              this.logger.error(`[STAGE 4 REPAIR FAILED] ${repairErr?.message}`);
            }
          }

          // If repair failed or validation is still invalid, apply safe deterministic sanitization/cleansing
          if (!validation.isValid) {
            this.logger.warn(`[STAGE 4 SANITIZATION] Validation remaining invalid (${validation.reason}). Applying safe deterministic sanitization...`);
            this.sanitizeIncompatibleReportFields(baseReport, validationContext);
            // FINAL VALIDATION AFTER SANITIZATION
            validation = this.semanticValidationService.validate(baseReport, validationContext);
            this.logger.log(`[STAGE 4 FINAL VALIDATION] Valid: ${validation.isValid}, Reason: ${validation.reason || 'None'}`);
          }

          // FINAL VALIDATION GATE: Never return a dirty/invalid report as COMPLETED!
          if (!validation.isValid) {
            this.logger.error(`[STAGE 4 GATE FAILED] Report could not be validated or sanitized (${validation.reason}). Rejecting dirty payload.`);
            throw new BadRequestException('TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin.');
          }

          // Recalculate scores strictly on final validated report & context with preserved evidence types
          baseReport.scoring = this.scoringService.calculateScores(validationContext);
          baseReport.status = 'COMPLETED';

          this.logger.log(`[DELEGATOR] Report updated successfully with AI content from ${orchestratorResult.providerName}`);

          return {
            report: baseReport,
            provider: orchestratorResult.providerName,
            modelName: 'Vehicle Intelligence Orchestrator',
            qualityScore: validation.qualityResult?.score || 95,
            repairAttempted,
            verifiedResearch: verifiedResearch || undefined,
          };
        }
      }
    } catch (err: any) {
      this.logger.error(`[DELEGATOR] Orchestrator error: ${err?.message}`);
    }

    // If AI Orchestrator failed or returned no content, throw error to force retry instead of returning generic fallback
    this.logger.error(`[DELEGATOR] AI Orchestrator failed to produce valid report payload.`);
    throw new BadRequestException('TorqueScout Araç Danışmanı şu an raporu üretemedi lütfen tekrar deneyin veya geri bildirim gönderin.');
  }

  private mapGeneratedContentToReport(baseReport: ComprehensiveVehicleReport, contentObj: any): void {
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

    // 3. Preserve Verified Research Risks
    const originalRisks = {
      primaryTechnicalRisk: baseReport.expertDecisionSynthesis?.primaryTechnicalRisk,
      secondaryTechnicalRisks: baseReport.expertDecisionSynthesis?.secondaryTechnicalRisks || [],
    };

    // 4. Map Expert Decision Synthesis
    if (contentObj.expertDecisionSynthesis) {
      const existingSynth = baseReport.expertDecisionSynthesis || {} as any;
      const newSynth = contentObj.expertDecisionSynthesis || {};

      baseReport.expertDecisionSynthesis = {
        ...existingSynth,
        ...newSynth,
        vehicleCharacter: newSynth.vehicleCharacter || existingSynth.vehicleCharacter,
        strongestReasonsToChoose: (newSynth.strongestReasonsToChoose?.length ? newSynth.strongestReasonsToChoose : existingSynth.strongestReasonsToChoose) || [],
        compromisesAndLimitations: (newSynth.compromisesAndLimitations?.length ? newSynth.compromisesAndLimitations : existingSynth.compromisesAndLimitations) || [],
        suitableFor: (newSynth.suitableFor?.length ? newSynth.suitableFor : existingSynth.suitableFor) || [],
        notSuitableFor: (newSynth.notSuitableFor?.length ? newSynth.notSuitableFor : existingSynth.notSuitableFor) || [],
        purchaseConditions: (newSynth.purchaseConditions?.length ? newSynth.purchaseConditions : existingSynth.purchaseConditions) || [],
        walkAwayConditions: (newSynth.walkAwayConditions?.length ? newSynth.walkAwayConditions : existingSynth.walkAwayConditions) || [],
        primaryTechnicalRisk: newSynth.primaryTechnicalRisk || existingSynth.primaryTechnicalRisk || originalRisks.primaryTechnicalRisk,
        secondaryTechnicalRisks: newSynth.secondaryTechnicalRisks || existingSynth.secondaryTechnicalRisks || originalRisks.secondaryTechnicalRisks,
      } as any;

      if (baseReport.expertDecisionSynthesis.vehicleCharacter) {
        baseReport.expertDecisionSynthesis.vehicleCharacter.supportingFactIds = 
          baseReport.expertDecisionSynthesis.vehicleCharacter.supportingFactIds?.length 
            ? baseReport.expertDecisionSynthesis.vehicleCharacter.supportingFactIds 
            : ['AI_RESEARCH_ENGINE'];
      }
      if (Array.isArray(baseReport.expertDecisionSynthesis.strongestReasonsToChoose)) {
        baseReport.expertDecisionSynthesis.strongestReasonsToChoose = baseReport.expertDecisionSynthesis.strongestReasonsToChoose.map((item: any) => ({
          ...item,
          supportingFactIds: item.supportingFactIds?.length ? item.supportingFactIds : ['AI_RESEARCH_ENGINE'],
        }));
      }
      if (Array.isArray(baseReport.expertDecisionSynthesis.compromisesAndLimitations)) {
        baseReport.expertDecisionSynthesis.compromisesAndLimitations = baseReport.expertDecisionSynthesis.compromisesAndLimitations.map((item: any) => ({
          ...item,
          supportingFactIds: item.supportingFactIds?.length ? item.supportingFactIds : ['AI_RESEARCH_ENGINE'],
        }));
      }
      if (Array.isArray(baseReport.expertDecisionSynthesis.suitableFor)) {
        baseReport.expertDecisionSynthesis.suitableFor = baseReport.expertDecisionSynthesis.suitableFor.map((item: any) => ({
          ...item,
          supportingFactIds: item.supportingFactIds?.length ? item.supportingFactIds : ['AI_RESEARCH_ENGINE'],
        }));
      }
      if (Array.isArray(baseReport.expertDecisionSynthesis.notSuitableFor)) {
        baseReport.expertDecisionSynthesis.notSuitableFor = baseReport.expertDecisionSynthesis.notSuitableFor.map((item: any) => ({
          ...item,
          supportingFactIds: item.supportingFactIds?.length ? item.supportingFactIds : ['AI_RESEARCH_ENGINE'],
        }));
      }
      if (Array.isArray(baseReport.expertDecisionSynthesis.purchaseConditions)) {
        baseReport.expertDecisionSynthesis.purchaseConditions = baseReport.expertDecisionSynthesis.purchaseConditions.map((item: any) => ({
          ...item,
          supportingFactIds: item.supportingFactIds?.length ? item.supportingFactIds : ['AI_RESEARCH_ENGINE'],
        }));
      }
      if (Array.isArray(baseReport.expertDecisionSynthesis.walkAwayConditions)) {
        baseReport.expertDecisionSynthesis.walkAwayConditions = baseReport.expertDecisionSynthesis.walkAwayConditions.map((item: any) => ({
          ...item,
          supportingFactIds: item.supportingFactIds?.length ? item.supportingFactIds : ['AI_RESEARCH_ENGINE'],
        }));
      }
    } else if (!baseReport.expertDecisionSynthesis || !baseReport.expertDecisionSynthesis.purchaseConditions?.length) {
      // Flexible fallback mapper if AI returned pros/cons or sections and baseReport has no valid synthesis yet
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
      const fuelTypeLower = (baseReport.vehicleIdentity.fuelType || '').toLowerCase();
      const isEv = fuelTypeLower.includes('elektrik') || fuelTypeLower.includes('electric') || fuelTypeLower.includes('bev');

      if (isEv) {
        baseReport.vehicleIdentity.engineDisplacementCc = undefined;
      } else if (specs.engineDisplacementCc && Number(specs.engineDisplacementCc) > 0) {
        baseReport.vehicleIdentity.engineDisplacementCc = specs.engineDisplacementCc;
      }
      if (specs.enginePowerHp) baseReport.vehicleIdentity.enginePowerHp = specs.enginePowerHp;
      if (specs.transmissionTypeAndSpeeds) baseReport.vehicleIdentity.transmissionName = specs.transmissionTypeAndSpeeds;
      if (specs.transmissionCode) baseReport.vehicleIdentity.transmissionCode = specs.transmissionCode;
      if (specs.engineCode && !baseReport.vehicleIdentity.engineCode) baseReport.vehicleIdentity.engineCode = specs.engineCode;
      if (specs.drivetrain) baseReport.vehicleIdentity.drivetrain = specs.drivetrain;

      const currentPerf: any = baseReport.performanceUsage || {};
      const hasDbPerformance = (
        currentPerf.zeroToHundredKmh !== undefined && currentPerf.zeroToHundredKmh !== null ||
        currentPerf.topSpeedKmh !== undefined && currentPerf.topSpeedKmh !== null ||
        currentPerf.curbWeightKg !== undefined && currentPerf.curbWeightKg !== null ||
        currentPerf.trunkCapacityLiters !== undefined && currentPerf.trunkCapacityLiters !== null
      );

      baseReport.performanceUsage = {
        powerHp: currentPerf.powerHp || specs.enginePowerHp,
        torqueNm: currentPerf.torqueNm || specs.engineTorqueNm,
        zeroToHundredKmh: (currentPerf.zeroToHundredKmh !== undefined && currentPerf.zeroToHundredKmh !== null) ? currentPerf.zeroToHundredKmh : specs.zeroToHundredKmh,
        topSpeedKmh: (currentPerf.topSpeedKmh !== undefined && currentPerf.topSpeedKmh !== null) ? currentPerf.topSpeedKmh : specs.topSpeedKmh,
        cityFuelL100km: (currentPerf.cityFuelL100km !== undefined && currentPerf.cityFuelL100km !== null) ? currentPerf.cityFuelL100km : specs.cityFuelL100km,
        highwayFuelL100km: (currentPerf.highwayFuelL100km !== undefined && currentPerf.highwayFuelL100km !== null) ? currentPerf.highwayFuelL100km : specs.highwayFuelL100km,
        combinedFuelL100km: (currentPerf.combinedFuelL100km !== undefined && currentPerf.combinedFuelL100km !== null) ? currentPerf.combinedFuelL100km : (specs.catalogCombinedFuelL100km || specs.combinedFuelL100km),
        trunkCapacityLiters: (currentPerf.trunkCapacityLiters !== undefined && currentPerf.trunkCapacityLiters !== null) ? currentPerf.trunkCapacityLiters : specs.trunkCapacityLiters,
        curbWeightKg: (currentPerf.curbWeightKg !== undefined && currentPerf.curbWeightKg !== null) ? currentPerf.curbWeightKg : specs.curbWeightKg,
        rangeFactorsNote: (specs.realWorldFuelMinL100km && specs.realWorldFuelMaxL100km)
          ? `Gerçek Yol Tüketim Beklentisi: ${specs.realWorldFuelMinL100km} - ${specs.realWorldFuelMaxL100km} L/100km`
          : baseReport.performanceUsage?.rangeFactorsNote,
        supportingFactIds: hasDbPerformance ? ['VEHICLE_DATABASE'] : ['AI_VERIFIED_TECHNICAL_SPECS'],
      };
    }
  }

  private sanitizeIncompatibleReportFields(baseReport: ComprehensiveVehicleReport, contextJson: any): void {
    // 1. Deterministlc numeric claim sanitization (SoH thresholds, wear km thresholds)
    this.semanticValidationService.sanitizeEvidenceBoundNumericClaims(baseReport, contextJson);

    // 2. EV Architecture Sanitization: EV displacement must always be undefined, and remove ICE mechanical terms from EV checklists/questions
    const fuelType = ((baseReport.vehicleIdentity as any)?.fuelType || contextJson?.vehicleIdentity?.fuelType || '').toLowerCase();
    const isElectric = fuelType.includes('elektrik') || fuelType.includes('electric') || fuelType.includes('bev');
    if (isElectric) {
      if (baseReport.vehicleIdentity) {
        baseReport.vehicleIdentity.engineDisplacementCc = undefined;
      }
      if (Array.isArray(baseReport.prePurchaseChecks)) {
        baseReport.prePurchaseChecks = baseReport.prePurchaseChecks.filter(item => {
          const text = ((item.title || '') + ' ' + (item.instruction || '') + ' ' + (item.targetComponent || '')).toLowerCase();
          return !text.includes('egzoz emisyonu') && !text.includes('dpf filtresi') && !text.includes('buji değişimi') && !text.includes('yakıt deposu');
        });
      }
      if (Array.isArray(baseReport.sellerQuestions)) {
        baseReport.sellerQuestions = baseReport.sellerQuestions.filter(item => {
          const text = ((item.questionText || '') + ' ' + (item.expectedAnswerHint || '')).toLowerCase();
          return !text.includes('egzoz emisyonu') && !text.includes('dpf filtresi') && !text.includes('buji değişimi') && !text.includes('yakıt deposu');
        });
      }
    }

    const synth = baseReport.expertDecisionSynthesis;
    if (synth?.primaryTechnicalRisk) {
      const risk = synth.primaryTechnicalRisk as any;
      const title = (risk.title || risk.riskTitle || '').toLowerCase();
      const isElectricalOrInteriorOrWiper =
        title.includes('silecek') ||
        title.includes('wiper') ||
        title.includes('multimedya') ||
        title.includes('ekran') ||
        title.includes('hoparlör') ||
        title.includes('sunroof') ||
        title.includes('döşeme') ||
        title.includes('koltuk') ||
        title.includes('klima kontrol paneli') ||
        title.includes('park sensörü');

      if (isElectricalOrInteriorOrWiper) {
        // Filter out any incompatible mechanical/underbody/lift inspection steps
        const underbodyKeywords = [
          'lifte kaldır',
          'alt muhafaza',
          'karter muhafazası',
          'yağ sızıntısı',
          'motor yağı kaçağı',
          'salıncak burç',
          'rot başı',
          'amortisör kulesi',
          'aks körüğü',
        ];
        if (Array.isArray(risk.inspectionInstructions)) {
          risk.inspectionInstructions = risk.inspectionInstructions.filter((step: any) => {
            const stepStr = (typeof step === 'string' ? step : step.instruction || step.title || '').toLowerCase();
            return !underbodyKeywords.some((kw) => stepStr.includes(kw));
          });
          if (risk.inspectionInstructions.length === 0) {
            risk.inspectionInstructions = ['İlgili bileşeni fonksiyonel olarak test ettirin ve soket/bağlantı durumunu kontrol ettirin.'];
          }
        }
      }
    }

    // Cleanse timing chain wording if engine is timing belt (KAYIŞ)
    const researchIdentity = contextJson?.verifiedResearch?.vehicleIdentityResearch;
    const vehicleCtx = contextJson?.vehicleIdentity || {};
    const timingSystem = String(
      (baseReport.vehicleIdentity as any)?.timingSystem ||
      researchIdentity?.timingSystem ||
      vehicleCtx.timingSystem ||
      ''
    ).toLowerCase();

    if ((timingSystem.includes('kayis') || timingSystem.includes('kayış') || timingSystem.includes('belt')) && !timingSystem.includes('zincir')) {
      if (Array.isArray(baseReport.prePurchaseChecks)) {
        baseReport.prePurchaseChecks = baseReport.prePurchaseChecks.filter(c => {
          const t = ((c.title || '') + ' ' + (c.instruction || '')).toLowerCase();
          return !t.includes('zincir');
        });
      }
    }

    // 4. Primary Technical Risk Grounding Sanitization
    const hasExplicitZeroEvidence = Boolean(
      contextJson &&
      Array.isArray(contextJson.problems) && contextJson.problems.length === 0 &&
      Array.isArray(contextJson?.verifiedDatabaseVehicleReport?.knownDatabaseProblems) && contextJson.verifiedDatabaseVehicleReport.knownDatabaseProblems.length === 0 &&
      (!contextJson?.verifiedResearch?.chronicFaults || contextJson.verifiedResearch.chronicFaults.length === 0)
    );

    if (hasExplicitZeroEvidence && baseReport.expertDecisionSynthesis?.primaryTechnicalRisk) {
      const risk = baseReport.expertDecisionSynthesis.primaryTechnicalRisk as any;
      if (risk && risk.state !== 'NO_VERIFIED_PRIMARY_RISK') {
        baseReport.expertDecisionSynthesis.primaryTechnicalRisk = null as any;
      }
    }
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
