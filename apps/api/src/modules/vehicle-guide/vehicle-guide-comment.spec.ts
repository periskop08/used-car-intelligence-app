import { Test, TestingModule } from '@nestjs/testing';
import { VehicleGuideService } from './vehicle-guide.service';
import { PrismaService } from '../../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GuideCommentStatus } from '@prisma/client';

describe('VehicleGuideComment System (SİSTEM B - Bağımsız)', () => {
  let service: VehicleGuideService;

  const mockPrismaService = {
    vehicleGuideCard: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    vehicleGuideComment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleGuideService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VehicleGuideService>(VehicleGuideService);
    jest.clearAllMocks();
  });

  describe('1. createGuideComment (Public User Submission)', () => {
    it('should reject comment under 20 characters', async () => {
      await expect(
        service.createGuideComment('card-1', 'user-1', {
          comment: 'Çok kısa',
          usageMonths: 12,
          isOwner: true,
          recommends: true,
          reliabilityRating: 5,
          fuelRating: 5,
          comfortRating: 5,
          partsRating: 5,
          maintenanceRating: 5,
          resaleRating: 5,
          overallRating: 5,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative usageMonths', async () => {
      await expect(
        service.createGuideComment('card-1', 'user-1', {
          comment: 'Bu araç tam 1000 karakter olmasa da gayet yeterli bir yorum örneğidir.',
          usageMonths: -5,
          isOwner: true,
          recommends: true,
          reliabilityRating: 5,
          fuelRating: 5,
          comfortRating: 5,
          partsRating: 5,
          maintenanceRating: 5,
          resaleRating: 5,
          overallRating: 5,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce daily 1 comment limit per user per guide card', async () => {
      mockPrismaService.vehicleGuideCard.findUnique.mockResolvedValue({ id: 'card-1' });
      mockPrismaService.vehicleGuideComment.findFirst.mockResolvedValue({ id: 'existing-comment-today' });

      await expect(
        service.createGuideComment('card-1', 'user-1', {
          comment: 'Bu araç harika bir aile otomobili ve son derece konforlu.',
          usageMonths: 12,
          isOwner: true,
          recommends: true,
          reliabilityRating: 5,
          fuelRating: 4,
          comfortRating: 5,
          partsRating: 4,
          maintenanceRating: 4,
          resaleRating: 4,
          overallRating: 5,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new comment with PENDING status when valid', async () => {
      mockPrismaService.vehicleGuideCard.findUnique.mockResolvedValue({ id: 'card-1' });
      mockPrismaService.vehicleGuideComment.findFirst.mockResolvedValue(null);
      mockPrismaService.vehicleGuideComment.create.mockResolvedValue({
        id: 'new-comment-1',
        status: GuideCommentStatus.PENDING,
      });

      const res = await service.createGuideComment('card-1', 'user-1', {
        comment: 'Bu araç harika bir aile otomobili ve son derece konforlu.',
        usageMonths: 12,
        isOwner: true,
        recommends: true,
        reliabilityRating: 5,
        fuelRating: 4,
        comfortRating: 5,
        partsRating: 4,
        maintenanceRating: 4,
        resaleRating: 4,
        overallRating: 5,
      });

      expect(res.success).toBe(true);
      expect(res.commentId).toBe('new-comment-1');
      expect(mockPrismaService.vehicleGuideComment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: GuideCommentStatus.PENDING,
          comment: 'Bu araç harika bir aile otomobili ve son derece konforlu.',
        }),
      });
    });
  });

  describe('2. getGuideComments (Public View)', () => {
    it('should return ONLY APPROVED comments for public user view', async () => {
      mockPrismaService.vehicleGuideCard.findUnique.mockResolvedValue({ id: 'card-1' });
      mockPrismaService.vehicleGuideComment.findMany.mockResolvedValue([
        {
          id: 'comment-app-1',
          vehicleGuideCardId: 'card-1',
          comment: 'Harika bir araç tavsiye ederim.',
          usageMonths: 24,
          isOwner: true,
          recommends: true,
          reliabilityRating: 5,
          fuelRating: 4,
          comfortRating: 5,
          partsRating: 5,
          maintenanceRating: 4,
          resaleRating: 4,
          overallRating: 5,
          createdAt: new Date(),
          user: {
            id: 'user-1',
            firstName: 'Ahmet',
            lastName: 'Yılmaz',
            username: 'ahmety',
            customerNo: 'TS-2607-000001',
          },
        },
      ]);

      const res = await service.getGuideComments('card-1');
      expect(res.approvedCount).toBe(1);
      expect(res.comments[0].displayName).toBe('Ahmet Yılmaz');
      expect(mockPrismaService.vehicleGuideComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            vehicleGuideCardId: 'card-1',
            status: GuideCommentStatus.APPROVED,
          },
        })
      );
    });
  });

  describe('3. Admin Moderation', () => {
    it('should update comment status to APPROVED or REJECTED with admin audit log', async () => {
      mockPrismaService.vehicleGuideComment.findUnique.mockResolvedValue({ id: 'comment-1' });
      mockPrismaService.vehicleGuideComment.update.mockResolvedValue({
        id: 'comment-1',
        status: GuideCommentStatus.APPROVED,
        moderatedBy: 'Admin Efe',
      });

      const res = await service.adminUpdateGuideCommentStatus('comment-1', { id: 'admin-1', name: 'Admin Efe' }, { status: 'APPROVED' });
      expect(res.status).toBe(GuideCommentStatus.APPROVED);
      expect(mockPrismaService.vehicleGuideComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: expect.objectContaining({
          status: GuideCommentStatus.APPROVED,
          moderatedBy: 'Admin Efe',
        }),
      });
    });
  });
});
