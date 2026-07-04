import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, Length, IsInt, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UserRatingDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  reliability!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  fuelConsumption!: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  comfort!: number;

  @ApiProperty({ example: 3, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  partCost!: number;

  @ApiProperty({ example: 3, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  maintenanceCost!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  resaleEase!: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  overall!: number;
}

export class CreateReviewDto {
  @ApiProperty({ description: 'Araç Varyantı UUIDsi' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ example: 'Aracın performansı ve konforu mükemmel, ama parça maliyeti bir tık pahalı.', minimum: 20, maximum: 1000 })
  @IsString()
  @Length(20, 1000, { message: 'Yorum en az 20, en fazla 1000 karakter olmalıdır.' })
  comment!: string;

  @ApiProperty({ example: 12, description: 'Ay cinsinden kullanım süresi' })
  @IsInt()
  @Min(0, { message: 'Kullanım süresi negatif olamaz.' })
  usageDuration!: number;

  @ApiProperty({ example: true, description: 'Araç sahibi olup olmadığı' })
  @IsBoolean()
  isOwner!: boolean;

  @ApiProperty({ example: true, description: 'Aracı tavsiye edip etmediği' })
  @IsBoolean()
  recommend!: boolean;

  @ApiProperty({ type: UserRatingDto })
  @ValidateNested()
  @Type(() => UserRatingDto)
  rating!: UserRatingDto;
}
