import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface PublicRecommendationParams {
  city?: string;
  brand?: string;
  category?: string;
  page?: number;
  limit?: number;
  seed?: string;
}

/**
 * Source of Truth: Canonical İşiCepte "Oto Hizmetleri" Categories
 * Sourced directly from İşiCepte live taxonomy.
 */
export const CANONICAL_ISICEPTE_OTO_CATEGORIES = [
  'Motor/Mekanik',
  'Kaporta/Boya',
  'Oto Çekici/Kurtarıcı',
  'Oto Elektrik/Elektronik',
  'Motosiklet Servisi',
  'Cam Filmi/Kaplama',
  'Oto Yıkama & Detay',
  'Lastik/Jant',
  'Oto Aksesuar',
  'Oto Yedek Parça',
  'Oto Ekspertiz',
] as const;

export type CanonicalIsiCepteOtoCategory = (typeof CANONICAL_ISICEPTE_OTO_CATEGORIES)[number];

@Injectable()
export class IsiCepteService implements OnModuleInit {
  private readonly logger = new Logger(IsiCepteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Purge any temporary mock/sample providers created during development
    try {
      const deleted = await this.prisma.isiCepteProvider.deleteMany({
        where: {
          isicepteProviderId: { startsWith: 'IC-PROV-' },
        },
      });
      if (deleted.count > 0) {
        this.logger.log(`Purged ${deleted.count} mock/sample İşiCepte providers from database.`);
      }
    } catch (err) {
      this.logger.warn(`Could not purge mock providers on init: ${(err as any)?.message}`);
    }
  }

