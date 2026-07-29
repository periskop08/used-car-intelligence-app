import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier, SubscriptionStatus, Role } from '@prisma/client';

export const ADMIN_EMAILS = [
  'efeguven9991@gmail.com',
  'm.efeeguven@gmail.com',
  'burhanseckin08@gmail.com',
];

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculates the current active plan tier of a user by checking active database subscriptions.
   * Admin users and founder emails automatically get PROFESYONEL tier privileges.
   */
  async getEffectiveTier(userId: string): Promise<SubscriptionTier> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && (user.role === Role.ADMIN || ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
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

    if (!activeSub || !activeSub.plan) {
      return user?.subscriptionTier || SubscriptionTier.TANISMA;
    }

    return activeSub.plan.tier;
  }
}
