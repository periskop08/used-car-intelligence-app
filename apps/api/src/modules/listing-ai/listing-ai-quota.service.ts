import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AiQuotaFeature, AiQuotaUsageStatus, Role, SubscriptionTier } from '@prisma/client';

@Injectable()
export class ListingAiQuotaService {
  private readonly logger = new Logger(ListingAiQuotaService.name);

  constructor(private prisma: PrismaService) {}

  async cleanupStaleReservations() {
    try {
      const now = new Date();
      await this.prisma.aiQuotaUsage.updateMany({
        where: {
          status: AiQuotaUsageStatus.RESERVED,
          expiresAt: { lt: now },
        },
        data: {
          status: AiQuotaUsageStatus.RELEASED,
          releasedAt: now,
        },
      });
    } catch (e: any) {
      this.logger.error('Failed to cleanup stale quota reservations', e);
    }
  }

  async getQuota(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subscriptionTier: true, email: true },
    });

    const ADMIN_EMAILS = [
      'efeguven9991@gmail.com',
      'm.efeeguven@gmail.com',
      'burhanseckin08@gmail.com',
      'burhanseckin08@icloud.com',
    ];

    const isUnlimited =
      user?.role === Role.ADMIN ||
      user?.role === Role.SUPER_ADMIN ||
      (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

    if (isUnlimited) {
      return { unlimited: true };
    }

    const tier = user?.subscriptionTier || SubscriptionTier.FREE;
    let limit = 3;
    switch (tier) {
      case SubscriptionTier.YETKIN:
      case SubscriptionTier.STANDARD:
      case SubscriptionTier.PRO:
        limit = 30;
        break;
      case SubscriptionTier.PROFESYONEL:
      case SubscriptionTier.PREMIUM:
        limit = 150;
        break;
      case SubscriptionTier.TANISMA:
      case SubscriptionTier.FREE:
      default:
        limit = 3;
        break;
    }

    await this.cleanupStaleReservations();

    const used = await this.prisma.aiQuotaUsage.count({
      where: {
        userId,
        feature: AiQuotaFeature.LISTING_AI_ADVISOR,
        status: { in: [AiQuotaUsageStatus.CONSUMED, AiQuotaUsageStatus.RESERVED] },
      },
    });

    const remaining = Math.max(0, limit - used);

    return {
      unlimited: false,
      limit,
      used,
      remaining,
    };
  }

  async reserveQuota(userId: string, idempotencyKey: string, referenceId?: string) {
    await this.cleanupStaleReservations();

    // Check if idempotencyKey already exists
    const existing = await this.prisma.aiQuotaUsage.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return {
        reserved: true,
        quotaUsageId: existing.id,
        existing,
      };
    }

    const quotaInfo = await this.getQuota(userId);
    if (!quotaInfo.unlimited && quotaInfo.remaining! <= 0) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'QUOTA_EXHAUSTED',
        message: 'Chatbot kullanım hakkınız doldu. Lütfen paketinizi yükseltin.',
      });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min reservation expiration

    const reservation = await this.prisma.aiQuotaUsage.create({
      data: {
        userId,
        feature: AiQuotaFeature.LISTING_AI_ADVISOR,
        referenceId,
        idempotencyKey,
        status: AiQuotaUsageStatus.RESERVED,
        expiresAt,
      },
    });

    return {
      reserved: true,
      quotaUsageId: reservation.id,
      reservation,
    };
  }

  async consumeQuota(quotaUsageId: string, assistantMessageId?: string) {
    try {
      await this.prisma.aiQuotaUsage.update({
        where: { id: quotaUsageId },
        data: {
          status: AiQuotaUsageStatus.CONSUMED,
          consumedAt: new Date(),
          assistantMessageId: assistantMessageId || null,
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to consume quota usage ${quotaUsageId}`, e);
    }
  }

  async releaseQuota(quotaUsageId: string) {
    try {
      await this.prisma.aiQuotaUsage.update({
        where: { id: quotaUsageId },
        data: {
          status: AiQuotaUsageStatus.RELEASED,
          releasedAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to release quota usage ${quotaUsageId}`, e);
    }
  }
}
