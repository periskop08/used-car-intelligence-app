import { ListingPromotionQueryService } from '../listing-promotion-query.service';
import { ListingPromotionType, PromotionLifecycleStatus } from '@prisma/client';

describe('Vehicle Listing Promotion & Visibility Integrity (Canonical Resolver)', () => {
  let queryService: ListingPromotionQueryService;

  beforeEach(() => {
    queryService = new ListingPromotionQueryService({} as any);
  });

  const baseNow = new Date('2026-09-04T12:00:00.000Z');
  const futureDate = new Date('2026-10-04T12:00:00.000Z');
  const pastDate = new Date('2026-09-01T12:00:00.000Z');

  describe('1. The 4 Canonical Commercial Combinations', () => {
    it('NORMAL listing: Vitrin=NO, Acil=NO, Badge=NO', () => {
      const normalListing = {
        id: 'list-normal',
        status: 'ACTIVE',
        expiresAt: futureDate,
        isUrgent: false,
        isShowcaseFeedActive: false,
        promotionEntitlements: [],
        promotions: [],
      };

      const resolved = queryService.resolveEffectivePromotions(normalListing, baseNow);
      expect(resolved.publicationType).toBe('STANDARD');
      expect(resolved.urgent.active).toBe(false);
      expect(resolved.showcase.active).toBe(false);
      expect(resolved.urgent.status).toBe('NONE');
      expect(resolved.showcase.status).toBe('NONE');
    });

    it('ACİL listing: Vitrin=NO, Acil=YES, Badge=YES', () => {
      const urgentListing = {
        id: 'list-urgent',
        status: 'ACTIVE',
        expiresAt: futureDate,
        isUrgent: true,
        urgentExpiresAt: futureDate,
        isShowcaseFeedActive: false,
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: baseNow,
            expiresAt: futureDate,
          },
        ],
        promotions: [{ paymentStatus: 'PAID', source: 'PAYMENT' }],
      };

      const resolved = queryService.resolveEffectivePromotions(urgentListing, baseNow);
      expect(resolved.publicationType).toBe('URGENT');
      expect(resolved.urgent.active).toBe(true);
      expect(resolved.showcase.active).toBe(false);
      expect(resolved.urgent.status).toBe('ACTIVE');
      expect(resolved.paymentStatus).toBe('PAID');
    });

    it('VİTRİN listing: Vitrin=YES, Acil=NO, Badge=NO', () => {
      const showcaseListing = {
        id: 'list-showcase',
        status: 'ACTIVE',
        expiresAt: futureDate,
        isUrgent: false,
        isShowcaseFeedActive: true,
        showcaseFeedExpiresAt: futureDate,
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.SHOWCASE_FEED,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: baseNow,
            expiresAt: futureDate,
          },
        ],
        promotions: [{ paymentStatus: 'PAID', source: 'PAYMENT' }],
      };

      const resolved = queryService.resolveEffectivePromotions(showcaseListing, baseNow);
      expect(resolved.publicationType).toBe('SHOWCASE');
      expect(resolved.urgent.active).toBe(false);
      expect(resolved.showcase.active).toBe(true);
      expect(resolved.showcase.status).toBe('ACTIVE');
      expect(resolved.paymentStatus).toBe('PAID');
    });

    it('VİTRİN + ACİL listing: Vitrin=YES, Acil=YES, Badge=YES (both preserved)', () => {
      const bundleListing = {
        id: 'list-bundle',
        status: 'ACTIVE',
        expiresAt: futureDate,
        isUrgent: true,
        urgentExpiresAt: futureDate,
        isShowcaseFeedActive: true,
        showcaseFeedExpiresAt: futureDate,
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: baseNow,
            expiresAt: futureDate,
          },
          {
            promotionType: ListingPromotionType.SHOWCASE_FEED,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            activatedAt: baseNow,
            expiresAt: futureDate,
          },
        ],
        promotions: [{ paymentStatus: 'PAID', source: 'PAYMENT', productSku: 'URGENT_SHOWCASE_BUNDLE' }],
      };

      const resolved = queryService.resolveEffectivePromotions(bundleListing, baseNow);
      expect(resolved.publicationType).toBe('SHOWCASE_URGENT');
      expect(resolved.urgent.active).toBe(true);
      expect(resolved.showcase.active).toBe(true);
      expect(resolved.urgent.status).toBe('ACTIVE');
      expect(resolved.showcase.status).toBe('ACTIVE');
      expect(resolved.paymentStatus).toBe('PAID');
    });
  });

  describe('2. Invariant: Raw Checkbox Never Confers Authority (Anti-Free-Promotion Guard)', () => {
    it('should NOT activate urgent promotion if isUrgent=true checkbox is set without an active entitlement', () => {
      const unentitledUrgentListing = {
        id: 'list-unentitled',
        status: 'ACTIVE',
        expiresAt: futureDate,
        isUrgent: true,
        urgentExpiresAt: null,
        isShowcaseFeedActive: false,
        promotionEntitlements: [],
        promotions: [],
      };

      const resolved = queryService.resolveEffectivePromotions(unentitledUrgentListing, baseNow);
      expect(resolved.urgent.active).toBe(false);
      expect(resolved.urgent.entitlementVerified).toBe(false);
    });
  });

  describe('3. Invariant: PENDING_REVIEW Listings Never Leak to Public Active State', () => {
    it('should show PENDING_APPROVAL for admin but NOT active for public', () => {
      const pendingUrgentListing = {
        id: 'list-pending',
        status: 'PENDING_REVIEW',
        expiresAt: null,
        isUrgent: true,
        isShowcaseFeedActive: false,
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
            purchase: { paymentStatus: 'PAID' },
          },
        ],
        promotions: [{ paymentStatus: 'PAID' }],
      };

      const resolved = queryService.resolveEffectivePromotions(pendingUrgentListing, baseNow);
      // Admin sees requested & verified
      expect(resolved.urgent.requested).toBe(true);
      expect(resolved.urgent.status).toBe('PENDING_APPROVAL');
      expect(resolved.paymentStatus).toBe('PAID');
      expect(resolved.startsAt).toBeNull();

      // Public active state is strictly FALSE
      expect(resolved.urgent.active).toBe(false);
      expect(resolved.showcase.active).toBe(false);
    });
  });

  describe('4. Invariant: Expiry Separation (Listing Expiry vs Promotion Expiry)', () => {
    it('when promotion expires but listing is active, listing remains active and badge is removed', () => {
      const expiredPromoListing = {
        id: 'list-expired-promo',
        status: 'ACTIVE',
        expiresAt: futureDate, // listing active until next month
        isUrgent: true,
        urgentExpiresAt: pastDate, // promotion expired 3 days ago
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.EXPIRED,
            expiresAt: pastDate,
          },
        ],
        promotions: [{ paymentStatus: 'PAID' }],
      };

      const resolved = queryService.resolveEffectivePromotions(expiredPromoListing, baseNow);
      expect(resolved.urgent.active).toBe(false);
      expect(resolved.urgent.status).toBe('EXPIRED');
    });

    it('when listing expires, all promotional features immediately cease public activity', () => {
      const expiredListing = {
        id: 'list-expired-base',
        status: 'EXPIRED',
        expiresAt: pastDate, // listing expired in the past
        isUrgent: true,
        urgentExpiresAt: futureDate, // promotion would otherwise have been future
        promotionEntitlements: [
          {
            promotionType: ListingPromotionType.URGENT_LISTING,
            lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
            expiresAt: futureDate,
          },
        ],
        promotions: [{ paymentStatus: 'PAID' }],
      };

      const resolved = queryService.resolveEffectivePromotions(expiredListing, baseNow);
      expect(resolved.urgent.active).toBe(false);
      expect(resolved.showcase.active).toBe(false);
    });
  });
});
