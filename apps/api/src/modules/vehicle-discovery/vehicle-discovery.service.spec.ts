import { Test, TestingModule } from '@nestjs/testing';
import { VehicleDiscoveryService } from './vehicle-discovery.service';
import { PrismaService } from '../../prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { 
  BodyType, 
  FuelType, 
  TransmissionType, 
  VehicleDiscoveryMode, 
  VehicleDiscoverySessionStatus, 
  VehicleDiscoveryAction 
} from '@prisma/client';

describe('VehicleDiscoveryService', () => {
  let service: VehicleDiscoveryService;
  let prisma: PrismaService;

  const mockSession = {
    id: 'test-session-123',
    userId: 'user-123',
    guestIdentityId: null,
    status: VehicleDiscoverySessionStatus.ACTIVE,
    mode: VehicleDiscoveryMode.RANDOM,
    currentIndex: 0,
    version: 0,
    filterRevision: 0,
    minimumPrice: 0,
    maximumPrice: null,
    bodyTypes: [],
    fuelTypes: [],
    transmissions: [],
    targetCount: 20,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    lastActivityAt: new Date(),
  };

  const mockVariant = {
    id: 'variant-308-eat8',
    brandId: 'brand-peugeot',
    modelId: 'model-308',
    generationId: 'gen-3',
    engineId: 'eng-12-puretech',
    transmissionId: 'trans-eat8',
    trimId: 'trim-allure',
    year: 2022,
    bodyType: BodyType.HATCHBACK,
    fuelType: FuelType.PETROL,
    brand: { id: 'brand-peugeot', name: 'Peugeot' },
    model: { id: 'model-308', name: '308' },
    generation: { id: 'gen-3', name: '3. Nesil' },
    engine: { id: 'eng-12-puretech', code: '1.2 PureTech 130', horsepower: 130, torque: 230 },
    transmission: { id: 'trans-eat8', name: 'EAT8 Otomatik', type: TransmissionType.AUTOMATIC },
    trim: { id: 'trim-allure', name: 'Allure' },
    specs: { specs: { averageConsumption: 5.5, drivetrain: 'Önden Çekiş' } },
    listings: [
      { id: 'listing-1', priceAmount: 1520000, media: [{ url: 'http://image.com/1.jpg' }] }
    ]
  };

  const mockPrismaService = {
    vehicleDiscoverySession: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    vehicleDiscoveryCard: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    vehicleListing: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    vehicleVariant: {
      findMany: jest.fn().mockResolvedValue([mockVariant]),
      findFirst: jest.fn().mockResolvedValue(mockVariant),
    },
    vehicleDiscoverySessionItem: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn(),
    },
    vehicleDiscoveryGuestIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleDiscoveryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VehicleDiscoveryService>(VehicleDiscoveryService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Session Startup', () => {
    it('should create a new session when no active session exists', async () => {
      mockPrismaService.vehicleDiscoverySession.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.vehicleDiscoverySession.create.mockResolvedValueOnce(mockSession);
      mockPrismaService.vehicleDiscoverySession.findUnique.mockResolvedValueOnce({
        ...mockSession,
        items: []
      });

      const result = await service.getOrCreateSession({
        userId: 'user-123'
      });

      expect(result.session.id).toBe(mockSession.id);
      expect(prisma.vehicleDiscoverySession.create).toHaveBeenCalled();
    });

    it('should resume existing session if active and not expired', async () => {
      mockPrismaService.vehicleDiscoverySession.findFirst.mockResolvedValueOnce(mockSession);

      const result = await service.getOrCreateSession({
        userId: 'user-123'
      });

      expect(result.session.id).toBe(mockSession.id);
      expect(result.isNew).toBe(false);
    });
  });

  describe('Optimistic Concurrency Swipe', () => {
    it('should swipe successfully and increment index and version', async () => {
      const activeSession = {
        ...mockSession,
        items: [
          { id: 'item-1', position: 0, vehicleVariantId: 'variant-308-eat8', action: null }
        ]
      };

      mockPrismaService.vehicleDiscoverySession.findUnique.mockResolvedValueOnce(activeSession);
      mockPrismaService.vehicleDiscoverySession.update.mockResolvedValueOnce({
        ...activeSession,
        currentIndex: 1,
        version: 1
      });

      const result = await service.recordSwipe({
        sessionId: 'test-session-123',
        cardId: 'variant-308-eat8',
        action: VehicleDiscoveryAction.LIKE,
        expectedVersion: 0,
        identity: { userId: 'user-123' }
      });

      expect(result.success).toBe(true);
      expect(result.currentIndex).toBe(1);
      expect(result.version).toBe(1);
    });

    it('should throw ConflictException if expected version does not match actual version', async () => {
      const activeSession = {
        ...mockSession,
        version: 5,
        items: [
          { id: 'item-1', position: 0, vehicleVariantId: 'variant-308-eat8', action: null }
        ]
      };

      mockPrismaService.vehicleDiscoverySession.findUnique.mockResolvedValueOnce(activeSession);

      await expect(service.recordSwipe({
        sessionId: 'test-session-123',
        cardId: 'variant-308-eat8',
        action: VehicleDiscoveryAction.LIKE,
        expectedVersion: 0,
        identity: { userId: 'user-123' }
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('Transmission Normalization & Recommendations Payload', () => {
    it('should normalize DSG/EAT8 under Automatic family and return exact vehicleVariantId payload in recommendations', async () => {
      const activeSession = {
        ...mockSession,
        minimumPrice: 1000000,
        maximumPrice: 1600000,
        items: [
          {
            id: 'item-1',
            position: 0,
            vehicleVariantId: mockVariant.id,
            action: VehicleDiscoveryAction.LIKE,
            variant: mockVariant
          }
        ]
      };

      mockPrismaService.vehicleDiscoverySession.findUnique.mockResolvedValueOnce(activeSession);

      const result = await service.getRecommendations('test-session-123', { userId: 'user-123' });

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.recommendedVariantId).toBe('variant-308-eat8');
      expect(result.recommendation.listingsQuery.vehicleVariantId).toBe('variant-308-eat8');
      expect(result.recommendation.listingsQuery.minPrice).toBe(1000000);
      expect(result.recommendation.listingsQuery.maxPrice).toBe(1600000);
    });
  });
});
