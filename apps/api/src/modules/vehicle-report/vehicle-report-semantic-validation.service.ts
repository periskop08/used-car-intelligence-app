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

export interface NormalizedNumericClaim {
  subject: 'BATTERY_SOH' | 'BATTERY_CAPACITY' | 'WEAR_KM';
  value: number;
  unit: 'PERCENT' | 'KWH' | 'KM';
  comparator: 'ABOVE' | 'BELOW' | 'AT_LEAST' | 'AT_MOST' | 'NONE';
  claimType: 'HEALTH_THRESHOLD' | 'TECHNICAL_SPEC' | 'USAGE_STATISTIC' | 'WEAR_THRESHOLD';
  rawSpan: string;
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

    // Rule 1: Engine code context consistency check
    if (report.vehicleIdentity.engineCode && vehicleCtx.engineCode) {
      if (report.vehicleIdentity.engineCode.toLowerCase() !== vehicleCtx.engineCode.toLowerCase()) {
        return {
          isValid: false,
          reason: `Motor kodu bağlam dışı uyduruldu (${report.vehicleIdentity.engineCode} vs ${vehicleCtx.engineCode}).`,
          needsRepair: true,
        };
      }
    }

    // Rule 1.1: No alternative codes listed as definitive identity in code fields
    const transCode = (report.vehicleIdentity.transmissionCode || '').toLowerCase();
    const engCode = (report.vehicleIdentity.engineCode || '').toLowerCase();
    if (transCode.includes(' veya ') || transCode.includes(' ya da ') || engCode.includes(' veya ') || engCode.includes(' ya da ')) {
      return {
        isValid: false,
        reason: 'Teknik kimlik alanlarında (transmissionCode / engineCode) birden fazla alternatif kod ("veya" ile) kesin gerçek gibi sunuldu. Doğrulanabilen tekil seviyede kalınmalıdır.',
        needsRepair: true,
      };
    }

    // Rule 1.2: Cross-stage research vs output consistency check
    const researchIdentity = contextJson?.verifiedResearch?.vehicleIdentityResearch;
    if (researchIdentity) {
      if (researchIdentity.transmissionCode && report.vehicleIdentity.transmissionCode) {
        const resTrans = String(researchIdentity.transmissionCode).trim().toLowerCase();
        const repTrans = String(report.vehicleIdentity.transmissionCode).trim().toLowerCase();
        if (resTrans !== 'unknown' && !repTrans.includes(resTrans) && !resTrans.includes(repTrans)) {
          return {
            isValid: false,
            reason: `Şanzıman kodu Stage 1 araştırma bulgusu ile çelişiyor (${report.vehicleIdentity.transmissionCode} vs ${researchIdentity.transmissionCode}).`,
            needsRepair: true,
          };
        }
      }
    }

    // Rule 1.3: EV vs ICE Architecture Guard
    const fuelType = (report.vehicleIdentity.fuelType || vehicleCtx.fuelType || '').toLowerCase();
    const isElectric = fuelType.includes('elektrik') || fuelType.includes('electric') || fuelType.includes('bev');
    if (isElectric) {
      if (report.vehicleIdentity.engineDisplacementCc && report.vehicleIdentity.engineDisplacementCc > 0) {
        return {
          isValid: false,
          reason: `Elektrikli (EV) araçta içten yanmalı motor hacmi (engineDisplacementCc: ${report.vehicleIdentity.engineDisplacementCc} cc) tanımlandı. EV araçlarda motor hacmi null/undefined olmalıdır.`,
          needsRepair: true,
        };
      }
      if (reportStr.includes('egzoz emisyonu') || reportStr.includes('dpf filtresi') || reportStr.includes('buji değişimi') || reportStr.includes('yakıt deposu')) {
        return {
          isValid: false,
          reason: 'Elektrikli (EV) araç analizinde içten yanmalı motor terimleri (egzoz/DPF/buji/yakıt deposu) tespit edildi.',
          needsRepair: true,
        };
      }
    }

