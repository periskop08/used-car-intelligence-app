import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from '../research/providers/web-search.provider';
import { VehiclePowerEnrichmentService } from './vehicle-power-enrichment.service';
import { PowerVerificationStatus } from '@prisma/client';
import { convertPowerUnits } from '@used-car-intelligence/shared';
import OpenAI from 'openai';

export type TechnicalFactStatus = 'VERIFIED' | 'MISSING' | 'CONFLICT' | 'RESEARCHING';
export type EvidenceQuality = 'STRONG' | 'MODERATE' | 'WEAK';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly powerEnrichmentService: VehiclePowerEnrichmentService,
    private readonly webSearchProvider: WebSearchProvider,
  ) {}

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
      const techSpecs = reportData.expertDecisionSynthesis?.technicalSpecifications;
      const perfUsage = reportData.performanceUsage;

      // Power resolution from report structured facts
      if (powerStatus !== 'VERIFIED') {
        const rPower = techSpecs?.enginePowerHp || techSpecs?.powerHp || perfUsage?.powerHp;
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

      // Displacement resolution: ONLY trust explicit technicalSpecifications, NEVER unverified vehicleIdentity copy
      if (dispStatus !== 'VERIFIED') {
        const rCc = techSpecs?.engineDisplacementCc;
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
    // 1. Check if already complete
    const existing = await this.getVariantTechnicalFacts(variantId);
    if (existing.isComplete) {
      return existing;
    }

    // 2. In-memory deduplication for concurrent requests in same process
    if (this.inFlightEnrichments.has(variantId)) {
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

    // Distributed Deduplication via DB state:
    // If another backend node marked RESEARCHING within last 90s, wait briefly and check
    if (
      variant.powerEnrichment?.verificationStatus === PowerVerificationStatus.RESEARCHING &&
      variant.powerEnrichment?.researchedAt &&
      Date.now() - new Date(variant.powerEnrichment.researchedAt).getTime() < 90000
    ) {
      this.logger.log(`[DISTRIBUTED_DEDUPE] Variant ${variantId} is currently being researched by another worker. Waiting 3s...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await this.getVariantTechnicalFacts(variantId);
    }

    let finalHp = currentFacts.enginePowerHp;
    let finalCc = currentFacts.engineDisplacementCc;
    let powerSource = currentFacts.sources.power;
    let displacementSource = currentFacts.sources.displacement;

    // STEP A: Resolve Power if missing OR in conflict
    const powerNeedsResearch =
      currentFacts.enginePower.status === 'MISSING' ||
      currentFacts.enginePower.status === 'CONFLICT' ||
      finalHp === null;

    if (powerNeedsResearch) {
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

    // STEP B: Resolve Displacement if missing OR in conflict
    const dispNeedsResearch =
      currentFacts.engineDisplacement.status === 'MISSING' ||
      currentFacts.engineDisplacement.status === 'CONFLICT' ||
      finalCc === null;

    if (dispNeedsResearch) {
      this.logger.log(`[TARGETED_RESEARCH] Researching displacement for variant ${variantId} (current status: ${currentFacts.engineDisplacement.status})`);
      try {
        const researchedCc = await this.researchVariantDisplacement(variant);
        if (researchedCc && researchedCc.displacementCc) {
          // Validate researched cc through consistency gate
          const dGate = this.evaluateDisplacementConsistency(researchedCc.displacementCc, variant, undefined, true);
          if (dGate.status === 'VERIFIED' && dGate.validCc) {
            finalCc = dGate.validCc;
            displacementSource = researchedCc.source;

            // Persist verified displacement into TechnicalSpec
            const existingSpecs = (variant.specs?.specs as Record<string, any>) || {};
            await this.prisma.technicalSpec.upsert({
              where: { variantId },
              create: {
                variantId,
                specs: {
                  ...existingSpecs,
                  engineDisplacementCc: finalCc,
                  isVerified: true,
                  verifiedAt: new Date().toISOString(),
                  displacementSource,
                  displacementEvidence: (researchedCc as any).evidence || null,
                },
              },
              update: {
                specs: {
                  ...existingSpecs,
                  engineDisplacementCc: finalCc,
                  isVerified: true,
                  verifiedAt: new Date().toISOString(),
                  displacementSource,
                  displacementEvidence: (researchedCc as any).evidence || null,
                },
              },
            });

            // Note: Per invariant silentHistoricalReportMutation = FALSE,
            // we do NOT rewrite historical GeneratedVehicleReport snapshots.
            // Canonical VariantTechnicalFactsService serves as the single source of truth.
          } else {
            this.logger.warn(`[CONSISTENCY_GATE_REJECT] Researched cc ${researchedCc.displacementCc} was rejected by consistency gate: ${dGate.reason}`);
          }
        }
      } catch (err: any) {
        this.logger.error(`Failed to research displacement for variant ${variantId}: ${err.message}`);
      }
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
