import assert from 'assert';
import { validateComparisonSemantics } from './validateComparisonSemantics';
import { sanitizeComparisonText } from './sanitizeComparisonText';
import { ComparisonVehicleProfile, VehicleComparisonResult } from '../index';

export function runSemanticValidationTests() {
  console.log('Running TorqueScout v5.3 Semantic Validation & Sanitizer Regression Tests...');

  // Test 1: Sanitizer preserves numeric ranges and hyphens while stripping raw Markdown
  const rawInput = "### Test Başlık\n**Audi A3** modeli 0-100 km/s hızlanmasını 8.5 sn'de tamamlıyor. 2018-2022 yılları arası üretildi.";
  const cleaned = sanitizeComparisonText(rawInput);

  assert.ok(cleaned.includes('Audi A3'), 'Cleaned text should contain vehicle name');
  assert.ok(cleaned.includes('0-100 km/s'), 'Cleaned text MUST preserve numeric range 0-100 km/s');
  assert.ok(cleaned.includes('2018-2022'), 'Cleaned text MUST preserve year range 2018-2022');
  assert.ok(!cleaned.includes('***'), 'Cleaned text must strip bold asterisks');
  assert.ok(!cleaned.includes('###'), 'Cleaned text must strip header hashes');
  console.log('✓ Test 1 Passed: Sanitizer preserves numeric ranges and removes raw Markdown.');

  // Test 2: Audi A3 vs Renault Fluence Regression (Fluence 4.4 L/100km vs Audi 6.3 L/100km)
  const mockProfiles: ComparisonVehicleProfile[] = [
    {
      vehicleId: 'fluence_id',
      displayName: 'Renault Fluence 2016',
      identity: { brand: 'Renault', model: 'Fluence', year: 2016 },
      performance: {},
      efficiency: { combinedConsumption: 4.4 },
      practicality: { bootLitres: 530 },
      comfortAndHandling: {},
      ownership: {},
      reliability: { problems: [] },
      sellerQuestions: [],
      inspectionChecklist: [],
    },
    {
      vehicleId: 'audi_id',
      displayName: 'Audi A3 2017',
      identity: { brand: 'Audi', model: 'A3', year: 2017 },
      performance: {},
      efficiency: { combinedConsumption: 6.3 },
      practicality: { bootLitres: 380 },
      comfortAndHandling: {},
      ownership: {},
      reliability: { problems: [] },
      sellerQuestions: [],
      inspectionChecklist: [],
    },
  ];

  const invalidAiResult: Partial<VehicleComparisonResult> = {
    headline: 'Detaylı Karşılaştırma Analizi',
    executiveSummary: 'Bu iki araç yakıt ve konfor açısından detaylıca incelenmiştir. Renault Fluence ve Audi A3 kıyaslanmıştır.',
    scenarioRecommendations: [
      {
        scenarioKey: 'FUEL_ECONOMY',
        title: 'Yakıt Ekonomisi',
        recommendedVehicleIds: ['audi_id'], // CONTRADICTION: Audi has 6.3 L/100km vs Fluence 4.4 L/100km!
        recommendedVehicleNames: ['Audi A3 2017'],
        reasoning: 'Yakıt tarafında öne çıkar',
      },
    ],
    vehicleVerdicts: [
      {
        vehicleId: 'fluence_id',
        vehicleName: 'Renault Fluence 2016',
        characterSummary: 'Ekonomik Sedan',
        bestFor: ['Yakıt'],
        notIdealFor: ['Performans'],
        gains: ['Düşük tüketim'],
        compromises: ['Daha eski yaş'],
        criticalRisks: [],
        prePurchaseChecks: [],
      },
      {
        vehicleId: 'audi_id',
        vehicleName: 'Audi A3 2017',
        characterSummary: 'Kompakt Premium',
        bestFor: ['Şehir içi'],
        notIdealFor: ['Geniş aile'],
        gains: ['Prestij'],
        compromises: ['Yüksek yakıt'],
        criticalRisks: [],
        prePurchaseChecks: [],
      },
    ],
    riskComparison: { narrative: 'Kronik arıza detaylı incelemesi' },
    narrativeRecommendation: 'Açık konuşmak gerekirse Fluence daha ekonomik fakat Audi daha prestijlidir.',
  };

  const validation = validateComparisonSemantics(invalidAiResult, mockProfiles);
  assert.strictEqual(validation.isValid, false, 'Validation MUST fail for fuel economy contradiction');
  assert.strictEqual(validation.qualityCheck.noTechnicalContradiction, false, 'noTechnicalContradiction MUST be false');
  assert.ok(validation.errors.some(e => e.includes('Yakıt ekonomisi kazananı')), 'Error message MUST describe fuel economy contradiction');
  console.log('✓ Test 2 Passed: Audi-Fluence fuel economy contradiction rejected cleanly.');

  // Test 3: Rejection of zero-risk count based winner claims
  const zeroRiskClaimResult: Partial<VehicleComparisonResult> = {
    headline: 'Detaylı Karşılaştırma Analizi',
    executiveSummary: 'Bu iki araç incelenmiştir ve Fluence 0 adet kronik arıza ile en güvenilir araç seçilmiştir.',
    scenarioRecommendations: [
      {
        scenarioKey: 'RELIABILITY',
        title: 'Sorunsuzluk',
        recommendedVehicleIds: ['fluence_id'],
        recommendedVehicleNames: ['Renault Fluence 2016'],
        reasoning: '0 arıza kaydı olduğu için en güvenilir araç',
      },
    ],
    vehicleVerdicts: [
      {
        vehicleId: 'fluence_id',
        vehicleName: 'Renault Fluence 2016',
        characterSummary: 'Ekonomik Sedan',
        bestFor: ['Yakıt'],
        notIdealFor: ['Performans'],
        gains: ['Düşük tüketim'],
        compromises: ['Daha eski yaş'],
        criticalRisks: [],
        prePurchaseChecks: [],
      },
      {
        vehicleId: 'audi_id',
        vehicleName: 'Audi A3 2017',
        characterSummary: 'Kompakt Premium',
        bestFor: ['Şehir içi'],
        notIdealFor: ['Geniş aile'],
        gains: ['Prestij'],
        compromises: ['Yüksek yakıt'],
        criticalRisks: [],
        prePurchaseChecks: [],
      },
    ],
    riskComparison: { narrative: 'Renault Fluence 0 adet kronik arıza olduğu için en güvenilir seçenektir.' },
    narrativeRecommendation: 'Fluence araç tercih edilmelidir.',
  };

  const zeroRiskValidation = validateComparisonSemantics(zeroRiskClaimResult, mockProfiles);
  assert.strictEqual(zeroRiskValidation.isValid, false, 'Validation MUST fail for zero-risk count based conclusion');
  assert.strictEqual(zeroRiskValidation.qualityCheck.noRiskCountBasedConclusion, false, 'noRiskCountBasedConclusion MUST be false');
  assert.ok(zeroRiskValidation.errors.some(e => e.includes('Sıfır kronik sorun kaydına')), 'Error message MUST mention zero-risk disclaimer');
  console.log('✓ Test 3 Passed: Zero-risk count winner claims rejected cleanly.');
}

runSemanticValidationTests();
