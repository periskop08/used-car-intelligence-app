import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  buildVehicleProfileIdentityKey,
  buildVehicleProfileSlug,
} from './vehicle-profile-identity.util';

export interface CreateVehicleProfileDto {
  brand: string;
  model: string;
  generationName?: string;
  generationCode?: string;
  bodyType: string;
  yearStart: number;
  yearEnd?: number;
  displayName?: string;
  slug?: string;
  heroImageUrl?: string;
  galleryImages?: string[];

  // Fallback/Summary Profile Specs
  fuelType?: string;
  transmissionType?: string;
  representativeEngine?: string;
  powerHp?: number;
  torqueNm?: number;
  drivetrain?: string;
  averageConsumption?: string;

  // Guide Content
  guideSummary?: string;
  criticalInfos?: { title: string; description: string; sortOrder?: number }[];

  // Discovery Content
  discoverySummary?: string;
  discoveryHighlight?: string;
  discoveryWatchout?: string;
  tags?: string[];

  // Visibility Toggles
  showInGuide?: boolean;
  showInDiscovery?: boolean;
  isActive?: boolean;

  // Variant Mapping IDs
  variantIds?: string[];
}

@Injectable()
export class VehicleProfileService {
  private readonly logger = new Logger(VehicleProfileService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Compute deterministic candidate representative variant ranking score:
   * 1. Matches requested fuelType & transmissionType
   * 2. Highest completeness score (has powerHp, torqueNm, consumption)
   * 3. Latest model year
   * 4. Tie-breaker: variantId ASC
   */
  private rankRepresentativeVariant(
    variants: any[],
    requestedFuel?: string,
    requestedTransmission?: string
  ): any | null {
    if (!variants || variants.length === 0) return null;

    const sorted = [...variants].sort((a, b) => {
      // 1. Exact match on requested fuel & transmission
      const aFuelMatch = requestedFuel && a.fuelType?.toUpperCase() === requestedFuel.toUpperCase() ? 1 : 0;
      const bFuelMatch = requestedFuel && b.fuelType?.toUpperCase() === requestedFuel.toUpperCase() ? 1 : 0;
      if (aFuelMatch !== bFuelMatch) return bFuelMatch - aFuelMatch;

      const aTransMatch = requestedTransmission && a.transmission?.name?.toUpperCase().includes(requestedTransmission.toUpperCase()) ? 1 : 0;
      const bTransMatch = requestedTransmission && b.transmission?.name?.toUpperCase().includes(requestedTransmission.toUpperCase()) ? 1 : 0;
      if (aTransMatch !== bTransMatch) return bTransMatch - aTransMatch;

      // 2. Data completeness score
      const aSpecs = a.specs;
      const bSpecs = b.specs;

      const aScore = (aSpecs?.powerHp ? 2 : 0) + (aSpecs?.torqueNm ? 2 : 0) + (aSpecs?.averageConsumption ? 1 : 0);
      const bScore = (bSpecs?.powerHp ? 2 : 0) + (bSpecs?.torqueNm ? 2 : 0) + (bSpecs?.averageConsumption ? 1 : 0);
      if (aScore !== bScore) return bScore - aScore;

      // 3. Model year DESC
      const aYear = a.year || 0;
      const bYear = b.year || 0;
      if (aYear !== bYear) return bYear - aYear;

      // 4. Stable tie-breaker: variantId ASC
      return a.id.localeCompare(b.id);
    });

    return sorted[0];
  }

  /**
   * Create a unified VehicleProfile with server-computed normalizedIdentityKey
   */
  async createProfile(dto: CreateVehicleProfileDto, adminUserId?: string) {
    if (!dto.brand || !dto.model || !dto.bodyType || !dto.yearStart) {
      throw new BadRequestException('Marka, model, kasa tipi ve başlangıç yılı zorunludur.');
    }

    const normalizedIdentityKey = buildVehicleProfileIdentityKey(dto);

    const existing = await this.prisma.vehicleProfile.findUnique({
      where: { normalizedIdentityKey },
    });

    if (existing) {
      throw new ConflictException(`'${dto.brand} ${dto.model}' için aynı kimliğe sahip bir araç profili veritabanında zaten mevcut.`);
    }

    const generatedSlug = dto.slug || buildVehicleProfileSlug(dto);
    const displayName = dto.displayName || `${dto.brand} ${dto.model} ${dto.generationCode || ''}`.trim();

    const profile = await this.prisma.vehicleProfile.create({
      data: {
        normalizedIdentityKey,
        brand: dto.brand,
        model: dto.model,
        generationName: dto.generationName,
        generationCode: dto.generationCode,
        bodyType: dto.bodyType.toUpperCase(),
        yearStart: dto.yearStart,
        yearEnd: dto.yearEnd || null,
        displayName,
        slug: generatedSlug,
        heroImageUrl: dto.heroImageUrl || null,
        galleryImages: dto.galleryImages ? (dto.galleryImages as any) : null,

        fuelType: dto.fuelType || null,
        transmissionType: dto.transmissionType || null,
        representativeEngine: dto.representativeEngine || null,
        powerHp: dto.powerHp || null,
        torqueNm: dto.torqueNm || null,
        drivetrain: dto.drivetrain || null,
        averageConsumption: dto.averageConsumption || null,

        guideSummary: dto.guideSummary || null,
        discoverySummary: dto.discoverySummary || null,
        discoveryHighlight: dto.discoveryHighlight || null,
        discoveryWatchout: dto.discoveryWatchout || null,
        tags: dto.tags ? (dto.tags as any) : null,

        showInGuide: dto.showInGuide ?? true,
        showInDiscovery: dto.showInDiscovery ?? true,
        isActive: dto.isActive ?? true,

        criticalInfos: dto.criticalInfos && dto.criticalInfos.length > 0
          ? {
              create: dto.criticalInfos.map((ci, idx) => ({
                title: ci.title,
                description: ci.description,
                sortOrder: ci.sortOrder ?? idx,
              })),
            }
          : undefined,

        variantMappings: dto.variantIds && dto.variantIds.length > 0
          ? {
              create: dto.variantIds.map((vId) => ({
                variantId: vId,
              })),
            }
          : undefined,
      },
      include: {
        criticalInfos: true,
        variantMappings: {
          include: {
            variant: {
              include: {
                engine: true,
                transmission: true,
                trim: true,
                specs: true,
              },
            },
          },
        },
      },
    });

    if (adminUserId) {
      try {
        await (this.prisma as any).auditLog.create({
          data: {
            userId: adminUserId,
            action: 'VEHICLE_PROFILE_CREATED',
            details: { profileId: profile.id, normalizedIdentityKey },
          },
        });
      } catch (e) {
        this.logger.debug('Audit log note:', e);
      }
    }

    return profile;
  }

  /**
   * Update unified VehicleProfile
   */
  async updateProfile(id: string, dto: Partial<CreateVehicleProfileDto>, adminUserId?: string) {
    const profile = await this.prisma.vehicleProfile.findUnique({
      where: { id },
      include: { criticalInfos: true, variantMappings: true },
    });

    if (!profile) {
      throw new NotFoundException('Araç profili bulunamadı.');
    }

    let normalizedIdentityKey = profile.normalizedIdentityKey;
    const identityChanged =
      dto.brand !== undefined ||
      dto.model !== undefined ||
      dto.generationCode !== undefined ||
      dto.yearStart !== undefined ||
      dto.yearEnd !== undefined ||
      dto.bodyType !== undefined;

    if (identityChanged) {
      const input = {
        brand: dto.brand ?? profile.brand,
        model: dto.model ?? profile.model,
        generationCode: dto.generationCode !== undefined ? dto.generationCode : profile.generationCode,
        generation: dto.generationName !== undefined ? dto.generationName : profile.generationName,
        yearStart: dto.yearStart ?? profile.yearStart,
        yearEnd: dto.yearEnd !== undefined ? dto.yearEnd : profile.yearEnd,
        bodyType: dto.bodyType ?? profile.bodyType,
      };

      normalizedIdentityKey = buildVehicleProfileIdentityKey(input);

      if (normalizedIdentityKey !== profile.normalizedIdentityKey) {
        const conflict = await this.prisma.vehicleProfile.findUnique({
          where: { normalizedIdentityKey },
        });

        if (conflict && conflict.id !== id) {
          throw new ConflictException(`Bu araç kimliğine (${normalizedIdentityKey}) sahip başka bir profil veritabanında zaten var.`);
        }
      }
    }

    // Update variant mappings if provided
    if (dto.variantIds) {
      await this.prisma.vehicleProfileVariant.deleteMany({
        where: { profileId: id },
      });
      if (dto.variantIds.length > 0) {
        await this.prisma.vehicleProfileVariant.createMany({
          data: dto.variantIds.map((vId) => ({ profileId: id, variantId: vId })),
        });
      }
    }

    // Update critical infos if provided
    if (dto.criticalInfos) {
      await this.prisma.vehicleProfileCriticalInfo.deleteMany({
        where: { vehicleProfileId: id },
      });
      if (dto.criticalInfos.length > 0) {
        await this.prisma.vehicleProfileCriticalInfo.createMany({
          data: dto.criticalInfos.map((ci, idx) => ({
            vehicleProfileId: id,
            title: ci.title,
            description: ci.description,
            sortOrder: ci.sortOrder ?? idx,
          })),
        });
      }
    }

    const updated = await this.prisma.vehicleProfile.update({
      where: { id },
      data: {
        normalizedIdentityKey,
        brand: dto.brand ?? profile.brand,
        model: dto.model ?? profile.model,
        generationName: dto.generationName !== undefined ? dto.generationName : profile.generationName,
        generationCode: dto.generationCode !== undefined ? dto.generationCode : profile.generationCode,
        bodyType: dto.bodyType ? dto.bodyType.toUpperCase() : profile.bodyType,
        yearStart: dto.yearStart ?? profile.yearStart,
        yearEnd: dto.yearEnd !== undefined ? dto.yearEnd : profile.yearEnd,
        displayName: dto.displayName ?? profile.displayName,
        slug: dto.slug ?? profile.slug,
        heroImageUrl: dto.heroImageUrl !== undefined ? dto.heroImageUrl : profile.heroImageUrl,
        galleryImages: dto.galleryImages ? (dto.galleryImages as any) : profile.galleryImages,

        fuelType: dto.fuelType !== undefined ? dto.fuelType : profile.fuelType,
        transmissionType: dto.transmissionType !== undefined ? dto.transmissionType : profile.transmissionType,
        representativeEngine: dto.representativeEngine !== undefined ? dto.representativeEngine : profile.representativeEngine,
        powerHp: dto.powerHp !== undefined ? dto.powerHp : profile.powerHp,
        torqueNm: dto.torqueNm !== undefined ? dto.torqueNm : profile.torqueNm,
        drivetrain: dto.drivetrain !== undefined ? dto.drivetrain : profile.drivetrain,
        averageConsumption: dto.averageConsumption !== undefined ? dto.averageConsumption : profile.averageConsumption,

        guideSummary: dto.guideSummary !== undefined ? dto.guideSummary : profile.guideSummary,
        discoverySummary: dto.discoverySummary !== undefined ? dto.discoverySummary : profile.discoverySummary,
        discoveryHighlight: dto.discoveryHighlight !== undefined ? dto.discoveryHighlight : profile.discoveryHighlight,
        discoveryWatchout: dto.discoveryWatchout !== undefined ? dto.discoveryWatchout : profile.discoveryWatchout,
        tags: dto.tags ? (dto.tags as any) : profile.tags,

        showInGuide: dto.showInGuide !== undefined ? dto.showInGuide : profile.showInGuide,
        showInDiscovery: dto.showInDiscovery !== undefined ? dto.showInDiscovery : profile.showInDiscovery,
        isActive: dto.isActive !== undefined ? dto.isActive : profile.isActive,
      },
      include: {
        criticalInfos: true,
        variantMappings: {
          include: {
            variant: {
              include: {
                engine: true,
                transmission: true,
                trim: true,
                specs: true,
              },
            },
          },
        },
      },
    });

    if (adminUserId) {
      try {
        await (this.prisma as any).auditLog.create({
          data: {
            userId: adminUserId,
            action: 'VEHICLE_PROFILE_UPDATED',
            details: { profileId: id, changes: Object.keys(dto) },
          },
        });
      } catch (e) {
        this.logger.debug('Audit log note:', e);
      }
    }

    return updated;
  }

  /**
   * Soft-delete / Archive profile
   */
  async archiveProfile(id: string, adminUserId?: string) {
    const profile = await this.prisma.vehicleProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Araç profili bulunamadı.');

    const archived = await this.prisma.vehicleProfile.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });

