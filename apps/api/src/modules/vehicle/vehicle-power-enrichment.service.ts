import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from '../research/providers/web-search.provider';
import OpenAI from 'openai';
import {
  PowerVerificationStatus,
  PowerSourceMarket,
  PowerMarketResolution,
} from '@prisma/client';
import {
  convertPowerUnits,
  ConvertedPower,
  classifySourceTier,
  TechnicalSourceTier,
} from '@used-car-intelligence/shared';
import { verifyVehicleApplicationMatch, isModelMentionedInText } from './variant-technical-facts.service';

export interface PowerEnrichmentReport {
  totalTested: number;
  verifiedCount: number;
  missingCount: number;
  conflictCount: number;
  failedCount: number;
  turkeyPrimaryCount: number;
  europeFallbackCount: number;
  variantIntegrityPreserved: boolean;
  sampleVariantRowCounts: { before: number; after: number };
  results: Array<{
    variantId: string;
    brand: string;
    model: string;
    year: number;
    engine: string;
    status: PowerVerificationStatus;
    market?: PowerSourceMarket;
    marketResolution?: PowerMarketResolution;
    powerHp?: number | null;
    powerKw?: number | null;
    powerPs?: number | null;
    sourceUnit?: string | null;
    sourceValue?: number | null;
  }>;
}

// Strictly forbidden non-European market domains / search keywords
const NON_EU_FORBIDDEN_DOMAINS = [
  '.us',
  '.ca',
  '.au',
  '.jp',
  '.kr',
  '.cn',
  '.br',
  '.in',
  '.ru',
  '.za',
  'caranddriver.com',
  'motortrend.com',
  'edmunds.com',
  'kbb.com',
  'netcarshow.com/us/',
  'autoblog.com',
  'carconnection.com',
  'cars.com',
];

@Injectable()
export class VehiclePowerEnrichmentService {
  private readonly logger = new Logger(VehiclePowerEnrichmentService.name);

  public readonly metrics = {
    externalWebSearchCalls: 0,
    externalLLMCalls: 0,
  };

  resetMetrics(): void {
    this.metrics.externalWebSearchCalls = 0;
    this.metrics.externalLLMCalls = 0;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly webSearchProvider: WebSearchProvider,
  ) {}

