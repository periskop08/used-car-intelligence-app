import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeLexical(code: string): string {
  return (code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('================================================================');
  console.log('🚀 OPTIMISTIC BATCH ENGINE CONSOLIDATION & CLEANUP');
  console.log('================================================================\n');

  // 1. Fetch all engines with variant counts
  const engines = await prisma.engine.findMany({
    include: {
      _count: { select: { variants: true } },
    },
  });
  console.log(`📦 Loaded ${engines.length} engine records from database.`);

  const pureBoxerRegex = /^(\d+\.\d+)\s+Boxer$/i;
  const boxerActions: Array<{
    sourceId: string;
    sourceCode: string;
    targetId: string;
    targetCode: string;
  }> = [];

  // Group 1: Pure Boxer Consolidation (e.g. "1.5 Boxer" -> "1.5")
  for (const eng of engines) {
    const match = eng.code.trim().match(pureBoxerRegex);
    if (match) {
      const targetDispCode = match[1];
      const candidateTargets = engines
        .filter(
          e =>
            e.code.trim() === targetDispCode &&
            e.displacement === eng.displacement &&
            e.fuelType === eng.fuelType,
        )
        .sort((a, b) => b._count.variants - a._count.variants);

      if (candidateTargets.length > 0 && candidateTargets[0].id !== eng.id) {
        boxerActions.push({
          sourceId: eng.id,
          sourceCode: eng.code,
          targetId: candidateTargets[0].id,
          targetCode: candidateTargets[0].code,
        });
      }
    }
  }

  // Group 2: Exact Case & Whitespace Typo Merges
  const boxerSourceIds = new Set(boxerActions.map(b => b.sourceId));
  const lexicalGroups = new Map<string, typeof engines>();

  for (const eng of engines) {
    if (boxerSourceIds.has(eng.id)) continue;
    const norm = normalizeLexical(eng.code);
    if (!norm) continue;

    const key = `${eng.displacement}_${eng.fuelType}_${norm}`;
    if (!lexicalGroups.has(key)) {
      lexicalGroups.set(key, []);
    }
    lexicalGroups.get(key)!.push(eng);
  }

  const caseWhitespaceActions: Array<{
    sourceId: string;
    sourceCode: string;
    targetId: string;
    targetCode: string;
  }> = [];

  for (const [, group] of lexicalGroups.entries()) {
    if (group.length > 1) {
      const sorted = [...group].sort((a, b) => {
        const aHasMultiSpace = /\s{2,}/.test(a.code);
        const bHasMultiSpace = /\s{2,}/.test(b.code);
        if (aHasMultiSpace !== bHasMultiSpace) {
          return aHasMultiSpace ? 1 : -1;
        }
        return b._count.variants - a._count.variants;
      });

      const canonical = sorted[0];

      for (let i = 1; i < sorted.length; i++) {
        const dupe = sorted[i];
        if (dupe.id !== canonical.id) {
          caseWhitespaceActions.push({
            sourceId: dupe.id,
            sourceCode: dupe.code,
            targetId: canonical.id,
            targetCode: canonical.code,
          });
        }
      }
    }
  }

  const allActions = [...boxerActions, ...caseWhitespaceActions];
  console.log(`📌 Total duplicate engine pairings to consolidate: ${allActions.length}`);

  let totalUpdated = 0;
  let totalMerged = 0;
  const retiredEngineIds = new Set<string>();

  for (let idx = 0; idx < allActions.length; idx++) {
    const action = allActions[idx];
    const sourceCount = await prisma.vehicleVariant.count({
      where: { engineId: action.sourceId },
    });

    if (sourceCount === 0) {
      retiredEngineIds.add(action.sourceId);
      continue;
    }

    try {
      // 1. Optimistic batch update
      const updateResult = await prisma.vehicleVariant.updateMany({
        where: { engineId: action.sourceId },
        data: { engineId: action.targetId },
      });
      totalUpdated += updateResult.count;
      retiredEngineIds.add(action.sourceId);
      console.log(
        `[${idx + 1}/${allActions.length}] Batch updated ${updateResult.count} variants: "${action.sourceCode}" -> "${action.targetCode}"`,
      );
    } catch (err: any) {
      if (err.code === 'P2002') {
        // 2. Conflict detected! Resolve item-by-item safely
        console.log(
          `[${idx + 1}/${allActions.length}] ⚠️ Conflict detected for "${action.sourceCode}" -> "${action.targetCode}". Resolving twins individually...`,
        );

        const variants = await prisma.vehicleVariant.findMany({
          where: { engineId: action.sourceId },
        });

        for (const v of variants) {
          const twin = await prisma.vehicleVariant.findFirst({
            where: {
              brandId: v.brandId,
              modelId: v.modelId,
              generationId: v.generationId,
              engineId: action.targetId,
              transmissionId: v.transmissionId,
              trimId: v.trimId,
              countryId: v.countryId,
              year: v.year,
              id: { not: v.id },
            },
          });

          if (twin) {
            await prisma.vehicleListing.updateMany({
              where: { vehicleVariantId: v.id },
              data: { vehicleVariantId: twin.id },
            });
            await prisma.generatedVehicleReport.updateMany({
              where: { variantId: v.id },
              data: { variantId: twin.id },
            });
            await prisma.vehicleVariant.delete({
              where: { id: v.id },
            });
            totalMerged++;
          } else {
            await prisma.vehicleVariant.update({
              where: { id: v.id },
              data: { engineId: action.targetId },
            });
            totalUpdated++;
          }
        }
        retiredEngineIds.add(action.sourceId);
        console.log(`[${idx + 1}/${allActions.length}] ✓ Resolved conflict twins for "${action.sourceCode}".`);
      } else {
        console.error(`[${idx + 1}/${allActions.length}] ❌ Error migrating "${action.sourceCode}": ${err.message}`);
      }
    }
  }

  // Cleanup Empty Retired Engine Records
  console.log('\n🧹 Cleaning up retired duplicate engine records...');
  let deletedEnginesCount = 0;
  for (const engineId of retiredEngineIds) {
    try {
      const remainingVariants = await prisma.vehicleVariant.count({
        where: { engineId },
      });
      if (remainingVariants === 0) {
        await prisma.engine.delete({
          where: { id: engineId },
        });
        deletedEnginesCount++;
      }
    } catch (err: any) {
      // Ignore if foreign key constraint exists
    }
  }

  console.log('\n================================================================');
  console.log('✅ COMPLETE ENGINE CONSOLIDATION FINISHED SUCCESSFULLY!');
  console.log(`  - Total Variants Re-pointed: ${totalUpdated}`);
  console.log(`  - Redundant Twin Variants Merged: ${totalMerged}`);
  console.log(`  - Empty Duplicate Engine Records Removed: ${deletedEnginesCount}`);
  console.log('================================================================\n');
}

main()
  .catch(err => {
    console.error('Fatal error during engine consolidation:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
