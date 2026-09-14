export enum PowerVerificationStatus {
  PENDING = 'PENDING',
  RESEARCHING = 'RESEARCHING',
  VERIFIED = 'VERIFIED',
  CONFLICT = 'CONFLICT',
  MISSING = 'MISSING',
  FAILED = 'FAILED'
}

export enum PowerSourceMarket {
  TURKEY = 'TURKEY',
  EUROPE = 'EUROPE'
}

export enum PowerMarketResolution {
  TR_PRIMARY = 'TR_PRIMARY',
  EU_FALLBACK = 'EU_FALLBACK'
}

export interface ConvertedPower {
  powerHp: number;
  powerPs: number;
  powerKw: number;
  sourceReportedValue: number;
  sourceReportedUnit: 'HP' | 'PS' | 'KW';
}

export const PS_TO_HP_FACTOR = 1.0; // In TR/EU automotive market standard, PS (Metric Horsepower) is 1:1 with catalog HP (Beygir Gücü)
export const KW_TO_HP_FACTOR = 1.3596216173; // Metric horsepower conversion (1 kW = 1.35962 PS/HP)
export const HP_TO_KW_FACTOR = 0.73549875;
export const PS_TO_KW_FACTOR = 0.73549875;
export const KW_TO_PS_FACTOR = 1.3596216173;
export const HP_TO_PS_FACTOR = 1.0;

/**
 * Converts reported power values (HP, PS, kW) to canonical normalized units
 * using TR / European automotive catalog standards (Metric Horsepower / DIN PS = HP / BG).
 *
 * CANONICAL POWER NORMALIZATION (TR/EU Standard):
 * PS -> HP: HP = PS (150 PS -> 150 HP)
 * kW -> HP: HP = round(kW * 1.35962) (110 kW -> 150 HP)
 * HP -> HP: no conversion (150 HP -> 150 HP)
 *
 * Source data values and units remain preserved and unmutated.
 */
export function convertPowerUnits(value: number, unit: string): ConvertedPower {
  const normalizedUnit = (unit || 'PS').trim().toUpperCase();
  const val = Number(value);

  if (normalizedUnit === 'KW') {
    const ps = Math.round(val * KW_TO_PS_FACTOR);
    const hp = ps;
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'KW',
      powerKw: val,
      powerPs: ps,
      powerHp: hp,
    };
  }

  if (normalizedUnit === 'PS' || normalizedUnit === 'BG' || normalizedUnit === 'PK') {
    const ps = Math.round(val);
    const kw = Math.round((val * PS_TO_KW_FACTOR) * 10) / 10;
    const hp = ps;
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'PS',
      powerKw: kw,
      powerPs: ps,
      powerHp: hp,
    };
  }

  // HP / Beygir Gücü
  const hp = Math.round(val);
  const ps = hp;
  const kw = Math.round((val * PS_TO_KW_FACTOR) * 10) / 10;
  return {
    sourceReportedValue: val,
    sourceReportedUnit: 'HP',
    powerKw: kw,
    powerPs: ps,
    powerHp: hp,
  };
}

/**
 * Computes canonical HP from source power value and unit for TR/EU market.
 * PS -> HP: HP = PS (150 PS -> 150 HP)
 * kW -> HP: HP = round(kW * 1.35962) (110 kW -> 150 HP)
 * HP -> HP: no conversion
 * Round to nearest integer.
 */
export function getCanonicalDisplayPowerHp(
  sourceValue?: number | string | null,
  sourceUnit?: string | null,
): number | null {
  if (sourceValue === null || sourceValue === undefined || sourceValue === '') {
    return null;
  }
  const numericVal = typeof sourceValue === 'number'
    ? sourceValue
    : parseFloat(String(sourceValue).replace(/[^\d.]/g, ''));
  if (isNaN(numericVal) || numericVal <= 0) {
    return null;
  }

  const u = (sourceUnit || 'HP').trim().toUpperCase();
  if (u === 'PS' || u === 'BG' || u === 'PK') {
    return Math.round(numericVal);
  }
  if (u === 'KW') {
    return Math.round(numericVal * KW_TO_PS_FACTOR);
  }
  // HP
  return Math.round(numericVal);
}

export interface CanonicalPowerDisplayOptions {
  sourceValue?: number | string | null;
  sourceUnit?: string | null;
  powerSemantic?: string | null;
  isHybrid?: boolean;
}

/**
 * Formats canonical user-facing power display string.
 * Examples:
 * - 217 PS -> "214 HP"
 * - 122 PS (TOTAL_HYBRID_SYSTEM_POWER) -> "120 HP (Toplam Hibrit Sistem Gücü)"
 * - 90 kW -> "121 HP"
 * - 170 HP -> "170 HP"
 * - null -> "—"
 */
export function formatCanonicalPowerDisplay(
  sourceValueOrOptions?: number | string | null | CanonicalPowerDisplayOptions,
  sourceUnit?: string | null,
  powerSemantic?: string | null,
): string {
  let val: number | string | null | undefined;
  let unit: string | null | undefined;
  let semantic: string | null | undefined;
  let isHybrid = false;

  if (
    sourceValueOrOptions !== null &&
    typeof sourceValueOrOptions === 'object'
  ) {
    val = sourceValueOrOptions.sourceValue;
    unit = sourceValueOrOptions.sourceUnit;
    semantic = sourceValueOrOptions.powerSemantic;
    isHybrid = Boolean(sourceValueOrOptions.isHybrid);
  } else {
    val = sourceValueOrOptions;
    unit = sourceUnit;
    semantic = powerSemantic;
  }

  const canonicalHp = getCanonicalDisplayPowerHp(val, unit);
  if (canonicalHp === null) {
    return '—';
  }

  const isHybridSystem = isHybrid || semantic === 'TOTAL_HYBRID_SYSTEM_POWER';
  return isHybridSystem ? `${canonicalHp} HP (Toplam Hibrit Sistem Gücü)` : `${canonicalHp} HP`;
}
