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

export const PS_TO_HP_FACTOR = 0.9863200706;
export const KW_TO_HP_FACTOR = 1.34102209;
export const HP_TO_KW_FACTOR = 0.745699872;
export const PS_TO_KW_FACTOR = 0.73549875;
export const KW_TO_PS_FACTOR = 1.3596216173;
export const HP_TO_PS_FACTOR = 1.0138696654;

/**
 * Converts reported power values (HP, PS, kW) to canonical normalized units
 * using standard automotive physics conversion constants.
 *
 * CANONICAL POWER NORMALIZATION:
 * PS -> HP: HP = PS * 0.9863200706
 * kW -> HP: HP = kW * 1.34102209
 * HP -> HP: no conversion
 *
 * Source data values and units remain preserved and unmutated.
 */
export function convertPowerUnits(value: number, unit: string): ConvertedPower {
  const normalizedUnit = (unit || 'PS').trim().toUpperCase();
  const val = Number(value);

  if (normalizedUnit === 'KW') {
    const ps = Math.round(val * KW_TO_PS_FACTOR);
    const hp = Math.round(val * KW_TO_HP_FACTOR);
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
    const hp = Math.round(val * PS_TO_HP_FACTOR);
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'PS',
      powerKw: kw,
      powerPs: ps,
      powerHp: hp,
    };
  }

  // Imperial BHP / Generic HP
  const hp = Math.round(val);
  const ps = Math.round(val * HP_TO_PS_FACTOR);
  const kw = Math.round((val * HP_TO_KW_FACTOR) * 10) / 10;
  return {
    sourceReportedValue: val,
    sourceReportedUnit: 'HP',
    powerKw: kw,
    powerPs: ps,
    powerHp: hp,
  };
}

/**
 * Computes canonical HP from source power value and unit.
 * PS -> HP: HP = PS * 0.9863200706
 * kW -> HP: HP = kW * 1.34102209
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
    return Math.round(numericVal * PS_TO_HP_FACTOR);
  }
  if (u === 'KW') {
    return Math.round(numericVal * KW_TO_HP_FACTOR);
  }
  // HP or BHP
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
