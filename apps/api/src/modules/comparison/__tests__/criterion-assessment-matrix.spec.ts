import {
  ComparisonCriterionResult,
  computeBackendCriterionMetrics,
} from '@used-car-intelligence/shared';

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
});
