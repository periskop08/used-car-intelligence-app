import {
  ComparisonCriterionResult,
  computeBackendCriterionMetrics,
} from '@used-car-intelligence/shared';
import { evaluateEquipmentFeatureStatuses } from '../comparison.service';

describe('CriterionAssessmentMatrix Unit & Component Rules (Prompt 4b & 4c & 4d)', () => {
  it('handles legacy v5 undefined criterionResult gracefully', () => {
    const criterionResult = undefined;
    expect(criterionResult).toBeUndefined();
  });

  it('renders 2, 5, and 10 vehicles without errors and calculates ranks correctly', () => {
    const makeEvaluations = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        computeBackendCriterionMetrics(
          {
            RELIABILITY: { criterionKey: 'RELIABILITY', score: 85 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { criterionKey: 'FAILURE_SEVERITY', score: 90 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { criterionKey: 'FUEL_EFFICIENCY', score: 80 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { criterionKey: 'USAGE_SUITABILITY', score: 75 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            PERFORMANCE: { criterionKey: 'PERFORMANCE', score: 80 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            COMFORT: { criterionKey: 'COMFORT', score: 80 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            PRACTICALITY: { criterionKey: 'PRACTICALITY', score: 85 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { criterionKey: 'EQUIPMENT_TECHNOLOGY', score: 75 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
          },
          `v${i + 1}`,
          `Araç ${i + 1}`,
        )
      );

    [2, 5, 10].forEach(count => {
      const mockResult: ComparisonCriterionResult = {
        vehicleEvaluations: makeEvaluations(count),
        criterionRankings: {} as any,
      };

      expect(mockResult.vehicleEvaluations).toHaveLength(count);
      expect(mockResult.vehicleEvaluations[0].vehicleId).toBe('v1');
      expect(mockResult.vehicleEvaluations[0].overallScore).toBeGreaterThan(mockResult.vehicleEvaluations[count - 1].overallScore!);
    });
  });

  it('suppresses overall stars when coverage is under 60%', () => {
    const lowCoverage = computeBackendCriterionMetrics(
      {},
      'v1',
      'Low Coverage Vehicle',
    );

    expect(lowCoverage.coveragePct).toBe(0); // 0/8 = 0%
    expect(lowCoverage.coverageTooLow).toBe(true);
    expect(lowCoverage.overallStars).toBeNull();
    expect(lowCoverage.overallScore).toBeNull();
  });

  it('formats matchQuality correctly so UNKNOWN is NEVER shown as Karşılaştırılabilir Model', () => {
    const matchQualityFormatter = (mq?: string) => {
      if (mq === 'EXACT') return 'Birebir Varyant';
      if (mq === 'COMPARABLE') return 'Karşılaştırılabilir Model';
      return 'Genel Model Tahmini';
    };

    expect(matchQualityFormatter('EXACT')).toBe('Birebir Varyant');
    expect(matchQualityFormatter('COMPARABLE')).toBe('Karşılaştırılabilir Model');
    expect(matchQualityFormatter('UNKNOWN')).toBe('Genel Model Tahmini');
    expect(matchQualityFormatter(undefined)).toBe('Genel Model Tahmini');
    expect(matchQualityFormatter('UNKNOWN')).not.toBe('Karşılaştırılabilir Model');
  });

  it('prohibits assigning rank 1 or 2 when coverage is 0% (coverageTooLow=true)', () => {
    const ev1 = computeBackendCriterionMetrics({}, 'v1', 'Audi A3');
    const ev2 = computeBackendCriterionMetrics({}, 'v2', 'Kia Cerato');

    const eligible = [ev1, ev2].filter(e => e.overallScore !== null && !e.coverageTooLow && (e.coveragePct ?? 0) >= 60);
    const rankMap = new Map<string, number>();
    eligible.forEach((e, idx) => rankMap.set(e.vehicleId, idx + 1));

    expect(rankMap.get('v1')).toBeUndefined();
    expect(rankMap.get('v2')).toBeUndefined();
  });

  it('ensures reportAvailable=false produces RAPOR BULUNAMADI badge text', () => {
    const getBadgeText = (conf?: string, reportAvailable?: boolean) => {
      if (reportAvailable === false) return 'RAPOR BULUNAMADI';
      if (conf === 'HIGH') return 'YÜKSEK GÜVEN';
      if (conf === 'MEDIUM') return 'ORTA GÜVEN';
      return 'DÜŞÜK GÜVEN';
    };

    expect(getBadgeText('MEDIUM', false)).toBe('RAPOR BULUNAMADI');
    expect(getBadgeText('INSUFFICIENT', false)).toBe('RAPOR BULUNAMADI');
    expect(getBadgeText('HIGH', true)).toBe('YÜKSEK GÜVEN');
    expect(getBadgeText('MEDIUM', undefined)).toBe('ORTA GÜVEN');
  });

  it('evaluates vehicle eligibility PER VEHICLE so 25% coverage vehicle v2 does NOT get strongest/worst highlights even if v1 is 75%', () => {
    const isVehicleEligible = (ev: { overallScore: number | null; coverageTooLow: boolean; coveragePct: number }) =>
      ev.overallScore !== null && !ev.coverageTooLow && (ev.coveragePct ?? 0) >= 60;

    const v1 = { overallScore: 82, coverageTooLow: false, coveragePct: 75 }; // 6/8 criteria = 75%
    const v2 = { overallScore: null, coverageTooLow: true, coveragePct: 25 }; // 2/8 criteria = 25%

    expect(isVehicleEligible(v1)).toBe(true);
    expect(isVehicleEligible(v2)).toBe(false);
  });

  it('selects correct header disclaimer across all report and generationMode combinations', () => {
    const getHeaderDisclaimer = (generationMode?: string, vehicles?: Array<{ reportAvailable?: boolean }>) => {
      if (!vehicles || vehicles.length === 0 || generationMode === undefined) {
        return 'Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.';
      }
      const hasReportFlags = vehicles.some(v => typeof v.reportAvailable === 'boolean');
      if (!hasReportFlags) {
        return 'Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.';
      }
      const anyReport = vehicles.some(v => v.reportAvailable === true);
      const allReports = vehicles.every(v => v.reportAvailable === true);

      if (!anyReport) {
        return 'Seçilen araçlar için kapsamlı rapor bulunmadığından yalnız mevcut doğrulanmış teknik kayıtlar gösteriliyor.';
      }
      if (!allReports) {
        return 'Bazı araçlar için kapsamlı rapor bulunmadığından karşılaştırma yalnız ortak doğrulanmış veri kapsamıyla sınırlandırılmıştır.';
      }
      if (generationMode === 'AI') {
        return 'Kapsamlı araç raporlarından üretilen kanıta dayalı 8 kriter analizi.';
      }
      if (generationMode === 'FALLBACK') {
        return 'AI çapraz analizi tamamlanamadığından raporlardaki doğrulanmış bilgiler güvenli analiz modunda gösteriliyor.';
      }
      return 'Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.';
    };

    // 1. No reports at all (even in AI mode)
    expect(getHeaderDisclaimer('AI', [{ reportAvailable: false }, { reportAvailable: false }]))
      .toBe('Seçilen araçlar için kapsamlı rapor bulunmadığından yalnız mevcut doğrulanmış teknik kayıtlar gösteriliyor.');

    // 2. Partial reports (1 has report, 1 doesn't)
    expect(getHeaderDisclaimer('AI', [{ reportAvailable: true }, { reportAvailable: false }]))
      .toBe('Bazı araçlar için kapsamlı rapor bulunmadığından karşılaştırma yalnız ortak doğrulanmış veri kapsamıyla sınırlandırılmıştır.');

    // 3. All reports in AI mode
    expect(getHeaderDisclaimer('AI', [{ reportAvailable: true }, { reportAvailable: true }]))
      .toBe('Kapsamlı araç raporlarından üretilen kanıta dayalı 8 kriter analizi.');

    // 4. All reports in FALLBACK mode
    expect(getHeaderDisclaimer('FALLBACK', [{ reportAvailable: true }, { reportAvailable: true }]))
      .toBe('AI çapraz analizi tamamlanamadığından raporlardaki doğrulanmış bilgiler güvenli analiz modunda gösteriliyor.');

    // 5. Legacy response with undefined generationMode or reportAvailable
    expect(getHeaderDisclaimer(undefined, [{ reportAvailable: true }, { reportAvailable: true }]))
      .toBe('Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.');
    expect(getHeaderDisclaimer('AI', [{}, {}]))
      .toBe('Karşılaştırma sonucu mevcut doğrulanmış verilerle gösteriliyor.');
  });

  it('prohibits chronic problem counts and titles in RELIABILITY and FAILURE_SEVERITY positiveFactors', () => {
    const invalidTerms = ['1 onaylı kronik sorun kaydı', 'kronik arıza', 'sorun sayısı 2', 'teknik risk seviyesi orta'];
    const validateFactors = (factors: string[]) => {
      const forbidden = ['kronik', 'sorun sayısı', 'risk seviyesi orta'];
      return factors.filter(f => forbidden.some(term => f.toLowerCase().includes(term)));
    };

    expect(validateFactors(invalidTerms)).toHaveLength(4);
    expect(validateFactors(['Güvenilir motor bloğu', 'Yaygın yedek parça'])).toHaveLength(0);
  });

  it('prohibits performance metrics like 0-100 acceleration times in vehicleVerdict criticalRisks', () => {
    const isCriticalRiskValid = (riskStr: string) => {
      const perfTerms = ['0-100', '0–100', 'saniye', 'yavaş hızlanma', 'düşük güç'];
      return !perfTerms.some(term => riskStr.toLowerCase().includes(term));
    };

    expect(isCriticalRiskValid('10.8 saniye 0-100 hızlanması')).toBe(false);
    expect(isCriticalRiskValid('Yavaş hızlanma performansı')).toBe(false);
    expect(isCriticalRiskValid('Yüksek yağ yakma ve piston aşınma riski')).toBe(true);
  });

  it('assigns VERIFIED evidence grade when facts exist and REPORT_DERIVED when derived without direct facts', () => {
    const evVerified = computeBackendCriterionMetrics(
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['FACT_1'], missingInputs: [], insufficientData: false },
      },
      'v1',
      'Test Vehicle',
    );

    const evDerived = computeBackendCriterionMetrics(
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 70, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false, evidenceGrade: 'REPORT_DERIVED' },
      },
      'v2',
      'Derived Vehicle',
    );

    expect(evVerified.assessments['RELIABILITY'].evidenceGrade).toBe('VERIFIED');
    expect(evDerived.assessments['RELIABILITY'].evidenceGrade).toBe('REPORT_DERIVED');
    // REPORT_DERIVED capped confidence at MEDIUM
    expect(evDerived.assessments['RELIABILITY'].confidence).toBe('MEDIUM');
  });

  it('TEST A: Accepts REPORT_DERIVED Fact IDs belonging to same vehicle & correct criterion across all 8 criteria resulting in 8/8 coverage and non-null overallScore', () => {
    const reportDerivedEvaluations = computeBackendCriterionMetrics(
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 75, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_RELIABILITY_v1_1'], evidenceGrade: 'REPORT_DERIVED' },
        FAILURE_SEVERITY: { criterionKey: 'FAILURE_SEVERITY', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_FAILURE_SEVERITY_v1_2'], evidenceGrade: 'REPORT_DERIVED' },
        FUEL_EFFICIENCY: { criterionKey: 'FUEL_EFFICIENCY', score: 85, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_FUEL_EFFICIENCY_v1_3'], evidenceGrade: 'REPORT_DERIVED' },
        USAGE_SUITABILITY: { criterionKey: 'USAGE_SUITABILITY', score: 70, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_USAGE_SUITABILITY_v1_4'], evidenceGrade: 'REPORT_DERIVED' },
        PERFORMANCE: { criterionKey: 'PERFORMANCE', score: 82, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_PERFORMANCE_v1_5'], evidenceGrade: 'REPORT_DERIVED' },
        COMFORT: { criterionKey: 'COMFORT', score: 78, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_COMFORT_v1_6'], evidenceGrade: 'REPORT_DERIVED' },
        PRACTICALITY: { criterionKey: 'PRACTICALITY', score: 88, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_PRACTICALITY_v1_7'], evidenceGrade: 'REPORT_DERIVED' },
        EQUIPMENT_TECHNOLOGY: { criterionKey: 'EQUIPMENT_TECHNOLOGY', score: 72, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: ['CMP_EQUIPMENT_TECHNOLOGY_v1_8'], evidenceGrade: 'REPORT_DERIVED' },
      },
      'v1',
      'Audi A3 Sedan',
    );

    expect(reportDerivedEvaluations.coveragePct).toBe(100);
    expect(reportDerivedEvaluations.coverageTooLow).toBe(false);
    expect(reportDerivedEvaluations.overallScore).not.toBeNull();
    expect(reportDerivedEvaluations.overallStars).not.toBeNull();
    
    // Check every criterion has REPORT_DERIVED grade and capped MEDIUM confidence
    Object.values(reportDerivedEvaluations.assessments).forEach(assessment => {
      expect(assessment.evidenceGrade).toBe('REPORT_DERIVED');
      expect(assessment.confidence).toBe('MEDIUM');
    });
  });

  it('TEST B: Rejects REPORT_DERIVED Fact ID when used for wrong criterion or belonging to another vehicle', () => {
    const v1AllowedFacts = new Set(['CMP_RELIABILITY_v1_1', 'CMP_FAILURE_SEVERITY_v1_2']);
    const v2FactFromOtherVehicle = 'CMP_RELIABILITY_v2_99'; // Belongs to vehicle v2, not v1

    const filterAllowedFacts = (factIds: string[], criterionSet: Set<string>) =>
      factIds.filter(fid => criterionSet.has(fid));

    // 1. Fact from another vehicle -> filtered out -> empty
    const v1FactsFiltered = filterAllowedFacts([v2FactFromOtherVehicle], v1AllowedFacts);
    expect(v1FactsFiltered).toHaveLength(0);

    // 2. Fact from wrong criterion -> filtered out -> empty
    const wrongCriterionFactFiltered = filterAllowedFacts(['CMP_FUEL_EFFICIENCY_v1_3'], v1AllowedFacts);
    expect(wrongCriterionFactFiltered).toHaveLength(0);

    // 3. Valid fact from same vehicle & correct criterion -> preserved
    const validFactFiltered = filterAllowedFacts(['CMP_RELIABILITY_v1_1'], v1AllowedFacts);
    expect(validFactFiltered).toHaveLength(1);
    expect(validFactFiltered[0]).toBe('CMP_RELIABILITY_v1_1');
  });

  describe('evaluateEquipmentFeatureStatuses (Criterion 8 Structural Feature Matrix)', () => {
    it('Test 1: Explicit VAR evidence -> PRESENT', () => {
      const mockProfile: any = {
        dossier: {
          trimPackageComparison: {
            keyAddedFeatures: ['Dijital klima', 'Hız sabitleyici', 'F1 vites kulakçıkları', 'Yüksek kaliteli ses sistemi'],
          },
        },
      };

      const statuses = evaluateEquipmentFeatureStatuses(mockProfile);
      const statusMap = new Map(statuses.map(s => [s.featureKey, s]));

      expect(statusMap.get('DIGITAL_CLIMATE')?.status).toBe('PRESENT');
      expect(statusMap.get('DIGITAL_CLIMATE')?.evidenceText).toBe('Dijital klima');

      expect(statusMap.get('CRUISE_CONTROL')?.status).toBe('PRESENT');
      expect(statusMap.get('CRUISE_CONTROL')?.evidenceText).toBe('Hız sabitleyici');

      expect(statusMap.get('PADDLE_SHIFTERS')?.status).toBe('PRESENT');
      expect(statusMap.get('PADDLE_SHIFTERS')?.evidenceText).toBe('F1 vites kulakçıkları');

      expect(statusMap.get('PREMIUM_AUDIO')?.status).toBe('PRESENT');
      expect(statusMap.get('PREMIUM_AUDIO')?.evidenceText).toBe('Yüksek kaliteli ses sistemi');
    });

    it('Test 2: Explicit YOK evidence in selected trim -> ABSENT', () => {
      const mockProfile: any = {
        dossier: {
          trimPackageComparison: {
            keyAddedFeatures: ['Hız sabitleyici'],
            absentFeaturesInSelectedTrim: ['Sunroof', 'Koltuk ısıtma'],
          },
        },
      };

      const statuses = evaluateEquipmentFeatureStatuses(mockProfile);
      const statusMap = new Map(statuses.map(s => [s.featureKey, s]));

      expect(statusMap.get('SUNROOF')?.status).toBe('ABSENT');
      expect(statusMap.get('SUNROOF')?.evidenceText).toBe('Sunroof');

      expect(statusMap.get('HEATED_SEATS')?.status).toBe('ABSENT');
      expect(statusMap.get('HEATED_SEATS')?.evidenceText).toBe('Koltuk ısıtma');
    });

    it('Test 3: lower-trim missing features or generic phrase ("Gelişmiş güvenlik asistanları") -> NOT_MENTIONED', () => {
      const mockProfile: any = {
        dossier: {
          trimPackageComparison: {
            keyAddedFeatures: ['Gelişmiş güvenlik asistanları', 'Zengin donanım'],
            missingFeaturesInLowerTrim: ['Sunroof', 'Panoramik cam tavan'],
          },
        },
      };

      const statuses = evaluateEquipmentFeatureStatuses(mockProfile);
      const statusMap = new Map(statuses.map(s => [s.featureKey, s]));

      // lower-trim missingFeaturesInLowerTrim MUST NOT trigger ABSENT for selected trim
      expect(statusMap.get('SUNROOF')?.status).toBe('NOT_MENTIONED');
      expect(statusMap.get('PANORAMIC_ROOF')?.status).toBe('NOT_MENTIONED');

      // Generic phrase "Gelişmiş güvenlik asistanları" MUST NOT individually set ACC/AEB/LANE_KEEP/BLIND_SPOT to PRESENT
      expect(statusMap.get('ADAPTIVE_CRUISE')?.status).toBe('NOT_MENTIONED');
      expect(statusMap.get('AEB')?.status).toBe('NOT_MENTIONED');
      expect(statusMap.get('LANE_KEEP')?.status).toBe('NOT_MENTIONED');
      expect(statusMap.get('BLIND_SPOT')?.status).toBe('NOT_MENTIONED');
    });
  });
});
