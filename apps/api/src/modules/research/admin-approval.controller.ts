import { Controller, Post, Get, Param, Body, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AiReportGeneratorService } from './ai-report-generator.service';
import { ApprovalStatus, SourceType, SourceKind } from '@prisma/client';
import { createHash } from 'crypto';

@Controller('admin-approvals')
export class AdminApprovalController {
  private readonly logger = new Logger(AdminApprovalController.name);

  constructor(
    private prisma: PrismaService,
    private reportGenerator: AiReportGeneratorService,
  ) {}

  @Get('pending')
  async getPendingApprovals() {
    const problems = await this.prisma.commonProblem.findMany({
      where: { status: ApprovalStatus.PENDING },
      include: { variant: { include: { brand: true, model: true } } },
    });
    const recalls = await this.prisma.recall.findMany({
      where: { status: ApprovalStatus.PENDING },
      include: { variant: { include: { brand: true, model: true } } },
    });
    const questions = await this.prisma.sellerQuestion.findMany({
      where: { status: ApprovalStatus.PENDING },
      include: { variant: { include: { brand: true, model: true } } },
    });
    const checklists = await this.prisma.inspectionChecklistItem.findMany({
      where: { status: ApprovalStatus.PENDING },
      include: { variant: { include: { brand: true, model: true } } },
    });
    const rawSources = await this.prisma.rawSource.findMany({
      where: { status: ApprovalStatus.PENDING },
      include: { variant: { include: { brand: true, model: true } } },
    });

    return {
      problems,
      recalls,
      questions,
      checklists,
      rawSources,
    };
  }

