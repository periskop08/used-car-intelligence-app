import { FinanceReportsService } from './finance-reports.service';

describe('FinanceReportsService - Real Payment & Admin Role Verification', () => {
  let service: FinanceReportsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        findMany: jest.fn(),
      },
      adminAuditLog: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      buyerPackagePurchase: {
        findMany: jest.fn(),
      },
      listingPromotionPurchase: {
        findMany: jest.fn(),
      },
      analyticsEvent: {
        count: jest.fn(),
      },
    };

    service = new FinanceReportsService(mockPrisma as any);
  });

  it('should return 0 MRR/ARR/PaidSubs when active subscriptions belong to ADMIN or SUPER_ADMIN users', async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub-admin-1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 864000000),
        createdAt: new Date(),
        plan: { id: 'plan-pro', name: 'Premium Paket', priceTrl: 899, tier: 'PREMIUM' },
        user: {
          id: 'admin-user-1',
          email: 'admin@torquescout.com',
          firstName: 'Mehmet efe',
          lastName: 'Güven',
          role: 'ADMIN',
          subscriptionTier: 'PREMIUM',
          createdAt: new Date(),
        },
      },
      {
        id: 'sub-admin-2',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 864000000),
        createdAt: new Date(),
        plan: { id: 'plan-pro', name: 'Premium Paket', priceTrl: 899, tier: 'PREMIUM' },
        user: {
          id: 'admin-user-2',
          email: 'burhan@torquescout.com',
          firstName: 'Burhan',
          lastName: 'Seçkin',
          role: 'SUPER_ADMIN',
          subscriptionTier: 'PREMIUM',
          createdAt: new Date(),
        },
      },
    ]);

    mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(5);

    const result = await service.getActiveSubscriptionFinanceMetrics();

    expect(result.mrr).toBe(0);
    expect(result.arr).toBe(0);
    expect(result.activePaidSubscriptionsCount).toBe(0);
    expect(result.subscriberItems.length).toBe(0);
  });

  it('should categorize admin users into adminGrantedSubscribers with 0 TL MRR contribution in getSubscriptionsDashboard', async () => {
    mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([]) // adminRoleUsers for adminGrantUserIds set
      .mockResolvedValueOnce([]) // paidUsers search
      .mockResolvedValueOnce([ // grantedUsers (admin accounts)
        {
          id: 'u-admin-1',
          firstName: 'Mehmet efe',
          lastName: 'Güven',
          email: 'admin@torquescout.com',
          role: 'ADMIN',
          createdAt: new Date(),
          subscriptionTier: 'PREMIUM',
        },
      ]);

    const result = await service.getSubscriptionsDashboard();

    expect(result.kpis.activePaidSubscriptionsCount).toBe(0);
    expect(result.kpis.subscriptionMrrContribution).toBe(0);
    expect(result.paidSubscribers.length).toBe(0);
    expect(result.adminGrantedSubscribers.length).toBe(1);
    expect(result.adminGrantedSubscribers[0].userEmail).toBe('admin@torquescout.com');
    expect(result.adminGrantedSubscribers[0].packageName).toContain('Sistem Yöneticisi - ₺0');
  });
});
