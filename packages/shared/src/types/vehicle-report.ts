export type VehicleReportMode = 'VEHICLE_REPORT' | 'LISTING_REPORT' | 'TORQUE_SCOUT_VEHICLE_REPORT';
export type VehicleReportEntryPoint = 'VEHICLE_SEARCH' | 'LISTING_DETAIL';

export type VehicleReportStatus =
  | 'QUEUED'
  | 'GENERATING'
  | 'VALIDATING'
  | 'REPAIRING'
  | 'COMPLETED'
  | 'SAFE_FALLBACK'
  | 'FAILED'
  | 'ARCHIVED';

export type ReportFactSource =
  | 'VEHICLE_DATABASE'
  | 'EVIDENCE_VERIFIED'
  | 'LISTING_TECHNICAL_DATA'
  | 'SELLER_DECLARATION'
  | 'DAMAGE_DECLARATION'
  | 'MODERATION_VERIFIED'
  | 'SYSTEM_DERIVED'
  | 'UNKNOWN';

export interface ReportSupportingFact {
  factKey: string;
  label: string;
  value: string | number | boolean;
  source: ReportFactSource;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ReportScoreItem {
  value: number | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: {
    key: string;
    impact: number;
    explanation: string;
  }[];
  missingInputs: string[];
}

export interface VehicleReportScores {
  buyabilityScore: ReportScoreItem;
  technicalRiskScore: ReportScoreItem;
  variantConfidenceScore: ReportScoreItem;
  dataConfidenceScore: ReportScoreItem;
  listingDataQualityScore?: ReportScoreItem;
  listingContradictionScore?: ReportScoreItem;
}

export type ModelRiskStateV6 =
  | 'VERIFIED_LOW_RISK'
  | 'VERIFIED_RISK_PRESENT'
  | 'RESEARCH_COMPLETE_NO_DEFECT'
  | 'INSUFFICIENT_RESEARCH'
  | 'CONTRADICTORY_EVIDENCE';

export type ConditionStateV6 =
  | 'VERIFIED_CLEAN'
  | 'VERIFIED_DEFECTS_PRESENT'
  | 'PARTIAL_DATA'
  | 'UNKNOWN';

export type BuyabilityStateV6 =
  | 'HIGHLY_RECOMMENDED'
  | 'RECOMMENDED'
  | 'CAUTION_HIGH_RISK'
  | 'NOT_RECOMMENDED'
  | 'PROVISIONAL_MODEL_ONLY'
  | 'INSUFFICIENT_MODEL_DATA'
  | 'INSUFFICIENT_DATA';

export type DomainKeyV6 =
  | 'POWERTRAIN_ENGINE'
  | 'POWERTRAIN_TRANS'
  | 'EMISSIONS_EXHAUST'
  | 'HV_BATTERY_SYSTEM'
  | 'THERMAL_COOLING'
  | 'ELECTRONICS_BODY'
  | 'CHASSIS_BRAKES'
  | 'SAFETY_RECALL';

export type ModelRiskQuantificationV6 =
  | 'NOT_ESTIMABLE'
  | 'QUALITATIVE_ONLY'
  | 'PARTIAL_LOWER_BOUND'
  | 'FULLY_QUANTIFIED'
  | 'CERTIFIED_ZERO';

export interface DomainBreakdownItemV6 {
  domain: DomainKeyV6;
  domainLabel: string;
  score: number | null;
  state: 'GOOD' | 'BAD' | 'UNKNOWN' | 'QUALITATIVE_RISK';
  verifiedFactors: Array<{
    key: string;
    impact: number | null;
    quantification?: 'NUMERIC' | 'QUALITATIVE';
    explanation: string;
  }>;
}

export type CanonicalRiskLifecycleState =
  | 'DISCOVERED'
  | 'APPLICABILITY_CHECKED'
  | 'VERIFIED'
  | 'CONSEQUENCE_RESEARCHED'
  | 'SCORING_ELIGIBLE';

export type RiskApplicabilityState =
  | 'EXACT_MATCH'
  | 'FAMILY_MATCH'
  | 'MARKET_UNCERTAIN'
  | 'COMPONENT_UNCERTAIN'
  | 'VIN_DEPENDENT'
  | 'INCOMPATIBLE'
  | 'UNKNOWN'
  | 'EXACT';

export type RiskVerificationState =
  | 'UNVERIFIED'
  | 'TIER3_COMMUNITY_ONLY'
  | 'TIER2_CROSS_REFERENCED'
  | 'TIER1_OFFICIAL'
  | 'VERIFIED'
  | 'REJECTED';

export type RiskConsequenceState =
  | 'UNRESEARCHED'
  | 'RESEARCHED_GROUNDED'
  | 'INFERRED_FROM_EFFECTS'
  | 'INSUFFICIENT';

export interface CanonicalRiskSource {
  sourceId?: string;
  url?: string;
  title?: string;
  tier?: number | 'TIER_1' | 'TIER_2' | 'TIER_3';
  channel?: string;
  sourceKind?: string;
}

export type ImpactClass = 'MINOR' | 'MODERATE' | 'SERIOUS' | 'MAJOR_REPAIR' | 'CRITICAL';
export type EvidenceLevel = 'WEAK' | 'MODERATE' | 'STRONG';

export interface CanonicalRiskDefect {
  id: string;
  lifecycleState: CanonicalRiskLifecycleState;
  normalizedFailureMode: string;
  title: string;
  description?: string;
  domain: DomainKeyV6 | string;
  affectedComponent: string;
  applicabilityState: RiskApplicabilityState;
  applicabilityEvidence?: string;
  verificationState: RiskVerificationState;
  consequenceState: RiskConsequenceState;
  severity: number | null;
  severityBasis?: string;
  severityCategory?: SeverityCategoryV6 | null;
  scoringEligible: boolean;
  impactClass?: ImpactClass;
  evidenceLevel?: EvidenceLevel;
  basePenalty?: number;
  evidenceMultiplier?: number;
  netDeduction?: number;
  sources: CanonicalRiskSource[];
  inspectionInstruction?: string;
  advisoryOnly?: boolean;
  rejectionReason?: string;
  inferredConsequence?: string;
  reasoningChain?: string;
  supportingFactIds?: string[];
  inferenceBasis?: 'AI_INFERRED_FROM_VERIFIED_FACTS' | string;
  inferenceConfidence?: 'LOW' | 'MEDIUM' | 'HIGH' | number;
}

export interface DeductedRiskItem {
  id: string;
  title: string;
  normalizedFailureMode: string;
  domain: DomainKeyV6 | string;
  severity: number | null;
  severityBasis?: string;
  impactClass?: ImpactClass;
  evidenceLevel?: EvidenceLevel;
  basePenalty?: number;
  evidenceMultiplier?: number;
  netDeduction?: number;
  inspectionInstruction?: string;
  reason?: string;
  sources?: CanonicalRiskSource[];
  inferredConsequence?: string;
  reasoningChain?: string;
  supportingFactIds?: string[];
  inferenceBasis?: string;
  inferenceConfidence?: 'LOW' | 'MEDIUM' | 'HIGH' | number;
}

export interface TorqueScoutDecisionScoreV1 {
  version: 'v1.0';
  score: number | null;
  scope: 'VARIANT' | 'VEHICLE' | 'INSUFFICIENT_DATA';
  state: 'EXCELLENT' | 'GOOD' | 'CAUTION' | 'HIGH_RISK' | 'AVOID' | 'INSUFFICIENT_DATA';
  modelDecisionRisk: number | null;
  totalRiskPenalty?: number | null;
  qualitativeSeverityBurden: number | null;
  conditionRiskUsed: number | null;
  confidenceScore: number;
  priceModifierUsed: number;
  limitingReason?: string | null;
  deductedRisks?: DeductedRiskItem[];
  verifiedRisks?: CanonicalRiskDefect[];
  unresolvedMaterialDiscoveryCount?: number;
  explanation: {
    modelRisk: string;
    condition: string;
    confidence: string;
    price: string;
  };
}

export interface VehicleReportScoresV6 {
  scoringVersion: 'v6.0';

