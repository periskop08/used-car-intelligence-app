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

const mappings = [
  {
    brand: "TOGG",
    model: "T10X",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/togg_t10x_ai_render_1783887045798.png"
  },
  {
    brand: "Dacia",
    model: "Sandero",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/dacia_sandero_ai_render_1783887063251.png"
  },
  {
    brand: "Toyota",
    model: "Yaris",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/toyota_yaris_ai_render_1783887081678.png"
  },
  {
    brand: "Peugeot",
    model: "3008",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/peugeot_3008_ai_render_1783887102566.png"
  }
];

async function main() {
  console.log("Starting overwrite of deformed AI images with perfect renders...");

  for (const item of mappings) {
    console.log(`\n----------------------------------------`);
    console.log(`Processing: ${item.brand} ${item.model}...`);

    try {
      if (!fs.existsSync(item.localPath)) {
        console.error(`Local file not found at: ${item.localPath}`);
        continue;
      }

      // Fetch the guide card to get its current ID
      const card = await prisma.vehicleGuideCard.findFirst({
        where: {
          brand: { equals: item.brand, mode: "insensitive" },
          model: { equals: item.model, mode: "insensitive" }
        }
      });

      if (!card) {
        console.error(`Guide card not found for ${item.brand} ${item.model}`);
        continue;
      }

      const storageKey = `guide-cards/desktop/${card.id}.webp`;

      console.log(`Reading: ${item.localPath}`);
      const buffer = fs.readFileSync(item.localPath);

      console.log("Optimizing image and converting to WebP using sharp...");
      const optimizedBuffer = await sharp(buffer)
        .resize(1280, null, {
          withoutEnlargement: true,
          fit: "inside"
        })
        .webp({ quality: 85 })
        .toBuffer();

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

      // Update in Guide Card table
      const res = await prisma.vehicleGuideCard.updateMany({
        where: { id: card.id },
        data: {
          heroImageUrl: newUrl,
          imageSource: "AI Generated",
          imageLicense: "Proprietary"
        }
      });
      console.log(`Updated guide card database records: ${res.count}`);

      // Also update in Discovery Card table
      const resDisc = await prisma.vehicleDiscoveryCard.updateMany({
        where: {
          brand: { equals: item.brand, mode: "insensitive" },
          modelFamily: { startsWith: item.model }
        },
        data: {
          imageUrl: newUrl
        }
      });
      console.log(`Updated discovery card database records: ${resDisc.count}`);

    } catch (err) {
      console.error(`Failed to process ${item.brand} ${item.model}:`, err.message);
    }
  }

  console.log("\nDeformed images overwrite completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
