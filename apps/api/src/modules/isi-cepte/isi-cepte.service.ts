import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface PublicRecommendationParams {
  city?: string;
  brand?: string;
  page?: number;
  limit?: number;
  seed?: string;
}

@Injectable()
export class IsiCepteService implements OnModuleInit {
  private readonly logger = new Logger(IsiCepteService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedInitialProvidersIfEmpty();
  }

  /**
   * Seeds initial canonical İşiCepte providers if table is empty.
   */
  async seedInitialProvidersIfEmpty() {
    const count = await this.prisma.isiCepteProvider.count();
    if (count > 0) return;

    this.logger.log('Seeding initial canonical İşiCepte providers...');

    const futureExpiry = new Date('2028-01-01T00:00:00.000Z');
    const pastExpiry = new Date('2024-01-01T00:00:00.000Z');

    const seedProviders = [
      // 1. Özkan Oto Servis (Istanbul - Multibrand)
      {
        isicepteProviderId: 'IC-PROV-001',
        businessName: 'Özkan Oto Servis',
        slug: 'ozkan-oto-servis',
        coverImageUrl: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Ataşehir',
        address: 'Bostancı Oto Sanayi Sitesi, 2. Blok No: 14, Ataşehir / İstanbul',
        phone: '0216 574 00 11',
        email: 'info@ozkanoto.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/ozkan-oto-servis',
        supportedBrands: ['BMW', 'Mercedes-Benz', 'Volkswagen'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik'],
        rating: 4.8,
        reviewCount: 126,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 2. Mavi Motor (Izmir - Multibrand)
      {
        isicepteProviderId: 'IC-PROV-002',
        businessName: 'Mavi Motor',
        slug: 'mavi-motor',
        coverImageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İzmir',
        district: 'Bornova',
        address: '3. Sanayi Sitesi, 404. Sokak No: 8, Bornova / İzmir',
        phone: '0232 342 12 34',
        email: 'iletisim@mavimotor.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/mavi-motor',
        supportedBrands: ['Ford', 'Opel', 'Renault'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik'],
        rating: 4.7,
        reviewCount: 98,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 3. Çelik Garage (Kocaeli)
      {
        isicepteProviderId: 'IC-PROV-003',
        businessName: 'Çelik Garage',
        slug: 'celik-garage',
        coverImageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'Kocaeli',
        district: 'İzmit',
        address: 'Körfez Küçük Sanayi Sitesi, 11. Cadde No: 22, İzmit / Kocaeli',
        phone: '0262 335 44 55',
        email: 'info@celikgarage.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/celik-garage',
        supportedBrands: ['Audi', 'Volkswagen', 'Skoda'],
        serviceCategories: ['Motor Mekanik', 'Arıza Tespit', 'Kaporta', 'Elektrik'],
        rating: 4.9,
        reviewCount: 87,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 4. Premium Oto Klinik (Ankara)
      {
        isicepteProviderId: 'IC-PROV-004',
        businessName: 'Premium Oto Klinik',
        slug: 'premium-oto-klinik',
        coverImageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'Ankara',
        district: 'Çankaya',
        address: 'Şaşmaz Oto Sanayi Sitesi, 2480. Cadde No: 5, Çankaya / Ankara',
        phone: '0312 278 99 00',
        email: 'servis@premiumotoklinik.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/premium-oto-klinik',
        supportedBrands: ['Mercedes-Benz', 'BMW', 'Audi'],
        serviceCategories: ['Periyodik Bakım', 'Arıza Tespit', 'Motor Mekanik', 'Elektrik'],
        rating: 4.8,
        reviewCount: 112,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 5. Anadolu Teknik (Bursa)
      {
        isicepteProviderId: 'IC-PROV-005',
        businessName: 'Anadolu Teknik',
        slug: 'anadolu-teknik',
        coverImageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'Bursa',
        district: 'Nilüfer',
        address: 'Küçük Sanayi Sitesi, 14. Blok No: 3, Nilüfer / Bursa',
        phone: '0224 441 55 66',
        email: 'info@anadoluteknikoto.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/anadolu-teknik',
        supportedBrands: ['Toyota', 'Honda', 'Hyundai'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik'],
        rating: 4.6,
        reviewCount: 75,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 6. Usta Nokta (Antalya)
      {
        isicepteProviderId: 'IC-PROV-006',
        businessName: 'Usta Nokta',
        slug: 'usta-nokta',
        coverImageUrl: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'Antalya',
        district: 'Kepez',
        address: 'Akdeniz Sanayi Sitesi, 5012. Sokak No: 18, Kepez / Antalya',
        phone: '0242 221 33 44',
        email: 'destek@ustanokta.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/usta-nokta',
        supportedBrands: ['Fiat', 'Peugeot', 'Citroen'],
        serviceCategories: ['Arıza Tespit', 'Motor Mekanik', 'Elektrik', 'Kaporta'],
        rating: 4.7,
        reviewCount: 64,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 7. Bavaria Garage (Istanbul - BMW Specialist)
      {
        isicepteProviderId: 'IC-PROV-007',
        businessName: 'Bavaria Garage',
        slug: 'bavaria-garage',
        coverImageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Ataşehir',
        address: 'İçerenköy Mah. Sanayi Cad. No: 12, Ataşehir / İstanbul',
        phone: '0216 575 88 99',
        email: 'info@bavariagarage.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/bavaria-garage',
        supportedBrands: ['BMW', 'MINI', 'Mercedes-Benz'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik', 'Şanzıman'],
        rating: 4.8,
        reviewCount: 132,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 8. Ataşehir BMW Servis (Istanbul - BMW Specialist)
      {
        isicepteProviderId: 'IC-PROV-008',
        businessName: 'Ataşehir BMW Servis',
        slug: 'atasehir-bmw-servis',
        coverImageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Ataşehir',
        address: 'Bostancı Sanayi Girişi, 1. Ada No: 4, Ataşehir / İstanbul',
        phone: '0216 573 22 11',
        email: 'atasehir@bmwservis.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/atasehir-bmw-servis',
        supportedBrands: ['BMW', 'MINI'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik', 'Şanzıman'],
        rating: 4.7,
        reviewCount: 98,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 9. M Power Teknik (Istanbul - BMW Specialist)
      {
        isicepteProviderId: 'IC-PROV-009',
        businessName: 'M Power Teknik',
        slug: 'm-power-teknik',
        coverImageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Ümraniye',
        address: 'Dudullu Organize Sanayi Bölgesi, 3. Cadde No: 45, Ümraniye / İstanbul',
        phone: '0216 612 00 99',
        email: 'servis@mpowerteknik.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/m-power-teknik',
        supportedBrands: ['BMW', 'MINI', 'Mercedes-Benz'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik', 'Şanzıman'],
        rating: 4.9,
        reviewCount: 156,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 10. Levent Premium Service (Istanbul - BMW Specialist)
      {
        isicepteProviderId: 'IC-PROV-010',
        businessName: 'Levent Premium Service',
        slug: 'levent-premium-service',
        coverImageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Beşiktaş',
        address: '4. Levent Sanayi Mahallesi, Sultan Selim Cad. No: 88, Beşiktaş / İstanbul',
        phone: '0212 284 33 22',
        email: 'info@leventpremium.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/levent-premium-service',
        supportedBrands: ['BMW', 'Mercedes-Benz', 'Audi'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik', 'Şanzıman'],
        rating: 4.8,
        reviewCount: 121,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 11. German AutoLab (Istanbul - BMW Specialist)
      {
        isicepteProviderId: 'IC-PROV-011',
        businessName: 'German AutoLab',
        slug: 'german-autolab',
        coverImageUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Kadıköy',
        address: 'Fikirtepe Mah. Mandıra Cad. No: 104, Kadıköy / İstanbul',
        phone: '0216 345 67 89',
        email: 'randevu@germanautolab.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/german-autolab',
        supportedBrands: ['BMW', 'MINI', 'Audi'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik', 'Şanzıman'],
        rating: 4.7,
        reviewCount: 89,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 12. Bosphorus Garage (Istanbul - BMW Specialist)
      {
        isicepteProviderId: 'IC-PROV-012',
        businessName: 'Bosphorus Garage',
        slug: 'bosphorus-garage',
        coverImageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80',
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Bakırköy',
        address: 'Zuhuratbaba Mah. İncirli Cad. No: 56, Bakırköy / İstanbul',
        phone: '0212 571 90 00',
        email: 'servis@bosphorusgarage.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/bosphorus-garage',
        supportedBrands: ['BMW', 'MINI', 'Mercedes-Benz'],
        serviceCategories: ['Motor Mekanik', 'Periyodik Bakım', 'Arıza Tespit', 'Elektrik', 'Şanzıman'],
        rating: 4.8,
        reviewCount: 113,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 13. EXPIRED Showcase Provider (Should NEVER appear on public showcase discovery page)
      {
        isicepteProviderId: 'IC-PROV-EXPIRED',
        businessName: 'Eski Vitrinli Servis',
        slug: 'eski-vitrinli-servis',
        coverImageUrl: null,
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Kartal',
        address: 'Kartal Oto Sanayi Sitesi No: 12, İstanbul',
        phone: '0216 444 00 00',
        email: 'eski@servis.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/eski-vitrinli-servis',
        supportedBrands: ['BMW', 'Renault'],
        serviceCategories: ['Motor Mekanik'],
        rating: 4.2,
        reviewCount: 15,
        isShowcaseActive: false,
        showcaseStartsAt: new Date('2023-01-01'),
        showcaseExpiresAt: pastExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      // 14. NON-SHOWCASE Member (Has profile & optIn, but no showcase entitlement - should NEVER appear on showcase discovery page)
      {
        isicepteProviderId: 'IC-PROV-NON-SHOWCASE',
        businessName: 'Standart Üye Tamirhane',
        slug: 'standart-uye-tamirhane',
        coverImageUrl: null,
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: 'İstanbul',
        district: 'Maltepe',
        address: 'Maltepe Sanayi No: 5, İstanbul',
        phone: '0216 333 11 22',
        email: 'standart@tamirhane.com',
        isicepteProfileUrl: 'https://isicepte.com/usta/standart-uye-tamirhane',
        supportedBrands: ['BMW', 'Fiat'],
        serviceCategories: ['Motor Mekanik'],
        rating: 4.0,
        reviewCount: 10,
        isShowcaseActive: false,
        showcaseStartsAt: null,
        showcaseExpiresAt: null,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
    ];

    for (const p of seedProviders) {
      await this.prisma.isiCepteProvider.upsert({
        where: { isicepteProviderId: p.isicepteProviderId },
        update: {},
        create: p,
      });
    }

    this.logger.log(`Seeded ${seedProviders.length} İşiCepte providers successfully.`);
  }

  /**
   * Public discovery endpoint: Returns only eligible ACTIVE VITRIN (SHOWCASE) automotive providers.
   * Rules:
   * 1. isAutomotive === true
   * 2. membershipStatus === 'ACTIVE'
   * 3. torqueScoutOptIn === true
   * 4. isShowcaseActive === true
   * 5. showcaseExpiresAt > now
   * 6. Optional City & Brand filters
   * 7. Deterministic Fair Random Rotation per session/day
   */
  async getPublicRecommendations(params: PublicRecommendationParams) {
    const now = new Date();
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));

    // Base filter: Strictly active showcase automotive providers
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

    // Brand Filter (Checks if supportedBrands array contains the brand)
    if (params.brand && params.brand !== 'ALL' && params.brand !== 'Tüm Markalar' && params.brand.trim() !== '') {
      where.supportedBrands = {
        has: params.brand.trim(),
      };
    }

    // Fetch all eligible providers matching criteria
    const eligibleProviders = await this.prisma.isiCepteProvider.findMany({
      where,
    });

    const total = eligibleProviders.length;

    // Apply deterministic, fair pseudo-random rotation
    // Generates a stable order for the given seed / day, avoiding chaos on every re-render while rotating visibility
    const seedString = params.seed || new Date().toISOString().slice(0, 10); // Default to daily rotation seed
    const sorted = this.applyDeterministicFairRotation(eligibleProviders, seedString);

    // Apply Pagination
    const startIndex = (page - 1) * limit;
    const paginatedItems = sorted.slice(startIndex, startIndex + limit);

    // Format for Public UI Safe Consumption
    const items = paginatedItems.map((p) => ({
      id: p.id,
      isicepteProviderId: p.isicepteProviderId,
      businessName: p.businessName,
      slug: p.slug,
      coverImageUrl: p.coverImageUrl,
      city: p.city,
      district: p.district,
      address: p.address,
      phone: p.phone,
      isicepteProfileUrl: p.isicepteProfileUrl,
      supportedBrands: p.supportedBrands,
      serviceCategories: p.serviceCategories,
      rating: p.rating,
      reviewCount: p.reviewCount,
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
      selectedCity: params.city && params.city !== 'ALL' && params.city !== 'Tüm Şehirler' ? params.city : null,
      selectedBrand: params.brand && params.brand !== 'ALL' && params.brand !== 'Tüm Markalar' ? params.brand : null,
    };
  }

  /**
   * Deterministic pseudo-random shuffle using a string seed (e.g. session id or date YYYY-MM-DD).
   * Ensures fair exposure across providers while remaining stable during user exploration.
   */
  private applyDeterministicFairRotation<T extends { id: string }>(items: T[], seed: string): T[] {
    if (!items || items.length <= 1) return items;

    // Hash seed to numeric value
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
    // Preserve existing vehicle-report level recommendation functionality
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
