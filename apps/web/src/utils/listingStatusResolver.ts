/**
 * CANONICAL LISTING STATUS RESOLVER & PRESENTATION MAP
 * Centralizes effective status logic, human-friendly Turkish labels, and badge classes
 * across the entire TorqueScout Backoffice.
 */

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
}): EffectiveListingStatusResult {
  const now = new Date();
  const rawStatus = (listing?.status || 'UNKNOWN').toUpperCase();

  // 1. Explicit deletion
  if (rawStatus === 'DELETED') {
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

  // 2. Explicit rejection
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

  // 3. Moderation Pending
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

  if (rawStatus === 'REPORTED') {
    return {
      effectiveStatus: 'REPORTED',
      label: 'Şikâyet Edildi',
      badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
      isExpired: false,
      isPending: false,
      isActive: false,
      isDeleted: false,
    };
  }

  // 4. Expiration check
  const hasExpired = listing?.expiresAt ? new Date(listing.expiresAt) <= now : false;

  // 5. Active
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

  // 6. Expired
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

  // 7. Passive
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

  if (rawStatus === 'SOLD') {
    return {
      effectiveStatus: 'SOLD',
      label: 'Satıldı',
      badgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      isExpired: false,
      isPending: false,
      isActive: false,
      isDeleted: false,
    };
  }

  if (rawStatus === 'DRAFT') {
    return {
      effectiveStatus: 'DRAFT',
      label: 'Taslak',
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

/**
 * Filter predicate for Seller Detail Drawer listings tab
 */
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
