import { Injectable, Logger } from '@nestjs/common';
import {
  TorqueScoutDecisionScoreV1,
  VehicleReportScoresV6,
} from '@used-car-intelligence/shared';

export interface DecisionScoreCalculationInput {
  v6Scores: VehicleReportScoresV6;
  qualitativeDefects?: any[];
  recalls?: any[];
  priceModifier?: number;
}

@Injectable()
export class TorqueScoutDecisionScoreService {
  private readonly logger = new Logger(TorqueScoutDecisionScoreService.name);

  /**
   * Calculates the 0–100 TorqueScout Decision Score V1.
   * Product principle: Transparent buying decision recommendation score derived from
   * verified technical risk, vehicle condition, confidence, and price/value.
   * NEVER represents statistical failure probability or occurrence likelihood.
   */
  calculateDecisionScore(input: DecisionScoreCalculationInput): TorqueScoutDecisionScoreV1 {
    const { v6Scores, qualitativeDefects = [], recalls = [], priceModifier = 0 } = input;

    // 1. Calculate Qualitative Buying-Decision Penalty across affected domains (Option B Calibration)
    const qualitativePenalty = this.calculateQualitativePenalty(
      v6Scores,
      qualitativeDefects,
      recalls,
    );

    // 2. Determine Model Decision Risk (Bounded Buying-Decision Penalty)
    let modelDecisionRisk: number | null = null;
    let modelRiskLimitingReason: string | null = null;

    switch (v6Scores.modelRiskState) {
      case 'CONTRADICTORY_EVIDENCE':
      case 'INSUFFICIENT_RESEARCH':
        modelDecisionRisk = null;
        modelRiskLimitingReason = 'Model seviyesi güvenilirlik araştırması yetersiz veya çelişkili kanıt içeriyor.';
        break;

      case 'RESEARCH_COMPLETE_NO_DEFECT':
        // Research complete but not certified deep zero
        modelDecisionRisk = null;
        modelRiskLimitingReason = 'Model araştırması tamamlandı ancak sıfır-risk sertifikasyonu için derinlik eşiği karşılanmadı.';
        break;

      case 'VERIFIED_LOW_RISK':
        modelDecisionRisk = 0;
        break;

      case 'VERIFIED_RISK_PRESENT':
        if (v6Scores.modelRiskQuantification === 'QUALITATIVE_ONLY') {
          modelDecisionRisk = qualitativePenalty;
        } else if (v6Scores.modelRiskQuantification === 'PARTIAL_LOWER_BOUND') {
          // Conservative upper envelope: max(numericSubset, qualitativePenalty) to avoid double counting
          const numRisk = v6Scores.modelRiskScore ?? 0;
          const qualPen = qualitativePenalty ?? 0;
          modelDecisionRisk = Math.max(numRisk, qualPen);
        } else if (v6Scores.modelRiskQuantification === 'FULLY_QUANTIFIED') {
          modelDecisionRisk = v6Scores.modelRiskScore;
        } else {
          modelDecisionRisk = qualitativePenalty;
        }
        break;

      default:
        modelDecisionRisk = null;
        break;
    }

    // 3. Determine Scope & Final Score
    const hasEligibleCondition =
      v6Scores.vehicleConditionRisk !== null &&
      v6Scores.conditionCoverageScore >= 35;

    let score: number | null = null;
    let scope: TorqueScoutDecisionScoreV1['scope'] = 'INSUFFICIENT_DATA';
    let limitingReason: string | null = modelRiskLimitingReason;
    let conditionRiskUsed: number | null = null;

    // Price modifier bounded to [-15, +10]
    const clampedPriceModifier = Math.min(10, Math.max(-15, Math.round(priceModifier)));

    if (v6Scores.confidenceScore < 40) {
      score = null;
      scope = 'INSUFFICIENT_DATA';
      limitingReason = 'Bu araç hakkında çeşitli arıza ve kullanıcı bildirimleri bulunabilir; ancak bunların sıklığını ve bu araç varyantına uygulanabilirliğini güvenilir şekilde doğrulayamadığımız için yanıltıcı bir puan vermiyoruz.';
      conditionRiskUsed = hasEligibleCondition ? v6Scores.vehicleConditionRisk : null;
    } else if (modelDecisionRisk === null) {
      score = null;
      scope = 'INSUFFICIENT_DATA';
      conditionRiskUsed = hasEligibleCondition ? v6Scores.vehicleConditionRisk : null;
    } else if (!hasEligibleCondition) {
      // VARIANT-level score (No specific vehicle condition data)
      // Option B: Decision score directly reflects technical risk (100 - modelDecisionRisk)
      // Confidence is reported independently as "Analiz Veri Güveni"
      scope = 'VARIANT';
      conditionRiskUsed = null;

      const rawVariantScore = 100 - modelDecisionRisk;
      score = Math.round(Math.min(100, Math.max(0, rawVariantScore)));
    } else {
      // VEHICLE-specific score (Specific condition data available)
      // Option B: Decision score directly reflects combined technical & condition risk + price modifier
      // Confidence is reported independently as "Analiz Veri Güveni"
      scope = 'VEHICLE';
      conditionRiskUsed = v6Scores.vehicleConditionRisk;

      const baseVehicleScore = 100 - (0.45 * modelDecisionRisk + 0.55 * (v6Scores.vehicleConditionRisk ?? 0));
      const adjustedScore = baseVehicleScore + clampedPriceModifier;

      score = Math.round(Math.min(100, Math.max(0, adjustedScore)));
    }

    // 4. Map State Recommendation Band
    let state: TorqueScoutDecisionScoreV1['state'] = 'INSUFFICIENT_DATA';
    if (score === null) {
      state = 'INSUFFICIENT_DATA';
    } else if (score >= 85) {
      state = 'EXCELLENT';
    } else if (score >= 70) {
      state = 'GOOD';
    } else if (score >= 55) {
      state = 'CAUTION';
    } else if (score >= 40) {
      state = 'HIGH_RISK';
    } else {
      state = 'AVOID';
    }

    // 5. Deterministic Explanations (Strictly NO '%' or probability semantics)
    const explanation = this.buildDeterministicExplanation({
      v6Scores,
      scope,
      modelDecisionRisk,
      qualitativePenalty,
      conditionRiskUsed,
      confidenceScore: v6Scores.confidenceScore,
      priceModifierUsed: clampedPriceModifier,
      score,
      state,
    });

    return {
      version: 'v1.0',
      score,
      scope,
      state,
      modelDecisionRisk,
      qualitativeSeverityBurden: qualitativePenalty,
      conditionRiskUsed,
      confidenceScore: v6Scores.confidenceScore,
      priceModifierUsed: clampedPriceModifier,
      limitingReason,
      explanation,
    };
  }

