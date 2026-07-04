import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculates the current active plan tier of a user by checking active database subscriptions.
   * If no valid subscription exists or has expired, returns FREE.
   */
  async getEffectiveTier(userId: string): Promise<SubscriptionTier> {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc', // get latest active subscription
      },
    });

    if (!activeSub || !activeSub.plan) {
      return SubscriptionTier.FREE;
    }

    return activeSub.plan.tier;
  }
}
