import { TorqueScoutDecisionScoreService } from '../torque-scout-decision-score.service';
import { VehicleReportScoringV6Service } from '../vehicle-report-scoring-v6.service';
import { VehicleReportScoresV6 } from '@used-car-intelligence/shared';

describe('TorqueScout Decision Score V1 Specification & Regression Suite', () => {
  let decisionScoreService: TorqueScoutDecisionScoreService;
  let scoringV6Service: VehicleReportScoringV6Service;

  beforeEach(() => {
    decisionScoreService = new TorqueScoutDecisionScoreService();
    scoringV6Service = new VehicleReportScoringV6Service(decisionScoreService);
  });

  const createBaseV6Scores = (overrides?: Partial<VehicleReportScoresV6>): VehicleReportScoresV6 => ({
    scoringVersion: 'v6.0',
    modelRiskScore: null,
    modelRiskState: 'INSUFFICIENT_RESEARCH',
    modelRiskQuantification: 'NOT_ESTIMABLE',
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
  // Section 13: Test Cases A through P
  // =========================================================================

  test('A: CERTIFIED_ZERO + high confidence + no condition -> high VARIANT score', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_LOW_RISK',
      modelRiskQuantification: 'CERTIFIED_ZERO',
      modelRiskScore: 0,
      confidenceScore: 90,
      vehicleConditionRisk: null,
      conditionCoverageScore: 0,
    });

    const result = decisionScoreService.calculateDecisionScore({ v6Scores });

    expect(result.scope).toBe('VARIANT');
    expect(result.modelDecisionRisk).toBe(0);
    expect(result.state).toBe('EXCELLENT');
    // Option B: RawVariantScore = 100 - 0 = 100 directly without ceiling clamping
    expect(result.score).toBe(100);
  });

  test('B: QUALITATIVE_ONLY with severity 3 -> modest penalty (Option B: 6 pts)', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      modelRiskScore: null,
      confidenceScore: 80,
      vehicleConditionRisk: null,
      conditionCoverageScore: 0,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'def_minor',
          domain: 'ELECTRONICS_BODY',
          title: 'Minor infotainment glitch',
          severityNum: 3,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    expect(result.scope).toBe('VARIANT');
    // Option B for severity 3: (0.3)^1.8 = 0.11487 => 50 * 0.11487 = 5.74 => 6 pts
    expect(result.qualitativeSeverityBurden).toBe(6);
    expect(result.modelDecisionRisk).toBe(6);
    // Option B: RawVariantScore = 100 - 6 = 94 directly
    expect(result.score).toBe(94);
    expect(result.state).toBe('EXCELLENT');
  });

  test('C: QUALITATIVE_ONLY with severity 8 -> materially larger penalty than severity 3', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      modelRiskScore: null,
      confidenceScore: 80,
      vehicleConditionRisk: null,
      conditionCoverageScore: 0,
    });

    const resultSev3 = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'def_minor',
          domain: 'ELECTRONICS_BODY',
          title: 'Minor screen delay',
          severityNum: 3,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    const resultSev8 = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'def_major',
          domain: 'POWERTRAIN_TRANS',
          title: 'DSG Mechatronic breakdown',
          severityNum: 8,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    // Option B for severity 8: (0.8)^1.8 = 0.6694 => 50 * 0.6694 = 33.47 => 33 pts
    expect(resultSev8.qualitativeSeverityBurden).toBe(33);
    expect(resultSev8.modelDecisionRisk).toBe(33);
    // Score for sev8: 100 - 33 = 67 (CAUTION)
    expect(resultSev8.score).toBe(67);
    expect(resultSev8.state).toBe('CAUTION');
    // Materially larger penalty than sev3
    expect(resultSev8.qualitativeSeverityBurden).toBeGreaterThan(resultSev3.qualitativeSeverityBurden ?? 0);
  });

  test('D: Two duplicate severity-8 reports of same failure mode -> no double penalty', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      modelRiskScore: null,
      confidenceScore: 80,
    });

    const singleDefectResult = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'def_1',
          domain: 'POWERTRAIN_TRANS',
          title: 'DSG Mechatronic fault report 1',
          severityNum: 8,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    const duplicateDefectResult = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'def_1',
          domain: 'POWERTRAIN_TRANS',
          title: 'DSG Mechatronic fault report 1',
          severityNum: 8,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
        {
          id: 'def_2',
          domain: 'POWERTRAIN_TRANS',
          title: 'DSG Mechatronic duplicate source',
          severityNum: 8,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    expect(duplicateDefectResult.qualitativeSeverityBurden).toBe(singleDefectResult.qualitativeSeverityBurden);
    expect(duplicateDefectResult.score).toBe(singleDefectResult.score);
  });

  test('E: Two distinct affected domains (severity 8 and 4) -> Q based on max + mean, not raw count', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      modelRiskScore: null,
      confidenceScore: 80,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'def_trans',
          domain: 'POWERTRAIN_TRANS',
          title: 'Transmission mechatronic',
          severityNum: 8,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
        {
          id: 'def_elec',
          domain: 'ELECTRONICS_BODY',
          title: 'Screen freeze',
          severityNum: 4,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    // Domain 1: (0.8)^1.8 = 0.6694, Domain 2: (0.4)^1.8 = 0.1918
    // Aggregate = 0.75 * 0.6694 + 0.25 * 0.4306 = 0.6097
    // Multiplier = 1 + 0.20 * 1 = 1.20 => 50 * 0.6097 * 1.20 = 36.58 => 37
    expect(result.qualitativeSeverityBurden).toBe(37);
    expect(result.modelDecisionRisk).toBe(37);
    expect(result.score).toBe(63);
    expect(result.state).toBe('CAUTION');
  });

  test('F: FULLY_QUANTIFIED -> uses numeric modelRiskScore', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'FULLY_QUANTIFIED',
      modelRiskScore: 22,
      confidenceScore: 85,
    });

    const result = decisionScoreService.calculateDecisionScore({ v6Scores });

    expect(result.modelDecisionRisk).toBe(22);
    // RawVariantScore = 100 - 22 = 78, Ceiling = 60 + 0.4*85 = 94
    expect(result.score).toBe(78);
    expect(result.state).toBe('GOOD');
  });

  test('G: PARTIAL_LOWER_BOUND with numeric risk 25 and qualitative burden 33 -> modelDecisionRisk = 33', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'PARTIAL_LOWER_BOUND',
      modelRiskScore: 25,
      confidenceScore: 80,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'qual_1',
          domain: 'POWERTRAIN_TRANS',
          severityNum: 8,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    expect(result.qualitativeSeverityBurden).toBe(33);
    // max(25, 33) = 33
    expect(result.modelDecisionRisk).toBe(33);
    expect(result.score).toBe(67);
  });

  test('H: PARTIAL_LOWER_BOUND with numeric risk 75 and qualitative burden 20 -> modelDecisionRisk = 75', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'PARTIAL_LOWER_BOUND',
      modelRiskScore: 75,
      confidenceScore: 80,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        {
          id: 'qual_1',
          domain: 'ELECTRONICS_BODY',
          severityNum: 6,
          numericEligibility: 'QUALITATIVE_ONLY',
        },
      ],
    });

    expect(result.qualitativeSeverityBurden).toBe(20);
    // max(75, 20) = 75
    expect(result.modelDecisionRisk).toBe(75);
    expect(result.score).toBe(25);
  });

  test('I: INSUFFICIENT_RESEARCH -> score null and state INSUFFICIENT_DATA', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'INSUFFICIENT_RESEARCH',
      modelRiskQuantification: 'NOT_ESTIMABLE',
      modelRiskScore: null,
      confidenceScore: 30,
    });

    const result = decisionScoreService.calculateDecisionScore({ v6Scores });

    expect(result.score).toBeNull();
    expect(result.modelDecisionRisk).toBeNull();
    expect(result.scope).toBe('INSUFFICIENT_DATA');
    expect(result.state).toBe('INSUFFICIENT_DATA');
    expect(result.limitingReason).toBeDefined();
  });

  test('J: Weak confidence (<40) -> score is null and state INSUFFICIENT_DATA', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_LOW_RISK',
      modelRiskQuantification: 'CERTIFIED_ZERO',
      modelRiskScore: 0,
      confidenceScore: 25, // Weak confidence (< 40)
    });

    const result = decisionScoreService.calculateDecisionScore({ v6Scores });

    expect(result.score).toBeNull();
    expect(result.scope).toBe('INSUFFICIENT_DATA');
    expect(result.state).toBe('INSUFFICIENT_DATA');
    expect(result.limitingReason).toContain('doğrulayamadığımız için yanıltıcı bir puan vermiyoruz');
  });

  // =========================================================================
  // Option B: Pure Risk Scoring with Independent Confidence Metric Tests
  // =========================================================================

  test('Option B Test 1: Corolla 94 raw score / Conf 59 -> Final Score 94 without ceiling clamping', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      confidenceScore: 59,
      vehicleConditionRisk: null,
      conditionCoverageScore: 0,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        { id: 'dcm', domain: 'ELECTRONICS_BODY', severityNum: 3, numericEligibility: 'QUALITATIVE_ONLY' },
      ],
    });

    // 100 - 6 = 94
    expect(result.scope).toBe('VARIANT');
    expect(result.qualitativeSeverityBurden).toBe(6);
    expect(result.score).toBe(94);
    expect(result.confidenceScore).toBe(59);
    expect(result.state).toBe('EXCELLENT');
  });

  test('Option B Test 2: Ioniq 92 raw score / Conf 59 -> Final Score 92 without ceiling clamping', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      confidenceScore: 59,
      vehicleConditionRisk: null,
      conditionCoverageScore: 0,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        { id: 'iccu', domain: 'HV_BATTERY_SYSTEM', severityNum: 3, numericEligibility: 'QUALITATIVE_ONLY' },
        { id: 'trans', domain: 'POWERTRAIN_TRANS', severityNum: 3, numericEligibility: 'QUALITATIVE_ONLY' },
        { id: 'brake', domain: 'CHASSIS_BRAKES', severityNum: 3, numericEligibility: 'QUALITATIVE_ONLY' },
      ],
    });

    // 100 - 8 = 92
    expect(result.scope).toBe('VARIANT');
    expect(result.qualitativeSeverityBurden).toBe(8);
    expect(result.score).toBe(92);
    expect(result.confidenceScore).toBe(59);
    expect(result.state).toBe('EXCELLENT');
  });

  test('Option B Test 3: Tesla 93 raw score / Conf 59 -> Final Score 93 without ceiling clamping', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      confidenceScore: 59,
      vehicleConditionRisk: null,
      conditionCoverageScore: 0,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        { id: 'fuca', domain: 'CHASSIS_BRAKES', severityNum: 3, numericEligibility: 'QUALITATIVE_ONLY' },
        { id: 'batt', domain: 'HV_BATTERY_SYSTEM', severityNum: 3, numericEligibility: 'QUALITATIVE_ONLY' },
      ],
    });

    // 100 - 7 = 93
    expect(result.scope).toBe('VARIANT');
    expect(result.qualitativeSeverityBurden).toBe(7);
    expect(result.score).toBe(93);
    expect(result.confidenceScore).toBe(59);
    expect(result.state).toBe('EXCELLENT');
  });

  test('Option B Test 4: Confidence < 40 produces NO score (INSUFFICIENT_DATA)', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      confidenceScore: 35, // Below 40 threshold
      vehicleConditionRisk: null,
      conditionCoverageScore: 0,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [
        { id: 'dcm', domain: 'ELECTRONICS_BODY', severityNum: 3, numericEligibility: 'QUALITATIVE_ONLY' },
      ],
    });

    expect(result.score).toBeNull();
    expect(result.scope).toBe('INSUFFICIENT_DATA');
    expect(result.state).toBe('INSUFFICIENT_DATA');
  });

  test('K: Specific vehicle with good condition -> VEHICLE score', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_LOW_RISK',
      modelRiskQuantification: 'CERTIFIED_ZERO',
      modelRiskScore: 0,
      vehicleConditionRisk: 0,
      conditionCoverageScore: 100,
      confidenceScore: 90,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      priceModifier: 0,
    });

    expect(result.scope).toBe('VEHICLE');
    expect(result.conditionRiskUsed).toBe(0);
    // BaseVehicleScore = 100 - (0.45*0 + 0.55*0) = 100 (Uncapped Option B)
    expect(result.score).toBe(100);
    expect(result.state).toBe('EXCELLENT');
  });

  test('Option B Vehicle Condition Ladder: CR 5 / 20 / 40 / 60 / 80 -> strictly distinct final scores', () => {
    const v6ScoresBase: Partial<VehicleReportScoresV6> = {
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      confidenceScore: 50, // Low-medium confidence (would have been clamped to ceiling 70 in past)
      conditionCoverageScore: 80,
    };

    const risks = [5, 20, 40, 60, 80];
    const scores = risks.map((cr) => {
      const v6 = createBaseV6Scores({
        ...v6ScoresBase,
        vehicleConditionRisk: cr,
      });
      return decisionScoreService.calculateDecisionScore({
        v6Scores: v6,
        qualitativeDefects: [{ id: 'egr', domain: 'EMISSIONS_EXHAUST', severityNum: 5, numericEligibility: 'QUALITATIVE_ONLY' }],
      }).score;
    });

    // Verify all scores are strictly monotonically decreasing and non-equal (no ceiling clamping)
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]!).toBeGreaterThan(scores[i + 1]!);
    }
    // With modelDecisionRisk = 14:
    // CR=5  -> 100 - (0.45*14 + 0.55*5)  = 100 - 9.05 = 91
    // CR=20 -> 100 - (0.45*14 + 0.55*20) = 100 - 17.3 = 83
    // CR=40 -> 100 - (0.45*14 + 0.55*40) = 100 - 28.3 = 72
    // CR=60 -> 100 - (0.45*14 + 0.55*60) = 100 - 39.3 = 61
    // CR=80 -> 100 - (0.45*14 + 0.55*80) = 100 - 50.3 = 50
    expect(scores).toEqual([91, 83, 72, 61, 50]);
  });

  test('L: Same model with poor vehicle condition -> substantially lower VEHICLE score', () => {
    const v6ScoresPoor = createBaseV6Scores({
      modelRiskState: 'VERIFIED_LOW_RISK',
      modelRiskQuantification: 'CERTIFIED_ZERO',
      modelRiskScore: 0,
      vehicleConditionRisk: 55, // Heavy damage / chassis risk
      conditionCoverageScore: 100,
      confidenceScore: 90,
    });

    const resultPoor = decisionScoreService.calculateDecisionScore({
      v6Scores: v6ScoresPoor,
      priceModifier: 0,
    });

    expect(resultPoor.scope).toBe('VEHICLE');
    expect(resultPoor.conditionRiskUsed).toBe(55);
    // BaseVehicleScore = 100 - (0.45*0 + 0.55*55) = 100 - 30.25 = 69.75 => 70
    // VehicleConfidenceCeiling = 40 + 0.60*90 = 94
    expect(resultPoor.score).toBe(70);
    expect(resultPoor.state).toBe('GOOD');
  });

  test('M: Same vehicle but better price -> only permitted price modifier changes score', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_LOW_RISK',
      modelRiskQuantification: 'CERTIFIED_ZERO',
      modelRiskScore: 0,
      vehicleConditionRisk: 30,
      conditionCoverageScore: 100,
      confidenceScore: 95, // High confidence so ceiling = 40 + 0.60*95 = 97 > AdjustedScores (83.5, 88.5)
    });

    const neutralPrice = decisionScoreService.calculateDecisionScore({
      v6Scores,
      priceModifier: 0,
    });

    const goodPrice = decisionScoreService.calculateDecisionScore({
      v6Scores,
      priceModifier: 5,
    });

    const overLimitPrice = decisionScoreService.calculateDecisionScore({
      v6Scores,
      priceModifier: 30, // Clamped to +10
    });

    expect((goodPrice.score ?? 0) - (neutralPrice.score ?? 0)).toBe(5);
    expect(overLimitPrice.priceModifierUsed).toBe(10);
  });

  test('N: Recall with no grounded severity -> cannot fabricate severity penalty', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_LOW_RISK',
      modelRiskQuantification: 'CERTIFIED_ZERO',
      modelRiskScore: 0,
      confidenceScore: 85,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      recalls: [
        {
          campaignNumber: 'REC-UNKNOWN',
          description: 'Unspecified label recall without consequence severity',
          // No severityNum, severityScore, severityCategory, severity, riskLevel
        },
      ],
    });

    expect(result.qualitativeSeverityBurden).toBe(0);
    expect(result.modelDecisionRisk).toBe(0);
    // Option B: 100 - 0 = 100 directly without ceiling clamping
    expect(result.score).toBe(100);
  });

  test('O: Qualitative risk with unknown prevalence -> score generated without creating prevalenceFactor', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'QUALITATIVE_ONLY',
      modelRiskScore: null,
      confidenceScore: 80,
    });

    const defect = {
      id: 'def_b48_coolant',
      domain: 'THERMAL_COOLING',
      title: 'Coolant hose degradation',
      severityNum: 6,
      numericEligibility: 'QUALITATIVE_ONLY',
      prevalenceFactor: null, // Strictly null
      frequencyFactor: null,
    };

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      qualitativeDefects: [defect],
    });

    // Score is generated purely on Option B penalty (Penalty = 20)
    expect(result.qualitativeSeverityBurden).toBe(20);
    expect(result.modelDecisionRisk).toBe(20);
    expect(result.score).toBe(80);
    expect(defect.prevalenceFactor).toBeNull();
  });

  test('P: Decision Score output never exposes "%" or probability semantics', () => {
    const v6Scores = createBaseV6Scores({
      modelRiskState: 'VERIFIED_RISK_PRESENT',
      modelRiskQuantification: 'FULLY_QUANTIFIED',
      modelRiskScore: 25,
      vehicleConditionRisk: 0,
      conditionCoverageScore: 100,
      confidenceScore: 85,
    });

    const result = decisionScoreService.calculateDecisionScore({
      v6Scores,
      priceModifier: 5,
    });

    const explanationTexts = [
      result.explanation.modelRisk,
      result.explanation.condition,
      result.explanation.confidence,
      result.explanation.price,
    ];

    explanationTexts.forEach((text) => {
      expect(text).not.toContain('%');
      expect(text.toLowerCase()).not.toContain('olasılık');
      expect(text.toLowerCase()).not.toContain('arıza ihtimali');
      expect(text.toLowerCase()).not.toContain('şans');
    });
  });

  // =========================================================================
  // Section 15: Vehicle Condition Calibration Tests (CLEAN > AVERAGE > POOR)
  // =========================================================================

  describe('Vehicle Condition Calibration (CLEAN > AVERAGE > POOR across Benchmark Models)', () => {
    test('Model 1 (Passat B8 TDI DQ200): CLEAN score > AVERAGE score > POOR score', () => {
      const passatModelContext = {
        vehicleIdentity: { brand: 'Volkswagen', model: 'Passat', modelYear: 2018, fuelType: 'Dizel' },
        verifiedResearch: {
          webSearchPerformed: true,
          groundingSources: [{ name: 'ADAC' }, { name: 'TUV' }, { name: 'AutoBild' }],
          qualitativeDefects: [
            {
              id: 'dq200_mechatronic',
              domain: 'POWERTRAIN_TRANS',
              title: 'DQ200 7-ileri kuru kavrama mekatronik arızası',
              severityNum: 8,
              numericEligibility: 'QUALITATIVE_ONLY',
            },
          ],
        },
      };

      const cleanListing = {
        heavyDamage: false,
        chassisDamage: false,
        airbagDeployed: false,
        hasFullServiceHistory: true,
        activeFaultCodes: [],
        hasOpenRecallOnVin: false,
      };

      const averageListing = {
        heavyDamage: false,
        chassisDamage: false,
        airbagDeployed: false,
        tramerAmount: 15000,
        paintedPanels: ['Sağ Çamurluk', 'Kaput'],
        hasFullServiceHistory: false,
        activeFaultCodes: [],
        hasOpenRecallOnVin: false,
      };

      const poorListing = {
        heavyDamage: true,
        chassisDamage: true,
        airbagDeployed: true,
        tramerAmount: 350000,
        activeFaultCodes: ['P0730', 'P0841'],
        hasFullServiceHistory: false,
        hasOpenRecallOnVin: true,
      };

      const cleanScores = scoringV6Service.calculateScores(passatModelContext, cleanListing);
      const avgScores = scoringV6Service.calculateScores(passatModelContext, averageListing);
      const poorScores = scoringV6Service.calculateScores(passatModelContext, poorListing);

      const cleanDecision = cleanScores.decisionScoreV1?.score ?? 0;
      const avgDecision = avgScores.decisionScoreV1?.score ?? 0;
      const poorDecision = poorScores.decisionScoreV1?.score ?? 0;

      expect(cleanScores.decisionScoreV1?.scope).toBe('VEHICLE');
      expect(avgScores.decisionScoreV1?.scope).toBe('VEHICLE');
      expect(poorScores.decisionScoreV1?.scope).toBe('VEHICLE');

      expect(cleanDecision).toBeGreaterThan(avgDecision);
      expect(avgDecision).toBeGreaterThan(poorDecision);
    });

    test('Model 2 (Toyota Corolla 1.8 Hybrid): CLEAN score > AVERAGE score > POOR score', () => {
      const corollaModelContext = {
        vehicleIdentity: { brand: 'Toyota', model: 'Corolla', modelYear: 2020, fuelType: 'Hibrit', isHybrid: true },
        verifiedResearch: {
          webSearchPerformed: true,
          groundingSources: [{ name: 'ADAC' }, { name: 'TUV' }, { name: 'WhatCar' }],
          reliabilityResearch: [],
          qualitativeDefects: [],
        },
      };

      const cleanListing = {
        heavyDamage: false,
        chassisDamage: false,
        airbagDeployed: false,
        hasFullServiceHistory: true,
        activeFaultCodes: [],
        hasOpenRecallOnVin: false,
        measuredBatterySoH: 98,
        mileage: 30000,
      };

      const averageListing = {
        heavyDamage: false,
        chassisDamage: false,
        airbagDeployed: false,
        tramerAmount: 45000,
        paintedPanels: ['Sol Ön Çamurluk', 'Sol Arka Kapı', 'Sağ Arka Çamurluk'],
        hasFullServiceHistory: false,
        activeFaultCodes: [],
        hasOpenRecallOnVin: false,
        measuredBatterySoH: 82,
        mileage: 60000,
      };

      const poorListing = {
        heavyDamage: true,
        chassisDamage: true,
        airbagDeployed: true,
        tramerAmount: 300000,
        activeFaultCodes: ['P0A80', 'P0A7F'],
        hasFullServiceHistory: false,
        hasOpenRecallOnVin: true,
        measuredBatterySoH: 60,
        mileage: 120000,
      };

      const cleanScores = scoringV6Service.calculateScores(corollaModelContext, cleanListing);
      const avgScores = scoringV6Service.calculateScores(corollaModelContext, averageListing);
      const poorScores = scoringV6Service.calculateScores(corollaModelContext, poorListing);

      const cleanDecision = cleanScores.decisionScoreV1?.score ?? 0;
      const avgDecision = avgScores.decisionScoreV1?.score ?? 0;
      const poorDecision = poorScores.decisionScoreV1?.score ?? 0;

      expect(cleanScores.decisionScoreV1?.scope).toBe('VEHICLE');
      expect(avgScores.decisionScoreV1?.scope).toBe('VEHICLE');
      expect(poorScores.decisionScoreV1?.scope).toBe('VEHICLE');

      expect(cleanDecision).toBeGreaterThan(avgDecision);
      expect(avgDecision).toBeGreaterThan(poorDecision);
    });
  });
});
