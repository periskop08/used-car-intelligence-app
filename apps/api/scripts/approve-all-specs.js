process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Setting status to APPROVED on all VehicleGuideCard and VehicleGuideTechnicalInfo records...");

  const guideRes = await prisma.vehicleGuideCard.updateMany({
    data: { status: "APPROVED" }
  });
  console.log(`Approved ${guideRes.count} VehicleGuideCards.`);

  const techRes = await prisma.vehicleGuideTechnicalInfo.updateMany({
    data: { status: "APPROVED" }
  });
  console.log(`Approved ${techRes.count} VehicleGuideTechnicalInfo records.`);

  console.log("All technical specs are now APPROVED and visible on frontend!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
