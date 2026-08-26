/**
 * TORQUESCOUT BACKOFFICE — İŞİ CEPTE DOMAIN CONTRACT
 * 
 * Standalone TypeScript domain interfaces defining future synchronization
 * data shapes from İşi Cepte into TorqueScout Backoffice.
 * 
 * Data Ownership Rule:
 * İşi Cepte = Source of truth for provider profiles, memberships, and categories.
 * TorqueScout = Consumer of provider eligibility, regional visibility, and entitlements.
 */

export type IsiCepteMembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNKNOWN';

export type IsiCepteEntitlementType = 'LOCAL_LISTING' | 'SHOWCASE' | 'NATIONAL_VISIBILITY';

export type IsiCepteEntitlementSource = 'ISICEPTE' | 'ADMIN_GRANTED';

export interface IsiCepteEntitlements {
  /** Normal regional eligibility */
  localListing: boolean;
  /** Ranking & prominence benefit (Vitrin) */
  showcase: boolean;
  /** Expanded geographic reach (Ülke Geneli) */
  nationalVisibility: boolean;
}

export interface IsiCepteProvider {
  /** External primary key from İşi Cepte system */
  isicepteProviderId: string;
  businessName: string;
  membershipStatus: IsiCepteMembershipStatus;
  /** "TorqueScout'ta da listelenmek istiyorum" opt-in flag */
  torqueScoutOptIn: boolean;
  countryCode: string; // e.g. "TR"
  regionCode: string;  // e.g. "TR-34" or "İstanbul"
  district?: string | null; // e.g. "Kadıköy"
  serviceCategoryIds: string[]; // e.g. ["EXPERT", "MECHANIC", "PAINT_BODY"]
  supportedVehicleBrandIds: string[];
  entitlements: IsiCepteEntitlements;
  createdAt: string;
  updatedAt: string;
  sourceUpdatedAt?: string | null;
}

export interface IsiCepteRegionalVisibilityRecord {
  id: string;
  isicepteProviderId: string;
  countryCode: string;
  regionCode: string;
  districtCode?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  source: IsiCepteEntitlementSource;
  updatedAt: string;
}

export interface IsiCepteShowcaseRecord {
  id: string;
  isicepteProviderId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  startsAt: string;
  endsAt?: string | null;
  source: IsiCepteEntitlementSource;
  purchaseId?: string | null;
}

export interface IsiCepteNationalVisibilityRecord {
  id: string;
  isicepteProviderId: string;
  countryCode: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  startsAt: string;
  endsAt?: string | null;
  source: IsiCepteEntitlementSource;
  purchaseId?: string | null;
}

export interface IsiCeptePurchaseRecord {
  purchaseId: string;
  isicepteProviderId: string;
  productType: 'SHOWCASE' | 'NATIONAL_VISIBILITY' | 'MEMBERSHIP';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  amount?: number | null;
  currency?: string | null;
  purchasedAt: string;
  startsAt: string;
  endsAt?: string | null;
  source: IsiCepteEntitlementSource;
}
