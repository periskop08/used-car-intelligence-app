/**
 * TORQUESCOUT BACKOFFICE — İŞİ CEPTE BACKEND PROVIDER DOMAIN CONTRACT (PHASE 4)
 */

export type IsiCepteMembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNKNOWN';

export type IsiCepteLocalListingState = 'ELIGIBLE' | 'INELIGIBLE' | 'OPTED_OUT';

export type IsiCepteEntitlementType = 'LOCAL_LISTING' | 'SHOWCASE' | 'NATIONAL_VISIBILITY';

export type IsiCepteEntitlementSource = 'ISICEPTE_PURCHASE' | 'ADMIN_GRANTED';

export type IsiCepteShowcaseStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'UNKNOWN';

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
  id: string;
  isicepteProviderId: string;
  businessName: string;
  membershipStatus: IsiCepteMembershipStatus;
  torqueScoutOptIn: boolean;
  localListingState: IsiCepteLocalListingState;
  eligibilityReasonText?: string | null;
  eligibilityReasonCode?: string | null;
  countryCode: string;
  regionCode: string;
  district?: string | null;
  serviceRegions?: IsiCepteServiceRegion[];
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  autoServiceCategories: IsiCepteServiceCategoryRef[];
  supportedVehicleBrands: IsiCepteVehicleBrandRef[];
  showcase: IsiCepteEntitlementDetail;
  nationalVisibility: IsiCepteEntitlementDetail;
  sourceSystem: string;
  sourceUpdatedAt?: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
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
