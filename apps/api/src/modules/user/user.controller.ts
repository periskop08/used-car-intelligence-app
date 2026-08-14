import { Controller, Get, Patch, Post, Delete, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
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

  @Post('me/forgot-password')
  @ApiOperation({ summary: 'Şifremi Unuttum Talebi Gönder' })
  forgotPassword(@GetUser() user: UserPayload) {
    return this.userService.forgotPassword(user.id);
  }

  @Post('me/cancel-account')
  @ApiOperation({ summary: 'Hesap İptal Et (Deaktif Et)' })
  cancelAccount(
    @GetUser() user: UserPayload,
    @Body() dto: CancelAccountDto,
  ) {
    return this.userService.cancelAccount(user.id, dto);
  }

  // --- ADMIN ROUTES ---

  @Get('admin/list')
  @ApiOperation({ summary: 'Kayıtlı Kullanıcıları Listele (Admin)' })
  getAdminUsers(
    @GetUser() user: UserPayload,
    @Query('search') search?: string,
    @Query('subscriptionTier') subscriptionTier?: string,
    @Query('isActive') isActive?: string,
    @Query('hasListings') hasListings?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDirection') sortDirection?: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Yetkisiz erişim.');
    }
    return this.userService.getAdminUsers({
      search,
      subscriptionTier,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      hasListings: hasListings !== undefined ? hasListings === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy,
      sortDirection: sortDirection === 'asc' ? 'asc' : 'desc',
    });
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Kullanıcı Detayı (Admin)' })
  getAdminUserDetail(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Yetkisiz erişim.');
    }
    return this.userService.getAdminUserDetail(id);
  }

  @Get('admin/messages/all')
  @ApiOperation({ summary: 'Tüm Yönetici Mesajlarını Listele (Admin)' })
  getAdminUserMessagesAll(
    @GetUser() user: UserPayload,
    @Query('search') search?: string,
    @Query('sendInApp') sendInApp?: string,
    @Query('sendEmail') sendEmail?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'MODERATOR') {
      throw new BadRequestException('Yetkisiz erişim.');
    }
    return this.userService.getAdminUserMessagesAll({
      search,
      sendInApp,
      sendEmail,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('admin/:id/message')
  @ApiOperation({ summary: 'Kullanıcıya Uygulama İçi / E-posta Mesajı Gönder (Admin)' })
  sendAdminUserMessage(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() body: { subject: string; message: string; sendInApp?: boolean; sendEmail?: boolean },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Yetkisiz erişim.');
    }
    if (!body.subject || !body.message) {
      throw new BadRequestException('Mesaj başlığı ve içeriği zorunludur.');
    }
    return this.userService.sendAdminUserMessage(id, user.id, user.email, body);
  }

  @Post('admin/:id/notes')
  @ApiOperation({ summary: 'Kullanıcı İçin İnternal Admin Notu Ekle (Admin)' })
  createAdminUserNote(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() body: { content: string },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Yetkisiz erişim.');
    }
    if (!body.content || !body.content.trim()) {
      throw new BadRequestException('Not içeriği boş olamaz.');
    }
    return this.userService.createAdminUserNote(id, user.id, user.email, body.content.trim());
  }

  @Patch('admin/:id/permissions')
  @ApiOperation({ summary: 'Kullanıcı Admin/Moderatör Yetkilerini Güncelle (SuperAdmin)' })
  updateUserPermissions(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() body: { permissions: string[] },
  ) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('Yetki yönetimi yalnızca SUPER_ADMIN tarafından yapılabilir.');
    }
    return this.userService.updateUserPermissions(id, body.permissions || [], user.id, user.email);
  }
}

