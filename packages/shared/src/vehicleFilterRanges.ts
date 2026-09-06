// ==============================================================================
// TORQUESCOUT VEHICLE FILTER MASTER RANGES & COMPACTION CONTRACT
// ==============================================================================

export interface FilterRangeOption {
  id: string;
  label: string;
  min: number | null;
  max: number | null;
}

/**
 * 24 Master Horsepower (HP) Buckets
 * Exactly inclusive boundaries, 0 gaps, 0 overlaps.
 */
export const HORSEPOWER_RANGES: readonly FilterRangeOption[] = [
  { id: 'HP_LE_50', label: "50 HP'ye kadar", min: null, max: 50 },
  { id: 'HP_51_75', label: '51 - 75 HP', min: 51, max: 75 },
  { id: 'HP_76_100', label: '76 - 100 HP', min: 76, max: 100 },
  { id: 'HP_101_125', label: '101 - 125 HP', min: 101, max: 125 },
  { id: 'HP_126_150', label: '126 - 150 HP', min: 126, max: 150 },
  { id: 'HP_151_175', label: '151 - 175 HP', min: 151, max: 175 },
  { id: 'HP_176_200', label: '176 - 200 HP', min: 176, max: 200 },
  { id: 'HP_201_225', label: '201 - 225 HP', min: 201, max: 225 },
  { id: 'HP_226_250', label: '226 - 250 HP', min: 226, max: 250 },
  { id: 'HP_251_275', label: '251 - 275 HP', min: 251, max: 275 },
  { id: 'HP_276_300', label: '276 - 300 HP', min: 276, max: 300 },
  { id: 'HP_301_325', label: '301 - 325 HP', min: 301, max: 325 },
  { id: 'HP_326_350', label: '326 - 350 HP', min: 326, max: 350 },
  { id: 'HP_351_375', label: '351 - 375 HP', min: 351, max: 375 },
  { id: 'HP_376_400', label: '376 - 400 HP', min: 376, max: 400 },
  { id: 'HP_401_425', label: '401 - 425 HP', min: 401, max: 425 },
  { id: 'HP_426_450', label: '426 - 450 HP', min: 426, max: 450 },
  { id: 'HP_451_475', label: '451 - 475 HP', min: 451, max: 475 },
  { id: 'HP_476_500', label: '476 - 500 HP', min: 476, max: 500 },
  { id: 'HP_501_525', label: '501 - 525 HP', min: 501, max: 525 },
  { id: 'HP_526_550', label: '526 - 550 HP', min: 526, max: 550 },
  { id: 'HP_551_575', label: '551 - 575 HP', min: 551, max: 575 },
  { id: 'HP_576_600', label: '576 - 600 HP', min: 576, max: 600 },
  { id: 'HP_GE_601', label: '601 HP ve üzeri', min: 601, max: null },
] as const;

/**
 * 13 Master Engine Displacement (CC) Buckets
 * Exactly inclusive boundaries with cm³ typography, 0 gaps, 0 overlaps.
 */
export const ENGINE_DISPLACEMENT_RANGES: readonly FilterRangeOption[] = [
  { id: 'CC_LE_1300', label: "1300 cm³'e kadar", min: null, max: 1300 },
  { id: 'CC_1301_1600', label: '1301 - 1600 cm³', min: 1301, max: 1600 },
  { id: 'CC_1601_1800', label: '1601 - 1800 cm³', min: 1601, max: 1800 },
  { id: 'CC_1801_2000', label: '1801 - 2000 cm³', min: 1801, max: 2000 },
  { id: 'CC_2001_2500', label: '2001 - 2500 cm³', min: 2001, max: 2500 },
  { id: 'CC_2501_3000', label: '2501 - 3000 cm³', min: 2501, max: 3000 },
  { id: 'CC_3001_3500', label: '3001 - 3500 cm³', min: 3001, max: 3500 },
  { id: 'CC_3501_4000', label: '3501 - 4000 cm³', min: 3501, max: 4000 },
  { id: 'CC_4001_4500', label: '4001 - 4500 cm³', min: 4001, max: 4500 },
  { id: 'CC_4501_5000', label: '4501 - 5000 cm³', min: 4501, max: 5000 },
  { id: 'CC_5001_5500', label: '5001 - 5500 cm³', min: 5001, max: 5500 },
  { id: 'CC_5501_6000', label: '5501 - 6000 cm³', min: 5501, max: 6000 },
  { id: 'CC_GE_6001', label: '6001 cm³ ve üzeri', min: 6001, max: null },
] as const;

// Fast lookup maps
const HP_RANGE_MAP = new Map<string, FilterRangeOption>(
  HORSEPOWER_RANGES.map((r) => [r.id, r])
);
const CC_RANGE_MAP = new Map<string, FilterRangeOption>(
  ENGINE_DISPLACEMENT_RANGES.map((r) => [r.id, r])
);

export function getHpRangeById(id: string): FilterRangeOption | undefined {
  return HP_RANGE_MAP.get(id);
}

export function getCcRangeById(id: string): FilterRangeOption | undefined {
  return CC_RANGE_MAP.get(id);
}

export function isValidHpRangeId(id: string): boolean {
  return HP_RANGE_MAP.has(id);
}

export function isValidCcRangeId(id: string): boolean {
  return CC_RANGE_MAP.has(id);
}

/**
 * Checks if a numeric value falls into a given range option (inclusive).
 */
export function isValueInNumericRange(
  val: number,
  range: { min: number | null; max: number | null }
): boolean {
  if (range.min !== null && val < range.min) return false;
  if (range.max !== null && val > range.max) return false;
  return true;
}

/**
 * Finds the exact matching HP bucket for an exact horsepower value.
 */
export function findHpBucketForValue(hp: number): FilterRangeOption | undefined {
  return HORSEPOWER_RANGES.find((r) => isValueInNumericRange(hp, r));
}

/**
 * Finds the exact matching CC bucket for an exact displacement value.
 */
export function findCcBucketForValue(cc: number): FilterRangeOption | undefined {
  return ENGINE_DISPLACEMENT_RANGES.find((r) => isValueInNumericRange(cc, r));
}

export interface CompactNumericRange {
  min: number | null;
  max: number | null;
}

/**
 * Merges adjacent contiguous ranges to optimize DB predicate execution
 * while preserving 100% exact selection semantics.
 *
 * Example:
 * [126-150] + [151-175] => [126-175]
 * [76-100] + [201-225] => [76-100], [201-225] (disjoint, remains 2 ORs)
 */
export function compactContiguousRanges(
  ranges: { min: number | null; max: number | null }[]
): CompactNumericRange[] {
  if (ranges.length <= 1) return [...ranges];

  // Sort by min (null counts as -Infinity)
  const sorted = [...ranges].sort((a, b) => {
    const minA = a.min ?? -Infinity;
    const minB = b.min ?? -Infinity;
    return minA - minB;
  });

  const compacted: CompactNumericRange[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Check if next is contiguous with current
    // e.g. current.max === 150, next.min === 151 => next.min === current.max + 1
    const isContiguous =
      current.max !== null &&
      next.min !== null &&
      next.min === current.max + 1;

    // Also check overlap if any
    const isOverlap =
      current.max !== null &&
      next.min !== null &&
      next.min <= current.max;

    if (isContiguous || isOverlap) {
      // Extend current max (if next.max is null, extends to infinity)
      if (current.max === null || next.max === null) {
        current.max = null;
      } else {
        current.max = Math.max(current.max, next.max);
      }
    } else {
      compacted.push(current);
      current = { ...next };
    }
  }

  compacted.push(current);
  return compacted;
}
