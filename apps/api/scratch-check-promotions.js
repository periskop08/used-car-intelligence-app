const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- DIAGNOSTIC PROMOTION CHECK ---');

  const purchases = await prisma.listingPromotionPurchase.findMany();
  console.log(`Total ListingPromotionPurchase records: ${purchases.length}`);
  purchases.forEach(p => console.log(`Purchase ID: ${p.id}, listingId: ${p.listingId}, paymentStatus: ${p.paymentStatus}, lifecycleStatus: ${p.lifecycleStatus}`));

  const quotes = await prisma.listingPromotionQuote.findMany();
  console.log(`Total ListingPromotionQuote records: ${quotes.length}`);

  const listings = await prisma.vehicleListing.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      isUrgent: true,
      urgentExpiresAt: true,
    }
  });

  console.log(`Total VehicleListing records: ${listings.length}`);
  listings.forEach(l => console.log(`Listing: [${l.id}] "${l.title}" - Status: ${l.status}, isUrgent: ${l.isUrgent}, urgentExpiresAt: ${l.urgentExpiresAt}`));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
