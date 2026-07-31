import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('summary')
  async getSummary(@Request() req: any) {
    const userId = req.user?.id || req.query?.userId || 'demo-user-id';
    return this.subscriptionService.getSubscriptionSummary(userId);
  }

  @Get('me/summary')
  async getMeSummary(@Request() req: any) {
    const userId = req.user?.id || req.query?.userId || 'demo-user-id';
    return this.subscriptionService.getSubscriptionSummary(userId);
  }
}
