import { Module } from '@nestjs/common';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [FavoriteController],
  providers: [FavoriteService, FeatureLimitService, SubscriptionService, PrismaService],
})
export class FavoriteModule {}
