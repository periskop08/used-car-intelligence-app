-- AlterEnum
ALTER TYPE "ListingPromotionType" ADD VALUE 'SHOWCASE_FEED';

-- CreateEnum
CREATE TYPE "ListingPromotionProductSku" AS ENUM ('URGENT_LISTING', 'SHOWCASE_FEED', 'URGENT_SHOWCASE_BUNDLE');

-- AlterTable
ALTER TABLE "VehicleListing" 
ADD COLUMN "isShowcaseFeedActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showcaseFeedSince" TIMESTAMP(3),
ADD COLUMN "showcaseFeedExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ListingPromotionQuote" 
ADD COLUMN "productSku" "ListingPromotionProductSku" NOT NULL DEFAULT 'URGENT_LISTING';

-- AlterTable
ALTER TABLE "ListingPromotionPurchase" 
ADD COLUMN "productSku" "ListingPromotionProductSku" NOT NULL DEFAULT 'URGENT_LISTING';

-- CreateTable
CREATE TABLE "ListingPromotionEntitlement" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "listingId" TEXT,
    "promotionType" "ListingPromotionType" NOT NULL,
    "lifecycleStatus" "PromotionLifecycleStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPromotionEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPromotionEntitlement_purchaseId_idx" ON "ListingPromotionEntitlement"("purchaseId");

-- CreateIndex
CREATE INDEX "ListingPromotionEntitlement_listingId_promotionType_lifecycle_idx" ON "ListingPromotionEntitlement"("listingId", "promotionType", "lifecycleStatus");

-- AddForeignKey
ALTER TABLE "ListingPromotionEntitlement" ADD CONSTRAINT "ListingPromotionEntitlement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "ListingPromotionPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPromotionEntitlement" ADD CONSTRAINT "ListingPromotionEntitlement_fkey" FOREIGN KEY ("listingId") REFERENCES "VehicleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial Unique Index for Live Entitlements per Listing
CREATE UNIQUE INDEX "one_live_listing_promotion_entitlement" 
ON "ListingPromotionEntitlement" ("listingId", "promotionType") 
WHERE "lifecycleStatus" IN ('PENDING_ACTIVATION', 'ACTIVE');
