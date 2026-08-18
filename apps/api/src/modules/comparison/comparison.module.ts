import { Module } from '@nestjs/common';
import { ComparisonController } from './comparison.controller';
import { ComparisonService } from './comparison.service';
import { ComparisonReportLoaderService } from './comparison-report-loader.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';
import { ResearchModule } from '../research/research.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { VehicleReportModule } from '../vehicle-report/vehicle-report.module';

@Module({
  imports: [ResearchModule, VehicleModule, VehicleReportModule],
  controllers: [ComparisonController],
  providers: [ComparisonService, ComparisonReportLoaderService, FeatureLimitService, SubscriptionService, PrismaService],
  exports: [ComparisonService, ComparisonReportLoaderService],
})
export class ComparisonModule {}
