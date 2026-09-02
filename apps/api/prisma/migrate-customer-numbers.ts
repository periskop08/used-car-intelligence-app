import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function migrateCustomerNumbers() {
  console.log('=== TORQUESCOUT CUSTOMER NUMBER MIGRATION START ===');

  const totalUsersBefore = await prisma.user.count();
  console.log(`Total users in DB before migration: ${totalUsersBefore}`);

  // Fetch all users sorted deterministically by createdAt ASC, id ASC
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

  const validRegex = /^TS-\d{4}-\d{6}$/;
  const monthCounters: Record<string, number> = {};
  const mappingReport: any[] = [];

  let updatedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    const date = new Date(user.createdAt);
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const period = `${yy}${mm}`;

    if (!monthCounters[period]) {
      monthCounters[period] = 0;
    }
    monthCounters[period] += 1;
    const seqStr = String(monthCounters[period]).padStart(6, '0');
    const expectedCustomerNo = `TS-${period}-${seqStr}`;

    const oldCustomerNo = user.customerNo;

    // Check if user already has a valid customerNo
    if (user.customerNo && validRegex.test(user.customerNo)) {
      console.log(`User ${user.email} (${user.id}) already has valid customerNo: ${user.customerNo}`);
      skippedCount++;
      mappingReport.push({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        oldCustomerNo,
        newCustomerNo: user.customerNo,
        status: 'PRESERVED',
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { customerNo: expectedCustomerNo },
      });
      updatedCount++;
      mappingReport.push({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        oldCustomerNo,
        newCustomerNo: expectedCustomerNo,
        status: 'UPDATED',
      });
      console.log(`Migrated user ${user.email} -> ${expectedCustomerNo} (createdAt: ${user.createdAt.toISOString()})`);
    }
  }

  // Update CustomerNoCounter for each period in DB
  for (const [period, maxVal] of Object.entries(monthCounters)) {
    const existingCounter = await prisma.customerNoCounter.findUnique({ where: { period } });
    if (!existingCounter || existingCounter.counter < maxVal) {
      await prisma.customerNoCounter.upsert({
        where: { period },
        update: { counter: maxVal },
        create: { period, counter: maxVal },
      });
      console.log(`Updated CustomerNoCounter for period ${period} to counter=${maxVal}`);
    }
  }

  // Verification Audit
  const totalUsersAfter = await prisma.user.count();
  const nullUsersCount = await prisma.user.count({ where: { customerNo: null } });
  const allUsersAfter = await prisma.user.findMany({ select: { id: true, customerNo: true } });
  
  const customerNoSet = new Set<string>();
  let duplicateCount = 0;
  let invalidFormatCount = 0;

  for (const u of allUsersAfter) {
    if (!u.customerNo || !validRegex.test(u.customerNo)) {
      invalidFormatCount++;
    }
    if (u.customerNo) {
      if (customerNoSet.has(u.customerNo)) {
        duplicateCount++;
      } else {
        customerNoSet.add(u.customerNo);
      }
    }
  }

  console.log('\n=== MIGRATION VERIFICATION SUMMARY ===');
  console.log(`Total users before: ${totalUsersBefore}`);
  console.log(`Total users after: ${totalUsersAfter}`);
  console.log(`Updated users count: ${updatedCount}`);
  console.log(`Skipped/Preserved count: ${skippedCount}`);
  console.log(`Null customerNo count: ${nullUsersCount}`);
  console.log(`Duplicate customerNo count: ${duplicateCount}`);
  console.log(`Invalid format count: ${invalidFormatCount}`);
  console.log('Monthly user counts:', monthCounters);

  return {
    totalUsersBefore,
    totalUsersAfter,
    updatedCount,
    skippedCount,
    nullUsersCount,
    duplicateCount,
    invalidFormatCount,
    monthCounters,
    mappingReport,
  };
}

if (require.main === module) {
  migrateCustomerNumbers()
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
