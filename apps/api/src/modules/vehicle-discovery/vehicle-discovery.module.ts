import { Module } from '@nestjs/common';
import { VehicleDiscoveryController } from './vehicle-discovery.controller';
import { AdminVehicleDiscoveryController } from './admin-vehicle-discovery.controller';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [VehicleDiscoveryController, AdminVehicleDiscoveryController],
  providers: [VehicleDiscoveryService, PrismaService, JwtService],
})
export class VehicleDiscoveryModule {}
