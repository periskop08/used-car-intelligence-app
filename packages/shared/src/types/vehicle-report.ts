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
  engineCode?: string;
  fuelType: string;
  transmissionName: string;
  transmissionCode?: string;
  drivetrain?: string;
  trimName?: string;
  marketRegion?: string;
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
  torqueNm?: number;
  zeroToHundredKmh?: number;
  topSpeedKmh?: number;
  curbWeightKg?: number;
  combinedFuelL100km?: number;
  cityFuelL100km?: number;
  highwayFuelL100km?: number;
  trunkCapacityLiters?: number;
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
  category: 'MEKANİK' | 'KAPORTA' | 'ELEKTRONİK' | 'BELGE' | 'SÜRÜŞ' | 'İLAN_ÇELİŞKİSİ';
  title: string;
  instruction: string;
  priority: 'NORMAL' | 'ÖNEMLİ' | 'KRİTİK';
  targetComponent?: string;
  supportingFactIds: string[];
}

export interface SellerQuestionItem {
  questionId: string;
  category: 'BAKIM' | 'HASAR' | 'KULLANIM' | 'BELGE' | 'ÇELİŞKİ';
  questionText: string;
  expectedAnswerHint?: string;
  redFlagAnswerHint?: string;
  supportingFactIds: string[];
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
  explanation: string;
  supportingFactIds: string[];
}

export interface UserProfileAssessment {
  profile: string;
  explanation: string;
  supportingFactIds: string[];
}

export interface PurchaseCondition {
  condition: string;
  reason: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  supportingFactIds: string[];
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

export interface ExpertDecisionSynthesis {
  vehicleCharacter: {
    headline: string;
    detailedAssessment: string;
    supportingFactIds: string[];
  };

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

/**
 * AI-Generated Narrative Content (Gemini 2.5 output)
 */
export interface VehicleReportGeneratedContent {
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

  expertDecisionSynthesis?: ExpertDecisionSynthesis;

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
