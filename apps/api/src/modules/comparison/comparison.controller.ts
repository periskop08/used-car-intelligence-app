import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ComparisonService } from './comparison.service';
import { CompareVehiclesDto } from './comparison.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Comparisons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comparisons')
export class ComparisonController {
  constructor(private comparisonService: ComparisonService) {}

  @Get('history')
  @ApiOperation({ summary: 'Kullanıcının Karşılaştırma Geçmişini Al' })
  getComparisonHistory(@GetUser() user: UserPayload) {
    return this.comparisonService.getComparisonHistory(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'İki Araç Varyantını Karşılaştır' })
  @ApiResponse({ status: 201, description: 'Araçlar karşılaştırıldı ve geçmişe kaydedildi.' })
  async compare(
    @GetUser() user: UserPayload,
    @Body() dto: CompareVehiclesDto,
  ) {
    try {
      return await this.comparisonService.compare(user.id, dto);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('Comparison endpoint error:', err?.message || err);
      throw new BadRequestException(err?.message || 'Karşılaştırma işlemi gerçekleştirilemedi.');
    }
  }
}
