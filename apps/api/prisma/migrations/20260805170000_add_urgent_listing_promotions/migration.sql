-- CreateEnum
CREATE TYPE "ListingPromotionType" AS ENUM ('URGENT_LISTING');

-- CreateEnum
CREATE TYPE "ListingPromotionSource" AS ENUM ('PAYMENT', 'ADMIN_GRANT', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "PromotionRefundMethod" AS ENUM ('ORIGINAL_PAYMENT', 'ACCOUNT_CREDIT');

-- CreateEnum
CREATE TYPE "PromotionLifecycleStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PROCESSING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED', 'CHARGEBACK', 'REVERSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- AlterTable
ALTER TABLE "VehicleListing" ADD COLUMN "isUrgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "urgentSince" TIMESTAMP(3),
ADD COLUMN "urgentExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ListingPromotionQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "promotionType" "ListingPromotionType" NOT NULL DEFAULT 'URGENT_LISTING',
    "priceAmount" DECIMAL(12,2) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "pricingVersion" TEXT NOT NULL,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" DECIMAL(5,2),
    "termsVersion" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPromotionQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPromotionPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "listingId" TEXT,
    "source" "ListingPromotionSource" NOT NULL DEFAULT 'PAYMENT',
    "promotionType" "ListingPromotionType" NOT NULL DEFAULT 'URGENT_LISTING',
    "lifecycleStatus" "PromotionLifecycleStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "paymentStatus" "PromotionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "quoteId" TEXT,
    "priceAmount" DECIMAL(12,2),
    "amountMinor" INTEGER,
    "currency" TEXT DEFAULT 'TRY',
    "pricingVersion" TEXT,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" DECIMAL(5,2),
    "listingPublicIdSnapshot" TEXT,
    "listingTitleSnapshot" TEXT,
    "buyerReferenceSnapshot" TEXT,
    "campaignId" TEXT,
    "paymentProvider" TEXT,
    "paymentReferenceId" TEXT,
    "paymentIdempotencyKey" TEXT,
    "checkoutExpiresAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "consentedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundMethod" "PromotionRefundMethod",
    "refundIdempotencyKey" TEXT,
    "refundReferenceId" TEXT,
    "refundedAmount" DECIMAL(12,2),
    "refundedAmountMinor" INTEGER,
    "rejectionReason" TEXT,
    "refundReason" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "grantedByAdminId" TEXT,
    "adminGrantReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPromotionPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPromotionLock" (
    "id" TEXT NOT NULL,
    "lockKey" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPromotionLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "PaymentWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockExpiresAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "payloadHash" TEXT,
    "lastErrorCode" TEXT,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "ListingPromotionQuote_userId_listingId_promotionType_idx" ON "ListingPromotionQuote"("userId", "listingId", "promotionType");
CREATE INDEX "ListingPromotionQuote_expiresAt_idx" ON "ListingPromotionQuote"("expiresAt");

CREATE UNIQUE INDEX "ListingPromotionPurchase_quoteId_key" ON "ListingPromotionPurchase"("quoteId");
CREATE UNIQUE INDEX "ListingPromotionPurchase_paymentIdempotencyKey_key" ON "ListingPromotionPurchase"("paymentIdempotencyKey");
CREATE UNIQUE INDEX "ListingPromotionPurchase_refundIdempotencyKey_key" ON "ListingPromotionPurchase"("refundIdempotencyKey");
CREATE INDEX "ListingPromotionPurchase_listingId_promotionType_lifecycleS_idx" ON "ListingPromotionPurchase"("listingId", "promotionType", "lifecycleStatus");
CREATE INDEX "ListingPromotionPurchase_userId_promotionType_lifecycleSt_idx" ON "ListingPromotionPurchase"("userId", "promotionType", "lifecycleStatus");
CREATE INDEX "ListingPromotionPurchase_lifecycleStatus_expiresAt_idx" ON "ListingPromotionPurchase"("lifecycleStatus", "expiresAt");
CREATE UNIQUE INDEX "ListingPromotionPurchase_paymentProvider_paymentReferenceId_key" ON "ListingPromotionPurchase"("paymentProvider", "paymentReferenceId");

CREATE UNIQUE INDEX "ListingPromotionLock_lockKey_key" ON "ListingPromotionLock"("lockKey");
CREATE INDEX "ListingPromotionLock_expiresAt_idx" ON "ListingPromotionLock"("expiresAt");

CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");
CREATE INDEX "PaymentWebhookEvent_status_nextRetryAt_idx" ON "PaymentWebhookEvent"("status", "nextRetryAt");
CREATE INDEX "PaymentWebhookEvent_lockExpiresAt_idx" ON "PaymentWebhookEvent"("lockExpiresAt");

-- AddForeignKey
ALTER TABLE "ListingPromotionPurchase" ADD CONSTRAINT "ListingPromotionPurchase_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ListingPromotionQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingPromotionPurchase" ADD CONSTRAINT "ListingPromotionPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingPromotionPurchase" ADD CONSTRAINT "ListingPromotionPurchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VehicleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial Unique Index for Single Live Promotion
CREATE UNIQUE INDEX "one_live_urgent_promotion_per_listing"
ON "ListingPromotionPurchase" ("listingId", "promotionType")
WHERE "lifecycleStatus" IN (
  'PENDING_ACTIVATION',
  'ACTIVE'
) AND "paymentStatus" NOT IN (
  'FAILED',
  'REFUNDED',
  'REVERSED',
  'CHARGEBACK'
);

-- Check Constraint for Source Invariants
ALTER TABLE "ListingPromotionPurchase"
ADD CONSTRAINT "urgent_promotion_source_invariants"
CHECK (
  (
    "source" = 'PAYMENT'
    AND "priceAmount" IS NOT NULL
    AND "amountMinor" IS NOT NULL
    AND "currency" IS NOT NULL
    AND "pricingVersion" IS NOT NULL
    AND "quoteId" IS NOT NULL
    AND "termsVersion" IS NOT NULL
    AND "consentedAt" IS NOT NULL
    AND "listingPublicIdSnapshot" IS NOT NULL
    AND "listingTitleSnapshot" IS NOT NULL
    AND "buyerReferenceSnapshot" IS NOT NULL
  )
  OR
  (
    "source" = 'ADMIN_GRANT'
    AND "grantedByAdminId" IS NOT NULL
    AND "adminGrantReason" IS NOT NULL
    AND "paymentStatus" = 'NOT_REQUIRED'
  )
  OR
  (
    "source" = 'CAMPAIGN'
    AND "campaignId" IS NOT NULL
    AND "paymentStatus" = 'NOT_REQUIRED'
  )
  OR
  (
    "source" = 'TEST'
    AND "paymentStatus" = 'NOT_REQUIRED'
  )
);

