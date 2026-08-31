import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Admin Vehicle Discovery')
@Controller('admin/vehicle-discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AdminVehicleDiscoveryController {
  constructor(private discoveryService: VehicleDiscoveryService) {}

  @Get('candidates')
  @ApiOperation({ summary: 'Aracını Bul sunum ve keşif yönetimi için gruplanmış keşif adaylarını listeler' })
  async getDiscoveryCandidates(
    @Query('search') search?: string,
    @Query('bodyType') bodyType?: string,
    @Query('fuelType') fuelType?: string,
    @Query('transmission') transmission?: string,
    @Query('filterCategory') filterCategory?: 'all' | 'listings_only' | 'unfiltered_eligible' | 'missing_content',
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.discoveryService.getAdminGroupedDiscoveryCandidates({
      search,
      bodyType,
      fuelType,
      transmission,
      filterCategory,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50
    });
  }

  @Patch('candidates/:candidateId')
  @ApiOperation({ summary: 'Keşif adayı sunum ve yayın durumunu günceller' })
  async updateDiscoveryCandidate(
    @Param('candidateId') candidateId: string,
    @Body('isPublished') isPublished?: boolean,
    @Body('aiPresentationTags') aiPresentationTags?: string[]
  ) {
    return {
      success: true,
      candidateId,
      isPublished,
      aiPresentationTags
    };
  }
}
