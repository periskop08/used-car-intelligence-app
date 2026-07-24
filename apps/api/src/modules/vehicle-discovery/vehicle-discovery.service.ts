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

  // Map card fuel type string to FuelType enum
  private mapFuelType(fuelStr: string): FuelType {
    const s = fuelStr.toLowerCase();
    if (s.includes("benzin")) return FuelType.PETROL;
    if (s.includes("dizel")) return FuelType.DIESEL;
    if (s.includes("lpg")) return FuelType.LPG;
    if (s.includes("hibrit")) return FuelType.HYBRID;
    if (s.includes("plug-in")) return FuelType.PLUG_IN_HYBRID;
    if (s.includes("elektrik")) return FuelType.ELECTRIC;
    return FuelType.OTHER;
  }

  // Map card body type string to BodyType enum
  private mapBodyType(bodyStr: string): BodyType {
    const s = bodyStr.toUpperCase();
    if (s.includes("SEDAN")) return BodyType.SEDAN;
    if (s.includes("HATCHBACK")) return BodyType.HATCHBACK;
    if (s.includes("SUV")) return BodyType.SUV;
    if (s.includes("WAGON") || s.includes("STATION")) return BodyType.WAGON;
    if (s.includes("PICKUP")) return BodyType.PICKUP;
    if (s.includes("MINIVAN") || s.includes("VAN")) return BodyType.VAN;
    return BodyType.OTHER;
  }

  // Start or resume a session
  async getOrCreateSession(params: {
    userId?: string;
    guestIdentityId?: string;
    filters?: {
      minimumPrice?: number;
      maximumPrice?: number;
      bodyTypes?: BodyType[];
      fuelTypes?: FuelType[];
      transmissions?: TransmissionType[];
    };
  }) {
    const { userId, guestIdentityId, filters } = params;

    if (!userId && !guestIdentityId) {
      throw new BadRequestException("Oturum başlatmak için kullanıcı veya misafir kimliği gereklidir.");
    }

    const now = new Date();

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
          orderBy: { position: 'asc' }
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

    // Determine mode and create a new session
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

    // Populate candidates
    const { warning } = await this.populateSessionItems({
      session: newSession,
      startIndex: 0
    });

    // Fetch complete session with items
    const sessionWithItems = await this.prisma.vehicleDiscoverySession.findUnique({
      where: { id: newSession.id },
      include: {
        items: {
          orderBy: { position: 'asc' }
        }
      }
    });

    return { session: sessionWithItems, isNew: true, warning };
  }

  // Candidate generation & Fisher-Yates Seeded Shuffle population
  private async populateSessionItems(params: {
    session: any;
    startIndex: number;
    tx?: Prisma.TransactionClient;
  }): Promise<{ warning: string | null }> {
    const { session, startIndex, tx } = params;
    const db = tx || this.prisma;

    let warning: string | null = null;

    // Get all cards to filter
    const allCards = await db.vehicleDiscoveryCard.findMany({
      where: { isActive: true, archivedAt: null },
      include: {
        priceSnapshot: true
      }
    });

    let candidates = [...allCards];

    if (session.mode === VehicleDiscoveryMode.FILTERED) {
      candidates = candidates.filter(card => {
        // Price overlap check
        if (card.priceSnapshot) {
          const cardMin = Number(card.priceSnapshot.estimatedMin);
          const cardMax = Number(card.priceSnapshot.estimatedMax);
          const filterMin = Number(session.minimumPrice);
          const filterMax = session.maximumPrice ? Number(session.maximumPrice) : Infinity;

          // Check if overlap exists: Card interval intersects with Filter interval
          if (cardMax < filterMin || cardMin > filterMax) {
            return false;
          }
        }

        // Body type check
        if (session.bodyTypes && session.bodyTypes.length > 0) {
          const cardEnum = this.mapBodyType(card.bodyType);
          if (!session.bodyTypes.includes(cardEnum)) return false;
        }

        // Fuel type check
        if (session.fuelTypes && session.fuelTypes.length > 0) {
          const cardEnum = this.mapFuelType(card.fuelType);
          if (!session.fuelTypes.includes(cardEnum)) return false;
        }

        // Transmission type check
        if (session.transmissions && session.transmissions.length > 0) {
          const cardTrans = card.transmissionType.toLowerCase();
          const matches = session.transmissions.some((t: TransmissionType) => {
            if (t === TransmissionType.MANUAL) {
              return cardTrans.includes("manuel");
            } else {
              return cardTrans.includes("otomatik") || cardTrans.includes("cvt") || cardTrans.includes("dct");
            }
          });
          if (!matches) return false;
        }

        return true;
      });

      if (candidates.length < session.targetCount) {
        warning = `Seçtiğiniz filtrelere uyan yalnızca ${candidates.length} araç bulundu. Kalan kartlar genel havuzdan tamamlanacak.`;
        
        // Fill the rest with non-overlapping active cards
        const candidateIds = new Set(candidates.map(c => c.id));
        const extraCards = allCards.filter(c => !candidateIds.has(c.id));
        
        // Shuffle extras and append
        const seedVal = this.getSeedFromString(session.id + "_extra_" + session.filterRevision);
        const shuffledExtras = this.shuffleWithSeed(extraCards, seedVal);
        
        candidates = candidates.concat(shuffledExtras).slice(0, session.targetCount);
      }
    }

    // Seeded shuffle of final candidate list
    const seed = this.getSeedFromString(session.id + "_" + session.filterRevision);
    const shuffledCandidates = this.shuffleWithSeed(candidates, seed);

    const itemsToInsert = shuffledCandidates.slice(0, session.targetCount - startIndex).map((card, idx) => ({
      sessionId: session.id,
      vehicleDiscoveryCardId: card.id,
      position: startIndex + idx,
      action: null,
      shownAt: null,
      actionAt: null
    }));

    await db.vehicleDiscoverySessionItem.createMany({
      data: itemsToInsert
    });

    return { warning };
  }

  // Get/claim next card candidate for a session
  async getNextCardCandidate(sessionId: string, identity: { userId?: string; guestIdentityId?: string }) {
    const now = new Date();
    const session = await this.prisma.vehicleDiscoverySession.findUnique({
      where: { id: sessionId },
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

    if (!session) {
      throw new NotFoundException("Keşif oturumu bulunamadı.");
    }

    // Access control
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
      // Completed, ran out of cards
      await this.prisma.vehicleDiscoverySession.update({
        where: { id: session.id },
        data: {
          status: VehicleDiscoverySessionStatus.COMPLETED,
          completedAt: now
        }
      });
      return { status: "COMPLETED", card: null, session };
    }

    // Mark as shown if not already shown
    if (!currentItem.shownAt) {
      await this.prisma.vehicleDiscoverySessionItem.update({
        where: { id: currentItem.id },
        data: { shownAt: now }
      });
    }

    return {
      status: "ACTIVE",
      card: currentItem.card,
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

    // Use Prisma transaction to ensure strict serialization and lock
    return this.prisma.$transaction(async (tx) => {
      // Fetch session with lock
      const session = await tx.vehicleDiscoverySession.findUnique({
        where: { id: sessionId },
        include: {
          items: true
        }
      });

      if (!session) {
        throw new NotFoundException("Keşif oturumu bulunamadı.");
      }

      // Access control
      if (session.userId && session.userId !== identity.userId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }
      if (!session.userId && session.guestIdentityId !== identity.guestIdentityId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }

      if (session.status !== VehicleDiscoverySessionStatus.ACTIVE || session.expiresAt <= now) {
        throw new BadRequestException("Keşif oturumu aktif değil veya süresi dolmuş.");
      }

      // Check version for optimistic concurrency control
      if (session.version !== expectedVersion) {
        throw new ConflictException("Oturum güncellendi. Lütfen en son kart durumunu tekrar yükleyin.");
      }

      const activeItem = session.items.find(item => item.position === session.currentIndex);

      if (!activeItem) {
        throw new BadRequestException("Mevcut pozisyonda araç bulunamadı.");
      }

      if (activeItem.vehicleDiscoveryCardId !== cardId) {
        throw new BadRequestException("Gönderilen araç kimliği sıradaki araçla eşleşmiyor.");
      }

      // Record item action
      await tx.vehicleDiscoverySessionItem.update({
        where: { id: activeItem.id },
        data: {
          action,
          actionAt: now
        }
      });

      // Update session currentIndex and version
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
    identity: { userId?: string; guestIdentityId?: string };
  }) {
    const { sessionId, filters, identity } = params;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.vehicleDiscoverySession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new NotFoundException("Keşif oturumu bulunamadı.");
      }

      // Access control
      if (session.userId && session.userId !== identity.userId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }
      if (!session.userId && session.guestIdentityId !== identity.guestIdentityId) {
        throw new BadRequestException("Bu oturuma erişim yetkiniz yok.");
      }

      if (session.status !== VehicleDiscoverySessionStatus.ACTIVE || session.expiresAt <= now) {
        throw new BadRequestException("Keşif oturumu aktif değil.");
      }

      // Delete all unswiped items after the current index (positional cleanup)
      await tx.vehicleDiscoverySessionItem.deleteMany({
        where: {
          sessionId,
          position: { gte: session.currentIndex }
        }
      });

      const nextFilterRevision = session.filterRevision + 1;
      const nextVersion = session.version + 1;

      // Update session with new filters and mode
      const updatedSession = await tx.vehicleDiscoverySession.update({
        where: { id: sessionId },
        data: {
          minimumPrice: filters.minimumPrice || 0,
          maximumPrice: filters.maximumPrice || null,
          bodyTypes: filters.bodyTypes || [],
          fuelTypes: filters.fuelTypes || [],
          transmissions: filters.transmissions || [],
          mode: VehicleDiscoveryMode.FILTERED,
          filterRevision: nextFilterRevision,
          version: nextVersion,
          lastActivityAt: now
        }
      });

      // Seed items starting from current index
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

  // Get matching recommendations (rule-based algorithm with softening fallback layers)
  async getRecommendations(sessionId: string, identity: { userId?: string; guestIdentityId?: string }) {
    const session = await this.prisma.vehicleDiscoverySession.findUnique({
      where: { id: sessionId },
      include: {
        items: {
          include: {
            card: {
              include: {
                mappedVariants: {
                  include: {
                    variant: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException("Keşif oturumu bulunamadı.");
    }

    // Access control
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

    // Recalculate scoring profile dynamically from swipes
    const bodyTypeScores: Record<string, number> = {};
    const fuelTypeScores: Record<string, number> = {};
    const transmissionScores: Record<string, number> = {};
    const brandScores: Record<string, number> = {};
    const modelFamilyScores: Record<string, number> = {};
    const tagScores: Record<string, number> = {};

    swipes.forEach(s => {
      const c = s.card;
      const isLike = s.action === VehicleDiscoveryAction.LIKE;
      const weight = isLike ? 1.0 : -0.8;

      const cardBody = this.mapBodyType(c.bodyType);
      const cardFuel = this.mapFuelType(c.fuelType);
      
      bodyTypeScores[cardBody] = (bodyTypeScores[cardBody] || 0) + (1.5 * weight);
      fuelTypeScores[cardFuel] = (fuelTypeScores[cardFuel] || 0) + (1.0 * weight);
      
      const cardTrans = c.transmissionType.toLowerCase();
      const transEnum = cardTrans.includes("manuel") ? TransmissionType.MANUAL : TransmissionType.AUTOMATIC;
      transmissionScores[transEnum] = (transmissionScores[transEnum] || 0) + (1.2 * weight);

      brandScores[c.brand] = (brandScores[c.brand] || 0) + (0.5 * weight);
      modelFamilyScores[c.modelFamily] = (modelFamilyScores[c.modelFamily] || 0) + (0.7 * weight);

      const tags = (c.tags as string[]) || [];
      tags.forEach(tag => {
        tagScores[tag] = (tagScores[tag] || 0) + (1.5 * weight);
      });
    });

    const scoringProfile = {
      bodyTypeScores,
      fuelTypeScores,
      transmissionScores,
      brandScores,
      modelFamilyScores,
      tagScores
    };

    // Softening fallback algorithm
    let matchedVariants: any[] = [];
    let softeningLevel = 0;

    // We only recommend APPROVED variants that have active price snapshots (Turkey-only)
    // Filter conditions layers
    while (matchedVariants.length < 5 && softeningLevel <= 3) {
      const bodyFilter = (session.mode === VehicleDiscoveryMode.FILTERED && softeningLevel < 2) 
        ? (session.bodyTypes && session.bodyTypes.length > 0 ? { in: session.bodyTypes } : undefined)
        : undefined;

      const fuelFilter = (session.mode === VehicleDiscoveryMode.FILTERED && softeningLevel < 1)
        ? (session.fuelTypes && session.fuelTypes.length > 0 ? { in: session.fuelTypes } : undefined)
        : undefined;

      const transFilter = (session.mode === VehicleDiscoveryMode.FILTERED && softeningLevel < 1)
        ? (session.transmissions && session.transmissions.length > 0 ? { type: { in: session.transmissions } } : undefined)
        : undefined;

      const priceFilter = (session.mode === VehicleDiscoveryMode.FILTERED && softeningLevel < 3)
        ? {
            priceSnapshot: {
              estimatedMin: { lte: session.maximumPrice ? Number(session.maximumPrice) : Infinity },
              estimatedMax: { gte: Number(session.minimumPrice) }
            }
          }
        : {};

      matchedVariants = await this.prisma.vehicleVariant.findMany({
        where: {
          status: 'APPROVED',
          bodyType: bodyFilter,
          fuelType: fuelFilter,
          transmission: transFilter,
          ...priceFilter
        },
        include: {
          brand: true,
          model: true,
          generation: true,
          engine: true,
          transmission: true,
          trim: true,
          priceSnapshot: true,
          listings: {
            where: { status: 'ACTIVE' },
            take: 3,
            include: {
              media: {
                take: 1
              }
            }
          }
        }
      });

      softeningLevel++;
    }

    // Rank the matched variants using our scoringProfile
    const ranked = matchedVariants.map(v => {
      let score = 0;

      // Body score
      if (v.bodyType && bodyTypeScores[v.bodyType]) {
        score += bodyTypeScores[v.bodyType];
      }

      // Fuel score
      if (v.fuelType && fuelTypeScores[v.fuelType]) {
        score += fuelTypeScores[v.fuelType];
      }

      // Transmission score
      if (v.transmission && transmissionScores[v.transmission.type]) {
        score += transmissionScores[v.transmission.type];
      }

      // Brand score
      if (v.brand && brandScores[v.brand.name]) {
        score += brandScores[v.brand.name];
      }

      // Model score
      if (v.model && modelFamilyScores[v.model.name]) {
        score += modelFamilyScores[v.model.name];
      }

      // Add a small random noise to prevent identical rank clustering
      score += Math.random() * 0.05;

      return { variant: v, score };
    });

    // Sort by score descending and take top 5
    ranked.sort((a, b) => b.score - a.score);
    const topRecommendations = ranked.slice(0, 5).map(r => r.variant);

    return {
      message: softeningLevel > 1 ? "Kriterlerinize en yakın eşleşen alternatifleri listeledik." : "Kriterlerinize en uygun araç önerileri.",
      scoringProfile,
      recommendations: topRecommendations
    };
  }

  // Merge Guest Session with User Session
  async mergeGuestSession(guestIdentityId: string, userId: string) {
    // Check if guest identity exists
    const guestIdentity = await this.prisma.vehicleDiscoveryGuestIdentity.findUnique({
      where: { id: guestIdentityId }
    });

    if (!guestIdentity) return { success: false };

    // Update all sessions belonging to the guest identity to belong to the logged-in user
    await this.prisma.vehicleDiscoverySession.updateMany({
      where: { guestIdentityId, userId: null },
      data: { userId }
    });

    // Record merge in guest identity table
    await this.prisma.vehicleDiscoveryGuestIdentity.update({
      where: { id: guestIdentityId },
      data: { mergedAt: new Date() }
    });

    return { success: true };
  }
}
