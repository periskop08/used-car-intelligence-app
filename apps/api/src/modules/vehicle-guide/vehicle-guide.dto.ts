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
