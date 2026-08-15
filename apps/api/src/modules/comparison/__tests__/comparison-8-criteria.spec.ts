import {
  CRITERIA_WEIGHTS,
  computeBackendCriterionMetrics,
  validateComparisonSemantics,
  ComparisonVehicleProfile,
  VehicleComparisonResult,
} from '@used-car-intelligence/shared';

describe('TorqueScout Comparison-v7: 8-Criteria & Mandatory 8/8 Coverage Rules', () => {
  // Requirement 1 & 14: Sum of 8 criteria weights must equal 100
  // Requirement 1 & 14: Sum of 8 criteria weights must equal 100
  it('TEST 1: Sum of 8 criteria weights must equal 100 with USAGE_SUITABILITY', () => {
    const totalWeight = Object.values(CRITERIA_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(totalWeight).toBe(100);
    expect(CRITERIA_WEIGHTS.RELIABILITY).toBe(20);
    expect(CRITERIA_WEIGHTS.FAILURE_SEVERITY).toBe(15);
    expect(CRITERIA_WEIGHTS.FUEL_EFFICIENCY).toBe(10);
    expect(CRITERIA_WEIGHTS.USAGE_SUITABILITY).toBe(15);
    expect(CRITERIA_WEIGHTS.PERFORMANCE).toBe(10);
    expect(CRITERIA_WEIGHTS.COMFORT).toBe(10);
    expect(CRITERIA_WEIGHTS.PRACTICALITY).toBe(10);
    expect(CRITERIA_WEIGHTS.EQUIPMENT_TECHNOLOGY).toBe(10);
    expect((CRITERIA_WEIGHTS as any).SAFETY).toBeUndefined();
    expect((CRITERIA_WEIGHTS as any).VALUE_FOR_MONEY).toBeUndefined();
  });

  // Requirement 2: 8/8 mandatory coverage produces overallScore and overallStars
  it('TEST 2: 8/8 complete coverage produces non-null overallScore and rounded overallStars', () => {
    const full8Eval = computeBackendCriterionMetrics(
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        FAILURE_SEVERITY: { criterionKey: 'FAILURE_SEVERITY', score: 85, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        FUEL_EFFICIENCY: { criterionKey: 'FUEL_EFFICIENCY', score: 90, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        USAGE_SUITABILITY: { criterionKey: 'USAGE_SUITABILITY', score: 70, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        PERFORMANCE: { criterionKey: 'PERFORMANCE', score: 75, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        COMFORT: { criterionKey: 'COMFORT', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        PRACTICALITY: { criterionKey: 'PRACTICALITY', score: 85, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        EQUIPMENT_TECHNOLOGY: { criterionKey: 'EQUIPMENT_TECHNOLOGY', score: 75, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
      },
      'v1',
      'Full 8 Vehicle',
    );

    expect(full8Eval.coveragePct).toBe(100);
    expect(full8Eval.coverageTooLow).toBe(false);
    expect(full8Eval.overallScore).toBe(79.8);
    expect(full8Eval.overallStars).toBe(4.0);
  });

  // Requirement 3: 7/8 or lower coverage produces overallScore: null, overallStars: null
  it('TEST 3: 7/8 coverage (<8 valid criteria) produces overallScore = null, overallStars = null', () => {
    const low7Eval = computeBackendCriterionMetrics(
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        FAILURE_SEVERITY: { criterionKey: 'FAILURE_SEVERITY', score: 85, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        FUEL_EFFICIENCY: { criterionKey: 'FUEL_EFFICIENCY', score: 90, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        USAGE_SUITABILITY: { criterionKey: 'USAGE_SUITABILITY', score: 70, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        PERFORMANCE: { criterionKey: 'PERFORMANCE', score: 75, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        COMFORT: { criterionKey: 'COMFORT', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        PRACTICALITY: { criterionKey: 'PRACTICALITY', score: 85, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        // EQUIPMENT_TECHNOLOGY is missing / null
      },
      'v1',
      'Incomplete 7 Vehicle',
    );

    expect(low7Eval.coveragePct).toBe(88); // 7 of 8 criteria
    expect(low7Eval.coverageTooLow).toBe(true);
    expect(low7Eval.overallScore).toBeNull();
    expect(low7Eval.overallStars).toBeNull();
  });

  // Requirement 4: Criterion 8 can be scored without price data
  it('TEST 4: EQUIPMENT_TECHNOLOGY can be scored without price data', () => {
    const equipEval = computeBackendCriterionMetrics(
      {
        EQUIPMENT_TECHNOLOGY: {
          criterionKey: 'EQUIPMENT_TECHNOLOGY',
          score: 80,
          confidence: 'HIGH',
          summary: 'Donanım paketi zengin.',
          positiveFactors: ['Anahtarsız giriş', 'Koltuk ısıtma'],
          negativeFactors: [],
          supportingFactIds: ['fact_trim_1'],
          missingInputs: [],
          insufficientData: false,
        },
      },
      'v1',
      'Tech Vehicle',
    );

    expect(equipEval.assessments.EQUIPMENT_TECHNOLOGY.score).toBe(80);
    expect(equipEval.assessments.EQUIPMENT_TECHNOLOGY.stars).toBe(4.0);
    expect((equipEval.assessments.EQUIPMENT_TECHNOLOGY as any).marketPriceEvidence).toBeUndefined();
  });

  // Requirement 5: Monetary terms in any criterion description trigger semantic validation failure
  it('TEST 5: Monetary terms in criterion descriptions trigger semantic validation failure', () => {
    const profiles: ComparisonVehicleProfile[] = [
      {
        vehicleId: 'v1',
        displayName: 'Araç 1',
        identity: { brand: 'BrandA', model: 'ModelA', year: 2022 },
        performance: {},
        efficiency: {},
        practicality: {},
        comfortAndHandling: {},
        ownership: {},
        reliability: { problems: [] },
        sellerQuestions: [],
        inspectionChecklist: [],
        evidenceQuality: { confidence: 'HIGH', missingFields: [] },
      },
    ];

    const invalidResult: Partial<VehicleComparisonResult> = {
      executiveSummary: 'Araç 1 genel analizi tamamlanmıştır.',
      narrativeRecommendation: 'Açık konuşmak gerekirse bütçenize uygun aracı seçin.',
      riskComparison: { narrative: 'Riskler teknik açılardan incelenmiş olup 25000 TL tamir maliyeti çıkabilir.' },
      vehicleCards: [
        { vehicleId: 'v1', vehicleName: 'Araç 1', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: [], evidenceConfidence: 'HIGH' },
      ],
      scenarioRecommendations: [{ scenarioKey: 'CITY_USE', title: 'Şehir İçi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['Araç 1'], reasoning: 'Pratik' }],
    };

    const validation = validateComparisonSemantics(invalidResult, profiles);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Kriter 1-7 ve arıza anlatımlarında TL/para/tamir fiyatı tahmini kullanılamaz; teknik etki tanımlanmalıdır.');
  });

  // Requirement 6: Multi-vehicle support for 2, 5, and 10 vehicles
  it('TEST 6: Validates complete vehicle coverage for 2, 5, and 10 vehicles', () => {
    const makeProfiles = (count: number): ComparisonVehicleProfile[] =>
      Array.from({ length: count }, (_, i) => ({
        vehicleId: `v${i + 1}`,
        displayName: `Araç ${i + 1}`,
        identity: { brand: 'Brand', model: `Model${i + 1}`, year: 2022 },
        performance: {},
        efficiency: {},
        practicality: {},
        comfortAndHandling: {},
        ownership: {},
        reliability: { problems: [] },
        sellerQuestions: [],
        inspectionChecklist: [],
        evidenceQuality: { confidence: 'HIGH', missingFields: [] },
      }));

    [2, 5, 10].forEach(count => {
      const profiles = makeProfiles(count);
      const result: Partial<VehicleComparisonResult> = {
        executiveSummary: `Seçilen ${count} adet araç için derinlemesine karşılaştırma analizi yapılmış ve doğrulanmış teknik detaylar incelenmiştir.`,
        narrativeRecommendation: 'Açık konuşmak gerekirse tüm araçların teknik durumları, motor şanzıman uyumu ve bagaj kapasiteleri detaylıca kıyaslanmıştır.',
        riskComparison: { narrative: 'Riskler araçlar arasında dengeli dağılmış olup detaylı ekspertiz gerektirmektedir.' },
        vehicleCards: profiles.map(p => ({
          vehicleId: p.vehicleId,
          vehicleName: p.displayName,
          identity: {},
          strengths: ['Düşük tüketim'],
          cautions: ['Bakım hassasiyeti'],
          bestFor: ['Şehir içi'],
          notIdealFor: ['Aşırı performans'],
          prePurchaseChecks: ['Vites geçiş testi'],
          supportingFacts: ['2022 Model'],
          evidenceConfidence: 'HIGH' as const,
        })),
        scenarioRecommendations: [{
          scenarioKey: 'FUEL_ECONOMY',
          title: 'Yakıt Ekonomisi',
          recommendedVehicleIds: [profiles[0].vehicleId],
          recommendedVehicleNames: [profiles[0].displayName],
          reasoning: 'En düşük tüketim',
        }],
      };

      const validation = validateComparisonSemantics(result, profiles);
      expect(validation.errors).toHaveLength(0);
      expect(validation.isValid).toBe(true);
    });
  });
});
