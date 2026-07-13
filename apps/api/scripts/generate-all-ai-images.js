process.env.DATABASE_URL = "postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

const { PrismaClient } = require("@prisma/client");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { execSync } = require("child_process");
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

const colors = ["white", "dark grey", "metallic silver", "dark blue", "black", "cherry red"];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 5, baseDelay = 5000) {
  let delay = baseDelay;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        console.log(`Rate limited (429). Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
        await sleep(delay);
        delay *= 2; // exponential backoff
        continue;
      }
      return response;
    } catch (err) {
      console.log(`Fetch error: ${err.message}. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`);
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries.`);
}

async function main() {
  const args = process.argv.slice(2);
  const useGemini = args.includes("--gemini");
  const forceRegen = args.includes("--force");

  console.log(`Starting sequential generation of custom AI images for ALL cards in the database...`);
  console.log(`Mode: ${useGemini ? "Google Gemini (Vertex AI Imagen 3)" : "Pollinations AI (Optimized Sana)"}`);
  console.log(`Force Regeneration: ${forceRegen ? "ENABLED" : "DISABLED"}`);

  let accessToken = "";
  const projectId = "gen-lang-client-0254936504"; // Default TorqueScout Project ID

  if (useGemini) {
    try {
      console.log("Getting active Google Cloud access token...");
      accessToken = execSync("gcloud auth print-access-token").toString().trim();
      console.log("Access token retrieved successfully.");
    } catch (err) {
      console.error("\nERROR: Failed to retrieve gcloud credentials.");
      console.error("Please run 'gcloud auth login' and try again.\n");
      process.exit(1);
    }
  }

  // 1. Fetch all cards
  const cards = await prisma.vehicleGuideCard.findMany({
    orderBy: { brand: "asc" }
  });

  console.log(`Found ${cards.length} cards in the database.`);

  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const color = colors[i % colors.length];
    
    const storageKey = `guide-cards/desktop/${card.id}.webp`;
    const targetUrl = `${publicUrl}/${storageKey}`;

    // Skip if already processed and has the specific ID-based URL, unless --force is specified
    if (!forceRegen && card.heroImageUrl === targetUrl) {
      console.log(`[${i + 1}/${cards.length}] Skipping: ${card.brand} ${card.model} (${card.generationName}) - already has custom AI image.`);
      skippedCount++;
      continue;
    }

    // Safety check on bodyType
    const bodyTypeStr = (card.bodyType || "sedan").toLowerCase();
    
    // Construct prompt
    let prompt = "";
    if (useGemini) {
      prompt = `A clean, professional front-three-quarter profile studio photograph of a ${color} ${card.yearStart} ${card.brand} ${card.model} ${card.generationName} ${bodyTypeStr}, dramatic dark studio lighting, neutral solid black background, high-resolution catalog photo, no logos, no text`;
    } else {
      // Simplified prompt style optimized for Sana to prevent deformations (like 6 wheels or warped shapes)
      prompt = `Studio photo of a ${color} ${card.yearStart} ${card.brand} ${card.model} ${bodyTypeStr}. Dark studio lighting, solid black background, clean automotive photography.`;
    }

    console.log(`\n----------------------------------------`);
    console.log(`[${i + 1}/${cards.length}] Processing: ${card.brand} ${card.model} (${card.generationName})`);
    console.log(`Prompt: ${prompt}`);

    try {
      let buffer;

      if (useGemini) {
        // Fetch from Google Vertex AI REST API (Imagen 3)
        const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict`;
        const payload = {
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/jpeg"
          }
        };

        console.log(`Generating image via Vertex AI REST API (Imagen 3)...`);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (errorText.includes("BILLING_DISABLED")) {
            console.error(`\nERROR: Billing must be enabled on project ${projectId} to use Imagen 3.`);
            console.error("To proceed without billing, run the script WITHOUT the --gemini flag to use our optimized free model!\n");
            process.exit(1);
          }
          throw new Error(`Vertex AI API returned status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const base64Image = data.predictions[0].bytesBase64Encoded;
        buffer = Buffer.from(base64Image, "base64");
      } else {
        // Fetch from Pollinations.ai with simplified prompt
        const seed = Math.floor(Math.random() * 1000000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        console.log(`Fetching AI image from Pollinations...`);
        const response = await fetchWithRetry(url);
        if (!response.ok) {
          throw new Error(`Pollinations API returned status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }

      // Optimize with Sharp (resize to 1280 wide, convert to WebP)
      console.log("Converting and optimizing to WebP...");
      const optimizedBuffer = await sharp(buffer)
        .resize(1280, null, {
          withoutEnlargement: true,
          fit: "inside"
        })
        .webp({ quality: 85 })
        .toBuffer();

      // Upload to Cloudflare R2
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

      // Update database record for Guide Card
      await prisma.vehicleGuideCard.update({
        where: { id: card.id },
        data: {
          heroImageUrl: targetUrl,
          imageSource: "AI Generated",
          imageLicense: "Proprietary"
        }
      });
      console.log(`Updated VehicleGuideCard DB record.`);

      // Update corresponding Discovery Cards
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
      
      // Delay between requests
      await sleep(useGemini ? 1000 : 3000);

    } catch (err) {
      console.error(`Failed to process ${card.brand} ${card.model}:`, err.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`Custom AI Image generation completed!`);
  console.log(`Skipped: ${skippedCount}, Generated/Updated: ${successCount}/${cards.length} cards.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
