import { Module } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleFiltersController } from './vehicle-filters.controller';
import { AdminVehicleFiltersController } from './admin-vehicle-filters.controller';
import { VehicleService } from './vehicle.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PrismaService } from '../../prisma.service';

import { DataQualityController } from './data-quality.controller';
import { DataQualityService } from './data-quality.service';
import { VehiclePowerEnrichmentService } from './vehicle-power-enrichment.service';
import { EngineIdentityResolverService } from './engine-identity-resolver.service';
import { WebSearchProvider } from '../research/providers/web-search.provider';
import { CanonicalDisplayService } from './canonical-display.service';
import { VariantTechnicalFactsService } from './variant-technical-facts.service';

@Module({
  controllers: [VehicleController, VehicleFiltersController, AdminVehicleFiltersController, DataQualityController],
  providers: [
    VehicleService,
    SubscriptionService,
    PrismaService,
    DataQualityService,
    VehiclePowerEnrichmentService,
    EngineIdentityResolverService,
    WebSearchProvider,
    CanonicalDisplayService,
    VariantTechnicalFactsService,
  ],
  exports: [VehicleService, DataQualityService, VehiclePowerEnrichmentService, EngineIdentityResolverService, CanonicalDisplayService, VariantTechnicalFactsService],
})
export class VehicleModule {}
