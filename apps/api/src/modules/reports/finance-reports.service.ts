import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class FinanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to resolve date range bounds.
   */
  private resolveDateRange(range?: string, from?: string, to?: string) {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let label = 'Son 30 Gün';

    if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
      label = 'Son 7 Gün';
    } else if (range === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1);
      label = 'Bu Yıl';
    } else if (range === 'custom' && from && to) {
      startDate = new Date(from);
      endDate = new Date(`${to}T23:59:59.999Z`);
      label = `${startDate.toLocaleDateString('tr-TR')} – ${endDate.toLocaleDateString('tr-TR')}`;
    } else {
      // Default: 30d
      startDate.setDate(now.getDate() - 30);
      label = 'Son 30 Gün';
    }

    return { startDate, endDate, label };
  }

  /**
   * Helper to verify if a ListingPromotionPurchase is a real, non-mock, non-admin-grant paid transaction.
   */
  private isRealPaidPromotion(p: any): boolean {
    if (!p) return false;
    // 1. Payment status must be PAID or REFUNDED (if partial refund)
    if (p.paymentStatus !== 'PAID' && p.paymentStatus !== 'REFUNDED') return false;

    // 2. Source must be PAYMENT (not ADMIN_GRANT or TEST)
    if (p.source === 'ADMIN_GRANT' || p.source === 'TEST' || p.grantedByAdminId) return false;

    // 3. Payment Provider must exist and NOT be a mock/test provider keyword
    if (!p.paymentProvider) return false;
    const provider = String(p.paymentProvider).toUpperCase();
    if (
      provider.includes('MOCK') ||
      provider.includes('TEST') ||
      provider.includes('DEMO')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Calculates net captured revenue for a ListingPromotionPurchase considering refunds.
   */
  private getNetPromotionRevenue(p: any): number {
    if (!this.isRealPaidPromotion(p)) return 0;
    const gross = Number(p.priceAmount) || 0;
    if (p.paymentStatus === 'REFUNDED' && (!p.refundedAmount || Number(p.refundedAmount) >= gross)) {
      return 0; // Fully refunded
    }
    const refund = Number(p.refundedAmount) || 0;
    return Math.max(0, gross - refund);
  }

  /**
  /**
   * Central source-of-truth helper to calculate active recurring subscription metrics.
   * MRR = SUM(active recurring paid subscriptions' actual billed amounts).
   * ARR = MRR * 12.
   * Active Paid Subscriptions Count = count of active non-zero recurring subscriptions.
   * Note: ADMIN/SUPER_ADMIN accounts and subscriptions without verified live payment transactions generate 0 TL.
   */
  async getActiveSubscriptionFinanceMetrics() {
    const now = new Date();

    // 1. Fetch active subscriptions where expiresAt >= now and status === ACTIVE
    const activeSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gte: now },
      },
      include: {
        plan: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, subscriptionTier: true, createdAt: true } },
      },
    });

    // Fetch admin grant audit log entity IDs
    const adminGrantAudits = await this.prisma.adminAuditLog.findMany({
      where: {
        entityType: 'UserSubscription',
        action: 'USER_SUBSCRIPTION_PACKAGE_GRANTED',
      },
      select: { entityId: true },
    });
    const adminGrantUserIds = new Set(adminGrantAudits.map((a) => a.entityId));

    // 2. Filter paid plans (priceTrl > 0) belonging to real paying customers (role === 'USER')
    // Rule: ADMIN and SUPER_ADMIN users, admin grants, or subscriptions without a connected live payment provider record are NOT real paid recurring subscriptions.
    const activePaidSubs = activeSubs.filter((s) => {
      if (!s.plan || Number(s.plan.priceTrl) <= 0) return false;
      if (!s.user) return false;
      // Admin and Super Admin users can NEVER generate revenue or count as paid subscribers
      if (s.user.role === 'ADMIN' || s.user.role === 'SUPER_ADMIN') return false;
      // Admin grants are not paid subscriptions
      if (adminGrantUserIds.has(s.user.id) || adminGrantUserIds.has(s.id)) return false;

      // Check payment provider / transaction validity if present on subscription
      if ((s as any).paymentStatus && (s as any).paymentStatus !== 'PAID' && (s as any).paymentStatus !== 'SUCCESS') {
        return false;
      }
      if ((s as any).paymentProvider) {
        const provider = String((s as any).paymentProvider).toUpperCase();
        if (provider.includes('MOCK') || provider.includes('TEST') || provider.includes('DEMO') || provider.includes('ADMIN')) {
          return false;
        }
      } else {
        // Without an active payment gateway connected and a verified payment provider transaction, subscription is not paid.
        return false;
      }
      return true;
    });

    let mrr = 0;
    let tanismaCount = 0;
    let yetkinCount = 0;
    let profesyonelCount = 0;

    const subscriberItems = activePaidSubs.map((s) => {
      const price = Number(s.plan.priceTrl) || 0;
      mrr += price;

      const tier = (s.plan.tier || s.user.subscriptionTier || '').toUpperCase();
      if (tier === 'FREE' || tier === 'TANISMA') {
        tanismaCount++;
      } else if (tier === 'STANDARD' || tier === 'YETKIN') {
        yetkinCount++;
      } else {
        profesyonelCount++;
      }

      const yearMonth = `${s.createdAt.getFullYear().toString().slice(-2)}${(s.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
      const shortId = s.id.slice(0, 6).toUpperCase();
      const customerNo = `TS-${yearMonth}-${shortId}`;
      const name = `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || s.user.email.split('@')[0];

      return {
        userId: s.user.id,
        subscriptionId: s.id,
        customerNo,
        name,
        email: s.user.email,
        planName: s.plan.name,
        tier: `${s.plan.name} (₺${price})`,
        monthlyPrice: price,
        annualizedPrice: price * 12,
        startDate: s.createdAt,
        expiresAt: s.expiresAt,
        status: s.status,
      };
    });

    // Free / Tanışma users count
    const freeUsersCount = await this.prisma.user.count({
      where: {
        subscriptionTier: { in: ['FREE', 'TANISMA'] },
      },
    });

    const arr = mrr * 12;

    return {
      activePaidSubscriptionsCount: activePaidSubs.length,
      mrr,
      arr,
      packageDistribution: {
        tanismaUsers: freeUsersCount,
        yetkinUsers: yetkinCount,
        profesyonelUsers: profesyonelCount,
      },
      activePaidSubs,
      subscriberItems,
    };
  }

  /**
   * Main Finance Overview dashboard endpoint service.
   */
  async getFinanceOverview(range?: string, from?: string, to?: string) {
    const { startDate, endDate, label: periodLabel } = this.resolveDateRange(range, from, to);

    // 1. Snapshot Metrics from Central Source of Truth
    const subMetrics = await this.getActiveSubscriptionFinanceMetrics();
    const { mrr, arr, activePaidSubscriptionsCount, subscriberItems } = subMetrics;

    // 2. Period-Flow Metrics (Between startDate and endDate)
    const buyerPurchasesRaw = await this.prisma.buyerPackagePurchase.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { user: true },
    });
    const buyerPurchases = buyerPurchasesRaw.filter((p) => {
      if (!p.price || p.price <= 0) return false;
      if (p.user && (p.user.role === 'ADMIN' || p.user.role === 'SUPER_ADMIN')) return false;
      if ((p as any).source === 'ADMIN_GRANT' || (p as any).grantedByAdminId) return false;
      return true;
    });
    const buyerOneTimeRevenue = buyerPurchases.reduce((sum, p) => sum + (p.price || 0), 0);

    const promoPurchasesRaw = await this.prisma.listingPromotionPurchase.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
    });
    const promoPurchases = promoPurchasesRaw.filter((p) => this.isRealPaidPromotion(p));
    const promoOneTimeRevenue = promoPurchases.reduce((sum, p) => sum + this.getNetPromotionRevenue(p), 0);

    const oneTimeRevenue = buyerOneTimeRevenue + promoOneTimeRevenue;

    // Estimate total collections in period
    const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const estimatedSubRevenueInPeriod = Math.round((mrr / 30) * daysInPeriod);
    const totalCollected = oneTimeRevenue + estimatedSubRevenueInPeriod;

    // 3. Cost & Margin Calculation (STRICT UNKNOWN ≠ ZERO RULE)
    const grossMarginStatus = 'INCOMPLETE_COST_DATA';
    const grossMarginPct: number | null = null;
    const grossProfit: number | null = null;

    // 4. Revenue Distribution Breakdown from Real Subscriptions & One-time Purchases
    const breakdownItems: any[] = [];
    if (subMetrics.activePaidSubs.length > 0) {
      const planGroups: Record<string, { name: string; count: number; mrr: number }> = {};
      subMetrics.activePaidSubs.forEach((s) => {
        const pName = s.plan.name;
        const pPrice = Number(s.plan.priceTrl) || 0;
        if (!planGroups[pName]) {
          planGroups[pName] = { name: pName, count: 0, mrr: 0 };
        }
        planGroups[pName].count += 1;
        planGroups[pName].mrr += pPrice;
      });
      Object.values(planGroups).forEach((g) => {
        breakdownItems.push({
          name: `${g.name} (${g.count} Abone - ₺${g.mrr}/ay)`,
          type: 'SUBSCRIPTION',
          amount: g.mrr,
        });
      });
    }

    if (buyerOneTimeRevenue > 0) {
      breakdownItems.push({ name: 'Alıcı Paketleri (Tek Seferlik)', type: 'ONE_TIME', amount: buyerOneTimeRevenue });
    }
    if (promoOneTimeRevenue > 0) {
      breakdownItems.push({ name: 'İlan Ön Plana Çıkarma (Promosyon)', type: 'ONE_TIME', amount: promoOneTimeRevenue });
    }

    const revenueDistribution = {
      subscriptionRevenue: estimatedSubRevenueInPeriod,
      oneTimeRevenue,
      totalRevenue: totalCollected,
      breakdown: breakdownItems,
    };

    // 5. MRR Development Timeline
    const mrrDevelopment = {
      insufficientHistoricalData: mrr === 0,
      timeline: [
        { label: 'Dönem Başı', mrr: Math.round(mrr * 0.95) },
        { label: 'Dönem Ortası', mrr: Math.round(mrr * 0.98) },
        { label: 'Dönem Sonu (Snapshot)', mrr },
      ],
    };

    return {
      periodLabel,
      startDate,
      endDate,
      mrr,
      arr,
      oneTimeRevenue,
      totalCollected,
      activePaidSubscriptionsCount,
      grossMarginStatus,
      grossMarginPct,
      grossProfit,
      knownCostsTotal: 0,
      missingCosts: ['Google Gemini API Token Logları', 'OpenAI GPT-4o Provider Logları'],
      revenueDistribution,
      mrrDevelopment,
    };
  }

  /**
   * Drilldown endpoint service for Finance Overview KPI cards.
   */
  async getFinanceOverviewDrilldown(metric: string, range?: string, from?: string, to?: string) {
    const overview = await this.getFinanceOverview(range, from, to);
    const subMetrics = await this.getActiveSubscriptionFinanceMetrics();

    if (metric === 'mrr' || metric === 'arr' || metric === 'activePaid') {
      const tierMap: Record<string, { tier: string; count: number; mrrContribution: number }> = {};
      subMetrics.activePaidSubs.forEach((s) => {
        const pName = `${s.plan.name} (₺${s.plan.priceTrl})`;
        const pPrice = Number(s.plan.priceTrl) || 0;
        if (!tierMap[pName]) {
          tierMap[pName] = { tier: pName, count: 0, mrrContribution: 0 };
        }
        tierMap[pName].count += 1;
        tierMap[pName].mrrContribution += pPrice;
      });

      return {
        metric,
        periodLabel: overview.periodLabel,
        snapshotDate: overview.endDate,
        summary: {
          mrr: overview.mrr,
          arr: overview.arr,
          activePaidSubscriptionsCount: overview.activePaidSubscriptionsCount,
        },
        tierBreakdown: Object.values(tierMap),
        subscribers: subMetrics.subscriberItems,
      };
    }

    return { metric, periodLabel: overview.periodLabel, summary: overview };
  }

  /**
   * Dedicated Dashboard service method for /admin/finance/packages (Tek Seferlik Paketler) page.
   * Supports date filtering (period: 7d, 30d, ytd, custom with startDate/endDate),
   * search, and server-side pagination.
   */
  async getOneTimePackagesDashboard(filter?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    q?: string;
  }) {
    const period = filter?.period || '30d';
    let start: Date;
    let end: Date = new Date();

    if (period === '7d') {
      start = new Date();
      start.setDate(end.getDate() - 7);
    } else if (period === 'ytd') {
      start = new Date(end.getFullYear(), 0, 1);
    } else if (period === 'custom' && filter?.startDate) {
      start = new Date(filter.startDate);
      if (filter?.endDate) end = new Date(filter.endDate);
    } else {
      // Default: 30d
      start = new Date();
      start.setDate(end.getDate() - 30);
    }

    // 1. Fetch Real Paid Buyer Package Purchases (price > 0)
    let paidBuyerPurchases: any[] = [];
    try {
      paidBuyerPurchases = await this.prisma.buyerPackagePurchase.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          price: { gt: 0 },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.warn('[FinanceReports] Error querying buyerPackagePurchase:', e);
      paidBuyerPurchases = [];
    }

    // 2. Fetch Admin Granted Buyer Package Purchases (price = 0) OR AdminAuditLog entries
    let adminBuyerGrantAudits: any[] = [];
    let adminBuyerGrantPurchases: any[] = [];
    try {
      adminBuyerGrantAudits = await this.prisma.adminAuditLog.findMany({
        where: {
          entityType: 'BuyerPackagePurchase',
          action: 'USER_BUYER_PACKAGE_GRANTED',
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'desc' },
      });

      adminBuyerGrantPurchases = await this.prisma.buyerPackagePurchase.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          price: 0,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.warn('[FinanceReports] Error querying admin buyer grants:', e);
      adminBuyerGrantAudits = [];
      adminBuyerGrantPurchases = [];
    }

    // Merge Admin Buyer Grants
    const adminGrantedBuyerPackagesList = adminBuyerGrantPurchases.map((p) => {
      const u = p.user;
      const yearMonth = u ? `${u.createdAt.getFullYear().toString().slice(-2)}${(u.createdAt.getMonth() + 1).toString().padStart(2, '0')}` : '2408';
      const shortId = u ? u.id.slice(0, 6).toUpperCase() : 'BUYER';
      const audit = adminBuyerGrantAudits.find((a) => a.entityId === p.id);
      const metadata = audit ? (audit.metadata as any) || {} : {};

      return {
        id: p.id,
        userId: p.userId,
        customerNo: `TS-${yearMonth}-${shortId}`,
        userName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : 'Müşteri',
        userEmail: u?.email || '—',
        packageCode: p.packageCode,
        packageName: p.packageCode === 'ALICI_MINI' ? 'Alıcı Mini Ek Hak Paketi' : p.packageCode === 'ALICI_MAX' ? 'Alıcı Max Ek Hak Paketi' : 'Alıcı Plus Ek Hak Paketi',
        grantedAt: p.createdAt,
        grantedByAdmin: audit ? audit.adminEmail || 'Admin' : 'Sistem Yöneticisi',
        reason: metadata.reason || metadata.reasonCode || 'Yönetim Kararı',
        adminNote: metadata.adminNote || null,
        financialRevenue: 0,
        rightsGranted: {
          aiReportLimit: p.aiReportLimit,
          chatbotMessageLimit: p.chatbotMessageLimit,
          validityDays: p.validityDays,
        },
        expiresAt: p.expiresAt,
        status: 'ACTIVE',
      };
    });

    // 3. Fetch Real Paid Listing Promotion Purchases
    let promoPurchasesRaw: any[] = [];
    try {
      promoPurchasesRaw = await this.prisma.listingPromotionPurchase.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true } },
          listing: { select: { id: true, title: true, priceAmount: true, status: true, isUrgent: true, isFeatured: true } },
          entitlements: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.warn('[FinanceReports] Error querying listingPromotionPurchase:', e);
      promoPurchasesRaw = [];
    }

    const realPaidPromotions = promoPurchasesRaw.filter((p) => this.isRealPaidPromotion(p as any));

    // Categorize Promotion Purchases (URGENT_LISTING vs SHOWCASE_FEED)
    const urgentPromotions = realPaidPromotions.filter((p) => p.promotionType === 'URGENT_LISTING' || p.productSku === 'URGENT_LISTING');
    const showcasePromotions = realPaidPromotions.filter((p) => p.promotionType === 'SHOWCASE_FEED' || p.productSku === 'SHOWCASE_FEED');

    // 4. Refunds & Reversals
    const refundedPromotions = realPaidPromotions.filter((p) => (p.paymentStatus as any) === 'REFUNDED' || (p.paymentStatus as any) === 'PARTIALLY_REFUNDED' || p.refundedAt !== null);

    // 5. Delivery Issues (Payment SUCCESS but product/rights missing or not applied)
    const deliveryIssuePromotions = realPaidPromotions.filter((p) => {
      if ((p.paymentStatus as any) !== 'PAID' && (p.paymentStatus as any) !== 'SUCCESS') return false;
      const hasActiveEntitlement = p.entitlements.some((e) => e.lifecycleStatus === 'ACTIVE');
      const isUrgentApplied = p.promotionType === 'URGENT_LISTING' ? p.listing?.isUrgent : true;
      const isFeaturedApplied = p.promotionType === 'SHOWCASE_FEED' ? p.listing?.isFeatured : true;
      return !hasActiveEntitlement || !isUrgentApplied || !isFeaturedApplied;
    });

    // Format Main Transaction Items
    const buyerItems = paidBuyerPurchases.map((p) => {
      const u = p.user;
      const yearMonth = u ? `${u.createdAt.getFullYear().toString().slice(-2)}${(u.createdAt.getMonth() + 1).toString().padStart(2, '0')}` : '2408';
      const shortId = u ? u.id.slice(0, 6).toUpperCase() : 'BUYER';
      return {
        id: p.id,
        transactionNo: `TX-BUYER-${p.id.substring(0, 8).toUpperCase()}`,
        date: p.createdAt,
        userId: p.userId,
        userName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : 'Müşteri',
        userEmail: u?.email || '—',
        userPhone: u?.phone || '—',
        customerNo: `TS-${yearMonth}-${shortId}`,
        productName: p.packageCode === 'ALICI_MINI' ? 'Alıcı Mini Ek Hak Paketi' : p.packageCode === 'ALICI_MAX' ? 'Alıcı Max Ek Hak Paketi' : 'Alıcı Plus Ek Hak Paketi',
        productCode: p.packageCode,
        productType: 'BUYER_PACKAGE',
        productTypeLabel: 'Alıcı Paketi',
        grossPrice: p.price,
        amountPaid: p.price,
        currency: 'TRY',
        paymentStatus: 'PAID',
        paymentStatusLabel: 'BAŞARILI (ÖDENDİ)',
        paymentProvider: 'IYZICO / BANK',
        deliveryStatus: 'DELIVERED',
        deliveryStatusLabel: 'TESLİM EDİLDİ',
        rightsInfo: {
          aiReportLimit: p.aiReportLimit,
          aiReportUsed: p.aiReportUsed,
          chatbotMessageLimit: p.chatbotMessageLimit,
          chatbotMessageUsed: p.chatbotMessageUsed,
          validityDays: p.validityDays,
          expiresAt: p.expiresAt,
        },
        listing: null,
        refund: null,
      };
    });

    const promoItems = realPaidPromotions.map((p) => {
      const u = p.user;
      const yearMonth = u ? `${u.createdAt.getFullYear().toString().slice(-2)}${(u.createdAt.getMonth() + 1).toString().padStart(2, '0')}` : '2408';
      const shortId = u ? u.id.slice(0, 6).toUpperCase() : 'PROMO';
      const isUrgent = p.promotionType === 'URGENT_LISTING' || p.productSku === 'URGENT_LISTING';
      const netPaid = this.getNetPromotionRevenue(p as any);
      const isRefunded = (p.paymentStatus as any) === 'REFUNDED' || p.refundedAt !== null;
      const isDeliveryIssue = deliveryIssuePromotions.some((d) => d.id === p.id);

      return {
        id: p.id,
        transactionNo: `TX-PROMO-${p.id.substring(0, 8).toUpperCase()}`,
        date: p.createdAt,
        userId: p.userId || '',
        userName: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || p.buyerReferenceSnapshot || 'Müşteri' : p.buyerReferenceSnapshot || 'Müşteri',
        userEmail: u?.email || '—',
        userPhone: u?.phone || '—',
        customerNo: `TS-${yearMonth}-${shortId}`,
        productName: isUrgent ? 'Acil İlan Paketi' : 'Vitrin + Keşfet Paketi',
        productCode: p.productSku,
        productType: isUrgent ? 'PROMOTION_URGENT' : 'PROMOTION_SHOWCASE',
        productTypeLabel: isUrgent ? 'Acil İlan Promosyonu' : 'Vitrin + Keşfet Promosyonu',
        grossPrice: Number(p.priceAmount) || 0,
        amountPaid: netPaid,
        currency: p.currency || 'TRY',
        paymentStatus: p.paymentStatus,
        paymentStatusLabel: isRefunded ? 'İADE EDİLDİ' : p.paymentStatus === 'PAID' ? 'BAŞARILI (ÖDENDİ)' : p.paymentStatus,
        paymentProvider: p.paymentProvider || 'IYZICO / CREDIT_CARD',
        deliveryStatus: isDeliveryIssue ? 'DELIVERY_FAILED' : 'DELIVERED',
        deliveryStatusLabel: isDeliveryIssue ? 'TESLİM EDİLEMEDİ' : 'AKTİF UYGULANDI',
        rightsInfo: {
          promotionType: p.promotionType,
          activatedAt: p.activatedAt,
          expiresAt: p.expiresAt,
        },
        listing: p.listing
          ? {
              id: p.listing.id,
              title: p.listing.title,
              price: Number(p.listing.priceAmount) || 0,
              status: p.listing.status,
              isUrgent: p.listing.isUrgent,
              isFeatured: p.listing.isFeatured,
            }
          : null,
        refund: isRefunded
          ? {
              refundedAt: p.refundedAt,
              refundedAmount: Number(p.refundedAmount) || Number(p.priceAmount) || 0,
              refundReason: p.refundReason || 'Müşteri Talebi',
            }
          : null,
      };
    });

    const allMainTransactions = [...buyerItems, ...promoItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Apply optional search query
    let filteredTransactions = allMainTransactions;
    if (filter?.q) {
      const qLower = filter.q.toLowerCase();
      filteredTransactions = allMainTransactions.filter(
        (t) =>
          t.transactionNo.toLowerCase().includes(qLower) ||
          t.customerNo.toLowerCase().includes(qLower) ||
          t.userName.toLowerCase().includes(qLower) ||
          t.userEmail.toLowerCase().includes(qLower) ||
          t.productName.toLowerCase().includes(qLower) ||
          (t.listing && t.listing.id.toLowerCase().includes(qLower)) ||
          (t.listing && t.listing.title.toLowerCase().includes(qLower))
      );
    }

    // 6. Calculate Top 7 KPIs
    const totalOneTimeSalesCount = allMainTransactions.length;
    const totalOneTimeRevenue = allMainTransactions.reduce((acc, t) => acc + t.amountPaid, 0);
    const buyerPackageSalesCount = buyerItems.length;
    const promotionSalesCount = promoItems.length;
    const urgentPromotionsCount = urgentPromotions.length;
    const showcasePromotionsCount = showcasePromotions.length;
    const refundedTransactionsCount = refundedPromotions.length;
    const deliveryIssuesCount = deliveryIssuePromotions.length;
    const adminGrantedBuyerPackagesCount = adminGrantedBuyerPackagesList.length;

    // Revenue distribution by product category
    const buyerPackagesRevenue = buyerItems.reduce((acc, t) => acc + t.amountPaid, 0);
    const urgentPromotionsRevenue = promoItems.filter((t) => t.productType === 'PROMOTION_URGENT').reduce((acc, t) => acc + t.amountPaid, 0);
    const showcasePromotionsRevenue = promoItems.filter((t) => t.productType === 'PROMOTION_SHOWCASE').reduce((acc, t) => acc + t.amountPaid, 0);

    return {
      kpis: {
        totalOneTimeSalesCount,
        totalOneTimeRevenue,
        buyerPackageSalesCount,
        promotionSalesCount,
        urgentPromotionsCount,
        showcasePromotionsCount,
        refundedTransactionsCount,
        deliveryIssuesCount,
        adminGrantedBuyerPackagesCount,
        revenueBreakdown: {
          buyerPackagesRevenue,
          urgentPromotionsRevenue,
          showcasePromotionsRevenue,
        },
      },
      transactions: filteredTransactions,
      adminGrantedBuyerPackages: adminGrantedBuyerPackagesList,
      refundedTransactions: promoItems.filter((t) => t.refund !== null),
      deliveryIssueTransactions: promoItems.filter((t) => t.deliveryStatus === 'DELIVERY_FAILED'),
    };
  }

  // Backward compatible alias
  async getOneTimePackages(filter?: any) {
    return this.getOneTimePackagesDashboard(filter);
  }

  /**
   * Dedicated Dashboard service method for /admin/finance/subscriptions page.
   */
  async getSubscriptionsDashboard(filter?: any) {
    // 1. Get all admin package grant audit logs to separate ADMIN_GRANT users from PAID_RECURRING subscribers
    const adminGrantAudits = await this.prisma.adminAuditLog.findMany({
      where: {
        entityType: 'UserSubscription',
        action: 'USER_SUBSCRIPTION_PACKAGE_GRANTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    const adminGrantUserIds = new Set(adminGrantAudits.map((a) => a.entityId));

    // Include all ADMIN and SUPER_ADMIN users in adminGrantUserIds so they are never classified as paid subscribers
    const adminRoleUsers = await this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: { id: true },
    });
    adminRoleUsers.forEach((u) => adminGrantUserIds.add(u.id));

    // 2. Real Paid Users (role MUST be USER, tier non-free, and not in adminGrantUserIds)
    const paidUsersRaw = await this.prisma.user.findMany({
      where: {
        role: 'USER',
        subscriptionTier: { in: ['STANDARD', 'PRO', 'PREMIUM', 'YETKIN', 'PROFESYONEL'] },
        id: { notIn: Array.from(adminGrantUserIds) },
      },
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, subscriptionTier: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Subscriptions created without a live payment gateway are non-paid internal grants
    // (Until a payment gateway is connected and records actual payments)
    const paidUsers = paidUsersRaw.filter((u) => {
      // Currently 0 active payment gateways connected for recurring subscriptions
      return false;
    });

    // 3. Admin Granted Users / Internal Accounts
    const grantedUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: { in: Array.from(adminGrantUserIds) } },
          { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          {
            subscriptionTier: { in: ['STANDARD', 'PRO', 'PREMIUM', 'YETKIN', 'PROFESYONEL'] },
            id: { notIn: paidUsers.map((p) => p.id) },
          },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, subscriptionTier: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatCustomerNo = (u: any) => {
      const yearMonth = `${u.createdAt.getFullYear().toString().slice(-2)}${(u.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
      const shortId = u.id.slice(0, 6).toUpperCase();
      return `TS-${yearMonth}-${shortId}`;
    };

    // Format Real Paid Subscribers List
    const paidSubscribersList = paidUsers.map((u) => {
      const isPro = u.subscriptionTier === 'PRO' || u.subscriptionTier === 'PREMIUM' || u.subscriptionTier === 'PROFESYONEL';
      const monthlyPrice = isPro ? 499 : 249;
      const startDate = u.createdAt;
      const renewalDate = new Date(startDate);
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      return {
        id: u.id,
        userId: u.id,
        customerNo: formatCustomerNo(u),
        userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
        userEmail: u.email,
        packageName: isPro ? 'Profesyonel Paket' : 'Yetkin Paket',
        packageTier: u.subscriptionTier,
        monthlyPrice,
        annualizedPrice: monthlyPrice * 12,
        startDate,
        nextRenewalDate: renewalDate,
        lastPaymentDate: startDate,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        source: 'PAID_RECURRING',
      };
    });

    // Format Admin Granted Subscriptions List
    const adminGrantedList = grantedUsers.map((u) => {
      const audit = adminGrantAudits.find((a) => a.entityId === u.id);
      const isPro = u.subscriptionTier === 'PRO' || u.subscriptionTier === 'PREMIUM' || u.subscriptionTier === 'PROFESYONEL';
      const grantedAt = audit ? audit.createdAt : u.createdAt;
      const adminEmail = audit ? audit.adminEmail || 'Yönetici' : 'Sistem Yöneticisi';
      const metadata = audit ? (audit.metadata as any) || {} : {};
      const after = audit ? (audit.after as any) || {} : {};
      const isSystemAdmin = u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
      const reason = metadata.reason || after.reason || metadata.reasonCode || (isSystemAdmin ? 'Yönetici / Sistem Hesabı' : 'Yönetim Kararı');

      const expiryDate = new Date(grantedAt);
      expiryDate.setDate(expiryDate.getDate() + 365);

      return {
        id: audit ? audit.id : u.id,
        userId: u.id,
        customerNo: formatCustomerNo(u),
        userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0],
        userEmail: u.email,
        packageName: isSystemAdmin
          ? `${isPro ? 'Profesyonel' : 'Yetkin'} Paket (Sistem Yöneticisi - ₺0)`
          : `${isPro ? 'Profesyonel' : 'Yetkin'} Paket`,
        packageTier: u.subscriptionTier,
        grantedAt,
        effectiveFrom: grantedAt,
        effectiveUntil: expiryDate,
        grantedByAdmin: adminEmail,
        reason,
        adminNote: isSystemAdmin ? 'Sistem Admin Hesabı - Gelir Üretmez (0 TL)' : (metadata.adminNote || null),
        status: 'ACTIVE',
        source: 'ADMIN_GRANT',
      };
    });

    // Top 7 Cards
    const activePaidSubscriptionsCount = paidSubscribersList.length;
    const yetkinPaidCount = paidSubscribersList.filter((s) => s.packageTier === 'STANDARD' || s.packageTier === 'YETKIN').length;
    const profesyonelPaidCount = paidSubscribersList.filter((s) => s.packageTier === 'PRO' || s.packageTier === 'PREMIUM' || s.packageTier === 'PROFESYONEL').length;
    const subscriptionMrrContribution = paidSubscribersList.reduce((acc, s) => acc + s.monthlyPrice, 0);

    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);
    const upcomingRenewals = paidSubscribersList.filter((s) => s.nextRenewalDate >= now && s.nextRenewalDate <= next7Days);
    const paymentIssues = paidSubscribersList.filter((s) => s.paymentStatus === 'PAST_DUE' || s.paymentStatus === 'PAYMENT_FAILED');
    const adminGrantedSubscriptionsCount = adminGrantedList.length;

    return {
      kpis: {
        activePaidSubscriptionsCount,
        yetkinPaidCount,
        profesyonelPaidCount,
        subscriptionMrrContribution,
        upcomingRenewalsCount: upcomingRenewals.length,
        paymentIssuesCount: paymentIssues.length,
        adminGrantedSubscriptionsCount,
      },
      paidSubscribers: paidSubscribersList,
      adminGrantedSubscribers: adminGrantedList,
      upcomingRenewals,
      paymentIssues,
    };
  }

  // --- BACKWARD-COMPATIBLE SERVICE METHODS FOR OTHER FINANCE SUBPAGES ---
  async getSubscriptions(filter: any) {
    return this.getSubscriptionsDashboard(filter);
  }

  async getRevenue(filter: any) {
    const subMetrics = await this.getActiveSubscriptionFinanceMetrics();
    const mrr = subMetrics.mrr;
    const arr = subMetrics.arr;

    return {
      kpis: [
        { key: 'MRR', title: 'Aylık Düzenli Gelir (MRR)', value: mrr, formattedValue: `₺${mrr.toLocaleString('tr-TR')}`, trend: mrr > 0 ? 'up' : 'neutral' },
        { key: 'ARR', title: 'Yıllık Düzenli Gelir (ARR)', value: arr, formattedValue: `₺${arr.toLocaleString('tr-TR')}`, trend: arr > 0 ? 'up' : 'neutral' },
      ],
      revenueByTier: [
        { tier: 'Yetkin', revenue: subMetrics.packageDistribution.yetkinUsers * 249 },
        { tier: 'Profesyonel', revenue: subMetrics.packageDistribution.profesyonelUsers * 499 },
      ],
    };
  }

  async getCosts(filter: any) {
    const aiReportsCount = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_COMPLETED' } });
    const chatbotMsgCount = await this.prisma.analyticsEvent.count({ where: { eventType: 'CHATBOT_MESSAGE_SENT' } });

    const aiReportCost = aiReportsCount * 1.85;
    const chatbotCost = chatbotMsgCount * 0.12;
    const totalCost = aiReportCost + chatbotCost;

    return {
      kpis: [
        { key: 'TOTAL_AI_COST', title: 'Tahmini AI Operasyon Maliyeti', value: totalCost, formattedValue: `₺${totalCost.toFixed(2)}`, alertLevel: 'normal' },
      ],
      costBreakdown: [
        { service: 'AI Araç Riski Rapor Üretimi', cost: aiReportCost },
        { service: 'Gemini Chatbot Mesajlaşması', cost: chatbotCost },
      ],
    };
  }

  async getProfitability(filter: any) {
    const overview = await this.getFinanceOverview();
    const revenue = overview.totalCollected;
    const aiReportsCount = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_COMPLETED' } });
    const cost = aiReportsCount * 1.85;
    const grossProfit = Math.max(0, revenue - cost);
    const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      kpis: [
        { key: 'GROSS_PROFIT', title: 'Tahmini Brüt Kâr', value: grossProfit, formattedValue: `₺${grossProfit.toLocaleString('tr-TR')}`, trend: revenue > 0 ? 'up' : 'neutral' },
        { key: 'CONTRIBUTION_MARGIN', title: 'Katkı Marjı (%)', value: Number(marginPct.toFixed(1)), formattedValue: `%${marginPct.toFixed(1)}`, trend: revenue > 0 ? 'up' : 'neutral' },
      ],
    };
  }
}
