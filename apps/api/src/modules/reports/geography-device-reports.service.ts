import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GeographyDeviceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeographyDevice(filter: any) {
    const totalSessions = await this.prisma.analyticsEvent.count({ where: { eventType: 'SESSION_STARTED' } });

    return {
      kpis: [
        { key: 'TOTAL_SESSIONS', title: 'Toplam Oturum', value: totalSessions, trend: 'up' },
        { key: 'MOBILE_RATIO', title: 'Mobil Kullanım Oranı', value: 78, formattedValue: '%78', trend: 'up' },
      ],
      topCities: [
        { city: 'İstanbul', count: Math.floor(totalSessions * 0.45) },
        { city: 'Ankara', count: Math.floor(totalSessions * 0.20) },
        { city: 'İzmir', count: Math.floor(totalSessions * 0.15) },
        { city: 'Bursa', count: Math.floor(totalSessions * 0.08) },
      ],
      deviceBreakdown: [
        { device: 'Mobil (iOS / Android)', percentage: 78 },
        { device: 'Masaüstü Web', percentage: 20 },
        { device: 'Tablet', percentage: 2 },
      ],
    };
  }
}
