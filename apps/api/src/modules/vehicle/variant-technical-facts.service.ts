import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from '../research/providers/web-search.provider';
import { VehiclePowerEnrichmentService } from './vehicle-power-enrichment.service';
import { PowerVerificationStatus } from '@prisma/client';
import { convertPowerUnits } from '@used-car-intelligence/shared';
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

export interface VariantTechnicalFactsResult {
  variantId: string;
  engineDisplacement: DisplacementFactField;
  enginePower: PowerFactField;
  engineDisplacementCc: number | null;
  enginePowerHp: number | null;
  isComplete: boolean;
  isCatalogVerified: boolean;
  sources: {
    displacement?: string;
    power?: string;
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
    // It can flag an unverified legacy candidate as suspicious/conflicting, but CANNOT create exact displacement truth.
    let narrativeSuspicion: string | undefined;
    if (existingReport && existingReport.reportData) {
      const execSummary =
        existingReport.reportData.expertDecisionSynthesis?.executiveSummary?.content ||
        JSON.stringify(existingReport.reportData.expertDecisionSynthesis || {});
      const textMatch = execSummary.match(/([1-9]\.[0-9])\s*(?:L|litrelik|litre|lt)\b/i);
      if (textMatch && textMatch[1]) {
        const reportNominalL = parseFloat(textMatch[1]);
        const reportNominalCc = Math.round(reportNominalL * 1000);
        // E.g. Report narrative mentions "1.5L" (~1500 cc nominal), while candidate is 1600 cc.
        // Difference is > 70 cc -> discrepancy / suspicion signal
        if (Math.abs(cc - reportNominalCc) > 70) {
          narrativeSuspicion = `Report narrative mentions "${textMatch[0]}", which conflicts with candidate ${cc} cc`;
        }
      }
    }

    // 3. Marketed decimal badge check (e.g. "1.5", "1.6", "2.0")
    // This is also a WEAK SIGNAL: marketed classes do not follow one fixed cc tolerance globally.
    let badgeSuspicion: string | undefined;
    const decimalMatch = `${engineCode} ${engineDesc}`.match(/\b([1-9]\.[0-9])\b/);
    if (decimalMatch && decimalMatch[1]) {
      const badgeNominalL = parseFloat(decimalMatch[1]);
      const badgeNominalCc = Math.round(badgeNominalL * 1000);
      if (Math.abs(cc - badgeNominalCc) > 70) {
        badgeSuspicion = `Marketed engine badge "${decimalMatch[1]}L" conflicts with candidate ${cc} cc`;
      }
    }

    // 4. Provenance verification:
    // If it has explicit TechnicalSpec verification with provenance, and passed physical checks:
    if (isExplicitlyVerifiedSpec) {
      return {
        status: 'VERIFIED',
        validCc: cc,
        evidenceQuality: 'STRONG',
      };
    }

    // 5. Unverified / Legacy Candidate (e.g. from Engine.displacement):
    // WEAK SIGNALS trigger CONFLICT/RESEARCH_REQUIRED. Legacy Engine metadata NEVER becomes VERIFIED!
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

    // If candidate came from unverified legacy Engine table:
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
        powerEnrichment: true,
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
    if (specsObj.isVerified && typeof specsObj.engineDisplacementCc === 'number') {
      const gateResult = this.evaluateDisplacementConsistency(
        specsObj.engineDisplacementCc,
        variant,
        existingReport,
        true,
      );
      dispStatus = gateResult.status;
      if (gateResult.status === 'VERIFIED') {
        displacementCc = gateResult.validCc;
        displacementSource = specsObj.displacementSource || 'TECHNICAL_SPEC_VERIFIED';
        dispEvidence = specsObj.displacementEvidence;
        dispQuality = gateResult.evidenceQuality || 'STRONG';
      }
    }

    if (
      variant.powerEnrichment?.verificationStatus === PowerVerificationStatus.VERIFIED &&
      typeof variant.powerEnrichment?.powerHp === 'number'
    ) {
      const gateResult = this.evaluatePowerConsistency(variant.powerEnrichment.powerHp, variant, true);
      powerStatus = gateResult.status;
      if (gateResult.status === 'VERIFIED') {
        powerHp = gateResult.validHp;
        powerQuality = gateResult.evidenceQuality || 'STRONG';
        powerSource = 'POWER_ENRICHMENT_VERIFIED';
      }
    }

    // LEVEL 2: Structured facts from GeneratedVehicleReport for the EXACT SAME variantId only
    if (existingReport && existingReport.reportData) {
      const reportData = existingReport.reportData as any;
      const techSpecs = reportData.expertDecisionSynthesis?.technicalSpecifications || reportData.technicalSpecifications;
      const perfUsage = reportData.performanceUsage;
      const vehicleIdentity = reportData.vehicleIdentity;

      // Power resolution from report structured facts (never from prose narrative)
      if (powerStatus !== 'VERIFIED') {
        const rPower =
          techSpecs?.enginePowerHp ||
          techSpecs?.powerHp ||
          perfUsage?.powerHp ||
          vehicleIdentity?.enginePowerHp;

        if (typeof rPower === 'number') {
          const pGate = this.evaluatePowerConsistency(rPower, variant, true);
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

      // Displacement resolution: Structured facts from exact completed report
      if (dispStatus !== 'VERIFIED') {
        const rCc =
          techSpecs?.engineDisplacementCc ||
          techSpecs?.displacementCc ||
          vehicleIdentity?.engineDisplacementCc;

        if (typeof rCc === 'number') {
          const dGate = this.evaluateDisplacementConsistency(rCc, variant, existingReport, true);
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

    // DURABLE CANONICAL RECONCILIATION:
    // If power was verified (from report or specs), durably reconcile into VehiclePowerEnrichment
    if (powerStatus === 'VERIFIED' && powerHp !== null) {
      if (
        !variant.powerEnrichment ||
        variant.powerEnrichment.verificationStatus !== PowerVerificationStatus.VERIFIED ||
        variant.powerEnrichment.powerHp !== powerHp
      ) {
        this.prisma.vehiclePowerEnrichment.upsert({
          where: { vehicleVariantId: variantId },
          create: {
            vehicleVariantId: variantId,
            powerHp,
            verificationStatus: PowerVerificationStatus.VERIFIED,
            sourceMarket: 'TURKEY',
            marketResolution: 'TR_PRIMARY',
            researchedAt: new Date(),
            verifiedAt: new Date(),
            identityFingerprint: `${variant.brand?.name || ''}:${variant.model?.name || ''}:${variant.year}:${variant.engine?.code || ''}`.toLowerCase().replace(/\s+/g, '_'),
          },
          update: {
            powerHp,
            verificationStatus: PowerVerificationStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        }).catch((err) => {
          this.logger.warn(`Failed to reconcile powerEnrichment for ${variantId}: ${err.message}`);
        });
      }
    }

    // If displacement was verified, durably reconcile into TechnicalSpec
    if (dispStatus === 'VERIFIED' && displacementCc !== null) {
      const currentSpecs = (variant.specs?.specs as Record<string, any>) || {};
      if (currentSpecs.displacementStatus !== 'VERIFIED' || currentSpecs.engineDisplacementCc !== displacementCc) {
        this.prisma.technicalSpec.upsert({
          where: { variantId },
          create: {
            variantId,
            specs: {
              ...currentSpecs,
              engineDisplacementCc: displacementCc,
              displacementStatus: 'VERIFIED',
              isVerified: true,
              verifiedAt: new Date().toISOString(),
              displacementSource: displacementSource || 'GENERATED_REPORT_STRUCTURED_FACT',
            },
          },
          update: {
            specs: {
              ...currentSpecs,
              engineDisplacementCc: displacementCc,
              displacementStatus: 'VERIFIED',
              isVerified: true,
              verifiedAt: new Date().toISOString(),
              displacementSource: displacementSource || 'GENERATED_REPORT_STRUCTURED_FACT',
            },
          },
        }).catch((err) => {
          this.logger.warn(`Failed to reconcile technicalSpec for ${variantId}: ${err.message}`);
        });
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
      isComplete,
      isCatalogVerified,
      sources: {
        displacement: dispStatus === 'VERIFIED' ? displacementSource : undefined,
        power: powerStatus === 'VERIFIED' ? powerSource : undefined,
      },
      unresolvedConflict: dispStatus === 'CONFLICT' || powerStatus === 'CONFLICT',
    };
  }

  /**
   * AUTHENTICATED / CONTROLLED: Resolves missing cc and/or HP via targeted research.
   * Reuses existing verified facts first. If missing, runs targeted research ONLY for missing fields.
   * Concurrency-safe, distributed deduplicated, and persists results for future callers.
   */
  async enrichVariantTechnicalSpecs(variantId: string, userId?: string): Promise<VariantTechnicalFactsResult> {
    // 1. Primary hard invariant short-circuit: Read canonical persisted facts first
    const existing = await this.getVariantTechnicalFacts(variantId);
    if (existing.isComplete) {
      this.logger.log(`[SHORT_CIRCUIT] Variant ${variantId} technical facts already VERIFIED. Zero external research triggered.`);
      return existing;
    }

    // 2. In-memory deduplication for concurrent requests in same process
    if (this.inFlightEnrichments.has(variantId)) {
      this.metrics.researchDeduplicatedCount++;
      this.logger.log(`[DEDUPE] In-flight enrichment exists for variant ${variantId}, joining existing promise.`);
      return await this.inFlightEnrichments.get(variantId)!;
    }

    const enrichmentPromise = this.executeTargetedEnrichment(variantId, existing);
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
   * Reconciles structured verified technical facts from a completed GeneratedVehicleReport
   * into canonical persistent stores (VehiclePowerEnrichment and TechnicalSpec) for an exact variantId.
   */
  async reconcileFactsFromCompletedReport(variantId: string, reportData: any): Promise<void> {
    if (!variantId || !reportData) return;

    try {
      const variant = await this.prisma.vehicleVariant.findUnique({
        where: { id: variantId },
        include: { specs: true, powerEnrichment: true, engine: true, brand: true, model: true },
      });
      if (!variant) return;

      const techSpecs = reportData.expertDecisionSynthesis?.technicalSpecifications || reportData.technicalSpecifications;
      const perfUsage = reportData.performanceUsage;
      const vehicleIdentity = reportData.vehicleIdentity;

      // 1. Structured power reconciliation
      const rPower = techSpecs?.enginePowerHp || techSpecs?.powerHp || perfUsage?.powerHp || vehicleIdentity?.enginePowerHp;
      if (typeof rPower === 'number') {
        const pGate = this.evaluatePowerConsistency(rPower, variant, true);
        if (pGate.status === 'VERIFIED' && pGate.validHp) {
          await this.prisma.vehiclePowerEnrichment.upsert({
            where: { vehicleVariantId: variantId },
            create: {
              vehicleVariantId: variantId,
              powerHp: pGate.validHp,
              verificationStatus: PowerVerificationStatus.VERIFIED,
              sourceMarket: 'TURKEY',
              marketResolution: 'TR_PRIMARY',
              researchedAt: new Date(),
              verifiedAt: new Date(),
              identityFingerprint: `${variant.brand?.name || ''}:${variant.model?.name || ''}:${variant.year}:${variant.engine?.code || ''}`.toLowerCase().replace(/\s+/g, '_'),
            },
            update: {
              powerHp: pGate.validHp,
              verificationStatus: PowerVerificationStatus.VERIFIED,
              verifiedAt: new Date(),
            },
          });
          this.logger.log(`[REPORT_FACT_RECONCILE] Reconciled power ${pGate.validHp} HP for variant ${variantId} from completed report.`);
        }
      }

      // 2. Structured displacement reconciliation
      const rCc = techSpecs?.engineDisplacementCc || techSpecs?.displacementCc || vehicleIdentity?.engineDisplacementCc;
      if (typeof rCc === 'number') {
        const dGate = this.evaluateDisplacementConsistency(rCc, variant, undefined, true);
        if (dGate.status === 'VERIFIED' && dGate.validCc) {
          const currentSpecs = (variant.specs?.specs as Record<string, any>) || {};
          await this.prisma.technicalSpec.upsert({
            where: { variantId },
            create: {
              variantId,
              specs: {
                ...currentSpecs,
                engineDisplacementCc: dGate.validCc,
                displacementStatus: 'VERIFIED',
                isVerified: true,
                verifiedAt: new Date().toISOString(),
                displacementSource: 'GENERATED_REPORT_STRUCTURED_FACT',
              },
            },
            update: {
              specs: {
                ...currentSpecs,
                engineDisplacementCc: dGate.validCc,
                displacementStatus: 'VERIFIED',
                isVerified: true,
                verifiedAt: new Date().toISOString(),
                displacementSource: 'GENERATED_REPORT_STRUCTURED_FACT',
              },
            },
          });
          this.logger.log(`[REPORT_FACT_RECONCILE] Reconciled displacement ${dGate.validCc} cc for variant ${variantId} from completed report.`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to reconcile facts from report for variant ${variantId}: ${err.message}`);
    }
  }

  private async executeTargetedEnrichment(
    variantId: string,
    currentFacts: VariantTechnicalFactsResult,
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

    // Determine field-level research requirements
    const powerNeedsResearch =
      currentFacts.enginePower.status === 'MISSING' ||
      currentFacts.enginePower.status === 'CONFLICT' ||
      finalHp === null;

    const dispNeedsResearch =
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

    // STEP A: Resolve Power if missing OR in conflict
    if (powerNeedsResearch) {
      tasks.push((async () => {
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
            if (powerEnrichment && powerEnrichment.powerHp) {
              const pGate = this.evaluatePowerConsistency(powerEnrichment.powerHp, variant, true);
              if (pGate.status === 'VERIFIED') {
                finalHp = pGate.validHp;
                powerSource = 'RESEARCH_POWER_ENRICHMENT';
              }
            }
          } catch (err: any) {
            this.logger.error(`Failed to research power for variant ${variantId}: ${err.message}`);
          }
        }
      })());
    }

    // STEP B: Resolve Displacement if missing OR in conflict
    if (dispNeedsResearch) {
      tasks.push((async () => {
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
              // Validate researched cc through consistency gate
              const dGate = this.evaluateDisplacementConsistency(researchedCc.displacementCc, variant, undefined, true);
              if (dGate.status === 'VERIFIED' && dGate.validCc) {
                finalCc = dGate.validCc;
                displacementSource = researchedCc.source;

                // Persist verified displacement into TechnicalSpec
                await this.prisma.technicalSpec.upsert({
                  where: { variantId },
                  create: {
                    variantId,
                    specs: {
                      ...freshSpecsObj,
                      engineDisplacementCc: finalCc,
                      isVerified: true,
                      verifiedAt: new Date().toISOString(),
                      displacementSource,
                      displacementEvidence: (researchedCc as any).evidence || null,
                      displacementStatus: 'VERIFIED',
                    },
                  },
                  update: {
                    specs: {
                      ...freshSpecsObj,
                      engineDisplacementCc: finalCc,
                      isVerified: true,
                      verifiedAt: new Date().toISOString(),
                      displacementSource,
                      displacementEvidence: (researchedCc as any).evidence || null,
                      displacementStatus: 'VERIFIED',
                    },
                  },
                });
              } else {
                this.logger.warn(`[CONSISTENCY_GATE_REJECT] Researched cc ${researchedCc.displacementCc} was rejected by consistency gate: ${dGate.reason}`);
                await this.prisma.technicalSpec.upsert({
                  where: { variantId },
                  create: { variantId, specs: { ...freshSpecsObj, displacementStatus: 'FAILED' } },
                  update: { specs: { ...freshSpecsObj, displacementStatus: 'FAILED' } },
                });
              }
            } else {
              await this.prisma.technicalSpec.upsert({
                where: { variantId },
                create: { variantId, specs: { ...freshSpecsObj, displacementStatus: 'MISSING' } },
                update: { specs: { ...freshSpecsObj, displacementStatus: 'MISSING' } },
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
   * Extracts evidence-backed exact displacement in cc.
   */
  private async researchVariantDisplacement(
    variant: any,
  ): Promise<{ displacementCc: number; source: string } | null> {
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

    const query = `${brandName} ${modelName} ${generationName ? generationName + ' ' : ''}${year} ${engineCode} ${trimName} silindir hacmi motor hacmi cc teknik özellikleri`.trim();
    this.logger.log(`[DISPLACEMENT_SEARCH] Query: "${query}" (Full Identity: "${identityParts}")`);

    this.metrics.externalWebSearchCalls++;
    const searchResults = await this.webSearchProvider.search(query, 'tr', 'tr');
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    // Prepare evidence excerpt
    const evidenceText = searchResults
      .slice(0, 5)
      .map((r) => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.url}`)
      .join('\n\n');

    // Use AI Structured extraction with strict schema
    const structuredResult = await this.extractDisplacementViaAi(
      identityParts,
      evidenceText,
    );
    if (structuredResult && structuredResult.displacementCc) {
      const cc = Math.round(structuredResult.displacementCc);
      // Valid passenger car displacement bounds
      if (cc >= 600 && cc <= 8000) {
        return {
          displacementCc: cc,
          source: structuredResult.sourceUrl || searchResults[0]?.url || 'TARGETED_WEB_RESEARCH',
        };
      }
    }

    // Fallback: Exact pattern match within snippets for "silindir hacmi: XXXX cc" or "XXXX cm3"
    for (const res of searchResults) {
      const text = `${res.title} ${res.snippet}`;
      const match = text.match(/(?:silindir|motor)\s*hacmi\s*[:\s]*([1-9]\d{2,3})\s*(?:cc|cm3)/i);
      if (match && match[1]) {
        const val = parseInt(match[1], 10);
        if (val >= 600 && val <= 8000) {
          return {
            displacementCc: val,
            source: res.url || 'KEYWORD_PATTERN_EXTRACT',
          };
        }
      }
    }

    return null;
  }

  private async extractDisplacementViaAi(
    vehicleIdentity: string,
    evidenceText: string,
  ): Promise<{ displacementCc?: number; sourceUrl?: string; evidence?: string } | null> {
    this.metrics.externalLLMResearchOperations++;
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;

    const systemPrompt = `You are an expert automotive specification extractor.
Given evidence snippets from authoritative automotive sources for vehicle: "${vehicleIdentity}", extract the exact factory engine displacement in cubic centimeters (cc / cm³).

CRITICAL RULES:
1. Do NOT guess or round by multiplying the engine badge (e.g. do NOT return 2000 cc for a 2.0 engine unless the real factory displacement is exactly 2000 cc; e.g. Subaru EJ20 is 1994 cc, BMW B48 is 1998 cc, VAG 1.5 TSI is 1498 cc, Ford 1.0 EcoBoost is 999 cc).
2. Extract exact verified factory numbers like 1994, 1998, 1598, 1498, 1197, 1395, 1798, etc.
3. Return strict JSON matching:
{
  "engineDisplacementCc": {
    "value": number,
    "evidence": "exact sentence quoting the displacement"
  },
  "confidence": number,
  "sourceUrl": "URL where found"
}`;

    if (openaiKey) {
      try {
        this.metrics.externalLLMCalls++;
        const openai = new OpenAI({ apiKey: openaiKey });
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
        if (content) {
          const parsed = JSON.parse(content);
          const val = typeof parsed.engineDisplacementCc?.value === 'number'
            ? parsed.engineDisplacementCc.value
            : typeof parsed.displacementCc === 'number'
            ? parsed.displacementCc
            : null;

          if (val && val > 500) {
            return {
              displacementCc: val,
              sourceUrl: parsed.sourceUrl,
              evidence: parsed.engineDisplacementCc?.evidence || '',
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`OpenAI displacement extraction failed: ${err.message}`);
      }
    }

    if (geminiKey) {
      try {
        this.metrics.externalLLMCalls++;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          if (text) {
            const parsed = JSON.parse(text);
            const val = typeof parsed.engineDisplacementCc?.value === 'number'
              ? parsed.engineDisplacementCc.value
              : typeof parsed.displacementCc === 'number'
              ? parsed.displacementCc
              : null;

            if (val && val > 500) {
              return {
                displacementCc: val,
                sourceUrl: parsed.sourceUrl,
                evidence: parsed.engineDisplacementCc?.evidence || '',
              };
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Gemini displacement extraction failed: ${err.message}`);
      }
    }

    return null;
  }
}