  /**
   * Calculates Qualitative Buying-Decision Penalty using Option B (Progressive Convex Power Function).
   * For each affected domain:
   *   DomainBurden_d = (maxVerifiedSeverityInDomain / 10) ^ 1.8
   * Across affected domains:
   *   AggregateBurden = 0.75 * max(DomainBurden) + 0.25 * mean(DomainBurden)
   *   DomainMultiplier = 1 + 0.20 * min(2, affectedDomains - 1)
   *   QualitativePenalty = round(50 * AggregateBurden * DomainMultiplier)
   * Clamped 0..100.
   */
  private calculateQualitativePenalty(
    v6Scores: VehicleReportScoresV6,
    qualitativeDefects: any[],
    recalls: any[],
  ): number | null {
    // Gather all qualitative candidates from domain breakdown or arrays
    const domainSeverities: Record<string, number[]> = {};

    // 1. From domainBreakdown verified qualitative factors
    v6Scores.domainBreakdown?.forEach((d) => {
      const qualFactors = d.verifiedFactors.filter(
        (f) => f.quantification === 'QUALITATIVE' || f.impact === null,
      );
      if (qualFactors.length > 0) {
        if (!domainSeverities[d.domain]) domainSeverities[d.domain] = [];
      }
    });

    // 2. Map explicit qualitativeDefects and recalls into domain severities
    const allQual = [
      ...(Array.isArray(qualitativeDefects) ? qualitativeDefects : []),
      ...(Array.isArray(recalls) ? recalls : []),
    ];

    allQual.forEach((d: any) => {
      if (d.numericEligibility === 'REJECTED') return;
      const dKey = d.domain || this.resolveDomainKey(d);
      const sev = this.extractSeverityNumber(d);
      if (sev > 0) {
        if (!domainSeverities[dKey]) domainSeverities[dKey] = [];
        domainSeverities[dKey].push(sev);
      }
    });

    const affectedDomainKeys = Object.keys(domainSeverities).filter(
      (k) => domainSeverities[k].length > 0,
    );

    if (affectedDomainKeys.length === 0) {
      if (v6Scores.modelRiskState === 'VERIFIED_LOW_RISK') return 0;
      return null;
    }

    // For each affected domain: DomainBurden_d = (maxVerifiedSeverity / 10) ^ 1.8
    const domainBurdens: number[] = affectedDomainKeys.map((k) => {
      const maxSev = Math.max(...domainSeverities[k]);
      const normSev = Math.min(1.0, Math.max(0.1, maxSev / 10.0));
      return Math.pow(normSev, 1.8);
    });

    const maxDomainBurden = Math.max(...domainBurdens);
    const meanDomainBurden =
      domainBurdens.reduce((sum, b) => sum + b, 0) / domainBurdens.length;

    const aggregateBurden = 0.75 * maxDomainBurden + 0.25 * meanDomainBurden;
    const domainMultiplier = 1 + 0.20 * Math.min(2, affectedDomainKeys.length - 1);

    const qualitativePenalty = Math.round(50 * aggregateBurden * domainMultiplier);
    return Math.min(100, Math.max(0, qualitativePenalty));
  }

