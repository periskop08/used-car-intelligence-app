const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting fuel type correction script...");

  const reportJsonPath = path.join(__dirname, "../vehicle-verification-report.json");
  if (!fs.existsSync(reportJsonPath)) {
    console.error(`Error: Verification report not found at ${reportJsonPath}. Run verify-vehicle-data.js first.`);
    process.exit(1);
  }

  console.log("Reading verification report...");
  const mismatches = JSON.parse(fs.readFileSync(reportJsonPath, "utf-8"));
  console.log(`Found ${mismatches.length} mismatches to correct.`);

  if (mismatches.length === 0) {
    console.log("No mismatches found. Database is already clean!");
    return;
  }

  // Group variant IDs by expected fuel type
  const groups = {};
  mismatches.forEach(m => {
    if (!groups[m.expectedFuel]) {
      groups[m.expectedFuel] = [];
    }
    groups[m.expectedFuel].push(m.id);
  });

  console.log("Grouped mismatches by expected fuel type:");
  Object.keys(groups).forEach(fuel => {
    console.log(`- ${fuel}: ${groups[fuel].length} variants`);
  });

  const CHUNK_SIZE = 5000;

  for (const fuel of Object.keys(groups)) {
    const ids = groups[fuel];
    console.log(`\nProcessing updates for fuel type: ${fuel} (${ids.length} records)...`);
    
    let processed = 0;
    while (processed < ids.length) {
      const chunk = ids.slice(processed, processed + CHUNK_SIZE);
      
      console.log(`-> Updating batch: ${processed + 1} to ${processed + chunk.length} of ${ids.length}...`);
      
      const result = await prisma.vehicleVariant.updateMany({
        where: {
          id: {
            in: chunk
          }
        },
        data: {
          fuelType: fuel
        }
      });
      
      processed += chunk.length;
      console.log(`   Successfully updated ${result.count} records.`);
    }
  }

  console.log("\nDatabase correction completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
