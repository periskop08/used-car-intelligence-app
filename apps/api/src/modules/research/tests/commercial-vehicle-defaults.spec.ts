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

    it('accurately identifies Fiat Fiorino (Compact Van, 1.3L 95 HP, ~2.5 m3)', () => {
      const fiorinoDefs = resolveCommercialVehicleDefaults('Fiat', 'Fiorino', '1.3 MultiJet', 'Cargo', 2021);

      expect(fiorinoDefs.segment).toBe('COMPACT');
      expect(fiorinoDefs.defaultCc).toBe(1248);
      expect(fiorinoDefs.defaultHp).toBe(95);
      expect(fiorinoDefs.cargoVolumeM3).toBe(2.5);
      expect(fiorinoDefs.trunkCapacityLiters).toBe(2500);
      expect(fiorinoDefs.hasLeafSprings).toBe(false);
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
  });
});
