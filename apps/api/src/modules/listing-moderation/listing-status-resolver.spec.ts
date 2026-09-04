import { ListingStatus } from '@prisma/client';

export interface EffectiveListingStatusResult {
  effectiveStatus: string;
  label: string;
  badgeClass: string;
  isExpired: boolean;
  isPending: boolean;
  isActive: boolean;
  isDeleted: boolean;
}

export function resolveEffectiveListingStatus(listing: {
  status?: string | null;
  expiresAt?: Date | string | null;
  publishedAt?: Date | string | null;
  deletedAt?: Date | string | null;
}): EffectiveListingStatusResult {
  const now = new Date();
  const rawStatus = (listing?.status || 'UNKNOWN').toUpperCase();

  // Explicit deletion has highest precedence
  if (rawStatus === 'DELETED' || listing.deletedAt) {
    return {
      effectiveStatus: 'DELETED',
      label: 'Silindi',
      badgeClass: 'bg-slate-800/90 text-slate-400 border border-slate-700',
      isExpired: false,
      isPending: false,
      isActive: false,
      isDeleted: true,
    };
  }

  // Explicit rejection
  if (rawStatus === 'REJECTED') {
    return {
      effectiveStatus: 'REJECTED',
      label: 'Reddedildi',
      badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      isExpired: false,
      isPending: false,
      isActive: false,
      isDeleted: false,
    };
  }

  // Moderation pending states - MUST NEVER BE ACTIVE
  if (rawStatus === 'PENDING_REVIEW' || rawStatus === 'PENDING') {
    return {
      effectiveStatus: 'PENDING_REVIEW',
      label: 'Onay Bekliyor',
      badgeClass: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      isExpired: false,
      isPending: true,
      isActive: false,
      isDeleted: false,
    };
  }

  if (rawStatus === 'REVISION_REQUIRED') {
    return {
      effectiveStatus: 'REVISION_REQUIRED',
      label: 'Düzeltme Bekliyor',
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      isExpired: false,
      isPending: true,
      isActive: false,
      isDeleted: false,
    };
  }

  if (rawStatus === 'DETAILED_REVIEW') {
    return {
      effectiveStatus: 'DETAILED_REVIEW',
      label: 'Detaylı İncelemede',
      badgeClass: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      isExpired: false,
      isPending: true,
      isActive: false,
      isDeleted: false,
    };
  }

  // Expiration check: expiresAt <= now
  const hasExpired = listing?.expiresAt ? new Date(listing.expiresAt) <= now : false;

  if (rawStatus === 'ACTIVE') {
    if (hasExpired) {
      return {
        effectiveStatus: 'EXPIRED',
        label: 'Süresi Doldu',
        badgeClass: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
        isExpired: true,
        isPending: false,
        isActive: false,
        isDeleted: false,
      };
    }
    return {
      effectiveStatus: 'ACTIVE',
      label: 'Aktif',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      isExpired: false,
      isPending: false,
      isActive: true,
      isDeleted: false,
    };
  }

  if (rawStatus === 'EXPIRED') {
    return {
      effectiveStatus: 'EXPIRED',
      label: 'Süresi Doldu',
      badgeClass: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      isExpired: true,
      isPending: false,
      isActive: false,
      isDeleted: false,
    };
  }

  if (rawStatus === 'PASSIVE') {
    if (hasExpired) {
      return {
        effectiveStatus: 'EXPIRED',
        label: 'Süresi Doldu (Pasif)',
        badgeClass: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
        isExpired: true,
        isPending: false,
        isActive: false,
        isDeleted: false,
      };
    }
    return {
      effectiveStatus: 'PASSIVE',
      label: 'Pasif',
      badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
      isExpired: false,
      isPending: false,
      isActive: false,
      isDeleted: false,
    };
  }

  return {
    effectiveStatus: rawStatus,
    label: rawStatus,
    badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
    isExpired: false,
    isPending: false,
    isActive: false,
    isDeleted: false,
  };
}

export function matchesSellerListingFilter(listing: any, filterKey: string): boolean {
  const { effectiveStatus } = resolveEffectiveListingStatus(listing);

  if (filterKey === 'ALL') return true;
  if (filterKey === 'ACTIVE') return effectiveStatus === 'ACTIVE';
  if (filterKey === 'PENDING') {
    return ['PENDING_REVIEW', 'REVISION_REQUIRED', 'DETAILED_REVIEW'].includes(effectiveStatus);
  }
  if (filterKey === 'PASSIVE') {
    return ['PASSIVE', 'EXPIRED'].includes(effectiveStatus);
  }
  if (filterKey === 'REJECTED') return effectiveStatus === 'REJECTED';

  return true;
}

