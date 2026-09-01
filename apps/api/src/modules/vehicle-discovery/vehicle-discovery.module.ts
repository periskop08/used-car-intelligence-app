import { Module } from '@nestjs/common';
import { VehicleDiscoveryController } from './vehicle-discovery.controller';
import { AdminVehicleDiscoveryController } from './admin-vehicle-discovery.controller';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { R2Service } from '../listing/r2.service';

@Module({
  controllers: [VehicleDiscoveryController, AdminVehicleDiscoveryController],
  providers: [VehicleDiscoveryService, PrismaService, JwtService, R2Service],
})
export class VehicleDiscoveryModule {}
