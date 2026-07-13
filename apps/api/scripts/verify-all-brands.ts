import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CSV_PATH = path.join(__dirname, '../scratch/TorqueScout_Satariz_Verified_Taxonomy_Varyant_DB_2000_2026.csv');

const BRANDS_LIST = [
  'Citroen'
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
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
  if (clean.includes('MANUEL')) return TransmissionType.MANUAL;
  if (clean.includes('YARI')) return TransmissionType.DCT;
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

function sanitizeEngineCode(code: string, brand: string, model: string, trim: string): string {
  let clean = String(code || '').trim();
  
  // Remove Boxer suffix for Subaru
  clean = clean.replace(/\s*boxer/gi, '').trim();

  // Strip redundant transmission codes from engine name (like "DSG", "EDC", "M/T", "A/T", "Manuel", "Otomatik")
  clean = clean.replace(/\b(dsg|edc|cvt|at|mt|manual|manuel|otomatik|x-tronic|xtronic)\b/gi, '').trim();
  
  // Strip redundant trim names from engine name (like "JOY", "TOUCH", "ICON", "COMFORTLINE", "HIGHLINE", "TRENDLINE", "ELEGANCE", "PRESTIGE")
  const trimUpper = String(trim || '').toUpperCase().trim();
  if (trimUpper && trimUpper !== 'STANDART') {
    const escapedTrim = trimUpper.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const trimRegex = new RegExp(`\\b${escapedTrim}\\b`, 'gi');
    clean = clean.replace(trimRegex, '').trim();
  }
  
  // Normalize double spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  
  if (!clean || clean.toUpperCase() === 'STANDART') {
    return '1.6';
  }
  
  return clean;
}

async function main() {
  console.log("==================================================");
  console.log("    MASTER VEHICLE TAXONOMY SYNC & VERIFICATION");
  console.log("==================================================");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: Reference CSV file not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  const country = await prisma.country.findFirst({ where: { code: 'TR' } });
  if (!country) {
    console.error("Error: Country TR not found in database.");
    process.exit(1);
  }
  const countryId = country.id;

  console.log("\n[1/3] CSV dosyası belleğe yükleniyor...");
  const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = fileContent.split(/\r?\n/);
  console.log(` -> CSV dosyası yüklendi. Toplam ${lines.length} satır.`);

  const summaryTable: any[] = [];

  for (const brand of BRANDS_LIST) {
    console.log(`\n--------------------------------------------------`);
    console.log(` MARKASYNC: ${brand.toUpperCase()}`);
    console.log(`--------------------------------------------------`);

    // Filter CSV lines for this brand
    const csvVariants: any[] = [];
    const uniqueKeysInCSV = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const fields = parseCSVLine(line);
      if (fields.length < 8) continue;

      const brandName = fields[0];
      let modelName = fields[1];
      let bodyType = fields[2];
      const year = parseInt(fields[3]);
      let engine = fields[4];
      const fuel = fields[5];
      let trim = fields[6] || 'Standart';
      const transmission = fields[7];

      // Citroën has standard Citroen spelling in DB
      let normalizedBrand = brandName;
      if (brandName.toLowerCase() === 'citroën') normalizedBrand = 'Citroen';

      if (normalizedBrand.toLowerCase() !== brand.toLowerCase() && brandName.toLowerCase() !== brand.toLowerCase()) continue;
      if (year < 2000) continue;

      // Clean engine codes
      let cleanEngine = sanitizeEngineCode(engine, brand, modelName, trim);

      // --- CUSTOM BRAND RULES ---

      // 1. Subaru XV / Crosstrek body types -> SUV
      if (brand.toLowerCase() === 'subaru' && (modelName.toLowerCase() === 'xv' || modelName.toLowerCase() === 'crosstrek')) {
        bodyType = 'SUV';
      }

      // 2. Subaru Impreza WRX / WRX STi engines -> 2.5 / 2.0
      if (brand.toLowerCase() === 'subaru' && modelName.toLowerCase() === 'impreza') {
        if (trim.toLowerCase() === 'wrx sti') {
          cleanEngine = year >= 2005 ? '2.5' : '2.0';
        } else if (trim.toLowerCase() === 'wrx') {
          cleanEngine = year >= 2006 ? '2.5' : '2.0';
        }
      }

      const key = `${modelName}_${bodyType}_${year}_${cleanEngine}_${fuel}_${trim}_${transmission}`.toLowerCase();
      
      if (!uniqueKeysInCSV.has(key)) {
        uniqueKeysInCSV.add(key);
        csvVariants.push({
          brand,
          model: modelName,
          bodyType,
          year,
          engine: cleanEngine,
          fuel,
          trim,
          transmission,
          key
        });
      }
    }

    console.log(` -> CSV dosyasında ${csvVariants.length} adet varyant bulundu.`);

    // Fetch DB variants for this brand
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

    const toAdd = csvVariants.filter(cv => !dbKeysSet.has(cv.key));
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
      return !uniqueKeysInCSV.has(key);
    });

    console.log(` -> Silinecek varyant: ${toRemove.length}, Eklenecek varyant: ${toAdd.length}`);

    // Apply database changes
    if (toRemove.length > 0) {
      const idsToRemove = toRemove.map(v => v.id);
      await prisma.vehicleVariant.deleteMany({
        where: { id: { in: idsToRemove } }
      });
      console.log(`   [OK] ${toRemove.length} hatalı/yapay varyant silindi.`);
    }

    if (toAdd.length > 0) {
      // Fetch indexes
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

      let count = 0;
      const chunkSize = 250;

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
          const horsepower = v.engine.includes('2.0') ? 150 : v.engine.includes('3.0') ? 220 : 110;
          const torque = Math.round(horsepower * 1.3);
          const newEngine = await prisma.engine.create({
            data: {
              code: v.engine.substring(0, 30),
              displacement: v.engine.includes('2.0') ? 2000 : v.engine.includes('3.0') ? 3000 : 1600,
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
          console.log(`   -> Eklendi: ${count}/${toAdd.length} varyant...`);
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      console.log(`   [OK] ${toAdd.length} yeni varyant başarıyla eklendi.`);
    }

    summaryTable.push({
      Brand: brand,
      CSV_Count: csvVariants.length,
      Added: toAdd.length,
      Deleted: toRemove.length,
      Status: 'SUCCESS'
    });
  }

  console.log("\n==================================================");
  console.log("            MASTER SYNC COMPLETE SUMMARY");
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
