import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';
import { ComprehensiveVehicleReport } from '@used-car-intelligence/shared';

describe('VehicleReportSemanticValidationService 8-Filter Contract Fidelity Guard', () => {
  let validator: VehicleReportSemanticValidationService;

  beforeEach(() => {
    validator = new VehicleReportSemanticValidationService();
  });

  const baseReport: ComprehensiveVehicleReport = {
    reportId: 'rep-test-fidelity',
    mode: 'VEHICLE_REPORT',
    status: 'COMPLETED',
    reportVersion: 'v1.0',
    schemaVersion: 2,
    vehicleIdentity: {
      brand: 'Volkswagen',
      model: 'Golf',
      modelYear: 2017,
      bodyType: 'Hatchback',
      fuelType: 'Dizel',
      transmissionName: '5 İleri Manuel',
      variantMatchConfidence: 'KESİN',
      supportingFactIds: ['AI_VERIFIED_IDENTITY'],
    },
    executiveSummary: {
      title: 'VW Golf 1.6 TDI Değerlendirmesi',
      oneSentenceSummary: 'VW Golf 1.6 TDI Manuel düşük tüketimli kompakt hatchback seçeneğidir.',
      keyWarnings: [],
      bestFor: [],
      notIdealFor: [],
    },
    expertDecisionSynthesis: {
      vehicleCharacter: {
        headline: '2017 VW Golf 1.6 TDI Manuel Analizi',
        detailedAssessment: 'Volkswagen Golf 1.6 TDI Manuel, 5 ileri düz vitesi ve düşük yakıt tüketimiyle kompakt sınıfta referans konforu sunar.',
        supportingFactIds: ['AI_RESEARCH_ENGINE'],
      },
      strongestReasonsToChoose: [
        {
          title: 'Yakıt Ekonomisi',
          explanation: '1.6 TDI motor ve 5 ileri manuel şanzıman uzun yolda çok düşük tüketim sunar.',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        },
      ],
      compromisesAndLimitations: [
        {
          title: '5 İleri Vites Oranı',
          explanation: 'Otoyol sürüşlerinde 6. vites eksikliği devir seviyesini bir miktar yükseltir.',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        },
      ],
      suitableFor: [
        {
          profile: 'Düşük Tüketim Odaklı Sürücüler',
          explanation: 'Manuel vitesin kontrolü ve dizel ekonomisi.',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        },
      ],
      notSuitableFor: [
        {
          profile: 'Yoğun Trafikte Otomatik Konforu İsteyenler',
          explanation: 'Debriyaj pedalı yoğun trafikte yorucu olabilir.',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        },
      ],
      purchaseConditions: [
        {
          condition: 'Triger Kayışı Kontrolü',
          reason: 'EA288 motor triger kayışı periyoduna dikkat edilmeli.',
          priority: 'ÖNEMLİ',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        },
      ],
      walkAwayConditions: [
        {
          condition: 'Enjektör ve DPF Tahribatı',
          reason: 'Ağır duman atma ve mekatronik bulunmayan manuel şanzımanda baskı balata bitikliği.',
          priority: 'KRİTİK',
          supportingFactIds: ['AI_RESEARCH_ENGINE'],
        },
      ],
      primaryTechnicalRisk: {
        riskTitle: 'DPF Tıkanıklığı',
        riskSeverity: 'ORTA',
        symptoms: ['Rejenerasyon sıklığı', 'Arıza lambası'],
        inspectionInstructions: ['Diagnostik cihazı ile DPF kurum doluluk oranını okutun.'],
        supportingFactIds: ['AI_RESEARCH_ENGINE'],
      },
    },
    technicalSpecifications: {
      engineDisplacementCc: 1598,
      enginePowerHp: 115,
      zeroToHundredKmh: 10.2,
      topSpeedKmh: 198,
      trunkCapacityLiters: 380,
      curbWeightKg: 1300,
    } as any,
  } as any;

  const validContext = {
    vehicleIdentity: {
      brand: 'Volkswagen',
      model: 'Golf',
      modelYear: 2017,
      bodyType: 'Hatchback',
      fuelType: 'Dizel',
      transmissionName: '5 İleri Manuel',
      clutchType: 'MANUEL',
      selected8Filters: {
        brand: 'Volkswagen',
        modelFamily: 'Golf',
        year: 2017,
        bodyType: 'Hatchback',
        engineVersion: '1.6 TDI BlueMotion',
        fuelType: 'Dizel',
        transmission: 'Manuel',
        trimLevel: 'Comfortline',
      },
    },
  };

  it('passes semantic validation when report matches all 8 filters', () => {
    const result = validator.validate(baseReport, validContext);
    expect(result.isValid).toBe(true);
  });

  it('rejects report when brand or model contradicts selected filter', () => {
    const badReport = {
      ...baseReport,
      vehicleIdentity: {
        ...baseReport.vehicleIdentity,
        brand: 'Renault',
        model: 'Megane',
      },
    };
    const result = validator.validate(badReport, validContext);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('seçilen filtre ile');
  });

  it('rejects report when fuel type contradicts selected filter (e.g. Dizel vs Benzin)', () => {
    const badReport = {
      ...baseReport,
      vehicleIdentity: {
        ...baseReport.vehicleIdentity,
        fuelType: 'Benzin',
      },
    };
    const result = validator.validate(badReport, validContext);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('seçilen filtre');
  });

  it('rejects report when transmission contradicts selected filter (e.g. Manuel selected but report has DSG/Otomatik)', () => {
    const badReport = {
      ...baseReport,
      vehicleIdentity: {
        ...baseReport.vehicleIdentity,
        transmissionName: '7 İleri DSG (Çift Kavrama)',
      },
    };
    const result = validator.validate(badReport, validContext);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Şanzıman filtresi ("Manuel") ile üretilen şanzıman ("7 İleri DSG (Çift Kavrama)") çelişiyor');
  });

  it('rejects report when transmission contradicts selected filter (e.g. Otomatik selected but report has Manuel)', () => {
    const autoContext = {
      vehicleIdentity: {
        ...validContext.vehicleIdentity,
        transmissionName: '7 İleri DSG (DQ200)',
        clutchType: 'KURU_CIFT_KAVRAMA',
        selected8Filters: {
          ...validContext.vehicleIdentity.selected8Filters,
          transmission: 'Yarı Otomatik',
        },
      },
    };
    const badReport = {
      ...baseReport,
      vehicleIdentity: {
        ...baseReport.vehicleIdentity,
        transmissionName: '6 İleri Manuel',
      },
    };
    const result = validator.validate(badReport, autoContext);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Şanzıman filtresi ("Yarı Otomatik") ile üretilen şanzıman ("6 İleri Manuel") çelişiyor');
  });
});
