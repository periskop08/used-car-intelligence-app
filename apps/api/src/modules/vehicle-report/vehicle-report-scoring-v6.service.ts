import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  VehicleReportScoresV6,
  TorqueScoutDecisionScoreV1,
  ModelRiskStateV6,
  ModelRiskQuantificationV6,
  ConditionStateV6,
  BuyabilityStateV6,
  DomainKeyV6,
  DomainBreakdownItemV6,
  VehicleReliabilityResearch,
} from '@used-car-intelligence/shared';
import { TorqueScoutDecisionScoreService } from './torque-scout-decision-score.service';

export interface V6ScoringInputContext {
  vehicleIdentity?: any;
  verifiedDatabaseVehicleReport?: any;
  verifiedResearch?: any;
  reliabilityResearchShadow?: VehicleReliabilityResearch;
  listingContext?: any;
  diagnosticTelemetry?: any;
  maintenanceRecords?: any;
  contradictionDetected?: boolean;
}

const DOMAIN_LABELS: Record<DomainKeyV6, string> = {
  POWERTRAIN_ENGINE: 'Motor Mekaniği & Zamanlama',
  POWERTRAIN_TRANS: 'Şanzıman & Aktarma Organları',
  EMISSIONS_EXHAUST: 'Emisyon & Egzoz Arıtma',
  HV_BATTERY_SYSTEM: 'Yüksek Voltaj & Batarya Sistemi',
  THERMAL_COOLING: 'Termal Yönetim & Soğutma',
  ELECTRONICS_BODY: 'Gövde Elektroniği & Donanım',
  CHASSIS_BRAKES: 'Yürüyen Aksam, Direksiyon & Fren',
  SAFETY_RECALL: 'Resmi Geri Çağırma & Güvenlik Kampanyaları',
};

// Domain Weights (Normalizing to 1.0 across active domains per powertrain type)
const DOMAIN_WEIGHTS_ICE: Record<DomainKeyV6, number> = {
  POWERTRAIN_ENGINE: 0.25,
  POWERTRAIN_TRANS: 0.25,
  EMISSIONS_EXHAUST: 0.15,
  HV_BATTERY_SYSTEM: 0.00,
  THERMAL_COOLING: 0.10,
  ELECTRONICS_BODY: 0.10,
  CHASSIS_BRAKES: 0.15,
  SAFETY_RECALL: 0.00,
};

const DOMAIN_WEIGHTS_HYBRID: Record<DomainKeyV6, number> = {
  POWERTRAIN_ENGINE: 0.20,
  POWERTRAIN_TRANS: 0.20,
  EMISSIONS_EXHAUST: 0.10,
  HV_BATTERY_SYSTEM: 0.20,
  THERMAL_COOLING: 0.10,
  ELECTRONICS_BODY: 0.08,
  CHASSIS_BRAKES: 0.12,
  SAFETY_RECALL: 0.00,
};

const DOMAIN_WEIGHTS_EV: Record<DomainKeyV6, number> = {
  POWERTRAIN_ENGINE: 0.00,
  POWERTRAIN_TRANS: 0.15,
  EMISSIONS_EXHAUST: 0.00,
  HV_BATTERY_SYSTEM: 0.40,
  THERMAL_COOLING: 0.15,
  ELECTRONICS_BODY: 0.15,
  CHASSIS_BRAKES: 0.15,
  SAFETY_RECALL: 0.00,
};

@Injectable()
export class VehicleReportScoringV6Service {
  private readonly logger = new Logger(VehicleReportScoringV6Service.name);
  private readonly decisionScoreService: TorqueScoutDecisionScoreService;

  constructor(
    @Optional() decisionScoreService?: TorqueScoutDecisionScoreService,
  ) {
    this.decisionScoreService = decisionScoreService || new TorqueScoutDecisionScoreService();
  }

  /**
   * Dedicated Stage 1 Reliability Research -> V6 Evidence Ingestion Bridge.
   * Maps full Stage 1 research output directly into V6 scoring without evidence loss.
   */
  calculateScoresFromReliabilityResearch(
    vehicleContext: any,
    reliabilityResearch: VehicleReliabilityResearch,
    listingContext?: any,
  ): VehicleReportScoresV6 {
    const bridgedContext = this.bridgeReliabilityResearchToContext(vehicleContext, reliabilityResearch);
    return this.calculateScores(bridgedContext, listingContext);
  }

