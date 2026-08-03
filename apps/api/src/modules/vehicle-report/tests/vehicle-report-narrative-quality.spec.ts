import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';
import { ComprehensiveVehicleReport } from '@used-car-intelligence/shared';

describe('VehicleReportSemanticValidationService Narrative Quality', () => {
  let validator: VehicleReportSemanticValidationService;

  beforeEach(() => {
    validator = new VehicleReportSemanticValidationService();
  });

  it('should pass high quality report with score >= 75', () => {
    const report: Partial<ComprehensiveVehicleReport> = {
      reportId: 'test-1',
      mode: 'VEHICLE_REPORT',
      status: 'COMPLETED',
      reportVersion: 'v1.0',
      schemaVersion: 2,
      vehicleIdentity: {
        brand: 'Honda',
        model: 'Civic',
        modelYear: 2020,
        bodyType: 'Sedan',
        fuelType: 'Benzin',
        transmissionName: 'CVT',
        variantMatchConfidence: 'KESİN',
        supportingFactIds: ['FACT_ENGINE_POWER', 'FACT_TRANSMISSION_TYPE'],
      },
      executiveSummary: {
        title: 'Honda Civic Özeti',
        oneSentenceSummary: 'Honda Civic 1.6 i-VTEC CVT sakin kullanım odaklı bir sedandır.',
        keyWarnings: [],
        bestFor: [],
        notIdealFor: [],
      },
      expertDecisionSynthesis: {
        vehicleCharacter: {
          headline: 'Honda Civic 1.6 i-VTEC CVT Değerlendirmesi',
          detailedAssessment:
            'Honda Civic 1.6 i-VTEC CVT Executive, yüksek performanstan çok sakin kullanım, pratiklik ve motor-şanzıman uyumu arayan sürücülere hitap eden bir sedan karakteri sunar. 126 bg güç ve 152 Nm tork değerleri sportif bir hızlanma vadetmez; atmosferik motor ile CVT kombinasyonu günlük kullanımda yumuşak ve öngörülebilir sürüşe odaklanır.',
          supportingFactIds: ['FACT_ENGINE_POWER', 'FACT_TRANSMISSION_TYPE'],
        },
        dailyUseAssessment: {
          cityUse: 'CVT şanzıman sarsıntısız dur-kalk rahatlığı sağlar.',
          highwayUse: 'Sabit hızda makul konfor vadeder.',
          supportingFactIds: ['FACT_TRANSMISSION_TYPE'],
        },
        strongestReasonsToChoose: [
          {
            title: 'Atmosferik Motor & CVT Uyuşması',
            explanation: 'Sakin sürüş tercih edenler için pürüzsüz kalkış imkanı sunar.',
            supportingFactIds: ['FACT_ENGINE_POWER', 'FACT_TRANSMISSION_TYPE'],
          },
        ],
        compromisesAndLimitations: [
          {
            title: 'Sınırlı Sportif Performans',
            explanation: 'Sert ara hızlanmalarda beklentiyi karşılamayabilir.',
            supportingFactIds: ['FACT_ENGINE_POWER'],
          },
        ],
        suitableFor: [
          {
            profile: 'Şehir İçi Günlük Sürücüler',
            explanation: 'CVT rahatlığı şehir içi trafikte konfor sağlar.',
            supportingFactIds: ['FACT_TRANSMISSION_TYPE'],
          },
        ],
        notSuitableFor: [
          {
            profile: 'Sportif Performans Arayanlar',
            explanation: 'Güç ve tork değerleri agresif sürüşe uygun değildir.',
            supportingFactIds: ['FACT_ENGINE_POWER'],
          },
        ],
        primaryTechnicalRisk: {
          title: 'Yağ Soğutucusu Sızıntısı',
          severity: 'MEDIUM',
          explanation: 'Motor altı ve yağ soğutucu çevresi fiziki kontrolden geçirilmelidir.',
          symptoms: ['Karter çevresinde sıvı lekesi', 'Yağ eksiltme'],
          inspectionInstructions: ['Lifte kaldırılıp alt hortum ve kovan incelenmelidir.'],
          riskMeaning: 'Tek başına vazgeçme nedeni değildir.',
          supportingFactIds: ['FACT_PROB_1'],
        },
        purchaseConditions: [
          {
            condition: 'Bakım Kayıtlarının Belgelenmesi',
            reason: 'Düzenli yağ değişim geçmişini teyit etmek.',
            priority: 'CRITICAL',
            supportingFactIds: ['FACT_TRANSMISSION_TYPE'],
          },
        ],
        walkAwayConditions: [
          {
            condition: 'Şanzımanda Belirgin Titreme Veya Vuruntu',
            reason: 'Yüksek masraf riskinden kaçınmak.',
            priority: 'CRITICAL',
            supportingFactIds: ['FACT_TRANSMISSION_TYPE'],
          },
        ],
        finalConditionalVerdict: {
          shortVerdict: 'Belirli kontrollerin sağlanması şartıyla değerlendirilebilir.',
          detailedVerdict: 'Honda Civic bakımları belgelenmiş ve ekspertiz kontrolleri pürüzsüzse satın alma yönünde değerlendirilebilir.',
          confidence: 'HIGH',
          supportingFactIds: ['FACT_ENGINE_POWER'],
        },
        unavailableClaims: [
          {
            key: 'secondHandLiquidity',
            label: 'İkinci El Likiditesi',
            explanation: 'Güncel pazar verisi bulunmamaktadır.',
          },
        ],
      },
    };

    const res = validator.validate(report as ComprehensiveVehicleReport, {});
    expect(res.isValid).toBe(true);
    expect(res.qualityResult?.score).toBeGreaterThanOrEqual(75);
  });

  it('should penalize generic phrases like "yağ değişimini zamanında yaptırın"', () => {
    const genericReport: Partial<ComprehensiveVehicleReport> = {
      reportId: 'test-2',
      mode: 'VEHICLE_REPORT',
      status: 'COMPLETED',
      reportVersion: 'v1.0',
      vehicleIdentity: {
        brand: 'Generic',
        model: 'Car',
        modelYear: 2020,
        bodyType: 'Sedan',
        fuelType: 'Benzin',
        transmissionName: 'Manuel',
        variantMatchConfidence: 'ORTA',
        supportingFactIds: [],
      },
      executiveSummary: {
        title: 'Özet',
        oneSentenceSummary: 'Yağ değişimini zamanında yaptırın. Fren sistemini kontrol ettirin. Günlük kullanım için uygundur.',
        keyWarnings: [],
        bestFor: [],
        notIdealFor: [],
      },
      expertDecisionSynthesis: {
        vehicleCharacter: {
          headline: 'Genel Araç',
          detailedAssessment: 'Yağ değişimini zamanında yaptırın. Geniş iç mekan ve konforlu koltuklar.',
          supportingFactIds: [],
        },
        dailyUseAssessment: { supportingFactIds: [] },
        strongestReasonsToChoose: [],
        compromisesAndLimitations: [],
        suitableFor: [],
        notSuitableFor: [],
        purchaseConditions: [],
        walkAwayConditions: [],
        finalConditionalVerdict: {
          shortVerdict: 'Alınabilir',
          detailedVerdict: 'Genel araçtır.',
          confidence: 'LOW',
          supportingFactIds: [],
        },
        unavailableClaims: [],
      },
    };

    const res = validator.validate(genericReport as ComprehensiveVehicleReport, {});
    expect(res.isValid).toBe(false);
    expect(res.needsRepair).toBe(true);
    expect(res.qualityResult?.score).toBeLessThan(75);
  });
});
