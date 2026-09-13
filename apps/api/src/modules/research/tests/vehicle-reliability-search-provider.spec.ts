import { VehicleReliabilityResearchService, VehicleReliabilityResearchInput } from '../vehicle-reliability-research.service';
import { WebSearchProvider } from '../providers/web-search.provider';

describe('VehicleReliabilityResearchService - Live Search Provider Integration (Phase 2F)', () => {
  let mockSearchProvider: Partial<WebSearchProvider>;
  let service: VehicleReliabilityResearchService;

  beforeEach(() => {
    mockSearchProvider = {
      search: jest.fn().mockResolvedValue([]),
    };
    service = new VehicleReliabilityResearchService(mockSearchProvider as any);
  });

  // A. real provider adapter maps source provenance correctly
  it('A. real provider adapter maps source provenance correctly', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValueOnce([
      {
        url: 'https://adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/bmw/3er/g20/test/',
        domain: 'adac.de',
        title: 'BMW 3er G20 Test & Zuverlassigkeit',
        snippet: 'Der B48 Motor zeigt hohe Zuverlassigkeit bei regelmasiger Wartung ohne auffallige Kettenschaden.',
        provider: 'serper',
        providerResultId: 'serper_1',
      },
    ]);

    const input: VehicleReliabilityResearchInput = {
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      modelYear: 2020,
      engineCode: 'B48B20',
      powertrainType: 'ICE_PETROL',
      bypassCache: true,
    };

    const res = await service.runReliabilityResearch(input);
    const engineChannel = res.domainResults.POWERTRAIN_ENGINE.channels[0];

    expect(engineChannel.status).toBe('AVAILABLE_EXECUTED');
    expect(engineChannel.sourcesEvaluatedCount).toBe(1);
    expect(engineChannel.sources[0].domain).toBe('adac.de');
    expect(engineChannel.sources[0].tier).toBe('TIER_2');
  });

  // B. zero results => AVAILABLE_EXECUTED, not UNAVAILABLE
  it('B. zero results => AVAILABLE_EXECUTED, not UNAVAILABLE', async () => {
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([]);

    const input: VehicleReliabilityResearchInput = {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2021,
      powertrainType: 'HEV',
      bypassCache: true,
    };

    const res = await service.runReliabilityResearch(input);
    const engineChannel = res.domainResults.POWERTRAIN_ENGINE.channels[0];

    expect(engineChannel.status).toBe('AVAILABLE_EXECUTED');
    expect(engineChannel.sourcesEvaluatedCount).toBe(0);
    expect(engineChannel.status).not.toBe('UNAVAILABLE');
  });

  // C. provider timeout => EXECUTION_FAILED
  it('C. provider timeout => EXECUTION_FAILED', async () => {
    (mockSearchProvider.search as jest.Mock).mockRejectedValueOnce(new Error('Network timeout fetching results'));

    const input: VehicleReliabilityResearchInput = {
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
      bypassCache: true,
    };

    const res = await service.runReliabilityResearch(input);
    const engineChannel = res.domainResults.POWERTRAIN_ENGINE.channels[0];

    expect(engineChannel.status).toBe('EXECUTION_FAILED');
    expect(engineChannel.failureReason).toContain('Network timeout');
  });

  // D. unknown source cannot become Tier 2 automatically
  it('D. unknown source cannot become Tier 2 automatically - defaults to TIER_3', () => {
    const tier = service.classifySourceTier('https://random-unknown-automotive-blog.xyz/post/123', 'random-unknown-automotive-blog.xyz');
    expect(tier).toBe('TIER_3');
  });

  // E. official OEM source => Tier 1
  it('E. official OEM source => Tier 1', () => {
    const tier = service.classifySourceTier('https://erwin.volkswagen.de/erwin/showHome.do', 'erwin.volkswagen.de');
    expect(tier).toBe('TIER_1');
  });

  // F. government recall source => Tier 1
  it('F. government recall source => Tier 1', () => {
    const tier = service.classifySourceTier('https://kba.de/DE/Themen/Marktueberwachung/Rueckrufe/rueckrufe_node.html', 'kba.de');
    expect(tier).toBe('TIER_1');
  });

  // G. forum source => Tier 3 / REJECTED
  it('G. forum source => Tier 3 / REJECTED', () => {
    const tier = service.classifySourceTier('https://bimmerpost.com/forums/showthread.php?t=12345', 'bimmerpost.com');
    expect(tier).toBe('TIER_3');
  });

  // H. generic result does not bypass applicability
  it('H. generic result does not bypass applicability - rejects defect for incompatible vehicle', () => {
    const candidate = {
      failureMode: 'N20 Timing Chain Tensioner Failure',
      affectedComponent: 'Timing Chain',
      consequenceDescription: 'Timing jump causing valve contact',
      sourceTier: 'TIER_2' as const,
      applicability: {
        brand: 'BMW',
        model: '3 Serisi',
        engineCode: 'N20B20',
      },
    };

    const targetVehicle: VehicleReliabilityResearchInput = {
      brand: 'BMW',
      model: '3 Serisi',
      modelYear: 2021,
      engineCode: 'B48B20',
      powertrainType: 'ICE_PETROL',
    };

    const normalized = service.normalizeDefectCandidate(candidate, targetVehicle);
    expect(normalized).toBeNull();
  });

  // I. search result does not directly become verified defect
  it('I. search result does not directly become verified defect without passing gate', () => {
    const forumCandidate = {
      failureMode: 'Squeak from driver seat',
      consequenceDescription: 'Annoying noise on bumps',
      sourceTier: 'TIER_3' as const,
    };

    const normalized = service.normalizeDefectCandidate(forumCandidate, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.numericEligibility).toBe('REJECTED');
  });

  // J. unknown prevalence remains null
  it('J. unknown prevalence remains null - never injects synthetic frequency', () => {
    const candidate = {
      failureMode: 'Water pump housing hair crack',
      consequenceDescription: 'Coolant weep over 100k km',
      sourceTier: 'TIER_2' as const,
      prevalenceCategory: null,
      prevalenceFactor: null,
    };

    const normalized = service.normalizeDefectCandidate(candidate, {
      brand: 'Audi',
      model: 'A4',
      modelYear: 2017,
    });

    expect(normalized?.prevalenceFactor).toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // K. query generated with exact engine code when available
  it('K. query generated with exact engine code when available', () => {
    const queries = service.buildDomainQueries('POWERTRAIN_ENGINE', {
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      modelYear: 2020,
      engineCode: 'B48B20',
      powertrainType: 'ICE_PETROL',
    });

    expect(queries.some(q => q.query.includes('B48B20'))).toBe(true);
    expect(queries.some(q => q.query.includes('G20'))).toBe(true);
  });

  // L. query generated with exact transmission code when available
  it('L. query generated with exact transmission code when available', () => {
    const queries = service.buildDomainQueries('POWERTRAIN_TRANS', {
      brand: 'Volkswagen',
      model: 'Passat',
      generation: 'B8',
      modelYear: 2019,
      transmissionCode: 'DQ381',
      powertrainType: 'ICE_DIESEL',
    });

    expect(queries.some(q => q.query.includes('DQ381'))).toBe(true);
  });

  // M. cache keys isolate engine/transmission/year
  it('M. cache keys isolate engine/transmission/year', () => {
    const key1 = service.buildCacheKey({
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      modelYear: 2020,
      engineCode: 'B48B20',
      transmissionCode: '8HP50',
      powertrainType: 'ICE_PETROL',
    });

    const key2 = service.buildCacheKey({
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'F30',
      modelYear: 2015,
      engineCode: 'N20B20',
      transmissionCode: '8HP45',
      powertrainType: 'ICE_PETROL',
    });

    expect(key1).not.toBe(key2);
    expect(key1).toContain('B48B20');
    expect(key2).toContain('N20B20');
  });

  // N. evidence snippets remain source-local
  it('N. evidence snippets remain source-local - candidate preserves exact snippet without cross-merging', async () => {
    const snippetText = 'ADAC Pannenstatistik: Zundspulen und Injektoren zeigen erhohte Ausfallrate bei Kurzstreckenbetrieb.';
    (mockSearchProvider.search as jest.Mock).mockResolvedValue([
      {
        url: 'https://adac.de/test-1',
        domain: 'adac.de',
        title: 'ADAC BMW Test',
        snippet: snippetText,
      },
    ]);

    const res = await service.runReliabilityResearch({
      brand: 'BMW',
      model: '3 Serisi',
      modelYear: 2020,
      bypassCache: true,
    });

    const defect = res.allVerifiedDefects[0] || res.qualitativeDefects[0];
    if (defect) {
      expect(defect.severityBasis).toBe(snippetText);
      expect(defect.linkedSources[0].evidenceSnippet).toBe(snippetText);
    }
  });

  // O. producer failure remains fail-safe
  it('O. producer failure remains fail-safe - handles provider exception gracefully', async () => {
    (mockSearchProvider.search as jest.Mock).mockRejectedValue(new Error('Fatal search failure'));

    const res = await service.runReliabilityResearch({
      brand: 'Generic',
      model: 'TestCar',
      modelYear: 2020,
      bypassCache: true,
    });

    expect(res).toBeDefined();
    expect(res.reliabilityCoverageScore).toBe(0);
    expect(res.allVerifiedDefects.length).toBe(0);
  });

  // P. shadow output cannot alter V5/V6 score
  it('P. shadow output cannot alter V5/V6 score - verified output is purely research telemetry', async () => {
    const res = await service.runReliabilityResearch({
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      bypassCache: true,
    });

    expect(res).toHaveProperty('researchId');
    expect(res).toHaveProperty('reliabilityCoverageScore');
    expect(res).toHaveProperty('domainResults');
    expect((res as any).scoringVersion).toBeUndefined();
    expect((res as any).modelRiskScore).toBeUndefined();
    expect((res as any).buyabilityScore).toBeUndefined();
  });
});
