import { Controller, Get, Post, Patch, Body, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { OptionalJwtAuthGuard, JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';
import { Response, Request } from 'express';
import { BodyType, FuelType, TransmissionType, VehicleDiscoveryAction } from '@prisma/client';

@ApiTags('Vehicle Discovery')
@Controller('vehicle-discovery')
export class VehicleDiscoveryController {
  constructor(private readonly discoveryService: VehicleDiscoveryService) {}

  // Helper to extract or create guest identity
  private async resolveGuestIdentity(
    req: Request,
    res: Response
  ): Promise<string> {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/discovery_guest_token=([^;]+)/);
    let token = match ? match[1] : null;
    let guestIdentityId = '';

    if (token) {
      // Find guest identity in DB by hash
      const tokenHash = this.discoveryService.hashToken(token);
      const identity = await this.discoveryService['prisma'].vehicleDiscoveryGuestIdentity.findUnique({
        where: { tokenHash }
      });

      if (identity && identity.expiresAt > new Date()) {
        guestIdentityId = identity.id;
        // Touch lastUsedAt
        await this.discoveryService['prisma'].vehicleDiscoveryGuestIdentity.update({
          where: { id: identity.id },
          data: { lastUsedAt: new Date() }
        });
      } else {
        token = null; // Re-generate if expired or invalid
      }
    }

    if (!token) {
      // Generate new secure guest token
      token = this.discoveryService.generateGuestToken();
      const tokenHash = this.discoveryService.hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const newIdentity = await this.discoveryService['prisma'].vehicleDiscoveryGuestIdentity.create({
        data: {
          tokenHash,
          expiresAt
        }
      });

      guestIdentityId = newIdentity.id;

      // Write cookie
      res.cookie('discovery_guest_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    return guestIdentityId;
  }

  @Post('sessions')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Keşif oturumu başlat veya mevcut olanı devam ettir' })
  async getOrCreateSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('filters') filters?: {
      minimumPrice?: number;
      maximumPrice?: number;
      bodyTypes?: BodyType[];
      fuelTypes?: FuelType[];
      transmissions?: TransmissionType[];
    },
    @GetUser() user?: UserPayload
  ) {
    let guestIdentityId: string | undefined;
    if (!user) {
      guestIdentityId = await this.resolveGuestIdentity(req, res);
    }

    return this.discoveryService.getOrCreateSession({
      userId: user?.id,
      guestIdentityId,
      filters
    });
  }

  @Get('sessions/:sessionId/next')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Sıradaki keşif kartını getir' })
  async getNextCard(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @GetUser() user?: UserPayload
  ) {
    let guestIdentityId: string | undefined;
    if (!user) {
      guestIdentityId = await this.resolveGuestIdentity(req, res);
    }

    return this.discoveryService.getNextCardCandidate(sessionId, {
      userId: user?.id,
      guestIdentityId
    });
  }

  @Post('sessions/:sessionId/swipes')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Aracı sağa/sola kaydır' })
  async recordSwipe(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('cardId') cardId: string,
    @Body('action') action: VehicleDiscoveryAction,
    @Body('version') expectedVersion: number,
    @GetUser() user?: UserPayload
  ) {
    let guestIdentityId: string | undefined;
    if (!user) {
      guestIdentityId = await this.resolveGuestIdentity(req, res);
    }

    return this.discoveryService.recordSwipe({
      sessionId,
      cardId,
      action,
      expectedVersion,
      identity: { userId: user?.id, guestIdentityId }
    });
  }

  @Patch('sessions/:sessionId/filters')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Keşif oturumu filtrelerini güncelle' })
  async updateFilters(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('filters') filters: {
      minimumPrice?: number;
      maximumPrice?: number;
      bodyTypes?: BodyType[];
      fuelTypes?: FuelType[];
      transmissions?: TransmissionType[];
    },
    @GetUser() user?: UserPayload
  ) {
    let guestIdentityId: string | undefined;
    if (!user) {
      guestIdentityId = await this.resolveGuestIdentity(req, res);
    }

    return this.discoveryService.updateFilters({
      sessionId,
      filters,
      identity: { userId: user?.id, guestIdentityId }
    });
  }

  @Get('sessions/:sessionId/results')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Keşif oturumu sonuçlarını getir' })
  async getRecommendations(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @GetUser() user?: UserPayload
  ) {
    let guestIdentityId: string | undefined;
    if (!user) {
      guestIdentityId = await this.resolveGuestIdentity(req, res);
    }

    return this.discoveryService.getRecommendations(sessionId, {
      userId: user?.id,
      guestIdentityId
    });
  }

  @Post('merge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Misafir oturum verilerini giriş yapmış kullanıcıyla birleştir' })
  async mergeSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @GetUser() user: UserPayload
  ) {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/discovery_guest_token=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return { success: false, message: "Misafir oturum çerezi bulunamadı." };
    }

    const tokenHash = this.discoveryService.hashToken(token);
    const guestIdentity = await this.discoveryService['prisma'].vehicleDiscoveryGuestIdentity.findUnique({
      where: { tokenHash }
    });

    if (!guestIdentity) {
      return { success: false, message: "Misafir kimliği bulunamadı." };
    }

    // Call service to merge
    const result = await this.discoveryService.mergeGuestSession(guestIdentity.id, user.id);

    // Clear guest cookie after merge
    res.clearCookie('discovery_guest_token');

    return result;
  }
}
