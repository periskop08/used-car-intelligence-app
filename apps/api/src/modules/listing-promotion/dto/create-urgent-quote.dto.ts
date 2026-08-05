import { IsString, IsNotEmpty } from 'class-validator';

export class CreateUrgentQuoteDto {
  @IsString()
  @IsNotEmpty()
  listingId: string;
}

export class UrgentQuoteResponseDto {
  quoteId: string;
  listingId: string;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  pricingVersion: string;
  taxIncluded: boolean;
  taxRate?: number;
  termsVersion: string;
  expiresAt: string;
}
