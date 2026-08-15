import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ComparisonService, getVerifiedMarketPriceEvidence, computeSourceDataVersionFromProfiles } from '../comparison.service';
import { ComparisonReportLoaderService } from '../comparison-report-loader.service';
import { FeatureLimitService } from '../../feature-limit/feature-limit.service';
import { SubscriptionService } from '../../subscription/subscription.service';
import { PrismaService } from '../../../prisma.service';
import { CURRENT_REPORT_VERSION } from '../../vehicle-report/vehicle-report-cache.service';
import { SubscriptionTier, FeatureKey } from '@prisma/client';
import { formatFuelType, CRITERIA_WEIGHTS } from '@used-car-intelligence/shared';
import * as fs from 'fs';
import * as path from 'path';

describe('ComparisonService Real Service Integration & Comprehensive Regression Tests', () => {
  let service: ComparisonService;
  let loaderService: ComparisonReportLoaderService;
  let featureLimitService: FeatureLimitService;
  let subscriptionService: SubscriptionService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    buyerPackagePurchase: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    subscription: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    featureUsage: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    aiVehicleComparisonCache: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    vehicleComparison: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    vehicleVariant: {
      findUnique: jest.fn(),
    },
    vehicleVariantPriceSnapshot: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    generatedVehicleReport: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    aiChatLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const mockLoaderService = {
    findLatestGeneratedReport: jest.fn(),
    loadDossierForVariant: jest.fn(),
  };

  const mockFeatureLimitService = {
    checkAndIncrement: jest.fn().mockResolvedValue({ remaining: 10 }),
    getRemainingQuota: jest.fn().mockResolvedValue(10),
  };

  const mockSubscriptionService = {
    getEffectiveTier: jest.fn().mockResolvedValue(SubscriptionTier.TANISMA),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparisonService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ComparisonReportLoaderService, useValue: mockLoaderService },
        { provide: FeatureLimitService, useValue: mockFeatureLimitService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get<ComparisonService>(ComparisonService);
    loaderService = module.get<ComparisonReportLoaderService>(ComparisonReportLoaderService);
    featureLimitService = module.get<FeatureLimitService>(FeatureLimitService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  const createMockDbVariant = (id: string, name: string) => ({
    id,
    year: 2021,
    fuelType: 'PETROL',
    brand: { name: 'VW' },
    model: { name },
    generation: { name: `${name} Gen8`, bodyType: 'SEDAN' },
    engine: { code: '1.5 TSI' },
    transmission: { name: 'DSG' },
    trim: { name: 'Style' },
    specs: { specs: { horsepower: 150 } },
    questions: [],
    checklists: [],
  });

  const createMockDossier = (variantId: string, customFacts?: {
    rel?: string[];
    fuel?: string[];
    usage?: string[];
    safety?: string[];
    perf?: string[];
    comfort?: string[];
    prac?: string[];
    trim?: string[];
  }, overrides?: any) => {
    const factList: any[] = [];
    const relFacts = customFacts?.rel || [`fact_rel_${variantId}`];
    const fuelFacts = customFacts?.fuel || [`fact_fuel_${variantId}`];
    const usageCityFact = `fact_usage_city_${variantId}`;
    const usageHighwayFact = `fact_usage_highway_${variantId}`;
    const usageTrafficFact = `fact_usage_traffic_${variantId}`;
    const usageScenarioFact = `fact_usage_scenario_${variantId}`;
    const defaultUsageFacts = [usageCityFact, usageHighwayFact, usageTrafficFact, usageScenarioFact];
    const usageFacts = customFacts?.usage || defaultUsageFacts;
    const safetyFacts = customFacts?.safety || [`fact_safety_${variantId}`];
    const perfFacts = customFacts?.perf || [`fact_perf_${variantId}`];
    const comfortFacts = customFacts?.comfort || [`fact_comfort_${variantId}`];
    const pracFacts = customFacts?.prac || [`fact_boot_${variantId}`];
    const trimFacts = customFacts?.trim || [`fact_trim_${variantId}`];

    relFacts.forEach(id => factList.push({ factKey: id, id, label: 'Risk Fact', value: 'Low Risk', source: 'EVIDENCE_VERIFIED', confidence: 'HIGH' }));
    fuelFacts.forEach(id => factList.push({ factKey: id, id, label: 'Fuel Fact', value: '5.4 L/100km', source: 'VEHICLE_DATABASE', confidence: 'HIGH' }));
    if (!customFacts?.usage) {
      factList.push({ factKey: usageCityFact, id: usageCityFact, label: 'Şehir İçi Kullanım Uyumu', value: 'Pratik', sourcePath: 'expertDecisionSynthesis.dailyUseAssessment.cityUse', source: 'VEHICLE_DATABASE', confidence: 'HIGH' });
      factList.push({ factKey: usageHighwayFact, id: usageHighwayFact, label: 'Otoyol Kullanım Uyumu', value: 'Rahat', sourcePath: 'expertDecisionSynthesis.dailyUseAssessment.highwayUse', source: 'VEHICLE_DATABASE', confidence: 'HIGH' });
      factList.push({ factKey: usageTrafficFact, id: usageTrafficFact, label: 'Yoğun Trafik', value: 'Kullanışlı', sourcePath: 'expertDecisionSynthesis.dailyUseAssessment.trafficBehavior', source: 'VEHICLE_DATABASE', confidence: 'HIGH' });
      factList.push({ factKey: usageScenarioFact, id: usageScenarioFact, label: 'Kullanım Senaryosu', value: 'Uygun', sourcePath: 'usageScenarios[0].reasoning', source: 'VEHICLE_DATABASE', confidence: 'HIGH' });
    } else {
      usageFacts.forEach(id => factList.push({ factKey: id, id, label: 'Usage Fact', value: 'City Fit', sourcePath: 'usageScenarios[0].reasoning', source: 'VEHICLE_DATABASE', confidence: 'HIGH' }));
    }
    safetyFacts.forEach(id => factList.push({ factKey: id, id, label: 'Safety Fact', value: 'ADAS 5-Star', source: 'VEHICLE_DATABASE', confidence: 'HIGH' }));
    perfFacts.forEach(id => factList.push({ factKey: id, id, label: 'Performance Fact', value: '150 HP', source: 'VEHICLE_DATABASE', confidence: 'HIGH' }));
    comfortFacts.forEach(id => factList.push({ factKey: id, id, label: 'Comfort Fact', value: 'NVH Isolation', source: 'VEHICLE_DATABASE', confidence: 'HIGH' }));
    pracFacts.forEach(id => factList.push({ factKey: id, id, label: 'Trunk Fact', value: '580 L Boot', source: 'VEHICLE_DATABASE', confidence: 'HIGH' }));
    trimFacts.forEach(id => factList.push({ factKey: id, id, label: 'Trim Package Fact', value: 'Style Trim', source: 'VEHICLE_DATABASE', confidence: 'HIGH' }));

    if (overrides?.customDataQualityFacts) {
      overrides.customDataQualityFacts.forEach((f: any) => factList.push(f));
    }

    const allSupportingFactIds = Array.from(new Set([
      ...relFacts,
      ...fuelFacts,
      ...usageFacts,
      ...safetyFacts,
      ...perfFacts,
      ...comfortFacts,
      ...pracFacts,
      ...trimFacts,
      ...(overrides?.extraSupportingFactIds || []),
    ]));

    return {
      variantId,
      reportAvailable: true,
      reportId: overrides?.reportId || `rep_${variantId}`,
      reportVersion: overrides?.reportVersion || CURRENT_REPORT_VERSION,
      generatedAt: overrides?.generatedAt || new Date('2026-08-14'),
      vehicleIdentity: {
        brand: 'VW',
        model: variantId.includes('passat') ? 'Passat' : 'Golf',
        modelYear: 2021,
        trimName: 'Style',
        supportingFactIds: allSupportingFactIds,
      },
      scoring: {
        buyabilityScore: 85,
        technicalRiskScore: overrides?.technicalRiskScore !== undefined ? overrides.technicalRiskScore : 15,
        variantConfidenceScore: 90,
        dataConfidenceScore: 95,
        overallConfidence: 'HIGH' as const,
      },
      trimPackageComparison: { selectedTrimName: 'Style', comparisonNarrative: 'Zengin paket' },
      expertDecisionSynthesis: {
        trimPackageComparison: { selectedTrimName: 'Style', comparisonNarrative: 'Zengin paket' },
        dailyUseAssessment: { cityUse: 'Pratik', highwayUse: 'Rahat', trafficBehavior: 'Akıcı' },
      },
      engineTransmission: { maintenanceSensitivity: [], knownLimitations: [], supportingFactIds: perfFacts },
      performanceUsage: { powerHp: 150, combinedFuelL100km: 5.4, trunkCapacityLiters: 580, supportingFactIds: [...fuelFacts, ...perfFacts, ...pracFacts] },
      commonProblems: overrides?.commonProblems || [
        { title: 'Elektronik Sensör Hassasiyeti', severity: 'MEDIUM', symptoms: [], supportingFactIds: relFacts },
      ],
      recalls: [
        { title: 'Geri Çağırma Kampanyası', riskDescription: 'Yazılım güncellemesi', supportingFactIds: safetyFacts },
      ],
      maintenanceOwnership: { criticalMaintenanceNotes: [], supportingFactIds: relFacts },
      usageScenarios: [
        { scenarioKey: 'CITY_DAILY', title: 'Şehir İçi Kullanım', suitability: 'MÜKEMMEL', reasoning: 'Pratik', supportingFactIds: usageFacts },
      ],
      dataQuality: {
        overallConfidence: 'HIGH' as const,
        supportingFacts: factList,
      },
      supportingFactIds: allSupportingFactIds,
    };
  };

  describe('Package Limits & Quota Contract Tests', () => {
    it('should REJECT TANISMA tier user sending 3 vehicles with BadRequestException', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.TANISMA);

      await expect(
        service.compare('user_1', { variantIds: ['v1', 'v2', 'v3'] })
      ).rejects.toThrow(BadRequestException);
    });

    it('should ALLOW YETKIN tier user sending up to 5 vehicles', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.YETKIN);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2', 'v3', 'v4', 'v5'] });
      expect(res.success).toBe(true);
      expect(res.userLimit).toBe(5);
    });

    it('should ALLOW PROFESYONEL tier user sending up to 10 vehicles', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      const ids = Array.from({ length: 10 }, (_, i) => `v${i + 1}`);
      const res = await service.compare('user_1', { variantIds: ids });
      expect(res.success).toBe(true);
      expect(res.userLimit).toBe(10);
    });

    it('should return userTier, userLimit, and remainingChatbotMessages in getUserTierAndLimit', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.YETKIN);
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user_1', role: 'USER' });

      const info = await service.getUserTierAndLimit('user_1');
      expect(info.userTier).toBe(SubscriptionTier.YETKIN);
      expect(info.userLimit).toBe(5);
      expect(typeof info.remainingChatbotMessages).toBe('number');
    });
  });

  describe('Compare API Response Contract & Quota Increment Tests', () => {
    it('should return full contract { success, comparisonResult, vehicles, remainingChatbotMessages, userTier, userLimit } on compare()', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback')) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });

      expect(res.success).toBe(true);
      expect(res.comparisonResult).toBeDefined();
      expect(res.comparisonResult.criterionResult).toBeDefined();
      expect(Array.isArray(res.vehicles)).toBe(true);
      expect(res.vehicles.length).toBe(2);
      expect(res.vehicles[0].name).toBe(res.vehicles[0].displayName);
      expect(typeof res.vehicles[0].problemsCount).toBe('number');
      expect(res.vehicles[0].fuelType).toBe('Benzin');
      expect(typeof res.remainingChatbotMessages).toBe('number');
      expect(res.userTier).toBe(SubscriptionTier.PROFESYONEL);
      expect(res.userLimit).toBe(10);

      expect(mockFeatureLimitService.checkAndIncrement).toHaveBeenCalledWith('user_1', FeatureKey.VEHICLE_COMPARISON);
    });

    it('should NOT increment VEHICLE_COMPARISON quota again on cache hit', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      const mockCachedResult = {
        headline: 'Cached Comparison',
        criterionResult: { vehicleEvaluations: [], criterionRankings: {} },
      };

      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue({
        analysisJson: mockCachedResult,
      });

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });

      expect(res.success).toBe(true);
      expect(res.comparisonResult.headline).toBe('Cached Comparison');
      expect(mockFeatureLimitService.checkAndIncrement).not.toHaveBeenCalled();
    });
  });

  describe('Live AI Chatbot Flow Tests', () => {
    it('should call AI provider, increment AI_CHAT quota, and return response field (NOT reply)', async () => {
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'Passat uzun yolda daha konforlu bir seçenektir.' } }],
            }),
          },
        },
      };

      const res = await service.chat('user_1', {
        variantIds: ['v1', 'v2'],
        question: 'Uzun yolda hangisi daha konforlu?',
      });

      expect(res.response).toBe('Passat uzun yolda daha konforlu bir seçenektir.');
      expect((res as any).reply).toBeUndefined();
      expect(typeof res.remainingChatbotMessages).toBe('number');
      expect(mockFeatureLimitService.checkAndIncrement).toHaveBeenCalledWith('user_1', FeatureKey.AI_CHAT);
    });
  });

  describe('Price Snapshot Security Tests (getVerifiedMarketPriceEvidence)', () => {
    it('should return undefined when snapshot is null', () => {
      expect(getVerifiedMarketPriceEvidence(null)).toBeUndefined();
    });

    it('should return undefined when freshUntil or validUntil is expired', () => {
      const past = new Date(Date.now() - 3600000);
      const future = new Date(Date.now() + 86400000);

      const expiredSnapshot = {
        sourceType: 'ACTIVE_LISTINGS',
        sampleSize: 10,
        estimatedMin: 1000000,
        estimatedMax: 1200000,
        freshUntil: past,
        validUntil: future,
      };

      expect(getVerifiedMarketPriceEvidence(expiredSnapshot)).toBeUndefined();
    });

    it('should return undefined when sampleSize < 3', () => {
      const future = new Date(Date.now() + 86400000);

      const lowSampleSnapshot = {
        sourceType: 'ACTIVE_LISTINGS',
        sampleSize: 2,
        estimatedMin: 1000000,
        estimatedMax: 1200000,
        freshUntil: future,
        validUntil: future,
      };

      expect(getVerifiedMarketPriceEvidence(lowSampleSnapshot)).toBeUndefined();
    });

    it('should return undefined when sourceType is NOT ACTIVE_LISTINGS', () => {
      const future = new Date(Date.now() + 86400000);

      const wrongSourceSnapshot = {
        sourceType: 'MANUAL_ENTRY',
        sampleSize: 10,
        estimatedMin: 1000000,
        estimatedMax: 1200000,
        freshUntil: future,
        validUntil: future,
      };

      expect(getVerifiedMarketPriceEvidence(wrongSourceSnapshot)).toBeUndefined();
    });

    it('should return verified MarketPriceEvidence object when snapshot meets all criteria', () => {
      const future = new Date(Date.now() + 86400000);

      const validSnapshot = {
        sourceType: 'ACTIVE_LISTINGS',
        sampleSize: 15,
        estimatedMin: 1000000,
        estimatedMax: 1200000,
        calculatedAt: new Date('2026-08-14'),
        freshUntil: future,
        validUntil: future,
      };

      const evidence = getVerifiedMarketPriceEvidence(validSnapshot);
      expect(evidence).toBeDefined();
      expect(evidence?.minPrice).toBe(1000000);
      expect(evidence?.maxPrice).toBe(1200000);
      expect(evidence?.sampleCount).toBe(15);
      expect(evidence?.sourceType).toBe('SNAPSHOT');
    });
  });

  describe('Unified SHA-256 Cache Fingerprint & Compare Flow Tests', () => {
    it('should produce exact same cacheKey when vehicle order is inverted in compare()', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      const firstCallKey = mockPrismaService.aiVehicleComparisonCache.findUnique.mock.calls[0][0].where.cacheKey;

      jest.clearAllMocks();
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v2', 'v1'] });
      const secondCallKey = mockPrismaService.aiVehicleComparisonCache.findUnique.mock.calls[0][0].where.cacheKey;

      expect(firstCallKey).toBe(secondCallKey);
    });

    it('should produce cache miss (different cacheKey) when problem content changes in compare()', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      const firstKey = mockPrismaService.aiVehicleComparisonCache.findUnique.mock.calls[0][0].where.cacheKey;

      jest.clearAllMocks();
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, undefined, {
          commonProblems: [{ title: 'Yeni Ağır Kronik Arıza', severity: 'HIGH', supportingFactIds: ['fact_rel_v1'] }],
        }))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      const secondKey = mockPrismaService.aiVehicleComparisonCache.findUnique.mock.calls[0][0].where.cacheKey;

      expect(firstKey).not.toBe(secondKey);
    });

    it('should produce cache miss (different cacheKey) when dataQuality fact value changes from 0 to false in compare()', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, undefined, {
          customDataQualityFacts: [{ factKey: 'fact_rel_v1', label: 'Risk Fact', value: 0, source: 'EVIDENCE_VERIFIED', confidence: 'HIGH' }],
        }))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      const firstKey = mockPrismaService.aiVehicleComparisonCache.findUnique.mock.calls[0][0].where.cacheKey;

      jest.clearAllMocks();
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, undefined, {
          customDataQualityFacts: [{ factKey: 'fact_rel_v1', label: 'Risk Fact', value: false, source: 'EVIDENCE_VERIFIED', confidence: 'HIGH' }],
        }))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      const secondKey = mockPrismaService.aiVehicleComparisonCache.findUnique.mock.calls[0][0].where.cacheKey;

      expect(firstKey).not.toBe(secondKey); // CACHE MISS WHEN VALUE CHANGES FROM 0 TO FALSE!
    });
  });

  describe('Problem Confidence Sole Authority Tests (dataQuality.supportingFacts)', () => {
    it('should assign LOW or INSUFFICIENT confidence when Fact ID is in dossier.supportingFactIds BUT missing in dataQuality.supportingFacts', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, undefined, {
          extraSupportingFactIds: ['unsupported_fact_in_dossier_array_only'],
          commonProblems: [
            { title: 'Fake Self-Verifying Problem', severity: 'HIGH', supportingFactIds: ['unsupported_fact_in_dossier_array_only'] },
          ],
        }))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      const profiles = await (service as any).loadVehicleProfiles(['v1', 'v2']);

      expect(profiles[0].reliability.problems[0].confidence).toBe('LOW');
    });

    it('should assign HIGH confidence when problem Fact ID matches a trusted source HIGH confidence fact in dataQuality.supportingFacts', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, { rel: [`trusted_fact_${id}`] }))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      const profiles = await (service as any).loadVehicleProfiles(['v1', 'v2']);

      expect(profiles[0].reliability.problems[0].confidence).toBe('HIGH');
    });
  });

  describe('Fallback Evidence & Clean Text Semantics Tests', () => {
    it('should NOT produce default generic fallback strings in vehicleCards', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');

      const card = res.comparisonResult.vehicleCards?.[0];
      expect(card).toBeDefined();
      expect(card?.strengths).not.toContain('Doğrulanmış teknik donanım');
      expect(card?.bestFor).not.toContain('Günlük kullanım');
      expect(card?.notIdealFor).not.toContain('Aşırı performans beklentisi');
    });

    it('should set RELIABILITY score and stars to null in fallback when technicalRiskScore is missing or allowlist is empty', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, { rel: [] }, { technicalRiskScore: null }))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');

      const v1Rel = res.comparisonResult.criterionResult?.vehicleEvaluations[0].assessments.RELIABILITY;
      expect(v1Rel?.score).toBeNull();
      expect(v1Rel?.stars).toBeNull();
      expect(v1Rel?.insufficientData).toBe(true);
    });

    it('should calculate RELIABILITY score as 100 - technicalRiskScore in fallback when technicalRiskScore is present', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, undefined, { technicalRiskScore: 20 }))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');

      const v1Rel = res.comparisonResult.criterionResult?.vehicleEvaluations[0].assessments.RELIABILITY;
      expect(v1Rel?.score).toBe(80);
      expect(v1Rel?.stars).toBe(4.0);
    });

    it('should NOT produce fake overall winner or scenario recommendations in fallback', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');
      expect(res.comparisonResult.overallRecommendation.label).toBe('Net Kazanan İçin Yeterli Veri Yok');
      expect(res.comparisonResult.scenarioRecommendations).toEqual([]);
    });
  });

  describe('Strict Raw AI Validation & Authoritative Catalog Enforcement Tests', () => {
    it('should REJECT non-null AI score when Fact ID is in commonProblems and dossier.supportingFactIds BUT missing in dataQuality.supportingFacts', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id, undefined, {
          extraSupportingFactIds: ['uncataloged_fact_id'],
        }))
      );

      const aiResponseWithUncatalogedFact = {
        headline: 'Uncataloged Fact Test',
        executiveSummary: 'Detaylı özet metni. Araçların teknik verileri detaylıca kıyaslanmıştır.',
        overallRecommendation: { vehicleId: 'v1', label: 'En Dengeli Seçenek', reasoning: 'ok', confidence: 'HIGH' },
        scenarioRecommendations: [
          { scenarioKey: 'FUEL_ECONOMY', title: 'Yakıt Ekonomisi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['VW Passat'], reasoning: 'Düşük tüketim' },
        ],
        vehicleCards: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v1'], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', identity: {}, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v2'], evidenceConfidence: 'HIGH' },
        ],
        vehicleVerdicts: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', characterSummary: 'Sedan', gains: ['g1'], compromises: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', characterSummary: 'Hatchback', gains: ['g2'], compromises: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
        ],
        riskComparison: { narrative: 'Araçların kronik sorunları ve teknik arıza kayıtları veritabanı verilerine göre kıyaslanmıştır.' },
        ownershipCostComparison: { narrative: 'Sahiplik maliyeti.' },
        narrativeRecommendation: 'Açık konuşmak gerekirse Passat geniş aile kullanımı ve bagaj hacmi arayanlar için tercih edilebilir bir seçenektir.',
        criterionAssessments: {
          v1: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['uncataloged_fact_id'], missingInputs: [], insufficientData: false }, // UNCATALOGED FACT ID!
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v1'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v1', 'fact_usage_highway_v1', 'fact_usage_traffic_v1', 'fact_usage_scenario_v1'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v1'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v1'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v1'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
          v2: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v2'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v2', 'fact_usage_highway_v2', 'fact_usage_traffic_v2', 'fact_usage_scenario_v2'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v2'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v2'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v2'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
        },
      };

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(aiResponseWithUncatalogedFact) } }] }) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');
    });

    it('should REJECT AI output with empty supportingFactIds for non-null score and trigger fallback', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      const aiResponseWithEmptyFacts = {
        headline: 'Empty Facts Test',
        executiveSummary: 'Detaylı özet metni. Araçların teknik verileri detaylıca kıyaslanmıştır.',
        overallRecommendation: { vehicleId: 'v1', label: 'En Dengeli Seçenek', reasoning: 'ok', confidence: 'HIGH' },
        scenarioRecommendations: [
          { scenarioKey: 'FUEL_ECONOMY', title: 'Yakıt Ekonomisi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['VW Passat'], reasoning: 'Düşük tüketim' },
        ],
        vehicleCards: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v1'], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', identity: {}, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v2'], evidenceConfidence: 'HIGH' },
        ],
        vehicleVerdicts: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', characterSummary: 'Sedan', gains: ['g1'], compromises: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', characterSummary: 'Hatchback', gains: ['g2'], compromises: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
        ],
        riskComparison: { narrative: 'Araçların kronik sorunları ve teknik arıza kayıtları veritabanı verilerine göre kıyaslanmıştır.' },
        ownershipCostComparison: { narrative: 'Sahiplik maliyeti.' },
        narrativeRecommendation: 'Açık konuşmak gerekirse Passat geniş aile kullanımı ve bagaj hacmi arayanlar için tercih edilebilir bir seçenektir.',
        criterionAssessments: {
          v1: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v1'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v1', 'fact_usage_highway_v1', 'fact_usage_traffic_v1', 'fact_usage_scenario_v1'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v1'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v1'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v1'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
          v2: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v2'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v2', 'fact_usage_highway_v2', 'fact_usage_traffic_v2', 'fact_usage_scenario_v2'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v2'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v2'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v2'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
        },
      };

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(aiResponseWithEmptyFacts) } }] }) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');
    });

    it('should REJECT AI output using another vehicle Fact ID and trigger fallback', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      const aiResponseWithForeignFact = {
        headline: 'Foreign Fact Test',
        executiveSummary: 'Detaylı özet metni. Araçların teknik verileri detaylıca kıyaslanmıştır.',
        overallRecommendation: { vehicleId: 'v1', label: 'En Dengeli Seçenek', reasoning: 'ok', confidence: 'HIGH' },
        scenarioRecommendations: [
          { scenarioKey: 'FUEL_ECONOMY', title: 'Yakıt Ekonomisi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['VW Passat'], reasoning: 'Düşük tüketim' },
        ],
        vehicleCards: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v1'], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', identity: {}, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v2'], evidenceConfidence: 'HIGH' },
        ],
        vehicleVerdicts: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', characterSummary: 'Sedan', gains: ['g1'], compromises: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', characterSummary: 'Hatchback', gains: ['g2'], compromises: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
        ],
        riskComparison: { narrative: 'Araçların kronik sorunları ve teknik arıza kayıtları veritabanı verilerine göre kıyaslanmıştır.' },
        ownershipCostComparison: { narrative: 'Sahiplik maliyeti.' },
        narrativeRecommendation: 'Açık konuşmak gerekirse Passat geniş aile kullanımı ve bagaj hacmi arayanlar için tercih edilebilir bir seçenektir.',
        criterionAssessments: {
          v1: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v1'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v1', 'fact_usage_highway_v1', 'fact_usage_traffic_v1', 'fact_usage_scenario_v1'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v1'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v1'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v1'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
          v2: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v2'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v2', 'fact_usage_highway_v2', 'fact_usage_traffic_v2', 'fact_usage_scenario_v2'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v2'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v2'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v2'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
        },
      };

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(aiResponseWithForeignFact) } }] }) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');
    });

    it('should REJECT AI output missing any of the 8 criteria and trigger fallback', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      const aiResponseMissingCriterion = {
        headline: 'Missing Criterion Test',
        executiveSummary: 'Detaylı özet metni. Araçların teknik verileri detaylıca kıyaslanmıştır.',
        overallRecommendation: { vehicleId: 'v1', label: 'En Dengeli Seçenek', reasoning: 'ok', confidence: 'HIGH' },
        scenarioRecommendations: [
          { scenarioKey: 'FUEL_ECONOMY', title: 'Yakıt Ekonomisi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['VW Passat'], reasoning: 'Düşük tüketim' },
        ],
        vehicleCards: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v1'], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', identity: {}, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v2'], evidenceConfidence: 'HIGH' },
        ],
        vehicleVerdicts: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', characterSummary: 'Sedan', gains: ['g1'], compromises: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', characterSummary: 'Hatchback', gains: ['g2'], compromises: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
        ],
        riskComparison: { narrative: 'Araçların kronik sorunları ve teknik arıza kayıtları veritabanı verilerine göre kıyaslanmıştır.' },
        ownershipCostComparison: { narrative: 'Sahiplik maliyeti.' },
        narrativeRecommendation: 'Açık konuşmak gerekirse Passat geniş aile kullanımı ve bagaj hacmi arayanlar için tercih edilebilir bir seçenektir.',
        criterionAssessments: {
          v1: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v1'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v1', 'fact_usage_highway_v1', 'fact_usage_traffic_v1', 'fact_usage_scenario_v1'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v1'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v1'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v1'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
          v2: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v2'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v2', 'fact_usage_highway_v2', 'fact_usage_traffic_v2', 'fact_usage_scenario_v2'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v2'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v2'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v2'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
        },
      };

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(aiResponseMissingCriterion) } }] }) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');
    });

    it('should REJECT performance fact used for COMFORT criterion and fall back', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      const aiResponseWithWrongFact = {
        headline: 'Wrong Fact Test',
        executiveSummary: 'Detaylı özet metni. Araçların teknik verileri detaylıca kıyaslanmıştır.',
        overallRecommendation: { vehicleId: 'v1', label: 'En Dengeli Seçenek', reasoning: 'ok', confidence: 'HIGH' },
        scenarioRecommendations: [
          { scenarioKey: 'FUEL_ECONOMY', title: 'Yakıt Ekonomisi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['VW Passat'], reasoning: 'Düşük tüketim' },
        ],
        vehicleCards: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v1'], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', identity: {}, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v2'], evidenceConfidence: 'HIGH' },
        ],
        vehicleVerdicts: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', characterSummary: 'Sedan', gains: ['g1'], compromises: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', characterSummary: 'Hatchback', gains: ['g2'], compromises: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
        ],
        riskComparison: { narrative: 'Araçların kronik sorunları ve teknik arıza kayıtları veritabanı verilerine göre kıyaslanmıştır.' },
        ownershipCostComparison: { narrative: 'Sahiplik maliyeti.' },
        narrativeRecommendation: 'Açık konuşmak gerekirse Passat geniş aile kullanımı ve bagaj hacmi arayanlar için tercih edilebilir bir seçenektir.',
        criterionAssessments: {
          v1: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v1'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v1', 'fact_usage_highway_v1', 'fact_usage_traffic_v1', 'fact_usage_scenario_v1'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v1'], missingInputs: [], insufficientData: false },
            COMFORT: {
              score: 80,
              confidence: 'HIGH',
              summary: 'ok',
              positiveFactors: [],
              compromises: [],
              supportingFactIds: ['fact_perf_v1'],
              missingInputs: [],
              insufficientData: false,
            },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v1'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
          v2: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v2'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v2', 'fact_usage_highway_v2', 'fact_usage_traffic_v2', 'fact_usage_scenario_v2'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v2'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v2'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v2'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
        },
      };

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(aiResponseWithWrongFact) } }] }) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');
    });
  });

  describe('10-Vehicle Mocked Service Integration Test', () => {
    it('should support comparing 10 vehicles and return all 8 criteria for each vehicle', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('AI Fallback Trigger')) } },
      };

      const ids = Array.from({ length: 10 }, (_, i) => `veh_${i + 1}`);
      const res = await service.compare('user_1', { variantIds: ids });

      expect(res.success).toBe(true);
      expect(res.vehicles.length).toBe(10);
      expect(res.comparisonResult.criterionResult?.vehicleEvaluations.length).toBe(10);

      res.comparisonResult.criterionResult?.vehicleEvaluations.forEach(evalItem => {
        expect(evalItem.assessments.RELIABILITY).toBeDefined();
        expect(evalItem.assessments.FAILURE_SEVERITY).toBeDefined();
        expect(evalItem.assessments.FUEL_EFFICIENCY).toBeDefined();
        expect(evalItem.assessments.USAGE_SUITABILITY).toBeDefined();
        expect(evalItem.assessments.PERFORMANCE).toBeDefined();
        expect(evalItem.assessments.COMFORT).toBeDefined();
        expect(evalItem.assessments.PRACTICALITY).toBeDefined();
        expect(evalItem.assessments.EQUIPMENT_TECHNOLOGY).toBeDefined();
      });
    });
  });

  describe('Comparison V8 Specification Regression Tests', () => {
    it('should verify that 8 criteria weights sum to 100 in CRITERIA_WEIGHTS', () => {
      const totalWeight = Object.values(CRITERIA_WEIGHTS).reduce((acc, w) => acc + w, 0);
      expect(totalWeight).toBe(100);
      expect(CRITERIA_WEIGHTS.USAGE_SUITABILITY).toBe(15);
      expect(CRITERIA_WEIGHTS.SAFETY).toBeUndefined();
    });

    it('G: should verify that a CMP_PERFORMANCE_* fact cannot be used in COMFORT or USAGE_SUITABILITY criteria', () => {
      const mockProfile: any = {
        dossier: {
          dataQuality: {
            supportingFacts: [
              { factKey: 'CMP_PERFORMANCE_123456', criterion: 'PERFORMANCE', label: 'Motor Gücü', value: '150 HP', source: 'SYSTEM_DERIVED', confidence: 'HIGH' },
              { factKey: 'CMP_COMFORT_654321', criterion: 'COMFORT', label: 'Sürüş Konforu', value: 'Sessiz Kabin', source: 'SYSTEM_DERIVED', confidence: 'HIGH' },
              { factKey: 'CMP_USAGE_SUITABILITY_112233', criterion: 'USAGE_SUITABILITY', label: 'Şehir İçi Kullanım', value: 'Pratik Şehir İçi', source: 'SYSTEM_DERIVED', confidence: 'HIGH' },
            ],
          },
        },
      };

      const allowed = (service as any).buildAllowedFactIdsByCriterion(mockProfile);

      expect(allowed.PERFORMANCE.has('CMP_PERFORMANCE_123456')).toBe(true);
      expect(allowed.COMFORT.has('CMP_PERFORMANCE_123456')).toBe(false);
      expect(allowed.USAGE_SUITABILITY.has('CMP_PERFORMANCE_123456')).toBe(false);

      expect(allowed.COMFORT.has('CMP_COMFORT_654321')).toBe(true);
      expect(allowed.USAGE_SUITABILITY.has('CMP_COMFORT_654321')).toBe(false);

      expect(allowed.USAGE_SUITABILITY.has('CMP_USAGE_SUITABILITY_112233')).toBe(true);
      expect(allowed.COMFORT.has('CMP_USAGE_SUITABILITY_112233')).toBe(false);
    });

    it('should calculate v8_ sourceDataVersion prefix', () => {
      const version = computeSourceDataVersionFromProfiles([]);
      expect(version.startsWith('v8_')).toBe(true);
    });

    it('should verify that AI prompt contains USAGE_SUITABILITY sub-weights totaling 100 and selectedPriority rule', async () => {
      const dummyProfiles: any[] = [
        { vehicleId: 'v1', displayName: 'VW Golf', identity: {}, performance: {}, efficiency: {}, practicality: {}, comfortAndHandling: {}, ownership: {}, reliability: { problems: [] }, sellerQuestions: [], inspectionChecklist: [], evidenceQuality: { confidence: 'HIGH', missingFields: [] } },
      ];

      let promptSent = '';
      (service as any).openai = {
        chat: {
          completions: {
            create: jest.fn().mockImplementation((args: any) => {
              promptSent = args.messages?.map((m: any) => m.content).join('\n') || '';
              return Promise.resolve({ choices: [{ message: { content: '{}' } }] });
            }),
          },
        },
      };

      try {
        await (service as any).generateAdvancedAiComparison(dummyProfiles, 'Dengeli', 'v8_test');
      } catch (e) {
        // Ignore JSON parse error; we only check promptSent
      }

      expect(promptSent).toContain('Şehir içi günlük kullanım uygunluğu: %25');
      expect(promptSent).toContain('Otoyol ve uzun yol uygunluğu: %25');
      expect(promptSent).toContain('Yoğun trafik, dur-kalk ve kullanım kolaylığı: %20');
      expect(promptSent).toContain('Hitap ettiği kullanıcı profillerinin genişliği: %15');
      expect(promptSent).toContain('Kullanım senaryolarındaki tavizlerin ağırlığı: %15');

      const weights = [25, 25, 20, 15, 15];
      const sum = weights.reduce((acc, w) => acc + w, 0);
      expect(sum).toBe(100);

      expect(promptSent).toContain('selectedPriority');
      expect(promptSent).toContain('değiştirmemelidir');
    });

    it('should REJECT USAGE_SUITABILITY score using ONLY cityUse evidence and trigger fallback', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );

      const mockDossierCityOnly = createMockDossier('v1', {
        usage: ['CMP_USAGE_SUITABILITY_city_v1'],
      });
      mockDossierCityOnly.dataQuality.supportingFacts = [
        { factKey: 'CMP_USAGE_SUITABILITY_city_v1', id: 'CMP_USAGE_SUITABILITY_city_v1', label: 'Şehir İçi Kullanım Uyumu', value: 'Pratik', sourcePath: 'expertDecisionSynthesis.dailyUseAssessment.cityUse', source: 'SYSTEM_DERIVED', confidence: 'HIGH' },
        { factKey: 'fact_rel_v1', id: 'fact_rel_v1', label: 'Risk', value: 'Ok', sourcePath: 'commonProblems[0].title', source: 'VEHICLE_DATABASE', confidence: 'HIGH' },
        { factKey: 'fact_fuel_v1', id: 'fact_fuel_v1', label: 'Fuel', value: '5L', sourcePath: 'performanceUsage.combinedFuelL100km', source: 'VEHICLE_DATABASE', confidence: 'HIGH' },
        { factKey: 'fact_perf_v1', id: 'fact_perf_v1', label: 'Perf', value: '150HP', sourcePath: 'performanceUsage.powerHp', source: 'VEHICLE_DATABASE', confidence: 'HIGH' },
        { factKey: 'fact_comfort_v1', id: 'fact_comfort_v1', label: 'Comfort', value: 'NVH', sourcePath: 'expertDecisionSynthesis.dailyUseAssessment.comfortAssessment', source: 'VEHICLE_DATABASE', confidence: 'HIGH' },
        { factKey: 'fact_boot_v1', id: 'fact_boot_v1', label: 'Boot', value: '500L', sourcePath: 'performanceUsage.trunkCapacityLiters', source: 'VEHICLE_DATABASE', confidence: 'HIGH' },
        { factKey: 'fact_trim_v1', id: 'fact_trim_v1', label: 'Trim', value: 'Style', sourcePath: 'expertDecisionSynthesis.trimPackageComparison', source: 'VEHICLE_DATABASE', confidence: 'HIGH' },
      ];

      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(id === 'v1' ? mockDossierCityOnly : createMockDossier(id))
      );

      const aiResponseCityOnlyUsage = {
        headline: 'City Only Usage Test',
        executiveSummary: 'Passat ve Golf modellerinin 8 farklı kriterdeki performans, konfor, arıza riski ve kullanım uygunluğu veritabanındaki teknik veriler ve gerçek kullanıcı deneyimleri ışığında detaylıca kıyaslanmıştır.',
        overallRecommendation: { vehicleId: 'v1', label: 'En Dengeli Seçenek', reasoning: 'Geniş kabin ve yüksek performans ikilisi nedeniyle tercih edilebilir.', confidence: 'HIGH' },
        scenarioRecommendations: [{ scenarioKey: 'FUEL_ECONOMY', title: 'Yakıt Ekonomisi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['VW Passat'], reasoning: 'Düşük tüketim' }],
        vehicleCards: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', identity: {}, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v1'], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', identity: {}, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v2'], evidenceConfidence: 'HIGH' },
        ],
        vehicleVerdicts: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', characterSummary: 'Sedan', gains: ['g1'], compromises: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', characterSummary: 'Hatchback', gains: ['g2'], compromises: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
        ],
        riskComparison: { narrative: 'Riskler' },
        ownershipCostComparison: { narrative: 'Maliyet' },
        narrativeRecommendation: 'Açık konuşmak gerekirse Passat geniş aile kullanımı, bagaj hacmi ve otoyol konforu arayan kullanıcılar için açık ara tercih edilebilir bir seçenektir.',
        criterionAssessments: {
          v1: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v1'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['CMP_USAGE_SUITABILITY_city_v1'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v1'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v1'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v1'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
          v2: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v2'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v2', 'fact_usage_highway_v2', 'fact_usage_traffic_v2', 'fact_usage_scenario_v2'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v2'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v2'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v2'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: null, confidence: 'INSUFFICIENT', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: [], missingInputs: [], insufficientData: true },
          },
        },
      };

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(aiResponseCityOnlyUsage) } }] }) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('FALLBACK');
    });

    it('should ACCEPT USAGE_SUITABILITY score using ALL 4 mandatory evidence groups', async () => {
      mockSubscriptionService.getEffectiveTier.mockResolvedValue(SubscriptionTier.PROFESYONEL);
      mockPrismaService.aiVehicleComparisonCache.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) =>
        Promise.resolve(createMockDbVariant(args.where.id, args.where.id))
      );
      mockLoaderService.loadDossierForVariant.mockImplementation((id: string) =>
        Promise.resolve(createMockDossier(id))
      );

      const aiResponseValidUsage = {
        headline: 'Valid 4-Category Usage Test',
        executiveSummary: 'Passat ve Golf modellerinin 8 farklı kriterdeki performans, konfor, arıza riski ve kullanım uygunluğu veritabanındaki teknik veriler ve gerçek kullanıcı deneyimleri ışığında detaylıca kıyaslanmıştır.',
        overallRecommendation: { vehicleId: 'v1', label: 'En Dengeli Seçenek', reasoning: 'Geniş kabin ve yüksek performans ikilisi nedeniyle tercih edilebilir.', confidence: 'HIGH' },
        scenarioRecommendations: [{ scenarioKey: 'FUEL_ECONOMY', title: 'Yakıt Ekonomisi', recommendedVehicleIds: ['v1'], recommendedVehicleNames: ['VW Passat'], reasoning: 'Düşük tüketim' }],
        vehicleCards: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', identity: { brand: 'VW', model: 'Passat', modelYear: 2021, trimName: 'Style' }, strengths: ['s1'], cautions: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v1'], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', identity: { brand: 'VW', model: 'Golf', modelYear: 2021, trimName: 'Style' }, strengths: ['s2'], cautions: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], prePurchaseChecks: [], supportingFacts: ['fact_rel_v2'], evidenceConfidence: 'HIGH' },
        ],
        vehicleVerdicts: [
          { vehicleId: 'v1', vehicleName: 'VW Passat', characterSummary: 'Sedan', gains: ['g1'], compromises: ['c1'], bestFor: ['b1'], notIdealFor: ['n1'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
          { vehicleId: 'v2', vehicleName: 'VW Golf', characterSummary: 'Hatchback', gains: ['g2'], compromises: ['c2'], bestFor: ['b2'], notIdealFor: ['n2'], criticalRisks: [], prePurchaseChecks: [], evidenceConfidence: 'HIGH' },
        ],
        riskComparison: { narrative: 'Araçların kronik sorunları ve teknik arıza kayıtları veritabanı verilerine göre kıyaslanmıştır.' },
        ownershipCostComparison: { narrative: 'Maliyet' },
        narrativeRecommendation: 'Açık konuşmak gerekirse Passat geniş aile kullanımı, bagaj hacmi ve otoyol konforu arayan kullanıcılar için açık ara tercih edilebilir bir seçenektir.',
        criterionAssessments: {
          v1: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v1'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v1'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 85, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v1', 'fact_usage_highway_v1', 'fact_usage_traffic_v1', 'fact_usage_scenario_v1'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v1'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v1'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v1'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_trim_v1'], missingInputs: [], insufficientData: false },
          },
          v2: {
            RELIABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FAILURE_SEVERITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_rel_v2'], missingInputs: [], insufficientData: false },
            FUEL_EFFICIENCY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_fuel_v2'], missingInputs: [], insufficientData: false },
            USAGE_SUITABILITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_usage_city_v2', 'fact_usage_highway_v2', 'fact_usage_traffic_v2', 'fact_usage_scenario_v2'], missingInputs: [], insufficientData: false },
            PERFORMANCE: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_perf_v2'], missingInputs: [], insufficientData: false },
            COMFORT: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_comfort_v2'], missingInputs: [], insufficientData: false },
            PRACTICALITY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_boot_v2'], missingInputs: [], insufficientData: false },
            EQUIPMENT_TECHNOLOGY: { score: 80, confidence: 'HIGH', summary: 'ok', positiveFactors: [], compromises: [], supportingFactIds: ['fact_trim_v2'], missingInputs: [], insufficientData: false },
          },
        },
      };

      (service as any).openai = {
        chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(aiResponseValidUsage) } }] }) } },
      };

      const res = await service.compare('user_1', { variantIds: ['v1', 'v2'] });
      expect(res.comparisonResult.generationMode).toBe('AI');
    });
  });
});
