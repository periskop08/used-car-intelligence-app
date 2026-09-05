import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreatePromotionCheckoutDto, PromotionCheckoutResponseDto } from './dto/create-promotion-checkout.dto';
import { ListingPromotionActivationService } from './listing-promotion-activation.service';
import { 
  ListingPromotionSource, 
  ListingPromotionType, 
  ListingPromotionProductSku,
  PromotionLifecycleStatus, 
  PromotionPaymentStatus,
  ListingStatus
} from '@prisma/client';
import * as crypto from 'crypto';

function isListingSubmissionReady(listing: any): boolean {
  if (!listing) return false;
  if (!listing.title || !listing.title.trim()) return false;
  if (!listing.priceAmount || Number(listing.priceAmount) <= 0) return false;
  if (!listing.city || !listing.city.trim()) return false;
  if (!listing.modelYear || listing.modelYear < 1900) return false;
  if (listing.kilometers === null || listing.kilometers === undefined || listing.kilometers < 0) return false;
  if (!listing.vehicleVariantId && (!listing.customBrand || !listing.customModel)) return false;
  return true;
}

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

      const configuredCheckoutBase = process.env.LISTING_PROMOTION_CHECKOUT_BASE_URL || process.env.CHECKOUT_URL;
      const isConfiguredValidUrl = !!configuredCheckoutBase && !configuredCheckoutBase.includes('checkout.torquescout.com');

      const paymentProviderUrl = isConfiguredValidUrl
        ? `${configuredCheckoutBase.replace(/\/$/, '')}/pay/${result.id}`
        : undefined;

      const checkoutAvailable = !!paymentProviderUrl;

      return {
        purchaseId: result.id,
        listingId: result.listingId!,
        productSku: result.productSku,
        lifecycleStatus: result.lifecycleStatus,
        paymentStatus: result.paymentStatus,
        priceAmount: Number(result.priceAmount),
        amountMinor: result.amountMinor!,
        currency: result.currency!,
        checkoutAvailable,
        paymentProviderUrl,
        checkoutUnavailableCode: checkoutAvailable ? undefined : 'LISTING_PROMOTION_CHECKOUT_INFRASTRUCTURE_ACTION_REQUIRED',
        checkoutUnavailableMessage: checkoutAvailable ? undefined : 'Ödeme altyapısı (checkout.torquescout.com) DNS veya dağıtım yapılandırması bekliyor. İlanınız taslak olarak güvenle saklandı.',
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

    // Execute Payment Status Update + Entitlements Creation + Listing Status Sync inside Single DB Transaction
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

      // Sync Listing state: validate readiness and transition DRAFT to PENDING_REVIEW
      if (purchase.listingId) {
        const listing = await tx.vehicleListing.findUnique({
          where: { id: purchase.listingId },
        });

        if (listing) {
          const urgentRequested = sku === ListingPromotionProductSku.URGENT_LISTING || sku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE;
          const showcaseRequested = sku === ListingPromotionProductSku.SHOWCASE_FEED || sku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE;

          const submissionReady = isListingSubmissionReady(listing);
          const newStatus = (listing.status === ListingStatus.DRAFT && submissionReady)
            ? ListingStatus.PENDING_REVIEW
            : listing.status;

          await tx.vehicleListing.update({
            where: { id: purchase.listingId },
            data: {
              urgentRequested: listing.urgentRequested || urgentRequested,
              showcaseRequested: listing.showcaseRequested || showcaseRequested,
              status: newStatus,
            },
          });
        }
      }
    });

    // Attempt activation if listing is published/approved
    if (purchase.listingId) {
      await this.activationService.tryActivatePromotions(purchase.listingId);
    }
  }

  public async getPurchaseStatus(userId: string, purchaseId: string) {
    const purchase = await this.prisma.listingPromotionPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        listing: {
          select: { id: true, title: true, status: true, sellerId: true, urgentRequested: true, showcaseRequested: true }
        },
        entitlements: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('PURCHASE_NOT_FOUND: Ödeme kaydı bulunamadı.');
    }

    if (purchase.listing?.sellerId !== userId) {
      throw new ForbiddenException('UNAUTHORIZED: Bu işlem için yetkiniz yok.');
    }

    return {
      purchaseId: purchase.id,
      listingId: purchase.listingId,
      productSku: purchase.productSku,
      paymentStatus: purchase.paymentStatus,
      lifecycleStatus: purchase.lifecycleStatus,
      priceAmount: Number(purchase.priceAmount),
      currency: purchase.currency,
      listingStatus: purchase.listing?.status,
      entitlements: purchase.entitlements.map(e => ({
        id: e.id,
        promotionType: e.promotionType,
        lifecycleStatus: e.lifecycleStatus,
      })),
    };
  }

  public async abandonPromotion(userId: string, listingId: string): Promise<{ success: boolean; status: string }> {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('LISTING_NOT_FOUND: İlan bulunamadı.');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('UNAUTHORIZED: Bu işlem için ilan sahibi olmalısınız.');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Cancel pending purchases
      await tx.listingPromotionPurchase.updateMany({
        where: {
          listingId,
          paymentStatus: PromotionPaymentStatus.PENDING,
        },
        data: {
          paymentStatus: PromotionPaymentStatus.FAILED,
          lifecycleStatus: PromotionLifecycleStatus.CANCELLED,
          lastErrorCode: 'PROMOTION_ABANDONED_BY_SELLER',
          lastErrorMessage: 'Satıcı promosyonsuz standart yayınlama yolunu seçti.',
        },
      });

      // Clear active requested flags
      const submissionReady = isListingSubmissionReady(listing);
      const targetStatus = submissionReady ? ListingStatus.PENDING_REVIEW : listing.status;

      const updated = await tx.vehicleListing.update({
        where: { id: listingId },
        data: {
          urgentRequested: false,
          showcaseRequested: false,
          status: targetStatus,
        },
      });

      // Record audit history preserving the intent that seller previously requested promotion but abandoned it
      await tx.auditLog.create({
        data: {
          userId,
          action: 'LISTING_PROMOTION_ABANDONED',
          details: {
            listingId,
            previousUrgentRequested: listing.urgentRequested,
            previousShowcaseRequested: listing.showcaseRequested,
            targetStatus,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        status: updated.status,
      };
    });
  }

  public async createTestPromotionCheckout(
    userId: string,
    listingId: string,
    productSku: ListingPromotionProductSku
  ): Promise<{
    success: boolean;
    purchaseId: string;
    productSku: ListingPromotionProductSku;
    status: ListingStatus;
    commerceMode: 'TEST';
  }> {
    const isLiveMode = process.env.LISTING_PROMOTION_COMMERCE_MODE === 'LIVE';
    if (isLiveMode) {
      throw new ForbiddenException('TEST_MODE_DISABLED: Canlı (LIVE) ticaret modunda test yetkisi oluşturulamaz.');
    }

    if (!productSku || !Object.values(ListingPromotionProductSku).includes(productSku)) {
      throw new BadRequestException('INVALID_PRODUCT_SKU: Geçersiz promosyon ürünü seçildi.');
    }

    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
    });


    if (!listing) {
      throw new NotFoundException('LISTING_NOT_FOUND: İlan bulunamadı.');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('UNAUTHORIZED: Bu işlem için ilan sahibi olmalısınız.');
    }

    const urgentRequested =
      productSku === ListingPromotionProductSku.URGENT_LISTING ||
      productSku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE;
    const showcaseRequested =
      productSku === ListingPromotionProductSku.SHOWCASE_FEED ||
      productSku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE;

    const promotionType =
      productSku === ListingPromotionProductSku.SHOWCASE_FEED
        ? ListingPromotionType.SHOWCASE_FEED
        : ListingPromotionType.URGENT_LISTING;

    const now = new Date();

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Purchase with explicit TEST source and NOT_REQUIRED payment status
      const purchase = await tx.listingPromotionPurchase.create({
        data: {
          userId,
          listingId,
          source: ListingPromotionSource.TEST,
          promotionType,
          productSku,
          lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
          paymentStatus: PromotionPaymentStatus.NOT_REQUIRED,
          priceAmount: 0,
          amountMinor: 0,
          currency: 'TRY',
          paymentProvider: 'CONTROLLED_TEST_MODE',
          paymentReferenceId: `TEST_AUTH_${Date.now()}_${listingId.slice(0, 8)}`,
          purchasedAt: now,
        },
      });

      // 2. Create Entitlements
      if (productSku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE) {
        await tx.listingPromotionEntitlement.createMany({
          data: [
            {
              purchaseId: purchase.id,
              listingId,
              promotionType: ListingPromotionType.URGENT_LISTING,
              lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            },
            {
              purchaseId: purchase.id,
              listingId,
              promotionType: ListingPromotionType.SHOWCASE_FEED,
              lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            },
          ],
        });
      } else {
        await tx.listingPromotionEntitlement.create({
          data: {
            purchaseId: purchase.id,
            listingId,
            promotionType,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
          },
        });
      }

      // 3. Verify listing submission readiness
      const submissionReady = isListingSubmissionReady(listing);
      const targetStatus = submissionReady ? ListingStatus.PENDING_REVIEW : listing.status;

      // 4. Update listing request flags and status
      const updatedListing = await tx.vehicleListing.update({
        where: { id: listingId },
        data: {
          urgentRequested,
          showcaseRequested,
          status: targetStatus,
        },
      });

      // 5. Create AuditLog entry
      await tx.auditLog.create({
        data: {
          userId,
          action: 'LISTING_PROMOTION_TEST_AUTHORITY_GRANTED',
          details: {
            listingId,
            productSku,
            purchaseId: purchase.id,
            source: 'TEST',
            targetStatus,
            timestamp: now.toISOString(),
          },
        },
      });

      // 6. If listing is already ACTIVE (e.g. promoting an already published listing), trigger activation
      if (updatedListing.status === ListingStatus.ACTIVE) {
        await this.activationService.tryActivatePromotions(listingId);
      }

      return {
        success: true,
        purchaseId: purchase.id,
        productSku,
        status: updatedListing.status,
        commerceMode: 'TEST' as const,
      };
    });
  }
}
