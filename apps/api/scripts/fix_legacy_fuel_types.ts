import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting safe legacy fuelType reconciliation on Neon PostgreSQL DB...');

  const dieselEngineKeywords = [
    'tdi',
    'hdi',
    'bluehdi',
    'cdi',
    'multijet',
    'mjet',
    'jtd',
    'jtdm',
    'ecoblue',
    'tdci',
    'd-4d',
    'd4d',
    'crdi',
    'cdti',
    'bluetec',
    'dci',
    'blue dci',
    'i-dtec',
  ];

  // 1. Fetch all candidate engines
  const candidateEngines = await prisma.engine.findMany({
    where: {
      OR: dieselEngineKeywords.flatMap((kw) => [
        { code: { contains: kw, mode: 'insensitive' } },
        { description: { contains: kw, mode: 'insensitive' } },
      ]),
      fuelType: { not: 'DIESEL' },
    },
  });

  console.log(`Found ${candidateEngines.length} non-DIESEL engines matching diesel keywords.`);

  let updatedEngineCount = 0;
  for (const eng of candidateEngines) {
    try {
      await prisma.engine.update({
        where: { id: eng.id },
        data: { fuelType: 'DIESEL' },
      });
      updatedEngineCount++;
    } catch (e: any) {
      // Ignored if duplicate (code, displacement, hp, torque, fuelType) exists in Engine table
    }
  }

  console.log(`✅ Updated ${updatedEngineCount} engines to DIESEL.`);

  // 2. Direct variant sweep: update variant.fuelType = 'DIESEL' for any variants
  // whose engine has diesel keywords or whose engine fuelType is DIESEL
  const variantKeywords = [
    'tdi',
    'hdi',
    'bluehdi',
    'cdi',
    'multijet',
    'mjet',
    'jtd',
    'ecoblue',
    'tdci',
    'd-4d',
    'd4d',
    'crdi',
    'cdti',
    'bluetec',
    'dci',
    'i-dtec',
  ];

  const variantRes = await prisma.vehicleVariant.updateMany({
    where: {
      OR: [
        { engine: { fuelType: 'DIESEL' } },
        ...variantKeywords.map((kw) => ({
          engine: { code: { contains: kw, mode: 'insensitive' as const } },
        })),
        ...variantKeywords.map((kw) => ({
          engine: { description: { contains: kw, mode: 'insensitive' as const } },
        })),
      ],
      fuelType: { not: 'DIESEL' },
    },
    data: {
      fuelType: 'DIESEL',
    },
  });

  console.log(`✅ Updated ${variantRes.count} VehicleVariant records to DIESEL!`);

  // 3. Fix wrongly marked petrol engines (e.g. 5.0 V8 Supercharged)
  const superchargedEngines = await prisma.engine.findMany({
    where: {
      code: { contains: 'supercharged', mode: 'insensitive' },
      fuelType: 'DIESEL',
    },
  });

  for (const eng of superchargedEngines) {
    try {
      await prisma.engine.update({
        where: { id: eng.id },
        data: { fuelType: 'PETROL' },
      });
    } catch {}
    await prisma.vehicleVariant.updateMany({
      where: { engineId: eng.id },
      data: { fuelType: 'PETROL' },
    });
  }
  console.log(`✅ Fixed ${superchargedEngines.length} Supercharged petrol engines and their variants.`);

  console.log('🎉 Safe FuelType reconciliation finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
