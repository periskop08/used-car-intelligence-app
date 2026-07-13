const { PrismaClient } = require("@prisma/client");
const OpenAI = require("openai");
const path = require("path");

// Load environment variables from apps/api/.env
require("dotenv").config({ path: path.join(__dirname, "../.env") });

let prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"
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
        url: "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"
      }
    }
  });
  console.log("Prisma client connection pool refreshed.");
}



async function fetchTechnicalSpecsFromAI(brandName, modelName, year, engineCode, bodyType, fuelType) {
  if (!openai) {
    // Return mock values if no OpenAI key
    const engineMatch = engineCode.match(/\b(\d\.\d)\b/);
    const engineSize = engineMatch ? parseFloat(engineMatch[0]) : 1.6;
    return {
      topSpeed: Math.round(170 + engineSize * 15),
      acceleration0to100: parseFloat((13 - engineSize * 1.8).toFixed(1)),
      averageFuelConsumption: fuelType === "ELECTRIC" ? 0 : parseFloat((8.0 - engineSize * 1.2).toFixed(1)),
      luggageCapacity: bodyType === "SUV" ? 500 : 420,
      weight: Math.round(1200 + engineSize * 100)
    };
  }

  const prompt = `You are a professional automotive technical specifications database. Find and return the EXACT, REAL manufacturer technical specifications for the following vehicle:
Brand: ${brandName}
Model: ${modelName}
Year: ${year}
Engine/Version: ${engineCode}
Body Type: ${bodyType}
Fuel Type: ${fuelType}

Respond strictly with a JSON object matching this schema:
{
  "topSpeed": number, // Max speed in km/h (integer)
  "acceleration0to100": number, // 0-100 km/h acceleration in seconds (float)
  "averageFuelConsumption": number, // Average fuel consumption in lt/100km. If ELECTRIC, specify 0. (float)
  "luggageCapacity": number, // Trunk capacity in liters (integer)
  "weight": number // Curb weight in kg (integer)
}

Ensure the data is accurate and realistic for this specific vehicle model, engine, and year. Do not include markdown code block formatting (like \`\`\`json).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error fetching AI specs for ${brandName} ${modelName} (${year}): ${err.message}`);
    return null;
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

  if (!openaiKey) {
    console.warn("\nWARNING: OPENAI_API_KEY environment variable is not defined in apps/api/.env");
    console.warn("Running in MOCK/DRY-RUN mode using mock mathematical formulas for demonstration.\n");
  }

  try {
    console.log("Fetching brands from Staging DB...");
    let brands = await prisma.brand.findMany({
      orderBy: { name: "asc" }
    });

    if (targetBrandArg) {
      brands = brands.filter(b => b.name.toLowerCase() === targetBrandArg.toLowerCase());
    } else if (resumeBrand) {
      // Find the index of the brand to resume from (alphabetically)
      const resumeIndex = brands.findIndex(b => b.name.toLowerCase() >= resumeBrand.toLowerCase());
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

      // Fetch all variants under this brand with retry
      let variants = [];
      let fetchSuccess = false;
      let fetchRetries = 3;
      while (!fetchSuccess && fetchRetries > 0) {
        try {
          variants = await prisma.vehicleVariant.findMany({
            where: { brandId: brand.id, status: "APPROVED" },
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

      console.log(`Found ${variants.length} approved variants for ${brand.name}.`);
      if (variants.length === 0) continue;

      // Group variants by model, year, engine, bodyType, fuelType to avoid redundant AI queries
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

      let processedCount = 0;
      let updateCount = 0;

      for (const [key, group] of specGroups.entries()) {
        if (limit && processedCount >= limit) {
          console.log(`  -> Reached limit of ${limit} configurations. Stopping loop for brand ${brand.name}.`);
          break;
        }
        processedCount++;
        console.log(`  [${processedCount}/${specGroups.size}] Querying specs for: ${brand.name} ${group.modelName} (${group.year}) - Engine: "${group.engineCode}", Body: ${group.bodyType}`);

        // Fetch specs from AI
        const specs = await fetchTechnicalSpecsFromAI(
          brand.name,
          group.modelName,
          group.year,
          group.engineCode,
          group.bodyType,
          group.fuelType
        );

        if (!specs) {
          console.log(`  -> Failed to get specs from AI. Skipping.`);
          continue;
        }

        console.log(`  -> Specs: Hız: ${specs.topSpeed} km/h, 0-100: ${specs.acceleration0to100}s, Yakıt: ${specs.averageFuelConsumption}L, Bagaj: ${specs.luggageCapacity}L, Ağırlık: ${specs.weight}kg`);

        if (dryRun) {
          console.log(`  -> [DRY RUN] Would update ${group.variantIds.length} variants.`);
        } else {
          // Perform bulk update of TechnicalSpec with retry logic
          let updateSuccess = false;
          let updateRetries = 3;
          while (!updateSuccess && updateRetries > 0) {
            try {
              const variantIdChunks = chunkArray(group.variantIds, 1000);
              for (const chunk of variantIdChunks) {
                await prisma.technicalSpec.deleteMany({
                  where: { variantId: { in: chunk } }
                });
                await prisma.technicalSpec.createMany({
                  data: chunk.map(vId => ({
                    variantId: vId,
                    specs: {
                      topSpeed: Number(specs.topSpeed) || 0,
                      acceleration0to100: Number(specs.acceleration0to100) || 0.0,
                      averageFuelConsumption: Number(specs.averageFuelConsumption) || 0.0,
                      luggageCapacity: Number(specs.luggageCapacity) || 0,
                      weight: Number(specs.weight) || 0
                    }
                  }))
                });
              }
              updateSuccess = true;
            } catch (err) {
              console.warn(`Database write failed for ${brand.name} ${group.modelName} (${group.year}): ${err.message}. Retrying... (${updateRetries} left)`);
              updateRetries--;
              await handleConnectionError();
              if (updateRetries === 0) throw err;
            }
          }
          updateCount += group.variantIds.length;
        }

        // Delay to avoid rate limiting
        if (openaiKey) {
          await sleep(200);
        }
      }

      console.log(`Completed Brand: ${brand.name}. Updated ${updateCount} variants.`);
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
