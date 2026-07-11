import { IsString, IsOptional, IsEnum, Length, Matches, IsJSON, IsNotEmpty } from 'class-validator';
import { DisplayNamePreference } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 30, { message: 'Kullanıcı adı 3 ila 30 karakter uzunluğunda olmalıdır.' })
  @Matches(/^[a-z0-9._]+$/, { message: 'Kullanıcı adı yalnızca küçük harf, rakam, nokta ve alt çizgi içerebilir.' })
  username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Ad boş olamaz.' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Soyad boş olamaz.' })
  lastName?: string;

  @IsOptional()
  @IsEnum(DisplayNamePreference, { message: 'Geçersiz görünen ad tercihi.' })
  displayNamePreference?: DisplayNamePreference;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Mevcut şifre gereklidir.' })
  currentPassword!: string;

  @IsString()
  @Length(6, 50, { message: 'Yeni şifre en az 6 karakter olmalıdır.' })
  newPassword!: string;
}

export class UpdateNotificationsDto {
  @IsOptional()
  emailMessages?: boolean;

  @IsOptional()
  emailListingUpdates?: boolean;

  @IsOptional()
  emailSavedSearchAlerts?: boolean;

  @IsOptional()
  emailSubscriptionUpdates?: boolean;

  @IsOptional()
  pushMessages?: boolean;

  @IsOptional()
  pushListingUpdates?: boolean;

  @IsOptional()
  pushSavedSearchAlerts?: boolean;
}

export class CancelAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'İşlemi onaylamak için şifrenizi girmeniz gerekmidir.' })
  password!: string;
}
