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

    if (isUnlimited) {
      return {
        unlimited: true,
        limit,
        reportQuota: { limit, used: 0, remaining: 999999 },
        chatbotQuota: { limit, used: 0, remaining: 999999 },
        used: 0,
        remaining: 999999,
      };
    }

    await this.cleanupStaleReservations();

    const reportUsed = await this.prisma.aiQuotaUsage.count({
      where: {
        userId,
        feature: AiQuotaFeature.LISTING_AI_ADVISOR,
        status: { in: [AiQuotaUsageStatus.CONSUMED, AiQuotaUsageStatus.RESERVED] },
      },
    });

    const chatbotUsed = await this.prisma.aiQuotaUsage.count({
      where: {
        userId,
        feature: AiQuotaFeature.GENERAL_CHATBOT,
        status: { in: [AiQuotaUsageStatus.CONSUMED, AiQuotaUsageStatus.RESERVED] },
      },
    });

    return {
      unlimited: false,
      limit,
      reportQuota: {
        limit,
        used: reportUsed,
        remaining: Math.max(0, limit - reportUsed),
      },
      chatbotQuota: {
        limit,
        used: chatbotUsed,
        remaining: Math.max(0, limit - chatbotUsed),
      },
      used: reportUsed,
      remaining: Math.max(0, limit - reportUsed),
    };
  }

  async reserveQuota(userId: string, idempotencyKey: string, referenceId?: string, feature: AiQuotaFeature = AiQuotaFeature.LISTING_AI_ADVISOR) {
    await this.cleanupStaleReservations();

    // Check if idempotencyKey already exists
    const existing = await this.prisma.aiQuotaUsage.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return {
        reserved: true,
        quotaUsageId: existing.id,
      };
    }

    const quota = await this.getQuota(userId);
    if (!quota.unlimited) {
      const remaining = feature === AiQuotaFeature.GENERAL_CHATBOT 
        ? quota.chatbotQuota.remaining 
        : quota.reportQuota.remaining;

      if (remaining <= 0) {
        throw new ForbiddenException(
          feature === AiQuotaFeature.GENERAL_CHATBOT
            ? 'AI Chatbot mesaj hakkınız dolmuştur. Lütfen paketinizi yükseltin.'
            : 'Araç Raporu alma hakkınız dolmuştur. Lütfen paketinizi yükseltin.'
        );
      }
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins TTL

    const reserved = await this.prisma.aiQuotaUsage.create({
      data: {
        userId,
        feature,
        idempotencyKey,
        referenceId,
        status: AiQuotaUsageStatus.RESERVED,
        amount: 1,
        expiresAt,
      },
    });

    return {
      reserved: true,
      quotaUsageId: reserved.id,
    };
  }

  async consumeQuota(quotaUsageId: string, assistantMessageId?: string) {
    try {
      await this.prisma.aiQuotaUsage.update({
        where: { id: quotaUsageId },
        data: {
          status: AiQuotaUsageStatus.CONSUMED,
          consumedAt: new Date(),
          assistantMessageId,
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to consume quota ID ${quotaUsageId}`, e);
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
      this.logger.error(`Failed to release quota ID ${quotaUsageId}`, e);
    }
  }
}
