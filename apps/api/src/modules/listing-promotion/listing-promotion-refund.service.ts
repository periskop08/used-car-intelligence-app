import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionLifecycleStatus, PromotionPaymentStatus, PromotionRefundMethod } from '@prisma/client';

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

    const updated = await this.prisma.listingPromotionPurchase.update({
      where: { id: promotion.id },
      data: {
        paymentStatus: PromotionPaymentStatus.REFUND_PENDING,
        refundIdempotencyKey: idempotencyKey,
        refundMethod,
        refundReferenceId: `REFUND_REF_${promotion.id}`,
        refundedAmount: promotion.priceAmount,
        refundedAmountMinor: promotion.amountMinor,
        refundReason: reason,
      },
    });

    // Simulate instant refund completion
    return await this.prisma.listingPromotionPurchase.update({
      where: { id: updated.id },
      data: {
        paymentStatus: PromotionPaymentStatus.REFUNDED,
        refundedAt: now,
      },
    });
  }

  public async terminateActivePromotion(listingId: string, userId: string): Promise<any> {
    const promotion = await this.prisma.listingPromotionPurchase.findFirst({
      where: {
        listingId,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
      },
    });

    if (!promotion) {
      throw new NotFoundException('ACTIVE_PROMOTION_NOT_FOUND: Yayında aktif bir acil ilan bulunamadı.');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.listingPromotionPurchase.update({
        where: { id: promotion.id },
        data: {
          lifecycleStatus: PromotionLifecycleStatus.TERMINATED,
          terminatedAt: now,
        },
      }),
      this.prisma.vehicleListing.update({
        where: { id: listingId },
        data: {
          isUrgent: false,
          urgentSince: null,
          urgentExpiresAt: null,
        },
      }),
    ]);

    return { success: true, message: 'Acil etiket kaldırıldı. Otomatik iade yapılmamıştır.' };
  }
}
