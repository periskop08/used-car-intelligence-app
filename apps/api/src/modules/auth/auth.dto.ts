import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role, SubscriptionTier } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'user@usedcarintel.com', description: 'Kullanıcı email adresi' })
  @IsEmail({}, { message: 'Geçersiz email adresi' })
  email!: string;

  @ApiProperty({ example: 'password123', description: 'Kullanıcı şifresi' })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password!: string;

  @ApiProperty({ enum: Role, required: false, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ enum: SubscriptionTier, required: false, default: SubscriptionTier.FREE })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;
}

export class LoginDto {
  @ApiProperty({ example: 'user@usedcarintel.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password!: string;
}
