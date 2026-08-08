/**
 * set-verified-approved.ts
 * 
 * Sets the status of verified clean dataset variants to APPROVED on Neon DB.
 */

import { PrismaClient, ApprovalStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const neonUrl = 'postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({
  datasources: { db: { url: neonUrl } }
});

async function main() {
  console.log('=== SETTING VERIFIED DATASET VARIANTS TO APPROVED ON NEON DB ===');

  const jsonPath = path.join(process.cwd(), 'scratch/arabam_final.json');
  const rawData: any[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const trCountry = await prisma.country.findFirst({ where: { code: 'TR' } });
  const countryId = trCountry!.id;

  const allBrands = await prisma.brand.findMany();
  const brandMap = new Map(allBrands.map(b => [b.name.toLowerCase().trim(), b.id]));

  const verifiedBrandIds = Array.from(new Set(rawData.map(d => brandMap.get(d.brand.trim().toLowerCase())).filter(Boolean))) as string[];

  console.log(`Updating variants for ${verifiedBrandIds.length} verified brands to APPROVED...`);

  // Bulk update variants where brandId is in verifiedBrandIds to APPROVED
  const res = await prisma.vehicleVariant.updateMany({
    where: {
      brandId: { in: verifiedBrandIds }
    },
    data: { status: ApprovalStatus.APPROVED }
  });

  console.log(`Successfully updated ${res.count} verified variants to APPROVED on Neon DB!`);

  const finalApprovedCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.APPROVED } });
  const finalStaleCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.STALE } });

  console.log(`\n=== NEON DB LIVE STATUS FINAL ===`);
  console.log(`APPROVED Variants (Live in Menus & Search): ${finalApprovedCount}`);
  console.log(`STALE Variants (Archived / Hidden from UI): ${finalStaleCount}`);
  console.log(`=================================`);
}

main()
  .catch(err => {
    console.error('Error during status update:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
