import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Ip,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ListingService } from './listing.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';
import {
  CreateListingDto,
  UpdateListingDto,
  UpdateListingStatusDto,
  UpdateMediaModerationDto,
  CreateLeadDto,
} from './listing.dto';
import { ListingStatus, MediaModerationStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Listings')
@Controller()
export class ListingController {
  constructor(private listingService: ListingService) {}

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  @Get('listings')
  @ApiOperation({ summary: 'ACTIVE durumundaki ilanları filtrele ve listele' })
  async getPublicListings(
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('vehicleVariantId') vehicleVariantId?: string,
    @Query('minYear') minYear?: string,
    @Query('maxYear') maxYear?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minKm') minKm?: string,
    @Query('maxKm') maxKm?: string,
    @Query('city') city?: string,
    @Query('fuelType') fuelType?: string,
    @Query('transmission') transmission?: string,
    @Query('isAiReady') isAiReady?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Parse filters
    const filters: any = {
      status: ListingStatus.ACTIVE,
      media: {
        some: {
          moderationStatus: MediaModerationStatus.APPROVED,
        },
      },
    };

    if (vehicleVariantId) {
      filters.vehicleVariantId = vehicleVariantId;
    } else {
      if (brandId || modelId) {
        filters.vehicleVariant = {};
        if (brandId) filters.vehicleVariant.brandId = brandId;
        if (modelId) filters.vehicleVariant.modelId = modelId;
      }
    }

    if (minYear || maxYear) {
      filters.modelYear = {};
      if (minYear) filters.modelYear.gte = parseInt(minYear, 10);
      if (maxYear) filters.modelYear.lte = parseInt(maxYear, 10);
    }

    if (minPrice || maxPrice) {
      filters.priceAmount = {};
      if (minPrice) filters.priceAmount.gte = parseFloat(minPrice);
      if (maxPrice) filters.priceAmount.lte = parseFloat(maxPrice);
    }

    if (minKm || maxKm) {
      filters.kilometers = {};
      if (minKm) filters.kilometers.gte = parseInt(minKm, 10);
      if (maxKm) filters.kilometers.lte = parseInt(maxKm, 10);
    }

    if (city) {
      filters.city = city;
    }

    if (fuelType) {
      filters.fuelType = fuelType;
    }

    if (transmission) {
      filters.transmission = transmission;
    }

    if (isAiReady !== undefined) {
      filters.isAiReady = isAiReady === 'true';
    }

    // Sort mappings
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { priceAmount: 'asc' };
    else if (sort === 'price_desc') orderBy = { priceAmount: 'desc' };
    else if (sort === 'km_asc') orderBy = { kilometers: 'asc' };
    else if (sort === 'featured') orderBy = { isFeatured: 'desc' };
    else if (sort === 'ai_ready') orderBy = { isAiReady: 'desc' };

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [items, total] = await Promise.all([
      this.listingService['prisma'].vehicleListing.findMany({
        where: filters,
        orderBy,
        skip,
        take: limitNum,
        include: {
          media: {
            where: { moderationStatus: MediaModerationStatus.APPROVED },
            orderBy: { sortOrder: 'asc' },
          },
          vehicleVariant: {
            include: { brand: true, model: true },
          },
        },
      }),
      this.listingService['prisma'].vehicleListing.count({ where: filters }),
    ]);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Tek bir ilanı detaylarıyla çek' })
  async getListingDetail(@Param('id') id: string) {
    const listing = await this.listingService['prisma'].vehicleListing.findUnique({
      where: { id },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        vehicleVariant: {
          include: {
            brand: true,
            model: true,
            specs: true,
            problems: { where: { status: 'APPROVED' } },
            recalls: { where: { status: 'APPROVED' } },
            checklists: { where: { status: 'APPROVED' } },
            questions: { where: { status: 'APPROVED' } },
            aiReports: { where: { status: 'APPROVED' } },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('İlan bulunamadı.');
    }

    return listing;
  }

  @Get('vehicle-reports/:variantId/related-listings')
  @ApiOperation({ summary: 'Araç varyantına göre ilgili aktif ilanları listele' })
  async getRelatedListings(@Param('variantId') variantId: string) {
    return this.listingService['prisma'].vehicleListing.findMany({
      where: {
        vehicleVariantId: variantId,
        status: ListingStatus.ACTIVE,
      },
      include: {
        media: {
          where: { moderationStatus: MediaModerationStatus.APPROVED },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });
  }

  @Post('listings/:id/leads')
  @ApiOperation({ summary: 'İlan sahibiyle iletişim kurmak için talep gönder' })
  async submitLead(
    @Param('id') id: string,
    @Body() dto: CreateLeadDto,
    @Ip() ipAddress: string,
  ) {
    return this.listingService.createLead(id, dto, ipAddress);
  }

  // ==========================================
  // AUTHENTICATED SELLER ENDPOINTS
  // ==========================================

  @Post('listings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Yeni ilan taslağı oluştur' })
  async createListing(@GetUser() user: UserPayload, @Body() dto: CreateListingDto) {
    return this.listingService.createListing(user.id, dto);
  }

  @Get('me/listings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Satıcının kendi tüm ilanlarını listele' })
  async getMyListings(@GetUser() user: UserPayload) {
    return this.listingService['prisma'].vehicleListing.findMany({
      where: { sellerId: user.id },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        vehicleVariant: { include: { brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('me/listing-quota')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kullanıcının aktif paket kota bilgilerini sorgula' })
  async getMyQuota(@GetUser() user: UserPayload) {
    const dbUser = await this.listingService['prisma'].user.findUnique({
      where: { id: user.id },
    });
    if (!dbUser) throw new NotFoundException('Kullanıcı bulunamadı.');

    const limit = this.listingService.getQuotaForTier(dbUser.subscriptionTier);
    const activeCount = await this.listingService['prisma'].vehicleListing.count({
      where: {
        sellerId: user.id,
        status: { in: [ListingStatus.ACTIVE, ListingStatus.PENDING_REVIEW] },
      },
    });

    return {
      tier: dbUser.subscriptionTier,
      activeCount,
      limit,
      remaining: Math.max(0, limit - activeCount),
    };
  }

  @Patch('listings/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'İlan bilgilerini güncelle' })
  async updateListing(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingService.updateListing(id, user.id, dto);
  }

  @Patch('listings/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'İlan durumunu güncelle (ACTIVE, PASSIVE vb.)' })
  async updateStatus(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() dto: UpdateListingStatusDto,
  ) {
    return this.listingService.updateListingStatus(id, user.id, dto.status);
  }

  @Post('listings/:id/media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'İlana fotoğraf yükle' })
  async uploadMedia(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Lütfen yüklenecek bir dosya seçin.');
    }

    if (!file.buffer) {
      throw new BadRequestException('Dosya içeriği okunamadı.');
    }
    const base64Data = file.buffer.toString('base64');
    const fileUrl = `data:${file.mimetype};base64,${base64Data}`;

    return this.listingService.addMedia(id, user.id, {
      url: fileUrl,
      size: file.size,
      mime: file.mimetype,
    });
  }

  @Delete('listings/:id/media/:mediaId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'İlandan fotoğraf sil' })
  async deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @GetUser() user: UserPayload,
  ) {
    return this.listingService.deleteMedia(id, mediaId, user.id);
  }

  @Post('listings/:id/renew')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Süresi dolmak üzere olan veya pasif ilanı yenile' })
  async renew(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.listingService.renewListing(id, user.id);
  }

  @Post('listings/:id/generate-description')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'İlan için AI destekli şablon açıklama üret' })
  async generateAiDescription(@Param('id') id: string, @GetUser() user: UserPayload) {
    return this.listingService.generateAiDescription(user.id, id);
  }

  // ==========================================
  // ADMIN MODERATION ENDPOINTS
  // ==========================================

  @Get('admin/listings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tüm ilanları listele (Admin)' })
  async getAdminListings(@GetUser() user: UserPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    return this.listingService['prisma'].vehicleListing.findMany({
      include: {
        seller: true,
        media: { orderBy: { sortOrder: 'asc' } },
        vehicleVariant: { include: { brand: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('admin/listings/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'İlan durumunu güncelle (Admin Moderasyon)' })
  async adminUpdateStatus(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() dto: { status: ListingStatus; rejectionReason?: string; adminNote?: string },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    if (dto.status === ListingStatus.ACTIVE) {
      await this.listingService.validateListingCanBecomeActive(id);
    }

    return this.listingService['prisma'].vehicleListing.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.rejectionReason || null,
        adminNote: dto.adminNote || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
  }

  @Patch('admin/listings/:id/feature')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'İlanı öne çıkar (Admin)' })
  async adminToggleFeature(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() dto: { isFeatured: boolean },
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    return this.listingService['prisma'].vehicleListing.update({
      where: { id },
      data: { isFeatured: dto.isFeatured },
    });
  }

  @Patch('admin/listings/:id/media/:mediaId/moderation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'İlan fotoğrafının onay durumunu güncelle (Admin)' })
  async adminUpdateMediaModeration(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @GetUser() user: UserPayload,
    @Body() dto: UpdateMediaModerationDto,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }

    const media = await this.listingService['prisma'].listingMedia.findUnique({
      where: { id: mediaId },
    });
    if (!media || media.listingId !== id) {
      throw new NotFoundException('Görsel bulunamadı.');
    }

    const updatedMedia = await this.listingService['prisma'].listingMedia.update({
      where: { id: mediaId },
      data: { moderationStatus: dto.moderationStatus },
    });

    // If set to REJECTED, trigger reorder & dynamic ACTIVE safety checks
    if (dto.moderationStatus === MediaModerationStatus.REJECTED) {
      await this.listingService.reorderMedia(id);
    }

    return updatedMedia;
  }
}
