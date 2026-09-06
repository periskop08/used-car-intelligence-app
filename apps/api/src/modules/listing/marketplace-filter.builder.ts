import {
  ListingStatus,
  MediaModerationStatus,
  ListingPromotionType,
  PromotionLifecycleStatus,
  PowerVerificationStatus,
  Prisma,
} from '@prisma/client';
import {
  VEHICLE_COLORS,
  isApprovedVehicleColor,
  normalizeVehicleColor,
  isValidHpRangeId,
  isValidCcRangeId,
  getHpRangeById,
  getCcRangeById,
  compactContiguousRanges,
  FilterRangeOption,
  CompactNumericRange,
} from '@used-car-intelligence/shared';
import { BadRequestException } from '@nestjs/common';

export interface MarketplaceFilterParams {
  now?: Date;
  urgentOnly?: string;
  showcaseOnly?: string;
  sellerId?: string;
  vehicleVariantId?: string;
  brandId?: string;
  modelId?: string;
  minYear?: string;
  maxYear?: string;
  minPrice?: string;
  maxPrice?: string;
  minKm?: string;
  maxKm?: string;
  city?: string;
  district?: string;
  currency?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  vehicleStatus?: string;
  hasWarranty?: string;
  heavyDamage?: string;
  plateType?: string;
  sellerType?: string;
  exchangeable?: string;
  drivetrain?: string;
  keyword?: string;
  includeDescription?: string;
  isAiReady?: string;
  // Structured range parameters (preferred contract)
  powerRanges?: string;
  displacementRanges?: string;
  colors?: string;
  // Backward compatibility legacy parameters
  color?: string;
  minEnginePower?: string;
  maxEnginePower?: string;
  minEngineDisplacement?: string;
  maxEngineDisplacement?: string;
}

export interface ValidatedMarketplaceFilters {
  colors: string[];
  powerRanges: FilterRangeOption[];
  displacementRanges: FilterRangeOption[];
  compactedPowerRanges: CompactNumericRange[];
  compactedDisplacementRanges: CompactNumericRange[];
}

/**
 * Validates raw query parameters and converts them into structured, validated domain models.
 * Rejects invalid range IDs and unapproved colors with BadRequestException.
 */
export function validateMarketplaceFilters(
  params: MarketplaceFilterParams
): ValidatedMarketplaceFilters {
  // 1. Color validation & normalization
  const rawColorList: string[] = [];
  if (params.colors) {
    rawColorList.push(...params.colors.split(',').map((x) => x.trim()).filter(Boolean));
  }
  if (params.color) {
    rawColorList.push(...params.color.split(',').map((x) => x.trim()).filter(Boolean));
  }

  const validatedColors: string[] = [];
  for (const c of rawColorList) {
    if (!isApprovedVehicleColor(c)) {
      throw new BadRequestException(
        `Geçersiz araç rengi filtresi: "${c}". Onaylı renkler: ${VEHICLE_COLORS.join(', ')}`
      );
    }
    const normalized = normalizeVehicleColor(c);
    if (normalized && !validatedColors.includes(normalized)) {
      validatedColors.push(normalized);
    }
  }

  // 2. Motor Gücü (HP) validation & compaction
  const powerRanges: FilterRangeOption[] = [];
  if (params.powerRanges) {
    const ids = params.powerRanges.split(',').map((x) => x.trim()).filter(Boolean);
    for (const id of ids) {
      if (!isValidHpRangeId(id)) {
        throw new BadRequestException(`Geçersiz Motor Gücü (HP) aralık kimliği: "${id}"`);
      }
      const opt = getHpRangeById(id)!;
      if (!powerRanges.some((r) => r.id === opt.id)) {
        powerRanges.push(opt);
      }
    }
  }

  // Legacy fallback if powerRanges was not supplied but min/max was
  let compactedPowerRanges: CompactNumericRange[] = [];
  if (powerRanges.length > 0) {
    compactedPowerRanges = compactContiguousRanges(
      powerRanges.map((r) => ({ min: r.min, max: r.max }))
    );
  } else if (params.minEnginePower || params.maxEnginePower) {
    const min = params.minEnginePower ? parseInt(params.minEnginePower, 10) : null;
    const max = params.maxEnginePower ? parseInt(params.maxEnginePower, 10) : null;
    if ((min !== null && !isNaN(min)) || (max !== null && !isNaN(max))) {
      compactedPowerRanges = [{ min: isNaN(min as number) ? null : min, max: isNaN(max as number) ? null : max }];
    }
  }

  // 3. Motor Hacmi (CC) validation & compaction
  const displacementRanges: FilterRangeOption[] = [];
  if (params.displacementRanges) {
    const ids = params.displacementRanges.split(',').map((x) => x.trim()).filter(Boolean);
    for (const id of ids) {
      if (!isValidCcRangeId(id)) {
        throw new BadRequestException(`Geçersiz Motor Hacmi (CC) aralık kimliği: "${id}"`);
      }
      const opt = getCcRangeById(id)!;
      if (!displacementRanges.some((r) => r.id === opt.id)) {
        displacementRanges.push(opt);
      }
    }
  }

  // Legacy fallback if displacementRanges was not supplied but min/max was
  let compactedDisplacementRanges: CompactNumericRange[] = [];
  if (displacementRanges.length > 0) {
    compactedDisplacementRanges = compactContiguousRanges(
      displacementRanges.map((r) => ({ min: r.min, max: r.max }))
    );
  } else if (params.minEngineDisplacement || params.maxEngineDisplacement) {
    const min = params.minEngineDisplacement ? parseInt(params.minEngineDisplacement, 10) : null;
    const max = params.maxEngineDisplacement ? parseInt(params.maxEngineDisplacement, 10) : null;
    if ((min !== null && !isNaN(min)) || (max !== null && !isNaN(max))) {
      compactedDisplacementRanges = [{ min: isNaN(min as number) ? null : min, max: isNaN(max as number) ? null : max }];
    }
  }

  return {
    colors: validatedColors,
    powerRanges,
    displacementRanges,
    compactedPowerRanges,
    compactedDisplacementRanges,
  };
}

