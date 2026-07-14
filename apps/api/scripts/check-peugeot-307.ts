import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== PEUGEOT 307 2006 VARIANTS IN DB ===');
  const variants = await prisma.vehicleVariant.findMany({
    where: {
      brand: { name: { equals: 'Peugeot', mode: 'insensitive' } },
      model: { name: { equals: '307', mode: 'insensitive' } },
      year: 2006
    },
    include: {
      model: true,
      engine: true,
      transmission: true,
      trim: true
    }
  });
  
  console.log(`Found ${variants.length} variants in DB.`);
  variants.forEach(v => {
    console.log(`- ID: ${v.id} | Year: ${v.year} | Model: ${v.model.name} | Body: ${v.bodyType} | Engine: ${v.engine.code} | Fuel: ${v.fuelType} | Trans: ${v.transmission.name} | Trim: ${v.trim.name} | Status: ${v.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
