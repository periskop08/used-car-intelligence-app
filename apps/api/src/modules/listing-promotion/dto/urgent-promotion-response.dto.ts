export class PublicUrgentPromotionDto {
  isUrgent: boolean;
  urgentSince?: string;
  urgentExpiresAt?: string;
}

export class UserUrgentPromotionStatusDto {
  hasActivePromotion: boolean;
  hasPendingPromotion: boolean;
  lifecycleStatus?: string;
  paymentStatus?: string;
  expiresAt?: string;
  remainingDays?: number;
  activatesImmediately?: boolean;
  validUntil?: string;
}
