import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './review.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyantına Yorum Yap' })
  @ApiResponse({ status: 201, description: 'Yorum oluşturuldu ve onay kuyruğuna alındı.' })
  createReview(
    @GetUser() user: UserPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(user.id, dto);
  }
}
