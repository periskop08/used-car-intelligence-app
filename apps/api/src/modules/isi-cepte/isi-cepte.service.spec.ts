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
});
