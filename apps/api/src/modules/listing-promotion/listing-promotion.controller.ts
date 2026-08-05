import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req,
  ForbiddenException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ListingPromotionPricingService } from './listing-promotion-pricing.service';
import { ListingPromotionPaymentService } from './listing-promotion-payment.service';
import { ListingPromotionAdminService } from './listing-promotion-admin.service';
import { ListingPromotionRefundService } from './listing-promotion-refund.service';
import { ListingPromotionWebhookService } from './listing-promotion-webhook.service';
import { ListingPromotionQueryService } from './listing-promotion-query.service';
import { CreateUrgentQuoteDto } from './dto/create-urgent-quote.dto';
import { CreateUrgentCheckoutDto } from './dto/create-urgent-checkout.dto';
import { UpdateUrgentConfigDto } from './dto/urgent-product-config.dto';

const ADMIN_EMAILS = [
  'admin@torquescout.com',
  'm.oguzalbayrak@gmail.com',
  'superadmin@torquescout.com'
];

@Controller('listing-promotions/urgent')
export class ListingPromotionController {
  constructor(
    private pricingService: ListingPromotionPricingService,
    private paymentService: ListingPromotionPaymentService,
    private adminService: ListingPromotionAdminService,
    private refundService: ListingPromotionRefundService,
    private webhookService: ListingPromotionWebhookService,
    private queryService: ListingPromotionQueryService,
  ) {}

  private verifyAdminAccess(req: any) {
    const user = req.user;
    const role = user?.role;
    const email = user?.email?.toLowerCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || (email && ADMIN_EMAILS.includes(email));
    if (!isAdmin) {
      throw new ForbiddenException('Bu işlem için admin yetkisi gereklidir.');
    }
  }

  @Get('product')
  public getProductConfig() {
    return this.pricingService.getProductConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Post('quotes')
  public async createQuote(@Req() req: any, @Body() dto: CreateUrgentQuoteDto) {
    return this.pricingService.createQuote(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout/:listingId')
  public async checkout(@Req() req: any, @Param('listingId') listingId: string, @Body() dto: CreateUrgentCheckoutDto) {
    return this.paymentService.checkout(req.user.id, listingId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:listingId')
  public async getPromotionStatus(@Req() req: any, @Param('listingId') listingId: string) {
    return this.queryService.getUserPromotionStatusForListing(listingId, req.user.id);
  }

  @Post('webhooks/:provider')
  public async handleWebhook(@Param('provider') provider: string, @Body() payload: any) {
    const providerEventId = payload.eventId || payload.id || `evt_${Date.now()}`;
    const eventType = payload.eventType || payload.type || 'payment.success';
    return this.webhookService.processWebhook(provider, providerEventId, eventType, payload);
  }

  // Admin Routes
  @UseGuards(JwtAuthGuard)
  @Post('admin/config')
  public async updateAdminConfig(@Req() req: any, @Body() dto: UpdateUrgentConfigDto) {
    this.verifyAdminAccess(req);
    return this.pricingService.updateProductConfig(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/grant')
  public async grantAdminPromotion(@Req() req: any, @Body() body: { listingId: string; reason: string }) {
    this.verifyAdminAccess(req);
    return this.adminService.grantAdminPromotion(body.listingId, req.user.id, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/list')
  public async listPromotions(@Req() req: any, @Query('page') page: string, @Query('limit') limit: string) {
    this.verifyAdminAccess(req);
    return this.adminService.getAllPromotions(Number(page) || 1, Number(limit) || 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  public async getStats(@Req() req: any) {
    this.verifyAdminAccess(req);
    return this.adminService.getRevenueStats();
  }

  @UseGuards(JwtAuthGuard)
  @Post('terminate/:listingId')
  public async terminatePromotion(@Req() req: any, @Param('listingId') listingId: string) {
    return this.refundService.terminateActivePromotion(listingId, req.user.id);
  }
}
