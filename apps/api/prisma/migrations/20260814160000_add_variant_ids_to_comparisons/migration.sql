-- AlterTable
ALTER TABLE "VehicleComparison" ADD COLUMN IF NOT EXISTS "variantIds" JSONB;

-- AlterTable
ALTER TABLE "AiVehicleComparisonCache" ADD COLUMN IF NOT EXISTS "variantIds" JSONB;
