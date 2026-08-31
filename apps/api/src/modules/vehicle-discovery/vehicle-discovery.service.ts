import { Injectable, BadRequestException, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { 
  BodyType, 
  FuelType, 
  TransmissionType, 
  VehicleDiscoveryMode, 
  VehicleDiscoverySessionStatus, 
  VehicleDiscoveryAction,
  Prisma
} from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class VehicleDiscoveryService {
  private readonly logger = new Logger(VehicleDiscoveryService.name);

  constructor(private prisma: PrismaService) {}

  // Helper to generate a secure random hex token
  generateGuestToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Helper to hash a token using SHA-256
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Seeded Mulberry32 PRNG generator for reproducible random sequences
  private getPRNG(seed: number): () => number {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fisher-Yates shuffle using a seeded PRNG
  private shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const copy = [...array];
    const rand = this.getPRNG(seed);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  // Helper to get seed from string
  private getSeedFromString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }

  /**
   * Helper to check if a transmission name/type matches requested transmission filter
   * Normalizes Automatic family (AUTOMATIC, DSG, EDC, S TRONIC, CVT, POWERSHIFT, DCT, etc.)
   */
  private isTransmissionMatch(transmissionName: string | undefined, requestedTypes: TransmissionType[]): boolean {
    if (!requestedTypes || requestedTypes.length === 0) return true;
    if (!transmissionName) return false;
    const nameUpper = transmissionName.toUpperCase();

    return requestedTypes.some(t => {
      if (t === TransmissionType.MANUAL) {
        return nameUpper.includes("MANUEL") || nameUpper.includes("MANUAL");
      } else {
        // Automatic family normalization
        return (
          nameUpper.includes("OTOMATIK") ||
          nameUpper.includes("AUTOMATIC") ||
          nameUpper.includes("DSG") ||
          nameUpper.includes("EDC") ||
          nameUpper.includes("S TRONIC") ||
          nameUpper.includes("S-TRONIC") ||
          nameUpper.includes("CVT") ||
          nameUpper.includes("POWERSHIFT") ||
          nameUpper.includes("DCT") ||
          nameUpper.includes("E-CVT") ||
          nameUpper.includes("STEPTRONIC") ||
          nameUpper.includes("TIPTRONIC")
        );
      }
    });
  }

  /**
   * Visible Candidate Identity Key Generator:
   * Prevents duplicate-looking cards to the user when variants only differ by trim/package
   */
  private buildVisibleIdentityKey(variant: any): string {
    const brandId = variant.brandId || variant.brand?.id || '';
    const modelId = variant.modelId || variant.model?.id || '';
    const genId = variant.generationId || variant.generation?.id || '';
    const engId = variant.engineId || variant.engine?.id || '';
    const transId = variant.transmissionId || variant.transmission?.id || '';
    const body = variant.bodyType || '';
    const fuel = variant.fuelType || '';
    return `${brandId}_${modelId}_${genId}_${engId}_${transId}_${body}_${fuel}`;
  }

  /**
   * Deterministic representative variant selector from a grouped candidate bucket
   */
  private selectRepresentativeVariant(variants: any[]): any {
    if (!variants || variants.length === 0) return null;
    const sorted = [...variants].sort((a, b) => {
      const aHp = a.engine?.horsepower || (a.specs?.specs as any)?.powerHp || 0;
      const bHp = b.engine?.horsepower || (b.specs?.specs as any)?.powerHp || 0;
      const aTq = a.engine?.torque || (a.specs?.specs as any)?.torqueNm || 0;
      const bTq = b.engine?.torque || (b.specs?.specs as any)?.torqueNm || 0;

      const aScore = (aHp ? 2 : 0) + (aTq ? 2 : 0);
      const bScore = (bHp ? 2 : 0) + (bTq ? 2 : 0);
      if (aScore !== bScore) return bScore - aScore;

      const aYear = a.year || a.yearStart || 0;
      const bYear = b.year || b.yearStart || 0;
      if (aYear !== bYear) return bYear - aYear;

      return (a.id || '').localeCompare(b.id || '');
    });
    return sorted[0];
  }

  // Start or resume a discovery session
  async getOrCreateSession(params: {
    userId?: string;
    guestIdentityId?: string;
    forceNew?: boolean;
    filters?: {
      minimumPrice?: number;
      maximumPrice?: number;
      bodyTypes?: BodyType[];
      fuelTypes?: FuelType[];
      transmissions?: TransmissionType[];
    };
  }) {
    const { userId, guestIdentityId, filters, forceNew } = params;

    if (!userId && !guestIdentityId) {
      throw new BadRequestException("Oturum başlatmak için kullanıcı veya misafir kimliği gereklidir.");
    }

    const now = new Date();

    if (forceNew) {
      // Deactivate any existing active session for this user/guest to guarantee clean start
      await this.prisma.vehicleDiscoverySession.updateMany({
        where: {
          userId: userId || undefined,
          guestIdentityId: guestIdentityId && !userId ? guestIdentityId : undefined,
          status: VehicleDiscoverySessionStatus.ACTIVE
        },
        data: {
          status: VehicleDiscoverySessionStatus.CANCELLED
        }
      });
    } else {
      // Look for active, unexpired session
      const existingSession = await this.prisma.vehicleDiscoverySession.findFirst({
        where: {
          userId: userId || undefined,
          guestIdentityId: guestIdentityId && !userId ? guestIdentityId : undefined,
          status: VehicleDiscoverySessionStatus.ACTIVE,
          expiresAt: { gt: now }
        },
        include: {
          items: {
            orderBy: { position: 'asc' },
            include: {
              card: {
                select: {
                  id: true,
                  brand: true,
                  modelFamily: true,
                  generationName: true,
                  bodyType: true,
                  fuelType: true,
                  transmissionType: true,
                  engineVersion: true,
                  power: true,
                  torque: true,
                  productionYears: true,
                  averageConsumption: true,
                  drivetrain: true,
                  imageUrl: true,
                  tags: true,
                  yearFrom: true,
                  yearTo: true,
                  priceSnapshot: true,
                }
              }
            }
          }
        }
      });

      if (existingSession) {
        // Touch lastActivityAt
        await this.prisma.vehicleDiscoverySession.update({
          where: { id: existingSession.id },
          data: { lastActivityAt: now }
        });
        return { session: existingSession, isNew: false, warning: null };
      }
    }

    const hasFilters = filters && (
      (filters.minimumPrice !== undefined && filters.minimumPrice > 0) ||
      filters.maximumPrice !== undefined ||
      (filters.bodyTypes && filters.bodyTypes.length > 0) ||
      (filters.fuelTypes && filters.fuelTypes.length > 0) ||
      (filters.transmissions && filters.transmissions.length > 0)
    );

    const mode = hasFilters ? VehicleDiscoveryMode.FILTERED : VehicleDiscoveryMode.RANDOM;
    const targetCount = 20;

    const newSession = await this.prisma.vehicleDiscoverySession.create({
      data: {
        userId: userId || null,
        guestIdentityId: guestIdentityId || null,
        mode,
        status: VehicleDiscoverySessionStatus.ACTIVE,
        minimumPrice: filters?.minimumPrice || 0,
        maximumPrice: filters?.maximumPrice || null,
        bodyTypes: filters?.bodyTypes || [],
        fuelTypes: filters?.fuelTypes || [],
        transmissions: filters?.transmissions || [],
        targetCount,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
        lastActivityAt: now
      }
    });

    const { warning } = await this.populateSessionItems({
      session: newSession,
      startIndex: 0
    });

    const sessionWithItems = await this.prisma.vehicleDiscoverySession.findUnique({
      where: { id: newSession.id },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            card: {
              include: {
                priceSnapshot: true
              }
            }
          }
        }
      }
    });

    return { session: sessionWithItems, isNew: true, warning };
  }

  /**
   * Real Product Flow Candidate Generation
   */
  private async populateSessionItems(params: {
    session: any;
    startIndex: number;
    tx?: Prisma.TransactionClient;
  }): Promise<{ warning: string | null }> {
    const { session, startIndex, tx } = params;
    const db = tx || this.prisma;

    let warning: string | null = null;
    let effectiveTargetCount = session.targetCount || 20;

    // Fetch all active curated discovery cards (825 curated records with real R2 images)
    const allCards = await db.vehicleDiscoveryCard.findMany({
      where: {
        isActive: true,
      },
    });

    let eligibleCards = allCards;

    if (session.mode === VehicleDiscoveryMode.FILTERED) {
      if (session.bodyTypes && session.bodyTypes.length > 0) {
        const bodies = session.bodyTypes.map((b: string) => b.toUpperCase());
        eligibleCards = eligibleCards.filter((c) => bodies.includes((c.bodyType || '').toUpperCase()));
      }

      if (session.fuelTypes && session.fuelTypes.length > 0) {
        const fuels = session.fuelTypes.map((f: string) => f.toUpperCase());
        eligibleCards = eligibleCards.filter((c) => {
          const fuelUpper = (c.fuelType || '').toUpperCase();
          return fuels.some((f) => fuelUpper.includes(f) || f.includes(fuelUpper));
        });
      }

      if (session.transmissions && session.transmissions.length > 0) {
        eligibleCards = eligibleCards.filter((c) =>
          this.isTransmissionMatch(c.transmissionType, session.transmissions)
        );
      }

      if (eligibleCards.length < 20) {
        if (eligibleCards.length === 0) {
          warning = "Seçtiğiniz filtrelere uyan kart bulunamadı, tüm popüler araçlar gösteriliyor.";
          eligibleCards = allCards;
        } else {
          warning = `Filtrelerinize uyan ${eligibleCards.length} araç bulundu, liste genel havuzla tamamlandı.`;
          // Append other cards not in eligibleCards
          const existingIds = new Set(eligibleCards.map((c) => c.id));
          const remainders = allCards.filter((c) => !existingIds.has(c.id));
          eligibleCards = [...eligibleCards, ...remainders];
        }
      }
    }

    const seed = this.getSeedFromString(session.id + "_" + (session.filterRevision || 0));
    const shuffledCards = this.shuffleWithSeed(eligibleCards, seed);
    const selectedCards = shuffledCards.slice(0, 20);

    const itemsToInsert = selectedCards.slice(0, effectiveTargetCount - startIndex).map((card, idx) => ({
      sessionId: session.id,
      vehicleDiscoveryCardId: card.id,
      position: startIndex + idx,
      action: null,
      shownAt: null,
      actionAt: null,
    }));

    if (itemsToInsert.length > 0) {
      await db.vehicleDiscoverySessionItem.createMany({
        data: itemsToInsert,
      });
    }

    return { warning };
  }

  // Get/claim next card candidate for a session (Dual-read backward compatibility)
  async getNextCardCandidate(sessionId: string, identity: { userId?: string; guestIdentityId?: string }) {
    const now = new Date();
    const session = await this.prisma.vehicleDiscoverySession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            variant: {
              include: {
                brand: true,
                model: true,
                generation: true,
                engine: true,
                transmission: true,
                trim: true,
                specs: true,
                profileMappings: { include: { profile: true } },
                listings: { where: { status: 'ACTIVE' }, take: 1, include: { media: { take: 1 } } }
              }
            },
            card: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException("Keşif oturumu bulunamadı.");
    }

    if (session.userId && session.userId !== identity.userId) {
      throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
    }
    if (!session.userId && session.guestIdentityId !== identity.guestIdentityId) {
      throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
    }

    if (session.status !== VehicleDiscoverySessionStatus.ACTIVE || session.expiresAt <= now) {
      return { status: "SESSION_INACTIVE", session };
    }

    const currentItem = session.items.find(item => item.position === session.currentIndex);
    if (!currentItem) {
      await this.prisma.vehicleDiscoverySession.update({
        where: { id: session.id },
        data: {
          status: VehicleDiscoverySessionStatus.COMPLETED,
          completedAt: now
        }
      });
      return { status: "COMPLETED", card: null, session };
    }

    if (!currentItem.shownAt) {
      await this.prisma.vehicleDiscoverySessionItem.update({
        where: { id: currentItem.id },
        data: { shownAt: now }
      });
    }

    let cardDto: any = null;

    if (currentItem.variant) {
      const v = currentItem.variant;
      const specJson = (v.specs?.specs as any) || {};

      let imageUrl = 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800';
      if (v.listings && v.listings.length > 0 && v.listings[0].media && v.listings[0].media.length > 0) {
        imageUrl = v.listings[0].media[0].url;
      } else if (v.profileMappings && v.profileMappings.length > 0 && v.profileMappings[0].profile?.heroImageUrl) {
        imageUrl = v.profileMappings[0].profile.heroImageUrl;
      }

      const bodyTypeStr = v.bodyType ? String(v.bodyType).toLowerCase() : 'sedan';
      const fuelTypeStr = v.fuelType ? String(v.fuelType).toLowerCase() : 'benzinli';
      const transStr = v.transmission?.name ? String(v.transmission.name).toLowerCase() : 'otomatik';

      const powerHp = v.engine?.horsepower || specJson.powerHp || 130;
      const torqueNm = v.engine?.torque || specJson.torqueNm || 230;
      const avgConsumption = specJson.averageConsumption ? `${specJson.averageConsumption} L/100km` : '5.5 L/100km';
      const drivetrain = specJson.drivetrain || 'Önden Çekiş';
      const engineCode = v.engine?.code ? `${(v.engine.displacement ? v.engine.displacement / 1000 : 1.6).toFixed(1)} ${v.engine.code}` : '1.6 Motor';

      cardDto = {
        id: v.id,
        vehicleVariantId: v.id,
        brand: v.brand?.name || 'Araç',
        modelFamily: v.model?.name || '',
        generationName: v.generation?.name || '',
        bodyType: v.bodyType || 'SEDAN',
        fuelType: v.fuelType || 'BENZIN',
        transmissionType: v.transmission?.name || 'Otomatik',
        engineVersion: engineCode,
        power: `${powerHp} HP`,
        torque: `${torqueNm} Nm`,
        productionYears: `${v.yearStart || v.year || 2020}${v.yearEnd ? '-' + v.yearEnd : ''}`,
        averageConsumption: avgConsumption,
        drivetrain,
        imageUrl,
        tags: [bodyTypeStr, fuelTypeStr, transStr, 'konfor', 'aile-araci'],
        // NO price on swipe card layout as requested
      };
    } else if (currentItem.card) {
      cardDto = currentItem.card;
    }

    return {
      status: "ACTIVE",
      card: cardDto,
      currentIndex: session.currentIndex,
      version: session.version,
      targetCount: session.targetCount
    };
  }

  // Stateful, idempotent swipe operation with Optimistic Concurrency Control
  async recordSwipe(params: {
    sessionId: string;
    cardId: string;
    action: VehicleDiscoveryAction;
    expectedVersion: number;
    identity: { userId?: string; guestIdentityId?: string };
  }) {
    const { sessionId, cardId, action, expectedVersion, identity } = params;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.vehicleDiscoverySession.findUnique({
        where: { id: sessionId },
        include: { items: true }
      });

      if (!session) {
        throw new NotFoundException("Keşif oturumu bulunamadı.");
      }

      if (session.userId && session.userId !== identity.userId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }
      if (!session.userId && session.guestIdentityId !== identity.guestIdentityId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }

      if (session.status !== VehicleDiscoverySessionStatus.ACTIVE || session.expiresAt <= now) {
        throw new BadRequestException("Keşif oturumu aktif değil veya süresi dolmuş.");
      }

      if (session.version !== expectedVersion) {
        throw new ConflictException("Oturum güncellendi. Lütfen en son kart durumunu tekrar yükleyin.");
      }

      const activeItem = session.items.find(item => item.position === session.currentIndex);

      if (!activeItem) {
        throw new BadRequestException("Mevcut pozisyonda araç bulunamadı.");
      }

      const itemMatch = activeItem.vehicleVariantId === cardId || activeItem.vehicleDiscoveryCardId === cardId || activeItem.id === cardId;
      if (!itemMatch) {
        throw new BadRequestException("Gönderilen araç kimliği sıradaki araçla eşleşmiyor.");
      }

      await tx.vehicleDiscoverySessionItem.update({
        where: { id: activeItem.id },
        data: {
          action,
          actionAt: now
        }
      });

      const nextIndex = session.currentIndex + 1;
      const nextVersion = session.version + 1;
      const isCompleted = nextIndex >= session.targetCount;

      const updatedSession = await tx.vehicleDiscoverySession.update({
        where: { id: session.id },
        data: {
          currentIndex: nextIndex,
          version: nextVersion,
          status: isCompleted ? VehicleDiscoverySessionStatus.COMPLETED : VehicleDiscoverySessionStatus.ACTIVE,
          completedAt: isCompleted ? now : null,
          lastActivityAt: now
        }
      });

      return {
        success: true,
        currentIndex: nextIndex,
        version: nextVersion,
        status: updatedSession.status
      };
    });
  }

  // Positional cleanup and filters update
  async updateFilters(params: {
    sessionId: string;
    filters: {
      minimumPrice?: number;
      maximumPrice?: number;
      bodyTypes?: BodyType[];
      fuelTypes?: FuelType[];
      transmissions?: TransmissionType[];
    };
    targetCount?: number;
    identity: { userId?: string; guestIdentityId?: string };
  }) {
    const { sessionId, filters, targetCount, identity } = params;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.vehicleDiscoverySession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new NotFoundException("Keşif oturumu bulunamadı.");
      }

      if (session.userId && session.userId !== identity.userId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }
      if (!session.userId && session.guestIdentityId !== identity.guestIdentityId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }

      if (session.expiresAt <= now) {
        throw new BadRequestException("Keşif oturumu süresi dolmuş.");
      }

      await tx.vehicleDiscoverySessionItem.deleteMany({
        where: {
          sessionId,
          position: { gte: session.currentIndex }
        }
      });

      const nextFilterRevision = session.filterRevision + 1;
      const nextVersion = session.version + 1;

      const updatedSession = await tx.vehicleDiscoverySession.update({
        where: { id: sessionId },
        data: {
          minimumPrice: filters.minimumPrice || 0,
          maximumPrice: filters.maximumPrice || null,
          bodyTypes: filters.bodyTypes || [],
          fuelTypes: filters.fuelTypes || [],
          transmissions: filters.transmissions || [],
          targetCount: targetCount || session.targetCount,
          status: VehicleDiscoverySessionStatus.ACTIVE,
          completedAt: null,
          mode: VehicleDiscoveryMode.FILTERED,
          filterRevision: nextFilterRevision,
          version: nextVersion,
          lastActivityAt: now
        }
      });

      const { warning } = await this.populateSessionItems({
        session: updatedSession,
        startIndex: session.currentIndex,
        tx
      });

      const freshSession = await tx.vehicleDiscoverySession.findUnique({
        where: { id: sessionId },
        include: {
          items: {
            orderBy: { position: 'asc' }
          }
        }
      });

      return { session: freshSession, warning };
    });
  }

  // Get matching recommendations and URL handoff query params for listings
  async getRecommendations(sessionId: string, identity: { userId?: string; guestIdentityId?: string }) {
    const session = await this.prisma.vehicleDiscoverySession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                brand: true,
                model: true,
                generation: true,
                engine: true,
                transmission: true,
                trim: true,
                specs: true,
                listings: { where: { status: 'ACTIVE' }, select: { priceAmount: true } }
              }
            },
            card: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException("Keşif oturumu bulunamadı.");
    }

    if (session.userId && session.userId !== identity.userId) {
      throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
    }
    if (!session.userId && session.guestIdentityId !== identity.guestIdentityId) {
      throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
    }

    const swipes = session.items.filter(item => item.action !== null);
    const likes = swipes.filter(s => s.action === VehicleDiscoveryAction.LIKE);

    if (likes.length === 0) {
      return {
        message: "Beğendiğiniz araç bulunamadı. Lütfen daha fazla aracı beğenmeyi deneyin.",
        scoringProfile: null,
        recommendations: []
      };
    }

    const bodyTypeScores: Record<string, number> = {};
    const fuelTypeScores: Record<string, number> = {};
    const transmissionScores: Record<string, number> = {};
    const brandScores: Record<string, number> = {};
    const modelFamilyScores: Record<string, number> = {};

    swipes.forEach(s => {
      const v = s.variant;
      const isLike = s.action === VehicleDiscoveryAction.LIKE;
      const weight = isLike ? 1.0 : -0.8;

      if (v) {
        if (v.bodyType) bodyTypeScores[v.bodyType] = (bodyTypeScores[v.bodyType] || 0) + (1.5 * weight);
        if (v.fuelType) fuelTypeScores[v.fuelType] = (fuelTypeScores[v.fuelType] || 0) + (1.0 * weight);
        if (v.transmission?.name) {
          const transKey = v.transmission.name.toUpperCase().includes("MANUEL") ? TransmissionType.MANUAL : TransmissionType.AUTOMATIC;
          transmissionScores[transKey] = (transmissionScores[transKey] || 0) + (1.2 * weight);
        }
        if (v.brand?.name) brandScores[v.brand.name] = (brandScores[v.brand.name] || 0) + (0.5 * weight);
        if (v.model?.name) modelFamilyScores[v.model.name] = (modelFamilyScores[v.model.name] || 0) + (0.7 * weight);
      }
    });

    const likedVariants = likes.map(l => l.variant).filter(Boolean);

    let recommendedVariant = likedVariants[0];
    if (!recommendedVariant && session.items.length > 0) {
      recommendedVariant = session.items[0].variant;
    }

    if (!recommendedVariant) {
      recommendedVariant = await this.prisma.vehicleVariant.findFirst({
        where: { status: 'APPROVED' },
        include: {
          brand: true,
          model: true,
          generation: true,
          engine: true,
          transmission: true,
          trim: true,
          specs: true,
          listings: { where: { status: 'ACTIVE' }, select: { priceAmount: true } }
        }
      });
    }

    const activePrices = (recommendedVariant.listings || []).map((l: any) => Number(l.priceAmount)).filter((p: number) => p > 0);
    const minActivePrice = activePrices.length > 0 ? Math.min(...activePrices) : null;
    const maxActivePrice = activePrices.length > 0 ? Math.max(...activePrices) : null;

    const minPriceFilter = Number(session.minimumPrice) > 0 ? Number(session.minimumPrice) : undefined;
    const maxPriceFilter = session.maximumPrice ? Number(session.maximumPrice) : undefined;

    return {
      message: "Keşif tercihlerinize göre en uygun araç önerisi.",
      scoringProfile: {
        bodyTypeScores,
        fuelTypeScores,
        transmissionScores,
        brandScores,
        modelFamilyScores
      },
      recommendation: {
        recommendedVariantId: recommendedVariant.id,
        brandId: recommendedVariant.brandId,
        brandName: recommendedVariant.brand?.name || '',
        modelId: recommendedVariant.modelId,
        modelName: recommendedVariant.model?.name || '',
        generationName: recommendedVariant.generation?.name || '',
        bodyType: recommendedVariant.bodyType || 'SEDAN',
        fuelType: recommendedVariant.fuelType || 'BENZIN',
        transmissionType: recommendedVariant.transmission?.name || 'Otomatik',
        activeListingCount: activePrices.length,
        minActivePrice,
        maxActivePrice,
        listingsQuery: {
          vehicleVariantId: recommendedVariant.id,
          brandId: recommendedVariant.brandId,
          modelId: recommendedVariant.modelId,
          bodyType: recommendedVariant.bodyType,
          fuelType: recommendedVariant.fuelType,
          transmission: recommendedVariant.transmission?.name,
          minPrice: minPriceFilter,
          maxPrice: maxPriceFilter
        }
      }
    };
  }

  // Merge Guest Session with User Session
  async mergeGuestSession(guestIdentityId: string, userId: string) {
    const guestIdentity = await this.prisma.vehicleDiscoveryGuestIdentity.findUnique({
      where: { id: guestIdentityId }
    });

    if (!guestIdentity) return { success: false };

    await this.prisma.vehicleDiscoverySession.updateMany({
      where: { guestIdentityId, userId: null },
      data: { userId }
    });

    await this.prisma.vehicleDiscoveryGuestIdentity.update({
      where: { id: guestIdentityId },
      data: { mergedAt: new Date() }
    });

    return { success: true };
  }

  /**
   * Admin Discovery Candidate Grouping Service Method:
   * Uses exact runtime grouping logic (buildVisibleIdentityKey) and deterministic representative variant selection.
   * Eliminates duplicate-looking raw VehicleVariant rows in admin table.
   */
  async getAdminGroupedDiscoveryCandidates(query: {
    search?: string;
    bodyType?: string;
    fuelType?: string;
    transmission?: string;
    filterCategory?: 'all' | 'listings_only' | 'unfiltered_eligible' | 'missing_content';
    page?: number;
    limit?: number;
  }) {
    const { search, bodyType, fuelType, transmission, filterCategory = 'all', page = 1, limit = 50 } = query;

    try {
      const allVariants = await this.prisma.vehicleVariant.findMany({
        where: { status: { not: 'REJECTED' } },
        select: {
          id: true,
          brandId: true,
          modelId: true,
          generationId: true,
          engineId: true,
          transmissionId: true,
          bodyType: true,
          fuelType: true,
          yearStart: true,
          yearEnd: true,
          year: true,
          brand: { select: { id: true, name: true } },
          model: { select: { id: true, name: true } },
          generation: { select: { id: true, name: true } },
          engine: { select: { id: true, code: true, horsepower: true, torque: true, displacement: true } },
          transmission: { select: { id: true, name: true } },
          trim: { select: { id: true, name: true } },
          specs: { select: { specs: true } },
          profileMappings: {
            select: { profile: { select: { heroImageUrl: true } } },
            take: 1
          },
          listings: {
            where: { status: 'ACTIVE' },
            select: { id: true, priceAmount: true, media: { select: { url: true }, take: 1 } },
            take: 5
          }
        },
        take: 500,
        orderBy: { id: 'asc' }
      });

      const candidateMap = new Map<string, any[]>();
      allVariants.forEach(v => {
        const key = this.buildVisibleIdentityKey(v);
        if (!candidateMap.has(key)) {
          candidateMap.set(key, []);
        }
        candidateMap.get(key)!.push(v);
      });

      const groupedCandidates: any[] = [];

      candidateMap.forEach((variants, candidateId) => {
        const rep = this.selectRepresentativeVariant(variants);
        if (!rep) return;

        let totalActiveListings = 0;
        const prices: number[] = [];
        let previewImageUrl: string | undefined = undefined;

        variants.forEach(v => {
          if (v.listings && v.listings.length > 0) {
            totalActiveListings += v.listings.length;
            v.listings.forEach((l: any) => {
              const p = Number(l.priceAmount);
              if (p > 0) prices.push(p);
              if (!previewImageUrl && l.media && l.media.length > 0 && l.media[0].url) {
                previewImageUrl = l.media[0].url;
              }
            });
          }
          if (!previewImageUrl && v.profileMappings && v.profileMappings.length > 0 && v.profileMappings[0].profile?.heroImageUrl) {
            previewImageUrl = v.profileMappings[0].profile.heroImageUrl;
          }
        });

        if (!previewImageUrl) {
          previewImageUrl = 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800';
        }

        const minActivePrice = prices.length > 0 ? Math.min(...prices) : null;
        const maxActivePrice = prices.length > 0 ? Math.max(...prices) : null;

        const specJson = (rep.specs?.specs as any) || {};
        const powerHp = rep.engine?.horsepower || specJson.powerHp || null;
        const torqueNm = rep.engine?.torque || specJson.torqueNm || null;
        const hasImage = previewImageUrl && !previewImageUrl.includes('unsplash');
        const hasSpecs = powerHp !== null || specJson.averageConsumption !== undefined;

        let eligibilityStatus: 'ELIGIBLE' | 'MISSING_IMAGE' | 'INCOMPLETE_SPECS' = 'ELIGIBLE';
        if (!hasImage) {
          eligibilityStatus = 'MISSING_IMAGE';
        } else if (!hasSpecs) {
          eligibilityStatus = 'INCOMPLETE_SPECS';
        }

        const candidateObj = {
          candidateId,
          representativeVariantId: rep.id,
          brandId: rep.brandId,
          brandName: rep.brand?.name || 'Araç',
          modelId: rep.modelId,
          modelName: rep.model?.name || '',
          generationName: rep.generation?.name || '',
          engineVersion: rep.engine?.code ? `${(rep.engine.displacement ? rep.engine.displacement / 1000 : 1.6).toFixed(1)} ${rep.engine.code}` : '1.6 Motor',
          bodyType: rep.bodyType || 'SEDAN',
          fuelType: rep.fuelType || 'BENZIN',
          transmissionName: rep.transmission?.name || 'Otomatik',
          powerHp: powerHp ? `${powerHp} HP` : '—',
          torqueNm: torqueNm ? `${torqueNm} Nm` : '—',
          averageConsumption: specJson.averageConsumption ? `${specJson.averageConsumption} L/100km` : '5.5 L/100km',
          drivetrain: specJson.drivetrain || 'Önden Çekiş',
          previewImageUrl,
          activeListingCount: totalActiveListings,
          minActivePrice,
          maxActivePrice,
          isFilteredAvailable: totalActiveListings > 0,
          isUnfilteredEligible: eligibilityStatus === 'ELIGIBLE',
          eligibilityStatus,
          isPublished: true,
          variantCount: variants.length,
          variants: variants.map(v => ({
            id: v.id,
            year: v.yearStart || v.year,
            trimName: v.trim?.name || 'Standart',
            activeListings: v.listings ? v.listings.length : 0
          })),
          aiPresentationTags: ['#konfor', '#aile-araci']
        };

        groupedCandidates.push(candidateObj);
      });

      const summary = {
        totalCandidates: groupedCandidates.length,
        withListingsCount: groupedCandidates.filter(c => c.isFilteredAvailable).length,
        unfilteredEligibleCount: groupedCandidates.filter(c => c.isUnfilteredEligible).length,
        missingContentCount: groupedCandidates.filter(c => c.eligibilityStatus !== 'ELIGIBLE').length
      };

      let filtered = groupedCandidates;

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(c => {
          const title = `${c.brandName} ${c.modelName} ${c.generationName} ${c.engineVersion}`;
          return title.toLowerCase().includes(q);
        });
      }

      if (bodyType && bodyType !== 'all') {
        filtered = filtered.filter(c => (c.bodyType || '').toUpperCase() === bodyType.toUpperCase());
      }

      if (fuelType && fuelType !== 'all') {
        filtered = filtered.filter(c => (c.fuelType || '').toUpperCase() === fuelType.toUpperCase());
      }

      if (transmission && transmission !== 'all') {
        filtered = filtered.filter(c => {
          if (transmission.toUpperCase() === 'MANUAL') {
            return c.transmissionName.toUpperCase().includes('MANUEL') || c.transmissionName.toUpperCase().includes('MANUAL');
          } else {
            return !c.transmissionName.toUpperCase().includes('MANUEL') && !c.transmissionName.toUpperCase().includes('MANUAL');
          }
        });
      }

      if (filterCategory === 'listings_only') {
        filtered = filtered.filter(c => c.isFilteredAvailable);
      } else if (filterCategory === 'unfiltered_eligible') {
        filtered = filtered.filter(c => c.isUnfilteredEligible);
      } else if (filterCategory === 'missing_content') {
        filtered = filtered.filter(c => c.eligibilityStatus !== 'ELIGIBLE');
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const paginatedCandidates = filtered.slice(startIndex, startIndex + limit);

      return {
        summary,
        total,
        page,
        totalPages,
        candidates: paginatedCandidates
      };
    } catch (error) {
      this.logger.error('Error fetching admin discovery candidates', error);
      return {
        summary: { totalCandidates: 0, withListingsCount: 0, unfilteredEligibleCount: 0, missingContentCount: 0 },
        total: 0,
        page: 1,
        totalPages: 1,
        candidates: []
      };
    }
  }
}
