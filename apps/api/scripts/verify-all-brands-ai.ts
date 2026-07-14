import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables (.env is in apps/api directory)
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const BRANDS_LIST = [
  'Renault', 'Fiat', 'Volkswagen', 'Toyota', 'Ford',
  'Opel', 'Peugeot', 'Hyundai', 'Honda', 'BMW',
  'Mercedes-Benz', 'Audi', 'Citroen', 'Nissan', 'Skoda',
  'Seat', 'Kia', 'Dacia', 'Volvo', 'Chevrolet',
  'Mazda', 'Suzuki', 'Mitsubishi', 'Mini', 'Alfa Romeo',
  'Jeep', 'Subaru', 'Lexus', 'Cupra', 'DS Automobiles',
  'Tesla', 'BYD', 'MG', 'Togg', 'Porsche'
];

function mapBodyType(typeStr: string): BodyType {
  const clean = String(typeStr || '').toUpperCase().trim();
  if (clean.includes('SEDAN')) return BodyType.SEDAN;
  if (clean.includes('HATCHBACK')) return BodyType.HATCHBACK;
  if (clean.includes('SUV')) return BodyType.SUV;
  if (clean.includes('COUPE')) return BodyType.COUPE;
  if (clean.includes('WAGON') || clean.includes('STATION')) return BodyType.WAGON;
  if (clean.includes('PICKUP') || clean.includes('PICK-UP')) return BodyType.PICKUP;
  if (clean.includes('VAN')) return BodyType.VAN;
  if (clean.includes('MINIVAN')) return BodyType.MINIVAN;
  if (clean.includes('CABRIO') || clean.includes('CONVERTIBLE')) return BodyType.CONVERTIBLE;
  return BodyType.SEDAN;
}

function mapFuelType(fuelStr: string): FuelType {
  const clean = String(fuelStr || '').toUpperCase().trim();
  if (clean.includes('BENZIN') || clean.includes('PETROL')) return FuelType.PETROL;
  if (clean.includes('DIZEL') || clean.includes('DIESEL')) return FuelType.DIESEL;
  if (clean.includes('HIBRIT') || clean.includes('HYBRID')) return FuelType.HYBRID;
  if (clean.includes('ELEKTRIK') || clean.includes('ELECTRIC')) return FuelType.ELECTRIC;
  if (clean.includes('LPG')) return FuelType.LPG;
  return FuelType.PETROL;
}

function mapTransmissionType(transStr: string): TransmissionType {
  const clean = String(transStr || '').toUpperCase().trim();
  if (clean.includes('MANUEL') || clean.includes('MANUAL')) return TransmissionType.MANUAL;
  if (clean.includes('YARI') || clean.includes('DCT')) return TransmissionType.DCT;
  return TransmissionType.AUTOMATIC;
}

function getTransmissionTr(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower.includes('manuel') || lower.includes('düz') || lower.includes('manual')) return 'Manuel';
  if (lower.includes('dsg') || lower.includes('edc') || lower.includes('powershift') || lower.includes('dct') || lower.includes('çift kavrama')) return 'Yarı Otomatik';
  return 'Otomatik';
}

function getBodyTypeName(enumVal: string): string {
  const mapping: Record<string, string> = {
    'SEDAN': 'Sedan',
    'HATCHBACK': 'Hatchback',
    'SUV': 'SUV',
    'COUPE': 'Coupe',
    'WAGON': 'Station Wagon',
    'PICKUP': 'Pickup',
    'VAN': 'Minivan',
    'CONVERTIBLE': 'Cabrio',
    'MINIVAN': 'Minivan'
  };
  return mapping[enumVal] || 'Sedan';
}

function getFuelTypeName(enumVal: string): string {
  const mapping: Record<string, string> = {
    'PETROL': 'Benzin',
    'DIESEL': 'Dizel',
    'LPG': 'LPG & Benzin',
    'HYBRID': 'Hibrit',
    'PLUG_IN_HYBRID': 'Hibrit',
    'ELECTRIC': 'Elektrik'
  };
  return mapping[enumVal] || 'Benzin';
}

