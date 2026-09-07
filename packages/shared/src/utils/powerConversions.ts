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
 *
 * TORQUESCOUT USER-FACING POWER CONVENTION:
 * The field displayed to Turkish users as "Motor Gücü (HP)" uses the manufacturer-market
 * nominal metric horsepower value (PS / bg) as the canonical user-facing integer power convention.
 * Therefore: 147 kW / 200 PS -> TorqueScout displays 200 HP.
 */
export function convertPowerUnits(value: number, unit: string): ConvertedPower {
  const normalizedUnit = (unit || 'PS').trim().toUpperCase();
  const val = Number(value);

  if (normalizedUnit === 'KW') {
    const ps = Math.round(val * 1.35962);
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'KW',
      powerKw: val,
      powerPs: ps,
      powerHp: ps, // Canonical TorqueScout convention: PS/bg is the user-facing HP integer
    };
  }

  if (normalizedUnit === 'PS' || normalizedUnit === 'BG') {
    const ps = Math.round(val);
    const kw = Math.round((val * 0.73549875) * 10) / 10;
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'PS',
      powerKw: kw,
      powerPs: ps,
      powerHp: ps, // Nominal manufacturer PS/bg used directly as user-facing HP
    };
  }

  // Imperial BHP: normalize to canonical metric horsepower convention
  if (normalizedUnit === 'BHP') {
    const ps = Math.round(val * 1.01387);
    const kw = Math.round((val * 0.7457) * 10) / 10;
    return {
      sourceReportedValue: val,
      sourceReportedUnit: 'HP',
      powerKw: kw,
      powerPs: ps,
      powerHp: ps,
    };
  }

  // Generic HP: In Turkish/EU automotive context, 'HP' in catalog sources usually means PS/bg (e.g. 200 HP = 200 PS).
  const ps = Math.round(val);
  const kw = Math.round((val * 0.73549875) * 10) / 10;
  return {
    sourceReportedValue: val,
    sourceReportedUnit: 'HP',
    powerKw: kw,
    powerPs: ps,
    powerHp: ps,
  };
}
