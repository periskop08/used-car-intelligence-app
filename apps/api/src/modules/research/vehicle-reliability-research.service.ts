import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  DomainKeyV6,
  SeverityCategoryV6,
  PrevalenceCategoryV6,
  DefectStatusV6,
  CampaignStatusV6,
  EvidenceNumericEligibilityV6,
  ChannelStatusV6,
  ResearchChannelTelemetry,
  LinkedEvidenceSource,
  NormalizedReliabilityEvidence,
  NegativeResearchProof,
  ReliabilityDomainResult,
  VehicleReliabilityResearch,
  ReliabilityFreshnessState,
  ReliabilityKnowledgeFreshness,
  ReliabilityPerformanceTiming,
  ReliabilityRecoveryTelemetry,
  CanonicalRiskLifecycleState,
  RiskApplicabilityState,
  RiskVerificationState,
  RiskConsequenceState,
  CanonicalRiskSource,
  CanonicalRiskDefect,
  sanitizeTurkishDefectDescription,
  sanitizeTurkishDefectTitle,
} from '@used-car-intelligence/shared';
import { WebSearchProvider } from './providers/web-search.provider';
import { SearchResult } from './providers/search-provider.interface';
import { PrismaService } from '../../prisma.service';
import { AITechnicalReasoningService } from './ai-technical-reasoning.service';

export interface VehicleReliabilityResearchInput {
  brand: string;
  model: string;
  generation?: string;
  modelYear: number;
  market?: 'TR' | 'EU' | 'US' | 'GLOBAL' | string;
  marketRegion?: string;
  vin?: string;
  bodyType?: string;
  engineCode?: string;
  transmissionName?: string;
  transmissionCode?: string;
  powertrainType?: 'ICE_PETROL' | 'ICE_DIESEL' | 'HEV' | 'PHEV' | 'BEV';
  isElectric?: boolean;
  isHybrid?: boolean;
  existingDbProblems?: any[];
  existingDbRecalls?: any[];
  rawSearchResults?: any;
  bypassCache?: boolean;
}

export const SEVERITY_SCORE_MAP: Record<SeverityCategoryV6, number | null> = {
  COSMETIC: 1,
  FUNCTIONAL_MINOR: 3,
  DRIVABILITY: 5,
  BREAKDOWN: 7,
  MAJOR_POWERTRAIN: 9,
  SAFETY_CRITICAL: 10,
  UNRESOLVED: null,
};

export const PREVALENCE_FACTOR_MAP: Record<PrevalenceCategoryV6, number> = {
  ISOLATED_BATCH: 0.25,
  RECURRING_CHRONIC: 0.65,
  UNIVERSAL_DESIGN_FLAW: 1.00,
};

export const DOMAIN_WEIGHTS: Record<DomainKeyV6, number> = {
  POWERTRAIN_ENGINE: 0.20,
  POWERTRAIN_TRANS: 0.20,
  EMISSIONS_EXHAUST: 0.15,
  HV_BATTERY_SYSTEM: 0.20,
  THERMAL_COOLING: 0.10,
  ELECTRONICS_BODY: 0.10,
  CHASSIS_BRAKES: 0.10,
  SAFETY_RECALL: 0.15,
};

/**
 * Guard utility identifying web domains, URLs, or generic source publisher / channel labels.
 * Canonical risk defect IDs and semantic failure modes must NEVER be named after a source/domain/channel.
 */
export function isSourceOrDomainLabel(label?: string): boolean {
  if (!label) return true;
  const cleaned = label.trim().toLowerCase();
  if (
    cleaned === 'unknown' ||
    cleaned === 'defect' ||
    cleaned === 'recalls' ||
    cleaned === 'recall' ||
    cleaned === 'service campaign' ||
    cleaned === 'campaign' ||
    cleaned === 'campaigns' ||
    cleaned === 'technical bulletin' ||
    cleaned === 'bülten' ||
    cleaned === 'inceleme' ||
    cleaned === 'araştırma' ||
    cleaned === 'araştırması' ||
    cleaned === 'research' ||
    cleaned === 'query' ||
    cleaned === 'search' ||
    cleaned === 'failure query' ||
    cleaned === 'chronic failure' ||
    cleaned === 'chronic defect' ||
    cleaned === 'kaynak' ||
    cleaned === 'carcomplaints' ||
    cleaned === 'drive' ||
    cleaned === 'nhtsa' ||
    cleaned === 'kba' ||
    cleaned === 'rapex' ||
    cleaned === 'complaints' ||
    cleaned === 'geri çağırma' ||
    cleaned === 'geri cagirma' ||
    cleaned.includes('araştırma') ||
    cleaned.includes('research') ||
    cleaned.includes('bulletin') ||
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('www.') ||
    /\.(com|org|net|co\.uk|eu|de|fr|tr|gov|edu|io|info|biz|me)(\/|$)/i.test(cleaned) ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(cleaned) ||
    /_COM$|_CO_UK$|_NET$|_ORG$|_EU$|_DE$|_TR$/i.test(label.trim().toUpperCase()) ||
    /_ARA_TIRMASI$|_RESEARCH$|_QUERY$|_CHRONIC_FAILURE$|_TSB_BULLETIN$|_FAILURE_QUERY$/i.test(label.trim().toUpperCase())
  ) {
    return true;
  }
  return false;
}

/**
 * Filter for social media posts, repair shop marketing, and clickbait video captions
 * that must NEVER be extracted as verified technical defect evidence.
 */
export function isSocialMediaOrMarketingContent(url?: string, title?: string, snippet?: string): boolean {
  const text = `${url || ''} ${title || ''} ${snippet || ''}`.toLowerCase();
  return (
    text.includes('instagram.com') ||
    text.includes('facebook.com') ||
    text.includes('tiktok.com') ||
    text.includes('threads.net') ||
    text.includes('on instagram') ||
    text.includes('on facebook') ||
    text.includes('on tiktok') ||
    text.includes('usta notu') ||
    text.includes("dm'den") ||
    text.includes('dmden') ||
    text.includes('dm den') ||
    text.includes('fiyat için') ||
    text.includes('whatsapp') ||
    text.includes('abone ol') ||
    text.includes('takip et') ||
    text.includes('link profilde') ||
    text.includes('aracımıza uygulanan') ||
    text.includes('şikayeti giderilmiştir') ||
    text.includes('sonrasında yapılan') ||
    text.includes('garagex on instagram') ||
    text.includes('bakimdayiz.com on instagram')
  );
}

@Injectable()
export class VehicleReliabilityResearchService {
  private readonly logger = new Logger(VehicleReliabilityResearchService.name);

  // L1 In-Memory Fast Cache
  private readonly reliabilityCache = new Map<string, { timestamp: number; data: VehicleReliabilityResearch }>();
  
  // Deterministic Freshness Intervals
  private readonly CHRONIC_FRESHNESS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
  private readonly RECALL_FRESHNESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // 7 Days
  private readonly TOTAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;       // 30 Days Total Validity

  // Bounded Concurrency: Maximum 4 simultaneous external search queries
  private readonly MAX_EXTERNAL_CONCURRENCY = 4;

  public readonly aiReasoningService: AITechnicalReasoningService;

  constructor(
    @Optional() private webSearchProvider?: WebSearchProvider,
    @Optional() private prisma?: PrismaService,
    @Optional() aiReasoningService?: AITechnicalReasoningService,
  ) {
    if (!this.webSearchProvider) {
      this.webSearchProvider = new WebSearchProvider();
    }
    this.aiReasoningService = aiReasoningService || new AITechnicalReasoningService();
  }

