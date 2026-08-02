import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier } from '@prisma/client';

@Injectable()
export class ReportsOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async safeCount(model: string, where?: any): Promise<number> {
    try {
      return await (this.prisma as any)[model].count({ where });
    } catch (e) {
      return 0;
    }
  }

  async getExecutiveOverview(filter: any) {
    try {
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
        this.safeCount('user'),
        this.safeCount('user', { createdAt: { gte: todayStart } }),
        this.safeCount('user', { createdAt: { gte: yesterdayStart, lt: todayStart } }),
        this.safeCount('user', { createdAt: { gte: last7DaysStart } }),
        this.safeCount('user', { createdAt: { gte: last30DaysStart } }),
        this.safeCount('user', { subscriptionTier: SubscriptionTier.FREE }),
        this.safeCount('user', { subscriptionTier: SubscriptionTier.STANDARD }),
        this.safeCount('user', { subscriptionTier: SubscriptionTier.PRO }),
        this.safeCount('subscription', { status: 'ACTIVE' }),
        this.safeCount('analyticsEvent', { eventType: 'AI_REPORT_COMPLETED', occurredAt: { gte: todayStart } }),
        this.safeCount('analyticsEvent', { eventType: 'COMPARISON_CREATED', occurredAt: { gte: todayStart } }),
        this.safeCount('clubPost', { createdAt: { gte: todayStart } }),
      ]);

      // Financial estimations (Decimal precision)
      const mrr = (yetkinUsers * 249) + (profesyonelUsers * 499);
      const arr = mrr * 12;
      const estAiCost = (todayAiReports * 1.85);
      const grossMarginPct = mrr > 0 ? Number((((mrr - estAiCost) / mrr) * 100).toFixed(1)) : 0;

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
            previousValue: 0,
            changePercentage: 0,
            trend: 'up',
            alertLevel: 'normal',
            drilldownKey: 'AI_REPORT_LIST',
            drilldownParams: {},
          },
        ],
        packageDistribution: {
          tanismaUsers,
          yetkinUsers,
          profesyonelUsers,
        },
        financialSummary: {
          mrr,
          arr,
          grossMarginPct,
        },
      };
    } catch (e: any) {
      console.error('ReportsOverviewService Error:', e);
      return {
        kpis: [],
        packageDistribution: { tanismaUsers: 0, yetkinUsers: 0, profesyonelUsers: 0 },
        financialSummary: { mrr: 0, arr: 0, grossMarginPct: 0 },
      };
    }
  }
}
