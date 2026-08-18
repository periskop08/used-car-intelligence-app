import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ReportsOverviewService } from './reports-overview.service';
import { UserReportsService } from './user-reports.service';
import { ProductReportsService } from './product-reports.service';
import { ListingReportsService } from './listing-reports.service';
import { FinanceReportsService } from './finance-reports.service';
import { ClubReportsService } from './club-reports.service';
import { VehicleDataReportsService } from './vehicle-data-reports.service';
import { MarketingReportsService } from './marketing-reports.service';
import { GeographyDeviceReportsService } from './geography-device-reports.service';
import { SystemAiReportsService } from './system-ai-reports.service';
import { MessagingReportsService } from './messaging-reports.service';
import { SecurityReportsService } from './security-reports.service';
import { ReportDrilldownService } from './report-drilldown.service';
import { ReportExportService } from './report-export.service';

const ADMIN_EMAILS = [
  'efeguven9991@gmail.com',
  'm.efeeguven@gmail.com',
  'burhanseckin08@gmail.com',
  'burhanseckin08@icloud.com',
];

@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly overviewService: ReportsOverviewService,
    private readonly userService: UserReportsService,
    private readonly productService: ProductReportsService,
    private readonly listingService: ListingReportsService,
    private readonly financeService: FinanceReportsService,
    private readonly clubService: ClubReportsService,
    private readonly vehicleDataService: VehicleDataReportsService,
    private readonly marketingService: MarketingReportsService,
    private readonly geoDeviceService: GeographyDeviceReportsService,
    private readonly systemAiService: SystemAiReportsService,
    private readonly messagingService: MessagingReportsService,
    private readonly securityService: SecurityReportsService,
    private readonly drilldownService: ReportDrilldownService,
    private readonly exportService: ReportExportService,
  ) {}

  private verifyAdminAccess(req: any) {
    const email = req?.user?.email;
    const role = req?.user?.role;
    const perms = (req?.user?.permissions as string[]) || [];
    const isAdmin =
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN' ||
      role === 'MODERATOR' ||
      perms.includes('ADMIN_PANEL_ACCESS') ||
      (email && ADMIN_EMAILS.includes(email));

    if (!isAdmin) {
      throw new ForbiddenException('Raporlar merkezine yalnızca yetkili yöneticiler erişebilir.');
    }
  }

  @Get('overview')
  async getOverview(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.overviewService.getExecutiveOverview(filter);
  }

  // USER REPORTS
  @Get('users/growth')
  async getUserGrowth(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.userService.getUserGrowth(filter);
  }

  @Get('users/funnel')
  async getUserFunnel(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.userService.getUserFunnel(filter);
  }

  @Get('users/retention')
  async getUserRetention(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.userService.getUserRetention(filter);
  }

  @Get('users/packages')
  async getUserPackages(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.userService.getUserPackages(filter);
  }

  @Get('users/:customerNo')
  async getUserByCustomerNo(@Param('customerNo') customerNo: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.userService.getUserByCustomerNo(customerNo);
  }

  @Post('users/:customerNo/message')
  async sendMessageToUser(
    @Param('customerNo') customerNo: string,
    @Body() body: { content: string; sendAsEmail?: boolean; title?: string },
    @Req() req: any
  ) {
    this.verifyAdminAccess(req);
    return this.userService.sendMessageToUser(customerNo, req.user, body);
  }

  // PRODUCT REPORTS
  @Get('product/ai-reports')
  async getProductAiReports(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.productService.getAiReports(filter);
  }

  @Get('product/chatbot')
  async getProductChatbot(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.productService.getChatbot(filter);
  }

  @Get('product/comparisons')
  async getProductComparisons(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.productService.getComparisons(filter);
  }

  @Get('product/encyclopedia')
  async getProductEncyclopedia(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.productService.getEncyclopedia(filter);
  }

  @Get('product/vehicle-discovery')
  async getProductVehicleDiscovery(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.productService.getVehicleDiscovery(filter);
  }

  // LISTING REPORTS
  @Get('listings/overview')
  async getListingsOverview(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.listingService.getOverview(filter);
  }

  @Get(['listings/performance', 'admin/listings/performance'])
  async getListingsPerformance(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.listingService.getPerformance(filter);
  }

  @Get(['listings/performance/drilldown', 'admin/listings/performance/drilldown'])
  async getListingsPerformanceDrilldown(
    @Query('metric') metric: string,
    @Query('range') range: string,
    @Req() req: any,
  ) {
    this.verifyAdminAccess(req);
    return this.listingService.getPerformanceDrilldown(metric || 'views', range || '30d');
  }

  @Get(['listings/quality', 'admin/listings/quality', 'admin/listings/health'])
  async getListingsQuality(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.listingService.getQuality(filter);
  }

  @Get(['listings/quality/drilldown', 'admin/listings/quality/drilldown', 'admin/listings/health/drilldown'])
  async getListingsQualityDrilldown(
    @Query('category') category: string,
    @Req() req: any,
  ) {
    this.verifyAdminAccess(req);
    return this.listingService.getQualityDrilldown(category || 'brokenMedia');
  }

  @Get('listings/showcase')
  async getListingsShowcase(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.listingService.getShowcase(filter);
  }

  @Get('listings/supply-demand')
  async getListingsSupplyDemand(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.listingService.getSupplyDemand(filter);
  }

  // FINANCE REPORTS
  @Get(['finance/overview', 'admin/finance/overview'])
  async getFinanceOverview(
    @Query('range') range: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    this.verifyAdminAccess(req);
    return this.financeService.getFinanceOverview(range, from, to);
  }

  @Get(['finance/overview/drilldown', 'admin/finance/overview/drilldown'])
  async getFinanceOverviewDrilldown(
    @Query('metric') metric: string,
    @Query('range') range: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    this.verifyAdminAccess(req);
    return this.financeService.getFinanceOverviewDrilldown(metric || 'mrr', range, from, to);
  }

  @Get('finance/subscriptions')
  async getFinanceSubscriptions(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.financeService.getSubscriptions(filter);
  }

  @Get('finance/revenue')
  async getFinanceRevenue(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.financeService.getRevenue(filter);
  }

  @Get(['finance/one-time-packages', 'admin/finance/one-time-packages', 'admin/finance/packages'])
  async getFinanceOneTimePackages(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.financeService.getOneTimePackagesDashboard(filter);
  }

  @Get('finance/costs')
  async getFinanceCosts(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.financeService.getCosts(filter);
  }

  @Get('finance/profitability')
  async getFinanceProfitability(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.financeService.getProfitability(filter);
  }

  // CLUB & OTHER REPORTS
  @Get('club')
  async getClubReports(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.clubService.getClubReports(filter);
  }

  @Get('vehicle-data/coverage')
  async getVehicleDataCoverage(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.vehicleDataService.getCoverage(filter);
  }

  @Get('vehicle-data/evidence')
  async getVehicleDataEvidence(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.vehicleDataService.getEvidence(filter);
  }

  @Get('vehicle-data/gaps')
  async getVehicleDataGaps(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.vehicleDataService.getGaps(filter);
  }

  @Get('marketing')
  async getMarketingReports(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.marketingService.getMarketing(filter);
  }

  @Post('marketing/ad-spend/import')
  async importAdSpend(@Body() body: { records: any[] }, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.marketingService.importAdSpend(body.records || []);
  }

  @Get('geography-device')
  async getGeographyDeviceReports(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.geoDeviceService.getGeographyDevice(filter);
  }

  @Get('system-ai')
  async getSystemAiReports(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.systemAiService.getSystemAi(filter);
  }

  @Get('messaging')
  async getMessagingReports(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.messagingService.getMessaging(filter);
  }

  @Get('security')
  async getSecurityReports(@Query() filter: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.securityService.getSecurity(filter);
  }

  // DRILLDOWNS & EXPORTS
  @Get('drilldowns/:drilldownKey')
  async getDrilldown(@Param('drilldownKey') drilldownKey: string, @Query() query: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.drilldownService.getDrilldown(drilldownKey, query);
  }

  @Post('exports')
  async createExportJob(@Body() body: { reportType: string; format: 'CSV' | 'XLSX'; filters: any }, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.exportService.createExportJob(req.user.id, body.reportType, body.format, body.filters);
  }

  @Get('exports/:jobId')
  async getExportJobStatus(@Param('jobId') jobId: string, @Req() req: any) {
    this.verifyAdminAccess(req);
    return this.exportService.getExportJobStatus(jobId, req.user.id);
  }

  @Get('exports/:jobId/download')
  async downloadExportFile(@Param('jobId') jobId: string, @Res() res: any, @Req() req: any) {
    this.verifyAdminAccess(req);
    const file = await this.exportService.getExportFile(jobId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return res.send(file.content);
  }
}
