import { PrismaClient, Role, SubscriptionTier, SubscriptionStatus, ApprovalStatus, RiskLevel, TransmissionType, FuelType, BodyType, VehicleInfoCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 0. Cleanup existing data to make seed idempotent
  console.log('Cleaning up existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.aiVehicleReport.deleteMany();
  await prisma.aiChatLog.deleteMany();
  await prisma.vehicleComparison.deleteMany();
  await prisma.favoriteVehicle.deleteMany();
  await prisma.userRating.deleteMany();
  await prisma.userReview.deleteMany();
  await prisma.inspectionChecklistItemTranslation.deleteMany();
  await prisma.inspectionChecklistItem.deleteMany();
  await prisma.sellerQuestionTranslation.deleteMany();
  await prisma.sellerQuestion.deleteMany();
  await prisma.commonProblemTranslation.deleteMany();
  await prisma.commonProblem.deleteMany();
  await prisma.recall.deleteMany();
  await prisma.technicalSpec.deleteMany();
  await prisma.vehicleVariant.deleteMany();
  await prisma.trimTranslation.deleteMany();
  await prisma.trim.deleteMany();
  await prisma.transmission.deleteMany();
  await prisma.engine.deleteMany();
  await prisma.generationTranslation.deleteMany();
  await prisma.generation.deleteMany();
  await prisma.modelTranslation.deleteMany();
  await prisma.model.deleteMany();
  await prisma.brandTranslation.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.country.deleteMany();
  await prisma.language.deleteMany();
  console.log('Cleanup completed.');

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

  // Create active subscription for demoAdmin as PRO user
  await prisma.subscription.create({
    data: {
      userId: demoAdmin.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  // 5. Brands
  const brandToyota = await prisma.brand.create({
    data: {
      name: 'Toyota',
      logoUrl: 'https://example.com/toyota-logo.png'
    }
  });

  const brandVw = await prisma.brand.create({
    data: {
      name: 'Volkswagen',
      logoUrl: 'https://example.com/vw-logo.png'
    }
  });

  // 6. Models
  const modelCorolla = await prisma.model.create({
    data: {
      brandId: brandToyota.id,
      name: 'Corolla',
      startYear: 1966
    }
  });

  const modelGolf = await prisma.model.create({
    data: {
      brandId: brandVw.id,
      name: 'Golf',
      startYear: 1974
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
      description: 'Volkswagen Golf 7. Jenerasyon'
    }
  });

  const genCorolla11 = await prisma.generation.create({
    data: {
      modelId: modelCorolla.id,
      name: 'Corolla E170',
      startYear: 2013,
      endYear: 2019,
      bodyType: BodyType.SEDAN,
      description: 'Toyota Corolla 11. Jenerasyon'
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

  const engine16Valv = await prisma.engine.create({
    data: {
      code: '1.6 Valvematic',
      displacement: 1598,
      horsepower: 132,
      torque: 160,
      fuelType: FuelType.PETROL,
      hasTurbo: false
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

  const transCvt = await prisma.transmission.create({
    data: {
      name: 'Multidrive S CVT',
      type: TransmissionType.CVT,
      speeds: 7
    }
  });

  // 10. Trims
  const trimComfort = await prisma.trim.create({
    data: {
      name: 'Comfortline',
      description: 'Orta donanım seviyesi'
    }
  });

  const trimAdvance = await prisma.trim.create({
    data: {
      name: 'Advance',
      description: 'Dolu donanım paketi'
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

  const variantCorollaTr = await prisma.vehicleVariant.create({
    data: {
      brandId: brandToyota.id,
      modelId: modelCorolla.id,
      generationId: genCorolla11.id,
      engineId: engine16Valv.id,
      transmissionId: transCvt.id,
      trimId: trimAdvance.id,
      countryId: countryTr.id,
      year: 2017,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date(),
      specs: {
        create: {
          specs: {
            topSpeed: 190,
            acceleration0to100: 11.1,
            averageFuelConsumption: 6.1,
            luggageCapacity: 452,
            weight: 1310
          }
        }
      }
    }
  });

  // 12. Common Problems
  // Golf DSG
  await prisma.commonProblem.create({
    data: {
      variantId: variantGolfTr.id,
      title: 'DSG Kavrama Aşınması',
      description: 'DQ200 kuru tip DSG şanzımanda, yoğun dur-kalk trafikte kavrama aşınması ve sarsıntılı vites geçişleri görülebilmektedir.',
      riskLevel: RiskLevel.MEDIUM,
      symptoms: '1. vitesten 2. vitese geçerken sarsıntı, metalik sesler ve vites lambasının yanıp sönmesi.',
      checkRecommendation: 'Alım öncesi test sürüşünde dik rampa kalkışlarında sarsıntı ve kararsızlık kontrol edilmeli.',
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // Corolla CVT
  await prisma.commonProblem.create({
    data: {
      variantId: variantCorollaTr.id,
      title: 'CVT Şanzıman Kayış Kaydırması',
      description: 'Multidrive S CVT şanzımanda, yüksek kilometrelerde kayış aşınması nedeniyle güç aktarımında gecikme ve kasnak uğultusu oluşabilir.',
      riskLevel: RiskLevel.MEDIUM,
      symptoms: 'Gaza basıldığında motor devrinin yükselmesi fakat aracın hızlanmaması (kayma hissi), yüksek hızlarda uğultu.',
      checkRecommendation: 'Test sürüşünde ani dip gaz yapılarak şanzımanın gücü kararlı aktarıp aktarmadığı test edilmelidir.',
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // 13. Seller Questions
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
      approvedAt: new Date()
    }
  });

  await prisma.sellerQuestion.create({
    data: {
      variantId: variantCorollaTr.id,
      question: 'CVT şanzıman yağı ve şanzıman filtresi hiç değişti mi? En son ne zaman?',
      reason: 'Toyota CVT şanzımanları uzun ömürlüdür ancak 60.000 km periyoduyla yağ değişimi sağlıklı çalışma için şarttır.',
      category: VehicleInfoCategory.TRANSMISSION,
      riskLevel: RiskLevel.MEDIUM,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // 14. Inspection Checklist Items
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
      approvedAt: new Date()
    }
  });

  await prisma.inspectionChecklistItem.create({
    data: {
      variantId: variantCorollaTr.id,
      title: 'Direksiyon Kutusu Tıkırtı Kontrolü',
      description: 'Araç lifte kaldırılmadan önce direksiyon hızlıca sağa sola sallanarak tıkırtı sesi gelip gelmediği kontrol edilmelidir. Bu modellerde direksiyon mili tıkırtısı yaygındır.',
      category: VehicleInfoCategory.SUSPENSION,
      riskLevel: RiskLevel.LOW,
      sortOrder: 1,
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // 15. User Reviews & Ratings
  await prisma.userReview.create({
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

  await prisma.userReview.create({
    data: {
      variantId: variantCorollaTr.id,
      userId: demoUser.id,
      comment: 'Toyota Corolla 1.6 Valvematic tam bir sorunsuzluk abidesidir. Motoru neredeyse hiç arıza açmaz. CVT şanzımanı konforludur ancak hızlanırken biraz bağırıyor. Yakıtı şehir içi 8 litre civarı.',
      usageDuration: 18,
      isOwner: true,
      recommend: true,
      status: ApprovalStatus.APPROVED,
      reviewDateKey: '2026-07-04',
      rating: {
        create: {
          reliability: 5,
          fuelConsumption: 3,
          comfort: 4,
          partCost: 5,
          maintenanceCost: 5,
          resaleEase: 5,
          overall: 4
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
