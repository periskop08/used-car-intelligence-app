import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ListingPromotionAuditService {
  constructor(private prisma: PrismaService) {}

  public async logAction(
    adminId: string,
    action: string,
    reason: string,
    details?: { promotionId?: string; listingId?: string; before?: any; after?: any }
  ): Promise<any> {
    return await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: `PROMOTION_${action}`,
        details: JSON.stringify({
          reason,
          promotionId: details?.promotionId,
          listingId: details?.listingId,
          before: details?.before,
          after: details?.after,
        }),
      },
    }).catch(() => null); // Non-blocking audit logger
  }
}
