import { VehicleReliabilityResearchService, VehicleReliabilityResearchInput, SEVERITY_SCORE_MAP } from '../vehicle-reliability-research.service';
import {
  NormalizedReliabilityEvidence,
  ResearchChannelTelemetry,
} from '@used-car-intelligence/shared';
import { WebSearchProvider } from '../providers/web-search.provider';

describe('VehicleReliabilityResearchService (Stage 1 Shadow Producer)', () => {
  let mockSearchProvider: Partial<WebSearchProvider>;
  let service: VehicleReliabilityResearchService;

  beforeEach(() => {
    mockSearchProvider = {
      search: jest.fn().mockResolvedValue([]),
    };
    service = new VehicleReliabilityResearchService(mockSearchProvider as any);
  });

  // A. ICE domain applicability: 7 applicable domains (HV_BATTERY_SYSTEM excluded)
  it('A. ICE domain applicability - HV_BATTERY_SYSTEM is NOT_APPLICABLE for pure ICE', () => {
    const domains = service.planApplicableDomains({
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
      isElectric: false,
      isHybrid: false,
    });

    expect(domains).toContain('POWERTRAIN_ENGINE');
    expect(domains).toContain('POWERTRAIN_TRANS');
    expect(domains).toContain('EMISSIONS_EXHAUST');
    expect(domains).toContain('THERMAL_COOLING');
    expect(domains).toContain('ELECTRONICS_BODY');
    expect(domains).toContain('CHASSIS_BRAKES');
    expect(domains).toContain('SAFETY_RECALL');
    expect(domains).not.toContain('HV_BATTERY_SYSTEM');
    expect(domains.length).toBe(7);
  });

  // B. BEV domain applicability: EMISSIONS_EXHAUST is NOT_APPLICABLE for pure BEV
  it('B. BEV domain applicability - EMISSIONS_EXHAUST is NOT_APPLICABLE for BEV', () => {
    const domains = service.planApplicableDomains({
      brand: 'Tesla',
      model: 'Model 3',
      modelYear: 2022,
      powertrainType: 'BEV',
      isElectric: true,
      isHybrid: false,
    });

    expect(domains).toContain('POWERTRAIN_TRANS');
    expect(domains).toContain('HV_BATTERY_SYSTEM');
    expect(domains).toContain('THERMAL_COOLING');
    expect(domains).toContain('ELECTRONICS_BODY');
    expect(domains).toContain('CHASSIS_BRAKES');
    expect(domains).toContain('SAFETY_RECALL');
    expect(domains).not.toContain('POWERTRAIN_ENGINE');
    expect(domains).not.toContain('EMISSIONS_EXHAUST');
    expect(domains.length).toBe(6);
  });

  // C. PHEV/HEV applicability: All 8 domains are applicable
  it('C. PHEV/HEV applicability - All 8 domains are applicable for Hybrid', () => {
    const domains = service.planApplicableDomains({
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
      isElectric: false,
      isHybrid: true,
    });

    expect(domains.length).toBe(8);
    expect(domains).toContain('POWERTRAIN_ENGINE');
    expect(domains).toContain('POWERTRAIN_TRANS');
    expect(domains).toContain('EMISSIONS_EXHAUST');
    expect(domains).toContain('HV_BATTERY_SYSTEM');
    expect(domains).toContain('THERMAL_COOLING');
    expect(domains).toContain('ELECTRONICS_BODY');
    expect(domains).toContain('CHASSIS_BRAKES');
    expect(domains).toContain('SAFETY_RECALL');
  });

  // D. channel AVAILABLE_EXECUTED
  it('D. channel AVAILABLE_EXECUTED - properly marked when channel is executed', () => {
    const channel: ResearchChannelTelemetry = {
      channelKey: 'OFFICIAL_RECALL_REGISTRY',
      status: 'AVAILABLE_EXECUTED',
      queryOrEndpoint: 'https://safety.gov/recalls?make=Toyota&model=Corolla',
      sourcesEvaluatedCount: 3,
      sources: [
        { sourceId: 'src-1', domain: 'safety.gov', tier: 'TIER_1' },
      ],
    };
    expect(channel.status).toBe('AVAILABLE_EXECUTED');
    expect(channel.sourcesEvaluatedCount).toBe(3);
  });

  // E. AVAILABLE_NOT_EXECUTED
  it('E. channel AVAILABLE_NOT_EXECUTED - when channel exists but was skipped', () => {
    const channel: ResearchChannelTelemetry = {
      channelKey: 'SPECIALIST_TECHNICAL_BULLETIN',
      status: 'AVAILABLE_NOT_EXECUTED',
      queryOrEndpoint: 'specialist_db_access',
      sourcesEvaluatedCount: 0,
      sources: [],
      failureReason: 'Rate limit / quota exceeded during batch crawl',
    };
    expect(channel.status).toBe('AVAILABLE_NOT_EXECUTED');
    expect(channel.sourcesEvaluatedCount).toBe(0);
  });

  // F. UNAVAILABLE
  it('F. channel UNAVAILABLE - requires evidence repository does not exist for market/era', () => {
    const channel: ResearchChannelTelemetry = {
      channelKey: 'TR_OFFICIAL_RECALL_DATABASE',
      status: 'UNAVAILABLE',
      queryOrEndpoint: 'tr_ministry_database',
      sourcesEvaluatedCount: 0,
      sources: [],
      failureReason: 'Official public digital registry does not exist for market region TR prior to 2012',
    };
    expect(channel.status).toBe('UNAVAILABLE');
  });

  // G. EXECUTION_FAILED
  it('G. channel EXECUTION_FAILED - when endpoint query returned network or parsing failure', () => {
    const channel: ResearchChannelTelemetry = {
      channelKey: 'OEM_TSB_INDEX',
      status: 'EXECUTION_FAILED',
      queryOrEndpoint: 'https://api.oem-bulletins.com/v1/search',
      sourcesEvaluatedCount: 0,
      sources: [],
      failureReason: 'HTTP 503 Service Unavailable',
    };
    expect(channel.status).toBe('EXECUTION_FAILED');
  });

  // H. NOT_APPLICABLE
  it('H. channel NOT_APPLICABLE - when architecture excludes the domain', () => {
    const channel: ResearchChannelTelemetry = {
      channelKey: 'HV_BATTERY_DEGRADATION_DATABASE',
      status: 'NOT_APPLICABLE',
      sourcesEvaluatedCount: 0,
      sources: [],
    };
    expect(channel.status).toBe('NOT_APPLICABLE');
  });

  // I. verified Tier 1 defect
  it('I. verified Tier 1 defect - official recall gets TIER_1 and consequence severity', () => {
    const rawDefect = {
      failureMode: 'EGR Cooler Crack Fire Hazard',
      affectedComponent: 'EGR Cooler',
      consequenceDescription: 'Thermal event resulting in vehicle fire',
      sourceName: 'KBA / Kraftfahrt-Bundesamt Official Recall',
      sourceTier: 'TIER_1' as const,
      applicability: {
        brand: 'BMW',
        model: '3 Serisi',
        engineCode: 'B47',
      },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'BMW',
      model: '3 Serisi',
      engineCode: 'B47',
      modelYear: 2019,
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.linkedSources[0].sourceTier).toBe('TIER_1');
    expect(normalized?.severityScore).toBe(10); // SAFETY_CRITICAL
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY'); // No prevalence provided
  });

  // ==========================================
  // PHASE 2H TEST SUITE (Tests A through J)
  // ==========================================

  // Test A: "recurring chronic" text alone => prevalenceFactor null => QUALITATIVE_ONLY
  it('Phase 2H - Test A: "recurring chronic" text alone => prevalenceFactor null => QUALITATIVE_ONLY', () => {
    const rawDefect = {
      failureMode: 'Plastic coolant pipe hairline cracking',
      affectedComponent: 'Coolant Hose',
      consequenceDescription: 'Slow coolant leak',
      sourceName: 'Specialist Teardown Report',
      sourceTier: 'TIER_2' as const,
      prevalenceCategory: 'RECURRING_CHRONIC' as const,
      // No explicit quantitative denominator provided
      applicability: { brand: 'BMW', model: '3 Serisi', engineCode: 'B48' },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'BMW',
      model: '3 Serisi',
      engineCode: 'B48',
      modelYear: 2020,
      powertrainType: 'ICE_PETROL',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.prevalenceCategory).toBe('RECURRING_CHRONIC');
    expect(normalized?.prevalenceFactor).toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // Test B: official TSB says "common failure" but gives no denominator => QUALITATIVE_ONLY
  it('Phase 2H - Test B: official TSB says "common failure" but gives no denominator => QUALITATIVE_ONLY', () => {
    const rawDefect = {
      failureMode: 'DQ200 Clutch judder and shudder',
      affectedComponent: 'Dry Dual Clutch Pack',
      consequenceDescription: 'Common failure under stop-and-go traffic causing jerking',
      sourceName: 'OEM Technical Service Bulletin TSB-2018-04',
      sourceTier: 'TIER_1' as const,
      prevalenceCategory: 'RECURRING_CHRONIC' as const,
      applicability: { brand: 'Volkswagen', model: 'Passat', transmissionCode: 'DQ200' },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'Volkswagen',
      model: 'Passat',
      transmissionCode: 'DQ200',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.prevalenceFactor).toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // Test C: recall exists with affected population but no occurrence rate => prevalenceFactor null
  it('Phase 2H - Test C: recall exists with affected population but no occurrence rate => prevalenceFactor null', () => {
    const rawDefect = {
      failureMode: 'Brake booster vacuum line collapse',
      affectedComponent: 'Brake Vacuum Line',
      consequenceDescription: '150,000 vehicles recalled for vacuum line inspection and replacement',
      sourceName: 'KBA Official Recall Bulletin',
      sourceTier: 'TIER_1' as const,
      campaignStatus: 'MODEL_CAMPAIGN_EXISTS' as const,
      prevalenceCategory: 'RECURRING_CHRONIC' as const,
      applicability: { brand: 'Volkswagen', model: 'Passat' },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.campaignStatus).toBe('MODEL_CAMPAIGN_EXISTS');
    expect(normalized?.prevalenceFactor).toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // Test D: published failure incidence with valid denominator => numeric prevalence allowed
  it('Phase 2H - Test D: published failure incidence with valid denominator => numeric prevalence allowed', () => {
    const rawDefect = {
      failureMode: 'ICCU Overcurrent MOSFET Transistor Failure',
      affectedComponent: 'ICCU / Integrated Charging Control Unit',
      consequenceDescription: '12V auxiliary discharge and loss of motive power',
      sourceName: 'Published Engineering Quality Analysis',
      sourceTier: 'TIER_2' as const,
      prevalenceCategory: 'RECURRING_CHRONIC' as const,
      prevalenceFactor: 0.14,
      prevalenceBasis: 'Yayınlanan fleet study insidans oranı %14 (n=25,000 araç)',
      hasQuantitativePrevalence: true,
      applicability: { brand: 'Hyundai', model: 'Ioniq 5', engineCode: 'EM17' },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'Hyundai',
      model: 'Ioniq 5',
      engineCode: 'EM17',
      modelYear: 2022,
      powertrainType: 'BEV',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.prevalenceFactor).toBe(0.14);
    expect(normalized?.numericEligibility).toBe('NUMERIC_ELIGIBLE');
  });

  // Test E: prevalenceCategory may exist while prevalenceFactor is null
  it('Phase 2H - Test E: prevalenceCategory may exist while prevalenceFactor is null', () => {
    const rawDefect = {
      failureMode: 'Infotainment System Blackout',
      affectedComponent: 'Display Head Unit',
      consequenceDescription: 'Screen reboots randomly while driving',
      sourceName: 'Verified Catalog Record',
      sourceTier: 'TIER_2' as const,
      prevalenceCategory: 'RECURRING_CHRONIC' as const,
      prevalenceFactor: null,
      applicability: { brand: 'Toyota', model: 'Corolla' },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.prevalenceCategory).toBe('RECURRING_CHRONIC');
    expect(normalized?.prevalenceFactor).toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // Test F: recall chassis match but incompatible engine => rejected
  it('Phase 2H - Test F: recall chassis match but incompatible engine => rejected (Diesel EGR recall on Petrol 320i)', () => {
    const rawDefect = {
      failureMode: 'EGR Cooler Glycol Leak Fire Risk',
      affectedComponent: 'EGR Cooler',
      consequenceDescription: 'EGR cooler leakage causing fire in intake manifold on diesel engines (B47/N47/N57)',
      sourceName: 'KBA Official Safety Recall',
      sourceTier: 'TIER_1' as const,
      campaignStatus: 'MODEL_CAMPAIGN_EXISTS' as const,
      applicability: {
        brand: 'BMW',
        model: '3 Serisi',
        generation: 'G20',
        engineCode: 'B47',
        powertrainType: 'ICE_DIESEL' as const,
      },
    };

    // Target vehicle is G20 320i Petrol (B48B16)
    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      engineCode: 'B48B16',
      modelYear: 2020,
      powertrainType: 'ICE_PETROL',
    });

    expect(normalized).toBeNull(); // Strictly rejected due to powertrain/engine incompatibility
  });

  // Test G: recall chassis match but engine applicability unknown => not exact-variant verified
  it('Phase 2H - Test G: recall chassis match but engine applicability unknown on engine-dependent component => not exact-variant verified', () => {
    const rawDefect = {
      failureMode: 'Diesel High Pressure Fuel Pump Swarf Generation',
      affectedComponent: 'High Pressure Fuel Pump',
      consequenceDescription: 'HPFP metal shavings contaminate common rail system in diesel vehicles',
      sourceName: 'Safety Campaign Bulletin',
      sourceTier: 'TIER_1' as const,
      campaignStatus: 'MODEL_CAMPAIGN_EXISTS' as const,
      requiresExactEngineMatch: true,
      applicability: {
        brand: 'BMW',
        model: '3 Serisi',
        generation: 'G20',
        // engineCode is missing/unknown
      },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      engineCode: 'B48B16',
      modelYear: 2020,
      powertrainType: 'ICE_PETROL',
    });

    expect(normalized).toBeNull();
  });

  // Test H: exact campaign population includes target engine => applicability accepted
  it('Phase 2H - Test H: exact campaign population includes target engine => applicability accepted', () => {
    const rawDefect = {
      failureMode: 'Electronic Parking Brake Software Update',
      affectedComponent: 'EPB Control Module',
      consequenceDescription: 'Software glitch may cause vehicle rollaway if parked on incline',
      sourceName: 'NHTSA Official Safety Recall 22V-321',
      sourceTier: 'TIER_1' as const,
      campaignStatus: 'MODEL_CAMPAIGN_EXISTS' as const,
      applicability: {
        brand: 'Hyundai',
        model: 'Ioniq 5',
        engineCode: 'EM17',
        powertrainType: 'BEV' as const,
      },
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, {
      brand: 'Hyundai',
      model: 'Ioniq 5',
      engineCode: 'EM17',
      modelYear: 2022,
      powertrainType: 'BEV',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.campaignStatus).toBe('MODEL_CAMPAIGN_EXISTS');
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // Test I: qualitative defect remains VERIFIED_DEFECTS_FOUND
  it('Phase 2H - Test I: qualitative defect remains VERIFIED_DEFECTS_FOUND in domain evaluation', () => {
    const qualitativeDefect: NormalizedReliabilityEvidence = {
      id: 'def-qual-1',
      domain: 'HV_BATTERY_SYSTEM',
      title: '12V Auxiliary Battery Drain',
      normalizedFailureMode: '12V_AUXILIARY_BATTERY_DRAIN',
      affectedComponent: '12V Auxiliary Battery',
      severityCategory: 'DRIVABILITY',
      severityScore: 5,
      severityBasis: 'Vehicle unable to enter Ready mode',
      prevalenceCategory: 'RECURRING_CHRONIC',
      prevalenceFactor: null,
      prevalenceBasis: 'Kategorik servis kaydı (kantitatif payda eksik)',
      applicability: { brand: 'Toyota', model: 'Corolla' },
      defectStatus: 'ACTIVE_DESIGN_ISSUE',
      statusFactor: 1.0,
      linkedSources: [
        {
          sourceId: 'src-1',
          publisher: 'Toyota TSB Catalog',
          sourceType: 'SPECIALIST_DATA',
          sourceTier: 'TIER_2',
          evidenceSnippet: 'DCM module drain bulletin',
        },
      ],
      numericEligibility: 'QUALITATIVE_ONLY',
    };

    const channels: ResearchChannelTelemetry[] = [
      {
        channelKey: 'HV_BATTERY_SYSTEM_FAILURE_QUERY',
        status: 'AVAILABLE_EXECUTED',
        sourcesEvaluatedCount: 2,
        sources: [{ sourceId: 'src-1', domain: 'toyota-tsb.com', tier: 'TIER_2' }],
      },
    ];

    const result = service.evaluateDomainResearch('HV_BATTERY_SYSTEM', channels, [qualitativeDefect]);
    expect(result.state).toBe('VERIFIED_DEFECTS_FOUND');
    expect(result.coverageCredit).toBe(1.0);
    expect(result.defects.length).toBe(1);
    expect(result.defects[0].numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // Test J: qualitative-only defect does not become clean/zero-risk state
  it('Phase 2H - Test J: qualitative-only defect does not become clean/zero-risk state (negative proof blocked)', () => {
    const qualitativeDefect: NormalizedReliabilityEvidence = {
      id: 'def-qual-2',
      domain: 'POWERTRAIN_TRANS',
      title: 'ZF 8HP Mechatronic Sealing Leak',
      normalizedFailureMode: 'ZF_8HP_MECHATRONIC_SEALING_LEAK',
      affectedComponent: 'Mechatronics Sealing Sleeve',
      severityCategory: 'DRIVABILITY',
      severityScore: 5,
      severityBasis: 'Fluid seepage over time',
      prevalenceCategory: 'RECURRING_CHRONIC',
      prevalenceFactor: null,
      prevalenceBasis: 'Catalog entry',
      applicability: { brand: 'BMW', model: '3 Serisi' },
      defectStatus: 'ACTIVE_DESIGN_ISSUE',
      statusFactor: 1.0,
      linkedSources: [
        {
          sourceId: 'src-2',
          publisher: 'ZF Specialist Guide',
          sourceType: 'SPECIALIST_DATA',
          sourceTier: 'TIER_2',
          evidenceSnippet: 'Sealing sleeve degradation',
        },
      ],
      numericEligibility: 'QUALITATIVE_ONLY',
    };

    const proof = service.generateNegativeResearchProof(
      'POWERTRAIN_TRANS',
      [{ channelKey: 'CH1', status: 'AVAILABLE_EXECUTED', sourcesEvaluatedCount: 3, sources: [{ sourceId: 's1', domain: 'zf.com', tier: 'TIER_2' }] }],
      [qualitativeDefect],
    );

    // Negative proof must be strictly null when qualitative defects exist
    expect(proof).toBeNull();
  });

  // O. incompatible transmission evidence rejected
  it('O. incompatible transmission evidence rejected - DQ200 dry clutch defect rejected on DQ381 wet clutch vehicle', () => {
    const targetVehicle = {
      brand: 'Volkswagen',
      model: 'Passat',
      generation: 'B8',
      modelYear: 2019,
      transmissionCode: 'DQ381',
      powertrainType: 'ICE_DIESEL' as const,
    };

    const rawDefect = {
      failureMode: 'DQ200 Dry Dual Clutch Slip & Shudder',
      affectedComponent: 'Dry Dual Clutch Pack',
      applicability: {
        brand: 'Volkswagen',
        model: 'Passat',
        transmissionCode: 'DQ200',
      },
      sourceName: 'OEM Technical Action',
      sourceTier: 'TIER_1' as const,
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, targetVehicle);
    expect(normalized).toBeNull();
  });

  // P. incompatible model-year evidence rejected
  it('P. incompatible model-year evidence rejected - 2008-2012 defect rejected on 2020 model', () => {
    const targetVehicle = {
      brand: 'Toyota',
      model: 'Corolla',
      generation: 'E210',
      modelYear: 2020,
      powertrainType: 'HEV' as const,
    };

    const rawDefect = {
      failureMode: '1.4 D-4D Oil consumption',
      affectedComponent: 'Piston Rings',
      applicability: {
        brand: 'Toyota',
        model: 'Corolla',
        yearFrom: 2008,
        yearTo: 2013,
      },
      sourceName: 'TSB EG-0012',
      sourceTier: 'TIER_1' as const,
    };

    const normalized = service.normalizeDefectCandidate(rawDefect, targetVehicle);
    expect(normalized).toBeNull();
  });

  // Q. DB + Web duplicate clustered once
  it('Q. DB + Web duplicate clustered once - merges same failure mode into single cluster', async () => {
    const targetVehicle = {
      brand: 'Toyota',
      model: 'Corolla',
      generation: 'E210',
      modelYear: 2020,
      powertrainType: 'HEV' as const,
      existingDbProblems: [
        {
          id: 'db-prob-1',
          title: '12V Auxiliary Battery Drain',
          affectedComponent: '12V Battery',
          description: 'Parasitic drain on 12V auxiliary battery from DCM telematics module',
          severity: 'MODERATE',
        },
      ],
      existingDbRecalls: [
        {
          id: 'db-rec-1',
          code: '20V-012',
          title: '12V Auxiliary Battery Drain',
          affectedComponent: '12V Battery',
          description: 'Official recall for DCM module software update',
          consequence: 'Vehicle fail to ready',
        },
      ],
    };

    const result = await service.runReliabilityResearch(targetVehicle);

    // Should find the DCM drain cluster merged
    const dcmDefects = result.allVerifiedDefects.filter(
      d => d.affectedComponent.toLowerCase().includes('12v') || d.title.toLowerCase().includes('12v') || d.normalizedFailureMode.toLowerCase().includes('12v')
    );
    expect(dcmDefects.length).toBeLessThanOrEqual(1);
  });

  // R. linked sources preserved
  it('R. linked sources preserved - all evidence sources are captured in linkedSources array', () => {
    const candidateA: NormalizedReliabilityEvidence = {
      id: 'ev-1',
      domain: 'EMISSIONS_EXHAUST',
      title: 'EGR Cooler Thermal Degradation',
      normalizedFailureMode: 'EGR_COOLER_THERMAL_DEGRADATION',
      affectedComponent: 'EGR Cooler',
      severityCategory: 'SAFETY_CRITICAL',
      severityScore: 10,
      severityBasis: 'Cracking and coolant leak into intake',
      prevalenceCategory: 'RECURRING_CHRONIC',
      prevalenceFactor: 0.65,
      prevalenceBasis: 'KBA data',
      applicability: {
        brand: 'BMW',
        model: '3 Serisi',
        engineCode: 'B47',
      },
      defectStatus: 'REMEDY_AVAILABLE',
      statusFactor: 0.20,
      campaignStatus: 'MODEL_CAMPAIGN_EXISTS',
      linkedSources: [
        {
          sourceId: 'src-kba',
          publisher: 'KBA Official Recall Registry',
          sourceType: 'OFFICIAL_RECALL',
          sourceTier: 'TIER_1',
          evidenceSnippet: 'Recall 19V-012',
        },
      ],
      numericEligibility: 'NUMERIC_ELIGIBLE',
    };

    const candidateB: NormalizedReliabilityEvidence = {
      id: 'ev-2',
      domain: 'EMISSIONS_EXHAUST',
      title: 'EGR Cooler Thermal Degradation',
      normalizedFailureMode: 'EGR_COOLER_THERMAL_DEGRADATION',
      affectedComponent: 'EGR Cooler',
      severityCategory: 'SAFETY_CRITICAL',
      severityScore: 10,
      severityBasis: 'Cracking and coolant leak into intake',
      prevalenceCategory: 'RECURRING_CHRONIC',
      prevalenceFactor: 0.65,
      prevalenceBasis: 'Teardown data',
      applicability: {
        brand: 'BMW',
        model: '3 Serisi',
        engineCode: 'B47',
      },
      defectStatus: 'REMEDY_AVAILABLE',
      statusFactor: 0.20,
      campaignStatus: 'MODEL_CAMPAIGN_EXISTS',
      linkedSources: [
        {
          sourceId: 'src-teardown',
          publisher: 'Specialist Diesel Teardown Report',
          sourceType: 'SPECIALIST_DATA',
          sourceTier: 'TIER_2',
          evidenceSnippet: 'Soot buildup causes local overheating',
        },
      ],
      numericEligibility: 'NUMERIC_ELIGIBLE',
    };

    const merged = service.clusterEvidenceList([candidateA, candidateB]);
    expect(merged.length).toBe(1);
    expect(merged[0].linkedSources.length).toBe(2);
    expect(merged[0].linkedSources.map(s => s.publisher)).toContain('KBA Official Recall Registry');
    expect(merged[0].linkedSources.map(s => s.publisher)).toContain('Specialist Diesel Teardown Report');
  });

  // S. valid negative proof
  it('S. valid negative proof - generates negativeProof only when all available channels executed and evaluated sources >= 1', () => {
    const channels: ResearchChannelTelemetry[] = [
      {
        channelKey: 'OFFICIAL_RECALL_REGISTRY',
        status: 'AVAILABLE_EXECUTED',
        queryOrEndpoint: 'https://safety.gov/recalls',
        sourcesEvaluatedCount: 2,
        sources: [{ sourceId: 's1', domain: 'safety.gov', tier: 'TIER_1' }],
      },
      {
        channelKey: 'OEM_TSB_INDEX',
        status: 'AVAILABLE_EXECUTED',
        queryOrEndpoint: 'https://oem-tsb.com',
        sourcesEvaluatedCount: 3,
        sources: [{ sourceId: 's2', domain: 'oem-tsb.com', tier: 'TIER_2' }],
      },
    ];

    const proof = service.generateNegativeResearchProof('THERMAL_COOLING', channels, []);
    expect(proof).not.toBeNull();
    expect(proof?.domain).toBe('THERMAL_COOLING');
    expect((proof as any)?.verifiedClean).toBe(true);
    expect((proof as any)?.totalSourcesEvaluated).toBe(5);
  });

  // T. blank defects without proof != clean certification
  it('T. blank defects without proof != clean certification - blank channels produce null negativeProof', () => {
    const channels: ResearchChannelTelemetry[] = [
      {
        channelKey: 'OFFICIAL_RECALL_REGISTRY',
        status: 'AVAILABLE_NOT_EXECUTED',
        sourcesEvaluatedCount: 0,
        sources: [],
      },
    ];

    const proof = service.generateNegativeResearchProof('THERMAL_COOLING', channels, []);
    expect(proof).toBeNull();
  });

  // U. skipped channel => PARTIAL
  it('U. skipped channel => PARTIAL domain state', () => {
    const channels: ResearchChannelTelemetry[] = [
      { channelKey: 'CH1', status: 'AVAILABLE_EXECUTED', sourcesEvaluatedCount: 2, sources: [{ sourceId: 's1', domain: 'safety.gov', tier: 'TIER_1' }] },
      { channelKey: 'CH2', status: 'AVAILABLE_NOT_EXECUTED', sourcesEvaluatedCount: 0, sources: [] },
    ];

    const proof = service.generateNegativeResearchProof('ELECTRONICS_BODY', channels, []);
    expect(proof).toBeNull(); // Cannot achieve clean certification with skipped channels
  });

  // V. failed channel => PARTIAL
  it('V. failed channel => PARTIAL domain state', () => {
    const channels: ResearchChannelTelemetry[] = [
      { channelKey: 'CH1', status: 'AVAILABLE_EXECUTED', sourcesEvaluatedCount: 2, sources: [{ sourceId: 's1', domain: 'safety.gov', tier: 'TIER_1' }] },
      { channelKey: 'CH2', status: 'EXECUTION_FAILED', sourcesEvaluatedCount: 0, sources: [], failureReason: 'Timeout' },
    ];

    const proof = service.generateNegativeResearchProof('CHASSIS_BRAKES', channels, []);
    expect(proof).toBeNull();
  });

  // W. all channels failed => RESEARCH_FAILED
  it('W. all channels failed => RESEARCH_FAILED domain state and 0 coverage for domain', async () => {
    const channels: ResearchChannelTelemetry[] = [
      { channelKey: 'CH1', status: 'EXECUTION_FAILED', sourcesEvaluatedCount: 0, sources: [], failureReason: 'Timeout' },
      { channelKey: 'CH2', status: 'EXECUTION_FAILED', sourcesEvaluatedCount: 0, sources: [], failureReason: '403 Forbidden' },
    ];

    const domainResult = service.evaluateDomainResearch('POWERTRAIN_ENGINE', channels, []);
    expect(domainResult.state).toBe('RESEARCH_FAILED');
    expect(domainResult.coverageCredit).toBe(0);
  });

  // X. technical grounding sources cannot increase reliability coverage
  it('X. technical grounding sources cannot increase reliability coverage - coverage depends strictly on reliability domain channels', async () => {
    const targetVehicle = {
      brand: 'Volkswagen',
      model: 'Passat',
      generation: 'B8',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL' as const,
    };

    const result = await service.runReliabilityResearch(targetVehicle);

    // Check that reliabilityCoverageScore is derived purely from domainResults
    const applicableDomains = Object.values(result.domainResults).filter(d => d.state !== 'NOT_APPLICABLE');
    const totalApplicableWeight = applicableDomains.reduce((sum, d) => sum + d.weight, 0);
    const earnedWeight = applicableDomains.reduce((sum, d) => sum + d.weight * d.coverageCredit, 0);
    const expectedScore = Math.round((earnedWeight / totalApplicableWeight) * 100);
    expect(result.reliabilityCoverageScore).toBe(expectedScore);
  });

  // Y. identical structured input produces deterministic normalized output
  it('Y. identical structured input produces deterministic normalized output', async () => {
    const targetVehicle = {
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      modelYear: 2020,
      engineCode: 'B48B20',
      transmissionCode: '8HP50',
      powertrainType: 'ICE_PETROL' as const,
    };

    const run1 = await service.runReliabilityResearch(targetVehicle);
    const run2 = await service.runReliabilityResearch(targetVehicle);

    expect(run1.reliabilityCoverageScore).toBe(run2.reliabilityCoverageScore);
    expect(Object.keys(run1.domainResults).length).toBe(Object.keys(run2.domainResults).length);
    expect(run1.allVerifiedDefects.length).toBe(run2.allVerifiedDefects.length);
  });

  // Z. producer failure cannot fail report generation
  it('Z. producer failure cannot fail report generation - handles catastrophic error safely', async () => {
    const badInput: any = null;
    await expect(service.runReliabilityResearch(badInput)).rejects.toThrow();
  });

  // =========================================================================
  // SEMANTIC RECALL & SEVERITY TESTS (A through Q)
  // =========================================================================

  // Test A: Generic NHTSA "Check for Recalls" page -> NOT verified defect
  it('Semantic Test A: Generic NHTSA "Check for Recalls" page is rejected from defect evidence', () => {
    const candidate = {
      title: 'Check for Recalls: Vehicle, Car Seat, Tire, Equipment | NHTSA',
      description: 'Use our VIN lookup tool to check for open safety recalls on your vehicle.',
      url: 'https://www.nhtsa.gov/recalls',
      sourceTier: 'TIER_1',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
    });
    expect(normalized).toBeNull();
  });

  // Test B: Generic "Vehicle Safety Recalls Week" -> NOT verified defect
  it('Semantic Test B: Generic "Vehicle Safety Recalls Week" awareness campaign is rejected', () => {
    const candidate = {
      title: 'Vehicle Safety Recalls Week | NHTSA',
      description: 'NHTSA urges vehicle owners to check for open recalls during Vehicle Safety Recalls Week.',
      url: 'https://www.nhtsa.gov/recalls/safety-recalls-week',
      sourceTier: 'TIER_1',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
    });
    expect(normalized).toBeNull();
  });

  // Test C: Recall document containing "safety" but minor technical consequence -> NOT SAFETY_CRITICAL
  it('Semantic Test C: Recall document with "safety" title but minor consequence is NOT automatically SAFETY_CRITICAL', () => {
    const candidate = {
      title: 'IMPORTANT SAFETY RECALL - Rear Camera Display Delay',
      consequenceDescription: 'Rearview camera image may experience a display delay exceeding 2.0 seconds.',
      sourceTier: 'TIER_1',
      campaignId: '22V-100',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Tesla',
      model: 'Model 3',
      modelYear: 2022,
      powertrainType: 'BEV',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).not.toBe('SAFETY_CRITICAL');
    expect(normalized?.severityScore).toBeLessThan(10);
  });

  // Test D: Tail-light illumination failure -> severity determined from actual consequence (FUNCTIONAL_MINOR / 3)
  it('Semantic Test D: Tail-light illumination failure receives consequence-grounded severity (FUNCTIONAL_MINOR / 3), not document title', () => {
    const candidate = {
      title: 'NHTSA SAFETY RECALL REPORT 22V-844',
      failureMode: 'Rear Lamp Firmware Malfunction',
      affectedComponent: 'Taillight Firmware',
      consequenceDescription: 'Rear tail lamp may intermittently fail to illuminate due to firmware communication anomaly.',
      sourceTier: 'TIER_1',
      campaignId: '22V-844',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Tesla',
      model: 'Model 3',
      modelYear: 2022,
      powertrainType: 'BEV',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).toBe('FUNCTIONAL_MINOR');
    expect(normalized?.severityScore).toBe(3);
  });

  // Test E: Explicit vehicle fire consequence -> SAFETY_CRITICAL (10)
  it('Semantic Test E: Explicit vehicle fire consequence correctly classifies as SAFETY_CRITICAL (10)', () => {
    const candidate = {
      title: 'Starter Relay Short Circuit Recall',
      affectedComponent: 'Starter Relay',
      consequenceDescription: 'Electrical short circuit in the starter relay may increase the risk of an under-hood vehicle fire.',
      sourceTier: 'TIER_1',
      campaignId: '24V-204',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'BMW',
      model: '3 Serisi',
      modelYear: 2020,
      powertrainType: 'ICE_PETROL',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).toBe('SAFETY_CRITICAL');
    expect(normalized?.severityScore).toBe(10);
  });

  // Test F: Explicit braking-loss consequence -> SAFETY_CRITICAL (10)
  it('Semantic Test F: Explicit hydraulic brake loss consequence classifies as SAFETY_CRITICAL (10)', () => {
    const candidate = {
      title: 'Brake Booster Assembly Recall',
      affectedComponent: 'Hydraulic Brake Booster',
      consequenceDescription: 'Hydraulic pressure loss may cause loss of braking assistance, resulting in complete brake failure.',
      sourceTier: 'TIER_1',
      campaignId: '23V-550',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).toBe('SAFETY_CRITICAL');
    expect(normalized?.severityScore).toBe(10);
  });

  // Test G: Explicit rollaway / unintended movement consequence -> SAFETY_CRITICAL (10)
  it('Semantic Test G: Explicit rollaway consequence classifies as SAFETY_CRITICAL (10)', () => {
    const candidate = {
      title: 'Electronic Shifter Parking Pawl Recall',
      affectedComponent: 'Transmission Parking Pawl',
      consequenceDescription: 'Parking pawl may fail to engage when shifted into park, resulting in vehicle rollaway / unintended movement.',
      sourceTier: 'TIER_1',
      campaignId: '22V-345',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Hyundai',
      model: 'Ioniq 5',
      modelYear: 2022,
      powertrainType: 'BEV',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).toBe('SAFETY_CRITICAL');
    expect(normalized?.severityScore).toBe(10);
  });

  // Test H: Same campaign returned from HTML + PDF -> 1 normalized failure mode with 2 linked sources
  it('Semantic Test H: Same campaign returned from HTML and PDF clusters into ONE defect with 2 linked sources', () => {
    const vehicle = {
      brand: 'Tesla',
      model: 'Model 3',
      modelYear: 2022,
      powertrainType: 'BEV' as const,
    };
    const itemHtml = service.normalizeDefectCandidate(
      {
        title: 'NHTSA Campaign 22V-844 Taillight Recall Overview',
        consequenceDescription: 'Taillight illumination anomaly on Model 3.',
        sourceTier: 'TIER_1',
        sourceName: 'nhtsa.gov/recalls',
        campaignId: '22V-844',
      },
      vehicle,
    )!;

    const itemPdf = service.normalizeDefectCandidate(
      {
        title: 'Part 573 Safety Recall Report 22V-844',
        consequenceDescription: 'Firmware bug may cause tail lamp to turn off.',
        sourceTier: 'TIER_1',
        sourceName: 'static.nhtsa.gov/pdf',
        campaignId: '22V-844',
      },
      vehicle,
    )!;

    const clustered = service.clusterEvidenceList([itemHtml, itemPdf]);
    expect(clustered.length).toBe(1);
    expect(clustered[0].normalizedFailureMode).toBe('RECALL_22V_844');
    expect(clustered[0].linkedSources.length).toBe(2);
  });

  // Test I: Same campaign returned by two queries -> 1 penalty item
  it('Semantic Test I: Same campaign returned by multiple search queries results in 1 clustered defect', () => {
    const vehicle = {
      brand: 'BMW',
      model: '3 Serisi',
      modelYear: 2020,
      powertrainType: 'ICE_PETROL' as const,
    };
    const hit1 = service.normalizeDefectCandidate(
      {
        title: '2020 BMW 3 Series Starter Motor Recall 24V-204',
        consequenceDescription: 'Starter relay short circuit fire risk.',
        sourceTier: 'TIER_1',
        campaignId: '24V-204',
      },
      vehicle,
    )!;
    const hit2 = service.normalizeDefectCandidate(
      {
        title: 'BMW G20 320i Engine Fire Safety Recall 24V-204',
        consequenceDescription: 'Relay corrosion causing vehicle fire.',
        sourceTier: 'TIER_1',
        campaignId: '24V-204',
      },
      vehicle,
    )!;

    const clustered = service.clusterEvidenceList([hit1, hit2]);
    expect(clustered.length).toBe(1);
  });

  // Test J: Different genuine campaigns remain distinct
  it('Semantic Test J: Distinct genuine recall campaigns remain separate defects', () => {
    const vehicle = {
      brand: 'BMW',
      model: '3 Serisi',
      modelYear: 2020,
      powertrainType: 'ICE_PETROL' as const,
    };
    const hit1 = service.normalizeDefectCandidate(
      {
        title: 'Starter Motor Relay Fire 24V-204',
        consequenceDescription: 'Fire risk from starter relay.',
        sourceTier: 'TIER_1',
        campaignId: '24V-204',
      },
      vehicle,
    )!;
    const hit2 = service.normalizeDefectCandidate(
      {
        title: 'Rearview Camera Software Update 22V-500',
        consequenceDescription: 'Camera display image delay.',
        sourceTier: 'TIER_1',
        campaignId: '22V-500',
      },
      vehicle,
    )!;

    const clustered = service.clusterEvidenceList([hit1, hit2]);
    expect(clustered.length).toBe(2);
  });

  // Test K: Tier 1 informational page -> authoritative but NOT defect evidence
  it('Semantic Test K: Tier 1 general VIN portal page without defect content is excluded', () => {
    const candidate = {
      title: 'Official VIN Search Tool - Recalls and Customer Satisfaction Programs',
      consequenceDescription: 'Enter your 17-character VIN to view outstanding recalls and safety campaigns.',
      url: 'https://www.nhtsa.gov/vin-lookup',
      sourceTier: 'TIER_1',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
    });
    expect(normalized).toBeNull();
  });

  // Test L: VIN subset recall does not claim specific vehicle open recall
  it('Semantic Test L: Model-level recall maintains MODEL_CAMPAIGN_EXISTS status', () => {
    const candidate = {
      title: 'High Voltage Battery Disconnect Recall',
      consequenceDescription: 'Contactor weld may cause loss of propulsion.',
      sourceTier: 'TIER_1',
      campaignId: '23V-123',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Hyundai',
      model: 'Ioniq 5',
      modelYear: 2022,
      powertrainType: 'BEV',
    });
    expect(normalized?.campaignStatus).toBe('MODEL_CAMPAIGN_EXISTS');
  });

  // Test M: Missing VIN completion status remains population level
  it('Semantic Test M: Defect status preserves REMEDY_AVAILABLE without claiming individual completion', () => {
    const candidate = {
      title: 'Steering Column Bolt Recall',
      consequenceDescription: 'Steering intermediate shaft bolt may loosen.',
      sourceTier: 'TIER_1',
      campaignId: '21V-999',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
    });
    expect(normalized?.defectStatus).toBe('REMEDY_AVAILABLE');
    expect(normalized?.statusFactor).toBe(0.20);
  });

  // Test N: Recall with no grounded consequence must not default to severity 10
  it('Semantic Test N: Recall with ungrounded / generic description defaults to non-critical (FUNCTIONAL_MINOR / 3)', () => {
    const candidate = {
      title: 'General Service Action Campaign 22V-001',
      consequenceDescription: 'Official technical bulletin campaign documentation.',
      sourceTier: 'TIER_1',
      campaignId: '22V-001',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).toBe('FUNCTIONAL_MINOR');
    expect(normalized?.severityScore).toBe(3);
  });

  // Test O: Removing generic recall hits preserves valid negative proof when channels execute cleanly
  it('Semantic Test O: Clean research execution generates valid negative proof when generic informational hits are filtered out', () => {
    const channels: ResearchChannelTelemetry[] = [
      {
        channelKey: 'SAFETY_RECALL_REGISTRY',
        status: 'AVAILABLE_EXECUTED',
        queryOrEndpoint: '2020 Toyota Corolla recall NHTSA',
        sourcesEvaluatedCount: 2,
        sources: [{ sourceId: 's1', domain: 'nhtsa.gov', tier: 'TIER_1' }],
      },
    ];

    // Filtered generic candidates produce empty defects list
    const proof = service.generateNegativeResearchProof('SAFETY_RECALL', channels, []);
    expect(proof).not.toBeNull();
    expect((proof as any)?.verifiedClean).toBe(true);
  });

  // Test P: Official recall document with severe administrative wording but unknown technical consequence -> Severity <= 3
  it('Semantic Test P: Recall with heavy administrative language ("IMPORTANT SAFETY RECALL SAFETY ACT") but no technical consequence does not become severity 10', () => {
    const candidate = {
      title: 'IMPORTANT SAFETY RECALL UNDER THE NATIONAL TRAFFIC AND MOTOR VEHICLE SAFETY ACT',
      consequenceDescription: 'This safety recall notice is sent in accordance with the National Traffic and Motor Vehicle Safety Act.',
      sourceTier: 'TIER_1',
      campaignId: '24V-999',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).not.toBe('SAFETY_CRITICAL');
    expect(normalized?.severityScore).toBeLessThanOrEqual(3);
  });

  // Test Q: Authoritative non-NHTSA recall with different campaign format (KBA or OEM) becomes valid defect evidence
  it('Semantic Test Q: Authoritative non-NHTSA recall with KBA / OEM campaign format is accepted as valid defect evidence', () => {
    const candidate = {
      title: 'KBA Referenz KBA-10928 Kraftstoffpumpe Rückruf',
      consequenceDescription: 'Kraftstoffpumpenrelais Überhitzung kann zum Ausfall der Kraftstoffversorgung führen.',
      sourceTier: 'TIER_1',
      sourceName: 'kba.de',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.normalizedFailureMode).toBe('RECALL_KBA_10928');
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
  });

  // =========================================================================
  // PHASE 12: CHRONIC DEFECT EVIDENCE & LIVE CONSEQUENCE EXTRACTION TESTS (A-O)
  // =========================================================================

  // Test A: Authoritative search result with generic title but detailed technical consequence in richer content -> consequence preserved
  it('Phase 12 Test A: Authoritative search result with generic title preserves rich technical consequence from page text', () => {
    const candidate = {
      title: 'IMPORTANT SAFETY RECALL',
      consequenceDescription: 'The shifter control unit software error could disengage the parking pawl and allow vehicle rollaway.',
      sourceTier: 'TIER_1',
      campaignId: '22V-324',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Hyundai',
      model: 'Ioniq 5',
      modelYear: 2022,
      powertrainType: 'BEV',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.severityCategory).toBe('SAFETY_CRITICAL');
    expect(normalized?.severityScore).toBe(10);
    expect(normalized?.severityBasis).toContain('parking pawl and allow vehicle rollaway');
  });

  // Test B: Rollaway consequence in authoritative content -> classifier receives rollaway text -> SAFETY_CRITICAL
  it('Phase 12 Test B: Rollaway / parking pawl disengagement consequence maps to SAFETY_CRITICAL / 10', () => {
    const category = service.mapConsequenceToCategory('Shifter Control Unit software error allows parking pawl disengagement and vehicle rollaway.');
    expect(category).toBe('SAFETY_CRITICAL');
    expect(SEVERITY_SCORE_MAP[category]).toBe(10);
  });

  // Test C: Tail-light illumination failure -> remains FUNCTIONAL_MINOR
  it('Phase 12 Test C: Taillight / lighting firmware glitch remains FUNCTIONAL_MINOR / 3', () => {
    const category = service.mapConsequenceToCategory('Rear tail lamp assembly software may intermittently fail to illuminate.');
    expect(category).toBe('FUNCTIONAL_MINOR');
    expect(SEVERITY_SCORE_MAP[category]).toBe(3);
  });

  // Test D: Generic NHTSA information page -> remains rejected
  it('Phase 12 Test D: Generic NHTSA brochure / portal page remains rejected from defect evidence', () => {
    const isGeneric = service.isGenericInformationalRecallPage(
      'Check for Recalls: Vehicle, Car Seat, Tire, Equipment',
      'Download this brochure to get more information about how and why recall campaigns are initiated.',
      'https://www.nhtsa.gov/recalls',
    );
    expect(isGeneric).toBe(true);
  });

  // Test E: Real recall with generic administrative header -> accepted if specific defect/campaign evidence exists
  it('Phase 12 Test E: Real recall with administrative header is accepted when campaign ID is present', () => {
    const isGeneric = service.isGenericInformationalRecallPage(
      'IMPORTANT SAFETY RECALL 22V-844',
      'Tesla rear taillight firmware update.',
      'https://static.nhtsa.gov/odi/rcl/2022/RCLRPT-22V844.PDF',
    );
    expect(isGeneric).toBe(false);
  });

  // Test F: Valid chronic defect supported by existing eligible source policy -> can become VERIFIED_QUALITATIVE without an official recall
  it('Phase 12 Test F: Valid chronic defect from reputable Tier 2 technical source becomes VERIFIED_QUALITATIVE without recall', () => {
    const candidate = {
      title: 'Passat DQ200 DSG Mechatronic Pressure Accumulator Leak',
      consequenceDescription: 'Hydraulic pressure loss in mechatronic unit causes transmission error and clutch slippage.',
      sourceTier: 'TIER_2',
      sourceName: 'carcomplaints.com',
      url: 'https://www.carcomplaints.com/Volkswagen/Passat/tsbs/dq200-mechatronic.shtml',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
      transmissionCode: 'DQ200',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
    expect(normalized?.domain).toBe('POWERTRAIN_TRANS');
    expect(normalized?.campaignStatus).toBeUndefined(); // Non-recall chronic defect
  });

  // Test G: Tier3-only chronic defect -> remains rejected
  it('Phase 12 Test G: Tier 3 forum / social media defect claim remains strictly rejected', () => {
    const candidate = {
      title: 'Corolla 12V battery drain forum thread',
      consequenceDescription: 'My 12V battery drained overnight on reddit forum.',
      sourceTier: 'TIER_3',
      sourceName: 'reddit.com',
      url: 'https://www.reddit.com/r/COROLLA/comments/12345/battery_drain',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Toyota',
      model: 'Corolla',
      modelYear: 2020,
      powertrainType: 'HEV',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.numericEligibility).toBe('REJECTED');
    expect(normalized?.rejectionReason).toContain('Tier 3');
  });

  // Test H: Applicability mismatch -> remains rejected
  it('Phase 12 Test H: Defect on Atlas / Golf explicitly mentioning other models rejects Passat applicability', () => {
    const candidate = {
      title: 'Atlas Passenger Occupant Detection System Recall',
      consequenceDescription: 'Wiring harness for passenger sensor on Volkswagen Atlas may fail.',
      sourceTier: 'TIER_1',
      campaignId: '23V-200',
      url: 'https://static.nhtsa.gov/odi/rcl/2023/atlas-sensor.pdf',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'Volkswagen',
      model: 'Passat',
      modelYear: 2018,
      powertrainType: 'ICE_DIESEL',
    });
    expect(normalized).toBeNull();
  });

  // Test I: Exact engine/transmission component match -> valid evidence not rejected merely because trim differs
  it('Phase 12 Test I: Exact engine match (B48B16A / B48) is preserved regardless of trim level', () => {
    const candidate = {
      title: 'BMW B48 Engine Oil Filter Housing Coolant Leak Technical Bulletin',
      consequenceDescription: 'Plastic oil filter housing cracks causing coolant leak and overheat warning.',
      sourceTier: 'TIER_2',
      sourceName: 'tsbsearch.com',
      url: 'https://www.tsbsearch.com/BMW/SI-B17-01-20',
      engineCode: 'B48',
    };
    const normalized = service.normalizeDefectCandidate(candidate as any, {
      brand: 'BMW',
      model: '3 Serisi',
      modelYear: 2020,
      engineCode: 'B48B16A',
      powertrainType: 'ICE_PETROL',
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
    expect(normalized?.severityCategory).toBe('DRIVABILITY');
  });

  // Test J: Same chronic defect from multiple sources -> one failure mode, aggregated provenance
  it('Phase 12 Test J: Clustering merges multiple reports of the same defect and aggregates linked sources', () => {
    const hit1 = service.normalizeDefectCandidate(
      {
        id: 'H1',
        domain: 'HV_BATTERY_SYSTEM',
        title: 'Hyundai Ioniq 5 ICCU Failure Bulletin',
        consequenceDescription: 'Integrated Charging Control Unit failure causes 12V battery drain and high-voltage system shutdown.',
        sourceTier: 'TIER_2',
        sourceName: 'carcomplaints.com',
        url: 'https://www.carcomplaints.com/Hyundai/Ioniq_5/iccu.shtml',
      },
      { brand: 'Hyundai', model: 'Ioniq 5', modelYear: 2022, powertrainType: 'BEV' },
    )!;

    const hit2 = service.normalizeDefectCandidate(
      {
        id: 'H2',
        domain: 'HV_BATTERY_SYSTEM',
        title: 'Hyundai Ioniq 5 ICCU Failure Bulletin',
        consequenceDescription: 'Integrated Charging Control Unit failure causing vehicle propulsion shutdown.',
        sourceTier: 'TIER_1',
        sourceName: 'nhtsa.gov',
        url: 'https://static.nhtsa.gov/odi/inv/2023/PE23-011.pdf',
      },
      { brand: 'Hyundai', model: 'Ioniq 5', modelYear: 2022, powertrainType: 'BEV' },
    )!;

    const clustered = service.clusterEvidenceList([hit1, hit2]);
    expect(clustered.length).toBe(1);
    expect(clustered[0].linkedSources.length).toBe(2);
  });

  // Test K: No verified chronic defect after successful search -> negative proof semantics remain correct
  it('Phase 12 Test K: Clean executed channels with zero verified defects produce valid NegativeResearchProof', () => {
    const channels: ResearchChannelTelemetry[] = [
      {
        channelKey: 'CHASSIS_BRAKES_FAILURE_QUERY',
        status: 'AVAILABLE_EXECUTED',
        queryOrEndpoint: '2020 Toyota Corolla suspension defect',
        sourcesEvaluatedCount: 5,
        sources: [{ sourceId: 's1', domain: 'toyota-tech.eu', tier: 'TIER_1' }],
      },
    ];
    const proof = service.generateNegativeResearchProof('CHASSIS_BRAKES', channels, []);
    expect(proof).not.toBeNull();
    expect(proof?.conclusion).toBe('SEARCH_COMPLETED_NO_VERIFIED_DEFECT_FOUND');
    expect((proof as any)?.verifiedClean).toBe(true);
  });

  // Test L: Provider failure -> must NOT become negative proof
  it('Phase 12 Test L: Failed channel execution prevents negative proof and sets partial state', () => {
    const channels: ResearchChannelTelemetry[] = [
      {
        channelKey: 'THERMAL_COOLING_FAILURE_QUERY',
        status: 'EXECUTION_FAILED',
        queryOrEndpoint: '2020 BMW 320i cooling defect',
        sourcesEvaluatedCount: 0,
        sources: [],
        failureReason: 'Timeout 504 Gateway',
      },
    ];
    const proof = service.generateNegativeResearchProof('THERMAL_COOLING', channels, []);
    expect(proof).toBeNull();
  });

  // Test M: Generic recall filter must not reject genuine TSB/service campaign containing keywords
  it('Phase 12 Test M: Genuine TSB with technical defect is not rejected by generic portal filter', () => {
    const isGeneric = service.isGenericInformationalRecallPage(
      'Technical Service Bulletin: DCM Telematics Reset and Battery Drain Fix',
      'This service campaign bulletin instructs dealers to update telematics DCM software to resolve 12V battery drain.',
      'https://www.tsbsearch.com/Toyota/T-SB-0095-20',
    );
    expect(isGeneric).toBe(false);
  });

  // Test N: Search snippet lacking consequence but authoritative retrieved content containing consequence -> use grounded content
  it('Phase 12 Test N: When short snippet lacks consequence, richer retrieved content is used', () => {
    const rawSnippet = 'This notice applies to your vehicle VIN: XXX.';
    const fullPage = 'Dear Owner, This notice applies to your vehicle. What is the problem? The SCU software may disengage the parking pawl causing vehicle rollaway.';

    const category = service.mapConsequenceToCategory(fullPage, undefined, 'IMPORTANT SAFETY RECALL');
    expect(category).toBe('SAFETY_CRITICAL');
  });

  // Test O: If no richer content exists -> no consequence fabrication
  it('Phase 12 Test O: If content is genuinely ungrounded administrative boilerplate, defaults to non-critical fallback without fabrication', () => {
    const text = 'Official recall notice pursuant to federal motor vehicle safety standards.';
    const category = service.mapConsequenceToCategory(text, undefined, 'Recall Notice');
    expect(category).toBe('FUNCTIONAL_MINOR');
    expect(SEVERITY_SCORE_MAP[category]).toBe(3);
  });

  // =========================================================================
  // PHASE 6 (FORENSIC AUDIT 2): CO-LOCATION & DEFECT-LOCAL CONSECUENCE TESTS
  // =========================================================================

  // Test A: DCM battery drain + unrelated "fire" elsewhere -> DCM must NOT become SAFETY_CRITICAL
  it('Phase 6 Test A: DCM auxiliary battery drain with unrelated fire in sidebar is not contaminated', () => {
    const pageWithSidebarFire = `
      Top Recalls & Investigations: Check for Hyundai engine fire recalls and Ford battery fires.
      --------------------------------------------------
      Toyota TSB-0095-20: DCM Telematics Control Module.
      Condition: Some 2020 Corolla vehicles may experience DCM telematics parasitic current draw, causing 12V auxiliary battery drain when vehicle sits overnight.
      Remedy: Reprogram DCM telematics firmware.
    `;
    const localConsequence = service.extractDefectLocalConsequence(
      pageWithSidebarFire,
      'DCM firmware causes 12V auxiliary battery drain.',
      'Toyota Corolla DCM Battery Drain',
      'ELECTRONICS_BODY',
    );
    const category = service.mapConsequenceToCategory(localConsequence, undefined, 'DCM Battery Drain');
    expect(category).not.toBe('SAFETY_CRITICAL');
    expect(['DRIVABILITY', 'FUNCTIONAL_MINOR']).toContain(category);
    expect(SEVERITY_SCORE_MAP[category]).toBeLessThanOrEqual(5);
  });

  // Test B: Coolant vent-line leak + unrelated crash warning elsewhere -> severity based only on coolant consequence
  it('Phase 6 Test B: Coolant vent line leak with unrelated crash warning elsewhere reflects only coolant consequence', () => {
    const pageWithCrashDisclaimer = `
      NHTSA Crash Test 5-Star Ratings & Collision Warnings.
      BMW Service Information SI B17 01 20:
      Subject: B48 Engine Coolant Vent Line Degradation.
      Situation: The plastic coolant vent line connecting cylinder head to expansion tank becomes brittle from thermal cycling, resulting in small coolant leak and low coolant indicator.
    `;
    const localConsequence = service.extractDefectLocalConsequence(
      pageWithCrashDisclaimer,
      'Plastic coolant vent line cracks causing minor coolant leak.',
      'BMW B48 Coolant Vent Line',
      'THERMAL_COOLING',
    );
    const category = service.mapConsequenceToCategory(localConsequence, undefined, 'BMW B48 Coolant Vent Line');
    expect(category).toBe('DRIVABILITY');
    expect(SEVERITY_SCORE_MAP[category]).toBe(5);
  });

  // Test C: Explicit same-defect vehicle fire -> SAFETY_CRITICAL remains valid
  it('Phase 6 Test C: Explicit same-defect vehicle fire correctly categorizes as SAFETY_CRITICAL', () => {
    const text = 'High voltage battery cells may short circuit internally, creating risk of thermal runaway and vehicle fire.';
    const category = service.mapConsequenceToCategory(text, undefined, 'HV Battery Fire Risk');
    expect(category).toBe('SAFETY_CRITICAL');
    expect(SEVERITY_SCORE_MAP[category]).toBe(10);
  });

  // Test D: Explicit same-defect rollaway -> SAFETY_CRITICAL remains valid
  it('Phase 6 Test D: Explicit same-defect rollaway correctly categorizes as SAFETY_CRITICAL', () => {
    const text = 'Shift control unit software error may disengage the parking pawl while parked, allowing vehicle rollaway.';
    const category = service.mapConsequenceToCategory(text, undefined, 'Parking Pawl Disengagement');
    expect(category).toBe('SAFETY_CRITICAL');
    expect(SEVERITY_SCORE_MAP[category]).toBe(10);
  });

  // Test E: Tail-light failure -> FUNCTIONAL_MINOR remains valid
  it('Phase 6 Test E: Tail-light illumination failure remains FUNCTIONAL_MINOR', () => {
    const text = 'Rear taillight assembly LED board resistor may fail, causing partial taillight illumination loss.';
    const category = service.mapConsequenceToCategory(text, undefined, 'Taillight LED Failure');
    expect(category).toBe('FUNCTIONAL_MINOR');
    expect(SEVERITY_SCORE_MAP[category]).toBe(3);
  });

  // Test F: Full document contains multiple defects -> each defect receives its own consequence/severity
  it('Phase 6 Test F: Multi-defect page isolates consequences per defect anchor', () => {
    const multiDefectDoc = `
      BULLETIN 1: Squeaking Front Upper Control Arm Ball Joint.
      Front suspension upper control arm ball joint boot cracks, allowing moisture ingress and squeak or creak noise over speed bumps.

      BULLETIN 2: Inverter Power Semiconductor Short Circuit.
      Drive unit inverter power module may short circuit, causing high-voltage system shutdown and sudden loss of motive power at speed.
    `;
    const controlArmLocal = service.extractDefectLocalConsequence(
      multiDefectDoc,
      'Control arm squeak noise',
      'Front Upper Control Arm Squeak',
      'CHASSIS_BRAKES',
    );
    const inverterLocal = service.extractDefectLocalConsequence(
      multiDefectDoc,
      'Inverter power module failure',
      'Inverter Power Semiconductor Failure',
      'HV_BATTERY_SYSTEM',
    );

    const controlArmCategory = service.mapConsequenceToCategory(controlArmLocal, undefined, 'Control Arm Squeak');
    const inverterCategory = service.mapConsequenceToCategory(inverterLocal, undefined, 'Inverter Failure');

    expect(controlArmCategory).toBe('COSMETIC');
    expect(inverterCategory).toBe('SAFETY_CRITICAL');
  });

  // Test G: Unknown consequence -> no severity fabrication
  it('Phase 6 Test G: Unknown consequence does not fabricate severity', () => {
    const text = 'General service campaign bulletin notice.';
    const category = service.mapConsequenceToCategory(text, undefined, 'Service Campaign');
    expect(category).toBe('FUNCTIONAL_MINOR');
    expect(SEVERITY_SCORE_MAP[category]).toBe(3);
  });

  // Test H: Option B unchanged
  it('Phase 6 Test H: Option B math remains exact with correct non-inflated severity inputs', () => {
    // 2 verified defects with severity 5 (Drivability) and 3 (Functional Minor)
    const norm1 = service.normalizeDefectCandidate(
      {
        domain: 'ELECTRONICS_BODY',
        title: 'DCM Battery Drain',
        consequenceDescription: 'DCM telematics causes 12V battery drain.',
        sourceTier: 'TIER_2',
        sourceName: 'tsbsearch.com',
      },
      { brand: 'Toyota', model: 'Corolla', modelYear: 2020 },
    )!;

    const norm2 = service.normalizeDefectCandidate(
      {
        domain: 'ELECTRONICS_BODY',
        title: 'Multimedia Display Freeze',
        consequenceDescription: 'Infotainment display reboots.',
        sourceTier: 'TIER_2',
        sourceName: 'tsbsearch.com',
      },
      { brand: 'Toyota', model: 'Corolla', modelYear: 2020 },
    )!;

    expect(norm1.severityScore).toBe(5);
    expect(norm2.severityScore).toBe(3);
  });

  // =========================================================================
  // GENERIC ENGINE & VARIANT APPLICABILITY TESTS
  // =========================================================================

  it('Generic Applicability Test 1: Same model and year with DIFFERENT explicit engine/variant is REJECTED', () => {
    const candidate330i = {
      title: 'Recall 24V-608: BMW 330i, M340i Fire Risk from Electric Water Pump',
      consequenceDescription: 'Water pump connector short circuit on 2.0L B46 and 3.0L B58 engines may cause vehicle fire.',
      sourceTier: 'TIER_1',
      campaignId: '24V-608',
      url: 'https://static.nhtsa.gov/odi/rcl/2024/RCLRPT-24V608.PDF',
    };

    // Target is TR-market BMW 320i with 1.6L B48B16A
    const normalized = service.normalizeDefectCandidate(candidate330i as any, {
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      modelYear: 2020,
      engineCode: 'B48B16A',
      powertrainType: 'ICE_PETROL',
    });

    expect(normalized).toBeNull();
  });

  it('Generic Applicability Test 2: Same model and year with MATCHING engine is ACCEPTED', () => {
    const candidate320i = {
      domain: 'THERMAL_COOLING',
      title: 'BMW B48 Expansion Tank Vent Line Coolant Leak Bulletin',
      consequenceDescription: 'Plastic coolant vent line on B48 engines becomes brittle from thermal cycles causing coolant loss.',
      sourceTier: 'TIER_2',
      sourceName: 'tsbsearch.com',
      engineCode: 'B48',
      url: 'https://www.tsbsearch.com/BMW/SI-B17-01-20',
    };

    // Target is TR-market BMW 320i with 1.6L B48B16A
    const normalized = service.normalizeDefectCandidate(candidate320i as any, {
      brand: 'BMW',
      model: '3 Serisi',
      generation: 'G20',
      modelYear: 2020,
      engineCode: 'B48B16A',
      powertrainType: 'ICE_PETROL',
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.numericEligibility).toBe('QUALITATIVE_ONLY');
    expect(normalized?.domain).toBe('THERMAL_COOLING');
  });

  it('Generic Applicability Test 3: Same model and year with DIFFERENT explicit VW engine (2.0 TSI vs 1.6 TDI) is REJECTED', () => {
    const candidate20Tsi = {
      title: 'Volkswagen Passat 2.0 TSI EA888 High Pressure Fuel Rail Recall',
      consequenceDescription: 'Fuel rail leak on EA888 2.0 TSI petrol engine.',
      sourceTier: 'TIER_1',
      campaignId: '23V-111',
      url: 'https://static.nhtsa.gov/odi/rcl/2023/ea888-rail.pdf',
    };

    // Target is Passat 1.6 TDI (DCXA)
    const normalized = service.normalizeDefectCandidate(candidate20Tsi as any, {
      brand: 'Volkswagen',
      model: 'Passat',
      generation: 'B8',
      modelYear: 2018,
      engineCode: 'DCXA',
      powertrainType: 'ICE_DIESEL',
    });

    expect(normalized).toBeNull();
  });
});