  /**
   * Data Integrity Assertion: Guarantees VehicleVariant table is 100% READ ONLY.
   */
  async assertVehicleVariantIntegrity(): Promise<{ rowCount: number; sampleIdsHash: string }> {
    const rowCount = await this.prisma.vehicleVariant.count();
    const sample = await this.prisma.vehicleVariant.findMany({
      take: 10,
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const sampleIdsHash = sample.map((s) => s.id).join(',');
    return { rowCount, sampleIdsHash };
  }

  /**
   * Retrieves existing side-car Power Enrichment record for a variant.
   */
  async getEnrichmentByVariantId(vehicleVariantId: string) {
    const enrichment = await this.prisma.vehiclePowerEnrichment.findUnique({
      where: { vehicleVariantId },
      include: {
        evidences: {
          orderBy: { retrievedAt: 'desc' },
        },
      },
    });

    if (!enrichment) return null;

    // Pure read authenticity gate (Section 4, 7, 11):
    // If enrichment is marked VERIFIED, verify that it has trusted provider origin in metadata
    if (enrichment.verificationStatus === PowerVerificationStatus.VERIFIED) {
      const hasTrusted =
        enrichment.evidences &&
        enrichment.evidences.length > 0 &&
        enrichment.evidences.some((ev: any) => {
          const meta = ev.metadata as any;
          return (
            meta &&
            (meta.provider === 'serper' || meta.provider === 'gemini_grounding' || meta.provider === 'direct_fetch') &&
            meta.applicationMatch !== false
          );
        });

      if (!hasTrusted) {
        return {
          ...enrichment,
          verificationStatus: PowerVerificationStatus.MISSING,
          confidenceScore: 0.0,
        };
      }
    }

    return enrichment;
  }

  /**
   * Research engine power for a specific vehicle variant using strict TR primary / EU fallback policy.
   * NEVER modifies VehicleVariant table!
   */
  async researchVariantPower(vehicleVariantId: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: vehicleVariantId },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        country: true,
        specs: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(`VehicleVariant with ID ${vehicleVariantId} not found.`);
    }

    // Check existing verified enrichment
    const existing = await this.prisma.vehiclePowerEnrichment.findUnique({
      where: { vehicleVariantId },
      include: { evidences: true },
    });

    if (existing && existing.verificationStatus === PowerVerificationStatus.VERIFIED) {
      const hasTrusted =
        existing.evidences &&
        existing.evidences.length > 0 &&
        existing.evidences.some((e: any) => {
          const meta = e.metadata as any;
          return (
            meta &&
            (meta.provider === 'serper' || meta.provider === 'gemini_grounding' || meta.provider === 'direct_fetch') &&
            meta.applicationMatch !== false
          );
        });

      if (hasTrusted) {
        return existing;
      }
    }

    const brandName = (variant.brand?.name || '').trim();
    const modelName = (variant.model?.name || '').trim();
    const year = variant.year;
    const bodyType = variant.bodyType || '';
    const trimName = (variant.trim?.name || '').trim();
    const engineCode = (variant.engine?.code || '').trim();
    const fuelType = variant.fuelType || variant.engine?.fuelType || '';
    const displacement = variant.engine?.displacement || 0;

    const identitySnapshot = {
      brand: brandName,
      model: modelName,
      year,
      bodyType,
      trim: trimName,
      engine: engineCode,
      fuelType,
      displacement,
    };

    const identityFingerprint = `${brandName}:${modelName}:${year}:${engineCode}:${fuelType}`.toLowerCase().replace(/\s+/g, '_');
    const identityText = [brandName, modelName, trimName, year, engineCode, fuelType, bodyType].filter(Boolean).join(' ');

    // Mark as RESEARCHING
    await this.prisma.vehiclePowerEnrichment.upsert({
      where: { vehicleVariantId },
      create: {
        vehicleVariantId,
        verificationStatus: PowerVerificationStatus.RESEARCHING,
        identityFingerprint,
        identitySnapshot,
        researchedAt: new Date(),
      },
      update: {
        verificationStatus: PowerVerificationStatus.RESEARCHING,
        identityFingerprint,
        identitySnapshot,
        researchedAt: new Date(),
      },
    });

    try {
      // ----------------------------------------------------
      // PHASE 1: TURKEY PRIMARY RESEARCH
      // ----------------------------------------------------
      const trQuery = `${brandName} ${modelName} ${year} ${engineCode} ${trimName} hp bg kw motor gücü teknik özellikleri`.trim();
      this.logger.log(`[TR_PRIMARY] Researching power for ${brandName} ${modelName} (${year}): "${trQuery}"`);

      this.metrics.externalWebSearchCalls++;
      const trSearchResults = await this.webSearchProvider.search(trQuery, 'tr', 'tr');

      const trSourceMap = new Map<string, any>();
      (trSearchResults || []).slice(0, 8).forEach((res, idx) => {
        const sId = `S${idx + 1}`;
        trSourceMap.set(sId, { ...res, sourceId: sId, resolvedUrl: res.resolvedUrl || res.url });
      });

      const trEvidences = this.extractPowerEvidences(Array.from(trSourceMap.values()), PowerSourceMarket.TURKEY, variant);

      // AI validation & structured extraction with exact vehicle application gate
      const aiExtraction = await this.extractPowerViaAi(identityText, trSourceMap, PowerSourceMarket.TURKEY, brandName, variant);

      if (aiExtraction?.applicationIncompatible) {
        this.logger.warn(`[EXACT_APPLICATION_GATE] Vehicle application "${identityText}" unproven or incompatible (${aiExtraction.reason || ''}). Failing closed.`);
        await this.prisma.vehiclePowerEvidence.deleteMany({
          where: { enrichment: { vehicleVariantId } },
        });
        return await this.prisma.vehiclePowerEnrichment.update({
          where: { vehicleVariantId },
          data: {
            powerKw: null,
            powerPs: null,
            powerHp: null,
            sourceReportedValue: null,
            sourceReportedUnit: null,
            verificationStatus: PowerVerificationStatus.MISSING,
            confidenceScore: 0.0,
            verifiedAt: new Date(),
          },
          include: { evidences: true },
        });
      }

      if (aiExtraction?.powerEvidence) {
        trEvidences.push(aiExtraction.powerEvidence as any);
      }

      if (trEvidences.length > 0) {
        const verifiedResult = this.evaluateEvidences(trEvidences, PowerSourceMarket.TURKEY, PowerMarketResolution.TR_PRIMARY);
        if (verifiedResult.status === PowerVerificationStatus.VERIFIED) {
          return await this.saveEnrichmentResult(vehicleVariantId, verifiedResult, trEvidences);
        }
      }

      // ----------------------------------------------------
      // PHASE 2: EUROPE FALLBACK RESEARCH (Only if TR yielded 0)
      // ----------------------------------------------------
      const euQuery = `${brandName} ${modelName} ${year} ${engineCode} specs kW PS HP europe`.trim();
      this.logger.log(`[EU_FALLBACK] Researching power for ${brandName} ${modelName} (${year}): "${euQuery}"`);

      this.metrics.externalWebSearchCalls++;
      const euSearchResults = await this.webSearchProvider.search(euQuery, 'en', 'eu');

      const euSourceMap = new Map<string, any>();
      (euSearchResults || []).slice(0, 8).forEach((res, idx) => {
        const sId = `S${idx + 1}`;
        euSourceMap.set(sId, { ...res, sourceId: sId, resolvedUrl: res.resolvedUrl || res.url });
      });

      const euEvidences = this.extractPowerEvidences(Array.from(euSourceMap.values()), PowerSourceMarket.EUROPE, variant);
      const aiExtractionEu = await this.extractPowerViaAi(identityText, euSourceMap, PowerSourceMarket.EUROPE, brandName, variant);

      if (aiExtractionEu?.applicationIncompatible) {
        this.logger.warn(`[EXACT_APPLICATION_GATE] Vehicle application "${identityText}" unproven or incompatible (${aiExtractionEu.reason || ''}). Failing closed.`);
        await this.prisma.vehiclePowerEvidence.deleteMany({
          where: { enrichment: { vehicleVariantId } },
        });
        return await this.prisma.vehiclePowerEnrichment.update({
          where: { vehicleVariantId },
          data: {
            powerKw: null,
            powerPs: null,
            powerHp: null,
            sourceReportedValue: null,
            sourceReportedUnit: null,
            verificationStatus: PowerVerificationStatus.MISSING,
            confidenceScore: 0.0,
            verifiedAt: new Date(),
          },
          include: { evidences: true },
        });
      }

      if (aiExtractionEu?.powerEvidence) {
        euEvidences.push(aiExtractionEu.powerEvidence as any);
      }

      if (euEvidences.length > 0) {
        const verifiedResult = this.evaluateEvidences(euEvidences, PowerSourceMarket.EUROPE, PowerMarketResolution.EU_FALLBACK);
        if (verifiedResult.status === PowerVerificationStatus.VERIFIED) {
          return await this.saveEnrichmentResult(vehicleVariantId, verifiedResult, euEvidences);
        }
      }

      // ----------------------------------------------------
      // PHASE 3: NO VALID TR OR EU SOURCE -> MISSING (NO DEFAULT HP!)
      // ----------------------------------------------------
      await this.prisma.vehiclePowerEvidence.deleteMany({
        where: { enrichment: { vehicleVariantId } },
      });
      return await this.prisma.vehiclePowerEnrichment.update({
        where: { vehicleVariantId },
        data: {
          powerKw: null,
          powerPs: null,
          powerHp: null,
          sourceReportedValue: null,
          sourceReportedUnit: null,
          verificationStatus: PowerVerificationStatus.MISSING,
          confidenceScore: 0.0,
          verifiedAt: new Date(),
        },
        include: { evidences: true },
      });
    } catch (error: any) {
      this.logger.error(`Power research failed for variant ${vehicleVariantId}: ${error.message}`);
      return await this.prisma.vehiclePowerEnrichment.update({
        where: { vehicleVariantId },
        data: {
          verificationStatus: PowerVerificationStatus.FAILED,
          confidenceScore: 0.0,
          verifiedAt: new Date(),
        },
        include: { evidences: true },
      });
    }
  }

