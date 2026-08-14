import {
  CRITERIA_WEIGHTS,
  computeBackendCriterionMetrics,
  validateComparisonSemantics,
  ComparisonVehicleProfile,
  VehicleComparisonResult,
} from '@used-car-intelligence/shared';

describe('TorqueScout 8-Criteria Assessment & Semantic Rules (Prompt 4a & Fixes)', () => {
  // Test 8: Sum of weights must equal 100
  it('TEST 8: Sum of 8 criteria weights must equal 100', () => {
    const totalWeight = Object.values(CRITERIA_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(totalWeight).toBe(100);
    expect(CRITERIA_WEIGHTS.RELIABILITY).toBe(20);
    expect(CRITERIA_WEIGHTS.FAILURE_SEVERITY).toBe(15);
    expect(CRITERIA_WEIGHTS.FUEL_EFFICIENCY).toBe(10);
    expect(CRITERIA_WEIGHTS.SAFETY).toBe(15);
    expect(CRITERIA_WEIGHTS.PERFORMANCE).toBe(10);
    expect(CRITERIA_WEIGHTS.COMFORT).toBe(10);
    expect(CRITERIA_WEIGHTS.PRACTICALITY).toBe(10);
    expect(CRITERIA_WEIGHTS.VALUE_FOR_MONEY).toBe(10);
  });

  // Test: AI's unique score (e.g. 73) is passed through directly into output without fallback override
  it('TEST: AI unique score (73) is passed through directly into output without fallback override', () => {
    const aiCriterionAssessments = {
      RELIABILITY: {
        criterionKey: 'RELIABILITY',
        score: 73,
        confidence: 'HIGH',
        summary: 'Özel AI analizi sonucu 73 puan.',
        positiveFactors: ['Detaylı AI analizi'],
        compromises: [],
        supportingFactIds: [],
        missingInputs: [],
        insufficientData: false,
      },
    };

    const evaluation = computeBackendCriterionMetrics(
      aiCriterionAssessments as any,
      'v1',
      'AI Evaluated Vehicle',
    );

    expect(evaluation.assessments.RELIABILITY.score).toBe(73);
    expect(evaluation.assessments.RELIABILITY.stars).toBe(3.5); // 73 / 20 = 3.65 -> rounded to nearest 0.5 = 3.5 stars
  });

  // Test 1: Zero problem record must NOT generate reliability winner based on zero count
  it('TEST 1: Zero problem record does not declare vehicle reliability winner when risk scores are absent', () => {
    const profiles: ComparisonVehicleProfile[] = [
      {
        vehicleId: 'v1',
        displayName: 'Araç 1 (0 kronik)',
        identity: { brand: 'BrandA', model: 'ModelA', year: 2022 },
        performance: {},
        efficiency: {},
        practicality: {},
        comfortAndHandling: {},
        ownership: {},
        reliability: { problems: [] },
        sellerQuestions: [],
        inspectionChecklist: [],
        evidenceQuality: { confidence: 'LOW', missingFields: ['riskScore'] },
      },
      {
        vehicleId: 'v2',
        displayName: 'Araç 2 (1 kronik)',
        identity: { brand: 'BrandB', model: 'ModelB', year: 2022 },
        performance: {},
        efficiency: {},
        practicality: {},
        comfortAndHandling: {},
        ownership: {},
        reliability: { problems: [{ title: 'Sensör arızası', severity: 'LOW' }] },
        sellerQuestions: [],
        inspectionChecklist: [],
        evidenceQuality: { confidence: 'LOW', missingFields: ['riskScore'] },
      },
    ];

    const result: Partial<VehicleComparisonResult> = {
      executiveSummary: 'Araç 1, 0 adet kronik arıza kaydı olduğu için en güvenilir araçtır ve kazanan ilan edilmiştir.',
      narrativeRecommendation: 'Detaylı karşılaştırma analizi sonuçlanmıştır. Araçların teknik verileri detaylıca kıyaslanmıştır.',
      riskComparison: { narrative: 'Kronik arıza ve mekanik riskler veritabanı kayıtları ışığında detaylıca kıyaslanmıştır.' },
      vehicleCards: [
        { vehicleId: 'v1', vehicleName: 'Araç 1', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: [], evidenceConfidence: 'LOW' },
        { vehicleId: 'v2', vehicleName: 'Araç 2', identity: {}, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: [], evidenceConfidence: 'LOW' },
      ],
      scenarioRecommendations: [{ scenarioKey: 'RELIABILITY', title: 'Güvenilirlik', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['Araç 1'], reasoning: '0 arıza kaydı olduğu için' }],
    };

    const validation = validateComparisonSemantics(result, profiles);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Sıfır kronik sorun kaydına veya arıza sayısına dayanarak araç en sorunsuz veya kazanan ilan edilemez.');
  });

  // Test 2: Multimedia freeze vs transmission disassembly must produce different severity scores in Criterion 2
  it('TEST 2: Multimedia freeze vs transmission disassembly produce different Criterion 2 severity scores', () => {
    const mildEval = computeBackendCriterionMetrics(
      {
        FAILURE_SEVERITY: {
          criterionKey: 'FAILURE_SEVERITY',
          score: 85,
          confidence: 'HIGH',
          summary: 'Yalnızca multimedya donması gibi basit yazılım hassasiyetleri bulunuyor.',
          positiveFactors: ['Ağır mekanik risk yok'],
          negativeFactors: ['Multimedya yazılım donması'],
          supportingFactIds: [],
          missingInputs: [],
          insufficientData: false,
        },
      },
      'v1',
      'Mild Vehicle',
    );

    const severeEval = computeBackendCriterionMetrics(
      {
        FAILURE_SEVERITY: {
          criterionKey: 'FAILURE_SEVERITY',
          score: 35,
          confidence: 'HIGH',
          summary: 'Şanzıman sökümü ve kavrama değişimi gerektiren ağır mekanik arıza riski.',
          positiveFactors: [],
          negativeFactors: ['Şanzıman sökümü ve kavrama arızası'],
          supportingFactIds: [],
          missingInputs: [],
          insufficientData: false,
        },
      },
      'v2',
      'Severe Vehicle',
    );

    expect(mildEval.assessments.FAILURE_SEVERITY.score).toBe(85);
    expect(severeEval.assessments.FAILURE_SEVERITY.score).toBe(35);
    expect(mildEval.assessments.FAILURE_SEVERITY.stars).toBe(4.5);
    expect(severeEval.assessments.FAILURE_SEVERITY.stars).toBe(2.0);
    expect(mildEval.assessments.FAILURE_SEVERITY.score).toBeGreaterThan(severeEval.assessments.FAILURE_SEVERITY.score!);
  });

  // Test 3: TL, ₺, maintenance fee, part price, labor estimate MUST NOT exist in risk descriptions
  it('TEST 3: Monetary repair/part cost estimates outside Criterion 8 are rejected by semantic validation', () => {
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
      executiveSummary: 'Araç 1 genel olarak dengeli bir seçenektir. Araçların teknik verileri detaylıca kıyaslanmıştır.',
      narrativeRecommendation: 'Açık konuşmak gerekirse bu araç tercih edilebilir. Kullanıcının bütçesine göre detaylı seçenek sunar.',
      riskComparison: { narrative: 'Bu arıza 45000 TL tamir fiyatı çıkarabilir ve maliyeti yüksektir.' },
      vehicleCards: [
        { vehicleId: 'v1', vehicleName: 'Araç 1', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: [], evidenceConfidence: 'HIGH' },
      ],
      scenarioRecommendations: [{ scenarioKey: 'CITY_USE', title: 'Şehir İçi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['Araç 1'], reasoning: 'Pratik boyutlar' }],
    };

    const validation = validateComparisonSemantics(invalidResult, profiles);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Kriter 1-7 ve arıza anlatımlarında TL/para/tamir fiyatı tahmini kullanılamaz; teknik etki tanımlanmalıdır.');
  });

  // Test 4 & 5: Market price evidence used ONLY in Criterion 8; null if missing
  it('TEST 4 & 5: Market price evidence belongs strictly in Criterion 8; score is null when missing', () => {
    const withPriceEval = computeBackendCriterionMetrics(
      {
        VALUE_FOR_MONEY: {
          criterionKey: 'VALUE_FOR_MONEY',
          score: 80,
          confidence: 'HIGH',
          summary: 'Piyasa fiyat aralığı 1.200.000 TL - 1.350.000 TL.',
          positiveFactors: [],
          negativeFactors: [],
          supportingFactIds: [],
          missingInputs: [],
          insufficientData: false,
          marketPriceEvidence: {
            minPrice: 1200000,
            maxPrice: 1350000,
            currency: 'TRY',
            sampleCount: 15,
            sourceType: 'SNAPSHOT',
          },
        },
      },
      'v1',
      'Priced Vehicle',
    );

    const withoutPriceEval = computeBackendCriterionMetrics(
      {
        VALUE_FOR_MONEY: {
          criterionKey: 'VALUE_FOR_MONEY',
          score: null,
          confidence: 'INSUFFICIENT',
          summary: 'Güncel piyasa fiyat verisi bulunmuyor.',
          positiveFactors: [],
          negativeFactors: [],
          supportingFactIds: [],
          missingInputs: ['Güncel piyasa fiyat verisi eksik'],
          insufficientData: true,
        },
      },
      'v2',
      'Unpriced Vehicle',
    );

    expect(withPriceEval.assessments.VALUE_FOR_MONEY.score).toBe(80);
    expect(withPriceEval.assessments.VALUE_FOR_MONEY.marketPriceEvidence?.minPrice).toBe(1200000);

    expect(withoutPriceEval.assessments.VALUE_FOR_MONEY.score).toBeNull();
    expect(withoutPriceEval.assessments.VALUE_FOR_MONEY.insufficientData).toBe(true);
  });

  // Test: Missing Comfort evidence yields score = null
  it('TEST: Missing comfort evidence yields score = null', () => {
    const comfortEval = computeBackendCriterionMetrics(
      {
        COMFORT: {
          criterionKey: 'COMFORT',
          score: null,
          confidence: 'INSUFFICIENT',
          summary: 'Konfor ve kabin yalıtım verisi bulunmuyor.',
          positiveFactors: [],
          negativeFactors: [],
          supportingFactIds: [],
          missingInputs: ['Konfor verisi eksik'],
          insufficientData: true,
        },
      },
      'v1',
      'No Comfort Vehicle',
    );

    expect(comfortEval.assessments.COMFORT.score).toBeNull();
    expect(comfortEval.assessments.COMFORT.insufficientData).toBe(true);
    expect(comfortEval.assessments.COMFORT.stars).toBeNull();
  });

  // Test: Missing Safety evidence yields score = null
  it('TEST: Missing safety evidence yields score = null', () => {
    const safetyEval = computeBackendCriterionMetrics(
      {
        SAFETY: {
          criterionKey: 'SAFETY',
          score: null,
          confidence: 'INSUFFICIENT',
          summary: 'Güvenlik çarpışma testi ve ADAS verisi bulunmuyor.',
          positiveFactors: [],
          negativeFactors: [],
          supportingFactIds: [],
          missingInputs: ['Güvenlik verisi eksik'],
          insufficientData: true,
        },
      },
      'v1',
      'No Safety Vehicle',
    );

    expect(safetyEval.assessments.SAFETY.score).toBeNull();
    expect(safetyEval.assessments.SAFETY.insufficientData).toBe(true);
    expect(safetyEval.assessments.SAFETY.stars).toBeNull();
  });

  // Test: Criterion 8 with price but without trim/package evidence does not yield automatic 75
  it('TEST: Criterion 8 with price but without trim/package evidence yields score = null', () => {
    const valueEval = computeBackendCriterionMetrics(
      {
        VALUE_FOR_MONEY: {
          criterionKey: 'VALUE_FOR_MONEY',
          score: null,
          confidence: 'INSUFFICIENT',
          summary: 'Piyasa fiyatı var ancak donanım paketi karşılaştırma verisi eksik.',
          positiveFactors: [],
          negativeFactors: [],
          supportingFactIds: [],
          missingInputs: ['Donanım paketi karşılaştırması eksik'],
          insufficientData: true,
        },
      },
      'v1',
      'No Trim Evidence Vehicle',
    );

    expect(valueEval.assessments.VALUE_FOR_MONEY.score).toBeNull();
    expect(valueEval.assessments.VALUE_FOR_MONEY.insufficientData).toBe(true);
  });

  // Test: Monetary terms in criterionAssessments for criteria 1-7 fail validation
  it('TEST: Monetary text in criteria 1-7 inside criterionAssessments is rejected by semantic validator', () => {
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

    const invalidCriterionResult: Partial<VehicleComparisonResult> = {
      executiveSummary: 'Araç 1 genel analizi tamamlanmıştır. Tüm doğrulanmış teknik detaylar incelenmiştir.',
      narrativeRecommendation: 'Açık konuşmak gerekirse bütçenize uygun aracı seçin. Karşılaştırma detayları incelenmiştir.',
      riskComparison: { narrative: 'Riskler teknik açılardan incelenmiş olup detaylı ekspertiz önerilir.' },
      vehicleCards: [
        { vehicleId: 'v1', vehicleName: 'Araç 1', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: [], evidenceConfidence: 'HIGH' },
      ],
      scenarioRecommendations: [{ scenarioKey: 'CITY_USE', title: 'Şehir İçi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['Araç 1'], reasoning: 'Pratik' }],
      criterionResult: {
        vehicleEvaluations: [
          {
            vehicleId: 'v1',
            vehicleName: 'Araç 1',
            overallScore: 80,
            overallStars: 4.0,
            coveragePct: 100,
            coverageTooLow: false,
            assessments: {
              RELIABILITY: {
                criterionKey: 'RELIABILITY',
                score: 80,
                stars: 4.0,
                confidence: 'HIGH',
                summary: 'Bu araç 50000 TL tamir maliyeti çıkarabilir.',
                positiveFactors: [],
                negativeFactors: [],
                supportingFactIds: [],
              },
            } as any,
          },
        ],
        criterionRankings: {} as any,
      },
    };

    const validation = validateComparisonSemantics(invalidCriterionResult, profiles);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('TL/para/tamir fiyatı tahmini tespit edildi'))).toBe(true);
  });

  // Test 6: Backend coverage check - under 60% coverage produces no overall star rating
  it('TEST 6: Coverage under 60% (<5 valid criteria) suppresses overall star rating', () => {
    const lowCoverageEval = computeBackendCriterionMetrics(
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        FUEL_EFFICIENCY: { criterionKey: 'FUEL_EFFICIENCY', score: 90, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
      },
      'v1',
      'Low Coverage Vehicle',
    );

    expect(lowCoverageEval.coveragePct).toBe(25); // 2 of 8 criteria
    expect(lowCoverageEval.coverageTooLow).toBe(true);
    expect(lowCoverageEval.overallScore).toBeNull();
    expect(lowCoverageEval.overallStars).toBeNull();
  });

  // Test 7: Valid coverage (>= 60%) produces weighted normalized overall score and stars
  it('TEST 7: Valid coverage (>=60%) calculates weighted normalized score and 0.5-rounded stars', () => {
    const validCoverageEval = computeBackendCriterionMetrics(
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        FAILURE_SEVERITY: { criterionKey: 'FAILURE_SEVERITY', score: 85, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        FUEL_EFFICIENCY: { criterionKey: 'FUEL_EFFICIENCY', score: 90, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        SAFETY: { criterionKey: 'SAFETY', score: 70, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
        PERFORMANCE: { criterionKey: 'PERFORMANCE', score: 75, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
      },
      'v1',
      'Valid Vehicle',
    );

    expect(validCoverageEval.coveragePct).toBe(63); // 5 of 8 criteria
    expect(validCoverageEval.coverageTooLow).toBe(false);
    expect(validCoverageEval.overallScore).toBeGreaterThan(0);
    expect(validCoverageEval.overallStars).toBeGreaterThan(0);
    expect(validCoverageEval.overallStars! % 0.5).toBe(0);
  });

  // Test 9: Unsourced claims rejected by semantic validation
  it('TEST 9: Unsourced winner claims fail semantic validation', () => {
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

    const invalidWinnerResult: Partial<VehicleComparisonResult> = {
      executiveSummary: 'Araç 1 genel analizi tamamlanmıştır. Tüm doğrulanmış teknik detaylar incelenmiştir.',
      narrativeRecommendation: 'Açık konuşmak gerekirse bütçenize uygun aracı seçin. Karşılaştırma detayları incelenmiştir.',
      overallRecommendation: {
        vehicleId: 'UNKNOWN_VEHICLE_ID',
        vehicleName: 'Bilinmeyen Araç',
        label: 'En Dengeli Seçenek',
        reasoning: 'Gerekçesiz kazanan',
        confidence: 'HIGH',
      },
      vehicleCards: [
        { vehicleId: 'v1', vehicleName: 'Araç 1', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: [], evidenceConfidence: 'HIGH' },
      ],
      scenarioRecommendations: [{ scenarioKey: 'CITY_USE', title: 'Şehir İçi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['Araç 1'], reasoning: 'Pratik' }],
    };

    const validation = validateComparisonSemantics(invalidWinnerResult, profiles);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("Genel kazanan araç ID'si (UNKNOWN_VEHICLE_ID) seçili araçlar arasında yok.");
  });

  // Test 10: Multi-vehicle support for 2, 5, and 10 vehicles
  it('TEST 10: Validates complete vehicle coverage for 2, 5, and 10 vehicles', () => {
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
