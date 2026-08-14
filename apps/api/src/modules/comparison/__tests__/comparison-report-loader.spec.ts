import { Test, TestingModule } from '@nestjs/testing';
import { ComparisonReportLoaderService } from '../comparison-report-loader.service';
import { PrismaService } from '../../../prisma.service';
import { CURRENT_REPORT_VERSION } from '../../vehicle-report/vehicle-report-cache.service';

describe('ComparisonReportLoaderService', () => {
  let loaderService: ComparisonReportLoaderService;
  let prisma: PrismaService;

  const mockPrismaService = {
    generatedVehicleReport: {
      findFirst: jest.fn(),
    },
    vehicleVariant: {
      findUnique: jest.fn(),
    },
    aiVehicleReport: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparisonReportLoaderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    loaderService = module.get<ComparisonReportLoaderService>(ComparisonReportLoaderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findLatestGeneratedReport', () => {
    it('should prioritize report matching CURRENT_REPORT_VERSION', async () => {
      const mockReport = {
        id: 'report_v4',
        variantId: 'var_1',
        status: 'COMPLETED',
        reportVersion: CURRENT_REPORT_VERSION,
        reportData: { vehicleIdentity: { brand: 'VW', model: 'Passat' } },
      };

      mockPrismaService.generatedVehicleReport.findFirst.mockResolvedValueOnce(mockReport);

      const result = await loaderService.findLatestGeneratedReport('var_1');

      expect(prisma.generatedVehicleReport.findFirst).toHaveBeenCalledWith({
        where: {
          variantId: 'var_1',
          status: 'COMPLETED',
          archivedAt: null,
          provider: { not: 'DETERMINISTIC_FALLBACK' },
          mode: { in: ['TORQUE_SCOUT_VEHICLE_REPORT', 'VEHICLE_REPORT'] },
          reportVersion: CURRENT_REPORT_VERSION,
        },
        orderBy: { completedAt: 'desc' },
      });
      expect(result).toEqual(mockReport);
    });

    it('should fall back to any valid completed report if exact version is absent', async () => {
      mockPrismaService.generatedVehicleReport.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'report_older',
          variantId: 'var_1',
          status: 'COMPLETED',
          reportVersion: 'v4.3_OLD',
        });

      const result = await loaderService.findLatestGeneratedReport('var_1');

      expect(prisma.generatedVehicleReport.findFirst).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        id: 'report_older',
        variantId: 'var_1',
        status: 'COMPLETED',
        reportVersion: 'v4.3_OLD',
      });
    });
  });

  describe('loadDossierForVariant', () => {
    it('should prioritize reportData.scoring over legacy reportData.scores and map expert synthesis', async () => {
      const mockGeneratedReport = {
        id: 'report_scoring_test',
        reportVersion: CURRENT_REPORT_VERSION,
        completedAt: new Date('2026-08-14'),
        reportData: {
          vehicleIdentity: {
            brand: 'BMW',
            model: '320i',
            modelYear: 2021,
            supportingFactIds: ['fact_identity_1'],
          },
          scoring: {
            buyabilityScore: { value: 88 },
            technicalRiskScore: { value: 15 },
            variantConfidenceScore: { value: 92 },
            dataConfidenceScore: { value: 96 },
            overallConfidence: 'HIGH',
          },
          expertDecisionSynthesis: {
            vehicleCharacter: { headline: 'Dinamik Premium', detailedAssessment: 'Sürüş odaklı', supportingFactIds: ['fact_char_1'] },
            dailyUseAssessment: { cityUse: 'Pratik', comfortAssessment: 'Yüksek yalıtım', supportingFactIds: ['fact_daily_1'] },
            trimPackageComparison: { selectedTrimName: 'M Sport', comparisonNarrative: 'Zengin donanım', keyAddedFeatures: ['M Süspansiyon'] },
          },
          commonProblems: [
            {
              title: 'Termostat Yuvasi Sızdırmazlığı',
              severity: 'ORTA',
              symptoms: ['Soğutma sıvısı eksiltme'],
              supportingFactIds: ['fact_prob_1'],
            },
          ],
          dataQuality: {
            overallConfidence: 'HIGH',
            verifiedFactCount: 15,
            supportingFacts: [
              { factKey: 'fact_identity_1', label: 'Marka Model', value: 'BMW 320i', source: 'EVIDENCE_VERIFIED', confidence: 'HIGH' },
            ],
          },
        },
      };

      mockPrismaService.generatedVehicleReport.findFirst.mockResolvedValue(mockGeneratedReport);

      const dossier = await loaderService.loadDossierForVariant('var_bmw');

      expect(dossier.reportAvailable).toBe(true);
      expect(dossier.scoring.buyabilityScore).toBe(88);
      expect(dossier.scoring.technicalRiskScore).toBe(15);
      expect(dossier.expertDecisionSynthesis).toBeDefined();
      expect(dossier.dailyUseAssessment?.comfortAssessment).toBe('Yüksek yalıtım');
      expect(dossier.trimPackageComparison?.selectedTrimName).toBe('M Sport');
      expect(dossier.supportingFactIds).toContain('fact_identity_1');
      expect(dossier.supportingFactIds).toContain('fact_prob_1');
      expect(dossier.dataQuality?.supportingFacts.length).toBe(1);
    });

    it('should map GeneratedVehicleReport.reportData into a dossier with reportAvailable = true', async () => {
      const mockGeneratedReport = {
        id: 'report_100',
        reportVersion: CURRENT_REPORT_VERSION,
        completedAt: new Date('2026-08-10'),
        reportData: {
          vehicleIdentity: {
            brand: 'Volkswagen',
            model: 'Passat',
            generation: 'Passat B8',
            modelYear: 2020,
            engineCode: '2.0 TDI',
            enginePowerHp: 150,
            fuelType: 'DIESEL',
            transmissionName: 'DSG 7 İleri',
            trimName: 'Highline',
          },
          scores: {
            buyabilityScore: { value: 85 },
            technicalRiskScore: { value: 20 },
            variantConfidenceScore: { value: 90 },
            dataConfidenceScore: { value: 95 },
          },
          engineTransmission: {
            combinationAssessment: 'Dengeli ve güçlü motor-şanzıman kombinasyonu',
            maintenanceSensitivity: ['DSG yağ değişimi her 60.000 km'],
            knownLimitations: ['Soğuk havada marş sesi'],
          },
          performanceUsage: {
            powerHp: 150,
            torqueNm: 360,
            zeroToHundredKmh: 8.7,
            topSpeedKmh: 220,
            combinedFuelL100km: 4.8,
            trunkCapacityLiters: 586,
          },
          commonProblems: [
            {
              title: 'AdBlue Isıtıcı Rezistansı',
              severity: 'ORTA',
              system: 'EGZOZ_EMİSYON',
              symptoms: ['Motor arıza lambası'],
              causeExplanation: 'Rezistans kablosu oksitlenmesi',
              preventionAdvice: 'Kaliteli AdBlue kullanımı',
              inspectionStep: 'OBD arıza kodu taraması',
            },
          ],
          recalls: [
            {
              title: 'Panoramik Cam Tavan Tahliye Hortumu',
              riskDescription: 'Tavan döşemesine su sızması',
              remedyDescription: 'Serviste hortum temizliği',
            },
          ],
          maintenanceOwnership: {
            estimatedAnnualCostCategory: 'ORTA',
            criticalMaintenanceNotes: ['Triger seti değişimi 120.000 km'],
          },
          usageScenarios: [
            { scenarioKey: 'HIGHWAY_USE', title: 'Otoyol Sürüşü', suitability: 'MÜKEMMEL', reasoning: 'Yüksek tork ve sessiz kabin' },
          ],
          executiveSummary: {
            oneSentenceSummary: 'Dengeli ve konforlu aile sedanı.',
            bestFor: ['Uzun yol', 'Geniş aile'],
            notIdealFor: ['Şehir içi dar sokaklar'],
            keyWarnings: [],
          },
          finalVerdict: {
            overallAssessment: 'Fiyat/performans açısından tavsiye edilir.',
            bestFor: ['Otoyol kullanımı'],
            avoidIf: [],
            topThreeActions: ['Ekspertiz vites testi'],
          },
          dataQuality: {
            overallConfidence: 'HIGH',
            verifiedFactCount: 12,
          },
        },
      };

      mockPrismaService.generatedVehicleReport.findFirst.mockResolvedValue(mockGeneratedReport);

      const dossier = await loaderService.loadDossierForVariant('var_passat');

      expect(dossier.reportAvailable).toBe(true);
      expect(dossier.reportId).toBe('report_100');
      expect(dossier.vehicleIdentity.brand).toBe('Volkswagen');
      expect(dossier.vehicleIdentity.model).toBe('Passat');
      expect(dossier.scoring.buyabilityScore).toBe(85);
      expect(dossier.scoring.technicalRiskScore).toBe(20);
      expect(dossier.commonProblems.length).toBe(1);
      expect(dossier.commonProblems[0].title).toBe('AdBlue Isıtıcı Rezistansı');
      expect(dossier.recalls.length).toBe(1);
      expect(dossier.usageScenarios[0].suitability).toBe('MÜKEMMEL');
    });

    it('should build a fallback dossier with reportAvailable = false and null scores when report is absent', async () => {
      mockPrismaService.generatedVehicleReport.findFirst.mockResolvedValue(null);

      const mockDbVariant = {
        id: 'var_corolla',
        year: 2021,
        fuelType: 'PETROL',
        brand: { name: 'Toyota' },
        model: { name: 'Corolla' },
        generation: { name: 'Corolla E210', bodyType: 'SEDAN' },
        engine: { code: '1.8 Hybrid' },
        transmission: { name: 'e-CVT' },
        trim: { name: 'Flame' },
        specs: { specs: { horsepower: 122 } },
        problems: [],
        recalls: [],
      };

      mockPrismaService.vehicleVariant.findUnique.mockResolvedValue(mockDbVariant);
      mockPrismaService.aiVehicleReport.findUnique.mockResolvedValue(null);

      const dossier = await loaderService.loadDossierForVariant('var_corolla');

      expect(dossier.reportAvailable).toBe(false);
      expect(dossier.scoring.buyabilityScore).toBeNull();
      expect(dossier.scoring.technicalRiskScore).toBeNull();
      expect(dossier.scoring.overallConfidence).toBe('LOW');
      expect(dossier.executiveSummary?.oneSentenceSummary).toContain('Veritabanında kayıtlı kronik sorun bulunamadı; bu durum aracın risksiz olduğu anlamına gelmez.');
      expect(dossier.engineTransmission.maintenanceSensitivity).toEqual([]);
    });

    it('should support loading dossiers for multiple variants (2, 5, and 10 vehicles)', async () => {
      mockPrismaService.generatedVehicleReport.findFirst.mockResolvedValue(null);
      mockPrismaService.vehicleVariant.findUnique.mockImplementation((args: any) => {
        const id = args.where.id;
        return Promise.resolve({
          id,
          year: 2022,
          fuelType: 'PETROL',
          brand: { name: 'Brand_' + id },
          model: { name: 'Model_' + id },
          generation: { name: 'Gen_' + id, bodyType: 'SEDAN' },
          engine: { code: '1.6 T' },
          transmission: { name: 'AT' },
          trim: { name: 'Style' },
          specs: { specs: { horsepower: 150 } },
          problems: [],
          recalls: [],
        });
      });

      const variantIds = Array.from({ length: 10 }, (_, i) => `var_${i + 1}`);

      const dossiers = await Promise.all(
        variantIds.map(id => loaderService.loadDossierForVariant(id))
      );

      expect(dossiers.length).toBe(10);
      dossiers.forEach((d, i) => {
        expect(d.variantId).toBe(`var_${i + 1}`);
        expect(d.vehicleIdentity.brand).toBe(`Brand_var_${i + 1}`);
      });
    });
  });
});