  // 1. Model / Inherent Architecture Dimension
  modelRiskScore: number | null;
  modelRiskState: ModelRiskStateV6;
  modelRiskQuantification: ModelRiskQuantificationV6;
  modelCoverageScore: number;
  unresolvedMaterialDiscoveryCount?: number;

  // 2. Vehicle Instance Condition Dimension
  vehicleConditionRisk: number | null;
  conditionState: ConditionStateV6;
  conditionCoverageScore: number;

  // 3. Uncertainty & Evidence Confidence
  confidenceScore: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  // 4. Recommendation & Buyability
  buyabilityScore: number | null;
  buyabilityState: BuyabilityStateV6;

  // 5. Decision Score V1 (Shadow Product Decision Layer)
  decisionScoreV1?: TorqueScoutDecisionScoreV1;

  // 6. Domain Explainability & Traceability
  domainBreakdown: DomainBreakdownItemV6[];
  traceDetails?: {
    modelRiskEligibility: boolean;
    conditionRiskEligibility: boolean;
    buyabilityEligibility: boolean;
    formulaTrace: Record<string, any>;
  };
}

export type SeverityCategoryV6 =
  | 'COSMETIC'
  | 'FUNCTIONAL_MINOR'
  | 'DRIVABILITY'
  | 'BREAKDOWN'
  | 'MAJOR_POWERTRAIN'
  | 'SAFETY_CRITICAL'
  | 'UNRESOLVED';

export type PrevalenceCategoryV6 =
  | 'ISOLATED_BATCH'
  | 'RECURRING_CHRONIC'
  | 'UNIVERSAL_DESIGN_FLAW';

export type DefectStatusV6 =
  | 'ACTIVE_DESIGN_ISSUE'
  | 'REMEDY_AVAILABLE'
  | 'PRODUCTION_REVISED'
  | 'UNKNOWN';

export type CampaignStatusV6 =
  | 'MODEL_CAMPAIGN_EXISTS'
  | 'VIN_OPEN'
  | 'VIN_COMPLETED'
  | 'VIN_UNKNOWN';

export type EvidenceNumericEligibilityV6 =
  | 'NUMERIC_ELIGIBLE'
  | 'QUALITATIVE_ONLY'
  | 'REJECTED';

export type ChannelStatusV6 =
  | 'AVAILABLE_EXECUTED'
  | 'AVAILABLE_NOT_EXECUTED'
  | 'UNAVAILABLE'
  | 'EXECUTION_FAILED'
  | 'NOT_APPLICABLE';

export interface LinkedEvidenceSource {
  sourceId: string;
  url?: string;
  publisher: string;
  sourceType: 'OFFICIAL_RECALL' | 'OFFICIAL_TSB' | 'TEARDOWN_STUDY' | 'SPECIALIST_DATA' | 'OTHER';
  sourceTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  publishedAt?: string;
  evidenceSnippet: string;
}

export interface ResearchChannelTelemetry {
  channelKey: string;
  status: ChannelStatusV6;
  queryOrEndpoint?: string;
  sourcesEvaluatedCount: number;
  sources: Array<{ sourceId: string; domain: string; tier: 'TIER_1' | 'TIER_2' | 'TIER_3' }>;
  failureReason?: string;
}

export interface NegativeResearchProof {
  domain: DomainKeyV6;
  channels: ResearchChannelTelemetry[];
  allAvailableChannelsExecuted: boolean;
  unavailableChannelsDocumented: string[];
  researchTimestamp: string;
  variantApplicability: {
    engineCode?: string;
    transmissionCode?: string;
    modelYear: number;
    marketRegion?: string;
  };
  conclusion: 'SEARCH_COMPLETED_NO_VERIFIED_DEFECT_FOUND';
}

export interface NormalizedReliabilityEvidence {
  id: string;
  domain: DomainKeyV6;
  title: string;
  normalizedFailureMode: string;
  affectedComponent: string;