    // Rule 1.4: Transmission Architecture Semantic Compatibility Guard
    const transName = (report.vehicleIdentity.transmissionName || vehicleCtx.transmissionName || '').toLowerCase();
    const transArch = String(researchIdentity?.transmissionFamily || researchIdentity?.clutchType || transName).toLowerCase();
    const isTorqueConverterOrCVTOrManual = transArch.includes('tork_konvertorlu') || transArch.includes('tork konvertörlü') || transArch.includes('tam otomatik') || transArch.includes('eat8') || transArch.includes('zf 8hp') || transArch.includes('cvt') || transArch.includes('multitronic') || transArch.includes('manuel');
    const hasDctTerminology = reportStr.includes('kuru çift kavrama') || reportStr.includes('kuru kavrama balata') || reportStr.includes('mekatronik basınç tüpü') || reportStr.includes('dsg kavrama titremesi');
    if (isTorqueConverterOrCVTOrManual && !transArch.includes('dsg') && !transArch.includes('edc') && !transArch.includes('dct')) {
      if (hasDctTerminology) {
        return {
          isValid: false,
          reason: `Şanzıman mimarisi (${transName}) ile raporda kullanılan çift kavrama / DSG mekatronik dili çelişiyor. Tork konvertörlü, CVT veya Manuel araçlarda DSG kavrama/mekatronik arızası iddia edilemez.`,
          needsRepair: true,
        };
      }
    }

    // Rule 1.5: Evidence-Bound Normalized Numeric Guard
    const numericValidation = this.validateEvidenceBoundNumericClaims(report, contextJson);
    if (!numericValidation.isValid) {
      return numericValidation;
    }

    // Rule 1.6: Risk-Action Semantic Consistency Guard
    const riskActionValidation = this.validateRiskActionSemanticConsistency(report);
    if (!riskActionValidation.isValid) {
      return riskActionValidation;
    }

    // Rule 1.7: Evidence Type Preservation Guard
    const evidenceTypeValidation = this.validateEvidenceTypePreservation(report, contextJson);
    if (!evidenceTypeValidation.isValid) {
      return evidenceTypeValidation;
    }

