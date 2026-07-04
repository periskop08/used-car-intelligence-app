import { Module } from '@nestjs/common';
import { FeatureLimitService } from './feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';

@Module({
  providers: [FeatureLimitService, SubscriptionService, PrismaService],
  exports: [FeatureLimitService],
})
export class FeatureLimitModule {}
