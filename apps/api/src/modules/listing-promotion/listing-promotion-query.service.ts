import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, ListingPromotionType } from '@prisma/client';

export interface EffectivePromotionSummary {
  requestedPublicationType: 'STANDARD' | 'URGENT' | 'SHOWCASE' | 'SHOWCASE_URGENT';
  effectivePromotionType: 'STANDARD' | 'URGENT' | 'SHOWCASE' | 'SHOWCASE_URGENT';
  publicationType: 'STANDARD' | 'URGENT' | 'SHOWCASE' | 'SHOWCASE_URGENT';
  urgent: {
    requested: boolean;
    entitled: boolean;
    active: boolean;
    entitlementStatus: string | null;
    purchaseStatus: string | null;
    startsAt: Date | null;
    expiresAt: Date | null;
    endsAt: Date | null;
    status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'NONE';
    entitlementVerified: boolean;
  };
  showcase: {
    requested: boolean;
    entitled: boolean;
    active: boolean;
    entitlementStatus: string | null;
    purchaseStatus: string | null;
    startsAt: Date | null;
    expiresAt: Date | null;
    endsAt: Date | null;
    status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED' | 'NONE';
    entitlementVerified: boolean;
  };
  feedActive: boolean;
  paymentStatus: 'PAID' | 'PENDING' | 'NONE';
  commercialAuthority: 'TEST' | 'PAID' | 'ADMIN_GRANT' | 'CAMPAIGN' | 'NONE';
  paymentDisplay: string;
  isTestMode: boolean;
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

    // Entitled state (any active or pending commercial entitlement in DB)
    const urgentEntitled = !!(activeUrgentEntitlement || pendingUrgentEntitlement);
    const showcaseEntitled = !!(activeShowcaseEntitlement || pendingShowcaseEntitlement);

    const urgentEntitlementStatus = activeUrgentEntitlement?.lifecycleStatus || pendingUrgentEntitlement?.lifecycleStatus || (expiredUrgentEntitlement ? 'EXPIRED' : null);
    const showcaseEntitlementStatus = activeShowcaseEntitlement?.lifecycleStatus || pendingShowcaseEntitlement?.lifecycleStatus || (expiredShowcaseEntitlement ? 'EXPIRED' : null);

    const urgentPurchase = purchases.find((p: any) => p.promotionType === ListingPromotionType.URGENT_LISTING || p.productSku === 'URGENT_SHOWCASE_BUNDLE');
    const showcasePurchase = purchases.find((p: any) => p.promotionType === ListingPromotionType.SHOWCASE_FEED || p.productSku === 'URGENT_SHOWCASE_BUNDLE');

    const urgentPurchaseStatus = activeUrgentEntitlement?.purchase?.paymentStatus || pendingUrgentEntitlement?.purchase?.paymentStatus || urgentPurchase?.paymentStatus || null;
    const showcasePurchaseStatus = activeShowcaseEntitlement?.purchase?.paymentStatus || pendingShowcaseEntitlement?.purchase?.paymentStatus || showcasePurchase?.paymentStatus || null;

