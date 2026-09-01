import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { R2Service } from '../listing/r2.service';

@ApiTags('Admin Vehicle Discovery')
@Controller('admin/vehicle-discovery')
export class AdminVehicleDiscoveryController {
  constructor(
    private discoveryService: VehicleDiscoveryService,
    private r2Service: R2Service,
  ) {}

  @Post('upload-image')
  @ApiOperation({ summary: 'Aracını Bul keşif kartı için Cloudflare R2 ortamına (aracini-bul/) görsel yükler' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDiscoveryImage(@UploadedFile() file: any) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Lütfen yüklenecek geçerli bir görsel dosyası seçin.');
    }
    const result = await this.r2Service.uploadImage(file.buffer, 'aracini-bul');
    if (!result.url) {
      throw new BadRequestException('Görsel Cloudflare R2 sunucusuna yüklenemedi.');
    }
    return { url: result.url };
  }

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
      brandId?: string;
      brand?: string;
      modelId?: string;
      modelFamily?: string;
      generationName?: string;
      bodyType?: string;
      fuelType?: string;
      transmissionType?: string;
      engineId?: string;
      engineVersion?: string;
      power?: string;
      torque?: string;
      averageConsumption?: string;
      drivetrain?: string;
      imageUrl?: string;
      isActive?: boolean;
      allowInUnfilteredDiscovery?: boolean;
      tags?: string[];
      representativeVariantId?: string;
    }
  ) {
    return this.discoveryService.enrollDiscoveryCandidate(dto);
  }
}