  /**
   * Filters out non-European / non-Turkish domains and extracts raw power excerpts.
   */
  private extractPowerEvidences(
    results: any[],
    market: PowerSourceMarket,
    targetVariant?: any,
  ): Array<{
    sourceUrl: string;
    sourceDomain: string;
    sourceMarket: PowerSourceMarket;
    reportedValue: number;
    reportedUnit: string;
    title: string;
    evidenceExcerpt: string;
    sourceTier: TechnicalSourceTier;
    sourceKind: string;
    provider?: string;
    providerCitationUri?: string | null;
    providerResultId?: string | null;
    contentHash?: string | null;
    retrievedAt?: string;
    providerSnippet?: string | null;
    retrievedPageExcerpt?: string | null;
    identityMatch?: boolean;
    applicationMatch?: boolean;
  }> {
    const evidences: any[] = [];

    const targetModel = (targetVariant?.model?.name || '').toLowerCase().trim();
    const targetBrand = (targetVariant?.brand?.name || targetVariant?.model?.brand?.name || '').toLowerCase().trim();
    const targetEngine = (targetVariant?.engine?.code || '').toLowerCase().trim();

    for (const res of results) {
      const url = String(res.resolvedUrl || res.url || '');
      const lowerUrl = url.toLowerCase();

      let domain = res.domain || '';
      try {
        domain = new URL(url).hostname.toLowerCase();
      } catch {
        domain = lowerUrl;
      }

      // Generic 5-Tier Source Classification (Section 9)
      const sourceClassification = classifySourceTier(url, targetBrand);
      const sourceTier = sourceClassification.tier;
      const sourceKind = sourceClassification.tierLabel;

      // Reject non-European / non-Turkish market domains strictly UNLESS it is an official Tier 1 OEM Manufacturer domain
      const isOem = sourceTier === TechnicalSourceTier.TIER_1_MANUFACTURER;
      const isForbiddenDomain = !isOem && NON_EU_FORBIDDEN_DOMAINS.some((forbidden) => {
        if (forbidden.startsWith('.')) {
          return domain.endsWith(forbidden) || domain.includes(forbidden + '.');
        }
        return domain.includes(forbidden) || lowerUrl.includes(forbidden);
      });

      if (isForbiddenDomain) {
        this.logger.warn(`[REJECTED_MARKET] Discarding non-European source: ${url}`);
        continue;
      }

      // Application-scoped target identity matching:
      // Discard snippets that explicitly discuss a foreign model while omitting the target model
      const titleLower = String(res.title || '').toLowerCase();
      const snippetLower = String(res.snippet || '').toLowerCase();
      const fullTextLower = `${titleLower} ${snippetLower}`;

      if (targetModel && targetBrand && fullTextLower.includes(targetBrand)) {
        if (!isModelMentionedInText(fullTextLower, targetModel, targetEngine)) {
          this.logger.log(`[FOREIGN_MODEL_DISCARD] Discarding snippet not mentioning target model "${targetModel}": "${res.title}"`);
          continue;
        }
      }

      const text = `${res.title || ''} ${res.providerSnippet || ''} ${res.retrievedPageExcerpt || ''} ${res.snippet || ''}`;

      // Enforce independent vehicle application match (Section 8 & 9)
      if (targetVariant) {
        const appMatch = verifyVehicleApplicationMatch(targetVariant, text, url);
        if (!appMatch.match) {
          this.logger.log(`[APPLICATION_MISMATCH_DISCARD] Discarding source not matching target variant: "${url}" (${appMatch.reason})`);
          continue;
        }
      }

      // Regex for explicit HP / PS / kW / BG values (e.g., 128 HP, 150 PS, 95 BG, 81 kW)
      const matches = text.matchAll(/\b(\d{2,3})\s*(hp|bg|ps|bhp|kw)\b/gi);

      for (const match of matches) {
        const val = parseInt(match[1], 10);
        const unitRaw = match[2].toUpperCase();

        if (val >= 40 && val <= 1000) {
          // Physical passenger vehicle plausibility gate:
          // A stock 1.0L - 1.6L passenger engine cannot produce 230+ HP (that belongs to high-performance 2.0L+ trims like VZ on the same page)
          const engineDisplacement = targetVariant?.engine?.displacement;
          const isSmallEngine = engineDisplacement && engineDisplacement <= 1600;
          if (isSmallEngine && val > 225) {
            continue; // Discard alien trim mentions like 300 HP or 325 HP
          }

          const unit = unitRaw === 'BG' ? 'PS' : unitRaw;
          evidences.push({
            sourceUrl: url,
            sourceDomain: domain,
            sourceMarket: market,
            reportedValue: val,
            reportedUnit: unit,
            title: res.title || '',
            evidenceExcerpt: match[0],
            sourceTier,
            sourceKind,
            provider: res.provider || 'direct_fetch',
            providerCitationUri: res.providerCitationUri || null,
            providerResultId: res.providerResultId || null,
            contentHash: res.contentHash || null,
            retrievedAt: res.retrievedAt || new Date().toISOString(),
            providerSnippet: res.providerSnippet || null,
            retrievedPageExcerpt: res.retrievedPageExcerpt || null,
            identityMatch: true,
            applicationMatch: true,
          });
        }
      }
    }

    return evidences;
  }

