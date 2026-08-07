-- AlterEnum
ALTER TYPE "FeedbackSource" ADD VALUE IF NOT EXISTS 'LISTING_REPORT';
ALTER TYPE "FeedbackSource" ADD VALUE IF NOT EXISTS 'ACCOUNT_FEEDBACK';

-- AlterEnum
ALTER TYPE "FeedbackStatus" ADD VALUE IF NOT EXISTS 'WAITING_LISTING_OWNER';

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "listingId" TEXT,
ADD COLUMN IF NOT EXISTS "listingOwnerId" TEXT,
ADD COLUMN IF NOT EXISTS "listingNoSnapshot" TEXT,
ADD COLUMN IF NOT EXISTS "listingTitleSnapshot" TEXT,
ADD COLUMN IF NOT EXISTS "listingOwnerReferenceSnapshot" TEXT,
ADD COLUMN IF NOT EXISTS "adminNote" TEXT,
ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "VehicleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Feedback_listingId_idx" ON "Feedback"("listingId");
CREATE INDEX IF NOT EXISTS "Feedback_listingOwnerId_idx" ON "Feedback"("listingOwnerId");

-- Partial Unique Index for Duplicate Concurrency Protection
CREATE UNIQUE INDEX IF NOT EXISTS "one_open_listing_report_per_user"
ON "Feedback" ("userId", "listingId")
WHERE "source" = 'LISTING_REPORT'
AND "status" IN (
  'NEW',
  'IN_REVIEW',
  'WAITING_USER_INFO',
  'WAITING_LISTING_OWNER'
);
