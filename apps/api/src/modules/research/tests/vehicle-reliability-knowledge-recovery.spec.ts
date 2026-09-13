import { VehicleReliabilityResearchService, VehicleReliabilityResearchInput } from '../vehicle-reliability-research.service';
import { WebSearchProvider } from '../providers/web-search.provider';
import { PrismaService } from '../../../prisma.service';
import {
  NormalizedReliabilityEvidence,
  DomainKeyV6,
} from '@used-car-intelligence/shared';

describe('VehicleReliabilityResearchService - Knowledge Layer & Targeted Recovery (Phase 2K)', () => {
  let mockSearchProvider: Partial<WebSearchProvider>;
  let mockPrisma: any;
  let service: VehicleReliabilityResearchService;
  let dbStore: Map<string, any>;

  beforeEach(() => {
    dbStore = new Map<string, any>();

    mockPrisma = {
      vehicleReliabilityKnowledge: {
        findUnique: jest.fn().mockImplementation(async ({ where: { cacheKey } }: any) => {
          return dbStore.get(cacheKey) || null;
        }),
        upsert: jest.fn().mockImplementation(async ({ where: { cacheKey }, create, update }: any) => {
          const existing = dbStore.get(cacheKey);
          const record = existing ? { ...existing, ...update } : { id: `cuid_${Date.now()}`, ...create };
          dbStore.set(cacheKey, record);
          return record;
        }),
      },
      vehicleVariant: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockSearchProvider = {
      search: jest.fn().mockResolvedValue([]),
    };

    service = new VehicleReliabilityResearchService(
      mockSearchProvider as any,
      mockPrisma as any,
    );
  });

  const baseInput: VehicleReliabilityResearchInput = {
    brand: 'Volkswagen',
    model: 'Passat',
    generation: 'B8',
    modelYear: 2018,
    engineCode: '1.6 TDI DCXA',
    transmissionCode: 'DQ200',
    powertrainType: 'ICE_DIESEL',
  };

  // A. Persistent exact-identity cache hit
  it('A. persistent exact-identity cache hit - loads and restores knowledge from L2 store', async () => {
    // Seed DB record
    const cacheKey = service.buildCacheKey(baseInput);
    const mockDefect: NormalizedReliabilityEvidence = {
      id: 'DEF-DQ200-MECHATRONIC',
      domain: 'POWERTRAIN_TRANS',
      title: 'DQ200 Mekatronik Basınç Tüpü Çatlağı',
      normalizedFailureMode: 'DQ200_MECHATRONIC_PRESSURE_CRACK',
      affectedComponent: 'Şanzıman Mekatroniği',
      severityCategory: 'BREAKDOWN',
      severityScore: 7,
      severityBasis: 'Hidrolik basınç kaybı ve vites geçiş arızası',
      prevalenceCategory: 'RECURRING_CHRONIC',
      prevalenceFactor: null,
      prevalenceBasis: 'Kuru kavrama DQ200 mekatronik bülteni',
      applicability: {
        brand: 'Volkswagen',
        model: 'Passat',
        modelYearFrom: 2015,
        modelYearTo: 2020,
        transmissionCode: 'DQ200',
      },
      defectStatus: 'ACTIVE_DESIGN_ISSUE',
      statusFactor: 1.0,
      linkedSources: [
        {
          sourceId: 'SRC-VW-1',
          publisher: 'ADAC Test & Tech Bulletin',
          sourceType: 'SPECIALIST_DATA',
          sourceTier: 'TIER_2',
          evidenceSnippet: 'DQ200 Druckspeicher Gehäuseriss führt zu Druckverlust',
        },
      ],
      numericEligibility: 'QUALITATIVE_ONLY',
    };

    dbStore.set(cacheKey, {
      id: 'knowledge-rec-1',
      cacheKey,
      brand: 'Volkswagen',
      model: 'Passat',
      generation: 'B8',
      modelYear: 2018,
      reliabilityCoverageScore: 85,
      allVerifiedDefects: [],
      qualitativeDefects: [mockDefect],
      domainResults: {
        POWERTRAIN_TRANS: {
          domain: 'POWERTRAIN_TRANS',
          state: 'VERIFIED_DEFECTS_FOUND',
          weight: 0.20,
          coverageCredit: 1.0,
          defects: [mockDefect],
          channels: [],
        },
      },
      researchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (FRESH)
      expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      lastVerifiedAt: new Date(),
    });

    const result = await service.runReliabilityResearch(baseInput);

    expect(result.qualitativeDefects.length).toBe(1);
    expect(result.qualitativeDefects[0].title).toContain('DQ200 Mekatronik');
    expect(result.freshness?.state).toBe('FRESH');
    expect(result.freshness?.isReused).toBe(true);
    expect(result.timing?.wasCached).toBe(true);
    expect(mockSearchProvider.search).not.toHaveBeenCalled();
  });

  // B. Cache miss triggers research
  it('B. cache miss - performs research and persists result to L2 PostgreSQL', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([
      {
        url: 'https://adac.de/passat-test',
        domain: 'adac.de',
        title: 'Passat B8 TDI İncelemesi',
        snippet: '1.6 TDI motor genel olarak dayanıklı ancak periyodik su pompası kontrolü gerektirir.',
      },
    ]);

    const result = await service.runReliabilityResearch(baseInput);

    expect(mockSearchProvider.search).toHaveBeenCalled();
    expect(mockPrisma.vehicleReliabilityKnowledge.upsert).toHaveBeenCalled();
    expect(result.freshness?.isReused).toBe(false);
    expect(result.timing?.wasCached).toBe(false);
  });

  // C. Fresh cache reuse within 7 days
  it('C. fresh cache reuse - <= 7 days is categorized as FRESH', async () => {
    const cacheKey = service.buildCacheKey(baseInput);
    dbStore.set(cacheKey, {
      cacheKey,
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      reliabilityCoverageScore: 90,
      allVerifiedDefects: [],
      qualitativeDefects: [],
      domainResults: {},
      researchedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      expiresAt: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
    });

    const result = await service.runReliabilityResearch(baseInput);
    expect(result.freshness?.state).toBe('FRESH');
    expect(result.freshness?.isReused).toBe(true);
  });

  // D. Stale cache behavior (> 7 days, <= 30 days)
  it('D. stale cache behavior - between 7 and 30 days is categorized as STALE but reused', async () => {
    const cacheKey = service.buildCacheKey(baseInput);
    dbStore.set(cacheKey, {
      cacheKey,
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      reliabilityCoverageScore: 80,
      allVerifiedDefects: [],
      qualitativeDefects: [],
      domainResults: {},
      researchedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    const result = await service.runReliabilityResearch(baseInput);
    expect(result.freshness?.state).toBe('STALE');
    expect(result.freshness?.isReused).toBe(true);
    expect(mockSearchProvider.search).not.toHaveBeenCalled();
  });

  // E. Exact identity mismatch does not reuse evidence
  it('E. exact identity mismatch - different transmission does not reuse cache', async () => {
    const cacheKey = service.buildCacheKey(baseInput);
    dbStore.set(cacheKey, {
      cacheKey,
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      transmissionCode: 'DQ200',
      reliabilityCoverageScore: 80,
      allVerifiedDefects: [],
      qualitativeDefects: [],
      domainResults: {},
      researchedAt: new Date(),
    });

    const differentTransInput: VehicleReliabilityResearchInput = {
      ...baseInput,
      transmissionCode: 'DQ381',
      transmissionName: 'DQ381 7-Speed Wet DSG',
    };

    const diffKey = service.buildCacheKey(differentTransInput);
    expect(diffKey).not.toBe(cacheKey);

    const result = await service.runReliabilityResearch(differentTransInput);
    expect(result.freshness?.isReused).toBe(false);
  });

  // F. Bounded concurrency (verify maximum 4 simultaneous tasks)
  it('F. bounded concurrency - executes parallel tasks without exceeding concurrency budget', async () => {
    let activeCalls = 0;
    let maxActiveSeen = 0;

    (mockSearchProvider.search as jest.Mock).mockImplementation(async () => {
      activeCalls++;
      if (activeCalls > maxActiveSeen) {
        maxActiveSeen = activeCalls;
      }
      await new Promise((r) => setTimeout(r, 20));
      activeCalls--;
      return [];
    });

    await service.runReliabilityResearch(baseInput);

    expect(maxActiveSeen).toBeLessThanOrEqual(4);
  });

  // G. Domain results remain deterministic despite concurrency
  it('G. domain results remain deterministic despite concurrency', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([
      {
        url: 'https://adac.de/sample',
        domain: 'adac.de',
        title: 'ADAC Tech Report',
        snippet: 'Teknik inceleme referansı',
      },
    ]);

    const res1 = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });
    const res2 = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });

    const keys1 = Object.keys(res1.domainResults);
    const keys2 = Object.keys(res2.domainResults);

    expect(keys1).toEqual(keys2);
    expect(res1.reliabilityCoverageScore).toBe(res2.reliabilityCoverageScore);
  });

  // H. Targeted recovery only retries failed domains
  it('H. targeted recovery only retries failed domains', async () => {
    (mockSearchProvider.search as jest.Mock).mockImplementation(async (query: string) => {
      if (query.includes('sanziman') || query.includes('transmission')) {
        // Transmission domain succeeds
        return [
          {
            url: 'https://adac.de/dq200',
            domain: 'adac.de',
            title: 'DQ200 DSG Arızaları',
            snippet: 'DQ200 mekatronik basınç kaybı kronik arızası',
          },
        ];
      }
      // Other initial queries return empty
      return [];
    });

    const result = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });

    expect(result.recoveryTelemetry?.recoveryExecuted).toBe(true);
    // POWERTRAIN_TRANS found verified defects on initial pass, so it should NOT be in recoveredDomainKeys
    expect(result.recoveryTelemetry?.recoveredDomainKeys).not.toContain('POWERTRAIN_TRANS');
    expect(result.recoveryTelemetry?.recoveredDomainKeys).toContain('POWERTRAIN_ENGINE');
  });

  // I. Successful domains are not rerun
  it('I. successful domains with verified defects are not rerun in recovery', async () => {
    (mockSearchProvider.search as jest.Mock).mockImplementation(async (query: string) => {
      if (query.includes('sanziman')) {
        return [
          {
            url: 'https://kba.de/dq200',
            domain: 'kba.de',
            title: 'DQ200 KBA Geri Çağırma',
            snippet: 'Mekatronik sigorta bülteni',
          },
        ];
      }
      return [];
    });

    const result = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });
    const transDomain = result.domainResults['POWERTRAIN_TRANS'];
    expect(transDomain.state).toBe('VERIFIED_DEFECTS_FOUND');
    expect(transDomain.coverageCredit).toBe(1.0);

    const transChannels = transDomain.channels.map((c) => c.channelKey);
    expect(transChannels).not.toContain('RECOVERY_TRANS_GLOBAL_TSB');
  });

  // J. Maximum one recovery attempt per domain
  it('J. maximum one recovery attempt - no infinite recovery loops', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([]);

    const result = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });
    
    // Recovery telemetry records additional queries count bounded by applicable domains
    expect(result.recoveryTelemetry?.additionalQueriesCount).toBeLessThanOrEqual(7);
  });

  // K. Empty search != verified negative proof
  it('K. empty search does NOT generate verified negative proof', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([]);

    const result = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });
    const engDomain = result.domainResults['POWERTRAIN_ENGINE'];

    expect(engDomain.negativeProof).toBeUndefined();
    expect(engDomain.coverageCredit).toBe(0.4); // Stays at PARTIAL, not 1.0
  });

  // L. Provider failure != no defect
  it('L. provider failure marks channel as EXECUTION_FAILED, not clean zero risk', async () => {
    (mockSearchProvider.search as jest.Mock).mockRejectedValue(new Error('Search API 500 Internal Server Error'));

    const result = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });
    const engDomain = result.domainResults['POWERTRAIN_ENGINE'];

    expect(engDomain.state).toBe('RESEARCH_FAILED');
    expect(engDomain.coverageCredit).toBe(0.0);
    expect(engDomain.channels.some((c) => c.status === 'EXECUTION_FAILED')).toBe(true);
  });

  // M. Missing API key != no defect
  it('M. missing API key / empty provider returns empty sources and does NOT produce negative proof', async () => {
    const emptyProvider = {
      search: jest.fn().mockResolvedValue([]),
    };
    const localService = new VehicleReliabilityResearchService(emptyProvider as any, mockPrisma);

    const result = await localService.runReliabilityResearch({ ...baseInput, bypassCache: true });
    const engDomain = result.domainResults['POWERTRAIN_ENGINE'];

    expect(engDomain.negativeProof).toBeUndefined();
    expect(engDomain.state).toBe('PARTIAL');
  });

  // N. 429 / timeout failure state
  it('N. 429 / timeout produces explicit failure reason in telemetry', async () => {
    (mockSearchProvider.search as jest.Mock).mockRejectedValue(new Error('429 Too Many Requests - Rate limit exceeded'));

    const result = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });
    const failedChannel = result.domainResults['POWERTRAIN_ENGINE'].channels.find((c) => c.status === 'EXECUTION_FAILED');

    expect(failedChannel).toBeDefined();
    expect(failedChannel?.failureReason).toContain('429');
  });

  // O. Rejected Tier 3 evidence does not become verified via cache
  it('O. rejected Tier 3 forum evidence does NOT become verified via cache persistence', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([
      {
        url: 'https://forum.donanimhaber.com/passat-sikayet',
        domain: 'forum.donanimhaber.com',
        title: 'Passat Forum Şikayeti',
        snippet: 'Kullanıcı motor sesinden şikayetçi ama teknik bülten yok.',
      },
    ]);

    const result = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });

    expect(result.allVerifiedDefects.length).toBe(0);
    expect(result.qualitativeDefects.length).toBe(0);
    expect(result.discoveryTelemetry?.length).toBeGreaterThan(0);

    // Reload from cache
    const cacheKey = service.buildCacheKey(baseInput);
    const reloaded = await service.runReliabilityResearch(baseInput);

    expect(reloaded.allVerifiedDefects.length).toBe(0);
    expect(reloaded.qualitativeDefects.length).toBe(0);
  });

  // P. Qualitative defects survive persistence/reload
  it('P. qualitative defects survive persistence and reload without data loss', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([
      {
        url: 'https://adac.de/passat-b8-dq200',
        domain: 'adac.de',
        title: 'Passat B8 DQ200 İncelemesi',
        snippet: 'Kuru kavrama DQ200 mekatronik basınç tüpü çatlağı yolda bırakabilir.',
      },
    ]);

    const initial = await service.runReliabilityResearch({ ...baseInput, bypassCache: true });
    expect(initial.qualitativeDefects.length).toBeGreaterThan(0);

    const cached = await service.runReliabilityResearch(baseInput);
    expect(cached.qualitativeDefects.length).toBe(initial.qualitativeDefects.length);
    expect(cached.qualitativeDefects[0].title).toBe(initial.qualitativeDefects[0].title);
  });

  // Q. Numeric defects survive persistence/reload
  it('Q. numeric defects with quantitative prevalence survive persistence and reload', async () => {
    const numericDefect: NormalizedReliabilityEvidence = {
      id: 'DEF-NUMERIC-1',
      domain: 'POWERTRAIN_ENGINE',
      title: 'TDI Enjektör Arızası',
      normalizedFailureMode: 'TDI_INJECTOR_FAILURE',
      affectedComponent: 'Enjektör',
      severityCategory: 'BREAKDOWN',
      severityScore: 7,
      severityBasis: 'Enjektör tıkanması',
      prevalenceCategory: 'RECURRING_CHRONIC',
      prevalenceFactor: 0.65,
      prevalenceBasis: 'KBA saha çalışmasında %12 insidans oranı tespit edilmiştir',
      applicability: {
        brand: 'Volkswagen',
        model: 'Passat',
        modelYearFrom: 2016,
        modelYearTo: 2020,
      },
      defectStatus: 'ACTIVE_DESIGN_ISSUE',
      statusFactor: 1.0,
      linkedSources: [
        {
          sourceId: 'SRC-1',
          publisher: 'KBA',
          sourceType: 'OFFICIAL_RECALL',
          sourceTier: 'TIER_1',
          evidenceSnippet: '%12 insidans',
        },
      ],
      numericEligibility: 'NUMERIC_ELIGIBLE',
    };

    const cacheKey = service.buildCacheKey(baseInput);
    dbStore.set(cacheKey, {
      cacheKey,
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      reliabilityCoverageScore: 95,
      allVerifiedDefects: [numericDefect],
      qualitativeDefects: [],
      domainResults: {
        POWERTRAIN_ENGINE: {
          domain: 'POWERTRAIN_ENGINE',
          state: 'VERIFIED_DEFECTS_FOUND',
          weight: 0.20,
          coverageCredit: 1.0,
          defects: [numericDefect],
          channels: [],
        },
      },
      researchedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const result = await service.runReliabilityResearch(baseInput);
    expect(result.allVerifiedDefects.length).toBe(1);
    expect(result.allVerifiedDefects[0].numericEligibility).toBe('NUMERIC_ELIGIBLE');
    expect(result.allVerifiedDefects[0].prevalenceFactor).toBe(0.65);
  });

  // R. Recall evidence survives persistence/reload with freshness metadata
  it('R. recall evidence survives persistence/reload with freshness metadata', async () => {
    const recallDefect: NormalizedReliabilityEvidence = {
      id: 'REC-1',
      domain: 'SAFETY_RECALL',
      title: 'Passat Direksiyon Kolonu Geri Çağırma',
      normalizedFailureMode: 'PASSAT_STEERING_RECALL',
      affectedComponent: 'Direksiyon Kolonu',
      severityCategory: 'SAFETY_CRITICAL',
      severityScore: 10,
      severityBasis: 'Direksiyon kilitlenme riski',
      prevalenceCategory: 'RECURRING_CHRONIC',
      prevalenceFactor: null,
      prevalenceBasis: 'Resmi KBA geri çağırma',
      applicability: {
        brand: 'Volkswagen',
        model: 'Passat',
        modelYearFrom: 2018,
        modelYearTo: 2018,
      },
      defectStatus: 'REMEDY_AVAILABLE',
      statusFactor: 0.20,
      campaignStatus: 'MODEL_CAMPAIGN_EXISTS',
      linkedSources: [
        {
          sourceId: 'SRC-REC-1',
          publisher: 'KBA',
          sourceType: 'OFFICIAL_RECALL',
          sourceTier: 'TIER_1',
          evidenceSnippet: 'KBA Recall 2018-091',
        },
      ],
      numericEligibility: 'QUALITATIVE_ONLY',
    };

    const cacheKey = service.buildCacheKey(baseInput);
    dbStore.set(cacheKey, {
      cacheKey,
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      reliabilityCoverageScore: 100,
      allVerifiedDefects: [],
      qualitativeDefects: [recallDefect],
      domainResults: {
        SAFETY_RECALL: {
          domain: 'SAFETY_RECALL',
          state: 'VERIFIED_DEFECTS_FOUND',
          weight: 0.15,
          coverageCredit: 1.0,
          defects: [recallDefect],
          channels: [],
        },
      },
      researchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    });

    const result = await service.runReliabilityResearch(baseInput);
    expect(result.qualitativeDefects.some((d) => d.domain === 'SAFETY_RECALL')).toBe(true);
    expect(result.freshness?.state).toBe('FRESH');
    expect(result.freshness?.recallFreshnessState).toBe('FRESH');
  });
});
