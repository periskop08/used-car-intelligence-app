import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

const PICKUP_REGEX = /\b(ranger|hilux|amarok|d-max|navara|l200|musso|actyon sports|silverado|f-150|f 150|ram|tundra|tacoma|gladiator|fullback|alaskan|x-class|x-serisi|t90|t60|poer)\b/i;

interface ArabamSuvRow {
  'Vasıta Türü': string;
  'Üretim Yılı': string;
  'Yakıt Tipi': string;
  Marka: string;
  Model: string;
  Motor?: string;
  'Donanım Paketi'?: string;
  'Tam Yol'?: string;
}

export function mapTurkishFuel(fuel: string): FuelType {
  const clean = (fuel || '').toLowerCase().trim();
  if (clean === 'dizel') return FuelType.DIESEL;
  if (clean === 'benzin') return FuelType.PETROL;
  if (clean === 'lpg & benzin' || clean === 'lpg' || clean.includes('lpg')) return FuelType.LPG;
  if (clean === 'hibrit' || clean.includes('hibrit') || clean.includes('hybrid')) return FuelType.HYBRID;
  if (clean === 'elektrik' || clean.includes('elektrik') || clean.includes('electric')) return FuelType.ELECTRIC;
  return FuelType.PETROL;
}

export function isPickupModel(modelName: string): boolean {
  return PICKUP_REGEX.test(modelName);
}

export async function purgeExistingSuvPickupData(): Promise<void> {
  console.log(`\n========================================`);
  console.log(`🧹 STEP 1: PURGING LEGACY SUV & PICKUP DATA`);
  console.log(`========================================`);

  // 1. Unlink any VehicleListings pointing to SUV/Pickup variants
  const unlinkedListings = await prisma.vehicleListing.updateMany({
    where: {
      vehicleVariant: {
        OR: [
          { bodyType: { in: [BodyType.SUV, BodyType.PICKUP] } },
          { vehicleType: 'SUV_PICKUP' },
        ],
      },
    },
    data: {
      vehicleVariantId: null,
    },
  });
  console.log(`✅ Unlinked ${unlinkedListings.count} listings from legacy SUV/Pickup variants.`);

  // 2. Count existing variants to purge
  const initialCountRes: any = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "VehicleVariant" 
    WHERE "bodyType" IN ('SUV', 'PICKUP') OR "vehicleType" = 'SUV_PICKUP'
  `);
  const initialCount = Number(initialCountRes[0]?.count || 0);
  console.log(`📊 Found ${initialCount} legacy SUV/Pickup variants to delete.`);

  // 3. Batch delete in chunks of 5000 to keep Neon DB fast and responsive
  const BATCH_SIZE = 5000;
  let remaining = initialCount;
  let deletedTotal = 0;

  while (remaining > 0) {
    const deletedRes: any = await prisma.$executeRawUnsafe(`
      DELETE FROM "VehicleVariant" 
      WHERE id IN (
        SELECT id FROM "VehicleVariant" 
        WHERE "bodyType" IN ('SUV', 'PICKUP') OR "vehicleType" = 'SUV_PICKUP'
        LIMIT ${BATCH_SIZE}
      )
    `);
    deletedTotal += deletedRes;
    remaining -= deletedRes;
    console.log(`   Deleted ${deletedTotal} / ${initialCount} legacy variants...`);
    if (deletedRes === 0) break;
  }

  // 4. Verify post-purge count
  const postCountRes: any = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "VehicleVariant" 
    WHERE "bodyType" IN ('SUV', 'PICKUP') OR "vehicleType" = 'SUV_PICKUP'
  `);
  const postCount = Number(postCountRes[0]?.count || 0);
  console.log(`✅ Purge complete! Remaining legacy SUV/Pickup variants: ${postCount}`);
}