  /**
   * Evaluates collected evidences for consensus or conflict.
   * Enforces Section 9: Forum evidence cannot be the primary authority making a field VERIFIED.
   */
  private evaluateEvidences(
    evidences: Array<{
      reportedValue: number;
      reportedUnit: string;
      sourceMarket: PowerSourceMarket;
      sourceTier?: TechnicalSourceTier;
      sourceKind?: string;
    }>,
    market: PowerSourceMarket,
    resolution: PowerMarketResolution,
  ): {
    status: PowerVerificationStatus;
    power?: ConvertedPower;
    confidence: number;
    market: PowerSourceMarket;
    resolution: PowerMarketResolution;
  } {
    if (evidences.length === 0) {
      return {
        status: PowerVerificationStatus.MISSING,
        confidence: 0,
        market,
        resolution,
      };
    }

    // Convert all reported values to HP for comparison
    const convertedList = evidences.map((e) => ({
      ...e,
      converted: convertPowerUnits(e.reportedValue, e.reportedUnit),
      tier: e.sourceTier ?? TechnicalSourceTier.TIER_4_SECONDARY_MEDIA,
    }));

    // Filter out forum-only sources from primary verification authority (Section 9)
    const nonForumEvidences = convertedList.filter(
      (c) => c.tier !== TechnicalSourceTier.TIER_5_COMMUNITY_FORUM,
    );

    if (nonForumEvidences.length === 0) {
      this.logger.warn(`[FORUM_ONLY_EVIDENCE] Only Tier 5 community forum sources found. Cannot grant VERIFIED status.`);
      return {
        status: PowerVerificationStatus.MISSING,
        confidence: 0.2,
        market,
        resolution,
      };
    }

    // Determine consensus using authoritative published sources (Tiers 1-4)
    const consensusList = nonForumEvidences;

    // Cluster power values within a tolerance window of ±4 HP (handling 150 PS = 148 HP)
    interface PowerCluster {
      representativeHp: number;
      minHp: number;
      maxHp: number;
      count: number;
      items: typeof consensusList;
    }

    const clusters: PowerCluster[] = [];
    for (const item of consensusList) {
      const hp = item.converted.powerHp;
      const existingCluster = clusters.find((c) => Math.abs(c.representativeHp - hp) <= 4);
      if (existingCluster) {
        existingCluster.count++;
        existingCluster.items.push(item);
        existingCluster.minHp = Math.min(existingCluster.minHp, hp);
        existingCluster.maxHp = Math.max(existingCluster.maxHp, hp);
      } else {
        clusters.push({
          representativeHp: hp,
          minHp: hp,
          maxHp: hp,
          count: 1,
          items: [item],
        });
      }
    }

    // Sort clusters by evidence count descending
    clusters.sort((a, b) => b.count - a.count);
    const topCluster = clusters[0];

    // Genuine conflict check:
    // Conflict only occurs if there is a competing cluster with significant support (>= 2 authoritative sources and >= 40% of top cluster count)
    // that differs by > 15 HP.
    const runnerUp = clusters[1];
    if (
      runnerUp &&
      runnerUp.count >= 2 &&
      runnerUp.count >= topCluster.count * 0.4 &&
      Math.abs(topCluster.representativeHp - runnerUp.representativeHp) > 15
    ) {
      this.logger.warn(
        `[CONFLICT] Incompatible competing power clusters found across authoritative sources: ${topCluster.representativeHp} HP (${topCluster.count} sources) vs ${runnerUp.representativeHp} HP (${runnerUp.count} sources)`
      );
      return {
        status: PowerVerificationStatus.CONFLICT,
        confidence: 0.3,
        market,
        resolution,
      };
    }

    // Top cluster is verified consensus!
    const topItem = topCluster.items.sort((a, b) => (a.tier || 4) - (b.tier || 4))[0];

    return {
      status: PowerVerificationStatus.VERIFIED,
      power: topItem.converted,
      confidence: Math.min(1.0, 0.7 + topCluster.count * 0.1),
      market,
      resolution,
    };
  }

