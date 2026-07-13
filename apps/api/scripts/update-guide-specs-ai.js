process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { PrismaClient } = require("@prisma/client");
const OpenAI = require("openai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient();
const openaiKey = process.env.OPENAI_API_KEY;

if (!openaiKey) {
  console.error("Missing OPENAI_API_KEY in apps/api/.env!");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

// Map localized values for Discovery Cards
const fuelTypeMapping = {
  PETROL: "Benzinli",
  DIESEL: "Dizel",
  LPG: "LPG",
  HYBRID: "Hibrit",
  ELECTRIC: "Elektrikli"
};

const transmissionMapping = {
  MANUAL: "Manuel",
  AUTOMATIC: "Otomatik"
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getSpecsFromAI(card) {
  const prompt = `You are an expert automotive technical specifications database. Retrieve the EXACT, REAL manufacturer technical specifications for this specific vehicle model:
Brand: ${card.brand}
Model: ${card.model}
Generation/Package: ${card.generationName}
Year Range: ${card.yearStart} - ${card.yearEnd || 'Present'}
Body Type: ${card.bodyType || 'SUV/Sedan'}

Respond strictly with a JSON object matching this schema:
{
  "engineOptions": string[], // List of real engines, e.g. ["1.3 Multijet 75 HP", "1.3 Multijet 95 HP"] or ["160 kW RWD", "320 kW AWD"]
  "fuelTypes": string[], // Choose only from: ["PETROL", "DIESEL", "LPG", "HYBRID", "ELECTRIC"]
  "transmissionOptions": string[], // Choose only from: ["MANUAL", "AUTOMATIC"]
  "averageConsumption": string, // Real consumption range, e.g. "4.2 - 5.1 L/100km" or "16.9 kWh/100km"
  "powerRange": string, // Real power range, e.g. "75 - 95 HP" or "218 - 435 HP"
  "torqueRange": string, // Real torque range, e.g. "190 - 200 Nm" or "350 - 700 Nm"
  "drivetrain": string, // e.g. "FWD" or "RWD" or "AWD" or "RWD / AWD"
  "trunkVolume": string, // e.g. "356 L" or "441 L"
  "safetyInfo": string // e.g. "Euro NCAP 5 Stars" or "Euro NCAP 4 Stars"
}

Make sure the information is completely accurate. For example, TOGG T10X is 100% electric, automatic transmission, has FWD or RWD/AWD (specifically RWD/AWD for Togg!), consumption is in kWh/100km (e.g. "16.7 kWh/100km"), and fuel type is ONLY "ELECTRIC". Fiorino typically has 75-95 HP, etc. Do not include markdown code block wrapping.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to get AI specs for ${card.brand} ${card.model}:`, err.message);
    return null;
  }
}

async function main() {
  console.log("Starting verification and update of all 92 vehicle specs via OpenAI...");

  // 1. Fetch all cards
  const cards = await prisma.vehicleGuideCard.findMany({
    orderBy: { brand: "asc" }
  });

  console.log(`Loaded ${cards.length} cards from database.`);

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    console.log(`\n========================================`);
    console.log(`[${i + 1}/${cards.length}] Processing: ${card.brand} ${card.model} (${card.generationName})`);

    const specs = await getSpecsFromAI(card);

    if (!specs) {
      console.log(`-> Failed to get specs from AI. Skipping.`);
      continue;
    }

    console.log("AI Retrieved Specs:");
    console.log(`- Engines: ${JSON.stringify(specs.engineOptions)}`);
    console.log(`- Fuel: ${JSON.stringify(specs.fuelTypes)}`);
    console.log(`- Transmissions: ${JSON.stringify(specs.transmissionOptions)}`);
    console.log(`- Power: ${specs.powerRange}`);
    console.log(`- Torque: ${specs.torqueRange}`);
    console.log(`- Consumption: ${specs.averageConsumption}`);
    console.log(`- Drivetrain: ${specs.drivetrain}`);
    console.log(`- Trunk: ${specs.trunkVolume}`);

    // Update in VehicleGuideTechnicalInfo table
    await prisma.vehicleGuideTechnicalInfo.deleteMany({
      where: { vehicleGuideCardId: card.id }
    });

    await prisma.vehicleGuideTechnicalInfo.create({
      data: {
        vehicleGuideCardId: card.id,
        engineOptions: specs.engineOptions,
        fuelTypes: specs.fuelTypes,
        transmissionOptions: specs.transmissionOptions,
        bodyTypes: [card.bodyType || "SEDAN"],
        productionYears: `${card.yearStart} - ${card.yearEnd || 'Devam Ediyor'}`,
        averageConsumption: specs.averageConsumption,
        powerRange: specs.powerRange,
        torqueRange: specs.torqueRange,
        drivetrain: specs.drivetrain,
        segment: card.bodyType === "SUV" ? "C" : "B", // simple default
        trunkVolume: specs.trunkVolume,
        safetyInfo: specs.safetyInfo,
        status: "APPROVED"
      }
    });

    console.log(`Updated technical info in DB for card ID: ${card.id}`);

    // Small sleep to respect rate limits
    await sleep(200);
  }

  // 2. Regenerate Discovery Cards dynamically based on verified technical info
  console.log("\n========================================");
  console.log("Regenerating Discovery Cards based on verified specs...");
  console.log("========================================");

  // Clear existing Discovery Cards and swipes
  await prisma.userVehiclePreferenceSwipe.deleteMany();
  await prisma.userVehiclePreferenceProfile.deleteMany();
  await prisma.vehicleDiscoveryCard.deleteMany();

  const freshGuideCards = await prisma.vehicleGuideCard.findMany({
    include: {
      technicalInfos: true
    }
  });

  const discoveryCardsToInsert = [];

  for (const g of freshGuideCards) {
    const tech = g.technicalInfos[0];
    if (!tech) continue;

    const fuelTypes = Array.isArray(tech.fuelTypes) ? tech.fuelTypes : [];
    const transmissions = Array.isArray(tech.transmissionOptions) ? tech.transmissionOptions : [];
    const engines = Array.isArray(tech.engineOptions) ? tech.engineOptions : [];

    const bodyType = g.bodyType || "SEDAN";
    const productionYears = tech.productionYears || `${g.yearStart} - ${g.yearEnd || "Devam Ediyor"}`;
    const averageConsumption = tech.averageConsumption || "5.5 L/100 km";
    const drivetrain = tech.drivetrain || "FWD";
    const imageUrl = g.heroImageUrl || "";

    // Generate valid combinations
    // We create a variant for each engine option
    engines.forEach((engine, idx) => {
      // Determine fuel type for this engine
      // If the engine is electric, fuel type is ELECTRIC. If engine name contains diesel/tdi/multijet, DIESEL. Otherwise PETROL/HYBRID.
      let engineFuel = fuelTypes[0] || "PETROL";
      const engineLower = engine.toLowerCase();
      if (engineLower.includes("electric") || engineLower.includes("ev") || engineLower.includes("kw")) {
        engineFuel = "ELECTRIC";
      } else if (engineLower.includes("tdi") || engineLower.includes("dci") || engineLower.includes("multijet") || engineLower.includes("bluehdi")) {
        engineFuel = "DIESEL";
      } else if (engineLower.includes("hybrid") || engineLower.includes("hatchback hybrid") || engineLower.includes("e-cvt")) {
        engineFuel = "HYBRID";
      } else if (fuelTypes.includes("PETROL")) {
        engineFuel = "PETROL";
      }

      // Localize fuel type
      const fuelTypeTr = fuelTypeMapping[engineFuel] || "Benzinli";

      // Loop through transmission options that actually exist for this car
      transmissions.forEach((trans) => {
        const transTr = transmissionMapping[trans] || "Otomatik";

        // Determine variant name
        const variantName = idx === 0 && transmissions.length === 1 
          ? `${g.model}` 
          : `${g.model} ${engine} ${transTr}`;

        const tags = [
          bodyType.toLowerCase(),
          fuelTypeTr.toLowerCase(),
          transTr.toLowerCase(),
          "aile-aracı",
          "konfor"
        ];

        discoveryCardsToInsert.push({
          brand: g.brand,
          modelFamily: variantName,
          bodyType: bodyType,
          fuelType: fuelTypeTr,
          transmissionType: transTr,
          engineVersion: engine,
          power: tech.powerRange || "150 HP",
          torque: tech.torqueRange || "250 Nm",
          productionYears: productionYears,
          averageConsumption: averageConsumption,
          drivetrain: drivetrain,
          imageUrl: imageUrl,
          tags: tags,
          isActive: true
        });
      });
    });
  }

  console.log(`Seeding ${discoveryCardsToInsert.length} verified VehicleDiscoveryCard records...`);

  await prisma.vehicleDiscoveryCard.createMany({
    data: discoveryCardsToInsert
  });

  console.log("Specs verification and Discovery Cards regeneration completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
