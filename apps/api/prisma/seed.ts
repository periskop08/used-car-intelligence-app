import { PrismaClient, Role, SubscriptionTier, SubscriptionStatus, ApprovalStatus, RiskLevel, TransmissionType, FuelType, BodyType, VehicleInfoCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedVehicle {
  brand: string;
  model: string;
  generation: string;
  startYear: number;
  endYear: number;
  bodyType: BodyType;
  engineCode: string;
  displacement: number;
  horsepower: number;
  torque: number;
  fuelType: FuelType;
  hasTurbo: boolean;
  transName: string;
  transType: TransmissionType;
  speeds: number;
  trim: string;
  variantYear: number;
  topSpeed: number;
  accel: number;
  consumption: number;
  luggage: number;
  weight: number;
  problems: { title: string; description: string; symptoms: string; checkRec: string; risk: RiskLevel }[];
  questions: { question: string; reason: string; category: VehicleInfoCategory; risk: RiskLevel }[];
  checklist: { title: string; description: string; category: VehicleInfoCategory; risk: RiskLevel }[];
  reviews: { comment: string; rating: number; comfort: number; fuel: number; overall: number }[];
}

const seedVehicles: SeedVehicle[] = [
  // 1. Fiat Egea 1.3 Multijet Manual
  {
    brand: "Fiat",
    model: "Egea",
    generation: "Egea Sedan",
    startYear: 2015,
    endYear: 2024,
    bodyType: BodyType.SEDAN,
    engineCode: "1.3 Multijet II",
    displacement: 1248,
    horsepower: 95,
    torque: 200,
    fuelType: FuelType.DIESEL,
    hasTurbo: true,
    transName: "Manuel 5 İleri",
    transType: TransmissionType.MANUAL,
    speeds: 5,
    trim: "Easy",
    variantYear: 2018,
    topSpeed: 180,
    accel: 12.0,
    consumption: 4.2,
    luggage: 520,
    weight: 1200,
    problems: [
      {
        title: "Zincir Sesi ve Gergi Gevşemesi",
        description: "1.3 Multijet zincirli motorlarda yüksek kilometrede zincir uzaması veya gergi arızası nedeniyle şıkırtı sesi oluşur.",
        symptoms: "İlk soğuk marşta ve rölantide motordan şıkırtı/tıkırtı sesi gelmesi.",
        checkRec: "Motor kaputu açılarak motor sesinin stabil olup olmadığı ve rölantideki ses dalgalanmaları dinlenmelidir.",
        risk: RiskLevel.MEDIUM
      }
    ],
    questions: [
      {
        question: "Triger zincir seti ve gergisi en son ne zaman değişti?",
        reason: "Zincir kopması motorun ciddi hasar almasına neden olur. Genellikle 120.000 km civarında değişimi önerilir.",
        category: VehicleInfoCategory.ENGINE,
        risk: RiskLevel.HIGH
      }
    ],
    checklist: [
      {
        title: "Soğuk Çalıştırma Zincir Kontrolü",
        description: "Araç tamamen soğukken ilk çalıştırma esnasında motordan zincir sesi (şıkırtı) gelip gelmediği dinlenmelidir.",
        category: VehicleInfoCategory.ENGINE,
        risk: RiskLevel.MEDIUM
      }
    ],
    reviews: [
      {
        comment: "Egea tam bir fiyat/performans aracı. Yakıt tüketimi mükemmel, bagajı çok geniş. Trim sesleri biraz fazla ama bakım maliyetleri çok uygun.",
        rating: 4,
        comfort: 3,
        fuel: 5,
        overall: 4
      }
    ]
  },
  // 2. Fiat Egea 1.4 Fire Manual
  {
    brand: "Fiat",
    model: "Egea",
    generation: "Egea Sedan",
    startYear: 2015,
    endYear: 2024,
    bodyType: BodyType.SEDAN,
    engineCode: "1.4 Fire 16V",
    displacement: 1368,
    horsepower: 95,
    torque: 127,
    fuelType: FuelType.PETROL,
    hasTurbo: false,
    transName: "Manuel 6 İleri",
    transType: TransmissionType.MANUAL,
    speeds: 6,
    trim: "Easy",
    variantYear: 2020,
    topSpeed: 185,
    accel: 11.5,
    consumption: 5.7,
    luggage: 520,
    weight: 1150,
    problems: [
      {
        title: "1.4 Fire Motor Yağ Eksiltmesi",
        description: "1.4 Fire atmosferik motorlarda, özellikle uzun süreli yüksek devirli kullanımlarda yağ eksiltme/yakma kronik bir durumdur.",
        symptoms: "Motor yağı seviyesinin bin kilometrede bir belirgin şekilde düşmesi, yağ lambasının yanması.",
        checkRec: "Yağ çubuğu kontrol edilmeli ve satıcıdan yağ ekleme geçmişi sorulmalıdır.",
        risk: RiskLevel.MEDIUM
      }
    ],
    questions: [
      {
        question: "Araçta yağ eksiltme sorunu var mı? Hangi sıklıkla yağ ekliyorsunuz?",
        reason: "1.4 Fire motorlarda yağ takibini aksatmak yatak sarmaya kadar giden büyük motor hasarlarına yol açabilir.",
        category: VehicleInfoCategory.ENGINE,
        risk: RiskLevel.MEDIUM
      }
    ],
    checklist: [
      {
        title: "Yağ Çubuğu ve Motor Bloğu Kontrolü",
        description: "Yağ seviyesi kontrol edilmeli, motorda yağ kaçağı veya terleme olup olmadığı incelenmelidir.",
        category: VehicleInfoCategory.ENGINE,
        risk: RiskLevel.MEDIUM
      }
    ],
    reviews: [
      {
        comment: "Şehir içi kullanım için ideal ama rampa çıkarken veya doluyken motor gücü zayıf kalıyor. Yağ seviyesini sürekli takip etmek gerekiyor.",
        rating: 3,
        comfort: 3,
        fuel: 4,
        overall: 3
      }
    ]
  },
  // 3. Renault Clio 1.0 TCe CVT
  {
    brand: "Renault",
    model: "Clio",
    generation: "Clio 5",
    startYear: 2019,
    endYear: 2024,
    bodyType: BodyType.HATCHBACK,
    engineCode: "1.0 TCe X-Tronic",
    displacement: 999,
    horsepower: 90,
    torque: 142,
    fuelType: FuelType.PETROL,
    hasTurbo: true,
    transName: "X-Tronic CVT",
    transType: TransmissionType.CVT,
    speeds: 6,
    trim: "Touch",
    variantYear: 2021,
    topSpeed: 175,
    accel: 12.4,
    consumption: 5.0,
    luggage: 391,
    weight: 1180,
    problems: [
      {
        title: "Kapı Fitillerinden Rüzgar Sesi",
        description: "Clio 5 modellerinde 100 km/s ve üzeri hızlarda kapı fitillerinden içeriye rüzgar sesi girmesi sık karşılaşılan bir şikayettir.",
        symptoms: "Otoyol sürüşünde ön kapılardan gelen ıslık benzeri rüzgar sesi.",
        checkRec: "Test sürüşünde otoyola çıkılarak rüzgar sesi seviyesi gözlemlenmelidir.",
        risk: RiskLevel.LOW
      }
    ],
    questions: [
      {
        question: "Araçta rüzgar sesi veya trim sesi problemi var mı?",
        reason: "Sürüş konforunu doğrudan etkileyen bir durumdur, fitil değişimi veya izolasyon gerekebilir.",
        category: VehicleInfoCategory.GENERAL,
        risk: RiskLevel.LOW
      }
    ],
    checklist: [
      {
        title: "Otoyol Rüzgar Sesi Kontrolü",
        description: "100 km/s hız aşılarak kapı fitilleri ve ayna diplerinden hava sızması sesi olup olmadığı test edilmelidir.",
        category: VehicleInfoCategory.TEST_DRIVE,
        risk: RiskLevel.LOW
      }
    ],
    reviews: [
      {
        comment: "Şehir içinde kullanımı çok kolay ve pratik bir araç. Yakıtı gayet makul. CVT şanzımanı pürüzsüz ama yüksek hızda rüzgar sesi alıyor.",
        rating: 4,
        comfort: 4,
        fuel: 4,
        overall: 4
      }
    ]
  },
  // 4. Renault Megane 1.5 dCi EDC
  {
    brand: "Renault",
    model: "Megane",
    generation: "Megane 4",
    startYear: 2016,
    endYear: 2024,
    bodyType: BodyType.SEDAN,
    engineCode: "1.5 dCi Blue",
    displacement: 1461,
    horsepower: 115,
    torque: 260,
    fuelType: FuelType.DIESEL,
    hasTurbo: true,
    transName: "EDC 7 İleri",
    transType: TransmissionType.DCT,
    speeds: 7,
    trim: "Icon",
    variantYear: 2019,
    topSpeed: 190,
    accel: 10.8,
    consumption: 4.0,
    luggage: 503,
    weight: 1390,
    problems: [
      {
        title: "EDC Çift Kavrama Aşınması ve Isınma",
        description: "Renault EDC çift kavramalı şanzımanlarda, özellikle dur-kalk trafikte debriyaj ısınması ve erken kavrama aşınması görülebilir.",
        symptoms: "Vites geçişlerinde sarsıntı, kararsızlık, dur kalklarda titreme.",
        checkRec: "Yokuş yukarı dur-kalk yapılarak aracın kalkıştaki titremesi izlenmelidir.",
        risk: RiskLevel.MEDIUM
      }
    ],
    questions: [
      {
        question: "EDC şanzıman beyni veya kavrama seti hiç değişti mi?",
        reason: "EDC şanzıman bakımları ve değişimleri maliyetli işlemlerdir.",
        category: VehicleInfoCategory.TRANSMISSION,
        risk: RiskLevel.HIGH
      }
    ],
    checklist: [
      {
        title: "EDC Şanzıman Titreme Kontrolü",
        description: "Yokuşta durup kalkış yapılarak şanzımanda titreme veya kaçırma olup olmadığı kontrol edilmelidir.",
        category: VehicleInfoCategory.TRANSMISSION,
        risk: RiskLevel.MEDIUM
      }
    ],
    reviews: [
      {
        comment: "Icon paket çok şık ve teknolojik. 1.5 dCi motor zaten kendini kanıtlamış, neredeyse yakıt kokluyor. EDC şanzımanı sakin kullanımda çok iyi.",
        rating: 5,
        comfort: 4,
        fuel: 5,
        overall: 5
      }
    ]
  },
  // 5. Volkswagen Passat 1.6 TDI DSG
  {
    brand: "Volkswagen",
    model: "Passat",
    generation: "Passat B8",
    startYear: 2015,
    endYear: 2022,
    bodyType: BodyType.SEDAN,
    engineCode: "1.6 TDI SCR",
    displacement: 1598,
    horsepower: 120,
    torque: 250,
    fuelType: FuelType.DIESEL,
    hasTurbo: true,
    transName: "DSG DQ200",
    transType: TransmissionType.DCT,
    speeds: 7,
    trim: "Comfortline",
    variantYear: 2017,
    topSpeed: 206,
    accel: 10.8,
    consumption: 4.2,
    luggage: 586,
    weight: 1459,
    problems: [
      {
        title: "DSG Mekatronik Basınç Tüpü Hatası",
        description: "Kuru tip DQ200 DSG şanzımanlarda mekatronik gövdesindeki basınç tüpü çatlaması sonucu yağ basıncı kaybı ve şanzıman arızası yaşanır.",
        symptoms: "Ekranda vites arızası uyarısı, aracın vitese geçmemesi, hidrolik kaçakları.",
        checkRec: "Şanzıman yazılım güncellemeleri ve vites geçiş hızı kontrol edilmelidir.",
        risk: RiskLevel.HIGH
      }
    ],
    questions: [
      {
        question: "Şanzıman mekatroniği veya basınç tüpü güçlendirilmiş tüp ile revize edildi mi?",
        reason: "Güçlendirilmiş basınç tüpü uygulaması mekatronik arızalarının önüne geçen popüler ve faydalı bir çözümdür.",
        category: VehicleInfoCategory.TRANSMISSION,
        risk: RiskLevel.HIGH
      }
    ],
    checklist: [
      {
        title: "DSG Mekatronik Yağ Kaçağı",
        description: "Mekatronik kutusunun etrafında yeşil renkli hidrolik yağ kaçağı kontrol edilmelidir.",
        category: VehicleInfoCategory.TRANSMISSION,
        risk: RiskLevel.HIGH
      }
    ],
    reviews: [
      {
        comment: "Tam bir uzun yol gemisi. Bagajı devasa, arka yaşam alanı çok geniş. DSG konforu harika ama arıza ihtimali her zaman kafa kurcalıyor.",
        rating: 4,
        comfort: 5,
        fuel: 5,
        overall: 4
      }
    ]
  },
  // 6. Honda Civic 1.6 i-VTEC LPG
  {
    brand: "Honda",
    model: "Civic",
    generation: "Civic FC5",
    startYear: 2016,
    endYear: 2021,
    bodyType: BodyType.SEDAN,
    engineCode: "1.6 i-VTEC Eco",
    displacement: 1597,
    horsepower: 125,
    torque: 152,
    fuelType: FuelType.LPG,
    hasTurbo: false,
    transName: "CVT Otomatik",
    transType: TransmissionType.CVT,
    speeds: 7,
    trim: "Elegance",
    variantYear: 2018,
    topSpeed: 196,
    accel: 11.6,
    consumption: 6.7,
    luggage: 519,
    weight: 1322,
    problems: [
      {
        title: "C Sütunu Kaporta Sacı Dalgalanması",
        description: "Bazı FC5 Civic modellerinde, arka sütundaki (C sütunu) sac üzerinde kendiliğinden oluşan dalgalanma veya hafif çöküntüler rapor edilmiştir.",
        symptoms: "Aracın arka cam kenarlarındaki kaportada ışıkta belli olan dalgalanmalar.",
        checkRec: "C sütunu sacı dikkatlice gözle kontrol edilmeli ve kazasız olduğundan emin olunmalıdır.",
        risk: RiskLevel.LOW
      },
      {
        title: "Direksiyon Kutusu Tıkırtı Sesi",
        description: "Direksiyon kutusunda aşınma veya burç boşluğu nedeniyle bozuk yollarda tıkırtı sesi gelmesi.",
        symptoms: "Parke taşlı yollarda giderken direksiyondan gelen metalik tıkırtılar.",
        checkRec: "Bozuk yolda test sürüşü yapılmalı, direksiyon tepkisi izlenmelidir.",
        risk: RiskLevel.MEDIUM
      }
    ],
    questions: [
      {
        question: "C sütununda dalgalanma veya göçük düzeltme işlemi yapıldı mı?",
        reason: "Civic FC5'lerde kronik kaporta dalgalanması boyasız göçük düzeltmeyle giderilebiliyor ancak alıcı bilmelidir.",
        category: VehicleInfoCategory.BODY,
        risk: RiskLevel.LOW
      }
    ],
    checklist: [
      {
        title: "Direksiyon Kutusu Tıkırtı Testi",
        description: "Parke taşlı yolda yavaşça ilerlerken direksiyondan gelen sesler ve direksiyon boşluğu kontrol edilmelidir.",
        category: VehicleInfoCategory.SUSPENSION,
        risk: RiskLevel.MEDIUM
      }
    ],
    reviews: [
      {
        comment: "LPG ile yakıtı bedava gibi. Motoru sorunsuz, sanayiye sadece yağ değişimi için gidersiniz. İç tasarımı çok şık ama yalıtımı zayıf.",
        rating: 4,
        comfort: 4,
        fuel: 5,
        overall: 4
      }
    ]
  },
  // 7. Ford Focus 1.5 TDCi Powershift
  {
    brand: "Ford",
    model: "Focus",
    generation: "Focus MK3.5",
    startYear: 2014,
    endYear: 2018,
    bodyType: BodyType.SEDAN,
    engineCode: "1.5 Duratorq TDCi",
    displacement: 1499,
    horsepower: 120,
    torque: 300,
    fuelType: FuelType.DIESEL,
    hasTurbo: true,
    transName: "Powershift DCT",
    transType: TransmissionType.DCT,
    speeds: 6,
    trim: "Titanium",
    variantYear: 2016,
    topSpeed: 193,
    accel: 10.9,
    consumption: 4.2,
    luggage: 421,
    weight: 1378,
    problems: [
      {
        title: "Powershift Çift Kavrama Arızası",
        description: "Ford Powershift kuru ve ıslak tip çift kavramalı şanzımanlarda, keçelerden sızan yağın kavramayı kirletmesi sonucu titreme ve vites geçiş sorunları yaşanır.",
        symptoms: "1. vitesten 2. vitese geçerken sarsıntı, dur kalklarda şiddetli silkeleme.",
        checkRec: "Şanzıman keçelerindeki yağ sızıntıları lift kontrolünde incelenmelidir.",
        risk: RiskLevel.HIGH
      }
    ],
    questions: [
      {
        question: "Powershift şanzımanın beyin (TCM) veya kavrama seti değişti mi?",
        reason: "Powershift kavrama arızaları oldukça maliyetli olabilmektedir.",
        category: VehicleInfoCategory.TRANSMISSION,
        risk: RiskLevel.HIGH
      }
    ],
    checklist: [
      {
        title: "Powershift Kavrama Titreme Testi",
        description: "Dur-kalk trafikte ve yokuşta kalkışta debriyaj kaçırma ve silkeleme kontrol edilmelidir.",
        category: VehicleInfoCategory.TRANSMISSION,
        risk: RiskLevel.HIGH
      }
    ],
    reviews: [
      {
        comment: "Yol tutuşu bu sınıfın en iyisi. Focus direksiyon tepkilerine bayılıyorum. Powershift şanzıman hızlı vites atıyor ama arıza çıkarma korkusu hep var.",
        rating: 4,
        comfort: 4,
        fuel: 4,
        overall: 4
      }
    ]
  },
  // 8. Peugeot 3008 1.5 BlueHDi EAT8
  {
    brand: "Peugeot",
    model: "3008",
    generation: "3008 II",
    startYear: 2016,
    endYear: 2023,
    bodyType: BodyType.SUV,
    engineCode: "1.5 BlueHDi EAT8",
    displacement: 1499,
    horsepower: 130,
    torque: 300,
    fuelType: FuelType.DIESEL,
    hasTurbo: true,
    transName: "EAT8 Tork Konvertörlü",
    transType: TransmissionType.AUTOMATIC,
    speeds: 8,
    trim: "Allure",
    variantYear: 2019,
    topSpeed: 192,
    accel: 11.5,
    consumption: 4.1,
    luggage: 520,
    weight: 1430,
    problems: [
      {
        title: "AdBlue Depo ve Enjektör Kristalleşmesi",
        description: "1.5 BlueHDi motorlarda kullanılan AdBlue sistemi, depo kapağının havasız kalması veya sıvının kristalleşmesi nedeniyle depo bükülmesi ve pompa arızası yaratır.",
        symptoms: "Ekranda 'Urea' lambasının ve motor arıza lambasının yanması, aracın çalıştırılamayacağına dair geri sayım.",
        checkRec: "Göstergede AdBlue veya motor arıza lambalarının yanıp sönmediği doğrulanmalıdır.",
        risk: RiskLevel.HIGH
      }
    ],
    questions: [
      {
        question: "AdBlue deposu veya enjektörü daha önce değişti mi ya da yazılımsal işlem yapıldı mı?",
        reason: "AdBlue deposunun komple değişimi yüksek maliyetlidir. Bazı kullanıcılar bu sistemi yazılımla iptal ettirmektedir.",
        category: VehicleInfoCategory.ENGINE,
        risk: RiskLevel.MEDIUM
      }
    ],
    checklist: [
      {
        title: "AdBlue Sistem Arıza Lambası Kontrolü",
        description: "Kontak açıldığında ve motor çalışırken gösterge panelinde Urea/Emisyon arızası uyarısı kontrol edilmelidir.",
        category: VehicleInfoCategory.ELECTRONICS,
        risk: RiskLevel.HIGH
      }
    ],
    reviews: [
      {
        comment: "Dış tasarımı ve i-Cockpit içi harika görünüyor. SUV konforu çok başarılı. EAT8 şanzıman ise çift kavramalara kıyasla aşırı sorunsuz.",
        rating: 5,
        comfort: 5,
        fuel: 5,
        overall: 5
      }
    ]
  }
];

async function main() {
  console.log('Seeding database with popular Turkish market cars...');

  // Cleanup before seed to ensure idempotency
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

  // Common setups
  const langTr = await prisma.language.create({ data: { code: 'tr', name: 'Türkçe' } });
  const countryTr = await prisma.country.create({ data: { code: 'TR', name: 'Türkiye' } });

  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      tier: SubscriptionTier.FREE,
      name: 'Ücretsiz Plan',
      priceTrl: 0,
      priceUsd: 0,
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

  const premiumPlan = await prisma.subscriptionPlan.create({
    data: {
      tier: SubscriptionTier.PREMIUM,
      name: 'Premium Paket',
      priceTrl: 899,
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

  const demoAdmin = await prisma.user.create({
    data: {
      email: 'admin@usedcarintel.com',
      passwordHash: '$2b$12$demoAdminHashForTestingPassword123!',
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PREMIUM,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTr.id
    }
  });

  const demoUser = await prisma.user.create({
    data: {
      email: 'user@usedcarintel.com',
      passwordHash: '$2b$12$demoUserHashForTestingPassword123!',
      role: Role.USER,
      subscriptionTier: SubscriptionTier.FREE,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTr.id
    }
  });

  // Seed user admin promotes
  await prisma.user.create({
    data: {
      email: 'm.efeeguven@gmail.com',
      passwordHash: 'password123',
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PREMIUM,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTr.id
    }
  });

  await prisma.user.create({
    data: {
      email: 'burhanseckin08@gmail.com',
      passwordHash: 'password123',
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PREMIUM,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTr.id
    }
  });

  // Keep Golf Mk7 and Corolla in the seed explicitly as well, along with the loop vehicles
  const vwBrand = await prisma.brand.create({ data: { name: 'Volkswagen' } });
  const golfModel = await prisma.model.create({ data: { brandId: vwBrand.id, name: 'Golf', startYear: 1974 } });
  const golfGen = await prisma.generation.create({
    data: { modelId: golfModel.id, name: 'Golf Mk7', startYear: 2012, endYear: 2020, bodyType: BodyType.HATCHBACK, description: 'Golf 7' }
  });
  const tdiEngine = await prisma.engine.create({
    data: { code: '1.6 TDI CR', displacement: 1598, horsepower: 115, torque: 250, fuelType: FuelType.DIESEL, hasTurbo: true }
  });
  const dsgTrans = await prisma.transmission.create({ data: { name: 'DSG DQ200', type: TransmissionType.DCT, speeds: 7 } });
  const comfortTrim = await prisma.trim.create({ data: { name: 'Comfortline', description: 'Orta paket' } });

  const golfVariant = await prisma.vehicleVariant.create({
    data: {
      brandId: vwBrand.id,
      modelId: golfModel.id,
      generationId: golfGen.id,
      engineId: tdiEngine.id,
      transmissionId: dsgTrans.id,
      trimId: comfortTrim.id,
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

  // Seed Golf DSG problem
  await prisma.commonProblem.create({
    data: {
      variantId: golfVariant.id,
      title: 'DSG Kavrama Aşınması',
      description: 'Kuru tip DSG şanzımanda kavrama aşınması görülebilir.',
      riskLevel: RiskLevel.MEDIUM,
      symptoms: 'Sarsıntılı vites geçişleri.',
      checkRecommendation: 'Yol testinde vites geçişleri izlenmeli.',
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // Seed Toyota Corolla explicitly
  const toyBrand = await prisma.brand.create({ data: { name: 'Toyota' } });
  const corModel = await prisma.model.create({ data: { brandId: toyBrand.id, name: 'Corolla', startYear: 1966 } });
  const corGen = await prisma.generation.create({
    data: { modelId: corModel.id, name: 'Corolla E170', startYear: 2013, endYear: 2019, bodyType: BodyType.SEDAN, description: 'Corolla E170' }
  });
  const valvEngine = await prisma.engine.create({
    data: { code: '1.6 Valvematic', displacement: 1598, horsepower: 132, torque: 160, fuelType: FuelType.PETROL, hasTurbo: false }
  });
  const cvtTrans = await prisma.transmission.create({ data: { name: 'Multidrive S CVT', type: TransmissionType.CVT, speeds: 7 } });
  const advTrim = await prisma.trim.create({ data: { name: 'Advance', description: 'Advance Paket' } });

  const corollaVariant = await prisma.vehicleVariant.create({
    data: {
      brandId: toyBrand.id,
      modelId: corModel.id,
      generationId: corGen.id,
      engineId: valvEngine.id,
      transmissionId: cvtTrans.id,
      trimId: advTrim.id,
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

  await prisma.commonProblem.create({
    data: {
      variantId: corollaVariant.id,
      title: 'CVT Şanzıman Kayış Kaydırması',
      description: 'Multidrive S CVT şanzımanda kaçırma hissi.',
      riskLevel: RiskLevel.MEDIUM,
      symptoms: 'Gecikmeli hızlanma.',
      checkRecommendation: 'Yol testinde ani dip gaz tepkisi kontrol edilmeli.',
      status: ApprovalStatus.APPROVED,
      createdById: demoAdmin.id,
      approvedById: demoAdmin.id,
      approvedAt: new Date()
    }
  });

  // Now seed all the dynamic vehicles in the loop
  for (const v of seedVehicles) {
    console.log(`Seeding: ${v.brand} ${v.model} ${v.engineCode}...`);

    // Brand
    let brand = await prisma.brand.findFirst({ where: { name: v.brand } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { name: v.brand } });
    }

    // Model
    let model = await prisma.model.findFirst({ where: { brandId: brand.id, name: v.model } });
    if (!model) {
      model = await prisma.model.create({ data: { brandId: brand.id, name: v.model, startYear: v.startYear } });
    }

    // Gen
    let gen = await prisma.generation.findFirst({ where: { modelId: model.id, name: v.generation } });
    if (!gen) {
      gen = await prisma.generation.create({
        data: {
          modelId: model.id,
          name: v.generation,
          startYear: v.startYear,
          endYear: v.endYear,
          bodyType: v.bodyType,
          description: `${v.brand} ${v.model} ${v.generation}`
        }
      });
    }

    // Engine
    let engine = await prisma.engine.findFirst({ where: { code: v.engineCode } });
    if (!engine) {
      engine = await prisma.engine.create({
        data: {
          code: v.engineCode,
          displacement: v.displacement,
          horsepower: v.horsepower,
          torque: v.torque,
          fuelType: v.fuelType,
          hasTurbo: v.hasTurbo
        }
      });
    }

    // Transmission
    let trans = await prisma.transmission.findFirst({ where: { name: v.transName } });
    if (!trans) {
      trans = await prisma.transmission.create({
        data: {
          name: v.transName,
          type: v.transType,
          speeds: v.speeds
        }
      });
    }

    // Trim
    let trim = await prisma.trim.findFirst({ where: { name: v.trim } });
    if (!trim) {
      trim = await prisma.trim.create({
        data: {
          name: v.trim,
          description: `${v.trim} Donanım Paketi`
        }
      });
    }

    // Variant
    const variant = await prisma.vehicleVariant.create({
      data: {
        brandId: brand.id,
        modelId: model.id,
        generationId: gen.id,
        engineId: engine.id,
        transmissionId: trans.id,
        trimId: trim.id,
        countryId: countryTr.id,
        year: v.variantYear,
        status: ApprovalStatus.APPROVED,
        createdById: demoAdmin.id,
        approvedById: demoAdmin.id,
        approvedAt: new Date(),
        specs: {
          create: {
            specs: {
              topSpeed: v.topSpeed,
              acceleration0to100: v.accel,
              averageFuelConsumption: v.consumption,
              luggageCapacity: v.luggage,
              weight: v.weight
            }
          }
        }
      }
    });

    // Chronic Problems
    for (const prob of v.problems) {
      await prisma.commonProblem.create({
        data: {
          variantId: variant.id,
          title: prob.title,
          description: prob.description,
          riskLevel: prob.risk,
          symptoms: prob.symptoms,
          checkRecommendation: prob.checkRec,
          status: ApprovalStatus.APPROVED,
          createdById: demoAdmin.id,
          approvedById: demoAdmin.id,
          approvedAt: new Date()
        }
      });
    }

    // Seller Questions
    for (const q of v.questions) {
      await prisma.sellerQuestion.create({
        data: {
          variantId: variant.id,
          question: q.question,
          reason: q.reason,
          category: q.category,
          riskLevel: q.risk,
          status: ApprovalStatus.APPROVED,
          createdById: demoAdmin.id,
          approvedById: demoAdmin.id,
          approvedAt: new Date()
        }
      });
    }

    // Checklist Items
    for (const item of v.checklist) {
      await prisma.inspectionChecklistItem.create({
        data: {
          variantId: variant.id,
          title: item.title,
          description: item.description,
          category: item.category,
          riskLevel: item.risk,
          sortOrder: 1,
          status: ApprovalStatus.APPROVED,
          createdById: demoAdmin.id,
          approvedById: demoAdmin.id,
          approvedAt: new Date()
        }
      });
    }

    // User Reviews
    for (const rev of v.reviews) {
      await prisma.userReview.create({
        data: {
          variantId: variant.id,
          userId: demoUser.id,
          comment: rev.comment,
          usageDuration: 12,
          isOwner: true,
          recommend: true,
          status: ApprovalStatus.APPROVED,
          reviewDateKey: '2026-07-04',
          rating: {
            create: {
              reliability: rev.rating,
              fuelConsumption: rev.fuel,
              comfort: rev.comfort,
              partCost: 4,
              maintenanceCost: 4,
              resaleEase: 5,
              overall: rev.overall
            }
          }
        }
      });
    }
  }

  console.log('Seeding dynamic vehicle shells catalog...');
  const brandModels = [
    {
      brand: "Peugeot",
      models: [
        { name: "206", years: [2000, 2004], body: BodyType.HATCHBACK, engines: ["1.4 Benzin", "1.4 HDi Dizel"], trans: ["Manuel", "Otomatik"] },
        { name: "207", years: [2007, 2010], body: BodyType.HATCHBACK, engines: ["1.4 Benzin", "1.6 HDi Dizel"], trans: ["Manuel", "Otomatik"] },
        { name: "208", years: [2013, 2017, 2021], body: BodyType.HATCHBACK, engines: ["1.2 PureTech", "1.6 BlueHDi Dizel"], trans: ["Manuel", "EAT6 Otomatik", "EAT8 Otomatik"] },
        { name: "307", years: [2002, 2005], body: BodyType.HATCHBACK, engines: ["1.6 Benzin", "1.6 HDi Dizel", "2.0 Benzin"], trans: ["Manuel", "Otomatik"] },
        { name: "308", years: [2008, 2015, 2021], body: BodyType.HATCHBACK, engines: ["1.6 THP Benzin", "1.6 BlueHDi Dizel", "1.2 PureTech"], trans: ["Manuel", "EAT6 Otomatik", "EAT8 Otomatik"] },
        { name: "3008", years: [2010, 2017, 2022], body: BodyType.SUV, engines: ["1.6 THP Benzin", "1.6 BlueHDi Dizel", "1.5 BlueHDi Dizel"], trans: ["EAT6 Otomatik", "EAT8 Otomatik"] }
      ]
    },
    {
      brand: "Citroen",
      models: [
        { name: "C3", years: [2003, 2010, 2017], body: BodyType.HATCHBACK, engines: ["1.4 Benzin", "1.4 HDi Dizel", "1.2 PureTech"], trans: ["Manuel", "EAT6 Otomatik"] },
        { name: "C4", years: [2004, 2012, 2020], body: BodyType.HATCHBACK, engines: ["1.6 Benzin", "1.6 HDi Dizel", "1.2 PureTech"], trans: ["Manuel", "EAT6 Otomatik", "EAT8 Otomatik"] },
        { name: "C5", years: [2008, 2015], body: BodyType.SEDAN, engines: ["1.6 HDi Dizel", "2.0 HDi Dizel"], trans: ["Manuel", "Otomatik"] },
        { name: "Berlingo", years: [2008, 2015, 2019], body: BodyType.VAN, engines: ["1.6 HDi Dizel", "1.5 BlueHDi Dizel"], trans: ["Manuel", "EAT8 Otomatik"] }
      ]
    },
    {
      brand: "Volkswagen",
      models: [
        { name: "Polo", years: [2002, 2009, 2017], body: BodyType.HATCHBACK, engines: ["1.4 Benzin", "1.4 TDI Dizel", "1.0 TSI Benzin", "1.6 TDI Dizel"], trans: ["Manuel", "DSG Otomatik"] },
        { name: "Golf", years: [2004, 2009, 2013, 2020], body: BodyType.HATCHBACK, engines: ["1.6 Hit Benzin", "1.4 TSI Benzin", "1.6 TDI Dizel", "1.0 TSI Benzin", "1.5 eTSI Hibrit"], trans: ["Manuel", "DSG Otomatik"] },
        { name: "Passat", years: [2006, 2011, 2015, 2020], body: BodyType.SEDAN, engines: ["1.6 FSI Benzin", "2.0 TDI Dizel", "1.4 TSI Benzin", "1.6 TDI Dizel", "1.5 TSI Benzin"], trans: ["Manuel", "DSG Otomatik"] },
        { name: "Tiguan", years: [2008, 2016, 2021], body: BodyType.SUV, engines: ["1.4 TSI Benzin", "2.0 TDI Dizel", "1.5 TSI Benzin"], trans: ["Manuel", "DSG Otomatik"] },
        { name: "Caddy", years: [2004, 2011, 2016, 2021], body: BodyType.VAN, engines: ["1.9 TDI Dizel", "1.6 TDI Dizel", "2.0 TDI Dizel"], trans: ["Manuel", "DSG Otomatik"] }
      ]
    },
    {
      brand: "Renault",
      models: [
        { name: "Clio", years: [2000, 2006, 2012, 2019], body: BodyType.HATCHBACK, engines: ["1.4 Benzin", "1.5 dCi Dizel", "0.9 TCe Benzin", "1.0 TCe Benzin"], trans: ["Manuel", "BVA Otomatik", "EDC Otomatik", "X-Tronic CVT"] },
        { name: "Megane", years: [2003, 2009, 2016], body: BodyType.SEDAN, engines: ["1.6 Benzin", "1.5 dCi Dizel", "1.3 TCe Benzin"], trans: ["Manuel", "BVA Otomatik", "EDC Otomatik"] },
        { name: "Fluence", years: [2010, 2013, 2016], body: BodyType.SEDAN, engines: ["1.6 Benzin", "1.5 dCi Dizel"], trans: ["Manuel", "EDC Otomatik"] },
        { name: "Symbol", years: [2008, 2013], body: BodyType.SEDAN, engines: ["1.4 Benzin", "1.5 dCi Dizel"], trans: ["Manuel"] }
      ]
    },
    {
      brand: "Fiat",
      models: [
        { name: "Punto", years: [2006, 2012], body: BodyType.HATCHBACK, engines: ["1.4 Fire Benzin", "1.3 Multijet Dizel"], trans: ["Manuel", "Dualogic Yarı Otomatik"] },
        { name: "Linea", years: [2007, 2012], body: BodyType.SEDAN, engines: ["1.4 Fire Benzin", "1.3 Multijet Dizel", "1.6 Multijet Dizel"], trans: ["Manuel"] },
        { name: "Egea", years: [2015, 2020], body: BodyType.SEDAN, engines: ["1.4 Fire Benzin", "1.3 Multijet Dizel", "1.6 Multijet Dizel", "1.5 T4 Hibrit"], trans: ["Manuel", "DCT Otomatik"] },
        { name: "Doblo", years: [2005, 2010, 2015], body: BodyType.VAN, engines: ["1.3 Multijet Dizel", "1.6 Multijet Dizel", "1.9 JTD Dizel"], trans: ["Manuel"] }
      ]
    },
    {
      brand: "Ford",
      models: [
        { name: "Fiesta", years: [2004, 2009, 2013, 2018], body: BodyType.HATCHBACK, engines: ["1.4 Benzin", "1.4 TDCi Dizel", "1.0 EcoBoost Benzin", "1.5 TDCi Dizel"], trans: ["Manuel", "Otomatik", "Powershift DCT"] },
        { name: "Focus", years: [2005, 2011, 2015, 2019], body: BodyType.SEDAN, engines: ["1.6 Benzin", "1.6 TDCi Dizel", "1.0 EcoBoost Benzin", "1.5 TDCi Dizel", "1.5 EcoBlue Dizel"], trans: ["Manuel", "Otomatik", "Powershift DCT"] },
        { name: "Mondeo", years: [2008, 2015], body: BodyType.SEDAN, engines: ["2.0 TDCi Dizel", "1.6 TDCi Dizel", "1.5 EcoBoost Benzin"], trans: ["Manuel", "Otomatik", "Powershift DCT"] }
      ]
    },
    {
      brand: "Opel",
      models: [
        { name: "Corsa", years: [2004, 2007, 2015, 2020], body: BodyType.HATCHBACK, engines: ["1.2 Benzin", "1.4 Benzin", "1.3 CDTI Dizel", "1.2 Turbo Benzin"], trans: ["Manuel", "Easytronic Yarı Otomatik", "Otomatik"] },
        { name: "Astra", years: [2005, 2010, 2016, 2022], body: BodyType.HATCHBACK, engines: ["1.6 Benzin", "1.3 CDTI Dizel", "1.4 Turbo Benzin", "1.6 CDTI Dizel", "1.2 Turbo Benzin"], trans: ["Manuel", "Easytronic", "Active Select Otomatik", "AT6 Otomatik"] },
        { name: "Insignia", years: [2009, 2014, 2017], body: BodyType.SEDAN, engines: ["1.6 Turbo Benzin", "2.0 CDTI Dizel", "1.6 CDTI Dizel", "1.5 Turbo Benzin"], trans: ["Manuel", "Active Select Otomatik", "AT6 Otomatik"] }
      ]
    },
    {
      brand: "Toyota",
      models: [
        { name: "Yaris", years: [2004, 2012, 2020], body: BodyType.HATCHBACK, engines: ["1.0 Benzin", "1.33 Benzin", "1.4 D-4D Dizel", "1.5 Hibrit"], trans: ["Manuel", "MMT Yarı Otomatik", "CVT Otomatik"] },
        { name: "Corolla", years: [2004, 2007, 2013, 2019], body: BodyType.SEDAN, engines: ["1.6 Benzin", "1.4 D-4D Dizel", "1.8 Hibrit", "1.5 Benzin"], trans: ["Manuel", "MMT Yarı Otomatik", "CVT Otomatik"] },
        { name: "Auris", years: [2007, 2013], body: BodyType.HATCHBACK, engines: ["1.6 Benzin", "1.4 D-4D Dizel", "1.33 Benzin"], trans: ["Manuel", "MMT Yarı Otomatik", "CVT Otomatik"] }
      ]
    },
    {
      brand: "Honda",
      models: [
        { name: "Civic", years: [2004, 2007, 2012, 2016, 2021], body: BodyType.SEDAN, engines: ["1.6 i-VTEC Benzin", "1.6 i-DTEC Dizel", "1.5 VTEC Turbo Benzin"], trans: ["Manuel", "Tork Konvertörlü Otomatik", "CVT Otomatik"] },
        { name: "Accord", years: [2004, 2008, 2021], body: BodyType.SEDAN, engines: ["2.0 i-VTEC Benzin", "2.4 i-VTEC Benzin", "1.5 VTEC Turbo Benzin"], trans: ["Otomatik", "CVT Otomatik"] }
      ]
    },
    {
      brand: "Hyundai",
      models: [
        { name: "i10", years: [2008, 2014, 2020], body: BodyType.HATCHBACK, engines: ["1.1 Benzin", "1.2 Benzin", "1.0 Benzin"], trans: ["Manuel", "Otomatik"] },
        { name: "i20", years: [2009, 2015, 2020], body: BodyType.HATCHBACK, engines: ["1.4 Benzin", "1.4 CRDi Dizel", "1.0 T-GDI Benzin"], trans: ["Manuel", "Otomatik", "DCT Otomatik"] },
        { name: "i30", years: [2008, 2012, 2017], body: BodyType.HATCHBACK, engines: ["1.6 Benzin", "1.6 CRDi Dizel"], trans: ["Manuel", "Otomatik", "DCT Otomatik"] },
        { name: "Tucson", years: [2005, 2015, 2021], body: BodyType.SUV, engines: ["2.0 CRDi Dizel", "1.6 T-GDI Benzin", "1.6 CRDi Dizel"], trans: ["Otomatik", "DCT Otomatik"] }
      ]
    },
    {
      brand: "Mercedes-Benz",
      models: [
        { name: "C-Class", years: [2007, 2014, 2021], body: BodyType.SEDAN, engines: ["C180 1.6 Benzin", "C200d 1.6 Dizel", "C200 1.5 Benzin Mild-Hybrid"], trans: ["7G-Tronic Otomatik", "9G-Tronic Otomatik"] },
        { name: "E-Class", years: [2009, 2016, 2023], body: BodyType.SEDAN, engines: ["E250 2.0 Benzin", "E220d 2.0 Dizel", "E180 1.6 Benzin"], trans: ["7G-Tronic Otomatik", "9G-Tronic Otomatik"] }
      ]
    },
    {
      brand: "BMW",
      models: [
        { name: "3 Series", years: [2005, 2012, 2019], body: BodyType.SEDAN, engines: ["320i 2.0 Benzin", "320d 2.0 Dizel", "318i 1.5 Benzin", "320i 1.6 Benzin"], trans: ["Manuel", "ZF 6 İleri Otomatik", "ZF 8 İleri Otomatik"] },
        { name: "5 Series", years: [2004, 2010, 2017], body: BodyType.SEDAN, engines: ["520d 2.0 Dizel", "520i 2.0 Benzin", "520i 1.6 Benzin"], trans: ["ZF 6 İleri Otomatik", "ZF 8 İleri Otomatik"] }
      ]
    },
    {
      brand: "Audi",
      models: [
        { name: "A3", years: [2004, 2013, 2020], body: BodyType.HATCHBACK, engines: ["1.6 Hit Benzin", "1.4 TFSI Benzin", "1.6 TDI Dizel", "1.5 TFSI Benzin", "30 TFSI 1.0 Benzin", "35 TFSI 1.5 Benzin"], trans: ["Manuel", "S Tronic Çift Kavrama"] },
        { name: "A4", years: [2005, 2008, 2016], body: BodyType.SEDAN, engines: ["2.0 TDI Dizel", "1.8 TFSI Benzin", "1.4 TFSI Benzin", "2.0 TFSI Benzin"], trans: ["Manuel", "Multitronic CVT", "S Tronic Çift Kavrama"] }
      ]
    }
  ];

  for (const b of brandModels) {
    let brand = await prisma.brand.findFirst({ where: { name: b.brand } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { name: b.brand } });
    }

    for (const m of b.models) {
      let model = await prisma.model.findFirst({ where: { brandId: brand.id, name: m.name } });
      if (!model) {
        model = await prisma.model.create({ data: { brandId: brand.id, name: m.name, startYear: m.years[0] } });
      }

      for (const yr of m.years) {
        const genName = `${m.name} ${yr}-${yr + 6}`;
        let gen = await prisma.generation.findFirst({ where: { modelId: model.id, name: genName } });
        if (!gen) {
          gen = await prisma.generation.create({
            data: {
              modelId: model.id,
              name: genName,
              startYear: yr,
              endYear: yr + 6,
              bodyType: m.body,
              description: `${b.brand} ${m.name} ${genName} Jenerasyonu`
            }
          });
        }

        for (const engCode of m.engines) {
          const lowerEng = engCode.toLowerCase();
          const engineMatch = engCode.match(/\b(\d\.\d)\b/);
          const displacement = engineMatch ? Math.round(parseFloat(engineMatch[0]) * 1000) : 1600;
          let fuelType: FuelType = FuelType.PETROL;
          if (lowerEng.includes("dizel") || lowerEng.includes("diesel") || lowerEng.includes("hdi") || lowerEng.includes("tdi") || lowerEng.includes("dci") || lowerEng.includes("cdti") || lowerEng.includes("bluehdi")) {
            fuelType = FuelType.DIESEL;
          } else if (lowerEng.includes("hibrit") || lowerEng.includes("hybrid") || lowerEng.includes("etsi")) {
            fuelType = FuelType.HYBRID;
          } else if (lowerEng.includes("lpg")) {
            fuelType = FuelType.LPG;
          }

          let engine = await prisma.engine.findFirst({ where: { code: engCode } });
          if (!engine) {
            engine = await prisma.engine.create({
              data: {
                code: engCode,
                displacement,
                horsepower: lowerEng.includes("2.0") ? 150 : 110,
                torque: fuelType === FuelType.DIESEL ? 240 : 150,
                fuelType,
                hasTurbo: lowerEng.includes("turbo") || lowerEng.includes("tsi") || lowerEng.includes("tfsi") || fuelType === FuelType.DIESEL
              }
            });
          }

          for (const trName of m.trans) {
            const lowerTr = trName.toLowerCase();
            let transType: TransmissionType = TransmissionType.AUTOMATIC;
            if (lowerTr.includes("manuel") || lowerTr.includes("düz")) {
              transType = TransmissionType.MANUAL;
            } else if (lowerTr.includes("dsg") || lowerTr.includes("s tronic") || lowerTr.includes("edc") || lowerTr.includes("dct")) {
              transType = TransmissionType.DCT;
            } else if (lowerTr.includes("cvt") || lowerTr.includes("x-tronic")) {
              transType = TransmissionType.CVT;
            }

            let trans = await prisma.transmission.findFirst({ where: { name: trName } });
            if (!trans) {
              trans = await prisma.transmission.create({
                data: {
                  name: trName,
                  type: transType,
                  speeds: lowerTr.includes("8") ? 8 : lowerTr.includes("7") ? 7 : 6
                }
              });
            }

            const trimName = "Standart Paket";
            let trim = await prisma.trim.findFirst({ where: { name: trimName } });
            if (!trim) {
              trim = await prisma.trim.create({
                data: { name: trimName, description: "Standart donanım seviyesi" }
              });
            }

            const existingVariant = await prisma.vehicleVariant.findFirst({
              where: {
                modelId: model.id,
                generationId: gen.id,
                engineId: engine.id,
                transmissionId: trans.id,
                year: yr
              }
            });

            if (!existingVariant) {
              await prisma.vehicleVariant.create({
                data: {
                  brandId: brand.id,
                  modelId: model.id,
                  generationId: gen.id,
                  engineId: engine.id,
                  transmissionId: trans.id,
                  trimId: trim.id,
                  countryId: countryTr.id,
                  year: yr,
                  status: ApprovalStatus.APPROVED,
                  createdById: demoAdmin.id,
                  approvedById: demoAdmin.id,
                  approvedAt: new Date()
                }
              });
            }
          }
        }
      }
    }
  }

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
