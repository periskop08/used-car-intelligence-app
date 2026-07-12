import { Injectable, BadRequestException, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SwipeAction, PreferenceConfidence } from '@prisma/client';

@Injectable()
export class VehicleDiscoveryService {
  private readonly logger = new Logger(VehicleDiscoveryService.name);

  constructor(private prisma: PrismaService) {}

  private translateFuel(fuel: string): string {
    const mappings: Record<string, string> = {
      PETROL: 'benzinli',
      DIESEL: 'dizel',
      HYBRID: 'hibrit',
      ELECTRIC: 'elektrikli',
      BENZINLI: 'benzinli',
      DIZEL: 'dizel',
      HIBRIT: 'hibrit',
      ELEKTRIK: 'elektrikli',
    };
    return mappings[fuel.toUpperCase()] || fuel.toLowerCase();
  }

  private translateTrans(trans: string): string {
    const mappings: Record<string, string> = {
      AUTOMATIC: 'otomatik vitesli',
      MANUAL: 'manuel vitesli',
    };
    return mappings[trans.toUpperCase()] || trans.toLowerCase();
  }

  private generateSummaryText(scores: {
    bodyTypeScores: Record<string, number>;
    fuelTypeScores: Record<string, number>;
    transmissionScores: Record<string, number>;
    featureScores: Record<string, number>;
  }): string {
    const getTop = (obj: Record<string, number>) =>
      Object.entries(obj)
        .filter(([_, val]) => val > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key);

    const topBodies = getTop(scores.bodyTypeScores);
    const topFuels = getTop(scores.fuelTypeScores);
    const topTrans = getTop(scores.transmissionScores);
    const topFeatures = getTop(scores.featureScores);

    const parts: string[] = [];
    if (topBodies.length > 0) {
      parts.push(`tercihlerinde ${topBodies.slice(0, 2).map(b => b.toLowerCase()).join(" ve ")} kasa tipleri öne çıkıyor`);
    }
    if (topTrans.length > 0 || topFuels.length > 0) {
      const transStr = topTrans.length > 0 ? this.translateTrans(topTrans[0]) : '';
      const fuelStr = topFuels.length > 0 ? this.translateFuel(topFuels[0]) : '';
      const combined = [transStr, fuelStr].filter(Boolean).join(" ");
      if (combined) {
        parts.push(`motor seçeneği olarak daha çok ${combined} alternatiflere yakın görünüyorsun`);
      }
    }
    if (topFeatures.length > 0) {
      parts.push(`donanım ve karakter olarak ise ${topFeatures.slice(0, 3).join(", ")} gibi özellikler senin için daha uygun olabilir`);
    }

    if (parts.length === 0) {
      return "Seçimlerine göre genel olarak dengeli bir araç tercih profiline yakın görünüyorsun.";
    }

    return `Seçimlerine göre, ${parts.join(", ve ")}. Bu doğrultuda aradığın kriterlere uygun seçenekler senin için daha isabetli olabilir.`;
  }

