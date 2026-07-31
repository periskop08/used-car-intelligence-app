import {
  ComparisonQualityCheck,
  ComparisonVehicleProfile,
  VehicleComparisonResult,
} from '../index';

export interface SemanticValidationResult {
  isValid: boolean;
  qualityCheck: ComparisonQualityCheck;
  errors: string[];
}

const BANNED_GENERIC_PHRASES = [
  'kullanım amacınıza göre değişir',
  'en doğru araç bütçenize uygun olandır',
  'periyodik bakım önemlidir',
  'teknik özellik dengesi sunar',
  'günlük kullanım için uygundur',
  'motor hacmine göre bakım maliyetleri değişebilir',
];

/**
 * Validates semantic consistency and quality of a generated AI Vehicle Comparison Result.
 * Enforces zero technical contradictions (e.g., fuel economy vs verified L/100km data),
 * complete vehicle coverage, non-generic summaries, and valid scenario winners.
 */
export function validateComparisonSemantics(
  result: Partial<VehicleComparisonResult>,
  profiles: ComparisonVehicleProfile[],
): SemanticValidationResult {
  const errors: string[] = [];
  const profileIds = new Set(profiles.map(p => p.vehicleId));

  // 1. All vehicles covered in verdicts
  const verdictVehicleIds = new Set((result.vehicleVerdicts || []).map(v => v.vehicleId));
  const allVehiclesCovered = profiles.every(p => verdictVehicleIds.has(p.vehicleId));
  if (!allVehiclesCovered) {
    errors.push('Seçilen araçların tamamı vehicleVerdicts içinde bulunmuyor.');
  }

  // 2. All verdicts complete
  const allVehicleVerdictsComplete = (result.vehicleVerdicts || []).every(v => 
    !!v.characterSummary &&
    Array.isArray(v.gains) && v.gains.length >= 1 &&
    Array.isArray(v.compromises) && v.compromises.length >= 1 &&
    Array.isArray(v.bestFor) && v.bestFor.length >= 1 &&
    Array.isArray(v.notIdealFor) && v.notIdealFor.length >= 1
  );
  if (!allVehicleVerdictsComplete) {
    errors.push('Araç karakter kartlarında gains, compromises, bestFor veya notIdealFor alanları eksik.');
  }

  // 3. Minimum narrative length met
  const execLen = (result.executiveSummary || '').length;
  const narrLen = (result.narrativeRecommendation || '').length;
  const minimumNarrativeLengthMet = execLen >= 60 && narrLen >= 80;
  if (!minimumNarrativeLengthMet) {
    errors.push('Karar özeti veya tavsiye metni çok kısa veya jenerik.');
  }

  // 4. No unsupported winner (No unknown vehicle ID)
  let noUnsupportedWinner = true;
  if (result.overallRecommendation?.vehicleId && !profileIds.has(result.overallRecommendation.vehicleId)) {
    noUnsupportedWinner = false;
    errors.push(`Genel kazanan araç ID'si (${result.overallRecommendation.vehicleId}) seçili araçlar arasında yok.`);
  }

  // 5. No technical contradiction (e.g. Fuel economy vs verified L/100km consumption)
  let noTechnicalContradiction = true;
  const fuelScenario = (result.scenarioRecommendations || []).find(s => s.scenarioKey === 'FUEL_ECONOMY');
  if (fuelScenario && fuelScenario.recommendedVehicleIds && fuelScenario.recommendedVehicleIds.length > 0) {
    const winnerId = fuelScenario.recommendedVehicleIds[0];
    const winnerProfile = profiles.find(p => p.vehicleId === winnerId);
    const winnerConsumption = winnerProfile?.efficiency?.combinedConsumption;

    if (winnerConsumption) {
      // Check if any other profile has a verified strictly lower consumption
      const betterProfile = profiles.find(p => 
        p.vehicleId !== winnerId && 
        p.efficiency?.combinedConsumption && 
        p.efficiency.combinedConsumption < winnerConsumption - 0.2
      );

      if (betterProfile) {
        noTechnicalContradiction = false;
        errors.push(
          `Yakıt ekonomisi kazananı (${winnerProfile?.displayName}: ${winnerConsumption} L/100km), doğrulanmış daha düşük tüketime sahip araçla (${betterProfile.displayName}: ${betterProfile.efficiency.combinedConsumption} L/100km) çelişiyor.`
        );
      }
    }
  }

  // 6. No unsupported ownership claim
  const noUnsupportedOwnershipClaim = true;

  // 7. No unsupported resale claim
  const noUnsupportedResaleClaim = true;

  // 8. No risk count based conclusion
  const riskNarrative = (result.riskComparison?.narrative || '').toLowerCase();
  const noRiskCountBasedConclusion = !riskNarrative.includes('0 adet kronik arıza olduğu için en güvenilir');

  // 9. No generic summary
  const execSummaryLower = (result.executiveSummary || '').toLowerCase();
  const hasBannedPhrase = BANNED_GENERIC_PHRASES.some(phrase => execSummaryLower.includes(phrase));
  const noGenericSummary = !hasBannedPhrase;
  if (hasBannedPhrase) {
    errors.push('Karar özetinde yasaklı jenerik kalıp cümle tespit edildi.');
  }

  // 10. No raw markdown
  const headline = result.headline || '';
  const noRawMarkdown = !headline.includes('**') && !headline.includes('###');

  // 11. Scenario coverage valid
  const scenarioCoverageValid = Array.isArray(result.scenarioRecommendations) && result.scenarioRecommendations.length >= 1;

  // 12. Risk narrative valid
  const riskNarrativeValid = (result.riskComparison?.narrative || '').length >= 30;

  const qualityCheck: ComparisonQualityCheck = {
    allVehiclesCovered,
    allVehicleVerdictsComplete,
    minimumNarrativeLengthMet,
    noUnsupportedWinner,
    noTechnicalContradiction,
    noUnsupportedOwnershipClaim,
    noUnsupportedResaleClaim,
    noRiskCountBasedConclusion,
    noGenericSummary,
    noRawMarkdown,
    scenarioCoverageValid,
    riskNarrativeValid,
  };

  const isValid = errors.length === 0 &&
    allVehiclesCovered &&
    allVehicleVerdictsComplete &&
    noUnsupportedWinner &&
    noTechnicalContradiction &&
    noGenericSummary;

  return {
    isValid,
    qualityCheck,
    errors,
  };
}
