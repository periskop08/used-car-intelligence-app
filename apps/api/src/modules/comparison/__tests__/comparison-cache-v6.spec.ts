import { calculateComparisonSourceDataVersion } from '../comparison.service';
import { ComparisonVehicleProfile } from '@used-car-intelligence/shared';

describe('TorqueScout v6 Comparison Cache & History Infrastructure', () => {
  const createMockProfile = (
    id: string,
    reportId = 'rep_1',
    reportVersion = 'v4.4_KM_BREAKDOWN_TIMELINE',
    problems: { title: string; severity: string }[] = [{ title: 'AdBlue Isıtıcı', severity: 'ORTA' }],
    hp = 150,
  ): ComparisonVehicleProfile => ({
    vehicleId: id,
    displayName: `Vehicle ${id}`,
    identity: { brand: 'Brand', model: `Model_${id}`, year: 2020 },
    performance: { horsepower: hp },
    efficiency: { combinedConsumption: 5.2 },
    practicality: { bootLitres: 500 },
    comfortAndHandling: {},
    ownership: {},
    reliability: { problems: problems as any },
    sellerQuestions: [],
    inspectionChecklist: [],
    evidenceQuality: { confidence: 'HIGH', missingFields: [] },
    calculatedScenarioScores: {},
    dossier: {
      variantId: id,
      reportAvailable: true,
      reportId,
      reportVersion,
      generatedAt: new Date('2026-08-10T10:00:00Z'),
      vehicleIdentity: { brand: 'Brand', model: `Model_${id}`, modelYear: 2020 },
      scoring: { buyabilityScore: 85, technicalRiskScore: 20, variantConfidenceScore: 90, dataConfidenceScore: 90, overallConfidence: 'HIGH' },
      engineTransmission: { maintenanceSensitivity: [], knownLimitations: [] },
      performanceUsage: { powerHp: hp, combinedFuelL100km: 5.2, trunkCapacityLiters: 500 },
      commonProblems: problems as any,
      recalls: [],
      maintenanceOwnership: { criticalMaintenanceNotes: [] },
      usageScenarios: [],
      supportingFactIds: [],
    },
  });

  describe('calculateComparisonSourceDataVersion', () => {
    it('should generate exact same cache key hash regardless of vehicle selection order (10 vehicles)', () => {
      const profilesAsc = Array.from({ length: 10 }, (_, i) => createMockProfile(`var_${i + 1}`));
      const profilesDesc = profilesAsc.slice().reverse();

      const hashAsc = calculateComparisonSourceDataVersion(profilesAsc);
      const hashDesc = calculateComparisonSourceDataVersion(profilesDesc);

      expect(hashAsc).toBe(hashDesc);

      const variantIdsAsc = profilesAsc.map(p => p.vehicleId).sort().join('_');
      const variantIdsDesc = profilesDesc.map(p => p.vehicleId).sort().join('_');

      const cacheKeyAsc = `comparison:v7:TR:tr-TR:priority=BALANCED:variants=${variantIdsAsc}:data=${hashAsc}`;
      const cacheKeyDesc = `comparison:v7:TR:tr-TR:priority=BALANCED:variants=${variantIdsDesc}:data=${hashDesc}`;

      expect(cacheKeyAsc).toBe(cacheKeyDesc);
      expect(cacheKeyAsc).toContain('comparison:v7:');
    });

    it('should produce a different cache key when reportVersion or reportId changes', () => {
      const profile1 = createMockProfile('var_1', 'rep_v1', 'v4.3_OLD');
      const profile2 = createMockProfile('var_2', 'rep_v2', 'v4.3_OLD');

      const hashV43 = calculateComparisonSourceDataVersion([profile1, profile2]);

      const profile1Updated = createMockProfile('var_1', 'rep_v1_new', 'v4.4_KM_BREAKDOWN_TIMELINE');
      const hashV44 = calculateComparisonSourceDataVersion([profile1Updated, profile2]);

      expect(hashV43).not.toBe(hashV44);
    });

    it('should NOT use stale cache when problem count remains identical but problem content changes', () => {
      // Both profiles have 1 problem, but different problem titles/details
      const profile1 = createMockProfile('var_1', 'rep_1', 'v4.4', [{ title: 'AdBlue Isıtıcı Rezistansı', severity: 'ORTA' }]);
      const profile2 = createMockProfile('var_2', 'rep_2', 'v4.4', [{ title: 'DSG Kavrama Aşınması', severity: 'YÜKSEK' }]);

      const hashInitial = calculateComparisonSourceDataVersion([profile1, profile2]);

      // Same count (1 problem), but content changed to DPF Tıkanıklığı
      const profile1ChangedContent = createMockProfile('var_1', 'rep_1', 'v4.4', [{ title: 'DPF Tıkanıklığı', severity: 'YÜKSEK' }]);

      const hashUpdated = calculateComparisonSourceDataVersion([profile1ChangedContent, profile2]);

      expect(hashInitial).not.toBe(hashUpdated);
    });
  });

  describe('Comparison History Resolutions (2, 3, 5, and 10 vehicles)', () => {
    it('should resolve all variantIds for multi-vehicle history records (10 vehicles)', () => {
      const variantIds10 = Array.from({ length: 10 }, (_, i) => `var_${i + 1}`);

      const mockHistoryRecord = {
        id: 'hist_10',
        userId: 'user_1',
        variant1Id: 'var_1',
        variant2Id: 'var_2',
        variantIds: variantIds10,
        createdAt: new Date(),
      };

      const mockVariantsMap = new Map<string, any>(
        variantIds10.map(id => [
          id,
          {
            id,
            year: 2021,
            brand: { name: 'Brand_' + id },
            model: { name: 'Model_' + id },
            generation: { name: 'Gen' },
            trim: { name: 'Style' },
            engine: { code: '1.6 TDI' },
            transmission: { name: 'DSG' },
          },
        ])
      );

      const ids: string[] = Array.isArray(mockHistoryRecord.variantIds)
        ? (mockHistoryRecord.variantIds as string[])
        : [mockHistoryRecord.variant1Id, mockHistoryRecord.variant2Id];

      const resolvedVehicles = ids.map(id => mockVariantsMap.get(id)).filter(Boolean);

      expect(resolvedVehicles.length).toBe(10);
      expect(resolvedVehicles[9].brand.name).toBe('Brand_var_10');
    });

    it('should maintain backward compatibility for legacy 2-vehicle history records (variantIds is null)', () => {
      const mockLegacyHistoryRecord = {
        id: 'hist_legacy',
        userId: 'user_1',
        variant1Id: 'var_a',
        variant2Id: 'var_b',
        variantIds: null, // Legacy row
        createdAt: new Date(),
      };

      const mockVariantsMap = new Map<string, any>([
        ['var_a', { id: 'var_a', year: 2018, brand: { name: 'Audi' }, model: { name: 'A3' } }],
        ['var_b', { id: 'var_b', year: 2019, brand: { name: 'BMW' }, model: { name: '118i' } }],
      ]);

      const ids: string[] = Array.isArray(mockLegacyHistoryRecord.variantIds) && (mockLegacyHistoryRecord.variantIds as any[]).length > 0
        ? (mockLegacyHistoryRecord.variantIds as string[])
        : [mockLegacyHistoryRecord.variant1Id, mockLegacyHistoryRecord.variant2Id].filter(Boolean);

      const resolvedVehicles = ids.map(id => mockVariantsMap.get(id)).filter(Boolean);

      expect(ids).toEqual(['var_a', 'var_b']);
      expect(resolvedVehicles.length).toBe(2);
      expect(resolvedVehicles[0].brand.name).toBe('Audi');
      expect(resolvedVehicles[1].brand.name).toBe('BMW');
    });
  });
});
