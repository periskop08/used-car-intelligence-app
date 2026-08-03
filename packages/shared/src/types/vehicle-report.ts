export type VehicleReportMode = 'VEHICLE_REPORT' | 'LISTING_REPORT';

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
  powerToWeightRatioHpPerTon?: number;
  officialFuelConsumptionL100km?: number;
  bootVolumeLiters?: number;
  seatingCapacity?: number;
  drivingCharacter?: string;
  comfortAssessment?: string;
  handlingAssessment?: string;
  maneuverabilityAssessment?: string;
  supportingFactIds: string[];
  missingDataNotes: string[];
}

export interface CommonProblemReportItem {
  id: string;
  title: string;
  affectedSystem: string;
  description: string;
  frequency: 'RARE' | 'OCCASIONAL' | 'COMMON' | 'VERY_COMMON' | 'UNKNOWN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectability: 'EASY' | 'MODERATE' | 'DIFFICULT' | 'UNKNOWN';
  typicalMileageRange?: {
    min?: number;
    max?: number;
  };
  symptoms: string[];
  diagnosisSteps: string[];
  preventiveActions: string[];
  repairCostLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | 'UNKNOWN';
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  currency?: string;
  evidenceConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  evidenceSummary?: string;
  supportingFactIds: string[];
}

export interface RecallReportItem {
  id: string;
  title: string;
  description: string;
  safetyImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  affectedYears?: string;
  affectedMarkets?: string[];
  campaignCode?: string;
  verificationInstruction: string;
  evidenceConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  supportingFactIds: string[];
}

export interface MaintenanceOwnershipSection {
  periodicMaintenanceIntervalKm?: number;
  periodicMaintenanceIntervalMonths?: number;
  oilAndFluidReqs?: string;
  transmissionMaintenance?: string;
  timingBeltChainInfo?: string;
  brakesTiresCostLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  suspensionPartsCostLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  fuelCostAssessment?: string;
  resaleAssessment?: string;
  totalOwnershipAssessment?: string;
  missingCostDataNotes: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  supportingFactIds: string[];
}

export interface UsageScenarioResult {
  key: string;
  label: string;
  suitability: 'SUITABLE' | 'PARTIALLY_SUITABLE' | 'NOT_SUITABLE' | 'INSUFFICIENT_DATA';
  explanation: string;
  supportingFactIds: string[];
}

export interface PrePurchaseCheckItem {
  id: string;
  category: string;
  title: string;
  instruction: string;
  reason: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  relatedProblemIds?: string[];
  isListingSpecific?: boolean;
}

export interface SellerQuestionItem {
  id: string;
  category: string;
  question: string;
  reason: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  isListingSpecific?: boolean;
}

export interface ListingMissingField {
  fieldKey: string;
  fieldLabel: string;
  importance: 'MEDIUM' | 'HIGH';
}

export interface ListingContradiction {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  explanation: string;
  affectedFields: string[];
}

export interface MileageAgeAnalysis {
  listingYear: number;
  listingMileageKm: number;
  calculatedAgeYears: number;
  estimatedAnnualKmRange: string;
  intensityCategory: 'LOW' | 'BALANCED' | 'HIGH' | 'VERY_HIGH';
  assessment: string;
  isApproximateNotice: string;
  supportingFactIds: string[];
}

export interface ListingPriceAssessment {
  status: 'AVAILABLE' | 'INSUFFICIENT_DATA' | 'STALE_DATA' | 'VARIANT_MISMATCH';
  listingPrice: number;
  currency: string;
  marketMedian?: number;
  lowerQuartile?: number;
  upperQuartile?: number;
  sampleSize?: number;
  assessment?: 'BELOW_RANGE' | 'IN_RANGE' | 'ABOVE_RANGE';
  explanation: string;
  dataUpdatedAt?: string;
}

export interface PhotoMetadataAssessment {
  totalPhotoCount: number;
  approvedPhotoCount: number;
  rejectedPhotoCount: number;
  notice: string;
}

export interface ListingAnalysisSection {
  listingSummary: string;
  listingStrengths: string[];
  listingRisks: string[];
  missingFields: ListingMissingField[];
  contradictions: ListingContradiction[];
  mileageAgeAnalysis?: MileageAgeAnalysis;
  sellerDeclarationAssessment: string[];
  damageAssessment: string[];
  priceAssessment?: ListingPriceAssessment;
  photoAssessment?: PhotoMetadataAssessment;
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

  engineTransmission: EngineTransmissionSection;
  performanceUsage: PerformanceUsageSection;
  commonProblems: CommonProblemReportItem[];
  recalls: RecallReportItem[];
  maintenanceOwnership: MaintenanceOwnershipSection;
  usageScenarios: UsageScenarioResult[];
  prePurchaseChecks: PrePurchaseCheckItem[];
  sellerQuestions: SellerQuestionItem[];

  listingAnalysis?: ListingAnalysisSection;

  finalVerdict: FinalVerdictSection;
  dataQuality: ReportDataQualitySection;

  generatedAt: string;
  completedAt?: string;
  contextHash: string;
  vehicleContextHash: string;
  listingContextHash?: string;
  reportVersion: string;
  modeLabel: string;
  staleReasons?: string[];
}

export interface CreateVehicleReportResponse {
  reportId: string;
  mode: VehicleReportMode;
  status: VehicleReportStatus;
  quotaRemaining?: number;
  cached: boolean;
  message?: string;
}
