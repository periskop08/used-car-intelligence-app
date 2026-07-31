import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';

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
}