  /**
   * Bridges VehicleReliabilityResearch into V6ScoringInputContext.
   * Preserves exact numeric, qualitative, and recall partitions.
   */
  bridgeReliabilityResearchToContext(
    vehicleContext: any,
    reliabilityResearch: VehicleReliabilityResearch,
  ): V6ScoringInputContext {
    const groundingSources: any[] = [];
    if (reliabilityResearch?.domainResults) {
      Object.values(reliabilityResearch.domainResults).forEach((d) => {
        d.channels?.forEach((c) => {
          if (Array.isArray(c.sources)) {
            groundingSources.push(...c.sources);
          }
        });
      });
    }

    const recallDefects = (reliabilityResearch?.domainResults?.SAFETY_RECALL?.defects || []).filter(
      (d) => d.numericEligibility !== 'REJECTED',
    );

    return {
      ...vehicleContext,
      verifiedResearch: {
        ...(vehicleContext?.verifiedResearch || {}),
        webSearchPerformed: groundingSources.length > 0 || (reliabilityResearch?.reliabilityCoverageScore ?? 0) > 0,
        groundingSources: groundingSources.length > 0
          ? groundingSources
          : (vehicleContext?.verifiedResearch?.groundingSources || []),
        reliabilityResearch: reliabilityResearch?.allVerifiedDefects || [],
        qualitativeDefects: reliabilityResearch?.qualitativeDefects || [],
        recallResearch: recallDefects.length > 0
          ? recallDefects
          : (vehicleContext?.verifiedResearch?.recallResearch || []),
      },
      reliabilityResearchShadow: reliabilityResearch,
    };
  }

