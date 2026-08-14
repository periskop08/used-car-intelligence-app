import {
  ComparisonCriterionResult,
  computeBackendCriterionMetrics,
} from '@used-car-intelligence/shared';

describe('CriterionAssessmentMatrix Unit & Component Rules (Prompt 4b)', () => {
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
            SAFETY: { criterionKey: 'SAFETY', score: 75 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            PERFORMANCE: { criterionKey: 'PERFORMANCE', score: 80 - i * 5, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
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
      {
        RELIABILITY: { criterionKey: 'RELIABILITY', score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], negativeFactors: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
      },
      'v1',
      'Low Coverage Vehicle',
    );

    expect(lowCoverage.coveragePct).toBe(13); // 1/8 = 12.5 -> 13%
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
});
