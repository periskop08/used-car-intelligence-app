import { Controller, Get, Patch, Body, Param, Query, Request, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { SubscriptionTier, BuyerPackageCode } from '@prisma/client';

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPricingController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  private checkAdminPermission(user: any) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Fiyat yönetimi için yönetici yetkisi gereklidir.');
    }
  }

  @Get('overview')
  async getOverview(@Request() req: any) {
    this.checkAdminPermission(req.user);
    return this.subscriptionService.getPricingOverview();
  }

  @Patch('subscription/:tier')
  async updateSubscriptionPrice(
    @Request() req: any,
    @Param('tier') tier: SubscriptionTier,
    @Body()
    body: {
      newPrice?: number;
      limits?: {
        aiReports?: number;
        aiChat?: number;
        activeListings?: number;
        listingDurationDays?: number;
        comparisons?: number;
        maxVehiclesPerComparison?: number;
        vitrinListings?: number;
      };
      reason?: string;
    }
  ) {
    this.checkAdminPermission(req.user);
    const newPrice = body.newPrice !== undefined && body.newPrice !== null ? Number(body.newPrice) : undefined;
    return this.subscriptionService.updateSubscriptionPrice(
      req.user,
      tier,
      newPrice,
      body.limits,
      body.reason
    );
  }

  @Patch('buyer-package/:code')
  async updateBuyerPackagePrice(
    @Request() req: any,
    @Param('code') code: BuyerPackageCode,
    @Body() body: { newPrice: number; reason?: string }
  ) {
    this.checkAdminPermission(req.user);
    if (body.newPrice === undefined || body.newPrice === null || isNaN(Number(body.newPrice))) {
      throw new BadRequestException('newPrice sayısal bir değer olmalıdır.');
    }
    return this.subscriptionService.updateBuyerPackagePrice(
      req.user,
      code,
      Number(body.newPrice),
      body.reason
    );
  }

  @Get('history')
  async getPriceHistory(@Request() req: any, @Query() query: { page?: string; limit?: string }) {
    this.checkAdminPermission(req.user);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    return this.subscriptionService.getPriceHistory(page, limit);
  }
}
