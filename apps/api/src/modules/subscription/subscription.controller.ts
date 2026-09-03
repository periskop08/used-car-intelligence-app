import { Controller, Get, Post, Body, Param, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AdminPermission } from '../../common/enums/admin-permission.enum';
import { SubscriptionTier } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('summary')
  @UseGuards(OptionalJwtAuthGuard)
  async getSummary(@Request() req: any) {
    const userId = req.user?.id || req.query?.userId;
    return this.subscriptionService.getSubscriptionSummary(userId);
  }

  @Get('me/summary')
  @UseGuards(OptionalJwtAuthGuard)
  async getMeSummary(@Request() req: any) {
    const userId = req.user?.id || req.query?.userId;
    return this.subscriptionService.getSubscriptionSummary(userId);
  }

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getAvailablePlans();
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  async upgrade(@Request() req: any, @Body() body: { tier: SubscriptionTier }) {
    if (!body.tier) {
      throw new ForbiddenException('Abonelik paketi (tier) belirtilmelidir.');
    }
    return this.subscriptionService.upgradeUserSubscription(req.user.id, body.tier);
  }
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPackageGrantController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('search-for-grant')
  @Permissions(AdminPermission.USER_PACKAGE_MANAGE)
  async searchUsersForGrant(@Request() req: any) {
    const user = req.user;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && !user.permissions?.includes(AdminPermission.USER_PACKAGE_MANAGE)) {
      throw new ForbiddenException('Kullanıcı arama yetkiniz bulunmamaktadır.');
    }
    return this.subscriptionService.searchUsersForGrant(req.query);
  }

  @Post('bulk-package-grants')
  @Permissions(AdminPermission.USER_PACKAGE_MANAGE)
  async bulkGrantPackages(
    @Request() req: any,
    @Body() body: {
      targetUserIds: string[];
      packageGroup?: 'SUBSCRIPTION' | 'BUYER';
      tier?: SubscriptionTier;
      buyerPackageCode?: 'ALICI_MINI' | 'ALICI_PLUS' | 'ALICI_MAX';
      durationDays?: number;
      isUnlimited?: boolean;
      reasonCode: string;
      reason?: string;
      adminNote?: string;
      notifyUser?: boolean;
    }
  ) {
    const user = req.user;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && !user.permissions?.includes(AdminPermission.USER_PACKAGE_MANAGE)) {
      throw new ForbiddenException('Kullanıcıya paket tanımlama yetkiniz bulunmamaktadır.');
    }
    return this.subscriptionService.bulkGrantPackagesToUsers(user, body);
  }

  @Post(':userId/package-grants')
  @Permissions(AdminPermission.USER_PACKAGE_MANAGE)
  async grantPackage(
    @Param('userId') userId: string,
    @Request() req: any,
    @Body() body: {
      packageGroup?: 'SUBSCRIPTION' | 'BUYER';
      planId?: string;
      tier?: SubscriptionTier;
      buyerPackageCode?: 'ALICI_MINI' | 'ALICI_PLUS' | 'ALICI_MAX';
      activationMode?: string;
      reasonCode: string;
      reason?: string;
      notifyUser?: boolean;
    }
  ) {
    const user = req.user;
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && !user.permissions?.includes(AdminPermission.USER_PACKAGE_MANAGE)) {
      throw new ForbiddenException('Kullanıcıya paket tanımlama yetkiniz bulunmamaktadır.');
    }
    return this.subscriptionService.grantPackageToUser(user, userId, body);
  }
}
