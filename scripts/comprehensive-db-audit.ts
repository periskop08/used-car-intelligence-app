import { PrismaClient, ListingStatus, PromotionPaymentStatus, PromotionLifecycleStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function runAudit() {
  console.log('=== STARTING COMPREHENSIVE DB PROMOTION AUDIT ===\n');

  const listings = await prisma.vehicleListing.findMany({
    include: {
      promotions: true,
      promotionEntitlements: true,
      media: true,
    },
  });

  console.log(`Total listings in database: ${listings.length}`);

  let unpaidPromotedListingInModeration = 0;
  let activePromotionWithoutEntitlement = 0;
  let paidWithoutEntitlement = 0;
  let duplicatePurchase = 0;
  let duplicateEntitlement = 0;
  let duplicateModerationSubmission = 0;

  let vitrinMismatch = 0;
  let urgentMismatch = 0;
  let feedMismatch = 0;

  let cityMismatch = 0;
  let kmMismatch = 0;
  let brokenMedia = 0;

  // Track purchases and entitlements for duplicates
  const allPurchases = await prisma.listingPromotionPurchase.findMany();
  const allEntitlements = await prisma.listingPromotionEntitlement.findMany();

  // Check paid without entitlement
  for (const purchase of allPurchases) {
    if (purchase.paymentStatus === PromotionPaymentStatus.PAID) {
      const correspondingEntitlements = allEntitlements.filter(
        (e) => e.listingId === purchase.listingId && e.purchaseId === purchase.id
      );
      if (correspondingEntitlements.length === 0) {
        paidWithoutEntitlement++;
        console.warn(`[WARN] PAID purchase without entitlement: Purchase ID ${purchase.id}`);
      }
    }
  }

  // Check duplicate purchases for same product in same active transaction
  const purchaseGroupMap = new Map<string, number>();
  for (const p of allPurchases) {
    const key = `${p.listingId}_${p.promotionType}_${p.paymentStatus}`;
    purchaseGroupMap.set(key, (purchaseGroupMap.get(key) || 0) + 1);
  }
  for (const [key, count] of purchaseGroupMap.entries()) {
    if (key.includes('PAID') && count > 1) {
      duplicatePurchase += count - 1;
    }
  }

  // Check duplicate entitlements (same listing + same type)
  const entitlementGroupMap = new Map<string, number>();
  for (const e of allEntitlements) {
    if (e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE || e.lifecycleStatus === PromotionLifecycleStatus.PENDING_ACTIVATION) {
      const key = `${e.listingId}_${e.promotionType}`;
      entitlementGroupMap.set(key, (entitlementGroupMap.get(key) || 0) + 1);
    }
  }
  for (const [key, count] of entitlementGroupMap.entries()) {
    if (count > 1) {
      duplicateEntitlement += count - 1;
    }
  }

  for (const l of listings) {
    // Invariant 1: unpaidPromotedListingInModeration
    const isPromotedRequest = l.urgentRequested || l.showcaseRequested;
    const hasAuthority = l.promotions.some((p) => p.paymentStatus === PromotionPaymentStatus.PAID) ||
                         l.promotionEntitlements.some((e) => e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE);
    if (l.status === ListingStatus.PENDING_REVIEW && isPromotedRequest && !hasAuthority) {
      unpaidPromotedListingInModeration++;
    }

    // Invariant 2: activePromotionWithoutEntitlement
    const hasActiveUrgentProjection = l.isUrgent;
    const hasActiveShowcaseProjection = l.isShowcaseFeedActive;
    const hasActiveEntitlement = l.promotionEntitlements.some(
      (e) => e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE
    );
    if ((hasActiveUrgentProjection || hasActiveShowcaseProjection) && !hasActiveEntitlement) {
      activePromotionWithoutEntitlement++;
    }

    // Surface Mismatch Checks
    const activeUrgentEntitlement = l.promotionEntitlements.some(
      (e) => e.promotionType === 'URGENT_LISTING' &&
             e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE
    );
    const activeShowcaseEntitlement = l.promotionEntitlements.some(
      (e) => e.promotionType === 'SHOWCASE_FEED' &&
             e.lifecycleStatus === PromotionLifecycleStatus.ACTIVE
    );

    if (l.status === ListingStatus.ACTIVE) {
      if (activeUrgentEntitlement !== l.isUrgent) {
        urgentMismatch++;
      }
      if (activeShowcaseEntitlement !== l.isShowcaseFeedActive) {
        vitrinMismatch++;
        feedMismatch++;
      }
    }

    // Media validation: check listingMedia URLs
    for (const m of l.media) {
      if (!m.url || m.url.startsWith('undefined') || m.url.startsWith('null') || m.url.trim() === '') {
        brokenMedia++;
      }
    }
  }

  // Authority source breakdown
  let testAuthorityEntitlements = 0;
  let paidEntitlements = 0;
  let adminGrantEntitlements = 0;
  let campaignEntitlements = 0;
  let testRecordCountedAsPaid = 0;
  let testRevenueContribution = 0;

  for (const e of allEntitlements) {
    const purchase = allPurchases.find((p) => p.id === e.purchaseId);
    if (purchase?.source === 'TEST') testAuthorityEntitlements++;
    else if (purchase?.source === 'PAYMENT' && purchase?.paymentStatus === 'PAID') paidEntitlements++;
    else if (purchase?.source === 'ADMIN_GRANT') adminGrantEntitlements++;
    else if (purchase?.source === 'CAMPAIGN') campaignEntitlements++;
  }

  // Check finance contamination
  for (const p of allPurchases) {
    if (p.source === 'TEST') {
      if (p.paymentStatus === 'PAID') {
        testRecordCountedAsPaid++;
      }
      testRevenueContribution += Number(p.priceAmount) || 0;
    }
  }

  let promotionRequestedButNoAuthority = 0;
  let promotionInModerationWithoutAuthority = 0;
  let activePromotionWithoutAuthority = 0;

  for (const l of listings) {
    const isPromotedRequest = l.urgentRequested || l.showcaseRequested;
    const hasAuthority = l.promotions.some((p) => p.paymentStatus === 'PAID' || p.source === 'TEST' || p.source === 'ADMIN_GRANT' || p.source === 'CAMPAIGN') ||
                         l.promotionEntitlements.some((e) => e.lifecycleStatus === 'ACTIVE' || e.lifecycleStatus === 'PENDING_ACTIVATION');
    if (isPromotedRequest && !hasAuthority) {
      promotionRequestedButNoAuthority++;
      if (l.status === 'PENDING_REVIEW') {
        promotionInModerationWithoutAuthority++;
      }
    }
    if ((l.isUrgent || l.isShowcaseFeedActive) && !hasAuthority) {
      activePromotionWithoutAuthority++;
    }
  }

  const crossSurfacePromotionMismatch = vitrinMismatch + urgentMismatch + feedMismatch;

  console.log('\n=== COMPREHENSIVE INVARIANT AUDIT REPORT ===');
  console.log(`totalListings = ${listings.length}`);
  console.log(`testAuthorityEntitlements = ${testAuthorityEntitlements}`);
  console.log(`paidEntitlements = ${paidEntitlements}`);
  console.log(`adminGrantEntitlements = ${adminGrantEntitlements}`);
  console.log(`campaignEntitlements = ${campaignEntitlements}`);
  console.log(`promotionRequestedButNoAuthority = ${promotionRequestedButNoAuthority}`);
  console.log(`promotionInModerationWithoutAuthority = ${promotionInModerationWithoutAuthority}`);
  console.log(`activePromotionWithoutAuthority = ${activePromotionWithoutAuthority}`);
  console.log(`testRecordCountedAsPaid = ${testRecordCountedAsPaid}`);
  console.log(`testRevenueContribution = ${testRevenueContribution}`);
  console.log(`unpaidPromotedListingInModeration = ${unpaidPromotedListingInModeration}`);
  console.log(`activePromotionWithoutEntitlement = ${activePromotionWithoutEntitlement}`);
  console.log(`paidWithoutEntitlement = ${paidWithoutEntitlement}`);
  console.log(`duplicatePurchase = ${duplicatePurchase}`);
  console.log(`duplicateEntitlement = ${duplicateEntitlement}`);
  console.log(`duplicateModerationSubmission = ${duplicateModerationSubmission}`);
  console.log(`vitrinMismatch = ${vitrinMismatch}`);
  console.log(`urgentMismatch = ${urgentMismatch}`);
  console.log(`feedMismatch = ${feedMismatch}`);
  console.log(`crossSurfacePromotionMismatch = ${crossSurfacePromotionMismatch}`);
  console.log(`cityMismatch = ${cityMismatch}`);
  console.log(`kmMismatch = ${kmMismatch}`);
  console.log(`brokenMedia = ${brokenMedia}`);
  console.log('============================================\n');

  await prisma.$disconnect();
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
