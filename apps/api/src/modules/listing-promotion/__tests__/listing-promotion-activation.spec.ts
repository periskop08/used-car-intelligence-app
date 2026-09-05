import { ListingPromotionActivationService } from '../listing-promotion-activation.service';
import { ListingPromotionSource, PromotionLifecycleStatus, PromotionPaymentStatus } from '@prisma/client';

describe('ListingPromotionActivationService', () => {
  let activationService: ListingPromotionActivationService;

  beforeEach(() => {
    activationService = new ListingPromotionActivationService({} as any);
  });

  describe('isEntitlementEligibleForActivation', () => {
    it('returns true for TEST source with NOT_REQUIRED payment status', () => {
      const entitlement = {
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
        purchase: {
          source: ListingPromotionSource.TEST,
          paymentStatus: PromotionPaymentStatus.NOT_REQUIRED,
        },
      };
      expect(activationService.isEntitlementEligibleForActivation(entitlement)).toBe(true);
    });

    it('returns true for PAYMENT source with PAID payment status', () => {
      const entitlement = {
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
        purchase: {
          source: ListingPromotionSource.PAYMENT,
          paymentStatus: PromotionPaymentStatus.PAID,
        },
      };
      expect(activationService.isEntitlementEligibleForActivation(entitlement)).toBe(true);
    });

    it('returns false for PAYMENT source with PENDING payment status', () => {
      const entitlement = {
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
        purchase: {
          source: ListingPromotionSource.PAYMENT,
          paymentStatus: PromotionPaymentStatus.PENDING,
        },
      };
      expect(activationService.isEntitlementEligibleForActivation(entitlement)).toBe(false);
    });

    it('returns true for ADMIN_GRANT source with grantedByAdminId', () => {
      const entitlement = {
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
        purchase: {
          source: ListingPromotionSource.ADMIN_GRANT,
          grantedByAdminId: 'admin-123',
        },
      };
      expect(activationService.isEntitlementEligibleForActivation(entitlement)).toBe(true);
    });

    it('returns true for CAMPAIGN source with campaignId', () => {
      const entitlement = {
        lifecycleStatus: PromotionLifecycleStatus.PENDING_ACTIVATION,
        purchase: {
          source: ListingPromotionSource.CAMPAIGN,
          campaignId: 'summer-2026',
        },
      };
      expect(activationService.isEntitlementEligibleForActivation(entitlement)).toBe(true);
    });
  });
});
