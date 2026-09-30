import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- TORQUESCOUT VEHICLE REPORT & RESEARCH CACHE PURGE ---');

  const beforeGvr = await prisma.generatedVehicleReport.count();
  const beforeVrv = await prisma.vehicleReportVote.count();
  const beforeVgl = await prisma.vehicleReportGenerationLock.count();
  const beforeAvr = await prisma.aiVehicleReport.count();
  const [beforeCrc]: any = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM "VehicleVariant" WHERE "characterResearchCache" IS NOT NULL',
  );

  console.log('Current cache inventory:', {
    GeneratedVehicleReport: beforeGvr,
    VehicleReportVote: beforeVrv,
    VehicleReportGenerationLock: beforeVgl,
    AiVehicleReport: beforeAvr,
    characterResearchCache: beforeCrc?.count?.toString?.() || '0',
  });

  await prisma.$transaction(async (tx) => {
    // 1. Delete votes referencing reports
    const deletedVotes = await tx.vehicleReportVote.deleteMany({});
    console.log(`Deleted ${deletedVotes.count} VehicleReportVote records.`);

    // 2. Delete generated reports (cascades to VehicleReportResearchJob)
    const deletedReports = await tx.generatedVehicleReport.deleteMany({});
    console.log(`Deleted ${deletedReports.count} GeneratedVehicleReport records.`);

    // 3. Delete generation locks
    const deletedLocks = await tx.vehicleReportGenerationLock.deleteMany({});
    console.log(`Deleted ${deletedLocks.count} VehicleReportGenerationLock records.`);

    // 4. Delete legacy AI reports
    const deletedAiReports = await tx.aiVehicleReport.deleteMany({});
    console.log(`Deleted ${deletedAiReports.count} AiVehicleReport records.`);

    // 5. Clear characterResearchCache from VehicleVariant
    const updatedVariants = await tx.$executeRawUnsafe(
      'UPDATE "VehicleVariant" SET "characterResearchCache" = NULL, "characterResearchedAt" = NULL WHERE "characterResearchCache" IS NOT NULL',
    );
    console.log(`Cleared characterResearchCache from ${updatedVariants} VehicleVariant records.`);
  });

  console.log('Purge completed successfully! System is now clean for fresh generation on demand.');
}

main()
  .catch((err) => {
    console.error('Purge failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
