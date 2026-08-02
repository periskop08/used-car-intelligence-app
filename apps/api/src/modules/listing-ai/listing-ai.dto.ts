import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class ListingAiChatRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1500)
  message: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class InitialAnalysisRequestDto {
  @IsString()
  idempotencyKey: string;
}

export class ListingChatQuotaDto {
  unlimited: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
}

export class ListingAiChatResponseDto {
  conversationId: string;
  messageId: string;
  answer: string;
  mode: 'AI' | 'SAFE_FALLBACK' | 'SCOPE_REDIRECT';
  listingContextVersion: string;
  quota: ListingChatQuotaDto;
  warnings?: string[];
  createdAt: string;
}
