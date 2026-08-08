/**
 * sync-vehicle-taxonomy.ts
 * 
 * Synchronizes the verified clean Turkish vehicle catalog records (from arabam_final.json)
 * into PostgreSQL using Prisma ORM.
 * 
 * Key Operations:
 * 1. Upsert Country ("TR")
 * 2. Upsert Brands, Models, Generations, Engines, Transmissions, Trims.
 * 3. Upsert VehicleVariants with ApprovalStatus = APPROVED.
 * 4. Safely set unverified/legacy synthetic variants to ApprovalStatus = STALE in chunks.
 */

import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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

async function main() {
  console.log('=== STARTING VEHICLE TAXONOMY DATABASE SYNCHRONIZATION ===');
  
  // 1. Ensure Turkey Country exists
  let country = await prisma.country.findFirst({ where: { code: 'TR' } });
  if (!country) {
    country = await prisma.country.create({
      data: { code: 'TR', name: 'Türkiye' }
    });
  }
  const countryId = country.id;
  console.log(`Using Country: ${country.name} (${countryId})`);

  // 2. Read dataset
  const jsonPath = path.join(process.cwd(), 'scratch/arabam_final.json');
  console.log(`Loading clean dataset from: ${jsonPath}`);
  const rawData: CleanVehicleRecord[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${rawData.length} verified records.`);

  // Caches for DB Entities
  const brandCache = new Map<string, string>();
  const modelCache = new Map<string, string>();
  const generationCache = new Map<string, string>();
  const engineCache = new Map<string, string>();
  const transmissionCache = new Map<string, string>();
  const trimCache = new Map<string, string>();

  // Pre-fill caches from existing DB
  console.log('Pre-loading existing DB entities into memory...');
  const existingBrands = await prisma.brand.findMany();
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase().trim(), b.id));

  const existingModels = await prisma.model.findMany();
  existingModels.forEach(m => modelCache.set(`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id));

  const existingGenerations = await prisma.generation.findMany();
  existingGenerations.forEach(g => {
    generationCache.set(`${g.modelId}|${g.name.toLowerCase().trim()}|${g.startYear}|${g.bodyType}`, g.id);
  });

  const existingEngines = await prisma.engine.findMany();
  existingEngines.forEach(e => {
    engineCache.set(`${e.code.toLowerCase().trim()}|${e.displacement}|${e.horsepower}|${e.torque}|${e.fuelType}`, e.id);
  });

  const existingTransmissions = await prisma.transmission.findMany();
  existingTransmissions.forEach(t => {
    transmissionCache.set(`${t.name.toLowerCase().trim()}|${t.type}|${t.speeds}`, t.id);
  });

  const existingTrims = await prisma.trim.findMany();
  existingTrims.forEach(tr => trimCache.set(tr.name.toLowerCase().trim(), tr.id));

  console.log(`Memory caches loaded: ${brandCache.size} brands, ${modelCache.size} models, ${generationCache.size} generations, ${engineCache.size} engines, ${transmissionCache.size} transmissions, ${trimCache.size} trims.`);

  // Track approved variant IDs
  const approvedVariantIds = new Set<string>();

  // First, mark all existing variants as PENDING before syncing verified list
  console.log('Resetting variant statuses to PENDING before applying clean verified list...');
  await prisma.vehicleVariant.updateMany({
    data: { status: ApprovalStatus.PENDING }
  });

  // Process in batches
  const BATCH_SIZE = 2500;
  const totalBatches = Math.ceil(rawData.length / BATCH_SIZE);

  let insertedVariantsCount = 0;
  let updatedVariantsCount = 0;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batch = rawData.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE);
    console.log(`Processing Batch ${batchIdx + 1}/${totalBatches} (${batch.length} items)...`);

    for (const item of batch) {
      const brandName = item.brand.trim();
      const modelName = item.model.trim();
      const subModelName = (item.subModel || 'Standart').trim();
      const year = item.year;
      const fuelTypeEnum = mapFuelType(item.fuel);
      const bodyTypeEnum = mapBodyType(item.bodyType);
      const transTypeEnum = mapTransmissionType(item.transmission);
      const engineCode = (item.engine || 'Standart Engine').trim();
      const trimName = (item.trim || 'Standart').trim();
      const transName = (item.transmission || 'Standart').trim();

      // 1. Brand
      let brandId = brandCache.get(brandName.toLowerCase());
      if (!brandId) {
        const newBrand = await prisma.brand.create({
          data: { name: brandName, isActive: true }
        });
        brandId = newBrand.id;
        brandCache.set(brandName.toLowerCase(), brandId);
      }

      // 2. Model
      const modelKey = `${brandId}|${modelName.toLowerCase()}`;
      let modelId = modelCache.get(modelKey);
      if (!modelId) {
        const newModel = await prisma.model.create({
          data: { brandId, name: modelName, startYear: year, isActive: true }
        });
        modelId = newModel.id;
        modelCache.set(modelKey, modelId);
      }

      // 3. Generation
      const genKey = `${modelId}|${subModelName.toLowerCase()}|${year}|${bodyTypeEnum}`;
      let generationId = generationCache.get(genKey);
      if (!generationId) {
        const existingGen = await prisma.generation.findFirst({
          where: { modelId, name: subModelName, bodyType: bodyTypeEnum }
        });
        if (existingGen) {
          generationId = existingGen.id;
        } else {
          const newGen = await prisma.generation.create({
            data: { modelId, name: subModelName, startYear: year, bodyType: bodyTypeEnum }
          });
          generationId = newGen.id;
        }
        generationCache.set(genKey, generationId);
      }

      // 4. Engine
      const cc = parseDisplacement(engineCode);
      const hp = 100;
      const torque = 200;
      const engineKey = `${engineCode.toLowerCase()}|${cc}|${hp}|${torque}|${fuelTypeEnum}`;
      let engineId = engineCache.get(engineKey);
      if (!engineId) {
        const existingEng = await prisma.engine.findFirst({
          where: { code: engineCode, fuelType: fuelTypeEnum }
        });
        if (existingEng) {
          engineId = existingEng.id;
        } else {
          const newEng = await prisma.engine.create({
            data: {
              code: engineCode,
              displacement: cc,
              horsepower: hp,
              torque: torque,
              fuelType: fuelTypeEnum,
              isElectric: fuelTypeEnum === FuelType.ELECTRIC,
              isHybrid: fuelTypeEnum === FuelType.HYBRID
            }
          });
          engineId = newEng.id;
        }
        engineCache.set(engineKey, engineId);
      }

      // 5. Transmission
      const transKey = `${transName.toLowerCase()}|${transTypeEnum}|6`;
      let transmissionId = transmissionCache.get(transKey);
      if (!transmissionId) {
        const existingTrans = await prisma.transmission.findFirst({
          where: { name: transName, type: transTypeEnum }
        });
        if (existingTrans) {
          transmissionId = existingTrans.id;
        } else {
          const newTrans = await prisma.transmission.create({
            data: { name: transName, type: transTypeEnum, speeds: 6 }
          });
          transmissionId = newTrans.id;
        }
        transmissionCache.set(transKey, transmissionId);
      }

      // 6. Trim
      let trimId = trimCache.get(trimName.toLowerCase());
      if (!trimId) {
        const existingTrim = await prisma.trim.findFirst({
          where: { name: trimName }
        });
        if (existingTrim) {
          trimId = existingTrim.id;
        } else {
          const newTrim = await prisma.trim.create({
            data: { name: trimName }
          });
          trimId = newTrim.id;
        }
        trimCache.set(trimName.toLowerCase(), trimId);
      }

      // 7. Upsert VehicleVariant
      const variantUniqueWhere = {
        brandId_modelId_generationId_engineId_transmissionId_trimId_countryId_year: {
          brandId,
          modelId,
          generationId,
          engineId,
          transmissionId,
          trimId,
          countryId,
          year
        }
      };

      const existingVariant = await prisma.vehicleVariant.findUnique({
        where: variantUniqueWhere
      });

      if (existingVariant) {
        const updated = await prisma.vehicleVariant.update({
          where: { id: existingVariant.id },
          data: {
            bodyType: bodyTypeEnum,
            fuelType: fuelTypeEnum,
            status: ApprovalStatus.APPROVED
          }
        });
        approvedVariantIds.add(updated.id);
        updatedVariantsCount++;
      } else {
        const created = await prisma.vehicleVariant.create({
          data: {
            brandId,
            modelId,
            generationId,
            engineId,
            transmissionId,
            trimId,
            countryId,
            year,
            bodyType: bodyTypeEnum,
            fuelType: fuelTypeEnum,
            status: ApprovalStatus.APPROVED
          }
        });
        approvedVariantIds.add(created.id);
        insertedVariantsCount++;
      }
    }
  }

  console.log(`\n=== SYNCHRONIZATION SUMMARY ===`);
  console.log(`Inserted New Verified Variants: ${insertedVariantsCount}`);
  console.log(`Updated Existing Verified Variants: ${updatedVariantsCount}`);
  console.log(`Total Approved Verified Variants: ${approvedVariantIds.size}`);

  // 8. Safely archive any remaining PENDING variants (which were not in clean list) to STALE
  console.log('\nArchiving unverified legacy synthetic variants (setting status = STALE)...');
  const staleResult = await prisma.vehicleVariant.updateMany({
    where: {
      status: ApprovalStatus.PENDING,
      listings: { none: {} }
    },
    data: { status: ApprovalStatus.STALE }
  });

  console.log(`Successfully archived ${staleResult.count} unverified legacy variants to STALE status.`);
  
  const finalApprovedCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.APPROVED } });
  const finalStaleCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.STALE } });
  
  console.log(`\n=== FINAL DATABASE STATUS ===`);
  console.log(`APPROVED Variants (Active in Menus & Search): ${finalApprovedCount}`);
  console.log(`STALE Variants (Archived / Hidden from UI): ${finalStaleCount}`);
  console.log(`=== DATABASE SYNCHRONIZATION COMPLETED SUCCESSFULLY ===`);
}

main()
  .catch(err => {
    console.error('Fatal error during taxonomy sync:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
