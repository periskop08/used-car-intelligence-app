import { PrismaClient, FuelType } from '@prisma/client';

const prisma = new PrismaClient();

const PROTECTED_ENGINE_PATTERNS = [
  /electric/i,
  /elektrik/i,
  /dual motor/i,
  /twin motor/i,
  /single motor/i,
  /long range/i,
  /standard range/i,
];

// Suffixes sorted by length descending so longer compound names match first
const TRIM_SUFFIXES = [
  'JOURNEY TITANIUM PLUS',
  'JOURNEY TITANIUM PLU',
  'JOURNEY TITANIUM',
  '2.0 ECOBLUE 320 L TITANIUM',
  '2.0 ECOBLUE 320 S TITANIUM',
  '2.0 TDCI 310 L TITANIUM PLUS',
  '2.0 TDCI 310 L TITANIUM',
  '2.0 TDCI 320 L TITANIUM PLUS',
  '2.0 TDCI 320 L TITANIUM',
  '2.0 TDCI 320 S TITANIUM PLUS',
  '2.2 TDCI 300 L TITANIUM PLUS',
  '2.2 TDCI 300 L TITANIUM',
  '2.2 TDCI 300 S TITANIUM PLUS',
  '2.2 TDCI 300 S TITANIUM',
  'TITANIUM PLUS',
  'TITANIUM PLU',
  'TITANIUM',
  'SPORT COUPE',
  'DYNAMIC',
  'BUSINESS',
  'LOUNGE',
  'STYLE',
  'COMFORT',
  'PREMIUM',
  'PRESTIGE',
  'ELEGANCE PLUS',
  'ELEGANCE',
  'EXCLUSIVE',
  'PASSION',
  'PURE EXCELLENCE',
  'PURE',
  'N LINE',
  'N-LINE',
  'R-LINE',
  'R LINE',
  'S-LINE',
  'S LINE',
  'GT-LINE',
  'GT LINE',
  'FR',
  'BLACK LINE',
  'EX COMFORT',
  'MPFI COMFORT',
  'SX COMFORT',
  'SPORTY',
  'ADVANTAGE',
  'URBAN',
  'PROGRESSION',
  'ICONIC',
  'ALLURE',
  'FEEL BOLD',
  'FEEL',
  'SHINE BOLD',
  'SHINE',
  'LIVE',
  'TOUCH PLUS',
  'TOUCH',
  'JOY',
  'ICON',
  'INTENS',
  'CROSS',
  'ACTIVE TOURER',
  'ACTIVE',
  'TREKKING',
  'ST-LINE',
  'ST LINE',
  'VIGNALE',
  'LIFE',
  'PRIME',
  'ELITE',
  'DESIGN',
  'ADVANCE',
  'M EXCELLENCE',
  'S PREMIUM',
  'GT PREMIUM',
  'BLACK EDITION',
  'SPECIAL EDITION'
].sort((a, b) => b.length - a.length);

