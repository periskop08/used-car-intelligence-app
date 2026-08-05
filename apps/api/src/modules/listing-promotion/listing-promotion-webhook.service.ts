import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ListingPromotionPaymentService } from './listing-promotion-payment.service';
import { PaymentWebhookStatus } from '@prisma/client';

@Injectable()
export class ListingPromotionWebhookService {
  constructor(
    private prisma: PrismaService,
    private paymentService: ListingPromotionPaymentService,
  ) {}

  public async processWebhook(provider: string, providerEventId: string, eventType: string, payload: any): Promise<any> {
    const workerId = `worker_${process.pid}_${Date.now()}`;
    const now = new Date();
    const lockExpiresAt = new Date(now.getTime() + 60 * 1000); // 1-minute claim lock

    // Atomic claim via upsert or atomic update
    const event = await this.prisma.paymentWebhookEvent.upsert({
      where: { provider_providerEventId: { provider, providerEventId } },
      create: {
        provider,
        providerEventId,
        eventType,
        status: PaymentWebhookStatus.PROCESSING,
        lockedBy: workerId,
        lockedAt: now,
        lockExpiresAt,
        attemptCount: 1,
      },
      update: {
        attemptCount: { increment: 1 },
      },
    });

    if (event.status === PaymentWebhookStatus.PROCESSED) {
      return { status: 'ALREADY_PROCESSED' };
    }

    try {
      if (eventType === 'payment.success') {
        const purchaseId = payload.purchaseId || payload.merchantReference;
        const paymentReferenceId = payload.paymentReferenceId || payload.paymentId;
        const amountMinor = payload.amountMinor;

        if (!purchaseId || !paymentReferenceId) {
          throw new BadRequestException('MISSING_WEBHOOK_PAYLOAD_FIELDS: purchaseId ve paymentReferenceId gereklidir.');
        }

        const purchase = await this.prisma.listingPromotionPurchase.findUnique({
          where: { id: purchaseId },
        });

        if (!purchase) {
          throw new BadRequestException('PURCHASE_NOT_FOUND: Webhook ile eşleşen satın alma bulunamadı.');
        }

        if (amountMinor && purchase.amountMinor && amountMinor !== purchase.amountMinor) {
          throw new BadRequestException('AMOUNT_MISMATCH: Webhook tutarı ile satın alma tutarı eşleşmiyor.');
        }

        await this.paymentService.verifyAndConfirmPayment(purchaseId, paymentReferenceId, provider);
      }

      await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: PaymentWebhookStatus.PROCESSED,
          processedAt: new Date(),
          lockedBy: null,
          lockedAt: null,
          lockExpiresAt: null,
        },
      });

      return { status: 'PROCESSED' };
    } catch (error: any) {
      const nextRetryAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins retry delay
      const finalStatus = event.attemptCount >= 3 ? PaymentWebhookStatus.DEAD_LETTER : PaymentWebhookStatus.FAILED;

      await this.prisma.paymentWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: finalStatus,
          nextRetryAt: finalStatus === PaymentWebhookStatus.FAILED ? nextRetryAt : null,
          lastErrorCode: error?.code || 'WEBHOOK_ERROR',
          lastError: error?.message || String(error),
          lockedBy: null,
          lockedAt: null,
          lockExpiresAt: null,
        },
      });

      throw error;
    }
  }
}
