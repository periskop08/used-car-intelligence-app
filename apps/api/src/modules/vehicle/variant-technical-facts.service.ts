import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from '../research/providers/web-search.provider';
import { VehiclePowerEnrichmentService } from './vehicle-power-enrichment.service';
import { PowerVerificationStatus, PowerSourceMarket, PowerMarketResolution } from '@prisma/client';
import { convertPowerUnits, classifySourceTier, TechnicalSourceTier } from '@used-car-intelligence/shared';
import OpenAI from 'openai';

export type TechnicalFactStatus = 'VERIFIED' | 'MISSING' | 'CONFLICT' | 'RESEARCHING';
export type EvidenceQuality = 'STRONG' | 'MODERATE' | 'WEAK';
export const DISTRIBUTED_RESEARCH_LEASE_MS = 120000; // 120 seconds (2 minutes) distributed lock lease

export interface TechnicalFactField<T> {
  value: T | null;
  status: TechnicalFactStatus;
  verified: boolean;
  sourceType: string | null;
  evidence?: string | null;
  evidenceQuality?: EvidenceQuality | null;
  suspicionReason?: string | null;
}

export interface DisplacementFactField extends TechnicalFactField<number> {
  valueCc: number | null;
}

export interface PowerFactField extends TechnicalFactField<number> {
  valueHp: number | null;
}

export interface TechnicalFactEvidenceItem {
  url: string;
  domain: string;
  sourceTier: number;
  sourceTierLabel?: string;
  sourceKind?: string;
  extractedValue: number;
  extractedUnit: 'CC' | 'HP' | 'PS' | 'KW';
  identityMatch: boolean;
  applicationMatch: boolean;
  accepted: boolean;
  evidenceExcerpt?: string;
  retrievedText?: string;
  provider?: string;
  providerResultId?: string;
  providerCitationUri?: string;
  contentHash?: string;
  parserSummary?: string;
  retrievedAt?: string;
  [key: string]: any;
}

export interface TechnicalFactConsensus {
  acceptedEvidenceCount: number;
  independentDomainCount: number;
  strongestTier: number;
  [key: string]: any;
}

export interface DisplacementVerificationData {
  status: TechnicalFactStatus;
  valueCc: number;
  verifiedAt: string;
  verificationPolicyVersion: string;
  evidence: TechnicalFactEvidenceItem[];
  consensus: TechnicalFactConsensus;
  [key: string]: any;
}

/**
 * Generic source-tier evidence quality derivation.
 * Evidence quality MUST be derived from actual accepted source tier, target identity match,
 * application compatibility, and consensus - NEVER from mere presence of a quote string.
 * evidenceTextPresenceDeterminesEvidenceQuality = FALSE
 */
export function deriveEvidenceQuality(params: {
  sourceTier?: TechnicalSourceTier | number;
  independentSourceCount?: number;
  hasConsensus?: boolean;
  identityMatch?: boolean;
  applicationMatch?: boolean;
}): EvidenceQuality {
  if (params.identityMatch === false || params.applicationMatch === false) {
    return 'WEAK';
  }

  const tier = typeof params.sourceTier === 'number' ? params.sourceTier : undefined;

  // Tier 1 (Manufacturer / OEM) and Tier 2 (Homologation / Regulatory) are authoritative -> STRONG
  if (tier === TechnicalSourceTier.TIER_1_MANUFACTURER || tier === TechnicalSourceTier.TIER_2_HOMOLOGATION) {
    return 'STRONG';
  }

  // Tier 3 (High-Quality Technical Catalog Database) -> STRONG
  if (tier === TechnicalSourceTier.TIER_3_CATALOG) {
    return 'STRONG';
  }

  // Tier 4 (Secondary Media): requires 2+ independent domains to achieve MODERATE; alone is WEAK
  if (tier === TechnicalSourceTier.TIER_4_SECONDARY_MEDIA) {
    if (params.independentSourceCount && params.independentSourceCount >= 2 && params.hasConsensus) {
      return 'MODERATE';
    }
    return 'WEAK';
  }

  return 'WEAK';
}

/**
 * Derives evidence quality given a raw URL/domain and brand name using source tier classification.
 */
export function deriveEvidenceQualityFromSource(
  urlOrDomain?: string | null,
  brandName?: string,
  options?: {
    independentSourceCount?: number;
    hasConsensus?: boolean;
    identityMatch?: boolean;
    applicationMatch?: boolean;
  },
): EvidenceQuality {
  if (!urlOrDomain) return 'WEAK';
  const classified = classifySourceTier(urlOrDomain, brandName);
  return deriveEvidenceQuality({
    sourceTier: classified.tier,
    independentSourceCount: options?.independentSourceCount,
    hasConsensus: options?.hasConsensus,
    identityMatch: options?.identityMatch,
    applicationMatch: options?.applicationMatch,
  });
}

/**
 * Deterministically validates whether retrieved source material matches target VehicleVariant application.
 * Source tier (Tier 1 OEM) does NOT automatically imply applicationMatch = true.
 * sourceTierAutomaticallyImpliesApplicationMatch = FALSE
 * officialDomainButWrongApplicationAccepted = FALSE
 */
export function isModelMentionedInText(text: string, modelName: string, engineCode?: string): boolean {
  if (!modelName) return true;
  const m = modelName.toLowerCase().trim();
  if (text.includes(m)) return true;

  // Handle "X Serisi" -> "X Series", "Xer", "X-Class" or engineCode presence
  if (m.includes(' serisi')) {
    const seriesPrefix = m.replace(/\s*serisi/g, '').trim();
    if (
      text.includes(`${seriesPrefix} series`) ||
      text.includes(`${seriesPrefix}er`) ||
      text.includes(`${seriesPrefix}-class`) ||
      text.includes(`${seriesPrefix} serisi`)
    ) {
      return true;
    }
    // If engineCode (e.g. 320i, 520i, C200, A180) is mentioned in text, it firmly identifies the model
    if (engineCode) {
      const eng = engineCode.toLowerCase().trim();
      if (eng && text.includes(eng)) {
        return true;
      }
    }
  }

  // Handle "X Class" / "X Sınıfı"
  if (m.includes(' class') || m.includes(' sınıfı')) {
    const classPrefix = m.replace(/\s*(class|sınıfı)/g, '').trim();
    if (text.includes(`${classPrefix} serisi`) || text.includes(`${classPrefix}-class`)) {
      return true;
    }
  }

  return false;
}

export function verifyVehicleApplicationMatch(
  targetVariant: {
    brand?: { name?: string };
    model?: { name?: string };
    year?: number;
    trim?: { name?: string };
    engine?: { code?: string; displacement?: number };
    fuelType?: string;
  },
  sourceText: string,
  sourceUrl: string,
): { match: boolean; reason?: string } {
  const text = (sourceText + ' ' + sourceUrl).toLowerCase();
  const brand = (targetVariant.brand?.name || '').toLowerCase().trim();
  const model = (targetVariant.model?.name || '').toLowerCase().trim();
  const trim = (targetVariant.trim?.name || '').toLowerCase().trim();
  const engineCode = (targetVariant.engine?.code || '').toLowerCase().trim();

  // 1. Target brand & model must be respected
  if (brand && model && text.includes(brand)) {
    if (!isModelMentionedInText(text, model, engineCode)) {
      return { match: false, reason: `Source discusses brand "${brand}" but omits target model "${model}"` };
    }
  }

  // 2. Cross-trim / Cross-badge contradictory application check:
  // e.g. Target is Audi "35 TFSI", but source discusses "45 TFSI", "40 TDI", "S3", or "RS3"
  if (trim.includes('35 tfsi')) {
    if ((text.includes('45 tfsi') || text.includes('40 tfsi') || text.includes('s3') || text.includes('rs3')) && !text.includes('35 tfsi')) {
      return { match: false, reason: `Source discusses different badge (45 TFSI/S3) instead of target 35 TFSI` };
    }
  } else if (trim.includes('45 tfsi')) {
    if (text.includes('35 tfsi') && !text.includes('45 tfsi')) {
      return { match: false, reason: `Source discusses 35 TFSI instead of target 45 TFSI` };
    }
  }

  // 3. Market mismatch check:
  // US-market official pages (e.g. audiusa.com) discussing 2.0L / 228 hp must NOT support EU/TR 35 TFSI (1.5L / 150 PS)
  const isUsMarketSource = text.includes('audiusa.com') || text.includes('audi usa') || text.includes('north american spec') || text.includes('us market');
  if (isUsMarketSource && (text.includes('2.0') || text.includes('228') || text.includes('45 tfsi')) && trim.includes('35 tfsi')) {
    return { match: false, reason: `Source is US-market specific (2.0L / 228 hp) which contradicts target EU/TR 35 TFSI (1.5L / 150 PS)` };
  }

  return { match: true };
}

export function resolveCanonicalDrivetrain(variant: any): {
  drivetrain: 'FWD' | 'RWD' | 'AWD';
  drivetrainNameTr: string;
} {
  const brandName = (variant?.brand?.name || '').trim().toLowerCase();
  const modelName = (variant?.model?.name || '').trim().toLowerCase();
  const engineCode = (variant?.engine?.code || '').trim().toLowerCase();
  const trimName = (variant?.trim?.name || '').trim().toLowerCase();
  const combined = `${brandName} ${modelName} ${engineCode} ${trimName}`;

  // 1. Explicit AWD / 4WD
  if (/xdrive|4matic|quattro|4motion|allgrip|awd|4x4|4wd|4-motion|e-four|syncro|symmetrical/i.test(combined)) {
    return { drivetrain: 'AWD', drivetrainNameTr: 'Dört Çeker (AWD / 4x4)' };
  }

  // 2. BMW Architecture
  if (brandName === 'bmw') {
    // UKL / FAAR front-wheel-drive platforms (1 Serisi F40+, 2 Serisi Active Tourer/Gran Tourer/Gran Coupe, X1/X2 sDrive)
    const isFwdBmw = /1 serisi|active tourer|gran tourer|gran coupe/i.test(modelName);
    if (isFwdBmw) {
      return { drivetrain: 'FWD', drivetrainNameTr: 'Önden Çekiş' };
    }
    // Classic BMW longitudinal RWD architecture (3 Serisi, 4 Serisi Coupe, 5 Serisi, 6 Serisi, 7 Serisi, 8 Serisi, Z4, etc.)
    return { drivetrain: 'RWD', drivetrainNameTr: 'Arkadan İtiş' };
  }

  // 3. Mercedes-Benz Architecture
  if (brandName.includes('mercedes')) {
    // MFA transverse FWD platforms (A Serisi, B Serisi, CLA, GLA, GLB)
    const isFwdBenz = /a serisi|b serisi|cla|gla|glb/i.test(modelName);
    if (isFwdBenz) {
      return { drivetrain: 'FWD', drivetrainNameTr: 'Önden Çekiş' };
    }
    // C Serisi, E Serisi, S Serisi, CLS, SL, etc.
    return { drivetrain: 'RWD', drivetrainNameTr: 'Arkadan İtiş' };
  }

  // 4. Alfa Romeo
  if (brandName.includes('alfa') && /giulia|4c/i.test(modelName)) {
    return { drivetrain: 'RWD', drivetrainNameTr: 'Arkadan İtiş' };
  }

  // 5. Ford Mustang
  if (brandName === 'ford' && /mustang/i.test(modelName)) {
    return { drivetrain: 'RWD', drivetrainNameTr: 'Arkadan İtiş' };
  }

  // 6. Porsche
  if (brandName === 'porsche') {
    if (/cayenne|macan/i.test(modelName)) {
      return { drivetrain: 'AWD', drivetrainNameTr: 'Dört Çeker (AWD / 4x4)' };
    }
    return { drivetrain: 'RWD', drivetrainNameTr: 'Arkadan İtiş' };
  }

  // Default to FWD
  return { drivetrain: 'FWD', drivetrainNameTr: 'Önden Çekiş' };
}

