import { Controller, Get, Post, Query, Param, Body, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VehicleService } from './vehicle.service';
import { JwtService } from '@nestjs/jwt';
import { AiGenerateVehicleDto } from './vehicle.dto';


@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
  constructor(
    private vehicleService: VehicleService,
    private jwtService: JwtService,
  ) {}

  @Get('brands')
  @ApiOperation({ summary: 'Markaların Listesini Al' })
  @ApiResponse({ status: 200, description: 'Aktif araç markalarının listesi.' })
  getBrands() {
    return this.vehicleService.getBrands();
  }

  @Get('models')
  @ApiOperation({ summary: 'Markaya Ait Modelleri Al' })
  @ApiQuery({ name: 'brandId', required: true, description: 'Marka UUIDsi' })
  getModels(@Query('brandId') brandId: string) {
    if (!brandId) {
      throw new BadRequestException('brandId query parametresi gereklidir.');
    }
    return this.vehicleService.getModels(brandId);
  }

  @Get('variants')
  @ApiOperation({ summary: 'Modele Ait Onaylı Varyantları Al' })
  @ApiQuery({ name: 'modelId', required: true, description: 'Model UUIDsi' })
  getVariants(@Query('modelId') modelId: string) {
    if (!modelId) {
      throw new BadRequestException('modelId query parametresi gereklidir.');
    }
    return this.vehicleService.getVariants(modelId);
  }

  @Get('variants/:id')
  @ApiOperation({ summary: 'Araç Varyant Detayı' })
  @ApiResponse({ status: 200, description: 'Seçili araç varyantının teknik özellikleri, kronik sorunları ve premium checklistleri.' })
  async getVariantDetail(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    let userId: string | undefined = undefined;

    // Optional auth token parsing
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
        });
        userId = payload.id;
      } catch (err) {
        // Log or ignore invalid token to allow anonymous view
      }
    }

    return this.vehicleService.getVariantDetail(id, userId);
  }

  @Post('ai-generate')
  @ApiOperation({ summary: 'Yapay Zeka ile Araç Varyantı Oluştur' })
  @ApiResponse({ status: 201, description: 'Yeni oluşturulan veya mevcut olan araç varyantının IDsi.' })
  aiGenerateVehicle(@Body() dto: AiGenerateVehicleDto) {
    return this.vehicleService.aiGenerateVehicle(dto.query);
  }
}

