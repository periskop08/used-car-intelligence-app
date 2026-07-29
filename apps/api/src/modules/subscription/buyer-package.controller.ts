import { Controller, Get, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { BuyerPackageService } from './buyer-package.service';
import { BuyerPackageCode } from '@prisma/client';

@Controller('buyer-packages')
export class BuyerPackageController {
  constructor(private readonly buyerPackageService: BuyerPackageService) {}

  @Get()
  getPackages() {
    return this.buyerPackageService.getAvailablePackages();
  }

  @Post('purchase')
  async purchase(@Body() body: { userId?: string; packageCode: BuyerPackageCode }) {
    if (!body.packageCode) {
      throw new BadRequestException('packageCode gereklidir.');
    }
    const userId = body.userId || 'demo-user-id'; // Fallback for MVP testing
    return this.buyerPackageService.purchasePackage(userId, body.packageCode);
  }

  @Get('my-credits')
  async getCredits(@Request() req: any) {
    const userId = req.user?.id || req.query?.userId || 'demo-user-id';
    return this.buyerPackageService.getUserBuyerCredits(userId);
  }
}
