import { PrismaClient, Role, SubscriptionTier, SubscriptionStatus, ApprovalStatus, RiskLevel, TransmissionType, FuelType, BodyType, VehicleInfoCategory, FinalDecision } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Languages
  const langTr = await prisma.language.upsert({
    where: { code: 'tr' },
    update: {},
    create: { code: 'tr', name: 'Türkçe' }
  });

  const langEn = await prisma.language.upsert({
    where: { code: 'en' },
    update: {},
    create: { code: 'en', name: 'English' }
  });

  // 2. Countries
  const countryTr = await prisma.country.upsert({
    where: { code: 'TR' },
    update: {},
    create: { code: 'TR', name: 'Türkiye' }
  });

  const countryUs = await prisma.country.upsert({
    where: { code: 'US' },
    update: {},
    create: { code: 'US', name: 'United States' }
  });

  const countryEu = await prisma.country.upsert({
    where: { code: 'EU' },
    update: {},
    create: { code: 'EU', name: 'Europe' }
  });

  // 3. Subscription Plans (JSON limit structures mapped)
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { tier: SubscriptionTier.FREE },
    update: {},
    create: {
      tier: SubscriptionTier.FREE,
      name: 'Ücretsiz Plan',
      priceTrl: 0.0,
      priceUsd: 0.0,
      limits: {
        aiChat: { period: 'daily', limit: 5 },
        vehicleComparison: { period: 'lifetime', limit: 1 },
        favoriteVehicle: { period: 'lifetime', limit: 0 },
        sellerQuestions: false,
        inspectionChecklist: false,
        detailedRiskNotes: false
      }
    }
  });

  const standardPlan = await prisma.subscriptionPlan.upsert({
    where: { tier: SubscriptionTier.STANDARD },
    update: {},
    create: {
      tier: SubscriptionTier.STANDARD,
      name: 'Standart Paket',
      priceTrl: 349.0,
      priceUsd: 9.99,
      limits: {
        aiChat: { period: 'daily', limit: 10 },
        vehicleComparison: { period: 'monthly', limit: 10 },
        favoriteVehicle: { period: 'lifetime', limit: 20 },
        sellerQuestions: true,
        inspectionChecklist: true,
        detailedRiskNotes: true
      }
    }
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { tier: SubscriptionTier.PRO },
    update: {},
    create: {
      tier: SubscriptionTier.PRO,
      name: 'Pro Paket',
      priceTrl: 899.0,
      priceUsd: 24.99,
      limits: {
        aiChat: { period: 'daily', limit: 100 },
        vehicleComparison: { period: 'monthly', limit: null },
        favoriteVehicle: { period: 'lifetime', limit: null },
        sellerQuestions: true,
        inspectionChecklist: true,
        detailedRiskNotes: true
      }
    }
  });

  // 4. Users (Demo admin & user)
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'admin@usedcarintel.com' },
    update: {},
    create: {
      email: 'admin@usedcarintel.com',
      passwordHash: '$2b$12$demoAdminHashForTestingPassword123!', // "password" placeholder hash
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PRO,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTr.id
    }
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'user@usedcarintel.com' },
    update: {},
    create: {
      email: 'user@usedcarintel.com',
      passwordHash: '$2b$12$demoUserHashForTestingPassword123!', // "password" placeholder hash
      role: Role.USER,
      subscriptionTier: SubscriptionTier.FREE,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTr.id
    }
  });

  // 5. Brands
  const brandToyota = await prisma.brand.upsert({
    where: { name: 'Toyota' },
    update: {},
    create: {
      name: 'Toyota',
      logoUrl: 'https://example.com/toyota-logo.png',
      translations: {
        create: [
          { languageCode: 'tr', name: 'Toyota Türkiye' },
          { languageCode: 'en', name: 'Toyota Global' }
        ]
      }
    }
  });

  const brandVw = await prisma.brand.upsert({
    where: { name: 'Volkswagen' },
    update: {},
    create: {
      name: 'Volkswagen',
      logoUrl: 'https://example.com/vw-logo.png',
      translations: {
        create: [
          { languageCode: 'tr', name: 'Volkswagen Türkiye' },
          { languageCode: 'en', name: 'Volkswagen Global' }
        ]
      }
    }
  });

  const brandBmw = await prisma.brand.upsert({
    where: { name: 'BMW' },
    update: {},
    create: {
      name: 'BMW',
      logoUrl: 'https://example.com/bmw-logo.png'
    }
  });

  // 6. Models
  const modelCorolla = await prisma.model.create({
    data: {
      brandId: brandToyota.id,
      name: 'Corolla',
      startYear: 1966,
      translations: {
        create: [
          { languageCode: 'tr', name: 'Corolla Türkiye' },
          { languageCode: 'en', name: 'Corolla Global' }
        ]
      }
    }
  });

  const modelGolf = await prisma.model.create({
    data: {
      brandId: brandVw.id,
      name: 'Golf',
      startYear: 1974,
      translations: {
        create: [
          { languageCode: 'tr', name: 'Golf TR' },
          { languageCode: 'en', name: 'Golf' }
        ]
      }
    }
  });

  // 7. Generations
  const genGolf7 = await prisma.generation.create({
    data: {
      modelId: modelGolf.id,
      name: 'Golf Mk7',
      startYear: 2012,
      endYear: 2020,
      bodyType: BodyType.HATCHBACK,
      description: 'Volkswagen Golf 7. Jenerasyon',
      translations: {
        create: [
          { languageCode: 'tr', description: 'Yedinci nesil Golf hatchback modeli.' },
          { languageCode: 'en', description: 'Seventh generation Golf hatchback model.' }
        ]
      }
    }
  });

  // 8. Engines
  const engine16Tdi = await prisma.engine.create({
    data: {
      code: '1.6 TDI CR',
      displacement: 1598,
      horsepower: 115,
      torque: 250,
      fuelType: FuelType.DIESEL,
      hasTurbo: true
    }
  });

  // 9. Transmissions
  const transDsg7 = await prisma.transmission.create({
    data: {
      name: 'DSG DQ200',
      type: TransmissionType.DCT,
      speeds: 7
    }
  });

  // 10. Trims
  const trimComfort = await prisma.trim.create({
    data: {
      name: 'Comfortline',
      description: 'Orta donanım seviyesi',
      translations: {
        create: [
          { languageCode: 'tr', description: 'Comfortline standart donanım paketi' },
          { languageCode: 'en', description: 'Comfortline mid-level trim level' }
        ]
      }
    }
  });

  // 11. Vehicle Variants
  const variantGolfTr = await prisma.vehicleVariant.create({
    data: {
      brandId: brandVw.id,
      modelId: modelGolf.id,
      generationId: genGolf7.id,
      engineId: engine16Tdi.id,
      transmissionId: transDsg7.id,
      trimId: trimComfort.id,
      countryId: countryTr.id,
      year: 2018,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date(),
      specs: {
        create: {
          specs: {
            topSpeed: 198,
            acceleration0to100: 10.5,
            averageFuelConsumption: 4.1,
            luggageCapacity: 380,
            weight: 1301
          }
        }
      }
    }
  });

  // 12. Common Problems (2 Approved, 1 Pending)
  const problemDsg = await prisma.commonProblem.create({
    data: {
      variantId: variantGolfTr.id,
      title: 'DSG Kavrama Aşınması',
      description: 'DQ200 kuru tip DSG şanzımanda, yoğun dur-kalk trafikte kavrama aşınması ve sarsıntılı vites geçişleri görülebilmektedir.',
      affectedYears: '2012-2019',
      affectedEngine: 'Tüm 1.6 TDI motorlar',
      affectedTransmission: 'DSG 7 Vites',
      riskLevel: RiskLevel.MEDIUM,
      symptoms: '1. vitesten 2. vitese geçerken sarsıntı, metalik sesler ve vites lambasının yanıp sönmesi.',
      checkRecommendation: 'Alım öncesi test sürüşünde dik rampa kalkışlarında sarsıntı ve kararsızlık kontrol edilmeli.',
      confidenceScore: 0.95,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date(),
      translations: {
        create: [
          {
            languageCode: 'tr',
            title: 'DSG Kavrama Aşınması',
            description: 'DQ200 kuru tip DSG şanzımanda kavrama aşınması görülebilir.',
            symptoms: 'Sarsıntılı vites geçişleri.',
            checkRecommendation: 'Yol testinde vites geçişleri izlenmeli.'
          },
          {
            languageCode: 'en',
            title: 'DSG Clutch Wear',
            description: 'DSG DQ200 transmission clutch wear issues are common.',
            symptoms: 'Jerky shifts and metallic noises.',
            checkRecommendation: 'Check shifting performance during road test.'
          }
        ]
      }
    }
  });

  const problemDpf = await prisma.commonProblem.create({
    data: {
      variantId: variantGolfTr.id,
      title: 'DPF (Dizel Partikül Filtresi) Tıkanması',
      description: 'Kısa mesafeli şehir içi sürüşlerde DPF kendini temizleyemez ve tıkanma eğilimi gösterir.',
      affectedYears: '2015-2020',
      riskLevel: RiskLevel.LOW,
      symptoms: 'Motor arıza lambası yanması, çekiş kaybı ve artan yakıt tüketimi.',
      checkRecommendation: 'Gösterge panelindeki DPF lambasının sönük olduğundan emin olun.',
      confidenceScore: 0.88,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  const problemPending = await prisma.commonProblem.create({
    data: {
      variantId: variantGolfTr.id,
      title: 'Klima Aktüatör Motoru Arızası (Örnek)',
      description: 'Klima yönlendirme kapakçıklarında çıtırtı sesi gelmesi sorunu (İnceleme Bekliyor).',
      riskLevel: RiskLevel.LOW,
      status: ApprovalStatus.PENDING,
      createdById: demoAdmin.id
    }
  });

  // 13. Seller Questions (2 Approved)
  await prisma.sellerQuestion.create({
    data: {
      variantId: variantGolfTr.id,
      question: 'DSG şanzıman mekatronik veya kavraması daha önce değişti mi?',
      reason: 'DSG şanzıman mekatronik ünitesi bu modelde risk grubundadır. Değişim geçmişi mali yükü azaltır.',
      category: VehicleInfoCategory.TRANSMISSION,
      riskLevel: RiskLevel.MEDIUM,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date(),
      translations: {
        create: [
          {
            languageCode: 'tr',
            question: 'DSG şanzıman mekatronik veya kavraması daha önce değişti mi?',
            reason: 'Kavramanın yenilenmiş olması alıcı için büyük avantajdır.'
          }
        ]
      }
    }
  });

  await prisma.sellerQuestion.create({
    data: {
      variantId: variantGolfTr.id,
      question: 'Enjektör ve DPF bakımları düzenli yapıldı mı?',
      reason: 'Dizel motorlarda enjektör ömrü ve DPF temizliği kritik maliyet kalemleridir.',
      category: VehicleInfoCategory.ENGINE,
      riskLevel: RiskLevel.MEDIUM,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // 14. Inspection Checklist Items (2 Approved)
  await prisma.inspectionChecklistItem.create({
    data: {
      variantId: variantGolfTr.id,
      title: 'Şanzıman Yağ Kaçağı ve Vites Geçiş Testi',
      description: 'Liftte aracın altına bakılırken DSG mekatronik kutusunda hidrolik yağ kaçağı olup olmadığı kontrol edilmelidir.',
      category: VehicleInfoCategory.TRANSMISSION,
      riskLevel: RiskLevel.HIGH,
      sortOrder: 1,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date(),
      translations: {
        create: [
          {
            languageCode: 'tr',
            title: 'Şanzıman Yağ Kaçağı Kontrolü',
            description: 'DSG kutusunun altı yağ kaçağı için incelenmelidir.'
          }
        ]
      }
    }
  });

  await prisma.inspectionChecklistItem.create({
    data: {
      variantId: variantGolfTr.id,
      title: 'Soğuk Çalıştırmada Enjektör Sesi',
      description: 'Motor tamamen soğukken ilk marşta enjektörlerden şıkırtı sesi gelip gelmediği dinlenmelidir.',
      category: VehicleInfoCategory.ENGINE,
      riskLevel: RiskLevel.MEDIUM,
      sortOrder: 2,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // 15. User Reviews & Ratings (2 Reviews + 1-to-1 Ratings)
  const review1 = await prisma.userReview.create({
    data: {
      variantId: variantGolfTr.id,
      userId: demoUser.id,
      comment: 'Aracı 2 yıldır kullanıyorum. Yakıt tüketimi mükemmel, uzun yolda 3.8 litrelere kadar düşüyor. Konforu sınıfına göre gayet iyi. Ancak DSG şanzıman bazen şehir içi sıkışık trafikte kafa karıştırabiliyor.',
      usageDuration: 24,
      isOwner: true,
      recommend: true,
      status: ApprovalStatus.APPROVED,
      reviewDateKey: '2026-07-04',
      rating: {
        create: {
          reliability: 4,
          fuelConsumption: 5,
          comfort: 4,
          partCost: 3,
          maintenanceCost: 3,
          resaleEase: 5,
          overall: 4
        }
      }
    }
  });

  const review2 = await prisma.userReview.create({
    data: {
      variantId: variantGolfTr.id,
      userId: demoAdmin.id, // using admin as a second review user
      comment: 'Yol tutuşu ve iç mekan kalitesi harika. Ancak dizel motorun ses yalıtımı soğuk havalarda biraz zayıf. Şanzıman arızası yaşamadım ama bakımlarını hep yetkili serviste yaptırdım.',
      usageDuration: 36,
      isOwner: true,
      recommend: true,
      status: ApprovalStatus.APPROVED,
      reviewDateKey: '2026-07-03',
      rating: {
        create: {
          reliability: 5,
          fuelConsumption: 5,
          comfort: 4,
          partCost: 3,
          maintenanceCost: 4,
          resaleEase: 5,
          overall: 5
        }
      }
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
