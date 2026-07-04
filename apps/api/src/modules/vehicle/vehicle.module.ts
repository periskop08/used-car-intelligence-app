import { Module } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [VehicleController],
  providers: [VehicleService, SubscriptionService, PrismaService],
  exports: [VehicleService],
})
export class VehicleModule {}
