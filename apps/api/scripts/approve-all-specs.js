require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

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
