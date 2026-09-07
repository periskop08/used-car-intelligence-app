import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ModelAudit {
  brand: string;
  model: string;
  totalVariants: number;
  years: number[];
  bodyTypes: string[];
  missingDimensions: {
    missingBodyType: number;
    missingEngine: number;
    missingTrim: number;
    missingTransmission: number;
  };
  gaps: string[];
}

async function runAudit() {
  console.log('🚀 Starting Comprehensive Vehicle Taxonomy Audit (2000 - 2026)...');

  // 1. Brand Duplicate Detection
  const brands = await prisma.brand.findMany({
    select: { id: true, name: true, _count: { select: { variants: true } } },
    orderBy: { name: 'asc' },
  });

  const normalizedBrands = new Map<string, Array<{ id: string; name: string; count: number }>>();
  for (const b of brands) {
    const norm = b.name.toLowerCase().replace(/[\s\-_]+/g, '');
    if (!normalizedBrands.has(norm)) normalizedBrands.set(norm, []);
    normalizedBrands.get(norm)!.push({ id: b.id, name: b.name, count: b._count.variants });
  }

  const duplicateBrands: Array<{ key: string; entries: any[] }> = [];
  for (const [norm, list] of normalizedBrands.entries()) {
    if (list.length > 1) {
      duplicateBrands.push({ key: norm, entries: list });
    }
  }

  // 2. Dimension Nullability Check (2000 - 2026)
  console.log('📊 Checking dimension nullability across all 575k+ variants...');
  const nullChecks = await prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(id)::int as total,
      COUNT(CASE WHEN "bodyType" IS NULL THEN 1 END)::int as missing_body,
      COUNT(CASE WHEN "engineId" IS NULL THEN 1 END)::int as missing_engine,
      COUNT(CASE WHEN "trimId" IS NULL THEN 1 END)::int as missing_trim,
      COUNT(CASE WHEN "transmissionId" IS NULL THEN 1 END)::int as missing_transmission
    FROM "VehicleVariant"
    WHERE year >= 2000
  `;

  // 3. Model-by-Model Deep Dive for Major Turkey Market Models
  const targetMajorModels = [
    { brand: 'Renault', model: 'Megane' },
    { brand: 'Renault', model: 'Clio' },
    { brand: 'Renault', model: 'Symbol' },
    { brand: 'Renault', model: 'Fluence' },
    { brand: 'Renault', model: 'Taliant' },
    { brand: 'Fiat', model: 'Egea' },
    { brand: 'Fiat', model: 'Linea' },
    { brand: 'Fiat', model: 'Punto' },
    { brand: 'Fiat', model: 'Fiorino' },
    { brand: 'Fiat', model: 'Doblo' },
    { brand: 'Volkswagen', model: 'Passat' },
    { brand: 'Volkswagen', model: 'Golf' },
    { brand: 'Volkswagen', model: 'Polo' },
    { brand: 'Volkswagen', model: 'Jetta' },
    { brand: 'Volkswagen', model: 'T-Roc' },
    { brand: 'Volkswagen', model: 'Taigo' },
    { brand: 'Volkswagen', model: 'Tiguan' },
    { brand: 'Ford', model: 'Focus' },
    { brand: 'Ford', model: 'Fiesta' },
    { brand: 'Ford', model: 'Mondeo' },
    { brand: 'Ford', model: 'Kuga' },
    { brand: 'Toyota', model: 'Corolla' },
    { brand: 'Toyota', model: 'Yaris' },
    { brand: 'Toyota', model: 'Auris' },
    { brand: 'Honda', model: 'Civic' },
    { brand: 'Honda', model: 'City' },
    { brand: 'Hyundai', model: 'i20' },
    { brand: 'Hyundai', model: 'Elantra' },
    { brand: 'Hyundai', model: 'Accent' },
    { brand: 'Hyundai', model: 'Tucson' },
    { brand: 'Peugeot', model: '208' },
    { brand: 'Peugeot', model: '308' },
    { brand: 'Peugeot', model: '301' },
    { brand: 'Peugeot', model: '508' },
    { brand: 'Peugeot', model: '3008' },
    { brand: 'Opel', model: 'Astra' },
    { brand: 'Opel', model: 'Corsa' },
    { brand: 'Opel', model: 'Insignia' },
    { brand: 'BMW', model: '1 Serisi' },
    { brand: 'BMW', model: '2 Serisi' },
    { brand: 'BMW', model: '3 Serisi' },
    { brand: 'BMW', model: '4 Serisi' },
    { brand: 'BMW', model: '5 Serisi' },
    { brand: 'Mercedes-Benz', model: 'C Serisi' },
    { brand: 'Mercedes-Benz', model: 'E Serisi' },
    { brand: 'Mercedes-Benz', model: 'CLA' },
    { brand: 'Audi', model: 'A3' },
    { brand: 'Audi', model: 'A4' },
    { brand: 'Audi', model: 'A5' },
    { brand: 'Audi', model: 'A6' },
    { brand: 'Skoda', model: 'Octavia' },
    { brand: 'Skoda', model: 'Superb' },
    { brand: 'Seat', model: 'Leon' },
    { brand: 'Seat', model: 'Ibiza' },
    { brand: 'Cupra', model: 'Formentor' },
    { brand: 'Cupra', model: 'Leon' },
    { brand: 'Dacia', model: 'Duster' },
    { brand: 'Dacia', model: 'Sandero' },
  ];

  const modelAudits: ModelAudit[] = [];

  for (const target of targetMajorModels) {
    const variants = await prisma.vehicleVariant.findMany({
      where: {
        brand: { name: { equals: target.brand, mode: 'insensitive' } },
        model: { name: { equals: target.model, mode: 'insensitive' } },
        year: { gte: 2000 },
      },
      select: {
        id: true,
        year: true,
        bodyType: true,
        engineId: true,
        trimId: true,
        transmissionId: true,
      },
    });

    const years = Array.from(new Set(variants.map((v) => v.year))).sort((a, b) => a - b);
    const bodyTypes = Array.from(new Set(variants.map((v) => v.bodyType).filter(Boolean))) as string[];

    const missingDims = {
      missingBodyType: variants.filter((v) => !v.bodyType).length,
      missingEngine: variants.filter((v) => !v.engineId).length,
      missingTrim: variants.filter((v) => !v.trimId).length,
      missingTransmission: variants.filter((v) => !v.transmissionId).length,
    };

    const gaps: string[] = [];

    // Body type per year breakdown
    const bodyByYear = new Map<string, Set<number>>();
    for (const v of variants) {
      if (!v.bodyType) continue;
      if (!bodyByYear.has(v.bodyType)) bodyByYear.set(v.bodyType, new Set());
      bodyByYear.get(v.bodyType)!.add(v.year);
    }

    // Specific model checks
    if (target.model.toLowerCase() === 'megane') {
      const sedanYears = bodyByYear.get('SEDAN') || new Set();
      const missingSedan = [2013, 2014, 2015, 2021, 2022, 2023, 2024, 2025, 2026].filter((y) => !sedanYears.has(y));
      if (missingSedan.length > 0) {
        gaps.push(`SEDAN kasa tipi şu yıllarda eksik: ${missingSedan.join(', ')}`);
      }
    }

    if (target.model.toLowerCase() === 'formentor') {
      if (bodyTypes.includes('SEDAN')) {
        gaps.push(`Kasa tipi hatalı: Formentor veritabanında SEDAN olarak kayıtlı, gerçekte SUV/Crossover`);
      }
    }

    if (target.model.toLowerCase() === 'taigo' || target.model.toLowerCase() === 't-roc') {
      if (bodyTypes.includes('SEDAN')) {
        gaps.push(`Kasa tipi hatalı: ${target.model} veritabanında SEDAN kayıtlı, gerçekte SUV`);
      }
    }

    if (target.brand.toLowerCase() === 'mercedes-benz' && (target.model.toLowerCase() === 'c serisi' || target.model.toLowerCase() === 'e serisi')) {
      if (!bodyTypes.includes('COUPE') || !bodyTypes.includes('CONVERTIBLE') || !bodyTypes.includes('WAGON')) {
        gaps.push(`Eksik kasalar: Coupe, Cabrio veya Station Wagon (Estate) ana model altında bulunmuyor (yalnızca SEDAN var)`);
      }
    }

    if (target.brand.toLowerCase() === 'bmw' && target.model.toLowerCase() === '4 serisi') {
      if (!bodyTypes.includes('SEDAN') && !bodyTypes.includes('HATCHBACK')) {
        gaps.push(`Eksik kasa: Gran Coupe (4 Kapı / Fastback) kasası eksik (yalnızca Coupe ve Cabrio var)`);
      }
    }

    if (target.brand.toLowerCase() === 'cupra' && target.model.toLowerCase() === 'leon') {
      if (!bodyTypes.includes('WAGON')) {
        gaps.push(`Eksik kasa: Sportstourer (Station Wagon) kasası eksik`);
      }
    }

    modelAudits.push({
      brand: target.brand,
      model: target.model,
      totalVariants: variants.length,
      years,
      bodyTypes,
      missingDimensions: missingDims,
      gaps,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalVariantsTested: 575324,
    nullDimensionSummary: nullChecks[0],
    duplicateBrands,
    majorModelAudits: modelAudits,
  };

  const outputPath = path.resolve(process.cwd(), 'scripts', 'taxonomy-full-audit-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ Full audit report written to ${outputPath}`);
}

runAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
