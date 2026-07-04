-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'STANDARD', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'TRIALING');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('MANUAL', 'AUTOMATIC', 'DCT', 'CVT');

-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('AI_CHAT', 'VEHICLE_COMPARISON');

-- CreateEnum
CREATE TYPE "UsagePeriodType" AS ENUM ('DAILY', 'MONTHLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TECHNICAL_SPEC', 'COMMON_PROBLEM', 'RECALL', 'USER_COMPLAINT', 'SERVICE_NOTE', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'LPG', 'HYBRID', 'PLUG_IN_HYBRID', 'ELECTRIC', 'OTHER');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'COUPE', 'WAGON', 'PICKUP', 'VAN', 'CONVERTIBLE', 'MINIVAN', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleInfoCategory" AS ENUM ('ENGINE', 'TRANSMISSION', 'ELECTRONICS', 'SUSPENSION', 'BRAKE', 'BODY', 'PAINT', 'INTERIOR', 'TIRES', 'TEST_DRIVE', 'MAINTENANCE', 'DOCUMENTS', 'GENERAL');

-- CreateEnum
CREATE TYPE "FinalDecision" AS ENUM ('BUY', 'BUY_CAREFULLY', 'RISKY', 'AVOID', 'INSUFFICIENT_DATA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "preferredLanguageCode" TEXT,
    "preferredCountryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceTrl" DECIMAL(65,30) NOT NULL,
    "priceUsd" DECIMAL(65,30) NOT NULL,
    "limits" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" "FeatureKey" NOT NULL,
    "periodType" "UsagePeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandTranslation" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BrandTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelTranslation" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ModelTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "bodyType" "BodyType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationTranslation" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "GenerationTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displacement" INTEGER NOT NULL,
    "horsepower" INTEGER NOT NULL,
    "torque" INTEGER NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "hasTurbo" BOOLEAN NOT NULL DEFAULT false,
    "isHybrid" BOOLEAN NOT NULL DEFAULT false,
    "isElectric" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Engine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransmissionType" NOT NULL,
    "speeds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trim" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrimTranslation" (
    "id" TEXT NOT NULL,
    "trimId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TrimTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVariant" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "transmissionId" TEXT NOT NULL,
    "trimId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalSpec" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "specs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonProblem" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedYears" TEXT,
    "affectedEngine" TEXT,
    "affectedTransmission" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "symptoms" TEXT,
    "checkRecommendation" TEXT,
    "sourceUrl" TEXT,
    "confidenceScore" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommonProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonProblemTranslation" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "symptoms" TEXT,
    "checkRecommendation" TEXT,

    CONSTRAINT "CommonProblemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recall" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'HIGH',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerQuestion" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "reason" TEXT,
    "category" "VehicleInfoCategory" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "sourceUrl" TEXT,
    "confidenceScore" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerQuestionTranslation" (
    "id" TEXT NOT NULL,
    "sellerQuestionId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "SellerQuestionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionChecklistItem" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "VehicleInfoCategory" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "confidenceScore" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionChecklistItemTranslation" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "InspectionChecklistItemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawSource" (
    "id" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "contentHash" TEXT NOT NULL,
    "extractedText" TEXT,
    "languageCode" TEXT,
    "countryCode" TEXT,
    "confidenceScore" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonProblemSource" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommonProblemSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallSource" (
    "id" TEXT NOT NULL,
    "recallId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReview" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "usageDuration" INTEGER NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT true,
    "recommend" BOOLEAN NOT NULL DEFAULT true,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewDateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reliability" INTEGER NOT NULL,
    "fuelConsumption" INTEGER NOT NULL,
    "comfort" INTEGER NOT NULL,
    "partCost" INTEGER NOT NULL,
    "maintenanceCost" INTEGER NOT NULL,
    "resaleEase" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteVehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variant1Id" TEXT NOT NULL,
    "variant2Id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiVehicleReport" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "buyabilityScore" INTEGER NOT NULL,
    "finalDecision" "FinalDecision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiVehicleReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_tier_key" ON "SubscriptionPlan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureUsage_userId_featureKey_periodType_periodStart_key" ON "FeatureUsage"("userId", "featureKey", "periodType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "BrandTranslation_languageCode_idx" ON "BrandTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "BrandTranslation_brandId_languageCode_key" ON "BrandTranslation"("brandId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "Model_brandId_name_key" ON "Model"("brandId", "name");

-- CreateIndex
CREATE INDEX "ModelTranslation_languageCode_idx" ON "ModelTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "ModelTranslation_modelId_languageCode_key" ON "ModelTranslation"("modelId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "Generation_modelId_name_startYear_bodyType_key" ON "Generation"("modelId", "name", "startYear", "bodyType");

-- CreateIndex
CREATE INDEX "GenerationTranslation_languageCode_idx" ON "GenerationTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationTranslation_generationId_languageCode_key" ON "GenerationTranslation"("generationId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "Engine_code_displacement_horsepower_torque_fuelType_key" ON "Engine"("code", "displacement", "horsepower", "torque", "fuelType");

-- CreateIndex
CREATE UNIQUE INDEX "Transmission_name_type_speeds_key" ON "Transmission"("name", "type", "speeds");

-- CreateIndex
CREATE INDEX "TrimTranslation_languageCode_idx" ON "TrimTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "TrimTranslation_trimId_languageCode_key" ON "TrimTranslation"("trimId", "languageCode");

-- CreateIndex
CREATE INDEX "VehicleVariant_brandId_idx" ON "VehicleVariant"("brandId");

-- CreateIndex
CREATE INDEX "VehicleVariant_modelId_idx" ON "VehicleVariant"("modelId");

-- CreateIndex
CREATE INDEX "VehicleVariant_countryId_idx" ON "VehicleVariant"("countryId");

-- CreateIndex
CREATE INDEX "VehicleVariant_year_idx" ON "VehicleVariant"("year");

-- CreateIndex
CREATE INDEX "VehicleVariant_status_idx" ON "VehicleVariant"("status");

-- CreateIndex
CREATE INDEX "VehicleVariant_brandId_modelId_countryId_year_idx" ON "VehicleVariant"("brandId", "modelId", "countryId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleVariant_brandId_modelId_generationId_engineId_transm_key" ON "VehicleVariant"("brandId", "modelId", "generationId", "engineId", "transmissionId", "trimId", "countryId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalSpec_variantId_key" ON "TechnicalSpec"("variantId");

-- CreateIndex
CREATE INDEX "CommonProblem_variantId_status_idx" ON "CommonProblem"("variantId", "status");

-- CreateIndex
CREATE INDEX "CommonProblemTranslation_languageCode_idx" ON "CommonProblemTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "CommonProblemTranslation_problemId_languageCode_key" ON "CommonProblemTranslation"("problemId", "languageCode");

-- CreateIndex
CREATE INDEX "Recall_variantId_status_idx" ON "Recall"("variantId", "status");

-- CreateIndex
CREATE INDEX "SellerQuestion_variantId_status_idx" ON "SellerQuestion"("variantId", "status");

-- CreateIndex
CREATE INDEX "SellerQuestionTranslation_languageCode_idx" ON "SellerQuestionTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "SellerQuestionTranslation_sellerQuestionId_languageCode_key" ON "SellerQuestionTranslation"("sellerQuestionId", "languageCode");

-- CreateIndex
CREATE INDEX "InspectionChecklistItem_variantId_status_idx" ON "InspectionChecklistItem"("variantId", "status");

-- CreateIndex
CREATE INDEX "InspectionChecklistItemTranslation_languageCode_idx" ON "InspectionChecklistItemTranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionChecklistItemTranslation_checklistItemId_language_key" ON "InspectionChecklistItemTranslation"("checklistItemId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "RawSource_contentHash_key" ON "RawSource"("contentHash");

-- CreateIndex
CREATE INDEX "RawSource_url_idx" ON "RawSource"("url");

-- CreateIndex
CREATE UNIQUE INDEX "CommonProblemSource_problemId_sourceId_key" ON "CommonProblemSource"("problemId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RecallSource_recallId_sourceId_key" ON "RecallSource"("recallId", "sourceId");

-- CreateIndex
CREATE INDEX "UserReview_variantId_status_idx" ON "UserReview"("variantId", "status");

-- CreateIndex
CREATE INDEX "UserReview_userId_createdAt_idx" ON "UserReview"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserReview_userId_variantId_reviewDateKey_key" ON "UserReview"("userId", "variantId", "reviewDateKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_reviewId_key" ON "UserRating"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteVehicle_userId_variantId_key" ON "FavoriteVehicle"("userId", "variantId");

-- CreateIndex
CREATE INDEX "VehicleComparison_userId_idx" ON "VehicleComparison"("userId");

-- CreateIndex
CREATE INDEX "VehicleComparison_variant1Id_idx" ON "VehicleComparison"("variant1Id");

-- CreateIndex
CREATE INDEX "VehicleComparison_variant2Id_idx" ON "VehicleComparison"("variant2Id");

-- CreateIndex
CREATE INDEX "VehicleComparison_createdAt_idx" ON "VehicleComparison"("createdAt");

-- CreateIndex
CREATE INDEX "AiChatLog_userId_idx" ON "AiChatLog"("userId");

-- CreateIndex
CREATE INDEX "AiChatLog_variantId_idx" ON "AiChatLog"("variantId");

-- CreateIndex
CREATE INDEX "AiChatLog_createdAt_idx" ON "AiChatLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiVehicleReport_languageCode_idx" ON "AiVehicleReport"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "AiVehicleReport_variantId_languageCode_key" ON "AiVehicleReport"("variantId", "languageCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_preferredCountryId_fkey" FOREIGN KEY ("preferredCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureUsage" ADD CONSTRAINT "FeatureUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandTranslation" ADD CONSTRAINT "BrandTranslation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelTranslation" ADD CONSTRAINT "ModelTranslation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTranslation" ADD CONSTRAINT "GenerationTranslation_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrimTranslation" ADD CONSTRAINT "TrimTranslation_trimId_fkey" FOREIGN KEY ("trimId") REFERENCES "Trim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_engineId_fkey" FOREIGN KEY ("engineId") REFERENCES "Engine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "Transmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_trimId_fkey" FOREIGN KEY ("trimId") REFERENCES "Trim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalSpec" ADD CONSTRAINT "TechnicalSpec_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonProblem" ADD CONSTRAINT "CommonProblem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonProblem" ADD CONSTRAINT "CommonProblem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonProblem" ADD CONSTRAINT "CommonProblem_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonProblemTranslation" ADD CONSTRAINT "CommonProblemTranslation_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "CommonProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerQuestion" ADD CONSTRAINT "SellerQuestion_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerQuestion" ADD CONSTRAINT "SellerQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerQuestion" ADD CONSTRAINT "SellerQuestion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerQuestionTranslation" ADD CONSTRAINT "SellerQuestionTranslation_sellerQuestionId_fkey" FOREIGN KEY ("sellerQuestionId") REFERENCES "SellerQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistItem" ADD CONSTRAINT "InspectionChecklistItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistItem" ADD CONSTRAINT "InspectionChecklistItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistItem" ADD CONSTRAINT "InspectionChecklistItem_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionChecklistItemTranslation" ADD CONSTRAINT "InspectionChecklistItemTranslation_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "InspectionChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonProblemSource" ADD CONSTRAINT "CommonProblemSource_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "CommonProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommonProblemSource" ADD CONSTRAINT "CommonProblemSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RawSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallSource" ADD CONSTRAINT "RecallSource_recallId_fkey" FOREIGN KEY ("recallId") REFERENCES "Recall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallSource" ADD CONSTRAINT "RecallSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RawSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "UserReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteVehicle" ADD CONSTRAINT "FavoriteVehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteVehicle" ADD CONSTRAINT "FavoriteVehicle_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleComparison" ADD CONSTRAINT "VehicleComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleComparison" ADD CONSTRAINT "VehicleComparison_variant1Id_fkey" FOREIGN KEY ("variant1Id") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleComparison" ADD CONSTRAINT "VehicleComparison_variant2Id_fkey" FOREIGN KEY ("variant2Id") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatLog" ADD CONSTRAINT "AiChatLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatLog" ADD CONSTRAINT "AiChatLog_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiVehicleReport" ADD CONSTRAINT "AiVehicleReport_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
