import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ToggleFavoriteDto {
  @ApiProperty({ description: 'Araç Varyantı UUIDsi' })
  @IsUUID()
  variantId!: string;
}
