import { IsString, IsNotEmpty, IsObject, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Arama başlığı / adı', example: 'BMW 3 Serisi 2012-2015 Dizel Otomatik' })
  @IsString()
  @IsNotEmpty({ message: 'Arama başlığı boş olamaz.' })
  title!: string;

  @ApiProperty({ description: 'Filtre parametreleri nesnesi' })
  @IsObject()
  @IsNotEmpty({ message: 'Filtre parametreleri gereklidir.' })
  filters!: any;
}

export class UpdateSavedSearchAlertDto {
  @ApiProperty({ description: 'E-posta bildirim durumu' })
  @IsOptional()
  @IsBoolean()
  isEmailAlertActive?: boolean;

  @ApiProperty({ description: 'Push bildirim durumu' })
  @IsOptional()
  @IsBoolean()
  isPushAlertActive?: boolean;
}
