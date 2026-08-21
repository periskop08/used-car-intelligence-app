import { PrismaClient, GuideFactType } from '@prisma/client';

const prisma = new PrismaClient();

interface RichFact {
  titleTr: string;
  descTr: string;
  titleEn: string;
  descEn: string;
  iconKey: string;
}

const CARD3_MAP: Record<string, RichFact> = {
  "Audi|A3|A3 8V": {
    titleTr: "S-TRONIC VİTES GEÇİŞLERİ VE KAVRAMA UYUMU",
    descTr: "7 ileri kuru tip S-Tronic (DQ200) şanzımanın dur-kalk trafikteki kavrama tepkilerine ve mekatronik basınç kararlılığına dikkat edilmelidir.",
    titleEn: "S-Tronic Gear Engagement & Clutch Feeling",
    descEn: "Pay attention to 7-speed dry S-Tronic (DQ200) clutch behavior in stop-and-go traffic and mechatronic pressure stability.",
    iconKey: "gearbox"
  },
  "Mercedes-Benz|C Serisi|C Serisi W206": {
    titleTr: "MBUX YAZILIM GÜNCELLEMESİ VE EQ BOOST HİBRİT",
    descTr: "Dikey 11.9 inç MBUX multimedya ekran yazılımının güncelliği ve 48V hafif hibrit EQ Boost marş jeneratörünün voltaj kararlılığı sürüş akıcılığını etkiler.",
    titleEn: "MBUX Software Update & EQ Boost Hybrid",
    descEn: "The 11.9-inch vertical MBUX screen software version and 48V EQ Boost mild-hybrid starter-generator stability impact drive smoothness.",
    iconKey: "screen"
  },
  "Opel|Astra|Astra L": {
    titleTr: "EAT8 ŞANZIMAN UYUMU VE SÜRÜŞ YALITIMI",
    descTr: "Stellantis EMP2 v3 platformunda yükselen Astra L, Aisin üretimi EAT8 tork konvertörlü şanzımanın pürüzsüz vites geçişleri ve rüzgar izolasyonu ile öne çıkar.",
    titleEn: "EAT8 Transmission Match & Cabin Refinement",
    descEn: "Built on EMP2 v3 platform, Astra L excels with Aisin-sourced EAT8 torque-converter smoothness and aerodynamic wind isolation.",
    iconKey: "gearbox"
  },
  "Volkswagen|Passat|Passat B8": {
    titleTr: "IQ.LIGHT MATRIX LED FAR VE 586 LİTRE BAGAJ",
    descTr: "Passat B8 makyajlı kasadaki adaptif IQ.Light Matrix far sistemi karşıdan gelen aracı maskelerken 586 litrelik bagaj hacmiyle sınıf lideridir.",
    titleEn: "IQ.Light Matrix LED & 586L Boot Capacity",
    descEn: "Facelifted B8's adaptive IQ.Light Matrix headlights mask oncoming traffic while 586 liters of boot space maintains D-segment leadership.",
    iconKey: "headlight"
  },
  "Volkswagen|Golf|Golf 7": {
    titleTr: "MQB PLATFORM HAFİFLİĞİ VE KABİN ERGONOMİSİ",
    descTr: "Golf 7'nin MQB mimarisi sayesindeki hafif gövdesi, zamansız kabin ergonomisi ve mükemmel görüş açıları sınıf standartlarını belirler.",
    titleEn: "MQB Weight Savings & Ergonomic Layout",
    descEn: "Golf 7's lightweight MQB architecture, timeless cabin ergonomics, and clear visibility lines define compact hatchback standards.",
    iconKey: "interior"
  },
  "Toyota|Corolla|Corolla E210": {
    titleTr: "1.8 HYBRID e-CVT VE ŞEHİR İÇİ TÜKETİM",
    descTr: "e-CVT gezegen dişli şanzıman sistemi şehir içi sıkışık trafikte 3.8 - 4.2 L/100 km gerçek tüketim değerleri ve kesintisiz ivmelenme sunar.",
    titleEn: "1.8 Hybrid e-CVT & Urban Fuel Economy",
    descEn: "e-CVT planetary gear transmission achieves 3.8 - 4.2 L/100km real-world urban consumption with seamless electric acceleration.",
    iconKey: "battery"
  },
  "Peugeot|3008|3008 II": {
    titleTr: "i-COCKPİT DİREKSİYON HİSSİ VE EAT8 VİTES",
    descTr: "Küçük çaplı i-Cockpit direksiyonu çevik manevra kabiliyeti sağlarken, EAT8 tork konvertörlü vites sarsıntısız oran değişimleri sunar.",
    titleEn: "i-Cockpit Layout & EAT8 Torque-Converter Auto",
    descEn: "Compact i-Cockpit steering wheel sharpens cornering response while 8-speed Aisin EAT8 automatic delivers seamless gear changes.",
    iconKey: "gearbox"
  },
  "Peugeot|2008|2008 II": {
    titleTr: "3D i-COCKPİT VE 434 LİTRE BAGAJ KULLANIMI",
    descTr: "3D hayalet gösterge paneli ve genişletilmiş 434 litrelik bagaj alanıyla B-SUV segmentinde hem dijital lüks hem pratiklik sunar.",
    titleEn: "3D i-Cockpit Display & 434L Trunk Flexibility",
    descEn: "3D holographic instrument cluster and generous 434-liter boot deliver digital sophistication and everyday SUV usability.",
    iconKey: "screen"
  },
  "Fiat|Egea|Egea Sedan": {
    titleTr: "1.3 MULTIJET VE YÜKSEK İKİNCİ EL LİKİDİTESİ",
    descTr: "1.3 MultiJet motorun düşük işletme maliyeti, geniş 520 litrelik bagaj hacmi ve Türkiye geneli anında nakde çevrilebilir pazar payı büyüktür.",
    titleEn: "1.3 MultiJet Efficiency & High Market Liquidity",
    descEn: "1.3 MultiJet running economy, massive 520L boot, and unrivaled resale demand across Turkey offer maximum practical value.",
    iconKey: "price"
  },
  "Renault|Clio|Clio 5": {
    titleTr: "1.0 TCe X-TRONIC VE SOFT-TOUCH KABİN",
    descTr: "Yenilenen konsol malzeme kalitesi ve 1.0 TCe motorun sarsıntısız CVT (X-Tronic) uyumu kabin sessizliğini ve konforunu artırır.",
    titleEn: "1.0 TCe X-Tronic CVT & Soft-Touch Interior",
    descEn: "Upgraded soft-touch dash materials and smooth 1.0 TCe X-Tronic CVT pairing elevate cabin noise refinement and ride comfort.",
    iconKey: "interior"
  },
  "Renault|Megane|Megane 4": {
    titleTr: "1.3 TCe EDC ŞANZIMAN VE C-SHAPE LED İMZASI",
    descTr: "Mercedes ile ortak geliştirilen 1.3 TCe motorun 7 ileri ıslak EDC vitesle uyumu performanslı ve akıcı bir otoyol sürüşü sunar.",
    titleEn: "1.3 TCe EDC Gearbox & C-Shape LED Signature",
    descEn: "1.3 TCe engine paired with 7-speed wet dual-clutch EDC delivers lively performance and smooth highway cruising.",
    iconKey: "gearbox"
  },
  "BMW|3 Serisi|3 Serisi G20": {
    titleTr: "50:50 AĞIRLIK DAĞILIMI VE ZF 8HP ŞANZIMAN",
    descTr: "G20 şasisinin mükemmel ön/arka ağırlık dengesi ve ZF 8HP tork konvertörlü vites kutusu D segmentinde rakipsiz sürüş hissi sunar.",
    titleEn: "50:50 Weight Distribution & ZF 8HP Gearbox",
    descEn: "G20 chassis 50:50 weight balance and lightning-quick ZF 8-speed torque converter transmission deliver benchmark rear-drive dynamics.",
    iconKey: "gearbox"
  }
};

