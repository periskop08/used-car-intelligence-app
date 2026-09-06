import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from '../research/providers/web-search.provider';
import { VehiclePowerEnrichmentService } from './vehicle-power-enrichment.service';
import { PowerVerificationStatus } from '@prisma/client';
import { convertPowerUnits } from '@used-car-intelligence/shared';
import OpenAI from 'openai';

export interface TechnicalFactField<T> {
  value: T | null;
  verified: boolean;
  sourceType: string | null;
}

export interface VariantTechnicalFactsResult {
  variantId: string;
  engineDisplacement: {
    valueCc: number | null;
    verified: boolean;
    sourceType: string | null;
  };
  enginePower: {
    valueHp: number | null;
    verified: boolean;
    sourceType: string | null;
  };
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
   * READ-ONLY: Retrieves already-resolved/verified technical specs for a variant.
   * Strictly SAFE for public anonymous callers. Never triggers paid research or database mutations.
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
      },
    });

    if (!variant) {
      throw new NotFoundException(`VehicleVariant ${variantId} not found`);
    }

    let displacementCc: number | null = null;
    let powerHp: number | null = null;
    let displacementSource: string | undefined;
    let powerSource: string | undefined;

    // LEVEL 1: Check verified TechnicalSpec and VehiclePowerEnrichment
    const specsObj = (variant.specs?.specs as Record<string, any>) || {};
    if (specsObj.isVerified && typeof specsObj.engineDisplacementCc === 'number') {
      displacementCc = specsObj.engineDisplacementCc;
      displacementSource = specsObj.displacementSource || 'TECHNICAL_SPEC_VERIFIED';
    }

    if (
      variant.powerEnrichment?.verificationStatus === PowerVerificationStatus.VERIFIED &&
      typeof variant.powerEnrichment?.powerHp === 'number'
    ) {
      powerHp = Math.round(variant.powerEnrichment.powerHp);
      powerSource = 'POWER_ENRICHMENT_VERIFIED';
    }

    // LEVEL 2: Structured facts from GeneratedVehicleReport for the EXACT SAME variantId only
    if (displacementCc === null || powerHp === null) {
      const existingReport = await this.prisma.generatedVehicleReport.findFirst({
        where: {
          variantId,
          status: 'COMPLETED',
        },
        orderBy: { completedAt: 'desc' },
      });

      if (existingReport && existingReport.reportData) {
        const reportData = existingReport.reportData as any;
        const techSpecs = reportData.expertDecisionSynthesis?.technicalSpecifications;
        const perfUsage = reportData.performanceUsage;
        const vehIdentity = reportData.vehicleIdentity;

        if (powerHp === null) {
          const rPower = techSpecs?.enginePowerHp || techSpecs?.powerHp || perfUsage?.powerHp || vehIdentity?.enginePowerHp;
          if (typeof rPower === 'number' && rPower > 30 && rPower < 1500) {
            powerHp = Math.round(rPower);
            powerSource = 'GENERATED_REPORT_STRUCTURED_FACT';
          }
        }

        if (displacementCc === null) {
          const rCc = techSpecs?.engineDisplacementCc || vehIdentity?.engineDisplacementCc;
          if (typeof rCc === 'number' && rCc > 500 && rCc < 8500) {
            // Guard against unverified round numbers (e.g. 2000 for 2.0) unless verified
            const engineCode = (variant.engine?.code || '').trim();
            const isRoundThousand = rCc % 1000 === 0;
            const matchesCodeDirectly = engineCode.includes('.') && Math.round(parseFloat(engineCode) * 1000) === rCc;
            
            if (!isRoundThousand || !matchesCodeDirectly) {
              displacementCc = Math.round(rCc);
              displacementSource = 'GENERATED_REPORT_STRUCTURED_FACT';
            }
          }
        }
      }
    }

    const isComplete = displacementCc !== null && powerHp !== null;
    const isCatalogVerified = isComplete;

    return {
      variantId,
      engineDisplacement: {
        valueCc: displacementCc,
        verified: displacementCc !== null,
        sourceType: displacementSource || null,
      },
      enginePower: {
        valueHp: powerHp,
        verified: powerHp !== null,
        sourceType: powerSource || null,
      },
      engineDisplacementCc: displacementCc,
      enginePowerHp: powerHp,
      isComplete,
      isCatalogVerified,
      sources: {
        displacement: displacementSource,
        power: powerSource,
      },
      unresolvedConflict: false,
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

    // STEP A: Resolve Power if missing
    if (finalHp === null) {
      this.logger.log(`[TARGETED_RESEARCH] Researching missing power for variant ${variantId}`);
      try {
        const powerEnrichment = await this.powerEnrichmentService.researchVariantPower(variantId);
        if (powerEnrichment && powerEnrichment.powerHp) {
          finalHp = Math.round(powerEnrichment.powerHp);
          powerSource = 'RESEARCH_POWER_ENRICHMENT';
        }
      } catch (err: any) {
        this.logger.error(`Failed to research power for variant ${variantId}: ${err.message}`);
      }
    }

    // STEP B: Resolve Displacement if missing
    if (finalCc === null) {
      this.logger.log(`[TARGETED_RESEARCH] Researching missing displacement for variant ${variantId}`);
      try {
        const researchedCc = await this.researchVariantDisplacement(variant);
        if (researchedCc && researchedCc.displacementCc) {
          finalCc = researchedCc.displacementCc;
          displacementSource = researchedCc.source;

          // Persist displacement into TechnicalSpec
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
              },
            },
            update: {
              specs: {
                ...existingSpecs,
                engineDisplacementCc: finalCc,
                isVerified: true,
                verifiedAt: new Date().toISOString(),
                displacementSource,
              },
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`Failed to research displacement for variant ${variantId}: ${err.message}`);
      }
    }

    // Reconcile and return
    const isComplete = finalCc !== null && finalHp !== null;
    return {
      variantId,
      engineDisplacement: {
        valueCc: finalCc,
        verified: finalCc !== null,
        sourceType: displacementSource || null,
      },
      enginePower: {
        valueHp: finalHp,
        verified: finalHp !== null,
        sourceType: powerSource || null,
      },
      engineDisplacementCc: finalCc,
      enginePowerHp: finalHp,
      isComplete,
      isCatalogVerified: isComplete,
      sources: {
        displacement: displacementSource,
        power: powerSource,
      },
      unresolvedConflict: !isComplete,
    };
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
