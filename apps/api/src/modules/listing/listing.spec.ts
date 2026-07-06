import { Test, TestingModule } from '@nestjs/testing';
import { ListingService } from './listing.service';
import { PrismaService } from '../../prisma.service';
import { ListingStatus, MediaModerationStatus, ListingPackageType, SubscriptionTier } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Listing Module Tests', () => {
  let listingService: ListingService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    vehicleListing: {
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    vehicleVariant: {
      findUnique: jest.fn(),
    },
    listingMedia: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    listingService = module.get<ListingService>(ListingService);
    jest.clearAllMocks();
  });

  describe('Quota Limit Tests', () => {
    it('should allow FREE user to have exactly 1 active listing and block 2nd', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-free',
        subscriptionTier: SubscriptionTier.FREE,
      });

      // 0 active listings -> OK
      mockPrisma.vehicleListing.count.mockResolvedValue(0);
      await expect(listingService.checkQuota('user-free')).resolves.not.toThrow();

      // 1 active listing -> Block
      mockPrisma.vehicleListing.count.mockResolvedValue(1);
      await expect(listingService.checkQuota('user-free')).rejects.toThrow(
        new BadRequestException('İlan yayınlama kotanızı doldurdunuz. Daha fazla ilan yayınlamak için paketinizi yükseltebilirsiniz.'),
      );
    });

    it('should allow STANDARD user to have exactly 10 active listings and block 11th', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-standard',
        subscriptionTier: SubscriptionTier.STANDARD,
      });

      // 9 active listings -> OK
      mockPrisma.vehicleListing.count.mockResolvedValue(9);
      await expect(listingService.checkQuota('user-standard')).resolves.not.toThrow();

      // 10 active listings -> Block
      mockPrisma.vehicleListing.count.mockResolvedValue(10);
      await expect(listingService.checkQuota('user-standard')).rejects.toThrow(
        new BadRequestException('İlan yayınlama kotanızı doldurdunuz. Daha fazla ilan yayınlamak için paketinizi yükseltebilirsiniz.'),
      );
    });

    it('should allow PREMIUM user to have exactly 50 active listings and block 51st', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-premium',
        subscriptionTier: SubscriptionTier.PREMIUM,
      });

      // 49 active listings -> OK
      mockPrisma.vehicleListing.count.mockResolvedValue(49);
      await expect(listingService.checkQuota('user-premium')).resolves.not.toThrow();

      // 50 active listings -> Block
      mockPrisma.vehicleListing.count.mockResolvedValue(50);
      await expect(listingService.checkQuota('user-premium')).rejects.toThrow(
        new BadRequestException('İlan yayınlama kotanızı doldurdunuz. Daha fazla ilan yayınlamak için paketinizi yükseltebilirsiniz.'),
      );
    });
  });

  describe('Media Upload & Moderation Gating Tests', () => {
    it('should block transition to ACTIVE if listing has 0 approved photos', async () => {
      mockPrisma.vehicleListing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-free',
        vehicleVariantId: 'variant-1',
        modelYear: 2016,
        kilometers: 100000,
        priceAmount: 500000,
        city: 'Istanbul',
        countryCode: 'TR',
        seller: { id: 'user-free', subscriptionTier: SubscriptionTier.FREE },
        media: [
          { id: 'media-1', moderationStatus: MediaModerationStatus.PENDING },
        ],
      });

      mockPrisma.vehicleListing.count.mockResolvedValue(0);
      mockPrisma.vehicleVariant.findUnique.mockResolvedValue({
        id: 'variant-1',
        status: 'APPROVED',
      });

      await expect(listingService.validateListingCanBecomeActive('listing-1')).rejects.toThrow(
        new BadRequestException('İlanda minimum 1 adet APPROVED media kaydı bulunmalı.'),
      );
    });

    it('should succeed transition to ACTIVE if listing has at least 1 approved photo', async () => {
      mockPrisma.vehicleListing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-free',
        vehicleVariantId: 'variant-1',
        modelYear: 2016,
        kilometers: 100000,
        priceAmount: 500000,
        city: 'Istanbul',
        countryCode: 'TR',
        seller: { id: 'user-free', subscriptionTier: SubscriptionTier.FREE },
        media: [
          { id: 'media-1', moderationStatus: MediaModerationStatus.APPROVED },
        ],
      });

      mockPrisma.vehicleListing.count.mockResolvedValue(0);
      mockPrisma.vehicleVariant.findUnique.mockResolvedValue({
        id: 'variant-1',
        status: 'APPROVED',
      });

      await expect(listingService.validateListingCanBecomeActive('listing-1')).resolves.toBe(true);
    });

    it('should downgrade status to PENDING_REVIEW if approved photos drop to 0', async () => {
      mockPrisma.vehicleListing.findUnique.mockResolvedValue({
        id: 'listing-1',
        status: ListingStatus.ACTIVE,
        media: [
          { id: 'media-1', moderationStatus: MediaModerationStatus.REJECTED },
        ],
      });

      mockPrisma.listingMedia.findMany.mockResolvedValue([
        { id: 'media-1', sortOrder: 0, moderationStatus: MediaModerationStatus.REJECTED },
      ]);

      await listingService.reorderMedia('listing-1');

      expect(mockPrisma.vehicleListing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-1' },
          data: { status: ListingStatus.PENDING_REVIEW },
        }),
      );
    });
  });

  describe('Shared Validation Gating Tests', () => {
    it('should throw if vehicleVariantId is missing', async () => {
      mockPrisma.vehicleListing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-free',
        vehicleVariantId: null,
        seller: { id: 'user-free', subscriptionTier: SubscriptionTier.FREE },
        media: [
          { id: 'media-1', moderationStatus: MediaModerationStatus.APPROVED },
        ],
      });

      await expect(listingService.validateListingCanBecomeActive('listing-1')).rejects.toThrow(
        new BadRequestException('İlanda geçerli vehicleVariantId olmalı.'),
      );
    });

    it('should throw if vehicleVariant status is not APPROVED', async () => {
      mockPrisma.vehicleListing.findUnique.mockResolvedValue({
        id: 'listing-1',
        sellerId: 'user-free',
        vehicleVariantId: 'variant-1',
        seller: { id: 'user-free', subscriptionTier: SubscriptionTier.FREE },
        media: [
          { id: 'media-1', moderationStatus: MediaModerationStatus.APPROVED },
        ],
      });

      mockPrisma.vehicleVariant.findUnique.mockResolvedValue({
        id: 'variant-1',
        status: 'PENDING',
      });

      await expect(listingService.validateListingCanBecomeActive('listing-1')).rejects.toThrow(
        new BadRequestException('Bağlı vehicleVariant status değeri APPROVED olmalı.'),
      );
    });
  });

  describe('Listing Duration and Expiration Cron Tests', () => {
    it('should stamp 30 days for FREE/STANDARD packages, and 45 days for PREMIUM', async () => {
      // FREE package
      mockPrisma.vehicleListing.findUnique.mockResolvedValue({
        id: 'listing-free',
        sellerId: 'user-free',
        vehicleVariantId: 'variant-1',
        modelYear: 2016,
        kilometers: 100000,
        priceAmount: 500000,
        city: 'Istanbul',
        countryCode: 'TR',
        seller: { id: 'user-free', subscriptionTier: SubscriptionTier.FREE },
        media: [
          { id: 'media-1', moderationStatus: MediaModerationStatus.APPROVED },
        ],
      });
      mockPrisma.vehicleVariant.findUnique.mockResolvedValue({ id: 'variant-1', status: 'APPROVED' });

      await listingService.validateListingCanBecomeActive('listing-free');
      expect(mockPrisma.vehicleListing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            packageAtPublish: ListingPackageType.FREE,
            listingDurationDays: 30,
          }),
        }),
      );

      // PREMIUM package
      mockPrisma.vehicleListing.findUnique.mockResolvedValue({
        id: 'listing-premium',
        sellerId: 'user-premium',
        vehicleVariantId: 'variant-1',
        modelYear: 2016,
        kilometers: 100000,
        priceAmount: 500000,
        city: 'Istanbul',
        countryCode: 'TR',
        seller: { id: 'user-premium', subscriptionTier: SubscriptionTier.PREMIUM },
        media: [
          { id: 'media-1', moderationStatus: MediaModerationStatus.APPROVED },
        ],
      });

      await listingService.validateListingCanBecomeActive('listing-premium');
      expect(mockPrisma.vehicleListing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            packageAtPublish: ListingPackageType.PREMIUM,
            listingDurationDays: 45,
          }),
        }),
      );
    });

    it('should transition expired ACTIVE listings to PASSIVE and passiveUntil = 15 days', async () => {
      const now = new Date();
      mockPrisma.vehicleListing.findMany
        .mockResolvedValueOnce([
          { id: 'listing-expired', status: ListingStatus.ACTIVE, expiresAt: new Date(now.getTime() - 1000) },
        ]) // for ACTIVE check
        .mockResolvedValueOnce([]); // for PASSIVE check

      const result = await listingService.cronCheckListingExpirations();
      expect(result.deactivatedCount).toBe(1);

      expect(mockPrisma.vehicleListing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-expired' },
          data: expect.objectContaining({
            status: ListingStatus.PASSIVE,
            passiveUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('should transition expired PASSIVE listings to EXPIRED status', async () => {
      const now = new Date();
      mockPrisma.vehicleListing.findMany
        .mockResolvedValueOnce([]) // for ACTIVE check
        .mockResolvedValueOnce([
          { id: 'listing-passive-expired', status: ListingStatus.PASSIVE, passiveUntil: new Date(now.getTime() - 1000) },
        ]); // for PASSIVE check

      const result = await listingService.cronCheckListingExpirations();
      expect(result.expiredCount).toBe(1);

      expect(mockPrisma.vehicleListing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-passive-expired' },
          data: { status: ListingStatus.EXPIRED },
        }),
      );
    });
  });
});
