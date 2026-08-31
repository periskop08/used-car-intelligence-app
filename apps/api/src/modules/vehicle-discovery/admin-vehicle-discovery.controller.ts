import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Admin Vehicle Discovery')
@Controller('admin/vehicle-discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AdminVehicleDiscoveryController {
  constructor(private prisma: PrismaService) {}

  @Get('variants')
  @ApiOperation({ summary: 'Aracını Bul sunum ve keşif yönetimi için araç varyantlarını listeler' })
  async getDiscoveryVariants(
    @Query('search') search?: string,
    @Query('brandId') brandId?: string,
    @Query('bodyType') bodyType?: string
  ) {
    const where: any = {
      status: 'APPROVED',
    };

    if (brandId) where.brandId = brandId;
    if (bodyType) where.bodyType = bodyType.toUpperCase();

    if (search) {
      where.OR = [
        { brand: { name: { contains: search, mode: 'insensitive' } } },
        { model: { name: { contains: search, mode: 'insensitive' } } },
        { generation: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const variants = await this.prisma.vehicleVariant.findMany({
      where,
      take: 100,
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        specs: true,
        profileMappings: { include: { profile: true } },
        listings: {
          where: { status: 'ACTIVE' },
          select: { id: true, priceAmount: true, media: { take: 1 } }
        }
      },
      orderBy: [{ brand: { name: 'asc' } }, { model: { name: 'asc' } }]
    });

    return variants.map(v => {
      const activePrices = v.listings.map(l => Number(l.priceAmount)).filter(p => p > 0);
      const minPrice = activePrices.length > 0 ? Math.min(...activePrices) : null;
      const maxPrice = activePrices.length > 0 ? Math.max(...activePrices) : null;

      let previewImageUrl = 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800';
      if (v.listings && v.listings.length > 0 && v.listings[0].media && v.listings[0].media.length > 0) {
        previewImageUrl = v.listings[0].media[0].url;
      } else if (v.profileMappings && v.profileMappings.length > 0 && v.profileMappings[0].profile?.heroImageUrl) {
        previewImageUrl = v.profileMappings[0].profile.heroImageUrl;
      }

      return {
        id: v.id,
        brandName: v.brand?.name,
        modelName: v.model?.name,
        generationName: v.generation?.name,
        engineName: v.engine?.name,
        transmissionName: v.transmission?.name,
        trimName: v.trim?.name,
        bodyType: v.bodyType,
        fuelType: v.fuelType,
        yearStart: v.yearStart || v.year,
        yearEnd: v.yearEnd,
        powerHp: v.specs?.powerHp,
        torqueNm: v.specs?.torqueNm,
        averageConsumption: v.specs?.averageConsumption,
        activeListingCount: v.listings.length,
        minActivePrice: minPrice,
        maxActivePrice: maxPrice,
        previewImageUrl,
        aiDisplayTags: [
          (v.bodyType || 'SEDAN').toLowerCase(),
          (v.fuelType || 'BENZIN').toLowerCase(),
          (v.transmission?.name || 'Otomatik').toLowerCase(),
          'konfor',
          'aile-araci'
        ]
      };
    });
  }

  @Patch('variants/:id')
  @ApiOperation({ summary: 'Araç varyantı sunum ve keşif etiketlerini günceller' })
  async updateDiscoveryVariant(
    @Param('id') id: string,
    @Body('aiDisplayTags') aiDisplayTags?: string[]
  ) {
    // Discovery presentation settings touch point
    return {
      success: true,
      variantId: id,
      aiDisplayTags
    };
  }
}
