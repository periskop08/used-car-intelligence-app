import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsiCepteService } from './isi-cepte.service';

@ApiTags('İşiCepte Öneriyor Public API')
@Controller('isicepte')
export class IsiCepteController {
  constructor(private readonly isiCepteService: IsiCepteService) {}

  @Get('recommendations')
  @ApiOperation({ summary: 'İşiCepte Öneriyor - Aktif Vitrin Otomotiv Üyeleri Keşif Listesi' })
  @ApiQuery({ name: 'city', required: false, description: 'Şehir filtresi (örn: İstanbul)' })
  @ApiQuery({ name: 'brand', required: false, description: 'Marka uzmanlık filtresi (örn: BMW)' })
  @ApiQuery({ name: 'category', required: false, description: 'Kategori filtresi (örn: Motor/Mekanik)' })
  @ApiQuery({ name: 'page', required: false, description: 'Sayfa no (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Sayfa başına kayıt (default 12)' })
  @ApiQuery({ name: 'seed', required: false, description: 'Adil rotasyon için seed' })
  async getRecommendations(
    @Query('city') city?: string,
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('seed') seed?: string,
  ) {
    return this.isiCepteService.getPublicRecommendations({
      city,
      brand,
      category,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      seed,
    });
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'İşiCepte Usta / İşletme Detay Profili' })
  async getProviderDetail(@Param('id') id: string) {
    return this.isiCepteService.getProviderByIdOrSlug(id);
  }

  @Post('events')
  @ApiOperation({ summary: 'İşiCepte Vitrin Analytics Olay Takibi (Impression / Click)' })
  async recordEvent(
    @Body()
    body: {
      eventType: string;
      providerId?: string;
      city?: string;
      brand?: string;
      userId?: string;
      metadata?: any;
    },
  ) {
    return this.isiCepteService.recordEvent(body);
  }
}