const CARD4_MAP: Record<string, RichFact> = {
  "Audi|A3|A3 8V": {
    titleTr: "KONFORLU SÜRÜŞ DENEYİMİ",
    descTr: "Kullanıcılar, Audi A3 8V'in yol tutuşunu, süspansiyon konforunu ve motor performansını genellikle çok olumlu bir şekilde değerlendiriyorlar.",
    titleEn: "Comfortable Driving Experience",
    descEn: "Users rate Audi A3 8V's road holding, suspension comfort, and overall engine responsiveness very positively.",
    iconKey: "user"
  },
  "Mercedes-Benz|C Serisi|C Serisi W206": {
    titleTr: "KONFOR VE PERFORMANS DENGESİ",
    descTr: "Kullanıcılar, C Serisi W206'nın konforlu sürüşü ve performansı arasında mükemmel bir denge sunduğunu belirtmektedir. Özellikle uzun yolculuklarda bu özellikler ön plana çıkıyor.",
    titleEn: "Comfort & Performance Balance",
    descEn: "Drivers state that the C-Class W206 offers an excellent balance between ride comfort and road performance.",
    iconKey: "user"
  },
  "Opel|Astra|Astra L": {
    titleTr: "SÜRÜŞ DİNAMİKLERİ",
    descTr: "Kullanıcılar, Astra L'in sürüş dinamiklerini genellikle olumlu değerlendiriyor. Yol tutuşu ve direksiyon hissi, özellikle virajlı yollarda güven veriyor.",
    titleEn: "Driving Dynamics",
    descEn: "Users evaluate Astra L's driving dynamics positively. Handling and steering feedback provide confidence on twisty roads.",
    iconKey: "user"
  }
};

