import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { R2Service } from '../listing/r2.service';
import { FeedbackCategory, FeedbackStatus, FeedbackPriority } from '@prisma/client';

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
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags completely
      .replace(/<\/?[^>]+(>|$)/g, '') // Strip remaining HTML tags
      .trim();
  }

  private determinePriority(category: FeedbackCategory): FeedbackPriority {
    switch (category) {
      case FeedbackCategory.SECURITY_SUSPICIOUS_ACTIVITY:
        return FeedbackPriority.HIGH;
      case FeedbackCategory.SUBSCRIPTION_PACKAGES:
      case FeedbackCategory.BUG_REPORT:
      case FeedbackCategory.INCORRECT_VEHICLE_DATA:
        return FeedbackPriority.HIGH;
      case FeedbackCategory.GENERAL_SUGGESTION:
      case FeedbackCategory.DESIGN_USABILITY:
      case FeedbackCategory.OTHER:
      default:
        return FeedbackPriority.NORMAL;
    }
  }

  async createFeedback(
    userId: string,
    category: FeedbackCategory,
    message: string,
    file?: Express.Multer.File,
  ) {
    // 1. Rate limiting check (max 3 feedbacks in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentFeedbacksCount = await this.prisma.feedback.count({
      where: {
        userId,
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    });

    if (recentFeedbacksCount >= 3) {
      throw new BadRequestException('Çok fazla geri bildirim gönderdiniz. Lütfen 5 dakika sonra tekrar deneyin.');
    }

    // 2. Validate message length
    const sanitizedMessage = this.sanitizeMessage(message);
    if (!sanitizedMessage || sanitizedMessage.length < 10) {
      throw new BadRequestException('Mesaj en az 10 karakter olmalıdır.');
    }
    if (sanitizedMessage.length > 2000) {
      throw new BadRequestException('Mesaj en fazla 2000 karakter olmalıdır.');
    }

    // 3. Handle file attachment upload to R2
    let attachmentUrl: string | null = null;
    if (file) {
      // Validate file size (max 5MB)
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new BadRequestException('Ekran görüntüsü boyutu en fazla 5MB olabilir.');
      }

      // Validate file extension/mime type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Yalnızca JPG, JPEG, PNG ve WEBP formatında görsel ekleyebilirsiniz.');
      }

      try {
        const uploadResult = await this.r2Service.uploadImage(file.buffer, 'feedbacks');
        attachmentUrl = uploadResult.url;
      } catch (err) {
        this.logger.error('Failed to upload feedback attachment to R2:', err);
        throw new BadRequestException('Ekran görüntüsü yüklenemedi. Lütfen tekrar deneyin.');
      }
    }

    const priority = this.determinePriority(category);

    return this.prisma.feedback.create({
      data: {
        userId,
        subjectCategory: category,
        message: sanitizedMessage,
        priority,
        status: FeedbackStatus.NEW,
        attachmentUrl,
      },
    });
  }

  async getAdminFeedbacks(
    category?: FeedbackCategory,
    status?: FeedbackStatus,
    priority?: FeedbackPriority,
    search?: string,
  ) {
    const whereClause: any = {};

    if (category) {
      whereClause.subjectCategory = category;
    }
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (search) {
      whereClause.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    return this.prisma.feedback.findMany({
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateFeedbackStatusAndPriority(
    feedbackId: string,
    status?: FeedbackStatus,
    priority?: FeedbackPriority,
  ) {
    const data: any = {};
    if (status) {
      data.status = status;
    }
    if (priority) {
      data.priority = priority;
    }

    return this.prisma.feedback.update({
      where: { id: feedbackId },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
