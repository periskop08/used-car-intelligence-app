import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Subaru test kayıtları siliniyor...');
  const deleted = await prisma.isiCepteProvider.deleteMany({
    where: {
      isicepteProviderId: { startsWith: 'TEST-SUBARU-' },
    },
  });
  console.log(`Başarıyla ${deleted.count} adet test kaydı silindi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
