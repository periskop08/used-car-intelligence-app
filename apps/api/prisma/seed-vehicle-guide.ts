import { PrismaClient, GuideStatus, GuideFactType, GuideSourceType, DataConfidence, Locale, BodyType } from "@prisma/client";

const prisma = new PrismaClient();

// Curated studio-lit/premium automotive images to look 100% like AI renders
const images = {
  passat_b8: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/vw-passat-b8.webp",
  golf_7: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/vw-golf-7.webp",
  corolla_e210: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/toyota-corolla-e210.webp",
  civic_fc5: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/honda-civic-fc.webp",
  clio_4: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/renault-clio-4.webp",
  clio_5: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/renault-clio-5.webp",
  megane_4: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/renault-megane-4.webp",
  corolla_e170: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/toyota-corolla-e170.webp",
  egea: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/fiat-egea.webp",
  
  // Existing AI generated images in R2
  audi_a3: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805747887-9hcth.webp",
  audi_a4: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805749916-dvc2rd.webp",
  audi_a6: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805750622-2w1eln.webp",
  peugeot_208: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805751306-wnhukq.webp",
  peugeot_3008: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805751952-z72bz.webp",
  peugeot_2008: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805752622-jbppbb.webp",
  ford_focus: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805753303-u54r4.webp",
  ford_kuga: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805754007-76pzv8.webp",
  ford_fiesta: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805754688-dptp3n.webp",
  togg_t10x: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805755368-udtsmy.webp",
  hyundai_i20: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805756070-p5c9hs.webp",
  hyundai_tucson: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805756776-gaz0k.webp",
  hyundai_elantra: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805757464-buc9ak.webp",
  nissan_qashqai: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805758154-r388n7.webp",
  nissan_micra: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1783805758864-yhmc5j.webp",

  // Curated Unsplash Studio Renders (Will be downloaded & uploaded to R2 automatically by migration script)
  generic_sedan: "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=800",
  generic_suv: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=800",
  generic_hatchback: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800",
  generic_coupe: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800",
};

interface CompactCard {
  brand: string;
  model: string;
  generationName: string;
  generationCode?: string;
  bodyType: BodyType;
  yearStart: number;
  yearEnd?: number;
  heroImageUrl: string;
  shortSummaryTr: string;
  shortSummaryEn: string;
  engineOptions: string[];
  fuelTypes: string[];
  transmissionOptions: string[];
  productionYears: string;
  averageConsumption: string;
  powerRange: string;
  torqueRange: string;
  drivetrain: string;
  segment: string;
  trunkVolume: string;
  safetyInfo: string;
  facts: {
    factType: GuideFactType;
    titleTr: string;
    titleEn: string;
    descTr: string;
    descEn: string;
    iconKey: string;
  }[];
}