const PURE_WORDS_TO_TRIM: Record<string, string> = {
  'STANDART': 'Standart',
  'EXECUTIVE': 'Executive',
  'LOFT': 'Loft',
  'SUITE': 'Suite',
  'SIGNATURE': 'Signature',
  'TECHNO': 'Techno',
  'XCLUSIVE': 'Xclusive',
  'E XTRA': 'Extra',
  'E XTREME': 'Extreme',
  'LS': 'LS',
  'LT': 'LT',
  'LA PRIMA': 'La Prima',
  'MY FIESTA': 'My Fiesta',
  'ES': 'ES',
  'ECO': 'Eco',
  'SS': 'SS',
  'HALO': 'Halo',
  'LODGE': 'Lodge',
  'POLARSTAR': 'Polarstar',
  'VISION': 'Vision',
  'BOYUT': 'Boyut',
  'EMOTION': 'Emotion',
  'GRAND PRIX': 'Grand Prix',
  'TERRA': 'Terra',
  'SOL': 'Sol',
  'LINEAR': 'Linear',
  'VECTOR': 'Vector',
  'ROADSTER': 'Roadster',
  'PORTFOLIO': 'Portfolio',
  'M EXCELLENCE': 'M Excellence',
  'REFLEX': 'Reflex',
  'SPIRIT': 'Spirit',
  'SPORT PLUS': 'Sport Plus',
  'TERRA SPORTY': 'Terra Sporty',
  'TORNADO': 'Tornado',
  'TORNADO CRAWLER': 'Tornado Crawler',
  'MACAN': 'Macan',
  'MACAN TURBO': 'Macan Turbo',
  'MAGNUM': 'Magnum',
  'OBSIDIYEN': 'Obsidiyen',
  'POWER SENSE PLUS': 'Power Sense Plus',
  'R SPORT PLUS': 'R Sport Plus',
  'SINGLE ULTIMATE': 'Single Ultimate',
  'TWIN ULTIMATE': 'Twin Ultimate',
  'RECHARGE PRO': 'Recharge Pro',
  'RECHARGE ULTIMATE': 'Recharge Ultimate',
  'STORM': 'Storm',
};

function formatTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseHybridEngine(code: string): { cleanEngine: string; trimName: string } | null {
  for (const pattern of PROTECTED_ENGINE_PATTERNS) {
    if (pattern.test(code)) return null;
  }
  const upper = code.trim().toUpperCase();
  for (const suffix of TRIM_SUFFIXES) {
    const regex = new RegExp(`[\\s\\-_/]+${suffix}$`, 'i');
    if (regex.test(upper)) {
      const clean = code.replace(regex, '').trim();
      if (clean.length >= 2 && /\d/.test(clean)) {
        return {
          cleanEngine: clean,
          trimName: formatTitleCase(suffix),
        };
      }
    }
  }
  return null;
}

