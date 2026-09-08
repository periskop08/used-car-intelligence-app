import { VehicleReportPromptService } from '../vehicle-report-prompt.service';
import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';
import { ComprehensiveVehicleReport } from '@used-car-intelligence/shared';

describe('Technical Identity Verification & Pipeline Behavioral Tests', () => {
  let promptService: VehicleReportPromptService;
  let validationService: VehicleReportSemanticValidationService;

  beforeEach(() => {
    promptService = new VehicleReportPromptService();
    validationService = new VehicleReportSemanticValidationService();
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

      expect(userPrompt).toContain('Öncelik Türkiye resmi üretici/distribütör kaynaklarıdır');
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

      expect(researchPrompt).toContain('10 KİLİT TEKNİK PARAMETRE GRUBU');
      expect(researchPrompt).toContain('Pazar Geçerliliği');
      expect(researchPrompt).toContain('Motor Kimliği');
      expect(researchPrompt).toContain('Şanzıman Kimliği');
      expect(researchPrompt).toContain('Triger Sistemi');
      expect(researchPrompt).toContain('Dinamik Bakım & Arıza Noktaları');
    });
  });

  describe('Behavior 2 & 3: Single Verified Identity & Rejection of Alternative Codes ("DQ200 veya DQ250")', () => {
    const createMockReport = (transCode: string): ComprehensiveVehicleReport => ({
      reportId: 'rep-1',
      mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
      status: 'COMPLETED',
      variantId: 'var-1',
      reportVersion: 'v5.0_DYNAMIC_IDENTITY_GROUNDED',
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
});
