import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateReviewDto } from './review.dto';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    // 1. Verify variant exists
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant) {
      throw new NotFoundException('Seçilen araç varyantı bulunamadı.');
    }

    // 2. Generate date key (YYYY-MM-DD)
    const dateKey = new Date().toISOString().split('T')[0];

    // 3. Check daily lock
    const existing = await this.prisma.userReview.findUnique({
      where: {
        userId_variantId_reviewDateKey: {
          userId,
          variantId: dto.variantId,
          reviewDateKey: dateKey,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Bu araç varyantına bugün zaten bir yorum yazdınız. Günde 1 yorum sınırınız bulunmaktadır.');
    }

    // 4. Create review and rating in a transaction
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.userReview.create({
        data: {
          userId,
          variantId: dto.variantId,
          comment: dto.comment,
          usageDuration: dto.usageDuration,
          isOwner: dto.isOwner,
          recommend: dto.recommend,
          status: ApprovalStatus.PENDING, // starts as pending approval
          reviewDateKey: dateKey,
          rating: {
            create: {
              reliability: dto.rating.reliability,
              fuelConsumption: dto.rating.fuelConsumption,
              comfort: dto.rating.comfort,
              partCost: dto.rating.partCost,
              maintenanceCost: dto.rating.maintenanceCost,
              resaleEase: dto.rating.resaleEase,
              overall: dto.rating.overall,
            },
          },
        },
        include: {
          rating: true,
        },
      });

      return {
        message: 'Yorumunuz başarıyla oluşturuldu ve yönetici onayına gönderildi.',
        review,
      };
    });
  }

  // ==========================================
  // ADMIN MODERATION FOR ARAÇ SORGULA REVIEWS (SİSTEM A)
  // ==========================================

  async adminGetReviewsOverview() {
    // ONLY fetch variants that have at least 1 UserReview (do not load empty dataset!)
    const variantsWithReviews = await this.prisma.vehicleVariant.findMany({
      where: {
        reviews: {
          some: {},
        },
      },
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true,
        reviews: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    let totalPending = 0;
    let totalApproved = 0;
    let totalRejected = 0;

    const formattedVariants = variantsWithReviews.map((v) => {
      const pendingCount = v.reviews.filter((r) => r.status === ApprovalStatus.PENDING).length;
      const approvedCount = v.reviews.filter((r) => r.status === ApprovalStatus.APPROVED).length;
      const rejectedCount = v.reviews.filter((r) => r.status === ApprovalStatus.REJECTED).length;
      const totalCount = v.reviews.length;

      totalPending += pendingCount;
      totalApproved += approvedCount;
      totalRejected += rejectedCount;

      return {
        id: v.id,
        brand: v.brand?.name || 'Bilinmeyen Marka',
        model: v.model?.name || 'Bilinmeyen Model',
        yearStart: v.yearStart || v.year,
        yearEnd: v.yearEnd,
        bodyType: v.bodyType,
        fuelType: v.fuelType,
        transmission: v.transmission?.name || v.transmission?.type || null,
        engineName: v.engine ? `${v.engine.code} ${v.engine.displacement}L ${v.engine.horsepower}HP`.trim() : null,
        trimName: v.trim?.name || null,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalCount,
      };
    });

    // Sort by brand name ASC, model name ASC
    formattedVariants.sort((a, b) => {
      const brandCompare = a.brand.localeCompare(b.brand);
      if (brandCompare !== 0) return brandCompare;
      return a.model.localeCompare(b.model);
    });

    return {
      variants: formattedVariants,
      summary: {
        totalPending,
        totalApproved,
        totalRejected,
        totalComments: totalPending + totalApproved + totalRejected,
      },
    };
  }

  async adminGetVariantReviews(variantId: string, statusFilter?: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true,
      },
    });
    if (!variant) throw new NotFoundException('Araç varyantı bulunamadı.');

    const whereClause: any = { variantId };
    if (statusFilter && statusFilter !== 'ALL') {
      const sUpper = statusFilter.toUpperCase();
      if (sUpper === 'PENDING') whereClause.status = ApprovalStatus.PENDING;
      else if (sUpper === 'APPROVED') whereClause.status = ApprovalStatus.APPROVED;
      else if (sUpper === 'REJECTED') whereClause.status = ApprovalStatus.REJECTED;
    }

    const reviews = await this.prisma.userReview.findMany({
      where: whereClause,
      include: {
        rating: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            customerNo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = reviews.map((r) => {
      const u = r.user;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      const displayName = fullName || u.username || u.email.split('@')[0];

      return {
        id: r.id,
        variantId: r.variantId,
        userId: r.userId,
        displayName,
        customerNo: u.customerNo || null,
        email: u.email,
        comment: r.comment,
        usageDuration: r.usageDuration,
        isOwner: r.isOwner,
        recommend: r.recommend,
        status: r.status,
        createdAt: r.createdAt,
        rating: r.rating
          ? {
              reliability: r.rating.reliability,
              fuelConsumption: r.rating.fuelConsumption,
              comfort: r.rating.comfort,
              partCost: r.rating.partCost,
              maintenanceCost: r.rating.maintenanceCost,
              resaleEase: r.rating.resaleEase,
              overall: r.rating.overall,
            }
          : null,
      };
    });

    return {
      variant: {
        id: variant.id,
        brand: variant.brand?.name || 'Bilinmeyen Marka',
        model: variant.model?.name || 'Bilinmeyen Model',
        yearStart: variant.yearStart || variant.year,
        yearEnd: variant.yearEnd,
        trimName: variant.trim?.name || null,
        engineName: variant.engine ? `${variant.engine.code} ${variant.engine.displacement}L ${variant.engine.horsepower}HP`.trim() : null,
        fuelType: variant.fuelType,
        transmission: variant.transmission?.name || variant.transmission?.type || null,
      },
      reviews: formatted,
    };
  }

  async adminUpdateReviewStatus(
    reviewId: string,
    adminUser: { id: string; name: string },
    status: 'APPROVED' | 'REJECTED',
  ) {
    const review = await this.prisma.userReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Yorum bulunamadı.');

    const updated = await this.prisma.userReview.update({
      where: { id: reviewId },
      data: {
        status: status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      },
      include: {
        rating: true,
      },
    });

    return updated;
  }
}