  @Get('raw-sources')
  async listRawSources() {
    return this.prisma.rawSource.findMany({
      include: { variant: { include: { brand: true, model: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('audit-logs')
  async listAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('raw-sources')
  async createRawSource(@Body() body: any) {
    const hash = createHash('sha256')
      .update(body.url + Date.now().toString() + Math.random().toString())
      .digest('hex');

    return this.prisma.rawSource.create({
      data: {
        sourceType: SourceType.MANUAL,
        url: body.url,
        title: body.title || 'Manuel Eklenen Kaynak',
        contentHash: hash,
        extractedText: body.rawText || '',
        rawText: body.rawText || '',
        extractedSummary: body.rawText || '',
        languageCode: body.languageCode || 'tr',
        countryCode: body.countryCode || 'TR',
        confidenceScore: 1.0,
        sourceKind: body.sourceKind || SourceKind.UNKNOWN,
        vehicleVariantId: body.vehicleVariantId || null,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  @Post(':entityType/:id')
  async approveOrReject(
    @Param('entityType') entityType: string,
    @Param('id') id: string,
    @Body() body: { status: ApprovalStatus; rejectedReason?: string; adminUserId: string },
  ) {
    const { status, rejectedReason, adminUserId } = body;
    if (!status) {
      throw new BadRequestException('Status is required.');
    }

    switch (entityType) {
      case 'raw-source':
        return this.handleRawSource(id, status, rejectedReason, adminUserId);
      case 'common-problem':
        return this.handleCommonProblem(id, status, rejectedReason, adminUserId);
      case 'recall':
        return this.handleRecall(id, status, rejectedReason, adminUserId);
      case 'seller-question':
        return this.handleSellerQuestion(id, status, rejectedReason, adminUserId);
      case 'inspection-checklist':
        return this.handleInspectionChecklist(id, status, rejectedReason, adminUserId);
      case 'ai-report':
        return this.handleAiReport(id, status, rejectedReason, adminUserId);
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }

  private async handleRawSource(id: string, newStatus: ApprovalStatus, reason?: string, adminUserId?: string) {
    const rawSource = await this.prisma.rawSource.findUnique({ where: { id } });
    if (!rawSource) throw new NotFoundException('RawSource not found.');

    const oldStatus = rawSource.status;

    // RAW -> PENDING -> APPROVED / REJECTED / ARCHIVED
    // RAW -> ARCHIVED
    const allowed =
      (oldStatus === ApprovalStatus.RAW && ([ApprovalStatus.PENDING, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.PENDING &&
        ([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus));

    if (!allowed) {
      throw new BadRequestException(`Invalid RawSource status transition: ${oldStatus} -> ${newStatus}`);
    }

    const updated = await this.prisma.rawSource.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.logAudit(adminUserId || 'system', 'RAW_SOURCE_STATUS_CHANGE', { id, oldStatus, newStatus, reason });
    return updated;
  }

  private async handleCommonProblem(id: string, newStatus: ApprovalStatus, reason?: string, adminUserId?: string) {
    const problem = await this.prisma.commonProblem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('CommonProblem not found.');

    const oldStatus = problem.status;

    // PENDING -> APPROVED / REJECTED / ARCHIVED
    // APPROVED -> STALE / ARCHIVED
    // STALE -> PENDING / APPROVED / ARCHIVED
    const allowed =
      (oldStatus === ApprovalStatus.PENDING &&
        ([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.APPROVED && ([ApprovalStatus.STALE, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.STALE &&
        ([ApprovalStatus.PENDING, ApprovalStatus.APPROVED, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus));

    if (!allowed) {
      throw new BadRequestException(`Invalid CommonProblem status transition: ${oldStatus} -> ${newStatus}`);
    }

    const updated = await this.prisma.commonProblem.update({
      where: { id },
      data: {
        status: newStatus,
        rejectedReason: newStatus === ApprovalStatus.REJECTED ? reason : null,
        approvedAt: newStatus === ApprovalStatus.APPROVED ? new Date() : null,
      },
    });

    // Mark AI report as STALE because approved data has changed!
    await this.reportGenerator.markReportStale(problem.variantId);

    await this.logAudit(adminUserId || 'system', 'COMMON_PROBLEM_STATUS_CHANGE', { id, oldStatus, newStatus, reason });
    return updated;
  }

  private async handleRecall(id: string, newStatus: ApprovalStatus, reason?: string, adminUserId?: string) {
    const recall = await this.prisma.recall.findUnique({ where: { id } });
    if (!recall) throw new NotFoundException('Recall not found.');

    const oldStatus = recall.status;

    // PENDING -> APPROVED / REJECTED / ARCHIVED
    // APPROVED -> STALE / ARCHIVED
    const allowed =
      (oldStatus === ApprovalStatus.PENDING &&
        ([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.APPROVED && ([ApprovalStatus.STALE, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus));

    if (!allowed) {
      throw new BadRequestException(`Invalid Recall status transition: ${oldStatus} -> ${newStatus}`);
    }

    const updated = await this.prisma.recall.update({
      where: { id },
      data: {
        status: newStatus,
        rejectedReason: newStatus === ApprovalStatus.REJECTED ? reason : null,
        approvedAt: newStatus === ApprovalStatus.APPROVED ? new Date() : null,
      },
    });

    // Mark AI report as STALE
    await this.reportGenerator.markReportStale(recall.variantId);

    await this.logAudit(adminUserId || 'system', 'RECALL_STATUS_CHANGE', { id, oldStatus, newStatus, reason });
    return updated;
  }

  private async handleSellerQuestion(id: string, newStatus: ApprovalStatus, reason?: string, adminUserId?: string) {
    const question = await this.prisma.sellerQuestion.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('SellerQuestion not found.');

    const oldStatus = question.status;

    // PENDING -> APPROVED / REJECTED / ARCHIVED
    // APPROVED -> ARCHIVED
    const allowed =
      (oldStatus === ApprovalStatus.PENDING &&
        ([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.APPROVED && newStatus === ApprovalStatus.ARCHIVED);

    if (!allowed) {
      throw new BadRequestException(`Invalid SellerQuestion status transition: ${oldStatus} -> ${newStatus}`);
    }

    const updated = await this.prisma.sellerQuestion.update({
      where: { id },
      data: {
        status: newStatus,
        rejectedReason: newStatus === ApprovalStatus.REJECTED ? reason : null,
        approvedAt: newStatus === ApprovalStatus.APPROVED ? new Date() : null,
      },
    });

    // Note: SellerQuestions do not affect DataCoverage or coverageScore, but we still mark stale to refresh checklist/questions
    await this.reportGenerator.markReportStale(question.variantId);

    await this.logAudit(adminUserId || 'system', 'SELLER_QUESTION_STATUS_CHANGE', { id, oldStatus, newStatus, reason });
    return updated;
  }

  private async handleInspectionChecklist(id: string, newStatus: ApprovalStatus, reason?: string, adminUserId?: string) {
    const item = await this.prisma.inspectionChecklistItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('InspectionChecklistItem not found.');

    const oldStatus = item.status;

    // PENDING -> APPROVED / REJECTED / ARCHIVED
    // APPROVED -> ARCHIVED
    const allowed =
      (oldStatus === ApprovalStatus.PENDING &&
        ([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.APPROVED && newStatus === ApprovalStatus.ARCHIVED);

    if (!allowed) {
      throw new BadRequestException(`Invalid InspectionChecklistItem status transition: ${oldStatus} -> ${newStatus}`);
    }

    const updated = await this.prisma.inspectionChecklistItem.update({
      where: { id },
      data: {
        status: newStatus,
        rejectedReason: newStatus === ApprovalStatus.REJECTED ? reason : null,
        approvedAt: newStatus === ApprovalStatus.APPROVED ? new Date() : null,
      },
    });

    // Mark AI report as STALE
    await this.reportGenerator.markReportStale(item.variantId);

    await this.logAudit(adminUserId || 'system', 'CHECKLIST_ITEM_STATUS_CHANGE', { id, oldStatus, newStatus, reason });
    return updated;
  }

  private async handleAiReport(id: string, newStatus: ApprovalStatus, reason?: string, adminUserId?: string) {
    const report = await this.prisma.aiVehicleReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('AiVehicleReport not found.');

    const oldStatus = report.status;

    // APPROVED -> STALE / ARCHIVED
    // STALE -> APPROVED / ARCHIVED
    // PENDING -> APPROVED / REJECTED
    const allowed =
      (oldStatus === ApprovalStatus.APPROVED && ([ApprovalStatus.STALE, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.STALE && ([ApprovalStatus.APPROVED, ApprovalStatus.ARCHIVED] as any[]).includes(newStatus)) ||
      (oldStatus === ApprovalStatus.PENDING && ([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] as any[]).includes(newStatus));

    if (!allowed) {
      throw new BadRequestException(`Invalid AiVehicleReport status transition: ${oldStatus} -> ${newStatus}`);
    }

    const updated = await this.prisma.aiVehicleReport.update({
      where: { id },
      data: { status: newStatus, approvedAt: newStatus === ApprovalStatus.APPROVED ? new Date() : null },
    });

    await this.logAudit(adminUserId || 'system', 'AI_REPORT_STATUS_CHANGE', { id, oldStatus, newStatus, reason });
    return updated;
  }

  @Get('vehicles/:variantId')
  async getAdminVehicleDetail(@Param('variantId') variantId: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        problems: { include: { translations: true } },
        recalls: true,
        questions: { include: { translations: true } },
        checklists: { include: { translations: true } },
        aiReports: true,
      },
    });

    if (!variant) throw new NotFoundException('Vehicle variant not found.');
    return variant;
  }

  private async logAudit(userId: string, action: string, details: any) {
    try {
      // Find a valid admin/system user to link to AuditLog
      const firstUser = await this.prisma.user.findFirst({
        where: { id: userId },
      });

      if (firstUser) {
        await this.prisma.auditLog.create({
          data: {
            userId: firstUser.id,
            action,
            details,
          },
        });
      }
    } catch (err) {
      this.logger.error(`Failed to log audit event: ${err.message}`);
    }
  }
}
