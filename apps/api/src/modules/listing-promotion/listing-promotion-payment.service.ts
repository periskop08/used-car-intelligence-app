import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreatePromotionCheckoutDto, PromotionCheckoutResponseDto } from './dto/create-promotion-checkout.dto';
import { ListingPromotionActivationService } from './listing-promotion-activation.service';
import { 
  ListingPromotionSource, 
  ListingPromotionType, 
  ListingPromotionProductSku,
  PromotionLifecycleStatus, 
  PromotionPaymentStatus 
} from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ListingPromotionPaymentService {
  constructor(
    private prisma: PrismaService,
    private activationService: ListingPromotionActivationService,
  ) {}

  public async checkout(userId: string, listingId: string, dto: CreatePromotionCheckoutDto): Promise<PromotionCheckoutResponseDto> {
    if (!dto.termsAccepted) {
      throw new BadRequestException('TERMS_NOT_ACCEPTED: Ücretli hizmet koşullarını kabul etmeniz gerekmektedir.');
    }

    const now = new Date();

    // 1. Acquire Listing Lock to prevent race condition across multiple idempotency keys
    const lockKey = crypto.createHash('sha256').update(`${userId}:${listingId}:PROMOTION_CHECKOUT`).digest('hex');
    const existingLock = await this.prisma.listingPromotionLock.findUnique({ where: { lockKey } });
    
    if (existingLock && existingLock.expiresAt > now) {
      throw new ConflictException('CONCURRENT_CHECKOUT_IN_PROGRESS: Bu ilan için aktif bir ödeme işlemi devam etmektedir.');
    }

    // Set 15-minute lock
    const lockExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    await this.prisma.listingPromotionLock.upsert({
      where: { lockKey },
      create: { lockKey, listingId, expiresAt: lockExpiresAt },
      update: { expiresAt: lockExpiresAt },
    });

    try {
      // 2. Atomic Quote Validation & Purchase Creation inside single transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const quote = await tx.listingPromotionQuote.findUnique({
          where: { id: dto.quoteId },
          include: { purchase: true },
        });

        if (!quote) {
          throw new NotFoundException('QUOTE_NOT_FOUND: Geçerli bir teklif bulunamadı.');
        }

        if (quote.userId !== userId || quote.listingId !== listingId) {
          throw new ForbiddenException('QUOTE_MISMATCH: Teklif bu kullanıcı veya ilana ait değil.');
        }

        if (quote.expiresAt <= now) {
          throw new BadRequestException('QUOTE_EXPIRED: Teklif süresi dolmuş. Lütfen yeni teklif alınız.');
        }

        if (quote.consumedAt || quote.purchase) {
          throw new ConflictException('QUOTE_ALREADY_CONSUMED: Bu teklif zaten kullanılmıştır.');
        }

        if (quote.termsVersion !== dto.termsVersion) {
          throw new BadRequestException('PRICE_CHANGED: Hizmet şartları sürümü değişti. Lütfen yeni teklif alınız.');
        }

        const listing = await tx.vehicleListing.findUnique({
          where: { id: listingId },
          include: { seller: true },
        });

        if (!listing) {
          throw new NotFoundException('LISTING_NOT_FOUND: İlan bulunamadı.');
        }

        // Check if listing has existing active idempotency key
        const existingPurchase = await tx.listingPromotionPurchase.findUnique({
          where: { paymentIdempotencyKey: dto.idempotencyKey },
        });

        if (existingPurchase) {
          return existingPurchase;
        }

        const checkoutExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);

        // Build Snapshots
        const listingPublicIdSnapshot = listing.id;
        const listingTitleSnapshot = `${listing.modelYear} ${listing.title}`;
        const buyerReferenceSnapshot = listing.seller.id;

        const purchase = await tx.listingPromotionPurchase.create({
          data: {
            userId,
            listingId,
            quoteId: quote.id,
            source: ListingPromotionSource.PAYMENT,
            promotionType: quote.promotionType,
            productSku: quote.productSku,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            paymentStatus: PromotionPaymentStatus.PENDING,
            priceAmount: quote.priceAmount,
            amountMinor: quote.amountMinor,
            currency: quote.currency,
            pricingVersion: quote.pricingVersion,
            taxIncluded: quote.taxIncluded,
            taxRate: quote.taxRate,
            listingPublicIdSnapshot,
            listingTitleSnapshot,
            buyerReferenceSnapshot,
            paymentIdempotencyKey: dto.idempotencyKey,
            checkoutExpiresAt,
            termsVersion: dto.termsVersion,
            consentedAt: now,
          },
        });

        // Mark Quote as Consumed
        await tx.listingPromotionQuote.update({
          where: { id: quote.id },
          data: { consumedAt: now },
        });

        return purchase;
      });

      return {
        purchaseId: result.id,
        listingId: result.listingId!,
        productSku: result.productSku,
        lifecycleStatus: result.lifecycleStatus,
        paymentStatus: result.paymentStatus,
        priceAmount: Number(result.priceAmount),
        amountMinor: result.amountMinor!,
        currency: result.currency!,
        paymentProviderUrl: `https://checkout.torquescout.com/pay/${result.id}`,
        checkoutExpiresAt: result.checkoutExpiresAt?.toISOString() || now.toISOString(),
      };
    } finally {
      // Clean lock
      await this.prisma.listingPromotionLock.deleteMany({ where: { lockKey } }).catch(() => null);
    }
  }

  public async verifyAndConfirmPayment(purchaseId: string, paymentReferenceId: string, provider: string = 'MOCK_PAYMENT_PROVIDER'): Promise<void> {
    const purchase = await this.prisma.listingPromotionPurchase.findUnique({
      where: { id: purchaseId },
      include: { entitlements: true },
    });

    if (!purchase) {
      throw new NotFoundException('PURCHASE_NOT_FOUND: Promosyon ödeme kaydı bulunamadı.');
    }

    if (purchase.paymentStatus === PromotionPaymentStatus.PAID) {
      return; // Already processed idempotently
    }

    const now = new Date();

    // Execute Payment Status Update + Entitlements Creation inside Single DB Transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.listingPromotionPurchase.update({
        where: { id: purchaseId },
        data: {
          paymentStatus: PromotionPaymentStatus.PAID,
          paymentProvider: provider,
          paymentReferenceId,
          purchasedAt: now,
        },
      });

      // Create Entitlements based on Product SKU
      const sku = purchase.productSku;
      if (sku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE) {
        await tx.listingPromotionEntitlement.createMany({
          data: [
            {
              purchaseId: purchase.id,
              listingId: purchase.listingId,
              promotionType: ListingPromotionType.URGENT_LISTING,
              lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            },
            {
              purchaseId: purchase.id,
              listingId: purchase.listingId,
              promotionType: ListingPromotionType.SHOWCASE_FEED,
              lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            },
          ],
        });
      } else if (sku === ListingPromotionProductSku.SHOWCASE_FEED) {
        await tx.listingPromotionEntitlement.create({
          data: {
            purchaseId: purchase.id,
            listingId: purchase.listingId,
            promotionType: ListingPromotionType.SHOWCASE_FEED,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
          },
        });
      } else {
        await tx.listingPromotionEntitlement.create({
          data: {
            purchaseId: purchase.id,
            listingId: purchase.listingId,
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
          },
        });
      }
    });

    // Attempt activation if listing is published/approved
    if (purchase.listingId) {
      await this.activationService.tryActivatePromotions(purchase.listingId);
    }
  }
}
