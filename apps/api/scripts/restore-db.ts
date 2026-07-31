import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const metaPath = path.join(__dirname, '../db-backup-meta.json');
  const variantsPath = path.join(__dirname, '../db-backup-variants.ndjson');

  if (!fs.existsSync(metaPath) || !fs.existsSync(variantsPath)) {
    console.error("❌ Error: Backup files not found in apps/api/ directory.");
    process.exit(1);
  }

  console.log("🔄 Starting full database restore from July 10 backup...");

  // 1. Clean existing records in catalog tables
  console.log("🧹 Deleting current catalog records...");
  
  console.log("   - Deleting VehicleVariants...");
  await prisma.vehicleVariant.deleteMany();
  
  console.log("   - Deleting VehicleGuideCards...");
  await prisma.vehicleGuideCard.deleteMany();
  
  console.log("   - Deleting Trims...");
  await prisma.trimTranslation.deleteMany();
  await prisma.trim.deleteMany();
  
  console.log("   - Deleting Transmissions...");
  await prisma.transmission.deleteMany();
  
  console.log("   - Deleting Engines...");
  await prisma.engine.deleteMany();
  
  console.log("   - Deleting Generations...");
  await prisma.generationTranslation.deleteMany();
  await prisma.generation.deleteMany();
  
  console.log("   - Deleting Models...");
  await prisma.modelTranslation.deleteMany();
  await prisma.model.deleteMany();
  
  console.log("   - Deleting Brands...");
  await prisma.brandTranslation.deleteMany();
  await prisma.brand.deleteMany();

  console.log("✅ Deletion completed successfully.");

  // 2. Restore Metadata
  console.log("📥 Restoring metadata records...");
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  console.log(`   - Inserting ${meta.brands.length} Brands...`);
  await prisma.brand.createMany({ data: meta.brands });

  console.log(`   - Inserting ${meta.models.length} Models...`);
  await prisma.model.createMany({ data: meta.models });

  console.log(`   - Inserting ${meta.generations.length} Generations...`);
  await prisma.generation.createMany({ data: meta.generations });

  console.log(`   - Inserting ${meta.engines.length} Engines...`);
  await prisma.engine.createMany({ data: meta.engines });

  console.log(`   - Inserting ${meta.transmissions.length} Transmissions...`);
  await prisma.transmission.createMany({ data: meta.transmissions });

  console.log(`   - Inserting ${meta.trims.length} Trims...`);
  await prisma.trim.createMany({ data: meta.trims });

  console.log("✅ Metadata restoration completed.");

  // 3. Restore VehicleVariants (chunked streaming)
  console.log("📥 Streaming and inserting VehicleVariants...");
  const fileStream = fs.createReadStream(variantsPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const BATCH_SIZE = 5000;
  let batch: any[] = [];
  let totalInserted = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    
    const variant = JSON.parse(line);
    
    // Ensure dates are parsed correctly
    variant.createdAt = new Date(variant.createdAt);
    variant.updatedAt = new Date(variant.updatedAt);
    
    batch.push(variant);

    if (batch.length >= BATCH_SIZE) {
      await prisma.vehicleVariant.createMany({ data: batch, skipDuplicates: true });
      totalInserted += batch.length;
      console.log(`   Processed and inserted ${batch.length} variants. Cumulative: ${totalInserted}`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    await prisma.vehicleVariant.createMany({ data: batch, skipDuplicates: true });
    totalInserted += batch.length;
    console.log(`   Processed and inserted final batch of ${batch.length} variants. Cumulative: ${totalInserted}`);
  }

  // 4. Restore VehicleGuideCards
  if (meta.guideCards && meta.guideCards.length > 0) {
    console.log(`   - Inserting ${meta.guideCards.length} VehicleGuideCards...`);
    // Parse dates
    meta.guideCards.forEach((c: any) => {
      c.createdAt = new Date(c.createdAt);
      c.updatedAt = new Date(c.updatedAt);
    });
    await prisma.vehicleGuideCard.createMany({ data: meta.guideCards });
  }

  console.log("✅ Full Database Restore Completed successfully!");
  console.log(`Total Variants Restored: ${totalInserted}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
