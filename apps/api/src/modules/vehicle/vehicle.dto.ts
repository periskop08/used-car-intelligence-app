import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

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
