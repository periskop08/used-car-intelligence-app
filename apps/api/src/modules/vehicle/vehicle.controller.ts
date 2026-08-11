import { Controller, Get, Post, Patch, Query, Param, Body, Headers, BadRequestException, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleService } from './vehicle.service';
import { JwtService } from '@nestjs/jwt';
import { AiGenerateVehicleDto, SuggestVehicleDto, AdminUpdateVariantDto } from './vehicle.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';


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
  @ApiResponse({ status: 200, description: 'Seçili araç varyantının teknik özellikleri, sık karşılaşılan durumları ve premium checklistleri.' })
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
    return this.vehicleService.aiGenerateVehicle(dto);
  }

  @Post('suggest')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kullanıcı Tarafından Araç Ekleme Önerisi Gönder' })
  suggestVehicle(@Body() dto: SuggestVehicleDto, @GetUser() user: UserPayload) {
    return this.vehicleService.suggestVariant(dto, user.id);
  }

  @Get('admin/pending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Onay Bekleyen Tüm Araç Varyantlarını Listele (Admin)' })
  getPendingVariants(@GetUser() user: UserPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.getPendingVariants();
  }

  @Patch('admin/:id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyantını Onayla (Admin)' })
  approveVariant(@Param('id') id: string, @GetUser() user: UserPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.approveVariant(id, user.id);
  }

  @Patch('admin/:id/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyantını Reddet (Admin)' })
  rejectVariant(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() body: { reason: string }
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    if (!body || !body.reason) {
      throw new BadRequestException('Reddetme gerekçesi (reason) belirtilmelidir.');
    }
    return this.vehicleService.rejectVariant(id, body.reason, user.id);
  }

  @Get('admin/variants/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyant Veritabanı Listesi (Admin Backoffice)' })
  getAdminVariants(
    @GetUser() user: UserPayload,
    @Query('search') search?: string,
    @Query('brandId') brandId?: string,
    @Query('modelId') modelId?: string,
    @Query('bodyType') bodyType?: string,
    @Query('status') status?: string,
    @Query('marketRegion') marketRegion?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.getAdminVariants({
      search,
      brandId,
      modelId,
      bodyType,
      status,
      marketRegion,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('admin/variants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Yeni Araç Varyantı Ekle (Admin Backoffice - Exact 8 Field Check)' })
  createAdminVariant(
    @GetUser() user: UserPayload,
    @Body() body: any,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.createAdminVariant(body, user.id, user.email);
  }

  @Patch('admin/variants/:id/full')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyantı Inline/Detaylı Düzenle (Admin Backoffice)' })
  updateAdminVariantFull(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() body: any,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.updateAdminVariantFull(id, body, user.id, user.email);
  }

  @Post('admin/variants/:id/archive')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyantını Arşivle / Pasife Al (Admin)' })
  archiveAdminVariant(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.archiveAdminVariant(id, user.id, user.email);
  }

  @Get('admin/variants/:id/impact')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyantı Etki Analizi (Admin)' })
  calculateVariantImpact(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.calculateVariantImpact(id);
  }

  @Get('admin/variants/:id/audit')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyantı Değişiklik Geçmişi (Audit Logs)' })
  getVariantAuditLogs(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.getVariantAuditLogs(id);
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Araç Varyant Bilgilerini Düzenle (Admin)' })
  updateVariant(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() dto: AdminUpdateVariantDto
  ) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır.');
    }
    return this.vehicleService.updateVariant(id, dto);
  }
}


