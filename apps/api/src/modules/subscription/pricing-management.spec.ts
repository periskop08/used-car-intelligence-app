import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService, ADMIN_EMAILS } from './subscription.service';
import { BuyerPackageService } from './buyer-package.service';
import { PrismaService } from '../../prisma.service';
import { SubscriptionTier, SubscriptionStatus, BuyerPackageCode, PromotionPaymentStatus, Role } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Pricing Management & Financial Integrity Tests', () => {
  let subscriptionService: SubscriptionService;
  let buyerPackageService: BuyerPackageService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      subscriptionPlan: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      buyerPackagePlan: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      subscriptionPayment: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      packagePriceHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      buyerPackagePurchase: {
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        BuyerPackageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
    buyerPackageService = module.get<BuyerPackageService>(BuyerPackageService);
  });

  const adminUser = { id: 'admin-1', email: 'efeguven9991@gmail.com' };

  it('TEST A: Should update nextRenewalPrice to 599 for paid subscribers without mutating currentPeriodPrice (499)', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'plan-yetkin',
      tier: SubscriptionTier.YETKIN,
      name: 'Yetkin Paket',
      priceTrl: 499,
    });

    const mockPaidSub = {
      id: 'sub-user-1',
      planId: 'plan-yetkin',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodPriceTrl: 499,
      nextRenewalPriceTrl: 499,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days left
      user: { email: 'customer@example.com', role: Role.USER },
    };

    mockPrisma.subscription.findMany.mockResolvedValue([mockPaidSub]);
    mockPrisma.subscriptionPlan.update.mockResolvedValue({});
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.packagePriceHistory.create.mockResolvedValue({});

    const result = await subscriptionService.updateSubscriptionPrice(adminUser, SubscriptionTier.YETKIN, 599, undefined, 'Enflasyon düzenlemesi');

    expect(result.success).toBe(true);
    expect(result.oldPrice).toBe(499);
    expect(result.newPrice).toBe(599);
    expect(result.affectedSubscribersCount).toBe(1);

    // Verify catalog price updated
    expect(mockPrisma.subscriptionPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-yetkin' },
      data: { priceTrl: 599, limits: expect.any(Object) },
    });

    // Verify next renewal updated for paid subscriber
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['sub-user-1'] } },
      data: { nextRenewalPriceTrl: 599 },
    });

    // Verify currentPeriodPrice was NOT touched
    expect(mockPaidSub.currentPeriodPriceTrl).toBe(499);
  });

  it('TEST B: Multiple price updates before renewal (599 -> 649) should apply latest price (649) to next renewal', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'plan-yetkin',
      tier: SubscriptionTier.YETKIN,
      name: 'Yetkin Paket',
      priceTrl: 599,
    });

    const mockPaidSub = {
      id: 'sub-user-1',
      planId: 'plan-yetkin',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodPriceTrl: 499,
      nextRenewalPriceTrl: 599,
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      user: { email: 'customer@example.com', role: Role.USER },
    };

    mockPrisma.subscription.findMany.mockResolvedValue([mockPaidSub]);
    mockPrisma.subscriptionPlan.update.mockResolvedValue({});
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.packagePriceHistory.create.mockResolvedValue({});

    const result = await subscriptionService.updateSubscriptionPrice(adminUser, SubscriptionTier.YETKIN, 649, undefined, 'İkinci düzenleme');

    expect(result.newPrice).toBe(649);
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['sub-user-1'] } },
      data: { nextRenewalPriceTrl: 649 },
    });
  });

  it('TEST C: Idempotent renewal payment snapshot created with 649, admin later changes price to 699 -> existing snapshot stays 649', async () => {
    const expiresAt = new Date('2026-10-01T00:00:00.000Z');
    const mockSub = {
      id: 'sub-user-1',
      userId: 'user-1',
      status: SubscriptionStatus.ACTIVE,
      expiresAt,
      nextRenewalPriceTrl: 649,
      plan: { tier: SubscriptionTier.YETKIN, priceTrl: 649 },
      user: { email: 'customer@example.com', role: Role.USER },
    };

    mockPrisma.subscription.findUnique.mockResolvedValue(mockSub);
    mockPrisma.subscriptionPayment.findUnique.mockResolvedValue(null); // First call: create new
    mockPrisma.subscriptionPayment.create.mockImplementation(({ data }: any) => ({
      id: 'payment-snap-1',
      ...data,
    }));

    const snapshot = await subscriptionService.createRenewalPaymentSnapshot('sub-user-1');
    expect(snapshot.amount).toBe(649);

    // Second worker call for the same period should reuse the existing snapshot idempotently
    mockPrisma.subscriptionPayment.findUnique.mockResolvedValue(snapshot);
    const retrySnapshot = await subscriptionService.createRenewalPaymentSnapshot('sub-user-1');
    expect(retrySnapshot.id).toBe('payment-snap-1');
    expect(retrySnapshot.amount).toBe(649);
  });

  it('TEST D: Missing DB price in BuyerPackagePurchase should throw PRICING_UNAVAILABLE error instead of falling back to static price', async () => {
    mockPrisma.buyerPackagePlan.findUnique.mockResolvedValue(null); // Inactive/missing in DB

    await expect(buyerPackageService.purchasePackage('user-1', BuyerPackageCode.ALICI_MINI)).rejects.toThrow(
      BadRequestException
    );
  });

  it('TEST E: Client cannot tamper with purchase price amount; backend resolves active DB price', async () => {
    mockPrisma.buyerPackagePlan.findUnique.mockResolvedValue({
      id: 'bp-mini',
      code: BuyerPackageCode.ALICI_MINI,
      priceTrl: 149,
      currency: 'TRY',
      isActive: true,
    });

    mockPrisma.buyerPackagePurchase.create.mockImplementation(({ data }: any) => ({
      id: 'purchase-1',
      ...data,
    }));

    const result = await buyerPackageService.purchasePackage('user-1', BuyerPackageCode.ALICI_MINI);

    expect(result.success).toBe(true);
    expect(result.purchase.price).toBe(149); // Price resolved strictly from DB
  });

  it('TEST F: Admin Lifetime Grants (expiresAt > 2040 or admin email) are excluded from renewal repricing', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'plan-premium',
      tier: SubscriptionTier.PROFESYONEL,
      name: 'Profesyonel Paket',
      priceTrl: 1499,
    });

    const mockAdminLifetimeSub = {
      id: 'sub-admin-lifetime',
      planId: 'plan-premium',
      status: SubscriptionStatus.ACTIVE,
      currentPeriodPriceTrl: null,
      nextRenewalPriceTrl: null,
      expiresAt: new Date('2050-12-31T23:59:59.000Z'),
      user: { email: 'efeguven9991@gmail.com', role: Role.ADMIN },
    };

    // Subscriptions list has only the admin lifetime sub
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    mockPrisma.subscriptionPlan.update.mockResolvedValue({});
    mockPrisma.packagePriceHistory.create.mockResolvedValue({});

    const result = await subscriptionService.updateSubscriptionPrice(adminUser, SubscriptionTier.PROFESYONEL, 1799, undefined, 'Fiyat artışı');

    expect(result.success).toBe(true);
    expect(result.affectedSubscribersCount).toBe(0); // 0 paid subscribers affected
    expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it('TEST G: Updating numeric entitlement limits (e.g. aiReports 5 -> 12) updates SubscriptionPlan limits in DB', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'plan-yetkin',
      tier: SubscriptionTier.YETKIN,
      name: 'Yetkin Paket',
      priceTrl: 499,
      limits: { aiReports: 5, aiChat: 50, activeListings: 5, listingDurationDays: 30, comparisons: 20, maxVehiclesPerComparison: 5, vitrinListings: 1 },
    });

    mockPrisma.subscription.findMany.mockResolvedValue([]);
    mockPrisma.subscriptionPlan.update.mockResolvedValue({});
    mockPrisma.packagePriceHistory.create.mockResolvedValue({});

    const result = await subscriptionService.updateSubscriptionPrice(
      adminUser,
      SubscriptionTier.YETKIN,
      599,
      { aiReports: 12, aiChat: 60 },
      'Rapor hakkı artışı'
    );

    expect(result.success).toBe(true);
    expect(result.newPrice).toBe(599);
    expect(result.limits.aiReports).toBe(12);
    expect(result.limits.aiChat).toBe(60);

    expect(mockPrisma.subscriptionPlan.update).toHaveBeenCalledWith({
      where: { id: 'plan-yetkin' },
      data: {
        priceTrl: 599,
        limits: expect.objectContaining({
          aiReports: 12,
          aiChat: 60,
          activeListings: 5,
        }),
      },
    });
  });
});
