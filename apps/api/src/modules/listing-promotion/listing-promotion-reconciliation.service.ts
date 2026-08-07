import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, PromotionPaymentStatus, ListingPromotionType } from '@prisma/client';

@Injectable()
export class ListingPromotionReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(ListingPromotionReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.runReconciliationJob().catch(() => null);
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

        // Also check parent purchase lifecycle
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

  public async runReconciliationJob(): Promise<{ repairedListings: number }> {
    const now = new Date();

    // 1. Expire past promotions
    await this.expirePromotions().catch(() => null);
    await this.cleanupStaleCheckouts().catch(() => null);

    // 2. Repair desynced urgent listings
    const desyncedUrgentListings = await this.prisma.vehicleListing.findMany({
      where: {
        isUrgent: true,
        promotionEntitlements: {
          none: {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            expiresAt: { gt: now },
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

    // 3. Repair desynced showcase listings
    const desyncedShowcaseListings = await this.prisma.vehicleListing.findMany({
      where: {
        isShowcaseFeedActive: true,
        promotionEntitlements: {
          none: {
            promotionType: ListingPromotionType.SHOWCASE_FEED,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            expiresAt: { gt: now },
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

    return { repairedListings };
  }
}
