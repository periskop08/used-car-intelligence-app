import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ToggleFavoriteDto {
  @ApiProperty({ description: 'Araç Varyantı UUIDsi' })
  @IsUUID()
  variantId!: string;
}

export class ToggleFavoriteSellerDto {
  @ApiProperty({ description: 'Satıcı Kullanıcı UUIDsi' })
  @IsUUID()
  sellerId!: string;
}
