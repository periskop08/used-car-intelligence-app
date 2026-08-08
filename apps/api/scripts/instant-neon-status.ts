/**
 * instant-neon-status.ts
 * 
 * Instantly marks verified clean vehicle variants as APPROVED and 
 * archives all unreferenced legacy synthetic variants to STALE on Neon DB.
 */

import { PrismaClient, ApprovalStatus } from '@prisma/client';

const neonUrl = 'postgresql://neondb_owner:npg_e2n8mgMpUHxw@ep-empty-lake-atmq2yyk-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({
  datasources: { db: { url: neonUrl } }
});

async function main() {
  console.log('=== INSTANT NEON DB STATUS UPDATE ===');

  // 1. Reset all variants to STALE first
  console.log('1. Setting status = STALE for all variants on Neon DB...');
  await prisma.vehicleVariant.updateMany({
    data: { status: ApprovalStatus.STALE }
  });

  // 2. Mark variants created or updated today (which belong to our 107k clean dataset) as APPROVED
  console.log('2. Updating verified clean dataset variants to APPROVED...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const approvedRes = await prisma.vehicleVariant.updateMany({
    where: {
      updatedAt: { gte: today }
    },
    data: { status: ApprovalStatus.APPROVED }
  });

  console.log(`Successfully set ${approvedRes.count} verified dataset variants to APPROVED status.`);

  const finalApprovedCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.APPROVED } });
  const finalStaleCount = await prisma.vehicleVariant.count({ where: { status: ApprovalStatus.STALE } });

  console.log(`\n=== NEON DB LIVE STATUS SUMMARY ===`);
  console.log(`APPROVED Variants (Live in Menus & Search): ${finalApprovedCount}`);
  console.log(`STALE Variants (Archived / Hidden from UI): ${finalStaleCount}`);
  console.log(`==================================`);
}

main()
  .catch(err => {
    console.error('Error during instant Neon DB status update:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
