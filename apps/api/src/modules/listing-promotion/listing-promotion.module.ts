import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ListingPromotionPricingService } from './listing-promotion-pricing.service';
import { ListingPromotionPaymentService } from './listing-promotion-payment.service';
import { ListingPromotionActivationService } from './listing-promotion-activation.service';
import { ListingPromotionAdminService } from './listing-promotion-admin.service';
import { ListingPromotionRefundService } from './listing-promotion-refund.service';
import { ListingPromotionAuditService } from './listing-promotion-audit.service';
import { ListingPromotionWebhookService } from './listing-promotion-webhook.service';
import { ListingPromotionReconciliationService } from './listing-promotion-reconciliation.service';
import { ListingPromotionQueryService } from './listing-promotion-query.service';
import { ListingPromotionController } from './listing-promotion.controller';

@Module({
  controllers: [ListingPromotionController],
  providers: [
    PrismaService,
    ListingPromotionPricingService,
    ListingPromotionPaymentService,
    ListingPromotionActivationService,
    ListingPromotionAdminService,
    ListingPromotionRefundService,
    ListingPromotionAuditService,
    ListingPromotionWebhookService,
    ListingPromotionReconciliationService,
    ListingPromotionQueryService,
  ],
  exports: [
    ListingPromotionPricingService,
    ListingPromotionPaymentService,
    ListingPromotionActivationService,
    ListingPromotionAdminService,
    ListingPromotionRefundService,
    ListingPromotionAuditService,
    ListingPromotionWebhookService,
    ListingPromotionReconciliationService,
    ListingPromotionQueryService,
  ],
})
export class ListingPromotionModule {}