  async getNextCard(sessionId: string, userId?: string) {
    // 1. Get all swiped card IDs for this session or user
    const swipedSwipes = await this.prisma.userVehiclePreferenceSwipe.findMany({
      where: {
        OR: [
          { sessionId },
          ...(userId ? [{ userId }] : []),
        ],
      },
      select: { vehicleDiscoveryCardId: true },
    });
    const swipedCardIds = swipedSwipes.map(s => s.vehicleDiscoveryCardId);
    const totalSwipesCount = swipedCardIds.length;

    // Hard limit at 50 swipes
    if (totalSwipesCount >= 50) {
      return null;
    }

    // 2. Fetch active cards that haven't been swiped yet
    const allCards = await this.prisma.vehicleDiscoveryCard.findMany({
      where: {
        isActive: true,
        id: { notIn: swipedCardIds },
      },
    });

    if (allCards.length === 0) {
      return null;
    }

    // 3. Selection Strategy
    if (totalSwipesCount < 10) {
      // First 10 cards: Balanced discovery set. Count shown body types and select the least shown.
      const swipedCards = await this.prisma.vehicleDiscoveryCard.findMany({
        where: { id: { in: swipedCardIds } },
        select: { bodyType: true },
      });
      const bodyTypeCounts: Record<string, number> = {};
      swipedCards.forEach(c => {
        bodyTypeCounts[c.bodyType] = (bodyTypeCounts[c.bodyType] || 0) + 1;
      });

      allCards.sort((a, b) => {
        const countA = bodyTypeCounts[a.bodyType] || 0;
        const countB = bodyTypeCounts[b.bodyType] || 0;
        return countA - countB;
      });

      return allCards[0];
    } else {
      // 10-50 cards: Scored and adaptive cards
      const profile = await this.prisma.userVehiclePreferenceProfile.findUnique({
        where: { sessionId },
      });

      const scoredCards = allCards.map(card => {
        let score = 0;
        if (profile) {
          const bodyScores = (profile.bodyTypeScores as Record<string, number>) || {};
          const fuelScores = (profile.fuelTypeScores as Record<string, number>) || {};
          const transScores = (profile.transmissionScores as Record<string, number>) || {};
          const brandScores = (profile.brandScores as Record<string, number>) || {};
          const featureScores = (profile.featureScores as Record<string, number>) || {};

          score += bodyScores[card.bodyType] || 0;
          score += fuelScores[card.fuelType] || 0;
          score += transScores[card.transmissionType] || 0;
          score += brandScores[card.brand] || 0;
          const cardTags = (card.tags as string[]) || [];
          cardTags.forEach(tag => {
            score += featureScores[tag] || 0;
          });
        }
        return { card, score };
      });

      if (totalSwipesCount >= 30 && profile) {
        // 30-50 cards: Conflict resolution (find close category matches and pit them against each other)
        const bodyScores = (profile.bodyTypeScores as Record<string, number>) || {};
        const sortedBodies = Object.entries(bodyScores).sort((a, b) => b[1] - a[1]);
        if (sortedBodies.length >= 2) {
          const [body1, score1] = sortedBodies[0];
          const [body2, score2] = sortedBodies[1];
          if (Math.abs(score1 - score2) <= 2.5) {
            const conflictCards = allCards.filter(c => c.bodyType === body1 || c.bodyType === body2);
            if (conflictCards.length > 0) {
              return conflictCards[Math.floor(Math.random() * conflictCards.length)];
            }
          }
        }
      }

      // Epsilon-greedy exploration (70% best match, 30% random)
      scoredCards.sort((a, b) => b.score - a.score);
      if (Math.random() < 0.7) {
        return scoredCards[0].card;
      } else {
        return scoredCards[Math.floor(Math.random() * scoredCards.length)].card;
      }
    }
  }

