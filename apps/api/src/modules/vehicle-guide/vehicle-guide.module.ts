import { Module } from '@nestjs/common';
import { VehicleGuideController } from './vehicle-guide.controller';
import { AdminVehicleGuideController } from './admin-vehicle-guide.controller';
import { VehicleGuideService } from './vehicle-guide.service';
import { PrismaService } from '../../prisma.service';
import { R2Service } from '../listing/r2.service';

@Module({
  controllers: [VehicleGuideController, AdminVehicleGuideController],
  providers: [VehicleGuideService, PrismaService, R2Service],
  exports: [VehicleGuideService],
})
export class VehicleGuideModule {}
