import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { GenerateReportDto, AskChatDto } from './report.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Yapay Zeka Destekli Araç Raporu Oluştur' })
  @ApiResponse({ status: 201, description: 'Rapor başarıyla oluşturuldu/güncellendi ve kaydedildi.' })
  generateReport(
    @GetUser() user: UserPayload,
    @Body() dto: GenerateReportDto,
  ) {
    return this.reportService.generateReport(user.id, dto);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Yapay Zekaya Araç Hakkında Özel Soru Sor' })
  @ApiResponse({ status: 200, description: 'Yapay zeka yanıtı döndürüldü ve günlük soru limitinden düşüldü.' })
  askChatQuestion(
    @GetUser() user: UserPayload,
    @Body() dto: AskChatDto,
  ) {
    return this.reportService.askChatQuestion(user.id, dto);
  }
}
