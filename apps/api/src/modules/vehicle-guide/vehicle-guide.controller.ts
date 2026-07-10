import { Controller, Get, Post, Query, Param, Body, Headers, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleGuideService } from './vehicle-guide.service';
import { JwtService } from '@nestjs/jwt';
import { Locale } from '@prisma/client';
import { LogGuideEventDto } from './vehicle-guide.dto';

@ApiTags('Vehicle Guide')
@Controller('vehicle-guide')
export class VehicleGuideController {
  constructor(
    private guideService: VehicleGuideService,
    private jwtService: JwtService,
  ) {}

  @Get('cards/random')
  @ApiOperation({ summary: 'Yayındaki aktif rehber kartlarından rastgele döner.' })
  async getRandomCard(
    @Query('locale') localeQuery?: string,
    @Headers('x-session-id') sessionId?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const locale = localeQuery === 'en' ? Locale.en : Locale.tr;
    const userId = await this.tryGetUserId(authHeader);

    return this.guideService.getRandomCard(userId, sessionId, locale);
  }

  @Get('cards/:id')
  @ApiOperation({ summary: 'Belirli bir rehber kartının detayını getirir.' })
  getCardDetail(
    @Param('id') id: string,
    @Query('locale') localeQuery?: string,
  ) {
    const locale = localeQuery === 'en' ? Locale.en : Locale.tr;
    return this.guideService.getCardDetail(id, locale);
  }

  @Get('cards/:id/technical-info')
  @ApiOperation({ summary: 'Kartın teknik bilgi kutusundaki detayları getirir.' })
  getTechnicalInfo(
    @Param('id') id: string,
    @Query('locale') localeQuery?: string,
  ) {
    const locale = localeQuery === 'en' ? Locale.en : Locale.tr;
    return this.guideService.getTechnicalInfo(id, locale);
  }

  @Post('cards/:id/event')
  @ApiOperation({ summary: 'Kartla ilgili bir aksiyon (swipe, view, open-tech, cta) loglar.' })
  async logEvent(
    @Param('id') id: string,
    @Body() dto: LogGuideEventDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = await this.tryGetUserId(authHeader);
    return this.guideService.logEvent(id, userId || null, dto);
  }

  @Get('cards/:id/related-listings')
  @ApiOperation({ summary: 'Araç nesline uygun ilanları filtreler.' })
  getRelatedListings(@Param('id') id: string) {
    return this.guideService.getRelatedListings(id);
  }

  // ==========================================
  // HELPER METHOD FOR OPTIONAL JWT AUTH
  // ==========================================
  private async tryGetUserId(authHeader?: string): Promise<string | undefined> {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
        });
        return payload.id;
      } catch (err) {
        // Ignore invalid token to support guest flows
      }
    }
    return undefined;
  }
}
