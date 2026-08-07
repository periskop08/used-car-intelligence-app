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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Genel Geri bildirim gönder' })
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
      category || FeedbackCategory.GENERAL_SUGGESTION,
      message,
      source || FeedbackSource.ACCOUNT_FEEDBACK,
      referenceType,
      referenceId,
      file,
    );
  }

  @Post('listings/:listingId/report')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'İlan Şikâyet Et / İlanı Bildir (Dedicated Endpoint)' })
  @ApiResponse({ status: 201, description: 'İlan şikâyeti başarıyla alındı.' })
  async createListingReport(
    @GetUser() user: UserPayload,
    @Param('listingId') listingId: string,
    @Body('message') message: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.feedbackService.createListingReport(user.id, listingId, message, file);
  }

  @Get('admin/feedbacks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tüm geri bildirimleri / ilan şikâyetlerini listele (Admin)' })
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

  @Patch('admin/feedbacks/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Geri bildirim / Şikâyet durumunu güncelle (Admin Status Transition)' })
  async updateFeedbackStatus(
    @GetUser() user: UserPayload,
    @Param('id') id: string,
    @Body()
    dto: {
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      assignedAdminId?: string;
      assignedAdminName?: string;
      adminNote?: string;
    },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    const adminName = `${user.email.split('@')[0]}`;
    return this.feedbackService.updateFeedbackStatus(id, { id: user.id, name: adminName }, dto);
  }

  @Post('admin/feedbacks/:id/send-message')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Şikâyet üzerinden Reporter veya İlan Sahibine Mesaj Gönder (Admin)' })
  async sendAdminMessageToFeedbackUser(
    @GetUser() user: UserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      recipient: 'REPORTER' | 'LISTING_OWNER';
      channels: ('IN_APP' | 'EMAIL')[];
      subject?: string;
      message: string;
    },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.feedbackService.sendAdminMessageToFeedbackUser(id, { id: user.id, email: user.email }, body);
  }
}
