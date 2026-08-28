/**
 * TORQUESCOUT BACKOFFICE — İŞİ CEPTE DOMAIN CONTRACT (PHASE 7)
 * 
 * Authoritative TorqueScout representation of an İşi Cepte provider, entitlements, & purchases.
 * 
 * HARD INVARIANT:
 * Purchase != Entitlement.
 * A purchase is a commercial transaction (amount, currency, status, purchasedAt).
 * An entitlement is the visibility right produced by that transaction (SHOWCASE / NATIONAL_VISIBILITY).
 * ADMIN_GRANTED entitlements do NOT have fake purchases.
 */

export type IsiCepteMembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNKNOWN';

export type IsiCepteLocalListingState = 'ELIGIBLE' | 'INELIGIBLE' | 'OPTED_OUT';

export type IsiCepteEntitlementType = 'LOCAL_LISTING' | 'SHOWCASE' | 'NATIONAL_VISIBILITY';

export type IsiCepteEntitlementSource = 'ISICEPTE_PURCHASE' | 'ADMIN_GRANTED';

export type IsiCepteShowcaseStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'UNKNOWN';

export type IsiCeptePurchaseStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | 'UNKNOWN';

export interface IsiCepteServiceCategoryRef {
  id: string;
  name: string;
}

export interface IsiCepteVehicleBrandRef {
  id?: string | null;
  name: string;
}

export interface IsiCepteServiceRegion {
  id?: string;
  countryCode: string;
  regionCode: string;
  district?: string | null;
}

export interface IsiCepteEntitlementDetail {
  active: boolean;
  status?: IsiCepteShowcaseStatus | null;
  startsAt?: string | null;
  endsAt?: string | null;
  source?: IsiCepteEntitlementSource | null;
  purchaseId?: string | null;
}

export interface IsiCepteProvider {
  /** Internal TorqueScout reference ID */
  id: string;
  /** Stable primary external cross-system ID from İşi Cepte */
  isicepteProviderId: string;
  /** Synchronized display business name */
  businessName: string;
  /** Synchronized membership status */
  membershipStatus: IsiCepteMembershipStatus;
  /** "TorqueScout'ta listelenmek istiyorum" synchronized opt-in preference */
  torqueScoutOptIn: boolean;
  /** Calculated local listing eligibility state */
  localListingState: IsiCepteLocalListingState;
  /** Human-readable eligibility reason text */
  eligibilityReasonText?: string | null;
  eligibilityReasonCode?: string | null;

  /** Country-first geographic model */
  countryCode: string; // e.g. "TR"
  regionCode: string;  // e.g. "TR-34" / "İstanbul"
  district?: string | null; // e.g. "Kadıköy"
  /** Support for multiple service coverage areas */
  serviceRegions?: IsiCepteServiceRegion[];

  /** Optional read-only contact information */
  phone?: string | null;
  email?: string | null;
  address?: string | null;

  /** Synchronized automotive service categories */
  autoServiceCategories: IsiCepteServiceCategoryRef[];
  /** Synchronized supported vehicle brands */
  supportedVehicleBrands: IsiCepteVehicleBrandRef[];

  /** Separate commercial visibility entitlements */
  showcase: IsiCepteEntitlementDetail;
  nationalVisibility: IsiCepteEntitlementDetail;

  /** Sync metadata */
  sourceSystem: string;
  sourceUpdatedAt?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IsiCepteRegionalVisibilityRecord {
  id: string;
  isicepteProviderId: string;
  provider: IsiCepteProvider;
  countryCode: string;
  regionCode: string;
  district?: string | null;
  localListingState: IsiCepteLocalListingState;
  eligibilityReasonText: string;
  source: IsiCepteEntitlementSource;
  updatedAt: string;
}

export interface IsiCepteShowcaseRecord {
  id: string;
  isicepteProviderId: string;
  provider: IsiCepteProvider;
  status: IsiCepteShowcaseStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  source: IsiCepteEntitlementSource;
  purchaseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IsiCeptePurchaseRecord {
  id: string;
  externalPurchaseId: string;
  isicepteProviderId: string;
  provider: IsiCepteProvider;
  productType: IsiCepteEntitlementType;
  amount: number;
  currency: string;
  purchaseStatus: IsiCeptePurchaseStatus;
  purchasedAt: string;
  entitlementId?: string | null;
  entitlementType: IsiCepteEntitlementType;
  entitlementStatus?: IsiCepteShowcaseStatus | null;
  entitlementStartsAt?: string | null;
  entitlementEndsAt?: string | null;
  sourceSystem: string;
  sourceUpdatedAt?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
