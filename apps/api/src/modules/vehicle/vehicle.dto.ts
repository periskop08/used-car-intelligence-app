import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsInt } from 'class-validator';

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
