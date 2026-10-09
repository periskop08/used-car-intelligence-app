import { PrismaClient, BodyType, FuelType, TransmissionType, ApprovalStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const prisma = new PrismaClient();

interface ArabamPart2Row {
  'Vasıta Türü': string;
  'Üretim Yılı': string;
  'Yakıt Tipi': string;
  Marka: string;
  Model: string;
  'Donanım Paketi': string;
  'Vites Tipi': string;
  'Tam Yol': string;
}

export interface ParseResult {
  engine: string;
  package: string;
  isUnresolved: boolean;
  unresolvedReason?: string;
}

export function parseMinivanCompositeDonanimPaketi(rawDp: string): ParseResult {
  const clean = (rawDp || '').trim();
  if (!clean) {
    return { engine: 'Standart', package: 'Standart', isUnresolved: false };
  }

  // 1. Classic hyphen format: "1.3 Multijet - Premio"
  const sepIdx = clean.indexOf(' - ');
  if (sepIdx !== -1) {
    const left = clean.substring(0, sepIdx).trim();
    const right = clean.substring(sepIdx + 3).trim();
    return {
      engine: left || 'Standart',
      package: right || 'Standart',
      isUnresolved: false,
    };
  }

  // 2. Engine family pattern with package: "1.3 Multijet Premio", "1.4 Fire Safeline", "1.5 BlueHDi Shine"
  const engineFamilies = [
    'Multijet', 'MultiJet', 'Ecojet', 'BlueHDi', 'BlueHDI', 'HDi', 'HDI', 'dCi', 'DCI', 
    'TDI', 'TDCi', 'TDCI', 'CDTI', 'CRDI', 'CRD', 'JTD', 'Fire', 'Eko', 
    'PureTech', 'Puretech', 'EcoBoost', 'TSI', 'TFSI', 'CDI', 'SDI', 'SDi', 
    'BiTDI', 'CRDi'
  ];
  const p1 = new RegExp(`^(\\d+\\.\\d+(?:\\s+(?:${engineFamilies.join('|')})))\\s+(.+)$`, 'i');
  const m1 = clean.match(p1);
  if (m1) {
    return {
      engine: m1[1].trim(),
      package: m1[2].trim(),
      isUnresolved: false,
    };
  }

  // 3. Engine family alone without package: "1.3 Multijet", "1.4 Fire", "2.0 TDI" -> Package = "Standart"
  const p2 = new RegExp(`^(\\d+\\.\\d+(?:\\s+(?:${engineFamilies.join('|')})))$`, 'i');
  const m2 = clean.match(p2);
  if (m2) {
    return {
      engine: m2[1].trim(),
      package: 'Standart',
      isUnresolved: false,
    };
  }

  // 4. Large Van Cargo Volume: "15 m³", "17 m³", "13 m³", "9.5 m³" -> Engine: "Standart", Package: "15 m³"
  const p3 = /^(\d+(?:\.\d+)?\s*m[³3])$/i;
  const m3 = clean.match(p3);
  if (m3) {
    return {
      engine: 'Standart',
      package: m3[1].trim(),
      isUnresolved: false,
    };
  }

  // 5. Mercedes Vito/Sprinter number codes: "111 CDI", "114 CDI Pro", "315 CDI"
  const p5 = /^(\d{3}\s+CDI)(?:\s+(.+))?$/i;
  const m5 = clean.match(p5);
  if (m5) {
    return {
      engine: m5[1].trim(),
      package: m5[2]?.trim() || 'Standart',
      isUnresolved: false,
    };
  }

  // 6. Ford Transit payload codes: "330 S", "350 ED", "320 L Trend"
  const p4 = /^(\d{3}\s+[A-Z0-9]+)(?:\s+(.+))?$/i;
  const m4 = clean.match(p4);
  if (m4) {
    return {
      engine: m4[1].trim(),
      package: m4[2]?.trim() || 'Standart',
      isUnresolved: false,
    };
  }

  // 7. Displacement + Package: "1.6 Elegance", "1.4 Active", "2.0 SE Family"
  const p6 = /^(\d+\.\d+)\s+(.+)$/;
  const m6 = clean.match(p6);
  if (m6) {
    return {
      engine: m6[1].trim(),
      package: m6[2].trim(),
      isUnresolved: false,
    };
  }

  // 8. Displacement alone: "1.2", "1.4", "1.6"
  const p7 = /^(\d+\.\d+)$/;
  const m7 = clean.match(p7);
  if (m7) {
    return {
      engine: m7[1].trim(),
      package: 'Standart',
      isUnresolved: false,
    };
  }

  // 9. Single package or type label: "Panelvan", "Camlı Van", "Savana", "Dynamic Lux" -> Engine = "Standart", Package = clean
  return {
    engine: 'Standart',
    package: clean,
    isUnresolved: false,
  };
}

export function mapTurkishFuel(fuelStr: string): FuelType {
  const clean = (fuelStr || '').toLowerCase().trim();
  if (clean === 'dizel' || clean === 'diesel') return FuelType.DIESEL;
  if (clean === 'benzin' || clean === 'petrol') return FuelType.PETROL;
  if (clean.includes('lpg')) return FuelType.LPG;
  if (clean.includes('hibrit') || clean.includes('hybrid')) return FuelType.HYBRID;
  if (clean.includes('elektrik') || clean.includes('electric')) return FuelType.ELECTRIC;
  return FuelType.OTHER;
}

export async function runDryRun(sourcePath: string) {
  console.log(`\n==================================================`);
  console.log(`🚀 TORQUESCOUT — ARABAM PART 2 COMPREHENSIVE DRY-RUN`);
  console.log(`==================================================\n`);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source JSON file not found at: ${sourcePath}`);
  }

  const rawJson = fs.readFileSync(sourcePath, 'utf8');
  const records: ArabamPart2Row[] = JSON.parse(rawJson);

  const totalRecords = records.length;
  const minivanRows = records.filter(r => r['Vasıta Türü'] === 'Minivan & Panelvan');
  const motoRows = records.filter(r => r['Vasıta Türü'] === 'Motosiklet');

  console.log(`1. Total Source Records: ${totalRecords}`);
  console.log(`2. Minivan & Panelvan Records: ${minivanRows.length}`);
  console.log(`3. Motosiklet Records: ${motoRows.length}\n`);

  // --- MINIVAN AUDIT ---
  const minivanBrands = new Set<string>();
  const minivanModels = new Set<string>();
  const minivanYears = new Set<number>();
  const minivanFuels = new Set<string>();

  let parsedSuccessCount = 0;
  let parsedFailCount = 0;
  const uniqueEngines = new Set<string>();
  const uniquePackages = new Set<string>();
  const failReasons: Record<string, number> = {};
  const sampleSuccessResults: Array<{ raw: string; engine: string; package: string }> = [];
  const sampleFailResults: Array<{ raw: string; reason: string; tamYol: string }> = [];

  // Grouped unique variants to create: brand|model|year|fuel|engine|package
  const uniqueMinivanVariants = new Map<string, {
    brand: string;
    model: string;
    year: number;
    fuel: string;
    engine: string;
    package: string;
    rawDp: string;
    tamYol: string;
  }>();

  for (const m of minivanRows) {
    const brand = (m.Marka || '').trim();
    const model = (m.Model || '').trim();
    const yearNum = parseInt(m['Üretim Yılı'] || '0', 10);
    const fuel = (m['Yakıt Tipi'] || '').trim();
    const rawDp = (m['Donanım Paketi'] || '').trim();

    if (brand) minivanBrands.add(brand);
    if (model) minivanModels.add(`${brand}||${model}`);
    if (yearNum > 0) minivanYears.add(yearNum);
    if (fuel) minivanFuels.add(fuel);

    const parseRes = parseMinivanCompositeDonanimPaketi(rawDp);
    if (!parseRes.isUnresolved) {
      parsedSuccessCount++;
      uniqueEngines.add(parseRes.engine);
      uniquePackages.add(parseRes.package);
      if (sampleSuccessResults.length < 5) {
        sampleSuccessResults.push({ raw: rawDp, engine: parseRes.engine, package: parseRes.package });
      }

      const variantKey = `${brand.toLowerCase()}|${model.toLowerCase()}|${yearNum}|${fuel.toLowerCase()}|${parseRes.engine.toLowerCase()}|${parseRes.package.toLowerCase()}`;
      if (!uniqueMinivanVariants.has(variantKey)) {
        uniqueMinivanVariants.set(variantKey, {
          brand,
          model,
          year: yearNum,
          fuel,
          engine: parseRes.engine,
          package: parseRes.package,
          rawDp,
          tamYol: m['Tam Yol'],
        });
      }
    } else {
      parsedFailCount++;
      const reason = parseRes.unresolvedReason || 'UNKNOWN';
      failReasons[reason] = (failReasons[reason] || 0) + 1;
      if (sampleFailResults.length < 5) {
        sampleFailResults.push({ raw: rawDp, reason, tamYol: m['Tam Yol'] });
      }
    }
  }

  // --- MOTORCYCLE AUDIT ---
  const motoBrands = new Set<string>();
  const motoModels = new Set<string>();
  const uniqueMotoIdentities = new Map<string, { brand: string; model: string }>();

  for (const m of motoRows) {
    const brand = (m.Marka || '').trim();
    const model = (m.Model || '').trim();
    if (brand) motoBrands.add(brand);
    if (model) motoModels.add(`${brand}||${model}`);
    const key = `${brand.toLowerCase()}|${model.toLowerCase()}`;
    if (brand && model && !uniqueMotoIdentities.has(key)) {
      uniqueMotoIdentities.set(key, { brand, model });
    }
  }

  console.log(`--- MINIVAN AUDIT ---`);
  console.log(`Unique Minivan Brands: ${minivanBrands.size}`);
  console.log(`Unique Minivan Models: ${minivanModels.size}`);
  console.log(`Unique Minivan Years: ${minivanYears.size} (${Math.min(...minivanYears)} - ${Math.max(...minivanYears)})`);
  console.log(`Unique Minivan Fuels: [${Array.from(minivanFuels).join(', ')}]`);
  console.log(`Parsed Success Count: ${parsedSuccessCount}`);
  console.log(`Parsed Failure Count: ${parsedFailCount}`);
  console.log(`Failure Reasons:`, failReasons);
  console.log(`Unique Parsed Engines: ${uniqueEngines.size}`);
  console.log(`Unique Parsed Packages: ${uniquePackages.size}`);
  console.log(`Unique Minivan Variants to create: ${uniqueMinivanVariants.size}\n`);

  console.log(`--- MOTORCYCLE AUDIT ---`);
  console.log(`Unique Motorcycle Brands: ${motoBrands.size}`);
  console.log(`Unique Motorcycle Models: ${motoModels.size}`);
  console.log(`Motorcycle canonical identities to ensure in DB: ${uniqueMotoIdentities.size}\n`);

  console.log(`--- SAMPLE PARSER RESULTS ---`);
  sampleSuccessResults.forEach((s, idx) => {
    console.log(`[Sample ${idx + 1}] SOURCE: "${s.raw}" -> ENGINE: "${s.engine}", PACKAGE: "${s.package}"`);
  });
  console.log(`\n--- SAMPLE UNRESOLVED PARSE RESULTS ---`);
  sampleFailResults.forEach((f, idx) => {
    console.log(`[Unresolved ${idx + 1}] REASON: ${f.reason} | RAW: "${f.raw}" | PATH: ${f.tamYol}`);
  });

  // DB Collision & Reuse Audit
  console.log(`\n--- DB COLLISION & ENTITY AUDIT ---`);
  const existingBrands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const existingBrandMap = new Map(existingBrands.map(b => [b.name.toLowerCase().trim(), b.id]));

  const existingModels = await prisma.model.findMany({ select: { id: true, name: true, brandId: true } });
  const existingModelMap = new Map(existingModels.map(m => [`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id]));

  let minivanBrandsReuse = 0;
  let minivanBrandsCreate = 0;
  for (const b of minivanBrands) {
    if (existingBrandMap.has(b.toLowerCase())) minivanBrandsReuse++;
    else minivanBrandsCreate++;
  }

  let motoBrandsReuse = 0;
  let motoBrandsCreate = 0;
  for (const b of motoBrands) {
    if (existingBrandMap.has(b.toLowerCase())) motoBrandsReuse++;
    else motoBrandsCreate++;
  }

  console.log(`Minivan Brands: ${minivanBrandsReuse} existing reuses, ${minivanBrandsCreate} new creates.`);
  console.log(`Motorcycle Brands: ${motoBrandsReuse} existing reuses, ${motoBrandsCreate} new creates.`);

  return {
    totalRecords,
    minivanCount: minivanRows.length,
    motoCount: motoRows.length,
    minivanBrandsCount: minivanBrands.size,
    minivanModelsCount: minivanModels.size,
    motoBrandsCount: motoBrands.size,
    motoModelsCount: motoModels.size,
    minivanYears: Array.from(minivanYears).sort((a, b) => b - a),
    minivanFuels: Array.from(minivanFuels),
    parsedSuccessCount,
    parsedFailCount,
    uniqueEnginesCount: uniqueEngines.size,
    uniquePackagesCount: uniquePackages.size,
    sampleSuccessResults,
    sampleFailResults,
    uniqueMinivanVariants,
    uniqueMotoIdentities,
  };
}

