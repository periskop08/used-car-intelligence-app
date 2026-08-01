import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ClubReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getClubReports(filter: any) {
    const totalPosts = await this.prisma.clubPost.count({ where: { deletedAt: null } });
    const totalComments = await this.prisma.clubComment.count({ where: { deletedAt: null } });
    const activeMutes = await this.prisma.clubRestriction.count({ where: { type: 'MUTE', revokedAt: null } });
    const activeBans = await this.prisma.clubRestriction.count({ where: { type: 'BAN', revokedAt: null } });

    return {
      kpis: [
        { key: 'CLUB_POSTS', title: 'Yayınlanmış Gönderi', value: totalPosts, trend: 'up' },
        { key: 'CLUB_COMMENTS', title: 'Toplam Yorum', value: totalComments, trend: 'up' },
        { key: 'ACTIVE_MUTES', title: 'Aktif Mute (Susturma)', value: activeMutes, alertLevel: activeMutes > 0 ? 'warning' : 'normal' },
        { key: 'ACTIVE_BANS', title: 'Aktif Club Yasağı', value: activeBans, alertLevel: activeBans > 0 ? 'critical' : 'normal' },
      ],
      moderationSummary: {
        totalPosts,
        totalComments,
        activeMutes,
        activeBans,
      },
    };
  }
}
