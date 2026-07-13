import { Injectable, BadRequestException, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SwipeAction, PreferenceConfidence } from '@prisma/client';

@Injectable()
export class VehicleDiscoveryService {
  private readonly logger = new Logger(VehicleDiscoveryService.name);

  constructor(private prisma: PrismaService) {}

  getBaseModel(modelFamily: string): string {
    const parts = modelFamily.split(" ");
    if (parts.length > 1 && (parts[1].toLowerCase() === "serisi" || parts[1].toLowerCase() === "series")) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  }

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

    // 2. Get all shown card IDs (impressions) for this session or user
    const impressions = await this.prisma.vehicleDiscoveryCardImpression.findMany({
      where: {
        OR: [
          { sessionId },
          ...(userId ? [{ userId }] : []),
        ],
      },
      select: { vehicleDiscoveryCardId: true },
    });
    const shownCardIds = impressions.map(i => i.vehicleDiscoveryCardId);

    // 3. Exclude any cards that have been swiped or shown
    const excludedCardIds = Array.from(new Set([...swipedCardIds, ...shownCardIds]));

    // 4. Fetch candidate cards (active and not swiped/shown yet)
    let candidateCards = await this.prisma.vehicleDiscoveryCard.findMany({
      where: {
        isActive: true,
        id: { notIn: excludedCardIds },
      },
    });

    // If candidate list is empty and we haven't reached 50 swipes, we can soften shown-card rules
    // (excluding swiped cards must NEVER be bypassed, but we can bypass shown impressions if needed)
    if (candidateCards.length === 0) {
      candidateCards = await this.prisma.vehicleDiscoveryCard.findMany({
        where: {
          isActive: true,
          id: { notIn: swipedCardIds },
        },
      });
    }

    if (candidateCards.length === 0) {
      return null;
    }

    // 5. Fetch recent 5 shown cards to apply diversity penalties
    const recentImpressions = await this.prisma.vehicleDiscoveryCardImpression.findMany({
      where: {
        OR: [
          { sessionId },
          ...(userId ? [{ userId }] : []),
        ],
      },
      orderBy: { shownAt: 'desc' },
      take: 5,
      include: { card: true },
    });
    const recentCards = recentImpressions.map(ri => ri.card);

    let selectedCard: any = null;

