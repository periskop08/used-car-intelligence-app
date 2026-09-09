import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function migrateTsuAndTsinIdentifiers() {
  console.log('========================================================');
  console.log('TORQUESCOUT — FINAL PUBLIC/BUSINESS IDENTIFIER MIGRATION');
  console.log('========================================================\n');

  // 1. Audit counts before migration
  const userCountBefore = await prisma.user.count();
  const listingCountBefore = await prisma.vehicleListing.count();
  console.log(`[AUDIT BEFORE] Users: ${userCountBefore} | Listings: ${listingCountBefore}`);

  // 2. MIGRATE USERS TO TSU-YYMM-NNNNNN
  console.log('\n--- 1. MIGRATING USERS (TSU-YYMM-NNNNNN) ---');
  const users = await prisma.user.findMany({
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    select: {
      id: true,
      email: true,
      createdAt: true,
      customerNo: true,
    },
  });

  const userMonthCounters: Record<string, number> = {};
  const userMigrationReport: any[] = [];

  for (const user of users) {
    const d = new Date(user.createdAt);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const period = `${yy}${mm}`;

    userMonthCounters[period] = (userMonthCounters[period] || 0) + 1;
    const seqStr = String(userMonthCounters[period]).padStart(6, '0');
    const tsuIdentifier = `TSU-${period}-${seqStr}`;

    const oldCustomerNo = user.customerNo;

    await prisma.user.update({
      where: { id: user.id },
      data: { customerNo: tsuIdentifier },
    });

    userMigrationReport.push({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      oldCustomerNo,
      newCustomerNo: tsuIdentifier,
    });
    console.log(`  User migrated: ${user.email.padEnd(30)} -> ${tsuIdentifier} (was: ${oldCustomerNo || 'null'})`);
  }

  // Update CustomerNoCounter
  for (const [period, maxVal] of Object.entries(userMonthCounters)) {
    await prisma.customerNoCounter.upsert({
      where: { period },
      update: { counter: maxVal },
      create: { period, counter: maxVal },
    });
    console.log(`  CustomerNoCounter updated for period ${period}: counter=${maxVal}`);
  }

  // 3. MIGRATE LISTINGS TO TSIN-YYMM-NNNNNN
  console.log('\n--- 2. MIGRATING LISTINGS (TSIN-YYMM-NNNNNN) ---');
  const listings = await prisma.vehicleListing.findMany({
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    select: {
      id: true,
      title: true,
      createdAt: true,
      listingNo: true,
      sellerId: true,
    },
  });

  const listingMonthCounters: Record<string, number> = {};
  const listingMigrationReport: any[] = [];

  for (const listing of listings) {
    const d = new Date(listing.createdAt);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const period = `${yy}${mm}`;

    listingMonthCounters[period] = (listingMonthCounters[period] || 0) + 1;
    const seqStr = String(listingMonthCounters[period]).padStart(6, '0');
    const tsinIdentifier = `TSIN-${period}-${seqStr}`;

    const oldListingNo = listing.listingNo;

    await prisma.vehicleListing.update({
      where: { id: listing.id },
      data: { listingNo: tsinIdentifier },
    });

    listingMigrationReport.push({
      id: listing.id,
      title: listing.title,
      createdAt: listing.createdAt.toISOString(),
      oldListingNo,
      newListingNo: tsinIdentifier,
    });
    console.log(`  Listing migrated: [${tsinIdentifier}] ${(listing.title || 'Untitled').substring(0, 35).padEnd(35)} (id: ${listing.id.substring(0, 8)}...)`);
  }

  // Update ListingNoCounter
  for (const [period, maxVal] of Object.entries(listingMonthCounters)) {
    await prisma.listingNoCounter.upsert({
      where: { period },
      update: { counter: maxVal },
      create: { period, counter: maxVal },
    });
    console.log(`  ListingNoCounter updated for period ${period}: counter=${maxVal}`);
  }

  // 4. MIGRATE FEEDBACK SNAPSHOTS
  console.log('\n--- 3. MIGRATING FEEDBACK SNAPSHOTS ---');
  const feedbacks = await prisma.feedback.findMany({
    select: {
      id: true,
      listingId: true,
      listingOwnerId: true,
      listingNoSnapshot: true,
      listingOwnerReferenceSnapshot: true,
    },
  });

  for (const fb of feedbacks) {
    let updateData: any = {};
    if (fb.listingId) {
      const relListing = await prisma.vehicleListing.findUnique({
        where: { id: fb.listingId },
        select: { listingNo: true, seller: { select: { customerNo: true } } },
      });
      if (relListing?.listingNo) {
        updateData.listingNoSnapshot = relListing.listingNo;
      }
      if (relListing?.seller?.customerNo) {
        updateData.listingOwnerReferenceSnapshot = relListing.seller.customerNo;
      }
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.feedback.update({
        where: { id: fb.id },
        data: updateData,
      });
      console.log(`  Feedback ${fb.id} updated with snapshot:`, updateData);
    }
  }

  // 5. VERIFICATION AUDIT
  console.log('\n--- 4. POST-MIGRATION VERIFICATION AUDIT ---');
  const userCountAfter = await prisma.user.count();
  const listingCountAfter = await prisma.vehicleListing.count();

  const allUsers = await prisma.user.findMany({ select: { id: true, customerNo: true } });
  const allListings = await prisma.vehicleListing.findMany({ select: { id: true, listingNo: true } });

  const tsuRegex = /^TSU-\d{4}-\d{6}$/;
  const tsinRegex = /^TSIN-\d{4}-\d{6}$/;

  const tsuSet = new Set<string>();
  let duplicateTsu = 0;
  let invalidTsu = 0;

  for (const u of allUsers) {
    if (!u.customerNo || !tsuRegex.test(u.customerNo)) {
      invalidTsu++;
    }
    if (u.customerNo) {
      if (tsuSet.has(u.customerNo)) duplicateTsu++;
      tsuSet.add(u.customerNo);
    }
  }

  const tsinSet = new Set<string>();
  let duplicateTsin = 0;
  let invalidTsin = 0;

  for (const l of allListings) {
    if (!l.listingNo || !tsinRegex.test(l.listingNo)) {
      invalidTsin++;
    }
    if (l.listingNo) {
      if (tsinSet.has(l.listingNo)) duplicateTsin++;
      tsinSet.add(l.listingNo);
    }
  }

  console.log(`Users: Total Before=${userCountBefore}, After=${userCountAfter}`);
  console.log(`  Invalid TSU count: ${invalidTsu} | Duplicate TSU count: ${duplicateTsu}`);
  console.log(`Listings: Total Before=${listingCountBefore}, After=${listingCountAfter}`);
  console.log(`  Invalid TSIN count: ${invalidTsin} | Duplicate TSIN count: ${duplicateTsin}`);

  if (invalidTsu === 0 && duplicateTsu === 0 && invalidTsin === 0 && duplicateTsin === 0) {
    console.log('\n✅ 100% OF USERS AND LISTINGS SUCCESSFULLY STANDARDIZED WITH 0 DUPLICATES!');
  } else {
    console.error('\n❌ VERIFICATION DETECTED ISSUES!');
    process.exit(1);
  }

  return {
    userCountBefore,
    userCountAfter,
    listingCountBefore,
    listingCountAfter,
    userMonthCounters,
    listingMonthCounters,
    duplicateTsu,
    duplicateTsin,
    invalidTsu,
    invalidTsin,
    userMigrationReport,
    listingMigrationReport,
  };
}

if (require.main === module) {
  migrateTsuAndTsinIdentifiers()
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
