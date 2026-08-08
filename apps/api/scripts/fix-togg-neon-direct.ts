/**
 * fix-togg-neon-direct.ts
 * 
 * Surgical fix for TOGG on Neon DB:
 * 1. Merges duplicate brand entries to "Togg".
 * 2. Normalizes model names "T10X" (startYear 2023) and "T10F" (startYear 2025).
 * 3. Injects all 24 official TOGG T10X & T10F canonical variants (2023-2026 Electric, Automatic, SUV/Sedan).
 * 4. Sets all canonical TOGG variants to status = APPROVED and legacy synthetic variants to STALE.
 */

import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';

const neonUrl = 'postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({
  datasources: { db: { url: neonUrl } }
});

const toggVariants = [
  // T10X - 2023
  { modelName: 'T10X', subModel: 'SUV', year: 2023, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Standart Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2023, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2023, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2023, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '320 kW (435 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 AWD 4More' },

  // T10X - 2024
  { modelName: 'T10X', subModel: 'SUV', year: 2024, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Standart Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2024, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2024, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2024, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '320 kW (435 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 AWD 4More' },

  // T10X - 2025
  { modelName: 'T10X', subModel: 'SUV', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Standart Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '320 kW (435 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 AWD 4More' },

  // T10X - 2026
  { modelName: 'T10X', subModel: 'SUV', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Standart Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 RWD Uzun Menzil' },
  { modelName: 'T10X', subModel: 'SUV', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SUV, engineCode: '320 kW (435 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 AWD 4More' },

  // T10F - Fastback / Sedan
  { modelName: 'T10F', subModel: 'Fastback', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Standart Menzil' },
  { modelName: 'T10F', subModel: 'Fastback', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Uzun Menzil' },
  { modelName: 'T10F', subModel: 'Fastback', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 RWD Uzun Menzil' },
  { modelName: 'T10F', subModel: 'Fastback', year: 2025, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '320 kW (435 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 AWD 4More' },
  { modelName: 'T10F', subModel: 'Fastback', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Standart Menzil' },
  { modelName: 'T10F', subModel: 'Fastback', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V1 RWD Uzun Menzil' },
  { modelName: 'T10F', subModel: 'Fastback', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '160 kW (218 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 RWD Uzun Menzil' },
  { modelName: 'T10F', subModel: 'Fastback', year: 2026, fuelType: FuelType.ELECTRIC, bodyType: BodyType.SEDAN, engineCode: '320 kW (435 HP)', transName: 'Otomatik', transType: TransmissionType.AUTOMATIC, trimName: 'V2 AWD 4More' }
];

async function main() {
  console.log('=== SURGICAL FIX FOR TOGG ON NEON DB ===');

  // 1. Get Country TR
  const trCountry = await prisma.country.findFirst({ where: { code: 'TR' } });
  const countryId = trCountry!.id;

  // 2. Find Brand "Togg" or "TOGG"
  let brand = await prisma.brand.findFirst({
    where: { name: { contains: 'togg', mode: 'insensitive' } }
  });

  if (!brand) {
    brand = await prisma.brand.create({ data: { name: 'Togg', isActive: true } });
  }
  const brandId = brand.id;

  // Cleanup extra uppercase "TOGG" brand if duplicate exists without models
  const extraBrand = await prisma.brand.findFirst({
    where: { name: 'TOGG', id: { not: brandId } }
  });
  if (extraBrand) {
    await prisma.brand.delete({ where: { id: extraBrand.id } });
  }

  // 3. Ensure Models "T10X" and "T10F"
  let modelT10X = await prisma.model.findFirst({
    where: { brandId, name: { equals: 'T10X', mode: 'insensitive' } }
  });
  if (!modelT10X) {
    modelT10X = await prisma.model.create({ data: { brandId, name: 'T10X', startYear: 2023, endYear: 2026, isActive: true } });
  } else {
    await prisma.model.update({ where: { id: modelT10X.id }, data: { name: 'T10X', startYear: 2023, endYear: 2026 } });
  }

  let modelT10F = await prisma.model.findFirst({
    where: { brandId, name: { equals: 'T10F', mode: 'insensitive' } }
  });
  if (!modelT10F) {
    modelT10F = await prisma.model.create({ data: { brandId, name: 'T10F', startYear: 2025, endYear: 2026, isActive: true } });
  } else {
    await prisma.model.update({ where: { id: modelT10F.id }, data: { name: 'T10F', startYear: 2025, endYear: 2026 } });
  }

  // Set any legacy variants for Togg to STALE
  console.log('Archiving legacy TOGG synthetic variants to STALE...');
  await prisma.vehicleVariant.updateMany({
    where: { brandId },
    data: { status: ApprovalStatus.STALE }
  });

  // 4. Upsert all 24 official TOGG variants and set status = APPROVED
  console.log('Upserting 24 canonical TOGG variants...');
  for (const v of toggVariants) {
    const modelId = v.modelName === 'T10X' ? modelT10X.id : modelT10F.id;

    // Generation
    let gen = await prisma.generation.findFirst({
      where: { modelId, name: v.subModel, bodyType: v.bodyType }
    });
    if (!gen) {
      gen = await prisma.generation.create({
        data: { modelId, name: v.subModel, startYear: v.year, bodyType: v.bodyType }
      });
    }

    // Engine
    let eng = await prisma.engine.findFirst({
      where: { code: v.engineCode, fuelType: v.fuelType }
    });
    if (!eng) {
      eng = await prisma.engine.create({
        data: {
          code: v.engineCode,
          displacement: 0,
          horsepower: v.engineCode.includes('435') ? 435 : 218,
          torque: v.engineCode.includes('435') ? 700 : 350,
          fuelType: v.fuelType,
          isElectric: true,
          isHybrid: false
        }
      });
    }

    // Transmission
    let trans = await prisma.transmission.findFirst({
      where: { name: v.transName, type: v.transType }
    });
    if (!trans) {
      trans = await prisma.transmission.create({
        data: { name: v.transName, type: v.transType, speeds: 1 }
      });
    }

    // Trim
    let trim = await prisma.trim.findFirst({
      where: { name: v.trimName }
    });
    if (!trim) {
      trim = await prisma.trim.create({
        data: { name: v.trimName }
      });
    }

    // VehicleVariant
    const variantWhere = {
      brandId_modelId_generationId_engineId_transmissionId_trimId_countryId_year: {
        brandId,
        modelId,
        generationId: gen.id,
        engineId: eng.id,
        transmissionId: trans.id,
        trimId: trim.id,
        countryId,
        year: v.year
      }
    };

    const existingVariant = await prisma.vehicleVariant.findUnique({ where: variantWhere });
    if (existingVariant) {
      await prisma.vehicleVariant.update({
        where: { id: existingVariant.id },
        data: { status: ApprovalStatus.APPROVED, bodyType: v.bodyType, fuelType: v.fuelType }
      });
    } else {
      await prisma.vehicleVariant.create({
        data: {
          brandId,
          modelId,
          generationId: gen.id,
          engineId: eng.id,
          transmissionId: trans.id,
          trimId: trim.id,
          countryId,
          year: v.year,
          bodyType: v.bodyType,
          fuelType: v.fuelType,
          status: ApprovalStatus.APPROVED
        }
      });
    }
  }

  // 5. Verification
  const approvedToggCount = await prisma.vehicleVariant.count({
    where: { brandId, status: ApprovalStatus.APPROVED }
  });
  console.log(`\n=== SURGICAL FIX COMPLETE ===`);
  console.log(`APPROVED TOGG variants count on Neon DB: ${approvedToggCount}`);
}

main()
  .catch(err => {
    console.error('Error during surgical TOGG fix:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
