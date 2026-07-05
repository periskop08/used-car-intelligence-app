import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WebSearchProvider } from './providers/web-search.provider';
import { AiAnalysisService } from './ai-analysis.service';
import { CoverageService } from './coverage.service';
import {
  ResearchJobStatus,
  ResearchScope,
  PriorityLevel,
  ApprovalStatus,
  SourceKind,
  SubscriptionTier,
  SourceType,
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
   * Worker loop trigger: Fetch and process a queued job using SKIP LOCKED.
   */
  async processNextJob(): Promise<boolean> {
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

      // 6. DB transaction insertion for structured outputs in PENDING state
      await this.prisma.$transaction(async (tx) => {
        // Create CommonProblems
        for (const prob of aiAnalysis.problems as any[]) {
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
              problemType: prob.problemType,
              dataConfidence: 'MEDIUM',
              sourceKind: SourceKind.UNKNOWN,
              sourceCount: 1,
              status: ApprovalStatus.PENDING,
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
          await tx.recall.create({
            data: {
              variantId: job.vehicleVariantId,
              title: rec.title,
              description: rec.description,
              countryId: job.variant.countryId,
              date: new Date(),
              riskLevel: 'HIGH',
              status: ApprovalStatus.PENDING,
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
              dataConfidence: 'HIGH',
            },
          });
        }

        // Create Seller Questions
        for (const q of aiAnalysis.sellerQuestions as any[]) {
          await tx.sellerQuestion.create({
            data: {
              variantId: job.vehicleVariantId,
              question: q.question,
              reason: q.reason,
              category: q.category,
              riskLevel: q.riskLevel,
              priority: q.priority,
              status: ApprovalStatus.PENDING,
            },
          });
        }

        // Create Inspection Checklist Items
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
              status: ApprovalStatus.PENDING,
            },
          });
        }

        // Update all related RawSources of this job to PENDING (analyzed, ready for admin review)
        await tx.rawSource.updateMany({
          where: { id: { in: rawSources.map((rs) => rs.id) } },
          data: { status: ApprovalStatus.PENDING },
        });
      });

      // 7. Mark Job as completed
      await this.prisma.vehicleResearchJob.update({
        where: { id: job.id },
        data: {
          status: ResearchJobStatus.COMPLETED,
          lockedAt: null,
          lockedBy: null,
        },
      });

      this.logger.log(`Job ${job.id} completed successfully.`);
      return true;
    } catch (error) {
      this.logger.error(`Error processing job ${job.id}: ${error.message}`);
      await this.handleJobFailure(job, error.message);
      return false;
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
   */
  async recoverStuckJobs(): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const result = await this.prisma.$executeRaw`
      UPDATE "VehicleResearchJob"
      SET "status" = 'QUEUED', "lockedAt" = NULL, "lockedBy" = NULL
      WHERE "status" = 'RUNNING'
        AND "lockedAt" <= ${fifteenMinutesAgo}
    `;
    if (result > 0) {
      this.logger.warn(`Recovered ${result} stuck research jobs.`);
    }
  }

  private getDailyLimitForTier(tier: SubscriptionTier): number {
    switch (tier) {
      case SubscriptionTier.FREE: return 1;
      case SubscriptionTier.STANDARD: return 3;
      case SubscriptionTier.PRO: return 10;
      default: return 1;
    }
  }
}
