import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, ListingPromotionType } from '@prisma/client';

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

  public buildActiveShowcaseFeedListingWhere(now: Date = new Date()): any {
    return {
      status: { in: ['PUBLISHED', 'ACTIVE'] },
      isShowcaseFeedActive: true,
      showcaseFeedExpiresAt: { gt: now },
    };
  }

  public mapToPublicPromotionDto(listing: any) {
    const now = new Date();
    const isUrgent = !!(listing?.isUrgent && listing?.urgentExpiresAt && new Date(listing.urgentExpiresAt) > now);
    const isShowcaseFeedActive = !!(
      listing?.isShowcaseFeedActive &&
      listing?.showcaseFeedExpiresAt &&
      new Date(listing.showcaseFeedExpiresAt) > now
    );

    return {
      isUrgent,
      urgentSince: isUrgent ? listing.urgentSince?.toISOString() : undefined,
      urgentExpiresAt: isUrgent ? listing.urgentExpiresAt?.toISOString() : undefined,

      isShowcaseFeedActive,
      showcaseFeedSince: isShowcaseFeedActive ? listing.showcaseFeedSince?.toISOString() : undefined,
      showcaseFeedExpiresAt: isShowcaseFeedActive ? listing.showcaseFeedExpiresAt?.toISOString() : undefined,
    };
  }

  public async getUserPromotionStatusForListing(listingId: string, userId: string) {
    const now = new Date();

    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        promotionEntitlements: {
          where: {
            lifecycleStatus: { in: [PromotionLifecycleStatus.PENDING_ACTIVATION, PromotionLifecycleStatus.ACTIVE] },
          },
          include: { purchase: true },
        },
      },
    });

    if (!listing) {
      return {
        listingId,
        remainingDays: 0,
        canBuyUrgent: false,
        canBuyShowcase: false,
        canBuyBundle: false,
        activePromotions: [],
      };
    }

    let remainingDays = 30;
    if (listing.expiresAt) {
      const diffMs = new Date(listing.expiresAt).getTime() - now.getTime();
      remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const liveEntitlements = listing.promotionEntitlements || [];
    const liveTypes = new Set(liveEntitlements.map((e) => e.promotionType));

    const isUrgentLive = liveTypes.has(ListingPromotionType.URGENT_LISTING);
    const isShowcaseLive = liveTypes.has(ListingPromotionType.SHOWCASE_FEED);

    const canBuyUrgent = !isUrgentLive;
    const canBuyShowcase = !isShowcaseLive;
    const canBuyBundle = !isUrgentLive && !isShowcaseLive;

    const urgentEntitlement = liveEntitlements.find((e) => e.promotionType === ListingPromotionType.URGENT_LISTING);
    const showcaseEntitlement = liveEntitlements.find((e) => e.promotionType === ListingPromotionType.SHOWCASE_FEED);

    return {
      listingId: listing.id,
      listingExpiresAt: listing.expiresAt ? listing.expiresAt.toISOString() : undefined,
      remainingDays,
      canBuyUrgent,
      canBuyShowcase,
      canBuyBundle,
      urgentPromotion: urgentEntitlement
        ? {
            id: urgentEntitlement.id,
            lifecycleStatus: urgentEntitlement.lifecycleStatus,
            activatedAt: urgentEntitlement.activatedAt?.toISOString(),
            expiresAt: urgentEntitlement.expiresAt?.toISOString(),
          }
        : null,
      showcasePromotion: showcaseEntitlement
        ? {
            id: showcaseEntitlement.id,
            lifecycleStatus: showcaseEntitlement.lifecycleStatus,
            activatedAt: showcaseEntitlement.activatedAt?.toISOString(),
            expiresAt: showcaseEntitlement.expiresAt?.toISOString(),
          }
        : null,
    };
  }
}
