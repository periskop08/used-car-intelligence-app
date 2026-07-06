-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PASSIVE', 'SOLD', 'EXPIRED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ListingPackageType" AS ENUM ('FREE', 'STANDARD', 'PREMIUM');

-- AlterEnum
ALTER TYPE "SubscriptionTier" ADD VALUE 'PREMIUM';

-- CreateTable
CREATE TABLE "VehicleListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "vehicleVariantId" TEXT,
    "customBrand" TEXT,
    "customModel" TEXT,
    "customYear" INTEGER,
    "customEngine" TEXT,
    "customTransmission" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "countryCode" TEXT NOT NULL DEFAULT 'TR',
    "region" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "modelYear" INTEGER NOT NULL,
    "kilometers" INTEGER NOT NULL,
    "fuelType" "FuelType",
    "transmission" "TransmissionType",
    "bodyType" "BodyType",
    "color" TEXT,
    "damageRecord" TEXT,
    "tramerAmount" INTEGER DEFAULT 0,
    "paintedParts" JSONB,
    "changedParts" JSONB,
    "maintenanceHistory" TEXT,
    "expertiseReportUrl" TEXT,
    "plateHidden" BOOLEAN NOT NULL DEFAULT true,
    "vinHidden" BOOLEAN NOT NULL DEFAULT true,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isAiReady" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "fraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "passiveUntil" TIMESTAMP(3),
    "lastRenewedAt" TIMESTAMP(3),
    "packageAtPublish" "ListingPackageType",
    "listingDurationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingMedia" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "mediumUrl" TEXT,
    "storageKey" TEXT NOT NULL,
    "type" "ListingMediaType" NOT NULL DEFAULT 'IMAGE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "moderationStatus" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingLead" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ipAddress" TEXT,
    "communicationGranted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingView" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleListing_vehicleVariantId_idx" ON "VehicleListing"("vehicleVariantId");

-- CreateIndex
CREATE INDEX "VehicleListing_sellerId_idx" ON "VehicleListing"("sellerId");

-- CreateIndex
CREATE INDEX "VehicleListing_status_idx" ON "VehicleListing"("status");

-- CreateIndex
CREATE INDEX "VehicleListing_city_idx" ON "VehicleListing"("city");

-- CreateIndex
CREATE INDEX "VehicleListing_priceAmount_idx" ON "VehicleListing"("priceAmount");

-- CreateIndex
CREATE INDEX "VehicleListing_createdAt_idx" ON "VehicleListing"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleListing_modelYear_idx" ON "VehicleListing"("modelYear");

-- CreateIndex
CREATE INDEX "VehicleListing_kilometers_idx" ON "VehicleListing"("kilometers");

-- CreateIndex
CREATE INDEX "VehicleListing_countryCode_city_idx" ON "VehicleListing"("countryCode", "city");

-- CreateIndex
CREATE INDEX "VehicleListing_status_expiresAt_idx" ON "VehicleListing"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "VehicleListing_status_passiveUntil_idx" ON "VehicleListing"("status", "passiveUntil");

-- CreateIndex
CREATE INDEX "VehicleListing_sellerId_status_idx" ON "VehicleListing"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ListingMedia_listingId_idx" ON "ListingMedia"("listingId");

-- CreateIndex
CREATE INDEX "ListingLead_listingId_idx" ON "ListingLead"("listingId");

-- CreateIndex
CREATE INDEX "ListingLead_buyerId_idx" ON "ListingLead"("buyerId");

-- CreateIndex
CREATE INDEX "ListingView_listingId_idx" ON "ListingView"("listingId");

-- CreateIndex
CREATE INDEX "ListingView_userId_idx" ON "ListingView"("userId");

-- AddForeignKey
ALTER TABLE "VehicleListing" ADD CONSTRAINT "VehicleListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleListing" ADD CONSTRAINT "VehicleListing_vehicleVariantId_fkey" FOREIGN KEY ("vehicleVariantId") REFERENCES "VehicleVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingLead" ADD CONSTRAINT "ListingLead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingView" ADD CONSTRAINT "ListingView_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VehicleListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
