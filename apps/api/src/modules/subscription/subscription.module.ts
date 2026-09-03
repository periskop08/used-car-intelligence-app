import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { BuyerPackageService } from './buyer-package.service';
import { BuyerPackageController } from './buyer-package.controller';
import { SubscriptionController, AdminPackageGrantController } from './subscription.controller';
import { AdminPricingController } from './admin-pricing.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [BuyerPackageController, SubscriptionController, AdminPackageGrantController, AdminPricingController],
  providers: [SubscriptionService, BuyerPackageService, PrismaService],
  exports: [SubscriptionService, BuyerPackageService],
})
export class SubscriptionModule {}
