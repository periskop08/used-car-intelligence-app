import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleReportContextBuilderService } from './vehicle-report-context-builder.service';
import { ListingReportContextService } from './listing-report-context.service';
import { VehicleReportCacheService } from './vehicle-report-cache.service';
import { VehicleReportQuotaService } from './vehicle-report-quota.service';
import { CreateVehicleReportDto, RefreshVehicleReportDto } from './vehicle-report.dto';
import { VehicleReportMode, AiQuotaFeature, VehicleReportStatus, VehicleReportJobStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class VehicleReportService {
  private readonly logger = new Logger(VehicleReportService.name);

  constructor(
    private prisma: PrismaService,
    private vehicleContextBuilder: VehicleReportContextBuilderService,
    private listingContextBuilder: ListingReportContextService,
    private cacheService: VehicleReportCacheService,
    private quotaService: VehicleReportQuotaService,
  ) {}

  async createVehicleReport(userId: string, dto: CreateVehicleReportDto) {
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

    // 1. Check cache for user
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

    // 2. Concurrency Lock check
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
      // P2002 Unique Lock collision -> Fetch existing active report
      const existingActive = await this.prisma.generatedVehicleReport.findFirst({
        where: {
          userId,
          mode: dto.mode,
          contextHash: fullContextHash,
          status: { in: ['QUEUED', 'GENERATING'] },
        },
      });
      if (existingActive) {
        return {
          reportId: existingActive.id,
          mode: existingActive.mode,
          status: existingActive.status,
          cached: true,
        };
      }
    }

    // 3. Reserve Quota
    const feature = dto.mode === 'LISTING_REPORT' ? AiQuotaFeature.LISTING_REPORT : AiQuotaFeature.VEHICLE_REPORT;
    const quotaRes = await this.quotaService.reserveQuota(userId, dto.idempotencyKey, feature, listingId || variantId);

    // 4. Create GeneratedVehicleReport & VehicleReportResearchJob
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
        status: VehicleReportStatus.QUEUED,
        idempotencyKey: dto.idempotencyKey,
        quotaUsageId: quotaRes.quotaUsageId,
        reportData: {
          _vehicleContext: vehicleContext,
          _listingContext: listingContext,
        },
      },
    });

    await this.prisma.vehicleReportResearchJob.create({
      data: {
        reportId: report.id,
        userId,
        mode: dto.mode,
        contextHash: fullContextHash,
        status: VehicleReportJobStatus.QUEUED,
      },
    });

    return {
      reportId: report.id,
      mode: report.mode,
      status: report.status,
      cached: false,
    };
  }

  async getReportById(userId: string, reportId: string) {
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
  }

  async getCurrentVariantReport(userId: string, variantId: string) {
    const vRes = await this.vehicleContextBuilder.buildVehicleContext(variantId);
    return this.cacheService.getCachedReport(
      userId,
      'VEHICLE_REPORT',
      vRes.vehicleContextHash,
      'v1.0',
      variantId,
    );
  }

  async getCurrentListingReport(userId: string, listingId: string) {
    const lRes = await this.listingContextBuilder.buildListingContext(listingId);
    if (!lRes.variantId) return null;
    const vRes = await this.vehicleContextBuilder.buildVehicleContext(lRes.variantId);
    const fullHash = crypto
      .createHash('sha256')
      .update(`${vRes.vehicleContextHash}_${lRes.listingContextHash}`)
      .digest('hex');

    return this.cacheService.getCachedReport(
      userId,
      'LISTING_REPORT',
      fullHash,
      'v1.0',
      lRes.variantId,
      listingId,
    );
  }
}
