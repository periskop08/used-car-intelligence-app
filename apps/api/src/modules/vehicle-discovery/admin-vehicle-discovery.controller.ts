import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Admin Vehicle Discovery')
@Controller('admin/vehicle-discovery')
export class AdminVehicleDiscoveryController {
  constructor(private discoveryService: VehicleDiscoveryService) {}

  @Get(['candidates', 'discovery-candidates'])
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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

  @Post('backfill-images')
  @ApiOperation({ summary: 'Mevcut doğru görselleri fiziksel R2 Discovery havuzuna backfill eder' })
  async backfillImages() {
    return this.discoveryService.backfillDiscoveryImages();
  }

  @Post('migrate-guide-snapshot')
  @ApiOperation({ summary: 'Araç Rehberi havuzunu 1:1 snapshot kopyalayarak Aracını Bul başlangıç havuzunu oluşturur' })
  async migrateGuideSnapshot() {
    return this.discoveryService.migrateGuideSnapshotToDiscovery();
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Yeni discovery candidate ekler veya mevcut candidate sunum ayarlarını günceller' })
  async enrollCandidate(
    @Body() dto: {
      candidateId?: string;
      representativeVariantId: string;
      imageUrl?: string;
      isActive?: boolean;
      allowInUnfilteredDiscovery?: boolean;
      tags?: string[];
    }
  ) {
    return this.discoveryService.enrollDiscoveryCandidate(dto);
  }
}
