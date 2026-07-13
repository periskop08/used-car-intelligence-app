import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

console.log("R2 Configurations loaded:");
console.log("R2_ACCOUNT_ID:", accountId);
console.log("R2_ACCESS_KEY_ID:", accessKeyId);
console.log("R2_BUCKET_NAME:", bucketName);

const s3Client = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
  region: "auto",
});

async function main() {
  const storageKey = "listings/ebdb7cae-c401-4935-bcf2-e423e2183074/1783378139950-gnlg1e.webp";
  console.log(`Attempting to fetch ${storageKey} from R2 bucket: ${bucketName}...`);

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
      })
    );
    console.log("Success! Object fetched from R2.");
    console.log("Content Length:", response.ContentLength);
    console.log("Content Type:", response.ContentType);
  } catch (err) {
    console.error("Error fetching object from R2:", err);
  }
}

main();