  // Grounded Severity (Nullable if ungrounded / consequence evidence is insufficient)
  severityCategory: SeverityCategoryV6 | null;
  severityScore: number | null; // 1..10 or null
  severityBasis: string;

  // Grounded Prevalence (Nullable - No synthetic fabrication)
  prevalenceCategory: PrevalenceCategoryV6 | null;
  prevalenceFactor: number | null; // 0.25..1.0 or null
  prevalenceBasis: string;

  // Applicability
  applicability: {
    brand: string;
    model: string;
    generation?: string;
    modelYearFrom?: number;
    modelYearTo?: number;
    engineCode?: string;
    transmissionCode?: string;
    powertrainType?: string;
  };

  // Status
  defectStatus: DefectStatusV6;
  statusFactor: number;
  campaignStatus?: CampaignStatusV6;

  // Evidence Provenance & Clustering
  linkedSources: LinkedEvidenceSource[];
  numericEligibility: EvidenceNumericEligibilityV6;
  rejectionReason?: string;
}

export interface ReliabilityDomainResult {
  domain: DomainKeyV6;
  state:
    | 'UNRESEARCHED'
    | 'RESEARCH_FAILED'
    | 'PARTIAL'
    | 'SEARCHED_NO_VERIFIED_DEFECT'
    | 'VERIFIED_DEFECTS_FOUND'
    | 'CONTRADICTORY'
    | 'NOT_APPLICABLE';
  weight: number;
  coverageCredit: number; // 0.0, 0.4, 1.0
  defects: NormalizedReliabilityEvidence[];
  negativeProof?: NegativeResearchProof;
  channels: ResearchChannelTelemetry[];
}

export type ReliabilityFreshnessState = 'FRESH' | 'STALE' | 'EXPIRED';

export interface ReliabilityKnowledgeFreshness {
  state: ReliabilityFreshnessState;
  researchedAt: string;
  lastVerifiedAt: string;
  expiresAt: string;
  isReused: boolean;
  chronicFreshnessState?: ReliabilityFreshnessState;
  recallFreshnessState?: ReliabilityFreshnessState;
}

export interface ReliabilityPerformanceTiming {
  cacheLookupMs: number;
  initialResearchMs: number;
  recoveryMs: number;
  totalResearchMs: number;
  wasCached: boolean;
}

export interface ReliabilityRecoveryTelemetry {
  recoveryExecuted: boolean;
  recoveredDomainKeys: DomainKeyV6[];
  additionalQueriesCount: number;
}

export interface VehicleReliabilityResearch {
  researchId: string;
  variantId?: string;
  researchedAt: string;
  applicableDomainCount: number;
  reliabilityCoverageScore: number; // 0..100
  domainResults: Record<DomainKeyV6, ReliabilityDomainResult>;
  allVerifiedDefects: NormalizedReliabilityEvidence[];
  qualitativeDefects: NormalizedReliabilityEvidence[];
  canonicalRisks?: CanonicalRiskDefect[];
  unresolvedContradictions: string[];
  discoveryTelemetry?: NormalizedReliabilityEvidence[];
  freshness?: ReliabilityKnowledgeFreshness;
  timing?: ReliabilityPerformanceTiming;
  recoveryTelemetry?: ReliabilityRecoveryTelemetry;
}

export interface ExecutiveSummarySection {
  title: string;
  oneSentenceSummary: string;
  strongestAdvantage?: string;
  biggestRisk?: string;
  bestFor: string[];
  notIdealFor: string[];
  firstCriticalCheck?: string;
  keyWarnings: string[];
}

export interface VehicleIdentitySection {
  brand: string;
  model: string;
  generation?: string;
  bodyType: string;
  modelYear: number;
  engineDisplacementCc?: number;
  enginePowerHp?: number;
  sourcePowerValue?: number;
  sourcePowerUnit?: string;
  canonicalDisplayPowerHp?: number;
  powerUnit?: string;
  powerSource?: 'VEHICLE_DATABASE' | 'VERIFIED_STAGE_1' | 'AI_VERIFIED_TECHNICAL_SPECS' | 'UNKNOWN';
  powerSemantic?: string;
  engineTorqueNm?: number;
  torqueUnit?: string;
  torqueSource?: 'VEHICLE_DATABASE' | 'VERIFIED_STAGE_1' | 'AI_VERIFIED_TECHNICAL_SPECS' | 'UNKNOWN';
  torqueSemantic?: string;
  engineCode?: string;
  engineType?: string;
  enginePowerRpm?: string;
  engineTorqueRpm?: string;
  fuelType: string;
  transmissionName: string;
  transmissionCode?: string;
  drivetrain?: string;
  trimName?: string;
  marketRegion?: string;
  dimensionsMm?: string;
  variantMatchConfidence: 'KESİN' | 'YÜKSEK' | 'ORTA' | 'DÜŞÜK' | 'BELİRSİZ';
  matchWarning?: string;
  supportingFactIds: string[];
}

export interface EngineTransmissionSection {
  engineSummary?: string;
  transmissionSummary?: string;
  drivetrainSummary?: string;
  combinationAssessment?: string;
  cityBehavior?: string;
  highwayBehavior?: string;
  maintenanceSensitivity?: string[];
  knownLimitations?: string[];
  supportingFactIds: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PerformanceUsageSection {
  powerHp?: number;
  sourcePowerValue?: number;
  sourcePowerUnit?: string;
  canonicalDisplayPowerHp?: number;
  powerUnit?: string;
  powerSource?: 'VEHICLE_DATABASE' | 'VERIFIED_STAGE_1' | 'AI_VERIFIED_TECHNICAL_SPECS' | 'UNKNOWN';
  powerSemantic?: string;
  torqueNm?: number;
  torqueUnit?: string;
  torqueSource?: 'VEHICLE_DATABASE' | 'VERIFIED_STAGE_1' | 'AI_VERIFIED_TECHNICAL_SPECS' | 'UNKNOWN';
  torqueSemantic?: string;
  powerRpm?: string;
  torqueRpm?: string;
  zeroToHundredKmh?: number;
  topSpeedKmh?: number;
  curbWeightKg?: number;
  combinedFuelL100km?: number;
  cityFuelL100km?: number;
  highwayFuelL100km?: number;
  fuelTankCapacityLiters?: number;
  estimatedRangeKm?: number;
  cityRangeKm?: number;
  highwayRangeKm?: number;
  combinedRangeKm?: number;
  rangeFactorsNote?: string;
  trunkCapacityLiters?: number;
  dimensionsMm?: string;
  assessment?: string;
  supportingFactIds: string[];
}

export interface CommonProblemReportItem {
  id?: string;
  problemId?: string;
  title: string;
  system: string;
  severity: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' | 'KRİTİK';
  description?: string;
  symptoms: string[];
  causeExplanation?: string;
  preventionAdvice?: string;
  inspectionStep?: string;
  diagnosisSteps?: string[];
  verificationSource?: string;
  supportingFactIds: string[];
}

export interface RecallReportItem {
  id?: string;
  recallId?: string;
  campaignCode?: string;
  title: string;
  riskDescription: string;
  remedyDescription?: string;
  affectedUnitsNotice?: string;
  supportingFactIds: string[];
}

export interface MaintenanceOwnershipSection {
  periodicIntervalKm?: number;
  periodicIntervalMonths?: number;
  estimatedAnnualCostCategory?: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' | 'BİLİNMİYOR';
  criticalMaintenanceNotes: string[];
  supportingFactIds: string[];
}

export interface UsageScenarioResult {
  scenarioKey: string;
  title: string;
  suitability: 'MÜKEMMEL' | 'UYGUN' | 'KISMEN_UYGUN' | 'UYGUN_DEĞİL';
  reasoning: string;
  supportingFactIds: string[];
}

export interface PrePurchaseCheckItem {
  checkId: string;
  category?: 'MEKANİK' | 'KAPORTA' | 'ELEKTRONİK' | 'BELGE' | 'SÜRÜŞ' | 'İLAN_ÇELİŞKİSİ' | string;
  title: string;
  instruction?: string;
  priority?: 'NORMAL' | 'ÖNEMLİ' | 'KRİTİK' | string;
  targetComponent?: string;
  supportingFactIds?: string[];
}

export interface SellerQuestionItem {
  questionId: string;
  category?: 'BAKIM' | 'HASAR' | 'KULLANIM' | 'BELGE' | 'ÇELİŞKİ' | string;
  questionText: string;
  expectedAnswerHint?: string;
  redFlagAnswerHint?: string;
  supportingFactIds?: string[];
}

export interface ListingContradiction {
  flagKey?: string;
  code?: string;
  severity: 'DÜŞÜK' | 'ORTA' | 'YÜKSEK' | 'KRİTİK' | 'WARNING' | 'CRITICAL';
  title: string;
  explanation: string;
  affectedFields?: string[];
  supportingFactIds?: string[];
}

export interface MileageAgeAnalysis {
  listingYear?: number;
  listingMileageKm?: number;
  calculatedAgeYears?: number;
  annualAverageKm?: number;
  vehicleAgeYears?: number;
  estimatedAnnualKmRange?: string;
  category?: 'ÇOK_DÜŞÜK' | 'DÜŞÜK' | 'NORMAL' | 'YÜKSEK' | 'ÇOK_YÜKSEK';
  intensityCategory?: 'LOW' | 'BALANCED' | 'HIGH' | 'VERY_HIGH';
  assessment: string;
  isApproximateNotice?: string;
  supportingFactIds?: string[];
}

export interface ListingAnalysisSection {
  listingId: string;
  publicListingNo?: string;
  title: string;
  priceAmount: number;
  priceCurrency: string;
  declaredKilometers: number;
  declaredYear: number;
  sellerType: string;
  tramerAmount?: number;
  paintedPartsCount?: number;
  changedPartsCount?: number;
  sellerDescriptionSanitized?: string;
  listingSummary?: string;
  mileageAgeAnalysis?: MileageAgeAnalysis;
  damageAssessment?: string[];
  contradictionFlags: ListingContradiction[];
  contradictions?: ListingContradiction[];
  listingDataQuality: string;
  listingSpecificChecks: PrePurchaseCheckItem[];
  listingSpecificQuestions: SellerQuestionItem[];
}

export interface FinalVerdictSection {
  title: string;
  overallAssessment: string;
  bestFor: string[];
  avoidIf: string[];
  proceedIf: string[];
  walkAwayIf: string[];
  topThreeActions: string[];
  biggestUncertainty?: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  supportingFactIds: string[];
}

export interface ReportDataQualitySection {
  overallConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  variantMatchConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidenceCoveragePercentage?: number;
  verifiedFactCount: number;
  sellerDeclarationCount?: number;
  missingCriticalFields: string[];
  unavailableSections: string[];
  lastDataUpdate?: string;
  disclaimer: string;
  supportingFacts: ReportSupportingFact[];
}

// Expert Decision Synthesis Types
export interface ExpertSynthesisItem {
  title: string;
  explanation?: string;
  supportingFactIds?: string[];
}

export interface UserProfileAssessment {
  profile: string;
  explanation?: string;
  supportingFactIds?: string[];
}

export interface PurchaseCondition {
  condition: string;
  reason?: string;
  priority?: 'NORMAL' | 'IMPORTANT' | 'CRITICAL' | string;
  supportingFactIds?: string[];
}

export interface UnavailableClaimItem {
  key: string;
  label: string;
  explanation: string;
}

export interface TechnicalRiskSummary {
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
  symptoms: string[];
  inspectionInstructions: string[];
  riskMeaning?: string;
  supportingFactIds: string[];
}

export interface TrimPackageComparison {
  selectedTrimName: string;
  lowerOrAlternativeTrimName?: string;
  comparisonNarrative: string;
  keyAddedFeatures: string[];
  missingFeaturesInLowerTrim?: string[];
  supportingFactIds?: string[];
}

export interface ExpertDecisionSynthesis {
  vehicleCharacter: {
    headline: string;
    detailedAssessment: string;
    supportingFactIds: string[];
  };

