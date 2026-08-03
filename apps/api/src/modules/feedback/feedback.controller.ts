import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';
import { FeedbackSource, FeedbackCategory, FeedbackStatus, FeedbackPriority } from '@prisma/client';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller()
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Geri bildirim gönder' })
  @ApiResponse({ status: 201, description: 'Geri bildirim başarıyla kaydedildi.' })
  async createFeedback(
    @GetUser() user: UserPayload,
    @Body('subjectCategory') category: FeedbackCategory,
    @Body('message') message: string,
    @Body('source') source?: FeedbackSource,
    @Body('referenceType') referenceType?: string,
    @Body('referenceId') referenceId?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.feedbackService.createFeedback(
      user.id,
      category,
      message,
      source,
      referenceType,
      referenceId,
      file,
    );
  }

  @Get('admin/feedbacks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tüm geri bildirimleri listele (Admin Operation Center)' })
  async getAdminFeedbacks(
    @GetUser() user: UserPayload,
    @Query('source') source?: FeedbackSource,
    @Query('category') category?: FeedbackCategory,
    @Query('status') status?: FeedbackStatus,
    @Query('priority') priority?: FeedbackPriority,
    @Query('search') search?: string,
    @Query('assignedAdminId') assignedAdminId?: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.feedbackService.getAdminFeedbacks(
      source,
      category,
      status,
      priority,
      search,
      assignedAdminId,
    );
  }

  @Patch('admin/feedbacks/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Geri bildirim detayını veya yöneticisini güncelle (Admin)' })
  async updateFeedback(
    @GetUser() user: UserPayload,
    @Param('id') id: string,
    @Body()
    dto: {
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      source?: FeedbackSource;
      subjectCategory?: FeedbackCategory;
      assignedAdminId?: string;
      assignedAdminName?: string;
      internalNote?: string;
    },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    const adminName = `${user.email.split('@')[0]}`;
    return this.feedbackService.updateFeedback(id, { id: user.id, name: adminName }, dto);
  }

  @Post('admin/feedbacks/:id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kullanıcıya resmi yanıt ve bildirim gönder (Admin)' })
  async sendUserResponse(
    @GetUser() user: UserPayload,
    @Param('id') id: string,
    @Body()
    dto: {
      responseMessage: string;
      channel?: 'IN_APP' | 'EMAIL' | 'BOTH';
      markStatus?: FeedbackStatus;
    },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    const adminName = `${user.email.split('@')[0]}`;
    return this.feedbackService.sendUserResponse(id, { id: user.id, name: adminName }, dto);
  }

  @Post('admin/feedbacks/:id/revoke-restriction')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Geri bildirime bağlı Club kısıtlamasını kaldır (Admin)' })
  async revokeClubRestriction(
    @GetUser() user: UserPayload,
    @Param('id') id: string,
    @Body('restrictionId') restrictionId: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    const adminName = `${user.email.split('@')[0]}`;
    return this.feedbackService.revokeClubRestriction(id, restrictionId, {
      id: user.id,
      name: adminName,
    });
  }
}
