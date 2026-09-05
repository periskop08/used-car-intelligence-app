import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PromotionCatalogConfig, SingleProductConfig, UpdateProductConfigDto } from './dto/promotion-product-config.dto';
import { CreatePromotionQuoteDto, PromotionQuoteResponseDto } from './dto/create-promotion-quote.dto';
import { ListingPromotionProductSku, ListingPromotionType } from '@prisma/client';

@Injectable()
export class ListingPromotionPricingService {
  private catalog: PromotionCatalogConfig = {
    URGENT_LISTING: {
      enabled: true,
      priceAmount: 99.00,
      amountMinor: 9900,
      currency: 'TRY',
      taxIncluded: true,
      taxRate: 20.0,
      pricingVersion: 'v1',
      termsVersion: 'urgent-terms-v1',
      quoteTtlMinutes: 15,
      durationPolicy: 'CURRENT_LISTING_PERIOD',
    },
    SHOWCASE_FEED: {
      enabled: true,
      priceAmount: 199.00,
      amountMinor: 19900,
      currency: 'TRY',
      taxIncluded: true,
      taxRate: 20.0,
      pricingVersion: 'v1',
      termsVersion: 'showcase-terms-v1',
      quoteTtlMinutes: 15,
      durationPolicy: 'CURRENT_LISTING_PERIOD',
    },
    URGENT_SHOWCASE_BUNDLE: {
      enabled: true,
      priceAmount: 249.00,
      amountMinor: 24900,
      currency: 'TRY',
      taxIncluded: true,
      taxRate: 20.0,
      pricingVersion: 'v1',
      termsVersion: 'bundle-terms-v1',
      quoteTtlMinutes: 15,
      durationPolicy: 'CURRENT_LISTING_PERIOD',
    },
  };

  constructor(private prisma: PrismaService) {}

  public getCatalogConfig(): PromotionCatalogConfig {
    return JSON.parse(JSON.stringify(this.catalog));
  }

  public getPricingDetails() {
    const catalog = this.getCatalogConfig();
    const urgentAmount = catalog.URGENT_LISTING.amountMinor;
    const showcaseAmount = catalog.SHOWCASE_FEED.amountMinor;
    const bundleAmount = catalog.URGENT_SHOWCASE_BUNDLE.amountMinor;

    const individualTotalMinor = urgentAmount + showcaseAmount;
    const savingsAmountMinor = Math.max(0, individualTotalMinor - bundleAmount);

    return {
      catalog,
      urgentPriceAmount: catalog.URGENT_LISTING.priceAmount,
      showcasePriceAmount: catalog.SHOWCASE_FEED.priceAmount,
      bundlePriceAmount: catalog.URGENT_SHOWCASE_BUNDLE.priceAmount,
      individualTotalAmount: individualTotalMinor / 100,
      individualTotalMinor,
      savingsAmount: savingsAmountMinor / 100,
      savingsAmountMinor,
      commerceMode: (process.env.LISTING_PROMOTION_COMMERCE_MODE || 'TEST') as 'TEST' | 'LIVE',
    };
  }

  public updateProductConfig(dto: UpdateProductConfigDto, adminId: string): PromotionCatalogConfig {
    const amountMinor = Math.round(dto.priceAmount * 100);
    const existing = this.catalog[dto.productSku];
    if (!existing) {
      throw new BadRequestException('INVALID_PRODUCT_SKU: Geçersiz promosyon ürünü.');
    }

    this.catalog[dto.productSku] = {
      ...existing,
      enabled: dto.enabled,
      priceAmount: dto.priceAmount,
      amountMinor,
      currency: dto.currency || 'TRY',
      taxIncluded: dto.taxIncluded !== undefined ? dto.taxIncluded : true,
      taxRate: dto.taxRate !== undefined ? dto.taxRate : 20.0,
      pricingVersion: dto.pricingVersion || existing.pricingVersion,
      termsVersion: dto.termsVersion || existing.termsVersion,
      quoteTtlMinutes: dto.quoteTtlMinutes || existing.quoteTtlMinutes,
      updatedByAdminId: adminId,
      updatedAt: new Date().toISOString(),
    };
    return this.getCatalogConfig();
  }