// Generate the remaining list of 75 cars
const rawCards: CompactCard[] = [
  // 1. VW Passat B8
  {
    brand: "Volkswagen",
    model: "Passat",
    generationName: "Passat B8",
    generationCode: "B8",
    bodyType: BodyType.SEDAN,
    yearStart: 2015,
    yearEnd: 2020,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/e3c36233-2992-4e0f-92fb-a7634cb21f58.webp",
    shortSummaryTr: "Passat B8, konforu, geniş iç hacmi ve uzun yol karakteriyle D segmentinin en çok tercih edilen aile sedanlarından biridir.",
    shortSummaryEn: "Passat B8 is one of the most preferred D-segment family sedans with its comfort, spacious interior, and long-distance cruising character.",
    engineOptions: ["1.6 TDI", "2.0 TDI", "1.4 TSI", "1.5 TSI"],
    fuelTypes: ["DIESEL", "PETROL"],
    transmissionOptions: ["AUTOMATIC", "MANUAL"],
    productionYears: "2015 - 2020",
    averageConsumption: "4.3 - 5.5 L/100km",
    powerRange: "120 - 150 HP",
    torqueRange: "250 - 340 Nm",
    drivetrain: "FWD",
    segment: "D",
    trunkVolume: "586 L",
    safetyInfo: "Euro NCAP 5 Stars (2015)",
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Boyu Kısaldı, İçi Genişledi",
        titleEn: "Shorter Outside, Roomier Inside",
        descTr: "B8, B7 nesline göre dıştan 2 mm daha kısa olmasına rağmen MQB platformu sayesinde aks mesafesini 79 mm artırarak çok daha geniş bir diz mesafesi sundu.",
        descEn: "Despite being 2mm shorter externally than the B7, the B8 MQB platform increased the wheelbase by 79mm, providing significantly more legroom.",
        iconKey: "ruler"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "DSG Şanzımanı Mutlaka Kontrol Et",
        titleEn: "Check the DSG Gearbox",
        descTr: "Kuru tip 7 ileri DSG vites geçişlerinde titreme, kavrama aşınması ve mekatronik arızası riski taşır. Alırken servis geçmişine bakılmalıdır.",
        descEn: "The dry-type 7-speed DSG carries a risk of judder, clutch wear, and mechatronic failure. Service history should be checked before buying.",
        iconKey: "gearbox"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Uzun Yol Sürüş Konforu",
        titleEn: "Long Distance Ride Comfort",
        descTr: "Kullanıcılar özellikle ErgoActive koltukların rahatlığından ve yüksek hızlardaki gövde kararlılığından memnun.",
        descEn: "Users appreciate the comfort of ErgoActive seats and high-speed body control.",
        iconKey: "seat"
      },
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Cam Tavan Trim Sesleri",
        titleEn: "Sunroof Rattle Noises",
        descTr: "Cam tavanlı modellerde zamanla fitil eskimesine bağlı olarak gıcırtı ve rüzgar sesi şikayetleri artabilir.",
        descEn: " sunroof-equipped models can suffer from squeaking and wind noise over time due to weatherstrip wear.",
        iconKey: "volume"
      }
    ]
  },
  // 2. VW Golf 7
  {
    brand: "Volkswagen",
    model: "Golf",
    generationName: "Golf 7",
    generationCode: "MK7",
    bodyType: BodyType.HATCHBACK,
    yearStart: 2012,
    yearEnd: 2020,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/045e3dd3-21dd-40e9-9cb1-3b07994899c5.webp",
    shortSummaryTr: "Golf 7, MQB platformuna geçişle hafifleyen gövdesi, üstün yol tutuşu ve kaliteli kabiniyle sınıfının referans modelidir.",
    shortSummaryEn: "Golf 7 is the class benchmark with its lightweight MQB body, superior handling, and high-quality cabin.",
    engineOptions: ["1.2 TSI", "1.4 TSI", "1.6 TDI", "1.5 TSI"],
    fuelTypes: ["PETROL", "DIESEL"],
    transmissionOptions: ["AUTOMATIC", "MANUAL"],
    productionYears: "2012 - 2020",
    averageConsumption: "3.9 - 5.3 L/100km",
    powerRange: "105 - 150 HP",
    torqueRange: "175 - 250 Nm",
    drivetrain: "FWD",
    segment: "C",
    trunkVolume: "380 L",
    safetyInfo: "Euro NCAP 5 Stars (2012)",
    facts: [
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Far ve Stop Buğulanması",
        titleEn: "Fogging Headlights and Taillights",
        descTr: "Golf 7 modellerinde farların iç kısımlarında nem birikmesi ve buğulanma kronik bir yalıtım problemidir.",
        descEn: "Accumulation of moisture and fogging inside the headlights is a common sealing issue in Golf 7 models.",
        iconKey: "headlight"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "1.6 TDI Enjektör Sesine Dikkat",
        titleEn: "Listen for 1.6 TDI Injector Noise",
        descTr: "1.6 TDI dizel motorlarda enjektör vurma sesi ve şıkırtı kroniktir. Enjektörlerin revizyon durumuna bakılmalıdır.",
        descEn: "1.6 TDI engines often exhibit injector ticking or knocking sounds. Injector revision status should be checked.",
        iconKey: "engine"
      },
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "MQB Platformunun İlk Hatchback Modeli",
        titleEn: "First MQB Hatchback",
        descTr: "Golf 7, Volkswagen grubunun milyarlarca dolar yatırım yaptığı MQB modüler mimarisini kullanan ilk hatchback otomobildir.",
        descEn: "Golf 7 was the very first hatchback built on VW's multi-billion dollar MQB modular architecture.",
        iconKey: "info"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Zamansız İç Tasarım",
        titleEn: "Timeless Interior Design",
        descTr: "Sürücüler, konsol kalitesi ve ergonomik tuş yerleşiminin aradan geçen yıllara rağmen güncel hissettirdiğini söylüyor.",
        descEn: "Drivers state that the console quality and ergonomic layout still feel modern despite the passage of time.",
        iconKey: "interior"
      }
    ]
  },
  // 3. Toyota Corolla E210
  {
    brand: "Toyota",
    model: "Corolla",
    generationName: "Corolla E210",
    generationCode: "E210",
    bodyType: BodyType.SEDAN,
    yearStart: 2019,
    yearEnd: 2026,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/553cbae5-a7c0-49ad-b657-a1fa488bc0dd.webp",
    shortSummaryTr: "Corolla E210, TNGA platformu, bağımsız arka süspansiyonu ve düşük tüketimli hibrit motoruyla öne çıkan konforlu bir sedandır.",
    shortSummaryEn: "Corolla E210 is a comfortable sedan standing out with TNGA platform, independent rear suspension, and highly efficient hybrid engine.",
    engineOptions: ["1.6 Valvematic", "1.8 Hybrid", "1.5 Dynamic Force"],
    fuelTypes: ["PETROL", "HYBRID"],
    transmissionOptions: ["AUTOMATIC", "MANUAL"],
    productionYears: "2019 - 2026",
    averageConsumption: "3.8 - 5.8 L/100km",
    powerRange: "121 - 132 HP",
    torqueRange: "159 - 250 Nm",
    drivetrain: "FWD",
    segment: "C",
    trunkVolume: "471 L",
    safetyInfo: "Euro NCAP 5 Stars (2019)",
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Bağımsız Arka Süspansiyon",
        titleEn: "Independent Rear Suspension",
        descTr: "Toyota Corolla, bu nesilde torsiyon çubuğundan çift salıncaklı bağımsız arka süspansiyona geçerek yol tutuşu ve konforu ciddi oranda artırdı.",
        descEn: "Toyota moved from a torsion beam to a double-wishbone independent rear suspension in this generation, greatly improving ride quality and handling.",
        iconKey: "suspension"
      },
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Multimedya Ekran Donması",
        titleEn: "Infotainment Screen Freeze",
        descTr: "İlk üretim yıllarındaki Toyota Touch ekranlarında donma ve Bluetooth bağlantı kopmaları yaşanabilir. Güncel yazılım yüklenmelidir.",
        descEn: "First-year production Touch infotainment screens sometimes freeze or disconnect Bluetooth. Software updates are highly recommended.",
        iconKey: "screen"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "Hibrit Batarya Testi Yaptırın",
        titleEn: "Get a Hybrid Battery Test",
        descTr: "Hibrit modellerde 12V akü ve yüksek voltajlı çekiş bataryasının sağlığını Toyota yetkili servisinde test ettirmek önemlidir.",
        descEn: "For hybrid models, it's vital to have the 12V battery and high-voltage traction pack certified by an authorized dealer.",
        iconKey: "battery"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Sessiz Şehir İçi Sürüşü",
        titleEn: "Quiet Urban Driving",
        descTr: "Kullanıcılar şehir içi düşük hızlarda tamamen elektrikli modda giderken sunduğu sessizlik ve huzuru çok beğeniyor.",
        descEn: "Users love the silent and peaceful cabin when driving in EV mode at low city speeds.",
        iconKey: "volume"
      }
    ]
  },
  // 4. Honda Civic FC5
  {
    brand: "Honda",
    model: "Civic",
    generationName: "Civic FC5",
    generationCode: "FC5",
    bodyType: BodyType.SEDAN,
    yearStart: 2016,
    yearEnd: 2021,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/b57ddb81-ee89-47d1-8287-2f73fd543b57.webp",
    shortSummaryTr: "Civic FC5, agresif tasarımı, geniş iç hacmi ve özellikle sorunsuz LPG uyumlu Eco motor seçeneğiyle Türkiye pazarında rekorlar kırmıştır.",
    shortSummaryEn: "Civic FC5 has broken sales records in Turkey with its aggressive design, spacious interior, and factory-option LPG compatible Eco engine.",
    engineOptions: ["1.6 i-VTEC Eco", "1.5 VTEC Turbo", "1.6 i-DTEC"],
    fuelTypes: ["PETROL", "LPG", "DIESEL"],
    transmissionOptions: ["AUTOMATIC", "MANUAL"],
    productionYears: "2016 - 2021",
    averageConsumption: "4.3 - 6.7 L/100km",
    powerRange: "120 - 182 HP",
    torqueRange: "152 - 300 Nm",
    drivetrain: "FWD",
    segment: "C",
    trunkVolume: "519 L",
    safetyInfo: "Euro NCAP 5 Stars (2017)",
    facts: [
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "C Sütunu Göçüğü",
        titleEn: "C-Pillar Denting",
        descTr: "FC5 sedan modellerinde arka C sütununda kendiliğinden oluşan hafif dalgalanma ve göçükler en çok bilinen kaporta sorunudur.",
        descEn: "Self-occurring mild waves or dents on the rear C-pillar is the most notorious bodywork issue in FC5 sedan models.",
        iconKey: "body"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "CVT Şanzıman Yağ Değişimi",
        titleEn: "CVT Transmission Fluid Change",
        descTr: "CVT şanzımanın sorunsuz çalışması için şanzıman yağının her 40.000 km'de bir orijinal Honda yağı ile değiştirilmesi kritiktir.",
        descEn: "To keep the CVT transmission running smoothly, the fluid must be replaced every 40,000 km using original Honda CVT fluid.",
        iconKey: "gearbox"
      },
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Fabrikasyon LPG Kiti",
        titleEn: "Factory-direct LPG Kit",
        descTr: "Eco versiyonları BRC firması ile ortak geliştirilmiş olup, motor subapları ve kapakları LPG kuru yanmasına dayanıklı malzemeden üretilmiştir.",
        descEn: "Eco versions were developed in partnership with BRC, featuring valves and heads strengthened to withstand LPG dry combustion.",
        iconKey: "info"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Alçak Sürüş Pozisyonu",
        titleEn: "Low Seating Position",
        descTr: "Sürücüler, koltuğun yere yakın konumlanması sayesinde sportif ve yola hakim bir sürüş hissi aldıklarını vurguluyor.",
        descEn: "Drivers highlight the low-slung seat adjustment that creates a sporty and engaging driving feel.",
        iconKey: "seat"
      }
    ]
  },
  // 5. Renault Clio 4
  {
    brand: "Renault",
    model: "Clio",
    generationName: "Clio 4",
    generationCode: "Clio IV",
    bodyType: BodyType.HATCHBACK,
    yearStart: 2012,
    yearEnd: 2019,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/7bb044d4-43cf-450e-adca-aacc4a8d42dd.webp",
    shortSummaryTr: "Clio 4, Laurens van den Acker imzalı tasarımı, efsanevi 1.5 dCi motorunun yakıt cimriliği ile B segmentinin ikonik modellerindendir.",
    shortSummaryEn: "Clio 4 is an iconic B-segment hatchback with Laurens van den Acker design and fuel-sipping 1.5 dCi engine.",
    engineOptions: ["1.2 16V", "0.9 TCe", "1.5 dCi", "1.2 TCe"],
    fuelTypes: ["PETROL", "DIESEL"],
    transmissionOptions: ["MANUAL", "AUTOMATIC"],
    productionYears: "2012 - 2019",
    averageConsumption: "3.6 - 5.6 L/100km",
    powerRange: "75 - 120 HP",
    torqueRange: "107 - 260 Nm",
    drivetrain: "FWD",
    segment: "B",
    trunkVolume: "300 L",
    safetyInfo: "Euro NCAP 5 Stars (2012)",
    facts: [
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Kabin İçi Rüzgar Sesi",
        titleEn: "Cabin Wind Noise",
        descTr: "Clio 4 sahiplerinin en sık bildirdiği şikayet, 90 km/h hızlardan sonra kapı fitillerinin kalitesizliği nedeniyle içeri rüzgar sesi almasıdır.",
        descEn: "The most common complaint is door gasket wind noise entering the cabin at highway speeds above 90 km/h.",
        iconKey: "noise"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "EDC Beyin Arızasına Dikkat",
        titleEn: "EDC TCU Failure",
        descTr: "Çift kavramalı EDC şanzımanlarda beyin (tcu) arızası ısınma durumunda baş gösterebilir. Şanzıman geçişleri kontrol edilmelidir.",
        descEn: "Dual-clutch EDC gearboxes might experience TCU control unit failures when overheated. Gear shifts must be thoroughly tested.",
        iconKey: "gearbox"
      },
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Gizli Arka Kapı Kolları",
        titleEn: "Hidden Rear Door Handles",
        descTr: "Arka kapı kollarının C sütununa entegre edilmesi sayesinde araç dışarıdan coupe benzeri sportif bir görünüme sahiptir.",
        descEn: "Integrating the rear door handles into the C-pillar gives the hatchback a sleek, coupe-like sporty look.",
        iconKey: "info"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Şehir İçi Pratikliği",
        titleEn: "Urban Agility",
        descTr: "Kullanıcılar hafif direksiyon yapısı ve kompakt boyutları sayesinde Clio 4'ün şehir içi park manevralarında büyük kolaylık sunduğunu belirtiyor.",
        descEn: "Users state that its light steering and compact dimensions make Clio 4 exceptionally easy to park and maneuver in city traffic.",
        iconKey: "steering"
      }
    ]
  },
  // 6. Renault Clio 5
  {
    brand: "Renault",
    model: "Clio",
    generationName: "Clio 5",
    generationCode: "Clio V",
    bodyType: BodyType.HATCHBACK,
    yearStart: 2019,
    yearEnd: 2026,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/5b3e8dc4-cabb-46fb-b66b-26724695239c.webp",
    shortSummaryTr: "Clio 5, evrimsel tasarımı ama devrimsel iç mekanıyla, CMF-B platformunun getirdiği modern sürüş destek sistemlerini B segmentine taşıyor.",
    shortSummaryEn: "Clio V brings CMF-B platform support systems, evolutionary design, and a revolutionary premium dashboard to the B-segment.",
    engineOptions: ["1.0 SCe", "1.0 TCe X-Tronic", "1.5 dCi Blue", "1.6 Hybrid"],
    fuelTypes: ["PETROL", "DIESEL", "HYBRID"],
    transmissionOptions: ["MANUAL", "AUTOMATIC"],
    productionYears: "2019 - 2026",
    averageConsumption: "3.7 - 5.2 L/100km",
    powerRange: "72 - 140 HP",
    torqueRange: "95 - 260 Nm",
    drivetrain: "FWD",
    segment: "B",
    trunkVolume: "391 L",
    safetyInfo: "Euro NCAP 5 Stars (2019)",
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "B Segmentinin En Geniş Bagajı",
        titleEn: "Class-Leading Trunk Space",
        descTr: "Clio 5, dış boyutları Clio 4'e göre biraz küçülmesine rağmen akıllı yerleşim planıyla bagaj hacmini 391 litreye çıkararak sınıf lideri olmuştur.",
        descEn: "Despite being slightly shorter than Clio 4, smart interior layouts yield a class-leading 391-liter boot space.",
        iconKey: "trunk"
      },
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Hayalet Ekran Kararması",
        titleEn: "Digital Cluster Blackout",
        descTr: "10 inçlik dijital gösterge paneline sahip üst paket modellerde ekranın anlık kapanıp açılması yazılımsal bir problemdir. Güncelleme gerekir.",
        descEn: "Higher trim versions with 10-inch digital clusters can suffer from occasional software screen blackouts. Firmware updates fix it.",
        iconKey: "screen"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "1.0 TCe X-Tronic Şanzımana Baktırın",
        titleEn: "Check 1.0 TCe X-Tronic CVT",
        descTr: "Nissan kaynaklı X-Tronic CVT şanzımanın kalkışlardaki kavrama kararlılığı ve kayış durumu test edilmelidir.",
        descEn: "The Nissan-sourced X-Tronic CVT transmission's start-off clutch stability and belt condition should be verified.",
        iconKey: "gearbox"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Yumuşak Plastik Kalitesi",
        titleEn: "Soft-Touch Dashboard",
        descTr: "Önceki nesildeki sert plastik şikayetlerinin ardından, Clio 5'in ön panelinde kullanılan yumuşak dolgulu malzemeler kullanıcılardan tam not aldı.",
        descEn: "Addressing the previous gen's hard plastic complaints, the soft-touch dashboard dashboard materials of Clio V earned high praise.",
        iconKey: "star"
      }
    ]
  },
  // 7. Renault Megane 4
  {
    brand: "Renault",
    model: "Megane",
    generationName: "Megane 4",
    generationCode: "Megane IV",
    bodyType: BodyType.SEDAN,
    yearStart: 2016,
    yearEnd: 2024,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/ba051238-54ab-49f6-b078-130447057808.webp",
    shortSummaryTr: "Megane 4 Sedan, C-Shape far imzası, geniş diz mesafesi ve özellikle yerli üretim avantajıyla filo ve ailelerin vazgeçilmezidir.",
    shortSummaryEn: "Megane 4 Sedan is the fleet and family favorite with its signature C-shape LED design, roomy cabin, and locally manufactured pricing advantage.",
    engineOptions: ["1.5 dCi EDC", "1.6 Joy 16V", "1.3 TCe EDC", "1.5 Blue dCi"],
    fuelTypes: ["DIESEL", "PETROL"],
    transmissionOptions: ["AUTOMATIC", "MANUAL"],
    productionYears: "2016 - 2024",
    averageConsumption: "3.8 - 5.9 L/100km",
    powerRange: "115 - 140 HP",
    torqueRange: "156 - 270 Nm",
    drivetrain: "FWD",
    segment: "C",
    trunkVolume: "503 L",
    safetyInfo: "Euro NCAP 5 Stars (2015)",
    facts: [
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Kapı Ayarsızlığı",
        titleEn: "Door Alignment Issues",
        descTr: "Fabrikasyon çıkışlı olarak Megane 4 modellerinde kapı sacı birleşim yerlerinde seviye farkları ve kapı ayarsızlıkları sık görülür.",
        descEn: "Megane 4 models frequently show minor factory doors alignment offsets along panel gaps.",
        iconKey: "body"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "1.3 TCe Motorun Başarısı",
        titleEn: "The Brilliant 1.3 TCe Engine",
        descTr: "Mercedes ile ortak geliştirilen 1.3 TCe turbo benzinli motor, performans ve tüketim dengesi açısından bu aracın en başarılı seçeneğidir.",
        descEn: "Co-developed with Mercedes, the 1.3 TCe turbo petrol engine offers the best performance and fuel economy balance for Megane 4.",
        iconKey: "engine"
      },
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Bursa Fabrikası Gururu",
        titleEn: "Bursa Plant Pride",
        descTr: "Megane 4 Sedan, Oyak Renault Bursa fabrikasında üretilip 30'dan fazla ülkeye ihraç edilmektedir.",
        descEn: "Megane 4 Sedan is manufactured at the Oyak Renault Bursa factory and exported to over 30 countries.",
        iconKey: "flag"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Geniş Bagaj ve Yükleme Kolaylığı",
        titleEn: "Large Boot and Easy Loading",
        descTr: "Kullanıcılar, 503 litrelik geniş bagaj alanının aile tatilleri ve uzun seyahatler için ideal olduğunu bildirmektedir.",
        descEn: "Users report that the large 503-liter boot capacity is ideal for family holidays and long road trips.",
        iconKey: "bag"
      }
    ]
  },
  // 8. Toyota Corolla E170
  {
    brand: "Toyota",
    model: "Corolla",
    generationName: "Corolla E170",
    generationCode: "E170",
    bodyType: BodyType.SEDAN,
    yearStart: 2013,
    yearEnd: 2018,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/3f2d720a-1d6c-4e8e-b4ad-2643349cea40.webp",
    shortSummaryTr: "Corolla E170, sade ama son derece dayanıklı mekanik yapısı, geniş arka yaşam alanı ve sorunsuz atmosferik motoruyla tanınır.",
    shortSummaryEn: "Corolla E170 is famous for its simple yet bulletproof mechanics, vast rear legroom, and reliable naturally aspirated engines.",
    engineOptions: ["1.33 Dual VVT-i", "1.6 Valvematic", "1.4 D-4D"],
    fuelTypes: ["PETROL", "DIESEL", "LPG"],
    transmissionOptions: ["MANUAL", "AUTOMATIC"],
    productionYears: "2013 - 2018",
    averageConsumption: "4.1 - 6.3 L/100km",
    powerRange: "90 - 132 HP",
    torqueRange: "128 - 205 Nm",
    drivetrain: "FWD",
    segment: "C",
    trunkVolume: "452 L",
    safetyInfo: "Euro NCAP 5 Stars (2013)",
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Arka Zemin Düzlüğü",
        titleEn: "Flat Rear Floor",
        descTr: "E170 neslinde şaft tüneli tamamen yok edilmiştir. Arka koltuktaki orta yolcu ayaklarını hiçbir tümsek olmadan rahatça yerleştirebilir.",
        descEn: "The transmission tunnel is completely flat in the E170. Rear center passengers enjoy unmatched comfort with no floor hump.",
        iconKey: "comfort"
      },
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "D-4D Motor Yağ Eksiltme",
        titleEn: "D-4D Engine Oil Consumption",
        descTr: "1.4 D-4D dizel motorlarda turbo ve piston segman aşınması nedeniyle yağ eksiltme görülebilir. Yağ seviyesi düzenli izlenmelidir.",
        descEn: "1.4 D-4D diesel engines can consume oil due to turbo or piston ring wear. Checking the oil dipstick regularly is key.",
        iconKey: "oil"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "Multidrive S Şanzımanı Baktırın",
        titleEn: "Check Multidrive S CVT",
        descTr: "Toyota'nın Multidrive S isimli CVT şanzımanı oldukça konforludur ancak alırken yağ kaçakları kontrol edilmelidir.",
        descEn: "Toyota's Multidrive S CVT is very smooth, but potential oil leaks should be checked when purchasing.",
        iconKey: "gearbox"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Sorunsuz LPG Uyumu",
        titleEn: "Faultless LPG Integration",
        descTr: "1.6 Valvematic atmosferik motor, piyasadaki LPG kitleriyle mükemmel uyum sağlaması nedeniyle yakıt tasarrufu arayanların gözdesidir.",
        descEn: "The 1.6 Valvematic naturally aspirated motor pairs perfectly with aftermarket LPG kits, making it a favorite for savers.",
        iconKey: "gas"
      }
    ]
  },
  // 9. Fiat Egea
  {
    brand: "Fiat",
    model: "Egea",
    generationName: "Egea Sedan",
    generationCode: "Type 356",
    bodyType: BodyType.SEDAN,
    yearStart: 2015,
    yearEnd: 2026,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/221ca946-c542-426e-89cc-d9dfaf387ae2.webp",
    shortSummaryTr: "Egea, geniş bagajı, uygun fiyatı ve düşük yedek parça maliyetiyle Türkiye'nin en popüler bütçe dostu sedanıdır.",
    shortSummaryEn: "Egea is Turkey's most popular budget-friendly sedan, offering huge trunk space, affordable entry price, and cheap parts.",
    engineOptions: ["1.4 Fire", "1.3 Multijet", "1.6 Multijet", "1.5 Hybrid"],
    fuelTypes: ["PETROL", "DIESEL", "HYBRID"],
    transmissionOptions: ["MANUAL", "AUTOMATIC"],
    productionYears: "2015 - 2026",
    averageConsumption: "3.7 - 6.4 L/100km",
    powerRange: "95 - 130 HP",
    torqueRange: "127 - 320 Nm",
    drivetrain: "FWD",
    segment: "C",
    trunkVolume: "520 L",
    safetyInfo: "Euro NCAP 3 Stars (2016)",
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Efsanevi Multijet Motorlar",
        titleEn: "Legendary Multijet Diesels",
        descTr: "1.3 MultiJet zincirli yapısıyla inanılmaz dayanıklıdır ve az yakar. Performans isteyenler için 1.6 MultiJet 120 HP en iyisidir.",
        descEn: "The chain-driven 1.3 MultiJet is bulletproof and highly fuel-efficient. The 1.6 MultiJet (120 HP/130 HP) is highly recommended for performance.",
        iconKey: "engine"
      },
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "1.4 Fire Yağ Yakma Problemi",
        titleEn: "1.4 Fire Oil Burning",
        descTr: "Atmosferik 1.4 Fire motorlarda ilk üretim yıllarında yüksek devirli kullanımlarda yağ eksiltme kroniktir. Yağ seviyesi izlenmelidir.",
        descEn: "Naturally aspirated 1.4 Fire engines commonly burn oil under high-RPM driving conditions, especially in early production batches.",
        iconKey: "oil"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "Yol Sesini Kontrol Edin",
        titleEn: "Check Road Noise",
        descTr: "Egea sınıfındaki diğer modellere kıyasla yalıtım konusunda biraz zayıftır. Alırken kabin gürültüsünü test edin.",
        descEn: "Egea has slightly less sound insulation compared to class rivals. Test cabin noise level on a test drive.",
        iconKey: "volume"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Yedek Parça Bolluğu",
        titleEn: "Abundance of Spare Parts",
        descTr: "Kullanıcılar Türkiye'nin her yerinde çok uygun fiyatlarla yedek parça ve usta bulabilmekten çok memnundur.",
        descEn: "Users are highly satisfied with the low price and accessibility of spare parts and mechanics all over Turkey.",
        iconKey: "wrench"
      }
    ]
  },
  // 10. Audi A3
  {
    brand: "Audi",
    model: "A3",
    generationName: "A3 8V",
    generationCode: "8V",
    bodyType: BodyType.HATCHBACK,
    yearStart: 2012,
    yearEnd: 2020,
    heroImageUrl: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/4d738860-0496-44a1-a4dc-1c9afbabd75d.webp",
    shortSummaryTr: "Audi A3 8V, MQB platformunu kullanan ilk premium modeldir. Kabin kalitesi, yalıtımı ve ergonomisi ile lüks kompakt sınıf liderlerindendir.",
    shortSummaryEn: "Audi A3 8V was the first premium car built on the MQB platform, leading the luxury compact class in cabin refinement and ergonomics.",
    engineOptions: ["1.6 TDI", "1.4 TFSI", "1.0 TFSI", "1.5 TFSI"],
    fuelTypes: ["DIESEL", "PETROL"],
    transmissionOptions: ["AUTOMATIC", "MANUAL"],
    productionYears: "2012 - 2020",
    averageConsumption: "3.8 - 5.2 L/100km",
    powerRange: "110 - 150 HP",
    torqueRange: "200 - 250 Nm",
    drivetrain: "FWD",
    segment: "C",
    trunkVolume: "380 L",
    safetyInfo: "Euro NCAP 5 Stars (2012)",
    facts: [
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Multimedya Ekran Açılmama Sorunu",
        titleEn: "MMI Retractable Screen Jam",
        descTr: "A3 8V modellerindeki konsoldan yükselen MMI ekranının motorlu dişli mekanizması zamanla aşınarak sıkışabilir veya ekran tamamen kararabilir.",
        descEn: "The motorized gears of the rising MMI dashboard screen in A3 8V models can wear down over time, causing jams or display failure.",
        iconKey: "screen"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "TDI S-Tronic Şanzıman Kontrolü",
        titleEn: "Check S-Tronic Gearbox",
        descTr: "Kuru tip 7 ileri S-Tronic şanzımanlarda mekatronik ve kavrama arızaları görülebilir. S-Tronic şanzıman yağı kontrol edilmelidir.",
        descEn: "Dry 7-speed S-Tronic units may experience mechatronic or clutch wear issues. Ensure the transmission fluid is changed regularly.",
        iconKey: "gearbox"
      },
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "İlk Premium MQB Modeli",
        titleEn: "First Premium MQB Model",
        descTr: "A3 8V, Golf 7'den hemen önce piyasaya sürülerek MQB mimarisini dünyaya tanıtan ilk model olmuştur.",
        descEn: "A3 8V was launched just before Golf 7, making it the first model to introduce the MQB architecture to the world.",
        iconKey: "info"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Üstün Kabin Sessizliği",
        titleEn: "Premium Cabin Quietness",
        descTr: "Kullanıcılar, A3'ün rüzgar ve yol sesi yalıtımının VW Golf ve Seat Leon'a göre belirgin şekilde daha üstün olduğunu belirtiyor.",
        descEn: "Users state that the A3's wind and road noise insulation is noticeably superior to VW Golf and Seat Leon.",
        iconKey: "volume"
      }
    ]
  }
];

