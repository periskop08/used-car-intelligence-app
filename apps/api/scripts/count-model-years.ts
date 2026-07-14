import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.vehicleVariant.groupBy({
    by: ['brandId', 'modelId', 'year'],
    where: {
      status: 'APPROVED'
    }
  });
  console.log(`Total unique approved brand-model-year combinations in DB: ${result.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
