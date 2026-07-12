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
    brand: "Fiat",
    model: "Egea",
    generation: "Egea Sedan",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/fiat_egea_1783779259840.png",
    storageKey: "guide-cards/fiat-egea.webp"
  },
  {
    brand: "Volkswagen",
    model: "Passat",
    generation: "Passat B8",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/vw_passat_b8_1783779241844.png",
    storageKey: "guide-cards/vw-passat-b8.webp"
  },
  {
    brand: "Volkswagen",
    model: "Golf",
    generation: "Golf 7",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/vw_golf_7_1783779226453.png",
    storageKey: "guide-cards/vw-golf-7.webp"
  },
  {
    brand: "Renault",
    model: "Clio",
    generation: "Clio 4",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/renault_clio_4_1783779187035.png",
    storageKey: "guide-cards/renault-clio-4.webp"
  },
  {
    brand: "Renault",
    model: "Clio",
    generation: "Clio 5",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/renault_clio_5_1783779200681.png",
    storageKey: "guide-cards/renault-clio-5.webp"
  },
  {
    brand: "Renault",
    model: "Megane",
    generation: "Megane 4",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/renault_megane_4_1783779213909.png",
    storageKey: "guide-cards/renault-megane-4.webp"
  },
  {
    brand: "Toyota",
    model: "Corolla",
    generation: "Corolla E210",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/toyota_corolla_e210_ai_render_1783880316170.png",
    storageKey: "guide-cards/toyota-corolla-e210.webp"
  },
  {
    brand: "Honda",
    model: "Civic",
    generation: "Civic FC5",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/honda_civic_fc5_ai_render_1783880330124.png",
    storageKey: "guide-cards/honda-civic-fc.webp"
  },
  {
    brand: "Toyota",
    model: "Corolla",
    generation: "Corolla E170",
    localPath: "/Users/periskop/.gemini/antigravity-ide/brain/2c76700d-6cad-401c-8924-b092fb61fdf5/toyota_corolla_e170_ai_render_1783880344462.png",
    storageKey: "guide-cards/toyota-corolla-e170.webp"
  }
];

async function main() {
  console.log("Starting overwrite of main popular cars with true AI generated images...");

  for (const item of mappings) {
    console.log(`\n----------------------------------------`);
    console.log(`Processing: ${item.brand} ${item.model} (${item.generation})...`);

    try {
      if (!fs.existsSync(item.localPath)) {
        console.error(`Local file not found at: ${item.localPath}`);
        continue;
      }

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

      console.log(`Uploading to R2 with key: ${item.storageKey}`);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: item.storageKey,
          Body: optimizedBuffer,
          ContentType: "image/webp"
        })
      );

      const newUrl = `${publicUrl}/${item.storageKey}`;
      console.log(`Uploaded successfully! URL: ${newUrl}`);

      // Update in Guide Card table
      const res = await prisma.vehicleGuideCard.updateMany({
        where: {
          brand: item.brand,
          generationName: item.generation
        },
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
          brand: item.brand,
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

  console.log("\nMain popular cars image overwrite completed successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
