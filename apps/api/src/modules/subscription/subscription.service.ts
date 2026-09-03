import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier, SubscriptionStatus, Role, FeatureKey, UsagePeriodType, BuyerPackageCode, PromotionPaymentStatus } from '@prisma/client';
import { BUYER_PACKAGES } from './buyer-package.service';

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
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const dbBuyerPlans = await this.prisma.buyerPackagePlan.findMany({
      where: { isActive: true },
    });
    const buyerPriceMap = new Map(dbBuyerPlans.map((p) => [p.code, p.priceTrl]));

    const buyerCatalog = Object.values(BUYER_PACKAGES).map((bp) => {
      const dynamicPrice = buyerPriceMap.get(bp.code);
      return {
        id: `buyer-${bp.code.toLowerCase().replace('_', '-')}`,
        packageCode: bp.code,
        name: bp.name,
        priceTrl: dynamicPrice !== undefined ? dynamicPrice : bp.price,
        aiReportLimit: bp.aiReportLimit,
        chatbotMessageLimit: bp.chatbotMessageLimit,
        validityDays: bp.validityDays,
        description: bp.description,
        popularTag: bp.popularTag,
      };
    });

    return {
      subscriptions: plans,
      buyerPackages: buyerCatalog,
    };
  }

  /**
   * Admin Pricing Center Overview:
   * Returns live dynamic prices, active subscriber count, renewing subscriber count, and history.
   */
  async getPricingOverview() {
    const now = new Date();
    const lifetimeThreshold = new Date('2040-01-01');

    const [subscriptionPlans, buyerPackagePlans, allActiveSubs, priceHistory] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.buyerPackagePlan.findMany({
        orderBy: { code: 'asc' },
      }),
      this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { gt: now },
        },
        include: {
          user: { select: { email: true, role: true } },
          plan: true,
        },
      }),
      this.prisma.packagePriceHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Aggregate subscription subscriber counts per plan
    const subPlanStats = subscriptionPlans.map((plan) => {
      const matchingSubs = allActiveSubs.filter((s) => s.planId === plan.id);
      const totalActive = matchingSubs.length;
      const renewingCount = matchingSubs.filter(
        (s) => s.expiresAt < lifetimeThreshold && s.user.role !== Role.ADMIN && !ADMIN_EMAILS.includes(s.user.email.toLowerCase())
      ).length;

      return {
        id: plan.id,
        tier: plan.tier,
        name: plan.name,
        priceTrl: Number(plan.priceTrl),
        priceUsd: Number(plan.priceUsd),
        limits: plan.limits,
        totalActiveSubscribers: totalActive,
        renewingSubscribersCount: renewingCount,
        lifetimeGrantCount: totalActive - renewingCount,
        updatedAt: plan.updatedAt,
      };
    });

    // Aggregate buyer package data
    const buyerPackageStats = buyerPackagePlans.map((bp) => {
      const config = BUYER_PACKAGES[bp.code];
      return {
        id: bp.id,
        code: bp.code,
        name: config?.name || bp.code,
        badge: config?.badge || 'EK HAK',
        priceTrl: bp.priceTrl,
        currency: bp.currency,
        isActive: bp.isActive,
        limits: config
          ? {
              aiReportLimit: config.aiReportLimit,
              chatbotMessageLimit: config.chatbotMessageLimit,
              validityDays: config.validityDays,
            }
          : null,
        description: config?.description || '',
        popularTag: config?.popularTag || null,
        updatedAt: bp.updatedAt,
      };
    });

    return {
      subscriptions: subPlanStats,
      buyerPackages: buyerPackageStats,
      recentHistory: priceHistory,
    };
  }

  /**
   * Updates Subscription Plan Price atomically:
   * 1. Updates SubscriptionPlan.priceTrl
   * 2. Synchronizes active renewing subscriptions' nextRenewalPriceTrl (leaves currentPeriodPriceTrl intact)
   * 3. Records immutable PackagePriceHistory audit entry
   */
  async updateSubscriptionPrice(
    adminUser: { id: string; email: string },
    tier: SubscriptionTier,
    newPrice: number,
    reason?: string
  ) {
    if (newPrice < 0 || isNaN(newPrice) || !Number.isFinite(newPrice)) {
      throw new BadRequestException('Fiyat geçerli, sıfır veya sıfırdan büyük bir sayı olmalıdır.');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { tier },
    });

    if (!plan) {
      throw new NotFoundException(`"${tier}" abonelik planı bulunamadı.`);
    }

    const oldPrice = Number(plan.priceTrl);
    if (oldPrice === newPrice) {
      return {
        success: true,
        message: `Paket fiyatı zaten ₺${newPrice}. Değişiklik yapılmadı.`,
        oldPrice,
        newPrice,
        affectedSubscribersCount: 0,
      };
    }

    const now = new Date();
    const lifetimeThreshold = new Date('2040-01-01');

    // Find renewing paid subscriptions only (exclude lifetime admin grants)
    const activeSubs = await this.prisma.subscription.findMany({
      where: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { gt: now, lt: lifetimeThreshold },
      },
      include: {
        user: { select: { email: true, role: true } },
      },
    });

    const renewingPaidSubs = activeSubs.filter(
      (s) => s.user.role !== Role.ADMIN && !ADMIN_EMAILS.includes(s.user.email.toLowerCase())
    );

    const affectedIds = renewingPaidSubs.map((s) => s.id);

    // Atomic DB execution
    await this.prisma.$transaction(async (tx) => {
      // 1. Update SubscriptionPlan catalog price
      await tx.subscriptionPlan.update({
        where: { id: plan.id },
        data: { priceTrl: newPrice },
      });

      // 2. Update active paid subscriptions' nextRenewalPriceTrl
      if (affectedIds.length > 0) {
        await tx.subscription.updateMany({
          where: { id: { in: affectedIds } },
          data: { nextRenewalPriceTrl: newPrice },
        });
      }

      // 3. Log immutable Financial Audit Entry
      await tx.packagePriceHistory.create({
        data: {
          packageGroup: 'SUBSCRIPTION',
          packageCode: tier,
          packageName: plan.name,
          oldPrice,
          newPrice,
          currency: 'TRY',
          adminUserId: adminUser.id,
          adminEmail: adminUser.email || 'Admin',
          reason: reason || 'Admin panelinden fiyat güncellemesi',
          affectedSubscribersCount: affectedIds.length,
        },
      });
    });

    return {
      success: true,
      message: `${plan.name} fiyatı ₺${oldPrice} → ₺${newPrice} olarak güncellendi.`,
      tier,
      oldPrice,
      newPrice,
      affectedSubscribersCount: affectedIds.length,
    };
  }

  /**
   * Updates One-Time Buyer Package Price atomically:
   * 1. Updates BuyerPackagePlan.priceTrl in DB
   * 2. Logs immutable PackagePriceHistory audit entry
   */
  async updateBuyerPackagePrice(
    adminUser: { id: string; email: string },
    code: BuyerPackageCode,
    newPrice: number,
    reason?: string
  ) {
    if (newPrice <= 0 || isNaN(newPrice) || !Number.isFinite(newPrice)) {
      throw new BadRequestException('Alıcı paketi fiyatı sıfırdan büyük bir sayı olmalıdır.');
    }

    const plan = await this.prisma.buyerPackagePlan.findUnique({
      where: { code },
    });

    if (!plan) {
      throw new NotFoundException(`"${code}" alıcı paketi bulunamadı.`);
    }

    const oldPrice = plan.priceTrl;
    if (oldPrice === newPrice) {
      return {
        success: true,
        message: `Paket fiyatı zaten ₺${newPrice}. Değişiklik yapılmadı.`,
        oldPrice,
        newPrice,
      };
    }

    const config = BUYER_PACKAGES[code];

    await this.prisma.$transaction(async (tx) => {
      await tx.buyerPackagePlan.update({
        where: { id: plan.id },
        data: { priceTrl: newPrice },
      });

      await tx.packagePriceHistory.create({
        data: {
          packageGroup: 'BUYER_PACKAGE',
          packageCode: code,
          packageName: config?.name || code,
          oldPrice,
          newPrice,
          currency: plan.currency,
          adminUserId: adminUser.id,
          adminEmail: adminUser.email || 'Admin',
          reason: reason || 'Admin panelinden fiyat güncellemesi',
          affectedSubscribersCount: 0,
        },
      });
    });

    return {
      success: true,
      message: `${config?.name || code} fiyatı ₺${oldPrice} → ₺${newPrice} olarak güncellendi.`,
      code,
      oldPrice,
      newPrice,
    };
  }

  async getPriceHistory(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [total, history] = await Promise.all([
      this.prisma.packagePriceHistory.count(),
      this.prisma.packagePriceHistory.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      history,
    };
  }

  /**
   * Upgrades a user subscription by resolving price dynamically from DB.
   * Finalizes currentPeriodPriceTrl snapshot upon activation.
   */
  async upgradeUserSubscription(userId: string, tier: SubscriptionTier) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { tier } });
    if (!plan) {
      throw new BadRequestException('PRICING_UNAVAILABLE: Seçilen abonelik planı bulunamadı.');
    }

    const priceSnapshot = Number(plan.priceTrl);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const subscription = await this.prisma.$transaction(async (tx) => {
      // 1. Update user tier
      await tx.user.update({
        where: { id: userId },
        data: { subscriptionTier: tier },
      });

      // 2. Create or update subscription
      const sub = await tx.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodPriceTrl: priceSnapshot > 0 ? priceSnapshot : null,
          nextRenewalPriceTrl: priceSnapshot > 0 ? priceSnapshot : null,
          expiresAt,
        },
      });

      // 3. If paid, create initial SubscriptionPayment transaction snapshot
      if (priceSnapshot > 0) {
        await tx.subscriptionPayment.create({
          data: {
            subscriptionId: sub.id,
            userId,
            tier,
            amount: priceSnapshot,
            currency: 'TRY',
            billingPeriodStart: new Date(),
            billingPeriodEnd: expiresAt,
            paymentStatus: PromotionPaymentStatus.PAID,
            paymentProvider: 'DIRECT_CHECKOUT',
          },
        });
      }

      return sub;
    });

    return {
      success: true,
      message: `${plan.name} aboneliğiniz başarıyla başlatıldı.`,
      subscription,
    };
  }

  /**
   * Creates or retrieves an idempotent renewal payment attempt snapshot.
   */
  async createRenewalPaymentSnapshot(subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, user: true },
    });

    if (!sub || sub.status !== SubscriptionStatus.ACTIVE) {
      throw new NotFoundException('Aktif abonelik bulunamadı.');
    }

    // Exclude Admin Lifetime Grants from renewal charges
    if (sub.expiresAt > new Date('2040-01-01') || ADMIN_EMAILS.includes(sub.user.email.toLowerCase())) {
      return null;
    }

    const billingPeriodStart = sub.expiresAt;
    const billingPeriodEnd = new Date(sub.expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Check for existing snapshot for this exact period to prevent duplicate charges
    const existing = await this.prisma.subscriptionPayment.findUnique({
      where: {
        subscriptionId_billingPeriodStart_billingPeriodEnd: {
          subscriptionId,
          billingPeriodStart,
          billingPeriodEnd,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const targetAmount =
      sub.nextRenewalPriceTrl !== null && sub.nextRenewalPriceTrl !== undefined
        ? sub.nextRenewalPriceTrl
        : sub.plan.priceTrl;

    return this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
        userId: sub.userId,
        tier: sub.plan.tier,
        amount: targetAmount,
        currency: 'TRY',
        billingPeriodStart,
        billingPeriodEnd,
        paymentStatus: PromotionPaymentStatus.PENDING,
      },
    });
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

  async bulkGrantPackagesToUsers(
    adminUser: { id: string; email: string },
    dto: {
      targetUserIds: string[];
      packageGroup?: 'SUBSCRIPTION' | 'BUYER';
      tier?: SubscriptionTier;
      buyerPackageCode?: 'ALICI_MINI' | 'ALICI_PLUS' | 'ALICI_MAX';
      durationDays?: number;
      isUnlimited?: boolean;
      reasonCode: string;
      reason?: string;
      adminNote?: string;
      notifyUser?: boolean;
    }
  ) {
    const userIds = dto.targetUserIds || [];
    if (!userIds.length) throw new BadRequestException('En az 1 kullanıcı seçilmelidir.');

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{ userId: string; error: string }> = [];

    for (const targetUserId of userIds) {
      try {
        await this.grantPackageToUser(adminUser, targetUserId, {
          packageGroup: dto.packageGroup || 'SUBSCRIPTION',
          tier: dto.tier || SubscriptionTier.PROFESYONEL,
          buyerPackageCode: dto.buyerPackageCode,
          reasonCode: dto.reasonCode || 'ADMIN_GRANT',
          reason: dto.reason,
          notifyUser: dto.notifyUser ?? true,
        });

        if (dto.adminNote) {
          await this.prisma.adminUserNote.create({
            data: {
              userId: targetUserId,
              createdByAdminId: adminUser.id,
              adminEmail: adminUser.email || 'Admin',
              content: `Abonelik Grant Notu: ${dto.adminNote}`,
            },
          }).catch(() => null);
        }

        successCount++;
      } catch (err: any) {
        failureCount++;
        failures.push({ userId: targetUserId, error: err.message || 'Paket tanımlanamadı.' });
      }
    }

    return {
      total: userIds.length,
      successCount,
      failureCount,
      failures,
    };
  }

  async searchUsersForGrant(query: { q?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const q = (query.q || '').trim();

    const whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { customerNo: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where: whereClause }),
      this.prisma.user.findMany({
        where: whereClause,
        select: { id: true, customerNo: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true, subscriptionTier: true, isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedUsers = users.map((u) => {
      const yearMonth = u.createdAt ? `${new Date(u.createdAt).getFullYear().toString().slice(-2)}${(new Date(u.createdAt).getMonth() + 1).toString().padStart(2, '0')}` : '2607';
      const customerNo = u.customerNo || `TS-${yearMonth}-000001`;
      return {
        id: u.id,
        customerNo,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
        email: u.email,
        phone: u.phone || '—',
        subscriptionTier: u.subscriptionTier,
        packageName: u.subscriptionTier === 'PRO' ? 'Profesyonel Paket' : u.subscriptionTier === 'STANDARD' ? 'Yetkin Paket' : 'Tanışma Paketi',
        isActive: u.isActive,
        createdAt: u.createdAt,
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users: formattedUsers,
    };
  }
}
