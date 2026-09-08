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
      expect(validation.reason).toContain('yapay/ezbere sayısal eşik iddiası');
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

  describe('Behavior 10: Evidence-Bound SoH & Component-Matched Numeric Guard', () => {
    const ungroundedSohVariations = [
      '%85 ve üzeri SoH',
      '%85\'in üzeri SoH',
      '85% ve üzeri SoH',
      'SoH %85',
      'SoH 85%',
      '%85\'in altı batarya sağlığı',
      '%85 ve altı pil sağlığı',
      'Batarya Sağlığı (SoH) Kontrolü ... %85 ve üzeri SoH idealdir.',
      'pil sağlığı seviyesi %85',
      'soh 85',
    ];

    ungroundedSohVariations.forEach((phrase) => {
      it(`should REJECT report for ungrounded variation: "${phrase}"`, () => {
        const teslaReport = {
          reportId: 'rep-tesla-soh-var',
          vehicleIdentity: {
            brand: 'Tesla',
            model: 'Model 3',
            modelYear: 2022,
            fuelType: 'Elektrik',
          },
          executiveSummary: {
            title: 'Tesla Model 3 Özeti',
            keyWarnings: [`Bu araçta ${phrase} göz önünde bulundurulmalıdır.`],
          },
        } as any;

        const validation = validationService.validate(teslaReport, {
          verifiedResearch: {
            claims: [],
          },
        });

        expect(validation.isValid).toBe(false);
        expect(validation.reason).toContain('batarya sağlık yüzdesi (%85 SoH / Pil Sağlığı) iddiası tespit edildi');
      });
    });

    it('should ACCEPT report if %85 SoH was specifically verified in Stage 1 research data', () => {
      const base = createMockReport('OTOMATIK');
      const teslaReportWithVerifiedSoh: ComprehensiveVehicleReport = {
        ...base,
        reportId: 'rep-tesla-soh-ok',
        vehicleIdentity: {
          ...base.vehicleIdentity,
          brand: 'Tesla',
          model: 'Model 3',
          modelYear: 2022,
          fuelType: 'Elektrik',
        },
        executiveSummary: {
          ...base.executiveSummary,
          title: 'Tesla Model 3 Özeti',
          keyWarnings: ['Batarya sağlığı %85 altına düştüğünde menzilde belirgin düşüş gözlemlenebilir.'],
        },
      };

      const validation = validationService.validate(teslaReportWithVerifiedSoh, {
        verifiedResearch: {
          reliabilityResearch: [
            { title: 'HV Batarya Değerlendirmesi', description: 'Kullanım sonrası %85 batarya kapasitesi ölçülmüştür.' },
          ],
        },
      });

      expect(validation.isValid).toBe(true);
    });
  });

  describe('Behavior 11: Risk-Action Semantic Consistency Guard', () => {
    it('should REJECT report if an electrical/wiper/screen risk is paired with underbody lift or oil leak inspection steps', () => {
      const wiperRiskMismatchedReport = {
        reportId: 'rep-wiper-mismatch',
        vehicleIdentity: { brand: 'Renault', model: 'Clio', modelYear: 2019 },
        executiveSummary: { title: 'Özet' },
        expertDecisionSynthesis: {
          primaryTechnicalRisk: {
            title: 'Ön Silecek Motoru Röle Arızası',
            inspectionInstructions: ['Aracı lifte kaldırıp alt karter muhafazası ve motor yağı kaçaklarını inceleyin.'],
          },
        },
      } as any;

      const validation = validationService.validate(wiperRiskMismatchedReport, {});
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('semantik uyumsuzluk tespit edildi');
      expect(validation.reason).toContain('alt muhafaza/lift mekanik kontrolleri bağlanamaz');
    });

    it('should ACCEPT report when wiper risk is paired with relevant electrical/switch inspection steps', () => {
      const base = createMockReport('MANUEL');
      const wiperRiskMatchedReport: ComprehensiveVehicleReport = {
        ...base,
        reportId: 'rep-wiper-matched',
        vehicleIdentity: {
          ...base.vehicleIdentity,
          brand: 'Renault',
          model: 'Clio',
          modelYear: 2019,
        },
        expertDecisionSynthesis: {
          ...base.expertDecisionSynthesis!,
          primaryTechnicalRisk: {
            title: 'Ön Silecek Motoru Röle Arızası',
            severity: 'ORTA',
            likelihood: 'DÜŞÜK',
            symptoms: ['Sileceklerin yavaşlaması'],
            inspectionInstructions: ['Silecek kolunun kademeli hız geçişleri ve röle sesleri test edilmelidir.'],
            riskMeaning: 'Mekanik yürüyen aksam riski oluşturmaz.',
            supportingFactIds: ['FACT-1'],
          } as any,
        },
      };

      const validation = validationService.validate(wiperRiskMatchedReport, {});
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Behavior 12: Evidence Type Preservation Guard', () => {
    it('should REJECT report if subjective complaint is elevated to "kesin fabrika üretim hatasıdır" without verified TSB/recall', () => {
      const ungroundedElevationReport = {
        reportId: 'rep-elevated',
        vehicleIdentity: { brand: 'Ford', model: 'Focus', modelYear: 2017 },
        executiveSummary: {
          title: 'Özet',
          oneSentenceSummary: 'Bu durum üretici tarafından kabul edilmiş kronik arızadır.',
        },
      } as any;

      const validation = validationService.validate(ungroundedElevationReport, {
        verifiedResearch: { recallResearch: [] },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Stage 1 TSB/bülten kanıtı olmadan');
      expect(validation.reason).toContain('yükseltilemez');
    });
  });

  describe('Behavior 13: Timing Architecture Guard (BELT vs CHAIN)', () => {
    it('should REJECT report if timingSystem is KAYIS (Belt) but narrative mentions triger zinciri uzaması', () => {
      const beltCarWithChainTerms = {
        reportId: 'rep-belt-chain',
        vehicleIdentity: { brand: 'Volkswagen', model: 'Passat', modelYear: 2018, timingSystem: 'KAYIS' },
        executiveSummary: {
          title: 'Özet',
          keyWarnings: ['İlk soğuk çalıştırmada triger zinciri uzaması ve şakırtı kontrol edilmelidir.'],
        },
      } as any;

      const validation = validationService.validate(beltCarWithChainTerms, {
        vehicleIdentity: { timingSystem: 'KAYIS' },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Araç triger sistemi KAYIŞ (BELT) olarak doğrulanmışken raporda triger zinciri');
    });

    it('should REJECT report if timingSystem is ZINCIR (Chain) but narrative mentions triger kayışı kopması', () => {
      const chainCarWithBeltTerms = {
        reportId: 'rep-chain-belt',
        vehicleIdentity: { brand: 'BMW', model: '320i', modelYear: 2020, timingSystem: 'ZINCIR' },
        executiveSummary: {
          title: 'Özet',
          keyWarnings: ['Periyodik bakımda triger kayışı kopması riskine karşı kayış değişimi teyit edilmelidir.'],
        },
      } as any;

      const validation = validationService.validate(chainCarWithBeltTerms, {
        vehicleIdentity: { timingSystem: 'ZINCIR' },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('Araç triger sistemi ZİNCİR (CHAIN) olarak doğrulanmışken raporda triger kayışı');
    });
  });

  describe('Behavior 14: End-to-End VehicleReportProviderService Production Pipeline (Live Validation, Repair & Revalidate)', () => {
    let providerService: any;
    let mockOrchestrator: any;
    let fallbackService: any;
    let contradictionService: any;
    let evidenceValidationService: any;

    beforeEach(() => {
      mockOrchestrator = {
        generateListingAdvice: jest.fn(),
      };
      contradictionService = {
        analyzeListingContradictions: jest.fn().mockReturnValue([]),
        analyzeMileageAge: jest.fn().mockReturnValue({}),
      };
      fallbackService = new (require('../vehicle-report-fallback.service').VehicleReportFallbackService)(
        scoringService,
        contradictionService
      );
      evidenceValidationService = new (require('../research-evidence-validation.service').ResearchEvidenceValidationService)();
      
      const { VehicleReportProviderService } = require('../vehicle-report-provider.service');
      providerService = new VehicleReportProviderService(
        promptService,
        fallbackService,
        evidenceValidationService,
        validationService,
        scoringService,
        mockOrchestrator
      );
    });

    it('should trigger AI repair and re-validate when initial AI output has semantic contradiction', async () => {
      const vehicleContext = {
        vehicleIdentity: {
          variantId: 'v1',
          brand: 'Tesla',
          model: 'Model Y',
          modelYear: 2023,
          bodyType: 'SUV',
          fuelType: 'Elektrik',
          transmissionName: 'Tek Kademeli Redüktör',
          timingSystem: 'NONE',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [
            { id: 'p1', title: 'Ön Silecek Motoru Arızası', problemType: 'REPORTED_COMPLAINT' }
          ]
        }
      };

      // 1. Initial AI response contains semantic mismatch (wiper with lift inspection step)
      const invalidAiResponse = JSON.stringify({
        executiveSummary: {
          title: 'Tesla Model Y Özeti',
          oneSentenceSummary: 'Elektrikli SUV.',
          strongestAdvantage: 'Geniş iç hacim.',
          biggestRisk: 'Silecek arızası.',
          bestFor: ['Aileler'],
          notIdealFor: ['Offroad'],
          keyWarnings: ['Silecek kontrol edilmeli.'],
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: 'Tesla Model Y',
            detailedAssessment: 'Yüksek menzilli ve geniş hacimli elektrikli SUV aracıdır. Sessiz sürüş ve yüksek verimlilik sunmaktadır. Süspansiyon yapısı ve trim izolasyonu dengelidir.',
            supportingFactIds: ['FACT-1'],
          },
          strongestReasonsToChoose: [{ title: 'Düşük Tüketim', explanation: 'Elektrikli verimlilik.', supportingFactIds: ['FACT-1'] }],
          compromisesAndLimitations: [{ title: 'Sert Sürüş', explanation: 'Büyük jantlar.', supportingFactIds: ['FACT-1'] }],
          suitableFor: [{ profile: 'Aile', explanation: 'Şehir içi ve uzun yol.', supportingFactIds: ['FACT-1'] }],
          notSuitableFor: [{ profile: 'Offroad', explanation: 'Alçak zemin.', supportingFactIds: ['FACT-1'] }],
          purchaseConditions: [{ condition: 'Pil Sağlığı', reason: 'Uzun ömür', priority: 'ÖNEMLİ', supportingFactIds: ['FACT-1'] }],
          walkAwayConditions: [{ condition: 'Ağır Hasar', reason: 'Güvenlik', priority: 'KRİTİK', supportingFactIds: ['FACT-1'] }],
          primaryTechnicalRisk: {
            title: 'Silecek Motoru Arızası',
            severity: 'DÜŞÜK',
            likelihood: 'DÜŞÜK',
            symptoms: ['Sileceklerin yavaşlaması'],
            inspectionInstructions: ['Aracı lifte kaldırıp alt muhafaza ve karter sızıntısını inceleyin.'], // CONTRADICTION!
            riskMeaning: 'Mekanik yürüyen aksam riski oluşturmaz.',
            supportingFactIds: ['FACT-1'],
          },
          finalConditionalVerdict: {
            shortVerdict: 'Alınabilir.',
            detailedVerdict: 'Genel durumu temiz ise satın alma değerlendirilebilir.',
            confidence: 'HIGH',
            supportingFactIds: ['FACT-1'],
          },
        },
      });

      // 2. Repaired AI response fixes the inspection step
      const repairedAiResponse = JSON.stringify({
        executiveSummary: {
          title: 'Tesla Model Y Özeti',
          oneSentenceSummary: 'Elektrikli SUV.',
          strongestAdvantage: 'Geniş iç hacim.',
          biggestRisk: 'Silecek arızası.',
          bestFor: ['Aileler'],
          notIdealFor: ['Offroad'],
          keyWarnings: ['Silecek kontrol edilmeli.'],
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: 'Tesla Model Y',
            detailedAssessment: 'Yüksek menzilli ve geniş hacimli elektrikli SUV aracıdır. Sessiz sürüş ve yüksek verimlilik sunmaktadır. Süspansiyon yapısı ve trim izolasyonu dengelidir.',
            supportingFactIds: ['FACT-1'],
          },
          strongestReasonsToChoose: [{ title: 'Düşük Tüketim', explanation: 'Elektrikli verimlilik.', supportingFactIds: ['FACT-1'] }],
          compromisesAndLimitations: [{ title: 'Sert Sürüş', explanation: 'Büyük jantlar.', supportingFactIds: ['FACT-1'] }],
          suitableFor: [{ profile: 'Aile', explanation: 'Şehir içi ve uzun yol.', supportingFactIds: ['FACT-1'] }],
          notSuitableFor: [{ profile: 'Offroad', explanation: 'Alçak zemin.', supportingFactIds: ['FACT-1'] }],
          purchaseConditions: [{ condition: 'Pil Sağlığı', reason: 'Uzun ömür', priority: 'ÖNEMLİ', supportingFactIds: ['FACT-1'] }],
          walkAwayConditions: [{ condition: 'Ağır Hasar', reason: 'Güvenlik', priority: 'KRİTİK', supportingFactIds: ['FACT-1'] }],
          primaryTechnicalRisk: {
            title: 'Silecek Motoru Arızası',
            severity: 'DÜŞÜK',
            likelihood: 'DÜŞÜK',
            symptoms: ['Sileceklerin yavaşlaması'],
            inspectionInstructions: ['Silecek kolu kademelerini ve su püskürtme memesini test ettirin.'], // REPAIRED!
            riskMeaning: 'Mekanik yürüyen aksam riski oluşturmaz.',
            supportingFactIds: ['FACT-1'],
          },
          finalConditionalVerdict: {
            shortVerdict: 'Alınabilir.',
            detailedVerdict: 'Genel durumu temiz ise satın alma değerlendirilebilir.',
            confidence: 'HIGH',
            supportingFactIds: ['FACT-1'],
          },
        },
      });

      mockOrchestrator.generateListingAdvice
        .mockResolvedValueOnce({ answer: invalidAiResponse, providerName: 'gemini-flash' })
        .mockResolvedValueOnce({ answer: repairedAiResponse, providerName: 'gemini-flash' });

      const result = await providerService.generateReport('rep-tesla-live', vehicleContext);

      expect(mockOrchestrator.generateListingAdvice).toHaveBeenCalledTimes(2);
      expect(result.repairAttempted).toBe(true);
      expect(result.report.expertDecisionSynthesis.primaryTechnicalRisk.inspectionInstructions[0]).toContain('Silecek kolu');
      expect(result.report.expertDecisionSynthesis.primaryTechnicalRisk.inspectionInstructions[0]).not.toContain('lifte kaldır');
      // Verify scoring was executed on final data and REPORTED_COMPLAINT gave modest risk
      expect(result.report.scoring.technicalRiskScore.value).toBeLessThan(15);
    });

    it('should sanitize incompatible risk steps when repair fails so invalid underbody checks never reach the client', async () => {
      const vehicleContext = {
        vehicleIdentity: {
          variantId: 'v1',
          brand: 'Tesla',
          model: 'Model Y',
          modelYear: 2023,
          bodyType: 'SUV',
          fuelType: 'Elektrik',
          transmissionName: 'Tek Kademeli Redüktör',
          timingSystem: 'NONE',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [
            { id: 'p1', title: 'Silecek Motoru Arızası', problemType: 'REPORTED_COMPLAINT' }
          ]
        }
      };

      const invalidAiResponse = JSON.stringify({
        executiveSummary: {
          title: 'Tesla Model Y Özeti',
          oneSentenceSummary: 'Elektrikli SUV.',
          strongestAdvantage: 'Geniş iç hacim.',
          biggestRisk: 'Silecek arızası.',
          bestFor: ['Aileler'],
          notIdealFor: ['Offroad'],
          keyWarnings: ['Silecek kontrol edilmeli.'],
        },
        expertDecisionSynthesis: {
          vehicleCharacter: {
            headline: 'Tesla Model Y',
            detailedAssessment: 'Yüksek menzilli ve geniş hacimli elektrikli SUV aracıdır. Sessiz sürüş ve yüksek verimlilik sunmaktadır. Süspansiyon yapısı ve trim izolasyonu dengelidir.',
            supportingFactIds: ['FACT-1'],
          },
          strongestReasonsToChoose: [{ title: 'Düşük Tüketim', explanation: 'Elektrikli verimlilik.', supportingFactIds: ['FACT-1'] }],
          compromisesAndLimitations: [{ title: 'Sert Sürüş', explanation: 'Büyük jantlar.', supportingFactIds: ['FACT-1'] }],
          suitableFor: [{ profile: 'Aile', explanation: 'Şehir içi ve uzun yol.', supportingFactIds: ['FACT-1'] }],
          notSuitableFor: [{ profile: 'Offroad', explanation: 'Alçak zemin.', supportingFactIds: ['FACT-1'] }],
          purchaseConditions: [{ condition: 'Pil Sağlığı', reason: 'Uzun ömür', priority: 'ÖNEMLİ', supportingFactIds: ['FACT-1'] }],
          walkAwayConditions: [{ condition: 'Ağır Hasar', reason: 'Güvenlik', priority: 'KRİTİK', supportingFactIds: ['FACT-1'] }],
          primaryTechnicalRisk: {
            title: 'Silecek Motoru Arızası',
            severity: 'DÜŞÜK',
            likelihood: 'DÜŞÜK',
            symptoms: ['Sileceklerin yavaşlaması'],
            inspectionInstructions: ['Aracı lifte kaldırıp alt karter muhafazası yağ kaçaklarını inceleyin.'], // INCOMPATIBLE
            riskMeaning: 'Mekanik yürüyen aksam riski oluşturmaz.',
            supportingFactIds: ['FACT-1'],
          },
          finalConditionalVerdict: {
            shortVerdict: 'Alınabilir.',
            detailedVerdict: 'Genel durumu temiz ise satın alma değerlendirilebilir.',
            confidence: 'HIGH',
            supportingFactIds: ['FACT-1'],
          },
        },
      });

      // AI repair returns identical invalid response (repair failed)
      mockOrchestrator.generateListingAdvice
        .mockResolvedValueOnce({ answer: invalidAiResponse, providerName: 'gemini-flash' })
        .mockResolvedValueOnce({ answer: invalidAiResponse, providerName: 'gemini-flash' });

      const result = await providerService.generateReport('rep-tesla-live-sanitized', vehicleContext);

      expect(mockOrchestrator.generateListingAdvice).toHaveBeenCalledTimes(2);
      expect(result.repairAttempted).toBe(true);
      // Sanitizer should have removed the lift/underbody inspection step
      const steps = result.report.expertDecisionSynthesis.primaryTechnicalRisk.inspectionInstructions;
      expect(steps.some((s: string) => s.includes('lifte kaldır') || s.includes('alt karter'))).toBe(false);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('Behavior 15: Evidence Type & Source Mapping Verification (REPORTED_COMPLAINT vs VERIFIED_FAILURE)', () => {
    let fallbackService: any;
    let contradictionService: any;

    beforeEach(() => {
      contradictionService = {
        analyzeListingContradictions: jest.fn().mockReturnValue([]),
        analyzeMileageAge: jest.fn().mockReturnValue({}),
      };
      fallbackService = new (require('../vehicle-report-fallback.service').VehicleReportFallbackService)(
        scoringService,
        contradictionService
      );
    });

    it('should map REPORTED_COMPLAINT to evidence-bound title and "Kullanıcı Geri Bildirimi / Bildirilen Şikâyet" source', () => {
      const vehicleContext = {
        vehicleIdentity: {
          variantId: 'v-tesla',
          brand: 'Tesla',
          model: 'Model 3',
          modelYear: 2022,
          bodyType: 'Sedan',
          fuelType: 'Elektrik',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [
            {
              id: 'p-wiper',
              title: 'Silecek Motoru Arızası',
              description: 'Otomatik modda sileceklerin yavaşlaması bildirilmiştir.',
              problemType: 'REPORTED_COMPLAINT',
              riskLevel: 'MEDIUM',
            }
          ]
        }
      };

      const report = fallbackService.generateFallbackReport('rep-tesla-test', 'TORQUE_SCOUT_VEHICLE_REPORT', vehicleContext);

      // 1. Check primaryTechnicalRisk title is evidence-bound (not absolute failure)
      expect(report.expertDecisionSynthesis.primaryTechnicalRisk.title).toBe('Otomatik Silecek Performansı Şikâyetleri');
      expect(report.expertDecisionSynthesis.primaryTechnicalRisk.title).not.toBe('Silecek Motoru Arızası');
      expect(report.expertDecisionSynthesis.primaryTechnicalRisk.riskMeaning).toContain('Kullanıcı geri bildirimi niteliğindedir');

      // 2. Check supportingFact registered for this problem is NOT marked as VEHICLE_DATABASE HIGH confidence
      const wiperFact = report.dataQuality.supportingFacts.find(f => f.factKey === 'FACT_PROB_p-wiper');
      expect(wiperFact).toBeDefined();
      expect(wiperFact?.label).toBe('Kullanıcı Geri Bildirimi / Bildirilen Şikâyet');
      expect(wiperFact?.source).toBe('SYSTEM_DERIVED');
      expect(wiperFact?.confidence).toBe('MEDIUM');
    });

    it('should ONLY mark VERIFIED_FAILURE as "Doğrulanmış Teknik Veri" with HIGH confidence and VEHICLE_DATABASE source', () => {
      const vehicleContext = {
        vehicleIdentity: {
          variantId: 'v-passat',
          brand: 'Volkswagen',
          model: 'Passat',
          modelYear: 2018,
          bodyType: 'Sedan',
          fuelType: 'Dizel',
          transmissionName: '7 İleri DSG',
        },
        verifiedDatabaseVehicleReport: {
          knownDatabaseProblems: [
            {
              id: 'p-dq200',
              title: 'DSG (DQ200) Mekatronik Basınç Tüpü Arızası',
              description: 'Basınç tüpü dişli yuvasında çatlama.',
              problemType: 'VERIFIED_FAILURE',
              riskLevel: 'CRITICAL',
            }
          ]
        }
      };

      const report = fallbackService.generateFallbackReport('rep-passat-test', 'TORQUE_SCOUT_VEHICLE_REPORT', vehicleContext);

      expect(report.expertDecisionSynthesis.primaryTechnicalRisk.title).toBe('DSG (DQ200) Mekatronik Basınç Tüpü Arızası');
      expect(report.expertDecisionSynthesis.primaryTechnicalRisk.riskMeaning).toContain('Doğrulanmış bu kayıt');

      const dsgFact = report.dataQuality.supportingFacts.find(f => f.factKey === 'FACT_PROB_p-dq200');
      expect(dsgFact).toBeDefined();
      expect(dsgFact?.label).toBe('Doğrulanmış Teknik Veri');
      expect(dsgFact?.source).toBe('VEHICLE_DATABASE');
      expect(dsgFact?.confidence).toBe('HIGH');
    });
  });
});




