import { VehicleReportPromptService } from '../vehicle-report-prompt.service';
import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';
import { VehicleReportScoringService } from '../vehicle-report-scoring.service';
import { ComprehensiveVehicleReport } from '@used-car-intelligence/shared';

describe('Technical Identity Verification & Pipeline Behavioral Tests', () => {
  let promptService: VehicleReportPromptService;
  let validationService: VehicleReportSemanticValidationService;
  let scoringService: VehicleReportScoringService;

  beforeEach(() => {
    promptService = new VehicleReportPromptService();
    validationService = new VehicleReportSemanticValidationService();
    scoringService = new VehicleReportScoringService();
  });

  describe('Behavior 1: Turkey Market Priority & Grounding Rules in Prompts', () => {
    it('should include priority for Turkey official distributor sources in user and research prompts', () => {
      const userPrompt = promptService.buildUserPrompt({
        vehicleIdentity: {
          brand: 'Volkswagen',
          model: 'Passat',
          modelYear: 2018,
          bodyType: 'Sedan',
          trimName: 'Highline',
          engineCode: '1.6 TDI',
          fuelType: 'Dizel',
          transmissionName: '7 İleri DSG',
        },
      });

      expect(userPrompt).toContain('Türkiye resmi distribütör verileri');
      expect(userPrompt).toContain('Motor ailesi');
      expect(userPrompt).toContain('spesifik motor kodunu');
      expect(userPrompt).toContain('şanzıman ailesi');
      expect(userPrompt).toContain('spesifik şanzıman kodunu');
      expect(userPrompt).toContain('Teknik kimlik alanlarında birden fazla alternatif kod sıralama');
    });

    it('should guide Stage 1 research agent to investigate 10 technical parameter groups dynamically', () => {
      const researchPrompt = promptService.buildStage1ResearchPrompt({
        vehicleIdentity: {
          brand: 'Volkswagen',
          model: 'Passat',
          modelYear: 2018,
          bodyType: 'Sedan',
          trimName: 'Highline',
          engineCode: '1.6 TDI',
          transmissionName: '7 İleri DSG',
        },
      });

      expect(researchPrompt).toContain('10 TEKNİK PARAMETRE GRUBU');
      expect(researchPrompt).toContain('Pazar ve Nesil Geçerliliği');
      expect(researchPrompt).toContain('Motor Kimliği');
      expect(researchPrompt).toContain('Şanzıman Kimliği');
      expect(researchPrompt).toContain('Triger Sistemi');
      expect(researchPrompt).toContain('3 Seviyeli Bakım Taksonomisi');
    });
  });

  describe('Behavior 2 & 3: Single Verified Identity & Rejection of Alternative Codes ("DQ200 veya DQ250")', () => {
    const createMockReport = (transCode: string): ComprehensiveVehicleReport => ({
      reportId: 'rep-1',
      mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
      status: 'COMPLETED',
      variantId: 'var-1',
      reportVersion: 'v5.1_GENUINE_SCORING_ARCH_GUARD',
      schemaVersion: 2,
      modeLabel: 'Araç Raporu',
      generatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      contextHash: 'hash',
      vehicleContextHash: 'vhash',
      vehicleIdentity: {
        brand: 'Volkswagen',
        model: 'Passat',
        modelYear: 2018,
        bodyType: 'Sedan',
        fuelType: 'Dizel',
        transmissionName: '7 İleri DSG',
        transmissionCode: transCode,
        variantMatchConfidence: 'KESİN',
        supportingFactIds: ['FACT-1'],
      },
      executiveSummary: {
        title: 'Özet',
        oneSentenceSummary: '2018 Passat 1.6 TDI DSG konforlu ve ekonomik bir sedan.',
        strongestAdvantage: 'Geniş kabin ve düşük yakıt tüketimi.',
        biggestRisk: 'Kuru kavrama aşınması.',
        bestFor: ['Aileler'],
        notIdealFor: ['Performans arayanlar'],
        firstCriticalCheck: 'DSG kavrama testi',
        keyWarnings: ['Düzenli bakım geçmişi teyit edilmelidir.'],
      },
      expertDecisionSynthesis: {
        vehicleCharacter: {
          headline: 'Passat Karakteri',
          detailedAssessment: 'Bu araç D segmentinde konfor odaklı bir sürüş sunmaktadır. Motor şanzıman uyumu dengelidir. Trim tıkırtısı ve süspansiyon darbe emişi başarılıdır. Şehir içi ve uzun yol sürüşünde dengelidir.',
          supportingFactIds: ['FACT-1'],
        },
        trimPackageComparison: {
          selectedTrimName: 'Highline',
          lowerOrAlternativeTrimName: 'Comfortline',
          comparisonNarrative: 'Highline pakette LED farlar ve dijital gösterge sunulmaktadır.',
          keyAddedFeatures: ['LED Far', 'Dijital Gösterge'],
          missingFeaturesInLowerTrim: ['LED Far'],
        },
        dailyUseAssessment: {
          cityUse: 'Şehir içinde pratik manevra kabiliyeti.',
          highwayUse: 'Otoyolda yüksek stabilite ve sessizlik.',
          trafficBehavior: 'Dur-kalk trafikte dengeli kalkış.',
          comfortAssessment: 'Süspansiyon darbe emişi yüksek.',
          supportingFactIds: ['FACT-1'],
        },
        strongestReasonsToChoose: [
          { title: 'Geniş Bagaj', explanation: '586 litrelik bagaj hacmi sunar.', supportingFactIds: ['FACT-1'] },
          { title: 'Düşük Tüketim', explanation: 'Ekonomik dizel motor.', supportingFactIds: ['FACT-1'] },
        ],
        compromisesAndLimitations: [
          { title: 'Taviz', explanation: 'Sert süspansiyon.', supportingFactIds: ['FACT-1'] },
        ],
        suitableFor: [{ profile: 'Aile', explanation: 'Geniş alan arayanlar.', supportingFactIds: ['FACT-1'] }],
        notSuitableFor: [{ profile: 'Yarış', explanation: 'Sportif sürüş arayanlar.', supportingFactIds: ['FACT-1'] }],
        purchaseConditions: [{ condition: 'Bakımlı', reason: 'Uzun ömür', priority: 'ÖNEMLİ', supportingFactIds: ['FACT-1'] }],
        walkAwayConditions: [{ condition: 'Ağır Hasar', reason: 'Güvenlik', priority: 'KRİTİK', supportingFactIds: ['FACT-1'] }],
        primaryTechnicalRisk: {
          riskTitle: 'DSG Kavrama Aşınması',
          severity: 'YÜKSEK',
          likelihood: 'ORTA',
          estimatedRepairCostMinTry: 20000,
          estimatedRepairCostMaxTry: 45000,
          symptoms: ['1-2 vites arası titreme'],
          inspectionSteps: ['Canlı veriyle kavrama toleransı ölçülmeli'],
          applicableKmBand: '80.000 - 120.000 km',
          supportingFactIds: ['FACT-1'],
        },
        finalConditionalVerdict: {
          title: 'Nihai Karar',
          shortVerdict: 'Alınabilir.',
          detailedVerdict: 'Ekspertiz kavrama kontrolü temiz çıkarsa gönül rahatlığıyla tercih edilebilir.',
          confidence: 'HIGH',
          supportingFactIds: ['FACT-1'],
        },
      },
    } as any);

    it('should REJECT report when transmissionCode lists alternative options with "veya"', () => {
      const ambiguousReport = createMockReport('DQ200 veya DQ250');
      const validation = validationService.validate(ambiguousReport, {});

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Teknik kimlik alanlarında (transmissionCode / engineCode) birden fazla alternatif kod ("veya" ile)');
      expect(validation.needsRepair).toBe(true);
    });

    it('should ACCEPT report when transmissionCode is definitive and single (e.g. DQ200)', () => {
      const validReport = createMockReport('DQ200');
      const validation = validationService.validate(validReport, {});

      expect(validation.isValid).toBe(true);
    });
  });

  describe('Behavior 4 & 5: Stage 1 to Stage 2 Cross-Stage Consistency & Hallucination Guard', () => {
    it('should REJECT report if Stage 2 output contradicts Stage 1 verified research data', () => {
      const report = {
        reportId: 'rep-2',
        vehicleIdentity: {
          brand: 'Volkswagen',
          model: 'Passat',
          modelYear: 2018,
          transmissionCode: 'ZF 8HP', // Contradicts Stage 1
        },
        executiveSummary: { title: 'Özet' },
      } as any;

      const contextWithStage1 = {
        verifiedResearch: {
          vehicleIdentityResearch: {
            transmissionCode: 'DQ200',
          },
        },
      };

      const validation = validationService.validate(report, contextWithStage1);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Şanzıman kodu Stage 1 araştırma bulgusu ile çelişiyor');
    });

    it('should enforce closed-book integrity instructions in Stage 2 prompt', () => {
      const closedWriterPrompt = promptService.buildStage2ClosedWriterPrompt(
        {
          vehicleIdentity: { brand: 'Peugeot', model: '207', modelYear: 2008 },
        },
        {
          vehicleIdentityResearch: {
            brand: 'Peugeot',
            model: '207',
            year: 2008,
            transmissionFamily: 'BVM / Otomatik',
            transmissionCode: 'UNKNOWN',
          },
        }
      );

      expect(closedWriterPrompt).toContain('SIKI KAPALI ORTAM (CLOSED-BOOK WRITER) TALİMATLARI');
      expect(closedWriterPrompt).toContain('KAPALI ORTAM SADAKATİ (HALLUCINATION GUARD)');
      expect(closedWriterPrompt).toContain('doğrulanmamış (UNKNOWN) bir spesifik teknik kodu');
      expect(closedWriterPrompt).toContain('Stage 2\'de ASLA KENDİLİĞİNDEN İCAT EDEMEZSİN');
    });
  });

  describe('Behavior 6: EV Architecture Guard (Displacement null & No ICE terminology)', () => {
    it('should REJECT report if EV has non-null displacement cc', () => {
      const evReportWithCc = {
        reportId: 'rep-ev-1',
        vehicleIdentity: {
          brand: 'Tesla',
          model: 'Model Y',
          modelYear: 2023,
          fuelType: 'Elektrik',
          engineDisplacementCc: 1598, // Invalid for EV
        },
        executiveSummary: { title: 'Tesla Model Y Özeti' },
      } as any;

      const validation = validationService.validate(evReportWithCc, {
        vehicleIdentity: { fuelType: 'Elektrik' },
      });
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Elektrikli (EV) araçta içten yanmalı motor hacmi');
    });

    it('should REJECT report if EV text mentions ICE-specific components (DPF, buji, egzoz)', () => {
      const evReportWithIceTerms = {
        reportId: 'rep-ev-2',
        vehicleIdentity: {
          brand: 'Tesla',
          model: 'Model Y',
          modelYear: 2023,
          fuelType: 'Elektrik',
        },
        executiveSummary: {
          title: 'Tesla Özeti',
          keyWarnings: ['Egzoz emisyonu ve buji değişimi periyodik olarak kontrol edilmelidir.'],
        },
      } as any;

      const validation = validationService.validate(evReportWithIceTerms, {
        vehicleIdentity: { fuelType: 'Elektrik' },
      });
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('içten yanmalı motor terimleri');
    });
  });

  describe('Behavior 7: Transmission Semantic Guard (No DCT/DSG Mechatronics on Torque Converter/CVT/Manual)', () => {
    it('should REJECT report if Torque Converter/CVT vehicle claims dry DCT mechatronics pressure tube failure', () => {
      const eat8ReportWithDctTerms = {
        reportId: 'rep-eat8-1',
        vehicleIdentity: {
          brand: 'Peugeot',
          model: '3008',
          modelYear: 2021,
          fuelType: 'Dizel',
          transmissionName: 'EAT8 (Tam Otomatik)',
        },
        executiveSummary: {
          title: 'Peugeot 3008 Özeti',
          biggestRisk: 'Mekatronik basınç tüpü gevşemesi ve kuru kavrama balata aşınması riski mevcuttur.',
        },
      } as any;

      const validation = validationService.validate(eat8ReportWithDctTerms, {
        vehicleIdentity: { transmissionName: 'EAT8 Tam Otomatik' },
        verifiedResearch: {
          vehicleIdentityResearch: {
            transmissionFamily: 'Tork Konvertörlü Otomatik (EAT8 / Aisin)',
          },
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Şanzıman mimarisi');
      expect(validation.reason).toContain('DSG kavrama/mekatronik');
    });
  });

  describe('Behavior 8: Rejection of Hallucinated Numerical Maintenance Thresholds', () => {
    it('should REJECT report if it asserts fabricated numerical wear thresholds like "60.000 - 70.000 km sonrasında kabin trim tıkırtılarında artış"', () => {
      const hallucinatedReport = {
        reportId: 'rep-hallucinated-1',
        vehicleIdentity: {
          brand: 'Honda',
          model: 'Civic',
          modelYear: 2020,
          fuelType: 'Benzin',
        },
        executiveSummary: {
          title: 'Civic Özeti',
          oneSentenceSummary: '60.000 - 70.000 km sonrasında kabin trim tıkırtılarında artış gözlemlenebilir.',
        },
      } as any;

      const validation = validationService.validate(hallucinatedReport, {});
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('yapay/ezbere sayısal kilometre eşikleri');
    });
  });

  describe('Behavior 9: Evidence-Grounded Scoring Behavior (No Arbitrary 77/20 Defaults)', () => {
    it('should return null scores and LOW confidence with human-readable Turkish missing inputs when evidence is insufficient', () => {
      const emptyContext = {
        vehicleIdentity: {
          brand: 'Bilinmeyen',
          model: 'Araç',
        },
      };

      const result = scoringService.calculateScores(emptyContext);

      expect(result.technicalRiskScore.value).toBeNull();
      expect(result.technicalRiskScore.confidence).toBe('LOW');
      expect(result.buyabilityScore.value).toBeNull();
      expect(result.dataConfidenceScore.value).toBeLessThan(50);
      expect(result.technicalRiskScore.missingInputs).toBeDefined();
      expect(result.technicalRiskScore.missingInputs?.some(i => i.includes('Doğrulanmış'))).toBe(true);
    });

    it('should produce dynamic, differentiated scores based on verified known database problems', () => {
      const lowRiskVehicleContext = {
        vehicleIdentity: {
          brand: 'Toyota',
          model: 'Corolla',
          modelYear: 2022,
          fuelType: 'Hibrit',
          transmissionName: 'e-CVT',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [],
          recalls: [],
        },
      };

      const highRiskVehicleContext = {
        vehicleIdentity: {
          brand: 'Volkswagen',
          model: 'Golf',
          modelYear: 2012,
          fuelType: 'Benzin',
          transmissionName: '7 İleri DSG',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [
            { id: 'p1', title: 'Mekatronik Basınç Tüpü Patlaması', riskLevel: 'CRITICAL' },
            { id: 'p2', title: 'Kuru Kavrama Aşınması', riskLevel: 'HIGH' },
            { id: 'p3', title: 'Zincir Uzaması', riskLevel: 'HIGH' },
          ],
          recalls: [
            { id: 'r1', title: 'Şanzıman Yazılım ve Akümülatör Geri Çağırma', status: 'OPEN' },
          ],
        },
      };

      const lowRiskScores = scoringService.calculateScores(lowRiskVehicleContext);
      const highRiskScores = scoringService.calculateScores(highRiskVehicleContext);

      expect(lowRiskScores.technicalRiskScore.value).not.toBeNull();
      expect(highRiskScores.technicalRiskScore.value).not.toBeNull();
      expect(highRiskScores.technicalRiskScore.value!).toBeGreaterThan(lowRiskScores.technicalRiskScore.value!);
      expect(lowRiskScores.buyabilityScore.value!).toBeGreaterThan(highRiskScores.buyabilityScore.value!);
    });
  });
});

