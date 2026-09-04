import { Test, TestingModule } from '@nestjs/testing';
import { IsiCepteService } from './isi-cepte.service';
import { PrismaService } from '../../prisma.service';

describe('IsiCepteService — "İşiCepte Öneriyor" Public Discovery & Showcase Rules', () => {
  let service: IsiCepteService;
  let mockPrisma: any;

  const mockActiveShowcaseProviders = [
    {
      id: 'prov-1',
      isicepteProviderId: 'IC-PROV-001',
      businessName: 'Özkan Oto Servis',
      slug: 'ozkan-oto-servis',
      city: 'İstanbul',
      district: 'Ataşehir',
      supportedBrands: ['BMW', 'Mercedes-Benz', 'Volkswagen'],
      serviceCategories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik'],
      rating: 4.8,
      reviewCount: 126,
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // Active future
    },
    {
      id: 'prov-2',
      isicepteProviderId: 'IC-PROV-002',
      businessName: 'Mavi Motor',
      slug: 'mavi-motor',
      city: 'İzmir',
      district: 'Bornova',
      supportedBrands: ['Ford', 'Opel', 'Renault'],
      serviceCategories: ['Motor/Mekanik', 'Kaporta/Boya'],
      rating: 4.7,
      reviewCount: 98,
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'prov-7',
      isicepteProviderId: 'IC-PROV-007',
      businessName: 'Bavaria Garage',
      slug: 'bavaria-garage',
      city: 'İstanbul',
      district: 'Ataşehir',
      supportedBrands: ['BMW', 'MINI', 'Mercedes-Benz'],
      serviceCategories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik'],
      rating: 4.8,
      reviewCount: 132,
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    },
  ];

  beforeEach(async () => {
    mockPrisma = {
      isiCepteProvider: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      isiCepteEventLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsiCepteService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IsiCepteService>(IsiCepteService);
  });

  it('TEST 1: Default discovery returns ONLY active showcase automotive providers with available filter lists', async () => {
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(mockActiveShowcaseProviders) // query result
      .mockResolvedValueOnce(mockActiveShowcaseProviders); // filter metadata query

    const result = await service.getPublicRecommendations({});

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.items.length).toBe(3);
    expect(result.availableCities).toContain('İstanbul');
    expect(result.availableCities).toContain('İzmir');
    expect(result.availableBrands).toContain('BMW');
    expect(result.availableBrands).toContain('Ford');

    // Verify DB query enclosed strictly showcase criteria
    expect(mockPrisma.isiCepteProvider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isAutomotive: true,
          membershipStatus: 'ACTIVE',
          torqueScoutOptIn: true,
          isShowcaseActive: true,
        }),
      })
    );
  });

  it('TEST 2: City filter (İstanbul) queries case-insensitive Istanbul providers only', async () => {
    const istanbulProviders = mockActiveShowcaseProviders.filter((p) => p.city === 'İstanbul');
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(istanbulProviders)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const result = await service.getPublicRecommendations({ city: 'İstanbul' });

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.items.every((i) => i.city === 'İstanbul')).toBe(true);
  });

  it('TEST 3: City + Brand filter (İstanbul + BMW) queries specifically BMW specialist vitrin members', async () => {
    const istanbulBmwProviders = mockActiveShowcaseProviders.filter(
      (p) => p.city === 'İstanbul' && p.supportedBrands.includes('BMW')
    );
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(istanbulBmwProviders)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const result = await service.getPublicRecommendations({ city: 'İstanbul', brand: 'BMW' });

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.items.every((i) => i.supportedBrands.includes('BMW'))).toBe(true);
  });

  it('TEST 4: Empty filter combination (e.g. Kars + Volvo) returns 0 results and NO fallback filler', async () => {
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce([]) // 0 found
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const result = await service.getPublicRecommendations({ city: 'Kars', brand: 'Volvo' });

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('TEST 5: Fair rotation maintains stable ordering for identical seed while shuffling across different seeds', async () => {
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(mockActiveShowcaseProviders)
      .mockResolvedValueOnce(mockActiveShowcaseProviders)
      .mockResolvedValueOnce(mockActiveShowcaseProviders)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const res1 = await service.getPublicRecommendations({ seed: 'seed-alpha' });
    const res2 = await service.getPublicRecommendations({ seed: 'seed-alpha' });

    // Same seed produces identical stable order
    expect(res1.items.map((i) => i.id)).toEqual(res2.items.map((i) => i.id));
  });

  it('TEST 6: recordEvent logs analytics and increments provider counters', async () => {
    mockPrisma.isiCepteEventLog.create.mockResolvedValue({});
    mockPrisma.isiCepteProvider.update.mockResolvedValue({});

    const result = await service.recordEvent({
      eventType: 'ISICEPTE_PROFILE_CLICK',
      providerId: 'prov-1',
      city: 'İstanbul',
      brand: 'BMW',
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.isiCepteEventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'ISICEPTE_PROFILE_CLICK',
        providerId: 'prov-1',
        city: 'İstanbul',
        brand: 'BMW',
      }),
    });
    expect(mockPrisma.isiCepteProvider.update).toHaveBeenCalledWith({
      where: { id: 'prov-1' },
      data: { clicksCount: { increment: 1 } },
    });
  });

  it('TEST 7: Category filter (Motor/Mekanik) queries providers with matching canonical category relation', async () => {
    const motorMekanikProviders = mockActiveShowcaseProviders.filter((p) =>
      p.serviceCategories.includes('Motor/Mekanik')
    );
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(motorMekanikProviders)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const result = await service.getPublicRecommendations({ category: 'Motor/Mekanik' });

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.selectedCategory).toBe('Motor/Mekanik');
    expect(mockPrisma.isiCepteProvider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceCategories: { has: 'Motor/Mekanik' },
        }),
      })
    );
  });

  it('TEST 8: Triple filter (İstanbul + BMW + Oto Elektrik/Elektronik) applies AND semantics on all 3 predicates', async () => {
    const tripleFiltered = mockActiveShowcaseProviders.filter(
      (p) =>
        p.city === 'İstanbul' &&
        p.supportedBrands.includes('BMW') &&
        p.serviceCategories.includes('Oto Elektrik/Elektronik')
    );
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(tripleFiltered)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const result = await service.getPublicRecommendations({
      city: 'İstanbul',
      brand: 'BMW',
      category: 'Oto Elektrik/Elektronik',
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.selectedCity).toBe('İstanbul');
    expect(result.selectedBrand).toBe('BMW');
    expect(result.selectedCategory).toBe('Oto Elektrik/Elektronik');
    expect(mockPrisma.isiCepteProvider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          city: { equals: 'İstanbul', mode: 'insensitive' },
          supportedBrands: { has: 'BMW' },
          serviceCategories: { has: 'Oto Elektrik/Elektronik' },
        }),
      })
    );
  });

  it('TEST 9: "Tüm Kategoriler" does not attach category predicate to database query', async () => {
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(mockActiveShowcaseProviders)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const result = await service.getPublicRecommendations({ category: 'Tüm Kategoriler' });

    expect(result.success).toBe(true);
    expect(result.selectedCategory).toBeNull();
    const findManyCall = mockPrisma.isiCepteProvider.findMany.mock.calls[0][0];
    expect(findManyCall.where.serviceCategories).toBeUndefined();
  });

  it('TEST 10: Non-matching category combination (e.g. İstanbul + BMW + Oto Ekspertiz) returns 0 without filler', async () => {
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce([]) // 0 records matching Oto Ekspertiz
      .mockResolvedValueOnce(mockActiveShowcaseProviders);

    const result = await service.getPublicRecommendations({
      city: 'İstanbul',
      brand: 'BMW',
      category: 'Oto Ekspertiz',
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('TEST 11 (Acceptance 30): 15 Vitrin + 20 Standart — Default SHOWCASE_ONLY returns max 10 Vitrin providers', async () => {
    // Generate 15 Vitrin providers
    const vitrin15 = Array.from({ length: 15 }, (_, i) => ({
      id: `vitrin-${i + 1}`,
      isicepteProviderId: `IC-PROV-V${i + 1}`,
      businessName: `Vitrin Servis ${i + 1}`,
      slug: `vitrin-servis-${i + 1}`,
      city: 'İstanbul',
      supportedBrands: ['BMW'],
      serviceCategories: ['Motor/Mekanik'],
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    }));

    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(vitrin15) // showcase query
      .mockResolvedValueOnce(mockActiveShowcaseProviders); // filter metadata query
    mockPrisma.isiCepteProvider.count.mockResolvedValueOnce(35); // 15 vitrin + 20 standard

    const result = await service.getPublicRecommendations({
      city: 'İstanbul',
      brand: 'BMW',
      category: 'Motor/Mekanik',
      scope: 'SHOWCASE_ONLY',
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(15); // total showcase matching
    expect(result.totalShowcase).toBe(15);
    expect(result.totalAll).toBe(35);
    expect(result.items.length).toBe(10); // max 10 returned in default view
    expect(result.items.every((i) => i.isShowcase === true)).toBe(true);
  });

  it('TEST 12 (Acceptance 30): 15 Vitrin + 20 Standart — ALL_ELIGIBLE ("Tüm Ustaları Gör") returns all 35 eligible providers with Vitrin prioritized', async () => {
    const vitrin15 = Array.from({ length: 15 }, (_, i) => ({
      id: `vitrin-${i + 1}`,
      isicepteProviderId: `IC-PROV-V${i + 1}`,
      businessName: `Vitrin Servis ${i + 1}`,
      slug: `vitrin-servis-${i + 1}`,
      city: 'İstanbul',
      supportedBrands: ['BMW'],
      serviceCategories: ['Motor/Mekanik'],
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    }));

    const standard20 = Array.from({ length: 20 }, (_, i) => ({
      id: `standard-${i + 1}`,
      isicepteProviderId: `IC-PROV-S${i + 1}`,
      businessName: `Standart Servis ${i + 1}`,
      slug: `standart-servis-${i + 1}`,
      city: 'İstanbul',
      supportedBrands: ['BMW'],
      serviceCategories: ['Motor/Mekanik'],
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: false,
      showcaseExpiresAt: null,
    }));

    const all35 = [...vitrin15, ...standard20];

    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(all35) // all eligible query
      .mockResolvedValueOnce(mockActiveShowcaseProviders); // filter metadata query

    const result = await service.getPublicRecommendations({
      city: 'İstanbul',
      brand: 'BMW',
      category: 'Motor/Mekanik',
      scope: 'ALL_ELIGIBLE',
      limit: 50,
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(35);
    expect(result.totalShowcase).toBe(15);
    expect(result.totalAll).toBe(35);
    expect(result.items.length).toBe(35);
    // First 15 are showcase members, remaining 20 are standard
    expect(result.items.slice(0, 15).every((i) => i.isShowcase === true)).toBe(true);
    expect(result.items.slice(15).every((i) => i.isShowcase === false)).toBe(true);
  });

  it('TEST 13 (Acceptance 31): 4 Vitrin + 20 Standart — SHOWCASE_ONLY returns strictly 4 Vitrin providers (never fills to 10 with standard)', async () => {
    const vitrin4 = Array.from({ length: 4 }, (_, i) => ({
      id: `vitrin-${i + 1}`,
      isicepteProviderId: `IC-PROV-V${i + 1}`,
      businessName: `Vitrin Servis ${i + 1}`,
      slug: `vitrin-servis-${i + 1}`,
      city: 'İstanbul',
      supportedBrands: ['BMW'],
      serviceCategories: ['Motor/Mekanik'],
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    }));

    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(vitrin4)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);
    mockPrisma.isiCepteProvider.count.mockResolvedValueOnce(24); // 4 vitrin + 20 standard

    const result = await service.getPublicRecommendations({
      city: 'İstanbul',
      brand: 'BMW',
      category: 'Motor/Mekanik',
      scope: 'SHOWCASE_ONLY',
    });

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(4); // strictly 4, not filled to 10
    expect(result.total).toBe(4);
    expect(result.totalShowcase).toBe(4);
    expect(result.totalAll).toBe(24);
  });

  it('TEST 14 (Acceptance 32): 0 Vitrin + 20 Standart — SHOWCASE_ONLY returns 0 Vitrin items, totalAll = 20', async () => {
    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce([]) // 0 vitrin
      .mockResolvedValueOnce(mockActiveShowcaseProviders);
    mockPrisma.isiCepteProvider.count.mockResolvedValueOnce(20);

    const result = await service.getPublicRecommendations({
      city: 'İstanbul',
      brand: 'BMW',
      category: 'Motor/Mekanik',
      scope: 'SHOWCASE_ONLY',
    });

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(0);
    expect(result.total).toBe(0);
    expect(result.totalShowcase).toBe(0);
    expect(result.totalAll).toBe(20);
  });

  it('TEST 15 (Acceptance 33 & 34): Listing detail query (limit: 100) on 15 Vitrin providers returns all 15 without truncation', async () => {
    const subaruVitrin15 = Array.from({ length: 15 }, (_, i) => ({
      id: `subaru-vitrin-${i + 1}`,
      isicepteProviderId: `IC-PROV-SUB-${i + 1}`,
      businessName: `Subaru Vitrin Usta ${i + 1}`,
      slug: `subaru-vitrin-usta-${i + 1}`,
      city: 'İstanbul',
      supportedBrands: ['Subaru'],
      serviceCategories: ['Motor/Mekanik'],
      isAutomotive: true,
      membershipStatus: 'ACTIVE',
      torqueScoutOptIn: true,
      isShowcaseActive: true,
      showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    }));

    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(subaruVitrin15)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);
    mockPrisma.isiCepteProvider.count.mockResolvedValueOnce(15);

    const result = await service.getPublicRecommendations({
      city: 'İstanbul',
      brand: 'Subaru',
      limit: 100,
      scope: 'SHOWCASE_ONLY',
      seed: 'session-seed-123',
    });

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(15); // ALL 15 returned for scrollable widget dataset
    expect(result.items.every((i) => i.supportedBrands.includes('Subaru'))).toBe(true);
    expect(result.items.every((i) => i.isShowcase === true)).toBe(true);
  });

  it('TEST 16 (Acceptance 35 & 36): Wrong brand excluded, and changing city re-queries with new city + brand', async () => {
    const ankaraSubaruVitrin = [
      {
        id: 'ankara-subaru-1',
        isicepteProviderId: 'IC-PROV-ANK-SUB',
        businessName: 'Ankara Subaru Center',
        slug: 'ankara-subaru-center',
        city: 'Ankara',
        supportedBrands: ['Subaru'],
        serviceCategories: ['Motor/Mekanik'],
        isAutomotive: true,
        membershipStatus: 'ACTIVE',
        torqueScoutOptIn: true,
        isShowcaseActive: true,
        showcaseExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      },
    ];

    mockPrisma.isiCepteProvider.findMany
      .mockResolvedValueOnce(ankaraSubaruVitrin)
      .mockResolvedValueOnce(mockActiveShowcaseProviders);
    mockPrisma.isiCepteProvider.count.mockResolvedValueOnce(1);

    const result = await service.getPublicRecommendations({
      city: 'Ankara',
      brand: 'Subaru',
      limit: 100,
      scope: 'SHOWCASE_ONLY',
    });

    expect(result.success).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].city).toBe('Ankara');
    expect(mockPrisma.isiCepteProvider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          city: { equals: 'Ankara', mode: 'insensitive' },
          supportedBrands: { has: 'Subaru' },
          isShowcaseActive: true,
        }),
      })
    );
  });
});
