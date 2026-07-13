process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Applying cache busting (version query parameter) to all vehicle image URLs in the database...");

  const timestamp = Date.now();

  // 1. Update Guide Cards
  const guideCards = await prisma.vehicleGuideCard.findMany();
  console.log(`Loaded ${guideCards.length} guide cards.`);

  let guideUpdateCount = 0;
  for (const card of guideCards) {
    if (card.heroImageUrl) {
      // Remove any existing query param
      const baseUrl = card.heroImageUrl.split("?")[0];
      const newUrl = `${baseUrl}?t=${timestamp}`;

      await prisma.vehicleGuideCard.update({
        where: { id: card.id },
        data: { heroImageUrl: newUrl }
      });
      guideUpdateCount++;
    }
  }
  console.log(`Updated ${guideUpdateCount} VehicleGuideCard records.`);

  // 2. Update Discovery Cards
  const discoveryCards = await prisma.vehicleDiscoveryCard.findMany();
  console.log(`Loaded ${discoveryCards.length} discovery cards.`);

  let discUpdateCount = 0;
  for (const card of discoveryCards) {
    if (card.imageUrl) {
      const baseUrl = card.imageUrl.split("?")[0];
      const newUrl = `${baseUrl}?t=${timestamp}`;

      await prisma.vehicleDiscoveryCard.update({
        where: { id: card.id },
        data: { imageUrl: newUrl }
      });
      discUpdateCount++;
    }
  }
  console.log(`Updated ${discUpdateCount} VehicleDiscoveryCard records.`);

  console.log("Cache busting successfully applied to all database records!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
