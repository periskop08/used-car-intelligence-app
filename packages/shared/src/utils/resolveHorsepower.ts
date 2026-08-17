/**
 * Canonical Turkish Market Engine Horsepower (HP) Lookup Dictionary
 * Maps standard engine codes and versions to exact Turkish market HP ratings.
 */
const CANONICAL_ENGINE_HP_MAP: Record<string, number> = {
  // Fiat / Alfa / Lancia
  "1.4 FIRE": 95,
  "1.4 T-JET": 120,
  "1.6 MPI": 110,
  "1.3 MULTIJET": 95,
  "1.6 MULTIJET": 120,
  "2.0 MULTIJET": 165,
  "1.5 HYBRID": 130,

  // Renault / Dacia
  "0.9 TCE": 90,
  "1.0 TCE": 100,
  "1.2 TCE": 125,
  "1.3 TCE": 140,
  "1.5 DCI": 110,
  "1.6 DCI": 130,
  "1.6 16V": 115,
  "1.0 SCE": 65,

  // VW Group (VW, Audi, Seat, Skoda)
  "1.0 TSI": 110,
  "1.2 TSI": 105,
  "1.4 TSI": 125,
  "1.5 TSI": 150,
  "1.8 TSI": 180,
  "2.0 TSI": 220,
  "1.6 TDI": 115,
  "2.0 TDI": 150,
  "1.4 TDI": 90,
  "1.0 MPI": 75,
  "1.6 FSI": 115,

  // Peugeot / Citroen / Opel (PSA / Stellantis)
  "1.2 PURETECH": 130,
  "1.6 THP": 156,
  "1.6 PURETECH": 180,
  "1.4 HDI": 70,
  "1.6 HDI": 115,
  "1.6 BLUEHDI": 120,
  "1.5 BLUEHDI": 130,
  "2.0 BLUEHDI": 180,
  "1.4 BENZIN": 90,
  "1.4 DIESEL": 90,

  // Ford
  "1.0 ECOBOOST": 125,
  "1.5 ECOBOOST": 150,
  "1.6 ECOBOOST": 180,
  "2.0 ECOBOOST": 250,
  "1.4 TDCI": 68,
  "1.5 TDCI": 120,
  "1.6 TDCI": 115,
  "2.0 TDCI": 163,
  "1.6 TI-VCT": 125,

  // Hyundai / Kia
  "1.0 T-GDI": 120,
  "1.2 MPI": 84,
  "1.4 MPI": 100,
  "1.4 T-GDI": 140,
  "1.6 GDI": 135,
  "1.6 T-GDI": 177,
  "1.4 CRDI": 90,
  "1.6 CRDI": 136,
  "2.0 CRDI": 185,

  // Honda
  "1.5 I-VTEC": 130,
  "1.6 I-VTEC": 125,
  "1.5 VTEC TURBO": 182,
  "1.6 I-DTEC": 120,
  "2.0 VTEC": 155,

  // Toyota
  "1.0 VVT-I": 72,
  "1.33 VVT-I": 99,
  "1.6 VVT-I": 132,
  "1.8 HYBRID": 122,
  "2.0 HYBRID": 184,
  "1.4 D-4D": 90,
  "2.0 D-4D": 126,

  // BMW / Mini
  "116I": 136,
  "118I": 140,
  "320I": 170,
  "520I": 170,
  "530I": 252,
  "116D": 116,
  "118D": 150,
  "320D": 190,
  "520D": 190,

  // Mercedes-Benz
  "A 180": 136,
  "A 200": 163,
  "C 180": 156,
  "C 200": 184,
  "E 180": 156,
  "E 200": 197,
  "A 180 D": 116,
  "C 200 D": 160,
  "E 220 D": 194,

  // Nissan
  "1.2 DIG-T": 115,
  "1.3 DIG-T": 158,
  "1.6 DIG-T": 163,

  // Volvo
  "T3": 152,
  "T4": 190,
  "T5": 250,
  "D2": 120,
  "D3": 150,
  "D4": 190
};

/**
 * Resolves exact Horsepower (HP) for a vehicle variant based on DB specs,
 * engine codes, title strings, and Turkish market canonical lookup tables.
 */
export function resolveHorsepower(v: any): number | null {
  if (!v) return null;

  // 1. Direct explicit HP regex check in engine code, name, description, or trim name
  const textSources = [
    v.engine?.code,
    v.engine?.name,
    v.engine?.description,
    v.trim?.name,
  ].filter(Boolean);

  for (const text of textSources) {
    const hpMatch = String(text).match(/\b(\d{2,3})\s*(?:hp|bg|ps|bhp|kw)\b/i);
    if (hpMatch) {
      const parsed = parseInt(hpMatch[1], 10);
      if (parsed >= 40 && parsed <= 1000) {
        return parsed;
      }
    }
  }

  // 2. Direct TechnicalSpec JSON check
  const specsObj = typeof v.specs?.specs === "object" && v.specs?.specs ? v.specs.specs : v.specs;
  if (specsObj) {
    const candidatePower = specsObj.enginePower || specsObj.enginePowerHp || specsObj.maxPowerHp || specsObj.horsepower;
    if (typeof candidatePower === "number" && candidatePower >= 40 && candidatePower <= 1000) {
      return candidatePower;
    }
    if (typeof candidatePower === "string") {
      const match = candidatePower.match(/(\d{2,3})/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed >= 40 && parsed <= 1000) return parsed;
      }
    }
  }

  // 3. Engine code matching with canonical Turkish market HP dictionary
  const rawCode = (v.engine?.code || v.engine?.name || "").trim().toUpperCase();
  if (rawCode) {
    for (const [key, hp] of Object.entries(CANONICAL_ENGINE_HP_MAP)) {
      if (rawCode.includes(key) || key.includes(rawCode)) {
        return hp;
      }
    }

    // Try substring matching without punctuation
    const cleanCode = rawCode.replace(/[^A-Z0-9\s]/g, "");
    for (const [key, hp] of Object.entries(CANONICAL_ENGINE_HP_MAP)) {
      const cleanKey = key.replace(/[^A-Z0-9\s]/g, "");
      if (cleanCode.includes(cleanKey)) {
        return hp;
      }
    }
  }

  // 4. DB Engine horsepower field fallback if between 40 and 1000
  if (typeof v.engine?.horsepower === "number" && v.engine.horsepower >= 40 && v.engine.horsepower <= 1000) {
    return v.engine.horsepower;
  }

  return null;
}
