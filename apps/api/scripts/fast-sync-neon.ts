/**
 * fast-sync-neon.ts
 * 
 * Safe and fast Neon PostgreSQL Cloud Database synchronization over PgBouncer pooler.
 * Uses small batch sizes (100 items per query) to avoid PgBouncer connection drops.
 */

import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const neonUrl = 'postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({
  datasources: { db: { url: neonUrl } }
});

interface CleanVehicleRecord {
  brand: string;
  model: string;
  subModel: string;
  year: number;
  fuel: string;
  bodyType: string;
  engine: string;
  transmission: string;
  trim: string;
  fullPath: string;
}

// Enum Mappings
function mapBodyType(str: string): BodyType {
  if (!str) return BodyType.OTHER;
  const s = str.toUpperCase();
  if (s.includes('HATCHBACK')) return BodyType.HATCHBACK;
  if (s.includes('SEDAN')) return BodyType.SEDAN;
  if (s.includes('SUV') || s.includes('CROSSOVER')) return BodyType.SUV;
  if (s.includes('COUPE')) return BodyType.COUPE;
  if (s.includes('WAGON') || s.includes('STATION')) return BodyType.WAGON;
  if (s.includes('CONVERTIBLE') || s.includes('CABRIO') || s.includes('ROADSTER')) return BodyType.CONVERTIBLE;
  if (s.includes('MINIVAN') || s.includes('MPV')) return BodyType.MINIVAN;
  if (s.includes('PICKUP')) return BodyType.PICKUP;
  if (s.includes('VAN') || s.includes('PANELVAN')) return BodyType.VAN;
  return BodyType.OTHER;
}

function mapFuelType(str: string): FuelType {
  if (!str) return FuelType.OTHER;
  const s = str.toUpperCase();
  if (s.includes('LPG')) return FuelType.LPG;
  if (s.includes('BENZIN') || s.includes('PETROL')) return FuelType.PETROL;
  if (s.includes('DIZEL') || s.includes('DIESEL')) return FuelType.DIESEL;
  if (s.includes('ELEKTRIK') || s.includes('ELECTRIC')) return FuelType.ELECTRIC;
  if (s.includes('HIBK') || s.includes('HYBRID')) return FuelType.HYBRID;
  return FuelType.OTHER;
}

function mapTransmissionType(str: string): TransmissionType {
  if (!str) return TransmissionType.AUTOMATIC;
  const s = str.toUpperCase();
  if (s.includes('DÜZ') || s.includes('MANUEL')) return TransmissionType.MANUAL;
  if (s.includes('YARI') || s.includes('TRIPTONIK') || s.includes('DCT') || s.includes('DSG')) return TransmissionType.DCT;
  if (s.includes('CVT')) return TransmissionType.CVT;
  return TransmissionType.AUTOMATIC;
}

function parseDisplacement(engineStr: string): number {
  if (!engineStr) return 1600;
  const match = engineStr.match(/(\d+)[\.,](\d+)/);
  if (match) {
    const liters = parseFloat(`${match[1]}.${match[2]}`);
    return Math.round(liters * 1000);
  }
  return 1600;
}

