import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreatePromotionCheckoutDto {
  @IsString()
  @IsNotEmpty()
  quoteId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsBoolean()
  termsAccepted: boolean;

  @IsString()
  @IsNotEmpty()
  termsVersion: string;

  @IsOptional()
  @IsString()
  entryPoint?: 'LISTING_CREATE_STEP_5' | 'LISTING_MANAGEMENT';
}

export class PromotionCheckoutResponseDto {
  purchaseId: string;
  listingId: string;
  productSku: string;
  lifecycleStatus: string;
  paymentStatus: string;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  checkoutAvailable: boolean;
  paymentProviderUrl?: string;
  checkoutUnavailableCode?: string;
  checkoutUnavailableMessage?: string;
  checkoutExpiresAt: string;
}
