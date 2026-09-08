import {
  PrismaClient,
  ListingPromotionType,
  ListingPromotionProductSku,
  ListingPromotionSource,
  PromotionLifecycleStatus,
  PromotionPaymentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 15 TEST İLANINA PROMOSYON PAKETLERİ TANIMLANIYOR ---');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 gün geçerli

  // 1-8: Vitrin + Akış Paketi (SHOWCASE_FEED)
  for (let i = 1; i <= 8; i++) {
    const id = `TEST-SIMILAR-${String(i).padStart(2, '0')}`;
    const listing = await prisma.vehicleListing.findUnique({ where: { id } });
    if (!listing) {
      console.warn(`İlan bulunamadı: ${id}`);
      continue;
    }

    // Listing güncelle
    await prisma.vehicleListing.update({
      where: { id },
      data: {
        isFeatured: true,
        isShowcaseFeedActive: true,
        showcaseFeedSince: now,
        showcaseFeedExpiresAt: expiresAt,
        showcaseRequested: true,
        expiresAt: expiresAt,
      },
    });

    // Varsa eski entitlement/purchase temizle
    await prisma.listingPromotionEntitlement.deleteMany({ where: { listingId: id } });
    await prisma.listingPromotionPurchase.deleteMany({ where: { listingId: id } });

    // Yeni purchase ve entitlement oluştur
    const purchase = await prisma.listingPromotionPurchase.create({
      data: {
        userId: listing.sellerId,
        listingId: id,
        source: ListingPromotionSource.ADMIN_GRANT,
        promotionType: ListingPromotionType.SHOWCASE_FEED,
        productSku: ListingPromotionProductSku.SHOWCASE_FEED,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        paymentStatus: PromotionPaymentStatus.NOT_REQUIRED,
        grantedByAdminId: listing.sellerId,
        adminGrantReason: 'Vitrin ve akış paketi testi',
        priceAmount: 499.0,
        currency: 'TRY',
        activatedAt: now,
        expiresAt: expiresAt,
        purchasedAt: now,
      },
    });

    await prisma.listingPromotionEntitlement.create({
      data: {
        purchaseId: purchase.id,
        listingId: id,
        promotionType: ListingPromotionType.SHOWCASE_FEED,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        activatedAt: now,
        expiresAt: expiresAt,
      },
    });

    console.log(`[VİTRİN + AKIŞ] ${id}: ${listing.title} -> Tanımlandı (Aktif: 30 gün)`);
  }

  // 9-15: Sadece Acil Paketi (URGENT_LISTING)
  for (let i = 9; i <= 15; i++) {
    const id = `TEST-SIMILAR-${String(i).padStart(2, '0')}`;
    const listing = await prisma.vehicleListing.findUnique({ where: { id } });
    if (!listing) {
      console.warn(`İlan bulunamadı: ${id}`);
      continue;
    }

    // Listing güncelle
    await prisma.vehicleListing.update({
      where: { id },
      data: {
        isUrgent: true,
        urgentSince: now,
        urgentExpiresAt: expiresAt,
        urgentRequested: true,
        expiresAt: expiresAt,
      },
    });

    // Varsa eski entitlement/purchase temizle
    await prisma.listingPromotionEntitlement.deleteMany({ where: { listingId: id } });
    await prisma.listingPromotionPurchase.deleteMany({ where: { listingId: id } });

    // Yeni purchase ve entitlement oluştur
    const purchase = await prisma.listingPromotionPurchase.create({
      data: {
        userId: listing.sellerId,
        listingId: id,
        source: ListingPromotionSource.ADMIN_GRANT,
        promotionType: ListingPromotionType.URGENT_LISTING,
        productSku: ListingPromotionProductSku.URGENT_LISTING,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        paymentStatus: PromotionPaymentStatus.NOT_REQUIRED,
        grantedByAdminId: listing.sellerId,
        adminGrantReason: 'Acil ilan paketi testi',
        priceAmount: 299.0,
        currency: 'TRY',
        activatedAt: now,
        expiresAt: expiresAt,
        purchasedAt: now,
      },
    });

    await prisma.listingPromotionEntitlement.create({
      data: {
        purchaseId: purchase.id,
        listingId: id,
        promotionType: ListingPromotionType.URGENT_LISTING,
        lifecycleStatus: PromotionLifecycleStatus.ACTIVE,
        activatedAt: now,
        expiresAt: expiresAt,
      },
    });

    console.log(`[SADECE ACİL] ${id}: ${listing.title} -> Tanımlandı (Aktif: 30 gün)`);
  }

  console.log('----------------------------------------------------');
  console.log('Tüm 15 test ilanına paketler başarıyla tanımlandı!');
  console.log('- 8 adet Vitrin + Akış Paketi (TEST-SIMILAR-01 .. TEST-SIMILAR-08)');
  console.log('- 7 adet Sadece Acil Paketi (TEST-SIMILAR-09 .. TEST-SIMILAR-15)');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
