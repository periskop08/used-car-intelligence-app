-- AlterTable
ALTER TABLE "VehicleListing" ADD COLUMN     "drivetrain" TEXT,
ADD COLUMN     "engineDisplacement" INTEGER,
ADD COLUMN     "enginePower" INTEGER,
ADD COLUMN     "exchangeable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasWarranty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heavyDamage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plateType" TEXT,
ADD COLUMN     "sellerType" TEXT,
ADD COLUMN     "vehicleStatus" TEXT;