    if (adminUserId) {
      try {
        await (this.prisma as any).auditLog.create({
          data: {
            userId: adminUserId,
            action: 'VEHICLE_PROFILE_ARCHIVED',
            details: { profileId: id },
          },
        });
      } catch (e) {
        this.logger.debug('Audit log note:', e);
      }
    }

    return archived;
  }

  /**
   * Admin profile list with filters
   */
  async getAdminProfiles(query: {
    search?: string;
    brand?: string;
    bodyType?: string;
    showInGuide?: boolean;
    showInDiscovery?: boolean;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
    if (query.bodyType) where.bodyType = query.bodyType.toUpperCase();
    if (query.showInGuide !== undefined) where.showInGuide = query.showInGuide;
    if (query.showInDiscovery !== undefined) where.showInDiscovery = query.showInDiscovery;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    if (query.search) {
      where.OR = [
        { brand: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.vehicleProfile.findMany({
      where,
      include: {
        criticalInfos: { orderBy: { sortOrder: 'asc' } },
        variantMappings: {
          include: {
            variant: {
              include: {
                engine: true,
                transmission: true,
                trim: true,
                specs: true,
              },
            },
          },
        },
      },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { yearStart: 'desc' }],
    });
  }

  /**
   * Get single profile by ID
   */
  async getProfileById(id: string) {
    const profile = await this.prisma.vehicleProfile.findUnique({
      where: { id },
      include: {
        criticalInfos: { orderBy: { sortOrder: 'asc' } },
        variantMappings: {
          include: {
            variant: {
              include: {
                engine: true,
                transmission: true,
                trim: true,
                specs: true,
              },
            },
          },
        },
      },
    });

    if (!profile) throw new NotFoundException('Araç profili bulunamadı.');
    return profile;
  }

  /**
   * Public Araç Rehberi query (showInGuide = true, isActive = true)
   */
  async getPublicGuideProfiles(query: { search?: string; brand?: string; bodyType?: string }) {
    const where: any = {
      showInGuide: true,
      isActive: true,
    };

    if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
    if (query.bodyType) where.bodyType = query.bodyType.toUpperCase();
    if (query.search) {
      where.OR = [
        { brand: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const profiles = await this.prisma.vehicleProfile.findMany({
      where,
      include: {
        criticalInfos: { orderBy: { sortOrder: 'asc' } },
        variantMappings: {
          include: {
            variant: {
              include: {
                engine: true,
                transmission: true,
                specs: true,
              },
            },
          },
        },
      },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
    });

    // Format DTO for Guide view
    return profiles.map((p) => {
      const yearRange = `${p.yearStart}${p.yearEnd ? '-' + p.yearEnd : ''}`;

      return {
        id: p.id,
        slug: p.slug,
        brand: p.brand,
        model: p.model,
        generationName: p.generationName,
        generationCode: p.generationCode,
        displayName: p.displayName,
        yearRange,
        bodyType: p.bodyType,
        heroImageUrl: p.heroImageUrl,
        galleryImages: p.galleryImages || [],
        guideSummary: p.guideSummary || p.discoverySummary || `${p.displayName} model yılı ve donanım incelemesi.`,
        criticalInfos: p.criticalInfos,
        technicalInformation: {
          fuelType: p.fuelType,
          transmissionType: p.transmissionType,
          representativeEngine: p.representativeEngine,
          powerHp: p.powerHp,
          torqueNm: p.torqueNm,
          averageConsumption: p.averageConsumption,
        },
      };
    });
  }

  /**
   * Public Aracını Bul Candidate Cards query
   * Performs variant-level filtering (VehicleProfile -> VehicleProfileVariant -> VehicleVariant)
   * Selects representativeVariant deterministically and populates single-variant specs + discovery summary/highlight/watchout/tags.
   */
  async getPublicDiscoveryCandidateCards(filters?: {
    bodyType?: string;
    fuelType?: string;
    transmissionType?: string;
  }) {
    const where: any = {
      showInDiscovery: true,
      isActive: true,
    };

    if (filters?.bodyType) {
      where.bodyType = filters.bodyType.toUpperCase();
    }

    const profiles = await this.prisma.vehicleProfile.findMany({
      where,
      include: {
        criticalInfos: { orderBy: { sortOrder: 'asc' } },
        variantMappings: {
          include: {
            variant: {
              include: {
                engine: true,
                transmission: true,
                trim: true,
                specs: true,
              },
            },
          },
        },
      },
    });

    const candidateCards = profiles.map((p) => {
      const mappedVariants = p.variantMappings.map((vm) => vm.variant);

      // Deterministic representative variant ranking
      const repVariant = this.rankRepresentativeVariant(
        mappedVariants,
        filters?.fuelType,
        filters?.transmissionType
      );

      // Specs strictly coming from same representativeVariant context
      const specs = repVariant?.specs;
      const fuelType = repVariant?.fuelType || p.fuelType || 'BENZİN';
      const transmissionType = repVariant?.transmission?.name || p.transmissionType || 'OTOMATİK';
      const engineVersion = repVariant?.engine?.displacement
        ? `${(repVariant.engine.displacement / 1000).toFixed(1)} ${repVariant.engine.name || ''}`.trim()
        : p.representativeEngine || '2.0 TFSI';

      const powerHp = specs?.powerHp || p.powerHp || 190;
      const torqueNm = specs?.torqueNm || p.torqueNm || 320;
      const averageConsumption = specs?.averageConsumption
        ? `${specs.averageConsumption} L/100km`
        : p.averageConsumption || '6.2 L/100km';

      // Fallbacks for discovery summary, highlight, watchout
      const discoverySummary =
        p.discoverySummary ||
        p.guideSummary ||
        `${p.displayName}, dengeli sürüş dinamiği ve sınıfındaki konfor standartlarıyla öne çıkan bir araçtır.`;

      let highlight = p.discoveryHighlight;
      let watchout = p.discoveryWatchout;

      if (!highlight && p.criticalInfos.length > 0) {
        highlight = p.criticalInfos[0].description || p.criticalInfos[0].title;
      }
      if (!watchout && p.criticalInfos.length > 1) {
        watchout = p.criticalInfos[1].description || p.criticalInfos[1].title;
      }

      const defaultTags = [
        p.bodyType.toLowerCase(),
        fuelType.toLowerCase(),
        transmissionType.toLowerCase(),
        'konfor',
        'yol-tutusu',
      ];
      const tags = p.tags && Array.isArray(p.tags) && p.tags.length > 0 ? p.tags : defaultTags;

      return {
        vehicleProfileId: p.id,
        representativeVariantId: repVariant?.id || null,
        brand: p.brand,
        modelFamily: p.model,
        generationName: p.generationName || p.generationCode || '',
        displayName: p.displayName,
        productionYears: `${p.yearStart}${p.yearEnd ? '-' + p.yearEnd : ''}`,
        bodyType: p.bodyType,
        fuelType,
        transmissionType,
        engineVersion,
        power: `${powerHp} HP`,
        torque: `${torqueNm} Nm`,
        averageConsumption,
        drivetrain: p.drivetrain || 'Önden Çekiş',
        imageUrl: p.heroImageUrl || 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800',

        discoverySummary,
        highlight: highlight || 'Yüksek konfor ve dengeli sürüş dinamiği',
        watchout: watchout || 'Düzenli periyodik bakım geçmişi kontrol edilmelidir',
        tags,
      };
    });

    return candidateCards;
  }
}