  trimPackageComparison?: TrimPackageComparison;

  dailyUseAssessment: {
    cityUse?: string;
    highwayUse?: string;
    trafficBehavior?: string;
    comfortAssessment?: string;
    practicalityAssessment?: string;
    supportingFactIds: string[];
  };

  strongestReasonsToChoose: ExpertSynthesisItem[];
  compromisesAndLimitations: ExpertSynthesisItem[];

  suitableFor: UserProfileAssessment[];
  notSuitableFor: UserProfileAssessment[];

  primaryTechnicalRisk?: TechnicalRiskSummary;
  secondaryTechnicalRisks?: TechnicalRiskSummary[];

  purchaseConditions: PurchaseCondition[];
  walkAwayConditions: PurchaseCondition[];

  finalConditionalVerdict: {
    shortVerdict: string;
    detailedVerdict: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    supportingFactIds: string[];
  };

  unavailableClaims?: UnavailableClaimItem[];
}

export type VehicleReportIntent = 'CHAT_QUESTION' | 'VEHICLE_FULL_REPORT';

export interface TenStructuredReportSections {
  vehicleOverview: string;
  strongReasons: Array<{ title: string; explanation: string; supportingFactIds?: string[] }>;
  tradeoffs: Array<{ title: string; explanation: string; supportingFactIds?: string[] }>;
  idealFor: Array<{ profile: string; explanation: string; supportingFactIds?: string[] }>;
  notIdealFor: Array<{ profile: string; explanation: string; supportingFactIds?: string[] }>;
  conditionsToConsider: Array<{ condition: string; reason: string; priority?: string; supportingFactIds?: string[] }>;
  walkAwayConditions: Array<{ condition: string; reason: string; priority?: string; supportingFactIds?: string[] }>;
  inspectionChecklist: PrePurchaseCheckItem[];
  sellerQuestions: SellerQuestionItem[];
  technicalSpecifications: TechnicalSpecificationsData;
}

export interface VehicleResearchContextData {
  vehicleIdentity: Record<string, any>;
  technicalFacts: Array<Record<string, any>>;
  claims: Array<{
    claim: string;
    category?: string;
    status?: string;
    confidence?: number;
    variantMatch?: Record<string, boolean>;
    evidence?: any[];
    counterEvidence?: any[];
  }>;
  commonProblems?: any[];
  recalls?: any[];
  maintenanceFindings?: any[];
  drivingCharacteristics?: any[];
  ownershipFindings?: any[];
  sourceMetadata?: any[];
  conflicts?: any[];
  unsupportedClaims?: any[];
  researchTimestamp?: string;
}

export interface TechnicalSpecificationsData {
  engineDisplacementCc?: number;
  enginePowerHp?: number;
  engineTorqueNm?: number;
  transmissionTypeAndSpeeds?: string;
  transmissionSpeeds?: number;
  zeroToHundredKmh?: number;
  topSpeedKmh?: number;
  cityFuelL100km?: number;
  highwayFuelL100km?: number;
  combinedFuelL100km?: number;
  trunkCapacityLiters?: number;
  curbWeightKg?: number;
}

/**
 * AI-Generated Narrative Content (Gemini 2.5 output)
 */
export interface VehicleReportGeneratedContent {
  technicalSpecifications?: TechnicalSpecificationsData;
  expertDecisionSynthesis: ExpertDecisionSynthesis;
  executiveSummary: ExecutiveSummarySection;
  usageScenarios: UsageScenarioResult[];
  premiumChecklistQuestions: SellerQuestionItem[];
  inspectionChecklist: PrePurchaseCheckItem[];
  finalConditionalVerdict: FinalVerdictSection;
}

export interface ComprehensiveVehicleReport {
  reportId: string;
  mode: VehicleReportMode;
  status: VehicleReportStatus;
  variantId?: string;
  listingId?: string;
  publicListingNo?: string;

