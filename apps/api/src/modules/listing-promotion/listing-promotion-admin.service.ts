import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ListingPromotionPricingService } from './listing-promotion-pricing.service';
import { ListingPromotionActivationService } from './listing-promotion-activation.service';
import { 
  ListingPromotionSource, 
  ListingPromotionType, 
  PromotionLifecycleStatus, 
  PromotionPaymentStatus 
} from '@prisma/client';

@Injectable()
export class ListingPromotionAdminService {
  constructor(
    private prisma: PrismaService,
    private pricingService: ListingPromotionPricingService,
    private activationService: ListingPromotionActivationService,
  ) {}

  public async grantAdminPromotion(listingId: string, adminId: string, reason: string): Promise<any> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('MISSING_REASON: Admin grant için gerekçe zorunludur.');
    }

    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('LISTING_NOT_FOUND: İlan bulunamadı.');
    }

    const promotion = await this.prisma.listingPromotionPurchase.create({
      data: {
        userId: listing.sellerId,
        listingId: listing.id,
        source: ListingPromotionSource.ADMIN_GRANT,
        promotionType: ListingPromotionType.URGENT_LISTING,
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
        paymentStatus: PromotionPaymentStatus.NOT_REQUIRED,
        grantedByAdminId: adminId,
        adminGrantReason: reason,
        listingPublicIdSnapshot: listing.id,
        listingTitleSnapshot: `${listing.modelYear} ${listing.title}`,
        buyerReferenceSnapshot: listing.sellerId,
      },
    });

    // Try immediate activation if listing is published
    await this.activationService.tryActivateUrgentPromotion(listingId);

    return promotion;
  }

  public async getAllPromotions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.listingPromotionPurchase.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: { id: true, title: true, modelYear: true, status: true },
          },
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.listingPromotionPurchase.count(),
    ]);

    return { items, total, page, limit };
  }

  public async getRevenueStats() {
    const paidPurchases = await this.prisma.listingPromotionPurchase.findMany({
      where: {
        source: ListingPromotionSource.PAYMENT,
        paymentStatus: PromotionPaymentStatus.PAID,
      },
    });

    const adminGrantsCount = await this.prisma.listingPromotionPurchase.count({
      where: {
        source: ListingPromotionSource.ADMIN_GRANT,
      },
    });

    const totalPaidCount = paidPurchases.length;
    const totalRevenueAmount = paidPurchases.reduce((acc, curr) => acc + Number(curr.priceAmount || 0), 0);

    return {
      totalPaidCount,
      totalRevenueAmount,
      adminGrantsCount,
      currency: 'TRY',
    };
  }
}
