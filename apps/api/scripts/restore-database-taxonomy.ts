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
    'PREMIUM PLUS': 'Premium Plus',
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
    'AMG': 'AMG',
    'AVANTGARDE': 'Avantgarde',
    'FASCINATION': 'FASCINATION',
    'PROGRESSIVE': 'Progressive',
    'STYLE': 'Style',
    'SPORT': 'Sport',
    'EDITION 1 AMG': 'Edition 1 AMG',
    'EDITION 1': 'Edition 1',
    'BLUEEFFICIENCY AMG': 'AMG',
    'BLUEEFFICIENCY AVANTGARDE': 'Avantgarde',
    'BLUEEFFICIENCY FASCINATION': 'Fascination',
    'BLUEEFFICIENCY SPORT': 'Sport',
    'BLUEEFFICIENCY STYLE': 'Style',
    'BLUEEFFICIENCY URBAN': 'Urban',
    'BLUEEFFICIENCY ELEGANCE': 'Elegance',
    'BLUEEFFICIENCY PRIME': 'Prime',
    'KOMP AVANTGARDE': 'Avantgarde',
    'KOMP ELEGANCE': 'Elegance',
    'KOMP SPORT': 'Sport',
    'KOMP BLUEEFFICIENCY AMG': 'AMG',
    'KOMP BLUEEFFICIENCY AVANTGARDE': 'Avantgarde',
    'KOMP BLUEEFFICIENCY ELEGANCE': 'Elegance',
    'F SPORT': 'F Sport',
    'F SPORT DESIGN': 'F Sport Design',
    'F SPORT PLUS': 'F Sport Plus',
    'E BOXER STYLE': 'Style',
    'E BOXER SPORT': 'Sport',
    'E BOXER XTREME': 'Xtreme',
    'E BOXER FUN': 'Fun',
    'E BOXER XCLUSIVE': 'Exclusive',
    'TREND': 'Trend',
    'TREND X': 'Trend X',
    'TITANIUM': 'Titanium',
    'TITANIUM PLUS': 'Titanium Plus',
    'GHIA': 'Ghia',
    'FLAIR': 'Flair',
    'FUN': 'Fun',
    'ALLURE': 'Allure',
    'ACTIVE': 'Active',
    'FEEL': 'Feel',
    'SHINE': 'Shine',
    'TOUCH': 'Touch',
    'ICON': 'Icon',
    'AVANTGARDE 1': 'Avantgarde 1',
    'AVANTGARDE 2': 'Avantgarde 2',
    'CLASSIC': 'Classic',
    'CLASSIC 1': 'Classic 1',
    'CLASSIC 2': 'Classic 2',
    'ELEGANCE 1': 'Elegance 1',
    'ELEGANCE 2': 'Elegance 2',
    'AMG 1': 'AMG 1',
    'PROGRESSIVE 1': 'Progressive 1',
    'ESPRIT': 'Esprit',
    'SPORTCOUPE': 'SportCoupe',
    'ALL TERRAIN': 'All-Terrain',
    'TECHNOLOGY': 'Technology',
    'BUSINESS': 'Business',
    'PRIME': 'Prime',
    'LIFE': 'Life',
    'PRESTIGE 1': 'Prestige 1',
    'URBAN 1': 'Urban 1',
    'ICONIC': 'Iconic',
    'INSPIRED': 'Inspired',
    'CROSS': 'Cross',
    'INTENSE': 'Intense',
    'ELITE': 'Elite',
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
  'PRESTIGE', 'PREMIUM', 'STYLE', 'PURE', 'URBAN', 'EXECUTIVE', 'STANDART', 'STANDARD',
  'AMG', 'AVANTGARDE', 'FASCINATION', 'EXCLUSIVE', 'PROGRESSIVE', 'ALLURE', 'GT LINE',
  'FEEL', 'SHINE', 'LIVE', 'TOUCH', 'ICON', 'INTENSE', 'TITANIUM', 'TREND',
  'ELITE', 'STYLE', 'ELEGANCE', 'AMBITION', 'ACTIVE', 'DYNAMIC', 'PASSION',
  'GHIA', 'FLAIR', 'FUN', 'F SPORT', 'BLUEEFFICIENCY', 'KOMP', 'E BOXER',
  'TECHNOLOGY', 'BUSINESS', 'PRIME', 'CLASSIC', 'ESPRIT', 'SPORTCOUPE', 'ALL TERRAIN',
  'LIFE', 'ICONIC', 'INSPIRED', 'CROSS'
];

