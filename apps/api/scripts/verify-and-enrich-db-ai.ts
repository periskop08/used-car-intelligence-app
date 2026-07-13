import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables (.env is in apps/api directory)
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

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
  console.log("    AI-ASSISTED VEHICLE TAXONOMY AUDIT & ENRICHMENT");
  console.log("==================================================");

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY is not defined in your environment variables (.env).");
    process.exit(1);
  }

  // Get country TR
  const country = await prisma.country.findFirst({ where: { code: 'TR' } });
  if (!country) {
    console.error("Error: Country TR not found in database.");
    process.exit(1);
  }
  const countryId = country.id;

  const args = process.argv.slice(2);
  let targetBrand = '';
  let autoYes = false;

  for (const arg of args) {
    if (arg.startsWith('--brand=')) {
      targetBrand = arg.split('=')[1];
    }
    if (arg === '--yes') {
      autoYes = true;
    }
  }

  if (!targetBrand) {
    const brandInput = await askQuestion("Verify edilecek Marka Adı (Örn: Subaru): ");
    targetBrand = brandInput.trim();
  }

  if (!targetBrand) {
    console.log("Geçersiz marka. Çıkış yapılıyor.");
    process.exit(0);
  }

  console.log(`\n[1/3] GPT-4o ile '${targetBrand}' markasının temiz katalog kuralları üretiliyor...`);
  
  const systemPrompt = `You are a professional automotive data architect in Turkey specializing in used car search filter configurations.
Your goal is to output a clean, accurate catalog schema for the brand "${targetBrand}" for the Turkish market, covering years 2000 to 2026.

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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate the clean taxonomy tree configuration for the brand: ${targetBrand}` }
    ],
    response_format: { type: "json_object" }
  });

  const rawJson = completion.choices[0].message.content || '{}';
  const config = JSON.parse(rawJson);
  
  // Expand rule-based specs into individual flat variants
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
                // Unique key: Model_BodyType_Year_Engine_Fuel_Trim_Trans
                const key = `${model.name}_${bodyType}_${year}_${spec.engine}_${spec.fuel}_${trim}_${spec.transmission}`.toLowerCase();
                
                if (!uniqueKeysInRef.has(key)) {
                  uniqueKeysInRef.add(key);
                  referenceVariants.push({
                    brand: targetBrand,
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

  console.log(`\n[2/3] Veritabanındaki mevcut '${targetBrand}' varyantları okunuyor...`);
  const dbVariants = await prisma.vehicleVariant.findMany({
    where: {
      brand: { name: { equals: targetBrand, mode: 'insensitive' } }
    },
    include: {
      brand: true,
      model: true,
      engine: true,
      transmission: true,
      trim: true
    }
  });

  console.log(` -> Veritabanında ${dbVariants.length} adet mevcut varyant bulundu.`);

  const dbKeysSet = new Set<string>();
  for (const v of dbVariants) {
    const brandName = v.brand.name;
    const modelName = v.model.name;
    const bodyType = getBodyTypeName(v.bodyType || '');
    const year = v.year;
    // Strip "Boxer" from DB engine code for matching
    const engine = v.engine.code.replace(/\s*boxer/gi, '').trim();
    const fuel = getFuelTypeName(v.fuelType || '');
    const trim = v.trim.name;
    const transmission = getTransmissionTr(v.transmission.name);

    const key = `${modelName}_${bodyType}_${year}_${engine}_${fuel}_${trim}_${transmission}`.toLowerCase();
    dbKeysSet.add(key);
  }

  // Find missing in DB
  const toAdd = referenceVariants.filter(rv => !dbKeysSet.has(rv.key));

  // Find stale/placeholder in DB (stale if pre-2000 OR if it has "boxer" suffix or incorrect mappings not present in AI ref)
  const toRemove = dbVariants.filter(dv => {
    const brandName = dv.brand.name;
    const modelName = dv.model.name;
    const bodyType = getBodyTypeName(dv.bodyType || '');
    const year = dv.year;
    const engine = dv.engine.code.replace(/\s*boxer/gi, '').trim();
    const fuel = getFuelTypeName(dv.fuelType || '');
    const trim = dv.trim.name;
    const transmission = getTransmissionTr(dv.transmission.name);

    const key = `${modelName}_${bodyType}_${year}_${engine}_${fuel}_${trim}_${transmission}`.toLowerCase();
    
    if (year < 2000) return true;
    
    // Stale if it is not present in AI reference or contains "Boxer" in its raw engine code
    return !uniqueKeysInRef.has(key) || dv.engine.code.toLowerCase().includes('boxer');
  });

  console.log(`\n==================================================`);
  console.log(`               AUDIT SONUÇLARI (AI DOĞRULAMA: ${targetBrand.toUpperCase()})`);
  console.log(`==================================================`);
  console.log(` ✔ Korunacak (Eşleşen) Aktif Varyantlar : ${referenceVariants.length - toAdd.length}`);
  console.log(` ➕ Eklenecek Yeni Varyantlar           : ${toAdd.length}`);
  console.log(` ❌ Silinecek Hatalı/Yapay Varyantlar  : ${toRemove.length}`);
  console.log(`==================================================`);

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log("Tebrikler! Veritabanındaki veriler zaten 100% güncel ve doğru.");
    process.exit(0);
  }

  if (toRemove.length > 0) {
    console.log("\nSilinecek hatalı varyantlardan bazıları (Örnek):");
    toRemove.slice(0, 10).forEach(v => {
      console.log(`  - [SİL] ${v.model.name} (${v.year}) > ${v.engine.code} > ${v.trim.name} [ID: ${v.id}]`);
    });
    if (toRemove.length > 10) console.log(`  ... ve diğer ${toRemove.length - 10} kayıt.`);
  }

  if (toAdd.length > 0) {
    console.log("\nEklenecek yeni varyantlardan bazıları (Örnek):");
    toAdd.slice(0, 10).forEach(v => {
      console.log(`  - [EKLE] ${v.model} (${v.year}) > ${v.bodyType} > Motor: ${v.engine} > Yakıt: ${v.fuel} > Şanzıman: ${v.transmission} > Paket: ${v.trim}`);
    });
    if (toAdd.length > 10) console.log(`  ... ve diğer ${toAdd.length - 10} kayıt.`);
  }

  let confirm = 'yes';
  if (!autoYes) {
    const confirmInput = await askQuestion("\nYukarıdaki düzeltmeleri Neon Veritabanına uygulamak istiyor musunuz? (yes/no): ");
    confirm = confirmInput.trim().toLowerCase();
  }

  if (confirm !== 'yes') {
    console.log("İptal edildi. Veritabanına dokunulmadı.");
    process.exit(0);
  }

  console.log("\n[3/3] Değişiklikler uygulanıyor...");

  // 1. Delete stale/incorrect variants
  if (toRemove.length > 0) {
    console.log(` -> ${toRemove.length} hatalı/yapay varyant siliniyor...`);
    const idsToRemove = toRemove.map(v => v.id);
    const deleteChunkSize = 10000;
    for (let i = 0; i < idsToRemove.length; i += deleteChunkSize) {
      const chunk = idsToRemove.slice(i, i + deleteChunkSize);
      await prisma.vehicleVariant.deleteMany({
        where: { id: { in: chunk } }
      });
    }
    console.log(" -> Silme işlemi tamamlandı.");
  }

  // 2. Insert missing clean variants
  if (toAdd.length > 0) {
    console.log(` -> ${toAdd.length} yeni varyant ekleniyor...`);
    
    const brands = await prisma.brand.findMany();
    const brandMap = new Map<string, string>();
    brands.forEach(b => brandMap.set(b.name.toLowerCase(), b.id));

    let brandId = brandMap.get(targetBrand.toLowerCase());
    if (!brandId) {
      const newBrand = await prisma.brand.create({ data: { name: targetBrand, isActive: true } });
      brandId = newBrand.id;
      brandMap.set(targetBrand.toLowerCase(), brandId);
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

    let count = 0;
    const chunkSize = 200;
    
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

      // Ensure Engine exists without "Boxer" in code
      let engineId = engineMap.get(v.engine.toLowerCase());
      if (!engineId) {
        const fuelType = mapFuelType(v.fuel);
        const horsepower = v.engine.includes('2.5') ? 230 : v.engine.includes('2.0') ? 150 : 115;
        const torque = Math.round(horsepower * 1.3);
        const newEngine = await prisma.engine.create({
          data: {
            code: v.engine.substring(0, 30),
            displacement: v.engine.includes('2.5') ? 2500 : v.engine.includes('2.0') ? 2000 : 1600,
            horsepower,
            torque,
            fuelType,
            hasTurbo: v.engine.includes('2.5') || v.engine.includes('turbo')
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
            year: v.year,
            yearStart: 2000,
            yearEnd: 2026,
            bodyType: bodyTypeEnum,
            fuelType: mapFuelType(v.fuel),
            marketRegion: 'Turkey',
            status: ApprovalStatus.APPROVED
          }
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Silently skip duplicate variants
          continue;
        }
        throw err;
      }

      count++;
      if (count % chunkSize === 0 || count === toAdd.length) {
        console.log(` -> Eklendi: ${count}/${toAdd.length} varyant...`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  console.log("\n==================================================");
  console.log("    DOĞRULAMA VE GÜNCELLEME BAŞARIYLA TAMAMLANDI!");
  console.log("==================================================");
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
