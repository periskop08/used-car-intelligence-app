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

    const subscriptionCatalog = (plans && plans.length > 0) ? plans : [
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

    const buyerCatalog = [
      {
        id: 'buyer-mini',
        packageCode: 'ALICI_MINI',
        name: 'Alıcı Mini Ek Hak Paket (+5 AI Rapor / +20 Chatbot)',
        priceTrl: 199,
        aiReportLimit: 5,
        chatbotMessageLimit: 20,
        validityDays: 30,
      },
      {
        id: 'buyer-plus',
        packageCode: 'ALICI_PLUS',
        name: 'Alıcı Plus Ek Hak Paket (+15 AI Rapor / +50 Chatbot)',
        priceTrl: 499,
        aiReportLimit: 15,
        chatbotMessageLimit: 50,
        validityDays: 30,
      },
      {
        id: 'buyer-max',
        packageCode: 'ALICI_MAX',
        name: 'Alıcı Max Ek Hak Paket (+30 AI Rapor / +100 Chatbot)',
        priceTrl: 899,
        aiReportLimit: 30,
        chatbotMessageLimit: 100,
        validityDays: 45,
      },
    ];

    return {
      subscriptions: subscriptionCatalog,
      buyerPackages: buyerCatalog,
    };
  }

  async grantPackageToUser(
    adminUser: { id: string; email: string },
    targetUserId: string,
    dto: {
      packageGroup?: 'SUBSCRIPTION' | 'BUYER';
      planId?: string;
      tier?: SubscriptionTier;
      buyerPackageCode?: 'ALICI_MINI' | 'ALICI_PLUS' | 'ALICI_MAX';
      activationMode?: string;
      reasonCode: string;
      reason?: string;
      notifyUser?: boolean;
    }
  ) {
    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('Hedef kullanıcı bulunamadı.');

    const packageGroup = dto.packageGroup || 'SUBSCRIPTION';

    if (packageGroup === 'BUYER') {
      const code = (dto.buyerPackageCode || 'ALICI_PLUS') as any;
      const limits =
        code === 'ALICI_MINI'
          ? { report: 5, chat: 20, days: 30 }
          : code === 'ALICI_MAX'
          ? { report: 30, chat: 100, days: 45 }
          : { report: 15, chat: 50, days: 30 };

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + limits.days);

      // Create BuyerPackagePurchase record with price = 0 (ADMIN_GRANT)
      const purchase = await this.prisma.buyerPackagePurchase.create({
        data: {
          userId: targetUserId,
          packageCode: code,
          price: 0,
          aiReportLimit: limits.report,
          aiReportUsed: 0,
          chatbotMessageLimit: limits.chat,
          chatbotMessageUsed: 0,
          validityDays: limits.days,
          expiresAt,
        },
      });

      // Audit Log
      await this.prisma.adminAuditLog.create({
        data: {
          entityType: 'BuyerPackagePurchase',
          entityId: purchase.id,
          adminUserId: adminUser.id,
          adminEmail: adminUser.email || 'Admin',
          action: 'USER_BUYER_PACKAGE_GRANTED',
          before: null,
          after: { packageCode: code, limits, source: 'ADMIN_GRANT', reasonCode: dto.reasonCode, reason: dto.reason } as any,
          changedFields: ['buyerPurchases'],
          metadata: {
            packageGroup: 'BUYER',
            reasonCode: dto.reasonCode,
            reason: dto.reason,
            notifyUser: dto.notifyUser ?? true,
          } as any,
        },
      });

      if (dto.notifyUser ?? true) {
        await this.prisma.adminUserMessage.create({
          data: {
            userId: targetUserId,
            createdByAdminId: adminUser.id,
            adminEmail: adminUser.email || 'Admin',
            subject: 'Hesabınıza Yeni Ek Hak Paket Tanımlandı',
            message: `Hesabınıza yönetici tarafından "${code}" alıcı paketi tanımlanmıştır. Neden: ${dto.reason || dto.reasonCode}`,
            sendInApp: true,
            sendEmail: false,
          },
        });
      }
    } else {
      const previousTier = targetUser.subscriptionTier;
      const newTier = dto.tier || SubscriptionTier.PROFESYONEL;

      await this.prisma.user.update({
        where: { id: targetUserId },
        data: { subscriptionTier: newTier },
      });

      await this.prisma.adminAuditLog.create({
        data: {
          entityType: 'UserSubscription',
          entityId: targetUserId,
          adminUserId: adminUser.id,
          adminEmail: adminUser.email || 'Admin',
          action: 'USER_SUBSCRIPTION_PACKAGE_GRANTED',
          before: { tier: previousTier } as any,
          after: { tier: newTier, source: 'ADMIN_GRANT', reasonCode: dto.reasonCode, reason: dto.reason } as any,
          changedFields: ['subscriptionTier'],
          metadata: {
            packageGroup: 'SUBSCRIPTION',
            reasonCode: dto.reasonCode,
            reason: dto.reason,
            notifyUser: dto.notifyUser ?? true,
          } as any,
        },
      });

      if (dto.notifyUser ?? true) {
        await this.prisma.adminUserMessage.create({
          data: {
            userId: targetUserId,
            createdByAdminId: adminUser.id,
            adminEmail: adminUser.email || 'Admin',
            subject: 'Hesabınıza Yeni Abonelik Paketi Tanımlandı',
            message: `Hesabınıza yönetici tarafından "${newTier}" abonelik paketi tanımlanmıştır. Neden: ${dto.reason || dto.reasonCode}`,
            sendInApp: true,
            sendEmail: false,
          },
        });
      }
    }

    return this.getSubscriptionSummary(targetUserId);
  }
}
