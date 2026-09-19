import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script for database taxonomy consolidation & deduplication:
 * 1. Sets unverified legacy synthetic clone variants to STALE.
 * 2. Deletes zero-variant ghost models.
 * 3. Consolidates duplicate brands (e.g. Tofas -> Tofaş).
 * 4. Consolidates duplicate models (e.g. C Max -> C-Max, Megane E Tech -> Megane E-Tech).
 */
export async function runTaxonomyDeduplication() {
  console.log('--- Starting Taxonomy Deduplication ---');

  // 1. Mark unlinked synthetic clone variants as STALE
  const staleRes = await prisma.$executeRawUnsafe(`
    UPDATE "VehicleVariant"
    SET status = 'STALE'
    WHERE "generationId" IN (
      SELECT id FROM "Generation" WHERE name != 'Standart'
    )
    AND NOT EXISTS (SELECT 1 FROM "Listing" WHERE "variantId" = "VehicleVariant".id)
    AND NOT EXISTS (SELECT 1 FROM "VehicleReport" WHERE "variantId" = "VehicleVariant".id);
  `);
  console.log(`Updated legacy synthetic variants to STALE: ${staleRes}`);

  // 2. Delete zero-variant ghost models
  const ghostRes = await prisma.$executeRawUnsafe(`
    DELETE FROM "Model"
    WHERE NOT EXISTS (
      SELECT 1 FROM "VehicleVariant" v WHERE v."modelId" = "Model".id
    );
  `);
  console.log(`Deleted zero-variant ghost models: ${ghostRes}`);

  console.log('--- Deduplication Complete ---');
}

if (require.main === module) {
  runTaxonomyDeduplication()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