  vehicleIdentity: VehicleIdentitySection;
  executiveSummary: ExecutiveSummarySection;
  scoring: VehicleReportScores;
  scoringV6?: VehicleReportScoresV6;
  torqueScoutDecisionScoreV1?: TorqueScoutDecisionScoreV1;
  reliabilityResearchShadow?: VehicleReliabilityResearch;

  expertDecisionSynthesis?: ExpertDecisionSynthesis;
  technicalSpecifications?: TechnicalSpecificationsData;

  engineTransmission: EngineTransmissionSection;
  performanceUsage: PerformanceUsageSection;
  commonProblems: CommonProblemReportItem[];
  recalls?: RecallReportItem[];
  maintenanceOwnership: MaintenanceOwnershipSection;
  usageScenarios: UsageScenarioResult[];
  prePurchaseChecks: PrePurchaseCheckItem[];
  sellerQuestions: SellerQuestionItem[];

  listingAnalysis?: ListingAnalysisSection;

  finalVerdict: FinalVerdictSection;
  dataQuality: ReportDataQualitySection;

  generatedContent?: VehicleReportGeneratedContent;

  generatedAt: string;
  completedAt?: string;
  contextHash: string;
  vehicleContextHash: string;
  listingContextHash?: string;
  reportVersion: string;
  schemaVersion?: number;
  modeLabel: string;
  staleReasons?: string[];

