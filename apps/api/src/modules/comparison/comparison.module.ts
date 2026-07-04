import { Module } from '@nestjs/common';
import { ComparisonController } from './comparison.controller';
import { ComparisonService } from './comparison.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ComparisonController],
  providers: [ComparisonService, FeatureLimitService, SubscriptionService, PrismaService],
})
export class ComparisonModule {}
