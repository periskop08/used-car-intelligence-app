process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { PrismaClient } = require("@prisma/client");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const https = require("https");
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

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: status code ${res.statusCode}`));
        return;
      }
      const data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => resolve(Buffer.concat(data)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  console.log("Starting Unsplash-to-R2 download and optimization migration...");

  const cards = await prisma.vehicleGuideCard.findMany({
    where: {
      isActive: true,
    }
  });

  const unsplashCards = cards.filter(c => c.heroImageUrl && c.heroImageUrl.includes("unsplash.com"));

  console.log(`Found ${unsplashCards.length} cards using Unsplash images out of ${cards.length} total active cards.`);

  for (const c of unsplashCards) {
    console.log(`\n----------------------------------------`);
    console.log(`Processing: ${c.brand} ${c.model} (${c.generationName})...`);
    try {
      console.log(`Downloading: ${c.heroImageUrl}`);
      const buffer = await downloadImage(c.heroImageUrl);

      console.log("Optimizing image and converting to WebP using sharp...");
      const optimizedBuffer = await sharp(buffer)
        .resize(1280, null, {
          withoutEnlargement: true,
          fit: "inside"
        })
        .webp({ quality: 85 })
        .toBuffer();

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const storageKey = `guide-cards/desktop/${uniqueId}.webp`;
      console.log(`Uploading to R2 with key: ${storageKey}`);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
          Body: optimizedBuffer,
          ContentType: "image/webp"
        })
      );

      const newUrl = `${publicUrl}/${storageKey}`;
      console.log(`Uploaded successfully! URL: ${newUrl}`);

      await prisma.vehicleGuideCard.update({
        where: { id: c.id },
        data: { heroImageUrl: newUrl }
      });
      console.log(`Successfully updated database record for ${c.brand} ${c.model}!`);

    } catch (err) {
      console.error(`Failed to migrate ${c.brand} ${c.model}:`, err.message);
    }
  }

  console.log("\nUnsplash-to-R2 image migration completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
