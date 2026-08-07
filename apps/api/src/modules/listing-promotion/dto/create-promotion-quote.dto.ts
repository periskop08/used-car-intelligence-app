import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ListingPromotionProductSku } from '@prisma/client';

export class CreatePromotionQuoteDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @IsEnum(ListingPromotionProductSku)
  productSku: ListingPromotionProductSku;
}

export class PromotionQuoteResponseDto {
  quoteId: string;
  listingId: string;
  productSku: ListingPromotionProductSku;
  promotionType: string;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  pricingVersion: string;
  taxIncluded: boolean;
  taxRate?: number;
  termsVersion: string;
  expiresAt: string;
  remainingListingDays?: number;
  promotionExpiresAt?: string;
}
