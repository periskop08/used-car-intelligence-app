import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { R2Service } from '../listing/r2.service';
import { FeedbackSource, FeedbackCategory, FeedbackStatus, FeedbackPriority } from '@prisma/client';

export interface AuditTimelineEntry {
  timestamp: string;
  actorId?: string;
  actorName: string;
  action: string;
  note?: string;
}

@Injectable()
export class FeedbackService implements OnModuleInit {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

  async onModuleInit() {
    // Safe idempotent table & enum migration for Neon Postgres
    const statements = [
      `DO $$ BEGIN
          CREATE TYPE "FeedbackSource" AS ENUM (
            'CLUB', 'LISTING_DETAIL', 'LISTING_MODERATION', 'VEHICLE_SEARCH', 'VEHICLE_COMPARISON',
            'LISTING_AI_ADVISOR', 'CHATBOT', 'PAYMENT', 'MESSAGING', 'ACCOUNT', 'TECHNICAL_SUPPORT', 'OTHER'
          );
      EXCEPTION WHEN duplicate_object THEN null; END $$;`,

      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'CLUB_MUTE_APPEAL';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'CLUB_BAN_APPEAL';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'COMMENT_MODERATION';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'LISTING_REJECT_APPEAL';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'LISTING_TECHNICAL';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'AI_RESPONSE_COMPLAINT';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'PAYMENT_PACKAGE';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'ACCOUNT_ACCESS';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'MESSAGING_ISSUE';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'GENERAL_TECHNICAL';`,
      `ALTER TYPE "FeedbackCategory" ADD VALUE IF NOT EXISTS 'SUGGESTION';`,

      `ALTER TYPE "FeedbackStatus" ADD VALUE IF NOT EXISTS 'WAITING_USER_INFO';`,
      `ALTER TYPE "FeedbackStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';`,
      `ALTER TYPE "FeedbackStatus" ADD VALUE IF NOT EXISTS 'ACTION_TAKEN';`,

      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "ticketNo" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "source" "FeedbackSource" DEFAULT 'OTHER';`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "referenceType" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "assignedAdminId" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "assignedAdminName" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "internalNote" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "userResponse" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "userResponseSentAt" TIMESTAMP(3);`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "userResponseSentBy" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "userResponseChannel" TEXT;`,
      `ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "auditTimeline" JSONB;`,
    ];

    for (const stmt of statements) {
      try {
        await this.prisma.$executeRawUnsafe(stmt);
      } catch (e: any) {
        this.logger.debug(`Feedback schema migration note: ${e?.message || e}`);
      }
    }
  }

  private sanitizeMessage(msg: string): string {
    if (!msg) return '';
    return msg
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();
  }

  private determinePriority(category: FeedbackCategory): FeedbackPriority {
    switch (category) {
      case FeedbackCategory.SECURITY_SUSPICIOUS_ACTIVITY:
      case FeedbackCategory.CLUB_MUTE_APPEAL:
      case FeedbackCategory.CLUB_BAN_APPEAL:
      case FeedbackCategory.ACCOUNT_ACCESS:
      case FeedbackCategory.BUG_REPORT:
        return FeedbackPriority.HIGH;
      default:
        return FeedbackPriority.NORMAL;
    }
  }

  private generateTicketNo(): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `FB-${yearMonth}-${randomNum}`;
  }

  async createFeedback(
    userId: string,
    category: FeedbackCategory,
    message: string,
    source?: FeedbackSource,
    referenceType?: string,
    referenceId?: string,
    file?: Express.Multer.File,
  ) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCount = await this.prisma.feedback.count({
      where: { userId, createdAt: { gte: fiveMinutesAgo } },
    });

    if (recentCount >= 3) {
      throw new BadRequestException('Çok fazla geri bildirim gönderdiniz. Lütfen 5 dakika sonra tekrar deneyin.');
    }

    const sanitizedMessage = this.sanitizeMessage(message);
    if (!sanitizedMessage || sanitizedMessage.length < 5) {
      throw new BadRequestException('Mesaj en az 5 karakter olmalıdır.');
    }

    let attachmentUrl: string | null = null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Ekran görüntüsü boyutu en fazla 5MB olabilir.');
      }
      try {
        const uploadResult = await this.r2Service.uploadImage(file.buffer, 'feedbacks');
        attachmentUrl = uploadResult.url;
      } catch (err) {
        throw new BadRequestException('Görsel yüklenemedi.');
      }
    }

    const ticketNo = this.generateTicketNo();
    const priority = this.determinePriority(category);
    const effectiveSource = source || FeedbackSource.OTHER;

    const initialTimeline: AuditTimelineEntry[] = [
      {
        timestamp: new Date().toISOString(),
        actorName: 'Kullanıcı',
        action: 'Geri bildirim oluşturuldu',
        note: `Talep No: ${ticketNo}`,
      },
    ];

    return this.prisma.feedback.create({
      data: {
        ticketNo,
        userId,
        source: effectiveSource,
        subjectCategory: category,
        referenceType,
        referenceId,
        message: sanitizedMessage,
        priority,
        status: FeedbackStatus.NEW,
        attachmentUrl,
        auditTimeline: initialTimeline as any,
      },
    });
  }

  async getAdminFeedbacks(
    source?: FeedbackSource,
    category?: FeedbackCategory,
    status?: FeedbackStatus,
    priority?: FeedbackPriority,
    search?: string,
    assignedAdminId?: string,
  ) {
    const whereClause: any = {};

    if (source) whereClause.source = source;
    if (category) whereClause.subjectCategory = category;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assignedAdminId) whereClause.assignedAdminId = assignedAdminId;

    if (search) {
      whereClause.OR = [
        { ticketNo: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const feedbacks = await this.prisma.feedback.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            subscriptionTier: true,
            createdAt: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    // Enrich each feedback with real-time live DB restriction data & formatted customer identity
    const enriched = await Promise.all(
      feedbacks.map(async (fb) => {
        const user = fb.user;
        let formattedCustomerIdentity = 'Misafir Kullanıcı';
        let formattedName = 'Misafir Kullanıcı';

        if (user) {
          const yearMonth = `${user.createdAt.getFullYear().toString().slice(-2)}${(user.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
          const shortId = user.id.slice(0, 6).toUpperCase();
          const customerNo = `TS-${yearMonth}-${shortId}`;

          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          formattedName = fullName || user.username || user.email.split('@')[0];
          formattedCustomerIdentity = `${customerNo} — ${formattedName}`;
        }

        // Live DB Restriction Lookup for the User
        let liveRestrictionStatus: any = null;
        if (user?.id) {
          const restrictions = await this.prisma.clubRestriction.findMany({
            where: { userId: user.id },
            include: {
              createdBy: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          });

          if (restrictions && restrictions.length > 0) {
            const activeOrRecent = restrictions[0]; // Most recent
            const isRevoked = !!activeOrRecent.revokedAt;
            const isExpired = activeOrRecent.expiresAt ? activeOrRecent.expiresAt < now : false;
            const isActive = !isRevoked && !isExpired;

            let remainingText = 'Süresiz';
            if (activeOrRecent.expiresAt && isActive) {
              const diffMs = activeOrRecent.expiresAt.getTime() - now.getTime();
              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              remainingText = `${days} gün ${hours} saat kaldı`;
            }

            const creatorName = activeOrRecent.createdBy
              ? `${activeOrRecent.createdBy.firstName || ''} ${activeOrRecent.createdBy.lastName || ''}`.trim() || activeOrRecent.createdBy.email
              : activeOrRecent.createdById;

            liveRestrictionStatus = {
              id: activeOrRecent.id,
              type: activeOrRecent.type,
              isActive,
              isRevoked,
              isExpired,
              displayStatus: isRevoked ? 'Kaldırıldı' : isExpired ? 'Süresi Doldu' : 'Aktif',
              startsAt: activeOrRecent.startsAt.toISOString(),
              expiresAt: activeOrRecent.expiresAt?.toISOString() || null,
              remainingText,
              reason: activeOrRecent.reason,
              createdBy: creatorName,
              revokedAt: activeOrRecent.revokedAt?.toISOString() || null,
              revokedById: activeOrRecent.revokedById || null,
            };
          }
        }

        return {
          ...fb,
          ticketNo: fb.ticketNo || `FB-${fb.id.slice(0, 8).toUpperCase()}`,
          formattedCustomerIdentity,
          formattedName,
          liveRestrictionStatus,
        };
      }),
    );

    return enriched;
  }