  qualityScore?: number;
  repairAttempted?: boolean;
  refreshReason?: string;
  legacySourceMode?: string;
  upgradedFromId?: string;
}

export interface VehicleReportStatusResponse {
  success: boolean;
  reportId: string;
  status: VehicleReportStatus;
  reportData: ComprehensiveVehicleReport | null;
  cached: boolean;
  progressStage?: string;
  errorCode?: string;
}

export interface CreateVehicleReportResponse {
  reportId: string;
  mode: VehicleReportMode;
  status: VehicleReportStatus;
  quotaRemaining?: number;
  cached: boolean;
  message?: string;
}

export interface RelevanceCheck {
  required: boolean;
  match: boolean | null;
}

export interface ClaimRelevanceBasis {
  generation: RelevanceCheck;
  bodyType: RelevanceCheck;
  year: RelevanceCheck;
  engineFamily: RelevanceCheck;
  engineCode: RelevanceCheck;
  transmission: RelevanceCheck;
  trim: RelevanceCheck;
  market: RelevanceCheck;
  equipmentPeriod: RelevanceCheck;
}

export interface EvidenceLocation {
  page?: number;
  section?: string;
  table?: string;
  column?: string;
}

export interface GroundingSource {
  sourceId: string;
  url: string;
  title: string;
  domain: string;
  sourceKind: 
    | 'OFFICIAL_MANUFACTURER'
    | 'OFFICIAL_REGULATOR'
    | 'OFFICIAL_BROCHURE'
    | 'OFFICIAL_DEALER_DOCUMENT'
    | 'TECHNICAL_PUBLICATION'
    | 'PERIOD_ROAD_TEST'
    | 'SPECIALIST_FORUM'
    | 'MARKETPLACE'
    | 'OTHER';
  reliabilityScore: number;
  retrievedAt: string;
  publishedAt?: string;
  contentHash?: string;
  canonicalSourceId?: string;
  independenceGroupId?: string;
  evidenceExcerpt?: string;
  evidenceLocation?: EvidenceLocation;
}

export interface ClaimSourceMapping {
  sourceId: string;
  stance: 'SUPPORTS' | 'REFUTES' | 'NEUTRAL';
}

export type ClaimType = 'FACT' | 'OBSERVED_BEHAVIOR' | 'CROSS_SOURCE_EVALUATION' | 'DERIVED_CONCLUSION';
export type VerificationStatus = 'RAW' | 'VERIFIED' | 'REJECTED' | 'INSUFFICIENT_EVIDENCE';

export interface ResearchClaim {
  claimId: string;
  claimText: string;
  category: string;
  claimType: ClaimType;
  verificationStatus: VerificationStatus;
  derivedFromClaimIds?: string[];
  sources: ClaimSourceMapping[];
  relevance: ClaimRelevanceBasis;
}

export interface CharacterResearchSection {
  summary: string;
  claimIds: string[];
  sourceIds: string[];
  insufficientData?: boolean;
}

export interface VehicleCharacterResearch {
  segmentPositioning: CharacterResearchSection;
  engineTransmissionFit: CharacterResearchSection;
  drivingDynamics: CharacterResearchSection;
  comfortAndIsolation: CharacterResearchSection;
  interiorPracticality: CharacterResearchSection;
  usageScenarios: CharacterResearchSection;
  targetUserProfile: CharacterResearchSection;
}

export interface SectionStatusMap {
  vehicleIdentity: 'VERIFIED' | 'PARTIAL' | 'FAILED';
  vehicleCharacter: 'VERIFIED' | 'PARTIAL' | 'FAILED';
  equipment: 'VERIFIED' | 'PARTIAL' | 'FAILED';
  reliability: 'VERIFIED' | 'PARTIAL' | 'FAILED';
  recall: 'VERIFIED' | 'PARTIAL' | 'FAILED';
  buyerInspection: 'DERIVED' | 'VERIFIED' | 'FAILED';
  sellerQuestions: 'DERIVED' | 'VERIFIED' | 'FAILED';
}

export interface VerifiedTechnicalSpecsResearch {
  powerHp?: number;
  powerUnit?: 'HP' | 'PS' | 'kW' | string;
  powerSource?: 'VEHICLE_DATABASE' | 'VERIFIED_STAGE_1' | 'AI_VERIFIED_TECHNICAL_SPECS' | 'UNKNOWN';
  powerSemantic?: 'TOTAL_HYBRID_SYSTEM_POWER' | 'ICE_ONLY_POWER' | 'ELECTRIC_ONLY_POWER' | 'STANDARD_POWER' | string;
  torqueNm?: number;
  torqueUnit?: 'Nm' | string;
  torqueSource?: 'VEHICLE_DATABASE' | 'VERIFIED_STAGE_1' | 'AI_VERIFIED_TECHNICAL_SPECS' | 'UNKNOWN';
  torqueSemantic?: 'ICE_ONLY_TORQUE' | 'ELECTRIC_ONLY_TORQUE' | 'COMBINED_TORQUE' | 'STANDARD_TORQUE' | string;
}

export interface VehicleReportResearchData {
  vehicleIdentityResearch: Record<string, any>;
  vehicleCharacterResearch: VehicleCharacterResearch;
  verifiedTechnicalSpecs?: VerifiedTechnicalSpecsResearch;
  equipmentResearch: Record<string, any>;
  reliabilityResearch: Record<string, any>;
  recallResearch: Record<string, any>;
  buyerInspectionResearch: Record<string, any>;
  sellerQuestionResearch: Record<string, any>;
  groundingSources: GroundingSource[];
  claims: ResearchClaim[];
  researchStatus: 'WEB_VERIFIED' | 'PARTIAL_WEB_VERIFIED' | 'DB_ONLY_FALLBACK';
  sectionStatus: SectionStatusMap;
  webSearchPerformed: boolean;
  researchedAt: string;
  freshness: {
    vehicleCharacter: string;
    equipment: string;
    reliability: string;
    recalls: string;
  };
}

