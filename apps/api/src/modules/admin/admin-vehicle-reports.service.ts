import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AdminAuditLogService } from './admin-audit-log.service';
import { VehicleReportContextBuilderService } from '../vehicle-report/vehicle-report-context-builder.service';
import { VehicleReportProviderService } from '../vehicle-report/vehicle-report-provider.service';
import { VehicleReportService } from '../vehicle-report/vehicle-report.service';
import { VehicleReportStatus } from '@prisma/client';
import { normalizeVehicleReportPayload } from '@used-car-intelligence/shared';
import {
  ListAdminVehicleReportsDto,
  SaveDraftVehicleReportDto,
  PublishVehicleReportDto,
  ResolveReportFeedbackDto,
} from './admin-vehicle-reports.dto';
import * as crypto from 'crypto';

@Injectable()
export class AdminVehicleReportsService {
  private readonly logger = new Logger(AdminVehicleReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AdminAuditLogService,
    private readonly contextBuilder: VehicleReportContextBuilderService,
    private readonly providerService: VehicleReportProviderService,
  ) {}

  /**
   * 1. LIST VEHICLE REPORTS (Summary projection, No heavy reportData, No N+1)
   */
  async listReports(dto: ListAdminVehicleReportsDto) {
    const page = Math.max(1, Number(dto.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(dto.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    const activeTab = dto.tab || 'active'; // Default to active published reports to prevent archive clutter

    if (activeTab === 'active') {
      where.isCurrentPublished = true;
      where.isDraft = false;
    } else if (activeTab === 'archived') {
      where.isCurrentPublished = false;
      where.isDraft = false;
    } else if (activeTab === 'drafts') {
      where.isDraft = true;
    } else if (activeTab === 'all') {
      if (dto.isDraft !== undefined) {
        where.isDraft = Boolean(dto.isDraft);
      }
    }

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.isEdited !== undefined) {
      if (Boolean(dto.isEdited)) {
        where.sourceType = 'ADMIN_EDIT';
      }
    }

    // Filter by Brand, Model, Year, or Search via Variant matching
    let matchingVariantIds: string[] | undefined = undefined;

    if (dto.brand || dto.model || dto.year || dto.search) {
      const variantWhere: any = {};

      if (dto.brand) {
        variantWhere.brand = { name: { contains: dto.brand.trim(), mode: 'insensitive' } };
      }
      if (dto.model) {
        variantWhere.model = { name: { contains: dto.model.trim(), mode: 'insensitive' } };
      }
      if (dto.year) {
        variantWhere.year = Number(dto.year);
      }

      if (dto.search) {
        const s = dto.search.trim();
        const searchNumber = parseInt(s, 10);
        const searchConditions: any[] = [
          { brand: { name: { contains: s, mode: 'insensitive' } } },
          { model: { name: { contains: s, mode: 'insensitive' } } },
          { trim: { name: { contains: s, mode: 'insensitive' } } },
          { engine: { code: { contains: s, mode: 'insensitive' } } },
        ];
        if (!isNaN(searchNumber) && searchNumber >= 1990 && searchNumber <= 2030) {
          searchConditions.push({ year: searchNumber });
        }
        variantWhere.OR = searchConditions;
      }

      const variants = await this.prisma.vehicleVariant.findMany({
        where: variantWhere,
        select: { id: true },
        take: 500,
      });

      matchingVariantIds = variants.map((v) => v.id);

      // Search by exact report ID if s matches
      if (dto.search && dto.search.trim().length > 5) {
        where.OR = [
          { id: { contains: dto.search.trim(), mode: 'insensitive' } },
          { variantId: { in: matchingVariantIds } },
        ];
      } else {
        where.variantId = { in: matchingVariantIds };
      }
    }

    // Count and find summary records + tab counts
    const [total, reports, activeCount, draftsCount, archivedCount] = await Promise.all([
      this.prisma.generatedVehicleReport.count({ where }),
      this.prisma.generatedVehicleReport.findMany({
        where,
        select: {
          id: true,
          mode: true,
          variantId: true,
          listingId: true,
          status: true,
          versionNumber: true,
          isCurrentPublished: true,
          isDraft: true,
          sourceType: true,
          changeNote: true,
          editedByAdminId: true,
          qualityScore: true,
          provider: true,
          modelName: true,
          likeCount: true,
          dislikeCount: true,
          generatedAt: true,
          completedAt: true,
          updatedAt: true,
        },
        orderBy: [{ isCurrentPublished: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.generatedVehicleReport.count({
        where: { isCurrentPublished: true, isDraft: false },
      }),
      this.prisma.generatedVehicleReport.count({
        where: { isDraft: true },
      }),
      this.prisma.generatedVehicleReport.count({
        where: { isCurrentPublished: false, isDraft: false },
      }),
    ]);

    // Batch resolve vehicle variants to prevent N+1
    const variantIds = Array.from(new Set(reports.map((r) => r.variantId).filter(Boolean))) as string[];
    const variants = variantIds.length > 0
      ? await this.prisma.vehicleVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            brand: true,
            model: true,
            trim: true,
            engine: true,
            transmission: true,
          },
        })
      : [];

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Batch resolve Feedback counts for variants and reports
    const reportIds = reports.map((r) => r.id);
    const feedbackCounts = await this.prisma.feedback.groupBy({
      by: ['referenceId'],
      where: {
        referenceId: { in: [...variantIds, ...reportIds] },
        status: { in: ['NEW', 'IN_REVIEW', 'ASSIGNED', 'WAITING_USER_INFO'] },
      },
      _count: { id: true },
    });

    const feedbackCountMap = new Map<string, number>();
    feedbackCounts.forEach((fc) => {
      if (fc.referenceId) {
        feedbackCountMap.set(fc.referenceId, fc._count.id);
      }
    });

    const items = reports.map((report) => {
      const variant = report.variantId ? variantMap.get(report.variantId) : null;
      const variantIssues = (report.variantId ? feedbackCountMap.get(report.variantId) : 0) || 0;
      const reportIssues = feedbackCountMap.get(report.id) || 0;
      const totalPendingIssues = variantIssues + reportIssues;

      return {
        id: report.id,
        mode: report.mode,
        variantId: report.variantId,
        listingId: report.listingId,
        status: report.status,
        versionNumber: report.versionNumber,
        isCurrentPublished: report.isCurrentPublished,
        isDraft: report.isDraft,
        sourceType: report.sourceType,
        changeNote: report.changeNote,
        editedByAdminId: report.editedByAdminId,
        qualityScore: report.qualityScore,
        provider: report.provider,
        modelName: report.modelName,
        generatedAt: report.generatedAt,
        completedAt: report.completedAt,
        updatedAt: report.updatedAt,
        likeCount: (report as any).likeCount || 0,
        dislikeCount: (report as any).dislikeCount || 0,
        pendingIssueCount: totalPendingIssues,
        vehicleIdentity: variant
          ? {
              brand: variant.brand?.name || '',
              model: variant.model?.name || '',
              year: variant.year,
              bodyType: variant.bodyType || '',
              trim: variant.trim?.name || '',
              engineCode: variant.engine?.code || '',
              displacementCc: variant.engine?.displacement,
              powerHp: variant.engine?.horsepower,
              transmission: variant.transmission?.name || '',
              fuelType: variant.engine?.fuelType || '',
            }
          : null,
      };
    });

    // If hasFeedback filter requested
    let finalItems = items;
    if (dto.hasFeedback !== undefined) {
      const wantsFeedback = Boolean(dto.hasFeedback);
      finalItems = items.filter((it) => (wantsFeedback ? it.pendingIssueCount > 0 : it.pendingIssueCount === 0));
    }

    return {
      reports: finalItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: {
        active: activeCount,
        drafts: draftsCount,
        archived: archivedCount,
        all: activeCount + draftsCount + archivedCount,
      },
    };
  }

  /**
   * 2. GET REPORT DETAIL (Full reportData, canonical specs, revisions list, feedbacks)
   */
  async getReportDetail(id: string) {
    const report = await this.prisma.generatedVehicleReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Rapor bulunamadı: ${id}`);
    }

    // Pass through normalizer to guarantee array and card shapes
    let normalizedData = report.reportData;
    if (normalizedData) {
      try {
        const norm = normalizeVehicleReportPayload(normalizedData);
        normalizedData = norm.data;
      } catch (err: any) {
        this.logger.warn(`Failed to normalize reportData for ${id}: ${err.message}`);
      }
    }

    // Fetch canonical vehicle variant & specs if variantId exists
    let variant: any = null;
    let canonicalSpecs: any = null;

    if (report.variantId) {
      variant = await this.prisma.vehicleVariant.findUnique({
        where: { id: report.variantId },
        include: {
          brand: true,
          model: true,
          trim: true,
          engine: true,
          transmission: true,
          specs: true,
        },
      });

      if (variant) {
        const specJson = (variant.specs?.specs as any) || {};
        canonicalSpecs = {
          powerHp: variant.engine?.horsepower || specJson?.powerHp,
          displacementCc: variant.engine?.displacement || specJson?.engineDisplacementCc,
          torqueNm: variant.engine?.torque || specJson?.torqueNm,
          fuelType: variant.engine?.fuelType,
          transmission: variant.transmission?.name,
          bodyType: variant.bodyType,
          topSpeedKmh: specJson?.topSpeedKmh,
          zeroToHundredSec: specJson?.zeroToHundredSec,
          combinedFuelL100km: specJson?.combinedFuelL100km,
          trunkCapacityLiters: specJson?.trunkCapacityLiters,
          curbWeightKg: specJson?.curbWeightKg,
        };
      }
    }

    // Fetch all revisions for this variant/report chain
    const revisions = report.variantId
      ? await this.prisma.generatedVehicleReport.findMany({
          where: { variantId: report.variantId },
          select: {
            id: true,
            versionNumber: true,
            isCurrentPublished: true,
            isDraft: true,
            sourceType: true,
            changeNote: true,
            status: true,
            completedAt: true,
            generatedAt: true,
            editedByAdminId: true,
          },
          orderBy: { versionNumber: 'desc' },
        })
      : [
          {
            id: report.id,
            versionNumber: report.versionNumber,
            isCurrentPublished: report.isCurrentPublished,
            isDraft: report.isDraft,
            sourceType: report.sourceType,
            changeNote: report.changeNote,
            status: report.status,
            completedAt: report.completedAt,
            generatedAt: report.generatedAt,
            editedByAdminId: report.editedByAdminId,
          },
        ];

    // Fetch associated user feedbacks
    const feedbackWhere: any = {
      OR: [
        { referenceId: id },
        ...(report.variantId ? [{ referenceId: report.variantId }] : []),
      ],
    };

    const feedbacks = await this.prisma.feedback.findMany({
      where: feedbackWhere,
      select: {
        id: true,
        ticketNo: true,
        userId: true,
        message: true,
        status: true,
        priority: true,
        subjectCategory: true,
        createdAt: true,
        resolvedAt: true,
        adminNote: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      report: {
        ...report,
        reportData: normalizedData,
      },
      variant,
      canonicalSpecs,
      revisions,
      feedbacks,
    };
  }

  /**
   * 3. GET REPORT REVISIONS LIST
   */
  async getReportRevisions(id: string) {
    const report = await this.prisma.generatedVehicleReport.findUnique({
      where: { id },
      select: { variantId: true },
    });

    if (!report || !report.variantId) {
      throw new NotFoundException(`Rapor veya varyant bulunamadı: ${id}`);
    }

    return this.prisma.generatedVehicleReport.findMany({
      where: { variantId: report.variantId },
      select: {
        id: true,
        versionNumber: true,
        isCurrentPublished: true,
        isDraft: true,
        sourceType: true,
        changeNote: true,
        status: true,
        completedAt: true,
        generatedAt: true,
        editedByAdminId: true,
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  /**
   * 4. SAVE DRAFT REVISION (Section-level WYSIWYG save, safe normalization, concurrency token)
   */
  async saveDraftRevision(
    reportId: string,
    adminUserId: string,
    adminEmail: string,
    dto: SaveDraftVehicleReportDto,
  ) {
    const baseReport = await this.prisma.generatedVehicleReport.findUnique({
      where: { id: reportId },
    });

    if (!baseReport) {
      throw new NotFoundException(`Rapor bulunamadı: ${reportId}`);
    }

    // Concurrency Check (Rule 51)
    if (dto.expectedVersion !== undefined && baseReport.versionNumber !== dto.expectedVersion) {
      throw new ConflictException(
        `Rapor başka bir oturumda güncellendi (Mevcut sürüm: v${baseReport.versionNumber}, Beklenen: v${dto.expectedVersion}). Lütfen sayfayı yenileyip tekrar deneyin.`,
      );
    }

    // Normalize and validate payload shape (Rule 14 & 59)
    const norm = normalizeVehicleReportPayload(dto.reportData);
    if (!norm.data) {
      throw new BadRequestException('Geçersiz rapor içeriği.');
    }

    // Determine next version number
    const maxVersionRecord = await this.prisma.generatedVehicleReport.findFirst({
      where: { variantId: baseReport.variantId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersion = (maxVersionRecord?.versionNumber || baseReport.versionNumber) + 1;

    // If the current record is already a draft created by an admin, update it in-place
    // Otherwise, create a new draft snapshot row (Rule 15 & 16)
    let draftRecord: any;

    if (baseReport.isDraft) {
      draftRecord = await this.prisma.generatedVehicleReport.update({
        where: { id: baseReport.id },
        data: {
          reportData: norm.data as any,
          changeNote: dto.changeNote || baseReport.changeNote,
          editedByAdminId: adminUserId,
          updatedAt: new Date(),
        },
      });
    } else {
      draftRecord = await this.prisma.generatedVehicleReport.create({
        data: {
          userId: baseReport.userId,
          mode: baseReport.mode,
          variantId: baseReport.variantId,
          listingId: baseReport.listingId,
          contextHash: baseReport.contextHash,
          vehicleContextHash: baseReport.vehicleContextHash,
          reportVersion: baseReport.reportVersion,
          schemaVersion: 2,
          status: VehicleReportStatus.COMPLETED,
          idempotencyKey: `admin_draft_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          reportData: norm.data as any,
          provider: 'ADMIN_EDITOR',
          modelName: 'MANUAL_EDIT',
          qualityScore: 100,
          versionNumber: nextVersion,
          isCurrentPublished: false,
          isDraft: true,
          sourceType: 'ADMIN_EDIT',
          changeNote: dto.changeNote,
          editedByAdminId: adminUserId,
          generatedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    // Log action to Audit Log (Rule 60)
    await this.auditLogService.logAction({
      adminUserId,
      adminEmail,
      action: 'VEHICLE_REPORT_DRAFT_SAVE',
      entityType: 'GeneratedVehicleReport',
      entityId: draftRecord.id,
      changedFields: ['reportData', 'changeNote', 'isDraft'],
      afterState: { versionNumber: draftRecord.versionNumber, changeNote: draftRecord.changeNote },
    }).catch((e) => this.logger.warn(`Audit log warning: ${e.message}`));

    return draftRecord;
  }

  /**
   * 5. PUBLISH REVISION (Atomic transaction, exactly 1 published record per variant, cache invalidation)
   */
  async publishRevision(
    reportId: string,
    revisionId: string,
    adminUserId: string,
    adminEmail: string,
    dto: PublishVehicleReportDto,
  ) {
    const targetRevision = await this.prisma.generatedVehicleReport.findUnique({
      where: { id: revisionId },
    });

    if (!targetRevision) {
      throw new NotFoundException(`Yayınlanacak revizyon bulunamadı: ${revisionId}`);
    }

    // Atomic publish transaction (Rule 19, 21)
    const published = await this.prisma.$transaction(async (tx) => {
      // 1. Unpublish any currently published report for this variant
      if (targetRevision.variantId) {
        await tx.generatedVehicleReport.updateMany({
          where: { variantId: targetRevision.variantId, isCurrentPublished: true },
          data: { isCurrentPublished: false },
        });
      }

      // 2. Publish target revision
      return tx.generatedVehicleReport.update({
        where: { id: revisionId },
        data: {
          isCurrentPublished: true,
          isDraft: false,
          completedAt: new Date(),
          changeNote: dto.changeNote || targetRevision.changeNote,
          editedByAdminId: adminUserId,
        },
      });
    });

    // Sync ephemeral memory and server-side cache (Rule 33)
    VehicleReportService.ephemeralReports.set(published.id, {
      report: published,
      createdAt: Date.now(),
    });

    // Also update any ephemeral entries with matching variantId
    for (const [key, val] of VehicleReportService.ephemeralReports.entries()) {
      if (val.report.variantId === published.variantId && val.report.id !== published.id) {
        val.report.isCurrentPublished = false;
      }
    }

    // Log action to Audit Log (Rule 60)
    await this.auditLogService.logAction({
      adminUserId,
      adminEmail,
      action: 'VEHICLE_REPORT_PUBLISH',
      entityType: 'GeneratedVehicleReport',
      entityId: published.id,
      changedFields: ['isCurrentPublished', 'isDraft', 'changeNote', 'completedAt'],
      afterState: {
        versionNumber: published.versionNumber,
        isCurrentPublished: true,
        changeNote: published.changeNote,
      },
    }).catch((e) => this.logger.warn(`Audit log warning: ${e.message}`));

    return published;
  }

  /**
   * 6. RESTORE REVISION AS NEW DRAFT (Rule 23: History remains immutable, creates new draft)
   */
  async restoreRevision(
    reportId: string,
    sourceRevisionId: string,
    adminUserId: string,
    adminEmail: string,
  ) {
    const sourceRevision = await this.prisma.generatedVehicleReport.findUnique({
      where: { id: sourceRevisionId },
    });

    if (!sourceRevision) {
      throw new NotFoundException(`Geri yüklenecek revizyon bulunamadı: ${sourceRevisionId}`);
    }

    // Determine next version number
    const maxVersionRecord = await this.prisma.generatedVehicleReport.findFirst({
      where: { variantId: sourceRevision.variantId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersion = (maxVersionRecord?.versionNumber || sourceRevision.versionNumber) + 1;

    // Create a new DRAFT cloned from sourceRevision (History stays untouched)
    const newDraft = await this.prisma.generatedVehicleReport.create({
      data: {
        userId: sourceRevision.userId,
        mode: sourceRevision.mode,
        variantId: sourceRevision.variantId,
        listingId: sourceRevision.listingId,
        contextHash: sourceRevision.contextHash,
        vehicleContextHash: sourceRevision.vehicleContextHash,
        reportVersion: sourceRevision.reportVersion,
        schemaVersion: sourceRevision.schemaVersion,
        status: VehicleReportStatus.COMPLETED,
        idempotencyKey: `admin_restore_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        reportData: sourceRevision.reportData as any,
        provider: 'ADMIN_EDITOR',
        modelName: `RESTORED_FROM_V${sourceRevision.versionNumber}`,
        qualityScore: sourceRevision.qualityScore,
        versionNumber: nextVersion,
        isCurrentPublished: false,
        isDraft: true,
        sourceType: 'RESTORED_DRAFT',
        changeNote: `v${sourceRevision.versionNumber} versiyonundan yeni taslak olarak geri yüklendi.`,
        editedByAdminId: adminUserId,
        generatedAt: new Date(),
        completedAt: new Date(),
      },
    });

    await this.auditLogService.logAction({
      adminUserId,
      adminEmail,
      action: 'VEHICLE_REPORT_RESTORE_DRAFT',
      entityType: 'GeneratedVehicleReport',
      entityId: newDraft.id,
      changedFields: ['versionNumber', 'sourceType', 'changeNote'],
      afterState: { restoredFromVersion: sourceRevision.versionNumber, newVersion: newDraft.versionNumber },
    }).catch((e) => this.logger.warn(`Audit log warning: ${e.message}`));

    return newDraft;
  }

  /**
   * 7. RESEARCH REFRESH (Reuses existing research pipeline, creates DRAFT revision, NO auto-publish - Rules 25, 26, 27, 28)
   */
  async triggerResearchRefresh(reportId: string, adminUserId: string, adminEmail: string) {
    const baseReport = await this.prisma.generatedVehicleReport.findUnique({
      where: { id: reportId },
    });

    if (!baseReport || !baseReport.variantId) {
      throw new NotFoundException(`Rapor veya varyant bulunamadı: ${reportId}`);
    }

    // 1. Build Exact Vehicle Context via existing context builder (Rule 25 & 26)
    const vRes = await this.contextBuilder.buildVehicleContext(baseReport.variantId);
    const vehicleContext = vRes.vehicleContext;
    const vehicleContextHash = vRes.vehicleContextHash;

    const idempotencyKey = `admin_refresh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 2. Generate Base Report via Provider
    const providerRes = await this.providerService.generateReport(
      idempotencyKey,
      vehicleContext,
    );

    // 3. Determine next version number
    const maxVersionRecord = await this.prisma.generatedVehicleReport.findFirst({
      where: { variantId: baseReport.variantId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersion = (maxVersionRecord?.versionNumber || baseReport.versionNumber) + 1;

    // 4. Create new DRAFT revision (Current published report is NOT modified! Rule 27 & 28)
    const reportStatus = providerRes.report.status === 'SAFE_FALLBACK'
      ? VehicleReportStatus.SAFE_FALLBACK
      : VehicleReportStatus.COMPLETED;

    const newDraft = await this.prisma.generatedVehicleReport.create({
      data: {
        userId: baseReport.userId,
        mode: 'TORQUE_SCOUT_VEHICLE_REPORT',
        variantId: baseReport.variantId,
        listingId: baseReport.listingId,
        contextHash: vehicleContextHash,
        vehicleContextHash,
        reportVersion: baseReport.reportVersion,
        schemaVersion: 2,
        status: reportStatus,
        idempotencyKey,
        reportData: providerRes.report as any,
        provider: providerRes.provider,
        modelName: providerRes.modelName,
        qualityScore: providerRes.qualityScore,
        repairAttempted: providerRes.repairAttempted,
        fallbackReason: providerRes.fallbackReason,
        versionNumber: nextVersion,
        isCurrentPublished: false,
        isDraft: true,
        sourceType: 'RESEARCH_REFRESH',
        changeNote: 'Yeniden araştırma (Research Refresh) taslağı.',
        editedByAdminId: adminUserId,
        generatedAt: new Date(),
        completedAt: new Date(),
      },
    });

    await this.auditLogService.logAction({
      adminUserId,
      adminEmail,
      action: 'VEHICLE_REPORT_RESEARCH_REFRESH',
      entityType: 'GeneratedVehicleReport',
      entityId: newDraft.id,
      changedFields: ['versionNumber', 'sourceType', 'isDraft'],
      afterState: { newVersion: newDraft.versionNumber, status: reportStatus },
    }).catch((e) => this.logger.warn(`Audit log warning: ${e.message}`));

    return {
      success: true,
      draftReportId: newDraft.id,
      versionNumber: newDraft.versionNumber,
      message: 'Yeniden araştırma başarıyla tamamlandı ve yeni taslak olarak kaydedildi. İnceleyip yayınlayabilirsiniz.',
    };
  }

  /**
   * 8. RESOLVE USER FEEDBACK (Rule 40)
   */
  async resolveFeedback(
    feedbackId: string,
    adminUserId: string,
    adminEmail: string,
    dto: ResolveReportFeedbackDto,
  ) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new NotFoundException(`Bildirim bulunamadı: ${feedbackId}`);
    }

    const updated = await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        adminNote: dto.resolutionNote || feedback.adminNote || 'Rapor incelendi ve gerekli düzenlemeler yapıldı.',
        assignedAdminId: adminUserId,
      },
    });

    await this.auditLogService.logAction({
      adminUserId,
      adminEmail,
      action: 'VEHICLE_REPORT_FEEDBACK_RESOLVE',
      entityType: 'Feedback',
      entityId: feedbackId,
      changedFields: ['status', 'resolvedAt', 'adminNote'],
      afterState: { status: 'RESOLVED' },
    }).catch((e) => this.logger.warn(`Audit log warning: ${e.message}`));

    return updated;
  }

  /**
   * 9. DELETE VEHICLE REPORT
   */
  async deleteReport(id: string, adminUserId: string, adminEmail: string) {
    const report = await this.prisma.generatedVehicleReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Silinecek rapor bulunamadı: ${id}`);
    }

    const variantId = report.variantId;
    const wasCurrent = report.isCurrentPublished;

    // Delete associated votes, jobs, and the report record
    await this.prisma.vehicleReportVote.deleteMany({ where: { reportId: id } });
    await this.prisma.vehicleReportResearchJob.deleteMany({ where: { reportId: id } });
    await this.prisma.generatedVehicleReport.delete({ where: { id } });

    // If deleted report was the current published one, promote previous completed version if one exists
    if (wasCurrent && variantId) {
      const latestPrevious = await this.prisma.generatedVehicleReport.findFirst({
        where: { variantId, isDraft: false, status: 'COMPLETED' },
        orderBy: { versionNumber: 'desc' },
      });
      if (latestPrevious) {
        await this.prisma.generatedVehicleReport.update({
          where: { id: latestPrevious.id },
          data: { isCurrentPublished: true },
        });
      }
    }

    // Clear from ephemeral cache
    VehicleReportService.ephemeralReports.delete(id);

    // Audit log
    await this.auditLogService.logAction({
      adminUserId,
      adminEmail,
      action: 'VEHICLE_REPORT_DELETE',
      entityType: 'GeneratedVehicleReport',
      entityId: id,
      changedFields: ['deleted'],
      afterState: { variantId, wasCurrent, versionNumber: report.versionNumber },
    }).catch(() => {});

    return { success: true, message: 'Rapor başarıyla silindi.' };
  }
}