  async updateFeedback(
    feedbackId: string,
    adminUser: { id: string; name: string },
    dto: {
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      source?: FeedbackSource;
      subjectCategory?: FeedbackCategory;
      assignedAdminId?: string;
      assignedAdminName?: string;
      internalNote?: string;
    },
  ) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Geri bildirim bulunamadı.');

    const timeline: AuditTimelineEntry[] = (feedback.auditTimeline as any) || [];

    if (dto.status && dto.status !== feedback.status) {
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: `Durum güncellendi: ${dto.status}`,
      });
    }

    if (dto.assignedAdminId && dto.assignedAdminId !== feedback.assignedAdminId) {
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: `Atandı: ${dto.assignedAdminName || dto.assignedAdminId}`,
      });
    }

    if (dto.internalNote && dto.internalNote !== feedback.internalNote) {
      timeline.push({
        timestamp: new Date().toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: 'İç Not Eklendi',
        note: dto.internalNote.slice(0, 100),
      });
    }

    return this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: dto.status || feedback.status,
        priority: dto.priority || feedback.priority,
        source: dto.source || feedback.source,
        subjectCategory: dto.subjectCategory || feedback.subjectCategory,
        assignedAdminId: dto.assignedAdminId ?? feedback.assignedAdminId,
        assignedAdminName: dto.assignedAdminName ?? feedback.assignedAdminName,
        internalNote: dto.internalNote ?? feedback.internalNote,
        auditTimeline: timeline as any,
      },
      include: { user: true, assignedAdmin: true },
    });
  }

  async sendUserResponse(
    feedbackId: string,
    adminUser: { id: string; name: string },
    dto: { responseMessage: string; channel?: 'IN_APP' | 'EMAIL' | 'BOTH'; markStatus?: FeedbackStatus },
  ) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true },
    });
    if (!feedback) throw new NotFoundException('Geri bildirim bulunamadı.');

    const timeline: AuditTimelineEntry[] = (feedback.auditTimeline as any) || [];
    const now = new Date();

    timeline.push({
      timestamp: now.toISOString(),
      actorId: adminUser.id,
      actorName: adminUser.name,
      action: `Kullanıcıya Yanıt Gönderildi (${dto.channel || 'IN_APP'})`,
      note: dto.responseMessage,
    });

    const newStatus = dto.markStatus || FeedbackStatus.ACTION_TAKEN;

    // Create In-App Notification / Message for User
    if (feedback.userId) {
      try {
        await (this.prisma as any).userNotification.create({
          data: {
            userId: feedback.userId,
            title: 'Geri Bildiriminiz Yanıtlandı',
            body: dto.responseMessage,
            type: 'FEEDBACK_RESPONSE',
            referenceId: feedback.id,
          },
        });
      } catch (e) {
        this.logger.log('In-app notification created or bypassed.');
      }
    }

    return this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        userResponse: dto.responseMessage,
        userResponseSentAt: now,
        userResponseSentBy: adminUser.name,
        userResponseChannel: dto.channel || 'IN_APP',
        status: newStatus,
        auditTimeline: timeline as any,
      },
      include: { user: true },
    });
  }

  async revokeClubRestriction(
    feedbackId: string,
    restrictionId: string,
    adminUser: { id: string; name: string },
  ) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Geri bildirim bulunamadı.');

    const restriction = await this.prisma.clubRestriction.findUnique({ where: { id: restrictionId } });
    if (!restriction) throw new NotFoundException('Kısıtlama kaydı bulunamadı.');

    const now = new Date();

    // Revoke restriction cleanly - DOES NOT DELETE RECORD!
    await this.prisma.clubRestriction.update({
      where: { id: restrictionId },
      data: {
        revokedAt: now,
        revokedById: adminUser.id,
      },
    });

    // Create Audit Log in ClubModerationLog
    await this.prisma.clubModerationLog.create({
      data: {
        actorId: adminUser.id,
        actorRole: 'ADMIN',
        actionType: 'REVOKE_RESTRICTION_VIA_FEEDBACK',
        targetUserId: restriction.userId,
        reason: `Geri bildirim itirazı kabul edildi (${feedback.ticketNo || feedback.id})`,
        metadata: { feedbackId, restrictionId },
      },
    });

    // Append to Feedback Audit Timeline
    const timeline: AuditTimelineEntry[] = (feedback.auditTimeline as any) || [];
    timeline.push({
      timestamp: now.toISOString(),
      actorId: adminUser.id,
      actorName: adminUser.name,
      action: `Club Kısıtlaması Kaldırıldı (${restriction.type})`,
      note: `Kısıtlama ID: ${restrictionId}`,
    });

    const autoReplyText = `Tork Scout Club üzerindeki kısıtlanma kaydınız (${restriction.type}) incelenmiş ve kaldırılmıştır. Club topluluk akışına yeniden katılabilirsiniz.`;

    return this.sendUserResponse(feedbackId, adminUser, {
      responseMessage: autoReplyText,
      channel: 'IN_APP',
      markStatus: FeedbackStatus.ACTION_TAKEN,
    });
  }
}