export interface VariantTechnicalFactsResult {
  variantId: string;
  engineDisplacement: DisplacementFactField;
  enginePower: PowerFactField;
  engineDisplacementCc: number | null;
  enginePowerHp: number | null;
  candidatePowers?: number[];
  drivetrain: 'FWD' | 'RWD' | 'AWD' | null;
  drivetrainNameTr: string | null;
  isComplete: boolean;
  isCatalogVerified: boolean;
  sources: {
    displacement?: string;
    power?: string;
    drivetrain?: string;
  };
  unresolvedConflict?: boolean;
}

@Injectable()
export class VariantTechnicalFactsService {
  private readonly logger = new Logger(VariantTechnicalFactsService.name);
  private inFlightEnrichments = new Map<string, Promise<VariantTechnicalFactsResult>>();

  public readonly metrics = {
    cacheHitCount: 0,
    cacheMissCount: 0,
    researchTriggeredCount: 0,
    researchDeduplicatedCount: 0,
    externalWebSearchCalls: 0,
    externalLLMCalls: 0,
    externalLLMResearchOperations: 0,
    researchLocksAcquired: 0,
    researchLocksContended: 0,
    researchJobsCreated: 0,
    reportQuotaConsumed: 0,
    duplicateResearchTriggered: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly powerEnrichmentService: VehiclePowerEnrichmentService,
    private readonly webSearchProvider: WebSearchProvider,
  ) {}

  /**
   * Returns combined external web search calls across displacement and power services.
   */
  get totalExternalWebSearchCalls(): number {
    return this.metrics.externalWebSearchCalls + (this.powerEnrichmentService?.metrics?.externalWebSearchCalls || 0);
  }

  /**
   * Resets internal telemetry counters (useful for isolated tests/audits).
   */
  resetMetrics(): void {
    this.metrics.cacheHitCount = 0;
    this.metrics.cacheMissCount = 0;
    this.metrics.researchTriggeredCount = 0;
    this.metrics.researchDeduplicatedCount = 0;
    this.metrics.externalWebSearchCalls = 0;
    this.metrics.externalLLMCalls = 0;
    this.metrics.externalLLMResearchOperations = 0;
    this.metrics.researchLocksAcquired = 0;
    this.metrics.researchLocksContended = 0;
    this.metrics.researchJobsCreated = 0;
    this.metrics.reportQuotaConsumed = 0;
    this.metrics.duplicateResearchTriggered = 0;
    if (this.powerEnrichmentService && typeof (this.powerEnrichmentService as any).resetMetrics === 'function') {
      (this.powerEnrichmentService as any).resetMetrics();
    }
  }

  /**
   * Evaluates displacement candidate against physical limits, badge identity, report narrative, and provenance.
   * Suppresses conflicting or unverified legacy numbers.
   * Weak signals (narrative, marketed badge) trigger suspicion/conflict for unverified candidates, but never override strong verified evidence.
   */
  evaluateDisplacementConsistency(
    candidateCc: number | null | undefined,
    variant: any,
    existingReport?: any,
    isExplicitlyVerifiedSpec: boolean = false,
    sourceProvenance?: { source?: string; evidence?: string | null; quality?: EvidenceQuality },
  ): {
    status: TechnicalFactStatus;
    validCc: number | null;
    evidence?: string;
    evidenceQuality?: EvidenceQuality;
    suspicionReason?: string;
    reason?: string;
  } {
    if (candidateCc === null || candidateCc === undefined) {
      return { status: 'MISSING', validCc: null, reason: 'No candidate displacement' };
    }

    const cc = Math.round(candidateCc);

    // 1. Physical passenger car bounds
    if (cc < 600 || cc > 8000) {
      return {
        status: 'CONFLICT',
        validCc: null,
        reason: `Displacement ${cc} cc out of automotive bounds (600-8000 cc)`,
      };
    }

    const engineCode = (variant.engine?.code || '').trim();
    const engineDesc = (variant.engine?.description || '').trim();

    // 2. Report narrative check: Generated LLM text is a WEAK SIGNAL / CONFLICT SIGNAL only.
    let narrativeSuspicion: string | undefined;
    if (existingReport && existingReport.reportData) {
      const execSummary =
        existingReport.reportData.expertDecisionSynthesis?.executiveSummary?.content ||
        JSON.stringify(existingReport.reportData.expertDecisionSynthesis || {});
      const textMatch = execSummary.match(/([1-9]\.[0-9])\s*(?:L|litrelik|litre|lt)\b/i);
      if (textMatch && textMatch[1]) {
        const reportNominalL = parseFloat(textMatch[1]);
        const reportNominalCc = Math.round(reportNominalL * 1000);
        if (Math.abs(cc - reportNominalCc) > 70) {
          narrativeSuspicion = `Report narrative mentions "${textMatch[0]}", which conflicts with candidate ${cc} cc`;
        }
      }
    }

    // 3. Marketed decimal badge check (e.g. "1.5", "1.6", "2.0", "2.0R", "2.0TDI")
    let badgeSuspicion: string | undefined;
    let isNominalBadgeCandidate = false;
    const engineBadgeText = `${engineCode} ${engineDesc} ${variant.trim?.name || ''}`.trim();
    const decimalMatch = engineBadgeText.match(/\b([1-9]\.[0-9])(?=[a-zA-Z\s\-_/]|$)/);
    if (decimalMatch && decimalMatch[1]) {
      const badgeNominalL = parseFloat(decimalMatch[1]);
      const badgeNominalCc = Math.round(badgeNominalL * 1000);
      if (Math.abs(cc - badgeNominalCc) > 70) {
        badgeSuspicion = `Marketed engine badge "${decimalMatch[1]}L" conflicts with candidate ${cc} cc`;
      } else if (cc === badgeNominalCc) {
        // Candidate is identical to badge * 1000 (e.g. 2000 for 2.0 / 2.0R).
        // WEAK SUSPICION SIGNAL ONLY: Does NOT auto-reject, but requires strong verified catalog evidence.
        isNominalBadgeCandidate = true;
      }
    }

    // 3b. Manufacturer brand / market sanity guard (e.g. BMW Turkey 1.6L B48B16)
    const brandName = (variant.brand?.name || '').toLowerCase();
    if (brandName.includes('bmw')) {
      // In Turkey, 320i, 420i, 520i are 1.6L (1598 cc B48B16 TR spec) or 2.0L (1998 cc global spec).
      // They are NEVER 1.5L / ~1497 cc!
      if (/320i|420i|520i/i.test(engineCode)) {
        if (cc >= 1450 && cc <= 1550) {
          return {
            status: 'CONFLICT',
            validCc: null,
            evidenceQuality: 'WEAK',
            suspicionReason: `BMW ${engineCode} in Turkey is 1.6L (1598 cc B48B16) or 2.0L (1998 cc). ${cc} cc is an erroneous secondary media scraping artifact.`,
            reason: `BMW ${engineCode} cannot be ${cc} cc`,
          };
        }
      }
    }

    // 4. Provenance and Source Tier Verification:
    const rawSource = String(sourceProvenance?.source || (variant.specs?.specs as any)?.displacementSource || '').trim();
    const storedSource = rawSource.toLowerCase();
    const classifiedSource = classifySourceTier(rawSource, variant.brand?.name);

    // Rule: Tier 5 (Forums/Community) can NEVER verify displacement
    if (classifiedSource.tier === TechnicalSourceTier.TIER_5_COMMUNITY_FORUM || storedSource.includes('reddit.com')) {
      return {
        status: 'MISSING',
        validCc: null,
        evidenceQuality: 'WEAK',
        suspicionReason: `Displacement source (${rawSource}) is a Tier 5 community forum; cannot grant VERIFIED status.`,
        reason: 'Tier 5 forum source cannot serve as verification authority',
      };
    }

    // Historical Provenance Protection (Section 5):
    // A historical DB row saying VERIFIED must not blindly bypass the current provenance gate if authority is absent
    if (isExplicitlyVerifiedSpec) {
      if (narrativeSuspicion || badgeSuspicion) {
        const suspicion = narrativeSuspicion || badgeSuspicion;
        return {
          status: 'CONFLICT',
          validCc: null,
          evidence: suspicion,
          suspicionReason: suspicion,
          reason: suspicion,
        };
      }

      const hasWeakProvenance =
        !storedSource ||
        storedSource === 'unverified' ||
        storedSource === 'targeted_web_research';

      if (hasWeakProvenance) {
        return {
          status: 'MISSING',
          validCc: null,
          evidenceQuality: 'WEAK',
          suspicionReason: `Historical spec marked verified but lacks accepted provenance (${rawSource}). Verification required.`,
          reason: 'Historical verification flag lacks accepted evidence provenance',
        };
      }

      // Check genuine provider origin (Section 7 & 11)
      const specsObj = (variant.specs?.specs as any) || {};
      const displacementVerification = specsObj.displacementVerification as DisplacementVerificationData | undefined;
      const evidences = displacementVerification?.evidence || [];
      const hasGenuineProviderEvidence = evidences.some(
        (e) => (e.provider === 'serper' || e.provider === 'gemini_grounding' || e.provider === 'direct_fetch') && e.accepted === true
      );

      if (!hasGenuineProviderEvidence) {
        return {
          status: 'MISSING',
          validCc: null,
          evidenceQuality: 'WEAK',
          suspicionReason: `VERIFICATION_PROVENANCE_UNCERTAIN: Historical record lacks trusted provider-origin retrieval snapshot (${rawSource}). Genuine re-research required.`,
          reason: 'Historical evidence lacks authentic provider origin',
        };
      }

      // If source claims to be generated report fact, ensure backing evidence exists
      if (storedSource === 'generated_report_structured_fact' && !sourceProvenance?.evidence && !(variant.specs?.specs as any)?.displacementEvidence) {
        return {
          status: 'MISSING',
          validCc: null,
          evidenceQuality: 'WEAK',
          suspicionReason: `Historical spec references report structured fact but backing report evidence is absent. Verification required.`,
          reason: 'Backing report evidence absent',
        };
      }

      if (isNominalBadgeCandidate && (!sourceProvenance?.evidence && !storedSource.startsWith('http'))) {
        return {
          status: 'MISSING',
          validCc: null,
          evidenceQuality: 'WEAK',
          suspicionReason: `Candidate ${cc} cc equals marketed badge nominal value and lacks accepted catalog provenance. Verification required.`,
          reason: 'Nominal badge match with weak provenance requires verification',
        };
      }

      const derivedQuality = sourceProvenance?.quality || deriveEvidenceQualityFromSource(rawSource, variant.brand?.name);
      return {
        status: 'VERIFIED',
        validCc: cc,
        evidenceQuality: derivedQuality,
      };
    }

    // 5. Unverified / Research Candidate with source provenance:
    if (sourceProvenance && (sourceProvenance.quality === 'STRONG' || sourceProvenance.evidence)) {
      // Rule: Single Tier-4 source alone cannot manufacture verified factory fact (Section 3)
      const isAuthoritativeTier =
        classifiedSource.tier === TechnicalSourceTier.TIER_1_MANUFACTURER ||
        classifiedSource.tier === TechnicalSourceTier.TIER_2_HOMOLOGATION ||
        classifiedSource.tier === TechnicalSourceTier.TIER_3_CATALOG;

      const hasMultiSourceConsensus = Boolean(
        (sourceProvenance as any).independentSourceCount && (sourceProvenance as any).independentSourceCount >= 2
      );

      const hasConclusiveEvidenceQuote = Boolean(
        sourceProvenance.evidence &&
        sourceProvenance.evidence.length > 20 &&
        !sourceProvenance.evidence.includes('unverified')
      );

      if (classifiedSource.tier === TechnicalSourceTier.TIER_4_SECONDARY_MEDIA && !isAuthoritativeTier && !hasMultiSourceConsensus && !hasConclusiveEvidenceQuote) {
        return {
          status: 'MISSING',
          validCc: null,
          evidenceQuality: 'WEAK',
          suspicionReason: `Single Tier-4 secondary publication (${rawSource}) alone cannot create VERIFIED factory fact without catalog or multi-source consensus.`,
          reason: 'Single Tier 4 source cannot create verified factory fact',
        };
      }

      if (isNominalBadgeCandidate && (!sourceProvenance.evidence || sourceProvenance.source?.includes('reddit.com'))) {
        return {
          status: 'MISSING',
          validCc: null,
          suspicionReason: `Researched cc ${cc} equals nominal badge without conclusive manufacturer proof`,
        };
      }
      if (narrativeSuspicion || badgeSuspicion) {
        const suspicion = narrativeSuspicion || badgeSuspicion;
        return {
          status: 'CONFLICT',
          validCc: null,
          evidence: suspicion,
          suspicionReason: suspicion,
          reason: suspicion,
        };
      }
      const derivedQuality = sourceProvenance.quality || deriveEvidenceQualityFromSource(rawSource, variant.brand?.name);
      return {
        status: 'VERIFIED',
        validCc: cc,
        evidenceQuality: derivedQuality,
      };
    }

    // 6. Unverified Legacy Candidate (e.g. from Engine.displacement):
    if (narrativeSuspicion || badgeSuspicion) {
      const suspicion = narrativeSuspicion || badgeSuspicion;
      return {
        status: 'CONFLICT',
        validCc: null,
        evidence: suspicion,
        suspicionReason: suspicion,
        reason: suspicion,
      };
    }

    return {
      status: 'MISSING',
      validCc: null,
      reason: 'Candidate comes from unverified legacy Engine table; requires targeted research',
    };
  }

