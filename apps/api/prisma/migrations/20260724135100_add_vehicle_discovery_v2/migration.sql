-- CreateEnum
CREATE TYPE "VehicleDiscoveryMode" AS ENUM ('RANDOM', 'FILTERED');

-- CreateEnum
CREATE TYPE "VehicleDiscoverySessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleDiscoveryAction" AS ENUM ('LIKE', 'DISLIKE');

-- CreateEnum
CREATE TYPE "PriceConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "VehiclePriceSourceType" AS ENUM ('ACTIVE_LISTINGS', 'RELATED_VARIANT_FALLBACK', 'MANUAL', 'IMPORTED');

-- CreateEnum
CREATE TYPE "CardVariantReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CardVariantMatchSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "VehicleDiscoveryAnalyticsEventType" AS ENUM ('PAGE_VIEWED', 'FILTER_CHANGED', 'FILTERED_DISCOVERY_STARTED', 'RANDOM_DISCOVERY_STARTED', 'VEHICLE_LIKED', 'VEHICLE_DISLIKED', 'VEHICLE_SHOWN', 'SESSION_RESUMED', 'SESSION_ABANDONED', 'GUEST_SESSION_MERGED', 'LOW_RESULT_WARNING_SHOWN', 'NO_RESULTS_SHOWN', 'FILTERS_UPDATED', 'FILTERS_CLEARED', 'RANDOM_MODE_SELECTED', 'DISCOVERY_COMPLETED', 'RECOMMENDATION_OPENED', 'LISTING_OPENED');

-- AlterTable
ALTER TABLE "VehicleDiscoveryCard" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "representativeVariantId" TEXT,
ADD COLUMN     "yearFrom" INTEGER,
ADD COLUMN     "yearTo" INTEGER;

-- CreateTable
CREATE TABLE "VehicleDiscoveryGuestIdentity" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mergedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleDiscoveryGuestIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDiscoverySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestIdentityId" TEXT,
    "mode" "VehicleDiscoveryMode" NOT NULL,
    "status" "VehicleDiscoverySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "minimumPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "maximumPrice" DECIMAL(18,2),
    "bodyTypes" "BodyType"[],
    "fuelTypes" "FuelType"[],
    "transmissions" "TransmissionType"[],
    "targetCount" INTEGER NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "filterRevision" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VehicleDiscoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDiscoverySessionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "vehicleDiscoveryCardId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "action" "VehicleDiscoveryAction",
    "shownAt" TIMESTAMP(3),
    "actionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDiscoverySessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDiscoveryCardVariant" (
    "cardId" TEXT NOT NULL,
    "vehicleVariantId" TEXT NOT NULL,
    "matchConfidence" DOUBLE PRECISION,
    "matchSource" "CardVariantMatchSource" NOT NULL DEFAULT 'AUTO',
    "reviewStatus" "CardVariantReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "VehicleDiscoveryCardVariant_pkey" PRIMARY KEY ("cardId","vehicleVariantId")
);

