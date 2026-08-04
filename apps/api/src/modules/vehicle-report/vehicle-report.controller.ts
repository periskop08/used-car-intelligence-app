import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VehicleReportService } from './vehicle-report.service';
import { CreateVehicleReportDto } from './vehicle-report.dto';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';

@Controller('vehicle-reports')
@UseGuards(OptionalJwtAuthGuard)
export class VehicleReportController {
  constructor(private readonly reportService: VehicleReportService) {}

  private getUserId(req: any): string {
    return req.user?.id || (req.headers['x-guest-token'] as string) || 'guest_user';
  }

  @Post()
  async createReport(@Request() req: any, @Body() dto: CreateVehicleReportDto) {
    return this.reportService.createVehicleReport(this.getUserId(req), dto);
  }

  @Get(':reportId')
  async getReport(@Request() req: any, @Param('reportId') reportId: string) {
    return this.reportService.getReportById(this.getUserId(req), reportId);
  }

  @Get('by-variant/:variantId/current')
  async getCurrentVariantReport(@Request() req: any, @Param('variantId') variantId: string) {
    const report = await this.reportService.getCurrentVariantReport(this.getUserId(req), variantId);
    if (!report) {
      return { success: true, cached: false, reportData: null };
    }
    return report;
  }

  @Get('by-listing/:listingId/current')
  async getCurrentListingReport(@Request() req: any, @Param('listingId') listingId: string) {
    const report = await this.reportService.getCurrentListingReport(this.getUserId(req), listingId);
    if (!report) {
      return { success: true, cached: false, reportData: null };
    }
    return report;
  }

  @Post(':reportId/upgrade-version')
  async upgradeReportVersion(@Request() req: any, @Param('reportId') reportId: string) {
    return this.reportService.upgradeReportVersion(this.getUserId(req), reportId);
  }
}
