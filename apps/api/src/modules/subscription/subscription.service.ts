import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier, SubscriptionStatus, Role } from '@prisma/client';

export const ADMIN_EMAILS = [
  'efeguven9991@gmail.com',
  'm.efeeguven@gmail.com',
  'burhanseckin08@gmail.com',
];

const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  FREE: 0,
  TANISMA: 1,
  STANDARD: 2,
  YETKIN: 2,
  PRO: 3,
  PREMIUM: 3,
  PROFESYONEL: 3,
};

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculates the current active plan tier of a user by comparing User model tier and active database subscriptions.
   * Returns whichever tier is higher in hierarchy to prevent user tier downgrades.
   * Admin users and founder emails automatically get PROFESYONEL tier privileges.
   */
  async getEffectiveTier(userId: string): Promise<SubscriptionTier> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return SubscriptionTier.TANISMA;
    }

    if (user.role === Role.ADMIN || ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return SubscriptionTier.PROFESYONEL;
    }

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
        createdAt: 'desc',
      },
    });

    const subTier = activeSub?.plan?.tier || SubscriptionTier.FREE;
    const userTier = user.subscriptionTier || SubscriptionTier.TANISMA;

    const subRank = TIER_HIERARCHY[subTier] || 0;
    const userRank = TIER_HIERARCHY[userTier] || 0;

    return userRank >= subRank ? userTier : subTier;
  }
}
