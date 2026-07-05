import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';

import { ResearchModule } from '../research/research.module';

@Module({
  imports: [ResearchModule],
  controllers: [ReportController],
  providers: [ReportService, FeatureLimitService, SubscriptionService, PrismaService],
})
export class ReportModule {}
