import { PrismaClient, GuideFactType } from '@prisma/client';

const prisma = new PrismaClient();

interface RichFact {
  titleTr: string;
  descTr: string;
  titleEn: string;
  descEn: string;
  iconKey: string;
}

// Curated model-specific rich automotive guidance facts mapped by exact key combinations
const RICH_FACTS_MAP: Record<string, RichFact> = {
  // Audi
  "Audi|A3|A3 8V": {
    titleTr: "S-TRONIC VİTES GEÇİŞLERİ VE KAVRAMA HİSSİ",
    descTr: "7 ileri kuru tip S-Tronic (DQ200) şanzımanın dur-kalk trafikteki kavrama tepkilerine ve mekatronik basınç kararlılığına dikkat edilmelidir.",
    titleEn: "S-Tronic Gear Engagement & Clutch Feeling",
    descEn: "Pay attention to 7-speed dry S-Tronic (DQ200) clutch behavior in stop-and-go traffic and mechatronic pressure stability.",
    iconKey: "gearbox"
  },
  "Audi|A3|A3 8Y": {
    titleTr: "DİJİTAL KOKPİT VE SHIFT-BY-WIRE VİTES",
    descTr: "8Y kasa A3, shift-by-wire küçük vites seçicisi ve yenilenen MMI dokunmatik paneli ile sürücü odaklı dijital bir kokpit sunar.",
    titleEn: "Digital Cockpit & Shift-by-Wire Selector",
    descEn: "The 8Y A3 features a driver-centric digital cockpit with a shift-by-wire gear selector and updated touch MMI panel.",
    iconKey: "screen"
  },
  "Audi|A4|A4 B9": {
    titleTr: "2.0 TDI S-TRONIC VE KABİN YALITIMI",
    descTr: "MLB Evo platformunda üretilen A4 B9, akustik ön cam seçeneği ve otoyol hızlarındaki düşük rüzgar gürültüsü ile D segmentinde üstün sessizlik sunar.",
    titleEn: "2.0 TDI S-Tronic & Cabin Insulation",
    descEn: "Built on MLB Evo platform, A4 B9 delivers top-tier cabin quietness with optional acoustic glass and low highway wind noise.",
    iconKey: "volume"
  },
  "Audi|A6|A6 C8": {
    titleTr: "QUATTRO ULTRA VE HD MATRIX LED TEKNOLOJİSİ",
    descTr: "Verimlilik odaklı Quattro Ultra dört tekerden çekiş sistemi ve adaptif HD Matrix LED farlar gece otoyol sürüşlerinde maksimum güvenlik ve tutuş sunar.",
    titleEn: "Quattro Ultra & HD Matrix LED Technology",
    descEn: "Efficiency-focused Quattro Ultra AWD and adaptive HD Matrix LED headlights provide peak safety and grip during night highway driving.",
    iconKey: "headlight"
  },
  "Audi|Q3|Q3 F3": {
    titleTr: "KAYDIRILABİLİR ARKA KOLTUK SIRASI VE 530 LİTRE BAGAJ",
    descTr: "15 cm öne kayabilen arka koltuklar sayesinde bagaj hacmi 675 litreye kadar çıkartılarak aile seyahatlerinde büyük esneklik sağlar.",
    titleEn: "Sliding Rear Seat Bench & 530L Trunk",
    descEn: "Rear seats sliding forward by 15cm expand trunk space up to 675 liters, providing great flexibility for family trips.",
    iconKey: "ruler"
  },

  // Mercedes-Benz
  "Mercedes-Benz|C Serisi|C Serisi W206": {
    titleTr: "MBUX YAZILIM GÜNCELLEMESİ VE EQ BOOST HİBRİT",
    descTr: "Dikey 11.9 inç MBUX multimedya ekran yazılımının güncelliği ve 48V hafif hibrit EQ Boost marş jeneratörünün voltaj kararlılığı sürüş akıcılığını etkiler.",
    titleEn: "MBUX Software Update & EQ Boost Hybrid",
    descEn: "The 11.9-inch vertical MBUX screen software version and 48V EQ Boost mild-hybrid starter-generator stability impact drive smoothness.",
    iconKey: "screen"
  },
  "Mercedes-Benz|C Serisi|C Serisi W205": {
    titleTr: "AGILITY CONTROL SÜSPANSİYON VE 9G-TRONIC",
    descTr: "Yola göre sertliği otomatik değişen Agility Control süspansiyon ve 9G-Tronic vites kutusu uzun yolda sarsıntısız ve konforlu bir akıcılık sağlar.",
    titleEn: "Agility Control Suspension & 9G-Tronic",
    descEn: "Agility Control selective damping suspension and 9G-Tronic gearbox deliver vibration-free and smooth long-distance cruising.",
    iconKey: "suspension"
  },
  "Mercedes-Benz|E Serisi|E Serisi W213": {
    titleTr: "AIR BODY CONTROL VE AKUSTİK KABİN YALITIMI",
    descTr: "Opsiyonel havalı süspansiyon sistemi ve çift cam yalıtımı E-Serisi W213'ü uzun yolculuklarda yürüyen bir dinlenme salonuna dönüştürür.",
    titleEn: "Air Body Control & Acoustic Insulation",
    descEn: "Optional air suspension and acoustic double-glazed windows transform the W213 E-Class into a floating lounge on highway trips.",
    iconKey: "comfort"
  },
  "Mercedes-Benz|A Serisi|A-Serisi W177": {
    titleTr: "MBUX YAPAY ZEKA VE ÇİFT 10.25 İNÇ EKRAN",
    descTr: "'Hey Mercedes' sesli komut sistemi ve geniş çift ekran donanımı premium kompakt sınıfta teknoloji standartlarını yükseltir.",
    titleEn: "MBUX AI Voice Control & Dual 10.25 Displays",
    descEn: "'Hey Mercedes' intelligent voice assistant and dual Widescreen displays set high technology standards in the premium compact class.",
    iconKey: "screen"
  },

  // Opel
  "Opel|Astra|Astra L": {
    titleTr: "EAT8 ŞANZIMAN UYUMU VE SÜRÜŞ YALITIMI",
    descTr: "Stellantis EMP2 v3 platformunda yükselen Astra L, Aisin üretimi EAT8 tork konvertörlü şanzımanın pürüzsüz vites geçişleri ve rüzgar izolasyonu ile öne çıkar.",
    titleEn: "EAT8 Transmission Match & Cabin Refinement",
    descEn: "Built on EMP2 v3 platform, Astra L excels with Aisin-sourced EAT8 torque-converter smoothness and aerodynamic wind isolation.",
    iconKey: "gearbox"
  },
  "Opel|Astra|Astra K": {
    titleTr: "INTELLILUX LED MATRIX FARLAR VE HAFİF GÖVDE",
    descTr: "Astra K, önceki Astra J nesline göre 200 kg'a varan hafiflemesi ve göz almama özellikli IntelliLux Matrix LED farlarıyla gece sürüşünde öne çıkar.",
    titleEn: "IntelliLux LED Matrix Headlights & Lightweight Chassis",
    descEn: "Weight reduction of up to 200kg over Astra J and non-glaring IntelliLux Matrix LED headlights highlight night driving performance.",
    iconKey: "headlight"
  },
  "Opel|Mokka|Mokka B": {
    titleTr: "VIZOR ÖN YÜZ VE DİJİTAL PURE PANEL KOKPİT",
    descTr: "Opel Vizor tasarım dili, çift ekranlı Pure Panel kokpit ve kompakt dış boyutlarıyla şehir içi manevralarda yüksek pratiklik çizer.",
    titleEn: "Vizor Front Design & Digital Pure Panel Cockpit",
    descEn: "Opel Vizor front brand face, dual Pure Panel widescreen cockpit, and compact footprint offer high agility in city maneuvers.",
    iconKey: "screen"
  },
  "Opel|Corsa|Corsa F": {
    titleTr: "CMP PLATFORM HAFİFLİĞİ VE EAT8 OTOMATİK",
    descTr: "CMP altyapısı sayesinde önceki kasaya göre 108 kg hafifleyen gövde, EAT8 otomatik vitesle birleşerek serip ve tasarruflu sürüş sağlar.",
    titleEn: "CMP Platform Weight Savings & EAT8 Automatic",
    descEn: "CMP architecture shaves 108kg off the previous gen, pairing with EAT8 automatic for agile and fuel-efficient urban driving.",
    iconKey: "ruler"
  },

  // Volkswagen
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
  "Volkswagen|Golf|Golf 8": {
    titleTr: "INNOVISION KOKPİT VE eTSI HAFİF HİBRİT",
    descTr: "Tuşsuz dokunmatik sürücü kokpiti ve 48V eTSI hafif hibrit teknolojisi ilk kalkışlarda elektrik desteğiyle yakıt tüketimini düşürür.",
    titleEn: "Innovision Cockpit & eTSI Mild-Hybrid Tech",
    descEn: "Touch-centric driver cockpit and 48V eTSI mild-hybrid tech assist initial launches with electric boost to lower fuel consumption.",
    iconKey: "screen"
  },
  "Volkswagen|Tiguan|Tiguan Mk2": {
    titleTr: "MQB ŞASİ DENGESİ VE 4MOTION ÇEKİŞ SİSTEMİ",
    descTr: "MQB mimarisinin sunduğu yüksek gövde burulma direnci ve 4Motion arazi sürüş modları kompakt SUV pazarında dengeli sürüş sağlar.",
    titleEn: "MQB Chassis Rigidity & 4Motion AWD Modes",
    descEn: "MQB high torsional rigidity and 4Motion terrain drive modes deliver a balanced, confident feel across compact SUV road conditions.",
    iconKey: "suspension"
  },
  "Volkswagen|Polo|Polo Mk6": {
    titleTr: "MQB A0 PLATFORMU VE 351 LİTRE BAGAJ HACMİ",
    descTr: "MQB A0 mimarisine geçerek Golf 4 boyutlarına ulaşan Polo Mk6, 351 litrelik geniş bagaj hacmiyle B segment sınırlarını zorlar.",
    titleEn: "MQB A0 Platform & 351L Luggage Capacity",
    descEn: "Transitioning to MQB A0 platform brought Golf 4-like interior space and an impressive 351-liter boot to the B-hatchback segment.",
    iconKey: "ruler"
  },

  // Ford
  "Ford|Focus|Focus Mk4": {
    titleTr: "C2 ŞASİ VİRAJ DENGESİ VE 8 İLERİ OTOMATİK",
    descTr: "Sınıfının en hassas direksiyon netliğine sahip Focus Mk4, döner kumandalı 8 ileri tork konvertörlü şanzımanla otoyolda düşük devir kararlılığı sunar.",
    titleEn: "C2 Chassis Cornering Balance & 8-Speed Auto",
    descEn: "Class-leading steering feedback paired with a rotary 8-speed automatic gear selector ensures relaxed low-RPM highway cruising.",
    iconKey: "gearbox"
  },
  "Ford|Kuga|Kuga Mk3": {
    titleTr: "C2 PLATFORMU SÜRÜŞ DİNAMİKLERİ VE SÜSPANSİYON",
    descTr: "Hafifletilmiş C2 şasisi ve direksiyon hissiyatı sayesinde SUV yüksekliğine rağmen binek araç çevikliği ve viraj dengesi sağlar.",
    titleEn: "C2 Platform Driving Dynamics & Handling",
    descEn: "Lightweight C2 chassis and direct steering feel provide sedan-like agility and cornering composure despite SUV ride height.",
    iconKey: "suspension"
  },
  "Ford|Fiesta|Fiesta Mk8": {
    titleTr: "CHASSIS DİNAMİKLERİ VE ECOBOOST MOTOR",
    descTr: "Fark yaratan viraj kabiliyeti ve Uluslararası Yılın Motoru ödüllü 1.0 EcoBoost motor B segmentinde keyifli bir sürüş yaşatır.",
    titleEn: "Chassis Agility & Award-Winning EcoBoost",
    descEn: "Engaging cornering dynamics combined with the 1.0 EcoBoost engine deliver an entertaining drive in the B-segment hatchback class.",
    iconKey: "engine"
  },

  // Toyota
  "Toyota|Corolla|Corolla E210": {
    titleTr: "1.8 HYBRID e-CVT VE ŞEHİR İÇİ TÜKETİM",
    descTr: "e-CVT gezegen dişli şanzıman sistemi şehir içi sıkışık trafikte 3.8 - 4.2 L/100 km gerçek tüketim değerleri ve kesintisiz ivmelenme sunar.",
    titleEn: "1.8 Hybrid e-CVT & Urban Fuel Economy",
    descEn: "e-CVT planetary gear transmission achieves 3.8 - 4.2 L/100km real-world urban consumption with seamless electric acceleration.",
    iconKey: "battery"
  },
  "Toyota|C-HR|C-HR II": {
    titleTr: "5. NESİL HYBRID VE KUPÉ-SUV DİZAYNI",
    descTr: "5. jenerasyon Toyota Hybrid sistemi, batarya ağırlığının azaltılmasıyla daha seri elektrik ivmelenmesi ve sportif kupé çizgileri sunar.",
    titleEn: "5th Gen Hybrid System & Coupe-SUV Styling",
    descEn: "5th-gen Toyota Hybrid tech features lighter batteries for punchier electric torque beneath dramatic coupe-SUV body styling.",
    iconKey: "battery"
  },

  // Renault
  "Renault|Clio|Clio 5": {
    titleTr: "1.0 TCe X-TRONIC VE SOFT-TOUCH KABİN",
    descTr: "Yenilenen konsol malzeme kalitesi ve 1.0 TCe motorun sarsıntısız CVT (X-Tronic) uyumu kabin sessizliğini ve konforunu artırır.",
    titleEn: "1.0 TCe X-Tronic CVT & Soft-Touch Interior",
    descEn: "Upgraded soft-touch dash materials and smooth 1.0 TCe X-Tronic CVT pairing elevate cabin noise refinement and ride comfort.",
    iconKey: "interior"
  },
  "Renault|Clio|Clio 4": {
    titleTr: "0.9 TCe VE 1.5 dCi MOTOR EKONOMİSİ",
    descTr: "1.5 dCi Euro 6 dizel motorun kanıtlanmış yakıt ekonomisi ve 300 litrelik bagaj hacmi B segmentinde bütçe dostu kullanım sağlar.",
    titleEn: "0.9 TCe & 1.5 dCi Proven Efficiency",
    descEn: "1.5 dCi Euro 6 diesel fuel economy and 300-liter boot space make Clio 4 a highly economical everyday B-segment choice.",
    iconKey: "engine"
  },
  "Renault|Megane|Megane 4": {
    titleTr: "1.3 TCe EDC ŞANZIMAN VE C-SHAPE LED İMZASI",
    descTr: "Mercedes ile ortak geliştirilen 1.3 TCe motorun 7 ileri ıslak EDC vitesle uyumu performanslı ve akıcı bir otoyol sürüşü sunar.",
    titleEn: "1.3 TCe EDC Gearbox & C-Shape LED Signature",
    descEn: "1.3 TCe engine paired with 7-speed wet dual-clutch EDC delivers lively performance and smooth highway cruising.",
    iconKey: "gearbox"
  },
  "Renault|Captur|Captur II": {
    titleTr: "KAYDIRILABİLİR ARKA KOLTUKLAR VE 536 LİTRE BAGAJ",
    descTr: "16 cm öne/arkaya kayabilen arka koltuk sırası sayesinde bagaj hacmi ihtiyaca göre 422 ile 536 litre arasında kolayca ayarlanabilir.",
    titleEn: "Sliding Rear Bench & 536L Cargo Space",
    descEn: "Rear bench sliding by 16cm enables adjusting luggage space between 422L and 536L based on passenger or cargo priority.",
    iconKey: "ruler"
  },
  "Renault|Kadjar|Kadjar": {
    titleTr: "CMF-CD PLATFORMU VE KONFOR DENGESİ",
    descTr: "Nissan Qashqai ile paylaşılan CMF-CD altyapısı, yumuşak sönümlemeli süspansiyonu ve geniş aile kabiniyle uzun yolda rahatlık sunar.",
    titleEn: "CMF-CD Platform & Ride Comfort Balance",
    descEn: "Sharing CMF-CD architecture with Qashqai, Kadjar provides plush suspension damping and roomy seating for family travel.",
    iconKey: "comfort"
  },

  // Peugeot
  "Peugeot|3008|3008 II": {
    titleTr: "i-COCKPİT VE EAT8 TAM OTOMATİK ŞANZIMAN",
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
  "Peugeot|508|508 II": {
    titleTr: "ÇERÇEVESİZ KAPILAR VE FASTBACK GÖVDE ÇİZGİSİ",
    descTr: "Çerçevesiz kapı camları ve alçak fastback gövde tasarımı D segmentinde sportif duruş ve yüksek hava direnci verimliliği vaat eder.",
    titleEn: "Frameless Door Glass & Fastback Silhouette",
    descEn: "Frameless door windows and low-slung fastback roofline bring sports-coupe stance and sleek aerodynamics to D-segment sedans.",
    iconKey: "bodywork"
  },

  // Fiat
  "Fiat|Egea|Egea Sedan": {
    titleTr: "1.3 MULTIJET VE YÜKSEK İKİNCİ EL LİKİDİTESİ",
    descTr: "1.3 MultiJet motorun düşük işletme maliyeti, geniş 520 litrelik bagaj hacmi ve Türkiye geneli anında nakde çevrilebilir pazar payı büyüktür.",
    titleEn: "1.3 MultiJet Efficiency & High Market Liquidity",
    descEn: "1.3 MultiJet running economy, massive 520L boot, and unrivaled resale demand across Turkey offer maximum practical value.",
    iconKey: "price"
  },
  "Fiat|Egea|Egea Cross": {
    titleTr: "YÜKSELTİLMİŞ SÜSPANSİYON VE CROSS OVER KAPLAMALAR",
    descTr: "Standart Egea'ya göre 4 cm artırılan yerden yükseklik ve crossover gövde kaplamaları bozuk yollarda ve alt vurma risklerinde koruma sağlar.",
    titleEn: "Raised Ground Clearance & Crossover Cladding",
    descEn: "Ground clearance increased by 4cm over the standard sedan alongside rugged body cladding protects against rough road scrapes.",
    iconKey: "suspension"
  },
  "Fiat|Fiorino|Fiorino Combi": {
    titleTr: "1.3 MULTIJET VE ŞEHİR İÇİ KULLANIM PRATİKLİĞİ",
    descTr: "Kompakt dış boyutları, kayar yan kapıları ve dayanıklı 1.3 MultiJet dizel motoruyla karma kullanımda yüksek ekonomiliktir.",
    titleEn: "1.3 MultiJet Engine & Urban Utility",
    descEn: "Compact dimensions, sliding side doors, and robust 1.3 MultiJet diesel engine provide high economy in mixed commercial/family duty.",
    iconKey: "engine"
  },

  // BMW
  "BMW|3 Serisi|3 Serisi G20": {
    titleTr: "50:50 AĞIRLIK DAĞILIMI VE ZF 8HP ŞANZIMAN",
    descTr: "G20 şasisinin mükemmel ön/arka ağırlık dengesi ve ZF 8HP tork konvertörlü vites kutusu D segmentinde rakipsiz sürüş hissi sunar.",
    titleEn: "50:50 Weight Distribution & ZF 8HP Gearbox",
    descEn: "G20 chassis 50:50 weight balance and lightning-quick ZF 8-speed torque converter transmission deliver benchmark rear-drive dynamics.",
    iconKey: "gearbox"
  },
  "BMW|5 Serisi|5 Serisi G30": {
    titleTr: "CLAR PLATFORMU VE AKUSTİK SÜRÜŞ DİNAMİKLERİ",
    descTr: "Hafifletilmiş alüminyum-çelik CLAR altyapısı ve hassas direksiyon kutusu E segmentinde hem konfor hem sportif yol tutuş vaat eder.",
    titleEn: "CLAR Architecture & Dynamic Handling",
    descEn: "Lightweight aluminum-steel CLAR platform and precise steering ratio balance high-speed cruise serenity with sharp cornering response.",
    iconKey: "suspension"
  },
  "BMW|1 Serisi|1 Serisi F40": {
    titleTr: "FAAR ÖNDEN ÇEKİŞ MİMARİSİ VE ARB TEKNOLOJİSİ",
    descTr: "FAAR platformuna geçişle arka diz mesafesi artırılmış, i3'ten aktarılan ARB kayma önleme teknolojisiyle viraj tutuşu güçlendirilmiştir.",
    titleEn: "FAAR Front-Drive Layout & ARB Slip Control",
    descEn: "FAAR platform enlarged rear legroom while ARB slip control technology derived from i3 enhances front-wheel cornering traction.",
    iconKey: "ruler"
  },

  // Citroen
  "Citroen|C5 Aircross|C5 Aircross": {
    titleTr: "PROGRESSIVE HYDRAULIC CUSHIONS VE 3 BAĞIMSIZ KOLTUK",
    descTr: "'Uçan halı' hissi veren kademeli hidrolik destekli süspansiyon ve arka sırada 3 adet eşit genişlikte bağımsız koltuk sunar.",
    titleEn: "Progressive Hydraulic Cushions & 3 Individual Seats",
    descEn: "'Magic carpet' progressive hydraulic cushion suspension and 3 equal-width individual rear seats provide top family comfort.",
    iconKey: "comfort"
  },
  "Citroen|C3|C3 III": {
    titleTr: "ADVANCED COMFORT KOLTUKLAR VE AIRBUMP KORUMASI",
    descTr: "15 mm ekstra kalınlaştırılmış köpüklü Advanced Comfort koltuklar ve gövde yanı Airbump panelleri şehir içi temasları engeller.",
    titleEn: "Advanced Comfort Seats & Airbump Protection",
    descEn: "Special 15mm high-density foam Advanced Comfort seats and side Airbump panels absorb low-speed urban parking bumps.",
    iconKey: "comfort"
  },

  // Seat / Skoda / Nissan
  "Skoda|Superb|Superb Mk3": {
    titleTr: "625 LİTRE DEV BAGAJ VE SIMPLY CLEVER ÇÖZÜMLERİ",
    descTr: "Liftback kapağı altında sunulan 625 litrelik devasa yükleme alanı ve kapı içi şemsiye bölmeleri D segmentinde eşsiz pratiklik sağlar.",
    titleEn: "625L Massive Boot & Simply Clever Features",
    descEn: "Liftback tailgate opening up a colossal 625-liter boot and door umbrella storage bring unmatched practical utility to D-segment.",
    iconKey: "ruler"
  },
  "Skoda|Karoq|Karoq": {
    titleTr: "VARIOFLEX KOLTUK SİSTEMİ VE YÜKLEME ALANI",
    descTr: "Tamamen çıkarılabilen veya öne katlanabilen 3 parçalı VarioFlex arka koltuklar sayesinde Karoq pratik bir taşıyıcıya dönüştürülebilir.",
    titleEn: "VarioFlex Seating System & Modular Cargo",
    descEn: "Completely removable or fold-flat 3-piece VarioFlex rear seats allow transforming Karoq's cargo bay into a versatile van-like space.",
    iconKey: "ruler"
  },
  "Nissan|Qashqai|Qashqai J12": {
    titleTr: "e-POWER ELEKTRİKLİ SÜRÜŞ HİSSİ VE CMF-C PLATFORM",
    descTr: "Benzinli motorun yalnızca jeneratör olarak çalıştığı e-Power teknolojisi, şarja ihtiyaç duymadan %100 elektrikli sürüş hissiyatı sunar.",
    titleEn: "e-POWER Electric Drive Feel & CMF-C Architecture",
    descEn: "e-POWER technology uses its petrol engine strictly as a power generator, driving wheels 100% electrically without plugging in.",
    iconKey: "engine"
  },
  "Seat|Ateca|Ateca": {
    titleTr: "SPORTİF SÜSPANSİYON KURULUMU VE 510 LİTRE BAGAJ",
    descTr: "Dinamik süspansiyon ayarlarıyla virajlarda gövde salınımını en aza indirerek kompakt SUV sınıfında çevik bir karakter çizer.",
    titleEn: "Sporty Suspension Tuning & 510L Cargo Space",
    descEn: "Firmer damping reduces body roll through corners, delivering an engaging and agile handling balance for a compact SUV.",
    iconKey: "suspension"
  },
  "Seat|Ibiza|Ibiza Mk5": {
    titleTr: "MQB A0 SPORTİF ŞASİ VE BEATS AUDIO SES SİSTEMİ",
    descTr: "MQB A0 altyapısını paylaşan Ibiza, daha dinamik süspansiyon karakteri ve genç tasarım detaylarıyla B segmentinde öne çıkar.",
    titleEn: "MQB A0 Chassis & Beats Audio Option",
    descEn: "Sharing MQB A0 hardware, Ibiza features tighter damping feedback and youth-oriented design touches for an active hatchback profile.",
    iconKey: "interior"
  },
  "Nissan|Juke|Juke F16": {
    titleTr: "BOSE PERSONAL PLUS SES SİSTEMİ VE ÇİFT RENK GÖVDE",
    descTr: "Koltuk başlıklarına entegre BOSE Personal Plus hoparlörleri ve kişiselleştirilebilir gövde kombinasyonları genç bir ambiyans katar.",
    titleEn: "BOSE Personal Plus Audio & Personalization",
    descEn: "Headrest-integrated BOSE Personal Plus speakers and dual-tone body customization options create a youthful cabin atmosphere.",
    iconKey: "sound"
  },
  "Hyundai|i20|i20 BC3": {
    titleTr: "DİJİTAL KOKPİT VE 352 LİTRE BAGAJ HACMİ",
    descTr: "10.25 inç dijital gösterge paneli ve B segmenti standartlarının üzerindeki 352 litrelik bagaj hacmiyle sınıfında öne çıkar.",
    titleEn: "Digital Cockpit & 352L Boot Space",
    descEn: "10.25-inch digital gauge cluster and generous 352-liter luggage volume stand out in the competitive B-hatchback class.",
    iconKey: "screen"
  },
  "Hyundai|Elantra|Elantra CN7": {
    titleTr: "PARAMETRİK DİNAMİK TASARIM VE K3 PLATFORM",
    descTr: "Keskin gövde hatları, alçak ağırlık merkezi ve geniş arka diz mesafesi C sedan sınıfında özgün bir tarz yaratır.",
    titleEn: "Parametric Dynamics & Low Center of Gravity",
    descEn: "Parametric geometry lines, low-slung K3 platform stance, and roomy rear legroom deliver a distinctive C-segment sedan profile.",
    iconKey: "bodywork"
  }
};

function getFallbackRichFact(brand: string, model: string, gen: string): RichFact {
  return {
    titleTr: `${brand.toUpperCase()} ${model.toUpperCase()} SÜRÜŞ VE ŞASİ KARAKTERİ`,
    descTr: `${brand} ${model} (${gen}), süspansiyon konforu, kabin ergonomisi ve segment standartlarındaki yükleme kapasitesiyle dengeli ve güvenli bir kullanım vaat eder.`,
    titleEn: `${brand.toUpperCase()} ${model.toUpperCase()} RIDE & CHASSIS CHARACTER`,
    descEn: `${brand} ${model} (${gen}) delivers balanced everyday usability with comfortable damping, ergonomic cabin layout, and generous luggage capacity.`,
    iconKey: "comfort"
  };
}

async function enrichVehicleGuideFacts() {
  console.log("====================================================");
  console.log("🚀 ENRICHING VEHICLE GUIDE FACTS (REPLACING ALL GENERIC MAINTENANCE CARDS)");
  console.log("====================================================");

  const cards = await prisma.vehicleGuideCard.findMany({
    include: {
      facts: {
        include: {
          translations: true
        }
      }
    }
  });

  console.log(`Found ${cards.length} total VehicleGuideCards in database.`);

  let updatedCount = 0;

  for (const card of cards) {
    const exactKey = `${card.brand}|${card.model}|${card.generationName}`;
    const brandModelKey = `${card.brand}|${card.model}`;

    // Find any fact that has generic maintenance titles
    const genericFact = card.facts.find(f => {
      const t = f.title.toLowerCase();
      return (
        t.includes('geçmiş') || 
        t.includes('gecmis') || 
        t.includes('bakım') || 
        t.includes('bakim') || 
        t.includes('kontrol edin') ||
        t.includes('özenle kontrol') ||
        t.includes('sorgulayın') ||
        t.includes('inceleyin')
      );
    });

    if (genericFact) {
      // Find rich fact by exact key or fallback
      let richFact = RICH_FACTS_MAP[exactKey];
      if (!richFact) {
        // Match by brand|model prefix
        const foundEntry = Object.entries(RICH_FACTS_MAP).find(([k]) => k.startsWith(`${card.brand}|${card.model}`));
        if (foundEntry) {
          richFact = foundEntry[1];
        } else {
          richFact = getFallbackRichFact(card.brand, card.model, card.generationName);
        }
      }

      console.log(`\nUpdating Card [${card.brand} ${card.model} - ${card.generationName}]:`);
      console.log(`  OLD: ${genericFact.title}`);
      console.log(`  NEW: ${richFact.titleTr}`);

      // Update fact title, description, iconKey
      await prisma.vehicleGuideFact.update({
        where: { id: genericFact.id },
        data: {
          title: richFact.titleTr,
          description: richFact.descTr,
          iconKey: richFact.iconKey,
          factType: GuideFactType.BUYING_TIP,
        }
      });

      // Update TR translation if exists
      const trTrans = genericFact.translations.find(t => t.locale === 'tr');
      if (trTrans) {
        await prisma.vehicleGuideFactTranslation.update({
          where: { id: trTrans.id },
          data: {
            title: richFact.titleTr,
            description: richFact.descTr
          }
        });
      }

      // Update EN translation if exists
      const enTrans = genericFact.translations.find(t => t.locale === 'en');
      if (enTrans) {
        await prisma.vehicleGuideFactTranslation.update({
          where: { id: enTrans.id },
          data: {
            title: richFact.titleEn,
            description: richFact.descEn
          }
        });
      }

      updatedCount++;
    }
  }

  console.log("\n====================================================");
  console.log(`✅ SUCCESS: Updated ${updatedCount} generic maintenance facts with rich, model-specific automotive guidance cards!`);
  console.log("====================================================");
}

enrichVehicleGuideFacts()
  .catch(err => {
    console.error("Fatal error enriching vehicle guide facts:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
