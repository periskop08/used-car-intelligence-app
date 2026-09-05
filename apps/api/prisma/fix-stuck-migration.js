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

    // Ensure urgent_promotion_source_invariants includes TEST source
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'urgent_promotion_source_invariants'
        ) THEN
          ALTER TABLE "ListingPromotionPurchase" DROP CONSTRAINT "urgent_promotion_source_invariants";
          ALTER TABLE "ListingPromotionPurchase" ADD CONSTRAINT "urgent_promotion_source_invariants"
          CHECK (
            (
              "source" = 'PAYMENT'
              AND "priceAmount" IS NOT NULL
              AND "amountMinor" IS NOT NULL
              AND "currency" IS NOT NULL
              AND "pricingVersion" IS NOT NULL
              AND "quoteId" IS NOT NULL
              AND "termsVersion" IS NOT NULL
              AND "consentedAt" IS NOT NULL
              AND "listingPublicIdSnapshot" IS NOT NULL
              AND "listingTitleSnapshot" IS NOT NULL
              AND "buyerReferenceSnapshot" IS NOT NULL
            )
            OR
            (
              "source" = 'ADMIN_GRANT'
              AND "grantedByAdminId" IS NOT NULL
              AND "adminGrantReason" IS NOT NULL
              AND "paymentStatus" = 'NOT_REQUIRED'
            )
            OR
            (
              "source" = 'CAMPAIGN'
              AND "campaignId" IS NOT NULL
              AND "paymentStatus" = 'NOT_REQUIRED'
            )
            OR
            (
              "source" = 'TEST'
              AND "paymentStatus" = 'NOT_REQUIRED'
            )
          );
        END IF;
      END $$;
    `);
    console.log('[fix-stuck-migration] Ensured urgent_promotion_source_invariants constraint is updated.');

    await prisma.$disconnect();
  } catch (err) {
    console.log('[fix-stuck-migration] Migration cleanup note:', err?.message || err);
  }

}

fixStuckMigration();