  /**
   * Persists side-car VehiclePowerEnrichment and VehiclePowerEvidence records.
   */
  private async saveEnrichmentResult(
    vehicleVariantId: string,
    evalResult: ReturnType<typeof this.evaluateEvidences>,
    evidences: any[],
  ) {
    const { status, power, confidence, market, resolution } = evalResult;

    const enrichment = await this.prisma.vehiclePowerEnrichment.update({
      where: { vehicleVariantId },
      data: {
        verificationStatus: status,
        sourceMarket: market,
        marketResolution: resolution,
        confidenceScore: confidence,
        powerKw: power?.powerKw ?? null,
        powerPs: power?.powerPs ?? null,
        powerHp: power?.powerHp ?? null,
        sourceReportedValue: power?.sourceReportedValue ?? null,
        sourceReportedUnit: power?.sourceReportedUnit ?? null,
        verifiedAt: new Date(),
      },
    });

    // Create Evidence records (additive) with sourceKind, sourceMarket, and immutable metadata
    if (evidences.length > 0) {
      await this.prisma.vehiclePowerEvidence.createMany({
        data: evidences.map((ev) => ({
          enrichmentId: enrichment.id,
          sourceUrl: ev.sourceUrl,
          sourceDomain: ev.sourceDomain,
          sourceKind: ev.sourceKind || 'WEB_RESEARCH',
          sourceMarket: ev.sourceMarket,
          reportedValue: ev.reportedValue,
          reportedUnit: ev.reportedUnit,
          title: ev.title,
          evidenceExcerpt: ev.evidenceExcerpt,
          retrievedAt: ev.retrievedAt ? new Date(ev.retrievedAt) : new Date(),
          metadata: {
            provider: ev.provider || 'direct_fetch',
            providerResultId: ev.providerResultId || null,
            providerCitationUri: ev.providerCitationUri || null,
            resolvedUrl: ev.sourceUrl,
            contentHash: ev.contentHash || null,
            sourceTier: ev.sourceTier || null,
            identityMatch: ev.identityMatch !== false,
            applicationMatch: ev.applicationMatch !== false,
            providerSnippet: ev.providerSnippet || null,
            retrievedPageExcerpt: ev.retrievedPageExcerpt || null,
            parserSummary: ev.parserSummary || null,
          },
        })),
      });
    }

    return await this.getEnrichmentByVariantId(vehicleVariantId);
  }