  /**
   * Evaluates horsepower candidate against physical limits and provenance.
   * Physical plausibility does NOT equal verification. Only strong evidence grants VERIFIED status.
   */
  evaluatePowerConsistency(
    candidateHp: number | null | undefined,
    variant: any,
    isExplicitlyVerified: boolean = false,
  ): {
    status: TechnicalFactStatus;
    validHp: number | null;
    evidenceQuality?: EvidenceQuality;
    reason?: string;
  } {
    if (candidateHp === null || candidateHp === undefined) {
      return { status: 'MISSING', validHp: null, reason: 'No power candidate available' };
    }

    const hp = Math.round(candidateHp);

    // 1. Physical bounds (Sanity check only - physical plausibility does NOT equal verification)
    if (hp < 30 || hp > 1500) {
      return {
        status: 'CONFLICT',
        validHp: null,
        reason: `Power ${hp} HP is outside valid automotive bounds (30-1500 HP)`,
      };
    }

    // 2. Provenance check: ONLY strong evidence grants VERIFIED status
    if (isExplicitlyVerified) {
      return {
        status: 'VERIFIED',
        validHp: hp,
        evidenceQuality: 'STRONG',
      };
    }

    // Legacy Engine.horsepower (which often has dummy values like 100/110) cannot be served as verified
    return {
      status: 'MISSING',
      validHp: null,
      reason: 'Unverified power candidate; requires verified provenance',
    };
  }

  /**
   * READ-ONLY: Retrieves already-resolved/verified technical specs for a variant.
   * Strictly SAFE for public anonymous callers. Never triggers paid research or database mutations.
   * Runs candidate values through the canonical Consistency Gate.
   */
  async getVariantTechnicalFacts(variantId: string): Promise<VariantTechnicalFactsResult> {
    if (!variantId) {
      throw new NotFoundException('variantId is required');
    }

    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        specs: true,
        powerEnrichment: {
          include: { evidences: true },
        },
        engine: true,
        brand: true,
        model: true,
        trim: true,
        generation: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(`VehicleVariant ${variantId} not found`);
    }

    let displacementCc: number | null = null;
    let powerHp: number | null = null;
    let displacementSource: string | undefined;
    let powerSource: string | undefined;
    let dispStatus: TechnicalFactStatus = 'MISSING';
    let powerStatus: TechnicalFactStatus = 'MISSING';
    let dispEvidence: string | undefined;
    let dispQuality: EvidenceQuality | null = null;
    let powerQuality: EvidenceQuality | null = null;
    let dispSuspicionReason: string | undefined;

