import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UrgentListingProductConfig, UpdateUrgentConfigDto } from './dto/urgent-product-config.dto';
import { CreateUrgentQuoteDto, UrgentQuoteResponseDto } from './dto/create-urgent-quote.dto';
import { ListingPromotionType } from '@prisma/client';

@Injectable()
export class ListingPromotionPricingService {
  private config: UrgentListingProductConfig = {
    enabled: true, // Enabled by default so users can select Urgent Listing in Step 5
    priceAmount: 149.90,
    amountMinor: 14990,
    currency: 'TRY',
    taxIncluded: true,
    taxRate: 20.0,
    pricingVersion: 'urgent-v1',
    termsVersion: 'urgent-terms-v1',
    quoteTtlMinutes: 15,
    durationPolicy: 'CURRENT_LISTING_PERIOD',
  };

  constructor(private prisma: PrismaService) {}

  public getProductConfig(): UrgentListingProductConfig {
    return { ...this.config };
  }

  public updateProductConfig(dto: UpdateUrgentConfigDto, adminId: string): UrgentListingProductConfig {
    const amountMinor = Math.round(dto.priceAmount * 100);
    this.config = {
      ...this.config,
      enabled: dto.enabled,
      priceAmount: dto.priceAmount,
      amountMinor,
      currency: dto.currency || 'TRY',
      taxIncluded: dto.taxIncluded !== undefined ? dto.taxIncluded : true,
      taxRate: dto.taxRate !== undefined ? dto.taxRate : 20.0,
      pricingVersion: dto.pricingVersion || this.config.pricingVersion,
      termsVersion: dto.termsVersion || this.config.termsVersion,
      updatedByAdminId: adminId,
      updatedAt: new Date().toISOString(),
    };
    return { ...this.config };
  }

  public async createQuote(userId: string, dto: CreateUrgentQuoteDto): Promise<UrgentQuoteResponseDto> {
    const config = this.getProductConfig();
    if (!config.enabled) {
      throw new BadRequestException('URGENT_PROMOTION_DISABLED: Acil ilan hizmeti şu an aktif değildir.');
    }

    if (config.priceAmount <= 0) {
      throw new BadRequestException('INVALID_PRICE_CONFIG: Geçerli bir acil ilan fiyatı tanımlanmamış.');
    }

    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: dto.listingId },
      include: {
        promotions: {
          where: {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: { in: ['PENDING_ACTIVATION', 'ACTIVE'] },
            paymentStatus: { notIn: ['FAILED', 'REFUNDED', 'REVERSED', 'CHARGEBACK'] },
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

    if (listing.promotions && listing.promotions.length > 0) {
      throw new BadRequestException('ACTIVE_PROMOTION_EXISTS: Bu ilan için zaten aktif veya işlemde bir acil ilan hakkı mevcuttur.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.quoteTtlMinutes * 60 * 1000);

    const quote = await this.prisma.listingPromotionQuote.create({
      data: {
        userId,
        listingId: listing.id,
        promotionType: ListingPromotionType.URGENT_LISTING,
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

    return {
      quoteId: quote.id,
      listingId: quote.listingId,
      priceAmount: Number(quote.priceAmount),
      amountMinor: quote.amountMinor,
      currency: quote.currency,
      pricingVersion: quote.pricingVersion,
      taxIncluded: quote.taxIncluded,
      taxRate: quote.taxRate ? Number(quote.taxRate) : undefined,
      termsVersion: quote.termsVersion,
      expiresAt: quote.expiresAt.toISOString(),
    };
  }
}
