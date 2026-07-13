process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting vehicle variant bodyType data quality inspection...\n");

  const totalCount = await prisma.vehicleVariant.count();
  console.log(`Total variants in database: ${totalCount}`);

  // Fetch all brands and models once
  console.log("Loading brand and model name mappings...");
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });
  const models = await prisma.model.findMany({ select: { id: true, name: true } });

  const brandMap: Record<string, string> = {};
  brands.forEach(b => { brandMap[b.id] = b.name; });

  const modelMap: Record<string, string> = {};
  models.forEach(m => { modelMap[m.id] = m.name; });

  console.log(`Loaded ${brands.length} brands and ${models.length} model definitions.`);

  // Fetch flat fields in chunks of 50,000 (extremely fast)
  const CHUNK_SIZE = 50000;
  const variants: any[] = [];
  
  for (let skip = 0; skip < totalCount; skip += CHUNK_SIZE) {
    console.log(`Fetching variants skip ${skip}, take ${CHUNK_SIZE}...`);
    const chunk = await prisma.vehicleVariant.findMany({
      skip,
      take: CHUNK_SIZE,
      select: {
        id: true,
        brandId: true,
        modelId: true,
        year: true,
        bodyType: true,
      },
    });
    variants.push(...chunk);
  }

  console.log(`\nSuccessfully loaded ${variants.length} flat records. Starting analysis...\n`);

  const unnormalizedRecords: any[] = [];
  const modelYearsMap: Record<string, Set<number>> = {};
  const modelBodyTypesMap: Record<string, Record<string, Set<number>>> = {};

  for (const v of variants) {
    const brandName = brandMap[v.brandId] || "Unknown Brand";
    const modelName = modelMap[v.modelId] || "Unknown Model";
    const key = `${brandName} ${modelName}`;
    
    // Track years for this model family
    if (!modelYearsMap[key]) {
      modelYearsMap[key] = new Set();
    }
    modelYearsMap[key].add(v.year);

    // Track bodyType availability per year
    if (!modelBodyTypesMap[key]) {
      modelBodyTypesMap[key] = {};
    }
    
    const bodyStr = v.bodyType ? v.bodyType.toString() : "NULL";
    
    if (!modelBodyTypesMap[key][bodyStr]) {
      modelBodyTypesMap[key][bodyStr] = new Set();
    }
    modelBodyTypesMap[key][bodyStr].add(v.year);

    // 1. Check for Null or OTHER values
    if (!v.bodyType || v.bodyType === "OTHER") {
      unnormalizedRecords.push({
        id: v.id,
        vehicle: `${brandName} ${modelName} (${v.year})`,
        issue: !v.bodyType ? "NULL bodyType" : "OTHER bodyType",
        suggestion: "Needs manual classification"
      });
    }
  }

  // 2. Check for "Body Type Gaps" (e.g. present in Y-1 and Y+1 but not in Y)
  console.log("--- Checking for Body Type Gaps (Missing Years) ---");
  let gapsCount = 0;
  for (const [model, bodyMap] of Object.entries(modelBodyTypesMap)) {
    for (const [bodyType, yearsSet] of Object.entries(bodyMap)) {
      if (bodyType === "NULL" || bodyType === "OTHER") continue;
      
      const years = Array.from(yearsSet).sort((a, b) => a - b);
      if (years.length < 2) continue;

      const minYear = years[0];
      const maxYear = years[years.length - 1];

      for (let y = minYear + 1; y < maxYear; y++) {
        if (modelYearsMap[model].has(y) && !yearsSet.has(y)) {
          console.warn(`⚠️ [GAP DETECTED] Model: ${model} | Kasa: ${bodyType} | Eksik Yıl: ${y} (Bu kasa ${minYear} ve ${maxYear} yıllarında mevcut fakat ${y} yılında eksik!)`);
          gapsCount++;
        }
      }
    }
  }

  console.log(`\nFound ${gapsCount} body type gaps across all model families.\n`);

  // 3. Print null/OTHER summary
  console.log("--- Checking for Null / Unclassified Kasa Tipleri ---");
  if (unnormalizedRecords.length === 0) {
    console.log("✔ No null or OTHER bodyTypes found!");
  } else {
    console.warn(`⚠️ Found ${unnormalizedRecords.length} records with NULL or OTHER bodyType:`);
    unnormalizedRecords.slice(0, 10).forEach(r => {
      console.log(`  - [${r.issue}] ${r.vehicle} | Suggestion: ${r.suggestion}`);
    });
    if (unnormalizedRecords.length > 10) {
      console.log(`  ... and ${unnormalizedRecords.length - 10} more records.`);
    }
  }

  console.log("\nInspection completed successfully!");
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
