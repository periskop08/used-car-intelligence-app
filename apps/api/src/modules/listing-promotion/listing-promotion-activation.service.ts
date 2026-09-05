import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { 
  ListingPromotionSource, 
  ListingPromotionType,
  PromotionLifecycleStatus, 
  PromotionPaymentStatus 
} from '@prisma/client';

@Injectable()
export class ListingPromotionActivationService {
  constructor(private prisma: PrismaService) {}

  public isEntitlementEligibleForActivation(entitlement: any): boolean {
    if (entitlement.lifecycleStatus !== PromotionLifecycleStatus.PENDING_ACTIVATION) {
      return false;
    }

    const purchase = entitlement.purchase;
    if (!purchase) return false;

    if (purchase.source === ListingPromotionSource.PAYMENT) {
      return purchase.paymentStatus === PromotionPaymentStatus.PAID;
    }

    if (purchase.source === ListingPromotionSource.ADMIN_GRANT) {
      return !!purchase.grantedByAdminId;
    }

    if (purchase.source === ListingPromotionSource.CAMPAIGN) {
      return !!purchase.campaignId;
    }

    if (purchase.source === ListingPromotionSource.TEST) {
      return purchase.paymentStatus === PromotionPaymentStatus.NOT_REQUIRED;
    }

    return false;
  }


  public async tryActivatePromotions(listingId: string): Promise<boolean> {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        seller: true,
        promotionEntitlements: {
          where: {
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
          },
          include: { purchase: true },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('LISTING_NOT_FOUND: İlan bulunamadı.');
    }

    const isListingPublished = listing.status === ('PUBLISHED' as any) || listing.status === ('ACTIVE' as any);
    if (!isListingPublished) {
      return false; // Waiting for listing approval/publication
    }

    const pendingEntitlements = listing.promotionEntitlements || [];
    if (pendingEntitlements.length === 0) {
      return false; // No pending entitlements
    }

    const eligibleEntitlements = pendingEntitlements.filter((e) => this.isEntitlementEligibleForActivation(e));
    if (eligibleEntitlements.length === 0) {
      return false; // Payment not confirmed yet
    }

    const now = new Date();

    // Determine target expiration date (Source of Truth: listing.expiresAt)
    let activeUntil = listing.expiresAt;
    if (!activeUntil) {
      const tier = (listing.seller?.subscriptionTier as any) || 'TANISMA';
      const dbPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier },
      });
      const planLimits = (dbPlan?.limits as any) || {};
      const durationDays = planLimits?.listingDurationDays !== undefined && Number(planLimits.listingDurationDays) > 0
        ? Number(planLimits.listingDurationDays)
        : (tier === 'PROFESYONEL' || tier === 'PREMIUM' || tier === 'PRO' ? 45 : 30);
      activeUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    let isUrgentActivated = false;
    let isShowcaseActivated = false;

    await this.prisma.$transaction(async (tx) => {
      for (const entitlement of eligibleEntitlements) {
        await tx.listingPromotionEntitlement.update({
          where: { id: entitlement.id },
          data: {
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: now,
            expiresAt: activeUntil,
          },
        });

        // Also update parent Purchase status if all entitlements activated
        await tx.listingPromotionPurchase.update({
          where: { id: entitlement.purchaseId },
          data: {
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: now,
            expiresAt: activeUntil,
          },
        });

        if (entitlement.promotionType === ListingPromotionType.URGENT_LISTING) {
          isUrgentActivated = true;
        } else if (entitlement.promotionType === ListingPromotionType.SHOWCASE_FEED) {
          isShowcaseActivated = true;
        }
      }

      const listingUpdateData: any = {};
      if (!listing.expiresAt) {
        listingUpdateData.expiresAt = activeUntil;
      }

      if (isUrgentActivated) {
        listingUpdateData.isUrgent = true;
        listingUpdateData.urgentSince = now;
        listingUpdateData.urgentExpiresAt = activeUntil;
      }

      if (isShowcaseActivated) {
        listingUpdateData.isShowcaseFeedActive = true;
        listingUpdateData.showcaseFeedSince = now;
        listingUpdateData.showcaseFeedExpiresAt = activeUntil;
      }

      if (Object.keys(listingUpdateData).length > 0) {
        await tx.vehicleListing.update({
          where: { id: listingId },
          data: listingUpdateData,
        });
      }
    });

    return true;
  }

  // Alias for backward compatibility
  public async tryActivateUrgentPromotion(listingId: string): Promise<boolean> {
    return this.tryActivatePromotions(listingId);
  }
}