  private extractSeverityNumber(defect: any): number {
    if (typeof defect.severityNum === 'number' && defect.severityNum > 0) return defect.severityNum;
    if (typeof defect.severityScore === 'number' && defect.severityScore > 0) return defect.severityScore;
    if (typeof defect.severity === 'number' && defect.severity > 0) return defect.severity;

    const sevStr = String(defect.severityCategory || defect.severity || defect.riskLevel || '').toUpperCase().trim();
    if (sevStr === 'SAFETY_CRITICAL' || sevStr === 'CRITICAL') return 10;
    if (sevStr === 'MAJOR_POWERTRAIN') return 9;
    if (sevStr === 'BREAKDOWN' || sevStr === 'HIGH' || sevStr === 'YÜKSEK') return 8;
    if (sevStr === 'DRIVABILITY' || sevStr === 'MEDIUM' || sevStr === 'ORTA') return 5;
    if (sevStr === 'FUNCTIONAL_MINOR' || sevStr === 'LOW' || sevStr === 'DÜŞÜK') return 3;
    if (sevStr === 'COSMETIC') return 1;

    // Do NOT fabricate severity penalty if no grounded severity exists
    return 0;
  }

  private resolveDomainKey(defect: any): string {
    const text = `${defect.title || ''} ${defect.description || ''} ${defect.system || ''}`.toLowerCase();
    if (text.includes('şanzıman') || text.includes('kavrama') || text.includes('dsg') || text.includes('gearbox')) return 'POWERTRAIN_TRANS';
    if (text.includes('batarya') || text.includes('iccu') || text.includes('inverter') || text.includes('bms')) return 'HV_BATTERY_SYSTEM';
    if (text.includes('soğutma') || text.includes('termostat') || text.includes('radyatör') || text.includes('hararet')) return 'THERMAL_COOLING';
    if (text.includes('dpf') || text.includes('egr') || text.includes('emisyon')) return 'EMISSIONS_EXHAUST';
    if (text.includes('elektronik') || text.includes('ekran') || text.includes('multimedya')) return 'ELECTRONICS_BODY';
    if (text.includes('süspansiyon') || text.includes('direksiyon') || text.includes('fren')) return 'CHASSIS_BRAKES';
    if (text.includes('geri çağırma') || text.includes('recall') || text.includes('kampanya')) return 'SAFETY_RECALL';
    return 'POWERTRAIN_ENGINE';
  }

