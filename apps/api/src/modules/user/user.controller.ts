import { Controller, Get, Patch, Post, Delete, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto, UpdatePasswordDto, UpdateNotificationsDto, CancelAccountDto } from './user.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Kullanıcının Kendi Profilini Al' })
  getMe(@GetUser() user: UserPayload) {
    return this.userService.getMe(user.id);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Profil Bilgilerini Güncelle' })
  updateProfile(
    @GetUser() user: UserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Post('me/profile-photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Profil Fotoğrafı Yükle/Değiştir' })
  uploadProfilePhoto(
    @GetUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Lütfen yüklenecek bir görsel dosyası seçin.');
    }
    return this.userService.uploadProfilePhoto(user.id, file.buffer, file.mimetype);
  }

  @Delete('me/profile-photo')
  @ApiOperation({ summary: 'Profil Fotoğrafını Kaldır' })
  deleteProfilePhoto(@GetUser() user: UserPayload) {
    return this.userService.deleteProfilePhoto(user.id);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Şifre Değiştir' })
  updatePassword(
    @GetUser() user: UserPayload,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.userService.updatePassword(user.id, dto);
  }

  @Patch('me/notifications')
  @ApiOperation({ summary: 'Bildirim Ayarlarını Güncelle' })
  updateNotifications(
    @GetUser() user: UserPayload,
    @Body() dto: UpdateNotificationsDto,
  ) {
    return this.userService.updateNotifications(user.id, dto);
  }

  @Post('me/cancel-account')
  @ApiOperation({ summary: 'Hesap İptal Et (Deaktif Et)' })
  cancelAccount(
    @GetUser() user: UserPayload,
    @Body() dto: CancelAccountDto,
  ) {
    return this.userService.cancelAccount(user.id, dto);
  }
}