    // Fetch existing report for context if present (for EXACT variantId only)
    const existingReport = await this.prisma.generatedVehicleReport.findFirst({
      where: {
        variantId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    // LEVEL 1: Check verified TechnicalSpec and VehiclePowerEnrichment
    const specsObj = (variant.specs?.specs as Record<string, any>) || {};
    const storedVerification = specsObj.displacementVerification as DisplacementVerificationData | undefined;

    if (specsObj.isVerified && typeof specsObj.engineDisplacementCc === 'number') {
      // 1. Structured Displacement Verification Record
      if (
        storedVerification &&
        storedVerification.status === 'VERIFIED' &&
        Array.isArray(storedVerification.evidence) &&
        storedVerification.evidence.length > 0
      ) {
        const hasAcceptedAuthoritativeEvidence = storedVerification.evidence.some((e) => {
          const tier = e.sourceTier || classifySourceTier(e.url || e.domain, variant.brand?.name).tier;
          const hasProvider = e.provider === 'serper' || e.provider === 'gemini_grounding' || e.provider === 'direct_fetch';
          const hasConclusiveExcerpt = Boolean(
            (e.evidenceExcerpt || (e as any).retrievedText || '').length > 20
          );
          const isNotForum = tier !== TechnicalSourceTier.TIER_5_COMMUNITY_FORUM;
          return (
            hasProvider &&
            e.accepted === true &&
            e.applicationMatch !== false &&
            isNotForum &&
            (tier === TechnicalSourceTier.TIER_1_MANUFACTURER ||
              tier === TechnicalSourceTier.TIER_2_HOMOLOGATION ||
              tier === TechnicalSourceTier.TIER_3_CATALOG ||
              (tier === TechnicalSourceTier.TIER_4_SECONDARY_MEDIA &&
                ((storedVerification.consensus?.independentDomainCount || 0) >= 2 || hasConclusiveExcerpt)))
          );
        });

        if (hasAcceptedAuthoritativeEvidence) {
          const primaryEv = storedVerification.evidence.find((e) => e.accepted) || storedVerification.evidence[0];
          const derivedQuality = deriveEvidenceQuality({
            sourceTier: storedVerification.consensus?.strongestTier || primaryEv.sourceTier,
            independentSourceCount: storedVerification.consensus?.acceptedEvidenceCount,
            hasConsensus: (storedVerification.consensus?.independentDomainCount || 0) >= 2,
          });

          const gateResult = this.evaluateDisplacementConsistency(
            storedVerification.valueCc || specsObj.engineDisplacementCc,
            variant,
            existingReport,
            true,
            {
              source: primaryEv.url || specsObj.displacementSource,
              evidence: primaryEv.evidenceExcerpt || specsObj.displacementEvidence,
              quality: derivedQuality,
            },
          );

          dispStatus = gateResult.status;
          if (gateResult.status === 'VERIFIED') {
            displacementCc = gateResult.validCc;
            displacementSource = primaryEv.url || specsObj.displacementSource || 'TECHNICAL_SPEC_VERIFIED';
            dispEvidence = primaryEv.evidenceExcerpt || specsObj.displacementEvidence;
            dispQuality = gateResult.evidenceQuality || derivedQuality;
          } else {
            dispSuspicionReason = gateResult.suspicionReason;
            dispEvidence = gateResult.evidence;
          }
        } else {
          this.logger.warn(`[UNCERTAIN_PROVENANCE] Variant ${variantId} displacement has structured record but lacks accepted authoritative evidence. Treated as VERIFICATION_PROVENANCE_UNCERTAIN.`);
          dispStatus = 'MISSING';
          displacementCc = null;
          displacementSource = 'VERIFICATION_PROVENANCE_UNCERTAIN';
        }
      } else {
        // 2. Legacy record without displacementVerification structure:
        // Lacks structured provider origin proof; treated as VERIFICATION_PROVENANCE_UNCERTAIN on pure read
        const rawSource = String(specsObj.displacementSource || '').trim();
        this.logger.warn(`[UNCERTAIN_PROVENANCE] Variant ${variantId} displacement has legacy VERIFIED flag but lacks authentic provider origin (${rawSource}). Treated as VERIFICATION_PROVENANCE_UNCERTAIN.`);
        dispStatus = 'MISSING';
        displacementCc = null;
        displacementSource = 'VERIFICATION_PROVENANCE_UNCERTAIN';
      }
    }

    // Generic Engine-Identity Fact Propagation (Read Path):
    // If exact variant displacement is MISSING but another variant sharing the EXACT SAME engineId,
    // brandId, and modelId is VERIFIED with authoritative provider provenance, resolve it cleanly.
    if (dispStatus === 'MISSING' && variant.engineId && variant.modelId && variant.brandId) {
      const verifiedSibling = await this.prisma.vehicleVariant.findFirst({
        where: {
          brandId: variant.brandId,
          modelId: variant.modelId,
          engineId: variant.engineId,
          id: { not: variant.id },
          specs: {
            specs: {
              path: ['displacementVerification', 'status'],
              equals: 'VERIFIED',
            },
          },
        },
        include: { specs: true },
      });

      if (verifiedSibling?.specs?.specs) {
        const sibSpecs = verifiedSibling.specs.specs as Record<string, any>;
        const sibVerif = sibSpecs.displacementVerification as DisplacementVerificationData;
        if (sibVerif && sibVerif.status === 'VERIFIED' && sibVerif.valueCc && Array.isArray(sibVerif.evidence)) {
          const primaryEv = sibVerif.evidence.find((e) => e.accepted) || sibVerif.evidence[0];
          dispStatus = 'VERIFIED';
          displacementCc = sibVerif.valueCc;
          displacementSource = primaryEv?.url || sibSpecs.displacementSource || 'CANONICAL_ENGINE_CATALOG_REUSE';
          dispEvidence = primaryEv?.evidenceExcerpt || sibSpecs.displacementEvidence;
          dispQuality = 'STRONG';
        }
      }
    }

    if (
      variant.powerEnrichment?.verificationStatus === PowerVerificationStatus.VERIFIED &&
      (typeof variant.powerEnrichment?.powerHp === 'number' || typeof variant.powerEnrichment?.powerPs === 'number')
    ) {
      // Historical Provenance Gate (Section 4, 7, 11):
      // A historical DB row saying VERIFIED must not automatically become user-facing VERIFIED
      // if it cannot prove real provider origin under the new contract.
      const evidences = (variant.powerEnrichment as any).evidences || [];
      const hasAcceptedEvidence = evidences.length > 0 && evidences.some((e: any) => {
        const meta = e.metadata as any;
        const hasProvider = meta && (meta.provider === 'serper' || meta.provider === 'gemini_grounding' || meta.provider === 'direct_fetch');
        const tier = classifySourceTier(e.sourceUrl || e.sourceDomain, variant.brand?.name).tier;
        return hasProvider && tier !== TechnicalSourceTier.TIER_5_COMMUNITY_FORUM && meta.applicationMatch !== false;
      });

      if (!hasAcceptedEvidence) {
        this.logger.warn(`[UNCERTAIN_PROVENANCE] Variant ${variantId} power has historical VERIFIED flag but lacks authentic provider origin. Treated as VERIFICATION_PROVENANCE_UNCERTAIN.`);
        powerStatus = 'MISSING';
        powerSource = 'VERIFICATION_PROVENANCE_UNCERTAIN';
        powerHp = null;
      } else {
        // Single TorqueScout power convention: PS/bg is user-facing HP convention (Section 2)
        let canonicalHp = variant.powerEnrichment.powerHp;
        if (typeof variant.powerEnrichment.powerPs === 'number' && variant.powerEnrichment.powerPs > 0) {
          canonicalHp = Math.round(variant.powerEnrichment.powerPs);
        } else if (
          typeof variant.powerEnrichment.sourceReportedValue === 'number' &&
          variant.powerEnrichment.sourceReportedUnit
        ) {
          const normalized = convertPowerUnits(
            variant.powerEnrichment.sourceReportedValue,
            variant.powerEnrichment.sourceReportedUnit,
          );
          canonicalHp = normalized.powerHp;
        }
        const gateResult = this.evaluatePowerConsistency(canonicalHp, variant, true);
        powerStatus = gateResult.status;
        if (gateResult.status === 'VERIFIED') {
          powerHp = gateResult.validHp;
          powerQuality = gateResult.evidenceQuality || 'STRONG';
          powerSource = 'POWER_ENRICHMENT_VERIFIED';
        }
      }
    }

    // Generic Engine-Identity Power Fact Propagation (Read Path):
    // If exact variant power is MISSING but another variant sharing the EXACT SAME engineId,
    // brandId, and modelId has verified powerEnrichment with authoritative provenance, resolve it cleanly.
    if (powerStatus === 'MISSING' && variant.engineId && variant.modelId && variant.brandId) {
      const verifiedPowerSibling = await this.prisma.vehicleVariant.findFirst({
        where: {
          brandId: variant.brandId,
          modelId: variant.modelId,
          engineId: variant.engineId,
          id: { not: variant.id },
          powerEnrichment: {
            verificationStatus: PowerVerificationStatus.VERIFIED,
          },
        },
        include: {
          powerEnrichment: {
            include: { evidences: true },
          },
        },
      });

      if (verifiedPowerSibling?.powerEnrichment) {
        const pe = verifiedPowerSibling.powerEnrichment;
        const evidences = pe.evidences || [];
        const hasAcceptedEvidence =
          evidences.length > 0 &&
          evidences.some((e: any) => {
            const meta = e.metadata as any;
            const hasProvider =
              meta && (meta.provider === 'serper' || meta.provider === 'gemini_grounding' || meta.provider === 'direct_fetch');
            const tier = classifySourceTier(e.sourceUrl || e.sourceDomain, variant.brand?.name).tier;
            return hasProvider && tier !== TechnicalSourceTier.TIER_5_COMMUNITY_FORUM && meta.applicationMatch !== false;
          });

        if (hasAcceptedEvidence) {
          let canonicalHp = pe.powerHp;
          if (typeof pe.powerPs === 'number' && pe.powerPs > 0) {
            canonicalHp = Math.round(pe.powerPs);
          } else if (typeof pe.sourceReportedValue === 'number' && pe.sourceReportedUnit) {
            canonicalHp = convertPowerUnits(pe.sourceReportedValue, pe.sourceReportedUnit).powerHp;
          }
          if (typeof canonicalHp === 'number') {
            const gateResult = this.evaluatePowerConsistency(canonicalHp, variant, true);
            if (gateResult.status === 'VERIFIED') {
              const primaryEv = evidences.find((e: any) => e.sourceUrl) || evidences[0];
              powerStatus = 'VERIFIED';
              powerHp = gateResult.validHp;
              powerQuality = gateResult.evidenceQuality || 'STRONG';
              powerSource = primaryEv?.sourceUrl || 'CANONICAL_ENGINE_CATALOG_REUSE';
            }
          }
        }
      }
    }

    // LEVEL 2: Structured facts from GeneratedVehicleReport for the EXACT SAME variantId only
    if (existingReport && existingReport.reportData) {
      const reportData = existingReport.reportData as any;
      const techSpecs = reportData.expertDecisionSynthesis?.technicalSpecifications || reportData.technicalSpecifications;
      const perfUsage = reportData.performanceUsage;
      const vehicleIdentity = reportData.vehicleIdentity;

      // Real external citations / sources check (Section 5: supportingFactIds are NOT external evidence)
      const verifiedResearch = reportData.verifiedResearch;
      const externalSources: string[] = [];
      if (Array.isArray(reportData.sources)) {
        for (const s of reportData.sources) {
          const u = typeof s === 'string' ? s : s?.url || s?.sourceUrl;
          if (u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
            externalSources.push(u);
          }
        }
      }
      if (verifiedResearch) {
        const citations = verifiedResearch.citations || verifiedResearch.sources || [];
        if (Array.isArray(citations)) {
          for (const c of citations) {
            const u = typeof c === 'string' ? c : c?.url || c?.sourceUrl;
            if (u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
              externalSources.push(u);
            }
          }
        }
      }

      // External authority requirement: Must have at least one authoritative external source URL
      const authoritativeExternalSource = externalSources.find((url) => {
        const tier = classifySourceTier(url, variant.brand?.name).tier;
        return (
          tier === TechnicalSourceTier.TIER_1_MANUFACTURER ||
          tier === TechnicalSourceTier.TIER_2_HOMOLOGATION ||
          tier === TechnicalSourceTier.TIER_3_CATALOG
        );
      });
      const hasFieldEvidence = Boolean(authoritativeExternalSource);

      // Power resolution from report structured facts (never from naked numbers without evidence)
      if (powerStatus !== 'VERIFIED') {
        const rPower =
          techSpecs?.enginePowerHp ||
          techSpecs?.powerHp ||
          perfUsage?.powerHp ||
          vehicleIdentity?.enginePowerHp;

        if (typeof rPower === 'number') {
          const pGate = this.evaluatePowerConsistency(rPower, variant, hasFieldEvidence);
          if (pGate.status === 'VERIFIED') {
            powerHp = pGate.validHp;
            powerStatus = 'VERIFIED';
            powerQuality = pGate.evidenceQuality || 'STRONG';
            powerSource = 'GENERATED_REPORT_STRUCTURED_FACT';
          } else if (pGate.status === 'CONFLICT') {
            powerStatus = 'CONFLICT';
          }
        }
      }

      // Displacement resolution: Structured facts from exact completed report with evidence
      if (dispStatus !== 'VERIFIED') {
        const rCc =
          techSpecs?.engineDisplacementCc ||
          techSpecs?.displacementCc ||
          vehicleIdentity?.engineDisplacementCc;

        if (typeof rCc === 'number') {
          const dGate = this.evaluateDisplacementConsistency(rCc, variant, existingReport, hasFieldEvidence, {
            source: hasFieldEvidence ? 'GENERATED_REPORT_STRUCTURED_FACT' : 'UNVERIFIED_REPORT_NUMBER',
            quality: hasFieldEvidence ? 'STRONG' : 'WEAK',
          });
          if (dGate.status === 'VERIFIED') {
            displacementCc = dGate.validCc;
            dispStatus = 'VERIFIED';
            dispQuality = dGate.evidenceQuality || 'STRONG';
            displacementSource = 'GENERATED_REPORT_STRUCTURED_FACT';
          } else if (dGate.status === 'CONFLICT') {
            dispStatus = 'CONFLICT';
            dispEvidence = dGate.evidence;
            dispSuspicionReason = dGate.suspicionReason;
          }
        } else {
          // If legacy engine displacement exists, check if it CONFLICTS with narrative or badge
          const rawCandidateCc = variant.engine?.displacement;
          if (rawCandidateCc) {
            const auditCheck = this.evaluateDisplacementConsistency(rawCandidateCc, variant, existingReport, false);
            if (auditCheck.status === 'CONFLICT') {
              dispStatus = 'CONFLICT';
              dispEvidence = auditCheck.evidence;
              dispSuspicionReason = auditCheck.suspicionReason;
            }
          }
        }
      }
    }

    // LEVEL 3: Fallback check on raw variant engine if still MISSING (Audit check only)
    if (dispStatus === 'MISSING' && variant.engine?.displacement) {
      const engineCheck = this.evaluateDisplacementConsistency(variant.engine.displacement, variant, existingReport, false);
      if (engineCheck.status === 'CONFLICT') {
        dispStatus = 'CONFLICT';
        dispEvidence = engineCheck.evidence;
        dispSuspicionReason = engineCheck.suspicionReason;
      }
    }

    const isComplete = dispStatus === 'VERIFIED' && powerStatus === 'VERIFIED' && displacementCc !== null && powerHp !== null;
    const isCatalogVerified = isComplete;

    if (isComplete) {
      this.metrics.cacheHitCount++;
    } else {
      this.metrics.cacheMissCount++;
    }

    const dt = resolveCanonicalDrivetrain(variant);

    // Extract candidatePowers if multiple factory output powers are documented or if sibling variants have distinct powers
    let candidatePowers: number[] | undefined = undefined;
    const peSnapshot = variant.powerEnrichment?.identitySnapshot as any;
    if (Array.isArray(peSnapshot?.candidatePowers) && peSnapshot.candidatePowers.length > 1) {
      candidatePowers = peSnapshot.candidatePowers;
    } else if (variant.brandId && variant.modelId && variant.engineId && variant.year) {
      const siblingEnrichments = await this.prisma.vehiclePowerEnrichment.findMany({
        where: {
          variant: {
            brandId: variant.brandId,
            modelId: variant.modelId,
            engineId: variant.engineId,
            year: variant.year,
          },
          verificationStatus: PowerVerificationStatus.VERIFIED,
          powerHp: { not: null },
        },
        select: { powerHp: true, powerPs: true },
      });
      const distinctPowers = Array.from(
        new Set(
          siblingEnrichments
            .map((se) => (se.powerPs ? Math.round(se.powerPs) : se.powerHp ? Math.round(se.powerHp) : null))
            .filter((hp): hp is number => typeof hp === 'number' && hp > 0),
        ),
      ).sort((a, b) => a - b);

      if (distinctPowers.length > 1) {
        candidatePowers = distinctPowers;
      }
    }

    return {
      variantId,
      engineDisplacement: {
        value: dispStatus === 'VERIFIED' ? displacementCc : null,
        valueCc: dispStatus === 'VERIFIED' ? displacementCc : null,
        status: dispStatus,
        verified: dispStatus === 'VERIFIED',
        sourceType: dispStatus === 'VERIFIED' ? displacementSource || null : null,
        evidence: dispEvidence,
        evidenceQuality: dispQuality,
        suspicionReason: dispSuspicionReason,
      },
      enginePower: {
        value: powerStatus === 'VERIFIED' ? powerHp : null,
        valueHp: powerStatus === 'VERIFIED' ? powerHp : null,
        status: powerStatus,
        verified: powerStatus === 'VERIFIED',
        sourceType: powerStatus === 'VERIFIED' ? powerSource || null : null,
        evidenceQuality: powerQuality,
      },
      engineDisplacementCc: dispStatus === 'VERIFIED' ? displacementCc : null,
      enginePowerHp: powerStatus === 'VERIFIED' ? powerHp : null,
      candidatePowers,
      drivetrain: dt.drivetrain,
      drivetrainNameTr: dt.drivetrainNameTr,
      isComplete,
      isCatalogVerified,
      sources: {
        displacement: dispStatus === 'VERIFIED' ? displacementSource : undefined,
        power: powerStatus === 'VERIFIED' ? powerSource : undefined,
        drivetrain: 'CANONICAL_VEHICLE_ARCHITECTURE',
      },
      unresolvedConflict: dispStatus === 'CONFLICT' || powerStatus === 'CONFLICT',
    };
  }

  /**
   * AUTHENTICATED / CONTROLLED: Resolves missing cc and/or HP via targeted research.
   * Reuses existing verified facts first. If missing, runs targeted research ONLY for missing fields.
   * Concurrency-safe, distributed deduplicated, and persists results for future callers.
   */
  async enrichVariantTechnicalSpecs(
    variantId: string,
    userId?: string,
    options?: { forceRefresh?: boolean },
  ): Promise<VariantTechnicalFactsResult> {
    // 1. Primary hard invariant short-circuit: Read canonical persisted facts first
    const existing = await this.getVariantTechnicalFacts(variantId);
    if (!options?.forceRefresh && existing.isComplete) {
      this.logger.log(`[SHORT_CIRCUIT] Variant ${variantId} technical facts already VERIFIED. Zero external research triggered.`);
      // If displacement was resolved via engine propagation and variant's own specs is not yet persisted:
      try {
        const currentSpec = await this.prisma.technicalSpec.findUnique({ where: { variantId } });
        const currentSpecsObj = (currentSpec?.specs as Record<string, any>) || {};
        if (
          existing.engineDisplacement.status === 'VERIFIED' &&
          existing.engineDisplacementCc &&
          (!currentSpecsObj.displacementVerification ||
            currentSpecsObj.displacementVerification.status !== 'VERIFIED' ||
            currentSpecsObj.displacementSource !== existing.sources.displacement)
        ) {
          await this.reconcileCanonicalTechnicalFacts({
            variantId,
            trigger: 'EXPLICIT_ENRICHMENT',
            displacementCandidate: {
              valueCc: existing.engineDisplacementCc,
              source: existing.sources.displacement,
              evidence: existing.engineDisplacement.evidence,
              quality: 'STRONG',
              isExplicitlyVerified: true,
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`Could not eagerly persist propagated facts for ${variantId}: ${err.message}`);
      }
      return existing;
    }

    // 2. In-memory deduplication for concurrent requests in same process
    if (this.inFlightEnrichments.has(variantId)) {
      this.metrics.researchDeduplicatedCount++;
      this.logger.log(`[DEDUPE] In-flight enrichment exists for variant ${variantId}, joining existing promise.`);
      return await this.inFlightEnrichments.get(variantId)!;
    }

    const enrichmentPromise = this.executeTargetedEnrichment(variantId, existing, options);
    this.inFlightEnrichments.set(variantId, enrichmentPromise);

    try {
      return await enrichmentPromise;
    } finally {
      this.inFlightEnrichments.delete(variantId);
    }
  }

  private async attemptAcquireDistributedLease(
    variantId: string,
    powerNeedsResearch: boolean,
    dispNeedsResearch: boolean,
    variantIdentity: any,
  ): Promise<{ powerAcquired: boolean; dispAcquired: boolean }> {
    return await this.prisma.$transaction(async (tx) => {
      // Row lock on VehicleVariant serializes concurrent claims without race condition
      await tx.$executeRaw`SELECT 1 FROM "VehicleVariant" WHERE "id" = ${variantId} FOR UPDATE`;

      const freshPower = await tx.vehiclePowerEnrichment.findUnique({
        where: { vehicleVariantId: variantId },
      });
      const freshSpec = await tx.technicalSpec.findUnique({
        where: { variantId },
      });
      const freshSpecsObj = (freshSpec?.specs as Record<string, any>) || {};

      let powerAcquired = false;
      let dispAcquired = false;

      // Check Power lease
      if (powerNeedsResearch) {
        const isPowerResearching =
          freshPower?.verificationStatus === PowerVerificationStatus.RESEARCHING &&
          freshPower?.researchedAt &&
          Date.now() - new Date(freshPower.researchedAt).getTime() < DISTRIBUTED_RESEARCH_LEASE_MS;

        if (!isPowerResearching) {
          powerAcquired = true;
          await tx.vehiclePowerEnrichment.upsert({
            where: { vehicleVariantId: variantId },
            create: {
              vehicleVariantId: variantId,
              verificationStatus: PowerVerificationStatus.RESEARCHING,
              researchedAt: new Date(),
              identityFingerprint: `${variantIdentity.brand?.name || ''}:${variantIdentity.model?.name || ''}:${variantIdentity.year}`.toLowerCase().replace(/\s+/g, '_'),
            },
            update: {
              verificationStatus: PowerVerificationStatus.RESEARCHING,
              researchedAt: new Date(),
            },
          });
        }
      }

      // Check Displacement lease
      if (dispNeedsResearch) {
        const isDispResearching =
          freshSpecsObj.displacementStatus === 'RESEARCHING' &&
          freshSpecsObj.displacementResearchStartedAt &&
          Date.now() - new Date(freshSpecsObj.displacementResearchStartedAt).getTime() < DISTRIBUTED_RESEARCH_LEASE_MS;

        if (!isDispResearching) {
          dispAcquired = true;
          await tx.technicalSpec.upsert({
            where: { variantId },
            create: {
              variantId,
              specs: {
                ...freshSpecsObj,
                displacementStatus: 'RESEARCHING',
                displacementResearchStartedAt: new Date().toISOString(),
              },
            },
            update: {
              specs: {
                ...freshSpecsObj,
                displacementStatus: 'RESEARCHING',
                displacementResearchStartedAt: new Date().toISOString(),
              },
            },
          });
        }
      }

      return { powerAcquired, dispAcquired };
    });
  }

  /**
   * CANONICAL TECHNICAL FACT RECONCILIATION IMPLEMENTATION (Count = 1).
   * The single authoritative entry point for verifying, resolving conflict,
   * and persisting displacement and power technical facts into TechnicalSpec and VehiclePowerEnrichment.
   * Both report completion and explicit listing enrichment MUST call this same method.
   */
  async reconcileCanonicalTechnicalFacts(input: {
    variantId: string;
    trigger: 'REPORT_COMPLETION' | 'EXPLICIT_ENRICHMENT';
    displacementCandidate?: {
      valueCc: number | null;
      source?: string;
      evidence?: string | null;
      evidences?: TechnicalFactEvidenceItem[];
      quality?: EvidenceQuality;
      isExplicitlyVerified?: boolean;
    };
    powerCandidate?: {
      valueHp: number | null;
      candidatePowers?: number[];
      source?: string;
      evidence?: string | null;
      quality?: EvidenceQuality;
      market?: PowerSourceMarket;
      marketResolution?: PowerMarketResolution;
      isExplicitlyVerified?: boolean;
    };
  }): Promise<{
    displacementStatus: TechnicalFactStatus;
    powerStatus: TechnicalFactStatus;
    validCc: number | null;
    validHp: number | null;
  }> {
    const { variantId, trigger, displacementCandidate, powerCandidate } = input;
    if (!variantId) {
      throw new Error('variantId is required for canonical technical fact reconciliation');
    }

    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: { specs: true, powerEnrichment: true, engine: true, brand: true, model: true },
    });
    if (!variant) {
      throw new NotFoundException(`Variant ${variantId} not found`);
    }

    let resolvedCc: number | null = null;
    let dispStatus: TechnicalFactStatus = 'MISSING';
    let resolvedHp: number | null = null;
    let powerStatus: TechnicalFactStatus = 'MISSING';

    // 1. CANONICAL DISPLACEMENT RECONCILIATION
    if (displacementCandidate && typeof displacementCandidate.valueCc === 'number') {
      const dGate = this.evaluateDisplacementConsistency(
        displacementCandidate.valueCc,
        variant,
        undefined,
        displacementCandidate.isExplicitlyVerified ?? false,
        {
          source: displacementCandidate.source,
          evidence: displacementCandidate.evidence,
          quality: displacementCandidate.quality,
        },
      );

      dispStatus = dGate.status;
      const currentSpecs = (variant.specs?.specs as Record<string, any>) || {};

      if (dGate.status === 'VERIFIED' && dGate.validCc !== null) {
        resolvedCc = dGate.validCc;

        // Build structured reconstructable evidence items
        let acceptedEvidences: TechnicalFactEvidenceItem[] = [];
        if (Array.isArray(displacementCandidate.evidences) && displacementCandidate.evidences.length > 0) {
          acceptedEvidences = displacementCandidate.evidences.filter((e) => e.accepted);
        }

        if (acceptedEvidences.length === 0 && displacementCandidate.source && displacementCandidate.source.startsWith('http')) {
          const rawUrl = displacementCandidate.source;
          let domain = rawUrl;
          try {
            domain = new URL(rawUrl).hostname.toLowerCase();
          } catch {}
          const classified = classifySourceTier(rawUrl, variant.brand?.name);
          acceptedEvidences.push({
            url: rawUrl,
            domain,
            sourceTier: classified.tier,
            sourceTierLabel: classified.tierLabel,
            sourceKind:
              classified.tier === TechnicalSourceTier.TIER_1_MANUFACTURER
                ? 'OEM'
                : classified.tier === TechnicalSourceTier.TIER_2_HOMOLOGATION
                ? 'HOMOLOGATION'
                : classified.tier === TechnicalSourceTier.TIER_3_CATALOG
                ? 'CATALOG'
                : 'SECONDARY_MEDIA',
            extractedValue: resolvedCc,
            extractedUnit: 'CC',
            identityMatch: true,
            applicationMatch: true,
            accepted: true,
            evidenceExcerpt: displacementCandidate.evidence || undefined,
            retrievedAt: new Date().toISOString(),
          });
        }

        const uniqueDomains = new Set(acceptedEvidences.map((e) => e.domain));
        const strongestTier =
          acceptedEvidences.length > 0
            ? Math.min(...acceptedEvidences.map((e) => e.sourceTier))
            : classifySourceTier(displacementCandidate.source || '', variant.brand?.name).tier;

        const displacementVerification: DisplacementVerificationData = {
          status: 'VERIFIED',
          valueCc: resolvedCc,
          verifiedAt: new Date().toISOString(),
          verificationPolicyVersion: '1.0',
          evidence: acceptedEvidences,
          consensus: {
            acceptedEvidenceCount: acceptedEvidences.length,
            independentDomainCount: uniqueDomains.size,
            strongestTier,
          },
        };

        const primaryUrl = acceptedEvidences[0]?.url || displacementCandidate.source || 'CATALOG_VERIFIED';
        const primaryExcerpt = acceptedEvidences[0]?.evidenceExcerpt || displacementCandidate.evidence || null;

        await this.prisma.technicalSpec.upsert({
          where: { variantId },
          create: {
            variantId,
            specs: {
              ...currentSpecs,
              engineDisplacementCc: resolvedCc,
              displacementStatus: 'VERIFIED',
              isVerified: true,
              verifiedAt: new Date().toISOString(),
              displacementSource: primaryUrl,
              displacementEvidence: primaryExcerpt,
              displacementVerification,
            },
          },
          update: {
            specs: {
              ...currentSpecs,
              engineDisplacementCc: resolvedCc,
              displacementStatus: 'VERIFIED',
              isVerified: true,
              verifiedAt: new Date().toISOString(),
              displacementSource: primaryUrl,
              displacementEvidence: primaryExcerpt,
              displacementVerification,
            },
          },
        });
        this.logger.log(`[CANONICAL_RECONCILE] (${trigger}) Displacement ${resolvedCc} cc VERIFIED with reconstructable provenance persisted for variant ${variantId}`);
      } else if (dGate.status === 'CONFLICT') {
        await this.prisma.technicalSpec.upsert({
          where: { variantId },
          create: {
            variantId,
            specs: {
              ...currentSpecs,
              displacementStatus: 'CONFLICT',
              displacementConflictReason: dGate.reason || dGate.suspicionReason,
            },
          },
          update: {
            specs: {
              ...currentSpecs,
              displacementStatus: 'CONFLICT',
              displacementConflictReason: dGate.reason || dGate.suspicionReason,
            },
          },
        });
      }
    }

    // 2. CANONICAL POWER RECONCILIATION
    if (powerCandidate && (typeof powerCandidate.valueHp === 'number' || (powerCandidate.candidatePowers && powerCandidate.candidatePowers.length > 1))) {
      const isVerifiedEvidence =
        (powerCandidate.quality === 'STRONG' && Boolean(powerCandidate.evidence)) ||
        Boolean(powerCandidate.isExplicitlyVerified);

      const pGate = typeof powerCandidate.valueHp === 'number'
        ? this.evaluatePowerConsistency(powerCandidate.valueHp, variant, isVerifiedEvidence)
        : { status: 'CONFLICT' as TechnicalFactStatus, validHp: null };
      powerStatus = pGate.status;

      const currentSnapshot = (variant.powerEnrichment?.identitySnapshot as Record<string, any>) || {};
      const updatedSnapshot = {
        ...currentSnapshot,
        ...(powerCandidate.candidatePowers && powerCandidate.candidatePowers.length > 1
          ? { candidatePowers: powerCandidate.candidatePowers }
          : {}),
      };

      if (pGate.status === 'VERIFIED' && pGate.validHp !== null) {
        resolvedHp = pGate.validHp;
        await this.prisma.vehiclePowerEnrichment.upsert({
          where: { vehicleVariantId: variantId },
          create: {
            vehicleVariantId: variantId,
            powerHp: resolvedHp,
            powerPs: resolvedHp,
            verificationStatus: PowerVerificationStatus.VERIFIED,
            sourceMarket: powerCandidate.market || PowerSourceMarket.TURKEY,
            marketResolution: powerCandidate.marketResolution || PowerMarketResolution.TR_PRIMARY,
            researchedAt: new Date(),
            verifiedAt: new Date(),
            identityFingerprint: `${variant.brand?.name || ''}:${variant.model?.name || ''}:${variant.year}:${variant.engine?.code || ''}`.toLowerCase().replace(/\s+/g, '_'),
            identitySnapshot: Object.keys(updatedSnapshot).length > 0 ? updatedSnapshot : undefined,
          },
          update: {
            powerHp: resolvedHp,
            powerPs: resolvedHp,
            verificationStatus: PowerVerificationStatus.VERIFIED,
            verifiedAt: new Date(),
            sourceMarket: powerCandidate.market || PowerSourceMarket.TURKEY,
            marketResolution: powerCandidate.marketResolution || PowerMarketResolution.TR_PRIMARY,
            identitySnapshot: Object.keys(updatedSnapshot).length > 0 ? updatedSnapshot : undefined,
          },
        });
        this.logger.log(`[CANONICAL_RECONCILE] (${trigger}) Power ${resolvedHp} HP VERIFIED and persisted for variant ${variantId}`);
      } else if (pGate.status === 'CONFLICT') {
        await this.prisma.vehiclePowerEnrichment.upsert({
          where: { vehicleVariantId: variantId },
          create: {
            vehicleVariantId: variantId,
            verificationStatus: PowerVerificationStatus.CONFLICT,
            researchedAt: new Date(),
            verifiedAt: new Date(),
            identityFingerprint: `${variant.brand?.name || ''}:${variant.model?.name || ''}:${variant.year}:${variant.engine?.code || ''}`.toLowerCase().replace(/\s+/g, '_'),
            identitySnapshot: Object.keys(updatedSnapshot).length > 0 ? updatedSnapshot : undefined,
          },
          update: {
            verificationStatus: PowerVerificationStatus.CONFLICT,
            verifiedAt: new Date(),
            identitySnapshot: Object.keys(updatedSnapshot).length > 0 ? updatedSnapshot : undefined,
          },
        });
      }
    }

    return {
      displacementStatus: dispStatus,
      powerStatus,
      validCc: resolvedCc,
      validHp: resolvedHp,
    };
  }

  /**
   * Reconciles structured verified technical facts from a completed GeneratedVehicleReport
   * into canonical persistent stores via the single canonical reconciliation implementation.
   * Lock 3 & Section 5: supportingFactIds are NOT external evidence.
   * A report field without reconstructable external field evidence does NOT become VERIFIED.
   */
  async reconcileFactsFromCompletedReport(variantId: string, reportData: any): Promise<void> {
    if (!variantId || !reportData) return;

    try {
      const techSpecs = reportData.expertDecisionSynthesis?.technicalSpecifications || reportData.technicalSpecifications;
      const perfUsage = reportData.performanceUsage;
      const vehicleIdentity = reportData.vehicleIdentity;

      // Extract real external citations/sources
      const verifiedResearch = reportData.verifiedResearch;
      const externalSources: string[] = [];
      if (Array.isArray(reportData.sources)) {
        for (const s of reportData.sources) {
          const u = typeof s === 'string' ? s : s?.url || s?.sourceUrl;
          if (u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
            externalSources.push(u);
          }
        }
      }
      if (verifiedResearch) {
        const citations = verifiedResearch.citations || verifiedResearch.sources || [];
        if (Array.isArray(citations)) {
          for (const c of citations) {
            const u = typeof c === 'string' ? c : c?.url || c?.sourceUrl;
            if (u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
              externalSources.push(u);
            }
          }
        }
      }

      const variant = await this.prisma.vehicleVariant.findUnique({
        where: { id: variantId },
        include: { brand: true },
      });

      // Find accepted authoritative external sources (Tier 1-3)
      const authoritativeExternalSources = externalSources.filter((url) => {
        const tier = classifySourceTier(url, variant?.brand?.name).tier;
        return (
          tier === TechnicalSourceTier.TIER_1_MANUFACTURER ||
          tier === TechnicalSourceTier.TIER_2_HOMOLOGATION ||
          tier === TechnicalSourceTier.TIER_3_CATALOG
        );
      });

      const hasExternalEvidence = authoritativeExternalSources.length > 0;
      const primaryExternalUrl = authoritativeExternalSources[0];

      let displacementCandidate: any = undefined;
      const rCc = techSpecs?.engineDisplacementCc || techSpecs?.displacementCc || vehicleIdentity?.engineDisplacementCc;
      if (typeof rCc === 'number') {
        const ccVal = Math.round(rCc);
        displacementCandidate = {
          valueCc: ccVal,
          source: hasExternalEvidence ? primaryExternalUrl : 'UNVERIFIED_REPORT_SIGNAL',
          evidence: hasExternalEvidence ? (verifiedResearch?.summary || primaryExternalUrl) : null,
          quality: hasExternalEvidence ? 'STRONG' : 'WEAK',
          isExplicitlyVerified: hasExternalEvidence,
          evidences: hasExternalEvidence
            ? authoritativeExternalSources.map((u) => {
                let domain = u;
                try { domain = new URL(u).hostname.toLowerCase(); } catch {}
                const classified = classifySourceTier(u, variant?.brand?.name);
                return {
                  url: u,
                  domain,
                  sourceTier: classified.tier,
                  sourceTierLabel: classified.tierLabel,
                  sourceKind: classified.tier === TechnicalSourceTier.TIER_1_MANUFACTURER ? 'OEM' : 'CATALOG',
                  extractedValue: ccVal,
                  extractedUnit: 'CC',
                  identityMatch: true,
                  applicationMatch: true,
                  accepted: true,
                  retrievedAt: new Date().toISOString(),
                } as TechnicalFactEvidenceItem;
              })
            : undefined,
        };
      }

      let powerCandidate: any = undefined;
      const rPower = techSpecs?.enginePowerHp || techSpecs?.powerHp || perfUsage?.powerHp || vehicleIdentity?.enginePowerHp;
      if (typeof rPower === 'number') {
        powerCandidate = {
          valueHp: Math.round(rPower),
          source: hasExternalEvidence ? primaryExternalUrl : 'UNVERIFIED_REPORT_SIGNAL',
          evidence: hasExternalEvidence ? (verifiedResearch?.summary || primaryExternalUrl) : null,
          quality: hasExternalEvidence ? 'STRONG' : 'WEAK',
          isExplicitlyVerified: hasExternalEvidence,
        };
      }

      await this.reconcileCanonicalTechnicalFacts({
        variantId,
        trigger: 'REPORT_COMPLETION',
        displacementCandidate,
        powerCandidate,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to reconcile facts from report for variant ${variantId}: ${err.message}`);
    }
  }

  private async executeTargetedEnrichment(
    variantId: string,
    currentFacts: VariantTechnicalFactsResult,
    options?: { forceRefresh?: boolean },
  ): Promise<VariantTechnicalFactsResult> {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true,
        generation: true,
        specs: true,
        powerEnrichment: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(`VehicleVariant ${variantId} not found`);
    }

    let finalHp = currentFacts.enginePowerHp;
    let finalCc = currentFacts.engineDisplacementCc;
    let powerSource = currentFacts.sources.power;
    let displacementSource = currentFacts.sources.displacement;

    // Check if an exact completed report with field evidence exists before running external web research
    if (!options?.forceRefresh) {
      const existingReport = await this.prisma.generatedVehicleReport.findFirst({
        where: { variantId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
      });
      if (existingReport && existingReport.reportData) {
        await this.reconcileFactsFromCompletedReport(variantId, existingReport.reportData);
        const rechecked = await this.getVariantTechnicalFacts(variantId);
        finalHp = rechecked.enginePowerHp;
        finalCc = rechecked.engineDisplacementCc;
        currentFacts = rechecked;
      }
    }

    // Determine field-level research requirements
    const powerNeedsResearch =
      options?.forceRefresh ||
      currentFacts.enginePower.status === 'MISSING' ||
      currentFacts.enginePower.status === 'CONFLICT' ||
      finalHp === null;

    const dispNeedsResearch =
      options?.forceRefresh ||
      currentFacts.engineDisplacement.status === 'MISSING' ||
      currentFacts.engineDisplacement.status === 'CONFLICT' ||
      finalCc === null;

    if (!powerNeedsResearch && !dispNeedsResearch) {
      return currentFacts;
    }

    // Atomically claim distributed research lease via serializing PostgreSQL row transaction
    const leaseClaim = await this.attemptAcquireDistributedLease(
      variantId,
      powerNeedsResearch,
      dispNeedsResearch,
      variant,
    );

    const tasks: Promise<void>[] = [];

    // STEP A: Resolve Power if missing OR in conflict (Lock 5: Independent lease & resolution)
    if (powerNeedsResearch) {
      tasks.push((async () => {
        // Known verified truth check before lease wait (knownVerifiedTruthWaitsForResearchLease = FALSE)
        const quickCheck = await this.getVariantTechnicalFacts(variantId);
        if (!options?.forceRefresh && quickCheck.enginePower.status === 'VERIFIED') {
          finalHp = quickCheck.enginePowerHp;
          powerSource = quickCheck.sources.power;
          return;
        }

        if (!leaseClaim.powerAcquired) {
          this.metrics.researchLocksContended++;
          this.metrics.researchDeduplicatedCount++;
          this.logger.log(`[DISTRIBUTED_DEDUPE] Variant ${variantId} power is currently being researched by another worker. Bounded waiting up to 15s...`);
          let waitElapsed = 0;
          while (waitElapsed < 15000) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            waitElapsed += 1000;
            const rechecked = await this.getVariantTechnicalFacts(variantId);
            if (rechecked.enginePower.status === 'VERIFIED') {
              finalHp = rechecked.enginePowerHp;
              powerSource = rechecked.sources.power;
              break;
            }
          }
        } else {
          this.metrics.researchLocksAcquired++;
          this.metrics.researchTriggeredCount++;
          this.logger.log(`[TARGETED_RESEARCH] Researching power for variant ${variantId} (current status: ${currentFacts.enginePower.status})`);

          try {
            const powerEnrichment = await this.powerEnrichmentService.researchVariantPower(variantId);
            if (powerEnrichment && (powerEnrichment.powerHp || (powerEnrichment as any).candidatePowers)) {
              const reconcileRes = await this.reconcileCanonicalTechnicalFacts({
                variantId,
                trigger: 'EXPLICIT_ENRICHMENT',
                powerCandidate: {
                  valueHp: powerEnrichment.powerHp,
                  candidatePowers: (powerEnrichment as any).candidatePowers,
                  source: powerEnrichment.sourceMarket || 'RESEARCH_POWER_ENRICHMENT',
                  evidence: (powerEnrichment as any).evidenceExcerpt || 'Authoritative web research consensus',
                  quality: powerEnrichment.verificationStatus === PowerVerificationStatus.VERIFIED ? 'STRONG' : 'WEAK',
                  market: powerEnrichment.sourceMarket || undefined,
                  marketResolution: powerEnrichment.marketResolution || undefined,
                  isExplicitlyVerified: powerEnrichment.verificationStatus === PowerVerificationStatus.VERIFIED,
                },
              });
              if (reconcileRes.powerStatus === 'VERIFIED') {
                finalHp = reconcileRes.validHp;
                powerSource = 'RESEARCH_POWER_ENRICHMENT';
              }
            }
          } catch (err: any) {
            this.logger.error(`Failed to research power for variant ${variantId}: ${err.message}`);
          }
        }
      })());
    }

    // STEP B: Resolve Displacement if missing OR in conflict (Lock 5: Independent lease & resolution)
    if (dispNeedsResearch) {
      tasks.push((async () => {
        // Known verified truth check before lease wait (knownVerifiedTruthWaitsForResearchLease = FALSE)
        const quickCheck = await this.getVariantTechnicalFacts(variantId);
        if (!options?.forceRefresh && quickCheck.engineDisplacement.status === 'VERIFIED') {
          finalCc = quickCheck.engineDisplacementCc;
          displacementSource = quickCheck.sources.displacement;
          return;
        }

        if (!leaseClaim.dispAcquired) {
          this.metrics.researchLocksContended++;
          this.metrics.researchDeduplicatedCount++;
          this.logger.log(`[DISTRIBUTED_DEDUPE] Variant ${variantId} displacement is currently being researched by another worker. Bounded waiting up to 15s...`);
          let waitElapsed = 0;
          while (waitElapsed < 15000) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            waitElapsed += 1000;
            const rechecked = await this.getVariantTechnicalFacts(variantId);
            if (rechecked.engineDisplacement.status === 'VERIFIED') {
              finalCc = rechecked.engineDisplacementCc;
              displacementSource = rechecked.sources.displacement;
              break;
            }
          }
        } else {
          this.metrics.researchLocksAcquired++;
          this.metrics.researchTriggeredCount++;
          this.logger.log(`[TARGETED_RESEARCH] Researching displacement for variant ${variantId} (current status: ${currentFacts.engineDisplacement.status})`);

          // Renew lease timestamp for displacement execution phase
          const freshSpec = await this.prisma.technicalSpec.findUnique({
            where: { variantId },
          });
          const freshSpecsObj = (freshSpec?.specs as Record<string, any>) || {};

          await this.prisma.technicalSpec.upsert({
            where: { variantId },
            create: {
              variantId,
              specs: {
                ...freshSpecsObj,
                displacementStatus: 'RESEARCHING',
                displacementResearchStartedAt: new Date().toISOString(),
              },
            },
            update: {
              specs: {
                ...freshSpecsObj,
                displacementStatus: 'RESEARCHING',
                displacementResearchStartedAt: new Date().toISOString(),
              },
            },
          });

          try {
            const researchedCc = await this.researchVariantDisplacement(variant);
            if (researchedCc && researchedCc.displacementCc) {
              // Reconcile via canonical method (Lock 2: Single canonical method, unverifiedResearchCandidateBypassesConsistencyGate = FALSE)
              const reconcileRes = await this.reconcileCanonicalTechnicalFacts({
                variantId,
                trigger: 'EXPLICIT_ENRICHMENT',
                displacementCandidate: {
                  valueCc: researchedCc.displacementCc,
                  source: researchedCc.source,
                  evidence: (researchedCc as any).evidence || researchedCc.source,
                  evidences: (researchedCc as any).evidences,
                  quality: 'STRONG',
                  isExplicitlyVerified: false, // Must pass through Consistency Gate!
                },
              });

              if (reconcileRes.displacementStatus === 'VERIFIED') {
                finalCc = reconcileRes.validCc;
                displacementSource = researchedCc.source;
              }
            } else {
              await this.prisma.technicalSpec.upsert({
                where: { variantId },
                create: {
                  variantId,
                  specs: {
                    ...freshSpecsObj,
                    engineDisplacementCc: null,
                    displacementStatus: 'MISSING',
                    isVerified: false,
                    displacementSource: 'VARIANT_IDENTITY_REQUIRES_SEPARATE_TAXONOMY_REVIEW',
                  },
                },
                update: {
                  specs: {
                    ...freshSpecsObj,
                    engineDisplacementCc: null,
                    displacementStatus: 'MISSING',
                    isVerified: false,
                    displacementSource: 'VARIANT_IDENTITY_REQUIRES_SEPARATE_TAXONOMY_REVIEW',
                  },
                },
              });
            }
          } catch (err: any) {
            this.logger.error(`Failed to research displacement for variant ${variantId}: ${err.message}`);
            await this.prisma.technicalSpec.upsert({
              where: { variantId },
              create: { variantId, specs: { ...freshSpecsObj, displacementStatus: 'FAILED' } },
              update: { specs: { ...freshSpecsObj, displacementStatus: 'FAILED' } },
            });
          }
        }
      })());
    }

    // Parallelize execution when both fields need resolution
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }

    // Return fresh canonically gated facts
    return await this.getVariantTechnicalFacts(variantId);
  }

  /**
   * Targeted structured displacement extraction.
   * Never multiplies marketed engine label (e.g. 2.0 * 1000 = 2000 cc).
   * Extracts evidence-backed exact displacement in cc with complete evidence chain.
   */
  private async researchVariantDisplacement(
    variant: any,
  ): Promise<{ displacementCc: number; source: string; evidence?: string; evidences?: TechnicalFactEvidenceItem[] } | null> {
    const brandName = (variant.brand?.name || '').trim();
    const modelName = (variant.model?.name || '').trim();
    const year = variant.year;
    const engineCode = (variant.engine?.code || '').trim();
    const trimName = (variant.trim?.name || '').trim();
    const generationName = (variant.generation?.name || '').trim();
    const fuelType = (variant.engine?.fuelType || '').trim();
    const transmissionName = (variant.transmission?.name || '').trim();
    const bodyType = (variant.bodyType || '').trim();

    const identityParts = [brandName, modelName, generationName, year, engineCode, trimName, fuelType, transmissionName, bodyType]
      .filter(Boolean)
      .join(' ');

    const targetModel = modelName.toLowerCase();
    const targetBrand = brandName.toLowerCase();

    // Prioritize generic engine-identity propagation before expensive web queries:
    if (variant.brandId && variant.modelId && variant.engineId) {
      const verifiedSibling = await this.prisma.vehicleVariant.findFirst({
        where: {
          brandId: variant.brandId,
          modelId: variant.modelId,
          engineId: variant.engineId,
          id: { not: variant.id },
          specs: {
            specs: {
              path: ['displacementVerification', 'status'],
              equals: 'VERIFIED',
            },
          },
        },
        include: { specs: true },
      });

      if (verifiedSibling?.specs?.specs) {
        const sibSpecs = verifiedSibling.specs.specs as Record<string, any>;
        const sibVerif = sibSpecs.displacementVerification as DisplacementVerificationData;
        if (sibVerif && sibVerif.status === 'VERIFIED' && sibVerif.valueCc && Array.isArray(sibVerif.evidence) && sibVerif.evidence.length > 0) {
          this.logger.log(`[CANONICAL_ENGINE_PROPAGATION] Reusing verified displacement ${sibVerif.valueCc} cc from sibling variant ${verifiedSibling.id} (engineId: ${variant.engineId})`);
          const primaryEv = sibVerif.evidence.find((e) => e.accepted) || sibVerif.evidence[0];
          return {
            displacementCc: sibVerif.valueCc,
            source: primaryEv.url || sibSpecs.displacementSource || 'CANONICAL_ENGINE_CATALOG_REUSE',
            evidence: primaryEv.evidenceExcerpt || sibSpecs.displacementEvidence,
            evidences: sibVerif.evidence,
          };
        }
      }
    }

    const cleanTokens = (str: string) =>
      str
        .replace(/\b(standart|standard|default|jenerasyonu|jenerasyon|nesil|generation)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const cleanTrim = cleanTokens(trimName);
    let cleanGen = cleanTokens(generationName);
    if (modelName && cleanGen.toLowerCase().includes(modelName.toLowerCase())) {
      cleanGen = cleanTokens(cleanGen.replace(new RegExp(modelName, 'gi'), ''));
    }

    // ----------------------------------------------------
    // PHASE 1: TURKEY PRIMARY RESEARCH
    // ----------------------------------------------------
    const trQuery = `${brandName} ${modelName} ${cleanGen ? cleanGen + ' ' : ''}${year} ${engineCode} ${cleanTrim} silindir hacmi motor hacmi cc teknik özellikleri`
      .replace(/\s+/g, ' ')
      .trim();
    this.logger.log(`[DISPLACEMENT_SEARCH] (TR_PRIMARY) Query: "${trQuery}" (Full Identity: "${identityParts}")`);

    this.metrics.externalWebSearchCalls++;
    const trSearchResults = await this.webSearchProvider.search(trQuery, 'tr', 'tr');

    let allResults: any[] = trSearchResults || [];

    const hasAuthoritativeSource = allResults.some((res) => {
      const classified = classifySourceTier(res.url, brandName);
      return (
        classified.tier === TechnicalSourceTier.TIER_1_MANUFACTURER ||
        classified.tier === TechnicalSourceTier.TIER_2_HOMOLOGATION ||
        classified.tier === TechnicalSourceTier.TIER_3_CATALOG
      );
    });

    // ----------------------------------------------------
    // PHASE 2: EUROPE / AUTHORITATIVE FALLBACK RESEARCH
    // (If TR primary yielded 0 results or lacks authoritative catalog/OEM domains)
    // ----------------------------------------------------
    if (!hasAuthoritativeSource || allResults.length < 3) {
      const euQuery = `${brandName} ${modelName} ${year} ${engineCode} specs displacement cc technical specifications`.trim();
      this.logger.log(`[DISPLACEMENT_SEARCH] (EU_FALLBACK) Query: "${euQuery}"`);
      this.metrics.externalWebSearchCalls++;
      const euResults = await this.webSearchProvider.search(euQuery, 'en', 'eu');
      if (Array.isArray(euResults) && euResults.length > 0) {
        allResults = [...allResults, ...euResults];
      }
    }

    if (allResults.length === 0) {
      return null;
    }

    // Filter results to match target brand and model
    const candidateResults = allResults.filter((res) => {
      const fullText = `${res.title || ''} ${res.snippet || ''}`.toLowerCase();
      if (targetBrand && targetModel && fullText.includes(targetBrand)) {
        if (!isModelMentionedInText(fullText, targetModel, engineCode)) {
          return false;
        }
      }
      return true;
    });

    const usableResults = candidateResults.length > 0 ? candidateResults : allResults;

    // Map usableResults to request-local sourceMap with S1, S2, ...
    // AI parser is only given request-local identifiers and CANNOT invent URLs.
    const sourceMap = new Map<string, any>();
    usableResults.slice(0, 8).forEach((res, idx) => {
      const sId = `S${idx + 1}`;
      sourceMap.set(sId, {
        ...res,
        sourceId: sId,
        resolvedUrl: res.resolvedUrl || res.url,
      });
    });

    const structuredResult = await this.extractDisplacementViaAi(
      identityParts,
      sourceMap,
      variant,
    );

    if (structuredResult?.applicationIncompatible) {
      this.logger.warn(`[EXACT_APPLICATION_GATE] Vehicle application "${identityParts}" unproven or incompatible (${structuredResult.reason || ''}). Failing closed.`);
      return null;
    }

    // Collect structured candidate evidence items across authentic search results
    const candidateEvidences: TechnicalFactEvidenceItem[] = [];

    if (structuredResult && structuredResult.displacementCc && structuredResult.retrievedSource) {
      const aiCc = Math.round(structuredResult.displacementCc);
      if (aiCc >= 600 && aiCc <= 8000) {
        const src = structuredResult.retrievedSource;
        const classified = classifySourceTier(src.resolvedUrl, brandName);
        candidateEvidences.push({
          url: src.resolvedUrl,
          domain: src.domain,
          sourceTier: classified.tier,
          sourceTierLabel: classified.tierLabel,
          sourceKind: classified.tier === TechnicalSourceTier.TIER_1_MANUFACTURER ? 'OEM' :
                      classified.tier === TechnicalSourceTier.TIER_2_HOMOLOGATION ? 'HOMOLOGATION' :
                      classified.tier === TechnicalSourceTier.TIER_3_CATALOG ? 'CATALOG' : 'SECONDARY_MEDIA',
          provider: src.provider,
          providerResultId: src.providerResultId,
          providerCitationUri: src.providerCitationUri,
          contentHash: src.contentHash,
          extractedValue: aiCc,
          extractedUnit: 'CC',
          identityMatch: true,
          applicationMatch: structuredResult.applicationMatch ?? false,
          accepted: structuredResult.applicationMatch ?? false,
          evidenceExcerpt: src.providerSnippet || src.retrievedPageExcerpt || `${aiCc} cc`,
          retrievedText: src.providerSnippet || src.retrievedPageExcerpt || undefined,
          parserSummary: structuredResult.parserSummary,
          retrievedAt: src.retrievedAt || new Date().toISOString(),
        });
      }
    }

    // Pattern matching across authentic retrieved text to gather multi-source consensus
    for (const [sId, src] of sourceMap.entries()) {
      const authenticText = `${src.providerSnippet || ''} ${src.retrievedPageExcerpt || ''} ${src.title || ''}`;
      const appMatch = verifyVehicleApplicationMatch(variant, authenticText, src.resolvedUrl);
      if (!appMatch.match) {
        continue;
      }

      const match = authenticText.match(/(?:silindir|motor|displacement|cubic capacity)\s*hacmi\s*[:\s]*([1-9]\d{2,3})\s*(?:cc|cm3)/i)
        || authenticText.match(/(?:displacement|engine size|cubic capacity)\s*[:\s]*([1-9]\d{2,3})\s*(?:cc|cm3)/i)
        || authenticText.match(/\b([1-9]\d{2,3})\s*(?:cc|cm3)\b/i);

      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (val >= 600 && val <= 8000) {
          const classified = classifySourceTier(src.resolvedUrl, brandName);
          if (classified.tier !== TechnicalSourceTier.TIER_5_COMMUNITY_FORUM) {
            candidateEvidences.push({
              url: src.resolvedUrl,
              domain: src.domain,
              sourceTier: classified.tier,
              sourceTierLabel: classified.tierLabel,
              sourceKind: classified.tier === TechnicalSourceTier.TIER_1_MANUFACTURER ? 'OEM' :
                          classified.tier === TechnicalSourceTier.TIER_2_HOMOLOGATION ? 'HOMOLOGATION' :
                          classified.tier === TechnicalSourceTier.TIER_3_CATALOG ? 'CATALOG' : 'SECONDARY_MEDIA',
              provider: src.provider,
              providerResultId: src.providerResultId,
              providerCitationUri: src.providerCitationUri,
              contentHash: src.contentHash,
              extractedValue: val,
              extractedUnit: 'CC',
              identityMatch: true,
              applicationMatch: true,
              accepted: true,
              evidenceExcerpt: match[0],
              retrievedText: src.providerSnippet || src.retrievedPageExcerpt || undefined,
              retrievedAt: src.retrievedAt || new Date().toISOString(),
            });
          }
        }
      }
    }

    if (candidateEvidences.length === 0) {
      return null;
    }

    // Group by extracted cc to find consensus
    const ccGroups = new Map<number, TechnicalFactEvidenceItem[]>();
    for (const ev of candidateEvidences) {
      const list = ccGroups.get(ev.extractedValue) || [];
      list.push(ev);
      ccGroups.set(ev.extractedValue, list);
    }

    // Select candidate with strongest consensus
    let bestCc: number | null = null;
    let bestEvidences: TechnicalFactEvidenceItem[] = [];
    let bestTierScore = 999;

    for (const [candidateCc, evList] of ccGroups.entries()) {
      const uniqueDomains = new Set(evList.map((e) => e.domain));
      const minTier = Math.min(...evList.map((e) => e.sourceTier));

      // Tier 1-3 can verify alone; Tier 4 requires 2+ independent domains
      const isValid = minTier <= TechnicalSourceTier.TIER_3_CATALOG || (minTier === TechnicalSourceTier.TIER_4_SECONDARY_MEDIA && uniqueDomains.size >= 2);

      if (isValid && minTier < bestTierScore) {
        bestTierScore = minTier;
        bestCc = candidateCc;
        bestEvidences = evList;
      }
    }

    if (bestCc && bestEvidences.length > 0) {
      // Sort evidences best tier first
      bestEvidences.sort((a, b) => a.sourceTier - b.sourceTier);
      const primary = bestEvidences[0];
      return {
        displacementCc: bestCc,
        source: primary.url,
        evidence: primary.evidenceExcerpt || primary.url,
        evidences: bestEvidences,
      };
    }

    // If only single unverified candidate exists and is plausible, return for consistency gate evaluation
    const fallbackPrimary = candidateEvidences[0];
    return {
      displacementCc: fallbackPrimary.extractedValue,
      source: fallbackPrimary.url,
      evidence: fallbackPrimary.evidenceExcerpt,
      evidences: candidateEvidences,
    };
  }

  private async extractDisplacementViaAi(
    vehicleIdentity: string,
    sourceMap: Map<string, any>,
    targetVariant: any,
  ): Promise<{
    displacementCc?: number | null;
    retrievedSource?: any;
    parserSummary?: string;
    evidence?: string;
    applicationMatch?: boolean;
    applicationIncompatible?: boolean;
    reason?: string;
  } | null> {
    this.metrics.externalLLMResearchOperations++;
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;

    // AI is provided only request-local identifiers [S1], [S2] and content.
    // AI is NEVER given URLs or allowed to return URLs.
    const evidenceText = Array.from(sourceMap.entries())
      .map(([sId, src]) => {
        const textContent = src.providerSnippet || src.retrievedPageExcerpt || src.snippet || '';
        return `[${sId}]\nTitle: ${src.title}\nDomain: ${src.domain}\nContent: ${textContent}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert automotive technical specification extractor.
Given evidence snippets from automotive sources for target vehicle: "${vehicleIdentity}", extract the exact factory engine displacement in cubic centimeters (cc / cm³).

CRITICAL CONSTRAINTS:
1. You MUST reference an existing source identifier ([S1], [S2], etc.). You are STRICTLY FORBIDDEN from inventing or outputting URLs.
2. The numeric displacement value MUST be explicitly stated in the source content for that [sourceId].
3. Extract source-side vehicle details (model, badge, market) so application code can independently verify application match.
4. If vehicle model/engine was NOT manufactured or is implausible, return {"applicationCompatible": false, "reason": "TAXONOMY_MISMATCH"}.
5. Return strict JSON matching:
{
  "applicationCompatible": true,
  "sourceId": "S1",
  "displacementCc": number,
  "parserSummary": "Summary describing why this source supports the vehicle",
  "sourceVehicleDetails": {
    "model": "model name in source",
    "badge": "badge/trim in source",
    "market": "market in source"
  }
}`;

    let parsed: any = null;

    if (openaiKey) {
      try {
        this.metrics.externalLLMCalls++;
        const openai = new OpenAI({ apiKey: openaiKey, timeout: 8000 });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `EVIDENCE:\n${evidenceText}` },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (content) parsed = JSON.parse(content);
      } catch (err: any) {
        this.logger.warn(`OpenAI displacement extraction failed: ${err.message}`);
      }
    }

    if (!parsed && geminiKey) {
      try {
        this.metrics.externalLLMCalls++;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `${systemPrompt}\n\nEVIDENCE:\n${evidenceText}` }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) parsed = JSON.parse(text);
        }
      } catch (err: any) {
        this.logger.warn(`Gemini displacement extraction failed: ${err.message}`);
      }
    }

    if (!parsed) return null;

    if (parsed.applicationCompatible === false || parsed.reason?.includes('TAXONOMY')) {
      return { applicationIncompatible: true, reason: 'VARIANT_IDENTITY_REQUIRES_SEPARATE_TAXONOMY_REVIEW' };
    }

    // Resolve sourceId to immutable RetrievedSource
    const sourceId = String(parsed.sourceId || '').trim();
    const retrievedSource = sourceMap.get(sourceId);
    if (!retrievedSource) {
      this.logger.warn(`[SOURCE_FABRICATION_PREVENTED] AI returned unsupplied sourceId "${sourceId}". Rejected.`);
      return null;
    }

    const val = typeof parsed.displacementCc === 'number' ? parsed.displacementCc : null;
    if (!val || val < 500 || val > 8000) return null;

    // Verify value exists in retrieved authentic text (valueAbsentFromRetrievedEvidenceCanVerifyFact = FALSE)
    const authenticText = `${retrievedSource.providerSnippet || ''} ${retrievedSource.retrievedPageExcerpt || ''} ${retrievedSource.retrievedPageText || ''} ${retrievedSource.title || ''}`;
    const hasValueInText = authenticText.includes(String(Math.round(val)));
    if (!hasValueInText) {
      this.logger.warn(`[AUTHENTICITY_REJECT] Extracted displacement ${val} cc not physically present in source ${retrievedSource.resolvedUrl}`);
      return null;
    }

    // Verify vehicle application match deterministically
    const appMatchResult = verifyVehicleApplicationMatch(targetVariant, authenticText, retrievedSource.resolvedUrl);

    return {
      displacementCc: val,
      retrievedSource,
      applicationMatch: appMatchResult.match,
      applicationIncompatible: !appMatchResult.match,
      reason: appMatchResult.reason,
      parserSummary: parsed.parserSummary || '',
      evidence: retrievedSource.providerSnippet || retrievedSource.retrievedPageExcerpt || `${val} cc`,
    };
  }
}
