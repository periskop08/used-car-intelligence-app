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
import { ListingPromotionReconciliationService } from './listing-promotion-reconciliation.service';
import { CreatePromotionQuoteDto } from './dto/create-promotion-quote.dto';
import { CreatePromotionCheckoutDto } from './dto/create-promotion-checkout.dto';
import { UpdateProductConfigDto } from './dto/promotion-product-config.dto';

const ADMIN_EMAILS = [
  'admin@torquescout.com',
  'm.oguzalbayrak@gmail.com',
  'superadmin@torquescout.com'
];

@Controller('listing-promotions')
export class ListingPromotionController {
  constructor(
    private pricingService: ListingPromotionPricingService,
    private paymentService: ListingPromotionPaymentService,
    private adminService: ListingPromotionAdminService,
    private refundService: ListingPromotionRefundService,
    private webhookService: ListingPromotionWebhookService,
    private queryService: ListingPromotionQueryService,
    private reconciliationService: ListingPromotionReconciliationService,
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
  @Get('urgent/product')
  public getProductConfig() {
    return this.pricingService.getPricingDetails();
  }

  @Get('catalog')
  public getCatalogConfig() {
    return this.pricingService.getPricingDetails();
  }

  @UseGuards(JwtAuthGuard)
  @Post('quotes')
  @Post('urgent/quotes')
  public async createQuote(@Req() req: any, @Body() dto: CreatePromotionQuoteDto) {
    return this.pricingService.createQuote(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout/:listingId')
  @Post('urgent/checkout/:listingId')
  public async checkout(@Req() req: any, @Param('listingId') listingId: string, @Body() dto: CreatePromotionCheckoutDto) {
    return this.paymentService.checkout(req.user.id, listingId, dto);
  }

  @Get('commerce-mode')
  public getCommerceMode() {
    return {
      commerceMode: process.env.LISTING_PROMOTION_COMMERCE_MODE || 'TEST',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('test-checkout/:listingId')
  public async testCheckout(
    @Req() req: any,
    @Param('listingId') listingId: string,
    @Body() body: { productSku: any }
  ) {
    return this.paymentService.createTestPromotionCheckout(req.user.id, listingId, body.productSku);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:listingId')
  @Get('urgent/status/:listingId')
  public async getPromotionStatus(@Req() req: any, @Param('listingId') listingId: string) {
    return this.queryService.getUserPromotionStatusForListing(listingId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('purchase-status/:purchaseId')
  public async getPurchaseStatus(@Req() req: any, @Param('purchaseId') purchaseId: string) {
    return this.paymentService.getPurchaseStatus(req.user.id, purchaseId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('abandon/:listingId')
  public async abandonPromotion(@Req() req: any, @Param('listingId') listingId: string) {
    return this.paymentService.abandonPromotion(req.user.id, listingId);
  }

  @Post('webhooks/:provider')
  @Post('urgent/webhooks/:provider')
  public async handleWebhook(@Param('provider') provider: string, @Body() payload: any) {
    if (provider.toLowerCase() === 'mock' && process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('MOCK_PAYMENT_DISABLED: Mock ödeme doğrulaması canlı (production) ortamda kullanılamaz.');
    }
    const providerEventId = payload.eventId || payload.id || `evt_${Date.now()}`;
    const eventType = payload.eventType || payload.type || 'payment.success';
    return this.webhookService.processWebhook(provider, providerEventId, eventType, payload);
  }

  // Admin Routes
  @UseGuards(JwtAuthGuard)
  @Post('admin/config')
  @Post('urgent/admin/config')
  public async updateAdminConfig(@Req() req: any, @Body() dto: UpdateProductConfigDto) {
    this.verifyAdminAccess(req);
    return this.pricingService.updateProductConfig(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/grant')
  @Post('urgent/admin/grant')
  public async grantAdminPromotion(@Req() req: any, @Body() body: { listingId: string; reason: string }) {
    this.verifyAdminAccess(req);
    return this.adminService.grantAdminPromotion(body.listingId, req.user.id, body.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/list')
  @Get('urgent/admin/list')
  public async listPromotions(@Req() req: any, @Query('page') page: string, @Query('limit') limit: string) {
    this.verifyAdminAccess(req);
    return this.adminService.getAllPromotions(Number(page) || 1, Number(limit) || 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  @Get('urgent/admin/stats')
  public async getStats(@Req() req: any) {
    this.verifyAdminAccess(req);
    return this.adminService.getRevenueStats();
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/reconcile')
  @Post('urgent/admin/reconcile')
  public async reconcile(@Req() req: any) {
    this.verifyAdminAccess(req);
    return this.reconciliationService.runReconciliationJob();
  }

  @UseGuards(JwtAuthGuard)
  @Post('terminate/:listingId')
  @Post('urgent/terminate/:listingId')
  public async terminatePromotion(@Req() req: any, @Param('listingId') listingId: string) {
    return this.refundService.terminateActivePromotion(listingId, req.user.id);
  }
}
