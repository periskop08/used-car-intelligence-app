import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Yeni Kullanıcı Kaydı' })
  @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla kaydedildi ve JWT token döndürüldü.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kullanıcı Girişi' })
  @ApiResponse({ status: 200, description: 'Giriş başarılı, JWT token döndürüldü.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
