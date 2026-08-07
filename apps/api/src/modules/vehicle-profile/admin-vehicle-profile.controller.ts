import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VehicleProfileService, CreateVehicleProfileDto } from './vehicle-profile.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@Controller('admin/vehicle-profiles')
@UseGuards(JwtAuthGuard)
export class AdminVehicleProfileController {
  constructor(private readonly vehicleProfileService: VehicleProfileService) {}

  @Get()
  async getProfiles(
    @Query('search') search?: string,
    @Query('brand') brand?: string,
    @Query('bodyType') bodyType?: string,
    @Query('showInGuide') showInGuide?: string,
    @Query('showInDiscovery') showInDiscovery?: string,
    @Query('isActive') isActive?: string
  ) {
    return this.vehicleProfileService.getAdminProfiles({
      search,
      brand,
      bodyType,
      showInGuide: showInGuide !== undefined ? showInGuide === 'true' : undefined,
      showInDiscovery: showInDiscovery !== undefined ? showInDiscovery === 'true' : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  async getProfileById(@Param('id') id: string) {
    return this.vehicleProfileService.getProfileById(id);
  }

  @Post()
  async createProfile(@Body() dto: CreateVehicleProfileDto, @GetUser() user: UserPayload) {
    return this.vehicleProfileService.createProfile(dto, user?.id);
  }

  @Patch(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: Partial<CreateVehicleProfileDto>,
    @GetUser() user: UserPayload
  ) {
    return this.vehicleProfileService.updateProfile(id, dto, user?.id);
  }

  @Post(':id/archive')
  async archiveProfile(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.vehicleProfileService.archiveProfile(id, user?.id);
  }
}
