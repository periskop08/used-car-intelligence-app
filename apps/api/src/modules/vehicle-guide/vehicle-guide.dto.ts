import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum, IsBoolean, IsArray, IsNumber, Min, Max, IsUUID } from 'class-validator';
import { GuideStatus, GuideFactType, GuideSourceType, GuideEventType, Locale, DataConfidence } from '@prisma/client';

export class CreateGuideCardDto {
  @ApiProperty()
  @IsString()
  brand!: string;

  @ApiProperty()
  @IsString()
  model!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  generationName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  generationCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodyType?: string;

  @ApiProperty()
  @IsInt()
  yearStart!: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  yearEnd?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  heroImageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageAltText?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageSource?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageLicense?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  placeholderImageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shortSummary?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageObjectPosition?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageFitMode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  licenseLabelPosition?: string;

  @ApiProperty({ required: false, enum: GuideStatus })
  @IsEnum(GuideStatus)
  @IsOptional()
  status?: GuideStatus;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  facts?: { title: string; description: string; factType?: GuideFactType; displayOrder?: number }[];
}

export class UpdateGuideCardDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  generationName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  generationCode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodyType?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  yearStart?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  yearEnd?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  heroImageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageAltText?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageSource?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageLicense?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  placeholderImageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  shortSummary?: string;

  @ApiProperty({ required: false, enum: GuideStatus })
  @IsEnum(GuideStatus)
  @IsOptional()
  status?: GuideStatus;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageObjectPosition?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageFitMode?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  licenseLabelPosition?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  facts?: { title: string; description: string; factType?: GuideFactType; displayOrder?: number }[];
}

export class CreateGuideFactDto {
  @ApiProperty({ enum: GuideFactType })
  @IsEnum(GuideFactType)
  factType!: GuideFactType;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  iconKey?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ required: false, enum: DataConfidence })
  @IsEnum(DataConfidence)
  @IsOptional()
  confidenceLevel?: DataConfidence;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiProperty({ required: false, enum: GuideSourceType })
  @IsEnum(GuideSourceType)
  @IsOptional()
  sourceType?: GuideSourceType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceNote?: string;
}

export class UpdateGuideFactDto {
  @ApiProperty({ required: false, enum: GuideFactType })
  @IsEnum(GuideFactType)
  @IsOptional()
  factType?: GuideFactType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  iconKey?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ required: false, enum: DataConfidence })
  @IsEnum(DataConfidence)
  @IsOptional()
  confidenceLevel?: DataConfidence;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiProperty({ required: false, enum: GuideSourceType })
  @IsEnum(GuideSourceType)
  @IsOptional()
  sourceType?: GuideSourceType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceNote?: string;

  @ApiProperty({ required: false, enum: GuideStatus })
  @IsEnum(GuideStatus)
  @IsOptional()
  status?: GuideStatus;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateTechnicalInfoDto {
  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  engineOptions?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fuelTypes?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  transmissionOptions?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bodyTypes?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productionYears?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  averageConsumption?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  powerRange?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  torqueRange?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  drivetrain?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  segment?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trunkVolume?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  safetyInfo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiProperty({ required: false, enum: GuideSourceType })
  @IsEnum(GuideSourceType)
  @IsOptional()
  sourceType?: GuideSourceType;
}

export class UpdateTechnicalInfoDto {
  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  engineOptions?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fuelTypes?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  transmissionOptions?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bodyTypes?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productionYears?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  averageConsumption?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  powerRange?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  torqueRange?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  drivetrain?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  segment?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trunkVolume?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  safetyInfo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiProperty({ required: false, enum: GuideSourceType })
  @IsEnum(GuideSourceType)
  @IsOptional()
  sourceType?: GuideSourceType;

  @ApiProperty({ required: false, enum: GuideStatus })
  @IsEnum(GuideStatus)
  @IsOptional()
  status?: GuideStatus;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CardTranslationDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiProperty()
  @IsString()
  shortSummary!: string;
}

export class FactTranslationDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;
}

export class TechnicalInfoTranslationDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  locale!: Locale;

  @ApiProperty()
  @IsString()
  localizedNotes!: string;
}

export class LogGuideEventDto {
  @ApiProperty({ enum: GuideEventType })
  @IsEnum(GuideEventType)
  eventType!: GuideEventType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  durationMs?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  locale?: string;
}

export class CreateVehicleGuideCommentDto {
  @ApiProperty({ description: 'Yorum metni (en az 20, en fazla 1000 karakter)', minLength: 20, maxLength: 1000 })
  @IsString()
  comment!: string;

  @ApiProperty({ description: 'Kullanım süresi (Ay)', minimum: 0 })
  @IsInt()
  @Min(0, { message: 'Kullanım süresi negatif olamaz.' })
  usageMonths!: number;

  @ApiProperty()
  @IsBoolean()
  isOwner!: boolean;

  @ApiProperty()
  @IsBoolean()
  recommends!: boolean;

  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) reliabilityRating!: number;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) fuelRating!: number;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) comfortRating!: number;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) partsRating!: number;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) maintenanceRating!: number;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) resaleRating!: number;
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) overallRating!: number;
}

export class ModerateGuideCommentDto {
  @ApiProperty({ description: 'Moderasyon durumu (APPROVED / REJECTED)' })
  @IsString()
  status!: 'APPROVED' | 'REJECTED';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
