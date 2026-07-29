import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class CompareVehiclesDto {
  @ApiProperty({ description: 'Karşılaştırılacak 1. Araç Varyantı UUIDsi' })
  @IsUUID()
  variant1Id!: string;

  @ApiProperty({ description: 'Karşılaştırılacak 2. Araç Varyantı UUIDsi' })
  @IsUUID()
  variant2Id!: string;
}

export class ComparisonChatDto {
  @ApiProperty({ description: '1. Araç Varyantı UUIDsi' })
  @IsUUID()
  variant1Id!: string;

  @ApiProperty({ description: '2. Araç Varyantı UUIDsi' })
  @IsUUID()
  variant2Id!: string;

  @ApiProperty({ description: 'Kullanıcının sorduğu soru' })
  @IsString()
  @IsNotEmpty()
  question!: string;
}
