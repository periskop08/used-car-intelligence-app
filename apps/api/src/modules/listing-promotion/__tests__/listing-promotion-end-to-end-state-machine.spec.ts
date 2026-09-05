import { ListingPromotionQueryService } from '../listing-promotion-query.service';
import { ListingPromotionType, PromotionLifecycleStatus, PromotionPaymentStatus, ListingStatus } from '@prisma/client';

describe('Listing Promotion End-to-End State Machine Integrity', () => {
  let queryService: ListingPromotionQueryService;

  beforeEach(() => {
    queryService = new ListingPromotionQueryService({} as any);
  });

  const now = new Date('2026-09-05T12:00:00.000Z');
  const future = new Date('2026-10-05T12:00:00.000Z');

  describe('1. Commercial Authority Gate (hasValidPromotionAuthority)', () => {
    it('returns TRUE for verified PAID purchase', () => {
      const listing = {
        id: 'l-1',
        urgentRequested: true,
        promotions: [{ paymentStatus: 'PAID', source: 'PAYMENT' }],
        promotionEntitlements: [],
      };
      expect(queryService.hasValidPromotionAuthority(listing)).toBe(true);
    });

    it('returns TRUE for ADMIN_GRANT entitlement', () => {
      const listing = {
        id: 'l-2',
        urgentRequested: true,
        promotions: [],
        promotionEntitlements: [
          {
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            purchase: { source: 'ADMIN_GRANT' },
          },
        ],
      };
      expect(queryService.hasValidPromotionAuthority(listing)).toBe(true);
    });

    it('returns TRUE for CAMPAIGN entitlement', () => {
      const listing = {
        id: 'l-3',
        showcaseRequested: true,
        promotions: [{ source: 'CAMPAIGN' }],
        promotionEntitlements: [],
      };
      expect(queryService.hasValidPromotionAuthority(listing)).toBe(true);
    });

    it('returns FALSE for unpaid PENDING purchase attempt', () => {
      const listing = {
        id: 'l-4',
        urgentRequested: true,
        promotions: [{ paymentStatus: 'PENDING', source: 'PAYMENT' }],
        promotionEntitlements: [],
      };
      expect(queryService.hasValidPromotionAuthority(listing)).toBe(false);
    });

    it('returns FALSE for FAILED / CANCELLED purchase attempt', () => {
      const listing = {
        id: 'l-5',
        urgentRequested: true,
        promotions: [{ paymentStatus: 'FAILED', source: 'PAYMENT' }],
        promotionEntitlements: [],
      };
      expect(queryService.hasValidPromotionAuthority(listing)).toBe(false);
    });
  });

  describe('2. Request Persistence vs Entitlement Invariant', () => {
    it('preserves seller request even if payment failed (requested=true, entitled=false, active=false)', () => {
      const listing = {
        id: 'l-6',
        status: 'DRAFT',
        urgentRequested: true,
        showcaseRequested: false,
        promotions: [{ paymentStatus: 'FAILED' }],
        promotionEntitlements: [],
      };

      const resolved = queryService.resolveEffectivePromotions(listing, now);
      expect(resolved.urgent.requested).toBe(true);
      expect(resolved.urgent.entitled).toBe(false);
      expect(resolved.urgent.active).toBe(false);
      expect(resolved.showcase.requested).toBe(false);
      expect(resolved.showcase.active).toBe(false);
      expect(resolved.publicationType).toBe('STANDARD');
    });
  });

  describe('3. Multi-Capability Propagation for HIZLI SATIS (Bundle)', () => {
    it('synchronously activates Urgent, Showcase, and Feed across surfaces upon approval', () => {
      const listing = {
        id: 'l-bundle',
        status: 'ACTIVE',
        expiresAt: future,
        urgentRequested: true,
        showcaseRequested: true,
        promotions: [
          {
            productSku: 'URGENT_SHOWCASE_BUNDLE',
            paymentStatus: 'PAID',
            source: 'PAYMENT',
          },
        ],
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: now,
            expiresAt: future,
          },
          {
            promotionType: ListingPromotionType.SHOWCASE_FEED,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: now,
            expiresAt: future,
          },
        ],
      };

      const resolved = queryService.resolveEffectivePromotions(listing, now);
      expect(resolved.publicationType).toBe('SHOWCASE_URGENT');
      expect(resolved.effectivePromotionType).toBe('SHOWCASE_URGENT');
      expect(resolved.urgent.active).toBe(true);
      expect(resolved.showcase.active).toBe(true);
      expect(resolved.feedActive).toBe(true);
    });
  });

  describe('4. Controlled Test Mode Authority & Fail-Closed Invariants', () => {
    afterEach(() => {
      delete process.env.LISTING_PROMOTION_COMMERCE_MODE;
    });

    it('recognizes TEST authority when commerce mode is TEST (default)', () => {
      process.env.LISTING_PROMOTION_COMMERCE_MODE = 'TEST';
      const listing = {
        id: 'l-test',
        urgentRequested: true,
        promotions: [{ source: 'TEST', paymentStatus: 'NOT_REQUIRED' }],
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            purchase: { source: 'TEST' },
          },
        ],
      };

      expect(queryService.hasValidPromotionAuthority(listing)).toBe(true);

      const resolved = queryService.resolveEffectivePromotions(listing, now);
      expect(resolved.commercialAuthority).toBe('TEST');
      expect(resolved.paymentDisplay).toBe('Test nedeniyle atlandı');
      expect(resolved.paymentStatus).toBe('NONE'); // Never falsely marked as PAID
    });

    it('fails closed and rejects TEST authority when commerce mode is LIVE', () => {
      process.env.LISTING_PROMOTION_COMMERCE_MODE = 'LIVE';
      const listing = {
        id: 'l-test-live',
        urgentRequested: true,
        promotions: [{ source: 'TEST', paymentStatus: 'NOT_REQUIRED' }],
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            purchase: { source: 'TEST' },
          },
        ],
      };

      expect(queryService.hasValidPromotionAuthority(listing)).toBe(false);

      const resolved = queryService.resolveEffectivePromotions(listing, now);
      expect(resolved.commercialAuthority).toBe('NONE');
    });

    it('preserves REQUESTED != ENTITLED != ACTIVE in TEST mode before and after approval', () => {
      process.env.LISTING_PROMOTION_COMMERCE_MODE = 'TEST';

      // Before Approval (PENDING_REVIEW)
      const unapprovedListing = {
        id: 'l-before-approval',
        status: 'PENDING_REVIEW',
        urgentRequested: true,
        showcaseRequested: false,
        promotions: [{ source: 'TEST', paymentStatus: 'NOT_REQUIRED' }],
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            purchase: { source: 'TEST' },
          },
        ],
      };

      const resolvedBefore = queryService.resolveEffectivePromotions(unapprovedListing, now);
      expect(resolvedBefore.urgent.requested).toBe(true);
      expect(resolvedBefore.urgent.entitled).toBe(true);
      expect(resolvedBefore.urgent.active).toBe(false);

      // After Approval (ACTIVE)
      const approvedListing = {
        id: 'l-after-approval',
        status: 'ACTIVE',
        expiresAt: future,
        urgentRequested: true,
        showcaseRequested: false,
        promotions: [{ source: 'TEST', paymentStatus: 'NOT_REQUIRED' }],
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: now,
            expiresAt: future,
            purchase: { source: 'TEST' },
          },
        ],
      };

      const resolvedAfter = queryService.resolveEffectivePromotions(approvedListing, now);
      expect(resolvedAfter.urgent.requested).toBe(true);
      expect(resolvedAfter.urgent.entitled).toBe(true);
      expect(resolvedAfter.urgent.active).toBe(true);
    });
  });
});
