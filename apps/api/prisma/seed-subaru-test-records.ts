import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const futureExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

const workshopImages = [
  'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
];

// 10 VİTRİN ÜYESİ (Showcase)
const vitrinProviders = [
  {
    num: 1,
    name: 'SubaTech Garage',
    city: 'İstanbul',
    district: 'Ataşehir',
    address: 'Ferhatpaşa Mah. Üsküdar Cd. No:142/A Ataşehir, İstanbul',
    phone: '+90 216 577 42 18',
    rating: 4.8,
    reviews: 37,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik', 'Oto Ekspertiz'],
  },
  {
    num: 2,
    name: 'Bursa Boxer Servis',
    city: 'Bursa',
    district: 'Nilüfer',
    address: 'Üçevler Mah. Otomobilciler Sanayi Sitesi 12. Blok No:4 Nilüfer, Bursa',
    phone: '+90 224 441 16 00',
    rating: 4.9,
    reviews: 52,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik', 'Oto Yedek Parça'],
  },
  {
    num: 3,
    name: 'Ataşehir Subaru Özel Servis',
    city: 'İstanbul',
    district: 'Ataşehir',
    address: 'İçerenköy Mah. Bostancı Sanayi Sitesi 3. Sokak No:18 Ataşehir, İstanbul',
    phone: '+90 216 574 33 22',
    rating: 4.7,
    reviews: 28,
    categories: ['Motor/Mekanik', 'Kaporta/Boya', 'Lastik/Jant'],
  },
  {
    num: 4,
    name: 'Anadolu Oto Elektrik & Subaru',
    city: 'Ankara',
    district: 'Çankaya',
    address: 'Şaşmaz Oto Sanayi Sitesi 2. Cadde No:45 Çankaya, Ankara',
    phone: '+90 312 278 12 34',
    rating: 4.8,
    reviews: 19,
    categories: ['Oto Elektrik/Elektronik', 'Oto Aksesuar', 'Oto Yedek Parça'],
  },
  {
    num: 5,
    name: 'DetailCraft Boxer Garage',
    city: 'İzmir',
    district: 'Bornova',
    address: '3. Sanayi Sitesi 401. Sokak No:8 Bornova, İzmir',
    phone: '+90 232 342 90 80',
    rating: 4.6,
    reviews: 24,
    categories: ['Oto Yıkama & Detay', 'Cam Filmi/Kaplama', 'Oto Aksesuar'],
  },
  {
    num: 6,
    name: 'AWD Performance Subaru',
    city: 'İstanbul',
    district: 'Maslak',
    address: 'Atatürk Oto Sanayi Sitesi 1. Kısım 14. Sokak No:210 Maslak, İstanbul',
    phone: '+90 212 286 11 90',
    rating: 4.9,
    reviews: 64,
    categories: ['Motor/Mekanik', 'Oto Ekspertiz'],
  },
  {
    num: 7,
    name: 'Başkent Boxer Teknik',
    city: 'Ankara',
    district: 'Yenimahalle',
    address: 'İvedik Organize Sanayi 1420. Cadde No:33 Yenimahalle, Ankara',
    phone: '+90 312 395 70 80',
    rating: 4.7,
    reviews: 31,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik'],
  },
  {
    num: 8,
    name: 'Ege Subaru Özel Servis',
    city: 'İzmir',
    district: 'Çiğli',
    address: 'Atatürk Organize Sanayi Bölgesi 10008. Sokak No:12 Çiğli, İzmir',
    phone: '+90 232 376 44 20',
    rating: 4.8,
    reviews: 41,
    categories: ['Motor/Mekanik', 'Kaporta/Boya'],
  },
  {
    num: 9,
    name: 'Kuzey AWD Garaj',
    city: 'İstanbul',
    district: 'Ümraniye',
    address: 'DES Sanayi Sitesi C Blok No:4 Ümraniye, İstanbul',
    phone: '+90 216 499 55 60',
    rating: 4.8,
    reviews: 22,
    categories: ['Motor/Mekanik', 'Lastik/Jant'],
  },
  {
    num: 10,
    name: 'ProBoxer Motor Sporları',
    city: 'İstanbul',
    district: 'Kartal',
    address: 'Kartal Oto Sanayi Sitesi D-4 Blok No:8 Kartal, İstanbul',
    phone: '+90 216 389 40 10',
    rating: 4.9,
    reviews: 58,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik', 'Oto Ekspertiz'],
  },
];

