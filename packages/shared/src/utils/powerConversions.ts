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

/**
 * Converts reported power values (HP, PS, kW) to canonical normalized units
 * using standard automotive physics conversion constants.
 */
export function convertPowerUnits(value: number, unit: string): ConvertedPower {
  const normalizedUnit = (unit || 'HP').trim().toUpperCase();
  const val = Number(value);

  if (normalizedUnit === 'KW') {
    const hp = Math.round(val * 1.34102);
    const ps = Math.round(val * 1.35962);
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'KW',
      powerKw: val,
      powerPs: ps,
      powerHp: hp,
    };
  }

  if (normalizedUnit === 'PS' || normalizedUnit === 'BG') {
    const hp = Math.round(val * 0.98632);
    const kw = Math.round((val * 0.7355) * 10) / 10;
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'PS',
      powerKw: kw,
      powerPs: val,
      powerHp: hp,
    };
  }

  // Default: HP (BHP)
  const ps = Math.round(val * 1.01387);
  const kw = Math.round((val * 0.7457) * 10) / 10;
  return {
    sourceReportedValue: val,
    sourceReportedUnit: 'HP',
    powerKw: kw,
    powerPs: ps,
    powerHp: val,
  };
}
