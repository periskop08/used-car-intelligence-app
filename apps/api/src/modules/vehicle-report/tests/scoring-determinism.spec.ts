import { VehicleReportScoringService } from '../vehicle-report-scoring.service';
import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';

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
});
