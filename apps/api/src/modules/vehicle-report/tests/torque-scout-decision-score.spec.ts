import { TorqueScoutDecisionScoreService } from '../torque-scout-decision-score.service';
import { CanonicalRiskDefect, VehicleReportScoresV6 } from '@used-car-intelligence/shared';

describe('TorqueScout Decision Score Engine (5-Tier Impact & 3-Tier Evidence)', () => {
  let decisionScoreService: TorqueScoutDecisionScoreService;

  beforeEach(() => {
    decisionScoreService = new TorqueScoutDecisionScoreService();
  });

  const createBaseV6Scores = (overrides?: Partial<VehicleReportScoresV6>): VehicleReportScoresV6 => ({
    scoringVersion: 'v6.0',
    modelRiskScore: null,
    modelRiskState: 'VERIFIED_RISK_PRESENT',
    modelRiskQuantification: 'QUALITATIVE_ONLY',
    modelCoverageScore: 80,
    vehicleConditionRisk: null,
    conditionState: 'UNKNOWN',
    conditionCoverageScore: 0,
    confidenceScore: 80,
    confidenceLevel: 'HIGH',
    buyabilityScore: null,
    buyabilityState: 'INSUFFICIENT_DATA',
    domainBreakdown: [],
    ...overrides,
  });

  // =========================================================================
  // 1. Pristine Baseline & 0-Defect Vehicles
  // =========================================================================
  test('Fixture 1: Clean vehicle with zero defects starts at 100 and receives EXCELLENT (no hidden floor penalty)', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_LOW_RISK',
      confidenceScore: 90,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [],
    });

    expect(result.score).toBe(100);
    expect(result.state).toBe('EXCELLENT');
    expect(result.scope).toBe('VARIANT');
    expect(result.totalRiskPenalty).toBe(0);
    expect(result.deductedRisks).toHaveLength(0);
  });

  // =========================================================================
  // 2. Modulated Evidence & Single Defect Deductions
  // =========================================================================
  test('Fixture 2: Single SERIOUS defect with MODERATE evidence (-12 * 0.7) produces -8 deduction and 92 score', () => {
    const v6Scores = createBaseV6Scores();
    const risk: CanonicalRiskDefect = {
      id: 'CANONICAL:POWERTRAIN_TRANS:DUAL_CLUTCH_WEAR',
      domain: 'POWERTRAIN_TRANS',
      title: 'Kuru Çift Kavrama Aşınması',
      normalizedFailureMode: 'DUAL_CLUTCH_WEAR',
      affectedComponent: 'DQ200 Kuru Çift Kavrama',
      severity: 5,
      severityCategory: 'DRIVABILITY',
      applicabilityState: 'FAMILY_MATCH',
      applicabilityEvidence: 'Proven shared component architecture: target vehicle shares DQ200 dry dual clutch',
      verificationState: 'VERIFIED',
      consequenceState: 'INSUFFICIENT',
      lifecycleState: 'VERIFIED',
      scoringEligible: true,
      sources: [],
    };

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [risk],
    });

    expect(result.score).toBe(92); // 100 - 8 = 92
    expect(result.state).toBe('EXCELLENT');
    expect(result.totalRiskPenalty).toBe(8);
    expect(result.deductedRisks).toHaveLength(1);

    const deducted = result.deductedRisks![0];
    expect(deducted.impactClass).toBe('SERIOUS');
    expect(deducted.evidenceLevel).toBe('MODERATE');
    expect(deducted.basePenalty).toBe(12);
    expect(deducted.evidenceMultiplier).toBe(0.7);
    expect(deducted.netDeduction).toBe(8);
  });

  test('Fixture 3: Single CRITICAL defect with STRONG evidence (-25 * 1.0) produces -25 deduction and triggers CAUTION guardrail', () => {
    const v6Scores = createBaseV6Scores();
    const risk: CanonicalRiskDefect = {
      id: 'CANONICAL:POWERTRAIN_ENGINE:WET_BELT_DEGRADATION',
      domain: 'POWERTRAIN_ENGINE',
      title: 'Yağ İçi Triger Parçalanma Riski',
      normalizedFailureMode: 'WET_BELT_DEGRADATION',
      affectedComponent: 'Triger Kayışı ve Yağlama Sistemi',
      severity: 10,
      severityCategory: 'MAJOR_POWERTRAIN',
      severityBasis: 'Rubber debris from oil-bathed belt clogs oil strainer causing oil starvation and brake assist loss',
      applicabilityState: 'EXACT',
      verificationState: 'TIER1_OFFICIAL',
      consequenceState: 'RESEARCHED_GROUNDED',
      lifecycleState: 'SCORING_ELIGIBLE',
      scoringEligible: true,
      sources: [
        {
          sourceId: 'SRC-TSB-1',
          url: 'https://oem.example/tsb-wet-belt',
          title: 'OEM Service Campaign - Wet Belt Degradation',
          tier: 'TIER_1',
        },
      ],
    };

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [risk],
    });

    expect(result.score).toBe(75); // 100 - 25 = 75
    // Guardrail check: 75 is normally 'GOOD' (70-84), but STRONG + CRITICAL caps it at 'CAUTION'!
    expect(result.state).toBe('CAUTION');
    expect(result.totalRiskPenalty).toBe(25);

    const deducted = result.deductedRisks![0];
    expect(deducted.impactClass).toBe('CRITICAL');
    expect(deducted.evidenceLevel).toBe('STRONG');
    expect(deducted.basePenalty).toBe(25);
    expect(deducted.evidenceMultiplier).toBe(1.0);
    expect(deducted.netDeduction).toBe(25);
  });

  // =========================================================================
  // 3. WEAK Evidence & Advisory Preservation (0 Deduction)
  // =========================================================================
  test('Fixture 4: WEAK evidence (e.g. MARKET_UNCERTAIN US recall) produces 0 penalty, preserves 100 score, keeps advisory', () => {
    const v6Scores = createBaseV6Scores();
    const risk: CanonicalRiskDefect = {
      id: 'CANONICAL:SAFETY_RECALL:16V-647',
      domain: 'SAFETY_RECALL',
      title: 'NHTSA 16V-647 Suction Jet Pump',
      normalizedFailureMode: '16V-647',
      affectedComponent: 'Suction Jet Pump',
      severity: 10,
      severityBasis: 'Fuel leak in presence of ignition source increases fire risk',
      applicabilityState: 'MARKET_UNCERTAIN',
      applicabilityEvidence: 'US/NHTSA regulatory scope detected without independent EU/TR homologation',
      verificationState: 'TIER1_OFFICIAL',
      consequenceState: 'RESEARCHED_GROUNDED',
      lifecycleState: 'VERIFIED',
      scoringEligible: false,
      advisoryOnly: true,
      sources: [
        {
          sourceId: 'SRC-NHTSA-1',
          url: 'https://nhtsa.gov',
          title: 'NHTSA Safety Recall',
          tier: 'TIER_1',
        },
      ],
    };

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [risk],
    });

    expect(result.score).toBe(100);
    expect(result.state).toBe('EXCELLENT');
    expect(result.totalRiskPenalty).toBe(0);
    expect(result.deductedRisks).toHaveLength(0);
    // Verified risks list retains the advisory notice for transparent buyer information
    expect(result.verifiedRisks).toHaveLength(1);
    expect(result.verifiedRisks![0].id).toBe('CANONICAL:SAFETY_RECALL:16V-647');
  });

  // =========================================================================
  // 4. Root-Cause Deduplication
  // =========================================================================
  test('Fixture 5: Duplicate root-cause entries on the same component are deduplicated to single maximum deduction', () => {
    const v6Scores = createBaseV6Scores();
    const risk1: CanonicalRiskDefect = {
      id: 'CANONICAL:POWERTRAIN_TRANS:DQ200_WEAR_A',
      domain: 'POWERTRAIN_TRANS',
      title: 'DQ200 Kuru Kavrama Aşınması',
      normalizedFailureMode: 'DUAL_CLUTCH_WEAR',
      affectedComponent: 'DQ200 Kuru Çift Kavrama',
      severity: 5,
      severityCategory: 'DRIVABILITY',
      applicabilityState: 'FAMILY_MATCH',
      applicabilityEvidence: 'Proven shared component architecture',
      verificationState: 'VERIFIED',
      consequenceState: 'INSUFFICIENT',
      lifecycleState: 'VERIFIED',
      scoringEligible: true,
      sources: [],
    };

    const risk2: CanonicalRiskDefect = {
      id: 'CANONICAL:POWERTRAIN_TRANS:DQ200_JUDDER_B',
      domain: 'POWERTRAIN_TRANS',
      title: 'DQ200 Kavrama Titremesi',
      normalizedFailureMode: 'DUAL_CLUTCH_WEAR',
      affectedComponent: 'DQ200 Kuru Çift Kavrama',
      severity: 5,
      severityCategory: 'DRIVABILITY',
      applicabilityState: 'FAMILY_MATCH',
      applicabilityEvidence: 'Proven shared component architecture',
      verificationState: 'VERIFIED',
      consequenceState: 'INSUFFICIENT',
      lifecycleState: 'VERIFIED',
      scoringEligible: true,
      sources: [],
    };

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [risk1, risk2],
    });

    // Both map to DQ200 clutch wear -> deduplicated to 1 deduction of 8 pts
    expect(result.deductedRisks).toHaveLength(1);
    expect(result.totalRiskPenalty).toBe(8);
    expect(result.score).toBe(92);
  });

  // =========================================================================
  // 5. Clean Additive Deductions across Independent Defects
  // =========================================================================
  test('Fixture 6: Multiple independent defects (DSG -8 and Thermostat -5) deduct additively: 100 - 8 - 5 = 87', () => {
    const v6Scores = createBaseV6Scores();
    const dsgRisk: CanonicalRiskDefect = {
      id: 'CANONICAL:POWERTRAIN_TRANS:DQ200',
      domain: 'POWERTRAIN_TRANS',
      title: 'DQ200 Kuru Kavrama Aşınması',
      normalizedFailureMode: 'DUAL_CLUTCH_WEAR',
      affectedComponent: 'DQ200 Kuru Çift Kavrama',
      severity: 5,
      severityCategory: 'DRIVABILITY',
      applicabilityState: 'FAMILY_MATCH',
      applicabilityEvidence: 'Proven shared component architecture',
      verificationState: 'VERIFIED',
      consequenceState: 'INSUFFICIENT',
      lifecycleState: 'VERIFIED',
      scoringEligible: true,
      sources: [],
    };

    const coolingRisk: CanonicalRiskDefect = {
      id: 'CANONICAL:THERMAL_COOLING:THERMOSTAT_SEEPAGE',
      domain: 'THERMAL_COOLING',
      title: 'Termostat Gövdesi Soğutma Suyu Sızıntısı',
      normalizedFailureMode: 'COOLANT_LEAK_HOUSING',
      affectedComponent: 'Termostat ve Devirdaim Gövdesi',
      severity: 3,
      severityCategory: 'FUNCTIONAL_MINOR',
      severityBasis: 'Plastic composite seam seepage under thermal cycles',
      applicabilityState: 'FAMILY_MATCH',
      applicabilityEvidence: 'Proven shared component architecture',
      verificationState: 'VERIFIED',
      consequenceState: 'INSUFFICIENT',
      lifecycleState: 'VERIFIED',
      scoringEligible: true,
      sources: [],
    };

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [dsgRisk, coolingRisk],
    });

    // DSG: SERIOUS (-12) * 0.7 = 8
    // Cooling: MODERATE (-7) * 0.7 = 5
    // Total penalty: 8 + 5 = 13
    // Final score: 100 - 13 = 87
    expect(result.totalRiskPenalty).toBe(13);
    expect(result.score).toBe(87);
    expect(result.state).toBe('EXCELLENT');
    expect(result.deductedRisks).toHaveLength(2);
  });

  // =========================================================================
  // 6. Multiple Critical Defects & Floor Protection
  // =========================================================================
  test('Fixture 7: Multiple catastrophic defects cap at floor 15 and trigger AVOID recommendation', () => {
    const v6Scores = createBaseV6Scores();
    const critical1: CanonicalRiskDefect = {
      id: 'CANONICAL:POWERTRAIN_ENGINE:CRIT_1',
      domain: 'POWERTRAIN_ENGINE',
      title: 'Motor İflası ve Yağ Basınç Kaybı',
      normalizedFailureMode: 'OIL_STARVATION',
      affectedComponent: 'Motor Yağlama Sistemi',
      severity: 10,
      severityCategory: 'MAJOR_POWERTRAIN',
      severityBasis: 'Catastrophic oil pump failure destroying engine',
      applicabilityState: 'EXACT',
      verificationState: 'TIER1_OFFICIAL',
      consequenceState: 'RESEARCHED_GROUNDED',
      lifecycleState: 'SCORING_ELIGIBLE',
      scoringEligible: true,
      sources: [{ sourceId: 'S1', title: 'OEM TSB', tier: 'TIER_1', url: 'https://test' }],
    };

    const critical2: CanonicalRiskDefect = {
      id: 'CANONICAL:SAFETY_RECALL:CRIT_2',
      domain: 'SAFETY_RECALL',
      title: 'Yakıt Hattı Yangın Riski',
      normalizedFailureMode: 'FUEL_LINE_FIRE',
      affectedComponent: 'Yakıt Dağıtım Hattı',
      severity: 10,
      severityBasis: 'Pressurized fuel spray onto hot turbocharger manifold increases fire risk',
      applicabilityState: 'EXACT',
      verificationState: 'TIER1_OFFICIAL',
      consequenceState: 'RESEARCHED_GROUNDED',
      lifecycleState: 'SCORING_ELIGIBLE',
      scoringEligible: true,
      sources: [{ sourceId: 'S2', title: 'KBA Recall', tier: 'TIER_1', url: 'https://test' }],
    };

    const major3: CanonicalRiskDefect = {
      id: 'CANONICAL:POWERTRAIN_TRANS:CRIT_3',
      domain: 'POWERTRAIN_TRANS',
      title: 'Mekatronik Hidrolik Basınç Kaybı',
      normalizedFailureMode: 'MECHATRONIC_PRESSURE_LOSS',
      affectedComponent: 'Şanzıman Mekatroniği',
      severity: 8,
      severityBasis: 'Cracked accumulator causing total hydraulic loss and transmission lockout',
      applicabilityState: 'EXACT',
      verificationState: 'TIER1_OFFICIAL',
      consequenceState: 'RESEARCHED_GROUNDED',
      lifecycleState: 'SCORING_ELIGIBLE',
      scoringEligible: true,
      sources: [{ sourceId: 'S3', title: 'OEM Recall', tier: 'TIER_1', url: 'https://test' }],
    };

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [critical1, critical2, major3],
    });

    // 25 + 25 + 18 = 68 penalty
    expect(result.totalRiskPenalty).toBe(68);
    expect(result.score).toBe(32); // 100 - 68 = 32
    // Guardrail: >= 2 STRONG + CRITICAL defects forces 'AVOID'!
    expect(result.state).toBe('AVOID');
  });

  // =========================================================================
  // 7. Vehicle-Specific Condition & Price Adjustment
  // =========================================================================
  test('Fixture 8: Vehicle condition and market price modifier correctly adjust VEHICLE scope score', () => {
    const v6Scores = createBaseV6Scores({
      vehicleConditionRisk: 20,
      conditionCoverageScore: 80,
      conditionState: 'VERIFIED_DEFECTS_PRESENT',
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      canonicalRisks: [],
      priceModifier: 5, // +5 points price advantage
    });

    expect(result.scope).toBe('VEHICLE');
    // Model risk = 0, Condition risk = 20
    // Base vehicle score = 100 - (0.45 * 0 + 0.55 * 20) = 100 - 11 = 89
    // Adjusted score = 89 + 5 = 94
    expect(result.score).toBe(94);
    expect(result.state).toBe('EXCELLENT');
  });
});
