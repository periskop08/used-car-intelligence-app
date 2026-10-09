import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogWatchdogService, AnomalyFilterDto } from './catalog-watchdog.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AdminPermission } from '../../common/enums/admin-permission.enum';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Admin Catalog Watchdog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/catalog-watchdog')
export class CatalogWatchdogController {
  constructor(private watchdogService: CatalogWatchdogService) {}

  @Get('anomalies')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'Katalog anomalilerini ve sağlık metriklerini listele' })
  async getAnomalies(@Query() query: AnomalyFilterDto) {
    return this.watchdogService.getAnomalies(query);
  }

  @Post('scan')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Katalog ve popüler modeller için anlık sağlık taraması çalıştır' })
  async runScan(@GetUser() user: UserPayload) {
    return this.watchdogService.runWatchdogScan(user.email || 'ADMIN');
  }

  @Post('anomalies/:id/resolve')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Anomaliyi çözüldü olarak işaretle' })
  async resolveAnomaly(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body('note') note?: string,
  ) {
    return this.watchdogService.resolveAnomaly(id, user.email || 'ADMIN', note);
  }

  @Post('anomalies/:id/ignore')
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Anomaliyi gözardı edildi olarak işaretle' })
  async ignoreAnomaly(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body('reason') reason?: string,
  ) {
    return this.watchdogService.ignoreAnomaly(id, user.email || 'ADMIN', reason);
  }
}