export async function executeImport(sourcePath: string) {
  const audit = await runDryRun(sourcePath);

  console.log(`\n==================================================`);
  console.log(`⚡ EXECUTING SAFE NON-DESTRUCTIVE DB IMPORT`);
  console.log(`==================================================\n`);

  // 1. Ensure Turkey Country
  let country = await prisma.country.findFirst({ where: { code: 'TR' } });
  if (!country) {
    country = await prisma.country.create({
      data: { code: 'TR', name: 'Türkiye' },
    });
  }
  const countryId = country.id;

  // 2. Pre-create all missing Brands
  console.log(`Ensuring all Brands exist...`);
  const allBrandNames = new Set<string>();
  audit.uniqueMinivanVariants.forEach(v => allBrandNames.add(v.brand));
  audit.uniqueMotoIdentities.forEach(m => allBrandNames.add(m.brand));

  let existingBrands = await prisma.brand.findMany();
  let brandCache = new Map<string, string>();
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase().trim(), b.id));

  const missingBrands = Array.from(allBrandNames)
    .filter(b => !brandCache.has(b.toLowerCase().trim()))
    .map(b => ({ name: b.trim(), isActive: true }));

  if (missingBrands.length > 0) {
    console.log(`Creating ${missingBrands.length} missing Brands in one batch...`);
    await prisma.brand.createMany({ data: missingBrands, skipDuplicates: true });
    const refreshed = await prisma.brand.findMany();
    brandCache = new Map(refreshed.map(b => [b.name.toLowerCase().trim(), b.id]));
  }
  console.log(`✅ All Brands ensured (${brandCache.size} in cache).`);

  // 3. Ensure Combined Transmission "Manuel + Otomatik" exists
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
    transCache.set('manuel + otomatik', combinedTransId);
    transCache.set('manuel - otomatik', combinedTransId);
    console.log(`Created combined transmission: "Manuel + Otomatik" (${combinedTransId})`);
  }

  // 4. Import Motosiklet Models in batches
  console.log(`\nEnsuring ${audit.uniqueMotoIdentities.size} Motorcycle Models in batches...`);
  let existingModels = await prisma.model.findMany();
  let modelCache = new Map<string, string>();
  existingModels.forEach(m => modelCache.set(`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id));

  const missingMotoModels: Array<{ brandId: string; name: string; startYear: number; vehicleType: string; isActive: boolean }> = [];
  const existingMotoModelIdsToUpdate: string[] = [];

  for (const item of audit.uniqueMotoIdentities.values()) {
    const brandId = brandCache.get(item.brand.toLowerCase().trim())!;
    const modelKey = `${brandId}|${item.model.toLowerCase().trim()}`;
    const existingId = modelCache.get(modelKey);
    if (!existingId) {
      missingMotoModels.push({
        brandId,
        name: item.model.trim(),
        startYear: 2000,
        vehicleType: 'MOTORCYCLE',
        isActive: true,
      });
      modelCache.set(modelKey, 'pending');
    } else {
      existingMotoModelIdsToUpdate.push(existingId);
    }
  }

  if (missingMotoModels.length > 0) {
    console.log(`Creating ${missingMotoModels.length} missing Motorcycle Models in chunks...`);
    for (let i = 0; i < missingMotoModels.length; i += 1000) {
      await prisma.model.createMany({
        data: missingMotoModels.slice(i, i + 1000),
        skipDuplicates: true,
      });
    }
  }

  if (existingMotoModelIdsToUpdate.length > 0) {
    console.log(`Updating ${existingMotoModelIdsToUpdate.length} existing Models to vehicleType = 'MOTORCYCLE'...`);
    await prisma.model.updateMany({
      where: { id: { in: existingMotoModelIdsToUpdate } },
      data: { vehicleType: 'MOTORCYCLE', isActive: true },
    });
  }

  // 5. Ensure Minivan Models
  console.log(`\nEnsuring Minivan Models in batches...`);
  existingModels = await prisma.model.findMany();
  modelCache = new Map(existingModels.map(m => [`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id]));

  const missingMinivanModels: Array<{ brandId: string; name: string; startYear: number; vehicleType: string; isActive: boolean }> = [];
  const existingMinivanModelIdsToUpdate: string[] = [];

  for (const item of audit.uniqueMinivanVariants.values()) {
    const brandId = brandCache.get(item.brand.toLowerCase().trim())!;
    const modelKey = `${brandId}|${item.model.toLowerCase().trim()}`;
    const existingId = modelCache.get(modelKey);
    if (!existingId) {
      missingMinivanModels.push({
        brandId,
        name: item.model.trim(),
        startYear: item.year,
        vehicleType: 'MINIVAN_PANELVAN',
        isActive: true,
      });
      modelCache.set(modelKey, 'pending');
    } else {
      if (!existingMinivanModelIdsToUpdate.includes(existingId)) {
        existingMinivanModelIdsToUpdate.push(existingId);
      }
    }
  }

  if (missingMinivanModels.length > 0) {
    console.log(`Creating ${missingMinivanModels.length} missing Minivan Models in batch...`);
    await prisma.model.createMany({
      data: missingMinivanModels,
      skipDuplicates: true,
    });
  }

  if (existingMinivanModelIdsToUpdate.length > 0) {
    console.log(`Updating ${existingMinivanModelIdsToUpdate.length} existing Models to vehicleType = 'MINIVAN_PANELVAN'...`);
    await prisma.model.updateMany({
      where: { id: { in: existingMinivanModelIdsToUpdate } },
      data: { vehicleType: 'MINIVAN_PANELVAN', isActive: true },
    });
  }

  // Reload models cache
  existingModels = await prisma.model.findMany();
  modelCache = new Map(existingModels.map(m => [`${m.brandId}|${m.name.toLowerCase().trim()}`, m.id]));

  // 6. Ensure Generations, Engines, Trims
  console.log(`\nEnsuring Generations, Engines, Trims in batches...`);
  let existingGens = await prisma.generation.findMany();
  let genCache = new Map(existingGens.map(g => [`${g.modelId}|${g.name.toLowerCase().trim()}`, g.id]));

  let existingEngs = await prisma.engine.findMany();
  let engineCache = new Map(existingEngs.map(e => [`${e.code.toLowerCase().trim()}|${e.fuelType}`, e.id]));

  let existingTrims = await prisma.trim.findMany();
  let trimCache = new Map(existingTrims.map(tr => [tr.name.toLowerCase().trim(), tr.id]));

  const missingGens: Array<{ modelId: string; name: string; startYear: number; bodyType: BodyType }> = [];
  const missingEngs: Array<{ code: string; displacement: number; horsepower: number; torque: number; fuelType: FuelType; isElectric: boolean; isHybrid: boolean }> = [];
  const missingTrims: Array<{ name: string }> = [];

  for (const item of audit.uniqueMinivanVariants.values()) {
    const brandId = brandCache.get(item.brand.toLowerCase().trim())!;
    const modelId = modelCache.get(`${brandId}|${item.model.toLowerCase().trim()}`)!;
    const genKey = `${modelId}|minivan & panelvan`;
    if (!genCache.has(genKey)) {
      missingGens.push({
        modelId,
        name: 'Minivan & Panelvan',
        startYear: 2000,
        bodyType: BodyType.MINIVAN,
      });
      genCache.set(genKey, 'pending');
    }

    const fuelTypeEnum = mapTurkishFuel(item.fuel);
    const engKey = `${item.engine.toLowerCase().trim()}|${fuelTypeEnum}`;
    if (!engineCache.has(engKey)) {
      const ccMatch = item.engine.match(/(\d+)[\.,](\d+)/);
      const cc = ccMatch ? Math.round(parseFloat(`${ccMatch[1]}.${ccMatch[2]}`) * 1000) : 1600;
      missingEngs.push({
        code: item.engine.trim(),
        displacement: cc,
        horsepower: 100,
        torque: 200,
        fuelType: fuelTypeEnum,
        isElectric: fuelTypeEnum === FuelType.ELECTRIC,
        isHybrid: fuelTypeEnum === FuelType.HYBRID,
      });
      engineCache.set(engKey, 'pending');
    }

    const trKey = item.package.toLowerCase().trim();
    if (!trimCache.has(trKey)) {
      missingTrims.push({ name: item.package.trim() });
      trimCache.set(trKey, 'pending');
    }
  }

  if (missingGens.length > 0) {
    console.log(`Creating ${missingGens.length} Generations...`);
    await prisma.generation.createMany({ data: missingGens, skipDuplicates: true });
    existingGens = await prisma.generation.findMany();
    genCache = new Map(existingGens.map(g => [`${g.modelId}|${g.name.toLowerCase().trim()}`, g.id]));
  }

  if (missingEngs.length > 0) {
    console.log(`Creating ${missingEngs.length} Engines...`);
    await prisma.engine.createMany({ data: missingEngs, skipDuplicates: true });
    existingEngs = await prisma.engine.findMany();
    engineCache = new Map(existingEngs.map(e => [`${e.code.toLowerCase().trim()}|${e.fuelType}`, e.id]));
  }

  if (missingTrims.length > 0) {
    console.log(`Creating ${missingTrims.length} Trims...`);
    await prisma.trim.createMany({ data: missingTrims, skipDuplicates: true });
    existingTrims = await prisma.trim.findMany();
    trimCache = new Map(existingTrims.map(tr => [tr.name.toLowerCase().trim(), tr.id]));
  }

  console.log(`✅ Models, Generations, Engines, Trims caches ready.`);

  // 7. Upsert Minivan & Panelvan Variants in Chunks
  console.log(`\nImporting ${audit.uniqueMinivanVariants.size} Minivan & Panelvan Variants in chunks...`);
  const variantsToInsert: any[] = [];

  for (const item of audit.uniqueMinivanVariants.values()) {
    const brandId = brandCache.get(item.brand.toLowerCase().trim())!;
    const modelId = modelCache.get(`${brandId}|${item.model.toLowerCase().trim()}`)!;
    const genId = genCache.get(`${modelId}|minivan & panelvan`)!;
    const fuelTypeEnum = mapTurkishFuel(item.fuel);
    const engId = engineCache.get(`${item.engine.toLowerCase().trim()}|${fuelTypeEnum}`)!;
    const trId = trimCache.get(item.package.toLowerCase().trim())!;

    variantsToInsert.push({
      brandId,
      modelId,
      generationId: genId,
      engineId: engId,
      transmissionId: combinedTransId,
      trimId: trId,
      countryId,
      year: item.year,
      vehicleType: 'MINIVAN_PANELVAN',
      bodyType: BodyType.MINIVAN,
      fuelType: fuelTypeEnum,
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

  console.log(`\n✅ Minivan Variants Import Finished (${insertedTotal} variants created).`);

  // 8. Ensure Existing Automobile Models have vehicleType = 'AUTOMOBILE' (if null)
  const nullModels = await prisma.model.updateMany({
    where: { vehicleType: null },
    data: { vehicleType: 'AUTOMOBILE' },
  });
  console.log(`✅ Defaulted ${nullModels.count} existing unclassified models to 'AUTOMOBILE'.`);

}

async function main() {
  const sourcePath = '/Users/efeguven/Desktop/arabam-scraper/output/arabam_part2_minivan_motosiklet.json';
  const isExecute = process.argv.includes('--execute');

  if (isExecute) {
    await executeImport(sourcePath);
  } else {
    await runDryRun(sourcePath);
    console.log(`\n💡 To execute this import live into Neon DB, run:`);
    console.log(`   npx ts-node -r dotenv/config apps/api/scripts/import-arabam-part2.ts --execute\n`);
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