  /**
   * Main deterministic V6 score calculation entrypoint.
   * Strictly adheres to the frozen Phase 1.2.1 / Phase 2J contract.
   */
  calculateScores(vehicleContext: any, listingContext?: any): VehicleReportScoresV6 {
    const vIdentity = vehicleContext?.vehicleIdentity || {};
    const reportData = vehicleContext?.verifiedDatabaseVehicleReport || {};
    const researchData = vehicleContext?.verifiedResearch || {};
    const contradictionDetected = vehicleContext?.contradictionDetected === true;

    // Check if reliability research is passed as a complete VehicleReliabilityResearch object
    const relObj: VehicleReliabilityResearch | undefined =
      (researchData?.reliabilityResearch && typeof researchData.reliabilityResearch === 'object' && !Array.isArray(researchData.reliabilityResearch) && 'domainResults' in researchData.reliabilityResearch)
        ? researchData.reliabilityResearch
        : (vehicleContext?.reliabilityResearchShadow && typeof vehicleContext.reliabilityResearchShadow === 'object' && 'domainResults' in vehicleContext.reliabilityResearchShadow)
        ? vehicleContext.reliabilityResearchShadow
        : undefined;

    let rawProblems: any[] = [];
    let rawQualitative: any[] = [];
    let rawRecalls: any[] = [];
    let groundingSources: any[] = Array.isArray(researchData?.groundingSources) ? [...researchData.groundingSources] : [];

    if (relObj) {
      // Ingest directly from structured VehicleReliabilityResearch
      rawProblems = Array.isArray(relObj.allVerifiedDefects) ? relObj.allVerifiedDefects : [];
      rawQualitative = Array.isArray(relObj.qualitativeDefects) ? relObj.qualitativeDefects : [];
      rawRecalls = Array.isArray(relObj.domainResults?.SAFETY_RECALL?.defects)
        ? relObj.domainResults.SAFETY_RECALL.defects
        : [];
      if (relObj.domainResults) {
        Object.values(relObj.domainResults).forEach((d) => {
          d.channels?.forEach((c) => {
            if (Array.isArray(c.sources)) groundingSources.push(...c.sources);
          });
        });
      }
    } else {
      // Array ingestion with strict numeric vs qualitative separation
      const rawRel = researchData.reliabilityResearch || reportData.knownDatabaseProblems || [];
      if (Array.isArray(rawRel)) {
        rawRel.forEach((item: any) => {
          if (item.numericEligibility === 'QUALITATIVE_ONLY') {
            rawQualitative.push(item);
          } else {
            rawProblems.push(item);
          }
        });
      }
      if (Array.isArray(researchData.qualitativeDefects)) {
        rawQualitative.push(...researchData.qualitativeDefects);
      }
      rawRecalls = Array.isArray(researchData.recallResearch)
        ? researchData.recallResearch
        : (Array.isArray(reportData.recalls) ? reportData.recalls : []);
    }

    const isElectric = vIdentity.isElectric === true || vIdentity.fuelType === 'Elektrik';
    const isHybrid = vIdentity.isHybrid === true || vIdentity.fuelType === 'Hibrit';

    const domainWeights = isElectric
      ? DOMAIN_WEIGHTS_EV
      : isHybrid
      ? DOMAIN_WEIGHTS_HYBRID
      : DOMAIN_WEIGHTS_ICE;

    // =========================================================================
    // 1. MODEL / INHERENT ARCHITECTURE COVERAGE & ELIGIBILITY
    // =========================================================================
    const isExactVariant = !!(vIdentity.brand && vIdentity.model && vIdentity.modelYear);
    const hasWebSearchGrounded = researchData?.webSearchPerformed === true || (relObj && (relObj.reliabilityCoverageScore ?? 0) > 0);
    const hasExplicitDbRecords = vehicleContext?.verifiedDatabaseVehicleReport !== undefined;

    // Calculate Model Coverage (0.0 to 1.0)
    let modelCoverageNorm = 0.0;
    if (relObj && typeof relObj.reliabilityCoverageScore === 'number') {
      modelCoverageNorm = relObj.reliabilityCoverageScore / 100.0;
    } else if (isExactVariant && (hasWebSearchGrounded || hasExplicitDbRecords)) {
      if (groundingSources.length >= 3) {
        modelCoverageNorm = 0.85; // Multi-source deep research
      } else if (groundingSources.length > 0 || hasExplicitDbRecords) {
        modelCoverageNorm = 0.70; // Grounded moderate coverage
      } else {
        modelCoverageNorm = 0.60; // Baseline grounded
      }
    } else if (isExactVariant) {
      modelCoverageNorm = 0.40; // Known variant identity only, shallow failure research
    } else {
      modelCoverageNorm = 0.15; // Incomplete / unrecognized variant
    }

    const modelCoverageScore = Math.round(modelCoverageNorm * 100);

    // =========================================================================
    // 2. MODEL RISK STATE MACHINE & SCORE (NUMERIC vs QUALITATIVE ISOLATION)
    // =========================================================================
    const domainBreakdown: DomainBreakdownItemV6[] = [];
    const activeDomains: DomainKeyV6[] = [
      'POWERTRAIN_ENGINE',
      'POWERTRAIN_TRANS',
      'EMISSIONS_EXHAUST',
      'HV_BATTERY_SYSTEM',
      'THERMAL_COOLING',
      'ELECTRONICS_BODY',
      'CHASSIS_BRAKES',
      'SAFETY_RECALL',
    ];

    // Combine all problem candidates from database and research
    const allProblemCandidates = [
      ...(Array.isArray(rawProblems) ? rawProblems : []),
      ...(Array.isArray(rawQualitative) ? rawQualitative : []),
    ];

    // Filter verified defect evidences (excluding rejected Tier 3)
    const applicableDefects = allProblemCandidates.filter((p: any) => {
      if (p.numericEligibility === 'REJECTED') return false;
      const type = p.problemType;
      return type === 'VERIFIED_FAILURE' || type === 'CHRONIC' || !type;
    });

    const applicableRecalls = (Array.isArray(rawRecalls) ? rawRecalls : []).filter(
      (r: any) => r.numericEligibility !== 'REJECTED',
    );

    // Evaluate Domain Sub-Scores
    const domainScores: Record<DomainKeyV6, number | null> = {
      POWERTRAIN_ENGINE: null,
      POWERTRAIN_TRANS: null,
      EMISSIONS_EXHAUST: null,
      HV_BATTERY_SYSTEM: null,
      THERMAL_COOLING: null,
      ELECTRONICS_BODY: null,
      CHASSIS_BRAKES: null,
      SAFETY_RECALL: null,
    };

    const domainNumericFactors: Record<DomainKeyV6, Array<{ key: string; impact: number | null; quantification?: 'NUMERIC' | 'QUALITATIVE'; explanation: string }>> = {
      POWERTRAIN_ENGINE: [],
      POWERTRAIN_TRANS: [],
      EMISSIONS_EXHAUST: [],
      HV_BATTERY_SYSTEM: [],
      THERMAL_COOLING: [],
      ELECTRONICS_BODY: [],
      CHASSIS_BRAKES: [],
      SAFETY_RECALL: [],
    };

    const domainQualitativeFactors: Record<DomainKeyV6, Array<{ key: string; impact: number | null; quantification?: 'NUMERIC' | 'QUALITATIVE'; explanation: string }>> = {
      POWERTRAIN_ENGINE: [],
      POWERTRAIN_TRANS: [],
      EMISSIONS_EXHAUST: [],
      HV_BATTERY_SYSTEM: [],
      THERMAL_COOLING: [],
      ELECTRONICS_BODY: [],
      CHASSIS_BRAKES: [],
      SAFETY_RECALL: [],
    };

    // Ingest Verified Defects into Domains (Strict Prevalence Requirement: NO synthetic 0.60 fallback)
    applicableDefects.forEach((d: any, idx: number) => {
      const domainKey = this.mapDefectToDomain(d, isElectric);
      const isExplicitlyNumeric =
        d.numericEligibility === 'NUMERIC_ELIGIBLE' ||
        (d.hasQuantitativePrevalence === true && typeof d.prevalenceFactor === 'number') ||
        (typeof d.frequencyFactor === 'number' && d.frequencyFactor > 0 && d.numericEligibility !== 'QUALITATIVE_ONLY');

      const rawFreq = typeof d.frequencyFactor === 'number' ? d.frequencyFactor : (typeof d.prevalenceFactor === 'number' ? d.prevalenceFactor : null);

      if (isExplicitlyNumeric && rawFreq !== null && rawFreq > 0) {
        const severityRaw = typeof d.severityNum === 'number' ? d.severityNum : (typeof d.severityScore === 'number' ? d.severityScore : (d.riskLevel === 'CRITICAL' || d.severity === 'YÜKSEK' ? 8 : 4));
        const scaleS = (Math.pow(severityRaw, 1.5) / Math.pow(10, 1.5)) * 100;
        const app = typeof d.applicabilityFactor === 'number' ? d.applicabilityFactor : 1.0;
        const trust = typeof d.trustFactor === 'number' ? d.trustFactor : 0.85;
        const status = typeof d.statusFactor === 'number' ? d.statusFactor : 1.0;

        const impact = scaleS * rawFreq * app * trust * status;
        const singleImpact = Math.min(100, Math.max(1, Math.round(impact)));

        domainNumericFactors[domainKey].push({
          key: `VERIFIED_DEFECT_${d.id || idx}`,
          impact: singleImpact,
          quantification: 'NUMERIC',
          explanation: `${DOMAIN_LABELS[domainKey]}: ${d.title || d.description || 'Doğrulanmış Kronik Sorun'}`,
        });
      } else {
        // Pure Qualitative Defect (prevalenceFactor is null => excluded from numeric calculation)
        domainQualitativeFactors[domainKey].push({
          key: `VERIFIED_DEFECT_${d.id || idx}`,
          impact: null,
          quantification: 'QUALITATIVE',
          explanation: `${DOMAIN_LABELS[domainKey]}: ${d.title || d.description || 'Doğrulanmış Kronik Sorun (Niteliksel Kanıt)'}`,
        });
      }
    });

    // Ingest Verified Model-Level Recalls (Treated as Qualitative unless explicit numeric incidence provided)
    applicableRecalls.forEach((r: any, idx: number) => {
      const isExplicitlyNumericRecall =
        r.numericEligibility === 'NUMERIC_ELIGIBLE' &&
        typeof r.frequencyFactor === 'number' &&
        r.frequencyFactor > 0;

      if (isExplicitlyNumericRecall) {
        const isOpen = r.status === 'OPEN' || r.isApplied === false;
        const recallSeverity = isOpen ? 60 : 15;
        domainNumericFactors.SAFETY_RECALL.push({
          key: `MODEL_RECALL_${r.campaignNumber || idx}`,
          impact: recallSeverity,
          quantification: 'NUMERIC',
          explanation: `Üretici Bülteni (${r.campaignNumber || 'Kampanya'}): ${r.description || 'Geri Çağırma/Servis Aksiyonu'}`,
        });
      } else {
        domainQualitativeFactors.SAFETY_RECALL.push({
          key: `MODEL_RECALL_${r.campaignNumber || idx}`,
          impact: null,
          quantification: 'QUALITATIVE',
          explanation: `Üretici Bülteni (${r.campaignNumber || 'Kampanya'}): ${r.description || 'Geri Çağırma/Servis Aksiyonu (Niteliksel Kampanya)'}`,
        });
      }
    });

    // Calculate Asymptotic Saturation and States for Each Domain
    activeDomains.forEach((dKey) => {
      const numFactors = domainNumericFactors[dKey];
      const qualFactors = domainQualitativeFactors[dKey];
      const allFactors = [...numFactors, ...qualFactors];

      let dScore: number | null = null;
      let dState: DomainBreakdownItemV6['state'] = 'UNKNOWN';

      if (numFactors.length > 0) {
        let productComplement = 1.0;
        numFactors.forEach((f) => {
          const clampedVal = Math.min(99.9, Math.max(0, f.impact ?? 0));
          productComplement *= 1.0 - clampedVal / 100.0;
        });
        dScore = Math.min(100, Math.max(1, Math.round(100 * (1.0 - productComplement))));
        dState = 'BAD';
      } else if (qualFactors.length > 0) {
        dScore = null;
        dState = 'QUALITATIVE_RISK';
      } else if (modelCoverageNorm >= 0.60) {
        // Researched domain with 0 verified defects
        dScore = 0;
        dState = 'GOOD';
      } else {
        // Insufficient research for this domain
        dScore = null;
        dState = 'UNKNOWN';
      }

      domainScores[dKey] = dScore;

      domainBreakdown.push({
        domain: dKey,
        domainLabel: DOMAIN_LABELS[dKey],
        score: dScore,
        state: dState,
        verifiedFactors: allFactors,
      });
    });

    // Tally Verified Defects
    const numericVerifiedDefectCount = activeDomains.reduce(
      (sum, k) => sum + domainNumericFactors[k].length,
      0,
    );
    const qualitativeVerifiedDefectCount = activeDomains.reduce(
      (sum, k) => sum + domainQualitativeFactors[k].length,
      0,
    );
    const totalVerifiedDefectCount = numericVerifiedDefectCount + qualitativeVerifiedDefectCount;

    // Determine Model Risk State & Quantification
    let modelRiskState: ModelRiskStateV6 = 'INSUFFICIENT_RESEARCH';
    let modelRiskScore: number | null = null;
    let modelRiskQuantification: ModelRiskQuantificationV6 = 'NOT_ESTIMABLE';

    if (contradictionDetected) {
      modelRiskState = 'CONTRADICTORY_EVIDENCE';
      modelRiskScore = null;
      modelRiskQuantification = 'NOT_ESTIMABLE';
    } else if (modelCoverageNorm < 0.60) {
      modelRiskState = 'INSUFFICIENT_RESEARCH';
      modelRiskScore = null;
      modelRiskQuantification = 'NOT_ESTIMABLE';
    } else if (totalVerifiedDefectCount > 0) {
      modelRiskState = 'VERIFIED_RISK_PRESENT';

      if (numericVerifiedDefectCount === 0) {
        // Qualitative-Only: Verified risk exists, but magnitude is unknown
        modelRiskScore = null;
        modelRiskQuantification = 'QUALITATIVE_ONLY';
      } else {
        // Numeric calculation on the numeric subset only
        const maxDomain = Math.max(...activeDomains.map((k) => domainScores[k] ?? 0));
        let weightedSum = 0;
        activeDomains.forEach((k) => {
          weightedSum += domainWeights[k] * (domainScores[k] ?? 0);
        });
        modelRiskScore = Math.round(Math.min(100, Math.max(1, 0.50 * maxDomain + 0.50 * weightedSum)));
        modelRiskQuantification =
          qualitativeVerifiedDefectCount > 0 ? 'PARTIAL_LOWER_BOUND' : 'FULLY_QUANTIFIED';
      }
    } else {
      // 0 defects found across all domains
      if (modelCoverageNorm >= 0.80) {
        modelRiskState = 'VERIFIED_LOW_RISK';
        modelRiskScore = 0;
        modelRiskQuantification = 'CERTIFIED_ZERO';
      } else {
        modelRiskState = 'RESEARCH_COMPLETE_NO_DEFECT';
        modelRiskScore = null;
        modelRiskQuantification = 'NOT_ESTIMABLE';
      }
    }

    // =========================================================================
    // 3. VEHICLE CONDITION RISK (4 INDEPENDENT DOMAINS)
    // =========================================================================
    // Domains: STRUCTURAL (0.35), MAINTENANCE (0.25), DIAGNOSTICS (0.20), POWERTRAIN_HEALTH (0.20)
    let structRisk = 0;
    let structKnown = false;
    let maintRisk = 0;
    let maintKnown = false;
    let diagRisk = 0;
    let diagKnown = false;
    let powerRisk = 0;
    let powerKnown = false;

    if (listingContext) {
      // 1. Structural Domain
      if (typeof listingContext.heavyDamage === 'boolean') {
        structKnown = true;
        if (listingContext.heavyDamage === true) {
          structRisk = Math.max(structRisk, 50);
        }
      }
      if (typeof listingContext.chassisDamage === 'boolean') {
        structKnown = true;
        if (listingContext.chassisDamage === true) {
          structRisk = Math.max(structRisk, 40);
        }
      }
      if (typeof listingContext.airbagDeployed === 'boolean') {
        structKnown = true;
        if (listingContext.airbagDeployed === true) {
          structRisk = Math.max(structRisk, 40);
        }
      }
      if (typeof listingContext.tramerAmount === 'number') {
        structKnown = true;
        if (listingContext.tramerAmount > 0) {
          const estMarketValue = listingContext.price || 1000000;
          const tramerRatio = listingContext.tramerAmount / estMarketValue;
          const tramerRisk = Math.min(30, Math.round(tramerRatio * 40));
          structRisk = Math.max(structRisk, tramerRisk);
        }
      }
      if (Array.isArray(listingContext.paintedPanels) || Array.isArray(listingContext.changedPanels)) {
        structKnown = true;
        const panelCount = (listingContext.paintedPanels?.length || 0) + (listingContext.changedPanels?.length || 0);
        const panelRisk = Math.min(8, panelCount * 1.0);
        structRisk = Math.min(50, structRisk + panelRisk);
      }

      // 2. Maintenance Domain
      if (listingContext.hasFullServiceHistory === true) {
        maintRisk = 0;
        maintKnown = true;
      } else if (listingContext.hasFullServiceHistory === false) {
        maintRisk = 15;
        maintKnown = true;
      }

      // 3. Diagnostics & Active Defects
      if (Array.isArray(listingContext.activeFaultCodes)) {
        diagKnown = true;
        diagRisk = listingContext.activeFaultCodes.length > 0 ? Math.min(40, listingContext.activeFaultCodes.length * 15) : 0;
      }
      if (listingContext.hasOpenRecallOnVin === true) {
        diagKnown = true;
        diagRisk = Math.min(40, diagRisk + 20);
      } else if (listingContext.hasOpenRecallOnVin === false) {
        diagKnown = true;
      }

      // 4. Powertrain / Battery Health (Contextual - No universal threshold)
      if (isElectric || isHybrid) {
        if (typeof listingContext.measuredBatterySoH === 'number') {
          powerKnown = true;
          // Contextual evaluation: only abnormal drops trigger risk
          const expectedSoH = 100 - Math.min(25, ((listingContext.mileage || 0) / 100000) * 4);
          const dropDelta = expectedSoH - listingContext.measuredBatterySoH;
          if (dropDelta > 10) {
            powerRisk = Math.min(40, Math.round(dropDelta * 2));
          } else {
            powerRisk = 0;
          }
        }
      } else {
        if (typeof listingContext.clutchWearPercentage === 'number') {
          powerKnown = true;
          powerRisk = listingContext.clutchWearPercentage > 75 ? 30 : 0;
        }
      }
    }

    const wStruct = 0.35;
    const wMaint = 0.25;
    const wDiag = 0.20;
    const wPower = 0.20;

    const conditionCoverageWeight =
      (structKnown ? wStruct : 0) +
      (maintKnown ? wMaint : 0) +
      (diagKnown ? wDiag : 0) +
      (powerKnown ? wPower : 0);

    const conditionCoverageScore = Math.round(conditionCoverageWeight * 100);
    const conditionCoverageNorm = conditionCoverageScore / 100.0;

    let vehicleConditionRisk: number | null = null;
    let conditionState: ConditionStateV6 = 'UNKNOWN';

    // Condition Eligibility Gate: conditionCoverageScore >= 35
    if (conditionCoverageScore >= 35) {
      const weightedRiskSum =
        (structKnown ? wStruct * structRisk : 0) +
        (maintKnown ? wMaint * maintRisk : 0) +
        (diagKnown ? wDiag * diagRisk : 0) +
        (powerKnown ? wPower * powerRisk : 0);

      vehicleConditionRisk = Math.round(Math.min(100, weightedRiskSum / conditionCoverageWeight));

      if (vehicleConditionRisk === 0 && conditionCoverageScore === 100) {
        conditionState = 'VERIFIED_CLEAN';
      } else if (vehicleConditionRisk > 0) {
        conditionState = 'VERIFIED_DEFECTS_PRESENT';
      } else {
        conditionState = 'PARTIAL_DATA';
      }
    } else {
      vehicleConditionRisk = null;
      conditionState = 'UNKNOWN';
    }

    // =========================================================================
    // 4. UNCERTAINTY & CONFIDENCE SCORE (0..100 NORMALIZED)
    // =========================================================================
    let sourceQualityNorm = 0.50;
    if (groundingSources.length >= 3) {
      sourceQualityNorm = 0.95;
    } else if (groundingSources.length > 0) {
      sourceQualityNorm = 0.75;
    } else if (hasExplicitDbRecords) {
      sourceQualityNorm = 0.70;
    } else {
      sourceQualityNorm = 0.30;
    }

    const rawConfidence =
      0.35 * modelCoverageNorm +
      0.40 * conditionCoverageNorm +
      0.25 * sourceQualityNorm;

    const confidenceScore = Math.min(100, Math.max(0, Math.round(rawConfidence * 100)));
    const confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      confidenceScore >= 75 ? 'HIGH' : confidenceScore >= 45 ? 'MEDIUM' : 'LOW';

    // =========================================================================
    // 5. BUYABILITY DETERMINATION
    // =========================================================================
    let buyabilityScore: number | null = null;
    let buyabilityState: BuyabilityStateV6 = 'INSUFFICIENT_DATA';

    const isModelRiskEligibleForBuyability =
      (modelRiskQuantification === 'FULLY_QUANTIFIED' || modelRiskQuantification === 'CERTIFIED_ZERO') &&
      modelRiskScore !== null;
    const hasConditionRisk = vehicleConditionRisk !== null;
    const isConfidenceEligible = confidenceScore >= 40;

    if (isModelRiskEligibleForBuyability && hasConditionRisk && isConfidenceEligible) {
      const baseScore = 100 - (0.45 * modelRiskScore + 0.55 * vehicleConditionRisk);
      const priceModifier = listingContext?.priceModifier || 0; // Price modifier in [-15, +10]
      const rawBuyability = baseScore + priceModifier;

      // Dynamic Confidence Ceiling: Ceiling = 40 + (ConfidenceScore / 100) * 60
      const ceiling = 40 + (confidenceScore / 100.0) * 60;
      buyabilityScore = Math.round(Math.min(ceiling, Math.max(5, rawBuyability)));

      if (buyabilityScore >= 80) {
        buyabilityState = 'HIGHLY_RECOMMENDED';
      } else if (buyabilityScore >= 60) {
        buyabilityState = 'RECOMMENDED';
      } else if (buyabilityScore >= 40) {
        buyabilityState = 'CAUTION_HIGH_RISK';
      } else {
        buyabilityState = 'NOT_RECOMMENDED';
      }
    } else if (isModelRiskEligibleForBuyability && !hasConditionRisk) {
      buyabilityScore = null;
      buyabilityState = 'PROVISIONAL_MODEL_ONLY';
    } else if (!isModelRiskEligibleForBuyability && hasConditionRisk) {
      buyabilityScore = null;
      buyabilityState = 'INSUFFICIENT_MODEL_DATA';
    } else {
      buyabilityScore = null;
      buyabilityState = 'INSUFFICIENT_DATA';
    }

    const v6ScoresResult: VehicleReportScoresV6 = {
      scoringVersion: 'v6.0',
      modelRiskScore,
      modelRiskState,
      modelRiskQuantification,
      modelCoverageScore,
      vehicleConditionRisk,
      conditionState,
      conditionCoverageScore,
      confidenceScore,
      confidenceLevel,
      buyabilityScore,
      buyabilityState,
      domainBreakdown,
      traceDetails: {
        modelRiskEligibility: isModelRiskEligibleForBuyability,
        conditionRiskEligibility: hasConditionRisk,
        buyabilityEligibility: isModelRiskEligibleForBuyability && hasConditionRisk && isConfidenceEligible,
        formulaTrace: {
          modelCoverageNorm,
          conditionCoverageNorm,
          sourceQualityNorm,
          activeDomainWeights: domainWeights,
        },
      },
    };

    // Calculate user-facing buying decision recommendation score V1 in SHADOW MODE
    let decisionScoreV1: TorqueScoutDecisionScoreV1 | undefined = undefined;
    try {
      decisionScoreV1 = this.decisionScoreService.calculateDecisionScore({
        v6Scores: v6ScoresResult,
        qualitativeDefects: rawQualitative,
        recalls: rawRecalls,
        priceModifier: listingContext?.priceModifier,
      });
    } catch (dsErr: any) {
      this.logger.warn(`[SHADOW DECISION SCORE ERROR] Decision score calculation failed: ${dsErr?.message}`);
    }

    return {
      ...v6ScoresResult,
      decisionScoreV1,
    };
  }