async function main() {
  console.log('================================================================');
  console.log('🚀 OPTIMIZED GLOBAL ENGINE TAXONOMY CLEANSE & RESTORATION');
  console.log('================================================================\n');

  // Pre-load all listings and reports to know which variant IDs are active
  console.log('Pre-loading active variant references...');
  const listings = await prisma.vehicleListing.findMany({ select: { vehicleVariantId: true } });
  const reports = await prisma.generatedVehicleReport.findMany({ select: { variantId: true } });
  const aiReports = await prisma.aiVehicleReport.findMany({ select: { variantId: true } });

  const activeListingMap = new Set(listings.map(l => l.vehicleVariantId));
  const activeReportMap = new Set(reports.map(r => r.variantId));
  const activeAiReportMap = new Set(aiReports.map(a => a.variantId));

  console.log(`Active references found: ${activeListingMap.size} listings, ${activeReportMap.size} reports, ${activeAiReportMap.size} AI reports.\n`);

  // Pre-load trims
  const allTrims = await prisma.trim.findMany();
  const trimMap = new Map<string, string>();
  for (const t of allTrims) {
    trimMap.set(t.name.trim().toLowerCase(), t.id);
  }

  async function getOrCreateTrim(name: string): Promise<string> {
    const key = name.trim().toLowerCase();
    if (trimMap.has(key)) return trimMap.get(key)!;
    const created = await prisma.trim.create({ data: { name: name.trim() } });
    trimMap.set(key, created.id);
    return created.id;
  }

  // Pre-load engines
  const allEngines = await prisma.engine.findMany();
  const engineCodeMap = new Map<string, typeof allEngines[0]>();
  for (const e of allEngines) {
    engineCodeMap.set(e.code.trim().toLowerCase(), e);
  }

  async function getOrCreateEngine(
    cleanCode: string,
    template: typeof allEngines[0]
  ): Promise<string> {
    const key = cleanCode.trim().toLowerCase();
    if (engineCodeMap.has(key)) return engineCodeMap.get(key)!.id;

    const existing = await prisma.engine.findFirst({
      where: { code: { equals: cleanCode.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      engineCodeMap.set(key, existing);
      return existing.id;
    }

    const created = await prisma.engine.create({
      data: {
        code: cleanCode.trim(),
        displacement: template.displacement ?? 1600,
        horsepower: template.horsepower ?? 150,
        torque: template.torque ?? 250,
        fuelType: template.fuelType ?? FuelType.PETROL,
        hasTurbo: template.hasTurbo ?? false,
        isHybrid: template.isHybrid ?? false,
        isElectric: template.isElectric ?? false,
      },
    });
    engineCodeMap.set(key, created);
    return created.id;
  }

  // ------------------------------------------------------------------
  // PHASE 1: PROCESS HYBRID ENGINES (ENGINE + TRIM)
  // ------------------------------------------------------------------
  console.log('--- PHASE 1: CLEANING HYBRID ENGINES (ENGINE + TRIM) ---');

  const hybridEngines = allEngines
    .map(e => ({ engine: e, parsed: parseHybridEngine(e.code) }))
    .filter((item): item is { engine: typeof allEngines[0]; parsed: NonNullable<ReturnType<typeof parseHybridEngine>> } => item.parsed !== null);

  console.log(`Found ${hybridEngines.length} hybrid engine codes to clean.`);

  let totalHybridRestored = 0;
  let totalHybridMerged = 0;
  let totalHybridPurged = 0;

  for (let idx = 0; idx < hybridEngines.length; idx++) {
    const { engine: dirtyEng, parsed } = hybridEngines[idx];
    const targetTrimId = await getOrCreateTrim(parsed.trimName);
    const canonicalEngineId = await getOrCreateEngine(parsed.cleanEngine, dirtyEng);

    const variants = await prisma.vehicleVariant.findMany({
      where: { engineId: dirtyEng.id },
      include: { trim: true },
    });

    if (variants.length === 0) {
      try {
        await prisma.engine.delete({ where: { id: dirtyEng.id } });
        totalHybridPurged++;
      } catch {}
      continue;
    }

    const modelGroup = new Map<string, typeof variants>();
    for (const v of variants) {
      const key = `${v.brandId}|${v.modelId}`;
      if (!modelGroup.has(key)) modelGroup.set(key, []);
      modelGroup.get(key)!.push(v);
    }

    const toDeleteIds: string[] = [];
    const toUpdateItems: Array<{ id: string; targetTrimId: string }> = [];

    for (const [bmKey, mVariants] of modelGroup.entries()) {
      const brandId = mVariants[0].brandId;
      const modelId = mVariants[0].modelId;

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

      const idMap = new Map<string, string>();
      for (const v of allModelVariants) {
        const k = `${v.generationId}|${v.engineId}|${v.transmissionId}|${v.trimId}|${v.countryId}|${v.year}`;
        idMap.set(k, v.id);
      }

      for (const v of mVariants) {
        const finalTrimId = (v.trim?.name && v.trim.name !== 'Standart' && v.trim.name !== 'Standard')
          ? v.trimId
          : targetTrimId;

        const targetKey = `${v.generationId}|${canonicalEngineId}|${v.transmissionId}|${finalTrimId}|${v.countryId}|${v.year}`;
        const twinId = idMap.get(targetKey);

        if (twinId && twinId !== v.id) {
          // Repoint only if v.id is actually referenced in DB
          if (activeListingMap.has(v.id)) {
            await prisma.vehicleListing.updateMany({
              where: { vehicleVariantId: v.id },
              data: { vehicleVariantId: twinId },
            });
            activeListingMap.delete(v.id);
            activeListingMap.add(twinId);
          }
          if (activeReportMap.has(v.id)) {
            await prisma.generatedVehicleReport.updateMany({
              where: { variantId: v.id },
              data: { variantId: twinId },
            });
            activeReportMap.delete(v.id);
            activeReportMap.add(twinId);
          }
          if (activeAiReportMap.has(v.id)) {
            await prisma.aiVehicleReport.updateMany({
              where: { variantId: v.id },
              data: { variantId: twinId },
            });
            activeAiReportMap.delete(v.id);
            activeAiReportMap.add(twinId);
          }

          toDeleteIds.push(v.id);
          totalHybridMerged++;
        } else {
          idMap.set(targetKey, v.id);
          toUpdateItems.push({ id: v.id, targetTrimId: finalTrimId });
          totalHybridRestored++;
        }
      }
    }

    // Bulk deletes
    if (toDeleteIds.length > 0) {
      for (let i = 0; i < toDeleteIds.length; i += 500) {
        const chunk = toDeleteIds.slice(i, i + 500);
        await prisma.vehicleVariant.deleteMany({ where: { id: { in: chunk } } });
      }
    }

    // Updates
    for (const item of toUpdateItems) {
      try {
        await prisma.vehicleVariant.update({
          where: { id: item.id },
          data: { engineId: canonicalEngineId, trimId: item.targetTrimId },
        });
      } catch (err: any) {
        // If unique constraint collision occurs, delete duplicate variant safely
        try {
          await prisma.vehicleVariant.delete({ where: { id: item.id } });
        } catch {}
      }
    }

    // Delete dirty engine
    try {
      await prisma.engine.delete({ where: { id: dirtyEng.id } });
      totalHybridPurged++;
    } catch {}

    if ((idx + 1) % 10 === 0 || idx === hybridEngines.length - 1) {
      console.log(`  [Progress ${idx + 1}/${hybridEngines.length}] Restored: ${totalHybridRestored}, Merged: ${totalHybridMerged}, Engines Purged: ${totalHybridPurged}`);
    }
  }

  // ------------------------------------------------------------------
  // PHASE 2: PROCESS PURE WORD ENGINES (PURE TRIMS/BODY AS ENGINE)
  // ------------------------------------------------------------------
  console.log('\n--- PHASE 2: PURGING PURE WORD FAKE ENGINES ---');

  const pureWordCodes = Object.keys(PURE_WORDS_TO_TRIM);
  const pureWordEngines = await prisma.engine.findMany({
    where: { code: { in: pureWordCodes } },
  });

  console.log(`Found ${pureWordEngines.length} pure fake engine records.`);

  let totalPureRestored = 0;
  let totalPureMerged = 0;
  let totalPurePurged = 0;

  for (let idx = 0; idx < pureWordEngines.length; idx++) {
    const fakeEng = pureWordEngines[idx];
    const upperCode = fakeEng.code.trim().toUpperCase();
    const trimName = PURE_WORDS_TO_TRIM[upperCode] || formatTitleCase(fakeEng.code);
    const targetTrimId = await getOrCreateTrim(trimName);

    const variants = await prisma.vehicleVariant.findMany({
      where: { engineId: fakeEng.id },
      include: { trim: true },
    });

    if (variants.length === 0) {
      try {
        await prisma.engine.delete({ where: { id: fakeEng.id } });
        totalPurePurged++;
      } catch {}
      continue;
    }

    const modelGroup = new Map<string, typeof variants>();
    for (const v of variants) {
      const key = `${v.brandId}|${v.modelId}`;
      if (!modelGroup.has(key)) modelGroup.set(key, []);
      modelGroup.get(key)!.push(v);
    }

    const toDeleteIds: string[] = [];
    const toUpdateItems: Array<{ id: string; targetEngineId: string; targetTrimId: string }> = [];

    for (const [bmKey, mVariants] of modelGroup.entries()) {
      const brandId = mVariants[0].brandId;
      const modelId = mVariants[0].modelId;

      const realEngines = await prisma.engine.findMany({
        where: {
          variants: { some: { brandId, modelId } },
          code: { notIn: pureWordCodes },
        },
        include: {
          _count: { select: { variants: true } },
        },
        orderBy: { variants: { _count: 'desc' } },
      });

      if (realEngines.length === 0) {
        const fallback = await prisma.engine.findFirst({
          where: { code: { notIn: pureWordCodes } },
        });
        if (fallback) realEngines.push(fallback as any);
      }

      if (realEngines.length === 0) continue;

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

      const idMap = new Map<string, string>();
      for (const v of allModelVariants) {
        const k = `${v.generationId}|${v.engineId}|${v.transmissionId}|${v.trimId}|${v.countryId}|${v.year}`;
        idMap.set(k, v.id);
      }

      for (const v of mVariants) {
        const matchingEngine = realEngines.find(e => e.fuelType === v.fuelType) || realEngines[0];
        const finalTrimId = (v.trim?.name && v.trim.name !== 'Standart' && v.trim.name !== 'Standard')
          ? v.trimId
          : targetTrimId;

        const targetKey = `${v.generationId}|${matchingEngine.id}|${v.transmissionId}|${finalTrimId}|${v.countryId}|${v.year}`;
        const twinId = idMap.get(targetKey);

        if (twinId && twinId !== v.id) {
          if (activeListingMap.has(v.id)) {
            await prisma.vehicleListing.updateMany({
              where: { vehicleVariantId: v.id },
              data: { vehicleVariantId: twinId },
            });
            activeListingMap.delete(v.id);
            activeListingMap.add(twinId);
          }
          if (activeReportMap.has(v.id)) {
            await prisma.generatedVehicleReport.updateMany({
              where: { variantId: v.id },
              data: { variantId: twinId },
            });
            activeReportMap.delete(v.id);
            activeReportMap.add(twinId);
          }
          if (activeAiReportMap.has(v.id)) {
            await prisma.aiVehicleReport.updateMany({
              where: { variantId: v.id },
              data: { variantId: twinId },
            });
            activeAiReportMap.delete(v.id);
            activeAiReportMap.add(twinId);
          }

          toDeleteIds.push(v.id);
          totalPureMerged++;
        } else {
          idMap.set(targetKey, v.id);
          toUpdateItems.push({ id: v.id, targetEngineId: matchingEngine.id, targetTrimId: finalTrimId });
          totalPureRestored++;
        }
      }
    }

    if (toDeleteIds.length > 0) {
      for (let i = 0; i < toDeleteIds.length; i += 500) {
        const chunk = toDeleteIds.slice(i, i + 500);
        await prisma.vehicleVariant.deleteMany({ where: { id: { in: chunk } } });
      }
    }

    for (const item of toUpdateItems) {
      try {
        await prisma.vehicleVariant.update({
          where: { id: item.id },
          data: { engineId: item.targetEngineId, trimId: item.targetTrimId },
        });
      } catch (err: any) {
        try {
          await prisma.vehicleVariant.delete({ where: { id: item.id } });
        } catch {}
      }
    }

    try {
      await prisma.engine.delete({ where: { id: fakeEng.id } });
      totalPurePurged++;
    } catch {}

    if ((idx + 1) % 10 === 0 || idx === pureWordEngines.length - 1) {
      console.log(`  [Progress ${idx + 1}/${pureWordEngines.length}] Restored: ${totalPureRestored}, Merged: ${totalPureMerged}, Engines Purged: ${totalPurePurged}`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 FULL GLOBAL ENGINE TAXONOMY CLEANSE COMPLETED!');
  console.log(`  - Total Hybrid: Restored ${totalHybridRestored}, Merged ${totalHybridMerged}, Purged ${totalHybridPurged}`);
  console.log(`  - Total Pure:   Restored ${totalPureRestored}, Merged ${totalPureMerged}, Purged ${totalPurePurged}`);
  console.log('================================================================\n');
}

main().finally(() => prisma.$disconnect());
