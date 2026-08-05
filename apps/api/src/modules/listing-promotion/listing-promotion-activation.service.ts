import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { 
  ListingPromotionSource, 
  PromotionLifecycleStatus, 
  PromotionPaymentStatus 
} from '@prisma/client';

@Injectable()
export class ListingPromotionActivationService {
  constructor(private prisma: PrismaService) {}

  public isPromotionEligibleForActivation(promotion: any): boolean {
    if (promotion.lifecycleStatus !== PromotionLifecycleStatus.PENDING_ACTIVATION) {
      return false;
    }

    if (promotion.source === ListingPromotionSource.PAYMENT) {
      return promotion.paymentStatus === PromotionPaymentStatus.PAID;
    }

    if (promotion.source === ListingPromotionSource.ADMIN_GRANT) {
      return !!promotion.grantedByAdminId;
    }

    if (promotion.source === ListingPromotionSource.CAMPAIGN) {
      return !!promotion.campaignId;
    }

    return false;
  }

  public async tryActivateUrgentPromotion(listingId: string): Promise<boolean> {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        promotions: {
          where: {
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('LISTING_NOT_FOUND: İlan bulunamadı.');
    }

    const isListingPublished = listing.status === ('PUBLISHED' as any) || listing.status === ('ACTIVE' as any);
    if (!isListingPublished) {
      return false; // Waiting for listing approval
    }

    const pendingPromotion = listing.promotions?.[0];
    if (!pendingPromotion) {
      return false; // No pending promotion
    }

    if (!this.isPromotionEligibleForActivation(pendingPromotion)) {
      return false; // Payment not confirmed yet
    }

    // Determine activeUntil from listing active period
    const activeUntil = listing.expiresAt || (listing as any).activeUntil;
    if (!activeUntil) {
      throw new BadRequestException('MISSING_ACTIVE_UNTIL: İlanın yayın dönemi bitiş tarihi bulunamadığı için acil hizmet aktifleştirilemez.');
    }

    const now = new Date();

    // Atomic activation in single transaction
    await this.prisma.$transaction([
      this.prisma.listingPromotionPurchase.update({
        where: { id: pendingPromotion.id },
        data: {
          lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
          activatedAt: now,
          expiresAt: activeUntil,
        },
      }),
      this.prisma.vehicleListing.update({
        where: { id: listingId },
        data: {
          isUrgent: true,
          urgentSince: now,
          urgentExpiresAt: activeUntil,
        },
      }),
    ]);

    return true;
  }
}
