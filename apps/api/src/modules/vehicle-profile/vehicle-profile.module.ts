import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { VehicleProfileService } from './vehicle-profile.service';
import { AdminVehicleProfileController } from './admin-vehicle-profile.controller';
import { VehicleProfileController } from './vehicle-profile.controller';

@Module({
  controllers: [AdminVehicleProfileController, VehicleProfileController],
  providers: [VehicleProfileService, PrismaService],
  exports: [VehicleProfileService],
})
export class VehicleProfileModule {}
