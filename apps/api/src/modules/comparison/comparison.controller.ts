import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ComparisonService } from './comparison.service';
import { CompareVehiclesDto, ComparisonChatDto } from './comparison.dto';
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

  @Get('quota')
  @ApiOperation({ summary: 'Kullanıcının Kalan Chatbot Hakkını ve Paket Araç Limitini Al' })
  async getQuota(@GetUser() user: UserPayload) {
    return this.comparisonService.getUserTierAndLimit(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Araç Varyantlarını Karşılaştır' })
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

  @Post('chat')
  @ApiOperation({ summary: 'Karşılaştırma AI Chatbotuna Soru Sor' })
  @ApiResponse({ status: 201, description: 'Yapay zeka chatbot soruyu yanıtladı.' })
  async chat(
    @GetUser() user: UserPayload,
    @Body() dto: ComparisonChatDto,
  ) {
    try {
      return await this.comparisonService.chat(user.id, dto);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('Comparison chat endpoint error:', err?.message || err);
      throw new BadRequestException(err?.message || 'Chatbot yanıtı oluşturulamadı.');
    }
  }
}
