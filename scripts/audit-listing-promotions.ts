import { PrismaClient } from '@prisma/client';
import { ListingPromotionQueryService } from '../apps/api/src/modules/listing-promotion/listing-promotion-query.service';

const prisma = new PrismaClient();
const queryService = new ListingPromotionQueryService(prisma as any);

async function main() {
  console.log('================================================================');
  console.log('TORQUESCOUT FINAL LISTING PROMOTION CLEANUP & INTEGRITY AUDIT');
  console.log('================================================================\n');

  // 1. REPAIR CANARY & HISTORICAL INTENT
  console.log('STEP 1: Repairing seller requested intent without creating fake entitlements/purchases...');

  const verifiedUrgentRequestedListingIds = [
    { id: '4ef1f4f0-8b18-4e2c-a3f6-ae1d3dea91b6', title: 'acil deneme' },
    { id: '8dfcc637-3b73-4834-8bd7-20ee6877925a', title: 'Hatasız AUDI' },
    { id: '4f544698-8fb0-4e9f-b27e-9f8e61e44be4', title: 'Sarı kız satılık' },
  ];

  for (const item of verifiedUrgentRequestedListingIds) {
    const listing = await prisma.vehicleListing.findUnique({ where: { id: item.id } });
    if (listing) {
      await prisma.vehicleListing.update({
        where: { id: item.id },
        data: { urgentRequested: true },
      });
      console.log(`  [REPAIRED] Preserved urgentRequested=true on "${item.title}" (${item.id})`);
    } else {
      console.log(`  [SKIP] Listing not found: ${item.id}`);
    }
  }

  console.log('\nSTEP 2: Querying all vehicle listings and running canonical promotion evaluation...\n');

  const listings = await prisma.vehicleListing.findMany({
    include: {
      promotions: true,
      promotionEntitlements: {
        include: {
          purchase: true,
        },
      },
      vehicleVariant: {
        include: {
          brand: true,
          model: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total listings in database: ${listings.length}\n`);

  const auditResults: any[] = [];
  const now = new Date();

  for (const l of listings) {
    const summary = queryService.resolveEffectivePromotions(l, now);

    const isUrgentMismatch = summary.urgent.active && !summary.urgent.entitled;
    const isShowcaseMismatch = summary.showcase.active && !summary.showcase.entitled;
    const isFreePromotionGranted = isUrgentMismatch || isShowcaseMismatch;

    let auditStatus = 'PASS';
    if (isFreePromotionGranted) {
      auditStatus = 'FAIL_ILLEGAL_FREE_PROMOTION';
    } else if (l.id === '3a2b8084-e288-4fa5-9f2a-91c7eae718d9') {
      auditStatus = 'LISTING_PROMOTION_REQUEST_HISTORY_AMBIGUOUS';
    }

    auditResults.push({
      id: l.id,
      title: l.title,
      status: l.status,
      requested: {
        type: summary.requestedPublicationType,
        urgent: summary.urgent.requested,
        showcase: summary.showcase.requested,
      },
      entitled: {
        urgent: summary.urgent.entitled,
        showcase: summary.showcase.entitled,
        paymentStatus: summary.paymentStatus,
      },
      active: {
        effectiveType: summary.effectivePromotionType,
        urgent: summary.urgent.active,
        showcase: summary.showcase.active,
      },
      dates: {
        publishedAt: l.publishedAt,
        expiresAt: l.expiresAt,
        urgentExpiresAt: summary.urgent.expiresAt,
        showcaseExpiresAt: summary.showcase.expiresAt,
      },
      auditStatus,
    });
  }

  // Display Table
  console.log('-------------------------------------------------------------------------------------------------------------------------');
  console.log(
    'ID'.padEnd(10) + ' | ' +
    'Title'.padEnd(20) + ' | ' +
    'Status'.padEnd(14) + ' | ' +
    'Requested'.padEnd(16) + ' | ' +
    'Entitled (U/S)'.padEnd(16) + ' | ' +
    'Active (U/S)'.padEnd(14) + ' | ' +
    'Audit Result'
  );
  console.log('-------------------------------------------------------------------------------------------------------------------------');

  for (const r of auditResults) {
    const reqStr = `${r.requested.type} (U:${r.requested.urgent ? 'Y' : 'N'},S:${r.requested.showcase ? 'Y' : 'N'})`;
    const entStr = `U:${r.entitled.urgent ? 'YES' : 'NO '} | S:${r.entitled.showcase ? 'YES' : 'NO '}`;
    const actStr = `U:${r.active.urgent ? 'YES' : 'NO '} | S:${r.active.showcase ? 'YES' : 'NO '}`;
    console.log(
      r.id.substring(0, 8).padEnd(10) + ' | ' +
      r.title.substring(0, 18).padEnd(20) + ' | ' +
      r.status.padEnd(14) + ' | ' +
      reqStr.padEnd(16) + ' | ' +
      entStr.padEnd(16) + ' | ' +
      actStr.padEnd(14) + ' | ' +
      r.auditStatus
    );
  }
  console.log('-------------------------------------------------------------------------------------------------------------------------\n');

  // Canary Verification
  const canary = auditResults.find(r => r.id === '4f544698-8fb0-4e9f-b27e-9f8e61e44be4');
  console.log('CANARY VERIFICATION: "Sarı kız satılık"');
  if (canary) {
    console.log(`  Title: ${canary.title}`);
    console.log(`  Talep Edilen (Requested): ${canary.requested.type} (Urgent Requested: ${canary.requested.urgent})`);
    console.log(`  Ticari Hak (Entitled): Urgent: ${canary.entitled.urgent}, Payment: ${canary.entitled.paymentStatus}`);
    console.log(`  Public Durum (Active): Urgent: ${canary.active.urgent}, EffectiveType: ${canary.active.effectiveType}`);
    
    if (canary.requested.urgent === true && canary.entitled.urgent === false && canary.active.urgent === false) {
      console.log('  -> CANARY VERIFICATION PASSED: Requested=YES, Entitled=NO, Active=NO. Intent preserved, no free promotion.');
    } else {
      console.log('  -> CANARY VERIFICATION FAILED: Discrepancy observed.');
    }
  } else {
    console.log('  -> Canary listing not found.');
  }

  // Paid Working Example Verification
  const workingPaid = auditResults.find(r => r.id === '4ef1f4f0-8b18-4e2c-a3f6-ae1d3dea91b6');
  console.log('\nPAID VERIFIED EXAMPLE: "acil deneme"');
  if (workingPaid) {
    console.log(`  Title: ${workingPaid.title}`);
    console.log(`  Talep Edilen (Requested): ${workingPaid.requested.type} (Urgent Requested: ${workingPaid.requested.urgent})`);
    console.log(`  Ticari Hak (Entitled): Urgent: ${workingPaid.entitled.urgent}, Payment: ${workingPaid.entitled.paymentStatus}`);
    console.log(`  Public Durum (Active): Urgent: ${workingPaid.active.urgent}, EffectiveType: ${workingPaid.active.effectiveType}`);

    if (workingPaid.requested.urgent === true && workingPaid.entitled.urgent === true && workingPaid.active.urgent === true) {
      console.log('  -> PAID FLOW PRESERVED: Requested=YES, Entitled=YES, Active=YES.');
    } else {
      console.log('  -> PAID FLOW BROKEN: Discrepancy observed.');
    }
  }

  // Summary Metrics
  const total = auditResults.length;
  const passCount = auditResults.filter(r => r.auditStatus === 'PASS').length;
  const ambiguousCount = auditResults.filter(r => r.auditStatus === 'LISTING_PROMOTION_REQUEST_HISTORY_AMBIGUOUS').length;
  const failCount = auditResults.filter(r => r.auditStatus.startsWith('FAIL')).length;

  console.log('\n================================================================');
  console.log(`AUDIT SUMMARY:`);
  console.log(`Total Listings: ${total}`);
  console.log(`PASS: ${passCount}`);
  console.log(`AMBIGUOUS REQUEST HISTORY: ${ambiguousCount}`);
  console.log(`FAIL (Illegal Free Promotion): ${failCount}`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Audit Script Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