  private mapDefectToDomain(defect: any, isElectric: boolean): DomainKeyV6 {
    if (defect.domain && typeof defect.domain === 'string' && DOMAIN_LABELS[defect.domain as DomainKeyV6]) {
      return defect.domain as DomainKeyV6;
    }

    const text = `${defect.title || ''} ${defect.description || ''} ${defect.system || ''} ${defect.category || ''}`.toLowerCase();

    if (text.includes('şanzıman') || text.includes('kavrama') || text.includes('mechatronic') || text.includes('gearbox') || text.includes('dsg') || text.includes('vites')) {
      return 'POWERTRAIN_TRANS';
    }
    if (text.includes('batarya') || text.includes('pil') || text.includes('iccu') || text.includes('inverter') || text.includes('bms') || text.includes('şarj')) {
      return 'HV_BATTERY_SYSTEM';
    }
    if (text.includes('dpf') || text.includes('adblue') || text.includes('egr') || text.includes('katalizör') || text.includes('emisyon')) {
      return 'EMISSIONS_EXHAUST';
    }
    if (text.includes('soğutma') || text.includes('hararet') || text.includes('termostat') || text.includes('radyatör') || text.includes('pompa')) {
      return 'THERMAL_COOLING';
    }
    if (text.includes('elektronik') || text.includes('ekran') || text.includes('yazılım') || text.includes('sensör') || text.includes('kamera')) {
      return 'ELECTRONICS_BODY';
    }
    if (text.includes('süspansiyon') || text.includes('salıncak') || text.includes('amortisör') || text.includes('direksiyon') || text.includes('fren')) {
      return 'CHASSIS_BRAKES';
    }
    if (text.includes('geri çağırma') || text.includes('recall') || text.includes('kampanya') || text.includes('hava yastığı')) {
      return 'SAFETY_RECALL';
    }

    return isElectric ? 'HV_BATTERY_SYSTEM' : 'POWERTRAIN_ENGINE';
  }
}
