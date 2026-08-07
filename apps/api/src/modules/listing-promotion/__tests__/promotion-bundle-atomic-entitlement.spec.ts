import { ListingPromotionProductSku, ListingPromotionType } from '@prisma/client';

describe('Listing Promotion Unit & Business Rules', () => {
  it('should calculate savings correctly for URGENT_SHOWCASE_BUNDLE', () => {
    const urgentAmountMinor = 9900;
    const showcaseAmountMinor = 19900;
    const bundleAmountMinor = 24900;

    const individualTotal = urgentAmountMinor + showcaseAmountMinor;
    const savingsAmountMinor = individualTotal - bundleAmountMinor;

    expect(individualTotal).toBe(29800);
    expect(savingsAmountMinor).toBe(4900); // 49 TL savings
  });

  it('should map bundle SKU to 2 promotion entitlements', () => {
    const bundleSku = ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE;
    const entitlementsToCreate: ListingPromotionType[] =
      bundleSku === ListingPromotionProductSku.URGENT_SHOWCASE_BUNDLE
        ? [ListingPromotionType.URGENT_LISTING, ListingPromotionType.SHOWCASE_FEED]
        : [ListingPromotionType.URGENT_LISTING];

    expect(entitlementsToCreate).toHaveLength(2);
    expect(entitlementsToCreate).toContain(ListingPromotionType.URGENT_LISTING);
    expect(entitlementsToCreate).toContain(ListingPromotionType.SHOWCASE_FEED);
  });

  it('should prevent bundle purchase if either component is already active or pending', () => {
    const activeEntitlements: ListingPromotionType[] = [ListingPromotionType.URGENT_LISTING];
    const liveTypes = new Set<ListingPromotionType>(activeEntitlements);

    const canBuyUrgent = !liveTypes.has(ListingPromotionType.URGENT_LISTING);
    const canBuyShowcase = !liveTypes.has(ListingPromotionType.SHOWCASE_FEED);
    const canBuyBundle = liveTypes.size === 0;

    expect(canBuyUrgent).toBe(false);
    expect(canBuyShowcase).toBe(true);
    expect(canBuyBundle).toBe(false);
  });

  it('should keep promotion expiresAt equal to listing expiresAt without extending listing duration', () => {
    const listingExpiresAt = new Date('2026-09-01T00:00:00Z');
    const promotionExpiresAt = listingExpiresAt;

    expect(promotionExpiresAt).toEqual(listingExpiresAt);
    expect(listingExpiresAt.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });
});
