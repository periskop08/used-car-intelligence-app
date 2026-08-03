import { VehicleReportFallbackService } from '../vehicle-report-fallback.service';
import { VehicleReportScoringService } from '../vehicle-report-scoring.service';
import { VehicleReportContradictionService } from '../vehicle-report-contradiction.service';
import { VehicleReportSemanticValidationService } from '../vehicle-report-semantic-validation.service';

describe('Honda Civic 2020 1.6 i-VTEC CVT Acceptance Test', () => {
  let fallbackService: VehicleReportFallbackService;
  let scoringService: VehicleReportScoringService;
  let contradictionService: VehicleReportContradictionService;
  let validator: VehicleReportSemanticValidationService;

  beforeEach(() => {
    scoringService = new VehicleReportScoringService();
    contradictionService = new VehicleReportContradictionService();
    fallbackService = new VehicleReportFallbackService(scoringService, contradictionService);
    validator = new VehicleReportSemanticValidationService();
  });

  it('should generate deep synthesis report for Honda Civic 2020 1.6 i-VTEC CVT with oil cooler leakage risk', () => {
    const hondaContext = {
      vehicleIdentity: {
        variantId: 'honda-civic-2020-1.6-cvt',
        brand: 'Honda',
        model: 'Civic',
        modelYear: 2020,
        trimName: 'Executive',
        fuelType: 'Benzin',
        transmissionName: 'CVT',
        enginePowerHp: 126,
        engineTorqueNm: 152,
        combinedFuelL100km: 6.5,
        variantMatchConfidence: 'KESİN',
      },
      verifiedDatabaseVehicleReport: {
        knownDatabaseProblems: [
          {
            id: 'prob-oil-cooler',
            title: 'Yağ Soğutucusu Sızıntısı',
            category: 'Mekanik & Soğutma',
            riskLevel: 'MEDIUM',
            description: 'Yağ soğutucu conta ve hortum çevresinde zamanla sızıntı görülme ihtimali.',
          },
        ],
        recalls: [],
      },
    };

    const report = fallbackService.generateFallbackReport(
      'honda-test-id',
      'VEHICLE_REPORT',
      hondaContext,
    );

    expect(report).toBeDefined();
    expect(report.schemaVersion).toBe(2);
    expect(report.expertDecisionSynthesis).toBeDefined();

    const synth = report.expertDecisionSynthesis!;

    // 1. Vehicle Character & Power Grounding
    expect(synth.vehicleCharacter.headline).toContain('Honda Civic');
    expect(synth.vehicleCharacter.detailedAssessment).toContain('126 bg');
    expect(synth.vehicleCharacter.detailedAssessment).toContain('CVT');
    expect(synth.vehicleCharacter.supportingFactIds).toContain('ENGINE_POWER');
    expect(synth.vehicleCharacter.supportingFactIds).toContain('TRANSMISSION_TYPE');

    // 2. Strongest Reasons & Compromises
    expect(synth.strongestReasonsToChoose.length).toBeGreaterThanOrEqual(1);
    expect(synth.compromisesAndLimitations.length).toBeGreaterThanOrEqual(1);
    expect(synth.compromisesAndLimitations[0].explanation).toContain('sportif');

    // 3. Primary Risk Symptoms & Inspection
    expect(synth.primaryTechnicalRisk).toBeDefined();
    expect(synth.primaryTechnicalRisk?.title).toContain('Yağ Soğutucusu Sızıntısı');
    expect(synth.primaryTechnicalRisk?.symptoms.length).toBeGreaterThan(0);
    expect(synth.primaryTechnicalRisk?.inspectionInstructions.length).toBeGreaterThan(0);

    // 4. Conditional Verdict
    expect(synth.finalConditionalVerdict.shortVerdict).toContain('şartıyla');
    expect(synth.finalConditionalVerdict.confidence).toBe('HIGH');

    // 5. Semantic Validation Quality Score
    const valResult = validator.validate(report, hondaContext);
    expect(valResult.isValid).toBe(true);
    expect(valResult.qualityResult?.score).toBeGreaterThanOrEqual(75);
  });
});
