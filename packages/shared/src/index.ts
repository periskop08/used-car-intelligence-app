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
