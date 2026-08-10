import { Injectable, Logger } from '@nestjs/common';
import { ComprehensiveVehicleReport } from '@used-car-intelligence/shared';

export interface NarrativeQualityBreakdown {
  vehicleSpecificity: number;       // 0-20
  evidenceGrounding: number;        // 0-20
  decisionCoverage: number;         // 0-20
  riskDepth: number;                // 0-15
  suitabilityDepth: number;         // 0-10
  nonGenericLanguage: number;       // 0-10
  repetitionControl: number;        // 0-5
}

export interface NarrativeQualityResult {
  valid: boolean;
  score: number;
  breakdown: NarrativeQualityBreakdown;
  errors: string[];
  warnings: string[];
  repairInstructions: string[];
  needsRepair: boolean;
}

@Injectable()
export class VehicleReportSemanticValidationService {
  private readonly logger = new Logger(VehicleReportSemanticValidationService.name);

  validate(report: ComprehensiveVehicleReport, contextJson: any): { isValid: boolean; reason?: string; needsRepair?: boolean; qualityResult?: NarrativeQualityResult } {
    if (!report || !report.executiveSummary || !report.vehicleIdentity) {
      return { isValid: false, reason: 'Rapor nesnesi veya zorunlu bölümler eksik.', needsRepair: true };
    }

    const reportStr = JSON.stringify(report).toLowerCase();
    const vehicleCtx = contextJson?.vehicleIdentity || {};

    // Rule 1: Engine code hallucination check
    if (report.vehicleIdentity.engineCode && vehicleCtx.engineCode) {
      if (report.vehicleIdentity.engineCode.toLowerCase() !== vehicleCtx.engineCode.toLowerCase()) {
        return {
          isValid: false,
          reason: `Motor kodu bağlam dışı uyduruldu (${report.vehicleIdentity.engineCode} vs ${vehicleCtx.engineCode}).`,
          needsRepair: true,
        };
      }
    }

    // Rule 2: Absolute claims
    if (reportStr.includes('araç kesinlikle kazasızdır') || reportStr.includes('kesinlikle orijinaldir')) {
      return {
        isValid: false,
        reason: 'Satıcı beyanı veya araç durumu kesin kanıtlanmış gerçek olarak sunuldu.',
        needsRepair: true,
      };
    }

    // Rule 3: Absolute buy/walk away commands check
    if (
      reportStr.includes('bu aracı sakın alma') ||
      reportStr.includes('kesinlikle satın alın') ||
      reportStr.includes('uzak durulmalıdır') ||
      reportStr.includes('uzak durun')
    ) {
      return {
        isValid: false,
        reason: 'Kullanıcıya emredici veya kesin reddedici ("uzak durulmalıdır" / "sakın alma") ifade kullanıldı. Ekspertiz yönlendirmesi yapılmalı.',
        needsRepair: true,
      };
    }

    // Rule 4: Visual photo analysis claim check
    if (reportStr.includes('fotoğraflardan anlaşıldığı üzere boyası temiz') || reportStr.includes('görsellerden hasarlı olduğu görülüyor')) {
      return {
        isValid: false,
        reason: 'Görsel analiz yapılmadığı halde fotoğraftan teknik/boya hükmü verildi.',
        needsRepair: true,
      };
    }

    // Rule 5: 100-Point Narrative Quality Scoring
    const qualityResult = this.validateReportNarrativeQuality(report);
    if (!qualityResult.valid) {
      return {
        isValid: false,
        reason: `Rapor anlatım kalitesi yetersiz (Skor: ${qualityResult.score}/100, Baraj: 75). Hatalar: ${qualityResult.errors.join('; ')}`,
        needsRepair: true,
        qualityResult,
      };
    }

    return { isValid: true, qualityResult };
  }

  validateReportNarrativeQuality(report: ComprehensiveVehicleReport): NarrativeQualityResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const repairInstructions: string[] = [];

    let vehicleSpecificity = 20;
    let evidenceGrounding = 20;
    let decisionCoverage = 20;
    let riskDepth = 15;
    let suitabilityDepth = 10;
    let nonGenericLanguage = 10;
    let repetitionControl = 5;

    const synth = report.expertDecisionSynthesis;

    // 1. Vehicle Specificity (0-20)
    if (!synth || !synth.vehicleCharacter || !synth.vehicleCharacter.detailedAssessment) {
      vehicleSpecificity = 0;
      errors.push('Araç karakteri detaylı değerlendirmesi eksik.');
      repairInstructions.push('Araç karakterini motor, şanzıman ve kullanım nitelikleriyle derinleştirin.');
    } else if (synth.vehicleCharacter.detailedAssessment.length < 120) {
      vehicleSpecificity = 10;
      warnings.push('Araç karakter değerlendirmesi yüzeysel.');
    }

