import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackService, ALLOWED_TRANSITIONS } from '../../src/modules/feedback/feedback.service';
import { FeedbackSource, FeedbackCategory, FeedbackStatus, FeedbackPriority } from '@prisma/client';

describe('Listing Report & Moderation System (İlanı Bildir)', () => {
  let feedbackService: FeedbackService;
  let mockPrismaService: any;
  let mockR2Service: any;

  beforeEach(() => {
    mockPrismaService = {
      feedback: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      vehicleListing: {
        findUnique: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      message: {
        create: jest.fn(),
      },
    };

    mockR2Service = {
      uploadImage: jest.fn().mockResolvedValue({ url: 'https://r2.storage.com/feedbacks/img.webp' }),
    };

    feedbackService = new FeedbackService(mockPrismaService, mockR2Service);
  });

  describe('1. listing-report-create.spec.ts', () => {
    it('should successfully create a listing report with valid parameters', async () => {
      const mockListing = {
        id: 'list-12345678-uuid',
        title: '2020 BMW 320i M Sport',
        sellerId: 'user-seller-999',
        seller: { id: 'user-seller-999', createdAt: new Date('2024-05-15'), username: 'bmw_seller' },
      };

      mockPrismaService.vehicleListing.findUnique.mockResolvedValue(mockListing);
      mockPrismaService.feedback.create.mockResolvedValue({
        id: 'fb-rpt-001',
        ticketNo: 'RPT-2608-123456',
        source: FeedbackSource.LISTING_REPORT,
        subjectCategory: FeedbackCategory.LISTINGS,
        listingId: mockListing.id,
        listingOwnerId: mockListing.sellerId,
        listingNoSnapshot: 'LIST-123',
        listingTitleSnapshot: mockListing.title,
        listingOwnerReferenceSnapshot: 'TS-2405-USER-S',
        message: 'Bu ilandaki kilometre bilgisi düşürülmüş, orijinal servis kaydı mevcut.',
        status: FeedbackStatus.NEW,
      });

      const res = await feedbackService.createListingReport(
        'user-reporter-111',
        'list-12345678-uuid',
        'Bu ilandaki kilometre bilgisi düşürülmüş, orijinal servis kaydı mevcut.'
      );

      expect(res).toBeDefined();
      expect(mockPrismaService.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-reporter-111',
            source: FeedbackSource.LISTING_REPORT,
            subjectCategory: FeedbackCategory.LISTINGS,
            listingId: 'list-12345678-uuid',
            listingOwnerId: 'user-seller-999',
            listingOwnerReferenceSnapshot: 'TS-2405-USER-S',
          }),
        })
      );
    });
  });

  describe('2. listing-report-server-derived-fields.spec.ts', () => {
    it('should ignore client-passed metadata and strictly derive source, subjectCategory, and snapshots from DB', async () => {
      const mockListing = {
        id: 'list-derived-001',
        title: 'Mercedes C200d AMG',
        sellerId: 'seller-true-id',
        seller: { id: 'seller-true-id', createdAt: new Date('2023-01-10'), username: 'benz_master' },
      };

      mockPrismaService.vehicleListing.findUnique.mockResolvedValue(mockListing);
      mockPrismaService.feedback.create.mockImplementation((args) => args.data);

      const res = await feedbackService.createListingReport(
        'user-reporter-111',
        'list-derived-001',
        'Bu ilanda yanlış beyan verilmiş, hasar kaydı gizlenmiş.'
      );

      expect(res.source).toBe(FeedbackSource.LISTING_REPORT);
      expect(res.subjectCategory).toBe(FeedbackCategory.LISTINGS);
      expect(res.listingOwnerId).toBe('seller-true-id');
      expect(res.listingNoSnapshot).toBe('LIST-DER');
      expect(res.listingTitleSnapshot).toBe('Mercedes C200d AMG');
      expect(res.listingOwnerReferenceSnapshot).toBe('TS-2301-SELLER');
    });
  });

  describe('3. listing-report-own-listing-block.spec.ts', () => {
    it('should block a user from reporting their own listing', async () => {
      const mockListing = {
        id: 'list-own-001',
        title: 'Golf 7.5 R-Line',
        sellerId: 'user-seller-same',
        seller: { id: 'user-seller-same', createdAt: new Date() },
      };

      mockPrismaService.vehicleListing.findUnique.mockResolvedValue(mockListing);

      await expect(
        feedbackService.createListingReport(
          'user-seller-same', // Same as sellerId!
          'list-own-001',
          'Kendi ilanımı deneme şikâyet ediyorum.'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. listing-report-duplicate-concurrency.spec.ts', () => {
    it('should map PostgreSQL partial unique index violation (P2002) to REPORT_ALREADY_OPEN domain error', async () => {
      const mockListing = {
        id: 'list-dup-001',
        title: 'Audi A4 40 TDI',
        sellerId: 'seller-xyz',
        seller: { id: 'seller-xyz', createdAt: new Date() },
      };

      mockPrismaService.vehicleListing.findUnique.mockResolvedValue(mockListing);
      const prismaP2002Error: any = new Error('Unique constraint failed on the constraint: one_open_listing_report_per_user');
      prismaP2002Error.code = 'P2002';
      mockPrismaService.feedback.create.mockRejectedValue(prismaP2002Error);

      await expect(
        feedbackService.createListingReport(
          'user-reporter-dup',
          'list-dup-001',
          'Aynı ilana mükerrer şikâyet isteği.'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. listing-report-snapshot-retention.spec.ts & 6. listing-report-listing-delete-retention.spec.ts', () => {
    it('should retain listingNo, title, and listingOwnerReference snapshots even if listing is deleted', async () => {
      const mockReportData = {
        id: 'fb-deleted-listing',
        listingId: null, // Listing deleted via ON DELETE SET NULL
        listingOwnerId: 'seller-deleted-id',
        listingNoSnapshot: 'LIST-DEL',
        listingTitleSnapshot: 'Silinmiş Porsche 911',
        listingOwnerReferenceSnapshot: 'TS-2208-SELLER',
        message: 'İlan silindi ama şikâyet inceleme altında.',
      };

      mockPrismaService.feedback.findMany.mockResolvedValue([mockReportData]);

      const list = await feedbackService.getAdminFeedbacks(FeedbackSource.LISTING_REPORT);
      expect(list[0].listingTitleSnapshot).toBe('Silinmiş Porsche 911');
      expect(list[0].listingNoSnapshot).toBe('LIST-DEL');
      expect(list[0].listingOwnerReferenceSnapshot).toBe('TS-2208-SELLER');
    });
  });

  describe('7. listing-report-status-transition.spec.ts', () => {
    it('should enforce allowed transition map rules and reject illegal status changes', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue({
        id: 'fb-status-test',
        status: FeedbackStatus.NEW,
        auditTimeline: [],
      });

      // Allowed transition: NEW -> IN_REVIEW
      mockPrismaService.feedback.update.mockResolvedValue({ id: 'fb-status-test', status: FeedbackStatus.IN_REVIEW });
      const updated = await feedbackService.updateFeedbackStatus('fb-status-test', { id: 'admin-1', name: 'Admin Ali' }, { status: FeedbackStatus.IN_REVIEW });
      expect(updated.status).toBe(FeedbackStatus.IN_REVIEW);

      // Illegal transition: NEW -> ARCHIVED directly (not allowed in ALLOWED_TRANSITIONS)
      mockPrismaService.feedback.findUnique.mockResolvedValue({
        id: 'fb-status-test-2',
        status: FeedbackStatus.NEW,
        auditTimeline: [],
      });
      await expect(
        feedbackService.updateFeedbackStatus('fb-status-test-2', { id: 'admin-1', name: 'Admin Ali' }, { status: FeedbackStatus.ARCHIVED })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('8. listing-report-admin-recipient-resolution.spec.ts', () => {
    it('should strictly resolve recipient user from Feedback record for REPORTER or LISTING_OWNER', async () => {
      const mockFeedback = {
        id: 'fb-rec-1',
        userId: 'reporter-user-123',
        listingOwnerId: 'seller-user-999',
        user: { id: 'reporter-user-123', email: 'reporter@test.com' },
        listing: { seller: { id: 'seller-user-999', email: 'seller@test.com' } },
        auditTimeline: [],
      };

      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue({ id: 'conv-100' });
      mockPrismaService.feedback.update.mockResolvedValue({ id: 'fb-rec-1' });

      // Send to REPORTER -> resolves reporter-user-123
      const resReporter = await feedbackService.sendAdminMessageToFeedbackUser(
        'fb-rec-1',
        { id: 'admin-1', email: 'admin@torquescout.com' },
        { recipient: 'REPORTER', channels: ['IN_APP'], subject: 'Test', message: 'Reporter bilgilendirmesi' }
      );
      expect(resReporter.targetUserId).toBe('reporter-user-123');

      // Send to LISTING_OWNER -> resolves seller-user-999
      const resOwner = await feedbackService.sendAdminMessageToFeedbackUser(
        'fb-rec-1',
        { id: 'admin-1', email: 'admin@torquescout.com' },
        { recipient: 'LISTING_OWNER', channels: ['IN_APP'], subject: 'Test', message: 'İlan sahibi uyarısı' }
      );
      expect(resOwner.targetUserId).toBe('seller-user-999');
    });
  });

  describe('9. listing-report-reporter-privacy.spec.ts', () => {
    it('should redact reporter personal details when messaging LISTING_OWNER', async () => {
      const mockFeedback = {
        id: 'fb-priv-1',
        userId: 'reporter-secret-id',
        listingOwnerId: 'seller-target-id',
        user: { id: 'reporter-secret-id', email: 'secret_reporter@gmail.com', firstName: 'Ahmet' },
        listing: { seller: { id: 'seller-target-id', email: 'seller@test.com' } },
        auditTimeline: [],
      };

      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      mockPrismaService.conversation.findFirst.mockResolvedValue({ id: 'conv-privacy' });
      mockPrismaService.feedback.update.mockResolvedValue({ id: 'fb-priv-1' });

      await feedbackService.sendAdminMessageToFeedbackUser(
        'fb-priv-1',
        { id: 'admin-1', email: 'admin@torquescout.com' },
        {
          recipient: 'LISTING_OWNER',
          channels: ['IN_APP'],
          subject: 'İlan Uyarısı',
          message: 'Kullanıcı secret_reporter@gmail.com (Ahmet) ilanı şikâyet etti.',
        }
      );

      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: expect.not.stringContaining('secret_reporter@gmail.com'),
          }),
        })
      );
    });
  });

  describe('10. listing-report-attachment-validation.spec.ts', () => {
    it('should reject files larger than 5MB or invalid MIME types', async () => {
      const mockListing = {
        id: 'list-att-1',
        title: 'Civic 1.5 Turbo',
        sellerId: 'seller-1',
        seller: { id: 'seller-1', createdAt: new Date() },
      };
      mockPrismaService.vehicleListing.findUnique.mockResolvedValue(mockListing);

      const largeFile: any = { size: 6 * 1024 * 1024, mimetype: 'image/png', buffer: Buffer.from('') };
      await expect(
        feedbackService.createListingReport('user-1', 'list-att-1', 'Açıklama metni 10398103', largeFile)
      ).rejects.toThrow(BadRequestException);

      const invalidMimeFile: any = { size: 1000, mimetype: 'application/pdf', buffer: Buffer.from('') };
      await expect(
        feedbackService.createListingReport('user-1', 'list-att-1', 'Açıklama metni 10398103', invalidMimeFile)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
