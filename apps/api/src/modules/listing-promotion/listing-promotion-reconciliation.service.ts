import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, PromotionPaymentStatus } from '@prisma/client';

@Injectable()
export class ListingPromotionReconciliationService {
  private readonly logger = new Logger(ListingPromotionReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  public async expirePromotions(): Promise<number> {
    const now = new Date();

    const expiredPromotions = await this.prisma.listingPromotionPurchase.findMany({
      where: {
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        expiresAt: { lte: now },
      },
    });

    let count = 0;
    for (const promo of expiredPromotions) {
      await this.prisma.$transaction([
        this.prisma.listingPromotionPurchase.update({
          where: { id: promo.id },
          data: {
            lifecycleStatus: PromotionLifecycleStatus.EXPIRED,
          },
        }),
        ...(promo.listingId ? [
          this.prisma.vehicleListing.update({
            where: { id: promo.listingId },
            data: {
              isUrgent: false,
              urgentSince: null,
              urgentExpiresAt: null,
            },
          }),
        ] : []),
      ]);
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

    // 1. Listings marked isUrgent=true but no active promotion -> set isUrgent=false
    const desyncedUrgentListings = await this.prisma.vehicleListing.findMany({
      where: {
        isUrgent: true,
        promotions: {
          none: {
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

    // 2. Active promotions where listing is not marked isUrgent=true -> set isUrgent=true
    const activePromotionsNotMarked = await this.prisma.listingPromotionPurchase.findMany({
      where: {
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        expiresAt: { gt: now },
        listing: {
          isUrgent: false,
        },
      },
      include: { listing: true },
    });

    for (const promo of activePromotionsNotMarked) {
      if (promo.listing && (promo.listing.status === ('PUBLISHED' as any) || promo.listing.status === ('ACTIVE' as any))) {
        await this.prisma.vehicleListing.update({
          where: { id: promo.listingId! },
          data: {
            isUrgent: true,
            urgentSince: promo.activatedAt || now,
            urgentExpiresAt: promo.expiresAt,
          },
        });
        repairedListings++;
        this.logger.warn(`Reconciliation: Repaired desynced isUrgent=true for listing ${promo.listingId}`);
      }
    }

    return { repairedListings };
  }
}