    // 2. Evidence Grounding (0-20)
    if (!synth || !synth.strongestReasonsToChoose || synth.strongestReasonsToChoose.length === 0) {
      evidenceGrounding -= 10;
      warnings.push('Güçlü yönler maddesi eksik.');
    } else {
      const missingFacts = synth.strongestReasonsToChoose.filter(
        (item) => !item.supportingFactIds || item.supportingFactIds.length === 0
      );
      if (missingFacts.length > 0) {
        evidenceGrounding -= 10;
        errors.push('Supporting facts içermeyen güçlü yön iddiaları mevcut.');
        repairInstructions.push('Tüm güçlü yön iddialarına doğrulanmış supportingFactId ekleyin.');
      }
    }

    // 3. Decision Coverage (0-20)
    if (
      !synth ||
      !synth.purchaseConditions ||
      synth.purchaseConditions.length === 0 ||
      !synth.walkAwayConditions ||
      synth.walkAwayConditions.length === 0
    ) {
      decisionCoverage = 5;
      errors.push('Satın alma ve vazgeçme şartları eksik.');
      repairInstructions.push('Somut satın alma ve vazgeçme koşullarını ekleyin.');
    } else if (!synth.finalConditionalVerdict || !synth.finalConditionalVerdict.detailedVerdict) {
      decisionCoverage -= 5;
    }

    // 4. Risk Depth (0-15)
    if (!synth || !synth.primaryTechnicalRisk || !synth.primaryTechnicalRisk.symptoms || synth.primaryTechnicalRisk.symptoms.length === 0) {
      riskDepth = 0;
      errors.push('Ana teknik risk belirtileri ve kontrol adımları eksik.');
      repairInstructions.push('En öncelikli teknik riskin belirtilerini ve ekspertiz kontrol adımlarını açıklayın.');
    }

    // 5. Suitability Depth (0-10)
    if (!synth || (!synth.suitableFor || synth.suitableFor.length === 0) || (!synth.notSuitableFor || synth.notSuitableFor.length === 0)) {
      suitabilityDepth = 2;
      warnings.push('Kullanıcı profili uygunluk matrisi eksik.');
      repairInstructions.push('Hangi kullanıcı için uygun, hangi kullanıcı için uygun olmadığını gerekçelendirin.');
    }

    // 6. Non-Generic Language (0-10)
    const reportStr = JSON.stringify(report).toLowerCase();
    const genericPhrases = [
      'yağ değişimini zamanında yaptırın',
      'şanzıman bakımlarını ihmal etmeyin',
      'fren sistemini kontrol ettirin',
      'günlük kullanım için uygundur',
      'konforlu bir sürüş sunar',
      'kullanıcı beklentilerine göre tercih edilebilir',
      'geniş iç mekan ve konforlu koltuklar',
    ];

    let genericCount = 0;
    for (const phrase of genericPhrases) {
      if (reportStr.includes(phrase)) {
        genericCount++;
      }
    }

    if (genericCount > 0) {
      nonGenericLanguage = Math.max(0, 10 - genericCount * 4);
      warnings.push(`${genericCount} adet jenerik/sığ cümle tespit edildi.`);
      repairInstructions.push('Her araca uyabilecek jenerik tavsiyeler yerine ilgili varyanta özel teknik etkileri açıklayın.');
    }

    // 7. Repetition Control (0-5)
    if (synth && synth.vehicleCharacter && synth.finalConditionalVerdict) {
      if (
        synth.vehicleCharacter.detailedAssessment.slice(0, 50) ===
        synth.finalConditionalVerdict.detailedVerdict.slice(0, 50)
      ) {
        repetitionControl = 0;
        warnings.push('Araç karakteri ve nihai karar cümleleri tekrar ediyor.');
      }
    }

    let rawScore =
      vehicleSpecificity +
      evidenceGrounding +
      decisionCoverage +
      riskDepth +
      suitabilityDepth +
      nonGenericLanguage +
      repetitionControl;

    // Apply Hard Cap Penalties
    if (vehicleSpecificity === 0) {
      rawScore = Math.min(rawScore, 60);
    }
    if (decisionCoverage <= 5) {
      rawScore = Math.min(rawScore, 70);
    }
    if (riskDepth === 0) {
      rawScore = Math.min(rawScore, 65);
    }
    if (genericCount >= 2) {
      rawScore = Math.max(0, rawScore - 20);
    }

    const finalScore = Math.max(0, Math.min(100, rawScore));
    const valid = finalScore >= 75 && errors.length === 0;

    const breakdown: NarrativeQualityBreakdown = {
      vehicleSpecificity,
      evidenceGrounding,
      decisionCoverage,
      riskDepth,
      suitabilityDepth,
      nonGenericLanguage,
      repetitionControl,
    };

    return {
      valid,
      score: finalScore,
      breakdown,
      errors,
      warnings,
      repairInstructions,
      needsRepair: !valid,
    };
  }
}
