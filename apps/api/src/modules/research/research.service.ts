import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from './providers/web-search.provider';
import { AiAnalysisService } from './ai-analysis.service';
import { CoverageService } from './coverage.service';
import { EvidenceRulesService } from './evidence-rules.service';
import { AiReportGeneratorService } from './ai-report-generator.service';
import {
  ResearchJobStatus,
  ResearchScope,
  PriorityLevel,
  ApprovalStatus,
  SubscriptionTier,
  SourceType,
  SourceKind,
} from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);
  private readonly workerId = `worker-${Math.random().toString(36).substring(2, 11)}`;

  constructor(
    private prisma: PrismaService,
    private searchProvider: WebSearchProvider,
    private aiAnalysisService: AiAnalysisService,
    private coverageService: CoverageService,
    private evidenceRules: EvidenceRulesService,
    private reportGenerator: AiReportGeneratorService,
  ) {}

  /**
   * Request a new research job for a vehicle variant.
   * Handles user-based daily limits, active duplicate job checks, and queueing.
   */
  async requestResearch(
    variantId: string,
    userId: string,
    languageCode: string = 'tr',
    countryCode: string = 'TR',
    researchScope: ResearchScope = ResearchScope.FULL_REPORT,
    priority: PriorityLevel = PriorityLevel.MEDIUM,
  ): Promise<string> {
    // 1. Verify variant exists
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException('Vehicle variant not found.');
    }

    // 2. Check for duplicate active jobs (QUEUED or RUNNING)
    const activeJob = await this.prisma.vehicleResearchJob.findFirst({
      where: {
        vehicleVariantId: variantId,
        languageCode,
        countryCode,
        researchScope,
        status: { in: [ResearchJobStatus.QUEUED, ResearchJobStatus.RUNNING] },
      },
    });

    if (activeJob) {
      this.logger.log(`Active research job already exists for variant ${variantId}. Returning job ID: ${activeJob.id}`);
      return activeJob.id;
    }

    // 3. Apply subscription tier-based daily rate limits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const dailyLimit = this.getDailyLimitForTier(user.subscriptionTier);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userJobsCount = await this.prisma.vehicleResearchJob.count({
      where: {
        requestedByUserId: userId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (userJobsCount >= dailyLimit) {
      throw new BadRequestException(
        `Daily research limit reached. Your tier allows maximum ${dailyLimit} jobs per 24 hours.`
      );
    }

    // 4. Create and enqueue the job
    const newJob = await this.prisma.vehicleResearchJob.create({
      data: {
        vehicleVariantId: variantId,
        requestedByUserId: userId,
        languageCode,
        countryCode,
        researchScope,
        priority,
        status: ResearchJobStatus.QUEUED,
      },
    });

    this.logger.log(`Enqueued research job ${newJob.id} for variant ${variantId}.`);
    return newJob.id;
  }

  /**
   * Batch research job creation for all variants with NONE/LIMITED coverage.
   * Or selected variantIds if provided.
   * Restricted to admin/system triggers.
   */
  async batchPopulate(dto: {
    countryCode: string;
    languageCode: string;
    marketRegion?: string;
    researchScope: ResearchScope;
    limit: number;
    onlyCoverage?: string[];
    dryRun: boolean;
    variantIds?: string[];
  }): Promise<any> {
    const maxBatchLimit = Number(process.env.BATCH_MAX_LIMIT) || 500;
    const limitVal = Math.min(dto.limit || 100, maxBatchLimit);

    // Global daily budget limit check
    const dailyLimit = Number(process.env.DAILY_RESEARCH_JOB_LIMIT) || 1000;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyJobsCreated = await this.prisma.vehicleResearchJob.count({
      where: { createdAt: { gte: oneDayAgo } },
    });

    // Fetch variants
    const variants = await this.prisma.vehicleVariant.findMany({
      where: dto.variantIds && dto.variantIds.length > 0 ? { id: { in: dto.variantIds } } : undefined,
      include: {
        problems: { where: { status: ApprovalStatus.APPROVED } },
        recalls: { where: { status: ApprovalStatus.APPROVED } },
        checklists: { where: { status: ApprovalStatus.APPROVED } },
      },
    });

    let filtered = variants;
    if (!dto.variantIds || dto.variantIds.length === 0) {
      filtered = variants.filter((v) => {
        const count = v.problems.length + v.recalls.length + v.checklists.length;
        const coverage = this.coverageService.calculateDataCoverage(count);
        return dto.onlyCoverage ? dto.onlyCoverage.includes(coverage) : true;
      });
    }

    const targetVariants = filtered.slice(0, limitVal);

    if (dailyJobsCreated + targetVariants.length > dailyLimit) {
      throw new BadRequestException(`Global daily batch limit exceeded. Cannot queue ${targetVariants.length} jobs. Current 24h count: ${dailyJobsCreated}/${dailyLimit}.`);
    }

    let wouldCreate = 0;
    let skippedExisting = 0;
    const createdIds: string[] = [];

    for (const v of targetVariants) {
      // Check for active job
      const activeJob = await this.prisma.vehicleResearchJob.findFirst({
        where: {
          vehicleVariantId: v.id,
          languageCode: dto.languageCode,
          countryCode: dto.countryCode,
          researchScope: dto.researchScope,
          status: { in: [ResearchJobStatus.QUEUED, ResearchJobStatus.RUNNING] },
        },
      });

      if (activeJob) {
        skippedExisting++;
        continue;
      }

      wouldCreate++;

      if (!dto.dryRun) {
        const job = await this.prisma.vehicleResearchJob.create({
          data: {
            vehicleVariantId: v.id,
            languageCode: dto.languageCode,
            countryCode: dto.countryCode,
            marketRegion: dto.marketRegion || null,
            researchScope: dto.researchScope,
            priority: PriorityLevel.LOW,
            status: ResearchJobStatus.QUEUED,
          },
        });
        createdIds.push(job.id);
      }
    }

    return {
      matchedVariants: filtered.length,
      wouldCreateJobs: wouldCreate,
      skippedBecauseActiveJobExists: skippedExisting,
      estimatedProviderCalls: wouldCreate * 5,
      createdJobIds: createdIds,
    };
  }

  /**
   * Worker loop trigger: Fetch and process a queued job using SKIP LOCKED.
   */
  async processNextJob(): Promise<boolean> {
    const startTime = Date.now();

    // 1. Recover stuck jobs first
    await this.recoverStuckJobs();

    // 2. Lock next job using PostgreSQL SKIP LOCKED via queryRaw
    const lockedJobs = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "VehicleResearchJob"
      WHERE "status" = 'QUEUED'
        AND ("nextRunAt" IS NULL OR "nextRunAt" <= NOW())
      ORDER BY "priority" DESC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!lockedJobs || lockedJobs.length === 0) {
      return false; // No jobs to process
    }

    const rawJob = lockedJobs[0];
    const jobId = rawJob.id;

    // 3. Mark job as running and update attemptCount
    const job = await this.prisma.vehicleResearchJob.update({
      where: { id: jobId },
      data: {
        status: ResearchJobStatus.RUNNING,
        lockedAt: new Date(),
        lockedBy: this.workerId,
        attemptCount: { increment: 1 },
      },
      include: {
        variant: {
          include: {
            brand: true,
            model: true,
            engine: true,
            transmission: true,
            trim: true,
          },
        },
      },
    });

    this.logger.log(`Processing Job ${job.id} for variant ${job.vehicleVariantId} (Attempt: ${job.attemptCount}/${job.maxAttempts}).`);

    // Start a periodic heartbeat lock-refresh timer
    const heartbeatMins = Number(process.env.HEARTBEAT_INTERVAL_MINS) || 2;
    const heartbeatInterval = setInterval(async () => {
      try {
        await this.prisma.vehicleResearchJob.update({
          where: { id: job.id },
          data: { lockedAt: new Date() },
        });
        this.logger.log(`Refreshed lock heartbeat for Job ${job.id}.`);
      } catch (err) {
        this.logger.error(`Failed to refresh heartbeat for Job ${job.id}: ${err.message}`);
      }
    }, heartbeatMins * 60 * 1000);

    try {
      // 4. Execute search queries based on variant specs
      const brandName = job.variant.brand.name;
      const modelName = job.variant.model.name;
      const engineCode = job.variant.engine.code;
      const transName = job.variant.transmission.name;
      const year = job.variant.year;

      const query = `${year} ${brandName} ${modelName} ${engineCode} ${transName} problems recalls reliability`;
      const searchResults = await this.searchProvider.search(query, job.languageCode, job.countryCode);

      // Save raw sources
      const rawSources = [];
      for (const res of searchResults) {
        // Generate content hash to prevent duplicate URL / content inserts
        const contentHash = createHash('sha256')
          .update(`${res.url}-${res.title}-${res.snippet}`)
          .digest('hex');

        let rawSource = await this.prisma.rawSource.findUnique({
          where: { contentHash },
        });

        if (!rawSource) {
          let domain: string | null = null;
          try {
            const parsedUrl = new URL(res.url);
            domain = parsedUrl.hostname.replace('www.', '');
          } catch (e) {}

          rawSource = await this.prisma.rawSource.create({
            data: {
              sourceType: SourceType.OTHER,
              url: res.url,
              title: res.title,
              contentHash,
              extractedText: res.snippet,
              rawText: res.snippet,
              extractedSummary: res.snippet,
              languageCode: job.languageCode,
              countryCode: job.countryCode,
              confidenceScore: res.reliabilityScore,
              sourceKind: res.sourceKind,
              vehicleVariantId: job.vehicleVariantId,
              status: ApprovalStatus.RAW,
              sourceDomain: domain,
            },
          });
        }

        rawSources.push(rawSource);
      }

      // 5. AI parsing and structuring
      const aiAnalysis = await this.aiAnalysisService.analyzeSources(
        brandName,
        modelName,
        year,
        searchResults,
        job.languageCode
      );

      // 6. DB transaction insertion with Automated Evidence Rules
      await this.prisma.$transaction(async (tx) => {
        // Clean up old/mock data if any to prevent duplication and clear fake reports
        await tx.commonProblem.deleteMany({ where: { variantId: job.vehicleVariantId } });
        await tx.recall.deleteMany({ where: { variantId: job.vehicleVariantId } });
        await tx.sellerQuestion.deleteMany({ where: { variantId: job.vehicleVariantId } });
        await tx.inspectionChecklistItem.deleteMany({ where: { variantId: job.vehicleVariantId } });

        // Create CommonProblems
        for (const prob of aiAnalysis.problems as any[]) {
          // Run Automated Evidence Rules on problem passing target variant specs
          const decision = this.evidenceRules.evaluateCommonProblem(prob, rawSources, job.variant);

          const autoApprove = process.env.AUTO_APPROVE_RESEARCH === 'true' || process.env.NODE_ENV !== 'production';

          const newProb = await tx.commonProblem.create({
            data: {
              variantId: job.vehicleVariantId,
              title: prob.title,
              description: prob.description,
              affectedYears: prob.affectedYears || year.toString(),
              affectedEngine: prob.affectedEngine || engineCode,
              affectedTransmission: prob.affectedTransmission || transName,
              riskLevel: prob.riskLevel,
              symptoms: prob.symptoms,
              checkRecommendation: prob.checkRecommendation,
              problemType: decision.problemType,
              dataConfidence: decision.dataConfidence,
              sourceKind: SourceKind.UNKNOWN,
              sourceCount: rawSources.length,
              status: autoApprove ? ApprovalStatus.APPROVED : decision.status,
              metadata: decision.metadata,
            },
          });

          // Link to raw sources
          for (const src of rawSources) {
            await tx.commonProblemSource.create({
              data: {
                problemId: newProb.id,
                sourceId: src.id,
                sourceUrl: src.url,
                sourceKind: src.sourceKind,
                evidenceText: prob.evidenceText || src.extractedSummary,
                confidenceContribution: prob.confidenceContribution || 0.5,
              },
            });
          }
        }

        // Create Recalls
        for (const rec of aiAnalysis.recalls as any[]) {
          // Run Automated Evidence Rules on recall
          const decision = this.evidenceRules.evaluateRecall(rec, rawSources);
          const autoApprove = process.env.AUTO_APPROVE_RESEARCH === 'true' || process.env.NODE_ENV !== 'production';

          await tx.recall.create({
            data: {
              variantId: job.vehicleVariantId,
              title: rec.title,
              description: rec.description,
              countryId: job.variant.countryId,
              date: new Date(),
              riskLevel: 'HIGH',
              status: autoApprove ? ApprovalStatus.APPROVED : decision.status,
              vinCheckRequired: rec.vinCheckRequired,
              officialCheckUrl: rec.officialCheckUrl,
              recallDate: rec.recallDate ? new Date(rec.recallDate) : new Date(),
              remedy: rec.remedy,
              manufacturerCampaignNumber: rec.manufacturerCampaignNumber,
              nhtsaCampaignNumber: rec.nhtsaCampaignNumber,
              safetyRisk: rec.safetyRisk,
              recallCode: rec.recallCode,
              officialSourceUrl: rec.officialSourceUrl,
              sourceKind: SourceKind.OFFICIAL_RECALL,
              affectedYears: rec.affectedYears || year.toString(),
              affectedEngine: rec.affectedEngine || engineCode,
              affectedTransmission: rec.affectedTransmission || transName,
              countryCode: job.countryCode,
              dataConfidence: decision.dataConfidence,
              metadata: decision.metadata,
            },
          });
        }

        // Create Seller Questions (Auto-publish as APPROVED)
        for (const q of aiAnalysis.sellerQuestions as any[]) {
          await tx.sellerQuestion.create({
            data: {
              variantId: job.vehicleVariantId,
              question: q.question,
              reason: q.reason,
              category: q.category,
              riskLevel: q.riskLevel,
              priority: q.priority,
              status: ApprovalStatus.APPROVED,
              metadata: { publishedBy: 'AUTO_RULES' },
            },
          });
        }

        // Create Inspection Checklist Items (Auto-publish as APPROVED)
        for (const c of aiAnalysis.checklists as any[]) {
          await tx.inspectionChecklistItem.create({
            data: {
              variantId: job.vehicleVariantId,
              title: c.title,
              description: c.description,
              category: c.category,
              riskLevel: c.riskLevel,
              priority: c.priority,
              sortOrder: c.sortOrder,
              status: ApprovalStatus.APPROVED,
              metadata: { publishedBy: 'AUTO_RULES' },
            },
          });
        }

        // Update all related RawSources of this job to PENDING
        await tx.rawSource.updateMany({
          where: { id: { in: rawSources.map((rs) => rs.id) } },
          data: { status: ApprovalStatus.PENDING },
        });
      });

      // Calculate cost & duration metrics
      const jobDurationMs = Date.now() - startTime;
      const searchProviderCalls = 1;
      const estimatedSearchCost = 0.01;
      const aiInputTokens = 2000;
      const aiOutputTokens = 1000;
      const estimatedAiCost = (aiInputTokens * 0.15 + aiOutputTokens * 0.6) / 1000000; // GPT-4o-mini rates

      // 7. Mark Job as completed and record stats in metadata
      await this.prisma.vehicleResearchJob.update({
        where: { id: job.id },
        data: {
          status: ResearchJobStatus.COMPLETED,
          lockedAt: null,
          lockedBy: null,
          metadata: {
            searchProviderCalls,
            estimatedSearchCost,
            aiInputTokens,
            aiOutputTokens,
            estimatedAiCost,
            jobDurationMs,
            rawSourceCount: rawSources.length,
            approvedProblemsCount: aiAnalysis.problems?.length || 0,
            approvedRecallsCount: aiAnalysis.recalls?.length || 0,
          },
        },
      });

      // Mark report cache as STALE so it recalculates with newly published data
      await this.reportGenerator.markReportStale(job.vehicleVariantId);

      this.logger.log(`Job ${job.id} completed successfully.`);
      return true;
    } catch (error) {
      this.logger.error(`Error processing job ${job.id}: ${error.message}`);
      await this.handleJobFailure(job, error.message);
      return false;
    } finally {
      clearInterval(heartbeatInterval);
    }
  }

  /**
   * Handle job failures, retry mechanics, and max attempt caps.
   */
  private async handleJobFailure(job: any, errorMessage: string): Promise<void> {
    const isRetryable = job.attemptCount < job.maxAttempts;
    const nextRunAt = new Date(Date.now() + job.attemptCount * 60 * 1000); // 1m, 2m backoff

    await this.prisma.vehicleResearchJob.update({
      where: { id: job.id },
      data: {
        status: isRetryable ? ResearchJobStatus.QUEUED : ResearchJobStatus.FAILED,
        errorMessage,
        nextRunAt: isRetryable ? nextRunAt : null,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  /**
   * Unlock jobs stuck in RUNNING state for more than 15 minutes.
   * Checks against heartbeat (last lockedAt must be older than 15 mins).
   */
  async recoverStuckJobs(): Promise<void> {
    const timeoutMins = Number(process.env.WORKER_LOCK_TIMEOUT_MINS) || 15;
    const timeoutAgo = new Date(Date.now() - timeoutMins * 60 * 1000);
    const result = await this.prisma.$executeRaw`
      UPDATE "VehicleResearchJob"
      SET "status" = 'QUEUED', "lockedAt" = NULL, "lockedBy" = NULL
      WHERE "status" = 'RUNNING'
        AND "lockedAt" <= ${timeoutAgo}
    `;
    if (result > 0) {
      this.logger.warn(`Recovered ${result} stuck research jobs.`);
    }
  }

  private getDailyLimitForTier(tier: SubscriptionTier): number {
    switch (tier) {
      case SubscriptionTier.FREE: return 1;
      case SubscriptionTier.STANDARD: return 3;
      case SubscriptionTier.PREMIUM: return 10;
      default: return 1;
    }
  }
}
