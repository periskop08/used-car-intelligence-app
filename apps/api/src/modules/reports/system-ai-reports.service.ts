import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SystemAiReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemAi(filter: any) {
    const totalRequests = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_REQUESTED' } });
    const repairAttempts = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_REPAIR_ATTEMPTED' } });
    const repairCompleted = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_REPAIR_COMPLETED' } });

    const repairSuccessRate = repairAttempts > 0 ? (repairCompleted / repairAttempts) * 100 : 100;

    return {
      kpis: [
        { key: 'TOTAL_AI_REQUESTS', title: 'Toplam AI Provider İsteği', value: totalRequests, trend: 'up' },
        { key: 'P95_LATENCY', title: 'P95 Yanıt Süresi', value: 4.2, formattedValue: '4.2 sn', trend: 'neutral' },
        { key: 'REPAIR_SUCCESS_RATE', title: 'JSON Repair Başarı Oranı', value: Number(repairSuccessRate.toFixed(1)), formattedValue: `%${repairSuccessRate.toFixed(1)}`, trend: 'up' },
      ],
      providerLatencies: [
        { provider: 'Google Gemini 1.5 Pro / Flash', p50: 1.8, p95: 3.5, p99: 5.2, status: 'HEALTHY' },
        { provider: 'OpenAI GPT-4o', p50: 2.1, p95: 4.1, p99: 6.8, status: 'HEALTHY' },
      ],
    };
  }
}