    // Requested state (durable request column OR active/pending/expired entitlement OR historical purchase)
    const urgentRequested = !!(
      listing.urgentRequested ||
      listing.isUrgent ||
      activeUrgentEntitlement ||
      pendingUrgentEntitlement ||
      expiredUrgentEntitlement ||
      urgentPurchase
    );
    const showcaseRequested = !!(
      listing.showcaseRequested ||
      listing.isShowcaseFeedActive ||
      activeShowcaseEntitlement ||
      pendingShowcaseEntitlement ||
      expiredShowcaseEntitlement ||
      showcasePurchase
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

    // Requested Publication Type (Represents seller intent, NEVER conflated with active state)
    let requestedPublicationType: 'STANDARD' | 'URGENT' | 'SHOWCASE' | 'SHOWCASE_URGENT' = 'STANDARD';
    if (urgentRequested && showcaseRequested) {
      requestedPublicationType = 'SHOWCASE_URGENT';
    } else if (showcaseRequested) {
      requestedPublicationType = 'SHOWCASE';
    } else if (urgentRequested) {
      requestedPublicationType = 'URGENT';
    }

    // Effective Active Promotion Type (Only strictly active promotions)
    let effectivePromotionType: 'STANDARD' | 'URGENT' | 'SHOWCASE' | 'SHOWCASE_URGENT' = 'STANDARD';
    if (urgentActive && showcaseActive) {
      effectivePromotionType = 'SHOWCASE_URGENT';
    } else if (showcaseActive) {
      effectivePromotionType = 'SHOWCASE';
    } else if (urgentActive) {
      effectivePromotionType = 'URGENT';
    }

    // Effective Publication Type (Active or Pending Approval for publication)
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

    // Commercial Authority and Payment Status
    const isLiveMode = process.env.LISTING_PROMOTION_COMMERCE_MODE === 'LIVE';
    let commercialAuthority: 'TEST' | 'PAID' | 'ADMIN_GRANT' | 'CAMPAIGN' | 'NONE' = 'NONE';
    let paymentStatus: 'PAID' | 'PENDING' | 'NONE' = 'NONE';
    let paymentDisplay = 'Yok';

    const allPurchases = [
      ...purchases,
      ...entitlements.map((e: any) => e.purchase).filter(Boolean),
    ];

    const hasTestAuthority = allPurchases.some((p: any) => p.source === 'TEST') ||
      entitlements.some((e: any) => e.purchase?.source === 'TEST');
    const hasAdminGrant = allPurchases.some((p: any) => p.source === 'ADMIN_GRANT');
    const hasCampaign = allPurchases.some((p: any) => p.source === 'CAMPAIGN');
    const hasPaid = allPurchases.some((p: any) => p.paymentStatus === 'PAID');
    const hasPending = allPurchases.some((p: any) => p.paymentStatus === 'PENDING');

    if (hasPaid) {
      commercialAuthority = 'PAID';
      paymentStatus = 'PAID';
      paymentDisplay = 'Doğrulandı';
    } else if (hasAdminGrant) {
      commercialAuthority = 'ADMIN_GRANT';
      paymentStatus = 'PAID';
      paymentDisplay = 'Admin Tanımlı';
    } else if (hasCampaign) {
      commercialAuthority = 'CAMPAIGN';
      paymentStatus = 'PAID';
      paymentDisplay = 'Kampanya';
    } else if (hasTestAuthority && !isLiveMode) {
      commercialAuthority = 'TEST';
      paymentStatus = 'NONE'; // Explicitly not PAID
      paymentDisplay = 'Test nedeniyle atlandı';
    } else if (hasPending) {
      paymentStatus = 'PENDING';
      paymentDisplay = 'Ödeme Bekleniyor';
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

    const urgentStart = activeUrgentEntitlement?.activatedAt ? new Date(activeUrgentEntitlement.activatedAt) : null;
    const urgentEnd = activeUrgentEntitlement?.expiresAt ? new Date(activeUrgentEntitlement.expiresAt) : null;
    const showcaseStart = activeShowcaseEntitlement?.activatedAt ? new Date(activeShowcaseEntitlement.activatedAt) : null;
    const showcaseEnd = activeShowcaseEntitlement?.expiresAt ? new Date(activeShowcaseEntitlement.expiresAt) : null;

    return {
      requestedPublicationType,
      effectivePromotionType,
      publicationType,
      urgent: {
        requested: urgentRequested,
        entitled: urgentEntitled,
        active: urgentActive,
        entitlementStatus: urgentEntitlementStatus,
        purchaseStatus: urgentPurchaseStatus,
        status: urgentStatus,
        entitlementVerified: urgentEntitled,
        startsAt: urgentStart,
        expiresAt: urgentEnd,
        endsAt: urgentEnd,
      },
      showcase: {
        requested: showcaseRequested,
        entitled: showcaseEntitled,
        active: showcaseActive,
        entitlementStatus: showcaseEntitlementStatus,
        purchaseStatus: showcasePurchaseStatus,
        status: showcaseStatus,
        entitlementVerified: showcaseEntitled,
        startsAt: showcaseStart,
        expiresAt: showcaseEnd,
        endsAt: showcaseEnd,
      },
      feedActive: showcaseActive,
      paymentStatus,
      commercialAuthority,
      paymentDisplay,
      isTestMode: !isLiveMode,
      startsAt,
      endsAt,
    };
  }

  public hasValidPromotionAuthority(listing: any): boolean {
    const isLiveMode = process.env.LISTING_PROMOTION_COMMERCE_MODE === 'LIVE';
    const entitlements = listing.promotionEntitlements || [];
    const purchases = listing.promotions || [];

    const hasPaidPurchase = purchases.some(
      (p: any) => p.paymentStatus === 'PAID' ||
                  p.source === 'ADMIN_GRANT' ||
                  p.source === 'CAMPAIGN' ||
                  (!isLiveMode && p.source === 'TEST')
    );
    if (hasPaidPurchase) return true;

    const hasValidEntitlement = entitlements.some(
      (e: any) =>
        (e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE ||
         e.lifecycleStatus === PromotionLifecycleStatus.PENDING_ACTIVATION) &&
        (e.purchase?.paymentStatus === 'PAID' ||
         e.purchase?.source === 'ADMIN_GRANT' ||
         e.purchase?.source === 'CAMPAIGN' ||
         (!isLiveMode && e.purchase?.source === 'TEST') ||
         (!e.purchase && !e.purchaseId && (e.authoritySource === 'ADMIN_GRANT' || e.authoritySource === 'CAMPAIGN')))
    );
    return hasValidEntitlement;
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
