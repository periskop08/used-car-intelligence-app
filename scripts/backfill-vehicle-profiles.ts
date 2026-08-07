import { PrismaClient } from '@prisma/client';
import {
  buildVehicleProfileIdentityKey,
  buildVehicleProfileSlug,
} from '../apps/api/src/modules/vehicle-profile/vehicle-profile-identity.util';

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`====================================================`);
  console.log(`  TorqueScout VehicleProfile Idempotent Backfill  `);
  console.log(`  Mode: ${isDryRun ? 'DRY-RUN (No DB mutations)' : 'LIVE EXECUTION'}`);
  console.log(`====================================================\n`);

  let createdProfilesCount = 0;
  let legacyGuideMappingsCount = 0;
  let legacyDiscoveryMappingsCount = 0;
  let updatedSwipesCount = 0;
  let updatedImpressionsCount = 0;
  let updatedViewHistoriesCount = 0;
  let updatedAnalyticsEventsCount = 0;

  // 1. Fetch legacy VehicleGuideCard records
  const guideCards = await prisma.vehicleGuideCard.findMany({
    include: {
      facts: true,
      technicalInfos: true,
    },
  });
  console.log(`[1/4] Loaded ${guideCards.length} VehicleGuideCard records.`);

  for (const gc of guideCards) {
    const normKey = buildVehicleProfileIdentityKey({
      brand: gc.brand,
      model: gc.model,
      generationCode: gc.generationCode,
      generation: gc.generationName,
      yearStart: gc.yearStart,
      yearEnd: gc.yearEnd,
      bodyType: gc.bodyType || 'SEDAN',
    });

    let profile = await prisma.vehicleProfile.findUnique({
      where: { normalizedIdentityKey: normKey },
    });

    if (!profile && !isDryRun) {
      const slug = buildVehicleProfileSlug({
        brand: gc.brand,
        model: gc.model,
        generationCode: gc.generationCode,
        generation: gc.generationName,
        yearStart: gc.yearStart,
        yearEnd: gc.yearEnd,
        bodyType: gc.bodyType || 'SEDAN',
      });

      profile = await prisma.vehicleProfile.create({
        data: {
          normalizedIdentityKey: normKey,
          brand: gc.brand,
          model: gc.model,
          generationName: gc.generationName,
          generationCode: gc.generationCode,
          bodyType: (gc.bodyType || 'SEDAN').toUpperCase(),
          yearStart: gc.yearStart,
          yearEnd: gc.yearEnd || null,
          displayName: `${gc.brand} ${gc.model} ${gc.generationCode || ''}`.trim(),
          slug,
          heroImageUrl: gc.heroImageUrl,
          guideSummary: gc.shortSummary,
          showInGuide: true,
          showInDiscovery: true,
          isActive: gc.isActive ?? true,
          criticalInfos: {
            create: gc.facts.map((f, idx) => ({
              title: f.title,
              description: f.description,
              sortOrder: f.displayOrder ?? idx,
            })),
          },
        },
      });
      createdProfilesCount++;
    } else if (!profile && isDryRun) {
      createdProfilesCount++;
    }

    const profileId = profile?.id || 'dry-run-profile-id';

    if (!isDryRun) {
      await prisma.legacyVehicleProfileMapping.upsert({
        where: {
          legacySource_legacyId: {
            legacySource: 'GUIDE',
            legacyId: gc.id,
          },
        },
        create: {
          legacySource: 'GUIDE',
          legacyId: gc.id,
          vehicleProfileId: profileId,
        },
        update: {
          vehicleProfileId: profileId,
        },
      });
    }
    legacyGuideMappingsCount++;
  }

  // 2. Fetch legacy VehicleDiscoveryCard records
  const discoveryCards = await prisma.vehicleDiscoveryCard.findMany();
  console.log(`[2/4] Loaded ${discoveryCards.length} VehicleDiscoveryCard records.`);

  for (const dc of discoveryCards) {
    const yearStart = dc.yearFrom || parseInt(dc.productionYears?.split(/[-–]/)[0]) || 2018;
    const yearEnd = dc.yearTo || parseInt(dc.productionYears?.split(/[-–]/)[1]) || null;

    const normKey = buildVehicleProfileIdentityKey({
      brand: dc.brand,
      model: dc.modelFamily,
      generationCode: dc.generationName,
      yearStart,
      yearEnd,
      bodyType: dc.bodyType || 'SEDAN',
    });

    let profile = await prisma.vehicleProfile.findUnique({
      where: { normalizedIdentityKey: normKey },
    });

    if (!profile && !isDryRun) {
      const slug = buildVehicleProfileSlug({
        brand: dc.brand,
        model: dc.modelFamily,
        generationCode: dc.generationName,
        yearStart,
        yearEnd,
        bodyType: dc.bodyType || 'SEDAN',
      });

      profile = await prisma.vehicleProfile.create({
        data: {
          normalizedIdentityKey: normKey,
          brand: dc.brand,
          model: dc.modelFamily,
          generationName: dc.generationName,
          generationCode: dc.generationName,
          bodyType: (dc.bodyType || 'SEDAN').toUpperCase(),
          yearStart,
          yearEnd,
          displayName: `${dc.brand} ${dc.modelFamily} ${dc.generationName || ''}`.trim(),
          slug,
          heroImageUrl: dc.imageUrl,
          fuelType: dc.fuelType,
          transmissionType: dc.transmissionType,
          representativeEngine: dc.engineVersion,
          drivetrain: dc.drivetrain,
          averageConsumption: dc.averageConsumption,
          tags: dc.tags || [],
          showInGuide: true,
          showInDiscovery: true,
          isActive: dc.isActive ?? true,
        },
      });
      createdProfilesCount++;
    } else if (profile && !isDryRun) {
      // Enrich discovery details if missing
      await prisma.vehicleProfile.update({
        where: { id: profile.id },
        data: {
          fuelType: profile.fuelType || dc.fuelType,
          transmissionType: profile.transmissionType || dc.transmissionType,
          tags: profile.tags || dc.tags || [],
        },
      });
    }

    const profileId = profile?.id || 'dry-run-profile-id';

    if (!isDryRun) {
      await prisma.legacyVehicleProfileMapping.upsert({
        where: {
          legacySource_legacyId: {
            legacySource: 'DISCOVERY',
            legacyId: dc.id,
          },
        },
        create: {
          legacySource: 'DISCOVERY',
          legacyId: dc.id,
          vehicleProfileId: profileId,
        },
        update: {
          vehicleProfileId: profileId,
        },
      });
    }
    legacyDiscoveryMappingsCount++;
  }

  // 3. Backfill swipes & impressions
  console.log(`[3/4] Backfilling swipes, impressions, view histories, and analytics events...`);
  if (!isDryRun) {
    const discoveryMappings = await prisma.legacyVehicleProfileMapping.findMany({
      where: { legacySource: 'DISCOVERY' },
    });

    for (const map of discoveryMappings) {
      const swipesRes = await prisma.userVehiclePreferenceSwipe.updateMany({
        where: { vehicleDiscoveryCardId: map.legacyId, vehicleProfileId: null },
        data: { vehicleProfileId: map.vehicleProfileId },
      });
      updatedSwipesCount += swipesRes.count;

      const impressionsRes = await prisma.vehicleDiscoveryCardImpression.updateMany({
        where: { vehicleDiscoveryCardId: map.legacyId, vehicleProfileId: null },
        data: { vehicleProfileId: map.vehicleProfileId },
      });
      updatedImpressionsCount += impressionsRes.count;
    }

    const guideMappings = await prisma.legacyVehicleProfileMapping.findMany({
      where: { legacySource: 'GUIDE' },
    });

    for (const map of guideMappings) {
      const viewsRes = await prisma.userGuideCardViewHistory.updateMany({
        where: { vehicleGuideCardId: map.legacyId, vehicleProfileId: null },
        data: { vehicleProfileId: map.vehicleProfileId },
      });
      updatedViewHistoriesCount += viewsRes.count;

      const analyticsRes = await prisma.guideAnalyticsEvent.updateMany({
        where: { vehicleGuideCardId: map.legacyId, vehicleProfileId: null },
        data: { vehicleProfileId: map.vehicleProfileId },
      });
      updatedAnalyticsEventsCount += analyticsRes.count;
    }
  }

  console.log(`\n====================================================`);
  console.log(`  BACKFILL COMPLETE REPORT                          `);
  console.log(`====================================================`);
  console.log(`- Created VehicleProfiles:       ${createdProfilesCount}`);
  console.log(`- Mapped Legacy Guide Cards:     ${legacyGuideMappingsCount}`);
  console.log(`- Mapped Legacy Discovery Cards: ${legacyDiscoveryMappingsCount}`);
  console.log(`- Updated Swipes Records:        ${updatedSwipesCount}`);
  console.log(`- Updated Impressions Records:   ${updatedImpressionsCount}`);
  console.log(`- Updated View History Records:  ${updatedViewHistoriesCount}`);
  console.log(`- Updated Analytics Records:     ${updatedAnalyticsEventsCount}`);
  console.log(`====================================================\n`);
}

main()
  .catch((e) => {
    console.error('Backfill error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