/**
 * Builds the canonical, single authoritative Prisma `where` predicate for marketplace listing queries.
 * Guaranteed to produce identical predicates for count(), findMany(), and pagination.
 */
export function buildMarketplaceListingWhere(
  params: MarketplaceFilterParams,
  validated: ValidatedMarketplaceFilters
): any {
  const now = params.now || new Date();

  // Root invariants: ACTIVE status, not expired, approved media
  const where: any = {
    status: ListingStatus.ACTIVE,
    AND: [
      {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    ],
    media: {
      some: {
        moderationStatus: MediaModerationStatus.APPROVED,
      },
    },
  };

  // Urgent promotion filter
  if (params.urgentOnly === 'true') {
    where.promotionEntitlements = {
      some: {
        promotionType: ListingPromotionType.URGENT_LISTING,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    };
  }

  // Showcase promotion filter
  if (params.showcaseOnly === 'true') {
    where.promotionEntitlements = {
      some: {
        promotionType: ListingPromotionType.SHOWCASE_FEED,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    };
  }

  if (params.sellerId) {
    where.sellerId = params.sellerId;
  }

  if (params.vehicleVariantId) {
    where.vehicleVariantId = params.vehicleVariantId;
  } else {
    if (params.brandId || params.modelId) {
      where.vehicleVariant = {};
      if (params.brandId) where.vehicleVariant.brandId = params.brandId;
      if (params.modelId) where.vehicleVariant.modelId = params.modelId;
    }
  }

  if (params.minYear || params.maxYear) {
    where.modelYear = {};
    if (params.minYear) where.modelYear.gte = parseInt(params.minYear, 10);
    if (params.maxYear) where.modelYear.lte = parseInt(params.maxYear, 10);
  }

  if (params.minPrice || params.maxPrice) {
    where.priceAmount = {};
    if (params.minPrice) where.priceAmount.gte = parseFloat(params.minPrice);
    if (params.maxPrice) where.priceAmount.lte = parseFloat(params.maxPrice);
  }

  if (params.minKm || params.maxKm) {
    where.kilometers = {};
    if (params.minKm) where.kilometers.gte = parseInt(params.minKm, 10);
    if (params.maxKm) where.kilometers.lte = parseInt(params.maxKm, 10);
  }

  if (params.city) {
    where.city = params.city;
  }

  if (params.district) {
    const list = params.district.split(',').map((x) => x.trim()).filter(Boolean);
    if (list.length > 0) {
      where.district = { in: list };
    }
  }

  if (params.currency) {
    where.currency = params.currency;
  }

  if (params.fuelType) {
    const list = params.fuelType.split(',').map((x) => x.trim()).filter(Boolean);
    if (list.length > 0) {
      where.fuelType = { in: list };
    }
  }

  if (params.transmission) {
    const list = params.transmission.split(',').map((x) => x.trim()).filter(Boolean);
    if (list.length > 0) {
      where.transmission = { in: list };
    }
  }

  if (params.bodyType) {
    const list = params.bodyType.split(',').map((x) => x.trim()).filter(Boolean);
    if (list.length > 0) {
      where.bodyType = { in: list };
    }
  }

  if (params.vehicleStatus) {
    where.vehicleStatus = params.vehicleStatus;
  }

  if (params.hasWarranty !== undefined && params.hasWarranty !== '') {
    where.hasWarranty = params.hasWarranty === 'true';
  }

  if (params.heavyDamage !== undefined && params.heavyDamage !== '') {
    where.heavyDamage = params.heavyDamage === 'true';
  }

  if (params.plateType) {
    const list = params.plateType.split(',').map((x) => x.trim()).filter(Boolean);
    if (list.length > 0) {
      where.plateType = { in: list };
    }
  }

  if (params.sellerType) {
    where.sellerType = params.sellerType;
  }

  if (params.exchangeable !== undefined && params.exchangeable !== '') {
    where.exchangeable = params.exchangeable === 'true';
  }

  if (params.drivetrain) {
    const list = params.drivetrain.split(',').map((x) => x.trim()).filter(Boolean);
    if (list.length > 0) {
      where.drivetrain = { in: list };
    }
  }

  if (params.keyword) {
    const searchConditions: any[] = [
      { title: { contains: params.keyword, mode: 'insensitive' } },
    ];
    if (params.includeDescription === 'true') {
      searchConditions.push({ description: { contains: params.keyword, mode: 'insensitive' } });
    }
    where.OR = searchConditions;
  }

  if (params.isAiReady !== undefined && params.isAiReady !== '') {
    where.isAiReady = params.isAiReady === 'true';
  }

  // =========================================================================
  // HARDENED FIELD-LEVEL TECHNICAL FACT & COLOR FILTERING
  // =========================================================================

  // 1. Color filter: Multi-select OR within color group
  if (validated.colors.length > 0) {
    where.color = {
      in: validated.colors,
      mode: 'insensitive',
    };
  }

  // 2. Motor Gücü (HP) filter: Multi-select OR within HP group, AND with other filters
  // Canonical: verified powerEnrichment ONLY (unverified canonical facts NEVER fall back to listing snapshot)
  // Manual: seller's numeric enginePower snapshot
  if (validated.compactedPowerRanges.length > 0) {
    const hpDisjuncts: any[] = [];
    for (const r of validated.compactedPowerRanges) {
      const pred: any = {};
      if (r.min !== null) pred.gte = r.min;
      if (r.max !== null) pred.lte = r.max;

      // Canonical branch: vehicleVariantId exists, powerEnrichment must be VERIFIED
      hpDisjuncts.push({
        vehicleVariantId: { not: null },
        vehicleVariant: {
          powerEnrichment: {
            verificationStatus: PowerVerificationStatus.VERIFIED,
            powerHp: pred,
          },
        },
      });

      // Manual branch: vehicleVariantId is null, seller's persisted numeric enginePower snapshot
      hpDisjuncts.push({
        vehicleVariantId: null,
        enginePower: pred,
      });
    }

    where.AND.push({ OR: hpDisjuncts });
  }

  // 3. Motor Hacmi (CC) filter: Multi-select OR within CC group, AND with other filters
  // Canonical: verified TechnicalSpec displacement ONLY with field-level provenance
  // Manual: seller's numeric engineDisplacement snapshot
  if (validated.compactedDisplacementRanges.length > 0) {
    const ccDisjuncts: any[] = [];
    for (const r of validated.compactedDisplacementRanges) {
      const pred: any = {};
      if (r.min !== null) pred.gte = r.min;
      if (r.max !== null) pred.lte = r.max;

      // Canonical branch: vehicleVariantId exists, TechnicalSpec must have field-level verified displacement
      // Precedence:
      // 1. If displacementStatus exists:
      //    - 'VERIFIED' -> eligible
      //    - CONFLICT, RESEARCHING, MISSING, UNVERIFIED, FAILED, or any non-VERIFIED state -> strictly NOT eligible
      // 2. Legacy fallback: ONLY when displacementStatus is absent (Prisma.AnyNull),
      //    legacy contract is accepted (isVerified === true AND verifiedAt is present).
      // A source URL alone NEVER qualifies (sourceUrlAloneQualifiesCcForFilter = FALSE).
      ccDisjuncts.push({
        vehicleVariantId: { not: null },
        vehicleVariant: {
          specs: {
            specs: {
              path: ['engineDisplacementCc'],
              ...pred,
            },
            OR: [
              // Branch 1: Explicit field-level status is VERIFIED
              { specs: { path: ['displacementStatus'], equals: 'VERIFIED' } },
              // Branch 2: Legacy fallback ONLY when displacementStatus is absent / null
              {
                AND: [
                  { specs: { path: ['displacementStatus'], equals: Prisma.AnyNull } },
                  { specs: { path: ['isVerified'], equals: true } },
                  { specs: { path: ['verifiedAt'], not: Prisma.AnyNull } },
                ],
              },
            ],
          },
        },
      });

      // Manual branch: vehicleVariantId is null, seller's persisted numeric engineDisplacement snapshot
      ccDisjuncts.push({
        vehicleVariantId: null,
        engineDisplacement: pred,
      });
    }

    where.AND.push({ OR: ccDisjuncts });
  }

  return where;
}
