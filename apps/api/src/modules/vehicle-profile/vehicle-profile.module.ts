import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleProfileService } from './vehicle-profile.service';
import { AdminVehicleProfileController } from './admin-vehicle-profile.controller';
import { VehicleProfileController } from './vehicle-profile.controller';
import { R2Service } from '../listing/r2.service';

@Module({
  controllers: [AdminVehicleProfileController, VehicleProfileController],
  providers: [VehicleProfileService, PrismaService, R2Service],
  exports: [VehicleProfileService],
})
export class VehicleProfileModule {}

