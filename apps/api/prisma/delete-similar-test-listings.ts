import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Benzer araç test ilanları siliniyor...');
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
  console.log(`Başarıyla ${deleted.count} adet test ilanı ve ${deletedMedia.count} medya kaydı silindi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
