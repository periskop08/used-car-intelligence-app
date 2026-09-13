import { VehicleReportScoringService } from '../vehicle-report-scoring.service';
import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';
import { ResearchEvidenceValidationService } from '../research-evidence-validation.service';

describe('Vehicle Report Scoring Determinism & Hybrid/e-CVT Guards', () => {
  let scoringService: VehicleReportScoringService;
  let validationService: VehicleReportSemanticValidationService;

  beforeEach(() => {
    scoringService = new VehicleReportScoringService();
    validationService = new VehicleReportSemanticValidationService();
  });

  describe('Scoring Determinism', () => {
    it('should produce identical technicalRiskScore and buyabilityScore when run twice on same frozen context', () => {
      const frozenVehicleContext = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          engineCode: '1.8 Hybrid',
          transmissionName: 'e-CVT',
          variantMatchConfidence: 'KESİN',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [],
          recalls: [],
        },
        verifiedResearch: {
          webSearchPerformed: true,
          reliabilityResearch: [],
          recallResearch: [],
        },
      };

      const scoreRun1 = scoringService.calculateScores(frozenVehicleContext);
      const scoreRun2 = scoringService.calculateScores(frozenVehicleContext);

      expect(scoreRun1.technicalRiskScore.value).toBe(scoreRun2.technicalRiskScore.value);
      expect(scoreRun1.buyabilityScore.value).toBe(scoreRun2.buyabilityScore.value);
      expect(scoreRun1.dataConfidenceScore.value).toBe(scoreRun2.dataConfidenceScore.value);
      expect(scoreRun1.variantConfidenceScore.value).toBe(scoreRun2.variantConfidenceScore.value);

      // Verify clean baseline values
      expect(scoreRun1.technicalRiskScore.value).toBe(5);
      expect(scoreRun1.buyabilityScore.value).toBe(87);
    });

    it('should NOT alter numeric score when unverified community feedback is present', () => {
      const cleanContext = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          engineCode: '1.8 Hybrid',
          transmissionName: 'e-CVT',
          variantMatchConfidence: 'KESİN',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [],
          recalls: [],
        },
      };

      const communityFeedbackContext = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          engineCode: '1.8 Hybrid',
          transmissionName: 'e-CVT',
          variantMatchConfidence: 'KESİN',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [
            {
              id: 'comm-1',
              title: 'Trim sesi şikayeti',
              description: 'Kullanıcı bildirimine göre trim sesi duyulabilir',
              problemType: 'COMMUNITY_FEEDBACK',
              riskLevel: 'LOW',
            },
          ],
          recalls: [],
        },
      };

      const cleanScore = scoringService.calculateScores(cleanContext);
      const communityScore = scoringService.calculateScores(communityFeedbackContext);

      // Numeric scores must remain strictly equal because community feedback has 0 numeric weight
      expect(communityScore.technicalRiskScore.value).toBe(cleanScore.technicalRiskScore.value);
      expect(communityScore.buyabilityScore.value).toBe(cleanScore.buyabilityScore.value);

      // Community feedback should be recorded as a factor with impact: 0
      const communityFactor = communityScore.technicalRiskScore.factors.find(
        (f) => f.key === 'COMMUNITY_FEEDBACK_comm-1'
      );
      expect(communityFactor).toBeDefined();
      expect(communityFactor?.impact).toBe(0);
    });

    it('should deterministically alter score when verified failure is added', () => {
      const verifiedContext = {
        vehicleIdentity: {
          brand: 'Volkswagen',
          model: 'Passat',
          modelYear: 2017,
          engineCode: '1.6 TDI',
          transmissionName: 'DSG',
          variantMatchConfidence: 'KESİN',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [
            {
              id: 'vf-1',
              title: 'DQ200 Mekatronik Basınç Tüpü Gevşemesi',
              description: 'Mekatronik gövdesinde basınç düşüşü ve vites geçiş arızası',
              problemType: 'VERIFIED_FAILURE',
              riskLevel: 'CRITICAL',
            },
          ],
          recalls: [],
        },
      };

      const run1 = scoringService.calculateScores(verifiedContext);
      const run2 = scoringService.calculateScores(verifiedContext);

      expect(run1.technicalRiskScore.value).toBe(25);
      expect(run1.buyabilityScore.value).toBe(75); // 90 - Math.round(25 * 0.6) = 75
      expect(run1.technicalRiskScore.value).toBe(run2.technicalRiskScore.value);
      expect(run1.buyabilityScore.value).toBe(run2.buyabilityScore.value);
    });
  });

  describe('e-CVT Terminology Guard in Semantic Validation', () => {
    const validBaseReport: any = {
      reportId: 'rep-ecvt-test',
      mode: 'VEHICLE_QUERY',
      status: 'READY',
      variantId: 'var-1',
      reportVersion: '5.1',
      schemaVersion: 2,
      vehicleIdentity: {
        brand: 'Toyota',
        model: 'Corolla',
        modelYear: 2020,
        fuelType: 'Hibrit',
        transmissionName: 'e-CVT',
        engineCode: '1.8 Hybrid',
        enginePowerHp: 122,
        variantMatchConfidence: 'KESİN',
        supportingFactIds: ['ENGINE_POWER'],
      },
      executiveSummary: {
        title: 'Toyota Corolla 1.8 Hybrid Özeti',
        oneSentenceSummary: 'Toyota Corolla 1.8 Hybrid e-CVT, düşük tüketim ve konfor odaklı hibrit sedandır.',
        keyWarnings: [],
        bestFor: ['Şehir içi kullanım'],
        notIdealFor: ['Sportif sürüş'],
      },
      expertDecisionSynthesis: {
        vehicleCharacter: {
          headline: 'Toyota Corolla 1.8 Hybrid e-CVT İncelemesi',
          detailedAssessment:
            'Toyota Corolla 1.8 Hybrid, sürekli kademesiz planet dişli güç aktarımı ve elektrik-benzin motor geçiş pürüzsüzlüğü ile şehir içinde son derece konforlu bir sürüş karakteri sunar. Toplam 122 HP sistem gücü ve 142 Nm benzinli motor torku günlük kullanımda akıcı ve ekonomik bir yapı sağlar.',
          supportingFactIds: ['ENGINE_POWER'],
        },
        trimPackageComparison: {
          selectedTrimName: 'Flame',
          lowerOrAlternativeTrimName: 'Dream',
          comparisonNarrative: 'Flame paketi zengin güvenlik ve konfor donanımları içerir.',
          keyAddedFeatures: ['Kablosuz Şarj', '17 inç Jantlar'],
          missingFeaturesInLowerTrim: ['Kablosuz Şarj'],
        },
        dailyUseAssessment: {
          cityUse: 'Şehir içinde elektrik motoru destekli sessiz ve akıcı sürüş.',
          highwayUse: 'Otoyol hızlarında stabil ve güvenli.',
          trafficBehavior: 'Dur-kalk trafikte sarsıntısız güç bölüştürme.',
          comfortAssessment: 'Yüksek konfor ve düşük titreşim seviyesi.',
          supportingFactIds: ['ENGINE_POWER'],
        },
        strongestReasonsToChoose: [
          {
            title: 'Düşük Yakıt Tüketimi',
            explanation: 'Şehir içinde hibrit sistem sayesinde 4.0-4.5 L/100km tüketim sunar.',
            supportingFactIds: ['ENGINE_POWER'],
          },
        ],
        compromisesAndLimitations: [
          {
            title: 'Yüksek Hız Performans Karakteri',
            explanation: 'Sert hızlanmalarda motor devri artışı karakteristik bir durumdur.',
            supportingFactIds: ['ENGINE_POWER'],
          },
        ],
        suitableFor: [
          {
            profile: 'Şehir İçi Kullanıcılar',
            explanation: 'Düşük yakıt maliyeti arayanlar.',
            supportingFactIds: ['ENGINE_POWER'],
          },
        ],
        notSuitableFor: [
          {
            profile: 'Sportif Sürüş Arayanlar',
            explanation: 'Yüksek performans beklentisi olanlar.',
            supportingFactIds: ['ENGINE_POWER'],
          },
        ],
        purchaseConditions: [
          {
            condition: 'Hibrit Batarya ve İnvertör Testi',
            reason: 'Sistemin sağlıklı çalıştığını doğrulamak.',
            priority: 'IMPORTANT',
            supportingFactIds: ['ENGINE_POWER'],
          },
        ],
        walkAwayConditions: [
          {
            condition: 'Hibrit Transaks / İnvertör Sisteminde Arıza Uyarısı',
            reason: 'Yüksek maliyetli onarımların önüne geçmek.',
            priority: 'CRITICAL',
            supportingFactIds: ['ENGINE_POWER'],
          },
        ],
        finalConditionalVerdict: {
          shortVerdict: 'Kontroller sağlandığı takdirde önerilir.',
          detailedVerdict: 'Toyota Corolla 1.8 Hybrid, hibrit testleri sorunsuz ise satın alınabilir.',
          confidence: 'HIGH',
          supportingFactIds: ['ENGINE_POWER'],
        },
      },
    };

    it('should accept valid e-CVT report with power-split terminology', () => {
      const context = {
        problems: [],
        verifiedDatabaseVehicleReport: { knownDatabaseProblems: [] },
        verifiedResearch: { chronicFaults: [] },
      };

      const result = validationService.validate(validBaseReport, context);
      expect(result.isValid).toBe(true);
    });

    it('should reject e-CVT report that uses stepped gear / DCT mechatronic terminology', () => {
      const invalidReport = JSON.parse(JSON.stringify(validBaseReport));
      invalidReport.expertDecisionSynthesis.dailyUseAssessment.trafficBehavior =
        'Dur-kalk trafikte vites geçişlerinde vuruntu ve mekatronik arızası riski bulunmaktadır.';

      const context = {
        problems: [],
        verifiedDatabaseVehicleReport: { knownDatabaseProblems: [] },
        verifiedResearch: { chronicFaults: [] },
      };

      const result = validationService.validate(invalidReport, context);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('e-CVT / Hibrit planet dişli transaks mimarisine sahip araçta');
    });
  });

  describe('Hybrid Power/Torque DB Value Preservation & Semantic Labeling', () => {
    it('should preserve verified DB power value (120 HP) unchanged when DB power is explicitly set', () => {
      const contradictionService = new (require('../vehicle-report-contradiction.service').VehicleReportContradictionService)();
      const fallbackService = new (require('../vehicle-report-fallback.service').VehicleReportFallbackService)(scoringService, contradictionService);
      const dbVehicleContext = {
        vehicleIdentity: {
          variantId: 'toyota-corolla-hybrid-2020',
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          fuelType: 'Hibrit',
          transmissionName: 'e-CVT',
          engineCode: '1.8 Hybrid',
          enginePowerHp: 120, // DB has 120 HP
          powerUnit: 'HP',
        },
        performanceSpecs: {
          engineTorqueNm: 142, // ICE-only torque in DB
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [],
          recalls: [],
        },
      };

      const report = fallbackService.generateFallbackReport('rep-fallback-1', 'VEHICLE_REPORT', dbVehicleContext);

      // Verified DB numeric values must survive unchanged
      expect(report.vehicleIdentity.enginePowerHp).toBe(120);
      expect(report.vehicleIdentity.powerUnit).toBe('HP');
      expect(typeof report.vehicleIdentity.enginePowerHp).toBe('number');

      // Check provider merge protection: AI proposing 122 HP must not overwrite verified DB 120 HP
      const providerService = new (require('../vehicle-report-provider.service').VehicleReportProviderService)(
        null as any,
        fallbackService,
        null as any,
        validationService,
        scoringService,
        null as any
      );

      const aiContent = {
        technicalSpecifications: {
          enginePowerHp: 122,
          powerUnit: 'HP',
          engineTorqueNm: 142,
        },
      };

      (providerService as any).mapGeneratedContentToReport(report, aiContent);

      // Verified DB enginePowerHp must remain 120
      expect(report.vehicleIdentity.enginePowerHp).toBe(120);
      expect(typeof report.vehicleIdentity.enginePowerHp).toBe('number');
    });

    it('should maintain numeric purity, preserve original unit (PS/kW), and forbid embedded semantic labels when DB power is null (Corolla Production Parity)', () => {
      const contradictionService = new (require('../vehicle-report-contradiction.service').VehicleReportContradictionService)();
      const fallbackService = new (require('../vehicle-report-fallback.service').VehicleReportFallbackService)(scoringService, contradictionService);

      // Actual production context: DB power is null (letting Stage 1 research provide verified factory spec)
      const productionCorollaContext = {
        vehicleIdentity: {
          variantId: 'c7767942-0fb8-4efd-956d-1077a33d68c9',
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          fuelType: 'Hibrit',
          transmissionName: 'e-CVT',
          engineCode: '1.8 Hybrid',
          enginePowerHp: null, // Production DB has null
        },
        performanceSpecs: {
          enginePowerHp: null,
          engineTorqueNm: null,
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [],
          recalls: [],
        },
      };

      const baseReport = fallbackService.generateFallbackReport('rep-corolla-live', 'VEHICLE_REPORT', productionCorollaContext);

      const providerService = new (require('../vehicle-report-provider.service').VehicleReportProviderService)(
        null as any,
        fallbackService,
        null as any,
        validationService,
        scoringService,
        null as any
      );

      // Stage 1 / Stage 2 outputs verified factory specification: 122 PS
      const aiGeneratedContent = {
        technicalSpecifications: {
          enginePowerHp: 122,
          powerUnit: 'PS',
          engineTorqueNm: 142,
        },
      };

      (providerService as any).mapGeneratedContentToReport(baseReport, aiGeneratedContent);
      (providerService as any).sanitizeIncompatibleReportFields(baseReport, productionCorollaContext);

      // 1. Numeric fields must remain pure numbers
      expect(typeof baseReport.vehicleIdentity.enginePowerHp).toBe('number');
      expect(baseReport.vehicleIdentity.enginePowerHp).toBe(122);
      expect(typeof baseReport.performanceUsage?.powerHp).toBe('number');
      expect(baseReport.performanceUsage?.powerHp).toBe(122);

      // 2. Original unit must be preserved
      expect(baseReport.vehicleIdentity.powerUnit).toBe('PS');
      expect(baseReport.performanceUsage?.powerUnit).toBe('PS');

      // 3. No semantic labels embedded inside numeric fields
      expect(String(baseReport.vehicleIdentity.enginePowerHp)).not.toContain('Toplam Hibrit');
      expect(String(baseReport.performanceUsage?.powerHp)).not.toContain('Toplam Hibrit');

      // 4. Frontend rendering parity verification: value + unit + semanticLabel
      const isHybrid = baseReport.vehicleIdentity.fuelType.toLowerCase().includes('hibrit');
      const powerUnit = baseReport.performanceUsage?.powerUnit || baseReport.vehicleIdentity.powerUnit || 'HP';
      const powerSemanticLabel = isHybrid ? ' (Toplam Hibrit Sistem Gücü)' : '';
      const formattedHeader = `${baseReport.performanceUsage?.powerHp} ${powerUnit}${powerSemanticLabel}`;

      expect(formattedHeader).toBe('122 PS (Toplam Hibrit Sistem Gücü)');
      expect(formattedHeader).not.toContain('122 (Toplam Hibrit Sistem Gücü) HP');
    });
  });

  describe('Power Resolution Precedence & Stage 1 Evidence Promotion (Architectural Invariant)', () => {
    let localScoringService: VehicleReportScoringService;
    let localValidationService: VehicleReportSemanticValidationService;
    let contradictionService: any;
    let fallbackService: any;
    let providerService: any;

    beforeEach(() => {
      localScoringService = new VehicleReportScoringService();
      localValidationService = new VehicleReportSemanticValidationService();
      contradictionService = new (require('../vehicle-report-contradiction.service').VehicleReportContradictionService)();
      fallbackService = new (require('../vehicle-report-fallback.service').VehicleReportFallbackService)(localScoringService, contradictionService);
      providerService = new (require('../vehicle-report-provider.service').VehicleReportProviderService)(
        null as any,
        fallbackService,
        null as any,
        localValidationService,
        localScoringService,
        null as any
      );
    });

    it('Scenario 1: DB power exists → DB wins over Stage 1 and Stage 2', () => {
      const dbContext = {
        vehicleIdentity: {
          brand: 'Volkswagen',
          model: 'Golf',
          modelYear: 2020,
          fuelType: 'Benzin',
          transmissionName: 'DSG',
          engineCode: '1.5 eTSI',
          enginePowerHp: 150,
          powerUnit: 'HP',
          powerSource: 'VEHICLE_DATABASE',
        },
        verifiedResearch: {
          verifiedTechnicalSpecs: {
            powerHp: 147,
            powerUnit: 'PS',
            powerSource: 'VERIFIED_STAGE_1',
          },
        },
      };

      const baseReport = fallbackService.generateFallbackReport('rep-1', 'VEHICLE_REPORT', dbContext);
      const stage2Content = { technicalSpecifications: { enginePowerHp: 160, powerUnit: 'HP' } };

      (providerService as any).mapGeneratedContentToReport(baseReport, stage2Content, dbContext);

      expect(baseReport.vehicleIdentity.enginePowerHp).toBe(150);
      expect((baseReport.vehicleIdentity as any).powerUnit).toBe('HP');
      expect((baseReport.vehicleIdentity as any).powerSource).toBe('VEHICLE_DATABASE');
      expect(baseReport.performanceUsage?.powerHp).toBe(150);
      expect(baseReport.performanceUsage?.powerUnit).toBe('HP');
    });

    it('Scenario 2: DB null + verified Stage 1 power exists → Stage 1 wins over Stage 2', () => {
      const stage1Context = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          fuelType: 'Hibrit',
          transmissionName: 'e-CVT',
          engineCode: '1.8 Hybrid',
          enginePowerHp: null,
        },
        verifiedResearch: {
          verifiedTechnicalSpecs: {
            powerHp: 122,
            powerUnit: 'PS',
            powerSource: 'VERIFIED_STAGE_1',
            powerSemantic: 'TOTAL_HYBRID_SYSTEM_POWER',
          },
        },
      };

      const baseReport = fallbackService.generateFallbackReport('rep-2', 'VEHICLE_REPORT', stage1Context);
      const stage2Content = { technicalSpecifications: { enginePowerHp: 90, powerUnit: 'kW' } };

      (providerService as any).mapGeneratedContentToReport(baseReport, stage2Content, stage1Context);

      expect(baseReport.vehicleIdentity.enginePowerHp).toBe(122);
      expect((baseReport.vehicleIdentity as any).powerUnit).toBe('PS');
      expect((baseReport.vehicleIdentity as any).powerSource).toBe('VERIFIED_STAGE_1');
      expect((baseReport.vehicleIdentity as any).powerSemantic).toBe('TOTAL_HYBRID_SYSTEM_POWER');
      expect(baseReport.performanceUsage?.powerHp).toBe(122);
      expect(baseReport.performanceUsage?.powerUnit).toBe('PS');
    });

    it('Scenario 3: DB null + Stage 1 verified power exists + Stage 2 returns null → Stage 1 still survives', () => {
      const stage1Context = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          fuelType: 'Hibrit',
          transmissionName: 'e-CVT',
          engineCode: '1.8 Hybrid',
          enginePowerHp: null,
        },
        verifiedResearch: {
          verifiedTechnicalSpecs: {
            powerHp: 122,
            powerUnit: 'PS',
            powerSource: 'VERIFIED_STAGE_1',
            powerSemantic: 'TOTAL_HYBRID_SYSTEM_POWER',
          },
        },
      };

      const baseReport = fallbackService.generateFallbackReport('rep-3', 'VEHICLE_REPORT', stage1Context);
      // Stage 2 fails to return or returns null
      const stage2Content = { technicalSpecifications: { enginePowerHp: null } };

      (providerService as any).mapGeneratedContentToReport(baseReport, stage2Content, stage1Context);

      expect(baseReport.vehicleIdentity.enginePowerHp).toBe(122);
      expect((baseReport.vehicleIdentity as any).powerUnit).toBe('PS');
      expect((baseReport.vehicleIdentity as any).powerSource).toBe('VERIFIED_STAGE_1');
      expect(baseReport.performanceUsage?.powerHp).toBe(122);
      expect(baseReport.performanceUsage?.powerUnit).toBe('PS');
    });

    it('Scenario 4: DB null + no verified Stage 1 + evidence-backed Stage 2 exists → Stage 2 wins', () => {
      const emptyContext = {
        vehicleIdentity: {
          brand: 'Renault',
          model: 'Megane',
          modelYear: 2018,
          fuelType: 'Dizel',
          transmissionName: 'EDC',
          engineCode: '1.5 dCi',
          enginePowerHp: null,
        },
        verifiedResearch: undefined,
      };

      const baseReport = fallbackService.generateFallbackReport('rep-4', 'VEHICLE_REPORT', emptyContext);
      const stage2Content = { technicalSpecifications: { enginePowerHp: 110, powerUnit: 'HP' } };

      (providerService as any).mapGeneratedContentToReport(baseReport, stage2Content, emptyContext);

      expect(baseReport.vehicleIdentity.enginePowerHp).toBe(110);
      expect((baseReport.vehicleIdentity as any).powerUnit).toBe('HP');
      expect((baseReport.vehicleIdentity as any).powerSource).toBe('AI_VERIFIED_TECHNICAL_SPECS');
      expect(baseReport.performanceUsage?.powerHp).toBe(110);
    });

    it('Scenario 5: No trusted/evidence-backed value anywhere → null / —', () => {
      const emptyContext = {
        vehicleIdentity: {
          brand: 'Custom',
          model: 'Proto',
          modelYear: 2024,
          fuelType: 'Elektrik',
          transmissionName: 'Direct',
          engineCode: 'Experimental',
          enginePowerHp: null,
        },
        verifiedResearch: undefined,
      };

      const baseReport = fallbackService.generateFallbackReport('rep-5', 'VEHICLE_REPORT', emptyContext);
      const stage2Content = { technicalSpecifications: { enginePowerHp: null } };

      (providerService as any).mapGeneratedContentToReport(baseReport, stage2Content, emptyContext);

      expect(baseReport.vehicleIdentity.enginePowerHp).toBeUndefined();
      expect(baseReport.performanceUsage?.powerHp).toBeUndefined();
    });

    it('Scenario 6: Numeric field always remains pure number (never a string or object)', () => {
      const ctx = {
        vehicleIdentity: {
          brand: 'BMW',
          model: '320i',
          modelYear: 2021,
          fuelType: 'Benzin',
          transmissionName: 'Otomatik',
          engineCode: 'B48',
          enginePowerHp: null,
        },
        verifiedResearch: {
          verifiedTechnicalSpecs: {
            powerHp: 170,
            powerUnit: 'HP',
            powerSource: 'VERIFIED_STAGE_1',
          },
        },
      };

      const baseReport = fallbackService.generateFallbackReport('rep-6', 'VEHICLE_REPORT', ctx);
      (providerService as any).mapGeneratedContentToReport(baseReport, {}, ctx);

      expect(typeof baseReport.vehicleIdentity.enginePowerHp).toBe('number');
      expect(typeof baseReport.performanceUsage?.powerHp).toBe('number');
      expect(Number.isFinite(baseReport.vehicleIdentity.enginePowerHp)).toBe(true);
    });

    it('Scenario 7: Original unit survives unchanged without silent conversion (90 kW → 90 kW, not 122 HP)', () => {
      const kwContext = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          fuelType: 'Hibrit',
          transmissionName: 'e-CVT',
          engineCode: '1.8 Hybrid',
          enginePowerHp: null,
        },
        verifiedResearch: {
          verifiedTechnicalSpecs: {
            powerHp: 90,
            powerUnit: 'kW',
            powerSource: 'VERIFIED_STAGE_1',
            powerSemantic: 'TOTAL_HYBRID_SYSTEM_POWER',
          },
        },
      };

      const baseReport = fallbackService.generateFallbackReport('rep-7', 'VEHICLE_REPORT', kwContext);
      (providerService as any).mapGeneratedContentToReport(baseReport, {}, kwContext);

      expect(baseReport.vehicleIdentity.enginePowerHp).toBe(90);
      expect((baseReport.vehicleIdentity as any).powerUnit).toBe('kW');
      expect(baseReport.performanceUsage?.powerHp).toBe(90);
      expect(baseReport.performanceUsage?.powerUnit).toBe('kW');

      // Formatted frontend output
      const isHybrid = baseReport.vehicleIdentity.fuelType.toLowerCase().includes('hibrit');
      const powerUnit = baseReport.performanceUsage?.powerUnit || 'HP';
      const label = `${baseReport.performanceUsage?.powerHp} ${powerUnit}${isHybrid ? ' (Toplam Hibrit Sistem Gücü)' : ''}`;
      expect(label).toBe('90 kW (Toplam Hibrit Sistem Gücü)');
    });

    it('Scenario E: Real characterResearchCache production schema produces Stage 1 verified power and resolves in report precedence without manual mock', () => {
      const realResearchInput = {
        questions: {
          engineTransmissionFit: {
            synthesisedAnswer: '2020 Toyota Corolla 1.8 Hybrid Otomatik Flame TR varyantında motor ve şanzıman kombinasyonu toplam 122 PS sistem gücü üretir.',
            sources: [
              {
                title: 'Toyota Corolla 1.8 Hybrid 2020 Test',
                url: 'https://otomobil.com.tr/corolla-1-8-hybrid-test',
                domain: 'otomobil.com.tr',
                relevantSnippet: 'Corolla 1.8 Hybrid toplam 122 PS güç ve e-CVT şanzıman ile test edildi.',
              },
            ],
          },
        },
      };

      const ctx = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2020,
          fuelType: 'Hibrit',
          transmissionName: 'e-CVT',
          engineCode: '1.8 Hybrid',
          enginePowerHp: null,
        },
        vehicleCharacterResearch: realResearchInput,
      };

      const evidenceValidationService = new ResearchEvidenceValidationService();
      const validatedResearch = evidenceValidationService.validateResearchData(realResearchInput, ctx);
      expect(validatedResearch.verifiedTechnicalSpecs).toBeDefined();
      expect(validatedResearch.verifiedTechnicalSpecs?.powerHp).toBe(122);
      expect(validatedResearch.verifiedTechnicalSpecs?.powerUnit).toBe('PS');

      const validationContext = {
        ...ctx,
        verifiedResearch: validatedResearch,
      };

      const baseReport = fallbackService.generateFallbackReport('rep-8', 'VEHICLE_REPORT', validationContext);
      const stage2EmptySpecs = { technicalSpecifications: { enginePowerHp: null } };

      (providerService as any).mapGeneratedContentToReport(baseReport, stage2EmptySpecs, validationContext);

      expect(baseReport.vehicleIdentity.enginePowerHp).toBe(122);
      expect((baseReport.vehicleIdentity as any).powerUnit).toBe('PS');
      expect((baseReport.vehicleIdentity as any).powerSource).toBe('VERIFIED_STAGE_1');
      expect((baseReport.vehicleIdentity as any).powerSemantic).toBe('TOTAL_HYBRID_SYSTEM_POWER');
      expect(baseReport.performanceUsage?.powerHp).toBe(122);
      expect(baseReport.performanceUsage?.powerUnit).toBe('PS');
      expect(baseReport.performanceUsage?.powerSource).toBe('VERIFIED_STAGE_1');
      expect(baseReport.performanceUsage?.powerSemantic).toBe('TOTAL_HYBRID_SYSTEM_POWER');
    });
  });
});

