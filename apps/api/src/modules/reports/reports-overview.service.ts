import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FinanceReportsService } from './finance-reports.service';

@Injectable()
export class ReportsOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceReportsService,
  ) {}

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
        todayAiReports,
        pendingListingsCount,
        queuedResearchJobsCount,
        fallbackReportsCount,
        openFeedbacksCount,
        subMetrics,
      ] = await Promise.all([
        this.safeCount('user'),
        this.safeCount('user', { createdAt: { gte: todayStart } }),
        this.safeCount('user', { createdAt: { gte: yesterdayStart, lt: todayStart } }),
        this.safeCount('user', { createdAt: { gte: last7DaysStart } }),
        this.safeCount('user', { createdAt: { gte: last30DaysStart } }),
        this.safeCount('aiVehicleReport', { createdAt: { gte: todayStart } }),
        this.safeCount('vehicleListing', { status: 'PENDING_REVIEW' }),
        this.safeCount('vehicleResearchJob', { status: 'QUEUED' }),
        this.safeCount('aiVehicleReport', { isSafeFallback: true }),
        this.safeCount('feedback', {
          status: {
            in: [
              'NEW',
              'IN_REVIEW',
              'WAITING_USER_INFO',
              'WAITING_LISTING_OWNER',
              'ASSIGNED',
              'ACTION_TAKEN',
            ],
          },
        }),
        this.financeService.getActiveSubscriptionFinanceMetrics(),
      ]);

      const { mrr, arr, activePaidSubscriptionsCount, packageDistribution } = subMetrics;

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
            value: activePaidSubscriptionsCount,
            previousValue: activePaidSubscriptionsCount,
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
        pendingListingsCount,
        queuedResearchJobsCount,
        fallbackReportsCount,
        openFeedbacksCount,
        packageDistribution,
        financialSummary: {
          mrr,
          arr,
          grossMarginStatus: 'INCOMPLETE_COST_DATA',
          grossMarginPct: null,
        },
      };
    } catch (e: any) {
      console.error('ReportsOverviewService Error:', e);
      return {
        kpis: [],
        pendingListingsCount: 0,
        queuedResearchJobsCount: 0,
        fallbackReportsCount: 0,
        openFeedbacksCount: 0,
        packageDistribution: { tanismaUsers: 0, yetkinUsers: 0, profesyonelUsers: 0 },
        financialSummary: { mrr: 0, arr: 0, grossMarginPct: null },
      };
    }
  }
}

