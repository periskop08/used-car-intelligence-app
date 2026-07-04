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
}
