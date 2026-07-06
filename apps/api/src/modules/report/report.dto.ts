import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsBoolean } from 'class-validator';

export class GenerateReportDto {
  @ApiProperty({ description: 'Araç Varyantı UUIDsi' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ example: 'tr', required: false, default: 'tr' })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class AskChatDto {
  @ApiProperty({ description: 'Araç Varyantı UUIDsi' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ example: 'Bu aracın şanzıman arızaları maliyetli midir?', description: 'Kullanıcı sorusu' })
  @IsString()
  question!: string;
}
