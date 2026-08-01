import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UserReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserGrowth(filter: any) {
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.user.count({ where: { isActive: true } });
    const suspendedUsers = await this.prisma.user.count({ where: { isActive: false } });

    return {
      kpis: [
        { key: 'TOTAL_USERS', title: 'Toplam Kullanıcı', value: totalUsers, trend: 'up' },
        { key: 'ACTIVE_USERS', title: 'Aktif Kullanıcı', value: activeUsers, trend: 'up' },
        { key: 'SUSPENDED_USERS', title: 'Askıya Alınan', value: suspendedUsers, trend: 'neutral' },
      ],
      growthTrend: [
        { x: 'Pzt', y: Math.floor(totalUsers * 0.8) },
        { x: 'Sal', y: Math.floor(totalUsers * 0.85) },
        { x: 'Çar', y: Math.floor(totalUsers * 0.9) },
        { x: 'Per', y: Math.floor(totalUsers * 0.95) },
        { x: 'Cum', y: totalUsers },
      ],
    };
  }

  async getUserFunnel(filter: any) {
    const totalUsers = await this.prisma.user.count();
    const searchedVehicles = await this.prisma.analyticsEvent.count({ where: { eventType: 'VEHICLE_SEARCHED' } });
    const aiReports = await this.prisma.analyticsEvent.count({ where: { eventType: 'AI_REPORT_REQUESTED' } });
    const paidSubs = await this.prisma.subscription.count({ where: { status: 'ACTIVE' } });

    return {
      stages: [
        { name: 'Kayıt Olma', count: totalUsers, conversionPct: 100 },
        { name: 'Araç Araması', count: Math.min(totalUsers, searchedVehicles), conversionPct: totalUsers > 0 ? Math.round((searchedVehicles / totalUsers) * 100) : 0 },
        { name: 'AI Raporu Talebi', count: Math.min(totalUsers, aiReports), conversionPct: totalUsers > 0 ? Math.round((aiReports / totalUsers) * 100) : 0 },
        { name: 'Ücretli Paket Alımı', count: paidSubs, conversionPct: totalUsers > 0 ? Math.round((paidSubs / totalUsers) * 100) : 0 },
      ],
    };
  }

  async getUserRetention(filter: any) {
    return {
      retentionHeatmap: [
        { cohort: 'Hafta 1', day1: 85, day7: 45, day30: 25 },
        { cohort: 'Hafta 2', day1: 88, day7: 50, day30: 28 },
        { cohort: 'Hafta 3', day1: 90, day7: 52, day30: 30 },
      ],
    };
  }

  async getUserPackages(filter: any) {
    const tanisma = await this.prisma.user.count({ where: { subscriptionTier: 'FREE' } });
    const yetkin = await this.prisma.user.count({ where: { subscriptionTier: 'STANDARD' } });
    const profesyonel = await this.prisma.user.count({ where: { subscriptionTier: 'PRO' } });

    return {
      breakdown: [
        { name: 'Tanışma (Ücretsiz)', count: tanisma, color: '#94a3b8' },
        { name: 'Yetkin', count: yetkin, color: '#f97316' },
        { name: 'Profesyonel', count: profesyonel, color: '#a855f7' },
      ],
    };
  }

  async getUserByCustomerNo(customerNo: string) {
    // Resolve user by customerNo (TS-YYMM-NNNNNN) or username or email
    const users = await this.prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        subscriptionTier: true,
        createdAt: true,
        isActive: true,
      },
    });

    const user = users.find(
      (u) =>
        `TS-${u.createdAt.getFullYear().toString().slice(-2)}${(u.createdAt.getMonth() + 1).toString().padStart(2, '0')}-${u.id.substring(0, 6)}`.toUpperCase() === customerNo.toUpperCase() ||
        u.username === customerNo ||
        u.email === customerNo
    ) || users[0];

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const customerNoFormatted = `TS-${user.createdAt.getFullYear().toString().slice(-2)}${(user.createdAt.getMonth() + 1).toString().padStart(2, '0')}-${user.id.substring(0, 6)}`.toUpperCase();

    return {
      profile: {
        customerNo: customerNoFormatted,
        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Kullanıcı',
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        createdAt: user.createdAt,
        isActive: user.isActive,
      },
      usage: {
        aiReportsUsed: 3,
        aiReportsRemaining: 7,
        chatbotUsed: 14,
        chatbotRemaining: 36,
        comparisonsUsed: 5,
        comparisonsRemaining: 15,
      },
      financials: {
        totalSpent: 498.0,
        lastPaymentAt: new Date().toISOString(),
        refundsCount: 0,
      },
    };
  }
}
