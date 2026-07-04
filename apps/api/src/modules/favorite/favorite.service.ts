import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeatureLimitService } from '../feature-limit/feature-limit.service';
import { ToggleFavoriteDto } from './favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(
    private prisma: PrismaService,
    private featureLimitService: FeatureLimitService,
  ) {}

  async getFavorites(userId: string) {
    return this.prisma.favoriteVehicle.findMany({
      where: { userId },
      include: {
        variant: {
          include: {
            brand: true,
            model: true,
            generation: true,
            engine: true,
            transmission: true,
            trim: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleFavorite(userId: string, dto: ToggleFavoriteDto) {
    const existing = await this.prisma.favoriteVehicle.findUnique({
      where: {
        userId_variantId: {
          userId,
          variantId: dto.variantId,
        },
      },
    });

    if (existing) {
      await this.prisma.favoriteVehicle.delete({
        where: { id: existing.id },
      });
      return { favorited: false, message: 'Araç favorilerinizden kaldırıldı.' };
    }

    // Check plan limits (favorite limit checked via current count as per requirement 1!)
    const limits = await this.featureLimitService.getEffectivePlanLimits(userId);
    const favoriteLimit = limits.favoriteVehicle;

    if (favoriteLimit.limit !== null) {
      const currentCount = await this.prisma.favoriteVehicle.count({
        where: { userId },
      });

      if (currentCount >= favoriteLimit.limit) {
        throw new HttpException(
          `Favori listeniz dolmuştur. Limitiniz: ${favoriteLimit.limit} araç.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.prisma.favoriteVehicle.create({
      data: {
        userId,
        variantId: dto.variantId,
      },
    });

    return { favorited: true, message: 'Araç favorilerinize eklendi.' };
  }
}
