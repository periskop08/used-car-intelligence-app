import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  VerifiedSpecLibraryService,
  VerifySpecParams,
} from './verified-spec-library.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AdminPermission } from '../../common/enums/admin-permission.enum';

@ApiTags('Verified Spec Library')
@Controller()
export class VerifiedSpecLibraryController {
  constructor(private specLibraryService: VerifiedSpecLibraryService) {}

  /**
   * Public / Authenticated Live Verification Endpoint:
   * Called by listing creation whenever a vehicle variant/combination is selected.
   */
  @Post('vehicle-specs/verify-live')
  @ApiOperation({ summary: 'Seçilen Araç İçin Canlı AI Motor Teknik Bilgisi Doğrulaması (cc ve HP)' })
  async verifyLive(@Body() body: VerifySpecParams) {
    const result = await this.specLibraryService.verifyAndGetSpecs(body);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Admin Backoffice Endpoints
   */
  @Get('admin/vehicle-data/verified-specs')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'Admin - Doğrulanan Teknik Veri Kütüphanesini Listele' })
  async getLibraryEntries(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('vehicleType') vehicleType?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.specLibraryService.getLibraryEntries({
      page,
      limit,
      vehicleType,
      search,
    });
    return {
      success: true,
      data: result,
    };
  }

  @Get('admin/vehicle-data/verified-specs/stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.VEHICLE_DATA_READ)
  @ApiOperation({ summary: 'Admin - Doğrulanan Teknik Veri Kütüphanesi İstatistikleri' })
  async getLibraryStats() {
    const stats = await this.specLibraryService.getLibraryStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Patch('admin/vehicle-data/verified-specs/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.VEHICLE_DATA_WRITE)
  @ApiOperation({ summary: 'Admin - Kütüphane Kaydını Güncelle' })
  async updateLibraryEntry(
    @Param('id') id: string,
    @Body() body: { displacementCc?: number; powerHp?: number; notes?: string; verificationStatus?: string },
  ) {
    const updated = await this.specLibraryService.updateLibraryEntry(id, body);
    return {
      success: true,
      data: updated,
    };
  }

  @Delete('admin/vehicle-data/verified-specs/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.VEHICLE_DATA_DELETE)
  @ApiOperation({ summary: 'Admin - Kütüphane Kaydını Sil' })
  async deleteLibraryEntry(@Param('id') id: string) {
    await this.specLibraryService.deleteLibraryEntry(id);
    return {
      success: true,
      message: 'Kayıt başarıyla silindi.',
    };
  }
}
