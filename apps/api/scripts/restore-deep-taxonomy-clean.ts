import { PrismaClient, FuelType, BodyType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🚀 FAST DEEP TAXONOMY PURGE & RESTORATION');
  console.log('================================================================\n');

  // ------------------------------------------------------------------
  // PART 1: PURGE FAKE BODY/EDITION ENGINES
  // ------------------------------------------------------------------
  console.log('--- PART 1: PURGING FAKE BODY/EDITION ENGINES ---');

  const FAKE_ENGINES_TO_PURGE: Record<string, { targetTrim: string; targetBodyType?: BodyType; preferredEngine?: string }> = {
    'TOURING': { targetTrim: 'Touring', targetBodyType: BodyType.STATION_WAGON, preferredEngine: '320i' },
    'GRAN TURISMO': { targetTrim: 'Gran Turismo', targetBodyType: BodyType.HATCHBACK, preferredEngine: '320i' },
    'COMPACT': { targetTrim: 'Compact', targetBodyType: BodyType.HATCHBACK, preferredEngine: '316i' },
    'GRAN COUPE': { targetTrim: 'Gran Coupe', targetBodyType: BodyType.COUPE, preferredEngine: '420i' },
    '5.0 JAHRE EDITION': { targetTrim: '50 Jahre Edition', preferredEngine: '320i' },
    'CDI SPECIAL EDITION 1': { targetTrim: 'Special Edition 1', preferredEngine: '2.0 C220d' },
    '2.0 (320I)': { targetTrim: 'Standard', preferredEngine: '320i' },
  };

  for (const [fakeCode, config] of Object.entries(FAKE_ENGINES_TO_PURGE)) {
    const fakeEngines = await prisma.engine.findMany({
      where: { code: fakeCode },
    });
    if (fakeEngines.length === 0) continue;

    console.log(`\nProcessing fake engine code: "${fakeCode}" (${fakeEngines.length} engine records)...`);

    for (const fakeEng of fakeEngines) {
      const variants = await prisma.vehicleVariant.findMany({
        where: { engineId: fakeEng.id },
        include: { brand: true, model: true, trim: true },
      });

      if (variants.length === 0) {
        try {
          await prisma.engine.delete({ where: { id: fakeEng.id } });
          console.log(`  Deleted empty fake engine record: ${fakeEng.id}`);
        } catch {}
        continue;
      }

      console.log(`  Found ${variants.length} variants on engine "${fakeCode}"...`);

      // Group variants by brand + model to optimize twin lookup in memory
      const modelMap = new Map<string, typeof variants>();
      for (const v of variants) {
        const key = `${v.brandId}|${v.modelId}`;
        if (!modelMap.has(key)) modelMap.set(key, []);
        modelMap.get(key)!.push(v);
      }

      let totalRestored = 0;
      let totalMerged = 0;

      for (const [key, modelVariants] of modelMap.entries()) {
        const brandId = modelVariants[0].brandId;
        const modelId = modelVariants[0].modelId;

        // Find canonical replacement engine
        let canonicalEngine = await prisma.engine.findFirst({
          where: {
            code: config.preferredEngine,
            variants: { some: { brandId, modelId } },
          },
        });

        if (!canonicalEngine) {
          canonicalEngine = await prisma.engine.findFirst({
            where: { code: config.preferredEngine },
          });
        }

        if (!canonicalEngine) {
          canonicalEngine = await prisma.engine.findFirst({
            where: {
              variants: { some: { brandId, modelId } },
              code: { notIn: Object.keys(FAKE_ENGINES_TO_PURGE) },
            },
          });
        }

        if (!canonicalEngine) continue;

        // Find or create target trim
        let targetTrim = await prisma.trim.findFirst({
          where: { name: config.targetTrim },
        });
        if (!targetTrim) {
          targetTrim = await prisma.trim.create({
            data: { name: config.targetTrim },
          });
        }

        // Fetch all existing variants for this brand + model once
        const allModelVariants = await prisma.vehicleVariant.findMany({
          where: { brandId, modelId },
          select: {
            id: true,
            generationId: true,
            engineId: true,
            transmissionId: true,
            trimId: true,
            countryId: true,
            year: true,
          },
        });

        const identityMap = new Map<string, string>();
        for (const v of allModelVariants) {
          const idKey = `${v.generationId}|${v.engineId}|${v.transmissionId}|${v.trimId}|${v.countryId}|${v.year}`;
          identityMap.set(idKey, v.id);
        }

        const toDeleteIds: string[] = [];
        const toUpdateItems: Array<{ id: string; targetTrimId: string; targetBody?: BodyType }> = [];

        for (const v of modelVariants) {
          const targetBody = config.targetBodyType || v.bodyType;
          const targetTrimId = (v.trim?.name && v.trim.name !== 'Standart' && v.trim.name !== 'Standard')
            ? v.trimId
            : targetTrim.id;

          const targetKey = `${v.generationId}|${canonicalEngine.id}|${v.transmissionId}|${targetTrimId}|${v.countryId}|${v.year}`;
          const existingTwinId = identityMap.get(targetKey);

          if (existingTwinId && existingTwinId !== v.id) {
            // Re-point listings & reports
            await prisma.vehicleListing.updateMany({
              where: { vehicleVariantId: v.id },
              data: { vehicleVariantId: existingTwinId },
            });
            await prisma.generatedVehicleReport.updateMany({
              where: { variantId: v.id },
              data: { variantId: existingTwinId },
            });
            await prisma.aiVehicleReport.updateMany({
              where: { variantId: v.id },
              data: { variantId: existingTwinId },
            });

            toDeleteIds.push(v.id);
            totalMerged++;
          } else {
            identityMap.set(targetKey, v.id);
            toUpdateItems.push({ id: v.id, targetTrimId, targetBody });
            totalRestored++;
          }
        }

        // Batch delete duplicates
        if (toDeleteIds.length > 0) {
          for (let i = 0; i < toDeleteIds.length; i += 500) {
            const chunk = toDeleteIds.slice(i, i + 500);
            await prisma.vehicleVariant.deleteMany({
              where: { id: { in: chunk } },
            });
          }
        }

        // Batch update surviving variants
        for (const item of toUpdateItems) {
          await prisma.vehicleVariant.update({
            where: { id: item.id },
            data: {
              engineId: canonicalEngine.id,
              trimId: item.targetTrimId,
              bodyType: item.targetBody,
            },
          });
        }
      }

      console.log(`  -> Restored: ${totalRestored}, Merged duplicates: ${totalMerged}`);

      // Delete fake engine
      try {
        await prisma.engine.delete({ where: { id: fakeEng.id } });
        console.log(`  -> Purged fake engine "${fakeCode}" (${fakeEng.id})`);
      } catch (err: any) {
        console.warn(`  -> Could not delete engine: ${err.message}`);
      }
    }
  }

  // ------------------------------------------------------------------
  // PART 2: FUEL TYPE CONTRADICTION RECONCILIATION
  // ------------------------------------------------------------------
  console.log('\n--- PART 2: RECONCILING FUEL TYPE CONTRADICTIONS ---');

  const dieselUpdates = await prisma.$executeRawUnsafe(`
    UPDATE "VehicleVariant" v
    SET "fuelType" = 'DIESEL'
    FROM "Engine" e
    WHERE v."engineId" = e."id"
      AND v."fuelType" = 'PETROL'
      AND (
        e."code" ~* ' (CDI|TDI|DCI|CRDI|HDI|BLUEHDI|MULTIJET)$'
        OR e."code" ~* '^\\d{3}d( |$| xdrive| GT)'
        OR e."code" ~* 'DIESEL'
      )
  `);
  console.log(`Fixed ${dieselUpdates} variants: misclassified DIESEL engines restored to DIESEL.`);

  const petrolUpdates = await prisma.$executeRawUnsafe(`
    UPDATE "VehicleVariant" v
    SET "fuelType" = 'PETROL'
    FROM "Engine" e
    WHERE v."engineId" = e."id"
      AND v."fuelType" = 'DIESEL'
      AND (
        e."code" ~* ' (TSI|TFSI|PURETECH|ECOBOOST|VTEC|GDI|THP|VTI)$'
        OR e."code" ~* '^\\d{3}i( |$| xdrive| ED)'
        OR e."code" ~* 'BENZIN'
      )
  `);
  console.log(`Fixed ${petrolUpdates} variants: misclassified PETROL engines restored to PETROL.`);

  const hybridUpdates = await prisma.$executeRawUnsafe(`
    UPDATE "VehicleVariant" v
    SET "fuelType" = 'HYBRID'
    FROM "Engine" e
    WHERE v."engineId" = e."id"
      AND v."fuelType" != 'HYBRID'
      AND (
        e."code" ~* '^\\d{3}e( |$| xdrive)'
        OR e."code" ~* 'HYBRID'
        OR e."isHybrid" = true
      )
  `);
  console.log(`Fixed ${hybridUpdates} variants: misclassified HYBRID engines restored to HYBRID.`);

  // ------------------------------------------------------------------
  // PART 3: GHOST VARIANTS PURGE FOR DISCONTINUED ENGINES
  // ------------------------------------------------------------------
  console.log('\n--- PART 3: PURGING DISCONTINUED GHOST VARIANTS (> PRODUCTION YEAR) ---');

  // BMW 328i (ended 2015)
  const ghost328 = await prisma.$executeRawUnsafe(`
    DELETE FROM "VehicleVariant" v
    USING "Brand" b, "Model" m, "Engine" e
    WHERE v."brandId" = b."id" AND v."modelId" = m."id" AND v."engineId" = e."id"
      AND b."name" = 'BMW' AND m."name" = '3 Serisi'
      AND e."code" IN ('328I', '328i')
      AND v."year" > 2015
      AND NOT EXISTS (SELECT 1 FROM "VehicleListing" l WHERE l."vehicleVariantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "GeneratedVehicleReport" r WHERE r."variantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "AiVehicleReport" ar WHERE ar."variantId" = v."id")
  `);
  console.log(`Purged ${ghost328} ghost BMW 328i variants for years > 2015.`);

  // BMW 320i ED (EfficientDynamics ended 2015)
  const ghost320ed = await prisma.$executeRawUnsafe(`
    DELETE FROM "VehicleVariant" v
    USING "Brand" b, "Model" m, "Engine" e
    WHERE v."brandId" = b."id" AND v."modelId" = m."id" AND v."engineId" = e."id"
      AND b."name" = 'BMW' AND m."name" = '3 Serisi'
      AND e."code" = '320i ED'
      AND v."year" > 2016
      AND NOT EXISTS (SELECT 1 FROM "VehicleListing" l WHERE l."vehicleVariantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "GeneratedVehicleReport" r WHERE r."variantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "AiVehicleReport" ar WHERE ar."variantId" = v."id")
  `);
  console.log(`Purged ${ghost320ed} ghost BMW 320i ED variants for years > 2016.`);

  // BMW E36/E46 Compact / ti (ended 2004)
  const ghostTi = await prisma.$executeRawUnsafe(`
    DELETE FROM "VehicleVariant" v
    USING "Brand" b, "Model" m, "Engine" e
    WHERE v."brandId" = b."id" AND v."modelId" = m."id" AND v."engineId" = e."id"
      AND b."name" = 'BMW' AND m."name" = '3 Serisi'
      AND e."code" ~* '^(316ti|318ti|323ti|325ti|318is|318tds|325tds|320td Compact)'
      AND v."year" > 2005
      AND NOT EXISTS (SELECT 1 FROM "VehicleListing" l WHERE l."vehicleVariantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "GeneratedVehicleReport" r WHERE r."variantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "AiVehicleReport" ar WHERE ar."variantId" = v."id")
  `);
  console.log(`Purged ${ghostTi} ghost BMW Compact/ti variants for years > 2005.`);

  // BMW 3 Serisi Gran Turismo (ended 2019)
  const ghostGT = await prisma.$executeRawUnsafe(`
    DELETE FROM "VehicleVariant" v
    USING "Brand" b, "Model" m, "Engine" e
    WHERE v."brandId" = b."id" AND v."modelId" = m."id" AND v."engineId" = e."id"
      AND b."name" = 'BMW' AND m."name" = '3 Serisi'
      AND e."code" ~* 'GT$'
      AND v."year" > 2019
      AND NOT EXISTS (SELECT 1 FROM "VehicleListing" l WHERE l."vehicleVariantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "GeneratedVehicleReport" r WHERE r."variantId" = v."id")
      AND NOT EXISTS (SELECT 1 FROM "AiVehicleReport" ar WHERE ar."variantId" = v."id")
  `);
  console.log(`Purged ${ghostGT} ghost BMW Gran Turismo variants for years > 2019.`);

  console.log('\n================================================================');
  console.log('🎉 FAST DEEP TAXONOMY PURGE & RESTORATION COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

main()
  .catch(err => {
    console.error('Fatal error during deep taxonomy restoration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
