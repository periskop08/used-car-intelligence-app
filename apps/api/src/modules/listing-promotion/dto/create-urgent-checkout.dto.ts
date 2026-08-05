import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class CreateUrgentCheckoutDto {
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
}

export class UrgentCheckoutResponseDto {
  purchaseId: string;
  listingId: string;
  lifecycleStatus: string;
  paymentStatus: string;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  paymentProviderUrl?: string;
  checkoutExpiresAt: string;
}
