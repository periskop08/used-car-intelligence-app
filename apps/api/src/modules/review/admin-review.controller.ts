import { Controller, Get, Patch, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Admin Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/vehicle-reviews')
export class AdminReviewController {
  constructor(private reviewService: ReviewService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Araç Sorgula yorumlarının varyant bazlı moderasyon özetini getirir.' })
  async getReviewsOverview(@GetUser() user: UserPayload) {
    this.assertAdmin(user);
    return this.reviewService.adminGetReviewsOverview();
  }

  @Get('variant/:variantId')
  @ApiOperation({ summary: 'Belirli bir araç varyantına ait tüm Araç Sorgula kullanıcı yorumlarını getirir.' })
  async getVariantReviews(
    @Param('variantId') variantId: string,
    @GetUser() user: UserPayload,
    @Query('status') statusFilter?: string,
  ) {
    this.assertAdmin(user);
    return this.reviewService.adminGetVariantReviews(variantId, statusFilter);
  }

  @Patch(':reviewId/status')
  @ApiOperation({ summary: 'Araç Sorgula kullanıcı yorumunun moderasyon durumunu (APPROVED / REJECTED) günceller.' })
  async updateReviewStatus(
    @Param('reviewId') reviewId: string,
    @Body() dto: { status: 'APPROVED' | 'REJECTED' },
    @GetUser() user: UserPayload,
  ) {
    this.assertAdmin(user);
    const adminName = user.email || user.id;
    return this.reviewService.adminUpdateReviewStatus(reviewId, { id: user.id, name: adminName }, dto.status);
  }

  private assertAdmin(user: UserPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yönetici (Admin) yetkisi gerekmektedir.');
    }
  }
}
