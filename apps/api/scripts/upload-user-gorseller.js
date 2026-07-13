process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { PrismaClient } = require("@prisma/client");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

const prisma = new PrismaClient();

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
  console.error("Missing R2 credentials in environment!");
  process.exit(1);
}

const s3Client = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: "auto",
});

const sourceDir = "/Users/periskop/Desktop/TorqueScote_Gorseller";

async function main() {
  console.log(`Starting upload and processing of user-provided images from: ${sourceDir}`);

  if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory does not exist at: ${sourceDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp";
  });

  console.log(`Found ${files.length} image files in the source directory.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(sourceDir, file);
    const cardId = path.basename(file, path.extname(file)).trim();

    console.log(`\n----------------------------------------`);
    console.log(`[${i + 1}/${files.length}] Processing file: ${file} (ID: ${cardId})`);

    try {
      // 1. Verify card exists in DB
      const card = await prisma.vehicleGuideCard.findUnique({
        where: { id: cardId }
      });

      if (!card) {
        console.warn(`WARNING: No vehicle guide card found in database with ID: ${cardId}. Skipping.`);
        failCount++;
        continue;
      }

      console.log(`Matched vehicle: ${card.brand} ${card.model} (${card.generationName})`);

      // 2. Read file and optimize with Sharp
      const buffer = fs.readFileSync(filePath);
      
      console.log("Converting and optimizing to WebP via Sharp...");
      const optimizedBuffer = await sharp(buffer)
        .resize(1280, null, {
          withoutEnlargement: true,
          fit: "inside"
        })
        .webp({ quality: 85 })
        .toBuffer();

      const storageKey = `guide-cards/desktop/${cardId}.webp`;
      const targetUrl = `${publicUrl}/${storageKey}`;

      // 3. Upload to Cloudflare R2
      console.log(`Uploading to R2 with key: ${storageKey}`);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
          Body: optimizedBuffer,
          ContentType: "image/webp"
        })
      );

      console.log(`Uploaded successfully! URL: ${targetUrl}`);

      // 4. Update database record for Guide Card
      await prisma.vehicleGuideCard.update({
        where: { id: cardId },
        data: {
          heroImageUrl: targetUrl,
          imageSource: "User Provided",
          imageLicense: "Proprietary"
        }
      });
      console.log("Updated VehicleGuideCard DB record.");

      // 5. Update corresponding Discovery Cards
      const discRes = await prisma.vehicleDiscoveryCard.updateMany({
        where: {
          brand: card.brand,
          modelFamily: { startsWith: card.model }
        },
        data: {
          imageUrl: targetUrl
        }
      });
      console.log(`Updated ${discRes.count} VehicleDiscoveryCard DB records.`);

      successCount++;

    } catch (err) {
      console.error(`Failed to process file ${file}:`, err.message);
      failCount++;
    }
  }

  console.log(`\n========================================`);
  console.log("User image upload and sync completed!");
  console.log(`Processed: ${files.length}, Successfully Uploaded/Synced: ${successCount}, Failed/Skipped: ${failCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
