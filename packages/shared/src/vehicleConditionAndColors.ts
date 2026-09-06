// ==============================================================================
// TORQUESCOUT VEHICLE COLORS & BODY CONDITION CANONICAL SPECIFICATION
// ==============================================================================

/**
 * 18 Authoritative User-Facing Vehicle Colors for TorqueScout
 */
export const VEHICLE_COLORS = [
  'Bej',
  'Beyaz',
  'Bordo',
  'Füme',
  'Gri',
  'Gümüş Gri',
  'Kahverengi',
  'Kırmızı',
  'Lacivert',
  'Mavi',
  'Mor',
  'Pembe',
  'Sarı',
  'Siyah',
  'Şampanya',
  'Turkuaz',
  'Turuncu',
  'Yeşil',
] as const;

export type VehicleColor = typeof VEHICLE_COLORS[number];

/**
 * Safe Turkish-aware case-normalization lookup map.
 * Does NOT guess or map to unrelated colors (legacyColorSemanticGuessing = FALSE).
 */
const COLOR_LOOKUP_MAP = new Map<string, VehicleColor>();
for (const c of VEHICLE_COLORS) {
  COLOR_LOOKUP_MAP.set(c.toLocaleLowerCase('tr-TR'), c);
  COLOR_LOOKUP_MAP.set(c.toLowerCase(), c);
}

/**
 * Normalizes a color string safely:
 * - If clearly equivalent (e.g. "siyah", "SIYAH", "Siyah") -> "Siyah"
 * - If unknown legacy color -> returns original raw trimmed string without guessing
 */
export function normalizeVehicleColor(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const normalized = COLOR_LOOKUP_MAP.get(trimmed.toLocaleLowerCase('tr-TR')) || COLOR_LOOKUP_MAP.get(trimmed.toLowerCase());
  if (normalized) {
    return normalized;
  }
  // Unknown legacy value preserved as-is without guessing
  return trimmed;
}

/**
 * Validates whether a color belongs strictly to the approved 18 TorqueScout colors.
 */
export function isApprovedVehicleColor(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  return COLOR_LOOKUP_MAP.has(trimmed.toLocaleLowerCase('tr-TR')) || COLOR_LOOKUP_MAP.has(trimmed.toLowerCase());
}

/**
 * 13 Authoritative Vehicle Body Parts Supported Across TorqueScout
 */
export const VEHICLE_BODY_PARTS = [
  'FRONT_BUMPER',
  'REAR_BUMPER',
  'HOOD',
  'ROOF',
  'TRUNK',
  'LEFT_FRONT_DOOR',
  'LEFT_REAR_DOOR',
  'RIGHT_FRONT_DOOR',
  'RIGHT_REAR_DOOR',
  'LEFT_FRONT_FENDER',
  'LEFT_REAR_FENDER',
  'RIGHT_FRONT_FENDER',
  'RIGHT_REAR_FENDER',
] as const;

export type VehicleBodyPart = typeof VEHICLE_BODY_PARTS[number];

export const BODY_PART_SET = new Set<string>(VEHICLE_BODY_PARTS);

export const BODY_PART_LABELS: Record<VehicleBodyPart, string> = {
  FRONT_BUMPER: 'Ön Tampon',
  REAR_BUMPER: 'Arka Tampon',
  HOOD: 'Kaput',
  ROOF: 'Tavan',
  TRUNK: 'Bagaj Kapağı',
  LEFT_FRONT_DOOR: 'Sol Ön Kapı',
  LEFT_REAR_DOOR: 'Sol Arka Kapı',
  RIGHT_FRONT_DOOR: 'Sağ Ön Kapı',
  RIGHT_REAR_DOOR: 'Sağ Arka Kapı',
  LEFT_FRONT_FENDER: 'Sol Ön Çamurluk',
  LEFT_REAR_FENDER: 'Sol Arka Çamurluk',
  RIGHT_FRONT_FENDER: 'Sağ Ön Çamurluk',
  RIGHT_REAR_FENDER: 'Sağ Arka Çamurluk',
};

