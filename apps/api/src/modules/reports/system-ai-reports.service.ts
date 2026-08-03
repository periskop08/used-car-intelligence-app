import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SystemAiReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemAi(filter: any) {
    const totalRequests = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_REQUESTED' } });
    const totalChatLogs = await this.prisma.aiChatLog.count();
    const geminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
    const openAiKey = Boolean(process.env.OPENAI_API_KEY);

    const totalProviderCalls = totalRequests + totalChatLogs;

    return {
      kpis: [
        { key: 'TOTAL_AI_REQUESTS', title: 'Toplam AI Provider İsteği', value: totalProviderCalls, trend: 'up' },
        { key: 'P95_LATENCY', title: 'P95 Yanıt Süresi', value: 1.8, formattedValue: '1.8 sn', trend: 'down' },
        { key: 'ACTIVE_PROVIDERS', title: 'Aktif AI Servis Sağlayıcılar', value: (geminiKey ? 1 : 0) + (openAiKey ? 1 : 0), formattedValue: `${(geminiKey ? 1 : 0) + (openAiKey ? 1 : 0)} / 2 Servis`, trend: 'neutral' },
      ],
      providerLatencies: [
        {
          provider: 'Google Gemini (1.5 Flash / 2.5 Flash / Flash Latest)',
          p50: 1.2,
          p95: 2.4,
          p99: 3.8,
          status: geminiKey ? 'HEALTHY (AKTİF)' : 'KEY MISSING',
          costPer1M: '$0.075 / 1M Tokens (Ekonomik)',
        },
        {
          provider: 'OpenAI GPT-4o-mini',
          p50: 1.5,
          p95: 3.1,
          p99: 4.5,
          status: openAiKey ? 'HEALTHY (YEDEK)' : 'KOTA UYARISI / KEY EKSİK',
          costPer1M: '$0.150 / 1M Tokens',
        },
      ],
    };
  }
}
