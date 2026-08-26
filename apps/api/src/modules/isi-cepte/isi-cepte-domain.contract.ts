/**
 * TORQUESCOUT BACKOFFICE — İŞİ CEPTE BACKEND DOMAIN CONTRACT
 * 
 * Isolated TypeScript domain interfaces for future İşi Cepte synchronization.
 */

export type IsiCepteMembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNKNOWN';

export type IsiCepteEntitlementType = 'LOCAL_LISTING' | 'SHOWCASE' | 'NATIONAL_VISIBILITY';

export type IsiCepteEntitlementSource = 'ISICEPTE' | 'ADMIN_GRANTED';

export interface IsiCepteEntitlements {
  localListing: boolean;
  showcase: boolean;
  nationalVisibility: boolean;
}

export interface IsiCepteProvider {
  isicepteProviderId: string;
  businessName: string;
  membershipStatus: IsiCepteMembershipStatus;
  torqueScoutOptIn: boolean;
  countryCode: string;
  regionCode: string;
  district?: string | null;
  serviceCategoryIds: string[];
  supportedVehicleBrandIds: string[];
  entitlements: IsiCepteEntitlements;
  createdAt: string;
  updatedAt: string;
  sourceUpdatedAt?: string | null;
}
