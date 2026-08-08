import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleReportMode } from '@prisma/client';
import { ExactlyOneOf } from '../../common/decorators/exactly-one-of.decorator';

export class CreateVehicleReportDto {
  @IsEnum(VehicleReportMode)
  @IsOptional()
  mode?: VehicleReportMode;

  @IsString()
  @IsOptional()
  @ExactlyOneOf(['variantId', 'listingId'])
  variantId?: string;

  @IsString()
  @IsOptional()
  listingId?: string;

  @IsString()
  @IsOptional()
  entryPoint?: 'VEHICLE_SEARCH' | 'LISTING_DETAIL';

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsOptional()
  forceRefresh?: boolean;
}

export class CreateListingVehicleReportDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export class RefreshVehicleReportDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsString()
  @IsOptional()
  reason?: string; // USER_REQUESTED | SOURCE_DATA_CHANGED | SYSTEM_CORRECTION
}
