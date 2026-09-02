import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../../prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';

describe('Araç Sorgula Kullanıcı Yorumları Moderasyon Sistemi (SİSTEM A)', () => {
  let service: ReviewService;

  const mockPrismaService = {
    vehicleVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userReview: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    jest.clearAllMocks();
  });

  describe('1. createReview (Public Submission Flow)', () => {
    it('should create new review with PENDING status by default', async () => {
      mockPrismaService.vehicleVariant.findUnique.mockResolvedValue({ id: 'variant-1' });
      mockPrismaService.userReview.findUnique.mockResolvedValue(null);
      mockPrismaService.userReview.create.mockResolvedValue({
        id: 'rev-1',
        variantId: 'variant-1',
        status: ApprovalStatus.PENDING,
      });

      const res = await service.createReview('user-1', {
        variantId: 'variant-1',
        comment: 'Bu varyant şehir içi kullanımda son derece tasarruflu.',
        usageDuration: 18,
        isOwner: true,
        recommend: true,
        rating: {
          reliability: 5,
          fuelConsumption: 5,
          comfort: 4,
          partCost: 4,
          maintenanceCost: 4,
          resaleEase: 5,
          overall: 5,
        },
      });

      expect(res.review.status).toBe(ApprovalStatus.PENDING);
      expect(mockPrismaService.userReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ApprovalStatus.PENDING,
          }),
        })
      );
    });

    it('should throw ConflictException on duplicate review within same calendar day', async () => {
      mockPrismaService.vehicleVariant.findUnique.mockResolvedValue({ id: 'variant-1' });
      mockPrismaService.userReview.findUnique.mockResolvedValue({ id: 'existing-review-today' });

      await expect(
        service.createReview('user-1', {
          variantId: 'variant-1',
          comment: 'İkinci kez yorum yapmayı deniyorum.',
          usageDuration: 18,
          isOwner: true,
          recommend: true,
          rating: {
            reliability: 5,
            fuelConsumption: 5,
            comfort: 4,
            partCost: 4,
            maintenanceCost: 4,
            resaleEase: 5,
            overall: 5,
          },
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. adminGetReviewsOverview (Admin Vehicle List)', () => {
    it('should ONLY return variants that have at least 1 UserReview (do not load empty dataset)', async () => {
      mockPrismaService.vehicleVariant.findMany.mockResolvedValue([
        {
          id: 'var-1',
          brand: { name: 'Toyota' },
          model: { name: 'Corolla' },
          year: 2022,
          yearStart: 2020,
          yearEnd: 2024,
          fuelType: 'BENZIN',
          transmission: { name: 'Otomatik' },
          engine: { code: '1.8 Hybrid', displacement: 1.8, horsepower: 122 },
          trim: { name: 'Flame' },
          reviews: [
            { id: 'r1', status: ApprovalStatus.PENDING },
            { id: 'r2', status: ApprovalStatus.APPROVED },
          ],
        },
      ]);

      const res = await service.adminGetReviewsOverview();
      expect(res.variants.length).toBe(1);
      expect(res.variants[0].brand).toBe('Toyota');
      expect(res.variants[0].pendingCount).toBe(1);
      expect(res.variants[0].approvedCount).toBe(1);
      expect(res.summary.totalPending).toBe(1);
      expect(res.summary.totalApproved).toBe(1);
      expect(res.summary.totalComments).toBe(2);
    });
  });

  describe('3. adminUpdateReviewStatus (Moderation Action)', () => {
    it('should approve review and update status to APPROVED', async () => {
      mockPrismaService.userReview.findUnique.mockResolvedValue({ id: 'r1' });
      mockPrismaService.userReview.update.mockResolvedValue({
        id: 'r1',
        status: ApprovalStatus.APPROVED,
      });

      const res = await service.adminUpdateReviewStatus('r1', { id: 'admin-1', name: 'Admin Efe' }, 'APPROVED');
      expect(res.status).toBe(ApprovalStatus.APPROVED);
      expect(mockPrismaService.userReview.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { status: ApprovalStatus.APPROVED },
        include: { rating: true },
      });
    });

    it('should reject review and update status to REJECTED', async () => {
      mockPrismaService.userReview.findUnique.mockResolvedValue({ id: 'r2' });
      mockPrismaService.userReview.update.mockResolvedValue({
        id: 'r2',
        status: ApprovalStatus.REJECTED,
      });

      const res = await service.adminUpdateReviewStatus('r2', { id: 'admin-1', name: 'Admin Efe' }, 'REJECTED');
      expect(res.status).toBe(ApprovalStatus.REJECTED);
      expect(mockPrismaService.userReview.update).toHaveBeenCalledWith({
        where: { id: 'r2' },
        data: { status: ApprovalStatus.REJECTED },
        include: { rating: true },
      });
    });
  });
});
