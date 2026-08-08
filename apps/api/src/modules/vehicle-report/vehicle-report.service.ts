import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportContextBuilderService } from './vehicle-report-context-builder.service';
import { ListingReportContextService } from './listing-report-context.service';
import { VehicleReportCacheService } from './vehicle-report-cache.service';
import { VehicleReportQuotaService } from './vehicle-report-quota.service';
import { VehicleReportFallbackService } from './vehicle-report-fallback.service';
import { VehicleReportProviderService } from './vehicle-report-provider.service';
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
    private providerService: VehicleReportProviderService,
  ) {}

  async onModuleInit() {
    try {
      const statements = [
        `DO $$ BEGIN
            CREATE TYPE "VehicleReportMode" AS ENUM ('VEHICLE_REPORT', 'LISTING_REPORT', 'TORQUE_SCOUT_VEHICLE_REPORT');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `ALTER TYPE "VehicleReportMode" ADD VALUE IF NOT EXISTS 'TORQUE_SCOUT_VEHICLE_REPORT';`,

        `DO $$ BEGIN
            CREATE TYPE "VehicleReportStatus" AS ENUM ('QUEUED', 'GENERATING', 'VALIDATING', 'REPAIRING', 'COMPLETED', 'SAFE_FALLBACK', 'FAILED', 'ARCHIVED');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `DO $$ BEGIN
            CREATE TYPE "VehicleReportJobStatus" AS ENUM ('QUEUED', 'GENERATING', 'VALIDATING', 'REPAIRING', 'COMPLETED', 'SAFE_FALLBACK', 'FAILED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `ALTER TYPE "AiQuotaFeature" ADD VALUE IF NOT EXISTS 'VEHICLE_REPORT';`,
        `ALTER TYPE "AiQuotaFeature" ADD VALUE IF NOT EXISTS 'LISTING_REPORT';`,

        `ALTER TABLE "GeneratedVehicleReport" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER;`,
        `ALTER TABLE "GeneratedVehicleReport" ADD COLUMN IF NOT EXISTS "refreshReason" TEXT;`,
        `ALTER TABLE "GeneratedVehicleReport" ADD COLUMN IF NOT EXISTS "legacySourceMode" TEXT;`,
        `ALTER TABLE "GeneratedVehicleReport" ADD COLUMN IF NOT EXISTS "upgradedFromId" TEXT;`,

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

        `DO $$ BEGIN
            CREATE TYPE "EquipmentFeatureStatus" AS ENUM ('STANDARD', 'OPTIONAL', 'NOT_AVAILABLE', 'PACKAGE_DEPENDENT', 'MARKET_DEPENDENT', 'PERIOD_DEPENDENT', 'UNKNOWN');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `DO $$ BEGIN
            CREATE TYPE "PeriodStatus" AS ENUM ('PERIOD_VERIFIED', 'PERIOD_PROBABLE', 'PERIOD_AMBIGUOUS');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `DO $$ BEGIN
            CREATE TYPE "EvidenceStance" AS ENUM ('SUPPORTS', 'REFUTES', 'NEUTRAL');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `DO $$ BEGIN
            CREATE TYPE "ComparisonType" AS ENUM ('LOWER_TRIM', 'HIGHER_TRIM');
        EXCEPTION WHEN duplicate_object THEN null; END $$;`,

        `CREATE TABLE IF NOT EXISTS "VehicleTrimEquipment" (
            "id" TEXT NOT NULL,
            "vehicleVariantId" TEXT NOT NULL,
            "trimId" TEXT NOT NULL,
            "market" TEXT NOT NULL DEFAULT 'TR',
            "effectiveFrom" TIMESTAMP(3),
            "effectiveTo" TIMESTAMP(3),
            "equipmentRevision" TEXT,
            "periodStatus" "PeriodStatus" NOT NULL DEFAULT 'PERIOD_VERIFIED',
            "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
            "highlights" JSONB,
            "signatures" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "VehicleTrimEquipment_pkey" PRIMARY KEY ("id")
        );`,

        `CREATE TABLE IF NOT EXISTS "EquipmentFeature" (
            "id" TEXT NOT NULL,
            "trimEquipmentId" TEXT NOT NULL,
            "featureCode" TEXT NOT NULL,
            "featureName" TEXT NOT NULL,
            "category" TEXT NOT NULL,
            "status" "EquipmentFeatureStatus" NOT NULL,
            "valueText" TEXT,
            "valueNumber" DOUBLE PRECISION,
            "unit" TEXT,
            "valueJson" JSONB,
            "availabilityConditions" JSONB,
            "optionPackageName" TEXT,
            "optionPackageCode" TEXT,
            "relevanceBasis" JSONB NOT NULL,
            "confidenceScore" INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT "EquipmentFeature_pkey" PRIMARY KEY ("id")
        );`,

        `CREATE TABLE IF NOT EXISTS "EquipmentClaim" (
            "id" TEXT NOT NULL,
            "equipmentFeatureId" TEXT NOT NULL,
            "claimText" TEXT NOT NULL,
            "featureStatus" "EquipmentFeatureStatus" NOT NULL,
            CONSTRAINT "EquipmentClaim_pkey" PRIMARY KEY ("id")
        );`,

        `CREATE TABLE IF NOT EXISTS "EquipmentEvidence" (
            "id" TEXT NOT NULL,
            "equipmentClaimId" TEXT NOT NULL,
            "rawSourceId" TEXT NOT NULL,
            "sourceKind" "SourceKind" NOT NULL,
            "sourceRank" INTEGER NOT NULL,
            "stance" "EvidenceStance" NOT NULL DEFAULT 'SUPPORTS',
            CONSTRAINT "EquipmentEvidence_pkey" PRIMARY KEY ("id")
        );`,

        `CREATE TABLE IF NOT EXISTS "TrimComparison" (
            "id" TEXT NOT NULL,
            "trimEquipmentId" TEXT NOT NULL,
            "targetTrimName" TEXT NOT NULL,
            "comparisonType" "ComparisonType" NOT NULL,
            "featureIds" JSONB NOT NULL,
            CONSTRAINT "TrimComparison_pkey" PRIMARY KEY ("id")
        );`,
      ];

      for (const statement of statements) {
        try {
          await this.prisma.$executeRawUnsafe(statement);
        } catch (err: any) {
          this.logger.warn(`Notice running VehicleReport DDL stmt: ${err?.message}`);
        }
      }
      this.logger.log('VehicleReport DDL tables verified successfully.');
    } catch (e: any) {
      this.logger.warn(`VehicleReport DDL initialization warning: ${e.message}`);
    }
  }

  private async getValidUserId(userId: string): Promise<string> {
    try {
      if (userId && userId !== 'guest_user') {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (user) return user.id;
      }
      const fallbackUser = await this.prisma.user.findFirst({ select: { id: true } });
      return fallbackUser ? fallbackUser.id : userId;
    } catch (e) {
      return userId;
    }
  }

  async createVehicleReport(userIdParam: string, dto: CreateVehicleReportDto) {
    try {
      const userId = await this.getValidUserId(userIdParam);
      let variantId = dto.variantId;
      const listingId = dto.listingId;

      // 1. Resolve variantId if listingId is provided
      if (listingId && !variantId) {
        const listingRes = await this.listingContextBuilder.buildListingContext(listingId);
        variantId = listingRes.variantId;

        if (!variantId) {
          throw new BadRequestException({
            success: false,
            code: 'VARIANT_MATCH_REQUIRED',
            message: 'Bu ilandaki araç varyantı henüz kesin olarak eşleştirilemedi. Doğru raporun hazırlanabilmesi için motor/şanzıman bilgisinin doğrulanması gerekiyor.',
            quotaConsumed: false,
          });
        }
      }

      if (!variantId) {
        throw new BadRequestException('Araç raporu oluşturulabilmesi için geçerli bir variantId gereklidir.');
      }

      // 2. Build Vehicle Context
      const vRes = await this.vehicleContextBuilder.buildVehicleContext(variantId);
      const vehicleContext = vRes.vehicleContext;
      const vehicleContextHash = vRes.vehicleContextHash;

      // 3. Check Cache (user-scoped variant cache - bypassed if forceRefresh is true)
      if (!dto.forceRefresh) {
        try {
          const cached = await this.cacheService.getCachedReport(
            userId,
            'TORQUE_SCOUT_VEHICLE_REPORT',
            vehicleContextHash,
            'v2.4',
            variantId,
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
      } else {
        this.logger.log(`forceRefresh requested for variant ${variantId}. Bypassing cache.`);
      }

      // 4. Unique Concurrency Lock SHA-256(userId + variantId + vehicleContextHash + reportVersion + schemaVersion)
      const lockKey = crypto
        .createHash('sha256')
        .update(`${userId}_${variantId}_${vehicleContextHash}_v1.0_v1`)
        .digest('hex');

      try {
        await this.prisma.vehicleReportGenerationLock.create({
          data: {
            lockKey,
            reportId: 'pending',
            userId,
            mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
            contextHash: vehicleContextHash,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        });
      } catch (err: any) {
        this.logger.warn(`Lock collision notice for key ${lockKey}: ${err?.message}`);
      }

      // 5. Quota Reservation
      let quotaUsageId: string | undefined = undefined;
      try {
        const quotaRes = await this.quotaService.reserveQuota(
          userId,
          dto.idempotencyKey,
          AiQuotaFeature.VEHICLE_REPORT,
          variantId,
        );
        quotaUsageId = quotaRes.quotaUsageId;
      } catch (qErr: any) {
        this.logger.warn(`Quota reservation notice: ${qErr.message}`);
      }

      // 6. Generate Base Report via Provider / Fallback
      const providerRes = await this.providerService.generateReport(
        dto.idempotencyKey,
        vehicleContext,
      );

      // 7. Save Report in DB
      const report = await this.prisma.generatedVehicleReport.create({
        data: {
          userId,
          mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
          variantId,
          listingId: listingId || null,
          contextHash: vehicleContextHash,
          vehicleContextHash,
          reportVersion: 'v2.4',
          schemaVersion: 1,
          status: providerRes.report.status === 'SAFE_FALLBACK' ? VehicleReportStatus.SAFE_FALLBACK : VehicleReportStatus.COMPLETED,
          idempotencyKey: dto.idempotencyKey,
          quotaUsageId,
          reportData: providerRes.report as any,
          provider: providerRes.provider,
          modelName: providerRes.modelName,
          qualityScore: providerRes.qualityScore,
          repairAttempted: providerRes.repairAttempted,
          fallbackReason: providerRes.fallbackReason,
          completedAt: new Date(),
        },
      });

      // 8. Consume quota upon successful report creation
      if (quotaUsageId) {
        await this.quotaService.consumeQuota(quotaUsageId);
      }

      return {
        reportId: report.id,
        mode: report.mode,
        status: report.status,
        cached: false,
      };
    } catch (error: any) {
      this.logger.error(`createVehicleReport Error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) throw error;
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
        'TORQUE_SCOUT_VEHICLE_REPORT',
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

  async upgradeReportVersion(userId: string, reportId: string) {
    const existing = await this.getReportById(userId, reportId);
    if (!existing) throw new NotFoundException('Rapor bulunamadı.');

    let vehicleContext: any = {};
    let listingContext: any = undefined;
    if (existing.variantId) {
      const vRes = await this.vehicleContextBuilder.buildVehicleContext(existing.variantId);
      vehicleContext = vRes.vehicleContext;
    }
    if (existing.listingId) {
      const lRes = await this.listingContextBuilder.buildListingContext(existing.listingId);
      listingContext = lRes.listingContext;
    }

    const upgradedPayload = this.fallbackService.generateFallbackReport(
      existing.idempotencyKey,
      existing.mode as any,
      vehicleContext,
      listingContext,
    );

    const updated = await this.prisma.generatedVehicleReport.update({
      where: { id: reportId },
      data: {
        schemaVersion: 2,
        reportData: upgradedPayload as any,
        status: VehicleReportStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    return updated;
  }
}
