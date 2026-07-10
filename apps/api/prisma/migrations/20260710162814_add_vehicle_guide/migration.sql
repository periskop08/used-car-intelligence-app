-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('tr', 'en');

-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GuideFactType" AS ENUM ('INTERESTING_FACT', 'BUYING_TIP', 'USER_EXPERIENCE', 'TECHNICAL_SUMMARY', 'KNOWN_ISSUE', 'VERSION_NOTE');

-- CreateEnum
CREATE TYPE "GuideSourceType" AS ENUM ('OFFICIAL', 'DISTRIBUTOR', 'PRESS', 'REVIEW', 'LISTING', 'USER_FEEDBACK', 'INTERNAL_RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "GuideEventType" AS ENUM ('GUIDE_CARD_VIEW', 'GUIDE_CARD_SWIPE_UP', 'GUIDE_CARD_SWIPE_DOWN', 'GUIDE_CARD_TIME_SPENT', 'GUIDE_TECHNICAL_INFO_OPENED', 'GUIDE_TECHNICAL_INFO_CLOSED', 'GUIDE_LISTING_CTA_CLICKED', 'GUIDE_CARD_SHARED', 'GUIDE_CARD_FAVORITED');

-- CreateTable
CREATE TABLE "VehicleGuideCard" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generationName" TEXT,
    "generationCode" TEXT,
    "bodyType" TEXT,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER,
    "heroImageUrl" TEXT,
    "imageAltText" TEXT,
    "imageSource" TEXT,
    "imageLicense" TEXT,
    "placeholderImageUrl" TEXT,
    "shortSummary" TEXT,
    "ratingScore" DOUBLE PRECISION DEFAULT 0.0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleGuideCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGuideCardTranslation" (
    "id" TEXT NOT NULL,
    "vehicleGuideCardId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "shortSummary" TEXT NOT NULL,

    CONSTRAINT "VehicleGuideCardTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGuideFact" (
    "id" TEXT NOT NULL,
    "vehicleGuideCardId" TEXT NOT NULL,
    "factType" "GuideFactType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconKey" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "confidenceLevel" "DataConfidence" NOT NULL DEFAULT 'HIGH',
    "sourceTitle" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "GuideSourceType" NOT NULL DEFAULT 'INTERNAL_RESEARCH',
    "sourceNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleGuideFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGuideFactTranslation" (
    "id" TEXT NOT NULL,
    "vehicleGuideFactId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "VehicleGuideFactTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGuideTechnicalInfo" (
    "id" TEXT NOT NULL,
    "vehicleGuideCardId" TEXT NOT NULL,
    "engineOptions" JSONB,
    "fuelTypes" JSONB,
    "transmissionOptions" JSONB,
    "bodyTypes" JSONB,
    "productionYears" TEXT,
    "averageConsumption" TEXT,
    "powerRange" TEXT,
    "torqueRange" TEXT,
    "drivetrain" TEXT,
    "segment" TEXT,
    "trunkVolume" TEXT,
    "safetyInfo" TEXT,
    "sourceTitle" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "GuideSourceType" NOT NULL DEFAULT 'INTERNAL_RESEARCH',
    "verifiedAt" TIMESTAMP(3),
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleGuideTechnicalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleGuideTechnicalInfoTranslation" (
    "id" TEXT NOT NULL,
    "vehicleGuideTechnicalInfoId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "localizedNotes" TEXT NOT NULL,

    CONSTRAINT "VehicleGuideTechnicalInfoTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGuideCardViewHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "vehicleGuideCardId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "openedTechnicalInfo" BOOLEAN NOT NULL DEFAULT false,
    "clickedListings" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGuideCardViewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "vehicleGuideCardId" TEXT NOT NULL,
    "eventType" "GuideEventType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generationCode" TEXT,
    "durationMs" INTEGER,
    "deviceType" TEXT,
    "locale" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleGuideCardTranslation_vehicleGuideCardId_locale_key" ON "VehicleGuideCardTranslation"("vehicleGuideCardId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleGuideFactTranslation_vehicleGuideFactId_locale_key" ON "VehicleGuideFactTranslation"("vehicleGuideFactId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleGuideTechnicalInfoTranslation_vehicleGuideTechnicalI_key" ON "VehicleGuideTechnicalInfoTranslation"("vehicleGuideTechnicalInfoId", "locale");

-- AddForeignKey
ALTER TABLE "VehicleGuideCardTranslation" ADD CONSTRAINT "VehicleGuideCardTranslation_vehicleGuideCardId_fkey" FOREIGN KEY ("vehicleGuideCardId") REFERENCES "VehicleGuideCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleGuideFact" ADD CONSTRAINT "VehicleGuideFact_vehicleGuideCardId_fkey" FOREIGN KEY ("vehicleGuideCardId") REFERENCES "VehicleGuideCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleGuideFactTranslation" ADD CONSTRAINT "VehicleGuideFactTranslation_vehicleGuideFactId_fkey" FOREIGN KEY ("vehicleGuideFactId") REFERENCES "VehicleGuideFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleGuideTechnicalInfo" ADD CONSTRAINT "VehicleGuideTechnicalInfo_vehicleGuideCardId_fkey" FOREIGN KEY ("vehicleGuideCardId") REFERENCES "VehicleGuideCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleGuideTechnicalInfoTranslation" ADD CONSTRAINT "VehicleGuideTechnicalInfoTranslation_vehicleGuideTechnical_fkey" FOREIGN KEY ("vehicleGuideTechnicalInfoId") REFERENCES "VehicleGuideTechnicalInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuideCardViewHistory" ADD CONSTRAINT "UserGuideCardViewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuideCardViewHistory" ADD CONSTRAINT "UserGuideCardViewHistory_vehicleGuideCardId_fkey" FOREIGN KEY ("vehicleGuideCardId") REFERENCES "VehicleGuideCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideAnalyticsEvent" ADD CONSTRAINT "GuideAnalyticsEvent_vehicleGuideCardId_fkey" FOREIGN KEY ("vehicleGuideCardId") REFERENCES "VehicleGuideCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
