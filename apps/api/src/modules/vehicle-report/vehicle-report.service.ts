import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportContextBuilderService } from './vehicle-report-context-builder.service';
import { ListingReportContextService } from './listing-report-context.service';
import { VehicleReportCacheService } from './vehicle-report-cache.service';
import { VehicleReportQuotaService } from './vehicle-report-quota.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { CreateVehicleReportDto } from './vehicle-report.dto';
import { VehicleReportMode, AiQuotaFeature, VehicleReportStatus, VehicleReportJobStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class VehicleReportService implements OnModuleInit {
  private readonly logger = new Logger(VehicleReportService.name);

  constructor(
    private prisma: PrismaService,
    private vehicleContextBuilder: VehicleReportContextBuilderService,
    private listingContextBuilder: ListingReportContextService,
    private cacheService: VehicleReportCacheService,
    private quotaService: VehicleReportQuotaService,
    private fallbackService: VehicleReportFallbackService,
  ) {}

  async onModuleInit() {
    try {
      const statements = [
        `DO $$ BEGIN
            CREATE TYPE "VehicleReportMode" AS ENUM ('VEHICLE_REPORT', 'LISTING_REPORT');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `DO $$ BEGIN
            CREATE TYPE "VehicleReportStatus" AS ENUM ('QUEUED', 'GENERATING', 'VALIDATING', 'REPAIRING', 'COMPLETED', 'SAFE_FALLBACK', 'FAILED', 'ARCHIVED');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `DO $$ BEGIN
            CREATE TYPE "VehicleReportJobStatus" AS ENUM ('QUEUED', 'GENERATING', 'VALIDATING', 'REPAIRING', 'COMPLETED', 'SAFE_FALLBACK', 'FAILED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `ALTER TYPE "AiQuotaFeature" ADD VALUE IF NOT EXISTS 'VEHICLE_REPORT';`,
        `ALTER TYPE "AiQuotaFeature" ADD VALUE IF NOT EXISTS 'LISTING_REPORT';`,

        `CREATE TABLE IF NOT EXISTS "GeneratedVehicleReport" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "mode" "VehicleReportMode" NOT NULL,
            "variantId" TEXT,
            "listingId" TEXT,
            "contextHash" TEXT NOT NULL,
            "vehicleContextHash" TEXT NOT NULL,
            "listingContextHash" TEXT,
            "reportVersion" TEXT NOT NULL DEFAULT 'v1.0',
            "promptVersion" TEXT,
            "schemaVersion" INTEGER NOT NULL DEFAULT 1,
            "status" "VehicleReportStatus" NOT NULL DEFAULT 'QUEUED',
            "reportData" JSONB,
            "quotaUsageId" TEXT,
            "idempotencyKey" TEXT NOT NULL,
            "provider" TEXT,
            "modelName" TEXT,
            "tokenInput" INTEGER,
            "tokenOutput" INTEGER,
            "generationMs" INTEGER,
            "repairAttempted" BOOLEAN NOT NULL DEFAULT false,
            "fallbackReason" TEXT,
            "staleReasons" JSONB,
            "lastRefreshReason" TEXT,
            "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "completedAt" TIMESTAMP(3),
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "archivedAt" TIMESTAMP(3),
            CONSTRAINT "GeneratedVehicleReport_pkey" PRIMARY KEY ("id")
        );`,

        `CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedVehicleReport_userId_idempotencyKey_key" 
        ON "GeneratedVehicleReport"("userId", "idempotencyKey");`,

        `CREATE TABLE IF NOT EXISTS "VehicleReportResearchJob" (
            "id" TEXT NOT NULL,
            "reportId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "mode" "VehicleReportMode" NOT NULL,
            "status" "VehicleReportJobStatus" NOT NULL DEFAULT 'QUEUED',
            "contextHash" TEXT NOT NULL,
            "priority" INTEGER NOT NULL DEFAULT 0,
            "attemptCount" INTEGER NOT NULL DEFAULT 0,
            "maxAttempts" INTEGER NOT NULL DEFAULT 3,
            "lockedBy" TEXT,
            "lockedAt" TIMESTAMP(3),
            "heartbeatAt" TIMESTAMP(3),
            "lockExpiresAt" TIMESTAMP(3),
            "nextAttemptAt" TIMESTAMP(3),
            "lastErrorCode" TEXT,
            "lastErrorMessage" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "startedAt" TIMESTAMP(3),
            "completedAt" TIMESTAMP(3),
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "VehicleReportResearchJob_pkey" PRIMARY KEY ("id")
        );`,

        `CREATE UNIQUE INDEX IF NOT EXISTS "VehicleReportResearchJob_reportId_key" 
        ON "VehicleReportResearchJob"("reportId");`,

        `CREATE TABLE IF NOT EXISTS "VehicleReportGenerationLock" (
            "id" TEXT NOT NULL,
            "lockKey" TEXT NOT NULL,
            "reportId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "mode" "VehicleReportMode" NOT NULL,
            "contextHash" TEXT NOT NULL,
            "expiresAt" TIMESTAMP(3) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "VehicleReportGenerationLock_pkey" PRIMARY KEY ("id")
        );`,

        `CREATE UNIQUE INDEX IF NOT EXISTS "VehicleReportGenerationLock_lockKey_key" 
        ON "VehicleReportGenerationLock"("lockKey");`,
      ];

      for (const statement of statements) {
        await this.prisma.$executeRawUnsafe(statement);
      }
      this.logger.log('VehicleReport DDL tables verified successfully.');
    } catch (e: any) {
      this.logger.warn(`VehicleReport DDL initialization warning: ${e.message}`);
    }
  }

  async createVehicleReport(userId: string, dto: CreateVehicleReportDto) {
    try {
      if (dto.mode === 'VEHICLE_REPORT' && !dto.variantId) {
        throw new BadRequestException('VEHICLE_REPORT modu için variantId zorunludur.');
      }
      if (dto.mode === 'LISTING_REPORT' && !dto.listingId) {
        throw new BadRequestException('LISTING_REPORT modu için listingId zorunludur.');
      }

      let vehicleContext: any;
      let vehicleContextHash: string;
      let listingContext: any;
      let listingContextHash: string | undefined;
      let variantId = dto.variantId;
      let listingId = dto.listingId;

      if (dto.mode === 'LISTING_REPORT' && listingId) {
        const listingRes = await this.listingContextBuilder.buildListingContext(listingId);
        listingContext = listingRes.listingContext;
        listingContextHash = listingRes.listingContextHash;
        variantId = listingRes.variantId;

        if (!variantId) {
          throw new BadRequestException('İlan için geçerli bir araç varyantı tanımlanmamıştır.');
        }
      }

      const vRes = await this.vehicleContextBuilder.buildVehicleContext(variantId!);
      vehicleContext = vRes.vehicleContext;
      vehicleContextHash = vRes.vehicleContextHash;

      const fullContextHash = crypto
        .createHash('sha256')
        .update(`${vehicleContextHash}_${listingContextHash || ''}`)
        .digest('hex');

      // 1. Check cache
      try {
        const cached = await this.cacheService.getCachedReport(
          userId,
          dto.mode,
          fullContextHash,
          'v1.0',
          variantId,
          listingId,
        );

        if (cached) {
          return {
            reportId: cached.id,
            mode: cached.mode,
            status: cached.status,
            cached: true,
          };
        }
      } catch (cacheErr) {
        this.logger.warn(`Cache lookup warning: ${cacheErr}`);
      }

      // 2. Concurrency Lock
      const lockKey = crypto
        .createHash('sha256')
        .update(`${userId}_${dto.mode}_${variantId || ''}_${listingId || ''}_${fullContextHash}_v1.0`)
        .digest('hex');

      try {
        await this.prisma.vehicleReportGenerationLock.create({
          data: {
            lockKey,
            reportId: 'pending',
            userId,
            mode: dto.mode,
            contextHash: fullContextHash,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        });
      } catch (err: any) {
        this.logger.warn(`Lock collision or missing table: ${err.message}`);
      }

      // 3. Quota reservation (safe try-catch)
      let quotaUsageId: string | undefined = undefined;
      try {
        const feature = dto.mode === 'LISTING_REPORT' ? AiQuotaFeature.LISTING_REPORT : AiQuotaFeature.VEHICLE_REPORT;
        const quotaRes = await this.quotaService.reserveQuota(userId, dto.idempotencyKey, feature, listingId || variantId);
        quotaUsageId = quotaRes.quotaUsageId;
      } catch (qErr: any) {
        this.logger.warn(`Quota reservation warning: ${qErr.message}`);
      }

      // 4. Generate Fallback Report as reliable payload
      const fallbackReport = this.fallbackService.generateFallbackReport(
        dto.idempotencyKey,
        dto.mode,
        vehicleContext,
        listingContext,
      );

      // Save report
      const report = await this.prisma.generatedVehicleReport.create({
        data: {
          userId,
          mode: dto.mode,
          variantId,
          listingId,
          contextHash: fullContextHash,
          vehicleContextHash,
          listingContextHash,
          reportVersion: 'v1.0',
          status: VehicleReportStatus.SAFE_FALLBACK,
          idempotencyKey: dto.idempotencyKey,
          quotaUsageId,
          reportData: fallbackReport as any,
          provider: 'DETERMINISTIC_FALLBACK',
          modelName: 'TorqueScout DB Engine',
          completedAt: new Date(),
        },
      });

      return {
        reportId: report.id,
        mode: report.mode,
        status: report.status,
        cached: false,
      };
    } catch (error: any) {
      this.logger.error(`createVehicleReport Error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Rapor oluşturulurken sunucu hatası gerçekleşti.');
    }
  }

  async getReportById(userId: string, reportId: string) {
    try {
      const report = await this.prisma.generatedVehicleReport.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        throw new NotFoundException(`Rapor bulunamadı: ${reportId}`);
      }

      if (report.userId !== userId) {
        throw new BadRequestException('Bu rapora erişim yetkiniz bulunmamaktadır.');
      }

      return report;
    } catch (e: any) {
      this.logger.error(`getReportById error: ${e.message}`);
      throw new NotFoundException(e.message || 'Rapor bulunamadı.');
    }
  }

  async getCurrentVariantReport(userId: string, variantId: string) {
    try {
      const vRes = await this.vehicleContextBuilder.buildVehicleContext(variantId);
      return await this.cacheService.getCachedReport(
        userId,
        'VEHICLE_REPORT',
        vRes.vehicleContextHash,
        'v1.0',
        variantId,
      );
    } catch (e: any) {
      return null;
    }
  }

  async getCurrentListingReport(userId: string, listingId: string) {
    try {
      const lRes = await this.listingContextBuilder.buildListingContext(listingId);
      if (!lRes.variantId) return null;
      const vRes = await this.vehicleContextBuilder.buildVehicleContext(lRes.variantId);
      const fullHash = crypto
        .createHash('sha256')
        .update(`${vRes.vehicleContextHash}_${lRes.listingContextHash}`)
        .digest('hex');

      return await this.cacheService.getCachedReport(
        userId,
        'LISTING_REPORT',
        fullHash,
        'v1.0',
        lRes.variantId,
        listingId,
      );
    } catch (e: any) {
      return null;
    }
  }
}
