import {
  PrismaClient,
  ListingStatus,
  FuelType,
  TransmissionType,
  BodyType,
  ListingPromotionType,
  ListingPromotionProductSku,
  ListingPromotionSource,
  PromotionLifecycleStatus,
  PromotionPaymentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const defaultSellerId = '78610f56-3822-407a-9416-c97d9e2fc3f2';

const testSimilarListings = [
  {
    num: 1,
    title: '2007 Subaru Impreza 2.0 AWD Otomatik Temiz',
    brand: 'Subaru',
    model: 'Impreza',
    year: 2007,
    km: 185000,
    price: 950000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 125,
    cc: 1994,
    city: 'Kocaeli',
    district: 'İzmit',
    imageUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 2,
    title: '2006 Subaru Forester 2.0X AWD Hatasız',
    brand: 'Subaru',
    model: 'Forester',
    year: 2006,
    km: 192000,
    price: 980000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SUV,
    hp: 158,
    cc: 1994,
    city: 'Kocaeli',
    district: 'Gebze',
    imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 3,
    title: '2008 Subaru Legacy 2.0 AWD Elegance',
    brand: 'Subaru',
    model: 'Legacy',
    year: 2008,
    km: 210000,
    price: 920000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 150,
    cc: 1994,
    city: 'İstanbul',
    district: 'Kadıköy',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 4,
    title: '2005 Subaru Impreza 1.6 TS Manuel AWD',
    brand: 'Subaru',
    model: 'Impreza',
    year: 2005,
    km: 220000,
    price: 850000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.MANUAL,
    bodyType: BodyType.SEDAN,
    hp: 95,
    cc: 1597,
    city: 'Kocaeli',
    district: 'Körfez',
    imageUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 5,
    title: '2010 Subaru Impreza 1.5 AWD Dynamic Otomatik',
    brand: 'Subaru',
    model: 'Impreza',
    year: 2010,
    km: 168000,
    price: 1050000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.HATCHBACK,
    hp: 107,
    cc: 1498,
    city: 'Bursa',
    district: 'Nilüfer',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 6,
    title: '2007 Honda Civic 1.6 i-VTEC Elegance Otomatik',
    brand: 'Honda',
    model: 'Civic',
    year: 2007,
    km: 195000,
    price: 990000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 125,
    cc: 1595,
    city: 'Kocaeli',
    district: 'Gölcük',
    imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 7,
    title: '2006 Toyota Corolla 1.6 Terra Otomatik',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2006,
    km: 205000,
    price: 930000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 110,
    cc: 1598,
    city: 'Kocaeli',
    district: 'İzmit',
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 8,
    title: '2008 Volkswagen Golf 1.6 FSI Comfortline Tiptronic',
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2008,
    km: 188000,
    price: 1020000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.HATCHBACK,
    hp: 115,
    cc: 1598,
    city: 'Kocaeli',
    district: 'Derince',
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 9,
    title: '2006 BMW 320i E90 Otomatik Sunrooflu',
    brand: 'BMW',
    model: '3 Serisi',
    year: 2006,
    km: 215000,
    price: 1080000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 150,
    cc: 1995,
    city: 'İstanbul',
    district: 'Ataşehir',
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 10,
    title: '2007 Audi A3 Sportback 1.6 Attraction Otomatik',
    brand: 'Audi',
    model: 'A3',
    year: 2007,
    km: 190000,
    price: 970000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.HATCHBACK,
    hp: 102,
    cc: 1595,
    city: 'Kocaeli',
    district: 'Kartepe',
    imageUrl: 'https://images.unsplash.com/photo-1541348263662-e082662d82da?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 11,
    title: '2006 Mazda 3 1.6 Sedan Dynamic Otomatik',
    brand: 'Mazda',
    model: '3',
    year: 2006,
    km: 198000,
    price: 940000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 105,
    cc: 1598,
    city: 'Sakarya',
    district: 'Adapazarı',
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 12,
    title: '2005 Ford Focus 1.6 Ghia Otomatik Sedan',
    brand: 'Ford',
    model: 'Focus',
    year: 2005,
    km: 210000,
    price: 890000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 100,
    cc: 1596,
    city: 'Yalova',
    district: 'Merkez',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 13,
    title: '2008 Opel Astra 1.6 Twinport Enjoy Easytronic',
    brand: 'Opel',
    model: 'Astra',
    year: 2008,
    km: 182000,
    price: 960000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.HATCHBACK,
    hp: 105,
    cc: 1598,
    city: 'Kocaeli',
    district: 'Başiskele',
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 14,
    title: '2007 Volvo S40 1.6 Dynamic Manuel',
    brand: 'Volvo',
    model: 'S40',
    year: 2007,
    km: 202000,
    price: 995000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.MANUAL,
    bodyType: BodyType.SEDAN,
    hp: 100,
    cc: 1596,
    city: 'Kocaeli',
    district: 'Çayırova',
    imageUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80',
  },
  {
    num: 15,
    title: '2006 Mercedes C180 Kompressor Classic Otomatik',
    brand: 'Mercedes',
    model: 'C Serisi',
    year: 2006,
    km: 230000,
    price: 1100000,
    fuel: FuelType.PETROL,
    transmission: TransmissionType.AUTOMATIC,
    bodyType: BodyType.SEDAN,
    hp: 143,
    cc: 1796,
    city: 'İstanbul',
    district: 'Ümraniye',
    imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
  },
];

async function main() {
  console.log('--- 15 ADET BENZER ARAÇ TEST İLANI EKLENİYOR ---');

  for (const item of testSimilarListings) {
    const id = `TEST-SIMILAR-${String(item.num).padStart(2, '0')}`;

    await prisma.vehicleListing.upsert({
      where: { id },
      update: {
        title: item.title,
        priceAmount: item.price,
        modelYear: item.year,
        kilometers: item.km,
        customBrand: item.brand,
        customModel: item.model,
        customYear: item.year,
        fuelType: item.fuel,
        transmission: item.transmission,
        bodyType: item.bodyType,
        enginePower: item.hp,
        engineDisplacement: item.cc,
        city: item.city,
        district: item.district,
        status: ListingStatus.ACTIVE,
        publishedAt: new Date(),
      },
      create: {
        id,
        sellerId: defaultSellerId,
        title: item.title,
        priceAmount: item.price,
        currency: 'TRY',
        modelYear: item.year,
        kilometers: item.km,
        customBrand: item.brand,
        customModel: item.model,
        customYear: item.year,
        fuelType: item.fuel,
        transmission: item.transmission,
        bodyType: item.bodyType,
        enginePower: item.hp,
        engineDisplacement: item.cc,
        city: item.city,
        district: item.district,
        status: ListingStatus.ACTIVE,
        publishedAt: new Date(),
        media: {
          create: {
            url: item.imageUrl,
            storageKey: `test-similar/${id}/photo-0.jpg`,
            fileSize: 102400,
            mimeType: 'image/jpeg',
            sortOrder: 0,
            moderationStatus: 'APPROVED',
          },
        },
      },
    });

    console.log(`[${item.num}/15] ${item.title} (${item.city}) eklendi.`);
  }

  // Promosyon Paketlerini Tanımla (1-8: Vitrin + Akış, 9-15: Sadece Acil)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (let i = 1; i <= 8; i++) {
    const id = `TEST-SIMILAR-${String(i).padStart(2, '0')}`;
    const listing = await prisma.vehicleListing.findUnique({ where: { id } });
    if (!listing) continue;

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

    await prisma.listingPromotionEntitlement.deleteMany({ where: { listingId: id } });
    await prisma.listingPromotionPurchase.deleteMany({ where: { listingId: id } });

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
  }

  for (let i = 9; i <= 15; i++) {
    const id = `TEST-SIMILAR-${String(i).padStart(2, '0')}`;
    const listing = await prisma.vehicleListing.findUnique({ where: { id } });
    if (!listing) continue;

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

    await prisma.listingPromotionEntitlement.deleteMany({ where: { listingId: id } });
    await prisma.listingPromotionPurchase.deleteMany({ where: { listingId: id } });

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
  }

  const count = await prisma.vehicleListing.count({
    where: { id: { startsWith: 'TEST-SIMILAR-' } },
  });

  console.log('----------------------------------------------------');
  console.log(`Tamamlandı! Eklenen benzer test ilanı sayısı: ${count}`);
  console.log('- 8 adet Vitrin + Akış (TEST-SIMILAR-01 .. TEST-SIMILAR-08)');
  console.log('- 7 adet Sadece Acil (TEST-SIMILAR-09 .. TEST-SIMILAR-15)');
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
