/**
 * TorqueScout Feed Contract
 * Defines canonical data contracts for the mixed Akış feed:
 * 1. Vehicle Listings (Content Type A)
 * 2. İşiCepte Provider Posts (Content Type B)
 */

export const PROVIDER_POST_INTERVAL = 5;

export interface FeedSeller {
  id: string;
  displayName: string;
  memberSince: string;
  avatarUrl?: string | null;
}

export interface FeedVehicle {
  brand: string;
  modelFamily: string;
  modelName: string;
  year: number;
  fuelType: string;
  transmissionType: string;
  condition?: string;
  mileage: number;
  bodyType?: string;
  enginePower?: string;
  engineCapacity?: string;
  drivetrain?: string;
  color?: string;
  warranty?: boolean;
  heavyDamage?: boolean;
  plateOrigin?: string;
  sellerType?: string;
  exchange?: boolean;
  trimPackage?: string | null;
  engineVersion?: string | null;
}

export interface FeedPhoto {
  id: string;
  url: string;
  order: number;
}

export interface VehicleListingFeedItem {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  listingDate: string;
  listingNo: string;
  location: {
    city: string;
    district: string;
    neighborhood?: string;
  };
  seller: FeedSeller;
  vehicle: FeedVehicle;
  photos: FeedPhoto[];
  technicalSummary?: {
    maxPower: string | null;
    topSpeed: string | null;
    acceleration0100: string | null;
    fuelConsumption: string | null;
  };
  breadcrumb: string[];
  isFavorite: boolean;
  isUrgent?: boolean;
  isShowcaseFeedActive?: boolean;
  detailUrl?: string;
  localPaintedParts?: string[];
  paintedParts?: string[];
  changedParts?: string[];
  damageRecord?: string | null;
  tramerAmount?: number;
}

export interface IsiCepteProviderPostFeedItem {
  sourcePostId: string;
  providerId: string;
  businessName: string;
  profileImageUrl?: string | null;
  cityId: string;
  cityName: string;
  districtName?: string | null;
  postImageUrl?: string | null;
  postTitle: string;
  postDescription: string;
  likeCount?: number;
  rating?: number;
  reviewCount?: number;
  isShowcaseActive: boolean;
  supportedBrands?: string[];
  serviceCategories?: string[];
  address?: string | null;
  phone?: string | null;
  profileUrl?: string | null;
}

export type FeedItem =
  | {
      type: 'VEHICLE_LISTING';
      id: string;
      data: VehicleListingFeedItem;
    }
  | {
      type: 'ISICEPTE_PROVIDER_POST';
      id: string;
      data: IsiCepteProviderPostFeedItem;
    };

export interface FeedResponse {
  items: FeedItem[];
  vehicleTotalCount: number;
  totalCount: number; // Backward-compatible alias for vehicleTotalCount
  hasMore: boolean;
  nextCursor?: string | null;
  seed: string;
}

export interface FeedCursorPayload {
  version: number;
  offset: number;
  globalVehicleCount: number;
  seed: string;
  cityId?: string | null;
  providerPosition: number;
}
