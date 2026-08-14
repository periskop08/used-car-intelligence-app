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
];

/**
 * Validates semantic consistency and quality of a generated AI Vehicle Comparison Result.
 * Enforces zero technical contradictions (e.g., fuel economy vs verified L/100km data),
 * complete vehicle coverage, non-generic summaries, valid scenario winners, and no monetary estimates in criteria 1-7.
 */
export function validateComparisonSemantics(
  result: Partial<VehicleComparisonResult>,
  profiles: ComparisonVehicleProfile[],
): SemanticValidationResult {
  const errors: string[] = [];
  const profileIds = new Set(profiles.map(p => p.vehicleId));

  // 1. All vehicles covered in verdicts or vehicleCards
  const cardsVehicleIds = new Set((result.vehicleCards || []).map(c => c.vehicleId));
  const verdictVehicleIds = new Set((result.vehicleVerdicts || []).map(v => v.vehicleId));
  const allVehiclesCovered = profiles.every(p => cardsVehicleIds.has(p.vehicleId) || verdictVehicleIds.has(p.vehicleId));
  if (!allVehiclesCovered) {
    errors.push('Seçilen araçların tamamı vehicleCards veya vehicleVerdicts içinde bulunmuyor.');
  }

  // Check vehicleCards count equals profiles count if vehicleCards present
  if (result.vehicleCards && result.vehicleCards.length > 0 && result.vehicleCards.length !== profiles.length) {
    errors.push(`Üretilen kart sayısı (${result.vehicleCards.length}) seçili araç sayısı (${profiles.length}) ile eşleşmiyor.`);
  }

  // 2. All verdicts / cards complete
  const allVehicleVerdictsComplete = (result.vehicleCards && result.vehicleCards.length > 0)
    ? result.vehicleCards.every(c =>
        Array.isArray(c.strengths) && c.strengths.length >= 1 &&
        Array.isArray(c.cautions) && c.cautions.length >= 1 &&
        Array.isArray(c.bestFor) && c.bestFor.length >= 1 &&
        Array.isArray(c.notIdealFor) && c.notIdealFor.length >= 1
      )
    : (result.vehicleVerdicts || []).every(v => 
        !!v.characterSummary &&
        Array.isArray(v.gains) && v.gains.length >= 1 &&
        Array.isArray(v.compromises) && v.compromises.length >= 1 &&
        Array.isArray(v.bestFor) && v.bestFor.length >= 1 &&
        Array.isArray(v.notIdealFor) && v.notIdealFor.length >= 1
      );
  if (!allVehicleVerdictsComplete) {
    errors.push('Araç kartlarında güçlü yönler, dikkat noktaları, uygun veya uygun olmayan profiller eksik.');
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
  const ownershipNarrative = (result.ownershipCostComparison?.narrative || '').toLowerCase();
  const unsupportedOwnershipPhrases = ['en ucuz bakım maliyetine sahip', 'en düşük yedek parça fiyatı'];
  const hasUnsupportedOwnership = unsupportedOwnershipPhrases.some(phrase => ownershipNarrative.includes(phrase));
  const noUnsupportedOwnershipClaim = !hasUnsupportedOwnership;
  if (hasUnsupportedOwnership) {
    errors.push('Desteklenmeyen kesin sahiplik/bakım maliyeti iddiası tespit edildi.');
  }

  // 7. No unsupported resale claim
  const execSummaryLower = (result.executiveSummary || '').toLowerCase();
  const unsupportedResalePhrases = ['ikinci elde en hızlı satılan', 'değerini en iyi koruyan kesin seçenek'];
  const hasUnsupportedResale = unsupportedResalePhrases.some(phrase => execSummaryLower.includes(phrase));
  const noUnsupportedResaleClaim = !hasUnsupportedResale;
  if (hasUnsupportedResale) {
    errors.push('Desteklenmeyen kesin ikinci el piyasa iddiası tespit edildi.');
  }

  // 8. No risk count based conclusion
  const riskNarrative = (result.riskComparison?.narrative || '').toLowerCase();
  const overallReasoning = (result.overallRecommendation?.reasoning || '').toLowerCase();
  const allScenariosText = (result.scenarioRecommendations || []).map(s => (s.reasoning || '').toLowerCase()).join(' ');

  const riskCountPhrases = [
    '0 adet kronik arıza',
    '0 arıza kaydı olduğu için',
    '0 kronik arıza kaydı olduğu için',
    'en az arıza kaydına sahip olduğu için kazanan',
    'en az kronik arıza kaydına sahip olduğu için en güvenilir',
  ];

  const combinedRiskText = `${riskNarrative} ${overallReasoning} ${execSummaryLower} ${allScenariosText}`;
  const hasRiskCountConclusion = riskCountPhrases.some(phrase => combinedRiskText.includes(phrase));
  const noRiskCountBasedConclusion = !hasRiskCountConclusion;
  if (hasRiskCountConclusion) {
    errors.push('Sıfır kronik sorun kaydına veya arıza sayısına dayanarak araç en sorunsuz veya kazanan ilan edilemez.');
  }

  // 9. No generic summary
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
  const riskNarrativeValid = (result.riskComparison?.narrative || '').length >= 25;

  // 13. No forbidden monetary estimates in risk/technical descriptions (Criteria 1-7)
  const monetaryPattern = /\b\d+\s*(?:TL|₺|lira|euro|\$)\b|tamir\s+fiyatı|parça\s+fiyatı|bakım\s+ücreti|işçilik\s+ücreti|kasko\s+ücreti|sigorta\s+ücreti|yıllık\s+maliyet/i;
  const execAndRiskText = `${result.executiveSummary || ''} ${result.riskComparison?.narrative || ''} ${(result.vehicleVerdicts || []).flatMap(v => v.compromises).join(' ')}`;
  const hasForbiddenMonetaryText = monetaryPattern.test(execAndRiskText);
  if (hasForbiddenMonetaryText) {
    errors.push('Kriter 1-7 ve arıza anlatımlarında TL/para/tamir fiyatı tahmini kullanılamaz; teknik etki tanımlanmalıdır.');
  }

  // 14. Check criterionAssessments across all vehicles for forbidden monetary terms in criteria 1-7
  if (result.criterionResult && Array.isArray(result.criterionResult.vehicleEvaluations)) {
    for (const ev of result.criterionResult.vehicleEvaluations) {
      if (ev.assessments) {
        for (const [cKey, assessment] of Object.entries(ev.assessments)) {
          if (cKey !== 'VALUE_FOR_MONEY' && assessment) {
            const summaryText = `${assessment.summary || ''} ${(assessment.positiveFactors || []).join(' ')} ${(assessment.compromises || []).join(' ')} ${(assessment.negativeFactors || []).join(' ')}`;
            if (monetaryPattern.test(summaryText)) {
              errors.push(`Araç ${ev.vehicleName || ev.vehicleId} için ${cKey} kriterinde TL/para/tamir fiyatı tahmini tespit edildi.`);
            }
          }
        }
      }
    }
  }

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
    minimumNarrativeLengthMet &&
    noUnsupportedWinner &&
    noTechnicalContradiction &&
    noUnsupportedOwnershipClaim &&
    noUnsupportedResaleClaim &&
    noRiskCountBasedConclusion &&
    noGenericSummary &&
    noRawMarkdown &&
    scenarioCoverageValid &&
    riskNarrativeValid &&
    !hasForbiddenMonetaryText;

  return {
    isValid,
    qualityCheck,
    errors,
  };
}
