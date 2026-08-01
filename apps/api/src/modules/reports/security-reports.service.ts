import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SecurityReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSecurity(filter: any) {
    const rateLimitEvents = await this.prisma.analyticsEvent.count({ where: { eventType: 'RATE_LIMIT_TRIGGERED' } });
    const unauthEvents = await this.prisma.analyticsEvent.count({ where: { eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT' } });
    const suspendedUsers = await this.prisma.user.count({ where: { isActive: false } });

    return {
      kpis: [
        { key: 'RATE_LIMIT_EVENTS', title: 'Rate-Limit İhlal İkazları', value: rateLimitEvents, alertLevel: rateLimitEvents > 0 ? 'warning' : 'normal' },
        { key: 'UNAUTH_ACCESS_ATTEMPTS', title: 'Yetkisiz Erişim Girişimi', value: unauthEvents, alertLevel: unauthEvents > 0 ? 'critical' : 'normal' },
        { key: 'SUSPENDED_USERS', title: 'Askıya Alınan Hesaplar', value: suspendedUsers, alertLevel: 'normal' },
      ],
    };
  }
}