async function main() {
  console.log("==================================================");
  console.log("    MASTER AI VEHICLE TAXONOMY SYNC (2000-2026)");
  console.log("==================================================");

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not defined in environment.");
    process.exit(1);
  }

  const country = await prisma.country.findFirst({ where: { code: 'TR' } });
  if (!country) {
    console.error("Error: Country TR not found in database.");
    process.exit(1);
  }
  const countryId = country.id;

  const summaryTable: any[] = [];

  for (const brand of BRANDS_LIST) {
    console.log(`\n--------------------------------------------------`);
    console.log(` AISYNC: ${brand.toUpperCase()}`);
    console.log(`--------------------------------------------------`);

    console.log(` -> GPT-4o'dan ${brand} için temiz katalog verisi isteniyor...`);

    const systemPrompt = `You are a professional automotive data architect in Turkey specializing in used car search filter configurations.
Your goal is to output a clean, accurate catalog schema for the brand "${brand}" for the Turkish market, covering years 2000 to 2026.

RULES:
1. Strip suffixes like "Boxer" or "VTi" from the engine code unless they are part of the standard name (e.g. use clean motor capacities like "1.5", "1.6", "2.0", "2.5" instead of "1.5 Boxer" or "2.0 Boxer").
2. Match high-performance trims like "WRX STi" or "M Sport" or "S Line" to their correct engines (e.g. Subaru Impreza WRX STi must ONLY be mapped to "2.0" or "2.5" engines, never to "1.5" or "1.6" engines!).
3. Year ranges must be realistic (2000 to 2026).
4. All text must use standard Turkish title casing for Model and Trim names (e.g. "Wrx Sti" is ok).
5. Output MUST be a structured JSON object matching the JSON schema below.

JSON Schema format:
{
  "models": [
    {
      "name": "Impreza",
      "generations": [
        {
          "name": "Impreza Jenerasyonu",
          "startYear": 2000,
          "endYear": 2026,
          "bodyTypes": ["Sedan", "Hatchback"],
          "specs": [
            {
              "engine": "1.5",
              "fuel": "Benzin",
              "transmission": "Manuel",
              "trims": ["Active", "Comfort", "Elegance"]
            },
            {
              "engine": "2.5",
              "fuel": "Benzin",
              "transmission": "Manuel",
              "trims": ["Wrx Sti", "Wrx"]
            }
          ]
        }
      ]
    }
  ]
}`;

    let config: any = { models: [] };
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate the clean taxonomy tree configuration for the brand: ${brand}` }
        ],
        response_format: { type: "json_object" }
      });
      const rawJson = completion.choices[0].message.content || '{}';
      config = JSON.parse(rawJson);
    } catch (err) {
      console.error(` -> GPT-4o hatası (${brand}):`, err);
      summaryTable.push({ Brand: brand, Status: 'FAILED_AI' });
      continue;
    }

    const referenceVariants: any[] = [];
    const uniqueKeysInRef = new Set<string>();

    if (config.models) {
      for (const model of config.models) {
        for (const gen of model.generations) {
          const start = Math.max(2000, gen.startYear);
          const end = Math.min(2026, gen.endYear);
          
          for (let year = start; year <= end; year++) {
            for (const bodyType of gen.bodyTypes) {
              for (const spec of gen.specs) {
                for (const trim of spec.trims) {
                  const key = `${model.name}_${bodyType}_${year}_${spec.engine}_${spec.fuel}_${trim}_${spec.transmission}`.toLowerCase();
                  
                  if (!uniqueKeysInRef.has(key)) {
                    uniqueKeysInRef.add(key);
                    referenceVariants.push({
                      brand,
                      model: model.name,
                      bodyType,
                      year,
                      engine: spec.engine,
                      fuel: spec.fuel,
                      trim,
                      transmission: spec.transmission,
                      key
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log(` -> AI tarafından ${referenceVariants.length} adet doğrulanmış varyant kuralı üretildi.`);

    const dbVariants = await prisma.vehicleVariant.findMany({
      where: {
        brand: { name: { equals: brand, mode: 'insensitive' } }
      },
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true
      }
    });

    console.log(` -> Veritabanında ${dbVariants.length} mevcut varyant bulundu.`);

    const dbKeysSet = new Set<string>();
    for (const v of dbVariants) {
      const brandName = v.brand.name;
      const modelName = v.model.name;
      const bodyType = getBodyTypeName(v.bodyType || '');
      const year = v.year;
      const engine = v.engine.code;
      const fuel = getFuelTypeName(v.fuelType || '');
      const trim = v.trim.name;
      const transmission = getTransmissionTr(v.transmission.name);

      const key = `${modelName}_${bodyType}_${year}_${engine}_${fuel}_${trim}_${transmission}`.toLowerCase();
      dbKeysSet.add(key);
    }

    const toAdd = referenceVariants.filter(rv => !dbKeysSet.has(rv.key));
    const toRemove = dbVariants.filter(dv => {
      const brandName = dv.brand.name;
      const modelName = dv.model.name;
      const bodyType = getBodyTypeName(dv.bodyType || '');
      const year = dv.year;
      const engine = dv.engine.code;
      const fuel = getFuelTypeName(dv.fuelType || '');
      const trim = dv.trim.name;
      const transmission = getTransmissionTr(dv.transmission.name);

      const key = `${modelName}_${bodyType}_${year}_${engine}_${fuel}_${trim}_${transmission}`.toLowerCase();
      
      if (year < 2000) return true;
      return !uniqueKeysInRef.has(key);
    });

    console.log(` -> Silinecek hatalı varyant: ${toRemove.length}, Eklenecek temiz varyant: ${toAdd.length}`);

    if (toRemove.length > 0) {
      const idsToRemove = toRemove.map(v => v.id);
      const deleteChunkSize = 10000;
      for (let i = 0; i < idsToRemove.length; i += deleteChunkSize) {
        const chunk = idsToRemove.slice(i, i + deleteChunkSize);
        await prisma.vehicleVariant.deleteMany({
          where: { id: { in: chunk } }
        });
      }
      console.log(`   [OK] ${toRemove.length} hatalı/yapay varyant silindi.`);
    }

    if (toAdd.length > 0) {
      const brands = await prisma.brand.findMany();
      const brandMap = new Map<string, string>();
      brands.forEach(b => brandMap.set(b.name.toLowerCase(), b.id));

      let brandId = brandMap.get(brand.toLowerCase());
      if (!brandId) {
        const newBrand = await prisma.brand.create({ data: { name: brand, isActive: true } });
        brandId = newBrand.id;
        brandMap.set(brand.toLowerCase(), brandId);
      }

      const models = await prisma.model.findMany({ where: { brandId } });
      const modelMap = new Map<string, string>();
      models.forEach(m => modelMap.set(m.name.toLowerCase(), m.id));

      const trims = await prisma.trim.findMany();
      const trimMap = new Map<string, string>();
      trims.forEach(t => trimMap.set(t.name.toLowerCase(), t.id));

      const engines = await prisma.engine.findMany();
      const engineMap = new Map<string, string>();
      engines.forEach(e => engineMap.set(e.code.toLowerCase(), e.id));

      const transmissions = await prisma.transmission.findMany();
      const transmissionMap = new Map<string, string>();
      transmissions.forEach(t => transmissionMap.set(t.name.toLowerCase(), t.id));

      const generations = await prisma.generation.findMany();
      const genMap = new Map<string, string>();
      generations.forEach(g => genMap.set(`${g.modelId}_${g.name.toLowerCase()}_${g.bodyType}`, g.id));

      const dataToInsert: any[] = [];
      for (const v of toAdd) {
        let modelId = modelMap.get(v.model.toLowerCase());
        if (!modelId) {
          const newModel = await prisma.model.create({
            data: { brandId, name: v.model, startYear: 2000, endYear: 2026 }
          });
          modelId = newModel.id;
          modelMap.set(v.model.toLowerCase(), modelId);
        }

        const bodyTypeEnum = mapBodyType(v.bodyType);
        const genName = `${v.model} Jenerasyonu`;
        let genId = genMap.get(`${modelId}_${genName.toLowerCase()}_${bodyTypeEnum}`);
        if (!genId) {
          const newGen = await prisma.generation.create({
            data: { modelId, name: genName, startYear: 2000, endYear: 2026, bodyType: bodyTypeEnum }
          });
          genId = newGen.id;
          genMap.set(`${modelId}_${genName.toLowerCase()}_${bodyTypeEnum}`, genId);
        }

        let engineId = engineMap.get(v.engine.toLowerCase());
        if (!engineId) {
          const fuelType = mapFuelType(v.fuel);
          const horsepower = v.engine.includes('2.0') ? 150 : 110;
          const torque = Math.round(horsepower * 1.3);
          const newEngine = await prisma.engine.create({
            data: {
              code: v.engine.substring(0, 30),
              displacement: v.engine.includes('2.0') ? 2000 : 1600,
              horsepower,
              torque,
              fuelType,
              hasTurbo: v.engine.toLowerCase().includes('t') || v.engine.toLowerCase().includes('turbo')
            }
          });
          engineId = newEngine.id;
          engineMap.set(v.engine.toLowerCase(), engineId);
        }

        let transmissionId = transmissionMap.get(v.transmission.toLowerCase());
        if (!transmissionId) {
          const type = mapTransmissionType(v.transmission);
          const newTrans = await prisma.transmission.create({
            data: { name: v.transmission, type, speeds: type === TransmissionType.MANUAL ? 6 : 8 }
          });
          transmissionId = newTrans.id;
          transmissionMap.set(v.transmission.toLowerCase(), transmissionId);
        }

        let trimId = trimMap.get(v.trim.toLowerCase());
        if (!trimId) {
          const newTrim = await prisma.trim.create({ data: { name: v.trim } });
          trimId = newTrim.id;
          trimMap.set(v.trim.toLowerCase(), trimId);
        }

        dataToInsert.push({
          brandId,
          modelId,
          generationId: genId,
          engineId,
          transmissionId,
          trimId,
          countryId,
          year: v.year,
          yearStart: 2000,
          yearEnd: 2026,
          bodyType: bodyTypeEnum,
          fuelType: mapFuelType(v.fuel),
          marketRegion: 'Turkey',
          status: ApprovalStatus.APPROVED
        });
      }

      let count = 0;
      const insertBatchSize = 50;
      for (let i = 0; i < dataToInsert.length; i += insertBatchSize) {
        const batch = dataToInsert.slice(i, i + insertBatchSize);
        await Promise.all(
          batch.map(async (data) => {
            try {
              await prisma.vehicleVariant.create({ data });
            } catch (err: any) {
              if (err.code === 'P2002') {
                return; // Skip duplicate
              }
              throw err;
            }
          })
        );
        count += batch.length;
        if (count % 200 === 0 || count === toAdd.length) {
          console.log(`   -> Eklendi: ${count}/${toAdd.length} varyant...`);
        }
      }
      console.log(`   [OK] ${toAdd.length} yeni varyant başarıyla eklendi.`);
    }

    summaryTable.push({
      Brand: brand,
      Rules: referenceVariants.length,
      Added: toAdd.length,
      Deleted: toRemove.length,
      Status: 'SUCCESS'
    });
  }

  console.log("\n==================================================");
  console.log("           MASTER AI SYNC COMPLETE SUMMARY");
  console.log("==================================================");
  console.table(summaryTable);
  console.log("==================================================");
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
