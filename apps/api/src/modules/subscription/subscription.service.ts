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

  async getAvailablePlans() {
    let plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (!plans || plans.length === 0) {
      // Return predefined catalog plans if DB table is unseeded
      return [
        {
          id: 'plan-tanisma',
          tier: SubscriptionTier.TANISMA,
          name: 'Tanışma / Ücretsiz Paket',
          priceTrl: 0,
          limits: { aiReports: 3, aiChat: 3, activeListings: 1, comparisons: 3, listingDurationDays: 30 },
        },
        {
          id: 'plan-yetkin',
          tier: SubscriptionTier.YETKIN,
          name: 'Yetkin / Standard Paket',
          priceTrl: 499,
          limits: { aiReports: 10, aiChat: 30, activeListings: 10, comparisons: 10, listingDurationDays: 30 },
        },
        {
          id: 'plan-profesyonel',
          tier: SubscriptionTier.PROFESYONEL,
          name: 'Profesyonel / Pro Paket',
          priceTrl: 1499,
          limits: { aiReports: 50, aiChat: 150, activeListings: 50, comparisons: 30, listingDurationDays: 45 },
        },
      ];
    }
    return plans;
  }

  async grantPackageToUser(
    adminUser: { id: string; email: string },
    targetUserId: string,
    dto: {
      planId?: string;
      tier?: SubscriptionTier;
      activationMode?: string;
      reasonCode: string;
      reason?: string;
      notifyUser?: boolean;
    }
  ) {
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('Hedef kullanıcı bulunamadı.');

    const previousTier = targetUser.subscriptionTier;
    const newTier = dto.tier || SubscriptionTier.PROFESYONEL;

    // Update user tier
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { subscriptionTier: newTier },
    });

    // Create Audit Log entry (source = ADMIN_GRANT)
    await this.prisma.adminAuditLog.create({
      data: {
        entityType: 'UserSubscription',
        entityId: targetUserId,
        adminUserId: adminUser.id,
        adminEmail: adminUser.email || 'Admin',
        action: 'USER_PACKAGE_GRANTED',
        before: { tier: previousTier } as any,
        after: { tier: newTier, source: 'ADMIN_GRANT', reasonCode: dto.reasonCode, reason: dto.reason } as any,
        changedFields: ['subscriptionTier'],
        metadata: {
          activationMode: dto.activationMode || 'IMMEDIATE',
          reasonCode: dto.reasonCode,
          reason: dto.reason,
          notifyUser: dto.notifyUser ?? true,
        } as any,
      },
    });

    // Optional user notification
    if (dto.notifyUser ?? true) {
      await this.prisma.adminUserMessage.create({
        data: {
          userId: targetUserId,
          createdByAdminId: adminUser.id,
          adminEmail: adminUser.email || 'Admin',
          subject: 'Hesabınıza Yeni Paket Tanımlandı',
          message: `Hesabınıza yönetici tarafından "${newTier}" paketi tanımlanmıştır. Neden: ${dto.reason || dto.reasonCode}`,
          sendInApp: true,
          sendEmail: false,
        },
      });
    }

    return this.getSubscriptionSummary(targetUserId);
  }
}
