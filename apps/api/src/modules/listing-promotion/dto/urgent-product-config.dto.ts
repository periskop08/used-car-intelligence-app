import { IsBoolean, IsNumber, IsString, IsOptional } from 'class-validator';

export interface UrgentListingProductConfig {
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

export class UpdateUrgentConfigDto {
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
  @IsString()
  adminReason?: string;
}
