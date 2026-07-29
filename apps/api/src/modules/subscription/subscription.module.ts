import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { BuyerPackageService } from './buyer-package.service';
import { BuyerPackageController } from './buyer-package.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [BuyerPackageController],
  providers: [SubscriptionService, BuyerPackageService, PrismaService],
  exports: [SubscriptionService, BuyerPackageService],
})
export class SubscriptionModule {}
