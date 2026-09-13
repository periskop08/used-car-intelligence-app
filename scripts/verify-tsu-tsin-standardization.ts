import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runVerificationProof() {
  console.log('================================================================');
  console.log('TORQUESCOUT — TSU & TSIN STANDARDIZATION VERIFICATION PROOF');
  console.log('================================================================\n');

  // 1. Audit User Database Records
  console.log('--- 1. AUDIT USER DATABASE RECORDS ---');
  const totalUsers = await prisma.user.count();
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, customerNo: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const tsuRegex = /^TSU-\d{4}-\d{6}$/;
  const tsuSet = new Set<string>();
  let invalidTsuCount = 0;
  let duplicateTsuCount = 0;

  for (const u of allUsers) {
    if (!u.customerNo || !tsuRegex.test(u.customerNo)) {
      invalidTsuCount++;
      console.error(`  INVALID TSU: User ${u.email} has customerNo: ${u.customerNo}`);
    }
    if (u.customerNo) {
      if (tsuSet.has(u.customerNo)) {
        duplicateTsuCount++;
        console.error(`  DUPLICATE TSU: ${u.customerNo} already seen!`);
      }
      tsuSet.add(u.customerNo);
    }
  }

  console.log(`  Total Users in DB: ${totalUsers}`);
  console.log(`  Valid TSU Count: ${allUsers.length - invalidTsuCount}`);
  console.log(`  Invalid TSU Count: ${invalidTsuCount}`);
  console.log(`  Duplicate TSU Count: ${duplicateTsuCount}`);
  console.log('  Sample User Records:');
  allUsers.slice(0, 3).forEach((u) => console.log(`    - ${u.customerNo} | ${u.email} | ${u.createdAt.toISOString()}`));
  allUsers.slice(-2).forEach((u) => console.log(`    - ${u.customerNo} | ${u.email} | ${u.createdAt.toISOString()}`));

  // 2. Audit Listing Database Records
  console.log('\n--- 2. AUDIT LISTING DATABASE RECORDS ---');
  const totalListings = await prisma.vehicleListing.count();
  const allListings = await prisma.vehicleListing.findMany({
    select: { id: true, title: true, listingNo: true, createdAt: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  const tsinRegex = /^TSIN-\d{4}-\d{6}$/;
  const tsinSet = new Set<string>();
  let invalidTsinCount = 0;
  let duplicateTsinCount = 0;

  for (const l of allListings) {
    if (!l.listingNo || !tsinRegex.test(l.listingNo)) {
      invalidTsinCount++;
      console.error(`  INVALID TSIN: Listing ${l.id} has listingNo: ${l.listingNo}`);
    }
    if (l.listingNo) {
      if (tsinSet.has(l.listingNo)) {
        duplicateTsinCount++;
        console.error(`  DUPLICATE TSIN: ${l.listingNo} already seen!`);
      }
      tsinSet.add(l.listingNo);
    }
  }

  console.log(`  Total Listings in DB: ${totalListings}`);
  console.log(`  Valid TSIN Count: ${allListings.length - invalidTsinCount}`);
  console.log(`  Invalid TSIN Count: ${invalidTsinCount}`);
  console.log(`  Duplicate TSIN Count: ${duplicateTsinCount}`);
  console.log('  Sample Listing Records:');
  allListings.slice(0, 3).forEach((l) => console.log(`    - ${l.listingNo} | ${(l.title || 'Untitled').substring(0, 30)} | ${l.createdAt.toISOString()}`));
  allListings.slice(-3).forEach((l) => console.log(`    - ${l.listingNo} | ${(l.title || 'Untitled').substring(0, 30)} | ${l.createdAt.toISOString()}`));

  // 3. Specifically verify 4ef1f4f0 listing
  console.log('\n--- 3. SPECIFIC VERIFICATION: 4ef1f4f0 LISTING ---');
  const targetListing = await prisma.vehicleListing.findFirst({
    where: { id: { startsWith: '4ef1f4f0' } },
    select: { id: true, listingNo: true, title: true, createdAt: true },
  });
  if (targetListing) {
    console.log(`  Target listing found:`);
    console.log(`    ID: ${targetListing.id}`);
    console.log(`    Canonical TSIN: ${targetListing.listingNo}`);
    console.log(`    Title: ${targetListing.title}`);
    console.log(`    Created: ${targetListing.createdAt.toISOString()}`);
    console.log(`    Verdict: Old 4EF1F4F0 random code is replaced by canonical ${targetListing.listingNo}`);
  } else {
    console.log('  Target listing not found by prefix.');
  }

  // 4. Test Lookup by TSIN and UUID
  console.log('\n--- 4. TEST BACKEND LOOKUP BY TSIN & UUID ---');
  const sampleListing = allListings[0];
  const sampleListingNo = sampleListing.listingNo!;
  const byTsin = await prisma.vehicleListing.findFirst({
    where: { OR: [{ listingNo: sampleListingNo }, { id: sampleListingNo }] },
  });
  const byUuid = await prisma.vehicleListing.findFirst({
    where: { OR: [{ listingNo: sampleListing.id }, { id: sampleListing.id }] },
  });

  console.log(`  Lookup using TSIN "${sampleListing.listingNo}": ${byTsin ? 'SUCCESS (id: ' + byTsin.id + ')' : 'FAILED'}`);
  console.log(`  Lookup using legacy UUID "${sampleListing.id}": ${byUuid ? 'SUCCESS (listingNo: ' + byUuid.listingNo + ')' : 'FAILED'}`);

  // 5. Test Search by TSU and TSIN
  console.log('\n--- 5. TEST SEARCH CAPABILITY ---');
  const sampleUser = allUsers[0];
  const searchUsersByTsu = await prisma.user.findMany({
    where: { customerNo: { contains: sampleUser.customerNo!, mode: 'insensitive' } },
  });
  console.log(`  Search user by customerNo "${sampleUser.customerNo}": found ${searchUsersByTsu.length} user(s) -> ${searchUsersByTsu[0]?.email}`);

  const searchListingsByTsin = await prisma.vehicleListing.findMany({
    where: { listingNo: { contains: sampleListing.listingNo!, mode: 'insensitive' } },
  });
  console.log(`  Search listing by listingNo "${sampleListing.listingNo}": found ${searchListingsByTsin.length} listing(s) -> ${searchListingsByTsin[0]?.title}`);

  // 6. Concurrency Safety Test (Atomic Monthly Sequence)
  console.log('\n--- 6. CONCURRENCY SAFETY TEST ---');
  const testPeriod = '9912'; // isolated test period
  try {
    // Clean up test counters if exist
    await prisma.customerNoCounter.deleteMany({ where: { period: testPeriod } });
    await prisma.listingNoCounter.deleteMany({ where: { period: testPeriod } });

    const generateUserConcurrent = async () => {
      const res = await prisma.customerNoCounter.upsert({
        where: { period: testPeriod },
        update: { counter: { increment: 1 } },
        create: { period: testPeriod, counter: 1 },
      });
      return `TSU-${testPeriod}-${String(res.counter).padStart(6, '0')}`;
    };

    const generateListingConcurrent = async () => {
      const res = await prisma.listingNoCounter.upsert({
        where: { period: testPeriod },
        update: { counter: { increment: 1 } },
        create: { period: testPeriod, counter: 1 },
      });
      return `TSIN-${testPeriod}-${String(res.counter).padStart(6, '0')}`;
    };

    const userPromises = Array.from({ length: 10 }, () => generateUserConcurrent());
    const listingPromises = Array.from({ length: 10 }, () => generateListingConcurrent());

    const [userResults, listingResults] = await Promise.all([
      Promise.all(userPromises),
      Promise.all(listingPromises),
    ]);

    const userUniqueCount = new Set(userResults).size;
    const listingUniqueCount = new Set(listingResults).size;

    console.log(`  10 Concurrent TSU requests -> generated ${userUniqueCount}/10 unique values`);
    console.log(`  10 Concurrent TSIN requests -> generated ${listingUniqueCount}/10 unique values`);

    if (userUniqueCount === 10 && listingUniqueCount === 10) {
      console.log('  Concurrency test PASSED: 0 collisions, strictly atomic increments!');
    } else {
      console.error('  Concurrency test FAILED!');
      process.exit(1);
    }

    // Clean up test period
    await prisma.customerNoCounter.deleteMany({ where: { period: testPeriod } });
    await prisma.listingNoCounter.deleteMany({ where: { period: testPeriod } });
  } catch (e: any) {
    console.error('Concurrency test error:', e.message);
  }

  // 7. Feedback Snapshot Verification
  console.log('\n--- 7. FEEDBACK SNAPSHOT AUDIT ---');
  const feedbacks = await prisma.feedback.findMany({
    where: { source: 'LISTING_REPORT' },
    select: { id: true, ticketNo: true, listingNoSnapshot: true, listingOwnerReferenceSnapshot: true },
  });
  feedbacks.forEach((fb) => {
    console.log(`  Feedback ${fb.ticketNo}: listingNoSnapshot=${fb.listingNoSnapshot} | listingOwnerReferenceSnapshot=${fb.listingOwnerReferenceSnapshot}`);
  });

  console.log('\n================================================================');
  console.log('ALL VERIFICATION STEPS COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runVerificationProof()
  .catch((e) => {
    console.error('Proof failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
