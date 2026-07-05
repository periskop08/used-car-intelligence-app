-- AlterTable
ALTER TABLE "CommonProblem" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "InspectionChecklistItem" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "RawSource" ADD COLUMN     "isOfficial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Recall" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "SellerQuestion" ADD COLUMN     "metadata" JSONB;
