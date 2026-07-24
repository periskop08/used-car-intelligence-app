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

  // Mock database records
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

  const mockCards = [
    {
      id: 'card-1',
      brand: 'Peugeot',
      modelFamily: '3008',
      bodyType: 'SUV',
      fuelType: 'Benzinli',
      transmissionType: 'Otomatik',
      engineVersion: '1.2 PureTech',
      power: '130 HP',
      torque: '230 Nm',
      productionYears: '2020-',
      averageConsumption: '5.5 L',
      drivetrain: 'FWD',
      imageUrl: 'http://image.com/1',
      tags: ['SUV', 'Konfor'],
      isActive: true,
      archivedAt: null,
      priceSnapshot: { estimatedMin: 1200000, estimatedMax: 1500000, medianPrice: 1350000 }
    },
    {
      id: 'card-2',
      brand: 'Renault',
      modelFamily: 'Megane',
      bodyType: 'Sedan',
      fuelType: 'Dizel',
      transmissionType: 'Manuel',
      engineVersion: '1.5 dCi',
      power: '115 HP',
      torque: '260 Nm',
      productionYears: '2019-',
      averageConsumption: '4.2 L',
      drivetrain: 'FWD',
      imageUrl: 'http://image.com/2',
      tags: ['Sedan', 'Ekonomik'],
      isActive: true,
      archivedAt: null,
      priceSnapshot: { estimatedMin: 900000, estimatedMax: 1100000, medianPrice: 1000000 }
    }
  ];

  const mockPrismaService = {
    vehicleDiscoverySession: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    vehicleDiscoveryCard: {
      findMany: jest.fn().mockResolvedValue(mockCards),
    },
    vehicleDiscoverySessionItem: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn(),
    },
    vehicleDiscoveryGuestIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vehicleVariant: {
      findMany: jest.fn().mockResolvedValue([]),
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
          { id: 'item-1', position: 0, vehicleDiscoveryCardId: 'card-1', action: null }
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
        cardId: 'card-1',
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
        version: 5, // actual version is 5
        items: [
          { id: 'item-1', position: 0, vehicleDiscoveryCardId: 'card-1', action: null }
        ]
      };

      mockPrismaService.vehicleDiscoverySession.findUnique.mockResolvedValueOnce(activeSession);

      await expect(service.recordSwipe({
        sessionId: 'test-session-123',
        cardId: 'card-1',
        action: VehicleDiscoveryAction.LIKE,
        expectedVersion: 0, // client expects 0
        identity: { userId: 'user-123' }
      })).rejects.toThrow(ConflictException);
    });
  });
});