// 10 NORMAL ÜYE (Regular Members - No Vitrin)
const normalProviders = [
  {
    num: 1,
    name: 'Kocaeli Japon Oto Subaru',
    city: 'Kocaeli',
    district: 'İzmit',
    address: 'Körfez Sanayi Sitesi 14. Blok No:22 İzmit, Kocaeli',
    phone: '+90 262 335 12 12',
    rating: 4.8,
    reviews: 31,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik'],
  },
  {
    num: 2,
    name: 'İzmit Asya & Subaru Servisi',
    city: 'Kocaeli',
    district: 'İzmit',
    address: 'Sanayi Mah. Ömer Türkçakal Blv. No:88 İzmit, Kocaeli',
    phone: '+90 262 331 44 55',
    rating: 4.7,
    reviews: 18,
    categories: ['Motor/Mekanik', 'Kaporta/Boya'],
  },
  {
    num: 3,
    name: 'Körfez Otomotiv Servis',
    city: 'Kocaeli',
    district: 'Körfez',
    address: 'Kuzey Mah. Cahit Zarifoğlu Cad. No:15 Körfez, Kocaeli',
    phone: '+90 262 528 77 88',
    rating: 4.6,
    reviews: 14,
    categories: ['Oto Elektrik/Elektronik', 'Lastik/Jant'],
  },
  {
    num: 4,
    name: 'Gebze Teknik Subaru',
    city: 'Kocaeli',
    district: 'Gebze',
    address: 'Gebze Küçük Sanayi Sitesi 1184. Sok. No:7 Gebze, Kocaeli',
    phone: '+90 262 646 99 00',
    rating: 4.9,
    reviews: 42,
    categories: ['Motor/Mekanik', 'Oto Ekspertiz'],
  },
  {
    num: 5,
    name: 'Bostancı Japon Oto Tamir',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Bostancı Sanayi Sitesi Değirmen Yolu Sk. No:24 Kadıköy, İstanbul',
    phone: '+90 216 410 88 70',
    rating: 4.7,
    reviews: 26,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik'],
  },
  {
    num: 6,
    name: 'Seyrantepe Oto Mekanik',
    city: 'İstanbul',
    district: 'Kağıthane',
    address: 'Seyrantepe Mah. İbrahim Karaoğlanoğlu Cad. No:74 Kağıthane, İstanbul',
    phone: '+90 212 284 33 10',
    rating: 4.6,
    reviews: 17,
    categories: ['Motor/Mekanik'],
  },
  {
    num: 7,
    name: 'Ostim Japon Araç Servisi',
    city: 'Ankara',
    district: 'Yenimahalle',
    address: 'Ostim Sanayi Sitesi 100. Yıl Bulvarı No:55 Yenimahalle, Ankara',
    phone: '+90 312 385 20 40',
    rating: 4.7,
    reviews: 35,
    categories: ['Motor/Mekanik', 'Oto Yedek Parça'],
  },
  {
    num: 8,
    name: 'Bornova Asya Mekanik',
    city: 'İzmir',
    district: 'Bornova',
    address: '2. Sanayi Sitesi 352. Sokak No:19 Bornova, İzmir',
    phone: '+90 232 461 70 90',
    rating: 4.8,
    reviews: 29,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik'],
  },
  {
    num: 9,
    name: 'Yalova Boxer Tamirhanesi',
    city: 'Yalova',
    district: 'Merkez',
    address: 'Yalova Sanayi Sitesi 3. Yol No:11 Merkez, Yalova',
    phone: '+90 226 814 10 20',
    rating: 4.5,
    reviews: 12,
    categories: ['Motor/Mekanik', 'Lastik/Jant'],
  },
  {
    num: 10,
    name: 'Sakarya Özel Subaru Servisi',
    city: 'Sakarya',
    district: 'Adapazarı',
    address: 'Adapazarı Dörtyol Sanayi Çarşısı 18. Sokak No:6 Adapazarı, Sakarya',
    phone: '+90 264 275 80 90',
    rating: 4.8,
    reviews: 38,
    categories: ['Motor/Mekanik', 'Oto Elektrik/Elektronik', 'Oto Ekspertiz'],
  },
];