describe('Listing Moderation Status & Integrity Test Suite', () => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  describe('39. STATUS MATRIX', () => {
    it('should map PENDING_REVIEW to Onay Bekliyor and isPending: true', () => {
      const res = resolveEffectiveListingStatus({ status: 'PENDING_REVIEW' });
      expect(res.effectiveStatus).toBe('PENDING_REVIEW');
      expect(res.label).toBe('Onay Bekliyor');
      expect(res.isPending).toBe(true);
      expect(res.isActive).toBe(false);
    });

    it('should map ACTIVE with future expiresAt to Aktif', () => {
      const res = resolveEffectiveListingStatus({ status: 'ACTIVE', expiresAt: futureDate });
      expect(res.effectiveStatus).toBe('ACTIVE');
      expect(res.label).toBe('Aktif');
      expect(res.isActive).toBe(true);
      expect(res.isPending).toBe(false);
      expect(res.isExpired).toBe(false);
    });

    it('should map EXPIRED or passed date to Süresi Doldu', () => {
      const res = resolveEffectiveListingStatus({ status: 'EXPIRED' });
      expect(res.effectiveStatus).toBe('EXPIRED');
      expect(res.label).toBe('Süresi Doldu');
      expect(res.isExpired).toBe(true);
      expect(res.isActive).toBe(false);
    });

    it('should map PASSIVE to Pasif', () => {
      const res = resolveEffectiveListingStatus({ status: 'PASSIVE', expiresAt: futureDate });
      expect(res.effectiveStatus).toBe('PASSIVE');
      expect(res.label).toBe('Pasif');
      expect(res.isActive).toBe(false);
    });

    it('should map REJECTED to Reddedildi', () => {
      const res = resolveEffectiveListingStatus({ status: 'REJECTED' });
      expect(res.effectiveStatus).toBe('REJECTED');
      expect(res.label).toBe('Reddedildi');
      expect(res.isActive).toBe(false);
    });

    it('should map DELETED to Silindi', () => {
      const res = resolveEffectiveListingStatus({ status: 'DELETED' });
      expect(res.effectiveStatus).toBe('DELETED');
      expect(res.label).toBe('Silindi');
      expect(res.isDeleted).toBe(true);
      expect(res.isActive).toBe(false);
    });
  });

  describe('40. HARD INVARIANT: PENDING_REVIEW MUST NEVER BE ACTIVE', () => {
    it('a listing awaiting approval must have pendingReviewCountedAsActive = 0', () => {
      const pendingListing = { status: 'PENDING_REVIEW', expiresAt: futureDate };
      const res = resolveEffectiveListingStatus(pendingListing);

      const pendingReviewCountedAsActive = res.isActive ? 1 : 0;
      expect(pendingReviewCountedAsActive).toBe(0);
      expect(res.isPending).toBe(true);

      // Seller filters
      expect(matchesSellerListingFilter(pendingListing, 'ALL')).toBe(true);
      expect(matchesSellerListingFilter(pendingListing, 'PENDING')).toBe(true);
      expect(matchesSellerListingFilter(pendingListing, 'ACTIVE')).toBe(false);
    });
  });

  describe('41. ACTIVE LISTING VALIDATION', () => {
    it('approved listing with future expiry is ACTIVE and not pending/expired', () => {
      const activeListing = { status: 'ACTIVE', expiresAt: futureDate };
      const res = resolveEffectiveListingStatus(activeListing);

      expect(res.effectiveStatus).toBe('ACTIVE');
      expect(res.label).toBe('Aktif');
      expect(res.isActive).toBe(true);
      expect(res.isPending).toBe(false);
      expect(res.isExpired).toBe(false);

      expect(matchesSellerListingFilter(activeListing, 'ACTIVE')).toBe(true);
      expect(matchesSellerListingFilter(activeListing, 'PENDING')).toBe(false);
      expect(matchesSellerListingFilter(activeListing, 'PASSIVE')).toBe(false);
    });
  });

  describe('42. EXPIRED LISTING (EXPIRED != ACTIVE)', () => {
    it('listing with expiresAt <= now is NOT ACTIVE and maps to EXPIRED / Süresi Doldu', () => {
      const expiredListing = { status: 'ACTIVE', expiresAt: pastDate };
      const res = resolveEffectiveListingStatus(expiredListing);

      expect(res.isActive).toBe(false);
      expect(res.isExpired).toBe(true);
      expect(res.effectiveStatus).toBe('EXPIRED');
      expect(res.label).toBe('Süresi Doldu');

      expect(matchesSellerListingFilter(expiredListing, 'ACTIVE')).toBe(false);
      expect(matchesSellerListingFilter(expiredListing, 'PASSIVE')).toBe(true);
    });
  });

  describe('43. EXPLICIT DELETE IS NOT CONVERTED TO EXPIRED', () => {
    it('explicit deletion evidence preserves DELETED / Silindi even if dates are old', () => {
      const deletedListing = { status: 'DELETED', expiresAt: pastDate, deletedAt: pastDate };
      const res = resolveEffectiveListingStatus(deletedListing);

      expect(res.effectiveStatus).toBe('DELETED');
      expect(res.label).toBe('Silindi');
      expect(res.isDeleted).toBe(true);
      expect(res.isExpired).toBe(false);
    });
  });

  describe('44. SELLER FILTER RECONCILIATION TEST', () => {
    it('reconciles 1 ACTIVE, 1 PENDING_REVIEW, 3 EXPIRED correctly', () => {
      const sellerInventory = [
        { id: '1', status: 'ACTIVE', expiresAt: futureDate },
        { id: '2', status: 'PENDING_REVIEW', expiresAt: futureDate },
        { id: '3', status: 'ACTIVE', expiresAt: pastDate },
        { id: '4', status: 'EXPIRED', expiresAt: pastDate },
        { id: '5', status: 'PASSIVE', expiresAt: pastDate },
      ];

      const all = sellerInventory.filter((l) => matchesSellerListingFilter(l, 'ALL'));
      const active = sellerInventory.filter((l) => matchesSellerListingFilter(l, 'ACTIVE'));
      const pending = sellerInventory.filter((l) => matchesSellerListingFilter(l, 'PENDING'));
      const passive = sellerInventory.filter((l) => matchesSellerListingFilter(l, 'PASSIVE'));
      const rejected = sellerInventory.filter((l) => matchesSellerListingFilter(l, 'REJECTED'));

      expect(all.length).toBe(5);
      expect(active.length).toBe(1);
      expect(pending.length).toBe(1);
      expect(passive.length).toBe(3);
      expect(rejected.length).toBe(0);
    });
  });
});