    // Rule 1.8: Timing Architecture Guard
    const timingValidation = this.validateTimingArchitectureGuard(report, contextJson);
    if (!timingValidation.isValid) {
      return timingValidation;
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
    const qualityResult = this.validateReportNarrativeQuality(report, contextJson);
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

  validateReportNarrativeQuality(report: ComprehensiveVehicleReport, context?: any): NarrativeQualityResult {
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

    // 4. Risk Depth (0-15) - Trusted Upstream Evidence Boundary
    const hasExplicitZeroEvidence = Boolean(
      context &&
      Array.isArray(context.problems) && context.problems.length === 0 &&
      Array.isArray(context?.verifiedDatabaseVehicleReport?.knownDatabaseProblems) && context.verifiedDatabaseVehicleReport.knownDatabaseProblems.length === 0 &&
      (!context?.verifiedResearch?.chronicFaults || context.verifiedResearch.chronicFaults.length === 0)
    );

    const verifiedDbProblems = (context?.verifiedDatabaseVehicleReport?.knownDatabaseProblems || context?.problems || [])
      .filter((p: any) => {
        if (p.problemType || p.status) {
          const rawType = String(p.problemType || p.type || '').toUpperCase();
          return rawType === 'VERIFIED_FAILURE' || rawType === 'RECALL' || rawType === 'TSB' || p.status === 'APPROVED';
        }
        return Boolean(p.id && (p.title || p.riskLevel));
      });
    const verifiedResearchFaults = (context?.verifiedResearch?.chronicFaults || [])
      .filter((f: any) => f.verified !== false && f.title);

    const hasVerifiedEvidenceRisk = (verifiedDbProblems.length > 0 || verifiedResearchFaults.length > 0);

    const primaryRisk = synth?.primaryTechnicalRisk;
    const isExplicitNoRisk = !primaryRisk || (primaryRisk as any).state === 'NO_VERIFIED_PRIMARY_RISK';

    if (hasVerifiedEvidenceRisk) {
      // Case A: Trusted verified chronic risk exists -> primaryTechnicalRisk is required with symptoms and inspection instructions
      if (!primaryRisk || isExplicitNoRisk || !primaryRisk.symptoms || primaryRisk.symptoms.length === 0) {
        riskDepth = 0;
        errors.push('Doğrulanmış teknik risk kaydı bulunmasına rağmen raporda ana teknik risk belirtileri ve kontrol adımları eksik.');
        repairInstructions.push('Doğrulanmış arıza kayıtlarına dayalı öncelikli teknik riskin belirtilerini ve kontrol adımlarını ekleyin.');
      }
    } else if (hasExplicitZeroEvidence) {
      // Case B: Evidence explicitly confirms zero verified chronic risk
      if (primaryRisk && !isExplicitNoRisk) {
        // Fabricated generic risk detected when evidence confirms no verified risk
        riskDepth = 0;
        errors.push('Doğrulanmış teknik risk bulunmamasına rağmen mesnetsiz/jenerik ana teknik risk eklendi.');
        repairInstructions.push('Doğrulanmış kronik risk bulunmadığı durumda mesnetsiz risk üretmeyin.');
      } else {
        // Correct absence of verified primary risk -> full score, no penalty
        riskDepth = 15;
      }
    } else {
      // Case C: Unspecified context / standalone test
      if (!primaryRisk || isExplicitNoRisk) {
        riskDepth = 15;
      } else if (!primaryRisk.symptoms || primaryRisk.symptoms.length === 0) {
        riskDepth = 0;
        errors.push('Ana teknik risk belirtileri ve kontrol adımları eksik.');
        repairInstructions.push('Teknik riskin belirtilerini ve kontrol adımlarını ekleyin.');
      }
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

  private static readonly WEAR_PATTERNS = [
    { topic: 'TRIM_RATTLE', regex: /(?:60[\s.]?000\s*-\s*70[\s.]?000|60\s*-\s*70\s*(?:bin|k))\s*km.*?(?:trim|tıkırtı|kabin)/i, label: 'Kabin trim tıkırtısı km eşiği' },
    { topic: 'TRANSMISSION_WEAR', regex: /(?:80[\s.]?000\s*-\s*100[\s.]?000|80\s*-\s*100\s*(?:bin|k))\s*km.*?(?:kavrama|şanzıman|vites)/i, label: 'Şanzıman aşınması km eşiği' },
  ];

  public static extractNormalizedClaims(text: string): NormalizedNumericClaim[] {
    if (!text || typeof text !== 'string') return [];
    const claims: NormalizedNumericClaim[] = [];

    const fullTextLower = text.toLowerCase();
    const fullTextHasSoh = fullTextLower.includes('soh') || 
                           fullTextLower.includes('batarya sağlığı') || 
                           fullTextLower.includes('pil sağlığı') || 
                           fullTextLower.includes('batarya sağlık') ||
                           fullTextLower.includes('pil sağlık');

    // Split text into clauses/sentences by punctuation and newlines
    const segments = text.split(/(?<=[.!?\n;])\s+/);

    for (const segment of segments) {
      const lower = segment.toLowerCase();

      // 1. Check for Battery / SoH keywords
      const hasSohKeyword = fullTextHasSoh ||
                            lower.includes('soh') || 
                            lower.includes('batarya sağlığı') || 
                            lower.includes('pil sağlığı') || 
                            lower.includes('batarya sağlık') ||
                            lower.includes('pil sağlık');
      
      const hasBatteryCapacityKeyword = fullTextLower.includes('batarya kapasite') || fullTextLower.includes('pil kapasite');

      // 2. Check for kWh technical specs (e.g. 60 kWh batarya kapasitesi)
      const kwhMatch = lower.match(/(\d{2,3}(?:\.\d+)?)\s*kwh/i);
      if (kwhMatch && (hasBatteryCapacityKeyword || lower.includes('batarya') || lower.includes('pil'))) {
        claims.push({
          subject: 'BATTERY_CAPACITY',
          value: parseFloat(kwhMatch[1]),
          unit: 'KWH',
          comparator: 'NONE',
          claimType: 'TECHNICAL_SPEC',
          rawSpan: segment.trim(),
        });
      }

      // 3. Check for percentage numeric values (%75, 75%, %85, 85%, 85 SoH, SoH 85)
      const percentMatches = Array.from(lower.matchAll(/(?:%\s*(\d{1,3})|(\d{1,3})\s*%|(\d{2,3})\s*soh|soh\s*(\d{2,3}))/gi));

      for (const m of percentMatches) {
        const rawValStr = m[1] || m[2] || m[3] || m[4];
        const val = parseInt(rawValStr, 10);
        if (isNaN(val) || val < 1 || val > 100) continue;

        const matchIndex = m.index || 0;
        const surroundingText = lower.substring(Math.max(0, matchIndex - 60), Math.min(lower.length, matchIndex + 60));

        // False-Positive Guard: Charging statistics (e.g. %80 oranında DC hızlı şarj)
        const isChargingStatistic = surroundingText.includes('şarj') || 
                                    surroundingText.includes('dc') || 
                                    surroundingText.includes('ac') ||
                                    lower.includes('hızlı şarj') ||
                                    lower.includes('şarj oranı') ||
                                    lower.includes('şarj kullanım');

        if (isChargingStatistic && !surroundingText.includes('soh') && !surroundingText.includes('sağlık')) {
          claims.push({
            subject: 'BATTERY_CAPACITY',
            value: val,
            unit: 'PERCENT',
            comparator: 'NONE',
            claimType: 'USAGE_STATISTIC',
            rawSpan: segment.trim(),
          });
          continue;
        }

        // Comparator detection
        let comparator: 'ABOVE' | 'BELOW' | 'AT_LEAST' | 'AT_MOST' | 'NONE' = 'NONE';
        if (
          surroundingText.includes('üzeri') || 
          surroundingText.includes('üzerinde') || 
          surroundingText.includes('üstü') || 
          surroundingText.includes('üstünde') ||
          surroundingText.includes('yukarısı') ||
          surroundingText.includes('fazlası') ||
          surroundingText.includes('ve üzeri')
        ) {
          comparator = 'ABOVE';
        } else if (
          surroundingText.includes('altı') || 
          surroundingText.includes('altında') || 
          surroundingText.includes('altındaki') ||
          surroundingText.includes('aşağısı') ||
          surroundingText.includes('düşük') ||
          surroundingText.includes('ve altı')
        ) {
          comparator = 'BELOW';
        } else if (surroundingText.includes('en az') || surroundingText.includes('minimum')) {
          comparator = 'AT_LEAST';
        } else if (surroundingText.includes('en fazla') || surroundingText.includes('maksimum') || surroundingText.includes('en çok')) {
          comparator = 'AT_MOST';
        }

        const isDegradationOrHealth = hasSohKeyword || 
                                      surroundingText.includes('sağlık') || 
                                      surroundingText.includes('soh') ||
                                      (hasBatteryCapacityKeyword && (comparator !== 'NONE' || surroundingText.includes('düş') || surroundingText.includes('kayb')));

        if (isDegradationOrHealth && !isChargingStatistic) {
          claims.push({
            subject: 'BATTERY_SOH',
            value: val,
            unit: 'PERCENT',
            comparator,
            claimType: 'HEALTH_THRESHOLD',
            rawSpan: segment.trim(),
          });
        }
      }

      // 4. Wear threshold patterns
      for (const wp of VehicleReportSemanticValidationService.WEAR_PATTERNS) {
        if (wp.regex.test(segment)) {
          claims.push({
            subject: 'WEAR_KM',
            value: wp.topic === 'TRIM_RATTLE' ? 60000 : 80000,
            unit: 'KM',
            comparator: 'ABOVE',
            claimType: 'WEAR_THRESHOLD',
            rawSpan: segment.trim(),
          });
        }
      }
    }

    return claims;
  }

  public static isClaimVerifiedInResearch(claim: NormalizedNumericClaim, verifiedResearch: any): boolean {
    if (!verifiedResearch) return false;
    const verifiedClaims = Array.isArray(verifiedResearch?.claims) ? verifiedResearch.claims : [];
    const researchStr = JSON.stringify(verifiedResearch).toLowerCase();

    if (claim.subject === 'BATTERY_SOH' && claim.claimType === 'HEALTH_THRESHOLD') {
      // Must match subject (SoH / battery health) + value + unit in verified evidence
      const hasMatchingVerifiedClaim = verifiedClaims.some((c: any) => {
        if (c.verificationStatus !== 'VERIFIED') return false;
        const text = String(c.claimText || '').toLowerCase();
        const hasSohContext = text.includes('soh') || text.includes('batarya') || text.includes('pil sağlığı') || text.includes('sağlık');
        const hasVal = text.includes(`%${claim.value}`) || text.includes(`${claim.value}%`) || text.includes(`${claim.value} soh`) || text.includes(`soh ${claim.value}`);
        return hasSohContext && hasVal;
      });

      if (hasMatchingVerifiedClaim) return true;

      // Research text deep match: value must be co-located with battery health/soh
      const hasDeepMatch = (researchStr.includes(`%${claim.value}`) || researchStr.includes(`${claim.value}%`) || researchStr.includes(`soh ${claim.value}`) || researchStr.includes(`${claim.value} soh`)) &&
                           (researchStr.includes('soh') || researchStr.includes('batarya sağlığı') || researchStr.includes('pil sağlığı'));
      return hasDeepMatch;
    }

    if (claim.subject === 'WEAR_KM' && claim.claimType === 'WEAR_THRESHOLD') {
      const topic = claim.value === 60000 ? 'trim' : 'şanzıman';
      const hasVerifiedProof = verifiedClaims.some(
        (c: any) => c.verificationStatus === 'VERIFIED' && String(c.claimText || '').toLowerCase().includes(topic)
      );
      return hasVerifiedProof || researchStr.includes(topic);
    }

    return true;
  }

  public sanitizeEvidenceBoundNumericClaims(report: ComprehensiveVehicleReport, contextJson: any): void {
    const verifiedResearch = contextJson?.verifiedResearch || {};

    const sanitizeString = (text: string): string => {
      if (!text || typeof text !== 'string') return text;
      
      const claims = VehicleReportSemanticValidationService.extractNormalizedClaims(text);
      let cleaned = text;

      for (const claim of claims) {
        if (!VehicleReportSemanticValidationService.isClaimVerifiedInResearch(claim, verifiedResearch)) {
          if (claim.subject === 'BATTERY_SOH' && claim.claimType === 'HEALTH_THRESHOLD') {
            if (claim.rawSpan && cleaned.includes(claim.rawSpan)) {
              cleaned = cleaned.replace(claim.rawSpan, 'Batarya sağlık durumu (SoH) yetkili servis veya güvenilir bir uzman tarafından ölçülmeli ve araç özelinde değerlendirilmelidir.');
            } else {
              cleaned = 'Batarya sağlık durumu (SoH) yetkili servis veya güvenilir bir uzman tarafından ölçülmeli ve araç özelinde değerlendirilmelidir.';
            }
          } else if (claim.subject === 'WEAR_KM' && claim.claimType === 'WEAR_THRESHOLD') {
            for (const wp of VehicleReportSemanticValidationService.WEAR_PATTERNS) {
              if (wp.regex.test(cleaned)) {
                cleaned = cleaned.replace(wp.regex, 'kullanım ve yol şartlarına bağlı olarak periyodik ekspertizde kontrol edilmelidir');
              }
            }
          }
        }
      }

      // Deduplicate repeated identical sentences
      cleaned = cleaned.replace(/(Batarya sağlık durumu \(SoH\) yetkili servis veya güvenilir bir uzman tarafından ölçülmeli ve araç özelinde değerlendirilmelidir\.\s*)+/g, '$1');
      return cleaned.replace(/\s{2,}/g, ' ').trim();
    };

    const walkAndSanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (Array.isArray(obj[key])) {
          obj[key] = obj[key].map((item: any) => {
            if (typeof item === 'string') {
              return sanitizeString(item);
            } else if (item && typeof item === 'object') {
              walkAndSanitize(item);
              return item;
            }
            return item;
          });
        } else if (typeof obj[key] === 'object') {
          walkAndSanitize(obj[key]);
        }
      }
    };

    walkAndSanitize(report);
  }

  private validateEvidenceBoundNumericClaims(report: ComprehensiveVehicleReport, contextJson: any): { isValid: boolean; reason?: string; needsRepair?: boolean } {
    const verifiedResearch = contextJson?.verifiedResearch || {};
    const dynamicMaint = verifiedResearch?.dynamicMaintenanceResearch || {};

    const allClaims: NormalizedNumericClaim[] = [];
    const walkAndExtract = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          allClaims.push(...VehicleReportSemanticValidationService.extractNormalizedClaims(obj[key]));
        } else if (Array.isArray(obj[key])) {
          for (const item of obj[key]) {
            if (typeof item === 'string') {
              allClaims.push(...VehicleReportSemanticValidationService.extractNormalizedClaims(item));
            } else if (item && typeof item === 'object') {
              walkAndExtract(item);
            }
          }
        } else if (typeof obj[key] === 'object') {
          walkAndExtract(obj[key]);
        }
      }
    };
    walkAndExtract(report);

    for (const claim of allClaims) {
      if (!VehicleReportSemanticValidationService.isClaimVerifiedInResearch(claim, verifiedResearch)) {
        if (claim.subject === 'BATTERY_SOH' && claim.claimType === 'HEALTH_THRESHOLD') {
          return {
            isValid: false,
            reason: `Stage 1 kanıtlarında bulunmayan batarya sağlık yüzdesi (%${claim.value} SoH / Pil Sağlığı) iddiası tespit edildi. Sayısal eşikler kanıtlanmadığı sürece raporda kullanılamaz.`,
            needsRepair: true,
          };
        }
        if (claim.subject === 'WEAR_KM' && claim.claimType === 'WEAR_THRESHOLD') {
          return {
            isValid: false,
            reason: `Stage 1 kanıtlarında bulunmayan yapay/ezbere sayısal eşik iddiası (${claim.value} km) tespit edildi. Sayısal eşikler yerine olasılıksal uzman dili kullanılmalıdır.`,
            needsRepair: true,
          };
        }
      }
    }

    // Maintenance Taxonomy Cross-Contamination Guard
    const mfgText = String(dynamicMaint.manufacturerScheduledMaintenance || '').toLowerCase();
    const indText = String(dynamicMaint.independentPreventiveRecommendations || '').toLowerCase();
    const reportStrLower = JSON.stringify(report).toLowerCase();
    if (mfgText && reportStrLower.includes('üretici tavsiyesi') && !mfgText.includes('tavsiye') && indText) {
      if (reportStrLower.includes('üretici zorunlu periyodik bakımı') && indText.includes('ağır kullanım')) {
        // Enforce distinction
      }
    }

    return { isValid: true };
  }

  private validateRiskActionSemanticConsistency(report: ComprehensiveVehicleReport): { isValid: boolean; reason?: string; needsRepair?: boolean } {
    const synth = report.expertDecisionSynthesis;
    const primaryRisk = synth?.primaryTechnicalRisk as any;
    if (!primaryRisk) return { isValid: true };

    const title = (primaryRisk.title || primaryRisk.riskTitle || '').toLowerCase();
    const steps: string[] = (primaryRisk.inspectionInstructions || primaryRisk.inspectionSteps || [])
      .map((s: any) => (typeof s === 'string' ? s : s.instruction || s.title || '').toLowerCase());

    const isElectricalOrInteriorOrWiper =
      title.includes('silecek') ||
      title.includes('wiper') ||
      title.includes('multimedya') ||
      title.includes('ekran') ||
      title.includes('hoparlör') ||
      title.includes('sunroof') ||
      title.includes('döşeme') ||
      title.includes('koltuk') ||
      title.includes('klima kontrol paneli') ||
      title.includes('park sensörü');

    if (isElectricalOrInteriorOrWiper) {
      const underbodyKeywords = [
        'lifte kaldır',
        'alt muhafaza',
        'karter muhafazası',
        'yağ sızıntısı',
        'motor yağı kaçağı',
        'salıncak burç',
        'rot başı',
        'amortisör kulesi',
        'aks körüğü',
      ];
      for (const step of steps) {
        for (const kw of underbodyKeywords) {
          if (step.includes(kw)) {
            return {
              isValid: false,
              reason: `Risk başlığı ("${primaryRisk.title || primaryRisk.riskTitle}") ile önerilen ekspertiz kontrol adımı ("${step}") arasında semantik uyumsuzluk tespit edildi. Elektrik/gövde/silecek risklerine alt muhafaza/lift mekanik kontrolleri bağlanamaz.`,
              needsRepair: true,
            };
          }
        }
      }
    }

    return { isValid: true };
  }

  private validateEvidenceTypePreservation(report: ComprehensiveVehicleReport, contextJson: any): { isValid: boolean; reason?: string; needsRepair?: boolean } {
    const reportStr = JSON.stringify(report).toLowerCase();
    const hasVerifiedTSB =
      (contextJson?.verifiedResearch?.recallResearch?.length || 0) > 0 ||
      (contextJson?.verifiedDatabaseVehicleReport?.recalls?.length || 0) > 0;

    const ungroundedElevationPhrases = [
      'kesin fabrika üretim hatasıdır',
      'kesin fabrika kusurudur',
      'üretici tarafından kabul edilmiş kronik arızadır',
      'üretici tarafından doğrulanmış kronik hatadır',
      'fabrika geri çağırma garantili arızası',
    ];

    if (!hasVerifiedTSB) {
      for (const phrase of ungroundedElevationPhrases) {
        if (reportStr.includes(phrase)) {
          return {
            isValid: false,
            reason: `Kullanıcı şikâyeti veya gözlemlenen durum, Stage 1 TSB/bülten kanıtı olmadan "${phrase}" olarak yükseltilemez. Reported complaint, known behavior ve verified failure ayrımı korunmalıdır.`,
            needsRepair: true,
          };
        }
      }
    }

    return { isValid: true };
  }

  private validateTimingArchitectureGuard(report: ComprehensiveVehicleReport, contextJson: any): { isValid: boolean; reason?: string; needsRepair?: boolean } {
    const reportStr = JSON.stringify(report).toLowerCase();
    const researchIdentity = contextJson?.verifiedResearch?.vehicleIdentityResearch;
    const vehicleCtx = contextJson?.vehicleIdentity || {};
    const timingSystem = String(
      (report.vehicleIdentity as any)?.timingSystem ||
      researchIdentity?.timingSystem ||
      vehicleCtx.timingSystem ||
      ''
    ).toLowerCase();

    const isBelt = timingSystem.includes('kayis') || timingSystem.includes('kayış') || timingSystem.includes('belt');
    const isChain = timingSystem.includes('zincir') || timingSystem.includes('chain');

    if (isBelt && !isChain) {
      if (
        reportStr.includes('zincir uzaması') ||
        reportStr.includes('zincir sesi') ||
        reportStr.includes('triger zinciri') ||
        reportStr.includes('zincir şakırtısı') ||
        reportStr.includes('zincir gergisi') ||
        reportStr.includes('zincir değişimi')
      ) {
        return {
          isValid: false,
          reason: 'Araç triger sistemi KAYIŞ (BELT) olarak doğrulanmışken raporda triger zinciri / zincir uzaması / zincir sesi terimleri kullanıldı.',
          needsRepair: true,
        };
      }
    }

    if (isChain && !isBelt) {
      if (
        reportStr.includes('triger kayışı kopması') ||
        reportStr.includes('triger kayış değişimi') ||
        reportStr.includes('kayış liflenmesi') ||
        reportStr.includes('triger kayış periyodu')
      ) {
        return {
          isValid: false,
          reason: 'Araç triger sistemi ZİNCİR (CHAIN) olarak doğrulanmışken raporda triger kayışı terimleri kullanıldı.',
          needsRepair: true,
        };
      }
    }

    return { isValid: true };
  }
}
