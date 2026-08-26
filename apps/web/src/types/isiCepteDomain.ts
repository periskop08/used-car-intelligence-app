/**
 * TORQUESCOUT BACKOFFICE — İŞİ CEPTE PROVIDER DOMAIN CONTRACT (PHASE 2)
 * 
 * Authoritative TorqueScout representation of an İşi Cepte provider.
 * 
 * DATA OWNERSHIP PRINCIPLE:
 * İşi Cepte = Source of truth for business identity, profile, categories, brands, membership.
 * TorqueScout = Consumer of synchronized eligibility, regional visibility, and entitlements.
 * 
 * STABLE IDENTITY:
 * `isicepteProviderId` is the stable cross-system identity.
 */

export type IsiCepteMembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNKNOWN';

export type IsiCepteLocalListingState = 'ELIGIBLE' | 'INELIGIBLE' | 'OPTED_OUT';

export type IsiCepteEntitlementType = 'LOCAL_LISTING' | 'SHOWCASE' | 'NATIONAL_VISIBILITY';

export type IsiCepteEntitlementSource = 'ISICEPTE_PURCHASE' | 'ADMIN_GRANTED';

export interface IsiCepteServiceCategoryRef {
  id: string;
  name: string;
}

export interface IsiCepteVehicleBrandRef {
  id?: string | null;
  name: string;
}

export interface IsiCepteEntitlementDetail {
  active: boolean;
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

  /** Country-first geographic model */
  countryCode: string; // e.g. "TR"
  regionCode: string;  // e.g. "TR-34" / "İstanbul"
  district?: string | null; // e.g. "Kadıköy"

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
