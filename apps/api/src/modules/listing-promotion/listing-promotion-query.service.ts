import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PublicUrgentPromotionDto, UserUrgentPromotionStatusDto } from './dto/urgent-promotion-response.dto';
import { PromotionLifecycleStatus } from '@prisma/client';

@Injectable()
export class ListingPromotionQueryService {
  constructor(private prisma: PrismaService) {}

  public buildActiveUrgentListingWhere(now: Date = new Date()): any {
    return {
      status: { in: ['PUBLISHED', 'ACTIVE'] },
      isUrgent: true,
      urgentExpiresAt: { gt: now },
    };
  }

  public mapToPublicUrgentDto(listing: any): PublicUrgentPromotionDto {
    const now = new Date();
    const isCurrentlyUrgent = listing?.isUrgent && listing?.urgentExpiresAt && new Date(listing.urgentExpiresAt) > now;

    return {
      isUrgent: !!isCurrentlyUrgent,
      urgentSince: isCurrentlyUrgent ? listing.urgentSince?.toISOString() : undefined,
      urgentExpiresAt: isCurrentlyUrgent ? listing.urgentExpiresAt?.toISOString() : undefined,
    };
  }

  public async getUserPromotionStatusForListing(listingId: string, userId: string): Promise<UserUrgentPromotionStatusDto> {
    const now = new Date();

    const activePromotion = await this.prisma.listingPromotionPurchase.findFirst({
      where: {
        listingId,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    });

    if (activePromotion) {
      const expiresAt = activePromotion.expiresAt!;
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingDays = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      return {
        hasActivePromotion: true,
        hasPendingPromotion: false,
        lifecycleStatus: activePromotion.lifecycleStatus,
        paymentStatus: activePromotion.paymentStatus,
        expiresAt: expiresAt.toISOString(),
        remainingDays,
        activatesImmediately: true,
        validUntil: expiresAt.toLocaleDateString('tr-TR'),
      };
    }

    const pendingPromotion = await this.prisma.listingPromotionPurchase.findFirst({
      where: {
        listingId,
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
      },
    });

    if (pendingPromotion) {
      return {
        hasActivePromotion: false,
        hasPendingPromotion: true,
        lifecycleStatus: pendingPromotion.lifecycleStatus,
        paymentStatus: pendingPromotion.paymentStatus,
      };
    }

    return {
      hasActivePromotion: false,
      hasPendingPromotion: false,
    };
  }
}
