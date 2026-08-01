import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier, SubscriptionStatus, Role, FeatureKey, UsagePeriodType } from '@prisma/client';

export const ADMIN_EMAILS = [
  'efeguven9991@gmail.com',
  'm.efeeguven@gmail.com',
  'burhanseckin08@gmail.com',
  'burhanseckin08@icloud.com',
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

  async getSubscriptionSummary(userId?: string) {
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }).catch(() => null) : null;
    if (!user) {
      return {
        tier: SubscriptionTier.TANISMA,
        tierName: 'Tanışma Paketi',
        isUnlimited: false,
        rights: {
          aiReports: { totalLimit: 3, used: 0, remaining: 3, isUnlimited: false },
          aiChat: { totalLimit: 3, used: 0, remaining: 3, isUnlimited: false },
          activeListings: { totalLimit: 1, used: 0, remaining: 1, isUnlimited: false },
          listingDurationDays: 30,
          comparisons: { totalLimit: 3, used: 0, remaining: 3, isUnlimited: false },
          maxVehiclesPerComparison: 2,
          vitrinListings: { totalLimit: 0, used: 0, remaining: 0, isUnlimited: false },
        },
        activePurchases: [],
      };
    }

    const isAdmin = user.role === Role.ADMIN || ADMIN_EMAILS.includes(user.email.toLowerCase());
    const effectiveTier = await this.getEffectiveTier(userId);

    const activePurchases = await this.prisma.buyerPackagePurchase.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    }).catch(() => []);

    let extraAiReports = 0;
    let extraChatMessages = 0;
    activePurchases.forEach(p => {
      extraAiReports += Math.max(0, p.aiReportLimit - p.aiReportUsed);
      extraChatMessages += Math.max(0, p.chatbotMessageLimit - p.chatbotMessageUsed);
    });

    if (isAdmin) {
      return {
        tier: SubscriptionTier.PROFESYONEL,
        tierName: 'Yönetici (Sınırsız)',
        isUnlimited: true,
        rights: {
          aiReports: { totalLimit: 999, used: 0, remaining: 999, isUnlimited: true },
          aiChat: { totalLimit: 999, used: 0, remaining: 999, isUnlimited: true },
          activeListings: { totalLimit: 999, used: 0, remaining: 999, isUnlimited: true },
          listingDurationDays: 45,
          comparisons: { totalLimit: 999, used: 0, remaining: 999, isUnlimited: true },
          maxVehiclesPerComparison: 10,
          vitrinListings: { totalLimit: 999, used: 0, remaining: 999, isUnlimited: true },
        },
        activePurchases,
      };
    }

    let tierName = 'Tanışma Paketi';
    let baseAiReports = 3;
    let baseAiChat = 3;
    let baseActiveListings = 1;
    let listingDurationDays = 30;
    let baseComparisons = 3;
    let maxVehiclesPerComparison = 2;
    let baseVitrin = 0;

    if (effectiveTier === SubscriptionTier.PROFESYONEL || effectiveTier === SubscriptionTier.PREMIUM || effectiveTier === SubscriptionTier.PRO) {
      tierName = 'Profesyonel Paket';
      baseAiReports = 50;
      baseAiChat = 150;
      baseActiveListings = 50;
      listingDurationDays = 45;
      baseComparisons = 30;
      maxVehiclesPerComparison = 10;
      baseVitrin = 5;
    } else if (effectiveTier === SubscriptionTier.YETKIN || effectiveTier === SubscriptionTier.STANDARD) {
      tierName = 'Yetkin Paket';
      baseAiReports = 10;
      baseAiChat = 30;
      baseActiveListings = 10;
      listingDurationDays = 30;
      baseComparisons = 10;
      maxVehiclesPerComparison = 5;
      baseVitrin = 1;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [aiChatUsage, comparisonUsage, aiReportUsage, activeListingsCount] = await Promise.all([
      this.prisma.featureUsage.findUnique({
        where: {
          userId_featureKey_periodType_periodStart: {
            userId,
            featureKey: FeatureKey.AI_CHAT,
            periodType: UsagePeriodType.DAILY,
            periodStart: startOfDay,
          },
        },
      }).catch(() => null),
      this.prisma.featureUsage.findUnique({
        where: {
          userId_featureKey_periodType_periodStart: {
            userId,
            featureKey: FeatureKey.VEHICLE_COMPARISON,
            periodType: UsagePeriodType.LIFETIME,
            periodStart: new Date(0),
          },
        },
      }).catch(() => null),
      this.prisma.featureUsage.findUnique({
        where: {
          userId_featureKey_periodType_periodStart: {
            userId,
            featureKey: FeatureKey.AI_REPORT,
            periodType: UsagePeriodType.LIFETIME,
            periodStart: new Date(0),
          },
        },
      }).catch(() => null),
      this.prisma.vehicleListing.count({
        where: { sellerId: userId, status: 'ACTIVE' },
      }).catch(() => 0),
    ]);

    const usedAiChat = aiChatUsage?.count || 0;
    const usedComparisons = comparisonUsage?.count || 0;
    const usedAiReports = aiReportUsage?.count || 0;

    const remainingAiChat = Math.max(0, baseAiChat - usedAiChat) + extraChatMessages;
    const remainingComparisons = Math.max(0, baseComparisons - usedComparisons);
    const remainingActiveListings = Math.max(0, baseActiveListings - activeListingsCount);
    const remainingAiReports = Math.max(0, (baseAiReports + extraAiReports) - usedAiReports);

    return {
      tier: effectiveTier,
      tierName,
      isUnlimited: false,
      rights: {
        aiReports: {
          totalLimit: baseAiReports + extraAiReports,
          used: usedAiReports,
          remaining: remainingAiReports,
          isUnlimited: false,
        },
        aiChat: {
          totalLimit: baseAiChat + extraChatMessages,
          used: usedAiChat,
          remaining: remainingAiChat,
          isUnlimited: false,
        },
        activeListings: {
          totalLimit: baseActiveListings,
          used: activeListingsCount,
          remaining: remainingActiveListings,
          isUnlimited: false,
        },
        listingDurationDays,
        comparisons: {
          totalLimit: baseComparisons,
          used: usedComparisons,
          remaining: remainingComparisons,
          isUnlimited: false,
        },
        maxVehiclesPerComparison,
        vitrinListings: {
          totalLimit: baseVitrin,
          used: 0,
          remaining: baseVitrin,
          isUnlimited: false,
        },
      },
      activePurchases,
    };
  }
}
