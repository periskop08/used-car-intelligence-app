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
// TorqueScout Advanced AI Comparison Engine (v5.0) Types
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
  evidenceQuality?: {
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    missingFields: string[];
  };
  calculatedScenarioScores?: Record<string, ScenarioScore>;
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
  schemaVersion: '5.0';
  promptVersion: '5';
  engineVersion: 'comparison-v5';
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
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  vehicleCards?: ComparisonVehicleCard[];
  vehicleHighlights?: VehicleHighlight[];
  scenarioRecommendations: ScenarioRecommendation[];
  vehicleVerdicts: VehicleVerdict[];
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
    minInputsPct: 0.40, // >= 40% returns score, >= 70% HIGH confidence
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
export * from './turkeyLocations';
export * from './utils/resolveHorsepower';
export * from './utils/powerConversions';