  private buildDeterministicExplanation(params: {
    v6Scores: VehicleReportScoresV6;
    scope: TorqueScoutDecisionScoreV1['scope'];
    modelDecisionRisk: number | null;
    qualitativePenalty: number | null;
    conditionRiskUsed: number | null;
    confidenceScore: number;
    priceModifierUsed: number;
    score: number | null;
    state: TorqueScoutDecisionScoreV1['state'];
  }): TorqueScoutDecisionScoreV1['explanation'] {
    const { v6Scores, scope, modelDecisionRisk, qualitativePenalty, conditionRiskUsed, confidenceScore, priceModifierUsed } = params;

    // Model Risk Explanation
    let modelRiskExp = '';
    if (v6Scores.modelRiskState === 'VERIFIED_LOW_RISK') {
      modelRiskExp = 'Doğrulanmış bağımsız araştırmada modele özgü kronik arıza kaydına rastlanmadı; düşük model riski sertifikalandı.';
    } else if (v6Scores.modelRiskQuantification === 'QUALITATIVE_ONLY') {
      modelRiskExp = `Doğrulanmış kronik risk mevcut (Niteliksel Karar Düzeltmesi: ${qualitativePenalty}/100). Arıza sıklığı kantitatif olarak bilinmediği için uydurma frekans yerine doğrudan teknik arıza şiddeti esas alındı.`;
    } else if (v6Scores.modelRiskQuantification === 'PARTIAL_LOWER_BOUND') {
      modelRiskExp = `Kısmen sayısallaştırılmış kronik risk ve niteliksel arıza mevcuttur. Muhafazakar karar prensibi gereği üst sınır yükü (${modelDecisionRisk}/100) uygulandı.`;
    } else if (v6Scores.modelRiskQuantification === 'FULLY_QUANTIFIED') {
      modelRiskExp = `Model seviyesi kronik risk yükü (${modelDecisionRisk}/100) saha arıza istatistikleri ve servis bültenleri üzerinden tam sayısallaştırılmıştır.`;
    } else {
      modelRiskExp = 'Model seviyesi güvenilirlik verisi henüz yeterli kanıt derinliğine ulaşmadı.';
    }

    // Condition Explanation
    let conditionExp = '';
    if (scope === 'VARIANT') {
      conditionExp = 'Spesifik araç ekspertiz veya kondisyon verisi girilmedi; bu değerlendirme varyant genel karakteristiğini yansıtmaktadır.';
    } else if (conditionRiskUsed === 0) {
      conditionExp = 'Araç ekspertiz, hasar, bakım ve teşhis kayıtları temiz ve doğrulanmış durumdadır (Kusursuz kondisyon, 0 risk puanı).';
    } else if (conditionRiskUsed !== null && conditionRiskUsed > 0) {
      conditionExp = `Araç kondisyonunda doğrulanmış kusur veya bakım açığı tespit edildi (Kondisyon Riski: ${conditionRiskUsed}/100).`;
    } else {
      conditionExp = 'Araç kondisyon verisi kısmi veya belirsizdir.';
    }

    // Confidence Explanation ("Analiz Veri Güveni")
    let confidenceExp = '';
    if (confidenceScore >= 75) {
      confidenceExp = `Yüksek analiz veri güveni (${confidenceScore}/100). Model değerlendirmesi güçlü ve derin kanıt tabanına dayanmaktadır.`;
    } else if (confidenceScore >= 40) {
      confidenceExp = `Standart analiz veri güveni (${confidenceScore}/100). Model değerlendirmesi bağımsız bülten ve katalog verilerine dayanmaktadır.`;
    } else {
      confidenceExp = 'Bu araç hakkında çeşitli arıza ve kullanıcı bildirimleri bulunabilir; ancak bunların sıklığını ve bu araç varyantına uygulanabilirliğini güvenilir şekilde doğrulayamadığımız için yanıltıcı bir puan vermiyoruz.';
    }

    // Price Explanation
    let priceExp = '';
    if (priceModifierUsed > 0) {
      priceExp = `Piyasa fiyat avantajı karar puanına +${priceModifierUsed} puan pozitif katkı sağladı.`;
    } else if (priceModifierUsed < 0) {
      priceExp = `Fiyat veya değer dengesizliği karar puanına ${priceModifierUsed} puan negatif düzeltme uyguladı.`;
    } else {
      priceExp = 'Fiyat düzeltmesi uygulanmadı (nötr piyasa seviyesi).';
    }

    return {
      modelRisk: modelRiskExp,
      condition: conditionExp,
      confidence: confidenceExp,
      price: priceExp,
    };
  }
}