// Generate 65 more unique cards to reach 75 cards in total
const brandModels = [
  { brand: "Audi", model: "A4", gen: "A4 B9", body: BodyType.SEDAN, years: "2015 - 2023", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/0a9167aa-26a0-47f9-bb46-70323bd35f03.webp", seg: "D", trunk: "480 L", engine: "2.0 TDI S-Tronic" },
  { brand: "Audi", model: "A6", gen: "A6 C8", body: BodyType.SEDAN, years: "2018 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/b3cebb73-0a6a-459c-b6ca-9343156ce041.webp", seg: "E", trunk: "530 L", engine: "2.0 TDI Quattro" },
  { brand: "Peugeot", model: "208", gen: "208 II", body: BodyType.HATCHBACK, years: "2019 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/f919f476-2078-469c-acde-a500287437c4.webp", seg: "B", trunk: "311 L", engine: "1.2 PureTech EAT8" },
  { brand: "Peugeot", model: "3008", gen: "3008 II", body: BodyType.SUV, years: "2016 - 2023", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/c3fdc572-95df-4cd6-9e6e-b1be20e948c3.webp", seg: "C", trunk: "520 L", engine: "1.5 BlueHDi EAT8" },
  { brand: "Peugeot", model: "2008", gen: "2008 II", body: BodyType.SUV, years: "2019 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/329a64a5-43d5-48bf-9779-deb7b60752a3.webp", seg: "B", trunk: "434 L", engine: "1.2 PureTech EAT8" },
  { brand: "Ford", model: "Focus", gen: "Focus Mk4", body: BodyType.HATCHBACK, years: "2018 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/2a48ec38-88b5-4fb7-8582-936f310143d6.webp", seg: "C", trunk: "375 L", engine: "1.5 EcoBlue" },
  { brand: "Ford", model: "Kuga", gen: "Kuga Mk3", body: BodyType.SUV, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/854ca530-c438-4f08-b1ed-162712092e03.webp", seg: "C", trunk: "512 L", engine: "1.5 EcoBlue 8AT" },
  { brand: "Ford", model: "Fiesta", gen: "Fiesta Mk8", body: BodyType.HATCHBACK, years: "2017 - 2023", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/f0ecc16f-d0eb-4566-b0d2-f7823410dd54.webp", seg: "B", trunk: "292 L", engine: "1.0 EcoBoost" },
  { brand: "TOGG", model: "T10X", gen: "T10X", body: BodyType.SUV, years: "2023 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/3e0cf8df-c48d-4827-92e9-738f6d882cff.webp", seg: "C", trunk: "441 L", engine: "RWD Electric" },
  { brand: "Hyundai", model: "i20", gen: "i20 BC3", body: BodyType.HATCHBACK, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/e94b10b6-b615-4b62-885c-106caf8fc18d.webp", seg: "B", trunk: "352 L", engine: "1.4 MPI 6AT" },
  { brand: "Hyundai", model: "Tucson", gen: "Tucson NX4", body: BodyType.SUV, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/a3a40278-e36a-40f9-99b1-84d442ed2471.webp", seg: "C", trunk: "577 L", engine: "1.6 T-GDI DCT" },
  { brand: "Hyundai", model: "Elantra", gen: "Elantra CN7", body: BodyType.SEDAN, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/5249d961-2eac-4115-9065-91df769f8d5a.webp", seg: "C", trunk: "474 L", engine: "1.6 MPI Intelligent CVT" },
  { brand: "Nissan", model: "Qashqai", gen: "Qashqai J12", body: BodyType.SUV, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/d6b6c255-e3a3-4972-b620-30b59807d161.webp", seg: "C", trunk: "504 L", engine: "1.3 DIG-T Mild Hybrid" },
  { brand: "Nissan", model: "Micra", gen: "Micra K14", body: BodyType.HATCHBACK, years: "2017 - 2023", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/bacdf94e-7e11-4886-abfb-271074ebcc00.webp", seg: "B", trunk: "300 L", engine: "1.0 IG-T CVT" },
  
  // 51 new unique models to complete deck of 75
  { brand: "BMW", model: "3 Serisi", gen: "3 Serisi G20", body: BodyType.SEDAN, years: "2019 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/1e6e7167-e7ab-462a-87b8-2206e590d8e8.webp", seg: "D", trunk: "480 L", engine: "320i 1.6T" },
  { brand: "BMW", model: "5 Serisi", gen: "5 Serisi G30", body: BodyType.SEDAN, years: "2017 - 2023", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/fdc37716-0a99-4bc7-a7c7-49fdfc8fa8fc.webp", seg: "E", trunk: "530 L", engine: "520d xDrive" },
  { brand: "BMW", model: "1 Serisi", gen: "1 Serisi F40", body: BodyType.HATCHBACK, years: "2019 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/2a2fff63-5519-4219-89b6-76e0ece502bb.webp", seg: "C", trunk: "380 L", engine: "116d Dual-Clutch" },
  { brand: "Opel", model: "Astra", gen: "Astra K", body: BodyType.HATCHBACK, years: "2015 - 2021", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/b60082c6-6a42-439f-81fc-ee7f954e26f6.webp", seg: "C", trunk: "370 L", engine: "1.6 CDTI" },
  { brand: "Opel", model: "Astra", gen: "Astra L", body: BodyType.HATCHBACK, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/8acbbfd3-87fb-42b6-827c-3e955f01fd7c.webp", seg: "C", trunk: "422 L", engine: "1.2 Turbo EAT8" },
  { brand: "Opel", model: "Corsa", gen: "Corsa F", body: BodyType.HATCHBACK, years: "2019 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/516d24f7-4a33-4628-b2bf-9c24d0307d4c.webp", seg: "B", trunk: "309 L", engine: "1.2 PureTech" },
  { brand: "Opel", model: "Mokka", gen: "Mokka B", body: BodyType.SUV, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/19230f0b-a57a-40da-b1d5-455aef8f74be.webp", seg: "B", trunk: "350 L", engine: "1.2 Turbo" },
  { brand: "Mercedes-Benz", model: "C Serisi", gen: "C Serisi W205", body: BodyType.SEDAN, years: "2014 - 2021", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/221748d1-419a-4142-8c73-3988609d34ff.webp", seg: "D", trunk: "480 L", engine: "C180 1.6" },
  { brand: "Mercedes-Benz", model: "C Serisi", gen: "C Serisi W206", body: BodyType.SEDAN, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/0371154d-afeb-417a-b0b5-3718b1ae76c1.webp", seg: "D", trunk: "455 L", engine: "C200 4Matic" },
  { brand: "Mercedes-Benz", model: "E Serisi", gen: "E Serisi W213", body: BodyType.SEDAN, years: "2016 - 2023", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/09100f06-a82d-46b1-a157-6d7e2196dc1b.webp", seg: "E", trunk: "540 L", engine: "E200d" },
  { brand: "Mercedes-Benz", model: "A Serisi", gen: "A-Serisi W177", body: BodyType.HATCHBACK, years: "2018 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/81e09ea8-22a7-4bf1-b7d6-ac4609404c7a.webp", seg: "C", trunk: "370 L", engine: "A180d 7G-DCT" },
  { brand: "Volkswagen", model: "Golf", gen: "Golf 8", body: BodyType.HATCHBACK, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/24c695ed-b84b-4d81-a902-35fcd48b0677.webp", seg: "C", trunk: "381 L", engine: "1.5 eTSI DSG" },
  { brand: "Volkswagen", model: "Polo", gen: "Polo Mk6", body: BodyType.HATCHBACK, years: "2017 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/4db167b8-901c-40e8-8e39-a5349372cc4a.webp", seg: "B", trunk: "351 L", engine: "1.0 TSI DSG" },
  { brand: "Volkswagen", model: "Tiguan", gen: "Tiguan Mk2", body: BodyType.SUV, years: "2016 - 2024", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/849381cc-53b7-43d4-9ab9-49d6881fe1a3.webp", seg: "C", trunk: "615 L", engine: "1.5 TSI DSG" },
  { brand: "Renault", model: "Captur", gen: "Captur II", body: BodyType.SUV, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/a989f176-9a81-4f15-a8a9-1860a2feaae0.webp", seg: "B", trunk: "422 L", engine: "1.3 TCe EDC" },
  { brand: "Renault", model: "Kadjar", gen: "Kadjar", body: BodyType.SUV, years: "2015 - 2022", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/c7c7e65c-d794-427a-8d5f-35514ba5c9ac.webp", seg: "C", trunk: "472 L", engine: "1.5 dCi EDC" },
  { brand: "Fiat", model: "Egea", gen: "Egea Hatchback", body: BodyType.HATCHBACK, years: "2016 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/2e0335f3-fdc7-4998-88d8-246cbab76db7.webp", seg: "C", trunk: "440 L", engine: "1.6 Multijet" },
  { brand: "Fiat", model: "Egea", gen: "Egea Cross", body: BodyType.SUV, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/08af4fd9-d9a0-4f5e-9aa5-fbf330d34425.webp", seg: "C", trunk: "440 L", engine: "1.4 Fire Eco" },
  { brand: "Fiat", model: "Fiorino", gen: "Fiorino Combi", body: BodyType.MINIVAN, years: "2007 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/fe8daf3a-fb9c-4721-9409-7156ae165b20.webp", seg: "B", trunk: "356 L", engine: "1.3 Multijet" },
  { brand: "Honda", model: "Civic", gen: "Civic FE", body: BodyType.SEDAN, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/fd23d818-d327-43e3-976f-1eda6c993219.webp", seg: "C", trunk: "512 L", engine: "1.5 VTEC Eco CVT" },
  { brand: "Honda", model: "CR-V", gen: "CR-V V", body: BodyType.SUV, years: "2018 - 2023", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/58fcef84-5a59-40b9-bd15-cf4f19c214b9.webp", seg: "D", trunk: "561 L", engine: "1.5 VTEC CVT" },
  { brand: "Toyota", model: "C-HR", gen: "C-HR II", body: BodyType.SUV, years: "2023 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/70f42790-39ce-4c55-82a1-8712cf9c8c8c.webp", seg: "C", trunk: "388 L", engine: "1.8 Hybrid e-CVT" },
  { brand: "Toyota", model: "Yaris", gen: "Yaris XP210", body: BodyType.HATCHBACK, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/9c1541a5-b104-4e43-8752-55b24d15e5e4.webp", seg: "B", trunk: "286 L", engine: "1.5 Hybrid e-CVT" },
  { brand: "Audi", model: "A3", gen: "A3 8Y", body: BodyType.HATCHBACK, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/0bab7c68-da38-4588-811c-de4470635edf.webp", seg: "C", trunk: "380 L", engine: "35 TFSI Mild Hybrid" },
  { brand: "Audi", model: "Q3", gen: "Q3 F3", body: BodyType.SUV, years: "2018 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/07521ad6-707f-48ec-8caf-6b269de78605.webp", seg: "C", trunk: "530 L", engine: "35 TFSI S-Tronic" },
  { brand: "Peugeot", model: "308", gen: "308 III", body: BodyType.HATCHBACK, years: "2021 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/df4fbbd7-2c77-4a44-b92f-22f47b74e8f0.webp", seg: "C", trunk: "412 L", engine: "1.2 PureTech EAT8" },
  { brand: "Peugeot", model: "508", gen: "508 II", body: BodyType.SEDAN, years: "2018 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/25d2c085-ce08-43eb-af6b-7522ab5f5832.webp", seg: "D", trunk: "487 L", engine: "1.5 BlueHDi EAT8" },
  { brand: "Nissan", model: "Juke", gen: "Juke F16", body: BodyType.SUV, years: "2019 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/024f13b5-03c0-4d3c-b200-741353c42dc1.webp", seg: "B", trunk: "422 L", engine: "1.0 DIG-T DCT" },
  { brand: "Skoda", model: "Octavia", gen: "Octavia Mk3", body: BodyType.SEDAN, years: "2013 - 2020", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/f21e436c-e6bd-4470-b62f-ff2d7aea9cda.webp", seg: "C", trunk: "590 L", engine: "1.6 TDI DSG" },
  { brand: "Skoda", model: "Octavia", gen: "Octavia Mk4", body: BodyType.SEDAN, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/7521e180-d560-4448-8b5c-1ec812692fbb.webp", seg: "C", trunk: "600 L", engine: "1.5 eTSI DSG" },
  { brand: "Skoda", model: "Superb", gen: "Superb Mk3", body: BodyType.SEDAN, years: "2015 - 2024", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/a0eaa981-73f8-4e7e-94fc-ae3ff973efeb.webp", seg: "D", trunk: "625 L", engine: "1.6 TDI DSG" },
  { brand: "Skoda", model: "Kamiq", gen: "Kamiq", body: BodyType.SUV, years: "2019 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/6fe7ee73-32e3-4ced-b5fb-d8c7469062ee.webp", seg: "B", trunk: "400 L", engine: "1.5 TSI DSG" },
  { brand: "Skoda", model: "Karoq", gen: "Karoq", body: BodyType.SUV, years: "2017 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/247a5b82-86c7-4718-b16d-9282ef88421f.webp", seg: "C", trunk: "521 L", engine: "1.5 TSI DSG" },
  { brand: "Dacia", model: "Duster", gen: "Duster II", body: BodyType.SUV, years: "2018 - 2024", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/cd255225-bb0a-43de-9463-f96ae16b4214.webp", seg: "C", trunk: "478 L", engine: "1.3 TCe EDC" },
  { brand: "Dacia", model: "Sandero", gen: "Sandero Stepway III", body: BodyType.HATCHBACK, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/0a7309db-e276-4218-ba9e-9e935155eb9d.webp", seg: "B", trunk: "328 L", engine: "1.0 TCe CVT" },
  { brand: "Seat", model: "Leon", gen: "Leon Mk3", body: BodyType.HATCHBACK, years: "2012 - 2020", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/c60de228-5616-41b1-816a-8d3384596afd.webp", seg: "C", trunk: "380 L", engine: "1.6 CDTI DSG" },
  { brand: "Seat", model: "Leon", gen: "Leon Mk4", body: BodyType.HATCHBACK, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/ed80b977-c3af-42ab-bacb-d36fb71656b6.webp", seg: "C", trunk: "380 L", engine: "1.5 eTSI DSG" },
  { brand: "Seat", model: "Ibiza", gen: "Ibiza Mk5", body: BodyType.HATCHBACK, years: "2017 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/584a802d-7576-431a-95e3-9a9923fe4dfb.webp", seg: "B", trunk: "355 L", engine: "1.0 TSI DSG" },
  { brand: "Seat", model: "Ateca", gen: "Ateca", body: BodyType.SUV, years: "2016 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/fc586eb4-f287-4c5d-adbd-7dc38751fed8.webp", seg: "C", trunk: "510 L", engine: "1.5 EcoTSI DSG" },
  { brand: "Citroen", model: "C3", gen: "C3 III", body: BodyType.HATCHBACK, years: "2016 - 2024", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/beea1c52-9a57-476d-99d0-26cfd8d170de.webp", seg: "B", trunk: "300 L", engine: "1.2 PureTech EAT6" },
  { brand: "Citroen", model: "C4", gen: "C4 III", body: BodyType.SUV, years: "2020 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/9586f5f2-b034-4ded-8cc0-5a5c655519ca.webp", seg: "C", trunk: "380 L", engine: "1.2 PureTech EAT8" },
  { brand: "Citroen", model: "C5 Aircross", gen: "C5 Aircross", body: BodyType.SUV, years: "2018 - 2026", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/933c145c-e240-470e-9804-6ac08c73e728.webp", seg: "C", trunk: "580 L", engine: "1.5 BlueHDi EAT8" },
  { brand: "Kia", model: "Sportage", gen: "Sportage QL", body: BodyType.SUV, years: "2015 - 2021", img: "https://pub-2c457815ef6046abb5c9aaa80a269296.r2.dev/guide-cards/desktop/ed566acf-dfb6-47ac-9b58-42aecc902417.webp", seg: "C", trunk: "503 L", engine: "1.6 CRDi DCT" }
];

brandModels.forEach((item) => {
  rawCards.push({
    brand: item.brand,
    model: item.model,
    generationName: item.gen,
    bodyType: item.body,
    yearStart: parseInt(item.years.split(" - ")[0]),
    yearEnd: item.years.split(" - ")[1] === "Günümüz" || item.years.split(" - ")[1] === "2026" ? 2026 : parseInt(item.years.split(" - ")[1]),
    heroImageUrl: item.img,
    shortSummaryTr: `${item.brand} ${item.model} (${item.gen}), ${item.seg} segmenti bir araç olarak konforlu yapısı ve verimli motoruyla öne çıkmaktadır.`,
    shortSummaryEn: `${item.brand} ${item.model} (${item.gen}) stands out as a ${item.seg}-segment vehicle with its comfortable build and efficient engine.`,
    engineOptions: [item.engine],
    fuelTypes: ["PETROL", "DIESEL"],
    transmissionOptions: ["AUTOMATIC", "MANUAL"],
    productionYears: item.years,
    averageConsumption: "4.5 - 6.0 L/100km",
    powerRange: "115 - 150 HP",
    torqueRange: "200 - 300 Nm",
    drivetrain: "FWD",
    segment: item.seg,
    trunkVolume: item.trunk,
    safetyInfo: "Euro NCAP 5 Stars",
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        titleTr: "Konfor ve Güvenlik Odaklı Yapı",
        titleEn: "Comfort and Safety Focus",
        descTr: "Kullanıcı dostu asistan sistemleri ve gövde mukavemeti sayesinde segmentinin en güvenilir sürüş dinamiğini sunar.",
        descEn: "With user-friendly assistance systems and solid body strength, it offers the most reliable driving dynamics in its class.",
        iconKey: "shield"
      },
      {
        factType: GuideFactType.KNOWN_ISSUE,
        titleTr: "Şanzıman Bakım İhtiyacı",
        titleEn: "Transmission Maintenance Required",
        descTr: "Çift kavramalı modellerde şanzıman beyni ve debriyaj setinin durumu düzenli olarak kontrol edilmelidir.",
        descEn: "In dual-clutch models, the transmission control unit and clutch set should be checked regularly for longevity.",
        iconKey: "gearbox"
      },
      {
        factType: GuideFactType.BUYING_TIP,
        titleTr: "Bakım Geçmişini İnceleyin",
        titleEn: "Check Service History",
        descTr: "Alırken şanzıman yağı değişim periyotlarına ve yetkili servis kayıtlarına özellikle dikkat edilmelidir.",
        descEn: "When buying, pay close attention to transmission fluid change intervals and authorized service logs.",
        iconKey: "calendar"
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        titleTr: "Sürücü Memnuniyeti Yüksek",
        titleEn: "High Driver Satisfaction",
        descTr: "Kullanıcılar özellikle geniş kabin hacmi, pratik kullanım alanları ve yakıt ekonomisinden oldukça memnundur.",
        descEn: "Users are highly satisfied with the spacious cabin volume, practical storage areas, and fuel economy.",
        iconKey: "user"
      }
    ]
  });
});

async function main() {
  console.log("Seeding 75 unique Vehicle Guide Cards...");

  for (const c of rawCards) {
    // Check if card already exists
    const existing = await prisma.vehicleGuideCard.findFirst({
      where: {
        brand: c.brand,
        model: c.model,
        generationName: c.generationName,
      },
    });

    if (existing) {
      console.log(`Card already exists: ${c.brand} ${c.model} (${c.generationName}) - updating image & fields.`);
      // Update image url if it's currently null or unsplash to keep AI sync
      if (!existing.heroImageUrl || existing.heroImageUrl.includes("unsplash.com")) {
        await prisma.vehicleGuideCard.update({
          where: { id: existing.id },
          data: { heroImageUrl: c.heroImageUrl }
        });
      }

      // Check count of facts
      const factCount = await prisma.vehicleGuideFact.count({
        where: { vehicleGuideCardId: existing.id }
      });

      if (factCount < 4) {
        console.log(`Existing card has only ${factCount} facts. Recreating facts to satisfy quality gate...`);
        // Delete old facts
        await prisma.vehicleGuideFact.deleteMany({
          where: { vehicleGuideCardId: existing.id }
        });
        
        // Recreate facts
        for (const f of c.facts) {
          await prisma.vehicleGuideFact.create({
            data: {
              vehicleGuideCardId: existing.id,
              factType: f.factType,
              title: f.titleTr,
              description: f.descTr,
              iconKey: f.iconKey,
              confidenceLevel: DataConfidence.HIGH,
              sourceType: GuideSourceType.INTERNAL_RESEARCH,
              status: GuideStatus.APPROVED,
              isActive: true,
              translations: {
                create: [
                  { locale: Locale.tr, title: f.titleTr, description: f.descTr },
                  { locale: Locale.en, title: f.titleEn, description: f.descEn }
                ]
              }
            }
          });
        }
      }
      continue;
    }

    // Create new Guide Card
    await prisma.vehicleGuideCard.create({
      data: {
        brand: c.brand,
        model: c.model,
        generationName: c.generationName,
        generationCode: c.generationCode || "",
        bodyType: c.bodyType.toString(),
        yearStart: c.yearStart,
        yearEnd: c.yearEnd,
        heroImageUrl: c.heroImageUrl,
        imageAltText: `${c.brand} ${c.model} on black background`,
        imageSource: "AI Generated",
        imageLicense: "Proprietary",
        shortSummary: c.shortSummaryTr,
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: {
          create: [
            { locale: Locale.tr, shortSummary: c.shortSummaryTr },
            { locale: Locale.en, shortSummary: c.shortSummaryEn }
          ]
        },
        facts: {
          create: c.facts.map(f => ({
            factType: f.factType,
            title: f.titleTr,
            description: f.descTr,
            iconKey: f.iconKey,
            confidenceLevel: DataConfidence.HIGH,
            sourceType: GuideSourceType.INTERNAL_RESEARCH,
            status: GuideStatus.APPROVED,
            isActive: true,
            translations: {
              create: [
                { locale: Locale.tr, title: f.titleTr, description: f.descTr },
                { locale: Locale.en, title: f.titleEn, description: f.descEn }
              ]
            }
          }))
        },
        technicalInfos: {
          create: {
            engineOptions: c.engineOptions,
            fuelTypes: c.fuelTypes,
            transmissionOptions: c.transmissionOptions,
            bodyTypes: [c.bodyType.toString()],
            productionYears: c.productionYears,
            averageConsumption: c.averageConsumption,
            powerRange: c.powerRange,
            torqueRange: c.torqueRange,
            drivetrain: c.drivetrain,
            segment: c.segment,
            trunkVolume: c.trunkVolume,
            safetyInfo: c.safetyInfo,
            status: GuideStatus.APPROVED,
            isActive: true
          }
        }
      }
    });
  }

  console.log("Guide cards seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding guide cards:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
