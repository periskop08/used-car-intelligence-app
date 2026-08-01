import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class FinanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscriptions(filter: any) {
    const activeSubs = await this.prisma.subscription.count({ where: { status: 'ACTIVE' } });
    const cancelledSubs = await this.prisma.subscription.count({ where: { status: 'CANCELLED' } });
    const expiredSubs = await this.prisma.subscription.count({ where: { status: 'EXPIRED' } });

    return {
      kpis: [
        { key: 'ACTIVE_SUBSCRIPTIONS', title: 'Aktif Abonelikler', value: activeSubs, trend: 'up' },
        { key: 'CANCELLED_SUBSCRIPTIONS', title: 'İptal Edilen Abonelikler', value: cancelledSubs, alertLevel: cancelledSubs > 0 ? 'warning' : 'normal' },
        { key: 'EXPIRED_SUBSCRIPTIONS', title: 'Süresi Dolan Abonelikler', value: expiredSubs, trend: 'neutral' },
      ],
    };
  }

  async getRevenue(filter: any) {
    const standardUsers = await this.prisma.user.count({ where: { subscriptionTier: 'STANDARD' } });
    const proUsers = await this.prisma.user.count({ where: { subscriptionTier: 'PRO' } });

    const mrr = (standardUsers * 249) + (proUsers * 499);
    const arr = mrr * 12;

    return {
      kpis: [
        { key: 'MRR', title: 'Aylık Düzenli Gelir (MRR)', value: mrr, formattedValue: `₺${mrr.toLocaleString('tr-TR')}`, trend: 'up' },
        { key: 'ARR', title: 'Yıllık Düzenli Gelir (ARR)', value: arr, formattedValue: `₺${arr.toLocaleString('tr-TR')}`, trend: 'up' },
      ],
      revenueByTier: [
        { tier: 'Yetkin (249 TL)', revenue: standardUsers * 249 },
        { tier: 'Profesyonel (499 TL)', revenue: proUsers * 499 },
      ],
    };
  }

  async getOneTimePackages(filter: any) {
    const miniPurchases = await this.prisma.analyticsEvent.count({ where: { eventType: 'PACKAGE_PURCHASED', entityId: 'BUYER_MINI' } });
    const plusPurchases = await this.prisma.analyticsEvent.count({ where: { eventType: 'PACKAGE_PURCHASED', entityId: 'BUYER_PLUS' } });
    const maxPurchases = await this.prisma.analyticsEvent.count({ where: { eventType: 'PACKAGE_PURCHASED', entityId: 'BUYER_MAX' } });

    const totalRevenue = (miniPurchases * 149) + (plusPurchases * 249) + (maxPurchases * 399);

    return {
      kpis: [
        { key: 'ONE_TIME_REVENUE', title: 'Tek Seferlik Paket Geliri', value: totalRevenue, formattedValue: `₺${totalRevenue.toLocaleString('tr-TR')}`, trend: 'up' },
      ],
      packageBreakdown: [
        { package: 'Alıcı Mini (149 TL)', count: miniPurchases, revenue: miniPurchases * 149 },
        { package: 'Alıcı Plus (249 TL)', count: plusPurchases, revenue: plusPurchases * 249 },
        { package: 'Alıcı Max (399 TL)', count: maxPurchases, revenue: maxPurchases * 399 },
      ],
    };
  }

  async getCosts(filter: any) {
    const aiReportsCount = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_COMPLETED' } });
    const chatbotMsgCount = await this.prisma.analyticsEvent.count({ where: { eventType: 'CHATBOT_MESSAGE_SENT' } });

    const aiReportCost = aiReportsCount * 1.85; // ₺1.85 per report
    const chatbotCost = chatbotMsgCount * 0.12; // ₺0.12 per message
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
    const standardUsers = await this.prisma.user.count({ where: { subscriptionTier: 'STANDARD' } });
    const proUsers = await this.prisma.user.count({ where: { subscriptionTier: 'PRO' } });

    const revenue = (standardUsers * 249) + (proUsers * 499);
    const aiReportsCount = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_COMPLETED' } });
    const cost = aiReportsCount * 1.85;
    const grossProfit = Math.max(0, revenue - cost);
    const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      kpis: [
        { key: 'GROSS_PROFIT', title: 'Tahmini Brüt Kâr', value: grossProfit, formattedValue: `₺${grossProfit.toLocaleString('tr-TR')}`, trend: 'up' },
        { key: 'CONTRIBUTION_MARGIN', title: 'Katkı Marjı (%)', value: Number(marginPct.toFixed(1)), formattedValue: `%${marginPct.toFixed(1)}`, trend: 'up' },
      ],
    };
  }
}