async function bulkCreateMany(modelDelegate: any, items: any[], batchSize = 100) {
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    let retries = 3;
    while (retries > 0) {
      try {
        await modelDelegate.createMany({
          data: chunk,
          skipDuplicates: true
        });
        break;
      } catch (err: any) {
        retries--;
        console.warn(`Warning on createMany chunk (${retries} retries left):`, err.message);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
}

async function main() {
  console.log('=== STARTING SAFE NEON DB BULK SYNCHRONIZATION ===');

  // 1. Country TR
  let country = await prisma.country.findFirst({ where: { code: 'TR' } });
  if (!country) {
    country = await prisma.country.create({
      data: { code: 'TR', name: 'Türkiye' }
    });
  }
  const countryId = country.id;

  // 2. Read dataset
  const jsonPath = path.join(process.cwd(), 'scratch/arabam_final.json');
  const rawData: CleanVehicleRecord[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${rawData.length} verified records.`);

  // 3. Bulk Brands
  console.log('Bulk creating Brands...');
  const uniqueBrandNames = Array.from(new Set(rawData.map(d => d.brand.trim())));
  await bulkCreateMany(prisma.brand, uniqueBrandNames.map(name => ({ name, isActive: true })), 50);

  const allBrands = await prisma.brand.findMany();
  const brandMap = new Map(allBrands.map(b => [b.name.toLowerCase().trim(), b.id]));

  // 4. Bulk Models
  console.log('Bulk creating Models...');
  const uniqueModelsMap = new Map<string, { brandId: string; name: string; startYear: number }>();
  rawData.forEach(d => {
    const brandId = brandMap.get(d.brand.trim().toLowerCase());
    if (brandId) {
      const key = `${brandId}|${d.model.trim().toLowerCase()}`;
      if (!uniqueModelsMap.has(key)) {
        uniqueModelsMap.set(key, { brandId, name: d.model.trim(), startYear: d.year });
      }
    }
  });

  await bulkCreateMany(prisma.model, Array.from(uniqueModelsMap.values()).map(m => ({ ...m, isActive: true })), 100);

  const allModels = await prisma.model.findMany();
  const modelMap = new Map(allModels.map(m => [`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id]));

  // 5. Bulk Generations
  console.log('Bulk creating Generations...');
  const genMapKey = (modelId: string, subName: string, bodyType: BodyType) =>
    `${modelId}|${subName.toLowerCase().trim()}|${bodyType}`;

  const genDataToCreate: any[] = [];
  const genSeen = new Set<string>();

  for (const d of rawData) {
    const brandId = brandMap.get(d.brand.trim().toLowerCase());
    if (!brandId) continue;
    const modelId = modelMap.get(`${brandId}|${d.model.trim().toLowerCase()}`);
    if (!modelId) continue;

    const subName = (d.subModel || 'Standart').trim();
    const bodyEnum = mapBodyType(d.bodyType);
    const key = genMapKey(modelId, subName, bodyEnum);

    if (!genSeen.has(key)) {
      genSeen.add(key);
      genDataToCreate.push({ modelId, name: subName, startYear: d.year, bodyType: bodyEnum });
    }
  }

  await bulkCreateMany(prisma.generation, genDataToCreate, 200);

  const allGenerations = await prisma.generation.findMany();
  const genMap = new Map(allGenerations.map(g => [genMapKey(g.modelId, g.name, g.bodyType), g.id]));

  // 6. Bulk Engines, Transmissions, Trims
  console.log('Bulk creating Engines, Transmissions, and Trims...');
  const engineDataToCreate: any[] = [];
  const engineSeen = new Set<string>();

  for (const d of rawData) {
    const engCode = (d.engine || 'Standart Engine').trim();
    const fuelEnum = mapFuelType(d.fuel);
    const key = `${engCode.toLowerCase()}|${fuelEnum}`;

    if (!engineSeen.has(key)) {
      engineSeen.add(key);
      engineDataToCreate.push({
        code: engCode,
        displacement: parseDisplacement(engCode),
        horsepower: 100,
        torque: 200,
        fuelType: fuelEnum,
        isElectric: fuelEnum === FuelType.ELECTRIC,
        isHybrid: fuelEnum === FuelType.HYBRID
      });
    }
  }

  await bulkCreateMany(prisma.engine, engineDataToCreate, 200);

  const allEngines = await prisma.engine.findMany();
  const engineMap = new Map(allEngines.map(e => [`${e.code.toLowerCase().trim()}|${e.fuelType}`, e.id]));

  const transDataToCreate: any[] = [];
  const transSeen = new Set<string>();

  for (const d of rawData) {
    const tName = (d.transmission || 'Standart').trim();
    const tType = mapTransmissionType(d.transmission);
    const key = `${tName.toLowerCase()}|${tType}`;

    if (!transSeen.has(key)) {
      transSeen.add(key);
      transDataToCreate.push({ name: tName, type: tType, speeds: 6 });
    }
  }

  await bulkCreateMany(prisma.transmission, transDataToCreate, 200);

  const allTransmissions = await prisma.transmission.findMany();
  const transMap = new Map(allTransmissions.map(t => [`${t.name.toLowerCase().trim()}|${t.type}`, t.id]));

  const trimNames = Array.from(new Set(rawData.map(d => (d.trim || 'Standart').trim())));
  await bulkCreateMany(prisma.trim, trimNames.map(name => ({ name })), 200);

  const allTrims = await prisma.trim.findMany();
  const trimMap = new Map(allTrims.map(tr => [tr.name.toLowerCase().trim(), tr.id]));

  // 7. Bulk Prepare VehicleVariants for Neon DB
  console.log('Building VehicleVariants array for Neon DB...');
  const variantDataToInsert: any[] = [];
  const variantKeysSeen = new Set<string>();

  for (const d of rawData) {
    const brandId = brandMap.get(d.brand.trim().toLowerCase());
    if (!brandId) continue;

    const modelId = modelMap.get(`${brandId}|${d.model.trim().toLowerCase()}`);
    if (!modelId) continue;

    const subName = (d.subModel || 'Standart').trim();
    const bodyEnum = mapBodyType(d.bodyType);
    const generationId = genMap.get(genMapKey(modelId, subName, bodyEnum));
    if (!generationId) continue;

    const engCode = (d.engine || 'Standart Engine').trim();
    const fuelEnum = mapFuelType(d.fuel);
    const engineId = engineMap.get(`${engCode.toLowerCase()}|${fuelEnum}`);
    if (!engineId) continue;

    const tName = (d.transmission || 'Standart').trim();
    const tType = mapTransmissionType(d.transmission);
    const transmissionId = transMap.get(`${tName.toLowerCase()}|${tType}`);
    if (!transmissionId) continue;

    const trName = (d.trim || 'Standart').trim();
    const trimId = trimMap.get(trName.toLowerCase());
    if (!trimId) continue;

    const key = `${brandId}|${modelId}|${generationId}|${engineId}|${transmissionId}|${trimId}|${countryId}|${d.year}`;
    if (variantKeysSeen.has(key)) continue;
    variantKeysSeen.add(key);

    variantDataToInsert.push({
      brandId,
      modelId,
      generationId,
      engineId,
      transmissionId,
      trimId,
      countryId,
      year: d.year,
      bodyType: bodyEnum,
      fuelType: fuelEnum,
      status: ApprovalStatus.APPROVED
    });
  }

  console.log(`Prepared ${variantDataToInsert.length} unique canonical vehicle variants.`);

  // Reset existing variants status to PENDING
  console.log('Setting status = PENDING for existing variants on Neon DB...');
  await prisma.vehicleVariant.updateMany({
    data: { status: ApprovalStatus.PENDING }
  });

  // Bulk Insert with createMany in 500 batches with retries
  console.log('Bulk inserting verified variants into Neon DB...');
  await bulkCreateMany(prisma.vehicleVariant, variantDataToInsert, 500);

  // Update newly created/matching items to APPROVED
  console.log('Updating inserted variants status to APPROVED...');
  await prisma.vehicleVariant.updateMany({
    where: {
      status: ApprovalStatus.PENDING,
      brandId: { in: Array.from(brandMap.values()) }
    },
    data: { status: ApprovalStatus.APPROVED }
  });

  // Archive any remaining unreferenced legacy synthetic variants to STALE
  console.log('Archiving unreferenced legacy synthetic variants (status = STALE)...');
  const staleRes = await prisma.vehicleVariant.updateMany({
    where: {
      status: ApprovalStatus.PENDING,
      listings: { none: {} }
    },
    data: { status: ApprovalStatus.STALE }
  });

  console.log(`Archived ${staleRes.count} unreferenced legacy variants to STALE.`);

  const finalApprovedCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.APPROVED } });
  const finalStaleCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.STALE } });

  console.log(`\n=== NEON DB BULK SYNCHRONIZATION FINISHED ===`);
  console.log(`APPROVED Variants (Live in Menus & Search): ${finalApprovedCount}`);
  console.log(`STALE Variants (Archived / Hidden from UI): ${finalStaleCount}`);
  console.log(`============================================`);
}

main()
  .catch(err => {
    console.error('Fatal error during Neon DB bulk sync:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
