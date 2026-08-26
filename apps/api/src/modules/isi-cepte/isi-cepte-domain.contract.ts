/**
 * TORQUESCOUT BACKOFFICE — İŞİ CEPTE BACKEND PROVIDER DOMAIN CONTRACT (PHASE 2)
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
  id: string;
  isicepteProviderId: string;
  businessName: string;
  membershipStatus: IsiCepteMembershipStatus;
  torqueScoutOptIn: boolean;
  localListingState: IsiCepteLocalListingState;
  countryCode: string;
  regionCode: string;
  district?: string | null;
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