export async function executeImport(sourcePath: string): Promise<void> {
  console.log(`\n========================================`);
  console.log(`🚀 STEP 2: INGESTING NEW ARAZI, SUV & PICKUP DATA`);
  console.log(`📂 Source: ${sourcePath}`);
  console.log(`========================================`);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`File not found: ${sourcePath}`);
  }

  const rawContent = fs.readFileSync(sourcePath, 'utf8');
  const rows: ArabamSuvRow[] = JSON.parse(rawContent);
  console.log(`📊 Total rows loaded from JSON: ${rows.length}`);

  // 1. Audit unique brands, models, engines, trims
  const brandNames = new Set<string>();
  const modelEntries = new Map<string, { brand: string; model: string; isPickup: boolean }>();
  const enginesToEnsure = new Map<string, { code: string; fuel: FuelType }>();
  const trimsToEnsure = new Set<string>();

  interface NormalizedVariant {
    brand: string;
    model: string;
    year: number;
    fuel: FuelType;
    engine: string;
    trim: string;
    isPickup: boolean;
  }

  const uniqueVariants: NormalizedVariant[] = [];
  const variantKeys = new Set<string>();

  for (const r of rows) {
    const brand = (r.Marka || '').trim();
    const model = (r.Model || '').trim();
    const year = parseInt((r['Üretim Yılı'] || '0').trim(), 10);
    const fuelEnum = mapTurkishFuel(r['Yakıt Tipi'] || '');
    const engine = (r.Motor || 'Standart').trim() || 'Standart';
    const trim = (r['Donanım Paketi'] || 'Standart').trim() || 'Standart';

    if (!brand || !model || !year) continue;

    brandNames.add(brand);
    const isPickup = isPickupModel(model);
    const modelKey = `${brand.toLowerCase()}|${model.toLowerCase()}`;
    if (!modelEntries.has(modelKey)) {
      modelEntries.set(modelKey, { brand, model, isPickup });
    }

    const engineKey = `${engine.toLowerCase()}|${fuelEnum}`;
    if (!enginesToEnsure.has(engineKey)) {
      enginesToEnsure.set(engineKey, { code: engine, fuel: fuelEnum });
    }

    trimsToEnsure.add(trim);

    const vKey = `${brand.toLowerCase()}|${model.toLowerCase()}|${year}|${fuelEnum}|${engine.toLowerCase()}|${trim.toLowerCase()}`;
    if (!variantKeys.has(vKey)) {
      variantKeys.add(vKey);
      uniqueVariants.push({
        brand,
        model,
        year,
        fuel: fuelEnum,
        engine,
        trim,
        isPickup,
      });
    }
  }

  console.log(`📊 Unique Brands: ${brandNames.size}`);
  console.log(`📊 Unique Models: ${modelEntries.size}`);
  console.log(`📊 Unique Engines: ${enginesToEnsure.size}`);
  console.log(`📊 Unique Trims: ${trimsToEnsure.size}`);
  console.log(`📊 Unique Variants to Create: ${uniqueVariants.length}`);

  // 2. Ensure Country TR
  let trCountry = await prisma.country.findUnique({ where: { code: 'TR' } });
  if (!trCountry) {
    trCountry = await prisma.country.create({ data: { code: 'TR', name: 'Turkey' } });
  }
  const countryId = trCountry.id;

  // 3. Ensure Brands
  console.log(`\nChecking & ensuring ${brandNames.size} Brands...`);
  const existingBrands = await prisma.brand.findMany();
  const brandCache = new Map<string, string>();
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase().trim(), b.id));

  const missingBrands = Array.from(brandNames)
    .filter(b => !brandCache.has(b.toLowerCase().trim()))
    .map(b => ({ name: b.trim(), isActive: true }));

  if (missingBrands.length > 0) {
    console.log(`Creating ${missingBrands.length} missing Brands...`);
    await prisma.brand.createMany({ data: missingBrands, skipDuplicates: true });
    const refreshedBrands = await prisma.brand.findMany();
    refreshedBrands.forEach(b => brandCache.set(b.name.toLowerCase().trim(), b.id));
  }
  console.log(`✅ All Brands cached (${brandCache.size} in DB).`);

  // 4. Ensure Combined Transmission "Manuel + Otomatik"
  const existingTransmissions = await prisma.transmission.findMany();
  const transCache = new Map<string, string>();
  existingTransmissions.forEach(t => transCache.set(t.name.toLowerCase().trim(), t.id));

  let combinedTransId = transCache.get('manuel + otomatik') || transCache.get('manuel - otomatik');
  if (!combinedTransId) {
    const created = await prisma.transmission.create({
      data: {
        name: 'Manuel + Otomatik',
        type: TransmissionType.AUTOMATIC,
        speeds: 6,
      },
    });
    combinedTransId = created.id;
    console.log(`Created combined transmission: "Manuel + Otomatik" (${combinedTransId})`);
  } else {
    console.log(`✅ Using combined transmission: "Manuel + Otomatik" (${combinedTransId})`);
  }

  // 5. Ensure Models
  console.log(`\nChecking & ensuring ${modelEntries.size} SUV / Pickup Models...`);
  let existingModels = await prisma.model.findMany();
  let modelCache = new Map<string, string>();
  existingModels.forEach(m => modelCache.set(`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id));

  const missingModels: Array<{ brandId: string; name: string; startYear: number; vehicleType: string; isActive: boolean }> = [];
  const existingModelIdsToUpdate: string[] = [];

  for (const m of modelEntries.values()) {
    const bId = brandCache.get(m.brand.toLowerCase().trim())!;
    const key = `${bId}|${m.model.toLowerCase().trim()}`;
    const existingId = modelCache.get(key);
    if (!existingId) {
      missingModels.push({
        brandId: bId,
        name: m.model.trim(),
        startYear: 2012,
        vehicleType: 'SUV_PICKUP',
        isActive: true,
      });
      modelCache.set(key, 'pending');
    } else {
      existingModelIdsToUpdate.push(existingId);
    }
  }

  if (missingModels.length > 0) {
    console.log(`Creating ${missingModels.length} missing SUV/Pickup Models...`);
    await prisma.model.createMany({
      data: missingModels,
      skipDuplicates: true,
    });
  }

  if (existingModelIdsToUpdate.length > 0) {
    console.log(`Updating ${existingModelIdsToUpdate.length} existing Models to vehicleType = 'SUV_PICKUP'...`);
    await prisma.model.updateMany({
      where: { id: { in: existingModelIdsToUpdate } },
      data: { vehicleType: 'SUV_PICKUP', isActive: true },
    });
  }

  // Reload models cache
  existingModels = await prisma.model.findMany();
  modelCache = new Map(existingModels.map(m => [`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id]));
  console.log(`✅ All SUV/Pickup Models ready.`);

  // 6. Ensure Generations, Engines, Trims
  console.log(`\nEnsuring Generations, Engines and Trims in batches...`);
  const existingGens = await prisma.generation.findMany();
  const genCache = new Map(existingGens.map(g => [`${g.modelId}|${g.bodyType}`, g.id]));

  const existingEngs = await prisma.engine.findMany();
  const engineCache = new Map(existingEngs.map(e => [`${e.code.toLowerCase().trim()}|${e.fuelType}`, e.id]));

  const existingTrims = await prisma.trim.findMany();
  const trimCache = new Map(existingTrims.map(tr => [tr.name.toLowerCase().trim(), tr.id]));

  // Ensure Generations
  const missingGens: Array<{ modelId: string; name: string; startYear: number; bodyType: BodyType }> = [];
  for (const m of modelEntries.values()) {
    const bId = brandCache.get(m.brand.toLowerCase().trim())!;
    const mId = modelCache.get(`${bId}|${m.model.toLowerCase().trim()}`)!;
    const bType = m.isPickup ? BodyType.PICKUP : BodyType.SUV;
    const gKey = `${mId}|${bType}`;
    if (!genCache.has(gKey)) {
      missingGens.push({
        modelId: mId,
        name: m.isPickup ? 'Pick-up' : 'Arazi & SUV',
        startYear: 2012,
        bodyType: bType,
      });
      genCache.set(gKey, 'pending');
    }
  }

  if (missingGens.length > 0) {
    console.log(`Creating ${missingGens.length} missing Generations...`);
    await prisma.generation.createMany({
      data: missingGens,
      skipDuplicates: true,
    });
    const refreshedGens = await prisma.generation.findMany();
    refreshedGens.forEach(g => genCache.set(`${g.modelId}|${g.bodyType}`, g.id));
  }

  // Ensure Engines
  const missingEngs: Array<{ code: string; displacement: number; horsepower: number; torque: number; fuelType: FuelType; isElectric: boolean; isHybrid: boolean }> = [];
  for (const e of enginesToEnsure.values()) {
    const key = `${e.code.toLowerCase().trim()}|${e.fuel}`;
    if (!engineCache.has(key)) {
      missingEngs.push({
        code: e.code.trim(),
        displacement: 0,
        horsepower: 0,
        torque: 0,
        fuelType: e.fuel,
        isElectric: e.fuel === FuelType.ELECTRIC,
        isHybrid: e.fuel === FuelType.HYBRID,
      });
      engineCache.set(key, 'pending');
    }
  }

  if (missingEngs.length > 0) {
    console.log(`Creating ${missingEngs.length} missing Engines in batch...`);
    await prisma.engine.createMany({
      data: missingEngs,
      skipDuplicates: true,
    });
    const refreshedEngs = await prisma.engine.findMany();
    refreshedEngs.forEach(e => engineCache.set(`${e.code.toLowerCase().trim()}|${e.fuelType}`, e.id));
  }

  // Ensure Trims
  const missingTrims: Array<{ name: string }> = [];
  for (const t of trimsToEnsure.values()) {
    const key = t.toLowerCase().trim();
    if (!trimCache.has(key)) {
      missingTrims.push({ name: t.trim() });
      trimCache.set(key, 'pending');
    }
  }

  if (missingTrims.length > 0) {
    console.log(`Creating ${missingTrims.length} missing Trims in batch...`);
    await prisma.trim.createMany({
      data: missingTrims,
      skipDuplicates: true,
    });
    const refreshedTrims = await prisma.trim.findMany();
    refreshedTrims.forEach(tr => trimCache.set(tr.name.toLowerCase().trim(), tr.id));
  }
  console.log(`✅ All Generations, Engines and Trims ready.`);

  // 7. Insert Vehicle Variants in chunks of 1000
  console.log(`\nPreparing ${uniqueVariants.length} VehicleVariant records...`);
  const variantsToInsert: any[] = [];

  for (const v of uniqueVariants) {
    const bId = brandCache.get(v.brand.toLowerCase().trim())!;
    const mId = modelCache.get(`${bId}|${v.model.toLowerCase().trim()}`)!;
    const bType = v.isPickup ? BodyType.PICKUP : BodyType.SUV;
    const gId = genCache.get(`${mId}|${bType}`)!;
    const eId = engineCache.get(`${v.engine.toLowerCase().trim()}|${v.fuel}`)!;
    const tId = trimCache.get(v.trim.toLowerCase().trim())!;

    variantsToInsert.push({
      brandId: bId,
      modelId: mId,
      generationId: gId,
      engineId: eId,
      transmissionId: combinedTransId,
      trimId: tId,
      countryId,
      year: v.year,
      vehicleType: 'SUV_PICKUP',
      bodyType: bType,
      fuelType: v.fuel,
      status: ApprovalStatus.APPROVED,
    });
  }

  const CHUNK_SIZE = 1000;
  let insertedTotal = 0;
  for (let i = 0; i < variantsToInsert.length; i += CHUNK_SIZE) {
    const chunk = variantsToInsert.slice(i, i + CHUNK_SIZE);
    const res = await prisma.vehicleVariant.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    insertedTotal += res.count;
    console.log(`   Progress: ${Math.min(i + CHUNK_SIZE, variantsToInsert.length)}/${variantsToInsert.length} variants processed (${insertedTotal} inserted)...`);
  }

  console.log(`\n✅ Finished! Successfully inserted ${insertedTotal} new Arazi, SUV & Pickup variants into database.`);
}

async function main() {
  const sourcePath = '/Users/efeguven/Desktop/arabam-scraper/output/arabam_arazi_suv_pickup.json';
  const shouldPurge = process.argv.includes('--purge');
  const shouldExecute = process.argv.includes('--execute');

  if (shouldPurge) {
    await purgeExistingSuvPickupData();
  }

  if (shouldExecute) {
    await executeImport(sourcePath);
  }

  if (!shouldPurge && !shouldExecute) {
    console.log(`ℹ️ Usage:`);
    console.log(`  npx ts-node -r dotenv/config apps/api/scripts/import-arabam-suv-pickup.ts --purge --execute`);
  }
}

if (require.main === module) {
  main()
    .catch(err => {
      console.error('Fatal import error:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
