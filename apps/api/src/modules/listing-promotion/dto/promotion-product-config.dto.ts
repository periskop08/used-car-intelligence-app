import { IsBoolean, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { ListingPromotionProductSku } from '@prisma/client';

export interface SingleProductConfig {
  enabled: boolean;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  taxIncluded: boolean;
  taxRate: number;
  pricingVersion: string;
  termsVersion: string;
  quoteTtlMinutes: number;
  durationPolicy: 'CURRENT_LISTING_PERIOD';
  updatedByAdminId?: string;
  updatedAt?: string;
}

export interface PromotionCatalogConfig {
  URGENT_LISTING: SingleProductConfig;
  SHOWCASE_FEED: SingleProductConfig;
  URGENT_SHOWCASE_BUNDLE: SingleProductConfig;
}

export class UpdateProductConfigDto {
  @IsEnum(ListingPromotionProductSku)
  productSku: ListingPromotionProductSku;

  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  priceAmount: number;

  @IsString()
  currency: string;

  @IsBoolean()
  taxIncluded: boolean;

  @IsNumber()
  taxRate: number;

  @IsString()
  pricingVersion: string;

  @IsString()
  termsVersion: string;

  @IsOptional()
  @IsNumber()
  quoteTtlMinutes?: number;
}
