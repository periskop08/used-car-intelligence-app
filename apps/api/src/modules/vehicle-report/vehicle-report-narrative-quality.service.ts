import { Injectable, Logger } from '@nestjs/common';
import { VehicleReportGeneratedContent } from '@used-car-intelligence/shared';

export interface NarrativeQualityBreakdown {
  vehicleSpecificity: number;  // 0–20
  evidenceGrounding: number;   // 0–20
  decisionCoverage: number;    // 0–20
  riskDepth: number;           // 0–15
  suitabilityDepth: number;    // 0–10
  nonGenericLanguage: number;  // 0–10
  repetitionControl: number;   // 0–5
  totalScore: number;          // 0-100
  passed: boolean;
  rejectionReasons: string[];
}

@Injectable()
export class VehicleReportNarrativeQualityService {
  private readonly logger = new Logger(VehicleReportNarrativeQualityService.name);

  validateReportNarrativeQuality(
    generated: VehicleReportGeneratedContent,
    brandName?: string,
    modelName?: string,
  ): NarrativeQualityBreakdown {
    const rejectionReasons: string[] = [];

    // 1. Vehicle Specificity (0-20)
    let vehicleSpecificity = 20;
    const jsonStr = JSON.stringify(generated).toLowerCase();
    if (brandName && !jsonStr.includes(brandName.toLowerCase())) {
      vehicleSpecificity -= 10;
      rejectionReasons.push('Metin üretimi araç markasını açıkça içermiyor.');
    }
    if (modelName && !jsonStr.includes(modelName.toLowerCase())) {
      vehicleSpecificity -= 10;
      rejectionReasons.push('Metin üretimi araç model ismini açıkça içermiyor.');
    }

    // 2. Evidence Grounding (0-20)
    let evidenceGrounding = 20;
    const synth = generated?.expertDecisionSynthesis;
    if (!synth?.vehicleCharacter?.supportingFactIds?.length) {
      evidenceGrounding -= 10;
      rejectionReasons.push('Araç karakter sentezi supportingFact bağlantısına sahip değil.');
    }

    // 3. Decision Coverage (0-20)
    let decisionCoverage = 20;
    if (!generated?.executiveSummary?.oneSentenceSummary) {
      decisionCoverage -= 10;
      rejectionReasons.push('Karar özeti tek cümlelik özet içermiyor.');
    }
    if (!generated?.finalConditionalVerdict?.overallAssessment) {
      decisionCoverage -= 10;
      rejectionReasons.push('Nihai şartlı karar değerlendirmesi bulunmuyor.');
    }

    // 4. Risk Depth (0-15)
    let riskDepth = 15;
    if (!synth?.purchaseConditions?.length || !synth?.walkAwayConditions?.length) {
      riskDepth -= 8;
      rejectionReasons.push('Satın alma veya vazgeçme koşulları eksik.');
    }

    // 5. Suitability Depth (0-10)
    let suitabilityDepth = 10;
    if (!synth?.suitableFor?.length || !synth?.notSuitableFor?.length) {
      suitabilityDepth -= 5;
      rejectionReasons.push('Uygun ve uygun olmayan kullanıcı profilleri eksik.');
    }

    // 6. Non-Generic Language (0-10)
    let nonGenericLanguage = 10;
    const genericPhrases = [
      'yağını zamanında değiştirin',
      'ekspertiz yaptırın',
      'bakımlarını ihmal etmeyin',
      'frenleri kontrol ettirin',
    ];
    for (const phrase of genericPhrases) {
      if (jsonStr.includes(phrase)) {
        nonGenericLanguage -= 3;
        rejectionReasons.push(`Tek başına jenerik tavsiye tespit edildi: "${phrase}"`);
      }
    }
    nonGenericLanguage = Math.max(0, nonGenericLanguage);

    // 7. Repetition Control (0-5)
    let repetitionControl = 5;

    const totalScore = Math.max(
      0,
      vehicleSpecificity +
        evidenceGrounding +
        decisionCoverage +
        riskDepth +
        suitabilityDepth +
        nonGenericLanguage +
        repetitionControl,
    );

    const passed = totalScore >= 75 && rejectionReasons.length === 0;

    return {
      vehicleSpecificity,
      evidenceGrounding,
      decisionCoverage,
      riskDepth,
      suitabilityDepth,
      nonGenericLanguage,
      repetitionControl,
      totalScore,
      passed,
      rejectionReasons,
    };
  }
}
