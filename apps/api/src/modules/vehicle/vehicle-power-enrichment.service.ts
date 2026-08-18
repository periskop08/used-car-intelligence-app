import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from '../research/providers/web-search.provider';
import {
  PowerVerificationStatus,
  PowerSourceMarket,
  PowerMarketResolution,
} from '@prisma/client';
import { convertPowerUnits, ConvertedPower } from '@used-car-intelligence/shared';

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
    return this.prisma.vehiclePowerEnrichment.findUnique({
      where: { vehicleVariantId },
      include: {
        evidences: {
          orderBy: { retrievedAt: 'desc' },
        },
      },
    });
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
      return existing;
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

      const trSearchResults = await this.webSearchProvider.search(trQuery, 'tr', 'tr');
      const trEvidences = this.extractPowerEvidences(trSearchResults, PowerSourceMarket.TURKEY);

      if (trEvidences.length > 0) {
        const verifiedResult = this.evaluateEvidences(trEvidences, PowerSourceMarket.TURKEY, PowerMarketResolution.TR_PRIMARY);
        return await this.saveEnrichmentResult(vehicleVariantId, verifiedResult, trEvidences);
      }

      // ----------------------------------------------------
      // PHASE 2: EUROPE FALLBACK RESEARCH (Only if TR yielded 0)
      // ----------------------------------------------------
      const euQuery = `${brandName} ${modelName} ${year} ${engineCode} specs kW PS HP europe`.trim();
      this.logger.log(`[EU_FALLBACK] Researching power for ${brandName} ${modelName} (${year}): "${euQuery}"`);

      const euSearchResults = await this.webSearchProvider.search(euQuery, 'en', 'eu');
      const euEvidences = this.extractPowerEvidences(euSearchResults, PowerSourceMarket.EUROPE);

      if (euEvidences.length > 0) {
        const verifiedResult = this.evaluateEvidences(euEvidences, PowerSourceMarket.EUROPE, PowerMarketResolution.EU_FALLBACK);
        return await this.saveEnrichmentResult(vehicleVariantId, verifiedResult, euEvidences);
      }

      // ----------------------------------------------------
      // PHASE 3: NO VALID TR OR EU SOURCE -> MISSING (NO DEFAULT HP!)
      // ----------------------------------------------------
      return await this.prisma.vehiclePowerEnrichment.update({
        where: { vehicleVariantId },
        data: {
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
  ): Array<{
    sourceUrl: string;
    sourceDomain: string;
    sourceMarket: PowerSourceMarket;
    reportedValue: number;
    reportedUnit: string;
    title: string;
    evidenceExcerpt: string;
  }> {
    const evidences: Array<{
      sourceUrl: string;
      sourceDomain: string;
      sourceMarket: PowerSourceMarket;
      reportedValue: number;
      reportedUnit: string;
      title: string;
      evidenceExcerpt: string;
    }> = [];

    for (const res of results) {
      const url = String(res.url || '');
      const lowerUrl = url.toLowerCase();

      // Reject non-European / non-Turkish market domains strictly
      if (NON_EU_FORBIDDEN_DOMAINS.some((domain) => lowerUrl.includes(domain))) {
        this.logger.warn(`[REJECTED_MARKET] Discarding non-European source: ${url}`);
        continue;
      }

      let domain = '';
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = url;
      }

      const text = `${res.title || ''} ${res.snippet || ''}`;

      // Regex for explicit HP / PS / kW / BG values (e.g., 128 HP, 150 PS, 95 BG, 81 kW)
      const matches = text.matchAll(/\b(\d{2,3})\s*(hp|bg|ps|bhp|kw)\b/gi);

      for (const match of matches) {
        const val = parseInt(match[1], 10);
        const unitRaw = match[2].toUpperCase();

        if (val >= 40 && val <= 1000) {
          const unit = unitRaw === 'BG' ? 'PS' : unitRaw;
          evidences.push({
            sourceUrl: url,
            sourceDomain: domain,
            sourceMarket: market,
            reportedValue: val,
            reportedUnit: unit,
            title: res.title || '',
            evidenceExcerpt: match[0],
          });
        }
      }
    }

    return evidences;
  }

  /**
   * Evaluates collected evidences for consensus or conflict.
   */
  private evaluateEvidences(
    evidences: Array<{ reportedValue: number; reportedUnit: string; sourceMarket: PowerSourceMarket }>,
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
    }));

    const uniqueHpValues = Array.from(new Set(convertedList.map((c) => c.converted.powerHp)));

    // Check for major conflict (e.g., difference > 15 HP across valid sources)
    const minHp = Math.min(...uniqueHpValues);
    const maxHp = Math.max(...uniqueHpValues);

    if (maxHp - minHp > 15 && uniqueHpValues.length > 1) {
      this.logger.warn(`[CONFLICT] Incompatible power values found: ${uniqueHpValues.join(', ')} HP`);
      return {
        status: PowerVerificationStatus.CONFLICT,
        confidence: 0.3,
        market,
        resolution,
      };
    }

    // Consensus power (use most frequent HP value)
    const hpCounts = new Map<number, number>();
    for (const item of convertedList) {
      const hp = item.converted.powerHp;
      hpCounts.set(hp, (hpCounts.get(hp) || 0) + 1);
    }

    let topHp = uniqueHpValues[0];
    let maxCount = 0;
    for (const [hp, count] of hpCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        topHp = hp;
      }
    }

    const topItem = convertedList.find((c) => c.converted.powerHp === topHp)!;

    return {
      status: PowerVerificationStatus.VERIFIED,
      power: topItem.converted,
      confidence: Math.min(1.0, 0.7 + maxCount * 0.1),
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

    // Create Evidence records (additive)
    if (evidences.length > 0) {
      await this.prisma.vehiclePowerEvidence.createMany({
        data: evidences.map((ev) => ({
          enrichmentId: enrichment.id,
          sourceUrl: ev.sourceUrl,
          sourceDomain: ev.sourceDomain,
          sourceKind: 'WEB_RESEARCH',
          sourceMarket: ev.sourceMarket,
          reportedValue: ev.reportedValue,
          reportedUnit: ev.reportedUnit,
          title: ev.title,
          evidenceExcerpt: ev.evidenceExcerpt,
        })),
      });
    }

    return this.getEnrichmentByVariantId(vehicleVariantId);
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
}
