import { IsString, IsNotEmpty, IsUUID, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'İlan UUIDsi' })
  @IsUUID()
  @IsNotEmpty({ message: 'İlan IDsi gereklidir.' })
  listingId!: string;

  @ApiProperty({ description: 'İlk mesaj içeriği', example: 'Merhaba, araç hala satılık mı?' })
  @IsString()
  @IsNotEmpty({ message: 'Mesaj boş olamaz.' })
  @Length(1, 2000, { message: 'Mesaj en az 1, en fazla 2000 karakter olmalıdır.' })
  firstMessage!: string;
}

export class CreateMessageDto {
  @ApiProperty({ description: 'Mesaj içeriği' })
  @IsString()
  @IsNotEmpty({ message: 'Mesaj boş olamaz.' })
  @Length(1, 2000, { message: 'Mesaj en az 1, en fazla 2000 karakter olmalıdır.' })
  body!: string;
}
