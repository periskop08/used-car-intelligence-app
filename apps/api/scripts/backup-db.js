const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting streamed JSON database backup...");
  
  const meta = {};
  
  console.log("Fetching Brands...");
  meta.brands = await prisma.brand.findMany();
  
  console.log("Fetching Models...");
  meta.models = await prisma.model.findMany();
  
  console.log("Fetching Generations...");
  meta.generations = await prisma.generation.findMany();
  
  console.log("Fetching Engines...");
  meta.engines = await prisma.engine.findMany();
  
  console.log("Fetching Transmissions...");
  meta.transmissions = await prisma.transmission.findMany();
  
  console.log("Fetching Trims...");
  meta.trims = await prisma.trim.findMany();

  console.log("Fetching VehicleGuideCards...");
  meta.guideCards = await prisma.vehicleGuideCard.findMany();

  const metaPath = path.join(__dirname, "../db-backup-meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  console.log(`Metadata backup saved to: ${metaPath}`);

  console.log("Streaming VehicleVariants to NDJSON file...");
  const variantsPath = path.join(__dirname, "../db-backup-variants.ndjson");
  const writeStream = fs.createWriteStream(variantsPath, { flags: 'w', encoding: 'utf8' });

  const CHUNK_SIZE = 50000;
  let skip = 0;
  let hasMore = true;
  let totalVariants = 0;
  
  while (hasMore) {
    console.log(`-> Fetching variants chunk: skip ${skip}, take ${CHUNK_SIZE}...`);
    const chunk = await prisma.vehicleVariant.findMany({
      skip: skip,
      take: CHUNK_SIZE
    });
    
    if (chunk.length === 0) {
      hasMore = false;
    } else {
      chunk.forEach(variant => {
        writeStream.write(JSON.stringify(variant) + "\n");
      });
      skip += chunk.length;
      totalVariants += chunk.length;
      console.log(`   Successfully streamed ${chunk.length} variants. Accumulated: ${totalVariants}`);
    }
  }

  writeStream.end();
  console.log(`Variants backup completed successfully! Saved to: ${variantsPath}`);
  console.log(`Summary of saved records:`);
  console.log(`- Metadata: ${Object.keys(meta).reduce((acc, key) => acc + meta[key].length, 0)} records`);
  console.log(`- Variants: ${totalVariants} records`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
