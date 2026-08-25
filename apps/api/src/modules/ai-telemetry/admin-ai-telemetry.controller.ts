import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AiTelemetryService, TimeRangeKey } from './ai-telemetry.service';
import { PrismaService } from '../../prisma.service';

@ApiTags('Admin AI Operations Telemetry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(['admin/ai-operations', 'api/admin/ai-operations'])
export class AdminAiTelemetryController {
  constructor(
    private readonly telemetryService: AiTelemetryService,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyAdminOnly(req: any) {
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Yetkisiz erişim.');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Bu işlem için admin yetkisi gereklidir.');
    }
  }

  @Get('live-stream')
  @ApiOperation({ summary: 'Canlı Akış — AI İstek Terminali' })
  async getLiveStream(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('operationType') operationType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    await this.verifyAdminOnly(req);
    return this.telemetryService.getLiveStream({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      operationType,
      status,
      search,
    });
  }

  @Get('traces/:traceId')
  @ApiOperation({ summary: 'Tekil Trace İşlem Detayı' })
  async getTraceDetails(@Req() req: any, @Param('traceId') traceId: string) {
    await this.verifyAdminOnly(req);
    return this.telemetryService.getTraceDetails(traceId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Üst KPI Metrikleri' })
  async getMetrics(@Req() req: any, @Query('range') range?: TimeRangeKey) {
    await this.verifyAdminOnly(req);
    return this.telemetryService.getMetrics(range || 'LAST_24_HOURS');
  }

  @Get('slow-requests')
  @ApiOperation({ summary: 'Yavaş Çalışan AI İstekleri' })
  async getSlowRequests(
    @Req() req: any,
    @Query('range') range?: TimeRangeKey,
    @Query('thresholdMs') thresholdMs?: string,
  ) {
    await this.verifyAdminOnly(req);
    return this.telemetryService.getSlowRequests(
      range || 'LAST_24_HOURS',
      thresholdMs ? parseInt(thresholdMs, 10) : 3000,
    );
  }

  @Get('errors')
  @ApiOperation({ summary: 'Hatalar ve Hata Kategorileri' })
  async getErrors(@Req() req: any, @Query('range') range?: TimeRangeKey) {
    await this.verifyAdminOnly(req);
    return this.telemetryService.getErrorMetrics(range || 'LAST_24_HOURS');
  }

  @Get('cost-tokens')
  @ApiOperation({ summary: 'Maliyet ve Token Kullanımı' })
  async getCostAndTokens(@Req() req: any, @Query('range') range?: TimeRangeKey) {
    await this.verifyAdminOnly(req);
    return this.telemetryService.getCostAndTokenMetrics(range || 'LAST_24_HOURS');
  }

  @Get('provider-status')
  @ApiOperation({ summary: 'Aktif Provider Sağlık Durumu' })
  async getProviderStatus(@Req() req: any, @Query('range') range?: TimeRangeKey) {
    await this.verifyAdminOnly(req);
    return this.telemetryService.getProviderStatusMetrics(range || 'LAST_24_HOURS');
  }
}
