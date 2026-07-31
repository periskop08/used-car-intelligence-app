import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CompareVehiclesDto {
  @ApiProperty({ description: 'Karşılaştırılacak Araç Varyantı UUID dizisi (2 - 10 adet)' })
  @IsArray()
  @IsOptional()
  variantIds?: string[];

  @ApiProperty({ description: 'Karşılaştırılacak 1. Araç Varyantı UUIDsi (opsiyonel)' })
  @IsUUID()
  @IsOptional()
  variant1Id?: string;

  @ApiProperty({ description: 'Karşılaştırılacak 2. Araç Varyantı UUIDsi (opsiyonel)' })
  @IsUUID()
  @IsOptional()
  variant2Id?: string;

  @ApiProperty({ description: 'Aynı isteğin tekrarlanmasını önleyen benzersiz Idempotency UUID anahtarı' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiProperty({ description: 'Kullanıcının karşılaştırma önceliği (örn: BALANCED, FUEL_ECONOMY, COMFORT vb.)' })
  @IsString()
  @IsOptional()
  selectedPriority?: string;
}

export class ComparisonChatDto {
  @ApiProperty({ description: 'Karşılaştırılan Araç Varyant UUID dizisi (2 - 10 adet)' })
  @IsArray()
  @IsOptional()
  variantIds?: string[];

  @ApiProperty({ description: '1. Araç Varyantı UUIDsi (opsiyonel)' })
  @IsUUID()
  @IsOptional()
  variant1Id?: string;

  @ApiProperty({ description: '2. Araç Varyantı UUIDsi (opsiyonel)' })
  @IsUUID()
  @IsOptional()
  variant2Id?: string;

  @ApiProperty({ description: 'Kullanıcının sorduğu soru' })
  @IsString()
  @IsNotEmpty()
  question!: string;
}
