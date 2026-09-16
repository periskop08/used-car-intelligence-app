import { Injectable, Logger } from '@nestjs/common';
import {
  CanonicalRiskDefect,
  DeductedRiskItem,
  TorqueScoutDecisionScoreV1,
  VehicleReportScoresV6,
} from '@used-car-intelligence/shared';

export interface DecisionScoreCalculationInput {
  v6Scores: VehicleReportScoresV6;
  qualitativeDefects?: any[];
  recalls?: any[];
  priceModifier?: number;
  canonicalRisks?: CanonicalRiskDefect[];
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
    const { v6Scores, qualitativeDefects = [], recalls = [], priceModifier = 0, canonicalRisks = [] } = input;

    // 1. Evaluate Canonical / Qualitative Risks via 5-Tier Impact & 3-Tier Evidence Engine
    const { totalRiskPenalty, deduplicatedRisks, verifiedRisks } = this.calculateAdditiveRiskPenalties(
      canonicalRisks,
      qualitativeDefects,
      recalls,
      v6Scores,
    );

    const isInsufficient =
      v6Scores.modelRiskState === 'INSUFFICIENT_RESEARCH' && totalRiskPenalty === 0;

    const modelDecisionRisk = isInsufficient ? null : totalRiskPenalty;

    // 2. Determine Scope & Final Score (Base 100, additive deductions)
    const hasEligibleCondition =
      v6Scores.vehicleConditionRisk !== null &&
      v6Scores.conditionCoverageScore >= 35;

    let score: number | null = null;
    let scope: TorqueScoutDecisionScoreV1['scope'] = 'INSUFFICIENT_DATA';
    let limitingReason: string | null = null;
    let conditionRiskUsed: number | null = null;

    // Price modifier bounded to [-15, +10]
    const clampedPriceModifier = Math.min(10, Math.max(-15, Math.round(priceModifier)));

    if (isInsufficient) {
      score = null;
      scope = 'INSUFFICIENT_DATA';
      limitingReason = 'Bu araç varyantı için güvenilirlik araştırması henüz tamamlanmadı.';
    } else if (!hasEligibleCondition) {
      // VARIANT-level score (Pure technical risk model: 100 - totalRiskPenalty)
      scope = 'VARIANT';
      conditionRiskUsed = null;

      const rawVariantScore = 100 - totalRiskPenalty;
      score = Math.round(Math.min(100, Math.max(15, rawVariantScore)));
    } else {
      // VEHICLE-specific score (Combined technical & vehicle condition + price modifier)
      scope = 'VEHICLE';
      conditionRiskUsed = v6Scores.vehicleConditionRisk;

      const baseVehicleScore = 100 - (0.45 * totalRiskPenalty + 0.55 * (v6Scores.vehicleConditionRisk ?? 0));
      const adjustedScore = baseVehicleScore + clampedPriceModifier;

      score = Math.round(Math.min(100, Math.max(15, adjustedScore)));
    }

    // 3. Map State Recommendation Band with Guardrails
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

    // Critical Defect Recommendation Guardrail:
    // If vehicle has any verified STRONG + CRITICAL risk (e.g. engine destruction, fire hazard, brake loss),
    // recommendation state CANNOT be GOOD or EXCELLENT regardless of score!
    const strongCriticalRisks = deduplicatedRisks.filter(
      (r) => r.evidenceLevel === 'STRONG' && r.impactClass === 'CRITICAL',
    );
    if (strongCriticalRisks.length >= 2) {
      state = 'AVOID';
    } else if (strongCriticalRisks.length === 1) {
      if (state === 'EXCELLENT' || state === 'GOOD') {
        state = 'CAUTION';
      }
    }

    // 4. Deterministic Explanations
    const explanation = this.buildDeterministicExplanation({
      v6Scores,
      scope,
      modelDecisionRisk,
      qualitativePenalty: totalRiskPenalty,
      conditionRiskUsed,
      confidenceScore: v6Scores.confidenceScore,
      priceModifierUsed: clampedPriceModifier,
      score,
      state,
    });