    if (totalSwipesCount < 10) {
      // First 10 cards: Maximize variety/exploration
      const shownBrands = new Set(recentCards.map(c => c.brand));
      const shownBodies = new Set(recentCards.map(c => c.bodyType));
      const shownFuels = new Set(recentCards.map(c => c.fuelType));
      
      const candidatesWithDiversityScore = candidateCards.map(card => {
        let score = 0;
        
        // Brand variety bonus
        if (!shownBrands.has(card.brand)) score += 5.0;
        
        // Body variety bonus
        if (!shownBodies.has(card.bodyType)) score += 4.0;
        
        // Fuel variety bonus
        if (!shownFuels.has(card.fuelType)) score += 3.0;

        // Brand + modelFamily consecutive exclusion penalty
        if (recentCards.length > 0 && recentCards[0].brand.toUpperCase() === card.brand.toUpperCase() && this.getBaseModel(recentCards[0].modelFamily) === this.getBaseModel(card.modelFamily)) {
          score -= 100.0;
        }

        // Penalty if brand + modelFamily is present in the last 5 cards at all
        if (recentCards.some(rc => rc.brand.toUpperCase() === card.brand.toUpperCase() && this.getBaseModel(rc.modelFamily) === this.getBaseModel(card.modelFamily))) {
          score -= 50.0;
        }

        return { card, score };
      });

      candidatesWithDiversityScore.sort((a, b) => b.score - a.score);
      selectedCard = candidatesWithDiversityScore[0].card;
    } else {
      // 10-50 cards: Scored and adaptive cards
      const profile = await this.prisma.userVehiclePreferenceProfile.findFirst({
        where: {
          OR: [
            { sessionId },
            ...(userId ? [{ userId }] : []),
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });

      const scoredCandidates = candidateCards.map(card => {
        let relevanceScore = 0;

        if (profile) {
          const bodyScores = (profile.bodyTypeScores as Record<string, number>) || {};
          const fuelScores = (profile.fuelTypeScores as Record<string, number>) || {};
          const transScores = (profile.transmissionScores as Record<string, number>) || {};
          const brandScores = (profile.brandScores as Record<string, number>) || {};
          const featureScores = (profile.featureScores as Record<string, number>) || {};

          relevanceScore += bodyScores[card.bodyType] || 0;
          relevanceScore += fuelScores[card.fuelType] || 0;
          relevanceScore += transScores[card.transmissionType] || 0;
          relevanceScore += brandScores[card.brand] || 0;
          const cardTags = (card.tags as string[]) || [];
          cardTags.forEach(tag => {
            relevanceScore += featureScores[tag] || 0;
          });
        }

        let penalty = 0;

        // 1. Same brand + modelFamily in last 5 cards: penalty -3.0
        if (recentCards.some(rc => rc.brand.toUpperCase() === card.brand.toUpperCase() && this.getBaseModel(rc.modelFamily) === this.getBaseModel(card.modelFamily))) {
          penalty += 3.0;
        }

        // 2. Same brand + modelFamily + bodyType combination in last 5 cards: strong avoidance
        if (recentCards.some(rc => rc.brand.toUpperCase() === card.brand.toUpperCase() && this.getBaseModel(rc.modelFamily) === this.getBaseModel(card.modelFamily) && rc.bodyType === card.bodyType)) {
          penalty += 5.0;
        }

        // 3. Same bodyType + fuelType + transmissionType combination in last 2 cards: penalty -2.0
        if (recentCards.slice(0, 2).some(rc => rc.bodyType === card.bodyType && rc.fuelType === card.fuelType && rc.transmissionType === card.transmissionType)) {
          penalty += 2.0;
        }

        // 4. Same bodyType in all last 3 cards: penalty -1.5
        if (recentCards.length >= 3 && recentCards.slice(0, 3).every(rc => rc.bodyType === card.bodyType)) {
          penalty += 1.5;
        }

        // 5. Same fuelType in all last 3 cards: penalty -1.2
        if (recentCards.length >= 3 && recentCards.slice(0, 3).every(rc => rc.fuelType === card.fuelType)) {
          penalty += 1.2;
        }

        // 6. Same transmissionType in all last 3 cards: penalty -1.0
        if (recentCards.length >= 3 && recentCards.slice(0, 3).every(rc => rc.transmissionType === card.transmissionType)) {
          penalty += 1.0;
        }

        // 7. Jaccard Tag Similarity with last 3 cards:
        let maxJaccardSim = 0;
        const candTags = new Set((card.tags as string[]) || []);
        
        recentCards.slice(0, 3).forEach(rc => {
          const rcTags = new Set((rc.tags as string[]) || []);
          const intersection = new Set([...candTags].filter(x => rcTags.has(x)));
          const union = new Set([...candTags, ...rcTags]);
          const sim = union.size > 0 ? intersection.size / union.size : 0;
          if (sim > maxJaccardSim) maxJaccardSim = sim;
        });

        if (maxJaccardSim > 0.80) {
          penalty += 2.5;
        } else if (maxJaccardSim > 0.65) {
          penalty += 1.5;
        }

        // Strict consecutive duplicate protection
        if (recentCards.length > 0 && recentCards[0].brand.toUpperCase() === card.brand.toUpperCase() && this.getBaseModel(recentCards[0].modelFamily) === this.getBaseModel(card.modelFamily)) {
          penalty += 10.0;
        }

        const finalScore = relevanceScore - penalty;
        return { card, finalScore };
      });

      scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

      // Conflict resolution for cards 30-50
      if (totalSwipesCount >= 30 && totalSwipesCount < 50 && profile) {
        const bodyScores = (profile.bodyTypeScores as Record<string, number>) || {};
        const sortedBodies = Object.entries(bodyScores).sort((a, b) => b[1] - a[1]);
        if (sortedBodies.length >= 2) {
          const [body1, score1] = sortedBodies[0];
          const [body2, score2] = sortedBodies[1];
          if (Math.abs(score1 - score2) <= 2.5) {
            const lastShownBody = recentCards.length > 0 ? recentCards[0].bodyType : null;
            const targetBody = lastShownBody === body1 ? body2 : body1;
            const targetCandidate = scoredCandidates.find(sc => sc.card.bodyType === targetBody);
            if (targetCandidate) {
              selectedCard = targetCandidate.card;
            }
          }
        }
      }

      if (!selectedCard) {
        if (Math.random() < 0.8 || scoredCandidates.length < 5) {
          selectedCard = scoredCandidates[0].card;
        } else {
          const topPool = scoredCandidates.slice(0, 5);
          selectedCard = topPool[Math.floor(Math.random() * topPool.length)].card;
        }
      }
    }

    // 6. Record Impression in DB so it is never shown twice in this session
    await this.prisma.vehicleDiscoveryCardImpression.create({
      data: {
        sessionId,
        userId: userId || null,
        vehicleDiscoveryCardId: selectedCard.id,
      },
    });

    return selectedCard;
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

    // Merge impressions
    await this.prisma.vehicleDiscoveryCardImpression.updateMany({
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

  async resetSession(sessionId: string, userId?: string) {
    // Delete swipes for this session and user
    await this.prisma.userVehiclePreferenceSwipe.deleteMany({
      where: {
        OR: [
          { sessionId },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    // Delete impressions for this session and user
    await this.prisma.vehicleDiscoveryCardImpression.deleteMany({
      where: {
        OR: [
          { sessionId },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    // Delete preference profile for this session and user
    await this.prisma.userVehiclePreferenceProfile.deleteMany({
      where: {
        OR: [
          { sessionId },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    return { success: true };
  }
}