function getFallbackCard3(brand: string, model: string, gen: string): RichFact {
  return {
    titleTr: `${brand.toUpperCase()} ${model.toUpperCase()} SÜRÜŞ VE ŞASİ KARAKTERİ`,
    descTr: `${brand} ${model} (${gen}), süspansiyon konforu, kabin ergonomisi ve segment standartlarındaki yükleme kapasitesiyle dengeli bir sürüş vaat eder.`,
    titleEn: `${brand.toUpperCase()} ${model.toUpperCase()} RIDE & CHASSIS CHARACTER`,
    descEn: `${brand} ${model} (${gen}) delivers balanced everyday usability with comfortable damping, ergonomic cabin layout, and generous luggage capacity.`,
    iconKey: "comfort"
  };
}

function getFallbackCard4(brand: string, model: string, gen: string): RichFact {
  return {
    titleTr: "SÜRÜŞ VE KABİN RAHATLIĞI",
    descTr: `Kullanıcılar, ${brand} ${model} modelinin yol tutuşunu, süspansiyon konforunu ve kabin sessizliğini günlük kullanımlarda son derece olumlu değerlendiriyor.`,
    titleEn: "Driving & Cabin Comfort",
    descEn: `Drivers evaluate the ${brand} ${model}'s ride comfort, handling stability, and cabin quietness very favorably.`,
    iconKey: "user"
  };
}

async function cleanFactDisplayOrders() {
  console.log("====================================================");
  console.log("🚀 CLEANING FACT DISPLAY ORDERS & SETTING EXACT CARD 3 & CARD 4");
  console.log("====================================================");

  const cards = await prisma.vehicleGuideCard.findMany({
    include: {
      facts: {
        include: { translations: true }
      }
    }
  });

  console.log(`Processing ${cards.length} cards...`);

  for (const card of cards) {
    if (card.facts.length < 4) continue;

    const exactKey = `${card.brand}|${card.model}|${card.generationName}`;

    // Card 3 Fact Data
    let richCard3 = CARD3_MAP[exactKey];
    if (!richCard3) {
      const found = Object.entries(CARD3_MAP).find(([k]) => k.startsWith(`${card.brand}|${card.model}`));
      richCard3 = found ? found[1] : getFallbackCard3(card.brand, card.model, card.generationName);
    }

    // Card 4 Fact Data
    let richCard4 = CARD4_MAP[exactKey];
    if (!richCard4) {
      richCard4 = getFallbackCard4(card.brand, card.model, card.generationName);
    }

    // Sort facts by id or existing displayOrder to get deterministic 4 items
    const facts = [...card.facts].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    // Fact 1 (displayOrder: 1)
    await prisma.vehicleGuideFact.update({
      where: { id: facts[0].id },
      data: { displayOrder: 1 }
    });

    // Fact 2 (displayOrder: 2)
    await prisma.vehicleGuideFact.update({
      where: { id: facts[1].id },
      data: { displayOrder: 2 }
    });

    // Fact 3 (displayOrder: 3) - RICH MODEL TIP
    await prisma.vehicleGuideFact.update({
      where: { id: facts[2].id },
      data: {
        title: richCard3.titleTr,
        description: richCard3.descTr,
        iconKey: richCard3.iconKey,
        factType: GuideFactType.BUYING_TIP,
        displayOrder: 3
      }
    });
    const tr3 = facts[2].translations.find(t => t.locale === 'tr');
    if (tr3) {
      await prisma.vehicleGuideFactTranslation.update({
        where: { id: tr3.id },
        data: { title: richCard3.titleTr, description: richCard3.descTr }
      });
    }

    // Fact 4 (displayOrder: 4) - USER EXPERIENCE / DRIVING DYNAMICS
    await prisma.vehicleGuideFact.update({
      where: { id: facts[3].id },
      data: {
        title: richCard4.titleTr,
        description: richCard4.descTr,
        iconKey: richCard4.iconKey,
        factType: GuideFactType.USER_EXPERIENCE,
        displayOrder: 4
      }
    });
    const tr4 = facts[3].translations.find(t => t.locale === 'tr');
    if (tr4) {
      await prisma.vehicleGuideFactTranslation.update({
        where: { id: tr4.id },
        data: { title: richCard4.titleTr, description: richCard4.descTr }
      });
    }
  }

  console.log("====================================================");
  console.log("✅ SUCCESS: Fixed display orders (1, 2, 3, 4) and set rich Card 3 across all cards!");
  console.log("====================================================");
}

cleanFactDisplayOrders()
  .catch(err => {
    console.error("Fatal error cleaning fact display orders:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