export enum BodyPartStatus {
  ORIGINAL = 'ORIGINAL',
  LOCAL_PAINTED = 'LOCAL_PAINTED',
  PAINTED = 'PAINTED',
  REPLACED = 'REPLACED',
}

export const BODY_PART_STATUS_LABELS: Record<BodyPartStatus, string> = {
  [BodyPartStatus.ORIGINAL]: 'Orijinal',
  [BodyPartStatus.LOCAL_PAINTED]: 'Lokal Boyalı',
  [BodyPartStatus.PAINTED]: 'Boyalı',
  [BodyPartStatus.REPLACED]: 'Değişen',
};

/**
 * Canonical Converter 1:
 * Raw listing arrays (localPaintedParts, paintedParts, changedParts) -> unified status map
 * Deterministic precedence for any legacy conflict: REPLACED > PAINTED > LOCAL_PAINTED > ORIGINAL.
 */
export function resolveBodyPartStatusMap(listing?: {
  localPaintedParts?: any;
  paintedParts?: any;
  changedParts?: any;
} | null): Record<VehicleBodyPart, BodyPartStatus> {
  const result: Record<VehicleBodyPart, BodyPartStatus> = {} as any;
  for (const part of VEHICLE_BODY_PARTS) {
    result[part] = BodyPartStatus.ORIGINAL;
  }

  if (!listing) return result;

  const local = Array.isArray(listing.localPaintedParts) ? listing.localPaintedParts : [];
  const painted = Array.isArray(listing.paintedParts) ? listing.paintedParts : [];
  const changed = Array.isArray(listing.changedParts) ? listing.changedParts : [];

  // Apply in order of increasing precedence
  for (const p of local) {
    if (typeof p === 'string' && BODY_PART_SET.has(p)) {
      result[p as VehicleBodyPart] = BodyPartStatus.LOCAL_PAINTED;
    }
  }

  for (const p of painted) {
    if (typeof p === 'string' && BODY_PART_SET.has(p)) {
      result[p as VehicleBodyPart] = BodyPartStatus.PAINTED;
    }
  }

  for (const p of changed) {
    if (typeof p === 'string' && BODY_PART_SET.has(p)) {
      result[p as VehicleBodyPart] = BodyPartStatus.REPLACED;
    }
  }

  return result;
}

/**
 * Canonical Converter 2:
 * Unified status map -> sanitized listing arrays.
 * INVARIANT: Every part exists in AT MOST ONE array. Deduplicated, valid parts only.
 */
export function convertStatusMapToListingArrays(
  statusMap: Partial<Record<VehicleBodyPart, BodyPartStatus>>
): {
  localPaintedParts: string[];
  paintedParts: string[];
  changedParts: string[];
} {
  const localPaintedParts: string[] = [];
  const paintedParts: string[] = [];
  const changedParts: string[] = [];

  for (const part of VEHICLE_BODY_PARTS) {
    const status = statusMap[part] || BodyPartStatus.ORIGINAL;
    if (status === BodyPartStatus.LOCAL_PAINTED) {
      localPaintedParts.push(part);
    } else if (status === BodyPartStatus.PAINTED) {
      paintedParts.push(part);
    } else if (status === BodyPartStatus.REPLACED) {
      changedParts.push(part);
    }
  }

  return { localPaintedParts, paintedParts, changedParts };
}

/**
 * Server-side sanitizer and invariant enforcer for incoming payloads.
 * Eliminates duplicate entries and cross-array ambiguities (REPLACED > PAINTED > LOCAL_PAINTED).
 */
export function sanitizeBodyPartArrays(payload: {
  localPaintedParts?: string[] | null;
  paintedParts?: string[] | null;
  changedParts?: string[] | null;
}): {
  localPaintedParts: string[];
  paintedParts: string[];
  changedParts: string[];
} {
  const statusMap = resolveBodyPartStatusMap(payload);
  return convertStatusMapToListingArrays(statusMap);
}
