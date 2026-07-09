import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsInt, IsOptional } from 'class-validator';

export class GetModelsFilterDto {
  @ApiProperty({ description: 'Marka IDsi' })
  @IsUUID()
  brandId!: string;
}

export class GetVariantsFilterDto {
  @ApiProperty({ description: 'Model IDsi' })
  @IsUUID()
  modelId!: string;
}

export class AiGenerateVehicleDto {
  @ApiProperty({ description: 'Marka (örn: Peugeot)' })
  @IsString()
  brand!: string;

  @ApiProperty({ description: 'Model (örn: 307)' })
  @IsString()
  model!: string;

  @ApiProperty({ description: 'Yıl (örn: 2004)' })
  @IsInt()
  year!: number;

  @ApiProperty({ description: 'Kasa Tipi (HATCHBACK, SEDAN, SUV, COUPE, CABRIOLET, WAGON, MINIVAN, OTHER)' })
  @IsString()
  bodyType!: string;

  @ApiProperty({ description: 'Şanzıman (Otomatik, Manuel, DSG, CVT, S Tronic, EDC, DCT)' })
  @IsString()
  transmission!: string;

  @ApiProperty({ description: 'Motor / Yakıt (örn: 1.6 Benzin, 2.0 TDI, 1.5 dCi)' })
  @IsString()
  engine!: string;
}

export class SuggestVehicleDto {
  @ApiProperty({ description: 'Marka IDsi' })
  @IsUUID()
  brandId!: string;

  @ApiProperty({ description: 'Model IDsi' })
  @IsUUID()
  modelId!: string;

  @ApiProperty({ description: 'Kasa Tipi (Sedan, Hatchback, SUV, vb.)' })
  @IsString()
  bodyType!: string;

  @ApiProperty({ description: 'Motor Açıklaması (örn: 1.6 TDI, 2.0 TFSI)' })
  @IsString()
  engine!: string;

  @ApiProperty({ description: 'Yakıt Türü (Benzin, Dizel, Hibrit, Elektrik, LPG & Benzin)' })
  @IsString()
  fuelType!: string;

  @ApiProperty({ description: 'Donanım Paketi (örn: Highline, Premium)' })
  @IsString()
  trimName!: string;

  @ApiProperty({ description: 'Şanzıman Türü (Manuel, Otomatik, Yarı Otomatik)' })
  @IsString()
  transmission!: string;

  @ApiProperty({ description: 'Model Yılı' })
  @IsInt()
  year!: number;
}

export class AdminUpdateVariantDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  modelId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodyType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  engine?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fuelType?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trimName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  transmission?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  year?: number;
}
