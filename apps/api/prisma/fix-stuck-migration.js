const { PrismaClient } = require('@prisma/client');

async function fixStuckMigration() {
  if (!process.env.DATABASE_URL) {
    console.log('[fix-stuck-migration] DATABASE_URL not set, skipping cleanup.');
    return;
  }

  try {
    const prisma = new PrismaClient();
    console.log('[fix-stuck-migration] Checking _prisma_migrations for failed migration entry...');
    const deletedCount = await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations"
      WHERE "migration_name" = '20260807180000_add_listing_report_feedback'
         OR "finished_at" IS NULL;
    `);
    console.log(`[fix-stuck-migration] Cleaned up ${deletedCount} failed migration record(s) from _prisma_migrations.`);
    await prisma.$disconnect();
  } catch (err) {
    console.log('[fix-stuck-migration] Migration cleanup note:', err?.message || err);
  }
}

fixStuckMigration();
