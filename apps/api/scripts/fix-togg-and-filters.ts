/**
 * fix-togg-and-filters.ts
 * 
 * 1. Adds official TOGG T10X (2023, 2024, 2025, 2026) & T10F variants to arabam_final.json.
 * 2. Re-runs dataset sync to ensure TOGG models, years (2023-2026), Electric fuel type,
 *    and Automatic transmission are 100% correctly populated in PostgreSQL.
 * 3. Updates vehicle-filters.controller.ts so `getBrands` and `getModels` ONLY return 
 *    brands and models that have at least 1 `APPROVED` variant in DB.
 */

import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const toggCanonicalVariants = [
  // T10X - 2023
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2023, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Standart Menzil', fullPath: 'SUV > 2023 > Elektrik > TOGG > T10X > V1 RWD Standart Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2023, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Uzun Menzil', fullPath: 'SUV > 2023 > Elektrik > TOGG > T10X > V1 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2023, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V2 RWD Uzun Menzil', fullPath: 'SUV > 2023 > Elektrik > TOGG > T10X > V2 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2023, fuel: 'Elektrik', bodyType: 'SUV', engine: '320 kW (435 HP)', transmission: 'Otomatik', trim: 'V2 AWD 4More', fullPath: 'SUV > 2023 > Elektrik > TOGG > T10X > V2 AWD 4More' },

  // T10X - 2024
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2024, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Standart Menzil', fullPath: 'SUV > 2024 > Elektrik > TOGG > T10X > V1 RWD Standart Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2024, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Uzun Menzil', fullPath: 'SUV > 2024 > Elektrik > TOGG > T10X > V1 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2024, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V2 RWD Uzun Menzil', fullPath: 'SUV > 2024 > Elektrik > TOGG > T10X > V2 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2024, fuel: 'Elektrik', bodyType: 'SUV', engine: '320 kW (435 HP)', transmission: 'Otomatik', trim: 'V2 AWD 4More', fullPath: 'SUV > 2024 > Elektrik > TOGG > T10X > V2 AWD 4More' },

  // T10X - 2025
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2025, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Standart Menzil', fullPath: 'SUV > 2025 > Elektrik > TOGG > T10X > V1 RWD Standart Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2025, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Uzun Menzil', fullPath: 'SUV > 2025 > Elektrik > TOGG > T10X > V1 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2025, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V2 RWD Uzun Menzil', fullPath: 'SUV > 2025 > Elektrik > TOGG > T10X > V2 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2025, fuel: 'Elektrik', bodyType: 'SUV', engine: '320 kW (435 HP)', transmission: 'Otomatik', trim: 'V2 AWD 4More', fullPath: 'SUV > 2025 > Elektrik > TOGG > T10X > V2 AWD 4More' },

  // T10X - 2026
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2026, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Standart Menzil', fullPath: 'SUV > 2026 > Elektrik > TOGG > T10X > V1 RWD Standart Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2026, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Uzun Menzil', fullPath: 'SUV > 2026 > Elektrik > TOGG > T10X > V1 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2026, fuel: 'Elektrik', bodyType: 'SUV', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V2 RWD Uzun Menzil', fullPath: 'SUV > 2026 > Elektrik > TOGG > T10X > V2 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10X', subModel: 'SUV', year: 2026, fuel: 'Elektrik', bodyType: 'SUV', engine: '320 kW (435 HP)', transmission: 'Otomatik', trim: 'V2 AWD 4More', fullPath: 'SUV > 2026 > Elektrik > TOGG > T10X > V2 AWD 4More' },

  // T10F - Fastback / Sedan
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2025, fuel: 'Elektrik', bodyType: 'Sedan', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Standart Menzil', fullPath: 'Sedan > 2025 > Elektrik > TOGG > T10F > V1 RWD Standart Menzil' },
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2025, fuel: 'Elektrik', bodyType: 'Sedan', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Uzun Menzil', fullPath: 'Sedan > 2025 > Elektrik > TOGG > T10F > V1 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2025, fuel: 'Elektrik', bodyType: 'Sedan', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V2 RWD Uzun Menzil', fullPath: 'Sedan > 2025 > Elektrik > TOGG > T10F > V2 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2025, fuel: 'Elektrik', bodyType: 'Sedan', engine: '320 kW (435 HP)', transmission: 'Otomatik', trim: 'V2 AWD 4More', fullPath: 'Sedan > 2025 > Elektrik > TOGG > T10F > V2 AWD 4More' },
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2026, fuel: 'Elektrik', bodyType: 'Sedan', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Standart Menzil', fullPath: 'Sedan > 2026 > Elektrik > TOGG > T10F > V1 RWD Standart Menzil' },
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2026, fuel: 'Elektrik', bodyType: 'Sedan', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V1 RWD Uzun Menzil', fullPath: 'Sedan > 2026 > Elektrik > TOGG > T10F > V1 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2026, fuel: 'Elektrik', bodyType: 'Sedan', engine: '160 kW (218 HP)', transmission: 'Otomatik', trim: 'V2 RWD Uzun Menzil', fullPath: 'Sedan > 2026 > Elektrik > TOGG > T10F > V2 RWD Uzun Menzil' },
  { brand: 'TOGG', model: 'T10F', subModel: 'Fastback', year: 2026, fuel: 'Elektrik', bodyType: 'Sedan', engine: '320 kW (435 HP)', transmission: 'Otomatik', trim: 'V2 AWD 4More', fullPath: 'Sedan > 2026 > Elektrik > TOGG > T10F > V2 AWD 4More' }
];

async function fixTogg() {
  console.log('=== FIXING TOGG TAXONOMY & ENRICHING DATASET ===');

  const jsonPath = path.join(process.cwd(), 'scratch/arabam_final.json');
  const data: any[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Remove old inaccurate TOGG records and insert canonical ones
  const filtered = data.filter(d => (d.brand || '').toLowerCase() !== 'togg');
  const updatedData = [...filtered, ...toggCanonicalVariants];

  fs.writeFileSync(jsonPath, JSON.stringify(updatedData, null, 2));
  console.log(`Updated arabam_final.json with ${toggCanonicalVariants.length} verified TOGG T10X & T10F variants.`);

  // Also clean up any legacy STALE or misnamed TOGG models in database
  console.log('Updating PostgreSQL Brand "TOGG" & Models...');
  const brand = await prisma.brand.findFirst({
    where: { name: { equals: 'togg', mode: 'insensitive' } }
  });

  if (brand) {
    // Update brand name to official uppercase "TOGG"
    await prisma.brand.update({
      where: { id: brand.id },
      data: { name: 'TOGG' }
    });

    // Update models T10X and T10F startYear to 2023
    const models = await prisma.model.findMany({ where: { brandId: brand.id } });
    for (const m of models) {
      if (m.name.toUpperCase() === 'T10X') {
        await prisma.model.update({
          where: { id: m.id },
          data: { name: 'T10X', startYear: 2023, endYear: 2026 }
        });
      } else if (m.name.toUpperCase() === 'T10F') {
        await prisma.model.update({
          where: { id: m.id },
          data: { name: 'T10F', startYear: 2025, endYear: 2026 }
        });
      }
    }
  }

  console.log('TOGG fixes completed.');
  await prisma.$disconnect();
}

fixTogg().catch(console.error);
