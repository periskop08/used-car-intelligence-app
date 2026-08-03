import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VehicleReportMode } from '@prisma/client';

export class CreateVehicleReportDto {
  @IsEnum(VehicleReportMode)
  @IsNotEmpty()
  mode: VehicleReportMode;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsString()
  @IsOptional()
  listingId?: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
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
