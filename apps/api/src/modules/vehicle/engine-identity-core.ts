import { FuelType } from '@prisma/client';

export type EngineResolutionStatus =
  | 'ENGINE_EXISTING_EXACT_MATCH'
  | 'ENGINE_CREATED_NEW_DISTINCT'
  | 'ENGINE_IDENTITY_REVIEW_REQUIRED'
  | 'ENGINE_FIELD_CONTAMINATION'
  | 'ENGINE_INVALID_INPUT';

export interface EngineResolutionInput {
  rawCode: string;
  displacement?: number | null;
  fuelType?: FuelType | string | null;
  horsepower?: number | null;
  torque?: number | null;
  hasTurbo?: boolean | null;
  contextBrand?: string | null;
  contextModel?: string | null;
}

export interface EngineResolutionResult {
  status: EngineResolutionStatus;
  engineId?: string | null;
  resolvedCode?: string | null;
  reason: string;
  candidateEngineIds?: string[];
  candidateEngineCodes?: string[];
  newEngineData?: {
    code: string;
    displacement: number;
    horsepower: number | null;
    torque: number | null;
    fuelType: FuelType;
    hasTurbo: boolean;
  };
}

const CONTAMINATED_PATTERNS = [
  /^STANDART$/i,
  /^STANDARD$/i,
  /^DONANIM$/i,
  /^PAKET$/i,
  /^PACKAGE$/i,
  /^TRIM$/i,
  /^BASE$/i,
  /^DESIGNO$/i,
  /^ACTIVE$/i,
  /^COMFORT$/i,
  /^ELEGANCE$/i,
  /^EXECUTIVE$/i,
];

const TECHNICAL_DISTINCTION_TOKENS = [
  'TURBO', 'T-GDI', 'TGDI', 'TSI', 'TFSI', 'FSI', 'MPI', 'GDI',
  'TDI', 'TDCI', 'CRDI', 'CDI', 'DCI', 'HDI', 'BLUEHDI',
  'HYBRID', 'HEV', 'PHEV', 'MHEV', 'RECHARGE', 'SUPERCHARGED', 'KOMPRESSOR',
  'C180', 'C200', 'C220', 'C250', 'C300', 'COOPER S', 'JCW', 'GTI', 'Q4'
];

/**
 * Safe Lexical Normalization
 * Trims leading/trailing whitespace, collapses internal repeated spaces, converts to lowercase.
 */
export function normalizeCode(code: string): string {
  if (!code) return '';
  return code.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9]/g, '');
}

/**
 * Field Contamination Guard
 * Detects empty strings or generic trim/package descriptors mistakenly passed into engine code field.
 */
export function isContaminated(code: string): boolean {
  if (!code || !code.trim()) return true;
  const clean = code.trim().toUpperCase();
  return CONTAMINATED_PATTERNS.some((pattern) => pattern.test(clean));
}

/**
 * Checks if two engine codes have an explicit technical or performance distinction.
 */
export function hasTechnicalDistinction(codeA: string, codeB: string): boolean {
  const normA = codeA.toUpperCase();
  const normB = codeB.toUpperCase();

  for (const token of TECHNICAL_DISTINCTION_TOKENS) {
    const hasA = normA.includes(token);
    const hasB = normB.includes(token);
    if (hasA !== hasB) {
      return true;
    }
  }
  return false;
}

/**
 * Parses horsepower safely without hardcoding 110 or 100 fake defaults.
 */
export function parseHorsepowerSafely(rawCode: string, providedHp?: number | null): number | null {
  if (providedHp && providedHp > 0 && providedHp !== 110 && providedHp !== 100) {
    return providedHp;
  }
  if (!rawCode) return null;

  const match = rawCode.match(/(\d+)\s*(hp|ps|bhp|kw)/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (parsed > 20 && parsed < 2000) {
      return parsed;
    }
  }
  return null; // Return null if unverified, NEVER fallback to hardcoded 110/100 fake HP!
}

/**
 * Pure Canonical Engine Identity Resolver Core.
 * Can be used in both NestJS services and standalone CLI scripts.
 */
export function resolveEngineCore(
  input: EngineResolutionInput,
  existingEngines: Array<{ id: string; code: string; displacement: number; horsepower: number | null; fuelType: any }>,
): EngineResolutionResult {
  const rawCode = (input.rawCode || '').trim();

  // 1. FIELD CONTAMINATION & INVALID INPUT GUARD
  if (!rawCode || isContaminated(rawCode)) {
    return {
      status: 'ENGINE_FIELD_CONTAMINATION',
      reason: `Field contamination detected: rawCode "${rawCode}" is empty or generic trim descriptor ("STANDART").`,
    };
  }

  const normIncoming = normalizeCode(rawCode);

  // 2. CHECK EXACT NORMALIZED MATCH
  for (const eng of existingEngines) {
    const normEng = normalizeCode(eng.code || '');
    if (normIncoming === normEng) {
      return {
        status: 'ENGINE_EXISTING_EXACT_MATCH',
        engineId: eng.id,
        resolvedCode: eng.code,
        reason: `Exact normalized string match found with existing Engine record (${eng.code}). Reusing existing Engine ID.`,
      };
    }
  }

  // 3. CHECK AMBIGUITY & SEMANTIC VARIATION (Base vs Descriptor)
  const incomingDisplacement = input.displacement || 0;
  const incomingFuel = input.fuelType ? String(input.fuelType).toUpperCase() : null;

  const ambiguousCandidates: typeof existingEngines = [];

  for (const eng of existingEngines) {
    const engCode = eng.code || '';
    const normEng = normalizeCode(engCode);
    const sameDisplacement = incomingDisplacement > 0 && eng.displacement === incomingDisplacement;
    const sameFuel = incomingFuel && String(eng.fuelType).toUpperCase() === incomingFuel;

    if (sameDisplacement && sameFuel) {
      const isAInB = normEng.includes(normIncoming);
      const isBInA = normIncoming.includes(normEng);

      if ((isAInB || isBInA) && !hasTechnicalDistinction(rawCode, engCode)) {
        ambiguousCandidates.push(eng);
      }
    }
  }

  if (ambiguousCandidates.length > 0) {
    const candCodes = ambiguousCandidates.map((c) => c.code);
    const candIds = ambiguousCandidates.map((c) => c.id);

    return {
      status: 'ENGINE_IDENTITY_REVIEW_REQUIRED',
      reason: `Ambiguous engine variation detected between "${rawCode}" and existing candidate engines (${candCodes.join(', ')}). Sent to review/quarantine to prevent silent duplication.`,
      candidateEngineIds: candIds,
      candidateEngineCodes: candCodes,
    };
  }

  // 4. LEGITIMATE NEW DISTINCT ENGINE CREATION DATA
  const safeHp = parseHorsepowerSafely(rawCode, input.horsepower);
  const safeFuel = (input.fuelType as FuelType) || FuelType.PETROL;

  return {
    status: 'ENGINE_CREATED_NEW_DISTINCT',
    reason: `Legitimate distinct new Engine record data prepared safely without hardcoded fake HP defaults.`,
    newEngineData: {
      code: rawCode,
      displacement: incomingDisplacement,
      horsepower: safeHp,
      torque: input.torque || null,
      fuelType: safeFuel,
      hasTurbo: input.hasTurbo ?? (rawCode.toUpperCase().includes('TURBO') || rawCode.toUpperCase().includes('T-GDI')),
    },
  };
}