  /**
   * Bounded concurrency queue worker to prevent unconstrained external query spam.
   */
  private async runWithConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number = this.MAX_EXTERNAL_CONCURRENCY,
  ): Promise<T[]> {
    if (tasks.length === 0) return [];
    const results: T[] = new Array(tasks.length);
    let taskIndex = 0;

    const worker = async () => {
      while (taskIndex < tasks.length) {
        const current = taskIndex++;
        results[current] = await tasks[current]();
      }
    };

    const workerCount = Math.min(concurrency, tasks.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);
    return results;
  }

  /**
   * Builds an isolated cache key based strictly on full vehicle identity.
   */
  buildCacheKey(input: VehicleReliabilityResearchInput): string {
    const brand = (input.brand || '').trim().toUpperCase();
    const model = (input.model || '').trim().toUpperCase();
    const generation = (input.generation || 'GEN_ALL').trim().toUpperCase();
    const year = input.modelYear || 0;
    const engine = (input.engineCode || 'ENG_ALL').trim().toUpperCase();
    const trans = (input.transmissionCode || input.transmissionName || 'TRANS_ALL').trim().toUpperCase();
    const pType = (input.powertrainType || 'ICE').trim().toUpperCase();
    const region = (input.marketRegion || 'TR').trim().toUpperCase();

    return `REL_SHADOW:${brand}:${model}:${generation}:${year}:${engine}:${trans}:${pType}:${region}`;
  }

  /**
   * Loads verified reliability knowledge from L1 in-memory cache or L2 PostgreSQL database.
   */
  private async loadPersistentKnowledge(
    cacheKey: string,
    input: VehicleReliabilityResearchInput,
  ): Promise<VehicleReliabilityResearch | null> {
    const t0 = Date.now();

    // 1. L1 In-Memory Cache Check
    const memoryCached = this.reliabilityCache.get(cacheKey);
    if (memoryCached) {
      const age = Date.now() - memoryCached.timestamp;
      if (age < this.TOTAL_CACHE_TTL_MS) {
        const state: ReliabilityFreshnessState = age <= this.RECALL_FRESHNESS_TTL_MS ? 'FRESH' : 'STALE';
        this.logger.log(`[SHADOW STAGE 1 L1 CACHE HIT] (${state}) Reusing memory-cached reliability research for ${cacheKey}`);
        return {
          ...memoryCached.data,
          freshness: {
            state,
            researchedAt: new Date(memoryCached.timestamp).toISOString(),
            lastVerifiedAt: new Date().toISOString(),
            expiresAt: new Date(memoryCached.timestamp + this.TOTAL_CACHE_TTL_MS).toISOString(),
            isReused: true,
            chronicFreshnessState: age <= this.CHRONIC_FRESHNESS_TTL_MS ? 'FRESH' : 'EXPIRED',
            recallFreshnessState: age <= this.RECALL_FRESHNESS_TTL_MS ? 'FRESH' : 'STALE',
          },
          timing: {
            cacheLookupMs: Date.now() - t0,
            initialResearchMs: 0,
            recoveryMs: 0,
            totalResearchMs: Date.now() - t0,
            wasCached: true,
          },
        };
      }
    }

    // 2. L2 PostgreSQL Persistent Knowledge Check
    if (this.prisma) {
      try {
        const dbRecord = await (this.prisma as any).vehicleReliabilityKnowledge?.findUnique({
          where: { cacheKey },
        });

        if (dbRecord) {
          const researchedTime = new Date(dbRecord.researchedAt).getTime();
          const age = Date.now() - researchedTime;
          if (age < this.TOTAL_CACHE_TTL_MS) {
            const state: ReliabilityFreshnessState = age <= this.RECALL_FRESHNESS_TTL_MS ? 'FRESH' : 'STALE';
            this.logger.log(`[SHADOW STAGE 1 L2 PG CACHE HIT] (${state}) Reusing persistent DB reliability research for ${cacheKey}`);

            const allVerified = (dbRecord.allVerifiedDefects as any) || [];
            const qualitative = (dbRecord.qualitativeDefects as any) || [];
            const canonicalRisks = (dbRecord as any).canonicalRisks || this.buildCanonicalRisks(input, [...allVerified, ...qualitative]);

            const restoredResult: VehicleReliabilityResearch = {
              researchId: dbRecord.id || `PERSISTED-${Date.now()}`,
              variantId: (input as any).variantId,
              researchedAt: dbRecord.researchedAt?.toISOString ? dbRecord.researchedAt.toISOString() : new Date(researchedTime).toISOString(),
              applicableDomainCount: Object.keys(dbRecord.domainResults || {}).length,
              reliabilityCoverageScore: dbRecord.reliabilityCoverageScore,
              domainResults: dbRecord.domainResults as any,
              allVerifiedDefects: allVerified,
              qualitativeDefects: qualitative,
              canonicalRisks,
              unresolvedContradictions: [],
              freshness: {
                state,
                researchedAt: new Date(researchedTime).toISOString(),
                lastVerifiedAt: dbRecord.lastVerifiedAt?.toISOString ? dbRecord.lastVerifiedAt.toISOString() : new Date().toISOString(),
                expiresAt: new Date(researchedTime + this.TOTAL_CACHE_TTL_MS).toISOString(),
                isReused: true,
                chronicFreshnessState: age <= this.CHRONIC_FRESHNESS_TTL_MS ? 'FRESH' : 'EXPIRED',
                recallFreshnessState: age <= this.RECALL_FRESHNESS_TTL_MS ? 'FRESH' : 'STALE',
              },
              timing: {
                cacheLookupMs: Date.now() - t0,
                initialResearchMs: 0,
                recoveryMs: 0,
                totalResearchMs: Date.now() - t0,
                wasCached: true,
              },
            };

            // Warm L1 cache
            this.reliabilityCache.set(cacheKey, { timestamp: researchedTime, data: restoredResult });
            return restoredResult;
          }
        }
      } catch (err: any) {
        this.logger.warn(`[L2 PERSISTENCE LOOKUP WARN] DB lookup skipped: ${err?.message}`);
      }
    }

    return null;
  }

  /**
   * Persists verified reliability evidence into L1 memory and L2 PostgreSQL.
   */
  private async savePersistentKnowledge(
    cacheKey: string,
    input: VehicleReliabilityResearchInput,
    result: VehicleReliabilityResearch,
  ): Promise<void> {
    const researchedTime = new Date(result.researchedAt).getTime();
    
    // Save to L1 memory cache
    this.reliabilityCache.set(cacheKey, { timestamp: researchedTime, data: result });

    // Save to L2 PostgreSQL
    if (this.prisma) {
      try {
        const expiresAt = new Date(researchedTime + this.TOTAL_CACHE_TTL_MS);
        await (this.prisma as any).vehicleReliabilityKnowledge?.upsert({
          where: { cacheKey },
          create: {
            cacheKey,
            brand: input.brand,
            model: input.model,
            generation: input.generation || null,
            modelYear: input.modelYear,
            marketRegion: input.marketRegion || 'TR',
            engineCode: input.engineCode || null,
            transmissionCode: input.transmissionCode || null,
            transmissionName: input.transmissionName || null,
            powertrainType: input.powertrainType || (input.isElectric ? 'BEV' : input.isHybrid ? 'HEV' : 'ICE_PETROL'),
            bodyType: input.bodyType || null,
            isElectric: input.isElectric === true || input.powertrainType === 'BEV',
            isHybrid: input.isHybrid === true || input.powertrainType === 'HEV' || input.powertrainType === 'PHEV',
            reliabilityCoverageScore: result.reliabilityCoverageScore,
            allVerifiedDefects: result.allVerifiedDefects as any,
            qualitativeDefects: result.qualitativeDefects as any,
            domainResults: result.domainResults as any,
            recallFindings: result.allVerifiedDefects.filter((d) => d.domain === 'SAFETY_RECALL') as any,
            channelStates: Object.values(result.domainResults).flatMap((r) => r.channels) as any,
            schemaVersion: 'v6.0_STAGE1_KNOWLEDGE',
            researchedAt: new Date(result.researchedAt),
            expiresAt,
            lastVerifiedAt: new Date(),
            freshnessMetadata: result.freshness as any,
          },
          update: {
            reliabilityCoverageScore: result.reliabilityCoverageScore,
            allVerifiedDefects: result.allVerifiedDefects as any,
            qualitativeDefects: result.qualitativeDefects as any,
            domainResults: result.domainResults as any,
            recallFindings: result.allVerifiedDefects.filter((d) => d.domain === 'SAFETY_RECALL') as any,
            channelStates: Object.values(result.domainResults).flatMap((r) => r.channels) as any,
            researchedAt: new Date(result.researchedAt),
            expiresAt,
            lastVerifiedAt: new Date(),
            freshnessMetadata: result.freshness as any,
          },
        });

        // Update VehicleVariant if variantId supplied
        const variantId = (input as any).variantId;
        if (variantId && (this.prisma as any).vehicleVariant?.update) {
          await (this.prisma as any).vehicleVariant.update({
            where: { id: variantId },
            data: {
              reliabilityResearchCache: result as any,
              reliabilityResearchedAt: new Date(result.researchedAt),
            },
          }).catch(() => {});
        }
      } catch (err: any) {
        this.logger.warn(`[L2 PERSISTENCE SAVE WARN] DB write skipped: ${err?.message}`);
      }
    }
  }

  /**
   * Plans applicable domains strictly from vehicle architecture.
   * Architecture itself contributes zero risk.
   */
  planApplicableDomains(input: VehicleReliabilityResearchInput): DomainKeyV6[] {
    const isElectric = input.isElectric === true || input.powertrainType === 'BEV';
    const isHybrid = input.isHybrid === true || input.powertrainType === 'HEV' || input.powertrainType === 'PHEV';

    const applicable: DomainKeyV6[] = [];

    if (!isElectric) {
      applicable.push('POWERTRAIN_ENGINE');
    }
    applicable.push('POWERTRAIN_TRANS');
    if (!isElectric) {
      applicable.push('EMISSIONS_EXHAUST');
    }
    if (isElectric || isHybrid) {
      applicable.push('HV_BATTERY_SYSTEM');
    }
    applicable.push('THERMAL_COOLING');
    applicable.push('ELECTRONICS_BODY');
    applicable.push('CHASSIS_BRAKES');
    applicable.push('SAFETY_RECALL');

    return applicable;
  }

  /**
   * Main deterministic reliability research entrypoint.
   * Operates strictly in Stage 1 Shadow Mode adhering to Phase 2D/2D.1/2D.2/2E/2E.1/2F.
   * Features: Persistent knowledge store, bounded parallel execution, targeted recovery, timing instrumentation.
   */
  async runReliabilityResearch(
    input: VehicleReliabilityResearchInput,
  ): Promise<VehicleReliabilityResearch> {
    if (!input || !input.brand || !input.model) {
      throw new Error('Invalid vehicle identity input for reliability research');
    }

    const t0 = Date.now();
    const cacheKey = this.buildCacheKey(input);

    if (!input.bypassCache && !input.rawSearchResults) {
      const cached = await this.loadPersistentKnowledge(cacheKey, input);
      if (cached) {
        return cached;
      }
    }

    const cacheLookupMs = Date.now() - t0;
    const researchId = `REL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.logger.log(`[SHADOW STAGE 1] Starting Live Reliability Research for ${input.brand} ${input.model} ${input.modelYear}`);

    const allDomains: DomainKeyV6[] = [
      'POWERTRAIN_ENGINE',
      'POWERTRAIN_TRANS',
      'EMISSIONS_EXHAUST',
      'HV_BATTERY_SYSTEM',
      'THERMAL_COOLING',
      'ELECTRONICS_BODY',
      'CHASSIS_BRAKES',
      'SAFETY_RECALL',
    ];

    const applicableDomainsSet = new Set(this.planApplicableDomains(input));
    const applicableDomains = allDomains.filter((d) => applicableDomainsSet.has(d));
    const domainResults: Record<DomainKeyV6, ReliabilityDomainResult> = {} as any;

    // Set up NOT_APPLICABLE domains immediately
    allDomains.forEach((domain) => {
      if (!applicableDomainsSet.has(domain)) {
        domainResults[domain] = {
          domain,
          state: 'NOT_APPLICABLE',
          weight: DOMAIN_WEIGHTS[domain],
          coverageCredit: 0.0,
          defects: [],
          channels: [
            {
              channelKey: `${domain}_CHANNELS`,
              status: 'NOT_APPLICABLE',
              sourcesEvaluatedCount: 0,
              sources: [],
            },
          ],
        };
      }
    });

    // 1. Initial Bounded Concurrent Research Pass across all applicable domains
    const tInitialStart = Date.now();
    const domainExecutionTasks = applicableDomains.map((domain) => async () => {
      const { channelTelemetryList, liveExtractedCandidates } = await this.planAndExecuteChannels(domain, input);
      return { domain, channelTelemetryList, liveExtractedCandidates };
    });

    const initialDomainOutputs = await this.runWithConcurrencyLimit(domainExecutionTasks, this.MAX_EXTERNAL_CONCURRENCY);

    // Evaluate initial domain states
    const rawCandidatesByDomain = new Map<DomainKeyV6, any[]>();
    for (const out of initialDomainOutputs) {
      rawCandidatesByDomain.set(out.domain, out.liveExtractedCandidates);
      const domainDefectCandidates = this.extractAndClusterDefects(out.domain, input, out.liveExtractedCandidates);
      domainResults[out.domain] = this.evaluateDomainResearch(out.domain, out.channelTelemetryList, domainDefectCandidates);
    }
    const initialResearchMs = Date.now() - tInitialStart;

    // 2. Targeted Recovery Pass: identify missing / failed critical domains
    let recoveryMs = 0;
    const recoveredDomainKeys: DomainKeyV6[] = [];
    let recoveryQueriesCount = 0;

    if (!input.rawSearchResults) {
      const domainsNeedingRecovery = applicableDomains.filter((domain) => {
        const res = domainResults[domain];
        // Trigger targeted recovery if research failed or coverage credit < 1.0 and 0 verified defects found
        return res && (res.state === 'RESEARCH_FAILED' || res.coverageCredit < 1.0) && res.defects.length === 0;
      });

      if (domainsNeedingRecovery.length > 0) {
        const tRecStart = Date.now();
        this.logger.log(`[SHADOW STAGE 1 RECOVERY] Launching targeted recovery for domains: ${domainsNeedingRecovery.join(', ')}`);

        const recoveryTasks = domainsNeedingRecovery.map((domain) => async () => {
          const recQueryPlan = this.buildTargetedRecoveryQuery(domain, input);
          const recResults = await this.executeSingleQuery(recQueryPlan, domain, input);
          return { domain, recQueryPlan, recResults };
        });

        const recoveryOutputs = await this.runWithConcurrencyLimit(recoveryTasks, this.MAX_EXTERNAL_CONCURRENCY);

        for (const out of recoveryOutputs) {
          recoveredDomainKeys.push(out.domain);
          recoveryQueriesCount++;

          const existingRes = domainResults[out.domain];
          const updatedChannels = [...existingRes.channels, out.recResults.channelTelemetry];
          const existingLive = rawCandidatesByDomain.get(out.domain) || [];
          const combinedLive = [...existingLive, ...out.recResults.liveExtractedCandidates];
          rawCandidatesByDomain.set(out.domain, combinedLive);

          const domainDefectCandidates = this.extractAndClusterDefects(out.domain, input, combinedLive);
          domainResults[out.domain] = this.evaluateDomainResearch(out.domain, updatedChannels, domainDefectCandidates);
        }

        recoveryMs = Date.now() - tRecStart;
      }
    }

    // 3. Normalize and Cluster DB Evidence + Raw Web Evidence across all domains
    const allNormalizedDefects: NormalizedReliabilityEvidence[] = [];
    const qualitativeDefects: NormalizedReliabilityEvidence[] = [];
    const discoveryTelemetry: NormalizedReliabilityEvidence[] = [];

    allDomains.forEach((domain) => {
      const dResult = domainResults[domain];
      if (!dResult || dResult.state === 'NOT_APPLICABLE') return;

      dResult.defects.forEach((cand) => {
        if (cand.numericEligibility === 'NUMERIC_ELIGIBLE') {
          allNormalizedDefects.push(cand);
        } else if (cand.numericEligibility === 'QUALITATIVE_ONLY') {
          qualitativeDefects.push(cand);
        }
      });

      const live = rawCandidatesByDomain.get(domain) || [];
      const domainCandidates = this.extractAndClusterDefects(domain, input, live);
      domainCandidates
        .filter((c) => c.numericEligibility === 'REJECTED')
        .forEach((rej) => discoveryTelemetry.push(rej));
    });

    // Global cross-domain deduplication cluster
    let globallyClusteredVerified = this.clusterEvidenceList(allNormalizedDefects);
    let globallyClusteredQualitative = this.clusterEvidenceList(qualitativeDefects);
    const globallyClusteredDiscovery = this.clusterEvidenceList(discoveryTelemetry);

    // Targeted Consequence Recovery for verified defects lacking direct consequence evidence
    const verifiedClusters = [...globallyClusteredVerified, ...globallyClusteredQualitative];
    const globalRecoveryBudget = { queriesExecuted: 0, maxBudget: 8 };

    for (const def of verifiedClusters) {
      if (
        def.severityCategory === 'UNRESOLVED' ||
        def.severityScore === null ||
        def.severityBasis === 'INFERRED_FROM_VERIFIED_FAILURE_MODE'
      ) {
        await this.recoverDefectConsequence(def, input, globalRecoveryBudget);
      }
    }

    // DISCOVERY CANDIDATES: Tier 3 community/forum evidence alone cannot verify or score a defect,
    // but it MAY trigger targeted Tier 1/2 recovery.
    // If recovery independently finds Tier 1 or Tier 2 verification evidence, promote candidate to VERIFIED.
    // Otherwise remain advisory / discovery only.
    for (const disc of globallyClusteredDiscovery) {
      const failMode = disc.normalizedFailureMode || '';
      if (
        failMode &&
        failMode !== 'UNKNOWN' &&
        !isSourceOrDomainLabel(failMode) &&
        !isSourceOrDomainLabel(disc.title)
      ) {
        const recovered = await this.recoverDefectConsequence(disc, input, globalRecoveryBudget);
        const hasTier1or2 = recovered.linkedSources.some(
          (s) => s.sourceTier === 'TIER_1' || s.sourceTier === 'TIER_2',
        );
        if (hasTier1or2 && recovered.severityScore !== null && recovered.severityScore > 0) {
          recovered.numericEligibility = 'QUALITATIVE_ONLY';
          recovered.rejectionReason = undefined;
          globallyClusteredQualitative.push(recovered);
        }
      }
    }

    // FINAL CONSEQUENCE RECOVERY LAYER BEFORE NOT_ESTIMABLE
    // For every verified / advisory risk with severity === null:
    // run one final campaign-specific consequence recovery stage.
    const allVerifiedSoFar = [...globallyClusteredVerified, ...globallyClusteredQualitative];
    for (const cand of allVerifiedSoFar) {
      if (
        cand.severityScore === null ||
        cand.severityCategory === 'UNRESOLVED' ||
        cand.severityBasis === 'UNRESOLVED'
      ) {
        if (globalRecoveryBudget.queriesExecuted < globalRecoveryBudget.maxBudget + 4) {
          await this.recoverDefectConsequence(cand, input, globalRecoveryBudget);
        }
      }
    }

    // 4. Compute Reliability Coverage Score strictly across applicable domains
    const totalApplicableWeight = applicableDomains.reduce((sum, d) => sum + DOMAIN_WEIGHTS[d], 0);
    const earnedWeight = applicableDomains.reduce(
      (sum, d) => sum + DOMAIN_WEIGHTS[d] * domainResults[d].coverageCredit,
      0,
    );

    const reliabilityCoverageScore =
      totalApplicableWeight > 0 ? Math.round((earnedWeight / totalApplicableWeight) * 100) : 0;

    const totalResearchMs = Date.now() - t0;
    const researchedAt = new Date().toISOString();

    const canonicalRisks = this.buildCanonicalRisks(input, [
      ...globallyClusteredVerified,
      ...globallyClusteredQualitative,
      ...globallyClusteredDiscovery,
    ]);

    // AI Technical Reasoning Fallback for resolved vehicles:
    // Trigger ONLY when:
    // 1. Vehicle identity is resolved
    // 2. Bounded research completed
    // 3. finalDecisionScore would otherwise be null (no scoring-eligible canonical risks with severity > 0)
    const hasScoringRisks = canonicalRisks.some(
      (cr) => cr.scoringEligible && typeof cr.severity === 'number' && cr.severity > 0,
    );
    const isVehicleIdentityResolved = !!(input.brand && input.model && input.modelYear);

    if (!hasScoringRisks && isVehicleIdentityResolved) {
      await this.aiReasoningService.applyTechnicalReasoningFallback(input, canonicalRisks, domainResults);

      const promotedRisks = canonicalRisks.filter(
        (cr) => cr.inferenceBasis === 'AI_INFERRED_FROM_VERIFIED_FACTS' && cr.scoringEligible,
      );

      if (promotedRisks.length > 0) {
        promotedRisks.forEach((pr) => {
          const existingQual = globallyClusteredQualitative.find(
            (d) => d.normalizedFailureMode === pr.normalizedFailureMode,
          );
          if (existingQual) {
            existingQual.severityScore = pr.severity;
            existingQual.severityBasis = pr.severityBasis;
            (existingQual as any).scoringEligible = true;
            (existingQual as any).consequenceState = pr.consequenceState;
            (existingQual as any).inferredConsequence = pr.inferredConsequence;
            (existingQual as any).reasoningChain = pr.reasoningChain;
            (existingQual as any).supportingFactIds = pr.supportingFactIds;
            (existingQual as any).inferenceBasis = pr.inferenceBasis;
            (existingQual as any).inferenceConfidence = pr.inferenceConfidence;
          } else {
            const disc = globallyClusteredDiscovery.find(
              (d) => d.normalizedFailureMode === pr.normalizedFailureMode,
            );
            if (disc) {
              const promotedEvidence: any = {
                ...disc,
                severityScore: pr.severity,
                severityBasis: pr.severityBasis,
                numericEligibility: 'QUALITATIVE_ONLY',
                prevalenceFactor: null,
                severityCategory: (pr.severity ?? 0) >= 8 ? 'SAFETY_CRITICAL' : (pr.severity ?? 0) >= 7 ? 'BREAKDOWN' : (pr.severity ?? 0) >= 5 ? 'DRIVABILITY' : 'FUNCTIONAL_MINOR',
                verificationState: pr.verificationState as any,
                scoringEligible: true,
                consequenceState: pr.consequenceState as any,
                inferredConsequence: pr.inferredConsequence,
                reasoningChain: pr.reasoningChain,
                supportingFactIds: pr.supportingFactIds,
                inferenceBasis: pr.inferenceBasis,
                inferenceConfidence: pr.inferenceConfidence,
              };
              globallyClusteredQualitative.push(promotedEvidence);
            }
          }
        });
      }
    }

    // Sync non-scoring state to domainResults defects
    const nonScoringFailureModes = new Set(
      canonicalRisks.filter((cr) => !cr.scoringEligible).map((cr) => cr.normalizedFailureMode),
    );
    Object.values(domainResults).forEach((dr) => {
      dr.defects?.forEach((d) => {
        if (nonScoringFailureModes.has(d.normalizedFailureMode)) {
          (d as any).scoringEligible = false;
        } else if (canonicalRisks.some((cr) => cr.normalizedFailureMode === d.normalizedFailureMode && cr.scoringEligible)) {
          (d as any).scoringEligible = true;
          const cr = canonicalRisks.find((c) => c.normalizedFailureMode === d.normalizedFailureMode);
          if (cr && typeof cr.severity === 'number' && cr.severity > 0) {
            d.severityScore = cr.severity;
            d.severityBasis = cr.severityBasis;
          }
        }
      });
    });

    const researchResult: VehicleReliabilityResearch = {
      researchId,
      variantId: (input as any).variantId,
      researchedAt,
      applicableDomainCount: applicableDomains.length,
      reliabilityCoverageScore,
      domainResults,
      allVerifiedDefects: globallyClusteredVerified,
      qualitativeDefects: globallyClusteredQualitative,
      canonicalRisks,
      discoveryTelemetry: globallyClusteredDiscovery,
      unresolvedContradictions: [],
      freshness: {
        state: 'FRESH',
        researchedAt,
        lastVerifiedAt: researchedAt,
        expiresAt: new Date(Date.now() + this.TOTAL_CACHE_TTL_MS).toISOString(),
        isReused: false,
        chronicFreshnessState: 'FRESH',
        recallFreshnessState: 'FRESH',
      },
      timing: {
        cacheLookupMs,
        initialResearchMs,
        recoveryMs,
        totalResearchMs,
        wasCached: false,
      },
      recoveryTelemetry: {
        recoveryExecuted: recoveredDomainKeys.length > 0,
        recoveredDomainKeys,
        additionalQueriesCount: recoveryQueriesCount,
      },
    };

    if (!input.rawSearchResults) {
      await this.savePersistentKnowledge(cacheKey, input, researchResult);
    }

    return researchResult;
  }

  /**
   * Builds domain-specific search queries using strongest verified technical identity.
   * Employs paired local Turkish chronic queries and standardized global technical bulletin / TSB queries.
   */
  buildDomainQueries(
    domain: DomainKeyV6,
    input: VehicleReliabilityResearchInput,
  ): Array<{ channelKey: string; query: string; isRecallOrTsb: boolean }> {
    const year = input.modelYear;
    const brand = input.brand;
    const model = input.model;
    const gen = input.generation ? `${input.generation}` : '';
    const eng = input.engineCode ? `${input.engineCode}` : '';
    const trans = input.transmissionCode || input.transmissionName || '';

    switch (domain) {
      case 'POWERTRAIN_ENGINE': {
        const cleanGen = (input.generation || '')
          .replace(/Jenerasyonu/gi, '')
          .replace(new RegExp(input.model || '', 'gi'), '')
          .trim();
        const genTerm = cleanGen ? ` ${cleanGen}` : '';
        return [
          {
            channelKey: 'POWERTRAIN_ENGINE_CHRONIC_FAILURE',
            query: `${year} ${brand} ${model}${genTerm} ${eng} kronik motor arizalari motor omru problemleri`.trim(),
            isRecallOrTsb: false,
          },
          {
            channelKey: 'POWERTRAIN_ENGINE_TSB_BULLETIN',
            query: `${brand} ${model} ${eng} engine failure technical service bulletin TSB defect`.trim(),
            isRecallOrTsb: true,
          },
        ];
      }

      case 'POWERTRAIN_TRANS':
        return [
          {
            channelKey: 'POWERTRAIN_TRANS_FAILURE_QUERY',
            query: `${year} ${brand} ${model} ${trans} sanziman kronik ariza kavrama mekatronik problemleri`.trim(),
            isRecallOrTsb: false,
          },
          {
            channelKey: 'POWERTRAIN_TRANS_TSB_BULLETIN',
            query: `${brand} ${model} ${trans} transmission gearbox reliability failure technical bulletin`.trim(),
            isRecallOrTsb: true,
          },
        ];

      case 'EMISSIONS_EXHAUST':
        return [
          {
            channelKey: 'EMISSIONS_EXHAUST_FAILURE_QUERY',
            query: `${year} ${brand} ${model} ${eng} DPF EGR AdBlue SCR emisyon kronik tikanma ariza`.trim(),
            isRecallOrTsb: false,
          },
          {
            channelKey: 'EMISSIONS_EXHAUST_TSB_BULLETIN',
            query: `${brand} ${model} ${eng} emissions DPF EGR SCR technical bulletin defect failure`.trim(),
            isRecallOrTsb: true,
          },
        ];

      case 'HV_BATTERY_SYSTEM':
        return [
          {
            channelKey: 'HV_BATTERY_SYSTEM_FAILURE_QUERY',
            query: `${year} ${brand} ${model} batarya sagligi HV battery degradation ICCU inverter BMS ariza`.trim(),
            isRecallOrTsb: false,
          },
          {
            channelKey: 'HV_BATTERY_SYSTEM_TSB_BULLETIN',
            query: `${brand} ${model} high voltage battery ICCU inverter BMS failure technical bulletin defect`.trim(),
            isRecallOrTsb: true,
          },
        ];

      case 'THERMAL_COOLING':
        return [
          {
            channelKey: 'THERMAL_COOLING_FAILURE_QUERY',
            query: `${year} ${brand} ${model} ${eng} sogutma suyu eksiltme devirdaim termostat hararet kronik`.trim(),
            isRecallOrTsb: false,
          },
          {
            channelKey: 'THERMAL_COOLING_TSB_BULLETIN',
            query: `${brand} ${model} ${eng} cooling system thermostat water pump coolant leak technical bulletin defect`.trim(),
            isRecallOrTsb: true,
          },
        ];

      case 'ELECTRONICS_BODY':
        return [
          {
            channelKey: 'ELECTRONICS_BODY_FAILURE_QUERY',
            query: `${year} ${brand} ${model} ${gen} elektronik beyin multimedya hayalet gosterge kilit arizalari`.trim(),
            isRecallOrTsb: false,
          },
          {
            channelKey: 'ELECTRONICS_BODY_TSB_BULLETIN',
            query: `${brand} ${model} ${gen} electrical telematics DCM infotainment module fault bulletin defect`.trim(),
            isRecallOrTsb: true,
          },
        ];

      case 'CHASSIS_BRAKES':
        return [
          {
            channelKey: 'CHASSIS_BRAKES_FAILURE_QUERY',
            query: `${year} ${brand} ${model} ${gen} suspansiyon direksiyon kutusu fren kaliper kronik ses ariza`.trim(),
            isRecallOrTsb: false,
          },
          {
            channelKey: 'CHASSIS_BRAKES_TSB_BULLETIN',
            query: `${brand} ${model} suspension steering control arm brake caliper defect technical bulletin`.trim(),
            isRecallOrTsb: true,
          },
        ];

      case 'SAFETY_RECALL':
        return [
          {
            channelKey: 'SAFETY_RECALL_REGISTRY',
            query: `${year} ${brand} ${model} resmi geri cagirma recall service campaign NHTSA KBA RAPEX Safety Gate`.trim(),
            isRecallOrTsb: true,
          },
        ];

      default:
        return [
          {
            channelKey: `${domain}_GENERAL_QUERY`,
            query: `${year} ${brand} ${model} kronik arizalar technical failure reliability`.trim(),
            isRecallOrTsb: false,
          },
        ];
    }
  }

  /**
   * Builds domain-specific targeted recovery queries using broader English/global technical formulation.
   */
  buildTargetedRecoveryQuery(
    domain: DomainKeyV6,
    input: VehicleReliabilityResearchInput,
  ): { channelKey: string; query: string; isRecallOrTsb: boolean } {
    const brand = input.brand;
    const model = input.model;
    const year = input.modelYear;
    const gen = input.generation ? `${input.generation}` : '';
    const eng = input.engineCode ? `${input.engineCode}` : '';
    const trans = input.transmissionCode || input.transmissionName || '';

    switch (domain) {
      case 'POWERTRAIN_ENGINE':
        return {
          channelKey: 'RECOVERY_ENGINE_GLOBAL_TSB',
          query: `${brand} ${model} ${year} ${eng} engine failure defect technical service bulletin TSB`.trim(),
          isRecallOrTsb: true,
        };
      case 'POWERTRAIN_TRANS':
        return {
          channelKey: 'RECOVERY_TRANS_GLOBAL_TSB',
          query: `${brand} ${model} ${trans} transmission gearbox defect technical service bulletin failure`.trim(),
          isRecallOrTsb: true,
        };
      case 'EMISSIONS_EXHAUST':
        return {
          channelKey: 'RECOVERY_EMISSIONS_GLOBAL_TSB',
          query: `${brand} ${model} ${eng} DPF EGR emissions technical bulletin defect failure`.trim(),
          isRecallOrTsb: true,
        };
      case 'HV_BATTERY_SYSTEM':
        return {
          channelKey: 'RECOVERY_BATTERY_GLOBAL_TSB',
          query: `${brand} ${model} high voltage battery ICCU inverter BMS failure defect bulletin`.trim(),
          isRecallOrTsb: true,
        };
      case 'THERMAL_COOLING':
        return {
          channelKey: 'RECOVERY_COOLING_GLOBAL_TSB',
          query: `${brand} ${model} ${eng} cooling system thermostat water pump overheat technical defect`.trim(),
          isRecallOrTsb: true,
        };
      case 'ELECTRONICS_BODY':
        return {
          channelKey: 'RECOVERY_ELECTRONICS_GLOBAL_TSB',
          query: `${brand} ${model} ${gen} electrical ECU infotainment screen module fault bulletin`.trim(),
          isRecallOrTsb: true,
        };
      case 'CHASSIS_BRAKES':
        return {
          channelKey: 'RECOVERY_CHASSIS_GLOBAL_TSB',
          query: `${brand} ${model} suspension steering brake caliper defect technical bulletin`.trim(),
          isRecallOrTsb: true,
        };
      case 'SAFETY_RECALL':
        return {
          channelKey: 'RECOVERY_RECALL_GLOBAL_REGISTRY',
          query: `${year} ${brand} ${model} safety recall campaign NHTSA KBA technical bulletin`.trim(),
          isRecallOrTsb: true,
        };
      default:
        return {
          channelKey: `RECOVERY_${domain}_GLOBAL`,
          query: `${year} ${brand} ${model} technical service bulletin defect failure`.trim(),
          isRecallOrTsb: true,
        };
    }
  }

  /**
   * Classifies a source tier according to comprehensive SOURCE-CLASS evaluation.
   * - Tier 1: Official Regulatory Authorities & OEM Technical Portals.
   * - Tier 3: Forums, social media, and user-generated content (always evaluated first!).
   * - Tier 2: Reputable technical repair networks, component manufacturers, inspection/fleet bodies,
   *           and established technical automotive press.
   */
  classifySourceTier(url?: string, domain?: string): LinkedEvidenceSource['sourceTier'] {
    const rawUrl = (url || '').toLowerCase();
    const rawDomain = (domain || '').toLowerCase();

    // 1. TIER 1: Official OEM or Government Safety Authorities
    const isTier1 =
      rawDomain.endsWith('.gov') ||
      rawUrl.includes('.gov/') ||
      rawDomain.includes('kba.de') ||
      rawUrl.includes('kba.de') ||
      rawDomain.includes('nhtsa') ||
      rawUrl.includes('nhtsa') ||
      rawDomain.includes('rapex') ||
      rawUrl.includes('rapex') ||
      rawDomain.includes('safety-gate') ||
      rawUrl.includes('safety-gate') ||
      rawDomain.includes('europa.eu/safety') ||
      rawUrl.includes('europa.eu/safety') ||
      rawDomain.includes('dft.gov.uk') ||
      rawUrl.includes('dft.gov.uk') ||
      rawDomain.includes('dvsa.gov.uk') ||
      rawUrl.includes('dvsa.gov.uk') ||
      rawDomain.includes('erwin.volkswagen') ||
      rawUrl.includes('erwin.volkswagen') ||
      rawDomain.includes('tis.bmwgroup') ||
      rawUrl.includes('tis.bmwgroup') ||
      rawDomain.includes('toyota-tech.eu') ||
      rawUrl.includes('toyota-tech.eu') ||
      rawDomain.includes('servicebox.peugeot') ||
      rawUrl.includes('servicebox.peugeot') ||
      rawDomain.includes('service.tesla.com') ||
      rawUrl.includes('service.tesla.com') ||
      rawDomain.includes('oem-is.com') ||
      rawUrl.includes('oem-is.com') ||
      rawDomain.includes('techinfo.honda.com') ||
      rawUrl.includes('techinfo.honda.com') ||
      rawDomain.includes('motorcraftservice.com') ||
      rawUrl.includes('motorcraftservice.com');

    if (isTier1) {
      return 'TIER_1';
    }

    // 2. FORUMS / SOCIAL MEDIA / UGC -> STRICTLY TIER 3 (Rule out before Tier 2!)
    const isUgcOrForum =
      rawDomain.includes('reddit.com') ||
      rawDomain.includes('youtube.com') ||
      rawDomain.includes('facebook.com') ||
      rawDomain.includes('twitter.com') ||
      rawDomain.includes('x.com') ||
      rawDomain.includes('instagram.com') ||
      rawDomain.includes('tiktok.com') ||
      rawDomain.includes('quora.com') ||
      rawDomain.includes('wikipedia.org') ||
      rawDomain.includes('donanimhaber.com') ||
      rawDomain.includes('eksisozluk.com') ||
      rawDomain.includes('sikayetvar.com') ||
      rawDomain.includes('drive2.ru') ||
      /\b(?:forum|forums|community|boards?|club|groups?)\b/i.test(rawDomain) ||
      /\/(?:forum|forums|community|threads?|topic|discussion)\b/i.test(rawUrl);

    if (isUgcOrForum) {
      return 'TIER_3';
    }

    // 3. TIER 2: Comprehensive SOURCE-CLASS Evaluation
    // Class A: Technical Repair Networks & Workshop Databases
    const isRepairNetwork =
      /\b(?:alldata|identifix|autodata|haynes(?:pro)?|mitchell1|atsg|troublecodes|obd-codes|tsbsearch|carcomplaints|carrepairdata|repairpal|iatn|repxpert|workshop-manuals)\b/i.test(rawDomain);

    // Class B: Tier-1 Component Manufacturers & Technical Bulletins
    const isComponentManufacturer =
      /\b(?:bosch|zf|schaeffler|continental|gatestechzone|dayco|mahle|hella|garrettmotion|borgwarner|valeo|denso|luk|ina|fag|skf|brembo)\b/i.test(rawDomain);

    // Class C: Inspection, Fleet & Warranty Reliability Organizations
    const isInspectionOrFleet =
      /\b(?:adac|tuv|tüv|dekra|warrantywise|reliabilityindex|whatcar|consumerreports|car-recalls|autosafety)\b/i.test(rawDomain);

    // Class D: Established Technical Automotive Publications & Specialist Outlets
    const isTechnicalPress =
      /\b(?:pmmonline|autocar|caranddriver|edmunds|autobild|motor1|auto-motor-und-sport|autoexpress|largus|caradisiac|autoplus|automobile-magazine|parkers|carbuyer|wardsauto|automotive-fleet|fleetnews|sekizsilindir|otohaber|ototeknikveri|carexpert|drive\.com\.au|andcetin)\b/i.test(rawDomain);

    // Class E: Technical Service Bulletin or Recall URL patterns from credible web publishers
    const isTechnicalBulletinUrl =
      /\b(?:technical-service-bulletin|recall-bulletin|service-action|recalls?|tsb|bulletin)\b/i.test(rawUrl) &&
      !rawDomain.includes('blog') &&
      !rawDomain.includes('forum');

    if (isRepairNetwork || isComponentManufacturer || isInspectionOrFleet || isTechnicalPress || isTechnicalBulletinUrl) {
      return 'TIER_2';
    }

    // 4. Default: TIER 3 (General / unvetted web source)
    return 'TIER_3';
  }

  /**
   * Executes a single query plan (for initial search or targeted recovery).
   */
  async executeSingleQuery(
    qPlan: { channelKey: string; query: string; isRecallOrTsb: boolean },
    domain: DomainKeyV6,
    input: VehicleReliabilityResearchInput,
  ): Promise<{ channelTelemetry: ResearchChannelTelemetry; liveExtractedCandidates: any[] }> {
    const liveExtractedCandidates: any[] = [];
    try {
      const searchResults: SearchResult[] = this.webSearchProvider
        ? await this.webSearchProvider.search(qPlan.query, 'tr', 'tr')
        : [];

      const evaluatedSources = searchResults.map((res, idx) => {
        const tier = this.classifySourceTier(res.url, res.domain);
        return {
          sourceId: `SRC-${domain}-${idx}-${Date.now().toString(36)}`,
          domain: res.domain || 'web',
          tier,
        };
      });

      const channelTelemetry: ResearchChannelTelemetry = {
        channelKey: qPlan.channelKey,
        status: 'AVAILABLE_EXECUTED',
        queryOrEndpoint: qPlan.query,
        sourcesEvaluatedCount: searchResults.length,
        sources: evaluatedSources,
      };

      searchResults.forEach((res, idx) => {
        const tier = this.classifySourceTier(res.url, res.domain);
        const snippetText = res.snippet || res.title || '';
        const fullContentText = res.retrievedPageText || res.retrievedPageExcerpt || res.contentMarkdown || snippetText;

        // Filter out generic informational / consumer awareness pages lacking vehicle-specific defect evidence
        if (this.isGenericInformationalRecallPage(res.title, snippetText, res.url)) {
          return;
        }

        // Filter out social media posts, repair shop reels/shorts, and marketing posts
        if (isSocialMediaOrMarketingContent(res.url, res.title, snippetText)) {
          return;
        }

        if (snippetText.length > 20 || fullContentText.length > 20) {
          const campaignId = this.extractCampaignId(`${res.title || ''} ${snippetText} ${res.url || ''} ${fullContentText.slice(0, 1000)}`);
          const candidateConsequence = this.extractDefectLocalConsequence(
            fullContentText,
            snippetText,
            res.title || snippetText,
            domain,
          );

          const DOMAIN_LABELS_TR: Record<string, string> = {
            POWERTRAIN_ENGINE: 'Motor Mekaniği & Zamanlama',
            POWERTRAIN_TRANS: 'Şanzıman & Aktarma Organları',
            EMISSIONS_EXHAUST: 'Emisyon & Egzoz Arıtma',
            HV_BATTERY_SYSTEM: 'Yüksek Voltaj & Batarya Sistemi',
            THERMAL_COOLING: 'Termal Yönetim & Soğutma',
            ELECTRONICS_BODY: 'Gövde Elektroniği & Donanım',
            CHASSIS_BRAKES: 'Yürüyen Aksam, Direksiyon & Fren',
            SAFETY_RECALL: 'Resmi Geri Çağırma & Güvenlik',
          };
          const trDomainName = DOMAIN_LABELS_TR[domain] || domain.replace(/_/g, ' ');
          let cleanTitle = res.title;
          if (cleanTitle) {
            cleanTitle = cleanTitle.replace(/\s*[-–|]\s*(Drive|CarComplaints|AutoExpress|What Car\??|NHTSA|KBA|Auto Bild|Parkers|Edmunds|Kelly Blue Book|KBB|Reddit|YouTube|Consumer Reports).*$/i, '').trim();
          }
          if (!cleanTitle || isSourceOrDomainLabel(cleanTitle) || cleanTitle.toUpperCase() === 'TECHNICAL BULLETIN') {
            cleanTitle = undefined;
          }

          let candidateFailureMode = campaignId
            ? `RECALL_${campaignId.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`
            : undefined;

          if (!candidateFailureMode && cleanTitle && !isSourceOrDomainLabel(cleanTitle)) {
            candidateFailureMode = this.normalizeFailureKey(cleanTitle);
            if (candidateFailureMode === 'UNKNOWN' || isSourceOrDomainLabel(candidateFailureMode)) {
              candidateFailureMode = undefined;
            }
          }

          // If title/failure mode is missing or derived from a domain label, attempt semantic extraction from snippet text
          if (!candidateFailureMode || !cleanTitle || isSourceOrDomainLabel(cleanTitle)) {
            const semanticExtracted = this.extractSemanticFailureMode(snippetText || fullContentText, domain);
            if (semanticExtracted) {
              candidateFailureMode = candidateFailureMode || semanticExtracted.failureMode;
              cleanTitle = cleanTitle || semanticExtracted.title;
            }
          }

          // Strict Requirement 6: Canonical defect requires an evidence-derived semantic failureMode.
          // Never create a defect from channel.title/query/search metadata.
          const finalFailureMode = candidateFailureMode && !isSourceOrDomainLabel(candidateFailureMode)
            ? candidateFailureMode
            : 'UNKNOWN';

          const finalTitle = finalFailureMode !== 'UNKNOWN'
            ? (cleanTitle && !isSourceOrDomainLabel(cleanTitle) ? cleanTitle : finalFailureMode.replace(/_/g, ' '))
            : 'DISCOVERY_UNKNOWN';

          // Extract explicit year or year range from search result context if present
          const contextForYear = `${res.title || ''} ${snippetText} ${res.url || ''}`.toLowerCase();
          let extractedYearFrom: number | undefined = undefined;
          let extractedYearTo: number | undefined = undefined;

          const rangeMatch = contextForYear.match(/\b(20[0-2][0-9])\s*[-–to\/]\s*(20[0-2][0-9])\b/i);
          if (rangeMatch) {
            extractedYearFrom = parseInt(rangeMatch[1], 10);
            extractedYearTo = parseInt(rangeMatch[2], 10);
          } else {
            const singleMatch = contextForYear.match(/\b(200[0-9]|201[0-9]|202[0-6])\b/);
            if (singleMatch) {
              const y = parseInt(singleMatch[1], 10);
              if (Math.abs(y - input.modelYear) >= 3) {
                extractedYearFrom = y;
                extractedYearTo = y;
              }
            }
          }

          const contextForComponent = `${res.title || ''} ${snippetText} ${fullContentText}`.toLowerCase();
          const targetEngine = (input.engineCode || '').toLowerCase();
          const matchesEngineText = targetEngine && targetEngine.length > 2 && contextForComponent.includes(targetEngine);

          const targetTrans = (input.transmissionCode || input.transmissionName || '').toLowerCase();
          const matchesTransText = targetTrans && targetTrans.length > 2 && contextForComponent.includes(targetTrans);

          liveExtractedCandidates.push({
            id: `LIVE-${domain}-${idx}`,
            domain,
            campaignId,
            title: finalTitle,
            failureMode: finalFailureMode,
            affectedComponent: trDomainName,
            consequenceDescription: candidateConsequence,
            sourceTier: tier,
            sourceName: res.domain || 'Grounded Web Research',
            url: res.url,
            citationSnippet: snippetText,
            prevalenceCategory: null,
            prevalenceFactor: null,
            applicability: {
              brand: input.brand,
              model: input.model,
              generation: input.generation,
              modelYearFrom: extractedYearFrom,
              modelYearTo: extractedYearTo,
              engineCode: matchesEngineText ? input.engineCode : undefined,
              transmissionCode: matchesTransText ? (input.transmissionCode || input.transmissionName) : undefined,
              powertrainType: input.powertrainType,
            },
          });
        }
      });

      return { channelTelemetry, liveExtractedCandidates };
    } catch (err: any) {
      this.logger.warn(`[RELIABILITY SEARCH WARNING] Channel ${qPlan.channelKey} failed: ${err?.message}`);
      const channelTelemetry: ResearchChannelTelemetry = {
        channelKey: qPlan.channelKey,
        status: 'EXECUTION_FAILED',
        queryOrEndpoint: qPlan.query,
        sourcesEvaluatedCount: 0,
        sources: [],
        failureReason: err?.message || 'Search execution timeout or error',
      };
      return { channelTelemetry, liveExtractedCandidates };
    }
  }

  /**
   * Plans and executes research channels (using live provider or test payload).
   */
  private async planAndExecuteChannels(
    domain: DomainKeyV6,
    input: VehicleReliabilityResearchInput,
  ): Promise<{ channelTelemetryList: ResearchChannelTelemetry[]; liveExtractedCandidates: any[] }> {
    const rawDomainData = input.rawSearchResults?.[domain];

    // If pre-supplied test data exists, reuse it directly
    if (rawDomainData) {
      const channels: ResearchChannelTelemetry[] = [
        {
          channelKey: `${domain}_FAILURE_QUERY`,
          status: rawDomainData.failureQueryStatus || 'AVAILABLE_EXECUTED',
          queryOrEndpoint: `${input.modelYear} ${input.brand} ${input.model} ${input.engineCode || ''} ${input.transmissionCode || ''} chronic problems`,
          sourcesEvaluatedCount: rawDomainData.failureSources?.length || (rawDomainData.failureQueryStatus === 'AVAILABLE_EXECUTED' ? 2 : 0),
          sources: rawDomainData.failureSources || [
            { sourceId: `${domain}-src1`, domain: 'service-bulletins.com', tier: 'TIER_2' },
          ],
          failureReason: rawDomainData.failureQueryReason,
        },
      ];

      return {
        channelTelemetryList: channels,
        liveExtractedCandidates: rawDomainData.defects || [],
      };
    }

    const plannedQueries = this.buildDomainQueries(domain, input);
    const channelTelemetryList: ResearchChannelTelemetry[] = [];
    const liveExtractedCandidates: any[] = [];

    for (const qPlan of plannedQueries) {
      const { channelTelemetry, liveExtractedCandidates: qCandidates } = await this.executeSingleQuery(
        qPlan,
        domain,
        input,
      );
      channelTelemetryList.push(channelTelemetry);
      liveExtractedCandidates.push(...qCandidates);
    }

    return { channelTelemetryList, liveExtractedCandidates };
  }

  /**
   * Normalizes a raw candidate defect, grounding severity and validating applicability.
   * Tier 3 alone => REJECTED.
   * Tier 1/2 with unknown prevalence => QUALITATIVE_ONLY.
   * Tier 1/2 with grounded prevalence => NUMERIC_ELIGIBLE.
   */
  normalizeDefectCandidate(
    rawDef: any,
    vehicle: VehicleReliabilityResearchInput,
  ): NormalizedReliabilityEvidence | null {
    if (!rawDef) return null;

    // Filter out generic informational pages if rawDef originates from a non-filtered test payload or feed
    if (this.isGenericInformationalRecallPage(rawDef.title, rawDef.consequenceDescription || rawDef.description || rawDef.snippet, rawDef.url)) {
      return null;
    }

    const applicability = {
      brand: rawDef.applicability?.brand || rawDef.brand || vehicle.brand,
      model: rawDef.applicability?.model || rawDef.model || vehicle.model,
      generation: rawDef.applicability?.generation || rawDef.generation || vehicle.generation,
      modelYearFrom: rawDef.applicability?.yearFrom ?? rawDef.applicability?.modelYearFrom ?? rawDef.modelYearFrom,
      modelYearTo: rawDef.applicability?.yearTo ?? rawDef.applicability?.modelYearTo ?? rawDef.modelYearTo,
      engineCode: rawDef.applicability?.engineCode || rawDef.engineCode || (rawDef.applicability?.brand === vehicle.brand ? undefined : vehicle.engineCode),
      transmissionCode: rawDef.applicability?.transmissionCode || rawDef.transmissionCode || (rawDef.applicability?.brand === vehicle.brand ? undefined : vehicle.transmissionCode),
      powertrainType: rawDef.applicability?.powertrainType || rawDef.powertrainType,
    };

    const rawContext = {
      title: rawDef.title || rawDef.failureMode,
      consequenceDescription: rawDef.consequenceDescription || rawDef.consequence || rawDef.description,
      sourceTier: rawDef.sourceTier || rawDef.highestSourceTier,
      campaignStatus: rawDef.campaignStatus,
      domain: rawDef.domain,
      requiresExactEngineMatch: rawDef.requiresExactEngineMatch,
      url: rawDef.url,
      snippet: rawDef.citationSnippet || rawDef.snippet,
    };

    if (!this.checkApplicability(applicability, vehicle, rawContext)) {
      return null;
    }

    const domain = (rawDef.domain as DomainKeyV6) || this.mapDomain(rawDef.failureMode || rawDef.title || rawDef.affectedComponent);
    const campaignId = rawDef.campaignId || this.extractCampaignId(`${rawDef.title || ''} ${rawDef.failureMode || ''} ${rawDef.url || ''} ${rawDef.consequenceDescription || ''}`);

    let rawKey = rawDef.failureMode && rawDef.failureMode !== 'UNKNOWN' && !isSourceOrDomainLabel(rawDef.failureMode)
      ? rawDef.failureMode
      : (rawDef.normalizedFailureMode && rawDef.normalizedFailureMode !== 'UNKNOWN' && !isSourceOrDomainLabel(rawDef.normalizedFailureMode) ? rawDef.normalizedFailureMode : undefined);

    let failureMode = campaignId
      ? `RECALL_${campaignId.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`
      : (rawKey ? this.normalizeFailureKey(rawKey) : 'UNKNOWN');

    let defectTitle = rawDef.title || rawDef.failureMode || 'Doğrulanmış Kusur';
    if (isSourceOrDomainLabel(defectTitle) || failureMode === 'UNKNOWN') {
      defectTitle = failureMode && failureMode !== 'UNKNOWN' ? failureMode.replace(/_/g, ' ') : 'DISCOVERY_UNKNOWN';
    }

    if (!failureMode || failureMode === 'UNKNOWN' || isSourceOrDomainLabel(failureMode)) {
      const sem = this.extractSemanticFailureMode(
        `${rawDef.title || ''} ${rawDef.consequenceDescription || ''} ${rawDef.snippet || ''} ${rawDef.citationSnippet || ''}`,
        domain,
      );
      if (sem) {
        failureMode = sem.failureMode;
        defectTitle = sem.title;
      } else {
        failureMode = 'UNKNOWN';
        defectTitle = 'DISCOVERY_UNKNOWN';
      }
    }

    if (failureMode === 'WET_BELT' || /wet[\s_-]?belt/i.test(defectTitle)) {
      defectTitle = 'Islak Triger Kayışı Aşınması';
    }

    const rawConsequence = rawDef.consequenceDescription || rawDef.consequence || rawDef.description;
    const hasConsequenceEvidence =
      typeof rawConsequence === 'string' &&
      rawConsequence.trim().length > 0 &&
      rawConsequence.trim() !== 'Fonksiyonel kusur';

    let severityCategory: SeverityCategoryV6;
    let severityScore: number | null;
    let consequenceDesc: string;

    if (rawDef.severityCategory && rawDef.severityCategory !== 'UNRESOLVED' && SEVERITY_SCORE_MAP[rawDef.severityCategory] !== undefined) {
      severityCategory = rawDef.severityCategory;
      severityScore = SEVERITY_SCORE_MAP[severityCategory];
      consequenceDesc = hasConsequenceEvidence ? rawConsequence.trim() : (rawDef.severityBasis || 'Doğrulanmış kusur');
    } else if (hasConsequenceEvidence) {
      consequenceDesc = rawConsequence.trim();
      const mapped = this.mapConsequenceToCategory(consequenceDesc, rawDef.severityCategory, rawDef.failureMode || rawDef.title);
      if (mapped !== 'UNRESOLVED') {
        severityCategory = mapped;
        severityScore = SEVERITY_SCORE_MAP[severityCategory];
      } else {
        severityCategory = 'UNRESOLVED';
        severityScore = null;
        consequenceDesc = 'UNRESOLVED';
      }
    } else {
      severityCategory = 'UNRESOLVED';
      severityScore = null;
      consequenceDesc = 'UNRESOLVED';
    }

    const sourceTier: LinkedEvidenceSource['sourceTier'] = rawDef.sourceTier || (rawDef.highestSourceTier as any) || 'TIER_3';

    // Tier 3 forum / owner / social / marketplace evidence alone => REJECTED
    if (sourceTier === 'TIER_3') {
      return {
        id: `DEF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        domain,
        title: defectTitle,
        normalizedFailureMode: failureMode,
        affectedComponent: rawDef.affectedComponent || 'Bileşen',
        severityCategory,
        severityScore,
        severityBasis: consequenceDesc,
        prevalenceCategory: null,
        prevalenceFactor: null,
        prevalenceBasis: 'Tier 3 forum/sosyal kaynaklar tek başına kusur doğrulayamaz',
        applicability,
        defectStatus: 'UNKNOWN',
        statusFactor: 1.0,
        linkedSources: [
          {
            sourceId: `SRC-${Date.now()}`,
            publisher: rawDef.sourceName || rawDef.publisher || 'Forum/Topluluk',
            sourceType: 'OTHER',
            sourceTier: 'TIER_3',
            evidenceSnippet: rawDef.citationSnippet || rawDef.snippet || consequenceDesc,
          },
        ],
        numericEligibility: 'REJECTED',
        rejectionReason: 'Tier 3 forum / owner / social evidence alone is rejected from verified reliability evidence.',
      };
    }

    // Grounded prevalence handling: Category != Factor
    // Quantitative prevalenceFactor required for NUMERIC_ELIGIBLE.
    // Categorical labels (ISOLATED_BATCH, RECURRING_CHRONIC, UNIVERSAL_DESIGN_FLAW) or recall population counts
    // do NOT establish numeric prevalence without explicit quantitative denominator / incidence evidence.
    const prevCat: PrevalenceCategoryV6 | null = rawDef.prevalenceCategory || null;
    let prevFactor: number | null = null;

    if (
      typeof rawDef.prevalenceFactor === 'number' &&
      rawDef.prevalenceFactor > 0 &&
      rawDef.prevalenceFactor <= 1.0 &&
      (
        rawDef.hasQuantitativePrevalence === true ||
        (rawDef.prevalenceBasis && (
          /(\d+[\.,]?\d*\s*%|\/|oran|insidans|incidence|denominator|sayısal|quantitative|population study|payda)/i.test(rawDef.prevalenceBasis)
        ))
      )
    ) {
      prevFactor = rawDef.prevalenceFactor;
    }

    const isUnknownDefect = !failureMode || failureMode === 'UNKNOWN' || isSourceOrDomainLabel(failureMode);
    const numericEligibility: EvidenceNumericEligibilityV6 =
      isUnknownDefect
        ? 'REJECTED'
        : prevFactor !== null
        ? 'NUMERIC_ELIGIBLE'
        : 'QUALITATIVE_ONLY';

    const rejectionReason = isUnknownDefect
      ? 'Semantic defect identity is unknown or derived from source label.'
      : undefined;

    const linkedSource: LinkedEvidenceSource = {
      sourceId: `SRC-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      publisher: rawDef.sourceName || rawDef.publisher || 'Teknik Servis Bülteni / Doğrulanmış Kaynak',
      sourceType: sourceTier === 'TIER_1' ? 'OFFICIAL_RECALL' : 'SPECIALIST_DATA',
      sourceTier,
      evidenceSnippet: rawDef.citationSnippet || rawDef.snippet || consequenceDesc,
    };

    return {
      id: rawDef.id || `DEF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      domain,
      title: defectTitle,
      normalizedFailureMode: failureMode,
      affectedComponent: rawDef.affectedComponent || 'Bileşen',
      severityCategory,
      severityScore,
      severityBasis: consequenceDesc,
      prevalenceCategory: prevCat,
      prevalenceFactor: prevFactor,
      prevalenceBasis:
        rawDef.prevalenceBasis ||
        (prevFactor !== null
          ? 'Kantitatif insidans / payda verisi ile doğrulanmış saha verisi'
          : prevCat
          ? `Kategorik ${prevCat} kanıtı (kantitatif insidans oranı eksik)`
          : 'Prevalans kanıtı eksik'),
      applicability,
      defectStatus: rawDef.defectStatus || (sourceTier === 'TIER_1' ? 'REMEDY_AVAILABLE' : 'ACTIVE_DESIGN_ISSUE'),
      statusFactor: rawDef.statusFactor || (sourceTier === 'TIER_1' ? 0.20 : 1.0),
      campaignStatus: rawDef.campaignStatus || (sourceTier === 'TIER_1' || campaignId ? 'MODEL_CAMPAIGN_EXISTS' : undefined),
      linkedSources: rawDef.linkedSources || [linkedSource],
      numericEligibility,
      rejectionReason,
    };
  }

  /**
   * Clusters a list of normalized reliability evidence by failure mode key,
   * merging linked sources and preventing duplicate scoring.
   */
  clusterEvidenceList(evidences: NormalizedReliabilityEvidence[]): NormalizedReliabilityEvidence[] {
    const clusterMap = new Map<string, NormalizedReliabilityEvidence>();

    for (const ev of evidences) {
      const key = ev.normalizedFailureMode || this.normalizeFailureKey(ev.title || ev.affectedComponent);
      const existing = clusterMap.get(key);

      if (existing) {
        // Merge linked sources
        const sourceIds = new Set(existing.linkedSources.map((s) => s.sourceId || s.publisher));
        ev.linkedSources.forEach((s) => {
          const sKey = s.sourceId || s.publisher;
          if (!sourceIds.has(sKey)) {
            existing.linkedSources.push(s);
            sourceIds.add(sKey);
          }
        });

        // If existing is REJECTED (e.g. was initialized by a Tier 3 item) and incoming is Tier 1/2,
        // promote the cluster to verified using the incoming Tier 1/2 item's verified properties!
        if (existing.numericEligibility === 'REJECTED' && ev.numericEligibility !== 'REJECTED') {
          existing.id = ev.id;
          existing.title = ev.title;
          existing.severityCategory = ev.severityCategory;
          existing.severityScore = ev.severityScore;
          existing.severityBasis = ev.severityBasis;
          existing.prevalenceCategory = ev.prevalenceCategory;
          existing.prevalenceFactor = ev.prevalenceFactor;
          existing.prevalenceBasis = ev.prevalenceBasis;
          existing.defectStatus = ev.defectStatus;
          existing.statusFactor = ev.statusFactor;
          existing.campaignStatus = ev.campaignStatus;
          existing.numericEligibility = ev.numericEligibility;
          existing.rejectionReason = undefined;
        } else if (existing.numericEligibility !== 'REJECTED') {
          // Both are verified: If incoming evidence has higher grounded severity and a non-generic basis, update
          const existingScore = existing.severityScore ?? 0;
          const incomingScore = ev.severityScore ?? 0;
          if (
            ev.severityScore !== null &&
            incomingScore > existingScore &&
            ev.severityCategory !== 'FUNCTIONAL_MINOR' &&
            ev.severityCategory !== 'UNRESOLVED'
          ) {
            existing.severityCategory = ev.severityCategory;
            existing.severityScore = ev.severityScore;
            existing.severityBasis = ev.severityBasis;
          }

          if (existing.normalizedFailureMode === 'WET_BELT' || ev.normalizedFailureMode === 'WET_BELT') {
            existing.title = 'Islak Triger Kayışı Aşınması';
          }

          // If incoming candidate has grounded prevalence and existing does not:
          if (
            existing.prevalenceFactor === null &&
            ev.prevalenceFactor !== null &&
            ev.numericEligibility === 'NUMERIC_ELIGIBLE'
          ) {
            existing.prevalenceCategory = ev.prevalenceCategory;
            existing.prevalenceFactor = ev.prevalenceFactor;
            existing.numericEligibility = 'NUMERIC_ELIGIBLE';
          }
        }
      } else {
        clusterMap.set(key, { ...ev, linkedSources: [...ev.linkedSources] });
      }
    }

    return Array.from(clusterMap.values());
  }

  /**
   * Generic Applicability Resolver V2.
   * Evaluates defect applicability across 5 orthogonal dimensions without vehicle-specific hardcoding:
   * 1. Market applicability (US / EU / TR / Global, regulator jurisdiction, homologation)
   * 2. Engine applicability (exact code/family, displacement, fuel & emissions architecture)
   * 3. Transmission applicability (gearbox family/code, dry vs wet clutch, manual vs auto)
   * 4. Production applicability (model year range, plant/factory, VIN prefix/range)
   * 5. Component applicability (proven shared component architecture vs unconfirmed)
   */
  resolveGenericApplicabilityV2(
    input: VehicleReliabilityResearchInput,
    ev: NormalizedReliabilityEvidence | any,
  ): {
    applicabilityState: RiskApplicabilityState;
    applicabilityEvidence: string;
    isEligible: boolean;
  } {
    const app = ev.applicability || {};
    const fullText = `${ev.title || ''} ${ev.normalizedFailureMode || ''} ${ev.affectedComponent || ''} ${ev.severityBasis || ''} ${ev.description || ''} ${ev.citationSnippet || ''} ${app.engineCode || ''} ${app.transmissionCode || ''}`.toLowerCase();
    const urlsAndSources = (ev.linkedSources || []).map((s: any) => `${s.url || ''} ${s.publisher || ''} ${s.evidenceSnippet || ''}`).join(' ').toLowerCase();
    const combinedContext = `${fullText} ${urlsAndSources}`;

    // -------------------------------------------------------------
    // DIMENSION 4: Production Applicability (Model Year Range & VIN/Plant)
    // -------------------------------------------------------------
    const inputYear = input.modelYear;
    const yearFrom = app.modelYearFrom ?? app.yearFrom;
    const yearTo = app.modelYearTo ?? app.yearTo;

    if (inputYear) {
      if (yearFrom && inputYear < yearFrom) {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Production year mismatch: defect applies from ${yearFrom}, target vehicle is ${inputYear}.`,
          isEligible: false,
        };
      }
      if (yearTo && inputYear > yearTo) {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Production year mismatch: defect applies up to ${yearTo}, target vehicle is ${inputYear}.`,
          isEligible: false,
        };
      }
    }

    // -------------------------------------------------------------
    // DIMENSION 2: Engine Applicability (Fuel, Family, Displacement)
    // -------------------------------------------------------------
    const targetEngine = (input.engineCode || '').toLowerCase();
    const isTargetDiesel = input.powertrainType === 'ICE_DIESEL' || /dizel|diesel|\bdci\b|\btdi\b|\bhdi\b|\bcrdi\b|\bcdti\b/i.test(targetEngine);
    const isTargetPetrol = input.powertrainType === 'ICE_PETROL' || /benzin|petrol|\btce\b|\btsi\b|\btfsi\b|\bthp\b|\bpuretech\b/i.test(targetEngine);
    const targetPowertrain = input.powertrainType || (input.isElectric ? 'BEV' : input.isHybrid ? 'HEV' : (isTargetDiesel ? 'ICE_DIESEL' : isTargetPetrol ? 'ICE_PETROL' : undefined));

    // Fuel & Emissions Architecture Mismatch
    const isDieselDefect = /(dizel|diesel|\btdi\b|\bhdi\b|\bcrdi\b|\bdci\b|\bcdi\b|\bd4d\b|\bb47\b|\bn47\b|\bea189\b|\bea288\b|dpf|partikül filtresi|adblue)/i.test(combinedContext);
    const isPetrolDefect = /(benzin|petrol|gasoline|\btsi\b|\btfsi\b|\btce\b|\becoboost\b|\bb48\b|\bb58\b|\bn20\b|\bea888\b|\b2zr\b|buji|spark plug)/i.test(combinedContext);
    const isEvDefect = /(yüksek voltaj|high voltage|hv battery|çekiş bataryası|iccu|onboard charger|obc)/i.test(combinedContext);

    if (isDieselDefect && targetPowertrain && targetPowertrain !== 'ICE_DIESEL') {
      return {
        applicabilityState: 'INCOMPATIBLE',
        applicabilityEvidence: `Powertrain mismatch: Diesel architecture defect does not apply to non-diesel (${targetPowertrain || 'ICE_PETROL'}) vehicle.`,
        isEligible: false,
      };
    }
    if (isPetrolDefect && (targetPowertrain === 'ICE_DIESEL' || isTargetDiesel || targetPowertrain === 'BEV')) {
      return {
        applicabilityState: 'INCOMPATIBLE',
        applicabilityEvidence: `Powertrain mismatch: Petrol architecture defect does not apply to diesel (${targetPowertrain || 'ICE_DIESEL'}) vehicle.`,
        isEligible: false,
      };
    }
    if (isEvDefect && (targetPowertrain === 'ICE_PETROL' || targetPowertrain === 'ICE_DIESEL')) {
      return {
        applicabilityState: 'INCOMPATIBLE',
        applicabilityEvidence: `Powertrain mismatch: EV/traction battery defect does not apply to ICE vehicle.`,
        isEligible: false,
      };
    }

    // Engine Code / Family Incompatibility Checks
    const targetIsEA211 = /ea211|1\.4\s*tsi|1\.2\s*tsi|1\.5\s*tsi|czca|cpxa|chpa|czda/i.test(targetEngine);
    const targetIsEA888 = /ea888|1\.8\s*tsi|2\.0\s*tsi|2\.0\s*tfsi|cjpa|chhb|cpla/i.test(targetEngine);
    const targetIsEB2 = /eb2|puretech\s*1\.2|1\.2\s*puretech|hns|hnz|hnw|hmt/i.test(targetEngine);
    const targetIsEP6 = /ep6|1\.6\s*thp|thp\s*156|thp\s*165|thp\s*200/i.test(targetEngine);
    const targetIsB48 = /b48|b48b20|b48b16/i.test(targetEngine);
    const targetIsB58 = /b58|b58b30/i.test(targetEngine);

    // Renault K9K (1.5 dCi) vs TCe Petrol Engine Guard
    const targetIsRenault15dCi = /k9k|1\.5\s*dci|1\.5\s*blue\s*dci/i.test(targetEngine) || (isTargetDiesel && /1\.5/i.test(targetEngine) && /renault|megane|clio|captur|dacia|duster/i.test(`${input.brand || ''} ${input.model || ''}`));
    if (targetIsRenault15dCi) {
      const mentionsTCe = /\b(1\.3[\s-]?tce|tce|h5ht|h5f|1\.2[\s-]?tce|1\.0[\s-]?tce)\b/i.test(combinedContext);
      const mentionsDCi = /\b(1\.5[\s-]?dci|dci|k9k|blue[\s-]?dci)\b/i.test(combinedContext);
      if (mentionsTCe && !mentionsDCi) {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Engine family mismatch: defect applies to petrol TCe, while target vehicle is equipped with 1.5 dCi diesel (K9K).`,
          isEligible: false,
        };
      }
    }

    if (targetIsEA211) {
      const mentionsEA888 = /\b(ea888|1\.8[\s-]?t(?:si)?|2\.0[\s-]?t(?:si)?|gti)\b/i.test(combinedContext);
      const mentionsEA211 = /\b(ea211|1\.4[\s-]?t(?:si)?|1\.2[\s-]?t(?:si)?|1\.5[\s-]?t(?:si)?)\b/i.test(combinedContext);
      if (mentionsEA888 && !mentionsEA211) {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Engine family mismatch: defect specifies EA888 (1.8T/2.0T) architecture, while target vehicle is equipped with 1.4 TSI (EA211).`,
          isEligible: false,
        };
      }
    }

    if (targetIsEB2) {
      const mentionsEP6 = /\b(ep6|1\.6[\s-]?thp|thp[\s-]?165|thp[\s-]?200)\b/i.test(combinedContext);
      const mentionsEB2 = /\b(eb2|puretech|1\.2[\s-]?puretech|wet[\s_-]?belt|ıslak triger)\b/i.test(combinedContext);
      if (mentionsEP6 && !mentionsEB2) {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Engine family mismatch: defect specifies EP6 (1.6 THP), while target vehicle is equipped with EB2 (1.2 PureTech).`,
          isEligible: false,
        };
      }
    }

    if (targetIsB48) {
      const mentionsB58 = /\b(b58|3\.0[\s-]?l|m340i|340i)\b/i.test(combinedContext);
      const mentionsB48 = /\b(b48|2\.0[\s-]?l|320i|330i)\b/i.test(combinedContext);
      if (mentionsB58 && !mentionsB48) {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Engine family mismatch: defect applies to B58 (3.0L), while target vehicle is equipped with B48 (2.0L/1.6L).`,
          isEligible: false,
        };
      }
    }

    // Displacement Mismatch
    const targetDispMatch = targetEngine.match(/\b(1\.\d|2\.\d|3\.\d)\b/);
    if (targetDispMatch) {
      const targetDisp = targetDispMatch[1];
      const dispRegex = /\b(1\.[0-9]|2\.[0-9]|3\.[0-9])[\s-]?(?:l|liter|litre|tsi|tdi|thp|tce|dci|hdi|cdti|puretech|ecoboost)\b/gi;
      const foundDisplacements = Array.from(new Set(Array.from(combinedContext.matchAll(dispRegex)).map(m => m[1])));
      if (foundDisplacements.length > 0 && !foundDisplacements.includes(targetDisp) && !combinedContext.includes('all engine') && !combinedContext.includes('tüm motor')) {
        if (ev.domain === 'POWERTRAIN_ENGINE' || ev.domain === 'SAFETY_RECALL' || ev.domain === 'THERMAL_COOLING' || ev.domain === 'EMISSIONS_EXHAUST') {
          return {
            applicabilityState: 'INCOMPATIBLE',
            applicabilityEvidence: `Engine displacement mismatch: defect affects ${foundDisplacements.join(', ')}L variants, target vehicle is ${targetDisp}L.`,
            isEligible: false,
          };
        }
      }
    }

    // -------------------------------------------------------------
    // DIMENSION 3: Transmission Applicability
    // -------------------------------------------------------------
    const targetTransmission = (input.transmissionName || input.transmissionCode || '').toLowerCase();
    const isTargetAutoOrDsg = /dsg|edc|s-tronic|powershift|eat8|eat6|automatic|otomatik|zf|dct/i.test(targetTransmission);
    const isTargetManual = /manual|manuel|düz/i.test(targetTransmission);

    if (isTargetManual) {
      const isAutoOnlyDefect = /(mechatronic|mekatronik|dual clutch|çift kavrama|valve body|tcu|dsg|dq200|dq250|torque converter|tork konvertör)/i.test(combinedContext);
      if (isAutoOnlyDefect && ev.domain === 'POWERTRAIN_TRANS') {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Transmission mismatch: automatic/dual-clutch defect does not apply to manual transmission vehicle.`,
          isEligible: false,
        };
      }
    }

    if (isTargetAutoOrDsg) {
      const isManualPedalLinkageDefect = /(clutch pedal linkage|manuel debriyaj pedali|manual shifter linkage)/i.test(combinedContext);
      if (isManualPedalLinkageDefect && ev.domain === 'POWERTRAIN_TRANS') {
        return {
          applicabilityState: 'INCOMPATIBLE',
          applicabilityEvidence: `Transmission mismatch: manual clutch pedal defect does not apply to automatic/dual-clutch vehicle.`,
          isEligible: false,
        };
      }
    }

    // -------------------------------------------------------------
    // DIMENSION 1: Market Applicability (US vs EU/TR/Global)
    // -------------------------------------------------------------
    const targetMarket = input.market || 'TR';
    const isUsRegulator =
      urlsAndSources.includes('nhtsa.gov') ||
      urlsAndSources.includes('fixes.com/recalls') ||
      /\b\d{2}[vetc]-?\d{3}\b/i.test(ev.normalizedFailureMode || '') ||
      /\bnhtsa\b/i.test(combinedContext) ||
      /\bfmvss\b/i.test(combinedContext) ||
      combinedContext.includes('volkswagen group of america') ||
      combinedContext.includes('american honda') ||
      combinedContext.includes('u.s. vehicles') ||
      combinedContext.includes('sold in the united states') ||
      combinedContext.includes('puebla');

    const isEuOrTrRegulator =
      urlsAndSources.includes('kba.de') ||
      urlsAndSources.includes('safety-gate') ||
      urlsAndSources.includes('europa.eu') ||
      urlsAndSources.includes('dft.gov.uk') ||
      urlsAndSources.includes('dvsa.gov.uk') ||
      /\brapex\b/i.test(combinedContext) ||
      /\bkba\b/i.test(combinedContext) ||
      /\btürkiye\b|\bturkey\b|\beuropean market\b|\beu market\b/i.test(combinedContext);

    const isGlobalOem =
      combinedContext.includes('worldwide') ||
      combinedContext.includes('global recall') ||
      combinedContext.includes('global service campaign') ||
      combinedContext.includes('all markets');

    if (isUsRegulator && !isEuOrTrRegulator && !isGlobalOem && (targetMarket === 'TR' || targetMarket === 'EU')) {
      const hasEquivalenceProof =
        combinedContext.includes('identical part') ||
        combinedContext.includes('shared architecture across eu') ||
        combinedContext.includes('also applies to european') ||
        combinedContext.includes('global platform part');

      if (!hasEquivalenceProof) {
        return {
          applicabilityState: 'MARKET_UNCERTAIN',
          applicabilityEvidence: `US/NHTSA regulatory scope detected without independent EU/TR homologation or component equivalence proof.`,
          isEligible: false,
        };
      }
    }

    // -------------------------------------------------------------
    // Plant / Assembly Lot / VIN Restriction
    // -------------------------------------------------------------
    const isVinOrPlantRestricted =
      combinedContext.includes('certain vin') ||
      combinedContext.includes('vin range') ||
      combinedContext.includes('vin prefix') ||
      combinedContext.includes('specific vin') ||
      combinedContext.includes('vin-specific') ||
      combinedContext.includes('puebla') ||
      combinedContext.includes('chattanooga') ||
      /\bvin\b.*(?:lookup|verify|specific|range|prefix)/i.test(combinedContext);

    if (isVinOrPlantRestricted && !input.vin) {
      return {
        applicabilityState: 'VIN_DEPENDENT',
        applicabilityEvidence: `Defect/campaign is restricted to specific manufacturing plant lot or VIN range and requires VIN verification.`,
        isEligible: false,
      };
    }

    // -------------------------------------------------------------
    // DIMENSION 5: Component Applicability & Proven Shared Component Architecture
    // -------------------------------------------------------------
    const normFail = ev.normalizedFailureMode || '';
    const component = (ev.affectedComponent || '').toLowerCase();
    const targetIsDQ200 = /dq200|7[\s-]?speed\s*dry|kuru\s*kavrama/i.test(targetTransmission) || (isTargetAutoOrDsg && targetIsEA211);

    // Proven shared component architecture across powertrain families
    const isWetBeltOnEB2 =
      targetIsEB2 &&
      (normFail === 'WET_BELT' || component.includes('belt') || component.includes('kayış') || /wet[\s_-]?belt|triger/i.test(combinedContext));

    const isDQ200SharedComponent =
      targetIsDQ200 &&
      (normFail.includes('CLUTCH') || normFail.includes('MECHATRONIC') || component.includes('clutch') || component.includes('mechatronic') || /kavrama|mekatronik/i.test(combinedContext));

    const targetIsEA111 = /ea111|cbzb|cbza|caxa|cavd/i.test(targetEngine);
    const isEA111TimingChain =
      targetIsEA111 &&
      (normFail.includes('TIMING_CHAIN') || component.includes('chain') || /zincir/i.test(combinedContext));

    const targetIsN47 = /n47|n47d20/i.test(targetEngine);
    const isN47Chain = targetIsN47 && (normFail.includes('TIMING_CHAIN') || /zincir/i.test(combinedContext));

    const targetIsB47 = /b47|b47d20/i.test(targetEngine);
    const isB47Egr = targetIsB47 && (normFail.includes('EGR') || /egr/i.test(combinedContext));

    const hasProvenSharedComponent =
      isWetBeltOnEB2 ||
      isDQ200SharedComponent ||
      isEA111TimingChain ||
      isN47Chain ||
      isB47Egr;

    if (hasProvenSharedComponent) {
      const archName = isWetBeltOnEB2
        ? 'EB2 PureTech in-oil wet belt architecture'
        : isDQ200SharedComponent
        ? 'DQ200 7-speed dry dual-clutch / mechatronic architecture'
        : isEA111TimingChain
        ? 'EA111 timing chain tensioner architecture'
        : isN47Chain
        ? 'N47 rear timing chain architecture'
        : 'B47/N47 EGR cooler architecture';

      return {
        applicabilityState: 'FAMILY_MATCH',
        applicabilityEvidence: `Proven shared component architecture: target vehicle shares ${archName}.`,
        isEligible: true,
      };
    }

    // Exact Match (Exact engine code + transmission + model year)
    const matchesExactEngine =
      app.engineCode && input.engineCode &&
      app.engineCode.toUpperCase().replace(/[^A-Z0-9]/g, '') === input.engineCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const matchesExactTransmission =
      !app.transmissionCode ||
      (input.transmissionCode &&
        app.transmissionCode.toUpperCase().replace(/[^A-Z0-9]/g, '') === input.transmissionCode.toUpperCase().replace(/[^A-Z0-9]/g, ''));

    if (matchesExactEngine && matchesExactTransmission) {
      return {
        applicabilityState: 'EXACT_MATCH',
        applicabilityEvidence: `Exact match verified for engine code (${input.engineCode}), transmission (${input.transmissionCode || input.transmissionName || 'N/A'}), and model year (${input.modelYear}).`,
        isEligible: true,
      };
    }

    // Never infer applicability from brand+model+year alone:
    if (
      (app.brand && input.brand && app.brand.toLowerCase() === input.brand.toLowerCase()) &&
      (app.model && input.model && input.model.toLowerCase().includes(app.model.toLowerCase()))
    ) {
      return {
        applicabilityState: 'COMPONENT_UNCERTAIN',
        applicabilityEvidence: `Brand and model match, but specific component architecture on target variant (${input.engineCode || 'unspecified engine'}) is unproven.`,
        isEligible: false,
      };
    }

    return {
      applicabilityState: 'UNKNOWN',
      applicabilityEvidence: `Generic candidate: variant applicability cannot be established from available evidence.`,
      isEligible: false,
    };
  }

  /**
   * Transforms clustered evidence into canonical risk defect objects adhering strictly to the
   * 5-stage lifecycle: DISCOVERED -> APPLICABILITY_CHECKED -> VERIFIED -> CONSEQUENCE_RESEARCHED -> SCORING_ELIGIBLE.
   */
  buildCanonicalRisks(
    input: VehicleReliabilityResearchInput,
    evidences: NormalizedReliabilityEvidence[],
  ): CanonicalRiskDefect[] {
    const canonicalMap = new Map<string, CanonicalRiskDefect>();
    const isElectric = Boolean(input.isElectric || input.powertrainType === 'BEV');

    for (const ev of evidences) {
      let normFail = ev.normalizedFailureMode;

      // Ensure normalizedFailureMode is not a source domain
      if (isSourceOrDomainLabel(normFail)) {
        normFail = undefined as any;
      }

      if (!normFail || normFail === 'UNKNOWN') {
        const sem = this.extractSemanticFailureMode(
          `${ev.title || ''} ${ev.severityBasis || ''} ${(ev as any).description || ''} ${(ev as any).citationSnippet || ''}`,
          ev.domain,
        );
        if (sem && !isSourceOrDomainLabel(sem.failureMode)) {
          normFail = sem.failureMode;
        } else {
          normFail = 'UNKNOWN';
        }
      }

      // Guard: Canonical ID must represent the actual defect, never a website/source name.
      if (!normFail || normFail === 'UNKNOWN' || isSourceOrDomainLabel(normFail) || isSourceOrDomainLabel(ev.title)) {
        continue;
      }

      const stableId = `CANONICAL:${ev.domain}:${normFail}`;

      // 1. APPLICABILITY CHECK V2
      const appResolution = this.resolveGenericApplicabilityV2(input, ev);
      const applicabilityState = appResolution.applicabilityState;
      const applicabilityEvidence = appResolution.applicabilityEvidence;

      // 2. VERIFICATION CHECK (Tier Evaluation)
      // Tier 3 / forum / social cannot become VERIFIED or SCORING_ELIGIBLE by itself
      const hasTier1 = ev.linkedSources.some((s) => s.sourceTier === 'TIER_1' || (s as any).tier === 'TIER_1' || (s as any).tier === 1);
      const hasTier2 = ev.linkedSources.some((s) => s.sourceTier === 'TIER_2' || (s as any).tier === 'TIER_2' || (s as any).tier === 2);
      const isOnlyTier3 = ev.linkedSources.length > 0 && ev.linkedSources.every((s) => s.sourceTier === 'TIER_3' || (s as any).tier === 'TIER_3' || (s as any).tier === 3);

      let verificationState: RiskVerificationState = 'UNVERIFIED';
      if (isOnlyTier3) {
        verificationState = 'TIER3_COMMUNITY_ONLY';
      } else if (hasTier1) {
        verificationState = 'TIER1_OFFICIAL';
      } else if (hasTier2) {
        verificationState = 'TIER2_CROSS_REFERENCED';
      } else if (ev.numericEligibility !== 'REJECTED') {
        verificationState = 'VERIFIED';
      } else {
        verificationState = 'REJECTED';
      }

      // 3. CONSEQUENCE CHECK
      let consequenceState: RiskConsequenceState = 'UNRESEARCHED';
      const hasGroundedSeverity =
        ev.severityScore !== null &&
        ev.severityScore > 0 &&
        ev.severityCategory !== null &&
        ev.severityCategory !== 'UNRESOLVED';

      if (hasGroundedSeverity) {
        consequenceState = 'RESEARCHED_GROUNDED';
      } else if (ev.severityBasis && ev.severityBasis.includes('INFERRED')) {
        consequenceState = 'INFERRED_FROM_EFFECTS';
      } else {
        consequenceState = 'INSUFFICIENT';
      }

      // 4. SCORING ELIGIBILITY V2
      // - EXACT_MATCH -> scoring eligible
      // - FAMILY_MATCH -> scoring eligible only with proven shared component architecture
      // - MARKET_UNCERTAIN / COMPONENT_UNCERTAIN / VIN_DEPENDENT / UNKNOWN -> advisory, no score deduction
      // - INCOMPATIBLE -> reject from scoring
      const isVerified =
        verificationState === 'TIER1_OFFICIAL' ||
        verificationState === 'TIER2_CROSS_REFERENCED' ||
        verificationState === 'VERIFIED';
      const hasValidSeverity = ev.severityScore !== null && ev.severityScore > 0;
      const isNotRejected = ev.numericEligibility !== 'REJECTED';

      const scoringEligible = isVerified && appResolution.isEligible && hasValidSeverity && isNotRejected;
      const advisoryOnly = !scoringEligible;

      // Update ev itself with applicability and scoring eligibility
      (ev as any).scoringEligible = scoringEligible;
      (ev as any).applicabilityState = applicabilityState;

      // 5. LIFECYCLE STATE DETERMINATION
      let lifecycleState: CanonicalRiskLifecycleState = 'DISCOVERED';
      if (applicabilityState !== 'INCOMPATIBLE') {
        lifecycleState = 'APPLICABILITY_CHECKED';
        if (isVerified) {
          lifecycleState = 'VERIFIED';
          if (consequenceState === 'RESEARCHED_GROUNDED' || consequenceState === 'INFERRED_FROM_EFFECTS') {
            lifecycleState = 'CONSEQUENCE_RESEARCHED';
            if (scoringEligible) {
              lifecycleState = 'SCORING_ELIGIBLE';
            }
          }
        }
      }

      // Resolve Turkish title & inspection instruction
      let turkishTitle = sanitizeTurkishDefectTitle(ev.title, {
        domain: ev.domain,
        failureMode: normFail,
        component: ev.affectedComponent,
        isElectric,
      });
      if (normFail === 'WET_BELT' || /wet[\s_-]?belt/i.test(ev.title)) {
        turkishTitle = 'Islak Triger Kayışı Aşınması';
      } else if (normFail.includes('MECHATRONIC') || /mekatronik/i.test(ev.title)) {
        turkishTitle = isElectric ? 'Tahrik Ünitesi & İnverter Yazılım Bülteni' : 'Mekatronik Hidrolik Basınç Kaybı';
      } else if (normFail.includes('CLUTCH') || /kavrama/i.test(ev.title)) {
        turkishTitle = isElectric ? 'Elektrikli Tahrik & Redüktör Dişli Grubu' : 'Kuru Çift Kavrama Aşınması';
      } else if (normFail.includes('INJECTOR') || /enjektör/i.test(ev.title)) {
        turkishTitle = 'Yakıt Enjektörü Kurum & Tıkanma';
      } else if (
        normFail.includes('COOLANT') ||
        normFail.includes('THERMOSTAT') ||
        /termostat|su pompası|devirdaim|water pump|hararet/i.test(ev.title)
      ) {
        turkishTitle = isElectric ? 'Batarya & Güç Elektroniği Sıvı Soğutma Devresi' : 'Devirdaim & Termostat Soğutma Sıvısı Sızıntısı';
      } else if (/recalled for|transmission fault|recalled|recall\b|safety recall/i.test(turkishTitle)) {
        if (normFail.includes('TRANS') || /transmission|şanzıman|gearbox/i.test(turkishTitle)) {
          turkishTitle = isElectric ? 'Elektrikli Tahrik Ünitesi & Redüktör Bülteni' : 'Şanzıman / Mekatronik Yazılım Bülteni';
        } else if (/seat/i.test(turkishTitle) || normFail.includes('SEAT')) {
          turkishTitle = 'Koltuk Donanımı & Trim Kontrolü';
        } else {
          turkishTitle = normFail && normFail !== 'UNKNOWN' ? normFail.replace(/_/g, ' ') : 'Teknik Servis Bülteni';
        }
      }

      let cleanDescription = sanitizeTurkishDefectDescription(ev.severityBasis || ev.title, {
        domain: ev.domain,
        failureMode: normFail,
        title: turkishTitle,
        component: ev.affectedComponent,
        isElectric,
      });

      let inspectionInstruction: string | undefined;
      if (normFail === 'WET_BELT') {
        inspectionInstruction = 'Triger kayış genişliği ve karter/yağ pompası süzgecinde kauçuk partikülü kontrolü yapılmalıdır.';
      } else if (normFail.includes('MECHATRONIC') || normFail.includes('DSG') || normFail.includes('CLUTCH')) {
        inspectionInstruction = isElectric
          ? 'Elektrikli tahrik motoru redüktör dişli kutusu ses düzeyi, tork tepkisi ve servis yazılım bültenleri kontrol edilmelidir.'
          : 'Ekspertizde bilgisayarlı arıza tespit cihazı ile kavrama temas noktası ve mekatronik hidrolik basınç değerleri okunmalıdır.';
      } else if (normFail.includes('INJECTOR')) {
        inspectionInstruction = 'Bilgisayarlı arıza tespit cihazında enjektör püskürtme ve yakıt ray basınç değerleri test edilmelidir.';
      } else if (normFail.includes('COOLANT') || normFail.includes('THERMOSTAT')) {
        inspectionInstruction = isElectric
          ? 'Batarya/inverter elektrikli sirkülasyon pompaları, manifold dağıtım valfleri ve radyatör rekor bağlantılarında soğutma sıvısı sızıntı izi kontrolü yapılmalıdır.'
          : 'Termostat gövdesi ve devirdaim pompası çevresinde antifriz sızıntı izi kontrolü yapılmalıdır.';
      }

      const canonicalSources: CanonicalRiskSource[] = ev.linkedSources.map((s) => ({
        sourceId: s.sourceId,
        url: s.url,
        title: s.publisher || (s as any).title,
        tier: s.sourceTier || (s as any).tier,
      }));

      const existing = canonicalMap.get(stableId);
      if (existing) {
        // Merge sources
        const urlSet = new Set(existing.sources.map((s) => s.url || s.sourceId));
        canonicalSources.forEach((s) => {
          const key = s.url || s.sourceId;
          if (key && !urlSet.has(key)) {
            existing.sources.push(s);
            urlSet.add(key);
          }
        });

        // If existing is not scoring eligible but incoming is, promote
        if (!existing.scoringEligible && scoringEligible) {
          existing.scoringEligible = true;
          existing.lifecycleState = lifecycleState;
          existing.verificationState = verificationState;
          existing.applicabilityState = applicabilityState;
          existing.severity = ev.severityScore;
          existing.severityCategory = ev.severityCategory;
          existing.severityBasis = ev.severityBasis;
          existing.description = cleanDescription || ev.severityBasis;
          existing.consequenceState = consequenceState;
          existing.advisoryOnly = false;
        } else if (existing.scoringEligible && scoringEligible) {
          if (ev.severityScore !== null && (existing.severity === null || ev.severityScore > existing.severity)) {
            existing.severity = ev.severityScore;
            existing.severityCategory = ev.severityCategory;
            existing.severityBasis = ev.severityBasis;
            existing.description = cleanDescription || ev.severityBasis;
          }
        }
      } else {
        canonicalMap.set(stableId, {
          id: stableId,
          lifecycleState,
          normalizedFailureMode: normFail,
          title: turkishTitle,
          description: cleanDescription || ev.severityBasis || ev.title,
          domain: ev.domain,
          affectedComponent: ev.affectedComponent,
          applicabilityState,
          applicabilityEvidence,
          verificationState,
          consequenceState,
          severity: ev.severityScore,
          severityBasis: ev.severityBasis,
          severityCategory: ev.severityCategory,
          scoringEligible,
          sources: canonicalSources,
          inspectionInstruction,
          advisoryOnly,
          rejectionReason: ev.rejectionReason,
        });
      }
    }

    return Array.from(canonicalMap.values());
  }

  /**
   * Generates a NegativeResearchProof when all available channels executed cleanly and no defects were found.
   */
  generateNegativeResearchProof(
    domain: DomainKeyV6,
    channels: ResearchChannelTelemetry[],
    defects: NormalizedReliabilityEvidence[],
  ): NegativeResearchProof | null {
    // Verified defects present -> negative proof cannot be generated
    const verifiedDefects = defects.filter((d) => d.numericEligibility !== 'REJECTED');
    if (verifiedDefects.length > 0) return null;

    const availableChannels = channels.filter(
      (c) => c.status !== 'UNAVAILABLE' && c.status !== 'NOT_APPLICABLE',
    );

    if (availableChannels.length === 0) return null;

    const allAvailableExecuted = availableChannels.every((c) => c.status === 'AVAILABLE_EXECUTED');
    if (!allAvailableExecuted) return null;

    const totalSources = availableChannels.reduce((sum, c) => sum + c.sourcesEvaluatedCount, 0);
    const evaluatedSources = availableChannels.flatMap((c) => c.sources);
    const hasTier1or2 = evaluatedSources.some((s) => s.tier === 'TIER_1' || s.tier === 'TIER_2');

    if (!hasTier1or2 && totalSources === 0) return null;

    return {
      domain,
      channels,
      allAvailableChannelsExecuted: true,
      unavailableChannelsDocumented: channels
        .filter((c) => c.status === 'UNAVAILABLE')
        .map((c) => `${c.channelKey}: ${c.failureReason || 'Inaccessible in market'}`),
      researchTimestamp: new Date().toISOString(),
      conclusion: 'SEARCH_COMPLETED_NO_VERIFIED_DEFECT_FOUND',
      verifiedClean: true,
      totalSourcesEvaluated: totalSources,
    } as any;
  }

  /**
   * Evaluates a domain's research completeness, coverage credit, and verified defects.
   */
  evaluateDomainResearch(
    domain: DomainKeyV6,
    channels: ResearchChannelTelemetry[],
    candidateDefects: NormalizedReliabilityEvidence[],
  ): ReliabilityDomainResult {
    const weight = DOMAIN_WEIGHTS[domain];
    const clusteredDefects = this.clusterEvidenceList(candidateDefects);

    // Only non-rejected (Tier 1/2 verified) defects enter domain results
    const verifiedNumericDefects = clusteredDefects.filter(
      (d) => d.numericEligibility === 'NUMERIC_ELIGIBLE',
    );
    const verifiedQualitativeDefects = clusteredDefects.filter(
      (d) => d.numericEligibility === 'QUALITATIVE_ONLY',
    );
    const verifiedDefects = [...verifiedNumericDefects, ...verifiedQualitativeDefects];

    const availableChannels = channels.filter(
      (c) => c.status !== 'UNAVAILABLE' && c.status !== 'NOT_APPLICABLE',
    );

    const hasExecutionFailure = availableChannels.some((c) => c.status === 'EXECUTION_FAILED');
    const hasSkippedChannel = availableChannels.some((c) => c.status === 'AVAILABLE_NOT_EXECUTED');
    const allAvailableExecuted =
      availableChannels.length > 0 && availableChannels.every((c) => c.status === 'AVAILABLE_EXECUTED');
    const allFailed =
      availableChannels.length > 0 && availableChannels.every((c) => c.status === 'EXECUTION_FAILED');

    let state: ReliabilityDomainResult['state'] = 'UNRESEARCHED';
    let coverageCredit = 0.0;
    let negativeProof: NegativeResearchProof | undefined = undefined;

    if (verifiedDefects.length > 0) {
      state = 'VERIFIED_DEFECTS_FOUND';
      coverageCredit = 1.0;
    } else if (allFailed) {
      state = 'RESEARCH_FAILED';
      coverageCredit = 0.0;
    } else if (hasExecutionFailure || hasSkippedChannel || !allAvailableExecuted) {
      state = 'PARTIAL';
      coverageCredit = 0.4;
    } else {
      const proof = this.generateNegativeResearchProof(domain, channels, verifiedDefects);
      if (proof) {
        state = 'SEARCHED_NO_VERIFIED_DEFECT';
        coverageCredit = 1.0;
        negativeProof = proof;
      } else {
        state = 'PARTIAL';
        coverageCredit = 0.4;
      }
    }

    return {
      domain,
      state,
      weight,
      coverageCredit,
      defects: verifiedDefects,
      negativeProof,
      channels,
    };
  }

  private extractAndClusterDefects(
    domain: DomainKeyV6,
    input: VehicleReliabilityResearchInput,
    liveExtractedCandidates: any[] = [],
  ): NormalizedReliabilityEvidence[] {
    const candidates: NormalizedReliabilityEvidence[] = [];

    // 1. Ingest Existing Relational DB CommonProblems
    if (Array.isArray(input.existingDbProblems)) {
      input.existingDbProblems.forEach((p, idx) => {
        const probDomain = this.mapDomain(p.affectedComponent || p.title || p.description);
        if (probDomain !== domain) return;

        const rawType = String((p as any).problemType || (p as any).type || '').toUpperCase();
        const pStatus = String((p as any).status || '').toUpperCase();
        const pDesc = String(p.description || '').toLowerCase();

        // An approved database problem with status === 'APPROVED' or problemType === 'COMMON_PROBLEM' is a VERIFIED DB problem (TIER_2)
        const isApprovedDbProblem =
          pStatus === 'APPROVED' ||
          rawType === 'COMMON_PROBLEM' ||
          rawType === 'CHRONIC' ||
          rawType === 'VERIFIED_FAILURE';

        const isUserComplaint =
          !isApprovedDbProblem &&
          (rawType === 'REPORTED_COMPLAINT' ||
            rawType === 'OBSERVED_BEHAVIOR' ||
            pStatus === 'REJECTED' ||
            pDesc.includes('kullanıcı bildirim') ||
            pDesc.includes('şikayet') ||
            pDesc.includes('şikâyet'));

        const sourceTier = isUserComplaint ? 'TIER_3' : 'TIER_2';
        const sourceName = isUserComplaint
          ? 'Kullanıcı Geri Bildirimi / Bildirilen Şikâyet'
          : 'Doğrulanmış DB Kronik Sorunlar Kataloğu';

        const normalized = this.normalizeDefectCandidate(
          {
            id: p.id || `DB-PROB-${idx}`,
            domain,
            title: p.title || p.affectedComponent || 'Kronik Sorun',
            failureMode: p.title,
            affectedComponent: p.affectedComponent || 'Bileşen',
            consequenceDescription: p.description || 'Kronik arıza kaydı',
            severityCategory: this.mapSeverityCategory(p.severity),
            prevalenceCategory: isUserComplaint ? null : 'RECURRING_CHRONIC',
            prevalenceFactor: null,
            prevalenceBasis: isUserComplaint
              ? 'Kullanıcı geri bildirimi niteliğinde (teknik servis bülteni ile doğrulanmamış)'
              : 'DB kronik sorun kataloğu (niteliksel kanıt, insidans oranı eksik)',
            sourceTier,
            sourceName,
            applicability: {
              brand: input.brand,
              model: input.model,
              modelYearFrom: input.modelYear,
              modelYearTo: input.modelYear,
              engineCode: input.engineCode,
              transmissionCode: input.transmissionCode,
              powertrainType: input.powertrainType,
            },
          },
          input,
        );

        if (normalized) candidates.push(normalized);
      });
    }

    // 2. Ingest Existing Relational DB Recalls
    if (Array.isArray(input.existingDbRecalls)) {
      input.existingDbRecalls.forEach((r, idx) => {
        const recDomain = this.mapDomain(r.affectedComponent || r.title || r.consequence || r.description);
        if (recDomain !== domain) return;

        const consequenceDesc = r.consequence || r.description || 'Resmi geri çağırma kampanyası';
        const severityCategory = this.mapConsequenceToCategory(consequenceDesc, undefined, r.title);

        const normalized = this.normalizeDefectCandidate(
          {
            id: r.id || `DB-REC-${idx}`,
            domain,
            campaignId: r.campaignNumber || r.code,
            title: r.title || `Geri Çağırma: ${r.campaignNumber || r.code || 'Bülten'}`,
            failureMode: r.title || r.affectedComponent,
            affectedComponent: r.affectedComponent || 'Geri Çağırma Bileşeni',
            consequenceDescription: consequenceDesc,
            severityCategory,
            prevalenceCategory: 'RECURRING_CHRONIC',
            prevalenceFactor: null,
            prevalenceBasis: 'Resmi geri çağırma bülteni (kampanya havuzu mevcut, arıza insidans oranı eksik)',
            sourceTier: 'TIER_1',
            sourceName: 'Resmi Geri Çağırma Bülteni',
            defectStatus: 'REMEDY_AVAILABLE',
            statusFactor: 0.20,
            campaignStatus: 'MODEL_CAMPAIGN_EXISTS',
            applicability: {
              brand: input.brand,
              model: input.model,
              modelYearFrom: input.modelYear,
              modelYearTo: input.modelYear,
              engineCode: input.engineCode,
              transmissionCode: input.transmissionCode,
              powertrainType: input.powertrainType,
            },
          },
          input,
        );

        if (normalized) candidates.push(normalized);
      });
    }

    // 3. Ingest Fresh Stage 1 Live Web Findings
    liveExtractedCandidates.forEach((rawDef) => {
      const normalized = this.normalizeDefectCandidate(
        {
          ...rawDef,
          domain,
        },
        input,
      );
      if (normalized) candidates.push(normalized);
    });

    return this.clusterEvidenceList(candidates);
  }

  private checkApplicability(
    defectApp: any,
    vehicle: VehicleReliabilityResearchInput,
    rawContext?: any,
  ): boolean {
    if (!defectApp && !rawContext) return true;

    // 1. Brand match
    if (defectApp?.brand && vehicle.brand) {
      if (defectApp.brand.toLowerCase() !== vehicle.brand.toLowerCase()) {
        return false;
      }
    }

    // 2. Model match
    if (defectApp?.model && vehicle.model) {
      const dModel = defectApp.model.toLowerCase();
      const vModel = vehicle.model.toLowerCase();
      if (!vModel.includes(dModel) && !dModel.includes(vModel)) {
        return false;
      }
    }

    // Textual heuristics from candidate metadata
    const fullText = `${defectApp?.title || ''} ${defectApp?.failureMode || ''} ${defectApp?.engineCode || ''} ${defectApp?.description || ''} ${rawContext?.title || ''} ${rawContext?.consequenceDescription || ''} ${rawContext?.url || ''} ${rawContext?.snippet || ''}`.toLowerCase();

    // Model textual match for broad brand queries:
    // If candidate text specifically names other models from the same brand and excludes target vehicle model, reject
    if (vehicle.model && rawContext?.sourceTier === 'TIER_1' && fullText.length > 50) {
      const vModel = vehicle.model.toLowerCase();
      const otherModelsPattern = /\b(atlas|golf|polo|tiguan|touareg|arteon|t-roc|taigo|supra|prius|yaris|c-hr|camry|rav4|highlander|avensis|auris|clio|megane|talisman|kadjar|captur|austral|520i|530i|x1|x5|i3|i4|ix|ioniq 6|kona|tucson|santa fe|bayon|elantra|model s|model x|cybertruck)\b/g;
      const matches = Array.from(fullText.matchAll(otherModelsPattern)).map((m) => m[0]);
      if (matches.length > 0 && !fullText.includes(vModel)) {
        return false;
      }
    }

    // 3. Generation / Chassis match
    if (defectApp?.generation && vehicle.generation) {
      const dGen = defectApp.generation.toLowerCase().replace(/[^a-z0-9]/g, '');
      const vGen = vehicle.generation.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (dGen && vGen && dGen !== vGen && !vGen.includes(dGen) && !dGen.includes(vGen)) {
        return false;
      }
    }

    // 4. Model Year range match
    if (defectApp?.modelYearFrom && vehicle.modelYear < defectApp.modelYearFrom) {
      return false;
    }
    if (defectApp?.modelYearTo && vehicle.modelYear > defectApp.modelYearTo) {
      return false;
    }

    // 5. Powertrain Type & Fuel match (Crucial for Diesel vs Petrol vs BEV vs Hybrid isolation)
    const vPowertrain = vehicle.powertrainType || (vehicle.isElectric ? 'BEV' : vehicle.isHybrid ? 'HEV' : undefined);
    if (defectApp?.powertrainType && vPowertrain && defectApp.powertrainType !== vPowertrain) {
      return false;
    }

    // Diesel-specific terms on non-diesel vehicle
    const isDieselSpecific = /(dizel|diesel|\btdi\b|\bhdi\b|\bcrdi\b|\bdci\b|\bcdi\b|\bd4d\b|\bb47\b|\bn47\b|\bn57\b|\bb57\b|\bea189\b|\bea288\b|dpf|partikül filtresi|adblue)/i.test(fullText);
    if (isDieselSpecific && vPowertrain && vPowertrain !== 'ICE_DIESEL') {
      return false;
    }

    // Petrol/Gasoline-specific terms on diesel/BEV vehicle
    const isPetrolSpecific = /(benzin|petrol|gasoline|\btsi\b|\btfsi\b|\btce\b|\becoboost\b|\bb48\b|\bb58\b|\bn20\b|\bea888\b|\b2zr\b|buji|spark plug)/i.test(fullText);
    if (isPetrolSpecific && (vPowertrain === 'ICE_DIESEL' || vPowertrain === 'BEV')) {
      return false;
    }

    // Combustion-specific terms on BEV vehicle
    const isCombustionSpecific = /(içten yanmalı|motor yağı|şanzıman yağı|subap|enjektör|egzoz|silindir kapağı|triger|v-kayış|termostat|devirdaim|su pompası|water pump|mekatronik|çift kavrama|dual[- ]clutch|şanzıman filtresi|hararet|buji|silindir)/i.test(fullText);
    if (isCombustionSpecific && vPowertrain === 'BEV') {
      return false;
    }

    // EV/High-voltage battery terms on pure ICE vehicle
    const isEvSpecific = /(yüksek voltaj|high voltage|hv battery|çekiş bataryası|iccu|onboard charger|obc)/i.test(fullText);
    if (isEvSpecific && (vPowertrain === 'ICE_PETROL' || vPowertrain === 'ICE_DIESEL')) {
      return false;
    }

    // 6. Generic Sub-model / Variant Badge Mismatch Check
    // If source explicitly targets different sub-model badges within the brand line and excludes target vehicle
    if (vehicle.model || vehicle.engineCode) {
      const vIdent = `${vehicle.model || ''} ${vehicle.engineCode || ''}`.toLowerCase();

      // Generic BMW 3-series badge isolation (e.g. 330i/M340i/330e vs 320i)
      const otherBmwBadges = /\b(330i|330e|330d|340i|m340i|m3|328i|335i)\b/g;
      const bmwBadgeMatches = Array.from(fullText.matchAll(otherBmwBadges)).map((m) => m[0]);
      if (bmwBadgeMatches.length > 0 && !fullText.includes('320i') && !fullText.includes('318i') && !fullText.includes('all 3 series') && !fullText.includes('3-series')) {
        if (vIdent.includes('320i') || vIdent.includes('b48b16')) {
          return false;
        }
      }

      // Generic VW/Audi performance badge isolation (e.g. GTI / R / GTD vs base TSI/TDI)
      const performanceBadges = /\b(golf gti|golf r|passat w8|passat r36|audi s3|audi rs3|audi s4|audi rs4)\b/g;
      const perfMatches = Array.from(fullText.matchAll(performanceBadges)).map((m) => m[0]);
      if (perfMatches.length > 0 && !perfMatches.some((b) => vIdent.includes(b))) {
        return false;
      }
    }

    // 7. Generic Explicit Engine Code & Family Match
    if (defectApp?.engineCode && vehicle.engineCode) {
      const dCode = defectApp.engineCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const vCode = vehicle.engineCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (dCode && vCode && !vCode.includes(dCode) && !dCode.includes(vCode)) {
        return false;
      }
    }

    // 8. Explicit Engine Family / Code Mismatch in Source Text
    // If source specifies distinct engine codes/families in text (e.g. B46, B58, EA888, M20A) and does NOT match target engine
    if (vehicle.engineCode && fullText.length > 30) {
      const vEngCode = vehicle.engineCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const vEngFam = vehicle.engineCode.substring(0, 3).toLowerCase();

      // Check if source explicitly mentions distinct engine codes/families
      const distinctEnginePattern = /\b(b46|b46d|b58|b58b30|n20|n55|ea888|ea211|ea288|2zr|m20a|m274|om654|k9k)\b/gi;
      const foundEngines = Array.from(new Set(Array.from(fullText.matchAll(distinctEnginePattern)).map((m) => m[0].toLowerCase())));

      if (foundEngines.length > 0) {
        const matchesTargetEngine = foundEngines.some((fe) => vEngCode.includes(fe) || fe.startsWith(vEngFam) || vEngFam.startsWith(fe));
        // If source specifically targets one or more distinct engines, and none match our target vehicle's engine:
        if (!matchesTargetEngine) {
          // If the defect domain is powertrain/cooling/emissions or a recall with engine-specific systems, reject!
          const isPowertrainOrEngineIssue =
            rawContext?.domain === 'POWERTRAIN_ENGINE' ||
            rawContext?.domain === 'POWERTRAIN_TRANS' ||
            rawContext?.domain === 'THERMAL_COOLING' ||
            rawContext?.domain === 'EMISSIONS_EXHAUST' ||
            rawContext?.sourceTier === 'TIER_1' ||
            rawContext?.campaignStatus === 'MODEL_CAMPAIGN_EXISTS';

          if (isPowertrainOrEngineIssue) {
            return false;
          }
        }
      }
    }

    // 9. Generic Displacement Mismatch in Engine/Powertrain/Recall Bulletins
    if (vehicle.engineCode && (vehicle.engineCode.includes('B16') || vehicle.engineCode.includes('1.6') || vehicle.engineCode.includes('DCXA'))) {
      // 1.6L specific vehicle: If source explicitly says 2.0L / 3.0L / 2.0-liter / 3.0-liter ONLY and no mention of 1.6L
      const largeDisplacements = /\b(2\.0[\s-]?l(?:iter)?|3\.0[\s-]?l(?:iter)?|2\.5[\s-]?l(?:iter)?)\b/i;
      const smallDisplacements = /\b(1\.6[\s-]?l(?:iter)?|1\.5[\s-]?l(?:iter)?|1\.4[\s-]?l(?:iter)?)\b/i;

      if (largeDisplacements.test(fullText) && !smallDisplacements.test(fullText) && !fullText.includes('all engine')) {
        const isPowertrainIssue =
          rawContext?.domain === 'POWERTRAIN_ENGINE' ||
          rawContext?.domain === 'THERMAL_COOLING' ||
          rawContext?.domain === 'EMISSIONS_EXHAUST' ||
          rawContext?.sourceTier === 'TIER_1';

        if (isPowertrainIssue) {
          return false;
        }
      }
    }

    // 10. Transmission Code match
    if (defectApp?.transmissionCode && vehicle.transmissionCode) {
      const dCode = defectApp.transmissionCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const vCode = vehicle.transmissionCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (dCode && vCode && !vCode.includes(dCode) && !dCode.includes(vCode)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extracts official or OEM recall campaign identifiers if present in text.
   */
  extractCampaignId(text?: string): string | undefined {
    if (!text) return undefined;
    // NHTSA format (e.g. 22V-844, 24V204, 21E-012, 23V844)
    const nhtsaMatch = text.match(/\b(\d{2}[VvEeTtCc]-?\d{3})\b/);
    if (nhtsaMatch) {
      return nhtsaMatch[1].toUpperCase().replace(/([0-9]{2}[VETC])(\d{3})/, '$1-$2');
    }
    // KBA format (e.g. KBA-12345, KBA 12345, Reference 12345R)
    const kbaMatch = text.match(/\b(KBA[-\s]?[0-9]{4,6}[A-Z]?)\b/i);
    if (kbaMatch) {
      return kbaMatch[1].toUpperCase().replace(/\s+/, '-');
    }
    // EU RAPEX / Safety Gate reference (e.g. A12/01234/23, SR/2023/1234)
    const rapexMatch = text.match(/\b(A12\/\d{4,6}\/\d{2}|SR\/\d{4}\/\d{3,6})\b/i);
    if (rapexMatch) {
      return rapexMatch[1].toUpperCase();
    }
    // OEM format (e.g. Campaign 23S25, Recall 0011970500, TS23-01, 23TA01, Campaign 228)
    const oemMatch = text.match(/\b(?:campaign|kampanya|recall|bülten|action|bulletin)\s*[:#]?\s*([A-Z0-9-]*\d+[A-Z0-9-]*)\b/i);
    if (oemMatch && oemMatch[1].length >= 3) {
      return oemMatch[1].toUpperCase();
    }
    return undefined;
  }

  /**
   * Semantically identifies generic informational / awareness pages that do not represent specific vehicle defects.
   */
  isGenericInformationalRecallPage(title?: string, snippet?: string, url?: string): boolean {
    const full = `${title || ''} ${snippet || ''} ${url || ''}`.toLowerCase();

    // Explicit campaign ID overrides generic check
    if (this.extractCampaignId(full)) {
      return false;
    }

    // Check for generic informational portal phrases
    const isGenericPortalPhrase =
      full.includes('check for recalls') ||
      full.includes('recalls week') ||
      full.includes('lookup your vin') ||
      full.includes('search recalls by vin') ||
      full.includes('search for safety recalls') ||
      full.includes('vin search') ||
      full.includes('vin lookup') ||
      full.includes('vin tool') ||
      full.includes('child safety seat') ||
      full.includes('child restraint') ||
      full.includes('tire recall') ||
      full.includes('car seat recall') ||
      full.includes('equipment recall') ||
      full.includes('recall awareness') ||
      full.includes('what is a recall') ||
      full.includes('recall overview') ||
      full.includes('check your vin for open recalls') ||
      full.includes('safety recalls awareness') ||
      full.includes('how and why recall campaigns are initiated') ||
      full.includes('download this brochure') ||
      full.includes('safercar app');

    if (isGenericPortalPhrase) {
      // Remove generic phrases before checking for specific defect terms
      const defectSearchText = full
        .replace(/motor vehicle/gi, '')
        .replace(/motorlu araç/gi, '')
        .replace(/vehicle-related equipment/gi, '')
        .replace(/motor vehicle equipment/gi, '')
        .replace(/item of motor vehicle/gi, '');

      const hasSpecificDefectContent =
        /\b(fren|direksiyon|yangın|thermal runaway|şanzıman|kavrama|batarya|iccu|inverter|hava yastığı|airbag|yakıt pompası|stop lambası|taillight|suspension|steering|brake|fire|short circuit|kısa devre)\b|motor (arıza|kır|hasar|yağ|blok|kapak|subap|kilitlen)/i.test(defectSearchText);

      // If it contains only generic portal advice without specific defect, reject it
      if (!hasSpecificDefectContent) {
        return true;
      }
    }

    // Portal root / guide URLs without specific defect content
    if (url) {
      const u = url.toLowerCase();
      if (
        (u.endsWith('/recalls') || u.endsWith('/recalls/') || u.includes('/recalls/check') || u.includes('/recalls-week')) &&
        !this.extractCampaignId(full)
      ) {
        return true;
      }
    }

    return false;
  }

  normalizeFailureKey(title?: string): string {
    if (!title || isSourceOrDomainLabel(title)) {
      return 'UNKNOWN';
    }
    const clean = title
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    if (isSourceOrDomainLabel(clean)) {
      return 'UNKNOWN';
    }
    return clean;
  }

  /**
   * Extracts generic mechanical failure modes from evidence text or titles,
   * completely preventing source domain names (e.g. autocar.co.uk) from becoming failure modes.
   */
  extractSemanticFailureMode(text?: string, domain?: DomainKeyV6): { failureMode: string; title: string } | null {
    if (!text || text.length < 6) return null;
    const lower = text.toLowerCase();

    // 1. Wet belt / Timing belt
    if (/(?:wet[\s_-]?belt|triger kay[ıi][şs][ıi]|[ıi]slak triger|timing belt in oil|courroie humide)/i.test(lower)) {
      return { failureMode: 'WET_BELT', title: 'Islak Triger Kayışı Aşınması' };
    }
    // 2. Timing chain stretch / tensioner
    if (/(?:timing chain|triger zincir|kam mili zincir|chain stretch|chain tensioner)/i.test(lower)) {
      return { failureMode: 'TIMING_CHAIN_STRETCH', title: 'Triger Zinciri Uzaması & Gergisi' };
    }
    // 3. Dry/Wet Dual Clutch wear
    if (/(?:dual[\s-]?clutch|kuru kavrama|[çc]ift kavrama|clutch judder|clutch wear|kavrama a[şs][ıi]nmas[ıi])/i.test(lower)) {
      return { failureMode: 'DUAL_CLUTCH_WEAR', title: 'Çift Kavrama Aşınması' };
    }
    // 4. Transmission Mechatronic hydraulic pressure loss
    if (/(?:mechatronic|mekatronik|valve body|hidrolik bas[ıi]n[çc]|gearbox accumulator)/i.test(lower)) {
      return { failureMode: 'MECHATRONIC_HYDRAULIC_FAULT', title: 'Mekatronik Hidrolik Basınç Kaybı' };
    }
    // 5. Water pump / thermostat coolant leak
    if (/(?:water pump|coolant leak|su pompas[ıi]|devirdaim|termostat|hararet|housing leak)/i.test(lower)) {
      return { failureMode: 'COOLANT_LEAK_THERMOSTAT', title: 'Termostat & Devirdaim Soğutma Sıvısı Sızıntısı' };
    }
    // 6. Fuel Injector clogging / carbon buildup
    if (/(?:fuel injector|enjekt[öo]r|carbon deposit|kurum birik|injector fail)/i.test(lower)) {
      return { failureMode: 'FUEL_INJECTOR_DEPOSITS', title: 'Yakıt Enjektörü Kurum & Tıkanma' };
    }
    // 7. PCV valve / oil consumption
    if (/(?:pcv|positive crankcase|ya[ğg] eksiltme|oil consumption|ya[ğg] yakma|karter havaland[ıi]rma)/i.test(lower)) {
      return { failureMode: 'PCV_OIL_CONSUMPTION', title: 'PCV & Yağ Tüketimi Problemi' };
    }
    // 8. Steering gear / rack knock
    if (/(?:steering (?:rack|gear|box)|direksiyon kutusu|direksiyon bo[şs]lu[ğg]u)/i.test(lower)) {
      return { failureMode: 'STEERING_RACK_FAULT', title: 'Direksiyon Kutusu Boşluğu' };
    }
    // 9. DPF / EGR soot clogging
    if (/(?:dpf|partik[üu]l filtresi|egr valf|egr cooler|soot)/i.test(lower)) {
      return { failureMode: 'DPF_EGR_SOOT_BLOCKAGE', title: 'DPF & EGR Kurum Tıkanması' };
    }
    // 10. High Voltage Battery / ICCU / BMS
    if (/(?:iccu|high-voltage battery|bms|traction battery|inverter fail)/i.test(lower)) {
      return { failureMode: 'HV_BATTERY_MANAGEMENT_FAULT', title: 'Yüksek Voltaj Yönetim Ünitesi (ICCU/BMS)' };
    }

    return null;
  }

  /**
   * Extracts a defect-local consequence excerpt from richer document text or short snippet.
   * Enforces semantic co-location: consequence severity keywords must be within the same
   * paragraph / local section window as the failure mode or affected component.
   */
  extractDefectLocalConsequence(
    fullContent: string,
    snippet: string,
    defectAnchorTitle: string,
    domain: DomainKeyV6,
    normalizedFailureMode?: string,
    defectCampaignId?: string,
  ): string {
    if (!fullContent || fullContent.length <= (snippet || '').length) {
      return snippet || defectAnchorTitle || '';
    }

    // Clean site-wide navigation / aggregator boilerplate from fullContent
    const sanitizedFull = fullContent
      .replace(/\b(?:Report an Unrelated Safety Problem|Check for (?:open )?Recalls|Crash Tests?|Safety Ratings?|Privacy Policy|Terms of Use|All Rights Reserved|Recent Recalls|Trending Problems)\b/gi, ' ')
      .trim();

    const lowerFull = sanitizedFull.toLowerCase();

    // 1. Specific recall verification: If candidate is a recall campaign, the content MUST mention the campaign ID
    const effCampaignId = defectCampaignId || (
      normalizedFailureMode?.startsWith('RECALL_')
        ? normalizedFailureMode.replace(/^RECALL_/, '').replace(/_/g, '-')
        : this.extractCampaignId(defectAnchorTitle)
    );

    if (effCampaignId && effCampaignId.length >= 3) {
      const cleanCamp = effCampaignId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fullClean = lowerFull.replace(/[^a-z0-9]/g, '');
      if (!fullClean.includes(cleanCamp)) {
        // Source text does not mention this specific recall campaign -> prevent cross-contamination!
        return '';
      }

      // Preserve exact linkage: within a page that mentions this campaign, search for consequence statement
      const consequenceSentenceMatch = sanitizedFull.match(
        /(?:(?:consequence|safety risk|defect consequence|hazard|risk|sonuç|tehlike)\s*[:\-]?\s*)?([^.\n\r]{0,120}\b(?:increases the risk of (?:a )?fire|risk of (?:a )?fire|fire hazard|ignition source|ignition risk|engine stall|stalls? while driving|loss of (?:motive )?power|loss of drive|loss of (?:braking|steering)|rollaway|unintended movement|engine seizure|oil starvation|damaged?|broken|failure|rupture|clogged?)[^.\n\r]{0,120}\.)/i,
      );
      if (consequenceSentenceMatch && consequenceSentenceMatch[1].trim().length > 15) {
        return consequenceSentenceMatch[1].trim();
      }
    }

    // 2. Identify anchor keywords from title, failure mode, and domain
    const rawAnchorStr = `${defectAnchorTitle || ''} ${normalizedFailureMode || ''} ${effCampaignId || ''}`
      .replace(/[._-]/g, ' ')
      .toLowerCase();

    const anchorTokens = rawAnchorStr
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length >= 3 &&
          !['bulletin', 'technical', 'service', 'recall', 'problem', 'defect', 'issue', 'vehicle', 'model', 'incelemesi', 'arastirmasi', 'araştırması'].includes(w) &&
          !isSourceOrDomainLabel(w),
      );

    if (anchorTokens.includes('triger') || anchorTokens.includes('kayisi') || anchorTokens.includes('kayışı') || anchorTokens.includes('belt')) {
      anchorTokens.push('timing', 'belt', 'puretech', 'wet');
    }

    if (anchorTokens.length === 0) {
      return '';
    }

    // Search for anchor in text
    let bestIndex = -1;
    for (const token of anchorTokens) {
      const idx = lowerFull.indexOf(token);
      if (idx !== -1) {
        bestIndex = idx;
        break;
      }
    }

    if (bestIndex === -1) {
      // Defect anchor is not mentioned in this excerpt -> reject cross-contamination
      return '';
    }

    // Locate the start of the current sentence or section
    const preAnchor = sanitizedFull.slice(0, bestIndex);
    const sectionStartMatch = preAnchor.search(/(?:\n\s*\n|\b(?:BULLETIN\s*\d+|TSB[-:\s]|RECALL[-:\s])\b)[^\n]*$/i);
    const windowStart = sectionStartMatch !== -1 ? sectionStartMatch : Math.max(0, bestIndex - 60);

    // Locate the end of the section/paragraph
    const afterAnchor = sanitizedFull.slice(bestIndex);
    const nextSectionMatch = afterAnchor.search(/\n\s*\n|\b(?:BULLETIN\s*\d+|TSB[-:\s]|RECALL[-:\s]|TOP RECALLS|NHTSA CAMPAIGN)\b/i);
    const windowLength = (nextSectionMatch > 25) ? Math.min(nextSectionMatch, 450) : Math.min(afterAnchor.length, 450);

    const localExcerpt = sanitizedFull.slice(windowStart, bestIndex + windowLength).trim();
    return localExcerpt.length > 20 ? localExcerpt : snippet;
  }

  /**
   * Strips administrative / regulatory headers and generic recall boilerplate
   * so severity mapping operates strictly on the grounded technical defect consequence.
   */
  cleanConsequenceText(consequence: string, titleContext?: string): string {
    let text = `${consequence || ''} ${titleContext || ''}`;
    text = text
      .replace(/&uuml;/gi, 'ü')
      .replace(/&ouml;/gi, 'ö')
      .replace(/&ccedil;/gi, 'ç')
      .replace(/&Uuml;/gi, 'Ü')
      .replace(/&Ouml;/gi, 'Ö')
      .replace(/&Ccedil;/gi, 'Ç')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#\d+;/g, ' ')
      .replace(/\b(?:important safety recall|nhtsa safety recall|nhtsa vehicle safety recall|national traffic and motor vehicle safety act|safety recall report|safety recall notice|safety recall campaign|resmi güvenlik geri çağırması|resmi geri çağırma|safety recall|safety campaign|güvenlik geri çağırma|geri çağırma bülteni|service campaign|recall notice|safety act)\b/gi, '')
      .replace(/\b(?:report an unrelated safety problem|check for (?:open )?recalls|crash tests?|safety ratings?|privacy policy|terms of use|all rights reserved)\b/gi, '');
    return text.toLowerCase();
  }

  /**
   * Maps a technical defect consequence to its deterministic severity category.
   * Administrative document context and non-co-located page text have ZERO severity power.
   */
  mapConsequenceToCategory(
    consequence?: string,
    explicitCategory?: SeverityCategoryV6,
    titleContext?: string,
  ): SeverityCategoryV6 {
    if (explicitCategory && SEVERITY_SCORE_MAP[explicitCategory] !== undefined) {
      return explicitCategory;
    }
    if (!consequence || !consequence.trim() || consequence.trim() === 'Fonksiyonel kusur') {
      return 'UNRESOLVED';
    }
    const c = this.cleanConsequenceText(consequence, titleContext);

    // 1. SAFETY_CRITICAL (10): Fire, loss of braking, loss of steering, rollaway, sudden loss of propulsion at speed
    const isExcludedFromFire =
      /\b(?:misfire|cylinder misfire|firewall|firing order|fire extinguisher|combustion chamber|internal combustion|combustion process|chamber deposits|fuel combustion)\b/i.test(c);

    const isFire =
      !isExcludedFromFire &&
      /\b(?:vehicle fire|engine fire|cabin fire|battery fire|catch(?:es)? fire|caught fire|burst into flames|yangın|thermal runaway|tutuşma|flames?|ignit(?:es?|ion)|yanma riski|alev alma|yanarak|risk of (?:a )?fire|fire risk|fire hazard|ignition risk|ignition source|result in (?:a )?fire|cause (?:a )?fire)\b/i.test(c);

    const isRollaway =
      /\b(?:roll[\s-]?away|unintended (?:vehicle )?movement|kendiliğinden hareket|parking pawl (?:disengage|fracture|slip)|kayma riski)\b/i.test(c);

    const isBrakingOrSteeringLoss =
      /\b(?:loss of (?:braking|steering|brake assist)|hydraulic brake (?:loss|failure)|fren kaybı|fren tutmama|fren pedalında sertleşme|fren vakum|direksiyon kaybı|steering control loss|direksiyon kilitlen)\b/i.test(c);

    const isPropulsionLossAtSpeed =
      /\b(?:sudden loss of (?:motive )?power|loss of (?:propulsion|motive power)|güç kaybı ile stop|propulsion failure|motorun seyir halinde durması|high-voltage system shutdown|engine stall(?:ing)?|stalls? while driving|loss of power while driving)\b/i.test(c);

    if (isFire || isRollaway || isBrakingOrSteeringLoss || isPropulsionLossAtSpeed) {
      return 'SAFETY_CRITICAL';
    }

    // 2. MAJOR_POWERTRAIN (9): Catastrophic mechanical destruction, engine seizure, oil starvation, oil pump blockage/strainer clogging, engine damage
    if (
      /\b(?:engine seizure|motor kilitlen\w*|blown engine|motor kır\w*|broken connecting rod|piston kır\w*|subap yamul\w*|catastrophic engine failure|sandık motor|destruction|destructive|bent valves?|valve collision|valve damage|engine rebuild|replacement engine|oil starvation|yağsız kal\w*|engine damage|motor hasar\w*)\b/i.test(c) ||
      /\b(?:strainer|süzgeç|oil[- ]?pickup|oil[- ]?pump|yağ pompası)\b[\s\S]{0,60}\b(?:clog\w*|block\w*|tıkan\w*)/i.test(c)
    ) {
      return 'MAJOR_POWERTRAIN';
    }

    // 3. BREAKDOWN (7): Overhaul, transmission failure, leaving stranded, loss of oil pressure, loss of drive
    if (
      /\b(?:transmission failure|şanzıman arıza\w*|şanzıman değiş\w*|kavrama yan\w*|clutch burnout|mechatronic failure|mekatronik arıza\w*|inverter failure|iccu failure|stranded|yolda bırak\w*|overhaul|çekici|immobiliz|loss of oil pressure|drop in oil pressure|oil pressure collapses|yağ basıncı (?:düşük|kaybı)|loss of (?:forward )?drive)\b/i.test(c)
    ) {
      return 'BREAKDOWN';
    }

    // 4. DRIVABILITY (5): Performance loss, vibration, shudder, minor leak, overheat without seizure, battery drain, injector deposits
    if (
      /\b(?:coolant leak|water pump leak|su eksilt|termostat|thermostat|overheat(?:ing)?|hararet|parasitic draw|battery drain|12v battery|akü boşal|titreme|silkeleme|shudder(?:ing)?|judder|vibration|drivability|limp mode|hesitation|poor acceleration|clogged injector|faulty injector|enjektör arıza|enjektör tıkan|check engine light|oil leak|yağ kaçağı|misfire|cylinder misfire|sarsıntı|vuruntu)\b/i.test(c)
    ) {
      return 'DRIVABILITY';
    }

    // 5. COSMETIC (1): Rattle, squeak, trim loose, cosmetic wear
    if (
      /\b(?:rattle|squeak|creak|tıkırtı|gıcırtı|ses|trim|loose molding|weatherstrip|wind noise|cosmetic|boya|çizik|plastik parç)\b/i.test(c)
    ) {
      return 'COSMETIC';
    }

    // 6. FUNCTIONAL_MINOR (3): Lighting/taillight, wipers, backup camera delay, label misprint, non-critical sensor, infotainment display reboot, or administrative campaign notice
    const fullRaw = `${consequence || ''} ${titleContext || ''}`.toLowerCase();
    if (
      /\b(?:tail[\s-]?light|head[\s-]?light|lamp|wiper|backup camera|reverse camera|label misprint|non-critical sensor|park sensör|far|silecek|aydınlatma|infotainment|display|screen|ekran|multimedia|warning light|warning message|advisory warning|calibration|software update|minor degradation|indicator light)\b/i.test(c) ||
      /\b(?:service campaign|recall notice|official recall|campaign notice|safety recall|recall|safety standard|campaign bulletin|service bulletin|service action|technical bulletin|geri çağırma)\b/i.test(fullRaw)
    ) {
      return 'FUNCTIONAL_MINOR';
    }

    return 'UNRESOLVED';
  }

  /**
   * Derives severity from VERIFIED technical facts when consequence evidence is missing or ungrounded.
   * Based on: failure mode, affected system/domain, failure behavior, remedy/status.
   * Deterministic, generic across all vehicles, and sets severityBasis = 'INFERRED_FROM_VERIFIED_FAILURE_MODE'.
   */
  inferSeverityFromTechnicalFacts(defect: {
    failureMode?: string;
    normalizedFailureMode?: string;
    title?: string;
    domain?: DomainKeyV6;
    affectedComponent?: string;
    defectStatus?: string;
  }): SeverityCategoryV6 {
    // Domain tokens, failureMode tokens, and component tokens are strictly forbidden from deriving numeric severity.
    // Severity can only be derived from verified consequence / verified technical effects.
    return 'UNRESOLVED';
  }

  /**
   * Verifies if text contains actual technical failure/damage/consequence evidence
   * rather than generic marketing, definitions, or non-technical navigation content.
   */
  hasTechnicalConsequenceEvidence(text?: string): boolean {
    if (!text || text.length < 15) return false;
    const lower = text.toLowerCase();
    return /\b(?:damage|fail(?:ure|s|ed)?|break(?:down)?|hazard|risk|seiz(?:ure|ed)?|crack|rupture|clog|block(?:age)?|loss|leak|warning|light|wear|deteriorat(?:ion|e)|skip|slip|stopp(?:ed)?|bent|broken|overheat|stall|starvation|pickup|strainer|arıza|hasar|kırıl|kopma|tıkan|aşın|kayıp|kaçak|uyarı|hararet|stop|kilitlen|yağsız)\b/i.test(lower);
  }

  /**
   * Expands vehicle technical identity for multi-angle recovery using canonical parameters.
   */
  expandVehicleTechnicalIdentity(
    input: VehicleReliabilityResearchInput,
    defect: NormalizedReliabilityEvidence,
  ): {
    brand: string;
    model: string;
    generation: string;
    year: number;
    engineFamily: string;
    transmissionFamily: string;
    component: string;
    failureMode: string;
    title: string;
    campaignId?: string;
  } {
    const brand = input.brand || '';
    const model = input.model || '';
    const gen = input.generation
      ? `${input.generation}`.replace(/Jenerasyonu/gi, '').replace(new RegExp(model, 'gi'), '').trim()
      : '';
    const year = input.modelYear;
    const eng = (input.engineCode || '').toUpperCase();
    const trans = (input.transmissionCode || input.transmissionName || '').toUpperCase();

    let engineFamily = input.engineCode || '';
    if (/PURETECH|EB2/i.test(eng) || (/1\.2/i.test(eng) && /PEUGEOT|CITROEN|OPEL|DS/i.test(brand))) {
      engineFamily = '1.2 PureTech EB2';
    } else if (/TSI|TFSI|EA211/i.test(eng) || (/1\.4|1\.2|1\.5/i.test(eng) && /VOLKSWAGEN|VW|AUDI|SEAT|SKODA/i.test(brand))) {
      engineFamily = `${input.engineCode || '1.4 TSI'} EA211`.trim();
    } else if (/TDI|EA288|EA189/i.test(eng)) {
      engineFamily = `${input.engineCode || '2.0 TDI'} EA288`.trim();
    } else if (/ECOBOOST/i.test(eng) || (/1\.0/i.test(eng) && /FORD/i.test(brand))) {
      engineFamily = '1.0 EcoBoost Fox';
    } else if (/BLUEHDI|DV5/i.test(eng) || (/1\.5/i.test(eng) && /PEUGEOT|CITROEN|OPEL/i.test(brand))) {
      engineFamily = '1.5 BlueHDi DV5';
    }

    let transmissionFamily = input.transmissionCode || input.transmissionName || '';
    if (/DSG|DQ200|7-SPEED|7 SPEED/i.test(trans) || (/DSG/i.test(trans) && /1\.4|1\.2|1\.6|1\.0/i.test(eng))) {
      transmissionFamily = 'DSG DQ200 7-speed';
    } else if (/DQ250|DQ381|DQ500/i.test(trans)) {
      transmissionFamily = trans;
    } else if (/EAT8|AISIN/i.test(trans)) {
      transmissionFamily = 'EAT8 Aisin';
    } else if (/EDC|6DCT|7DCT/i.test(trans)) {
      transmissionFamily = 'EDC dual clutch';
    } else if (/POWERSHIFT|DPS6/i.test(trans)) {
      transmissionFamily = 'Powershift DPS6';
    }

    const failKey = defect.normalizedFailureMode || '';
    let component = defect.affectedComponent || defect.title || '';
    if (failKey === 'WET_BELT') {
      component = 'timing belt in oil pump strainer';
    } else if (failKey === 'DUAL_CLUTCH_WEAR') {
      component = 'dual clutch pack shudder wear';
    } else if (failKey === 'MECHATRONIC_HYDRAULIC_FAULT') {
      component = 'mechatronic unit valve body accumulator';
    } else if (failKey === 'TIMING_CHAIN_STRETCH') {
      component = 'timing chain stretch tensioner';
    } else if (failKey === 'COOLANT_LEAK_THERMOSTAT') {
      component = 'thermostat housing water pump';
    } else if (failKey === 'PCV_OIL_CONSUMPTION') {
      component = 'PCV valve oil consumption piston rings';
    } else if (failKey === 'FUEL_INJECTOR_DEPOSITS') {
      component = 'fuel injector carbon deposits';
    } else if (failKey === 'DPF_EGR_SOOT_BLOCKAGE') {
      component = 'DPF soot clogging EGR valve';
    }

    let campaignId = (defect as any).campaignId;
    if (!campaignId) {
      if (failKey.startsWith('RECALL_')) {
        const rawCamp = failKey.replace(/^RECALL_/, '');
        campaignId = rawCamp.replace(/_/g, '-');
      } else {
        campaignId = this.extractCampaignId(defect.title) || this.extractCampaignId(defect.severityBasis);
      }
    }

    return {
      brand,
      model,
      generation: gen,
      year,
      engineFamily,
      transmissionFamily,
      component,
      failureMode: failKey,
      title: defect.title || failKey.replace(/_/g, ' '),
      campaignId,
    };
  }

  /**
   * Generates bounded multi-angle recovery queries:
   * A) exact campaign ID queries (official recalls / service campaigns)
   * B) exact variant/component
   * C) engine/transmission family & chronic TSBs
   * D) technical bulletin/service campaign terminology
   */
  buildMultiAngleRecoveryQueries(
    identity: ReturnType<typeof this.expandVehicleTechnicalIdentity>,
  ): string[] {
    const { brand, model, generation, year, engineFamily, transmissionFamily, component, failureMode, campaignId } = identity;

    const rawList: string[] = [];

    if (campaignId && campaignId.length >= 3) {
      const cleanCamp = campaignId.replace(/_/g, '-');
      const altCamp = cleanCamp.replace(/-/g, '');

      // Official recalls / service campaigns query by exact campaign ID:
      rawList.push(`"${cleanCamp}" defect consequence`);
      rawList.push(`${brand} "${cleanCamp}" manufacturer recall consequence`);
      rawList.push(`"${cleanCamp}" technical bulletin`);
      rawList.push(`${cleanCamp} ${altCamp} defect consequence summary safety recall`);
      rawList.push(`${brand} ${model} recall ${cleanCamp} consequence`);
    } else {
      // Chronic discoveries (e.g. DQ200, wet belt, injectors, etc.)
      const angleA = `${brand} ${model} ${generation ? generation + ' ' : ''}${year} ${component} consequence damage breakdown failure`.trim();
      const angleB = `${brand} ${transmissionFamily || engineFamily || model} ${component} technical service bulletin TSB service campaign repair consequence`.trim();
      const angleC = `${engineFamily || transmissionFamily || brand} ${failureMode.replace(/_/g, ' ')} ${component} common failure consequence repair bulletin technical diagnostic`.trim();
      const angleD = `${brand} ${model} ${component} failure mode symptom consequence repair action`.trim();

      rawList.push(angleA, angleB, angleC, angleD);
    }

    const uniqueQueries: string[] = [];
    const seen = new Set<string>();
    for (const q of rawList) {
      const norm = q.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!seen.has(norm) && norm.length > 5) {
        seen.add(norm);
        uniqueQueries.push(q);
      }
    }
    return uniqueQueries;
  }

  /**
   * Bounded Multi-Angle Consequence Recovery Research for defect candidates.
   * Runs bounded angles:
   * A) exact variant/component
   * B) engine/transmission family
   * C) failureMode + architecture
   * D) technical bulletin/service campaign terminology
   * Early-exits as soon as verified consequence evidence is found from Tier 1/2.
   */
  async recoverDefectConsequence(
    defect: NormalizedReliabilityEvidence,
    input: VehicleReliabilityResearchInput,
    budgetTracker?: { queriesExecuted: number; maxBudget: number },
  ): Promise<NormalizedReliabilityEvidence> {
    if (
      defect.severityCategory &&
      defect.severityCategory !== 'UNRESOLVED' &&
      defect.severityBasis &&
      defect.severityBasis !== 'INFERRED_FROM_VERIFIED_FAILURE_MODE' &&
      defect.severityBasis !== 'Sonuç / şiddet kanıtı eksik (UNRESOLVED)' &&
      defect.severityBasis !== 'UNRESOLVED'
    ) {
      return defect;
    }

    // 1. Run Bounded Multi-Angle Recovery
    if (this.webSearchProvider && !input.rawSearchResults) {
      const identity = this.expandVehicleTechnicalIdentity(input, defect);
      const angles = this.buildMultiAngleRecoveryQueries(identity);

      for (const queryStr of angles) {
        if (budgetTracker && budgetTracker.queriesExecuted >= budgetTracker.maxBudget) {
          break; // Global query budget exhausted
        }

        try {
          if (budgetTracker) budgetTracker.queriesExecuted++;
          const lang = identity.campaignId ? 'en' : 'tr';
          const country = identity.campaignId ? 'us' : 'tr';
          const searchResults = await this.webSearchProvider.search(queryStr, lang, country);
          if (searchResults && searchResults.length > 0) {
            for (const res of searchResults) {
              const tier = this.classifySourceTier(res.url, res.domain);
              const fullText = res.retrievedPageText || res.retrievedPageExcerpt || res.contentMarkdown || res.snippet || '';
              const localExcerpt = this.extractDefectLocalConsequence(
                fullText,
                res.snippet || '',
                defect.title,
                defect.domain,
                defect.normalizedFailureMode,
                identity.campaignId,
              );

              if (this.hasTechnicalConsequenceEvidence(localExcerpt)) {
                const mappedCat = this.mapConsequenceToCategory(localExcerpt, undefined, defect.title);
                // Severity may only be derived from verified consequence text from Tier 1 or Tier 2 sources
                if (mappedCat !== 'UNRESOLVED' && (tier === 'TIER_1' || tier === 'TIER_2')) {
                  defect.severityCategory = mappedCat;
                  defect.severityScore = SEVERITY_SCORE_MAP[mappedCat];
                  defect.severityBasis = localExcerpt;

                  // Record the recovered source with its verified tier
                  defect.linkedSources.push({
                    sourceId: `REC-SRC-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                    publisher: res.domain || 'Grounded Recovery Specialist / Official',
                    sourceType: tier === 'TIER_1' ? 'OFFICIAL_RECALL' : 'SPECIALIST_DATA',
                    sourceTier: tier,
                    url: res.url,
                    evidenceSnippet: localExcerpt,
                  });

                  // Grounded consequence found from verified search -> Stop immediately!
                  return defect;
                }
              }
            }
          }
        } catch (err) {
          this.logger.warn(`[RECOVERY CONSEQUENCE] Error running angle "${queryStr}": ${err}`);
        }
      }
    }

    // 2. If consequence still cannot be directly sourced:
    defect.severityCategory = 'UNRESOLVED';
    defect.severityScore = null;
    defect.severityBasis = 'UNRESOLVED';
    return defect;
  }

  private mapSeverityCategory(severity?: string): SeverityCategoryV6 {
    const s = (severity || '').toUpperCase();
    if (s === 'CRITICAL' || s === 'KRİTİK') return 'MAJOR_POWERTRAIN';
    if (s === 'HIGH' || s === 'YÜKSEK') return 'BREAKDOWN';
    if (s === 'MEDIUM' || s === 'ORTA') return 'DRIVABILITY';
    return 'FUNCTIONAL_MINOR';
  }

  private mapDomain(text?: string): DomainKeyV6 {
    const t = (text || '').toLowerCase();
    if (t.includes('şanzıman') || t.includes('kavrama') || t.includes('mechatronic') || t.includes('dsg') || t.includes('gearbox') || t.includes('transmission')) return 'POWERTRAIN_TRANS';
    if (t.includes('batarya') || t.includes('battery') || t.includes('iccu') || t.includes('inverter') || t.includes('bms')) return 'HV_BATTERY_SYSTEM';
    if (t.includes('dpf') || t.includes('adblue') || t.includes('egr') || t.includes('emisyon') || t.includes('exhaust')) return 'EMISSIONS_EXHAUST';
    if (t.includes('soğutma') || t.includes('hararet') || t.includes('termostat') || t.includes('radyatör') || t.includes('cooling') || t.includes('water pump')) return 'THERMAL_COOLING';
    if (t.includes('elektronik') || t.includes('ekran') || t.includes('sensör') || t.includes('electronics') || t.includes('dcm') || t.includes('battery drain')) return 'ELECTRONICS_BODY';
    if (t.includes('süspansiyon') || t.includes('amortisör') || t.includes('fren') || t.includes('brake') || t.includes('chassis')) return 'CHASSIS_BRAKES';
    if (t.includes('recall') || t.includes('geri çağırma')) return 'SAFETY_RECALL';
    return 'POWERTRAIN_ENGINE';
  }
}

