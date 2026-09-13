import { VehicleReportScoringV6Service } from '../vehicle-report-scoring-v6.service';

describe('VehicleReportScoringV6Service - Phase 2J Qualitative Risk Semantics Suite', () => {
  let service: VehicleReportScoringV6Service;

  beforeEach(() => {
    service = new VehicleReportScoringV6Service();
  });

  // =========================================================================
  // ABSTRACT TESTS (PHASE 2J: SECTION 10)
  // =========================================================================

  // Test A: coverage >= 0.80, 0 numeric, 0 qualitative, valid zero-defect certification
  it('Abstract Test A: coverage >= 0.80, 0 numeric, 0 qualitative => VERIFIED_LOW_RISK, score = 0, CERTIFIED_ZERO', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022 },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }, { sourceId: 'src3' }],
        reliabilityResearch: [],
        recallResearch: [],
      },
    };

    const result = service.calculateScores(context);

    expect(result.modelCoverageScore).toBeGreaterThanOrEqual(80);
    expect(result.modelRiskState).toBe('VERIFIED_LOW_RISK');
    expect(result.modelRiskScore).toBe(0);
    expect(result.modelRiskQuantification).toBe('CERTIFIED_ZERO');
  });

  // Test B: coverage >= 0.80, 0 numeric, 1 qualitative
  it('Abstract Test B: coverage >= 0.80, 0 numeric, 1 qualitative => VERIFIED_RISK_PRESENT, score = null, QUALITATIVE_ONLY', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }, { sourceId: 'src3' }],
        reliabilityResearch: [
          {
            title: 'Water pump weep hole leakage',
            problemType: 'VERIFIED_FAILURE',
            system: 'soğutma',
            severityNum: 5,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
      },
    };

    const result = service.calculateScores(context);

    expect(result.modelCoverageScore).toBeGreaterThanOrEqual(80);
    expect(result.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
    expect(result.modelRiskScore).toBeNull();
    expect(result.modelRiskQuantification).toBe('QUALITATIVE_ONLY');
  });

  // Test C: coverage >= 0.80, 0 numeric, multiple qualitative
  it('Abstract Test C: coverage >= 0.80, 0 numeric, multiple qualitative => VERIFIED_RISK_PRESENT, score = null', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }, { sourceId: 'src3' }],
        reliabilityResearch: [
          {
            title: 'Thermostat housing crack',
            problemType: 'VERIFIED_FAILURE',
            system: 'soğutma',
            severityNum: 5,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
          {
            title: 'Window regulator failure',
            problemType: 'VERIFIED_FAILURE',
            system: 'elektronik',
            severityNum: 4,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
      },
    };

    const result = service.calculateScores(context);

    expect(result.modelCoverageScore).toBeGreaterThanOrEqual(80);
    expect(result.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
    expect(result.modelRiskScore).toBeNull();
    expect(result.modelRiskQuantification).toBe('QUALITATIVE_ONLY');
  });

  // Test D: coverage 0.60-0.79, qualitative defect
  it('Abstract Test D: coverage 0.60-0.79, qualitative defect => VERIFIED_RISK_PRESENT, score = null', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'EGR valve soot buildup',
            problemType: 'VERIFIED_FAILURE',
            system: 'dpf',
            severityNum: 6,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
      },
    };

    const result = service.calculateScores(context);

    expect(result.modelCoverageScore).toBeGreaterThanOrEqual(60);
    expect(result.modelCoverageScore).toBeLessThan(80);
    expect(result.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
    expect(result.modelRiskScore).toBeNull();
    expect(result.modelRiskQuantification).toBe('QUALITATIVE_ONLY');
  });

  // Test E: coverage < 0.60, qualitative defect
  it('Abstract Test E: coverage < 0.60, qualitative defect => INSUFFICIENT_RESEARCH, score = null', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: false,
        groundingSources: [],
        reliabilityResearch: [
          {
            title: 'Oil Consumption issue',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 7,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
      },
    };

    const result = service.calculateScores(context);

    expect(result.modelCoverageScore).toBeLessThan(60);
    expect(result.modelRiskState).toBe('INSUFFICIENT_RESEARCH');
    expect(result.modelRiskScore).toBeNull();
    expect(result.modelRiskQuantification).toBe('NOT_ESTIMABLE');
  });

  // Test F: numeric defect only
  it('Abstract Test F: numeric defect only => VERIFIED_RISK_PRESENT, numeric score, FULLY_QUANTIFIED', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'Timing Chain Tensioner Wear',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 8,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
            prevalenceFactor: 0.25,
          },
        ],
      },
    };

    const result = service.calculateScores(context);

    expect(result.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
    expect(result.modelRiskScore).not.toBeNull();
    expect(result.modelRiskScore).toBeGreaterThan(0);
    expect(result.modelRiskQuantification).toBe('FULLY_QUANTIFIED');
  });

  // Test G: numeric + qualitative
  it('Abstract Test G: numeric + qualitative => VERIFIED_RISK_PRESENT, numeric score from numeric subset, PARTIAL_LOWER_BOUND, buyability null', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }, { sourceId: 'src3' }],
        reliabilityResearch: [
          {
            title: 'Timing Chain Tensioner Wear',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 8,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
            prevalenceFactor: 0.25,
          },
          {
            title: 'HVAC blend door squeak',
            problemType: 'VERIFIED_FAILURE',
            system: 'elektronik',
            severityNum: 3,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
      },
    };
    const listing = {
      heavyDamage: false,
      hasFullServiceHistory: true,
    };

    const result = service.calculateScores(context, listing);

    expect(result.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
    expect(result.modelRiskScore).not.toBeNull();
    expect(result.modelRiskScore).toBeGreaterThan(0);
    expect(result.modelRiskQuantification).toBe('PARTIAL_LOWER_BOUND');
    expect(result.buyabilityScore).toBeNull();
    expect(result.buyabilityState).toBe('INSUFFICIENT_MODEL_DATA');
  });

  // Test H: qualitative domain
  it('Abstract Test H: domain with qualitative defect => score = null, state = QUALITATIVE_RISK', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'DSG mechatronic valve glitch',
            system: 'şanzıman',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 7,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
      },
    };

    const result = service.calculateScores(context);
    const transDomain = result.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_TRANS');

    expect(transDomain?.score).toBeNull();
    expect(transDomain?.state).toBe('QUALITATIVE_RISK');
  });

  // Test I: unresearched domain
  it('Abstract Test I: unresearched domain (<0.60 coverage) => score = null, state = UNKNOWN', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022 },
      verifiedResearch: { webSearchPerformed: false, groundingSources: [] },
    };

    const result = service.calculateScores(context);
    const engineDomain = result.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_ENGINE');

    expect(engineDomain?.score).toBeNull();
    expect(engineDomain?.state).toBe('UNKNOWN');
  });

  // Test J: certified researched zero-defect domain
  it('Abstract Test J: certified researched zero-defect domain (>=0.60 coverage) => score = 0, state = GOOD', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022 },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }],
        reliabilityResearch: [],
      },
    };

    const result = service.calculateScores(context);
    const engineDomain = result.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_ENGINE');

    expect(engineDomain?.score).toBe(0);
    expect(engineDomain?.state).toBe('GOOD');
  });

  // Test K: missing prevalence cannot trigger numeric calculation
  it('Abstract Test K: defect with missing prevalence cannot enter numeric calculation', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'Injector seal leakage',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 7,
            // No frequencyFactor or prevalenceFactor
          },
        ],
      },
    };

    const result = service.calculateScores(context);

    expect(result.modelRiskScore).toBeNull();
    expect(result.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
    expect(result.modelRiskQuantification).toBe('QUALITATIVE_ONLY');
  });

  // Test L: no 0.60 frequency fallback exists
  it('Abstract Test L: absence of frequencyFactor never defaults to 0.60 synthetic frequency', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'Steering rack knock',
            system: 'direksiyon',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 6,
          },
        ],
      },
    };

    const result = service.calculateScores(context);
    const chassisDomain = result.domainBreakdown.find((d) => d.domain === 'CHASSIS_BRAKES');

    // If 0.60 fallback existed, chassisDomain.score would be > 0 and state would be BAD
    expect(chassisDomain?.score).toBeNull();
    expect(chassisDomain?.state).toBe('QUALITATIVE_RISK');
    expect(result.modelRiskScore).toBeNull();
  });

  // Test M: qualitative verified factor has no fabricated impact
  it('Abstract Test M: qualitative verified factor has impact = null and quantification = QUALITATIVE', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'Turbo wastegate rattle',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 6,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
      },
    };

    const result = service.calculateScores(context);
    const engineDomain = result.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_ENGINE');
    const factor = engineDomain?.verifiedFactors[0];

    expect(factor).toBeDefined();
    expect(factor?.impact).toBeNull();
    expect(factor?.quantification).toBe('QUALITATIVE');
  });

  // Test N: qualitative-only model risk cannot produce numeric Buyability
  it('Abstract Test N: qualitative-only model risk yields buyabilityScore = null and INSUFFICIENT_MODEL_DATA', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }, { sourceId: 'src3' }],
        reliabilityResearch: [
          {
            title: 'Clutch Judder',
            system: 'kavrama',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 7,
            numericEligibility: 'QUALITATIVE_ONLY',
          },
        ],
      },
    };
    const listing = {
      heavyDamage: false,
      hasFullServiceHistory: true,
      activeFaultCodes: [],
    };

    const result = service.calculateScores(context, listing);

    expect(result.modelRiskScore).toBeNull();
    expect(result.vehicleConditionRisk).not.toBeNull();
    expect(result.buyabilityScore).toBeNull();
    expect(result.buyabilityState).toBe('INSUFFICIENT_MODEL_DATA');
  });

  // Test O: partial-lower-bound model risk cannot produce numeric Buyability
  it('Abstract Test O: partial-lower-bound model risk yields buyabilityScore = null and INSUFFICIENT_MODEL_DATA', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }, { sourceId: 'src3' }],
        reliabilityResearch: [
          {
            title: 'Timing Chain Tensioner Wear',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 8,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
            prevalenceFactor: 0.25,
          },
          {
            title: 'Infotainment reboot loop',
            system: 'elektronik',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 4,
            numericEligibility: 'QUALITATIVE_ONLY',
          },
        ],
      },
    };
    const listing = {
      heavyDamage: false,
      hasFullServiceHistory: true,
      activeFaultCodes: [],
    };

    const result = service.calculateScores(context, listing);

    expect(result.modelRiskQuantification).toBe('PARTIAL_LOWER_BOUND');
    expect(result.modelRiskScore).not.toBeNull();
    expect(result.buyabilityScore).toBeNull();
    expect(result.buyabilityState).toBe('INSUFFICIENT_MODEL_DATA');
  });

  // Test P: fully quantified model risk + eligible condition + confidence >= 40 can produce Buyability
  it('Abstract Test P: fully quantified model risk + eligible condition + confidence >= 40 produces valid Buyability', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }, { sourceId: 'src3' }],
        reliabilityResearch: [
          {
            title: 'Timing Chain Tensioner Wear',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 8,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
            prevalenceFactor: 0.25,
          },
        ],
      },
    };
    const listing = {
      heavyDamage: false,
      chassisDamage: false,
      tramerAmount: 0,
      hasFullServiceHistory: true,
      activeFaultCodes: [],
      hasOpenRecallOnVin: false,
      clutchWearPercentage: 10,
    };

    const result = service.calculateScores(context, listing);

    expect(result.modelRiskQuantification).toBe('FULLY_QUANTIFIED');
    expect(result.modelRiskScore).not.toBeNull();
    expect(result.vehicleConditionRisk).not.toBeNull();
    expect(result.confidenceScore).toBeGreaterThanOrEqual(40);
    expect(result.buyabilityScore).not.toBeNull();
    expect(typeof result.buyabilityScore).toBe('number');
  });

  // =========================================================================
  // SHADOW SUITE & SYSTEM TESTS
  // =========================================================================

  // All-null evidence
  it('Suite Test: all-null evidence returns null scores and low confidence without synthetic defaults', () => {
    const result = service.calculateScores(null, null);

    expect(result.scoringVersion).toBe('v6.0');
    expect(result.modelRiskScore).toBeNull();
    expect(result.modelRiskState).toBe('INSUFFICIENT_RESEARCH');
    expect(result.modelRiskQuantification).toBe('NOT_ESTIMABLE');
    expect(result.vehicleConditionRisk).toBeNull();
    expect(result.conditionState).toBe('UNKNOWN');
    expect(result.buyabilityScore).toBeNull();
    expect(result.buyabilityState).toBe('INSUFFICIENT_DATA');
    expect(result.confidenceLevel).toBe('LOW');
  });

  // Asymptotic saturation with multiple NUMERIC defects
  it('Suite Test: multiple numeric defects in the same domain saturate asymptotically below 100', () => {
    const singleDefectContext = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'DSG Mechatronic Valve Leak',
            system: 'şanzıman',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 7,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
          },
        ],
      },
    };

    const doubleDefectContext = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'DSG Mechatronic Valve Leak',
            system: 'şanzıman',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 7,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
          },
          {
            title: 'Clutch Shudder Under Load',
            system: 'kavrama',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 7,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
          },
        ],
      },
    };

    const singleScore = service.calculateScores(singleDefectContext);
    const doubleScore = service.calculateScores(doubleDefectContext);

    const singleTrans = singleScore.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_TRANS')!.score!;
    const doubleTrans = doubleScore.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_TRANS')!.score!;

    expect(doubleTrans).toBeGreaterThan(singleTrans);
    expect(doubleTrans).toBeLessThan(singleTrans * 2); // Asymptotic saturation strictly avoids linear doubling
  });

  // Defects across multiple domains
  it('Suite Test: numeric defects across multiple domains combine domain maximum and weighted sum', () => {
    const multiDomainContext = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Dizel' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }],
        reliabilityResearch: [
          {
            title: 'Dual Clutch Wear',
            system: 'şanzıman',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 8,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
          },
          {
            title: 'DPF Differential Pressure Sensor',
            system: 'dpf',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 6,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
          },
        ],
      },
    };

    const result = service.calculateScores(multiDomainContext);

    const transDomain = result.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_TRANS');
    const emissionsDomain = result.domainBreakdown.find((d) => d.domain === 'EMISSIONS_EXHAUST');

    expect(transDomain?.score).toBeGreaterThan(0);
    expect(emissionsDomain?.score).toBeGreaterThan(0);
    expect(result.modelRiskScore).toBeGreaterThan(0);
    expect(result.modelRiskQuantification).toBe('FULLY_QUANTIFIED');
  });

  // Pure determinism
  it('Suite Test: repeated identical input produces exact byte-equivalent V6 score JSON (pure determinism)', () => {
    const context = {
      vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      verifiedResearch: {
        webSearchPerformed: true,
        groundingSources: [{ sourceId: 'src1' }, { sourceId: 'src2' }],
        reliabilityResearch: [
          {
            title: 'Coolant Hose Leak',
            system: 'soğutma',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 5,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.25,
          },
        ],
      },
    };
    const listing = {
      heavyDamage: false,
      tramerAmount: 15000,
      price: 1000000,
      hasFullServiceHistory: true,
    };

    const run1 = service.calculateScores(context, listing);
    const run2 = service.calculateScores(context, listing);

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  // =========================================================================
  // STAGE 1 RELIABILITY RESEARCH -> V6 EVIDENCE INGESTION BRIDGE SUITE
  // =========================================================================
  describe('Stage 1 Reliability Research -> V6 Evidence Ingestion Bridge', () => {
    // 1. Corolla-style: Producer has 0 numeric, 2 qualitative -> V6 receives both qualitative without loss
    it('Bridge Test 1 (Corolla-style): Producer (0 numeric, 2 qualitative) bridges to V6 with 2 qualitative received => VERIFIED_RISK_PRESENT, modelRiskScore = null, QUALITATIVE_ONLY', () => {
      const mockProducerOutput: any = {
        researchId: 'rel-corolla-1',
        researchedAt: new Date().toISOString(),
        applicableDomainCount: 8,
        reliabilityCoverageScore: 85,
        allVerifiedDefects: [], // 0 numeric
        qualitativeDefects: [
          {
            id: 'def-12v-drain',
            domain: 'HV_BATTERY_SYSTEM',
            title: '12V Auxiliary Battery DCM Parasitic Drain',
            problemType: 'VERIFIED_FAILURE',
            severityCategory: 'DRIVABILITY',
            severityScore: 5,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
          {
            id: 'def-screen-freeze',
            domain: 'ELECTRONICS_BODY',
            title: 'Head Unit Display Restart Loop',
            problemType: 'VERIFIED_FAILURE',
            severityCategory: 'FUNCTIONAL_MINOR',
            severityScore: 4,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
        domainResults: {
          POWERTRAIN_ENGINE: { domain: 'POWERTRAIN_ENGINE', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [], channels: [{ channelKey: 'ENG', status: 'AVAILABLE_EXECUTED', sources: [{ sourceId: 's1' }] }] },
          POWERTRAIN_TRANS: { domain: 'POWERTRAIN_TRANS', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [], channels: [{ channelKey: 'TRANS', status: 'AVAILABLE_EXECUTED', sources: [{ sourceId: 's2' }] }] },
          EMISSIONS_EXHAUST: { domain: 'EMISSIONS_EXHAUST', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [], channels: [{ channelKey: 'EMIS', status: 'AVAILABLE_EXECUTED', sources: [{ sourceId: 's3' }] }] },
          HV_BATTERY_SYSTEM: { domain: 'HV_BATTERY_SYSTEM', state: 'VERIFIED_DEFECTS_FOUND', coverageCredit: 1.0, defects: [{ id: 'def-12v-drain', domain: 'HV_BATTERY_SYSTEM', title: '12V Auxiliary Battery DCM Parasitic Drain', numericEligibility: 'QUALITATIVE_ONLY' }], channels: [] },
          THERMAL_COOLING: { domain: 'THERMAL_COOLING', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [], channels: [] },
          ELECTRONICS_BODY: { domain: 'ELECTRONICS_BODY', state: 'VERIFIED_DEFECTS_FOUND', coverageCredit: 1.0, defects: [{ id: 'def-screen-freeze', domain: 'ELECTRONICS_BODY', title: 'Head Unit Display Restart Loop', numericEligibility: 'QUALITATIVE_ONLY' }], channels: [] },
          CHASSIS_BRAKES: { domain: 'CHASSIS_BRAKES', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [], channels: [] },
          SAFETY_RECALL: { domain: 'SAFETY_RECALL', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [], channels: [] },
        },
        discoveryTelemetry: [],
      };

      const vehicleContext = {
        vehicleIdentity: { brand: 'Toyota', model: 'Corolla', modelYear: 2020, fuelType: 'Hibrit', isHybrid: true },
      };

      // Execute via direct bridge method
      const scoreResult = service.calculateScoresFromReliabilityResearch(vehicleContext, mockProducerOutput);

      // Verify exact semantics
      expect(scoreResult.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
      expect(scoreResult.modelRiskScore).toBeNull();
      expect(scoreResult.modelRiskQuantification).toBe('QUALITATIVE_ONLY');
      expect(scoreResult.modelCoverageScore).toBeGreaterThanOrEqual(80);

      // Verify domain breakdowns
      const hvDomain = scoreResult.domainBreakdown.find((d) => d.domain === 'HV_BATTERY_SYSTEM');
      const elecDomain = scoreResult.domainBreakdown.find((d) => d.domain === 'ELECTRONICS_BODY');
      const engineDomain = scoreResult.domainBreakdown.find((d) => d.domain === 'POWERTRAIN_ENGINE');

      expect(hvDomain?.state).toBe('QUALITATIVE_RISK');
      expect(hvDomain?.score).toBeNull();
      expect(hvDomain?.verifiedFactors[0].impact).toBeNull();
      expect(hvDomain?.verifiedFactors[0].quantification).toBe('QUALITATIVE');

      expect(elecDomain?.state).toBe('QUALITATIVE_RISK');
      expect(elecDomain?.score).toBeNull();

      expect(engineDomain?.state).toBe('GOOD');
      expect(engineDomain?.score).toBe(0);
    });

    // 2. Numeric + Qualitative mixed bridge
    it('Bridge Test 2: Producer with 1 numeric + 1 qualitative defect bridges correctly => PARTIAL_LOWER_BOUND with buyability null', () => {
      const mockProducerOutput: any = {
        researchId: 'rel-bmw-1',
        reliabilityCoverageScore: 85,
        allVerifiedDefects: [
          {
            id: 'def-timing-chain',
            domain: 'POWERTRAIN_ENGINE',
            title: 'Timing Chain Stretch',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 8,
            numericEligibility: 'NUMERIC_ELIGIBLE',
            frequencyFactor: 0.20,
            prevalenceFactor: 0.20,
          },
        ],
        qualitativeDefects: [
          {
            id: 'def-coolant-hose',
            domain: 'THERMAL_COOLING',
            title: 'Coolant Hose Hairline Crack',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 5,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
        domainResults: {
          POWERTRAIN_ENGINE: { domain: 'POWERTRAIN_ENGINE', state: 'VERIFIED_DEFECTS_FOUND', coverageCredit: 1.0, defects: [] },
          POWERTRAIN_TRANS: { domain: 'POWERTRAIN_TRANS', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          EMISSIONS_EXHAUST: { domain: 'EMISSIONS_EXHAUST', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          HV_BATTERY_SYSTEM: { domain: 'HV_BATTERY_SYSTEM', state: 'NOT_APPLICABLE', coverageCredit: 0.0, defects: [] },
          THERMAL_COOLING: { domain: 'THERMAL_COOLING', state: 'VERIFIED_DEFECTS_FOUND', coverageCredit: 1.0, defects: [] },
          ELECTRONICS_BODY: { domain: 'ELECTRONICS_BODY', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          CHASSIS_BRAKES: { domain: 'CHASSIS_BRAKES', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          SAFETY_RECALL: { domain: 'SAFETY_RECALL', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
        },
      };

      const vehicleContext = {
        vehicleIdentity: { brand: 'BMW', model: '3 Serisi', modelYear: 2020, fuelType: 'Benzin' },
      };
      const listing = { heavyDamage: false, hasFullServiceHistory: true };

      const scoreResult = service.calculateScoresFromReliabilityResearch(vehicleContext, mockProducerOutput, listing);

      expect(scoreResult.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
      expect(scoreResult.modelRiskScore).not.toBeNull();
      expect(scoreResult.modelRiskScore).toBeGreaterThan(0);
      expect(scoreResult.modelRiskQuantification).toBe('PARTIAL_LOWER_BOUND');
      expect(scoreResult.buyabilityScore).toBeNull();
      expect(scoreResult.buyabilityState).toBe('INSUFFICIENT_MODEL_DATA');
    });

    // 3. Recall + Qualitative bridge
    it('Bridge Test 3: Producer with 1 qualitative defect + 1 recall bridges correctly without loss', () => {
      const mockProducerOutput: any = {
        researchId: 'rel-ioniq-1',
        reliabilityCoverageScore: 85,
        allVerifiedDefects: [],
        qualitativeDefects: [
          {
            id: 'def-iccu',
            domain: 'HV_BATTERY_SYSTEM',
            title: 'ICCU Power Module Overheating',
            problemType: 'VERIFIED_FAILURE',
            severityNum: 8,
            numericEligibility: 'QUALITATIVE_ONLY',
            prevalenceFactor: null,
          },
        ],
        domainResults: {
          POWERTRAIN_ENGINE: { domain: 'POWERTRAIN_ENGINE', state: 'NOT_APPLICABLE', coverageCredit: 0.0, defects: [] },
          POWERTRAIN_TRANS: { domain: 'POWERTRAIN_TRANS', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          EMISSIONS_EXHAUST: { domain: 'EMISSIONS_EXHAUST', state: 'NOT_APPLICABLE', coverageCredit: 0.0, defects: [] },
          HV_BATTERY_SYSTEM: { domain: 'HV_BATTERY_SYSTEM', state: 'VERIFIED_DEFECTS_FOUND', coverageCredit: 1.0, defects: [] },
          THERMAL_COOLING: { domain: 'THERMAL_COOLING', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          ELECTRONICS_BODY: { domain: 'ELECTRONICS_BODY', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          CHASSIS_BRAKES: { domain: 'CHASSIS_BRAKES', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          SAFETY_RECALL: {
            domain: 'SAFETY_RECALL',
            state: 'VERIFIED_DEFECTS_FOUND',
            coverageCredit: 1.0,
            defects: [
              {
                campaignNumber: '24V-204',
                description: 'ICCU Software Update and Fuse Inspection',
                numericEligibility: 'QUALITATIVE_ONLY',
              },
            ],
          },
        },
      };

      const vehicleContext = {
        vehicleIdentity: { brand: 'Hyundai', model: 'Ioniq 5', modelYear: 2022, fuelType: 'Elektrik', isElectric: true },
      };

      const scoreResult = service.calculateScoresFromReliabilityResearch(vehicleContext, mockProducerOutput);

      expect(scoreResult.modelRiskState).toBe('VERIFIED_RISK_PRESENT');
      expect(scoreResult.modelRiskScore).toBeNull();
      expect(scoreResult.modelRiskQuantification).toBe('QUALITATIVE_ONLY');

      const recallDomain = scoreResult.domainBreakdown.find((d) => d.domain === 'SAFETY_RECALL');
      expect(recallDomain?.state).toBe('QUALITATIVE_RISK');
      expect(recallDomain?.score).toBeNull();
    });

    // 4. Zero defects certified low risk bridge
    it('Bridge Test 4: Producer with 0 defects and >=80% coverage bridges cleanly to CERTIFIED_ZERO', () => {
      const mockProducerOutput: any = {
        researchId: 'rel-clean-1',
        reliabilityCoverageScore: 85,
        allVerifiedDefects: [],
        qualitativeDefects: [],
        domainResults: {
          POWERTRAIN_ENGINE: { domain: 'POWERTRAIN_ENGINE', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [], channels: [{ sources: [{ sourceId: 's1' }, { sourceId: 's2' }, { sourceId: 's3' }] }] },
          POWERTRAIN_TRANS: { domain: 'POWERTRAIN_TRANS', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          EMISSIONS_EXHAUST: { domain: 'EMISSIONS_EXHAUST', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          HV_BATTERY_SYSTEM: { domain: 'HV_BATTERY_SYSTEM', state: 'NOT_APPLICABLE', coverageCredit: 0.0, defects: [] },
          THERMAL_COOLING: { domain: 'THERMAL_COOLING', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          ELECTRONICS_BODY: { domain: 'ELECTRONICS_BODY', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          CHASSIS_BRAKES: { domain: 'CHASSIS_BRAKES', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
          SAFETY_RECALL: { domain: 'SAFETY_RECALL', state: 'SEARCHED_NO_VERIFIED_DEFECT', coverageCredit: 1.0, defects: [] },
        },
      };

      const vehicleContext = {
        vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022, fuelType: 'Benzin' },
      };

      const scoreResult = service.calculateScoresFromReliabilityResearch(vehicleContext, mockProducerOutput);

      expect(scoreResult.modelRiskState).toBe('VERIFIED_LOW_RISK');
      expect(scoreResult.modelRiskScore).toBe(0);
      expect(scoreResult.modelRiskQuantification).toBe('CERTIFIED_ZERO');
    });

    // 5. Insufficient research bridge
    it('Bridge Test 5: Producer with <60% coverage bridges to INSUFFICIENT_RESEARCH even with defects', () => {
      const mockProducerOutput: any = {
        researchId: 'rel-shallow-1',
        reliabilityCoverageScore: 40,
        allVerifiedDefects: [],
        qualitativeDefects: [
          {
            id: 'def-control-arm',
            domain: 'CHASSIS_BRAKES',
            title: 'Control Arm Squeak',
            numericEligibility: 'QUALITATIVE_ONLY',
          },
        ],
        domainResults: {
          CHASSIS_BRAKES: { domain: 'CHASSIS_BRAKES', state: 'VERIFIED_DEFECTS_FOUND', coverageCredit: 0.4, defects: [] },
        },
      };

      const vehicleContext = {
        vehicleIdentity: { brand: 'BrandX', model: 'ModelY', modelYear: 2022 },
      };

      const scoreResult = service.calculateScoresFromReliabilityResearch(vehicleContext, mockProducerOutput);

      expect(scoreResult.modelRiskState).toBe('INSUFFICIENT_RESEARCH');
      expect(scoreResult.modelRiskScore).toBeNull();
      expect(scoreResult.modelRiskQuantification).toBe('NOT_ESTIMABLE');
    });
  });
});