export function isContaminatedEngineCode(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();

  const numberedTrimRegex = /^(AVANTGARDE|CLASSIC|ELEGANCE|AMG|PROGRESSIVE|PRESTIGE|URBAN|STYLE|SPORT|COMFORT|EXECUTIVE|TITANIUM|TREND)\s+\d+$/i;
  if (numberedTrimRegex.test(clean)) {
    return true;
  }

  const hasDigits = /\d/.test(clean);

  if (clean.startsWith('BLUEEFFICIENCY ') || clean.startsWith('KOMP ') || clean.startsWith('E BOXER ')) {
    return true;
  }
  if (['F SPORT', 'F SPORT DESIGN', 'F SPORT PLUS', 'EDITION 1 AMG', '300 4 MATIC AMG', 'M JOY PLUS', 'M PLUS', 'TECHNO PLUS', 'ALL TERRAIN'].includes(clean)) {
    return true;
  }

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

// Explicit canonical engine overrides for popular models
const KNOWN_CANONICAL_ENGINES: Record<string, Record<string, string>> = {
  // Brand -> Model -> Engine Code
  'Mercedes-Benz': {
    'C Serisi': '1.5 C180',
    'E Serisi': '2.0 E200',
    'A Serisi': '1.3 A180',
    'B Serisi': '1.3 B180',
    'Cla': '1.3 A180',
    'Gla': '1.3 A180',
    'S Serisi': '3.0 S500 4MATIC MHEV',
    'Clk': '1.5 C180',
    'Clc': '1.5 C180',
  },
  'Lexus': {
    'Rx': '2.5 Hybrid e-CVT',
    'Nx': '2.5 Hybrid e-CVT',
    'Gs': '2.5 Hybrid e-CVT',
    'Is': '2.5 Hybrid e-CVT',
    'Rc': '2.5 Hybrid e-CVT',
  },
  'Subaru': {
    'Forester': '2.0 Boxer e-Boxer',
    'XV': '2.0 Boxer e-Boxer',
  },
  'Toyota': {
    'Yaris': '1.5 Hybrid',
    'Corolla': '1.5 VVT-i',
  },
  'Ford': {
    'Fiesta': '1.0 EcoBoost',
    'Focus': '1.0 EcoBoost',
    'Puma': '1.0 EcoBoost',
  },
};

const canonicalCache = new Map<string, string | null>();

async function findCanonicalEngineId(brand: string, model: string, fuelType?: FuelType | null): Promise<string | null> {
  const cacheKey = `${brand}|${model}|${fuelType || 'ALL'}`;
  if (canonicalCache.has(cacheKey)) {
    return canonicalCache.get(cacheKey)!;
  }

  // 1. Check known explicit override
  const overrideCode = KNOWN_CANONICAL_ENGINES[brand]?.[model];
  if (overrideCode) {
    const found = await prisma.engine.findFirst({
      where: { code: overrideCode },
    });
    if (found) {
      canonicalCache.set(cacheKey, found.id);
      return found.id;
    }
  }

  const safeBrand = brand.replace(/'/g, "''");
  const safeModel = model.replace(/'/g, "''");

  // 2. Discover from existing non-contaminated variants of this model
  const candidates: Array<{ id: string; code: string; cnt: number }> = await prisma.$queryRawUnsafe(`
    SELECT e.id, e.code, COUNT(v.id)::int as cnt
    FROM "VehicleVariant" v
    JOIN "Brand" b ON b.id = v."brandId"
    JOIN "Model" m ON m.id = v."modelId"
    JOIN "Engine" e ON e.id = v."engineId"
    WHERE b.name = '${safeBrand}' AND m.name = '${safeModel}'
      AND e.code NOT SIMILAR TO '(AMG.*|AVANTGARDE.*|FASCINATION.*|EXCLUSIVE.*|PROGRESSIVE.*|STYLE.*|SPORT.*|EDITION.*|STANDART.*|COMFORT.*|URBAN.*|PRESTIGE.*|PREMIUM.*|BLUEEFFICIENCY.*|KOMP.*|CGI.*|BLUETEC.*|TREND.*|TITANIUM.*|FEEL.*|SHINE.*|ALLURE.*|GT.*|E BOXER.*|TECHNOLOGY.*|BUSINESS.*|PRIME.*|CLASSIC.*|ELEGANCE.*|ALL TERRAIN.*|SPORTCOUPE.*|ESPRIT.*|LIFE.*|ICONIC.*|INSPIRED.*|CROSS.*)'
      ${fuelType ? `AND e."fuelType" = '${fuelType}'` : ''}
    GROUP BY e.id, e.code
    ORDER BY cnt DESC
    LIMIT 1
  `);

  if (candidates.length > 0 && candidates[0].id) {
    canonicalCache.set(cacheKey, candidates[0].id);
    return candidates[0].id;
  }

  // 3. Fallback: Any genuine engine for this brand
  const brandFallback: Array<{ id: string }> = await prisma.$queryRawUnsafe(`
    SELECT e.id, COUNT(v.id)::int as cnt
    FROM "VehicleVariant" v
    JOIN "Brand" b ON b.id = v."brandId"
    JOIN "Engine" e ON e.id = v."engineId"
    WHERE b.name = '${safeBrand}'
      AND e.code NOT SIMILAR TO '(AMG.*|AVANTGARDE.*|FASCINATION.*|EXCLUSIVE.*|PROGRESSIVE.*|STYLE.*|SPORT.*|EDITION.*|STANDART.*|COMFORT.*|URBAN.*|PRESTIGE.*|PREMIUM.*|BLUEEFFICIENCY.*|KOMP.*|CGI.*|BLUETEC.*|TREND.*|TITANIUM.*|FEEL.*|SHINE.*|ALLURE.*|GT.*|E BOXER.*|TECHNOLOGY.*|BUSINESS.*|PRIME.*|CLASSIC.*|ELEGANCE.*|ALL TERRAIN.*|SPORTCOUPE.*|ESPRIT.*|LIFE.*|ICONIC.*|INSPIRED.*|CROSS.*)'
      ${fuelType ? `AND e."fuelType" = '${fuelType}'` : ''}
    GROUP BY e.id
    ORDER BY cnt DESC
    LIMIT 1
  `);

  let result = brandFallback[0]?.id || null;

  // 4. Electric vehicle default fallback
  if (!result && fuelType === 'ELECTRIC') {
    const defaultEv = await prisma.engine.findFirst({
      where: { fuelType: 'ELECTRIC', code: 'Electric Motor' },
      select: { id: true },
    });
    if (defaultEv) {
      result = defaultEv.id;
    }
  }

  canonicalCache.set(cacheKey, result);
  return result;
}

async function main() {
  console.log('================================================================');
  console.log('🌐 DATABASE-WIDE VEHICLE TAXONOMY RESTORATION & CLEANUP');
  console.log('================================================================\n');

  // Step 1: Fetch all fake engines
  const allEngines = await prisma.engine.findMany();
  const fakeEngines = allEngines.filter(e => isContaminatedEngineCode(e.code));
  const fakeEngineMap = new Map(fakeEngines.map(e => [e.id, e]));
  const fakeIdsList = fakeEngines.map(e => `'${e.id}'`).join(',');

  console.log(`Found ${fakeEngines.length} fake engine codes in Engine table.\n`);

  // Step 2: Group contaminated variants by Brand and Model
  const targetGroups: Array<{ brand: string; model: string; cnt: number }> =
    await prisma.$queryRawUnsafe(`
      SELECT b.name as brand, m.name as model, COUNT(v.id)::int as cnt
      FROM "VehicleVariant" v
      JOIN "Brand" b ON b.id = v."brandId"
      JOIN "Model" m ON m.id = v."modelId"
      WHERE v."engineId" IN (${fakeIdsList})
      GROUP BY b.name, m.name
      ORDER BY cnt DESC
    `);

  console.log(`Found ${targetGroups.length} brand+model combinations with fake engines.`);
  console.log(`Total variants to process: ${targetGroups.reduce((a, b) => a + b.cnt, 0)}\n`);

  let grandTotalUpdated = 0;
  let grandTotalMerged = 0;
  const retiredEngineIds = new Set<string>();

  for (let idx = 0; idx < targetGroups.length; idx++) {
    const group = targetGroups[idx];
    const { brand, model, cnt } = group;

    // Fetch all variants for this brand + model
    const variants = await prisma.vehicleVariant.findMany({
      where: {
        brand: { name: brand },
        model: { name: model },
      },
      select: {
        id: true,
        generationId: true,
        transmissionId: true,
        countryId: true,
        year: true,
        engineId: true,
        trimId: true,
        fuelType: true,
      },
    });

    // Lookup table of existing variant identities:
    // Key: genId|transId|countryId|year|engineId|trimId
    const identityMap = new Map<string, string>();
    for (const v of variants) {
      const key = `${v.generationId}|${v.transmissionId}|${v.countryId}|${v.year}|${v.engineId}|${v.trimId}`;
      identityMap.set(key, v.id);
    }

    const rePoints: Array<{ duplicateId: string; survivorId: string }> = [];
    const toDeleteIds: string[] = [];
    const toUpdateGroups = new Map<string, { targetEngineId: string; targetTrimId: string; variantIds: string[] }>();

    let modelUpdated = 0;
    let modelMerged = 0;

    for (const v of variants) {
      const fakeEng = fakeEngineMap.get(v.engineId);
      if (!fakeEng) continue; // Not a fake engine

      retiredEngineIds.add(fakeEng.id);

      // Find canonical engine for this variant's fuelType
      const targetEngineId = await findCanonicalEngineId(brand, model, v.fuelType);
      if (!targetEngineId) {
        continue; // No canonical engine found, leave as is
      }

      // If fake engine is a trim name, convert to Trim; otherwise use existing trim
      let targetTrimId = v.trimId;
      if (fakeEng.code !== 'STANDART') {
        targetTrimId = await getOrCreateTrim(fakeEng.code);
      }

      const targetKey = `${v.generationId}|${v.transmissionId}|${v.countryId}|${v.year}|${targetEngineId}|${targetTrimId}`;
      const existingSurvivorId = identityMap.get(targetKey);

      if (existingSurvivorId && existingSurvivorId !== v.id) {
        // v is a duplicate twin!
        rePoints.push({ duplicateId: v.id, survivorId: existingSurvivorId });
        toDeleteIds.push(v.id);
        modelMerged++;
      } else {
        // v becomes the survivor!
        identityMap.set(targetKey, v.id);
        const updateKey = `${targetEngineId}|${targetTrimId}`;
        if (!toUpdateGroups.has(updateKey)) {
          toUpdateGroups.set(updateKey, { targetEngineId, targetTrimId, variantIds: [] });
        }
        toUpdateGroups.get(updateKey)!.variantIds.push(v.id);
        modelUpdated++;
      }
    }

    if (modelUpdated === 0 && modelMerged === 0) continue;

    // Step A: Re-point active references (listings, reports)
    if (rePoints.length > 0) {
      const dupToSurvivor = new Map(rePoints.map(p => [p.duplicateId, p.survivorId]));
      const dupIds = Array.from(dupToSurvivor.keys());

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
    }

    // Step B: Delete duplicate variants in batches
    if (toDeleteIds.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < toDeleteIds.length; i += BATCH_SIZE) {
        const batch = toDeleteIds.slice(i, i + BATCH_SIZE);
        await prisma.vehicleVariant.deleteMany({
          where: { id: { in: batch } },
        });
      }
    }

    // Step C: Update surviving variants to canonical engine and trim
    for (const group of toUpdateGroups.values()) {
      const { targetEngineId, targetTrimId, variantIds } = group;
      const BATCH_SIZE = 500;
      for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
        const batch = variantIds.slice(i, i + BATCH_SIZE);
        await prisma.vehicleVariant.updateMany({
          where: { id: { in: batch } },
          data: {
            engineId: targetEngineId,
            trimId: targetTrimId,
          },
        });
      }
    }

    grandTotalUpdated += modelUpdated;
    grandTotalMerged += modelMerged;

    if ((idx + 1) % 10 === 0 || idx === targetGroups.length - 1 || cnt > 300) {
      console.log(
        `[${idx + 1}/${targetGroups.length}] ${brand} ${model}: restored ${modelUpdated}, merged ${modelMerged} duplicates. (Total so far: Restored=${grandTotalUpdated}, Merged=${grandTotalMerged})`
      );
    }
  }

  // Step 4: Cleanup Empty Retired Engine Records
  console.log('\n🧹 Cleaning up retired fake engine records...');
  let deletedEnginesCount = 0;
  const remainingVariantsByEngine: Array<{ engineId: string; cnt: number }> =
    await prisma.$queryRawUnsafe(`
      SELECT "engineId", COUNT(*)::int as cnt
      FROM "VehicleVariant"
      WHERE "engineId" IN (${fakeIdsList})
      GROUP BY "engineId"
    `);
  const stillReferenced = new Set(remainingVariantsByEngine.map(r => r.engineId));

  for (const fakeEng of fakeEngines) {
    if (!stillReferenced.has(fakeEng.id)) {
      try {
        await prisma.engine.delete({
          where: { id: fakeEng.id },
        });
        deletedEnginesCount++;
      } catch (err) {
        // Foreign key reference or other constraint, safe to ignore
      }
    }
  }

  console.log('\n================================================================');
  console.log('🎉 DATABASE-WIDE TAXONOMY RESTORATION COMPLETED SUCCESSFULLY!');
  console.log(`  - Total Variants Restored to Real Engines & Trims: ${grandTotalUpdated}`);
  console.log(`  - Duplicate Twin Variants Merged & Cleaned: ${grandTotalMerged}`);
  console.log(`  - Empty Fake Engine Records Deleted: ${deletedEnginesCount}`);
  console.log('================================================================\n');
}

main()
  .catch(err => {
    console.error('Fatal error during database taxonomy restoration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
