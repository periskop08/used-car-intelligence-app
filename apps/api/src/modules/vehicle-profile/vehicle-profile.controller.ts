import { Controller, Get, Query, Param } from '@nestjs/common';
import { VehicleProfileService } from './vehicle-profile.service';

@Controller('vehicle-profiles')
export class VehicleProfileController {
  constructor(private readonly vehicleProfileService: VehicleProfileService) {}

  @Get('guide')
  async getGuideProfiles(
    @Query('search') search?: string,
    @Query('brand') brand?: string,
    @Query('bodyType') bodyType?: string
  ) {
    return this.vehicleProfileService.getPublicGuideProfiles({ search, brand, bodyType });
  }

  @Get('discovery/candidates')
  async getDiscoveryCandidates(
    @Query('bodyType') bodyType?: string,
    @Query('fuelType') fuelType?: string,
    @Query('transmissionType') transmissionType?: string
  ) {
    return this.vehicleProfileService.getPublicDiscoveryCandidateCards({
      bodyType,
      fuelType,
      transmissionType,
    });
  }

  @Get(':id')
  async getProfileById(@Param('id') id: string) {
    return this.vehicleProfileService.getProfileById(id);
  }
}
