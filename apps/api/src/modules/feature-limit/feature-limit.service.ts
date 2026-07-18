import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { FeatureKey, UsagePeriodType, SubscriptionTier } from '@prisma/client';
import { PlanLimits } from '@used-car-intelligence/shared';

@Injectable()
export class FeatureLimitService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Loads the limits configuration based on the user's current effective subscription tier.
   */
  async getEffectivePlanLimits(userId: string): Promise<PlanLimits> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && (user.role === 'ADMIN' || ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email))) {
      return {
        aiChat: { period: 'daily', limit: null },
        vehicleComparison: { period: 'monthly', limit: null },
        favoriteVehicle: { period: 'lifetime', limit: null },
        sellerQuestions: true,
        detailedRiskNotes: true,
        inspectionChecklist: true,
      };
    }

    const tier = await this.subscriptionService.getEffectiveTier(userId);
    
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { tier },
    });

    if (!plan || !plan.limits) {
      // Fallback to Free limits if plan is not found in database
      return {
        aiChat: { period: 'daily', limit: 5 },
        vehicleComparison: { period: 'lifetime', limit: 1 },
        favoriteVehicle: { period: 'lifetime', limit: 0 },
        sellerQuestions: false,
        inspectionChecklist: false,
        detailedRiskNotes: false,
      };
    }

    return plan.limits as unknown as PlanLimits;
  }

  /**
   * Helper that checks and increments the usage of a feature atomically using an interactive transaction.
   * Prevents race conditions. Throws HttpException (429) if the limit is exceeded.
   */
  async checkAndIncrement(userId: string, featureKey: FeatureKey): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && (user.role === 'ADMIN' || ['efeguven9991@gmail.com', 'burhanseckin08@gmail.com', 'm.efeeguven@gmail.com'].includes(user.email))) {
      return; // Admins / Founders bypass all limits
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Get effective tier
      const activeSub = await tx.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      const tier = activeSub?.plan?.tier || SubscriptionTier.FREE;
      const plan = await tx.subscriptionPlan.findUnique({
        where: { tier },
      });

      const limits = (plan?.limits || {
        aiChat: { period: 'daily', limit: 5 },
        vehicleComparison: { period: 'lifetime', limit: 1 },
        favoriteVehicle: { period: 'lifetime', limit: 0 },
      }) as unknown as PlanLimits;

      if (featureKey === FeatureKey.AI_CHAT) {
        const config = limits.aiChat;
        if (config.limit === null) return; // Unlimited

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Find or create usage inside transaction with locking (select for update via upsert)
        const usage = await tx.featureUsage.upsert({
          where: {
            userId_featureKey_periodType_periodStart: {
              userId,
              featureKey,
              periodType: UsagePeriodType.DAILY,
              periodStart: startOfDay,
            },
          },
          update: {},
          create: {
            userId,
            featureKey,
            periodType: UsagePeriodType.DAILY,
            periodStart: startOfDay,
            count: 0,
          },
        });

        if (usage.count >= config.limit) {
          throw new HttpException('Günlük yapay zeka mesaj limitiniz aşılmıştır.', HttpStatus.TOO_MANY_REQUESTS);
        }

        await tx.featureUsage.update({
          where: { id: usage.id },
          data: { count: usage.count + 1 },
        });
      }

      if (featureKey === FeatureKey.VEHICLE_COMPARISON) {
        const config = limits.vehicleComparison;
        if (config.limit === null) return; // Unlimited

        if (config.period === 'lifetime') {
          const epochStart = new Date(0);
          const usage = await tx.featureUsage.upsert({
            where: {
              userId_featureKey_periodType_periodStart: {
                userId,
                featureKey,
                periodType: UsagePeriodType.LIFETIME,
                periodStart: epochStart,
              },
            },
            update: {},
            create: {
              userId,
              featureKey,
              periodType: UsagePeriodType.LIFETIME,
              periodStart: epochStart,
              count: 0,
            },
          });

          if (usage.count >= config.limit) {
            throw new HttpException('Araç karşılaştırma ömürlük deneme limitiniz aşılmıştır.', HttpStatus.TOO_MANY_REQUESTS);
          }

          await tx.featureUsage.update({
            where: { id: usage.id },
            data: { count: usage.count + 1 },
          });
        } else if (config.period === 'monthly') {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const usage = await tx.featureUsage.upsert({
            where: {
              userId_featureKey_periodType_periodStart: {
                userId,
                featureKey,
                periodType: UsagePeriodType.MONTHLY,
                periodStart: startOfMonth,
              },
            },
            update: {},
            create: {
              userId,
              featureKey,
              periodType: UsagePeriodType.MONTHLY,
              periodStart: startOfMonth,
              count: 0,
            },
          });

          if (usage.count >= config.limit) {
            throw new HttpException('Aylık araç karşılaştırma limitiniz aşılmıştır.', HttpStatus.TOO_MANY_REQUESTS);
          }

          await tx.featureUsage.update({
            where: { id: usage.id },
            data: { count: usage.count + 1 },
          });
        }
      }
    });
  }
}
