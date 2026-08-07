import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, PromotionPaymentStatus, PromotionRefundMethod, ListingPromotionType } from '@prisma/client';

@Injectable()
export class ListingPromotionRefundService {
  constructor(private prisma: PrismaService) {}

  public async refundNeverActivatedPromotion(
    listingId: string, 
    reason: string, 
    refundMethod: PromotionRefundMethod = PromotionRefundMethod.ORIGINAL_PAYMENT
  ): Promise<any> {
    const promotion = await this.prisma.listingPromotionPurchase.findFirst({
      where: {
        listingId,
        paymentStatus: PromotionPaymentStatus.PAID,
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
      },
      include: { entitlements: true },
    });

    if (!promotion) {
      return null; // No paid pending promotion to refund
    }

    const idempotencyKey = `refund_${promotion.id}`;
    const existingRefund = await this.prisma.listingPromotionPurchase.findUnique({
      where: { refundIdempotencyKey: idempotencyKey },
    });

    if (existingRefund && existingRefund.paymentStatus === PromotionPaymentStatus.REFUNDED) {
      return existingRefund;
    }

    const now = new Date();

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update purchase payment status
      const updated = await tx.listingPromotionPurchase.update({
        where: { id: promotion.id },
        data: {
          paymentStatus: PromotionPaymentStatus.REFUNDED,
          lifecycleStatus: PromotionLifecycleStatus.CANCELLED,
          refundIdempotencyKey: idempotencyKey,
          refundMethod,
          refundReferenceId: `REFUND_REF_${promotion.id}`,
          refundedAmount: promotion.priceAmount,
          refundedAmountMinor: promotion.amountMinor,
          refundReason: reason,
          refundedAt: now,
        },
      });

      // 2. Terminate all entitlements linked to this Purchase/Order
      await tx.listingPromotionEntitlement.updateMany({
        where: { purchaseId: promotion.id },
        data: {
          lifecycleStatus: PromotionLifecycleStatus.CANCELLED,
          terminatedAt: now,
        },
      });

      return updated;
    });
  }

  public async terminateActivePromotion(listingId: string, userId: string): Promise<any> {
    const promotion = await this.prisma.listingPromotionPurchase.findFirst({
      where: {
        listingId,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
      },
      include: { entitlements: true },
    });

    if (!promotion) {
      throw new NotFoundException('ACTIVE_PROMOTION_NOT_FOUND: Yayında aktif bir promosyon bulunamadı.');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.listingPromotionPurchase.update({
        where: { id: promotion.id },
        data: {
          lifecycleStatus: PromotionLifecycleStatus.TERMINATED,
          terminatedAt: now,
        },
      });

      await tx.listingPromotionEntitlement.updateMany({
        where: { purchaseId: promotion.id },
        data: {
          lifecycleStatus: PromotionLifecycleStatus.TERMINATED,
          terminatedAt: now,
        },
      });

      await tx.vehicleListing.update({
        where: { id: listingId },
        data: {
          isUrgent: false,
          urgentSince: null,
          urgentExpiresAt: null,
          isShowcaseFeedActive: false,
          showcaseFeedSince: null,
          showcaseFeedExpiresAt: null,
        },
      });
    });

    return { success: true, message: 'Promosyon görünürlükleri kaldırıldı.' };
  }
}
