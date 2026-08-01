import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReportsController } from './reports.controller';
import { AnalyticsEventService } from './analytics-event.service';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { ReportExportService } from './report-export.service';
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

@Module({
  controllers: [ReportsController],
  providers: [
    PrismaService,
    AnalyticsEventService,
    AnalyticsAggregationService,
    ReportExportService,
    ReportsOverviewService,
    UserReportsService,
    ProductReportsService,
    ListingReportsService,
    FinanceReportsService,
    ClubReportsService,
    VehicleDataReportsService,
    MarketingReportsService,
    GeographyDeviceReportsService,
    SystemAiReportsService,
    MessagingReportsService,
    SecurityReportsService,
    ReportDrilldownService,
  ],
  exports: [AnalyticsEventService, AnalyticsAggregationService],
})
export class ReportsModule {}
