import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class MarketingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMarketing(filter: any) {
    const totalEvents = await this.prisma.analyticsEvent.count({ where: { eventType: 'USER_REGISTERED' } });
    const spendRecords = await (this.prisma as any).adSpendRecord.findMany();

    const totalAdSpend = spendRecords.reduce((acc: number, r: any) => acc + Number(r.spendAmount), 0);
    const cac = totalEvents > 0 ? (totalAdSpend / totalEvents) : 0;

    return {
      kpis: [
        { key: 'TOTAL_AD_SPEND', title: 'Toplam Reklam Harcaması', value: totalAdSpend, formattedValue: `₺${totalAdSpend.toLocaleString('tr-TR')}`, trend: 'up' },
        { key: 'MKT_REGISTRATIONS', title: 'Reklam Kaynaklı Kayıt', value: totalEvents, trend: 'up' },
        { key: 'CAC', title: 'Müşteri Edinme Maliyeti (CAC)', value: Number(cac.toFixed(2)), formattedValue: `₺${cac.toFixed(2)}`, alertLevel: 'normal' },
      ],
      channelBreakdown: [
        { channel: 'Google Ads', spend: totalAdSpend * 0.5, registrations: Math.floor(totalEvents * 0.5) },
        { channel: 'Meta Ads (Instagram)', spend: totalAdSpend * 0.35, registrations: Math.floor(totalEvents * 0.35) },
        { channel: 'TikTok Ads', spend: totalAdSpend * 0.15, registrations: Math.floor(totalEvents * 0.15) },
      ],
    };
  }

  async importAdSpend(records: any[]) {
    let imported = 0;
    for (const r of records) {
      if (!r.date || !r.channel || !r.campaignName || !r.spendAmount) continue;
      const date = new Date(r.date);
      await (this.prisma as any).adSpendRecord.upsert({
        where: {
          date_channel_externalAccountId_externalCampaignId: {
            date,
            channel: r.channel,
            externalAccountId: r.externalAccountId || 'DEFAULT',
            externalCampaignId: r.externalCampaignId || 'DEFAULT',
          },
        },
        update: {
          spendAmount: r.spendAmount,
          impressions: r.impressions || 0,
          clicks: r.clicks || 0,
        },
        create: {
          date,
          channel: r.channel,
          externalAccountId: r.externalAccountId || 'DEFAULT',
          externalCampaignId: r.externalCampaignId || 'DEFAULT',
          campaignName: r.campaignName,
          spendAmount: r.spendAmount,
          currency: r.currency || 'TRY',
          impressions: r.impressions || 0,
          clicks: r.clicks || 0,
          source: 'MANUAL_IMPORT',
        },
      });
      imported++;
    }
    return { importedCount: imported };
  }
}
