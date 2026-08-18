// Shared Enums (matching Prisma schema exactly)
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  PRO = 'PRO'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING'
}

export enum ApprovalStatus {
  RAW = 'RAW',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  STALE = 'STALE'
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ProblemType {
  COMMON_PROBLEM = 'COMMON_PROBLEM',
  USER_COMPLAINT = 'USER_COMPLAINT',
  CHECK_POINT = 'CHECK_POINT',
  SERVICE_NOTE = 'SERVICE_NOTE',
  RECALL_RELATED = 'RECALL_RELATED',
  GENERAL_RISK = 'GENERAL_RISK'
}

export enum ResearchScope {
  FULL_REPORT = 'FULL_REPORT',
  COMMON_PROBLEMS = 'COMMON_PROBLEMS',
  RECALLS = 'RECALLS',
  SELLER_QUESTIONS = 'SELLER_QUESTIONS',
  INSPECTION_CHECKLIST = 'INSPECTION_CHECKLIST',
  TECHNICAL_SPECS = 'TECHNICAL_SPECS'
}

export enum SourceKind {
  OFFICIAL_RECALL = 'OFFICIAL_RECALL',
  MANUFACTURER = 'MANUFACTURER',
  SERVICE_NOTE = 'SERVICE_NOTE',
  USER_REVIEW = 'USER_REVIEW',
  FORUM = 'FORUM',
  COMPLAINT_PLATFORM = 'COMPLAINT_PLATFORM',
  BLOG_REVIEW = 'BLOG_REVIEW',
  VIDEO_REVIEW = 'VIDEO_REVIEW',
  ADMIN_DEMO = 'ADMIN_DEMO',
  UNKNOWN = 'UNKNOWN',
  MOCK = 'MOCK'
}

export enum DataConfidence {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum ResearchJobStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum DataCoverage {
  NONE = 'NONE',
  LIMITED = 'LIMITED',
  MODERATE = 'MODERATE',
  GOOD = 'GOOD'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum TransmissionType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  DCT = 'DCT',
  CVT = 'CVT'
}

export enum FeatureKey {
  AI_CHAT = 'AI_CHAT',
  VEHICLE_COMPARISON = 'VEHICLE_COMPARISON'
}

export enum UsagePeriodType {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  LIFETIME = 'LIFETIME'
}

export enum SourceType {
  TECHNICAL_SPEC = 'TECHNICAL_SPEC',
  COMMON_PROBLEM = 'COMMON_PROBLEM',
  RECALL = 'RECALL',
  USER_COMPLAINT = 'USER_COMPLAINT',
  SERVICE_NOTE = 'SERVICE_NOTE',
  MANUAL = 'MANUAL',
  OTHER = 'OTHER'
}

export enum FuelType {
  PETROL = 'PETROL',
  DIESEL = 'DIESEL',
  LPG = 'LPG',
  HYBRID = 'HYBRID',
  PLUG_IN_HYBRID = 'PLUG_IN_HYBRID',
  ELECTRIC = 'ELECTRIC',
  OTHER = 'OTHER'
}

export enum BodyType {
  SEDAN = 'SEDAN',
  HATCHBACK = 'HATCHBACK',
  SUV = 'SUV',
  COUPE = 'COUPE',
  WAGON = 'WAGON',
  PICKUP = 'PICKUP',
  VAN = 'VAN',
  CONVERTIBLE = 'CONVERTIBLE',
  MINIVAN = 'MINIVAN',
  OTHER = 'OTHER'
}

export enum VehicleInfoCategory {
  ENGINE = 'ENGINE',
  TRANSMISSION = 'TRANSMISSION',
  ELECTRONICS = 'ELECTRONICS',
  SUSPENSION = 'SUSPENSION',
  BRAKE = 'BRAKE',
  BODY = 'BODY',
  PAINT = 'PAINT',
  INTERIOR = 'INTERIOR',
  TIRES = 'TIRES',
  TEST_DRIVE = 'TEST_DRIVE',
  MAINTENANCE = 'MAINTENANCE',
  DOCUMENTS = 'DOCUMENTS',
  GENERAL = 'GENERAL'
}

export enum FinalDecision {
  BUY = 'BUY',
  BUY_CAREFULLY = 'BUY_CAREFULLY',
  RISKY = 'RISKY',
  AVOID = 'AVOID',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  BUYABLE = 'BUYABLE',
  BUY_WITH_CAUTION = 'BUY_WITH_CAUTION'
}

// Plan Limit Interfaces
export interface LimitConfig {
  period: 'daily' | 'monthly' | 'lifetime';
  limit: number | null;
}

export interface PlanLimits {
  aiChat: LimitConfig;
  vehicleComparison: LimitConfig;
  favoriteVehicle: LimitConfig;
  sellerQuestions: boolean;
  inspectionChecklist: boolean;
  detailedRiskNotes: boolean;
}

// AI Interfaces
export interface AiReportInput {
  variantId: string;
  brand: string;
  model: string;
  year: number;
  engine: string;
  transmission: string;
  trim: string;
  technicalSpecs: any;
  problems: Array<{ title: string; description: string; riskLevel: RiskLevel }>;
  recalls: Array<{ title: string; description: string }>;
  averageRatings: {
    reliability: number;
    fuel: number;
    comfort: number;
    maintenance: number;
    resale: number;
  };
}

export interface AiReportOutput {
  summary: string;
  should_buy_comment: string;
  biggest_risks: string[];
  engine_notes: string;
  transmission_notes: string;
  electronics_notes: string;
  body_notes: string;
  seller_questions: string[];
  inspection_checklist: string[];
  risk_score: number;
  buyability_score: number;
  final_decision: FinalDecision;
}

export function formatFuelType(fuelType: string | null | undefined): string {
  if (!fuelType) return 'Benzin';
  const u = fuelType.toString().toUpperCase().trim();
  if (u === 'PETROL' || u === 'BENZIN') return 'Benzin';
  if (u === 'DIESEL' || u === 'DIZEL') return 'Dizel';
  if (u === 'HYBRID' || u === 'PLUG_IN_HYBRID' || u === 'HIBRIT') return 'Hibrit';
  if (u === 'ELECTRIC' || u === 'ELEKTRIK') return 'Elektrik';
  if (u === 'LPG' || u.includes('LPG')) return 'LPG & Benzin';
  return 'Benzin';
}

// ----------------------------------------------------
// TorqueScout Advanced AI Comparison Engine (v6.0) Types
// ----------------------------------------------------

export type ComparisonPriority =
  | 'BALANCED'
  | 'FUEL_ECONOMY'
  | 'COMFORT'
  | 'PERFORMANCE'
  | 'HANDLING'
  | 'LOW_MAINTENANCE'
  | 'FAMILY'
  | 'CITY_USE'
  | 'HIGHWAY'
  | 'RESALE_VALUE';

// 8 Evidence-Based Criteria Definitions (v8)
export type CriterionKey =
  | 'RELIABILITY'           // 1. Mekanik güvenilirlik ve kronik risk (%20)
  | 'FAILURE_SEVERITY'      // 2. Arıza ciddiyeti ve mekanik dayanıklılık (%15)
  | 'SEVERITY_DURABILITY'   // Alias for backwards compatibility
  | 'FUEL_EFFICIENCY'       // 3. Yakıt tüketimi ve verimlilik (%10)
  | 'USAGE_SUITABILITY'     // 4. Kullanım Senaryosu ve Kullanıcı Uyumu (%15)
  | 'SAFETY'                // Legacy criterion / unrated info
  | 'PERFORMANCE'           // 5. Motor, şanzıman ve sürüş performansı (%10)
  | 'COMFORT'               // 6. Konfor ve sürüş kalitesi (%10)
  | 'PRACTICALITY'          // 7. Kullanışlılık ve yaşam alanı (%10)
  | 'EQUIPMENT_TECHNOLOGY'  // 8. Donanım ve teknoloji seviyesi (%10)
  | 'VALUE_FOR_MONEY';      // Legacy alias for backwards compatibility

export const CRITERIA_WEIGHTS: Record<string, number> = {
  RELIABILITY: 20,
  FAILURE_SEVERITY: 15,
  FUEL_EFFICIENCY: 10,
  USAGE_SUITABILITY: 15,
  PERFORMANCE: 10,
  COMFORT: 10,
  PRACTICALITY: 10,
  EQUIPMENT_TECHNOLOGY: 10,
};

export interface MarketPriceEvidence {
  minPrice?: number;
  maxPrice?: number;
  currency: 'TRY';
  sampleCount?: number;
  asOfDate?: string;
  matchQuality?: 'EXACT' | 'COMPARABLE' | 'GENERAL_MODEL' | 'UNKNOWN';
  sourceType?: 'LISTING_ANALYSIS' | 'SNAPSHOT' | 'VERIFIED_DATABASE' | 'INSUFFICIENT';
}

export interface EquipmentFeatureStatus {
  featureKey: string;
  status: 'PRESENT' | 'ABSENT' | 'NOT_MENTIONED';
  evidenceText: string | null;
  supportingFactIds: string[];
}

export interface CriterionAssessment {
  criterionKey: CriterionKey;
  score: number | null; // 0–100 or null if data insufficient
  stars: number | null; // Calculated by backend: rounded to nearest 0.5 stars
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  evidenceGrade?: 'VERIFIED' | 'REPORT_DERIVED';
  summary: string;
  positiveFactors: string[];
  compromises?: string[];
  negativeFactors?: string[];
  supportingFactIds: string[];
  missingInputs?: string[];
  insufficientData?: boolean;
  marketPriceEvidence?: MarketPriceEvidence; // ONLY for Criterion 8
  equipmentFeatureStatuses?: EquipmentFeatureStatus[]; // Structural feature matrix for Criterion 8
}

export interface VehicleCriterionEvaluation {
  vehicleId: string;
  vehicleName: string;
  assessments: Record<string, CriterionAssessment>;
  overallScore: number | null; // Normalized weighted average over valid criteria
  overallStars: number | null; // Rounded to nearest 0.5 stars
  coveragePct: number; // Percentage of criteria with valid scores (e.g. 87.5%)
  coverageTooLow: boolean; // True if coverage < 60% (<5 valid criteria)
}

export interface ComparisonCriterionResult {
  vehicleEvaluations: VehicleCriterionEvaluation[];
  criterionRankings: Record<string, {
    winnerVehicleIds: string[];
    winnerVehicleNames: string[];
    isTie: boolean;
    insufficientData: boolean;
    reasoning: string;
  }>;
}

export interface ScenarioScore {
  score: number | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  positiveFactors: string[];
  negativeFactors: string[];
  missingInputs: string[];
}

export interface DataWarning {
  vehicleId?: string;
  section: 'TECHNICAL' | 'RELIABILITY' | 'OWNERSHIP' | 'RESALE' | 'COMFORT' | 'GENERAL';
  message: string;
  severity: 'INFO' | 'WARNING';
}

export interface ComparisonProblem {
  title: string;
  affectedComponent?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  frequency?: 'RARE' | 'OCCASIONAL' | 'COMMON' | 'VERY_COMMON';
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  typicalMileageFrom?: number;
  typicalMileageTo?: number;
  preventiveAction?: string;
  inspectionHint?: string;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ComparisonRecall {
  title: string;
  description: string;
  safetyRisk?: string;
  remedy?: string;
}

export interface ComparisonVehicleProfile {
  vehicleId: string;
  displayName: string;
  identity: {
    brand: string;
    model: string;
    generation?: string;
    year: number;
    bodyType?: string;
    engine?: string;
    engineCode?: string;
    transmission?: string;
    transmissionCode?: string;
    fuelType?: string;
    trim?: string;
    drivetrain?: string;
    market?: string;
  };
  performance: {
    horsepower?: number;
    torqueNm?: number;
    zeroToHundred?: number;
    topSpeed?: number;
    drivingCharacter?: string;
  };
  efficiency: {
    combinedConsumption?: number;
    cityConsumption?: number;
    highwayConsumption?: number;
    fuelEconomySummary?: string;
  };
  practicality: {
    bootLitres?: number;
    rearSeatSpace?: string;
    cityUsability?: string;
    familyUsability?: string;
    parkingEase?: string;
  };
  comfortAndHandling: {
    rideComfort?: number;
    handling?: number;
    cabinNoise?: number;
    longDistanceComfort?: number;
    badWeatherConfidence?: number;
    summary?: string;
  };
  ownership: {
    routineMaintenanceCost?: number;
    partsCost?: number;
    serviceAvailability?: number;
    resaleDemand?: number;
    depreciationRisk?: number;
    ownershipSummary?: string;
  };
  reliability: {
    buyabilityScore?: number;
    riskScore?: number;
    problems: ComparisonProblem[];
    recalls?: ComparisonRecall[];
    reliabilitySummary?: string;
  };
  sellerQuestions: string[];
  inspectionChecklist: string[];
  evidenceQuality: {
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    missingFields: string[];
  };
  calculatedScenarioScores?: Record<string, ScenarioScore>;
  dossier?: any;
}

export interface ComparisonQualityCheck {
  allVehiclesCovered: boolean;
  allVehicleVerdictsComplete: boolean;
  minimumNarrativeLengthMet: boolean;
  noUnsupportedWinner: boolean;
  noTechnicalContradiction: boolean;
  noUnsupportedOwnershipClaim: boolean;
  noUnsupportedResaleClaim: boolean;
  noRiskCountBasedConclusion: boolean;
  noGenericSummary: boolean;
  noRawMarkdown: boolean;
  scenarioCoverageValid: boolean;
  riskNarrativeValid: boolean;
}

export interface RiskComparisonItem {
  vehicleId: string;
  vehicleName: string;
  problemTitle: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  frequency?: string;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  typicalMileageFrom?: number;
  typicalMileageTo?: number;
  evidenceConfidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  detectability: 'EASY' | 'MODERATE' | 'DIFFICULT' | 'UNKNOWN';
  narrative: string;
}

export interface RecallComparisonItem {
  vehicleId: string;
  vehicleName: string;
  campaignCode?: string;
  title: string;
  description: string;
  safetyImpact?: string;
  affectedYears?: string;
  verificationInstruction: string;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ScenarioRecommendation {
  scenarioKey: string;
  title: string;
  recommendedVehicleIds: string[];
  recommendedVehicleNames: string[];
  reasoning: string;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  supportingFacts?: string[];
  missingInputs?: string[];
  caveat?: string;
}

export interface VehicleVerdict {
  vehicleId: string;
  vehicleName: string;
  characterSummary: string;
  bestFor: string[];
  notIdealFor: string[];
  gains: string[];
  compromises: string[];
  criticalRisks: string[];
  prePurchaseChecks: string[];
  evidenceConfidence?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DecisionMatrixRow {
  criterion: string;
  winnerVehicleIds: string[];
  winnerNames: string[];
  reason: string;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  insufficientData?: boolean;
}

export interface ComparisonVehicleCard {
  vehicleId: string;
  vehicleName: string;
  identity: {
    year?: number;
    engine?: string;
    transmission?: string;
    trim?: string;
  };
  characterSummary?: string;
  strengths: string[];
  cautions: string[];
  bestFor: string[];
  notIdealFor: string[];
  criticalRisks?: {
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    shortExplanation?: string;
  }[];
  prePurchaseChecks: string[];
  supportingFacts: string[];
  evidenceConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface VehicleHighlight {
  vehicleId: string;
  vehicleName: string;
  strengths: string[];
  cautions: string[];
  supportingFacts: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FinalDecisionGuideRow {
  priority: string;
  recommendedVehicleName: string;
  explanation: string;
}

export interface VehicleComparisonResult {
  comparisonId: string;
  schemaVersion: '5.0' | '6.0' | '7.0' | '8.0';
  promptVersion: '5' | '6' | '7' | '8';
  engineVersion: 'comparison-v5' | 'comparison-v6' | 'comparison-v7' | 'comparison-v8';
  generationMode: 'AI' | 'FALLBACK';
  generatedAt: string;
  sourceDataVersion: string;
  selectedPriority: ComparisonPriority;
  headline: string;
  executiveSummary: string;
  overallRecommendation: {
    vehicleId?: string;
    vehicleName?: string;
    label: 'En Dengeli Seçenek' | 'Kullanım Önceliğine Göre Değişiyor' | 'Net Kazanan İçin Yeterli Veri Yok';
    reasoning: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT';
  };
  vehicleCards?: ComparisonVehicleCard[];
  vehicleHighlights?: VehicleHighlight[];
  scenarioRecommendations: ScenarioRecommendation[];
  vehicleVerdicts: VehicleVerdict[];
  criterionResult?: ComparisonCriterionResult; // 8-Criteria Assessments & Rankings
  riskComparison: {
    narrative: string;
    items?: RiskComparisonItem[];
    lowestRiskVehicleId?: string;
    highestRiskVehicleId?: string;
  };
  recallComparison?: RecallComparisonItem[];
  ownershipCostComparison: {
    title?: 'Sahiplik ve Bakım Maliyeti Karşılaştırması' | 'Yakıt Maliyeti Karşılaştırması';
    narrative: string;
    lowestEstimatedCostVehicleId?: string;
    highestEstimatedCostVehicleId?: string;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
    insufficientDataForTotalRanking?: boolean;
  };
  narrativeRecommendation: string;
  decisionMatrix: DecisionMatrixRow[];
  finalDecisionGuide: FinalDecisionGuideRow[];
  dataWarnings: DataWarning[];
}

/**
 * Backend calculation helper for 8-Criteria Assessments.
 * Computes stars (rounded to 0.5 stars), normalized weighted overall score,
 * and data coverage percentage per vehicle.
 */
export function computeBackendCriterionMetrics(
  evaluations: Record<string, Partial<CriterionAssessment>>,
  vehicleId: string,
  vehicleName: string,
): VehicleCriterionEvaluation {
  const keys = [
    'RELIABILITY',
    'FAILURE_SEVERITY',
    'FUEL_EFFICIENCY',
    'USAGE_SUITABILITY',
    'PERFORMANCE',
    'COMFORT',
    'PRACTICALITY',
    'EQUIPMENT_TECHNOLOGY',
  ];

  let weightedSum = 0;
  let validWeightSum = 0;
  let validCount = 0;

  const processedAssessments: Record<string, CriterionAssessment> = {};

  for (const key of keys) {
    // Check key or legacy aliases
    const raw = evaluations[key] ||
      (key === 'FAILURE_SEVERITY' ? evaluations['SEVERITY_DURABILITY'] : undefined) ||
      (key === 'EQUIPMENT_TECHNOLOGY' ? evaluations['VALUE_FOR_MONEY'] : undefined);

    const rawScore = (raw && typeof raw.score === 'number' && !isNaN(raw.score)) ? raw.score : null;
    const isInsufficient = rawScore === null || raw?.insufficientData === true || raw?.confidence === 'INSUFFICIENT';

    const stars = isInsufficient ? null : Math.max(0.5, Math.min(5, Math.round((rawScore! / 20) * 2) / 2));

    const positiveFactors = Array.isArray(raw?.positiveFactors) ? raw!.positiveFactors : [];
    const compromises = Array.isArray(raw?.compromises)
      ? raw!.compromises
      : (Array.isArray(raw?.negativeFactors) ? raw!.negativeFactors : []);

    const supportingFactIds = Array.isArray(raw?.supportingFactIds) ? raw!.supportingFactIds : [];
    const evidenceGrade: 'VERIFIED' | 'REPORT_DERIVED' = (raw as any)?.evidenceGrade || 
      (supportingFactIds.length > 0 ? 'VERIFIED' : 'REPORT_DERIVED');

    let confidence = (raw?.confidence as any) || (isInsufficient ? 'INSUFFICIENT' : 'MEDIUM');
    if (evidenceGrade === 'REPORT_DERIVED' && confidence === 'HIGH') {
      confidence = 'MEDIUM';
    }

    processedAssessments[key] = {
      criterionKey: key as CriterionKey,
      score: isInsufficient ? null : rawScore,
      stars,
      confidence,
      evidenceGrade,
      summary: raw?.summary || (isInsufficient ? 'Bu kriter için yeterli veri bulunmuyor.' : ''),
      positiveFactors,
      compromises,
      negativeFactors: compromises,
      supportingFactIds,
      missingInputs: Array.isArray(raw?.missingInputs) ? raw!.missingInputs : [],
      insufficientData: isInsufficient,
      equipmentFeatureStatuses: key === 'EQUIPMENT_TECHNOLOGY' ? raw?.equipmentFeatureStatuses : undefined,
    };

    if (!isInsufficient && rawScore !== null) {
      const weight = CRITERIA_WEIGHTS[key] || 10;
      weightedSum += rawScore * weight;
      validWeightSum += weight;
      validCount++;
    }
  }

  // Requirement 4: Mandatory 8/8 coverage. Overall score & stars generated ONLY IF all 8 criteria are non-null and verified.
  const hasFull8Coverage = validCount === 8;

  return {
    vehicleId,
    vehicleName,
    assessments: processedAssessments,
    overallScore: (hasFull8Coverage && validWeightSum > 0) ? Math.round((weightedSum / validWeightSum) * 10) / 10 : null,
    overallStars: (hasFull8Coverage && validWeightSum > 0) ? Math.max(0.5, Math.min(5, Math.round(((weightedSum / validWeightSum) / 20) * 2) / 2)) : null,
    coveragePct: Math.round((validCount / 8) * 100),
    coverageTooLow: !hasFull8Coverage,
  };
}

/**
 * Adapter for backward compatibility with legacy comparison results in DB cache.
 * Converts legacy vehicleHighlights + vehicleVerdicts into unified ComparisonVehicleCard format.
 */
export function adaptLegacyComparisonResult(result: VehicleComparisonResult): ComparisonVehicleCard[] {
  if (result.vehicleCards && result.vehicleCards.length > 0) {
    return result.vehicleCards;
  }

  const verdictsMap = new Map((result.vehicleVerdicts || []).map(v => [v.vehicleId, v]));
  const highlightsMap = new Map((result.vehicleHighlights || []).map(h => [h.vehicleId, h]));
  const legacyKeys = Array.from(verdictsMap.keys()).concat(Array.from(highlightsMap.keys()));
  const allIds = Array.from(new Set(legacyKeys));

  return allIds.map(id => {
    const v = verdictsMap.get(id);
    const h = highlightsMap.get(id);

    return {
      vehicleId: id,
      vehicleName: v?.vehicleName || h?.vehicleName || 'Araç',
      identity: {},
      characterSummary: v?.characterSummary,
      strengths: v?.gains || h?.strengths || ['Teknik verimlilik'],
      cautions: v?.compromises || h?.cautions || ['Düzenli bakım hassasiyeti'],
      bestFor: v?.bestFor || ['Günlük kullanım'],
      notIdealFor: v?.notIdealFor || ['Aşırı performans beklentisi'],
      criticalRisks: (v?.criticalRisks || []).map(title => ({
        title,
        severity: 'MEDIUM' as const,
      })),
      prePurchaseChecks: (v?.prePurchaseChecks || []).slice(0, 2),
      supportingFacts: h?.supportingFacts || [],
      evidenceConfidence: 'HIGH' as const,
    };
  });
}

export const SCENARIO_SCORING_CONFIG = {
  cityUse: {
    weights: {
      combinedConsumption: 0.35,
      bootLitres: 0.15,
      horsepower: 0.10,
      zeroToHundred: 0.10,
      riskScore: 0.30,
    },
    minInputsPct: 0.40,
  },
  highwayUse: {
    weights: {
      horsepower: 0.30,
      torqueNm: 0.20,
      zeroToHundred: 0.20,
      combinedConsumption: 0.15,
      bootLitres: 0.15,
    },
    minInputsPct: 0.40,
  },
  fuelEconomy: {
    weights: {
      combinedConsumption: 0.80,
      horsepower: 0.20,
    },
    minInputsPct: 0.40,
  },
  reliability: {
    weights: {
      riskScore: 0.70,
      buyabilityScore: 0.30,
    },
    minInputsPct: 0.40,
  },
};

export * from './utils/sanitizeComparisonText';
export * from './utils/validateComparisonSemantics';
export * from './types/reports';
export * from './types/vehicle-report';