    const deductedRisks: DeductedRiskItem[] = deduplicatedRisks
      .filter((r) => (r.netDeduction ?? 0) > 0)
      .map((r) => ({
        id: r.id,
        title: r.title,
        normalizedFailureMode: r.normalizedFailureMode,
        domain: r.domain,
        severity: r.severity,
        severityBasis: r.severityBasis,
        impactClass: r.impactClass,
        evidenceLevel: r.evidenceLevel,
        basePenalty: r.basePenalty,
        evidenceMultiplier: r.evidenceMultiplier,
        netDeduction: r.netDeduction,
        inspectionInstruction: r.inspectionInstruction,
        reason: r.description || r.severityBasis || r.title,
        sources: r.sources,
        inferredConsequence: r.inferredConsequence,
        reasoningChain: r.reasoningChain,
        supportingFactIds: r.supportingFactIds,
        inferenceBasis: r.inferenceBasis,
        inferenceConfidence: r.inferenceConfidence,
      }));

    return {
      version: 'v1.0',
      score,
      scope,
      state,
      modelDecisionRisk,
      totalRiskPenalty,
      qualitativeSeverityBurden: totalRiskPenalty,
      conditionRiskUsed,
      confidenceScore: v6Scores.confidenceScore,
      priceModifierUsed: clampedPriceModifier,
      limitingReason,
      deductedRisks,
      verifiedRisks,
      explanation,
    };
  }

  /**
   * 5-Tier Impact & 3-Tier Evidence Additive Deduction Engine.
   * Calculates transparent point deductions with root-cause deduplication.
   */
  private calculateAdditiveRiskPenalties(
    canonicalRisks: CanonicalRiskDefect[] = [],
    qualitativeDefects: any[] = [],
    recalls: any[] = [],
    v6Scores: VehicleReportScoresV6,
  ): {
    totalRiskPenalty: number;
    deduplicatedRisks: CanonicalRiskDefect[];
    verifiedRisks: CanonicalRiskDefect[];
  } {
    // 1. Collect all candidates
    const candidates: CanonicalRiskDefect[] = [];

    if (canonicalRisks && canonicalRisks.length > 0) {
      candidates.push(...canonicalRisks);
    } else {
      // Fallback from qualitative defects & recalls
      const allQual = [
        ...(Array.isArray(qualitativeDefects) ? qualitativeDefects : []),
        ...(Array.isArray(recalls) ? recalls : []),
      ];
      allQual.forEach((d: any) => {
        if (d.numericEligibility === 'REJECTED') return;
        if (d.scoringEligible === false) return;
        if (d.advisoryOnly === true) return;
        // Filter out unverified complaints and user observations
        if (d.problemType === 'REPORTED_COMPLAINT' || d.problemType === 'OBSERVED_BEHAVIOR') return;
        if (this.isNonMechanicalCosmeticRisk(d)) return;

        const dKey = d.domain || this.resolveDomainKey(d);
        const sev = this.extractSeverityNumber(d);
        const rawKey = (d.normalizedFailureMode || d.failureMode || d.title || '').trim().toUpperCase();
        candidates.push({
          id: `CANONICAL:${dKey}:${rawKey || 'DEFECT'}`,
          lifecycleState: 'SCORING_ELIGIBLE',
          normalizedFailureMode: rawKey || 'DEFECT',
          title: d.title || 'Doğrulanmış Teknik Kusur',
          description: d.description || d.severityBasis,
          domain: dKey as any,
          affectedComponent: d.affectedComponent || dKey,
          applicabilityState: d.applicabilityState || 'EXACT',
          verificationState: d.verificationState || 'VERIFIED',
          consequenceState: 'RESEARCHED_GROUNDED',
          severity: sev,
          severityBasis: d.severityBasis || 'GROUNDED_RESEARCH',
          scoringEligible: true,
          sources: d.linkedSources || [],
          inspectionInstruction: d.inspectionInstructions?.[0] || d.inspectionInstruction,
        });
      });
    }

    // 2. Classify each candidate: ImpactClass & EvidenceLevel
    candidates.forEach((cr) => {
      cr.impactClass = this.resolveImpactClass(cr);
      cr.evidenceLevel = this.resolveEvidenceLevel(cr);
      cr.basePenalty = this.getBasePenaltyForImpact(cr.impactClass);
      cr.evidenceMultiplier = this.getEvidenceMultiplier(cr.evidenceLevel);
      cr.netDeduction = Math.round(cr.basePenalty * cr.evidenceMultiplier);
    });

    // 3. Root-Cause Deduplication
    // Group by root cause (Domain + Component + FailureMode cluster)
    const rootCauseMap = new Map<string, CanonicalRiskDefect>();

    candidates.forEach((cr) => {
      const compNorm = (cr.affectedComponent || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const modeNorm = (cr.normalizedFailureMode || cr.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rootKey = `${cr.domain}:${compNorm || modeNorm}`;

      const existing = rootCauseMap.get(rootKey);
      if (!existing) {
        rootCauseMap.set(rootKey, cr);
      } else {
        // Keep the candidate with higher net deduction
        if ((cr.netDeduction ?? 0) > (existing.netDeduction ?? 0)) {
          rootCauseMap.set(rootKey, cr);
        }
      }
    });

    const deduplicatedRisks = Array.from(rootCauseMap.values());

    // 4. Clean Additive Sum (Capped at 85 to guarantee min score floor of 15)
    const sumDeductions = deduplicatedRisks.reduce((acc, r) => acc + (r.netDeduction ?? 0), 0);
    const totalRiskPenalty = Math.min(85, Math.max(0, sumDeductions));

    // Verified risks for transparent report listing
    const verifiedRisks = candidates.filter(
      (r) =>
        r.verificationState === 'VERIFIED' ||
        r.verificationState === 'TIER1_OFFICIAL' ||
        r.verificationState === 'TIER2_CROSS_REFERENCED' ||
        (r.sources && r.sources.length > 0),
    );

    return {
      totalRiskPenalty,
      deduplicatedRisks,
      verifiedRisks,
    };
  }

  /**
   * Resolves the 5-Tier Impact Class based on grounded consequence semantics.
   */
  resolveImpactClass(cr: CanonicalRiskDefect): 'MINOR' | 'MODERATE' | 'SERIOUS' | 'MAJOR_REPAIR' | 'CRITICAL' {
    if (cr.impactClass) return cr.impactClass;

    if (this.isNonMechanicalCosmeticRisk(cr)) {
      return 'MINOR';
    }

    const text = `${cr.title || ''} ${cr.normalizedFailureMode || ''} ${cr.severityBasis || ''} ${cr.inferredConsequence || ''} ${cr.description || ''} ${cr.reasoningChain || ''}`.toLowerCase();

    // 1. CRITICAL (-25): Safety critical, engine destruction, fire, total brake assist loss
    if (
      (cr.severityCategory as string) === 'SAFETY_CRITICAL' ||
      text.includes('yangın') ||
      text.includes('fire') ||
      text.includes('fren vakum') ||
      text.includes('brake assist') ||
      text.includes('oil starvation') ||
      text.includes('yağ süzgeci') ||
      text.includes('motor kırma') ||
      text.includes('catastrophic') ||
      text.includes('engine destruction') ||
      text.includes('engine failure') ||
      text.includes('rollaway')
    ) {
      return 'CRITICAL';
    }

    // 2. MAJOR_REPAIR (-18): Breakdown, limp mode, transmission lockout, pressure loss, timing chain jump
    if (
      (cr.severityCategory as string) === 'BREAKDOWN' ||
      cr.severityCategory === 'MAJOR_POWERTRAIN' ||
      text.includes('limp') ||
      text.includes('lockout') ||
      text.includes('acil mod') ||
      text.includes('pressure loss') ||
      text.includes('basınç kaybı') ||
      text.includes('yolda kalma') ||
      text.includes('chain elongation') ||
      text.includes('chain slack') ||
      text.includes('zincir uzama') ||
      text.includes('akümülatör') ||
      text.includes('accumulator') ||
      text.includes('hpfp')
    ) {
      return 'MAJOR_REPAIR';
    }

    // 3. SERIOUS (-12): Severe functional, drivability, clutch shudder/slip, noticeable vibration
    if (
      cr.severityCategory === 'DRIVABILITY' ||
      (cr.severityCategory as string) === 'FUNCTIONAL_SEVERE' ||
      text.includes('judder') ||
      text.includes('titreme') ||
      text.includes('kavrama kaçırma') ||
      text.includes('clutch slip') ||
      text.includes('hesitation') ||
      text.includes('silkeleme') ||
      text.includes('lining wear') ||
      text.includes('kuru çift kavrama') ||
      text.includes('dry-clutch') ||
      text.includes('dq200') ||
      text.includes('shudder')
    ) {
      return 'SERIOUS';
    }

    // 4. MODERATE (-7): Early wear, thermostat/water pump seepage, sensor, auxiliary fault
    if (
      (cr.severityCategory as string) === 'FUNCTIONAL_MODERATE' ||
      text.includes('sızıntı') ||
      text.includes('leak') ||
      text.includes('seepage') ||
      text.includes('termostat') ||
      text.includes('thermostat') ||
      text.includes('su pompası') ||
      text.includes('water pump') ||
      text.includes('terleme') ||
      text.includes('sensor') ||
      text.includes('buji')
    ) {
      return 'MODERATE';
    }

    // 5. MINOR (-3): Cosmetic, interior trim vibration, infotainment screen lag
    if (
      cr.severityCategory === 'FUNCTIONAL_MINOR' ||
      cr.severityCategory === 'COSMETIC' ||
      text.includes('trim') ||
      text.includes('fitil') ||
      text.includes('multimedya') ||
      text.includes('infotainment') ||
      text.includes('gıcırtı') ||
      text.includes('ekran') ||
      text.includes('cosmetic')
    ) {
      return 'MINOR';
    }

    // Fallback by numeric severity if available
    const sev = cr.severity ?? 0;
    if (sev >= 9) return 'CRITICAL';
    if (sev >= 7) return 'MAJOR_REPAIR';
    if (sev >= 5) return 'SERIOUS';
    if (sev >= 3) return 'MODERATE';
    return 'MINOR';
  }

  /**
   * Resolves the 3-Tier Evidence Level based on applicability & verification provenance.
   */
  resolveEvidenceLevel(cr: CanonicalRiskDefect): 'WEAK' | 'MODERATE' | 'STRONG' {
    if (cr.evidenceLevel && cr.evidenceLevel !== 'WEAK') return cr.evidenceLevel;

    // Cosmetic campaigns are never mechanical penalties
    if (this.isNonMechanicalCosmeticRisk(cr)) {
      return 'WEAK';
    }

    // Incompatible or foreign market-uncertain recalls -> WEAK (0 penalty)
    if (cr.applicabilityState === 'MARKET_UNCERTAIN' || cr.applicabilityState === 'INCOMPATIBLE') {
      return 'WEAK';
    }

    // Official TSB / Recall / Cross-referenced teardown with exact or proven family applicability -> STRONG
    const hasOfficialSources = (cr.sources || []).some(
      (s) => s.tier === 'TIER_1' || s.tier === 'TIER_2' || s.tier === 1 || s.tier === 2,
    );

    if (
      (cr.verificationState === 'TIER1_OFFICIAL' || cr.verificationState === 'TIER2_CROSS_REFERENCED' || hasOfficialSources) &&
      (cr.applicabilityState === 'EXACT' ||
        cr.applicabilityState === 'EXACT_MATCH' ||
        (cr.applicabilityState === 'FAMILY_MATCH' && cr.applicabilityEvidence?.includes('Proven shared component')))
    ) {
      return 'STRONG';
    }

    // Shared component architecture with established chronic field vulnerability (e.g. DQ200 on Golf 7 / Audi A3, PureTech wet belt, VAG EA211 water pump) -> MODERATE
    const text = `${cr.title || ''} ${cr.normalizedFailureMode || ''} ${cr.affectedComponent || ''} ${cr.description || ''}`.toLowerCase();
    const isSharedComponentVulnerability =
      (cr.applicabilityState === 'FAMILY_MATCH' && cr.applicabilityEvidence?.includes('Proven shared component')) ||
      text.includes('dq200') ||
      text.includes('kuru çift kavrama') ||
      text.includes('kuru kavrama') ||
      text.includes('dual_clutch') ||
      text.includes('wet_belt') ||
      text.includes('wet belt') ||
      text.includes('yağ içi triger') ||
      text.includes('mekatronik') ||
      text.includes('mechatronic') ||
      text.includes('devirdaim') ||
      text.includes('su pompası') ||
      text.includes('water pump') ||
      text.includes('termostat');

    if (isSharedComponentVulnerability) {
      return 'MODERATE';
    }

    // Verified defect with grounded consequence -> MODERATE
    if (cr.verificationState === 'VERIFIED' && cr.scoringEligible) {
      return 'MODERATE';
    }

    // Uncorroborated forum rumour, cosmetic, or insufficient evidence -> WEAK
    return 'WEAK';
  }

  /**
   * Identifies non-mechanical cosmetic, interior trim, label/manual, or auxiliary campaigns
   * that must NEVER deduct points from the vehicle buyability score.
   */
  isNonMechanicalCosmeticRisk(defect: any): boolean {
    if (!defect) return false;
    const text = `${defect.title || ''} ${defect.normalizedFailureMode || ''} ${defect.affectedComponent || ''} ${defect.description || ''} ${defect.severityBasis || ''} ${defect.inferredConsequence || ''} ${defect.reason || ''}`.toLowerCase();

    const isCosmeticOrTrim =
      text.includes('seat adjustment switch') ||
      text.includes('seat frame trim') ||
      text.includes('seat trim panel') ||
      text.includes('koltuk ayar') ||
      text.includes('koltuk plastik') ||
      text.includes('düğme kapak') ||
      text.includes('switch trim') ||
      text.includes('glovebox') ||
      text.includes('torpido mandal') ||
      text.includes('sun visor') ||
      text.includes('güneşlik') ||
      text.includes('tire placard') ||
      text.includes('lastik etiketi') ||
      text.includes('owner manual') ||
      text.includes('kullanım kılavuz') ||
      text.includes('washer fluid cap') ||
      text.includes('silecek lastiği') ||
      text.includes('cup holder') ||
      text.includes('bardaklık') ||
      text.includes('floor mat') ||
      text.includes('paspas') ||
      text.includes('emblem') ||
      text.includes('logo yapışkan') ||
      text.includes('interior trim clip') ||
      text.includes('trim klips') ||
      text.includes('kapı döşeme klipsi') ||
      text.includes('tavan döşemesi') ||
      text.includes('boya soyulması') ||
      text.includes('far buğulanması');

    const isActuallyMechanicalOrSafety =
      text.includes('fren') ||
      text.includes('brake') ||
      text.includes('direksiyon') ||
      text.includes('steering') ||
      text.includes('motor') ||
      text.includes('engine') ||
      text.includes('şanzıman') ||
      text.includes('transmission') ||
      text.includes('kavrama') ||
      text.includes('clutch') ||
      text.includes('yangın') ||
      text.includes('fire') ||
      text.includes('airbag') ||
      text.includes('hava yastığı') ||
      text.includes('yakıt sızıntı') ||
      text.includes('fuel leak') ||
      text.includes('rollaway') ||
      text.includes('fren hidrolik') ||
      text.includes('triger') ||
      text.includes('timing chain') ||
      text.includes('timing belt');

    return isCosmeticOrTrim && !isActuallyMechanicalOrSafety;
  }

  getBasePenaltyForImpact(impact: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'MAJOR_REPAIR' | 'CRITICAL', cr?: CanonicalRiskDefect): number {
    if (cr && this.isNonMechanicalCosmeticRisk(cr)) {
      return 0;
    }
    switch (impact) {
      case 'CRITICAL':
        return 25;
      case 'MAJOR_REPAIR':
        return 18;
      case 'SERIOUS':
        return 12;
      case 'MODERATE':
        return 7;
      case 'MINOR':
        return 3;
      default:
        return 3;
    }
  }

  getEvidenceMultiplier(level: 'WEAK' | 'MODERATE' | 'STRONG'): number {
    switch (level) {
      case 'STRONG':
        return 1.0;
      case 'MODERATE':
        return 0.7;
      case 'WEAK':
        return 0.0;
      default:
        return 0.0;
    }
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

    // Model Risk Explanation (End-user friendly)
    let modelRiskExp = '';
    if (v6Scores.modelRiskState === 'VERIFIED_LOW_RISK') {
      modelRiskExp = 'Bu varyantta puan kırılmasına neden olan doğrulanmış önemli bir kronik teknik risk tespit edilmedi.';
    } else if (v6Scores.modelRiskQuantification === 'QUALITATIVE_ONLY') {
      modelRiskExp = `Doğrulanmış kronik arıza bildirimleri ve servis kayıtları doğrultusunda ${qualitativePenalty} puan teknik risk kesintisi uygulandı.`;
    } else if (v6Scores.modelRiskQuantification === 'PARTIAL_LOWER_BOUND') {
      modelRiskExp = `Doğrulanmış kronik arıza ve servis bültenleri doğrultusunda ${modelDecisionRisk} puan teknik risk kesintisi uygulandı.`;
    } else if (v6Scores.modelRiskQuantification === 'FULLY_QUANTIFIED') {
      modelRiskExp = `Doğrulanmış servis bültenleri ve arıza kayıtları doğrultusunda ${modelDecisionRisk} puan teknik risk kesintisi uygulandı.`;
    } else {
      modelRiskExp = 'Model seviyesi güvenilirlik verisi henüz yeterli kanıt derinliğine ulaşmadı.';
    }

    // Condition Explanation
    let conditionExp = '';
    if (scope === 'VARIANT') {
      conditionExp = 'Spesifik araç ekspertiz veya kondisyon verisi girilmedi; bu değerlendirme varyant genel karakteristiğini yansıtmaktadır.';
    } else if (conditionRiskUsed === 0) {
      conditionExp = 'Araç ekspertiz, hasar, bakım ve teşhis kayıtları temiz ve doğrulanmış durumdadır (0 puan ceza).';
    } else if (conditionRiskUsed !== null && conditionRiskUsed > 0) {
      conditionExp = `Araç kondisyonunda doğrulanmış kusur veya bakım açığı tespit edildi (${conditionRiskUsed} puan ceza).`;
    } else {
      conditionExp = 'Araç kondisyon verisi kısmi veya belirsizdir.';
    }

    // Confidence Explanation
    let confidenceExp = '';
    if (confidenceScore >= 75) {
      confidenceExp = 'Model değerlendirmesi güçlü ve derin doğrulanmış kanıt tabanına dayanmaktadır.';
    } else if (confidenceScore >= 40) {
      confidenceExp = 'Model değerlendirmesi bağımsız bülten ve katalog verilerine dayanmaktadır.';
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
