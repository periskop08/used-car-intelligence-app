import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VehicleReportService } from './vehicle-report.service';
import { CreateVehicleReportDto, RefreshVehicleReportDto } from './vehicle-report.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('vehicle-reports')
@UseGuards(JwtAuthGuard)
export class VehicleReportController {
  constructor(private readonly reportService: VehicleReportService) {}

  @Post()
  async createReport(@Request() req: any, @Body() dto: CreateVehicleReportDto) {
    return this.reportService.createVehicleReport(req.user.id, dto);
  }

  @Get(':reportId')
  async getReport(@Request() req: any, @Param('reportId') reportId: string) {
    return this.reportService.getReportById(req.user.id, reportId);
  }

  @Get('by-variant/:variantId/current')
  async getCurrentVariantReport(@Request() req: any, @Param('variantId') variantId: string) {
    return this.reportService.getCurrentVariantReport(req.user.id, variantId);
  }

  @Get('by-listing/:listingId/current')
  async getCurrentListingReport(@Request() req: any, @Param('listingId') listingId: string) {
    return this.reportService.getCurrentListingReport(req.user.id, listingId);
  }

  @Post(':reportId/upgrade-version')
  async upgradeReportVersion(@Request() req: any, @Param('reportId') reportId: string) {
    return this.reportService.upgradeReportVersion(req.user.id, reportId);
  }
}
