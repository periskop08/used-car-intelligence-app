import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, PromotionPaymentStatus, ListingPromotionType } from '@prisma/client';

@Injectable()
export class ListingPromotionReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(ListingPromotionReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.runReconciliationJob().catch((err) => this.logger.error('Error in promotion reconciliation on module init:', err));
  }

  public async backfillLegacyPurchasesToEntitlements(): Promise<number> {
    const legacyPurchases = await this.prisma.listingPromotionPurchase.findMany({
      where: {
        paymentStatus: PromotionPaymentStatus.PAID,
      },
      include: {
        entitlements: true,
      },
    });

    let backfilled = 0;
    const now = new Date();

    for (const purchase of legacyPurchases) {
      if (!purchase.listingId) continue;

      const listing = await this.prisma.vehicleListing.findUnique({
        where: { id: purchase.listingId },
      });
      if (!listing) continue;

      let targetExpiresAt = purchase.expiresAt || listing.expiresAt;
      if (!targetExpiresAt) {
        targetExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const isExpired = targetExpiresAt && new Date(targetExpiresAt) <= now;
      const lifecycleStatus = isExpired
        ? PromotionLifecycleStatus.EXPIRED
        : purchase.lifecycleStatus === PromotionLifecycleStatus.CANCELLED || purchase.lifecycleStatus === PromotionLifecycleStatus.TERMINATED
        ? purchase.lifecycleStatus
        : PromotionLifecycleStatus.ACTIVE;

      if (purchase.entitlements.length === 0) {
        await this.prisma.$transaction(async (tx) => {
          await tx.listingPromotionEntitlement.create({
            data: {
              purchaseId: purchase.id,
              listingId: purchase.listingId,
              promotionType: purchase.promotionType || ListingPromotionType.URGENT_LISTING,
              lifecycleStatus,
              activatedAt: purchase.activatedAt || purchase.createdAt,
              expiresAt: targetExpiresAt,
            },
          });

          await tx.listingPromotionPurchase.update({
            where: { id: purchase.id },
            data: {
              lifecycleStatus,
              expiresAt: targetExpiresAt,
            },
          });
        });
        backfilled++;
      }

      if (lifecycleStatus === PromotionLifecycleStatus.ACTIVE && (listing.status === ('PUBLISHED' as any) || listing.status === ('ACTIVE' as any))) {
        const type = purchase.promotionType || ListingPromotionType.URGENT_LISTING;
        if (type === ListingPromotionType.SHOWCASE_FEED) {
          await this.prisma.vehicleListing.update({
            where: { id: purchase.listingId },
            data: {
              isShowcaseFeedActive: true,
              showcaseFeedSince: purchase.activatedAt || now,
              showcaseFeedExpiresAt: targetExpiresAt,
            },
          });
        } else {
          await this.prisma.vehicleListing.update({
            where: { id: purchase.listingId },
            data: {
              isUrgent: true,
              urgentSince: purchase.activatedAt || now,
              urgentExpiresAt: targetExpiresAt,
            },
          });
        }
      }
    }

    return backfilled;
  }

  public async expirePromotions(): Promise<number> {
    const now = new Date();

    const expiredEntitlements = await this.prisma.listingPromotionEntitlement.findMany({
      where: {
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        expiresAt: { lte: now },
      },
    });

    let count = 0;
    for (const entitlement of expiredEntitlements) {
      await this.prisma.$transaction(async (tx) => {
        await tx.listingPromotionEntitlement.update({
          where: { id: entitlement.id },
          data: {
            lifecycleStatus: PromotionLifecycleStatus.EXPIRED,
          },
        });

        await tx.listingPromotionPurchase.updateMany({
          where: { id: entitlement.purchaseId },
          data: { lifecycleStatus: PromotionLifecycleStatus.EXPIRED },
        });

        if (entitlement.listingId) {
          if (entitlement.promotionType === ListingPromotionType.URGENT_LISTING) {
            await tx.vehicleListing.update({
              where: { id: entitlement.listingId },
              data: {
                isUrgent: false,
                urgentSince: null,
                urgentExpiresAt: null,
              },
            });
          } else if (entitlement.promotionType === ListingPromotionType.SHOWCASE_FEED) {
            await tx.vehicleListing.update({
              where: { id: entitlement.listingId },
              data: {
                isShowcaseFeedActive: false,
                showcaseFeedSince: null,
                showcaseFeedExpiresAt: null,
              },
            });
          }
        }
      });
      count++;
    }

    return count;
  }

  public async cleanupStaleCheckouts(): Promise<number> {
    const now = new Date();

    const staleCheckouts = await this.prisma.listingPromotionPurchase.findMany({
      where: {
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
        paymentStatus: PromotionPaymentStatus.PENDING,
        checkoutExpiresAt: { lte: now },
      },
    });

    let count = 0;
    for (const promo of staleCheckouts) {
      await this.prisma.listingPromotionPurchase.update({
        where: { id: promo.id },
        data: {
          lifecycleStatus: PromotionLifecycleStatus.CANCELLED,
          paymentStatus: PromotionPaymentStatus.FAILED,
          lastErrorCode: 'CHECKOUT_EXPIRED',
          lastErrorMessage: 'Ödeme tamamlanmadan checkout süresi doldu.',
        },
      });
      count++;
    }

    // Clean expired locks
    await this.prisma.listingPromotionLock.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    return count;
  }

  public async runReconciliationJob(): Promise<{ repairedListings: number; backfilled: number }> {
    const now = new Date();

    // 0. Backfill legacy purchases to entitlements & restore active listings
    const backfilled = await this.backfillLegacyPurchasesToEntitlements().catch((err) => {
      this.logger.error('Error during backfill in reconciliation:', err);
      return 0;
    });

    // 1. Expire past promotions
    await this.expirePromotions().catch(() => null);
    await this.cleanupStaleCheckouts().catch(() => null);

    // 2. Repair desynced urgent listings (Strictly on ACTIVE listings without active or pending entitlements)
    const desyncedUrgentListings = await this.prisma.vehicleListing.findMany({
      where: {
        status: 'ACTIVE',
        isUrgent: true,
        promotionEntitlements: {
          none: {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: { in: [PromotionLifecycleStatus.ACTIVE, PromotionLifecycleStatus.PENDING_ACTIVATION] },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        },
      },
    });

    let repairedListings = 0;
    for (const listing of desyncedUrgentListings) {
      await this.prisma.vehicleListing.update({
        where: { id: listing.id },
        data: {
          isUrgent: false,
          urgentSince: null,
          urgentExpiresAt: null,
        },
      });
      repairedListings++;
      this.logger.warn(`Reconciliation: Repaired desynced isUrgent=false for listing ${listing.id}`);
    }

    // 3. Repair desynced showcase listings (Strictly on ACTIVE listings without active or pending entitlements)
    const desyncedShowcaseListings = await this.prisma.vehicleListing.findMany({
      where: {
        status: 'ACTIVE',
        isShowcaseFeedActive: true,
        promotionEntitlements: {
          none: {
            promotionType: ListingPromotionType.SHOWCASE_FEED,
            lifecycleStatus: { in: [PromotionLifecycleStatus.ACTIVE, PromotionLifecycleStatus.PENDING_ACTIVATION] },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        },
      },
    });

    for (const listing of desyncedShowcaseListings) {
      await this.prisma.vehicleListing.update({
        where: { id: listing.id },
        data: {
          isShowcaseFeedActive: false,
          showcaseFeedSince: null,
          showcaseFeedExpiresAt: null,
        },
      });
      repairedListings++;
      this.logger.warn(`Reconciliation: Repaired desynced isShowcaseFeedActive=false for listing ${listing.id}`);
    }

    // 4. Restore active entitlements that were not marked on listing
    const activeUrgentEntitlementsNotMarked = await this.prisma.listingPromotionEntitlement.findMany({
      where: {
        promotionType: ListingPromotionType.URGENT_LISTING,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        expiresAt: { gt: now },
        listing: { isUrgent: false },
      },
      include: { listing: true },
    });

    for (const ent of activeUrgentEntitlementsNotMarked) {
      if (ent.listing && (ent.listing.status === ('PUBLISHED' as any) || ent.listing.status === ('ACTIVE' as any))) {
        await this.prisma.vehicleListing.update({
          where: { id: ent.listingId! },
          data: {
            isUrgent: true,
            urgentSince: ent.activatedAt || now,
            urgentExpiresAt: ent.expiresAt,
          },
        });
        repairedListings++;
        this.logger.log(`Reconciliation: Restored isUrgent=true for listing ${ent.listingId}`);
      }
    }

    return { repairedListings, backfilled };
  }
}