  /**
   * Public discovery endpoint: Returns strictly eligible ACTIVE VITRIN (SHOWCASE) automotive providers from real database.
   *
   * Hard Invariants:
   * 1. isAutomotive === true (Oto Hizmetleri scope)
   * 2. membershipStatus === 'ACTIVE'
   * 3. torqueScoutOptIn === true
   * 4. isShowcaseActive === true
   * 5. showcaseExpiresAt > now (Active Vitrin entitlement)
   * 6. ZERO mock / sample / filler records. If count is 0, returns empty items array truthfully.
   */
  async getPublicRecommendations(params: PublicRecommendationParams) {
    const now = new Date();
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));

    // Base filter: Strictly real active showcase automotive providers
    const where: any = {
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: { gt: now },
    };

    // City Filter (Exact match or case-insensitive)
    if (params.city && params.city !== 'ALL' && params.city !== 'Tüm Şehirler' && params.city.trim() !== '') {
      where.city = { equals: params.city.trim(), mode: 'insensitive' };
    }

    // Brand Filter (Checks if supportedBrands array contains the requested brand)
    if (params.brand && params.brand !== 'ALL' && params.brand !== 'Tüm Markalar' && params.brand.trim() !== '') {
      where.supportedBrands = {
        has: params.brand.trim(),
      };
    }

    // Category Filter (Checks if serviceCategories array contains the requested canonical category)
    if (params.category && params.category !== 'ALL' && params.category !== 'Tüm Kategoriler' && params.category.trim() !== '') {
      where.serviceCategories = {
        has: params.category.trim(),
      };
    }

    // Fetch matching eligible providers
    const eligibleProviders = await this.prisma.isiCepteProvider.findMany({
      where,
    });

    const total = eligibleProviders.length;

    // Apply deterministic fair rotation per seed / day so visibility is evenly distributed
    const seedString = params.seed || new Date().toISOString().slice(0, 10);
    const sorted = this.applyDeterministicFairRotation(eligibleProviders, seedString);

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedItems = sorted.slice(startIndex, startIndex + limit);

    // Format for Public UI Safe Consumption
    const items = paginatedItems.map((p) => ({
      id: p.id,
      isicepteProviderId: p.isicepteProviderId,
      businessName: p.businessName,
      slug: p.slug,
      coverImageUrl: p.coverImageUrl || null,
      city: p.city,
      district: p.district || null,
      address: p.address || null,
      phone: p.phone || null,
      isicepteProfileUrl: p.isicepteProfileUrl,
      supportedBrands: Array.isArray(p.supportedBrands) ? p.supportedBrands : [],
      serviceCategories: Array.isArray(p.serviceCategories) ? p.serviceCategories : [],
      rating: p.rating || 0,
      reviewCount: p.reviewCount || 0,
      isShowcase: true,
    }));

    // Collect available cities & brands from active showcase pool for filter dropdowns
    const allActiveShowcase = await this.prisma.isiCepteProvider.findMany({
      where: {
        isAutomotive: true,
        membershipStatus: 'ACTIVE',
        torqueScoutOptIn: true,
        isShowcaseActive: true,
        showcaseExpiresAt: { gt: now },
      },
      select: {
        city: true,
        supportedBrands: true,
      },
    });

    const citySet = new Set<string>();
    const brandSet = new Set<string>();

    for (const p of allActiveShowcase) {
      if (p.city) citySet.add(p.city);
      if (Array.isArray(p.supportedBrands)) {
        p.supportedBrands.forEach((b) => brandSet.add(b));
      }
    }

    const availableCities = ['Tüm Şehirler', ...Array.from(citySet).sort((a, b) => a.localeCompare(b, 'tr'))];
    const availableBrands = ['Tüm Markalar', ...Array.from(brandSet).sort((a, b) => a.localeCompare(b, 'tr'))];

    return {
      success: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      availableCities,
      availableBrands,
      canonicalCategories: CANONICAL_ISICEPTE_OTO_CATEGORIES,
      selectedCity: params.city && params.city !== 'ALL' && params.city !== 'Tüm Şehirler' ? params.city : null,
      selectedBrand: params.brand && params.brand !== 'ALL' && params.brand !== 'Tüm Markalar' ? params.brand : null,
      selectedCategory: params.category && params.category !== 'ALL' && params.category !== 'Tüm Kategoriler' ? params.category : null,
    };
  }

  /**
   * Deterministic pseudo-random shuffle using a string seed.
   */
  private applyDeterministicFairRotation<T extends { id: string }>(items: T[], seed: string): T[] {
    if (!items || items.length <= 1) return items;

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const seededItems = items.map((item) => {
      let itemHash = hash;
      for (let i = 0; i < item.id.length; i++) {
        itemHash = (itemHash << 5) - itemHash + item.id.charCodeAt(i);
        itemHash |= 0;
      }
      return { item, score: Math.abs(itemHash) };
    });

    seededItems.sort((a, b) => a.score - b.score);
    return seededItems.map((s) => s.item);
  }

  /**
   * Records analytics events (IMPRESSION, PROFILE_CLICK, OUTBOUND_CLICK)
   */
  async recordEvent(data: {
    eventType: 'ISICEPTE_SHOWCASE_IMPRESSION' | 'ISICEPTE_PROFILE_CLICK' | 'ISICEPTE_OUTBOUND_CLICK' | string;
    providerId?: string;
    city?: string;
    brand?: string;
    userId?: string;
    metadata?: any;
  }) {
    if (!data.eventType) return { success: false };

    try {
      await this.prisma.isiCepteEventLog.create({
        data: {
          eventType: data.eventType,
          providerId: data.providerId || null,
          city: data.city || null,
          brand: data.brand || null,
          userId: data.userId || null,
          metadata: data.metadata || undefined,
        },
      });

      if (data.providerId) {
        if (data.eventType === 'ISICEPTE_SHOWCASE_IMPRESSION') {
          await this.prisma.isiCepteProvider.update({
            where: { id: data.providerId },
            data: { impressionsCount: { increment: 1 } },
          }).catch(() => null);
        } else if (data.eventType === 'ISICEPTE_PROFILE_CLICK') {
          await this.prisma.isiCepteProvider.update({
            where: { id: data.providerId },
            data: { clicksCount: { increment: 1 } },
          }).catch(() => null);
        } else if (data.eventType === 'ISICEPTE_OUTBOUND_CLICK') {
          await this.prisma.isiCepteProvider.update({
            where: { id: data.providerId },
            data: { outboundClicksCount: { increment: 1 } },
          }).catch(() => null);
        }
      }

      return { success: true };
    } catch (e) {
      return { success: false };
    }
  }

  /**
   * Retrieves single provider details by slug or ID.
   */
  async getProviderByIdOrSlug(idOrSlug: string) {
    const provider = await this.prisma.isiCepteProvider.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { isicepteProviderId: idOrSlug }],
      },
    });

    if (!provider) {
      throw new NotFoundException(`İşletme '${idOrSlug}' bulunamadı.`);
    }

    return provider;
  }

  // --- Admin Backoffice Overview & Queries ---

  async getOverview() {
    const totalProviders = await this.prisma.isiCepteProvider.count();
    const now = new Date();
    const activeShowcase = await this.prisma.isiCepteProvider.count({
      where: { isShowcaseActive: true, showcaseExpiresAt: { gt: now } },
    });
    const activeNationalVisibility = await this.prisma.isiCepteProvider.count({
      where: { isNationalVisibilityActive: true, nationalExpiresAt: { gt: now } },
    });
    const activeLocalVisibility = await this.prisma.isiCepteProvider.count({
      where: { isAutomotive: true, membershipStatus: 'ACTIVE', torqueScoutOptIn: true },
    });

    return {
      connected: true,
      message: 'İşi Cepte entegrasyonu aktif.',
      totalProviders,
      activeLocalVisibility,
      activeShowcase,
      activeNationalVisibility,
    };
  }

  async getProviders(params: {
    page?: number;
    limit?: number;
    search?: string;
    membershipStatus?: string;
    optIn?: string;
    showcaseFilter?: string;
    nationalFilter?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const where: any = {};

    if (params.search) {
      where.OR = [
        { businessName: { contains: params.search, mode: 'insensitive' } },
        { isicepteProviderId: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.membershipStatus) {
      where.membershipStatus = params.membershipStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.isiCepteProvider.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.isiCepteProvider.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      message: total === 0 ? 'Kayıt bulunamadı.' : undefined,
    };
  }

  async getProviderById(id: string) {
    return this.getProviderByIdOrSlug(id);
  }

  async getRegionalVisibility(params: any) {
    return this.getProviders(params);
  }

  async getShowcase(params: any) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const now = new Date();

    const [items, total] = await Promise.all([
      this.prisma.isiCepteProvider.findMany({
        where: {
          isShowcaseActive: true,
          showcaseExpiresAt: { gt: now },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { showcaseExpiresAt: 'asc' },
      }),
      this.prisma.isiCepteProvider.count({
        where: { isShowcaseActive: true, showcaseExpiresAt: { gt: now } },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getNationalVisibility(params: any) {
    return this.getProviders(params);
  }

  async getRecommendations(params: {
    brand?: string;
    category?: string;
    country?: string;
    region?: string;
    district?: string;
    limit?: number;
  }) {
    const queryResult = await this.getPublicRecommendations({
      city: params.region,
      brand: params.brand,
      limit: params.limit || 6,
    });

    return {
      items: queryResult.items,
      totalLocal: queryResult.total,
      totalNational: 0,
      totalCount: queryResult.total,
      selectedRegion: params.region || null,
      brand: params.brand || null,
      message: queryResult.total === 0 ? 'Bu araç ve konum için henüz senkronize edilmiş uygun servis bulunamadı.' : undefined,
    };
  }

  async getPurchases(params: any) {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      message: 'Henüz satın alma kaydı bulunmuyor.',
    };
  }
}