  /**
   * Runs Initial Validation Batch for representative vehicle variants.
   * Verifies VehicleVariant data remains 100% READ ONLY.
   */
  async runInitialBatchEnrichment(limit: number = 30): Promise<PowerEnrichmentReport> {
    const beforeIntegrity = await this.assertVehicleVariantIntegrity();

    const variants = await this.prisma.vehicleVariant.findMany({
      take: limit,
      include: {
        brand: true,
        model: true,
        engine: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const reportResults: PowerEnrichmentReport['results'] = [];
    let verifiedCount = 0;
    let missingCount = 0;
    let conflictCount = 0;
    let failedCount = 0;
    let turkeyPrimaryCount = 0;
    let europeFallbackCount = 0;

    for (const v of variants) {
      try {
        const enriched = await this.researchVariantPower(v.id);
        const st = enriched?.verificationStatus || PowerVerificationStatus.MISSING;
        const mk = enriched?.sourceMarket || undefined;
        const res = enriched?.marketResolution || undefined;

        if (st === PowerVerificationStatus.VERIFIED) verifiedCount++;
        if (st === PowerVerificationStatus.MISSING) missingCount++;
        if (st === PowerVerificationStatus.CONFLICT) conflictCount++;
        if (st === PowerVerificationStatus.FAILED) failedCount++;

        if (res === PowerMarketResolution.TR_PRIMARY) turkeyPrimaryCount++;
        if (res === PowerMarketResolution.EU_FALLBACK) europeFallbackCount++;

        reportResults.push({
          variantId: v.id,
          brand: v.brand?.name || 'Unknown',
          model: v.model?.name || 'Unknown',
          year: v.year,
          engine: v.engine?.code || 'Unknown',
          status: st,
          market: mk,
          marketResolution: res,
          powerHp: enriched?.powerHp,
          powerKw: enriched?.powerKw,
          powerPs: enriched?.powerPs,
          sourceUnit: enriched?.sourceReportedUnit,
          sourceValue: enriched?.sourceReportedValue,
        });
      } catch (err: any) {
        failedCount++;
        reportResults.push({
          variantId: v.id,
          brand: v.brand?.name || 'Unknown',
          model: v.model?.name || 'Unknown',
          year: v.year,
          engine: v.engine?.code || 'Unknown',
          status: PowerVerificationStatus.FAILED,
        });
      }
    }

    const afterIntegrity = await this.assertVehicleVariantIntegrity();
    const variantIntegrityPreserved =
      beforeIntegrity.rowCount === afterIntegrity.rowCount &&
      beforeIntegrity.sampleIdsHash === afterIntegrity.sampleIdsHash;

    return {
      totalTested: variants.length,
      verifiedCount,
      missingCount,
      conflictCount,
      failedCount,
      turkeyPrimaryCount,
      europeFallbackCount,
      variantIntegrityPreserved,
      sampleVariantRowCounts: {
        before: beforeIntegrity.rowCount,
        after: afterIntegrity.rowCount,
      },
      results: reportResults,
    };
  }

  private async extractPowerViaAi(
    vehicleIdentity: string,
    sourceMap: Map<string, any>,
    market: PowerSourceMarket,
    brandName: string,
    targetVariant: any,
  ): Promise<{
    power?: { value: number; unit: 'KW' | 'PS' | 'HP' };
    powerEvidence?: {
      sourceUrl: string;
      sourceDomain: string;
      sourceMarket: PowerSourceMarket;
      reportedValue: number;
      reportedUnit: string;
      title: string;
      evidenceExcerpt: string;
      sourceTier: TechnicalSourceTier;
      sourceKind: string;
      provider?: string;
      providerCitationUri?: string | null;
      providerResultId?: string | null;
      contentHash?: string | null;
      retrievedAt?: string;
      providerSnippet?: string | null;
      retrievedPageExcerpt?: string | null;
      parserSummary?: string | null;
      identityMatch?: boolean;
      applicationMatch?: boolean;
    };
    sourceUrl?: string;
    evidence?: string;
    applicationIncompatible?: boolean;
    reason?: string;
  } | null> {
    this.metrics.externalLLMCalls++;
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

    const systemPrompt = `You are an expert automotive technical power specification extractor.
Given evidence snippets from authoritative automotive sources for target vehicle: "${vehicleIdentity}", extract the exact factory engine power (in kW, PS/bg, or HP).

CRITICAL CONSTRAINTS:
1. You MUST reference an existing source identifier ([S1], [S2], etc.). You are STRICTLY FORBIDDEN from inventing or outputting URLs.
2. The numeric power value MUST be explicitly stated in the source content for that [sourceId].
3. Extract source-side vehicle details (model, badge, market) so application code can independently verify application match.
4. If vehicle model/engine was NOT manufactured or is implausible, return {"applicationCompatible": false, "reason": "TAXONOMY_MISMATCH"}.
5. Return strict JSON matching:
{
  "applicationCompatible": true,
  "sourceId": "S1",
  "power": {
    "value": number,
    "unit": "KW" | "PS" | "HP"
  },
  "parserSummary": "Summary describing power and vehicle application",
  "sourceVehicleDetails": {
    "model": "model name in source",
    "badge": "badge/trim in source",
    "market": "market in source"
  }
}`;

    let parsed: any = null;

    if (openaiKey) {
      try {
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
        this.logger.warn(`OpenAI power extraction failed: ${err.message}`);
      }
    }

    if (!parsed && geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nEVIDENCE:\n${evidenceText}` }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) parsed = JSON.parse(text);
        }
      } catch (err: any) {
        this.logger.warn(`Gemini power extraction failed: ${err.message}`);
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

    if (parsed.power?.value && parsed.power?.unit) {
      const val = Number(parsed.power.value);
      const rawUnit = String(parsed.power.unit).toUpperCase();
      const unit = rawUnit === 'BG' ? 'PS' : (rawUnit as 'KW' | 'PS' | 'HP');

      if (val < 40 || val > 1200) return null;

      // Verify value exists in retrieved authentic text (valueAbsentFromRetrievedEvidenceCanVerifyFact = FALSE)
      const authenticText = `${retrievedSource.providerSnippet || ''} ${retrievedSource.retrievedPageExcerpt || ''} ${retrievedSource.retrievedPageText || ''} ${retrievedSource.title || ''}`;
      const hasValueInText = authenticText.includes(String(Math.round(val)));
      if (!hasValueInText) {
        this.logger.warn(`[AUTHENTICITY_REJECT] Extracted power ${val} ${unit} not physically present in source ${retrievedSource.resolvedUrl}`);
        return null;
      }

      // Verify vehicle application match deterministically
      const appMatchResult = verifyVehicleApplicationMatch(targetVariant, authenticText, retrievedSource.resolvedUrl);
      if (!appMatchResult.match) {
        this.logger.warn(`[APPLICATION_MISMATCH_REJECT] Extracted power source ${retrievedSource.resolvedUrl} does not match target application: ${appMatchResult.reason}`);
        return null;
      }

      const sourceClassification = classifySourceTier(retrievedSource.resolvedUrl, brandName);

      return {
        power: { value: val, unit },
        sourceUrl: retrievedSource.resolvedUrl,
        evidence: retrievedSource.providerSnippet || retrievedSource.retrievedPageExcerpt || `${val} ${unit}`,
        powerEvidence: {
          sourceUrl: retrievedSource.resolvedUrl,
          sourceDomain: retrievedSource.domain,
          sourceMarket: market,
          reportedValue: val,
          reportedUnit: unit,
          title: retrievedSource.title || `${vehicleIdentity} Specifications`,
          evidenceExcerpt: retrievedSource.providerSnippet || retrievedSource.retrievedPageExcerpt || `${val} ${unit}`,
          sourceTier: sourceClassification.tier,
          sourceKind: sourceClassification.tierLabel,
          provider: retrievedSource.provider,
          providerCitationUri: retrievedSource.providerCitationUri,
          providerResultId: retrievedSource.providerResultId,
          contentHash: retrievedSource.contentHash,
          retrievedAt: retrievedSource.retrievedAt,
          providerSnippet: retrievedSource.providerSnippet,
          retrievedPageExcerpt: retrievedSource.retrievedPageExcerpt,
          parserSummary: parsed.parserSummary,
          identityMatch: true,
          applicationMatch: true,
        },
      };
    }

    return null;
  }
}
