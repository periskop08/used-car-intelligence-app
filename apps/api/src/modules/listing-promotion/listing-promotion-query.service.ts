import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, ListingPromotionType } from '@prisma/client';

export interface EffectivePromotionSummary {
  publicationType: 'STANDARD' | 'URGENT' | 'SHOWCASE' | 'SHOWCASE_URGENT';
  urgent: {
    requested: boolean;
    status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'NONE';
    entitlementVerified: boolean;
    active: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
  };
  showcase: {
    requested: boolean;
    status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'NONE';
    entitlementVerified: boolean;
    active: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
  };
  paymentStatus: 'PAID' | 'PENDING' | 'NONE';
  startsAt: Date | null;
  endsAt: Date | null;
}

@Injectable()
export class ListingPromotionQueryService {
  constructor(private prisma: PrismaService) {}

  public resolveEffectivePromotions(listing: any, now: Date = new Date()): EffectivePromotionSummary {
    const isListingActive = (listing.status === 'ACTIVE' || listing.status === 'PUBLISHED') &&
      (!listing.expiresAt || new Date(listing.expiresAt) > now);

    const entitlements = listing.promotionEntitlements || [];
    const purchases = listing.promotions || [];

    // Urgent entitlement checks
    const activeUrgentEntitlement = entitlements.find(
      (e: any) => e.promotionType === ListingPromotionType.URGENT_LISTING &&
        e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE &&
        (!e.expiresAt || new Date(e.expiresAt) > now)
    );
    const pendingUrgentEntitlement = entitlements.find(
      (e: any) => e.promotionType === ListingPromotionType.URGENT_LISTING &&
        e.lifecycleStatus === PromotionLifecycleStatus.PENDING_ACTIVATION
    );
    const expiredUrgentEntitlement = entitlements.find(
      (e: any) => e.promotionType === ListingPromotionType.URGENT_LISTING &&
        (e.lifecycleStatus === PromotionLifecycleStatus.EXPIRED || (e.expiresAt && new Date(e.expiresAt) <= now))
    );

    // Showcase entitlement checks
    const activeShowcaseEntitlement = entitlements.find(
      (e: any) => e.promotionType === ListingPromotionType.SHOWCASE_FEED &&
        e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE &&
        (!e.expiresAt || new Date(e.expiresAt) > now)
    );
    const pendingShowcaseEntitlement = entitlements.find(
      (e: any) => e.promotionType === ListingPromotionType.SHOWCASE_FEED &&
        e.lifecycleStatus === PromotionLifecycleStatus.PENDING_ACTIVATION
    );
    const expiredShowcaseEntitlement = entitlements.find(
      (e: any) => e.promotionType === ListingPromotionType.SHOWCASE_FEED &&
        (e.lifecycleStatus === PromotionLifecycleStatus.EXPIRED || (e.expiresAt && new Date(e.expiresAt) <= now))
    );

    // Active state derived strictly from: Active Listing + Valid Active Entitlement
    const urgentActive = isListingActive && !!activeUrgentEntitlement;
    const showcaseActive = isListingActive && !!activeShowcaseEntitlement;

    // Requested state (requested checkbox or entitlement/purchase exists)
    const urgentRequested = !!(
      listing.isUrgent ||
      activeUrgentEntitlement ||
      pendingUrgentEntitlement ||
      purchases.some((p: any) => p.promotionType === ListingPromotionType.URGENT_LISTING || p.productSku === 'URGENT_SHOWCASE_BUNDLE')
    );
    const showcaseRequested = !!(
      listing.isShowcaseFeedActive ||
      activeShowcaseEntitlement ||
      pendingShowcaseEntitlement ||
      purchases.some((p: any) => p.promotionType === ListingPromotionType.SHOWCASE_FEED || p.productSku === 'URGENT_SHOWCASE_BUNDLE')
    );

    // Statuses
    let urgentStatus: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'NONE' = 'NONE';
    if (urgentActive) {
      urgentStatus = 'ACTIVE';
    } else if (pendingUrgentEntitlement || (listing.status === 'PENDING_REVIEW' && urgentRequested)) {
      urgentStatus = 'PENDING_APPROVAL';
    } else if (expiredUrgentEntitlement) {
      urgentStatus = 'EXPIRED';
    }

    let showcaseStatus: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'NONE' = 'NONE';
    if (showcaseActive) {
      showcaseStatus = 'ACTIVE';
    } else if (pendingShowcaseEntitlement || (listing.status === 'PENDING_REVIEW' && showcaseRequested)) {
      showcaseStatus = 'PENDING_APPROVAL';
    } else if (expiredShowcaseEntitlement) {
      showcaseStatus = 'EXPIRED';
    }

    // Publication Type
    let publicationType: 'STANDARD' | 'URGENT' | 'SHOWCASE' | 'SHOWCASE_URGENT' = 'STANDARD';
    const isUrgentConsidered = urgentActive || urgentStatus === 'PENDING_APPROVAL';
    const isShowcaseConsidered = showcaseActive || showcaseStatus === 'PENDING_APPROVAL';

    if (isUrgentConsidered && isShowcaseConsidered) {
      publicationType = 'SHOWCASE_URGENT';
    } else if (isShowcaseConsidered) {
      publicationType = 'SHOWCASE';
    } else if (isUrgentConsidered) {
      publicationType = 'URGENT';
    }

    // Payment Status
    let paymentStatus: 'PAID' | 'PENDING' | 'NONE' = 'NONE';
    const allPurchases = [
      ...purchases,
      ...entitlements.map((e: any) => e.purchase).filter(Boolean),
    ];
    if (allPurchases.some((p: any) => p.paymentStatus === 'PAID' || p.source === 'ADMIN_GRANT' || p.source === 'CAMPAIGN')) {
      paymentStatus = 'PAID';
    } else if (allPurchases.some((p: any) => p.paymentStatus === 'PENDING')) {
      paymentStatus = 'PENDING';
    }

    // Date range
    let startsAt: Date | null = null;
    let endsAt: Date | null = null;
    if (urgentActive || showcaseActive) {
      const activeStarts = [activeUrgentEntitlement?.activatedAt, activeShowcaseEntitlement?.activatedAt].filter(Boolean);
      const activeEnds = [activeUrgentEntitlement?.expiresAt, activeShowcaseEntitlement?.expiresAt].filter(Boolean);
      if (activeStarts.length > 0) startsAt = new Date(Math.min(...activeStarts.map((d: any) => new Date(d).getTime())));
      if (activeEnds.length > 0) endsAt = new Date(Math.max(...activeEnds.map((d: any) => new Date(d).getTime())));
    }

    return {
      publicationType,
      urgent: {
        requested: urgentRequested,
        status: urgentStatus,
        entitlementVerified: !!(activeUrgentEntitlement || pendingUrgentEntitlement),
        active: urgentActive,
        startsAt: activeUrgentEntitlement?.activatedAt ? new Date(activeUrgentEntitlement.activatedAt) : null,
        expiresAt: activeUrgentEntitlement?.expiresAt ? new Date(activeUrgentEntitlement.expiresAt) : null,
      },
      showcase: {
        requested: showcaseRequested,
        status: showcaseStatus,
        entitlementVerified: !!(activeShowcaseEntitlement || pendingShowcaseEntitlement),
        active: showcaseActive,
        startsAt: activeShowcaseEntitlement?.activatedAt ? new Date(activeShowcaseEntitlement.activatedAt) : null,
        expiresAt: activeShowcaseEntitlement?.expiresAt ? new Date(activeShowcaseEntitlement.expiresAt) : null,
      },
      paymentStatus,
      startsAt,
      endsAt,
    };
  }

  public buildActiveUrgentListingWhere(now: Date = new Date()): any {
    return {
      status: { in: ['PUBLISHED', 'ACTIVE'] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      promotionEntitlements: {
        some: {
          promotionType: ListingPromotionType.URGENT_LISTING,
          lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
          expiresAt: { gt: now },
        },
      },
    };
  }

  public buildActiveShowcaseFeedListingWhere(now: Date = new Date()): any {
    return {
      status: { in: ['PUBLISHED', 'ACTIVE'] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      promotionEntitlements: {
        some: {
          promotionType: ListingPromotionType.SHOWCASE_FEED,
          lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
          expiresAt: { gt: now },
        },
      },
    };
  }

  public mapToPublicPromotionDto(listing: any) {
    const resolved = this.resolveEffectivePromotions(listing);
    return {
      isUrgent: resolved.urgent.active,
      urgentSince: resolved.urgent.startsAt?.toISOString(),
      urgentExpiresAt: resolved.urgent.expiresAt?.toISOString(),

      isShowcaseFeedActive: resolved.showcase.active,
      showcaseFeedSince: resolved.showcase.startsAt?.toISOString(),
      showcaseFeedExpiresAt: resolved.showcase.expiresAt?.toISOString(),
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
