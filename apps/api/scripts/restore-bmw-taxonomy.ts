import { PrismaClient, FuelType } from '@prisma/client';

const prisma = new PrismaClient();

function toCleanTitleCase(str: string): string {
  if (!str) return '';
  const knownMap: Record<string, string> = {
    'M SPORT': 'M Sport',
    'EDITION M SPORT': 'Edition M Sport',
    'FIRST EDITION M SPORT': 'First Edition M Sport',
    'SPECIAL EDITION M SPORT': 'Special Edition M Sport',
    'ULTIMATE M SPORT': 'Ultimate M Sport',
    '50TH YEAR M EDITION': '50th Year M Edition',
    '40TH YEAR EDITION': '40th Year Edition',
    'LUXURY LINE': 'Luxury Line',
    'EDITION LUXURY LINE': 'Edition Luxury Line',
    'FIRST EDITION LUXURY LINE': 'First Edition Luxury Line',
    'SPECIAL EDITION LUXURY LINE': 'Special Edition Luxury Line',
    'LUXURY PLUS': 'Luxury Plus',
    'SPORT LINE': 'Sport Line',
    'EDITION SPORT LINE': 'Edition Sport Line',
    'FIRST EDITION SPORT LINE': 'First Edition Sport Line',
    'SPORT PLUS': 'Sport Plus',
    'MODERN LINE': 'Modern Line',
    'MODERN LINE PLUS': 'Modern Line Plus',
    'PREMIUM LINE': 'Premium Line',
    'URBAN LINE': 'Urban Line',
    'ADVANTAGE': 'Advantage',
    'PRESTIGE': 'Prestige',
    'PREMIUM': 'Premium',
    'JOY': 'Joy',
    'JOY PLUS': 'Joy Plus',
    'JOY EDITION': 'Joy Edition',
    'M JOY': 'M Joy',
    'M JOY PLUS': 'M Joy Plus',
    'M PLUS': 'M Plus',
    'EXECUTIVE': 'Executive',
    'EXECUTIVE M': 'Executive M',
    'EXECUTIVE M SPORT': 'Executive M Sport',
    'EXECUTIVE LUXURY': 'Executive Luxury',
    'EXECUTIVE LUXURY LINE': 'Executive Luxury Line',
    'EXECUTIVE SPORT': 'Executive Sport',
    'EXECUTIVE SPORT LINE': 'Executive Sport Line',
    'COMFORT': 'Comfort',
    'COMFORT PLUS': 'Comfort Plus',
    'PURE': 'Pure',
    'PURE EXCELLENCE': 'Pure Excellence',
    'STANDART': 'Standart',
    'ONE EDITION M': 'One Edition M',
    'GRAN COUPE': 'Gran Coupe',
    'EXCLUSIVE': 'Exclusive',
    'TECHNO': 'Techno',
    'EDITION ELECTRIC': 'Edition Electric',
    'PREMIUM TECHNO': 'Premium Techno',
    'EXECUTIVE LOUNGE': 'Executive Lounge',
  };

  const upper = str.trim().toUpperCase();
  if (knownMap[upper]) return knownMap[upper];

  return upper
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const TRIM_WORDS = [
  'LINE', 'SPORT', 'M SPORT', 'EDITION', 'LUXURY', 'COMFORT', 'ADVANTAGE', 'JOY',
  'PRESTIGE', 'PREMIUM', 'STYLE', 'PURE', 'URBAN', 'EXECUTIVE', 'STANDART', 'STANDARD'
];

function isContaminatedEngineCode(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  const hasDigits = /\d/.test(clean);
  const matchesTrimWord = TRIM_WORDS.some(
    w => clean === w || clean.endsWith(' ' + w) || clean.startsWith(w + ' ')
  );
  const isSpecialEdition =
    /edition|paket|package|donanim/i.test(clean) &&
    !/(\d+\.\d+)/.test(clean) &&
    !/tdi|tsi|tfsi|dci|cdi|crdi|puretech|ecoboost/i.test(clean);

  return (!hasDigits && matchesTrimWord) || isSpecialEdition;
}

const trimIdCache = new Map<string, string>();

async function getOrCreateTrim(name: string): Promise<string> {
  const cleanName = toCleanTitleCase(name);
  if (trimIdCache.has(cleanName)) {
    return trimIdCache.get(cleanName)!;
  }
  const existing = await prisma.trim.findFirst({
    where: { name: { equals: cleanName, mode: 'insensitive' } },
  });
  if (existing) {
    trimIdCache.set(cleanName, existing.id);
    return existing.id;
  }

  const created = await prisma.trim.create({
    data: { name: cleanName },
  });
  trimIdCache.set(cleanName, created.id);
  return created.id;
}

async function main() {
  console.log('================================================================');
  console.log('🚀 BULLETPROOF RESTORATION OF BMW TAXONOMY');
  console.log('================================================================\n');

  // 1. Ensure 218i is PETROL
  await prisma.engine.updateMany({
    where: { code: '218i', fuelType: 'OTHER' },
    data: { fuelType: FuelType.PETROL },
  });

  // 2. Fetch canonical BMW engines for 1600cc Petrol
  const canonicalEngines: Record<string, string> = {};

  const e320i = await prisma.engine.findFirst({ where: { code: '320i', fuelType: 'PETROL', displacement: 1600 } });
  if (e320i) canonicalEngines['3 Serisi'] = e320i.id;

  const e520i = await prisma.engine.findFirst({ where: { code: '520i', fuelType: 'PETROL', displacement: 1600 } });
  if (e520i) canonicalEngines['5 Serisi'] = e520i.id;

  const e118i = await prisma.engine.findFirst({ where: { code: '118i', fuelType: 'PETROL', displacement: 1600 } });
  if (e118i) canonicalEngines['1 Serisi'] = e118i.id;

  const e420i = await prisma.engine.findFirst({ where: { code: '420i', fuelType: 'PETROL', displacement: 1600 } });
  if (e420i) canonicalEngines['4 Serisi'] = e420i.id;

  const e218i = await prisma.engine.findFirst({ where: { code: '218i', fuelType: 'PETROL', displacement: 1600 } });
  if (e218i) canonicalEngines['2 Serisi'] = e218i.id;

  const e730i = await prisma.engine.findFirst({ where: { code: '730i', fuelType: 'PETROL', displacement: 1600 } });
  if (e730i) canonicalEngines['7 Serisi'] = e730i.id;

  console.log('📌 Canonical BMW Target Engines:');
  for (const [m, id] of Object.entries(canonicalEngines)) {
    console.log(`  - BMW ${m} -> Engine ID ${id}`);
  }

  // 3. Find all distinct fake engines
  const allEngines = await prisma.engine.findMany();
  const fakeEngines = allEngines.filter(e => isContaminatedEngineCode(e.code));
  const fakeEngineMap = new Map(fakeEngines.map(e => [e.id, e]));

  const targetModels = Object.keys(canonicalEngines);

  let grandTotalUpdated = 0;
  let grandTotalMerged = 0;
  const retiredEngineIds = new Set<string>();

  for (const modelName of targetModels) {
    const targetEngineId = canonicalEngines[modelName];
    if (!targetEngineId) continue;

    console.log(`\n🚗 Processing BMW ${modelName}...`);

    // Fetch all variants for this BMW model
    const variants = await prisma.vehicleVariant.findMany({
      where: {
        brand: { name: 'BMW' },
        model: { name: modelName },
      },
      select: {
        id: true,
        generationId: true,
        transmissionId: true,
        countryId: true,
        year: true,
        engineId: true,
        trimId: true,
      },
    });

    console.log(`  Found ${variants.length} total variants for BMW ${modelName}`);

    // Build lookup table of existing variant identities:
    // Key: genId|transId|countryId|year|engineId|trimId
    const identityMap = new Map<string, string>();
    for (const v of variants) {
      const key = `${v.generationId ?? 'null'}|${v.transmissionId}|${v.countryId ?? 'null'}|${v.year}|${v.engineId}|${v.trimId}`;
      identityMap.set(key, v.id);
    }

    const rePoints: Array<{ duplicateId: string; survivorId: string }> = [];
    const toDeleteIds: string[] = [];
    const toUpdateGroups = new Map<string, string[]>(); // trimId -> variantIds

    let modelUpdated = 0;
    let modelMerged = 0;

    for (const v of variants) {
      const fakeEng = fakeEngineMap.get(v.engineId);
      if (!fakeEng) continue; // Not a fake engine

      retiredEngineIds.add(fakeEng.id);
      const targetTrimId = await getOrCreateTrim(fakeEng.code);
      const targetKey = `${v.generationId ?? 'null'}|${v.transmissionId}|${v.countryId ?? 'null'}|${v.year}|${targetEngineId}|${targetTrimId}`;

      const existingSurvivorId = identityMap.get(targetKey);

      if (existingSurvivorId && existingSurvivorId !== v.id) {
        // A variant already exists (or was earlier assigned) for this exact target identity.
        // v is a duplicate twin!
        rePoints.push({ duplicateId: v.id, survivorId: existingSurvivorId });
        toDeleteIds.push(v.id);
        modelMerged++;
      } else {
        // v becomes the survivor!
        identityMap.set(targetKey, v.id);
        if (!toUpdateGroups.has(targetTrimId)) {
          toUpdateGroups.set(targetTrimId, []);
        }
        toUpdateGroups.get(targetTrimId)!.push(v.id);
        modelUpdated++;
      }
    }

    // Step A: Re-point references for duplicate twins
    if (rePoints.length > 0) {
      const dupToSurvivor = new Map(rePoints.map(p => [p.duplicateId, p.survivorId]));
      const dupIds = Array.from(dupToSurvivor.keys());

      // Only check and re-point records that actually exist
      const listings = await prisma.vehicleListing.findMany({
        where: { vehicleVariantId: { in: dupIds } },
        select: { id: true, vehicleVariantId: true },
      });
      for (const l of listings) {
        if (l.vehicleVariantId && dupToSurvivor.has(l.vehicleVariantId)) {
          await prisma.vehicleListing.update({
            where: { id: l.id },
            data: { vehicleVariantId: dupToSurvivor.get(l.vehicleVariantId)! },
          });
        }
      }

      const reports = await prisma.generatedVehicleReport.findMany({
        where: { variantId: { in: dupIds } },
        select: { id: true, variantId: true },
      });
      for (const r of reports) {
        if (r.variantId && dupToSurvivor.has(r.variantId)) {
          await prisma.generatedVehicleReport.update({
            where: { id: r.id },
            data: { variantId: dupToSurvivor.get(r.variantId)! },
          });
        }
      }

      const aiReports = await prisma.aiVehicleReport.findMany({
        where: { variantId: { in: dupIds } },
        select: { id: true, variantId: true },
      });
      for (const ar of aiReports) {
        if (ar.variantId && dupToSurvivor.has(ar.variantId)) {
          await prisma.aiVehicleReport.update({
            where: { id: ar.id },
            data: { variantId: dupToSurvivor.get(ar.variantId)! },
          });
        }
      }
      console.log(`  🔗 Re-pointed active references (Listings: ${listings.length}, Reports: ${reports.length}, AI Reports: ${aiReports.length})`);
    }

    // Step B: Batch Delete duplicate variants
    if (toDeleteIds.length > 0) {
      console.log(`  🗑️  Deleting ${toDeleteIds.length} duplicate twin variants...`);
      const BATCH_SIZE = 500;
      for (let i = 0; i < toDeleteIds.length; i += BATCH_SIZE) {
        const batch = toDeleteIds.slice(i, i + BATCH_SIZE);
        await prisma.vehicleVariant.deleteMany({
          where: { id: { in: batch } },
        });
      }
    }

    // Step C: Batch Update surviving variants to genuine engine and trim
    console.log(`  ⚙️  Updating ${modelUpdated} surviving variants to canonical engine & trim...`);
    for (const [trimId, varIds] of toUpdateGroups.entries()) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < varIds.length; i += BATCH_SIZE) {
        const batch = varIds.slice(i, i + BATCH_SIZE);
        await prisma.vehicleVariant.updateMany({
          where: { id: { in: batch } },
          data: {
            engineId: targetEngineId,
            trimId: trimId,
          },
        });
      }
    }

    console.log(`  ✅ BMW ${modelName}: ${modelUpdated} variants restored, ${modelMerged} duplicates merged.`);
    grandTotalUpdated += modelUpdated;
    grandTotalMerged += modelMerged;
  }

  // 4. Cleanup Empty Retired Engine Records
  console.log('\n🧹 Cleaning up retired fake engine records...');
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
      // Ignore if referenced
    }
  }

  console.log('\n================================================================');
  console.log('🎉 BMW TAXONOMY RESTORATION COMPLETED SUCCESSFULLY!');
  console.log(`  - Total Variants Restored to Real Engines & Trims: ${grandTotalUpdated}`);
  console.log(`  - Duplicate Twin Variants Merged & Cleaned: ${grandTotalMerged}`);
  console.log(`  - Empty Fake Engine Records Deleted: ${deletedEnginesCount}`);
  console.log('================================================================\n');
}

main()
  .catch(err => {
    console.error('Fatal error during BMW taxonomy restoration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
