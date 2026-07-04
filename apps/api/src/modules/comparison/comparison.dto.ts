import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CompareVehiclesDto {
  @ApiProperty({ description: 'Karşılaştırılacak 1. Araç Varyantı UUIDsi' })
  @IsUUID()
  variant1Id!: string;

  @ApiProperty({ description: 'Karşılaştırılacak 2. Araç Varyantı UUIDsi' })
  @IsUUID()
  variant2Id!: string;
}
