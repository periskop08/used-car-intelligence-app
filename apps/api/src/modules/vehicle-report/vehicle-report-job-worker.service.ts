import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportProviderService } from './vehicle-report-provider.service';
import { VehicleReportQuotaService } from './vehicle-report-quota.service';
import { VehicleReportJobStatus, VehicleReportStatus } from '@prisma/client';

@Injectable()
export class VehicleReportJobWorkerService implements OnModuleInit {
  private readonly logger = new Logger(VehicleReportJobWorkerService.name);
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private providerService: VehicleReportProviderService,
    private quotaService: VehicleReportQuotaService,
  ) {}

  onModuleInit() {
    this.startWorkerLoop();
  }

  private startWorkerLoop() {
    setInterval(() => {
      this.processNextJobs().catch((err) => {
        this.logger.error(`Error in VehicleReportJobWorker loop: ${err.message}`);
        this.isProcessing = false;
      });
    }, 10000);
  }

  async processNextJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    let currentJob: any = null;

    try {
      // 1. Reconcile stale reservations
      await this.quotaService.reconcileStaleReservations();

      // 2. Fetch QUEUED job
      const job = await this.prisma.vehicleReportResearchJob.findFirst({
        where: {
          status: VehicleReportJobStatus.QUEUED,
        },
        include: {
          report: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!job || !job.report) {
        this.isProcessing = false;
        return;
      }

      currentJob = job;

      this.logger.log(`Processing report job ${job.id} for report ${job.reportId} (Mode: ${job.mode})`);

      // Update job to GENERATING
      await this.prisma.vehicleReportResearchJob.update({
        where: { id: job.id },
        data: {
          status: VehicleReportJobStatus.GENERATING,
          startedAt: new Date(),
          lockedBy: 'worker-1',
          lockedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });

      await this.prisma.generatedVehicleReport.update({
        where: { id: job.reportId },
        data: { status: VehicleReportStatus.GENERATING },
      });

      // Execute AI generation
      const vehicleContext = (job.report.reportData as any)?._vehicleContext;

      const result = await this.providerService.generateReport(
        job.reportId,
        vehicleContext,
      );

      // Save output
      await this.prisma.generatedVehicleReport.update({
        where: { id: job.reportId },
        data: {
          status: result.report.status === 'SAFE_FALLBACK' ? VehicleReportStatus.SAFE_FALLBACK : VehicleReportStatus.COMPLETED,
          reportData: result.report as any,
          provider: result.provider,
          modelName: result.modelName,
          qualityScore: result.qualityScore,
          repairAttempted: result.repairAttempted,
          fallbackReason: result.fallbackReason,
          completedAt: new Date(),
        },
      });

      // Complete job
      await this.prisma.vehicleReportResearchJob.update({
        where: { id: job.id },
        data: {
          status: result.report.status === 'SAFE_FALLBACK' ? VehicleReportJobStatus.SAFE_FALLBACK : VehicleReportJobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Consume quota upon usable output
      if (job.report.quotaUsageId) {
        await this.quotaService.consumeQuota(job.report.quotaUsageId);
      }

      this.logger.log(`Job ${job.id} completed successfully with status ${result.report.status}`);
    } catch (err: any) {
      this.logger.error(`Job processing failed: ${err.message}`);
      // Release quota reservation on unrecoverable job failure
      if (currentJob?.report?.quotaUsageId) {
        await this.quotaService.releaseQuota(currentJob.report.quotaUsageId);
      }
    } finally {
      this.isProcessing = false;
      if (typeof global.gc === 'function') {
        global.gc();
      }
    }
  }
}
