/*
  Warnings:

  - Made the column `languageCode` on table `RawSource` required. This step will fail if there are existing NULL values in that column.
  - Made the column `countryCode` on table `RawSource` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProblemType" AS ENUM ('COMMON_PROBLEM', 'USER_COMPLAINT', 'CHECK_POINT', 'SERVICE_NOTE', 'RECALL_RELATED', 'GENERAL_RISK');

-- CreateEnum
CREATE TYPE "ResearchScope" AS ENUM ('FULL_REPORT', 'COMMON_PROBLEMS', 'RECALLS', 'SELLER_QUESTIONS', 'INSPECTION_CHECKLIST', 'TECHNICAL_SPECS');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('OFFICIAL_RECALL', 'MANUFACTURER', 'SERVICE_NOTE', 'USER_REVIEW', 'FORUM', 'COMPLAINT_PLATFORM', 'BLOG_REVIEW', 'VIDEO_REVIEW', 'ADMIN_DEMO', 'UNKNOWN', 'MOCK');

-- CreateEnum
CREATE TYPE "DataConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ResearchJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DataCoverage" AS ENUM ('NONE', 'LIMITED', 'MODERATE', 'GOOD');

-- AlterTable
ALTER TABLE "AiVehicleReport" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "biggestRisks" JSONB,
ADD COLUMN     "coverageScore" DECIMAL(65,30),
ADD COLUMN     "dataCoverage" "DataCoverage",
ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "inspectionChecklist" JSONB,
ADD COLUMN     "sellerQuestions" JSONB,
ADD COLUMN     "sourceVersion" TEXT,
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "CommonProblem" ADD COLUMN     "affectedTrim" TEXT,
ADD COLUMN     "dataConfidence" "DataConfidence" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "evidenceSummary" TEXT,
ADD COLUMN     "inspectionAdvice" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "problemType" "ProblemType" NOT NULL DEFAULT 'COMMON_PROBLEM',
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "sourceCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sourceKind" "SourceKind" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "CommonProblemSource" ADD COLUMN     "confidenceContribution" DECIMAL(65,30),
ADD COLUMN     "evidenceText" TEXT,
ADD COLUMN     "sourceKind" "SourceKind" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "InspectionChecklistItem" ADD COLUMN     "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "RawSource" ADD COLUMN     "extractedSummary" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "marketRegion" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "rawText" TEXT,
ADD COLUMN     "reliabilityScore" DECIMAL(65,30),
ADD COLUMN     "sourceKind" "SourceKind" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'RAW',
ADD COLUMN     "vehicleVariantId" TEXT,
ALTER COLUMN "languageCode" SET NOT NULL,
ALTER COLUMN "languageCode" SET DEFAULT 'tr',
ALTER COLUMN "countryCode" SET NOT NULL,
ALTER COLUMN "countryCode" SET DEFAULT 'TR';

-- AlterTable
ALTER TABLE "Recall" ADD COLUMN     "affectedEngine" TEXT,
ADD COLUMN     "affectedTransmission" TEXT,
ADD COLUMN     "affectedYears" TEXT,
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "dataConfidence" "DataConfidence" NOT NULL DEFAULT 'HIGH',
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "manufacturerCampaignNumber" TEXT,
ADD COLUMN     "nhtsaCampaignNumber" TEXT,
ADD COLUMN     "officialCheckUrl" TEXT,
ADD COLUMN     "officialSourceUrl" TEXT,
ADD COLUMN     "recallCode" TEXT,
ADD COLUMN     "recallDate" TIMESTAMP(3),
ADD COLUMN     "remedy" TEXT,
ADD COLUMN     "safetyRisk" TEXT,
ADD COLUMN     "sourceKind" "SourceKind" NOT NULL DEFAULT 'OFFICIAL_RECALL',
ADD COLUMN     "vinCheckRequired" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SellerQuestion" ADD COLUMN     "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "VehicleVariant" ADD COLUMN     "bodyType" "BodyType",
ADD COLUMN     "fuelType" "FuelType",
ADD COLUMN     "marketRegion" TEXT,
ADD COLUMN     "yearEnd" INTEGER,
ADD COLUMN     "yearStart" INTEGER;

-- CreateTable
CREATE TABLE "VehicleResearchJob" (
    "id" TEXT NOT NULL,
    "vehicleVariantId" TEXT NOT NULL,
    "status" "ResearchJobStatus" NOT NULL DEFAULT 'QUEUED',
    "languageCode" TEXT NOT NULL DEFAULT 'tr',
    "countryCode" TEXT NOT NULL DEFAULT 'TR',
    "marketRegion" TEXT,
    "researchScope" "ResearchScope" NOT NULL DEFAULT 'FULL_REPORT',
    "requestedByUserId" TEXT,
    "requestedReason" TEXT,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleResearchJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiVehicleReport_variantId_languageCode_status_idx" ON "AiVehicleReport"("variantId", "languageCode", "status");

-- CreateIndex
CREATE INDEX "CommonProblemSource_problemId_idx" ON "CommonProblemSource"("problemId");

-- CreateIndex
CREATE INDEX "CommonProblemSource_sourceId_idx" ON "CommonProblemSource"("sourceId");

-- CreateIndex
CREATE INDEX "RawSource_vehicleVariantId_status_idx" ON "RawSource"("vehicleVariantId", "status");

-- AddForeignKey
ALTER TABLE "RawSource" ADD CONSTRAINT "RawSource_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleResearchJob" ADD CONSTRAINT "VehicleResearchJob_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleResearchJob" ADD CONSTRAINT "VehicleResearchJob_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX unique_active_vehicle_research_job
ON "VehicleResearchJob" ("vehicleVariantId", "languageCode", "countryCode", "researchScope")
WHERE "status" IN ('QUEUED', 'RUNNING');
