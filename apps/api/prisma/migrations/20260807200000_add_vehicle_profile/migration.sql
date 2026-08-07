-- CreateTable
CREATE TABLE IF NOT EXISTS "VehicleProfile" (
    "id" TEXT NOT NULL,
    "normalizedIdentityKey" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generationName" TEXT,
    "generationCode" TEXT,
    "bodyType" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "heroImageUrl" TEXT,
    "galleryImages" JSONB,
    "fuelType" TEXT,
    "transmissionType" TEXT,
    "representativeEngine" TEXT,
    "powerHp" INTEGER,
    "torqueNm" INTEGER,
    "drivetrain" TEXT,
    "averageConsumption" TEXT,
    "guideSummary" TEXT,
    "discoverySummary" TEXT,
    "discoveryHighlight" TEXT,
    "discoveryWatchout" TEXT,
    "tags" JSONB,
    "showInGuide" BOOLEAN NOT NULL DEFAULT true,
    "showInDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VehicleProfileCriticalInfo" (
    "id" TEXT NOT NULL,
    "vehicleProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VehicleProfileCriticalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VehicleProfileVariant" (
    "profileId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,

    CONSTRAINT "VehicleProfileVariant_pkey" PRIMARY KEY ("profileId","variantId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyVehicleProfileMapping" (
    "id" TEXT NOT NULL,
    "legacySource" TEXT NOT NULL,
    "legacyId" TEXT NOT NULL,
    "vehicleProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyVehicleProfileMapping_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "UserGuideCardViewHistory" ALTER COLUMN "vehicleGuideCardId" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "vehicleProfileId" TEXT;

-- AlterTable
ALTER TABLE "GuideAnalyticsEvent" ALTER COLUMN "vehicleGuideCardId" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "vehicleProfileId" TEXT;

-- AlterTable
ALTER TABLE "UserVehiclePreferenceSwipe" ALTER COLUMN "vehicleDiscoveryCardId" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "vehicleProfileId" TEXT;

-- AlterTable
ALTER TABLE "VehicleDiscoveryCardImpression" ALTER COLUMN "vehicleDiscoveryCardId" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "vehicleProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VehicleProfile_normalizedIdentityKey_key" ON "VehicleProfile"("normalizedIdentityKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VehicleProfile_slug_key" ON "VehicleProfile"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleProfile_brand_model_idx" ON "VehicleProfile"("brand", "model");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleProfile_bodyType_idx" ON "VehicleProfile"("bodyType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleProfile_showInGuide_isActive_idx" ON "VehicleProfile"("showInGuide", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleProfile_showInDiscovery_isActive_idx" ON "VehicleProfile"("showInDiscovery", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyVehicleProfileMapping_legacySource_legacyId_key" ON "LegacyVehicleProfileMapping"("legacySource", "legacyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyVehicleProfileMapping_vehicleProfileId_idx" ON "LegacyVehicleProfileMapping"("vehicleProfileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserVehiclePreferenceSwipe_vehicleProfileId_idx" ON "UserVehiclePreferenceSwipe"("vehicleProfileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleDiscoveryCardImpression_vehicleProfileId_idx" ON "VehicleDiscoveryCardImpression"("vehicleProfileId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "VehicleProfileCriticalInfo" ADD CONSTRAINT "VehicleProfileCriticalInfo_vehicleProfileId_fkey" FOREIGN KEY ("vehicleProfileId") REFERENCES "VehicleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "VehicleProfileVariant" ADD CONSTRAINT "VehicleProfileVariant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "VehicleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "VehicleProfileVariant" ADD CONSTRAINT "VehicleProfileVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "UserGuideCardViewHistory" ADD CONSTRAINT "UserGuideCardViewHistory_vehicleProfileId_fkey" FOREIGN KEY ("vehicleProfileId") REFERENCES "VehicleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GuideAnalyticsEvent" ADD CONSTRAINT "GuideAnalyticsEvent_vehicleProfileId_fkey" FOREIGN KEY ("vehicleProfileId") REFERENCES "VehicleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "UserVehiclePreferenceSwipe" ADD CONSTRAINT "UserVehiclePreferenceSwipe_vehicleProfileId_fkey" FOREIGN KEY ("vehicleProfileId") REFERENCES "VehicleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "VehicleDiscoveryCardImpression" ADD CONSTRAINT "VehicleDiscoveryCardImpression_vehicleProfileId_fkey" FOREIGN KEY ("vehicleProfileId") REFERENCES "VehicleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