  async recordSwipe(
    sessionId: string,
    userId: string | null,
    cardId: string,
    action: SwipeAction,
  ) {
    const card = await this.prisma.vehicleDiscoveryCard.findUnique({
      where: { id: cardId },
    });
    if (!card) {
      throw new NotFoundException('Kart bulunamadı.');
    }

    // 1. Record Swipe
    await this.prisma.userVehiclePreferenceSwipe.upsert({
      where: {
        sessionId_vehicleDiscoveryCardId: {
          sessionId,
          vehicleDiscoveryCardId: cardId,
        },
      },
      create: {
        sessionId,
        userId,
        vehicleDiscoveryCardId: cardId,
        action,
      },
      update: {
        userId,
        action,
      },
    });

    // 2. Load all swipes for recalculation
    const swipes = await this.prisma.userVehiclePreferenceSwipe.findMany({
      where: {
        OR: [
          { sessionId },
          ...(userId ? [{ userId }] : []),
        ],
      },
      include: { card: true },
    });

    let likeCount = 0;
    let dislikeCount = 0;
    const bodyTypeScores: Record<string, number> = {};
    const fuelTypeScores: Record<string, number> = {};
    const transmissionScores: Record<string, number> = {};
    const brandScores: Record<string, number> = {};
    const modelFamilyScores: Record<string, number> = {};
    const featureScores: Record<string, number> = {};

    swipes.forEach(s => {
      const c = s.card;
      const isLike = s.action === SwipeAction.LIKE;

      if (isLike) {
        likeCount++;
        bodyTypeScores[c.bodyType] = (bodyTypeScores[c.bodyType] || 0) + 1.5;
        fuelTypeScores[c.fuelType] = (fuelTypeScores[c.fuelType] || 0) + 1.0;
        transmissionScores[c.transmissionType] = (transmissionScores[c.transmissionType] || 0) + 1.2;
        brandScores[c.brand] = (brandScores[c.brand] || 0) + 0.5;
        modelFamilyScores[c.modelFamily] = (modelFamilyScores[c.modelFamily] || 0) + 0.7;
        const tags = (c.tags as string[]) || [];
        tags.forEach(tag => {
          featureScores[tag] = (featureScores[tag] || 0) + 1.5;
        });
      } else {
        dislikeCount++;
        bodyTypeScores[c.bodyType] = (bodyTypeScores[c.bodyType] || 0) - 0.8;
        fuelTypeScores[c.fuelType] = (fuelTypeScores[c.fuelType] || 0) - 0.5;
        transmissionScores[c.transmissionType] = (transmissionScores[c.transmissionType] || 0) - 0.6;
        brandScores[c.brand] = (brandScores[c.brand] || 0) - 0.3;
        modelFamilyScores[c.modelFamily] = (modelFamilyScores[c.modelFamily] || 0) - 0.4;
        const tags = (c.tags as string[]) || [];
        tags.forEach(tag => {
          featureScores[tag] = (featureScores[tag] || 0) - 0.8;
        });
      }
    });

    const totalSwipes = swipes.length;
    let confidenceLevel: PreferenceConfidence = PreferenceConfidence.LOW;
    if (totalSwipes >= 30) confidenceLevel = PreferenceConfidence.HIGH;
    else if (totalSwipes >= 15) confidenceLevel = PreferenceConfidence.MEDIUM;

    let resultSummary: string | null = null;
    if (totalSwipes >= 30) {
      resultSummary = this.generateSummaryText({
        bodyTypeScores,
        fuelTypeScores,
        transmissionScores,
        featureScores,
      });
    }

    const profile = await this.prisma.userVehiclePreferenceProfile.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId,
        totalSwipes,
        likeCount,
        dislikeCount,
        bodyTypeScores,
        fuelTypeScores,
        transmissionScores,
        brandScores,
        modelFamilyScores,
        featureScores,
        segmentScores: {},
        resultSummary,
        confidenceLevel,
      },
      update: {
        userId,
        totalSwipes,
        likeCount,
        dislikeCount,
        bodyTypeScores,
        fuelTypeScores,
        transmissionScores,
        brandScores,
        modelFamilyScores,
        featureScores,
        resultSummary,
        confidenceLevel,
      },
    });

    return {
      totalSwipes,
      resultReady: totalSwipes >= 30,
      profileId: profile.id,
    };
  }

  async getProfile(sessionId: string, requestingUserId?: string) {
    const profile = await this.prisma.userVehiclePreferenceProfile.findUnique({
      where: { sessionId },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Keşif profili bulunamadı.');
    }

    // Security check: If profile belongs to a registered user, only that user can access it
    if (profile.userId && profile.userId !== requestingUserId) {
      throw new ForbiddenException('Bu tercih profiline erişim yetkiniz bulunmamaktadır.');
    }

    const getTop = (obj: any) =>
      Object.entries(obj || {})
        .filter(([_, val]: any) => val > 0)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(([key]) => key);

    return {
      id: profile.id,
      sessionId: profile.sessionId,
      totalSwipes: profile.totalSwipes,
      likeCount: profile.likeCount,
      dislikeCount: profile.dislikeCount,
      confidenceLevel: profile.confidenceLevel,
      resultSummary: profile.resultSummary,
      topBodyTypes: getTop(profile.bodyTypeScores),
      topFuelTypes: getTop(profile.fuelTypeScores).map(f => this.translateFuel(f)),
      topTransmissionTypes: getTop(profile.transmissionScores).map(t => this.translateTrans(t)),
      topBrands: getTop(profile.brandScores),
    };
  }

  async mergeSwipes(sessionId: string, userId: string) {
    // Merge swipes
    await this.prisma.userVehiclePreferenceSwipe.updateMany({
      where: { sessionId, userId: null },
      data: { userId },
    });

    // Merge profile
    const guestProfile = await this.prisma.userVehiclePreferenceProfile.findUnique({
      where: { sessionId },
    });

    if (guestProfile) {
      // Overwrite/merge profile to registered user
      await this.prisma.userVehiclePreferenceProfile.update({
        where: { sessionId },
        data: { userId },
      });
    }
    return { success: true };
  }
}