async function main() {
  console.log('--- SUBARU İÇİN 10 VİTRİN VE 10 NORMAL SERVİS OLUŞTURULUYOR ---');

  // Vitrin kayıtları
  for (let i = 0; i < vitrinProviders.length; i++) {
    const item = vitrinProviders[i];
    const id = `TEST-SUBARU-VITRIN-${String(i + 1).padStart(2, '0')}`;
    const slug = `test-subaru-vitrin-${i + 1}-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const img = workshopImages[i % workshopImages.length];

    await prisma.isiCepteProvider.upsert({
      where: { isicepteProviderId: id },
      update: {
        businessName: item.name,
        slug,
        coverImageUrl: img,
        avatarUrl: img,
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: item.city,
        district: item.district,
        address: item.address,
        phone: item.phone,
        email: `subaru-vitrin-${i + 1}@isicepte-test.com`,
        isicepteProfileUrl: `https://isicepte.com/usta/${slug}`,
        supportedBrands: ['Subaru', 'Toyota', 'Honda'],
        serviceCategories: item.categories,
        rating: item.rating,
        reviewCount: item.reviews,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      create: {
        isicepteProviderId: id,
        businessName: item.name,
        slug,
        coverImageUrl: img,
        avatarUrl: img,
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: item.city,
        district: item.district,
        address: item.address,
        phone: item.phone,
        email: `subaru-vitrin-${i + 1}@isicepte-test.com`,
        isicepteProfileUrl: `https://isicepte.com/usta/${slug}`,
        supportedBrands: ['Subaru', 'Toyota', 'Honda'],
        serviceCategories: item.categories,
        rating: item.rating,
        reviewCount: item.reviews,
        isShowcaseActive: true,
        showcaseStartsAt: new Date('2025-01-01'),
        showcaseExpiresAt: futureExpiry,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
    });
    console.log(`[VİTRİN ${i + 1}/10] ${item.name} (${item.city}) eklendi.`);
  }

  // Normal üye kayıtları
  for (let i = 0; i < normalProviders.length; i++) {
    const item = normalProviders[i];
    const id = `TEST-SUBARU-NORMAL-${String(i + 1).padStart(2, '0')}`;
    const slug = `test-subaru-normal-${i + 1}-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const img = workshopImages[(i + 4) % workshopImages.length];

    await prisma.isiCepteProvider.upsert({
      where: { isicepteProviderId: id },
      update: {
        businessName: item.name,
        slug,
        coverImageUrl: img,
        avatarUrl: img,
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: item.city,
        district: item.district,
        address: item.address,
        phone: item.phone,
        email: `subaru-normal-${i + 1}@isicepte-test.com`,
        isicepteProfileUrl: `https://isicepte.com/usta/${slug}`,
        supportedBrands: ['Subaru'],
        serviceCategories: item.categories,
        rating: item.rating,
        reviewCount: item.reviews,
        isShowcaseActive: false,
        showcaseStartsAt: null,
        showcaseExpiresAt: null,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
      create: {
        isicepteProviderId: id,
        businessName: item.name,
        slug,
        coverImageUrl: img,
        avatarUrl: img,
        membershipStatus: 'ACTIVE',
        isAutomotive: true,
        torqueScoutOptIn: true,
        countryCode: 'TR',
        city: item.city,
        district: item.district,
        address: item.address,
        phone: item.phone,
        email: `subaru-normal-${i + 1}@isicepte-test.com`,
        isicepteProfileUrl: `https://isicepte.com/usta/${slug}`,
        supportedBrands: ['Subaru'],
        serviceCategories: item.categories,
        rating: item.rating,
        reviewCount: item.reviews,
        isShowcaseActive: false,
        showcaseStartsAt: null,
        showcaseExpiresAt: null,
        showcaseSource: 'ISICEPTE_PURCHASE',
      },
    });
    console.log(`[NORMAL ${i + 1}/10] ${item.name} (${item.city}) eklendi.`);
  }

  const totalSubaru = await prisma.isiCepteProvider.count({
    where: { supportedBrands: { has: 'Subaru' } },
  });
  const showcaseSubaru = await prisma.isiCepteProvider.count({
    where: { supportedBrands: { has: 'Subaru' }, isShowcaseActive: true },
  });
  const normalSubaru = await prisma.isiCepteProvider.count({
    where: { supportedBrands: { has: 'Subaru' }, isShowcaseActive: false },
  });

  console.log('----------------------------------------------------');
  console.log(`Tamamlandı! Toplam Subaru Servisi: ${totalSubaru}`);
  console.log(`- Aktif Vitrin: ${showcaseSubaru}`);
  console.log(`- Normal Üye: ${normalSubaru}`);
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
