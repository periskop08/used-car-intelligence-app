import { IsOptional, IsString, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class ListAdminVehicleReportsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEdited?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasFeedback?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class SaveDraftVehicleReportDto {
  @IsObject()
  reportData: Record<string, any>;

  @IsOptional()
  @IsString()
  changeNote?: string;

  @IsOptional()
  @IsNumber()
  expectedVersion?: number;
}

export class PublishVehicleReportDto {
  @IsOptional()
  @IsString()
  changeNote?: string;
}

export class ResolveReportFeedbackDto {
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}
