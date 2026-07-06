import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsEmail,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { FuelType, TransmissionType, BodyType, ListingStatus, MediaModerationStatus } from '@prisma/client';

export class CreateListingDto {
  @ApiProperty({ example: 'Temiz Hatasız Volkswagen Golf' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Aracım servis bakımlıdır, kazası yoktur.', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 875000 })
  @IsNumber()
  priceAmount!: number;

  @ApiProperty({ example: 'TRY', default: 'TRY' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'TR', default: 'TR' })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiProperty({ example: 'Marmara', required: false })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ example: 'İstanbul' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Kadıköy', required: false })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiProperty({ example: 2016 })
  @IsNumber()
  modelYear!: number;

  @ApiProperty({ example: 142000 })
  @IsNumber()
  kilometers!: number;

  @ApiProperty({ enum: FuelType, required: false })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiProperty({ enum: TransmissionType, required: false })
  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @ApiProperty({ enum: BodyType, required: false })
  @IsOptional()
  @IsEnum(BodyType)
  bodyType?: BodyType;

  @ApiProperty({ example: 'Beyaz', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'Yok', required: false })
  @IsString()
  @IsOptional()
  damageRecord?: string;

  @ApiProperty({ example: 0, default: 0 })
  @IsNumber()
  @IsOptional()
  tramerAmount?: number;

  @ApiProperty({ example: ['FRONT_BUMPER'], required: false })
  @IsArray()
  @IsOptional()
  paintedParts?: string[];

  @ApiProperty({ example: ['LEFT_FRONT_DOOR'], required: false })
  @IsArray()
  @IsOptional()
  changedParts?: string[];

  @ApiProperty({ example: 'Tüm bakımları zamanında yapıldı.', required: false })
  @IsString()
  @IsOptional()
  maintenanceHistory?: string;

  @ApiProperty({ example: 'https://...', required: false })
  @IsString()
  @IsOptional()
  expertiseReportUrl?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  plateHidden?: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  vinHidden?: boolean;

  @ApiProperty({ example: 'variant-uuid-here', required: false })
  @IsString()
  @IsOptional()
  vehicleVariantId?: string;
}

export class UpdateListingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  priceAmount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsNumber()
  @IsOptional()
  modelYear?: number;

  @IsNumber()
  @IsOptional()
  kilometers?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsEnum(BodyType)
  bodyType?: BodyType;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  damageRecord?: string;

  @IsNumber()
  @IsOptional()
  tramerAmount?: number;

  @IsArray()
  @IsOptional()
  paintedParts?: string[];

  @IsArray()
  @IsOptional()
  changedParts?: string[];

  @IsString()
  @IsOptional()
  maintenanceHistory?: string;

  @IsString()
  @IsOptional()
  expertiseReportUrl?: string;

  @IsBoolean()
  @IsOptional()
  plateHidden?: boolean;

  @IsBoolean()
  @IsOptional()
  vinHidden?: boolean;

  @IsString()
  @IsOptional()
  vehicleVariantId?: string;
}

export class UpdateListingStatusDto {
  @ApiProperty({ enum: ListingStatus })
  @IsEnum(ListingStatus)
  status!: ListingStatus;
}

export class UpdateMediaModerationDto {
  @ApiProperty({ enum: MediaModerationStatus })
  @IsEnum(MediaModerationStatus)
  moderationStatus!: MediaModerationStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class CreateLeadDto {
  @ApiProperty({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsNotEmpty()
  buyerName!: string;

  @ApiProperty({ example: '5551234567' })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  buyerPhone!: string;

  @ApiProperty({ example: 'ahmet@gmail.com' })
  @IsEmail()
  buyerEmail!: string;

  @ApiProperty({ example: 'Merhaba, araca talibim.' })
  @IsString()
  @MaxLength(1000)
  message!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  communicationGranted!: boolean;
}
