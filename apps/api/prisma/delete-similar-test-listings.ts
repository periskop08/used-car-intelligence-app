import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Benzer araç test ilanları siliniyor...');
  const deletedEntitlements = await prisma.listingPromotionEntitlement.deleteMany({
    where: {
      listingId: { startsWith: 'TEST-SIMILAR-' },
    },
  });
  const deletedPurchases = await prisma.listingPromotionPurchase.deleteMany({
    where: {
      listingId: { startsWith: 'TEST-SIMILAR-' },
    },
  });
  const deletedMedia = await prisma.listingMedia.deleteMany({
    where: {
      listingId: { startsWith: 'TEST-SIMILAR-' },
    },
  });
  const deleted = await prisma.vehicleListing.deleteMany({
    where: {
      id: { startsWith: 'TEST-SIMILAR-' },
    },
  });
  console.log(`Başarıyla ${deleted.count} adet test ilanı, ${deletedMedia.count} medya, ${deletedPurchases.count} promosyon ve ${deletedEntitlements.count} hak kaydı silindi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
