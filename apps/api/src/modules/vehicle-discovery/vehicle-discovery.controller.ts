import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { OptionalJwtAuthGuard, JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';
import { SwipeAction } from '@prisma/client';

@ApiTags('Vehicle Discovery')
@Controller('vehicle-discovery')
export class VehicleDiscoveryController {
  constructor(private discoveryService: VehicleDiscoveryService) {}

  @Get('cards/next')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Sıradaki keşif kartını getir' })
  @ApiQuery({ name: 'sessionId', required: true, type: String })
  async getNextCard(
    @Query('sessionId') sessionId: string,
    @GetUser() user?: UserPayload,
  ) {
    return this.discoveryService.getNextCard(sessionId, user?.id);
  }

  @Post('swipe')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Kartı sağa/sola kaydır' })
  async recordSwipe(
    @Body('sessionId') sessionId: string,
    @Body('cardId') cardId: string,
    @Body('action') action: SwipeAction,
    @GetUser() user?: UserPayload,
  ) {
    return this.discoveryService.recordSwipe(sessionId, user?.id || null, cardId, action);
  }

  @Get('profile/:sessionId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Kullanıcının tercih profilini getir' })
  async getProfile(
    @Param('sessionId') sessionId: string,
    @GetUser() user?: UserPayload,
  ) {
    return this.discoveryService.getProfile(sessionId, user?.id);
  }

  @Post('merge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Misafir oturumu ile üye oturumunu birleştir' })
  async mergeSwipes(
    @Body('sessionId') sessionId: string,
    @GetUser() user: UserPayload,
  ) {
    return this.discoveryService.mergeSwipes(sessionId, user.id);
  }
}
