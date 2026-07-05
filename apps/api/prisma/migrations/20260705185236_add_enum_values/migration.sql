-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApprovalStatus" ADD VALUE 'RAW';
ALTER TYPE "ApprovalStatus" ADD VALUE 'STALE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FinalDecision" ADD VALUE 'BUYABLE';
ALTER TYPE "FinalDecision" ADD VALUE 'BUY_WITH_CAUTION';
