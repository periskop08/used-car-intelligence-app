import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier } from '@prisma/client';

@Injectable()
export class ReportsOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveOverview(filter: any) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
    const last7DaysStart = new Date(todayStart.getTime() - 7 * 24 * 3600 * 1000);
    const last30DaysStart = new Date(todayStart.getTime() - 30 * 24 * 3600 * 1000);

    const [
      totalUsers,
      todayUsers,
      yesterdayUsers,
      last7DaysUsers,
      last30DaysUsers,
      tanismaUsers,
      yetkinUsers,
      profesyonelUsers,
      activePaidSubs,
      todayAiReports,
      todayComparisons,
      todayListings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last7DaysStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: last30DaysStart } } }),
      this.prisma.user.count({ where: { subscriptionTier: SubscriptionTier.FREE } }),
      this.prisma.user.count({ where: { subscriptionTier: SubscriptionTier.STANDARD } }),
      this.prisma.user.count({ where: { subscriptionTier: SubscriptionTier.PRO } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_COMPLETED', occurredAt: { gte: todayStart } } }),
      this.prisma.analyticsEvent.count({ where: { eventType: 'COMPARISON_CREATED', occurredAt: { gte: todayStart } } }),
      this.prisma.clubPost.count({ where: { createdAt: { gte: todayStart } } }),
    ]);

    // Financial estimations (Decimal precision)
    const mrr = (yetkinUsers * 249) + (profesyonelUsers * 499);
    const arr = mrr * 12;
    const estAiCost = (todayAiReports * 1.85);
    const grossMarginPct = mrr > 0 ? ((mrr - estAiCost) / mrr) * 100 : 0;

    return {
      kpis: [
        {
          key: 'TOTAL_USERS',
          title: 'Toplam Kayıtlı Kullanıcı',
          value: totalUsers,
          previousValue: totalUsers - last30DaysUsers,
          changePercentage: totalUsers > 0 ? Number(((last30DaysUsers / totalUsers) * 100).toFixed(1)) : 0,
          trend: 'up',
          alertLevel: 'normal',
          drilldownKey: 'USER_LIST',
          drilldownParams: {},
        },
        {
          key: 'TODAY_NEW_USERS',
          title: 'Bugün Yeni Kayıt',
          value: todayUsers,
          previousValue: yesterdayUsers,
          changePercentage: yesterdayUsers > 0 ? Number((((todayUsers - yesterdayUsers) / yesterdayUsers) * 100).toFixed(1)) : 0,
          trend: todayUsers >= yesterdayUsers ? 'up' : 'down',
          alertLevel: 'normal',
          drilldownKey: 'USER_LIST',
          drilldownParams: { period: 'TODAY' },
        },
        {
          key: 'ACTIVE_PAID_SUBS',
          title: 'Aktif Ücretli Abonelik',
          value: activePaidSubs,
          previousValue: activePaidSubs,
          changePercentage: 0,
          trend: 'neutral',
          alertLevel: 'normal',
          drilldownKey: 'SUBSCRIPTION_LIST',
          drilldownParams: { status: 'ACTIVE' },
        },
        {
          key: 'MRR',
          title: 'Aylık Düzenli Gelir (MRR)',
          value: mrr,
          formattedValue: `₺${mrr.toLocaleString('tr-TR')}`,
          trend: 'up',
          alertLevel: 'normal',
          drilldownKey: 'REVENUE_DETAILS',
          drilldownParams: {},
        },
        {
          key: 'ARR',
          title: 'Yıllık Düzenli Gelir (ARR)',
          value: arr,
          formattedValue: `₺${arr.toLocaleString('tr-TR')}`,
          trend: 'up',
          alertLevel: 'normal',
          drilldownKey: 'REVENUE_DETAILS',
          drilldownParams: {},
        },
        {
          key: 'TODAY_AI_REPORTS',
          title: 'Bugün Oluşturulan AI Raporu',
          value: todayAiReports,
          trend: 'up',
          alertLevel: 'normal',
          drilldownKey: 'AI_REPORT_LIST',
          drilldownParams: { period: 'TODAY' },
        },
      ],
      userMetrics: {
        totalUsers,
        todayUsers,
        yesterdayUsers,
        last7DaysUsers,
        last30DaysUsers,
        inactive30Days: 0,
        registeredNoAction: 0,
      },
      packageDistribution: {
        tanismaUsers,
        yetkinUsers,
        profesyonelUsers,
        activePaidSubs,
      },
      financialSummary: {
        mrr,
        arr,
        estAiCost,
        grossMarginPct: Number(grossMarginPct.toFixed(1)),
      },
    };
  }
}
