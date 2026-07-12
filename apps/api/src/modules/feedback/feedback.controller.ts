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
import { FeedbackCategory, FeedbackStatus, FeedbackPriority } from '@prisma/client';

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
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.feedbackService.createFeedback(user.id, category, message, file);
  }

  @Get('admin/feedbacks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tüm geri bildirimleri listele (Admin)' })
  @ApiQuery({ name: 'category', required: false, enum: FeedbackCategory })
  @ApiQuery({ name: 'status', required: false, enum: FeedbackStatus })
  @ApiQuery({ name: 'priority', required: false, enum: FeedbackPriority })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAdminFeedbacks(
    @GetUser() user: UserPayload,
    @Query('category') category?: FeedbackCategory,
    @Query('status') status?: FeedbackStatus,
    @Query('priority') priority?: FeedbackPriority,
    @Query('search') search?: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.feedbackService.getAdminFeedbacks(category, status, priority, search);
  }

  @Patch('admin/feedbacks/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Geri bildirim durumunu veya önceliğini güncelle (Admin)' })
  async updateFeedback(
    @GetUser() user: UserPayload,
    @Param('id') id: string,
    @Body() dto: { status?: FeedbackStatus; priority?: FeedbackPriority },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.feedbackService.updateFeedbackStatusAndPriority(id, dto.status, dto.priority);
  }
}