-- CreateTable
CREATE TABLE "VehicleDiscoveryCardPriceSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "estimatedMin" DECIMAL(18,2) NOT NULL,
    "estimatedMax" DECIMAL(18,2) NOT NULL,
    "medianPrice" DECIMAL(18,2),
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "confidenceLevel" "PriceConfidenceLevel" NOT NULL,
    "sourceType" "VehiclePriceSourceType" NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshUntil" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDiscoveryCardPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVariantPriceSnapshot" (
    "id" TEXT NOT NULL,
    "vehicleVariantId" TEXT NOT NULL,
    "estimatedMin" DECIMAL(18,2) NOT NULL,
    "estimatedMax" DECIMAL(18,2) NOT NULL,
    "medianPrice" DECIMAL(18,2),
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "confidenceLevel" "PriceConfidenceLevel" NOT NULL,
    "sourceType" "VehiclePriceSourceType" NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshUntil" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleVariantPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDiscoveryAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "eventType" "VehicleDiscoveryAnalyticsEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDiscoveryAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDiscoveryGuestIdentity_tokenHash_key" ON "VehicleDiscoveryGuestIdentity"("tokenHash");

-- CreateIndex
CREATE INDEX "VehicleDiscoverySession_userId_status_createdAt_idx" ON "VehicleDiscoverySession"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleDiscoverySession_guestIdentityId_idx" ON "VehicleDiscoverySession"("guestIdentityId");

-- CreateIndex
CREATE INDEX "VehicleDiscoverySession_status_expiresAt_idx" ON "VehicleDiscoverySession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "VehicleDiscoverySession_status_lastActivityAt_idx" ON "VehicleDiscoverySession"("status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "VehicleDiscoverySessionItem_sessionId_position_idx" ON "VehicleDiscoverySessionItem"("sessionId", "position");

-- CreateIndex
CREATE INDEX "VehicleDiscoverySessionItem_vehicleDiscoveryCardId_idx" ON "VehicleDiscoverySessionItem"("vehicleDiscoveryCardId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDiscoverySessionItem_sessionId_vehicleDiscoveryCardI_key" ON "VehicleDiscoverySessionItem"("sessionId", "vehicleDiscoveryCardId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDiscoverySessionItem_sessionId_position_key" ON "VehicleDiscoverySessionItem"("sessionId", "position");

-- CreateIndex
CREATE INDEX "VehicleDiscoveryCardVariant_vehicleVariantId_idx" ON "VehicleDiscoveryCardVariant"("vehicleVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDiscoveryCardPriceSnapshot_cardId_key" ON "VehicleDiscoveryCardPriceSnapshot"("cardId");

-- CreateIndex
CREATE INDEX "VehicleDiscoveryCardPriceSnapshot_validUntil_idx" ON "VehicleDiscoveryCardPriceSnapshot"("validUntil");

-- CreateIndex
CREATE INDEX "VehicleDiscoveryCardPriceSnapshot_confidenceLevel_idx" ON "VehicleDiscoveryCardPriceSnapshot"("confidenceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleVariantPriceSnapshot_vehicleVariantId_key" ON "VehicleVariantPriceSnapshot"("vehicleVariantId");

-- CreateIndex
CREATE INDEX "VehicleVariantPriceSnapshot_validUntil_idx" ON "VehicleVariantPriceSnapshot"("validUntil");

-- CreateIndex
CREATE INDEX "VehicleVariantPriceSnapshot_confidenceLevel_idx" ON "VehicleVariantPriceSnapshot"("confidenceLevel");

-- CreateIndex
CREATE INDEX "VehicleDiscoveryAnalyticsEvent_sessionId_createdAt_idx" ON "VehicleDiscoveryAnalyticsEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleDiscoveryAnalyticsEvent_eventType_createdAt_idx" ON "VehicleDiscoveryAnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleDiscoveryAnalyticsEvent_userId_createdAt_idx" ON "VehicleDiscoveryAnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDiscoveryCard_representativeVariantId_key" ON "VehicleDiscoveryCard"("representativeVariantId");

-- AddForeignKey
ALTER TABLE "VehicleDiscoveryCard" ADD CONSTRAINT "VehicleDiscoveryCard_representativeVariantId_fkey" FOREIGN KEY ("representativeVariantId") REFERENCES "VehicleVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoverySession" ADD CONSTRAINT "VehicleDiscoverySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoverySession" ADD CONSTRAINT "VehicleDiscoverySession_guestIdentityId_fkey" FOREIGN KEY ("guestIdentityId") REFERENCES "VehicleDiscoveryGuestIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoverySessionItem" ADD CONSTRAINT "VehicleDiscoverySessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VehicleDiscoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoverySessionItem" ADD CONSTRAINT "VehicleDiscoverySessionItem_vehicleDiscoveryCardId_fkey" FOREIGN KEY ("vehicleDiscoveryCardId") REFERENCES "VehicleDiscoveryCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoveryCardVariant" ADD CONSTRAINT "VehicleDiscoveryCardVariant_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "VehicleDiscoveryCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoveryCardVariant" ADD CONSTRAINT "VehicleDiscoveryCardVariant_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoveryCardPriceSnapshot" ADD CONSTRAINT "VehicleDiscoveryCardPriceSnapshot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "VehicleDiscoveryCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariantPriceSnapshot" ADD CONSTRAINT "VehicleVariantPriceSnapshot_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDiscoveryAnalyticsEvent" ADD CONSTRAINT "VehicleDiscoveryAnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VehicleDiscoverySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Custom Database Constraints
ALTER TABLE "VehicleDiscoverySession"
ADD CONSTRAINT "VehicleDiscoverySession_owner_check"
CHECK (
  ("userId" IS NOT NULL AND "guestIdentityId" IS NULL)
  OR
  ("userId" IS NULL AND "guestIdentityId" IS NOT NULL)
);

ALTER TABLE "VehicleDiscoveryCardVariant"
ADD CONSTRAINT "VehicleDiscoveryCardVariant_confidence_check"
CHECK (
  "matchConfidence" IS NULL
  OR (
    "matchConfidence" >= 0.0
    AND "matchConfidence" <= 1.0
  )
);

ALTER TABLE "VehicleDiscoveryCardVariant"
ADD CONSTRAINT "VehicleDiscoveryCardVariant_source_check"
CHECK (
  ("matchSource" = 'AUTO' AND "matchConfidence" IS NOT NULL)
  OR
  ("matchSource" = 'MANUAL')
);
