import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING WIPE & DATA RECONCILIATION SCRIPT ---');

  // 1. Correct Subaru Impreza 2006 2.0 Power Enrichment in DB
  const subaruEnrichment = await prisma.vehiclePowerEnrichment.findFirst({
    where: {
      identityFingerprint: 'subaru:impreza:2006:2.0:petrol',
    },
  });

  if (subaruEnrichment) {
    const updatedSubaru = await prisma.vehiclePowerEnrichment.update({
      where: { id: subaruEnrichment.id },
      data: {
        powerHp: 160,
        powerPs: 160,
        powerKw: 117.7,
        sourceReportedValue: 160,
        sourceReportedUnit: 'PS',
        verificationStatus: 'VERIFIED',
      },
    });
    console.log('✅ Updated Subaru Impreza 2006 2.0 PowerEnrichment to 160 HP / 160 PS / 117.7 kW:', updatedSubaru.id);
  } else {
    console.log('ℹ️ Subaru Impreza 2006 2.0 PowerEnrichment record not found.');
  }

  // 2. Wipe all legacy GeneratedVehicleReport rows
  const deletedReports = await prisma.generatedVehicleReport.deleteMany({});
  console.log(`✅ Deleted all legacy GeneratedVehicleReport rows: ${deletedReports.count} reports removed.`);

  // 3. Wipe stale characterResearchCache on all VehicleVariants
  const updatedVariants = await prisma.vehicleVariant.updateMany({
    where: {
      OR: [
        { characterResearchCache: { not: null } },
        { characterResearchedAt: { not: null } },
      ],
    },
    data: {
      characterResearchCache: null,
      characterResearchedAt: null,
    } as any,
  });
  console.log(`✅ Reset stale characterResearchCache & characterResearchedAt across ${updatedVariants.count} variants.`);

  console.log('--- WIPE & DATA RECONCILIATION COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
