import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FavoriteService } from './favorite.service';
import { ToggleFavoriteDto } from './favorite.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoriteController {
  constructor(private favoriteService: FavoriteService) {}

  @Get()
  @ApiOperation({ summary: 'Kullanıcının Favori Araçlarını Listele' })
  getFavorites(@GetUser() user: UserPayload) {
    return this.favoriteService.getFavorites(user.id);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Aracı Favorilere Ekle / Kaldır' })
  @ApiResponse({ status: 200, description: 'Araç başarıyla favorilere eklendi veya çıkarıldı.' })
  toggleFavorite(
    @GetUser() user: UserPayload,
    @Body() dto: ToggleFavoriteDto,
  ) {
    return this.favoriteService.toggleFavorite(user.id, dto);
  }
}
