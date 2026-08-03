import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AiQuotaFeature, AiQuotaUsageStatus } from '@prisma/client';

@Injectable()
export class VehicleReportQuotaService {
  constructor(private prisma: PrismaService) {}

  async reserveQuota(userId: string, idempotencyKey: string, feature: AiQuotaFeature, referenceId?: string) {
    try {
      if (!userId || userId === 'guest_user') {
        return { quotaUsageId: undefined, isExisting: false };
      }

      const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        return { quotaUsageId: undefined, isExisting: false };
      }

      const existing = await this.prisma.aiQuotaUsage.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        return { quotaUsageId: existing.id, isExisting: true };
      }

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes window

      const usage = await this.prisma.aiQuotaUsage.create({
        data: {
          userId,
          feature,
          idempotencyKey,
          referenceId,
          status: AiQuotaUsageStatus.RESERVED,
          expiresAt,
        },
      });

      return { quotaUsageId: usage.id, isExisting: false };
    } catch (e) {
      return { quotaUsageId: undefined, isExisting: false };
    }
  }

  async consumeQuota(quotaUsageId: string) {
    if (!quotaUsageId) return;
    try {
      await this.prisma.aiQuotaUsage.update({
        where: { id: quotaUsageId },
        data: {
          status: AiQuotaUsageStatus.CONSUMED,
          consumedAt: new Date(),
        },
      });
    } catch (e) {}
  }

  async releaseQuota(quotaUsageId: string) {
    if (!quotaUsageId) return;
    try {
      await this.prisma.aiQuotaUsage.update({
        where: { id: quotaUsageId },
        data: {
          status: AiQuotaUsageStatus.RELEASED,
          releasedAt: new Date(),
        },
      });
    } catch (e) {}
  }

  async reconcileStaleReservations() {
    const now = new Date();
    await this.prisma.aiQuotaUsage.updateMany({
      where: {
        status: AiQuotaUsageStatus.RESERVED,
        expiresAt: { lt: now },
      },
      data: {
        status: AiQuotaUsageStatus.RELEASED,
        releasedAt: now,
      },
    });
  }
}
