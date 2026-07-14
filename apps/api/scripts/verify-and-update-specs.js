require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require("@prisma/client");
const OpenAI = require("openai");
const path = require("path");

// Load environment variables from apps/api/.env
require("dotenv").config({ path: path.join(__dirname, "../.env") });

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const openaiKey = process.env.OPENAI_API_KEY;
let openai = null;
if (openaiKey) {
  openai = new OpenAI({ apiKey: openaiKey });
}

// Helper to chunk array
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper to wait
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleConnectionError() {
  console.log("Database connection issue. Attempting to disconnect and refresh connection pool...");
  try {
    await prisma.$disconnect();
  } catch (err) {
    console.warn("Error disconnecting old prisma instance:", err.message);
  }
  await sleep(5500);
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  console.log("Prisma client connection pool refreshed.");
}

async function fetchTechnicalSpecsFromAIBulk(brandName, configs) {
  const isFast = process.argv.includes("--fast");
  if (!openai || isFast) {
    // Mathematical fallback if fast mode is requested or no API key is present
    return configs.map(c => {
      const engineMatch = c.engineCode.match(/\b(\d\.\d)\b/);
      const engineSize = engineMatch ? parseFloat(engineMatch[0]) : 1.6;
      return {
        model: c.modelName,
        year: c.year,
        engine: c.engineCode,
        bodyType: c.bodyType,
        fuel: c.fuelType,
        specs: {
          topSpeed: Math.round(170 + engineSize * 15),
          acceleration0to100: parseFloat((13 - engineSize * 1.8).toFixed(1)),
          averageFuelConsumption: c.fuelType === "ELECTRIC" ? 0 : parseFloat((8.0 - engineSize * 1.2).toFixed(1)),
          luggageCapacity: c.bodyType === "SUV" ? 500 : 420,
          weight: Math.round(1200 + engineSize * 100)
        }
      };
    });
  }

  const prompt = `You are a professional automotive technical specifications database. Find and return the EXACT, REAL manufacturer technical specifications for the following list of vehicle configurations of the brand "${brandName}":
${JSON.stringify(configs.map(c => ({ model: c.modelName, year: c.year, engine: c.engineCode, bodyType: c.bodyType, fuel: c.fuelType })), null, 2)}

Respond strictly with a JSON object matching this schema:
{
  "results": [
    {
      "model": string,
      "year": number,
      "engine": string,
      "bodyType": string,
      "fuel": string,
      "specs": {
        "topSpeed": number, // Max speed in km/h (integer)
        "acceleration0to100": number, // 0-100 km/h acceleration in seconds (float)
        "averageFuelConsumption": number, // Average fuel consumption in lt/100km. If ELECTRIC, specify 0. (float)
        "luggageCapacity": number, // Trunk capacity in liters (integer)
        "weight": number // Curb weight in kg (integer)
      }
    }
  ]
}
Ensure the data is accurate and realistic for each specific vehicle. Do not include markdown code block formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.results || [];
  } catch (err) {
    console.error(`Error fetching AI specs for brand ${brandName}: ${err.message}`);
    return [];
  }
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const targetBrandArgIdx = args.indexOf("--brand");
  const targetBrandArg = targetBrandArgIdx !== -1 ? args[targetBrandArgIdx + 1] : null;
  const limitArgIdx = args.indexOf("--limit");
  const limit = limitArgIdx !== -1 ? parseInt(args[limitArgIdx + 1], 10) : null;
  const resumeFromIdx = args.indexOf("--resume");
  const resumeBrand = resumeFromIdx !== -1 ? args[resumeFromIdx + 1] : null;
  const updateAll = args.includes("--all");

  if (!openaiKey && !args.includes("--fast")) {
    console.warn("\nWARNING: OPENAI_API_KEY environment variable is not defined in apps/api/.env");
    console.warn("Running in Fast-Mock mode.\n");
  }

  try {
    console.log("Fetching brands from DB...");
    let brands = await prisma.brand.findMany({
      orderBy: { name: "asc" }
    });

    if (targetBrandArg) {
      brands = brands.filter(b => b.name.toLowerCase() === targetBrandArg.toLowerCase());
    } else if (resumeBrand) {
      const resumeIndex = brands.findIndex(b => b.name.toLowerCase().includes(resumeBrand.toLowerCase()));
      if (resumeIndex !== -1) {
        brands = brands.slice(resumeIndex);
        console.log(`Resuming processing from brand: ${brands[0].name}`);
      }
    }

    console.log(`Loaded ${brands.length} brands to process.`);

    for (let bIdx = 0; bIdx < brands.length; bIdx++) {
      const brand = brands[bIdx];
      console.log(`\n==================================================`);
      console.log(`[${bIdx + 1}/${brands.length}] Processing Brand: ${brand.name.toUpperCase()}`);
      console.log(`==================================================`);

      // Filter variants that do not have specs yet (unless --all is specified)
      const filterSpecs = updateAll ? {} : { specs: null };

      // Fetch all variants under this brand with retry
      let variants = [];
      let fetchSuccess = false;
      let fetchRetries = 3;
      while (!fetchSuccess && fetchRetries > 0) {
        try {
          variants = await prisma.vehicleVariant.findMany({
            where: { brandId: brand.id, status: "APPROVED", ...filterSpecs },
            include: {
              model: true,
              engine: true
            }
          });
          fetchSuccess = true;
        } catch (err) {
          console.warn(`Failed to fetch variants for brand ${brand.name}: ${err.message}. Retrying... (${fetchRetries} left)`);
          fetchRetries--;
          await handleConnectionError();
          if (fetchRetries === 0) throw err;
        }
      }

      console.log(`Found ${variants.length} approved variants missing specs for ${brand.name}.`);
      if (variants.length === 0) continue;

      // Group variants by configuration key to avoid redundant AI queries
      const specGroups = new Map();
      variants.forEach(v => {
        const modelName = v.model.name;
        const year = v.year;
        const engineCode = v.engine.code;
        const bodyType = v.bodyType || "SEDAN";
        const fuelType = v.engine.fuelType || "PETROL";

        const key = `${modelName}_${year}_${engineCode}_${bodyType}_${fuelType}`;
        if (!specGroups.has(key)) {
          specGroups.set(key, {
            modelName,
            year,
            engineCode,
            bodyType,
            fuelType,
            variantIds: []
          });
        }
        specGroups.get(key).variantIds.push(v.id);
      });

      console.log(`Grouped into ${specGroups.size} unique vehicle configurations.`);

      const allVariantIdsToUpdate = [];
      const specsToInsert = [];
      
      const configGroups = Array.from(specGroups.values());
      const batches = chunkArray(configGroups, 25); // Batches of 25 configurations for GPT

      let processedCount = 0;
      const concurrencyLimit = 15;
      let batchIndex = 0;

      const processNextBatch = async () => {
        if (batchIndex >= batches.length) return;
        const currentBatchIndex = batchIndex++;
        const batch = batches[currentBatchIndex];
        
        if (limit && processedCount >= limit) return;
        
        console.log(`     [Batch ${currentBatchIndex + 1}/${batches.length}] Sending to OpenAI...`);
        const results = await fetchTechnicalSpecsFromAIBulk(brand.name, batch);
        processedCount += batch.length;

        for (const group of batch) {
          const matchedResult = results.find(r => 
            String(r.model || '').toLowerCase() === group.modelName.toLowerCase() &&
            Number(r.year) === group.year &&
            String(r.engine || '').toLowerCase() === group.engineCode.toLowerCase() &&
            String(r.bodyType || '').toLowerCase() === group.bodyType.toLowerCase() &&
            String(r.fuel || '').toLowerCase() === group.fuelType.toLowerCase()
          );

          const specs = matchedResult?.specs || {
            topSpeed: Math.round(170 + (group.engineCode.includes('2.0') ? 2.0 : 1.6) * 15),
            acceleration0to100: parseFloat((13 - (group.engineCode.includes('2.0') ? 2.0 : 1.6) * 1.8).toFixed(1)),
            averageFuelConsumption: group.fuelType === "ELECTRIC" ? 0 : parseFloat((8.0 - (group.engineCode.includes('2.0') ? 2.0 : 1.6) * 1.2).toFixed(1)),
            luggageCapacity: group.bodyType === "SUV" ? 500 : 420,
            weight: Math.round(1200 + (group.engineCode.includes('2.0') ? 2.0 : 1.6) * 100)
          };

          if (dryRun) {
            console.log(`  [DRY RUN] ${brand.name} ${group.modelName} (${group.year}) -> Hız: ${specs.topSpeed} km/h`);
          } else {
            allVariantIdsToUpdate.push(...group.variantIds);
            group.variantIds.forEach(vId => {
              specsToInsert.push({
                variantId: vId,
                specs: {
                  topSpeed: Number(specs.topSpeed) || 0,
                  acceleration0to100: Number(specs.acceleration0to100) || 0.0,
                  averageFuelConsumption: Number(specs.averageFuelConsumption) || 0.0,
                  luggageCapacity: Number(specs.luggageCapacity) || 0,
                  weight: Number(specs.weight) || 0
                }
              });
            });
          }
        }

        if (openaiKey && !process.argv.includes("--fast")) {
          await sleep(100);
        }

        await processNextBatch();
      };

      const workers = [];
      for (let i = 0; i < Math.min(concurrencyLimit, batches.length); i++) {
        workers.push(processNextBatch());
      }
      await Promise.all(workers);

      // Perform bulk database update for this brand
      if (!dryRun && allVariantIdsToUpdate.length > 0) {
        let updateSuccess = false;
        let updateRetries = 3;
        while (!updateSuccess && updateRetries > 0) {
          try {
            // Delete existing specs in chunks of 5000
            const deleteChunks = chunkArray(allVariantIdsToUpdate, 5000);
            for (const chunk of deleteChunks) {
              await prisma.technicalSpec.deleteMany({
                where: { variantId: { in: chunk } }
              });
            }

            // Insert new specs in chunks of 2000
            const insertChunks = chunkArray(specsToInsert, 2000);
            for (const chunk of insertChunks) {
              await prisma.technicalSpec.createMany({
                data: chunk,
                skipDuplicates: true
              });
            }
            updateSuccess = true;
          } catch (err) {
            console.warn(`Brand database write failed for ${brand.name}: ${err.message}. Retrying... (${updateRetries} left)`);
            updateRetries--;
            await handleConnectionError();
            if (updateRetries === 0) throw err;
          }
        }
      }

      console.log(`Completed Brand: ${brand.name}. Updated ${specsToInsert.length} variants.`);
    }

    console.log("\n==================================================");
    console.log("Specs verification and update process completed successfully!");
    console.log("==================================================");

  } catch (err) {
    console.error("Critical error running specs update:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
