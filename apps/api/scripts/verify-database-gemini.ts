import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables (.env is in apps/api directory)
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const BRANDS_LIST = [
  'Renault', 'Fiat', 'Volkswagen', 'Toyota', 'Ford',
  'Opel', 'Peugeot', 'Hyundai', 'Honda', 'BMW',
  'Mercedes-Benz', 'Audi', 'Citroen', 'Nissan', 'Skoda',
  'Seat', 'Kia', 'Dacia', 'Volvo', 'Chevrolet',
  'Mazda', 'Suzuki', 'Mitsubishi', 'Mini', 'Alfa Romeo',
  'Jeep', 'Subaru', 'Lexus', 'Cupra', 'DS Automobiles',
  'Tesla', 'BYD', 'MG', 'Togg', 'Porsche'
];

const CACHE_PATH = path.join(__dirname, '../scratch/gemini_cache.json');

// Ensure scratch directory exists
const scratchDir = path.dirname(CACHE_PATH);
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// Load cache
let cache: Record<string, any> = {};
if (fs.existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch (e) {
    console.error("Failed to parse cache, starting fresh:", e);
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

function normalizeKey(str: string): string {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function mapBodyType(typeStr: string): BodyType {
  const clean = String(typeStr || '').toUpperCase().trim();
  if (clean.includes('SEDAN')) return BodyType.SEDAN;
  if (clean.includes('HATCHBACK') || clean.includes('HB')) return BodyType.HATCHBACK;
  if (clean.includes('SUV')) return BodyType.SUV;
  if (clean.includes('COUPE')) return BodyType.COUPE;
  if (clean.includes('WAGON') || clean.includes('STATION')) return BodyType.WAGON;
  if (clean.includes('PICKUP') || clean.includes('PICK-UP')) return BodyType.PICKUP;
  if (clean.includes('VAN')) return BodyType.VAN;
  if (clean.includes('MINIVAN') || clean.includes('MPV')) return BodyType.MINIVAN;
  if (clean.includes('CABRIO') || clean.includes('CONVERTIBLE')) return BodyType.CONVERTIBLE;
  return BodyType.SEDAN;
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

function mapFuelType(fuelStr: string): FuelType {
  const clean = String(fuelStr || '').toUpperCase().trim();
  if (clean.includes('BENZIN') || clean.includes('PETROL')) return FuelType.PETROL;
  if (clean.includes('DIZEL') || clean.includes('DIESEL')) return FuelType.DIESEL;
  if (clean.includes('HIBRIT') || clean.includes('HYBRID')) return FuelType.HYBRID;
  if (clean.includes('ELEKTRIK') || clean.includes('ELECTRIC')) return FuelType.ELECTRIC;
  if (clean.includes('LPG')) return FuelType.LPG;
  return FuelType.PETROL;
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

function mapTransmissionType(transStr: string): TransmissionType {
  const clean = String(transStr || '').toUpperCase().trim();
  if (clean.includes('MANUEL') || clean.includes('MANUAL')) return TransmissionType.MANUAL;
  if (clean.includes('YARI') || clean.includes('DCT') || clean.includes('SEMI')) return TransmissionType.DCT;
  return TransmissionType.AUTOMATIC;
}

function getTransmissionTr(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower.includes('manuel') || lower.includes('düz') || lower.includes('manual')) return 'Manuel';
  if (lower.includes('dsg') || lower.includes('edc') || lower.includes('powershift') || lower.includes('dct') || lower.includes('çift kavrama')) return 'Yarı Otomatik';
  return 'Otomatik';
}

async function main() {
  console.log("==================================================");
  console.log("    GEMINI/OPENAI VERIFY & CLEAN DATABASE TOOL");
  console.log("==================================================");

  const dryRun = !process.argv.includes('--write');
  if (dryRun) {
    console.log("⚠️  RUNNING IN DRY-RUN MODE. NO CHANGES WILL BE WRITTEN TO DB.");
    console.log("   (Pass '--write' to execute changes directly in DB)");
  } else {
    console.log("🔥 RUNNING IN LIVE WRITE MODE. DATABASE WILL BE MODIFIED!");
  }

  // Parse target brand if provided
  let targetBrandArg: string | null = null;
  const brandIdx = process.argv.indexOf('--brand');
  if (brandIdx !== -1 && brandIdx + 1 < process.argv.length) {
    targetBrandArg = process.argv[brandIdx + 1];
    console.log(`🎯 Filtering by target brand: ${targetBrandArg}`);
  }

  // Determine which API client to use
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  let openai: OpenAI;
  let modelName: string;

  if (geminiApiKey) {
    console.log("🟢 Using Google Gemini API...");
    openai = new OpenAI({
      apiKey: geminiApiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });
    modelName = "gemini-1.5-pro";
  } else if (openaiApiKey) {
    console.log("🔵 Using OpenAI API...");
    openai = new OpenAI({
      apiKey: openaiApiKey
    });
    modelName = "gpt-4o-mini"; // Use the cost-effective model as default fallback
  } else {
    console.error("Error: Neither GEMINI_API_KEY nor OPENAI_API_KEY is defined in environment variables.");
    process.exit(1);
  }

  console.log(`🤖 Selected model: ${modelName}`);

  const country = await prisma.country.findFirst({ where: { code: 'TR' } });
  if (!country) {
    console.error("Error: Country TR not found in database.");
    process.exit(1);
  }
  const countryId = country.id;

  // Retrieve unique approved brand-model-year combinations in DB
  const uniqueCombos = await prisma.vehicleVariant.findMany({
    where: {
      brand: {
        name: targetBrandArg
          ? { equals: targetBrandArg, mode: 'insensitive' }
          : { in: BRANDS_LIST }
      }
    },
    select: {
      brand: { select: { name: true } },
      model: { select: { name: true } },
      year: true
    },
    distinct: ['brandId', 'modelId', 'year']
  });

  console.log(`Found ${uniqueCombos.length} unique combinations to check in DB.`);

  let totalChecked = 0;
  let totalDeleted = 0;
  let totalAdded = 0;

  // Process combinations in parallel batches
  const BATCH_SIZE = 30;
  for (let i = 0; i < uniqueCombos.length; i += BATCH_SIZE) {
    const batch = uniqueCombos.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (combo, batchIdx) => {
      const brand = combo.brand.name;
      const model = combo.model.name;
      const year = combo.year;
      const currentIdx = i + batchIdx + 1;

      const cacheKey = `${brand}_${model}_${year}`.toLowerCase().replace(/\s+/g, '');
      let resultJson: any = null;

      if (cache[cacheKey]) {
        resultJson = cache[cacheKey];
      } else {
        const systemPrompt = `You are a highly precise Turkish automotive catalog expert.
Given a brand, model, and year, you must output the complete list of verified, real-world engine configurations and trim levels that were sold in Turkey for this specific model-year.

RULES:
1. Do not hallucinate or invent specs. Only return configurations that actually existed in the Turkish market.
2. Use clean, standardized engine displacements (e.g., "1.4", "1.6", "1.6 HDi", "2.0", "2.0 HDi") rather than marketing names, unless necessary.
3. High-performance or special versions must be mapped to their correct engines (e.g. WRX STi only with 2.0 or 2.5).
4. Do not include modern engine names (like PureTech, BlueHDi, TSI, EcoBoost, MultiJet) for vehicles produced before those engine families were introduced (e.g. before 2012, Peugeot did not have PureTech or BlueHDi. If Peugeot 307 from 2006 is queried, it must ONLY have "1.4", "1.6", "1.6 HDi", "2.0", or "2.0 HDi").
5. Output format must be a structured JSON object matching the schema below.

JSON Schema format:
{
  "brand": "${brand}",
  "model": "${model}",
  "year": ${year},
  "variants": [
    {
      "bodyType": "Hatchback",
      "engine": "1.6",
      "fuel": "Benzin",
      "transmission": "Manuel",
      "trim": "Comfort"
    }
  ]
}`;

        try {
          const completion = await openai.chat.completions.create({
            model: modelName,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Generate the clean automotive configuration list for: ${brand} ${model} (${year})` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0
          });

          const rawJson = completion.choices[0].message.content || '{}';
          resultJson = JSON.parse(rawJson);

          // Save to cache (using a safe block to write concurrently)
          cache[cacheKey] = resultJson;
          saveCache();
        } catch (err) {
          console.error(`❌ [${currentIdx}/${uniqueCombos.length}] API call failed for ${brand} ${model} (${year}):`, err);
          return;
        }
      }

      if (!resultJson || !Array.isArray(resultJson.variants)) {
        return;
      }

      // Build the set of valid keys returned by API
      const validKeysSet = new Set<string>();
      const validVariantsList = resultJson.variants;

      for (const v of validVariantsList) {
        const bType = normalizeKey(getBodyTypeName(mapBodyType(v.bodyType || 'Sedan')));
        const eng = normalizeKey(v.engine || '1.6');
        const fuel = normalizeKey(getFuelTypeName(mapFuelType(v.fuel || 'Benzin')));
        const trans = normalizeKey(getTransmissionTr(v.transmission || 'Manuel'));
        const trim = normalizeKey(v.trim || 'Standart');

        const key = `${bType}_${eng}_${fuel}_trans_${trim}`;
        validKeysSet.add(key);
      }

      // Retrieve current variants in DB for this brand-model-year combo
      const dbVariants = await prisma.vehicleVariant.findMany({
        where: {
          brand: { name: { equals: brand, mode: 'insensitive' } },
          model: { name: { equals: model, mode: 'insensitive' } },
          year: year
        },
        include: {
          engine: true,
          transmission: true,
          trim: true
        }
      });

      const dbKeysSet = new Set<string>();
      const dbVariantsToRemove: typeof dbVariants = [];

      for (const v of dbVariants) {
        const bType = normalizeKey(getBodyTypeName(v.bodyType || ''));
        const eng = normalizeKey(v.engine.code);
        const fuel = normalizeKey(getFuelTypeName(v.fuelType || ''));
        const trans = normalizeKey(getTransmissionTr(v.transmission.name));
        const trim = normalizeKey(v.trim.name);

        const key = `${bType}_${eng}_${fuel}_trans_${trim}`;
        dbKeysSet.add(key);

        if (!validKeysSet.has(key)) {
          dbVariantsToRemove.push(v);
        }
      }

      // Log results for this combo
      console.log(`[${currentIdx}/${uniqueCombos.length}] ${brand} ${model} (${year}) -> DB count: ${dbVariants.length} | API verified: ${validVariantsList.length}`);

      if (dbVariantsToRemove.length > 0) {
        console.log(`   ❌ Found ${dbVariantsToRemove.length} fake variants to remove`);
        totalDeleted += dbVariantsToRemove.length;
      }

      const toAddList = validVariantsList.filter((v: any) => {
        const bType = normalizeKey(getBodyTypeName(mapBodyType(v.bodyType || 'Sedan')));
        const eng = normalizeKey(v.engine || '1.6');
        const fuel = normalizeKey(getFuelTypeName(mapFuelType(v.fuel || 'Benzin')));
        const trans = normalizeKey(getTransmissionTr(v.transmission || 'Manuel'));
        const trim = normalizeKey(v.trim || 'Standart');

        const key = `${bType}_${eng}_${fuel}_trans_${trim}`;
        return !dbKeysSet.has(key);
      });

      if (toAddList.length > 0) {
        console.log(`   ➕ Found ${toAddList.length} missing real variants to add`);
        totalAdded += toAddList.length;
      }

      // Execute writes if not in dry-run mode
      if (!dryRun) {
        // 1. Delete invalid variants
        if (dbVariantsToRemove.length > 0) {
          const idsToRemove = dbVariantsToRemove.map(v => v.id);
          await prisma.vehicleVariant.deleteMany({
            where: { id: { in: idsToRemove } }
          });
        }

        // 2. Insert missing variants
        if (toAddList.length > 0) {
          const brands = await prisma.brand.findMany();
          const brandMap = new Map<string, string>();
          brands.forEach(b => brandMap.set(b.name.toLowerCase(), b.id));

          let brandId = brandMap.get(brand.toLowerCase());
          if (!brandId) {
            try {
              const newBrand = await prisma.brand.create({ data: { name: brand, isActive: true } });
              brandId = newBrand.id;
              brandMap.set(brand.toLowerCase(), brandId);
            } catch (err: any) {
              if (err.code === 'P2002') {
                const existing = await prisma.brand.findUnique({ where: { name: brand } });
                brandId = existing!.id;
                brandMap.set(brand.toLowerCase(), brandId);
              } else {
                throw err;
              }
            }
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

          let modelId = modelMap.get(model.toLowerCase());
          if (!modelId) {
            try {
              const newModel = await prisma.model.create({
                data: { brandId, name: model, startYear: 2000, endYear: 2026 }
              });
              modelId = newModel.id;
              modelMap.set(model.toLowerCase(), modelId);
            } catch (err: any) {
              if (err.code === 'P2002') {
                const existing = await prisma.model.findUnique({
                  where: { brandId_name: { brandId, name: model } }
                });
                modelId = existing!.id;
                modelMap.set(model.toLowerCase(), modelId);
              } else {
                throw err;
              }
            }
          }

          for (const v of toAddList) {
            const bodyTypeEnum = mapBodyType(v.bodyType || 'Sedan');
            const genName = `${model} Jenerasyonu`;
            
            let genId = genMap.get(`${modelId}_${genName.toLowerCase()}_${bodyTypeEnum}`);
            if (!genId) {
              try {
                const newGen = await prisma.generation.create({
                  data: { modelId, name: genName, startYear: 2000, endYear: 2026, bodyType: bodyTypeEnum }
                });
                genId = newGen.id;
                genMap.set(`${modelId}_${genName.toLowerCase()}_${bodyTypeEnum}`, genId);
              } catch (err: any) {
                if (err.code === 'P2002') {
                  const existing = await prisma.generation.findFirst({
                    where: { modelId, name: genName, startYear: 2000, bodyType: bodyTypeEnum }
                  });
                  genId = existing!.id;
                  genMap.set(`${modelId}_${genName.toLowerCase()}_${bodyTypeEnum}`, genId);
                } else {
                  throw err;
                }
              }
            }

            const vEngine = v.engine || '1.6';
            let engineId = engineMap.get(vEngine.toLowerCase());
            if (!engineId) {
              const fuelType = mapFuelType(v.fuel || 'Benzin');
              const horsepower = vEngine.includes('2.0') ? 150 : 110;
              const torque = Math.round(horsepower * 1.3);
              const code = vEngine.substring(0, 30);
              try {
                const newEngine = await prisma.engine.create({
                  data: {
                    code,
                    displacement: vEngine.includes('2.0') ? 2000 : 1600,
                    horsepower,
                    torque,
                    fuelType,
                    hasTurbo: vEngine.toLowerCase().includes('t') || vEngine.toLowerCase().includes('turbo')
                  }
                });
                engineId = newEngine.id;
                engineMap.set(vEngine.toLowerCase(), engineId);
              } catch (err: any) {
                if (err.code === 'P2002') {
                  const existing = await prisma.engine.findFirst({
                    where: {
                      code,
                      displacement: vEngine.includes('2.0') ? 2000 : 1600,
                      horsepower,
                      torque,
                      fuelType
                    }
                  });
                  engineId = existing!.id;
                  engineMap.set(vEngine.toLowerCase(), engineId);
                } else {
                  throw err;
                }
              }
            }

            const vTrans = v.transmission || 'Manuel';
            let transmissionId = transmissionMap.get(vTrans.toLowerCase());
            if (!transmissionId) {
              const type = mapTransmissionType(vTrans);
              const speeds = type === TransmissionType.MANUAL ? 6 : 8;
              try {
                const newTrans = await prisma.transmission.create({
                  data: { name: vTrans, type, speeds }
                });
                transmissionId = newTrans.id;
                transmissionMap.set(vTrans.toLowerCase(), transmissionId);
              } catch (err: any) {
                if (err.code === 'P2002') {
                  const existing = await prisma.transmission.findFirst({
                    where: { name: vTrans, type, speeds }
                  });
                  transmissionId = existing!.id;
                  transmissionMap.set(vTrans.toLowerCase(), transmissionId);
                } else {
                  throw err;
                }
              }
            }

            const vTrim = v.trim || 'Standart';
            let trimId = trimMap.get(vTrim.toLowerCase());
            if (!trimId) {
              try {
                const newTrim = await prisma.trim.create({ data: { name: vTrim } });
                trimId = newTrim.id;
                trimMap.set(vTrim.toLowerCase(), trimId);
              } catch (err: any) {
                if (err.code === 'P2002') {
                  const existing = await prisma.trim.findFirst({
                    where: { name: vTrim }
                  });
                  trimId = existing!.id;
                  trimMap.set(vTrim.toLowerCase(), trimId);
                } else {
                  throw err;
                }
              }
            }

            try {
              await prisma.vehicleVariant.create({
                data: {
                  brandId,
                  modelId,
                  generationId: genId,
                  engineId,
                  transmissionId,
                  trimId,
                  countryId,
                  year: year,
                  yearStart: 2000,
                  yearEnd: 2026,
                  bodyType: bodyTypeEnum,
                  fuelType: mapFuelType(v.fuel || 'Benzin'),
                  marketRegion: 'Turkey',
                  status: ApprovalStatus.APPROVED
                }
              });
            } catch (err: any) {
              if (err.code !== 'P2002') {
                throw err;
              }
            }
          }
        }
      }

      totalChecked++;
    }));
  }

  console.log("\n==================================================");
  console.log("            VERIFICATION RUN COMPLETED");
  console.log("==================================================");
  console.log(`Checked combinations: ${totalChecked}`);
  console.log(`Total variants marked for deletion: ${totalDeleted}`);
  console.log(`Total variants marked for addition: ${totalAdded}`);
  console.log("==================================================");
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
