import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SavedSearchService } from './saved-search.service';
import { CreateSavedSearchDto, UpdateSavedSearchAlertDto } from './saved-search.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Saved Searches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saved-searches')
export class SavedSearchController {
  constructor(private savedSearchService: SavedSearchService) {}

  @Get()
  @ApiOperation({ summary: 'Kullanıcının Kayıtlı Aramalarını Listele' })
  getSavedSearches(@GetUser() user: UserPayload) {
    return this.savedSearchService.getSavedSearches(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Yeni Arama Filtresini Kaydet' })
  @ApiResponse({ status: 201, description: 'Arama filtresi başarıyla kaydedildi.' })
  createSavedSearch(
    @GetUser() user: UserPayload,
    @Body() dto: CreateSavedSearchDto,
  ) {
    return this.savedSearchService.createSavedSearch(user.id, dto);
  }

  @Patch(':id/alert')
  @ApiOperation({ summary: 'Kayıtlı Arama Bildirim Ayarlarını Güncelle' })
  updateAlerts(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() dto: UpdateSavedSearchAlertDto,
  ) {
    return this.savedSearchService.updateAlerts(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Kayıtlı Aramayı Sil' })
  deleteSavedSearch(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
  ) {
    return this.savedSearchService.deleteSavedSearch(user.id, id);
  }
}
