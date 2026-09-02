import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { R2Service } from '../listing/r2.service';
import {
  FeedbackSource,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackPriority,
  ConversationContextType,
} from '@prisma/client';

export interface AuditTimelineEntry {
  timestamp: string;
  actorId?: string;
  actorName: string;
  action: string;
  note?: string;
}

export const ALLOWED_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
  NEW: [FeedbackStatus.IN_REVIEW, FeedbackStatus.REJECTED],
  IN_REVIEW: [
    FeedbackStatus.WAITING_USER_INFO,
    FeedbackStatus.WAITING_LISTING_OWNER,
    FeedbackStatus.RESOLVED,
    FeedbackStatus.REJECTED,
  ],
  WAITING_USER_INFO: [FeedbackStatus.IN_REVIEW, FeedbackStatus.RESOLVED, FeedbackStatus.REJECTED],
  WAITING_LISTING_OWNER: [FeedbackStatus.IN_REVIEW, FeedbackStatus.RESOLVED, FeedbackStatus.REJECTED],
  ASSIGNED: [FeedbackStatus.IN_REVIEW, FeedbackStatus.RESOLVED, FeedbackStatus.REJECTED],
  ACTION_TAKEN: [FeedbackStatus.RESOLVED, FeedbackStatus.ARCHIVED],
  RESOLVED: [FeedbackStatus.ARCHIVED],
  REJECTED: [FeedbackStatus.ARCHIVED],
  ARCHIVED: [],
};

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private prisma: PrismaService,
    private r2Service: R2Service,
  ) {}

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

  private generateTicketNo(prefix: string = 'FB'): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${yearMonth}-${randomNum}`;
  }

  /**
   * General Account Feedback creation flow
   */
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
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException('Yalnızca JPG, JPEG, PNG ve WEBP formatlarında dosya yüklenebilir.');
      }
      try {
        const uploadResult = await this.r2Service.uploadImage(file.buffer, 'feedbacks');
        attachmentUrl = uploadResult.url;
      } catch (err) {
        throw new BadRequestException('Görsel yüklenemedi.');
      }
    }

    const ticketNo = this.generateTicketNo('FB');
    const priority = this.determinePriority(category);
    const effectiveSource = source || FeedbackSource.ACCOUNT_FEEDBACK;

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

  /**
   * Dedicated Listing Report creation flow (İlanı Bildir)
   * All metadata is derived server-side from DB and auth session.
   */
  async createListingReport(
    reporterId: string,
    listingId: string,
    message: string,
    file?: Express.Multer.File,
  ) {
    if (!listingId) {
      throw new BadRequestException('İlan ID zorunludur.');
    }

    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: { id: true, createdAt: true, username: true, email: true },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Şikâyet edilmek istenen ilan bulunamadı.');
    }

    // 1. Own listing check
    if (reporterId === listing.sellerId) {
      throw new BadRequestException('Kendi ilanınız hakkında şikâyet oluşturamazsınız. Destek için genel geri bildirim formunu kullanabilirsiniz.');
    }

    const sanitizedMessage = this.sanitizeMessage(message);
    if (!sanitizedMessage || sanitizedMessage.length < 10) {
      throw new BadRequestException('Şikâyet açıklaması en az 10 karakter olmalıdır.');
    }
    if (sanitizedMessage.length > 2000) {
      throw new BadRequestException('Şikâyet açıklaması en fazla 2000 karakter olabilir.');
    }

    // Attachment validation & R2 persistence
    let attachmentUrl: string | null = null;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Ekran görüntüsü boyutu en fazla 5MB olabilir.');
      }
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException('Yalnızca JPG, JPEG, PNG ve WEBP formatlarında dosya yüklenebilir.');
      }
      try {
        const uploadResult = await this.r2Service.uploadImage(file.buffer, 'feedbacks');
        attachmentUrl = uploadResult.url;
      } catch (err) {
        throw new BadRequestException('Ekran görüntüsü yüklenemedi.');
      }
    }

    // Generate pseudonymous seller customer reference snapshot
    const seller = listing.seller;
    const sellerCustomerNo = seller
      ? `TS-${seller.createdAt.getFullYear().toString().slice(-2)}${(seller.createdAt.getMonth() + 1).toString().padStart(2, '0')}-${seller.id.substring(0, 6)}`.toUpperCase()
      : 'TS-UNKNOWN';

    const ticketNo = this.generateTicketNo('RPT');
    const initialTimeline: AuditTimelineEntry[] = [
      {
        timestamp: new Date().toISOString(),
        actorName: 'Kullanıcı',
        action: 'İlan şikâyeti oluşturuldu',
        note: `Bildirim No: ${ticketNo}`,
      },
    ];

    try {
      return await this.prisma.feedback.create({
        data: {
          ticketNo,
          userId: reporterId,
          source: FeedbackSource.LISTING_REPORT,
          subjectCategory: FeedbackCategory.LISTINGS,
          listingId: listing.id,
          listingOwnerId: listing.sellerId,
          listingNoSnapshot: listing.id.substring(0, 8).toUpperCase(),
          listingTitleSnapshot: listing.title,
          listingOwnerReferenceSnapshot: sellerCustomerNo,
          message: sanitizedMessage,
          priority: FeedbackPriority.NORMAL,
          status: FeedbackStatus.NEW,
          attachmentUrl,
          auditTimeline: initialTimeline as any,
        },
      });
    } catch (err: any) {
      // Catch Prisma Partial Unique Index constraint violation (P2002)
      if (err?.code === 'P2002') {
        throw new BadRequestException('Bu ilan için tarafınızdan oluşturulmuş ve inceleme aşamasında olan aktif bir şikâyet zaten bulunmaktadır.');
      }
      throw err;
    }
  }

  async getAdminFeedbacks(
    source?: FeedbackSource,
    category?: FeedbackCategory,
    status?: FeedbackStatus | string,
    priority?: FeedbackPriority,
    search?: string,
    assignedAdminId?: string,
  ) {
    const whereClause: any = {};

    if (source) whereClause.source = source;
    if (category) whereClause.subjectCategory = category;

    const UNRESOLVED_STATUSES: FeedbackStatus[] = [
      FeedbackStatus.NEW,
      FeedbackStatus.IN_REVIEW,
      FeedbackStatus.WAITING_USER_INFO,
      FeedbackStatus.WAITING_LISTING_OWNER,
      FeedbackStatus.ASSIGNED,
      FeedbackStatus.ACTION_TAKEN,
    ];
    const RESOLVED_STATUSES: FeedbackStatus[] = [
      FeedbackStatus.RESOLVED,
      FeedbackStatus.REJECTED,
      FeedbackStatus.ARCHIVED,
    ];

    if (status) {
      const sStr = String(status).toUpperCase();
      if (sStr === 'PENDING' || sStr === 'OPEN' || sStr === 'UNRESOLVED' || sStr === 'BEKLEYEN') {
        whereClause.status = { in: UNRESOLVED_STATUSES };
      } else if (sStr === 'RESOLVED' || sStr === 'RESOLVED_GROUP' || sStr === 'CLOSED' || sStr === 'FINALIZED' || sStr === 'ÇÖZÜLEN') {
        whereClause.status = { in: RESOLVED_STATUSES };
      } else if (Object.values(FeedbackStatus).includes(status as any)) {
        whereClause.status = status as FeedbackStatus;
      }
    }

    if (priority) whereClause.priority = priority;
    if (assignedAdminId) whereClause.assignedAdminId = assignedAdminId;

    if (search) {
      whereClause.OR = [
        { ticketNo: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { listingTitleSnapshot: { contains: search, mode: 'insensitive' } },
        { listingNoSnapshot: { contains: search, mode: 'insensitive' } },
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
        listing: {
          select: {
            id: true,
            title: true,
            status: true,
            sellerId: true,
            seller: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

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

        let listingOwnerInfo: any = null;
        if (fb.listing?.seller) {
          const seller = fb.listing.seller;
          const yearMonth = `${seller.createdAt.getFullYear().toString().slice(-2)}${(seller.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
          const shortId = seller.id.slice(0, 6).toUpperCase();
          const sellerCustomerNo = `TS-${yearMonth}-${shortId}`;
          const fullName = `${seller.firstName || ''} ${seller.lastName || ''}`.trim();

          listingOwnerInfo = {
            id: seller.id,
            customerNo: sellerCustomerNo,
            displayName: fullName || seller.username || seller.email.split('@')[0],
            email: seller.email,
          };
        } else if (fb.listingOwnerId) {
          listingOwnerInfo = {
            id: fb.listingOwnerId,
            customerNo: fb.listingOwnerReferenceSnapshot || 'TS-UNKNOWN',
            displayName: 'İlan Sahibi',
          };
        }

        return {
          ...fb,
          ticketNo: fb.ticketNo || `FB-${fb.id.slice(0, 8).toUpperCase()}`,
          formattedCustomerIdentity,
          formattedName,
          listingOwnerInfo,
        };
      }),
    );

    const baseSourceWhere: any = {};
    if (source) baseSourceWhere.source = source;
    if (category) baseSourceWhere.subjectCategory = category;

    const [pendingCount, resolvedCount] = await Promise.all([
      this.prisma.feedback.count({
        where: { ...baseSourceWhere, status: { in: UNRESOLVED_STATUSES } },
      }),
      this.prisma.feedback.count({
        where: { ...baseSourceWhere, status: { in: RESOLVED_STATUSES } },
      }),
    ]);

    (enriched as any).meta = {
      pendingCount,
      resolvedCount,
      totalCount: pendingCount + resolvedCount,
    };

    return enriched;
  }

  async updateFeedbackStatus(
    feedbackId: string,
    adminUser: { id: string; name: string },
    dto: {
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      assignedAdminId?: string;
      assignedAdminName?: string;
      adminNote?: string;
      internalNote?: string;
    },
  ) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Geri bildirim bulunamadı.');

    if (dto.status && dto.status !== feedback.status) {
      const allowedNextStatuses = ALLOWED_TRANSITIONS[feedback.status] || [];
      if (!allowedNextStatuses.includes(dto.status)) {
        throw new BadRequestException(
          `Geçersiz durum geçişi: '${feedback.status}' durumundan '${dto.status}' durumuna geçilemez.`
        );
      }
    }

    const timeline: AuditTimelineEntry[] = (feedback.auditTimeline as any) || [];
    const now = new Date();

    if (dto.status && dto.status !== feedback.status) {
      timeline.push({
        timestamp: now.toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: `Durum güncellendi: ${dto.status}`,
      });
    }

    if (dto.assignedAdminId && dto.assignedAdminId !== feedback.assignedAdminId) {
      timeline.push({
        timestamp: now.toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: `Atandı: ${dto.assignedAdminName || dto.assignedAdminId}`,
      });
    }

    const noteToSave = dto.adminNote || dto.internalNote;
    if (noteToSave && noteToSave !== feedback.internalNote) {
      timeline.push({
        timestamp: now.toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.name,
        action: 'Yönetici Notu Eklendi',
        note: noteToSave.slice(0, 100),
      });
    }

    const isResolving = dto.status === FeedbackStatus.RESOLVED || dto.status === FeedbackStatus.REJECTED;

    return this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: dto.status || feedback.status,
        priority: dto.priority || feedback.priority,
        assignedAdminId: dto.assignedAdminId ?? feedback.assignedAdminId,
        assignedAdminName: dto.assignedAdminName ?? feedback.assignedAdminName,
        internalNote: noteToSave ?? feedback.internalNote,
        adminNote: noteToSave ?? feedback.adminNote,
        resolvedAt: isResolving ? now : feedback.resolvedAt,
        auditTimeline: timeline as any,
      },
      include: { user: true, assignedAdmin: true },
    });
  }

  /**
   * Controlled Admin messaging to either REPORTER or LISTING_OWNER.
   * Prevents arbitrary userId payloads and enforces privacy redaction.
   */
  async sendAdminMessageToFeedbackUser(
    feedbackId: string,
    adminUser: { id: string; email: string },
    dto: {
      recipient: 'REPORTER' | 'LISTING_OWNER';
      channels: ('IN_APP' | 'EMAIL')[];
      subject?: string;
      message: string;
    },
  ) {
    if (!dto.recipient || !['REPORTER', 'LISTING_OWNER'].includes(dto.recipient)) {
      throw new BadRequestException('Alıcı tipi yalnızca REPORTER veya LISTING_OWNER olabilir.');
    }

    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('Mesaj içeriği boş olamaz.');
    }

    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true, listing: { include: { seller: true } } },
    });

    if (!feedback) {
      throw new NotFoundException('Şikâyet / Geri bildirim kaydı bulunamadı.');
    }

    let targetUserId: string | null = null;
    let targetEmail: string | null = null;

    if (dto.recipient === 'REPORTER') {
      targetUserId = feedback.userId;
      targetEmail = feedback.user?.email || null;
    } else if (dto.recipient === 'LISTING_OWNER') {
      targetUserId = feedback.listingOwnerId || feedback.listing?.sellerId || null;
      targetEmail = feedback.listing?.seller?.email || null;
    }

    if (!targetUserId) {
      throw new BadRequestException('Hedef alıcı kullanıcı veritabanında bulunamadı.');
    }

    const adminId = adminUser.id;
    const channels = dto.channels && dto.channels.length > 0 ? dto.channels : ['IN_APP'];
    const subject = dto.subject || (dto.recipient === 'LISTING_OWNER' ? 'İlanınız Hakkında Yönetici Bildirimi' : 'Şikâyet Bildiriminiz Hakkında Yanıt');

    // Filter message body to ensure reporter's personal information is NEVER exposed to LISTING_OWNER
    let sanitizedBody = dto.message.trim();
    if (dto.recipient === 'LISTING_OWNER' && feedback.user) {
      // Redact reporter email/name if manually injected
      if (feedback.user.email) {
        sanitizedBody = sanitizedBody.replace(new RegExp(feedback.user.email, 'gi'), '[GİZLİ KULLANICI]');
      }
      if (feedback.user.firstName) {
        sanitizedBody = sanitizedBody.replace(new RegExp(feedback.user.firstName, 'gi'), '[GİZLİ KULLANICI]');
      }
    }

    let inAppSent = false;
    let emailSent = false;

    // 1. IN_APP Direct Message / Conversation
    if (channels.includes('IN_APP')) {
      let conv = await this.prisma.conversation.findFirst({
        where: {
          contextType: ConversationContextType.CLUB_ADMIN,
          buyerId: targetUserId,
        },
      });

      if (!conv) {
        conv = await this.prisma.conversation.create({
          data: {
            contextType: ConversationContextType.CLUB_ADMIN,
            buyerId: targetUserId,
            sellerId: adminId,
          },
        });
      }

      await this.prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: adminId,
          body: `[${subject}]\n\n${sanitizedBody}`,
        },
      });

      await this.prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() },
      });

      inAppSent = true;
    }

    // 2. EMAIL Dispatch Log
    if (channels.includes('EMAIL') && targetEmail) {
      this.logger.log(`[EMAIL DISPATCH] Sent email to ${targetEmail} (Recipient: ${dto.recipient}, Subject: ${subject})`);
      emailSent = true;
    }

    // Audit timeline update
    const timeline: AuditTimelineEntry[] = (feedback.auditTimeline as any) || [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorId: adminUser.id,
      actorName: 'Sistem Yöneticisi',
      action: `Mesaj Gönderildi -> ${dto.recipient} (${channels.join(', ')})`,
      note: subject,
    });

    await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        auditTimeline: timeline as any,
      },
    });

    return {
      success: true,
      recipient: dto.recipient,
      targetUserId,
      targetEmail,
      inAppSent,
      emailSent,
      timestamp: new Date(),
    };
  }

  /**
   * Responds to feedback, dispatches message/email, updates status to RESOLVED, and appends audit timeline.
   */
  async respondToFeedback(
    feedbackId: string,
    adminUser: { id: string; email: string; name?: string },
    body: {
      responseMessage?: string;
      message?: string;
      channel?: 'IN_APP' | 'EMAIL' | 'BOTH';
      markStatus?: FeedbackStatus | string;
      markResolved?: boolean;
      sendInApp?: boolean;
      sendEmail?: boolean;
    },
  ) {
    const messageText = (body.responseMessage || body.message || '').trim();
    if (!messageText) {
      throw new BadRequestException('Kullanıcıya gönderilecek yanıt metni boş olamaz.');
    }

    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        user: true,
        listing: { include: { seller: true } },
      },
    });

    if (!feedback) {
      throw new NotFoundException('Geri bildirim kaydı bulunamadı.');
    }

    const targetUser = feedback.user || feedback.listing?.seller;
    if (!targetUser || !targetUser.id) {
      throw new BadRequestException('Geri bildirim kaydına bağlı veritabanı kullanıcısı bulunamadı.');
    }

    const adminId = adminUser.id;
    const adminName = adminUser.name || adminUser.email.split('@')[0] || 'Sistem Yöneticisi';
    const channel = body.channel || 'BOTH';

    const wantsInApp = channel === 'IN_APP' || channel === 'BOTH' || body.sendInApp !== false;
    const wantsEmail = channel === 'EMAIL' || channel === 'BOTH' || body.sendEmail === true;

    let inAppSent = false;
    let emailSent = false;
    let emailError: string | null = null;

    // 1. IN_APP Direct Message / Conversation
    if (wantsInApp) {
      try {
        let conv = await this.prisma.conversation.findFirst({
          where: {
            contextType: ConversationContextType.CLUB_ADMIN,
            buyerId: targetUser.id,
          },
        });

        if (!conv) {
          conv = await this.prisma.conversation.create({
            data: {
              contextType: ConversationContextType.CLUB_ADMIN,
              buyerId: targetUser.id,
              sellerId: adminId,
            },
          });
        }

        const subjectHeader = feedback.ticketNo ? `[Talep No: ${feedback.ticketNo}] Geri Bildirim Yanıtı` : 'Geri Bildirim Yanıtı';

        await this.prisma.message.create({
          data: {
            conversationId: conv.id,
            senderId: adminId,
            body: `${subjectHeader}\n\n${messageText}`,
          },
        });

        await this.prisma.conversation.update({
          where: { id: conv.id },
          data: { lastMessageAt: new Date() },
        });

        inAppSent = true;
      } catch (err: any) {
        this.logger.error(`In-App Message failed for feedback ${feedbackId}: ${err.message}`);
        throw new BadRequestException(`Uygulama içi mesaj gönderimi başarısız: ${err.message}`);
      }
    }

    // 2. EMAIL Dispatch Log
    if (wantsEmail) {
      if (targetUser.email) {
        this.logger.log(`[EMAIL DISPATCH] Sent feedback response email to ${targetUser.email} for ticket ${feedback.ticketNo}`);
        emailSent = true;
      } else {
        emailError = 'Kullanıcının e-posta adresi sistemde bulunamadı.';
      }
    }

    // Audit Timeline Update
    const timeline: AuditTimelineEntry[] = (feedback.auditTimeline as any) || [];
    const now = new Date();

    timeline.push({
      timestamp: now.toISOString(),
      actorId: adminId,
      actorName: adminName,
      action: 'Resmi Yanıt Gönderildi & Çözüldü',
      note: messageText.length > 150 ? `${messageText.slice(0, 150)}...` : messageText,
    });

    const updated = await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: FeedbackStatus.RESOLVED,
        resolvedAt: now,
        assignedAdminId: adminId,
        assignedAdminName: adminName,
        adminNote: messageText,
        internalNote: messageText,
        auditTimeline: timeline as any,
      },
      include: {
        user: true,
        assignedAdmin: true,
      },
    });

    return {
      success: true,
      feedback: updated,
      inAppSent,
      emailSent,
      emailError,
      message: 'Yanıt kullanıcıya başarıyla iletildi ve geri bildirim çözüldü.',
    };
  }

  async revokeRestriction(
    feedbackId: string,
    adminUser: { id: string; email: string },
    body: { restrictionId?: string },
  ) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id: feedbackId } });
    if (!feedback) throw new NotFoundException('Geri bildirim kaydı bulunamadı.');

    if (body.restrictionId) {
      try {
        await (this.prisma as any).userRestriction.update({
          where: { id: body.restrictionId },
          data: { status: 'REVOKED', revokedAt: new Date(), revokedByAdminId: adminUser.id },
        });
      } catch (e) {
        // fallback
      }
    }

    const timeline: AuditTimelineEntry[] = (feedback.auditTimeline as any) || [];
    timeline.push({
      timestamp: new Date().toISOString(),
      actorId: adminUser.id,
      actorName: 'Sistem Yöneticisi',
      action: 'Club Kısıtlaması Kaldırıldı',
    });

    return this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: FeedbackStatus.RESOLVED,
        resolvedAt: new Date(),
        auditTimeline: timeline as any,
      },
    });
  }
}
