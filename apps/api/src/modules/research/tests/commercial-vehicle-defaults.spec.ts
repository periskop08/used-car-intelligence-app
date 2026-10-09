/// <reference types="jest" />
import { resolveCommercialVehicleDefaults } from '../../vehicle/commercial-vehicle-defaults';
import { MultiVehicleAgentService } from '../multi-vehicle-agent.service';

describe('Commercial Vehicle Intelligence & Defaults System', () => {
  describe('Segment Classification & Physical Defaults Resolution', () => {
    it('accurately resolves Fiat Doblo Cargo (Compact Van, Bi-Link coil springs, 1.6L ~3.4 m3)', () => {
      const defs = resolveCommercialVehicleDefaults('Fiat', 'Doblo', '1.6 MultiJet', 'Cargo', 2017);

      expect(defs.segment).toBe('COMPACT');
      expect(defs.defaultCc).toBe(1598);
      expect(defs.defaultHp).toBe(105);
      expect(defs.candidatePowers).toEqual([90, 105, 120]);
      expect(defs.cargoVolumeM3).toBe(3.4);
      expect(defs.trunkCapacityLiters).toBe(3400);
      expect(defs.curbWeightKg).toBe(1420);
      expect(defs.hasLeafSprings).toBe(false);
      expect(defs.suspensionType).toContain('Bi-Link Bağımsız Helezon Yay');
      expect(defs.hasWetTimingBelt).toBe(false);
    });

    it('accurately resolves Ford Transit Custom (Medium Van, 2.0 EcoBlue wet timing belt, ~6.0 m3)', () => {
      const defs = resolveCommercialVehicleDefaults('Ford', 'Transit Custom', '2.0 EcoBlue', 'Trend', 2020);

      expect(defs.segment).toBe('MEDIUM');
      expect(defs.defaultCc).toBe(1995);
      expect(defs.defaultHp).toBe(130);
      expect(defs.candidatePowers).toEqual([105, 130, 170, 185]);
      expect(defs.cargoVolumeM3).toBe(6.0);
      expect(defs.trunkCapacityLiters).toBe(6000);
      expect(defs.curbWeightKg).toBe(2050);
      expect(defs.hasLeafSprings).toBe(true);
      expect(defs.hasWetTimingBelt).toBe(true);
      expect(defs.typicalFocusIssues.some((i) => i.includes('Belt-in-Oil') || i.includes('ıslak triger'))).toBe(true);
    });

    it('accurately resolves Large Van configuration (Renault Master 13 m3)', () => {
      const defs = resolveCommercialVehicleDefaults('Renault', 'Master', '2.3 dCi', '13 m3', 2018);

      expect(defs.segment).toBe('LARGE');
      expect(defs.defaultCc).toBe(2299);
      expect(defs.defaultHp).toBe(130);
      expect(defs.cargoVolumeM3).toBe(13.0);
      expect(defs.trunkCapacityLiters).toBe(13000);
      expect(defs.curbWeightKg).toBe(2350);
      expect(defs.hasLeafSprings).toBe(true);
    });

    it('accurately distinguishes independent coil rear suspension models (VW Transporter, Mercedes Vito)', () => {
      const transporterDefs = resolveCommercialVehicleDefaults('Volkswagen', 'Transporter', '2.0 TDI', 'Panelvan', 2019);
      expect(transporterDefs.hasLeafSprings).toBe(false);
      expect(transporterDefs.suspensionType).toContain('Helezon Yay');

      const vitoDefs = resolveCommercialVehicleDefaults('Mercedes-Benz', 'Vito', '114 CDI', 'Pro', 2019);
      expect(vitoDefs.hasLeafSprings).toBe(false);
      expect(vitoDefs.suspensionType).toContain('Helezon Yay');
    });

    it('accurately identifies Ford Tourneo Courier Titanium Plus 2017 1.6 TDCi (5-Speed Manual, 708L Trunk, Combi)', () => {
      const courierDefs = resolveCommercialVehicleDefaults('Ford', 'Tourneo Courier', '1.6 TDCi', 'Titanium Plus', 2017);

      expect(courierDefs.segment).toBe('COMPACT');
      expect(courierDefs.defaultCc).toBe(1560);
      expect(courierDefs.defaultHp).toBe(95);
      expect(courierDefs.trunkCapacityLiters).toBe(708);
      expect(courierDefs.cargoVolumeM3).toBe(1.65);
      expect(courierDefs.transmissionOptions.manualType).toBe('5 İleri Manuel');
      expect(courierDefs.transmissionOptions.hasAutomatic).toBe(false);
      expect(courierDefs.segmentNameTr).toContain('Kombi');
    });
  });

  describe('MultiVehicleAgentService Harmonizer & String Protection', () => {
    let service: MultiVehicleAgentService;

    beforeAll(() => {
      const mockPrisma: any = {};
      const mockSearch: any = { search: jest.fn().mockResolvedValue([]) };
      const mockFacts: any = {
        getModelTechnicalFacts: jest.fn().mockResolvedValue({}),
        getVariantTechnicalFacts: jest.fn().mockResolvedValue({}),
      };
      const mockLibrary: any = { verifyAndGetSpecs: jest.fn().mockResolvedValue(null) };
      service = new MultiVehicleAgentService(mockPrisma, mockSearch, mockFacts, mockLibrary);
    });

    it('sanitizeTurkishAutomotiveText unpacks nested objects without producing "[object Object]"', () => {
      const sanitizeFn = (service as any).sanitizeTurkishAutomotiveText.bind(service);

      // Object with text key
      expect(sanitizeFn({ text: 'Orijinal şarj regülatörü yenilendi.' })).toBe('Orijinal şarj regülatörü yenilendi.');

      // Object with multiple paragraphs
      const multiParagraphObj = {
        p1: 'Birinci paragraf sürüş analizi.',
        p2: 'İkinci paragraf motor tork karakteri.',
        p3: 'Üçüncü paragraf filo dayanıklılığı.',
      };
      const result = sanitizeFn(multiParagraphObj);
      expect(result).not.toContain('[object Object]');
      expect(result).toContain('Birinci paragraf');
      expect(result).toContain('İkinci paragraf');
      expect(result).toContain('Üçüncü paragraf');

      // Empty object
      expect(sanitizeFn({})).toBe('');
      expect(sanitizeFn(null)).toBe('');
      expect(sanitizeFn(undefined)).toBe('');
    });

    it('harmonizeIntoStandardVehicleReport bounds commercial trunk capacity to genuine segment values', () => {
      const harmonizeFn = (service as any).harmonizeIntoStandardVehicleReport.bind(service);

      const dobloContext: any = {
        vehicleType: 'MINIVAN_PANELVAN',
        brand: 'Fiat',
        model: 'Doblo',
        year: 2017,
        engine: '1.6 MultiJet',
        trimPackage: 'Cargo',
      };
      const dobloDefaults = resolveCommercialVehicleDefaults('Fiat', 'Doblo', '1.6 MultiJet', 'Cargo', 2017);

      const mockJudge: any = {
        finalPowerHp: 105,
        finalDisplacementCc: 1598,
        finalPowerRangeText: '105 HP',
        candidatePowers: [90, 105, 120],
        decisionScore: 84,
        technicalRiskLevel: 'DUSUK',
        decisionRationale: 'Mekanik inceleme olumlu.',
        approvedFactsOnly: [],
      };

      // Even if writer mistakenly hallucinated 13000 Litres, harmonizer bounds Doblo to 3400L!
      const mockWriter: any = {
        vehicleOverview: 'Kapsamlı sürüş analizi metni.',
        configurationAnalysis: '3.4 m³ kargo yükleme alanı.',
        manualTransmissionAnalysis: '6 ileri manuel şanzıman debriyaj dengesi.',
        technicalSpecifications: {
          trunkCapacityLiters: 13000, // Writer hallucination!
          engineTorqueNm: 300,
        },
      };

      const harmonized = harmonizeFn(dobloContext, mockJudge, mockWriter, dobloDefaults);

      expect(harmonized.technicalSpecifications.trunkCapacityLiters).toBe(3400); // Correctly bound!
      expect(harmonized.technicalSpecifications.engineDisplacementCc).toBe(1598);
      expect(harmonized.technicalSpecifications.enginePowerHp).toBe(105);
      expect(harmonized.vehicleIdentity.bodyType).toBe('Kompakt Panelvan / Minivan');
      expect(harmonized.vehicleIdentity.engineCode).toBe('1.6 MultiJet');
      expect(harmonized.vehicleIdentity.trim).toBe('Cargo');
      expect(harmonized.expertDecisionSynthesis.commercialApplicationAnalysis.configurationContext.cargoVolumeM3).toBe(3.4);
      expect(harmonized.expertDecisionSynthesis.commercialApplicationAnalysis.applicationSummary).toBe('3.4 m³ kargo yükleme alanı.');
    });

    it('deepReconcileReportSemantics strictly enforces 5-Speed Manual on 2017 Courier and purges stray 6-speed text', () => {
      const harmonizeFn = (service as any).harmonizeIntoStandardVehicleReport.bind(service);

      const courierContext: any = {
        vehicleType: 'MINIVAN_PANELVAN',
        brand: 'Ford',
        model: 'Tourneo Courier',
        year: 2017,
        engine: '1.6 TDCi',
        transmission: '5 İleri Manuel',
        trimPackage: 'Titanium Plus',
      };
      const courierDefaults = resolveCommercialVehicleDefaults('Ford', 'Tourneo Courier', '1.6 TDCi', 'Titanium Plus', 2017);

      const mockJudge: any = {
        finalPowerHp: 95,
        finalDisplacementCc: 1560,
        finalPowerRangeText: '95 HP',
        candidatePowers: [95],
        decisionScore: 82,
        technicalRiskLevel: 'DUSUK',
        decisionRationale: 'Mekanik ve ticari kondisyon olumlu.',
        approvedFactsOnly: [],
        commercialDetails: {
          manualGearboxType: '5 İleri Manuel',
          manualGearboxSpeeds: 5,
        },
      };

      // Simulating a writer that hallucinated "6 İleri Manuel", "palet sığma kabiliyeti", and "Büyük aileler için uygun değildir"
      const mockWriter: any = {
        vehicleOverview: 'Ford Tourneo Courier sürüş pozisyonu ve kabin ergonomisi ile öne çıkar.\n\n1560 cc dizel motor 95 HP güç üretir. 6 İleri Manuel şanzıman, vites geçişlerinde netlik sağlarken motorun performansını optimize eder. Altı ileri vites oranları otoyolda tasarruf sağlar.\n\nİkinci el pazarında esnaf ve aileler tarafından tercih edilir.',
        configurationAnalysis: 'Yükleme eşiği, palet sığma kabiliyeti ile ticari kullanımda büyük avantaj sunar.',
        manualTransmissionAnalysis: '6 İleri Manuel şanzımanın baskı balata ömrü ve debriyaj pedalı sertliği kontrol edilmelidir.',
        automaticTransmissionAnalysis: 'Modelde otomatik şanzıman seçeneği bulunmamakta olup yalnızca manuel üretilmiştir.',
        manualVsAutomatic: 'Araç yalnızca manuel şanzımanla üretilmiştir.',
        dailyUse: {
          cityUse: 'Şehir içinde 6 vites ile rahat manevra kabiliyeti sunar.',
          highwayUse: 'Otoyolda 6. viteste düşük devirde seyreder.',
        },
        idealFor: [{ profile: 'Aileler ve Esnaflar', explanation: 'Geniş hacim arayanlar.' }],
        notIdealFor: [{ profile: 'Büyük Aileler', explanation: 'Bu araç büyük aileler için uygun değildir.' }],
        tradeoffs: [{ title: 'Gövde Esnemesi', explanation: 'Yüksek hızda yan rüzgar duyarlılığı.' }],
        technicalSpecifications: {
          trunkCapacityLiters: 708,
          curbWeightKg: 1290,
          transmissionTypeAndSpeeds: '6 İleri Manuel', // Writer hallucination!
        },
      };

      const harmonized = harmonizeFn(courierContext, mockJudge, mockWriter, courierDefaults);

      // 1. Technical Card check
      expect(harmonized.technicalSpecifications.transmissionTypeAndSpeeds).toBe('5 İleri Manuel');
      expect(harmonized.technicalSpecifications.transmissionSpeeds).toBe(5);
      expect(harmonized.vehicleIdentity.transmissionName).toBe('5 İleri Manuel');
      expect(harmonized.technicalSpecifications.trunkCapacityLiters).toBe(708);

      // 2. Narrative paragraph reconciliation check
      const overview = harmonized.expertDecisionSynthesis.vehicleCharacter.detailedAssessment;
      expect(overview).toContain('5 İleri Manuel');
      expect(overview).not.toContain('6 İleri Manuel');
      expect(overview).not.toContain('Altı ileri');
      expect(overview).toContain('Beş ileri');

      // 3. Manual transmission analysis reconciliation check
      const transAnalysis = harmonized.expertDecisionSynthesis.commercialApplicationAnalysis.manualTransmissionAnalysis;
      expect(transAnalysis).toContain('5 İleri Manuel');
      expect(transAnalysis).not.toContain('6 İleri Manuel');

      // 4. Daily use reconciliation check
      const cityUse = harmonized.expertDecisionSynthesis.dailyUseAssessment.cityUse;
      expect(cityUse).toContain('5 vites');
      expect(cityUse).not.toContain('6 vites');

      const highwayUse = harmonized.expertDecisionSynthesis.dailyUseAssessment.highwayUse;
      expect(highwayUse).toContain('5. viteste');
      expect(highwayUse).not.toContain('6. viteste');

      // 5. Pallet removal on combi check
      const configAnalysis = harmonized.expertDecisionSynthesis.commercialApplicationAnalysis.applicationSummary;
      expect(configAnalysis).not.toContain('palet sığma kabiliyeti');
      expect(configAnalysis).toContain('bagaj yükleme pratikliği');

      // 6. Combi Audience Protection check ("Büyük aileler için uygun değildir" replaced!)
      const notIdeal = harmonized.expertDecisionSynthesis.notSuitableFor;
      const notIdealProfiles = notIdeal.map((n: any) => n.profile);
      expect(notIdealProfiles).not.toContain('Büyük Aileler');
      expect(notIdealProfiles.some((p: string) => p.includes('Otoyol'))).toBe(true);
    });
  });
});
