import { Test, TestingModule } from '@nestjs/testing';
import { VehicleProfileService } from '../vehicle-profile.service';
import { PrismaService } from '../../../prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('VehicleProfileService', () => {
  let service: VehicleProfileService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vehicleProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vehicleProfileVariant: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    vehicleProfileCriticalInfo: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VehicleProfileService>(VehicleProfileService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProfile', () => {
    it('should throw ConflictException if profile with same normalizedIdentityKey exists', async () => {
      mockPrismaService.vehicleProfile.findUnique.mockResolvedValue({
        id: 'existing-id',
        normalizedIdentityKey: 'bmw|5-serisi|g30|2017|2023|sedan',
      });

      await expect(
        service.createProfile({
          brand: 'BMW',
          model: '5 Serisi',
          generationCode: 'G30',
          yearStart: 2017,
          yearEnd: 2023,
          bodyType: 'Sedan',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should create unified profile when identity is unique', async () => {
      mockPrismaService.vehicleProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicleProfile.create.mockResolvedValue({
        id: 'new-profile-id',
        brand: 'BMW',
        model: '5 Serisi',
        generationCode: 'G30',
        bodyType: 'SEDAN',
        yearStart: 2017,
        yearEnd: 2023,
        normalizedIdentityKey: 'bmw|5-serisi|g30|2017|2023|sedan',
        showInGuide: true,
        showInDiscovery: true,
        isActive: true,
      });

      const result = await service.createProfile({
        brand: 'BMW',
        model: '5 Serisi',
        generationCode: 'G30',
        yearStart: 2017,
        yearEnd: 2023,
        bodyType: 'Sedan',
      });

      expect(result.id).toBe('new-profile-id');
      expect(mockPrismaService.vehicleProfile.create).toHaveBeenCalled();
    });
  });

  describe('archiveProfile', () => {
    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.vehicleProfile.findUnique.mockResolvedValue(null);

      await expect(service.archiveProfile('non-existing-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should set isActive=false and archivedAt timestamp', async () => {
      mockPrismaService.vehicleProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        isActive: true,
      });
      mockPrismaService.vehicleProfile.update.mockResolvedValue({
        id: 'profile-1',
        isActive: false,
        archivedAt: new Date(),
      });

      const res = await service.archiveProfile('profile-1');
      expect(res.isActive).toBe(false);
      expect(mockPrismaService.vehicleProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({ isActive: false }),
      });
    });
  });

  describe('getPublicDiscoveryCandidateCards', () => {
    it('should select representative variant deterministically and format discovery card with summary, highlight, watchout, and tags', async () => {
      mockPrismaService.vehicleProfile.findMany.mockResolvedValue([
        {
          id: 'profile-audi-a6',
          brand: 'Audi',
          model: 'A6',
          generationName: 'C8',
          displayName: 'Audi A6 C8 Sedan',
          yearStart: 2018,
          yearEnd: 2025,
          bodyType: 'SEDAN',
          fuelType: 'PETROL',
          transmissionType: 'AUTOMATIC',
          heroImageUrl: 'https://example.com/audi.jpg',
          guideSummary: 'Rehber genel ozeti',
          discoverySummary: 'Uzun yol konforu ve dengeli surus dinamigi sunan sedan.',
          discoveryHighlight: 'Yuksek otoyol konforu',
          discoveryWatchout: 'Sanziman periyodik bakimi',
          tags: ['sedan', 'benzinli', 'otomatik', 'konfor'],
          criticalInfos: [],
          variantMappings: [
            {
              variant: {
                id: 'variant-20-tfsi',
                year: 2020,
                fuelType: 'PETROL',
                transmission: { name: 'S tronic Otomatik' },
                engine: { displacement: 1984, name: 'TFSI' },
                specs: {
                  powerHp: 190,
                  torqueNm: 320,
                  averageConsumption: '6.5',
                },
              },
            },
          ],
        },
      ]);

      const candidates = await service.getPublicDiscoveryCandidateCards({
        fuelType: 'PETROL',
        transmissionType: 'AUTOMATIC',
      });

      expect(candidates.length).toBe(1);
      const card = candidates[0];

      expect(card.vehicleProfileId).toBe('profile-audi-a6');
      expect(card.representativeVariantId).toBe('variant-20-tfsi');
      expect(card.power).toBe('190 HP');
      expect(card.torque).toBe('320 Nm');
      expect(card.discoverySummary).toBe('Uzun yol konforu ve dengeli surus dinamigi sunan sedan.');
      expect(card.highlight).toBe('Yuksek otoyol konforu');
      expect(card.watchout).toBe('Sanziman periyodik bakimi');
      expect(card.tags).toContain('konfor');
    });
  });
});
