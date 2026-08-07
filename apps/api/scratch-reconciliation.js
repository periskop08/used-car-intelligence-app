const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('Starting promotion reconciliation & backfill script...');

  // 1. Find all paid legacy purchases with no entitlements
  const legacyPurchases = await prisma.listingPromotionPurchase.findMany({
    where: {
      paymentStatus: 'PAID',
    },
    include: {
      entitlements: true,
    },
  });

  console.log(`Found ${legacyPurchases.length} total paid purchases in DB.`);

  for (const purchase of legacyPurchases) {
    if (!purchase.listingId) continue;

    const isExpired = purchase.expiresAt && new Date(purchase.expiresAt) <= now;
    const status = isExpired ? 'EXPIRED' : 'ACTIVE';

    if (purchase.entitlements.length === 0) {
      console.log(`Backfilling entitlement for purchase ${purchase.id} (listing: ${purchase.listingId}, status: ${status})`);
      await prisma.listingPromotionEntitlement.create({
        data: {
          purchaseId: purchase.id,
          listingId: purchase.listingId,
          promotionType: purchase.promotionType || 'URGENT_LISTING',
          lifecycleStatus: status,
          activatedAt: purchase.activatedAt || purchase.createdAt,
          expiresAt: purchase.expiresAt,
        },
      });
    }

    if (status === 'ACTIVE') {
      console.log(`Restoring active isUrgent=true for listing ${purchase.listingId}...`);
      await prisma.vehicleListing.update({
        where: { id: purchase.listingId },
        data: {
          isUrgent: true,
          urgentSince: purchase.activatedAt || now,
          urgentExpiresAt: purchase.expiresAt,
        },
      });
    }
  }

  // Count active urgent listings now
  const urgentListings = await prisma.vehicleListing.findMany({
    where: {
      isUrgent: true,
    },
  });

  console.log(`Reconciliation complete! Active urgent listings count: ${urgentListings.length}`);
}

main()
  .catch((e) => console.error('Error running reconciliation:', e))
  .finally(() => prisma.$disconnect());