  public async createQuote(userId: string, dto: CreatePromotionQuoteDto): Promise<PromotionQuoteResponseDto> {
    const productSku = dto.productSku || ListingPromotionProductSku.URGENT_LISTING;
    const config = this.catalog[productSku];

    if (!config || !config.enabled) {
      throw new BadRequestException(`PROMOTION_DISABLED: ${productSku} hizmeti şu an aktif değildir.`);
    }

    if (config.priceAmount <= 0) {
      throw new BadRequestException('INVALID_PRICE_CONFIG: Geçerli bir promosyon fiyatı tanımlanmamış.');
    }

    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: dto.listingId },
      include: {
        promotionEntitlements: {
          where: {
            lifecycleStatus: { in: ['PENDING_ACTIVATION', 'ACTIVE'] },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('LISTING_NOT_FOUND: İlan bulunamadı.');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('FORBIDDEN: Bu işlem yalnızca ilan sahibi tarafından yapılabilir.');
    }

    const liveTypes = new Set(listing.promotionEntitlements.map((e) => e.promotionType));

    if (productSku === ListingPromotionProductSku.URGENT_LISTING && liveTypes.has(ListingPromotionType.URGENT_LISTING)) {
      throw new BadRequestException('PROMOTION_ALREADY_ACTIVE: Bu ilan için zaten aktif bir Acil İlan hakkı mevcuttur.');
    }

    if (productSku === ListingPromotionProductSku.SHOWCASE_FEED && liveTypes.has(ListingPromotionType.SHOWCASE_FEED)) {
      throw new BadRequestException('PROMOTION_ALREADY_ACTIVE: Bu ilan için zaten aktif bir Vitrin + Akış hakkı mevcuttur.');
    }

    if (productSku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE && liveTypes.size > 0) {
      throw new BadRequestException('BUNDLE_NOT_ELIGIBLE: İlanınızda bileşenlerden biri zaten aktif olduğu için Hızlı Satış paketi satın alınamaz.');
    }

    let promotionType: ListingPromotionType = ListingPromotionType.URGENT_LISTING;
    if (productSku === ListingPromotionProductSku.SHOWCASE_FEED) {
      promotionType = ListingPromotionType.SHOWCASE_FEED;
    } else if (productSku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE) {
      promotionType = ListingPromotionType.URGENT_LISTING;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.quoteTtlMinutes * 60 * 1000);

    const quote = await this.prisma.listingPromotionQuote.create({
      data: {
        userId,
        listingId: listing.id,
        promotionType,
        productSku,
        priceAmount: config.priceAmount,
        amountMinor: config.amountMinor,
        currency: config.currency,
        pricingVersion: config.pricingVersion,
        taxIncluded: config.taxIncluded,
        taxRate: config.taxRate,
        termsVersion: config.termsVersion,
        expiresAt,
      },
    });

    let remainingListingDays: number | undefined;
    let promotionExpiresAt: string | undefined;

    if (listing.expiresAt) {
      const diffMs = new Date(listing.expiresAt).getTime() - now.getTime();
      remainingListingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      promotionExpiresAt = new Date(listing.expiresAt).toISOString();
    }

    return {
      quoteId: quote.id,
      listingId: quote.listingId,
      productSku: quote.productSku,
      promotionType: quote.promotionType,
      priceAmount: Number(quote.priceAmount),
      amountMinor: quote.amountMinor,
      currency: quote.currency,
      pricingVersion: quote.pricingVersion,
      taxIncluded: quote.taxIncluded,
      taxRate: quote.taxRate ? Number(quote.taxRate) : undefined,
      termsVersion: quote.termsVersion,
      expiresAt: quote.expiresAt.toISOString(),
      remainingListingDays,
      promotionExpiresAt,
    };
  }
}
