import { PrismaClient, GuideStatus, GuideFactType, GuideSourceType, DataConfidence, Locale } from '@prisma/client';

const prisma = new PrismaClient();

const cardsData = [
  // 1. Volkswagen Passat B8 (APPROVED)
  {
    brand: 'Volkswagen',
    model: 'Passat',
    generationName: 'Passat B8',
    generationCode: 'B8',
    bodyType: 'SEDAN',
    yearStart: 2015,
    yearEnd: 2020,
    heroImageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Volkswagen Passat B8 sedan on road',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Passat B8, konforu, geniş iç hacmi ve uzun yol karakteriyle D segmentinin en çok tercih edilen aile sedanlarından biridir.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Passat B8, konforu, geniş iç hacmi ve uzun yol karakteriyle D segmentinin en çok tercih edilen aile sedanlarından biridir.' },
      { locale: Locale.en, shortSummary: 'Passat B8 is one of the most preferred D-segment family sedans with its comfort, spacious interior, and long-distance cruising character.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'Boyu Kısaldı, İçi Genişledi',
        description: 'B8, B7 nesline göre dıştan 2 mm daha kısa olmasına rağmen MQB platformu sayesinde aks mesafesini 79 mm artırarak çok daha geniş bir diz mesafesi sundu.',
        iconKey: 'ruler',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'VW Official MQB Press Release 2015',
        sourceUrl: 'https://www.volkswagen-newsroom.com',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Official Volkswagen AG global media release details.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Boyu Kısaldı, İçi Genişledi', description: 'B8, B7 nesline göre dıştan 2 mm daha kısa olmasına rağmen MQB platformu sayesinde aks mesafesini 79 mm artırarak çok daha geniş bir diz mesafesi sundu.' },
          { locale: Locale.en, title: 'Shorter Outside, Roomier Inside', description: 'Despite being 2mm shorter externally than the B7, the B8 MQB platform increased the wheelbase by 79mm, providing significantly more legroom.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Uzun Yol Konforu ve Geniş Bagaj',
        description: 'Sessiz kabini, 586 litrelik devasa bagajı ve dengeli süspansiyon yapısı Passat B8\'i uzun seyahatler ve geniş aileler için biçilmiş kaftan haline getirir.',
        iconKey: 'comfort',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Otohaber Passat B8 Test Sürüşü',
        sourceUrl: 'https://www.otohaber.com.tr',
        sourceType: GuideSourceType.PRESS,
        sourceNote: 'Long term press test drive and interior evaluation.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Uzun Yol Konforu ve Geniş Bagaj', description: 'Sessiz kabini, 586 litrelik devasa bagajı ve dengeli süspansiyon yapısı Passat B8\'i uzun seyahatler ve geniş aileler için biçilmiş kaftan haline getirir.' },
          { locale: Locale.en, title: 'Highway Comfort & Spacious Trunk', description: 'Quiet cabin, massive 586-liter boot, and balanced suspension make Passat B8 ideal for highway cruising and large families.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'DSG Şanzımanı Mutlaka Kontrol Et',
        description: 'Kuru tip 7 ileri DSG vites geçişlerinde titreme, kavrama aşınması ve mekatronik arızası riski taşır. Alırken servis geçmişine ve şanzıman durumuna bakılmalıdır.',
        iconKey: 'gearbox',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout Kronik Sorunlar Kütüphanesi',
        sourceType: GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: 'TUV report statistics and internal expert diagnostics database.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'DSG Şanzımanı Mutlaka Kontrol Et', description: 'Kuru tip 7 ileri DSG vites geçişlerinde titreme, kavrama aşınması ve mekatronik arızası riski taşır. Alırken servis geçmişine ve şanzıman durumuna bakılmalıdır.' },
          { locale: Locale.en, title: 'Inspect the DSG Transmission', description: 'Dry 7-speed DSG carries clutch wear and mechatronic failure risks. Verify service history and perform a test drive focusing on gear shifts.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: 'Motor Seçiminde Yakıt Odaklılık',
        description: '1.6 TDI yakıt ekonomisinde efsaneleşirken, performans arayanlar için 2.0 TDI (150 HP veya çift turbolu 240 HP) çok daha doyurucu bir sürüş sunar.',
        iconKey: 'engine',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Volkswagen Technical Specifications Catalog',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Fuel consumption and horsepower rating from official brochures.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Motor Seçiminde Yakıt Odaklılık', description: '1.6 TDI yakıt ekonomisinde efsaneleşirken, performans arayanlar için 2.0 TDI (150 HP veya çift turbolu 240 HP) çok daha doyurucu bir sürüş sunar.' },
          { locale: Locale.en, title: 'Fuel Economy vs. Performance', description: 'While the 1.6 TDI is legendary for low fuel consumption, the 2.0 TDI (150 HP or 240 HP twin-turbo) offers much stronger performance.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.6 TDI (120 HP)', '2.0 TDI (150 HP/190 HP)', '2.0 BiTDI (240 HP)', '1.4 TSI (125 HP/150 HP)'],
      fuelTypes: ['DIESEL', 'PETROL'],
      transmissionOptions: ['MANUAL', 'AUTOMATIC'],
      bodyTypes: ['SEDAN', 'WAGON'],
      productionYears: '2015 - 2020',
      averageConsumption: '4.1 - 5.5 L/100km',
      powerRange: '120 - 240 HP',
      torqueRange: '250 - 500 Nm',
      drivetrain: 'FWD / 4MOTION (AWD)',
      segment: 'D',
      trunkVolume: '586 L',
      safetyInfo: 'Euro NCAP 5 Stars (2014)',
      sourceTitle: 'VW Technical Specs 2015',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Bakımlı DSG şanzımanlar ve 1.6 TDI motorlar Türkiye ikinci el pazarında altın değerindedir.' },
        { locale: Locale.en, localizedNotes: 'Well-maintained DSG gearboxes and 1.6 TDI engines hold value extremely well in the secondary market.' }
      ]
    }
  },

  // 2. Volkswagen Golf 7 (APPROVED)
  {
    brand: 'Volkswagen',
    model: 'Golf',
    generationName: 'Golf 7',
    generationCode: 'MK7',
    bodyType: 'HATCHBACK',
    yearStart: 2013,
    yearEnd: 2020,
    heroImageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Volkswagen Golf MK7 hatchback',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Golf 7, kompakt hatchback sınıfının referans modelidir. Yüksek malzeme kalitesi, yalıtımı ve dengeli sürüşüyle öne çıkar.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Golf 7, kompakt hatchback sınıfının referans modelidir. Yüksek malzeme kalitesi, yalıtımı ve dengeli sürüşüyle öne çıkar.' },
      { locale: Locale.en, shortSummary: 'Golf MK7 is the reference model for compact hatchbacks, standing out with high material quality, noise insulation, and balanced handling.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'Önceki Nesle Göre 100 kg Hafifledi',
        description: 'MQB platformuna geçiş sayesinde şasisi ve gövdesi güçlenirken, Golf 7 selefi Golf 6\'ya kıyasla tam 100 kilogram hafiflemeyi başardı.',
        iconKey: 'weight',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'VW Golf MK7 Launch Press Pack',
        sourceUrl: 'https://www.volkswagen-newsroom.com',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Details on MQB weight saving technology.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Önceki Nesle Göre 100 kg Hafifledi', description: 'MQB platformuna geçiş sayesinde şasisi ve gövdesi güçlenirken, Golf 7 selefi Golf 6\'ya kıyasla tam 100 kilogram hafiflemeyi başardı.' },
          { locale: Locale.en, title: '100 kg Lighter than Predecessor', description: 'Thanks to the MQB platform transition, Golf MK7 achieved a weight reduction of 100 kg compared to the Golf MK6 while improving structural rigidity.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Premium Sınıf Yalıtım Hissi',
        description: 'Sınıf standartlarının üstündeki rüzgar ve yol sesi yalıtımı sayesinde Golf 7, uzun seyahatlerde C segmentinin üstünde bir konfor sunar.',
        iconKey: 'sound',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'What Car? Golf MK7 Review',
        sourceUrl: 'https://www.whatcar.com',
        sourceType: GuideSourceType.REVIEW,
        sourceNote: 'Road test review evaluating noise levels and ride quality.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Premium Sınıf Yalıtım Hissi', description: 'Sınıf standartlarının üstündeki rüzgar ve yol sesi yalıtımı sayesinde Golf 7, uzun seyahatlerde C segmentinin üstünde bir konfor sunar.' },
          { locale: Locale.en, title: 'Premium Sound Insulation', description: 'Class-leading wind and road noise insulation gives Golf MK7 a level of highway comfort that punches above the C-segment.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'Arka Süspansiyon Sistemine Dikkat',
        description: 'Türkiye\'ye gelen 120 HP ve altındaki motor seçeneklerinde arkada torsiyon çubuğu kullanılırken, 122 HP ve üzeri güçlü modellerde bağımsız süspansiyon bulunur.',
        iconKey: 'suspension',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'VW Technical Brochures 2013-2020',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Suspension layout configuration differences by engine output.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Arka Süspansiyon Sistemine Dikkat', description: 'Türkiye\'ye gelen 120 HP ve altındaki motor seçeneklerinde arkada torsiyon çubuğu kullanılırken, 122 HP ve üzeri güçlü modellerde bağımsız süspansiyon bulunur.' },
          { locale: Locale.en, title: 'Check Rear Suspension Spec', description: 'Models under 120 HP use a torsion beam, whereas models with 122 HP or more feature a multi-link independent rear suspension.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: 'TSI Motor ve Act Teknolojisi',
        description: '1.4 TSI BlueMotion motorlardaki Aktif Silindir Yönetimi (ACT), güç gerekmediğinde 2 silindiri kapatarak yakıt tüketimini minimuma indirir.',
        iconKey: 'engine',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'VW ACT Tech Showcase',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Engineering documentation on cylinder deactivation.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'TSI Motor ve Act Teknolojisi', description: '1.4 TSI BlueMotion motorlardaki Aktif Silindir Yönetimi (ACT), güç gerekmediğinde 2 silindiri kapatarak yakıt tüketimini minimuma indirir.' },
          { locale: Locale.en, title: 'TSI and ACT Tech', description: 'Active Cylinder Technology (ACT) in 1.4 TSI engines shuts down 2 cylinders under light loads to optimize fuel efficiency.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.2 TSI (105 HP)', '1.4 TSI (122 HP/125 HP/140 HP/150 HP)', '1.6 TDI (105 HP/110 HP/115 HP)'],
      fuelTypes: ['PETROL', 'DIESEL'],
      transmissionOptions: ['MANUAL', 'AUTOMATIC'],
      bodyTypes: ['HATCHBACK'],
      productionYears: '2013 - 2020',
      averageConsumption: '3.9 - 5.2 L/100km',
      powerRange: '105 - 150 HP',
      torqueRange: '175 - 250 Nm',
      drivetrain: 'FWD',
      segment: 'C',
      trunkVolume: '380 L',
      safetyInfo: 'Euro NCAP 5 Stars (2012)',
      sourceTitle: 'VW Technical Specs 2013',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Golf 7, zamansız tasarımı ve yüksek malzeme kalitesi ile değerini en iyi koruyan otomobillerdendir.' },
        { locale: Locale.en, localizedNotes: 'Golf MK7 is one of the best value-retaining cars due to its timeless design and premium feel.' }
      ]
    }
  },

  // 3. Toyota Corolla E210 (APPROVED)
  {
    brand: 'Toyota',
    model: 'Corolla',
    generationName: 'Corolla E210',
    generationCode: 'E210',
    bodyType: 'SEDAN',
    yearStart: 2019,
    yearEnd: 2026,
    heroImageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Toyota Corolla E210 hybrid sedan',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Corolla E210, hibrit motor seçeneği, TNGA platformu ve efsanevi sorunsuzluğu ile öne çıkan popüler bir aile sedanıdır.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Corolla E210, hibrit motor seçeneği, TNGA platformu ve efsanevi sorunsuzluğu ile öne çıkan popüler bir aile sedanıdır.' },
      { locale: Locale.en, shortSummary: 'Corolla E210 is a popular family sedan standing out with its hybrid engine option, TNGA platform, and legendary reliability.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'Tamamen Yeni TNGA Mimarisi',
        description: 'TNGA (Toyota New Global Architecture) platformuna geçiş sayesinde E210 neslinde Corolla\'nın ağırlık merkezi alçaltıldı ve yol tutuşu ciddi şekilde iyileştirildi.',
        iconKey: 'chassis',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Toyota TNGA Platform Whitepaper',
        sourceUrl: 'https://global.toyota',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Details on TNGA structural benefits.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Tamamen Yeni TNGA Mimarisi', description: 'TNGA (Toyota New Global Architecture) platformuna geçiş sayesinde E210 neslinde Corolla\'nın ağırlık merkezi alçaltıldı ve yol tutuşu ciddi şekilde iyileştirildi.' },
          { locale: Locale.en, title: 'All-New TNGA Platform', description: 'Switching to the TNGA platform lowered Corolla\'s center of gravity and significantly improved handling performance in the E210 generation.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Şehir İçi Sessizlik ve Ekonomi',
        description: '1.8 Hybrid motor seçeneği, özellikle yoğun şehir trafiğinde elektrik motoru sayesinde sıfır emisyonlu ve son derece sessiz bir sürüş keyfi sunar.',
        iconKey: 'silent',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Toyota Hybrid User Survey 2021',
        sourceType: GuideSourceType.USER_FEEDBACK,
        sourceNote: 'Owner feedback reviews analyzing daily city usage patterns.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Şehir İçi Sessizlik ve Ekonomi', description: '1.8 Hybrid motor seçeneği, özellikle yoğun şehir trafiğinde elektrik motoru sayesinde sıfır emisyonlu ve son derece sessiz bir sürüş keyfi sunar.' },
          { locale: Locale.en, title: 'City Silence & Fuel Economy', description: 'The 1.8 Hybrid powertrain delivers near-silent, zero-emission city driving in heavy traffic, maximizing fuel economy.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'Multimedya ve Malzeme Kalitesi',
        description: 'İlk çıkan 2019 modellerde multimedya ekranının tepki süresi biraz yavaştır. Kabinde bazı plastik yüzeylerin çizilmeye yatkın olduğu unutulmamalıdır.',
        iconKey: 'dashboard',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Auto Express Corolla Long-term Review',
        sourceUrl: 'https://www.autoexpress.co.uk',
        sourceType: GuideSourceType.REVIEW,
        sourceNote: 'Long term cabin wear and infotainment responsiveness report.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Multimedya ve Malzeme Kalitesi', description: 'İlk çıkan 2019 modellerde multimedya ekranının tepki süresi biraz yavaştır. Kabinde bazı plastik yüzeylerin çizilmeye yatkın olduğu unutulmamalıdır.' },
          { locale: Locale.en, title: 'Infotainment and Trim Review', description: 'Infotainment responsiveness in early 2019 models is somewhat sluggish. Check interior high-touch areas for minor scratches.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: 'Sorunsuz Atmosferik ve Hibrit',
        description: '1.6 Valvematic motor lpg uyumuyla bilinirken, 1.8 Hybrid sistem Toyota\'nın kendini kanıtlamış e-CVT şanzımanı ile tam bir uzun ömür canavarıdır.',
        iconKey: 'reliability',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'J.D. Power Vehicle Dependability Study 2022',
        sourceType: GuideSourceType.PRESS,
        sourceNote: 'Reliability metrics ranking Corolla at the top of compact sedans.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Sorunsuz Atmosferik ve Hibrit', description: '1.6 Valvematic motor lpg uyumuyla bilinirken, 1.8 Hybrid sistem Toyota\'nın kendini kanıtlamış e-CVT şanzımanı ile tam bir uzun ömür canavarıdır.' },
          { locale: Locale.en, title: 'Atmos & Hybrid Powertrains', description: 'The 1.6 Valvematic is well-regarded for LPG compatibility, while the 1.8 Hybrid with e-CVT represents bulletproof longevity.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.5 3-Cyl (125 HP)', '1.6 Valvematic (132 HP)', '1.8 Hybrid (122 HP/140 HP)'],
      fuelTypes: ['PETROL', 'HYBRID'],
      transmissionOptions: ['AUTOMATIC', 'MANUAL'],
      bodyTypes: ['SEDAN', 'HATCHBACK'],
      productionYears: '2019 - 2026',
      averageConsumption: '3.6 - 6.0 L/100km',
      powerRange: '122 - 140 HP',
      torqueRange: '142 - 177 Nm',
      drivetrain: 'FWD',
      segment: 'C',
      trunkVolume: '471 L',
      safetyInfo: 'Euro NCAP 5 Stars (2019)',
      sourceTitle: 'Toyota Corolla E210 Brochure',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Özellikle şehir içi taksi ve kurumsal filo kullanımlarında hibrit versiyon en tasarruflu alternatiftir.' },
        { locale: Locale.en, localizedNotes: 'The Hybrid model is the most economical option, highly favored by urban drivers and corporate fleets.' }
      ]
    }
  },

  // 4. Honda Civic FC (APPROVED)
  {
    brand: 'Honda',
    model: 'Civic',
    generationName: 'Civic FC',
    generationCode: 'FC5',
    bodyType: 'SEDAN',
    yearStart: 2016,
    yearEnd: 2021,
    heroImageUrl: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Honda Civic FC5 sedan',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Civic FC5, agresif tasarımı, geniş kabini ve fabrikasyon LPG seçeneği ile Türkiye pazarında rekor satışlara imza atmış bir modeldir.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Civic FC5, agresif tasarımı, geniş kabini ve fabrikasyon LPG seçeneği ile Türkiye pazarında rekor satışlara imza atmış bir modeldir.' },
      { locale: Locale.en, shortSummary: 'Civic FC5 is a model that achieved record sales in Turkey with its aggressive design, spacious cabin, and factory-fitted LPG option.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'Fabrikasyon LPG Seçeneği (ECO)',
        description: 'Honda, Civic FC5 neslinde Türkiye fabrikasında özel ECO versiyonu üreterek LPG sistemini doğrudan fabrikadan garantili ve entegre olarak sundu.',
        iconKey: 'lpg',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Honda Turkey Eco Series Announcement',
        sourceUrl: 'https://honda.com.tr',
        sourceType: GuideSourceType.DISTRIBUTOR,
        sourceNote: 'Turkish distributor media briefing regarding factory LPG integration.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Fabrikasyon LPG Seçeneği (ECO)', description: 'Honda, Civic FC5 neslinde Türkiye fabrikasında özel ECO versiyonu üreterek LPG sistemini doğrudan fabrikadan garantili ve entegre olarak sundu.' },
          { locale: Locale.en, title: 'Factory-Fitted LPG Option', description: 'For the FC5 generation, Honda produced a dedicated ECO model in its Turkish factory, offering a fully warranted LPG system straight from the assembly line.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Konforlu Kabin ve Yumuşak Sürüş',
        description: 'Geniş arka koltuk diz mesafesi ve darbe emiş gücü yüksek süspansiyonları sayesinde Civic FC5, aileler için son derece rahat bir yolculuk vaat eder.',
        iconKey: 'cabin',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Carbuyer Civic MK10 Review',
        sourceUrl: 'https://www.carbuyer.co.uk',
        sourceType: GuideSourceType.REVIEW,
        sourceNote: 'Cabin space and daily driving analysis.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Konforlu Kabin ve Yumuşak Sürüş', description: 'Geniş arka koltuk diz mesafesi ve darbe emiş gücü yüksek süspansiyonları sayesinde Civic FC5, aileler için son derece rahat bir yolculuk vaat eder.' },
          { locale: Locale.en, title: 'Comfortable Cabin & Smooth Ride', description: 'Generous rear legroom and compliant suspension tuning make the Civic FC5 highly comfortable for daily family transit.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'C Sütunu Göçüklerini İncele',
        description: 'İlk üretilen bazı FC5 modellerinde arka C sütununda dalgalanma veya hafif göçükler oluşabildiği gözlemlenmiştir. Alırken bu bölge kontrol edilmelidir.',
        iconKey: 'bodywork',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout Forum & User Complaint Analytics',
        sourceType: GuideSourceType.USER_FEEDBACK,
        sourceNote: 'Aggregated database of common body panel issues in early FC5 models.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'C Sütunu Göçüklerini İncele', description: 'İlk üretilen bazı FC5 modellerinde arka C sütununda dalgalanma veya hafif göçükler oluşabildiği gözlemlenmiştir. Alırken bu bölge kontrol edilmelidir.' },
          { locale: Locale.en, title: 'Inspect C-Pillar Panel Work', description: 'Certain early-batch FC5 models displayed minor body ripples or dimples on the rear C-pillars. Examine this area closely.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: 'CVT Şanzıman ve VTEC Turbo',
        description: '1.5 VTEC Turbo (182 HP) motor yüksek performansı ile heyecan verirken, CVT şanzıman sarsıntısız ancak bazen yüksek devirde gürültülü bir sürüş sunar.',
        iconKey: 'gearbox',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Honda Global VTEC Turbo Technical Specs',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Specifications on L15B7 engine and CVT torque curves.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'CVT Şanzıman ve VTEC Turbo', description: '1.5 VTEC Turbo (182 HP) motor yüksek performansı ile heyecan verirken, CVT şanzıman sarsıntısız ancak bazen yüksek devirde gürültülü bir sürüş sunar.' },
          { locale: Locale.en, title: 'CVT Gearbox & VTEC Turbo', description: 'The 1.5 VTEC Turbo (182 HP) offers excellent punch, while the CVT provides seamless but occasionally noisy acceleration under load.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.6 i-VTEC (125 HP)', '1.5 VTEC Turbo (182 HP)', '1.6 i-DTEC (120 HP)'],
      fuelTypes: ['PETROL', 'LPG', 'DIESEL'],
      transmissionOptions: ['AUTOMATIC', 'MANUAL'],
      bodyTypes: ['SEDAN', 'HATCHBACK'],
      productionYears: '2016 - 2021',
      averageConsumption: '3.4 - 6.7 L/100km',
      powerRange: '120 - 182 HP',
      torqueRange: '152 - 300 Nm',
      drivetrain: 'FWD',
      segment: 'C',
      trunkVolume: '519 L',
      safetyInfo: 'Euro NCAP 5 Stars (2017)',
      sourceTitle: 'Honda Civic Technical Manual',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Eco (LPG\'li) versiyonlar, Türkiye ikinci el piyasasının en likit ve kolay satılan araçları arasındadır.' },
        { locale: Locale.en, localizedNotes: 'LPG-equipped Eco versions are among the most liquid and fast-selling cars in the Turkish used car market.' }
      ]
    }
  },

  // 5. BMW 3 Serisi F30 (APPROVED)
  {
    brand: 'BMW',
    model: '3 Serisi',
    generationName: '3 Serisi F30',
    generationCode: 'F30',
    bodyType: 'SEDAN',
    yearStart: 2012,
    yearEnd: 2019,
    heroImageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'BMW 3 Series F30 sedan',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'BMW F30, arkadan itişli yapısı, sportif tasarımı ve meşhur ZF 8 ileri otomatik şanzımanıyla premium orta sınıfın temsilcisidir.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'BMW F30, arkadan itişli yapısı, sportif tasarımı ve meşhur ZF 8 ileri otomatik şanzımanıyla premium orta sınıfın temsilcisidir.' },
      { locale: Locale.en, shortSummary: 'BMW F30 is the definition of a premium compact executive sedan with rear-wheel drive, sporty design, and the acclaimed ZF 8-speed auto.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: '50:50 Kusursuz Ağırlık Dağılımı',
        description: 'BMW mühendisleri, F30 neslinde ön ve arka aks arasında tam 50:50 dengeli ağırlık dağılımı elde ederek sürüş dinamiklerini zirveye taşıdı.',
        iconKey: 'balance',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'BMW 3 Series F30 Engineering Release',
        sourceUrl: 'https://www.press.bmwgroup.com',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Chassis dynamics and weight distribution engineering sheets.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: '50:50 Sürüş Denge Dağılımı', description: 'BMW mühendisleri, F30 neslinde ön ve arka aks arasında tam 50:50 dengeli ağırlık dağılımı elde ederek sürüş dinamiklerini zirveye taşıdı.' },
          { locale: Locale.en, title: 'Perfect 50:50 Weight Balance', description: 'BMW chassis engineers achieved a precise 50:50 weight distribution between the front and rear axles in the F30, maximizing driving dynamics.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Eğlenceli Yol Tutuş ve Sürüş Modları',
        description: 'Arkadan itişli yapısı, hassas direksiyonu ve Sport/Sport+ modlarında sertleşen şasi tepkileri sayesinde F30, sürüş keyfi arayanlar için en iyi seçenektir.',
        iconKey: 'handling',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Car and Driver BMW F30 Review',
        sourceUrl: 'https://www.caranddriver.com',
        sourceType: GuideSourceType.REVIEW,
        sourceNote: 'Dynamic track testing evaluation.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Eğlenceli Yol Tutuş ve Sürüş Modları', description: 'Arkadan itişli yapısı, hassas direksiyonu ve Sport/Sport+ modlarında sertleşen şasi tepkileri sayesinde F30, sürüş keyfi arayanlar için en iyi seçenektir.' },
          { locale: Locale.en, title: 'Thrilling Handling & Sürüş Modları', description: 'Rear-wheel drive layout, sharp steering rack, and responsive Sport modes make the F30 the ultimate driver\'s car in its class.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'Motor Yağ Kaçakları ve Soğutma',
        description: 'N13/N20 benzinli motorlarda termostat, devirdaim pompası ve külbütör kapağı contası yağ/su sızdırma riskleri taşır. Alırken alt karter ve motor bloğu incelenmelidir.',
        iconKey: 'leak',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout BMW Maintenance Guides',
        sourceType: GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: 'Common repair logs detailing cooling system faults and oil gasket leaks in N13/N20 engines.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Motor Yağ Kaçakları ve Soğutma', description: 'N13/N20 benzinli motorlarda termostat, devirdaim pompası ve külbütör kapağı contası yağ/su sızdırma riskleri taşır. Alırken alt karter ve motor bloğu incelenmelidir.' },
          { locale: Locale.en, title: 'Watch for Oil and Coolant Leaks', description: 'N13 and N20 petrol engines are prone to valve cover gasket leaks and water pump/thermostat housing cracks. Inspect the engine bay carefully.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: 'ZF 8 İleri ve N13/N20 Motorlar',
        description: 'Sınıfının en hızlı ve kararlı vites değiştiren şanzımanı olan ZF 8HP, BMW\'nin turbo beslemeli TwinPower motorlarıyla harika bir uyum yakalamıştır.',
        iconKey: 'gearbox',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'ZF 8HP Gearbox Data Sheet',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'ZF group technical specifications for 8HP transmission family.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'ZF 8 İleri ve N13/N20 Motorlar', description: 'Sınıfının en hızlı ve kararlı vites değiştiren şanzımanı olan ZF 8HP, BMW\'nin turbo beslemeli TwinPower motorlarıyla harika bir uyum yakalamıştır.' },
          { locale: Locale.en, title: 'ZF 8-Speed and TwinPower Engines', description: 'Widely praised as the best torque-converter automatic, the ZF 8HP mates perfectly with BMW TwinPower turbocharged engines.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.6L N13 316i (136 HP)', '1.5L B38 318i (136 HP)', '2.0L N20 320i (170/184 HP)', '2.0L N47/B47 320d (184/190 HP)'],
      fuelTypes: ['PETROL', 'DIESEL'],
      transmissionOptions: ['AUTOMATIC', 'MANUAL'],
      bodyTypes: ['SEDAN', 'WAGON'],
      productionYears: '2012 - 2019',
      averageConsumption: '4.3 - 6.5 L/100km',
      powerRange: '136 - 190 HP',
      torqueRange: '220 - 400 Nm',
      drivetrain: 'RWD / xDrive (AWD)',
      segment: 'D',
      trunkVolume: '480 L',
      safetyInfo: 'Euro NCAP 5 Stars (2012)',
      sourceTitle: 'BMW F30 Catalog',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Bakımlı ve kurcalanmamış (modifikasyon görmemiş) F30 modelleri, ikinci elde hızlıca alıcı bulur.' },
        { locale: Locale.en, localizedNotes: 'Unmodified, dealer-maintained F30 models fetch premium prices and sell quickly in the used market.' }
      ]
    }
  },

  // 6. Renault Clio 5 (APPROVED)
  {
    brand: 'Renault',
    model: 'Clio',
    generationName: 'Clio 5',
    generationCode: 'Clio V',
    bodyType: 'HATCHBACK',
    yearStart: 2019,
    yearEnd: 2026,
    heroImageUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Renault Clio 5 hatchback',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Clio 5, modern tasarımı, yenilenen iç mekan kalitesi ve ekonomik motorlarıyla B segmentinin en iddialı ve lider hatchback modelidir.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Clio 5, modern tasarımı, yenilenen iç mekan kalitesi ve ekonomik motorlarıyla B segmentinin en iddialı ve lider hatchback modelidir.' },
      { locale: Locale.en, shortSummary: 'Clio V is a B-segment benchmark hatchback with a modern exterior, vastly improved cabin materials, and hyper-economical engines.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'CMF-B Platformunda Bir İlk',
        description: 'Clio 5, Renault-Nissan ortaklığının yepyeni CMF-B platformunu kullanan ilk model oldu. Bu sayede kabin kalitesi yükseltildi ve ağırlık hafifletildi.',
        iconKey: 'platform',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Renault Press CMF-B Announcement',
        sourceUrl: 'https://media.renault.com',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Details on CMF-B architecture roll-out.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'CMF-B Platformunda Bir İlk', description: 'Clio 5, Renault-Nissan ortaklığının yepyeni CMF-B platformunu kullanan ilk model oldu. Bu sayede kabin kalitesi yükseltildi ve ağırlık hafifletildi.' },
          { locale: Locale.en, title: 'First on the CMF-B Platform', description: 'Clio V was the pioneer model to adopt the alliance\'s CMF-B platform, paving the way for superior build quality and safety equipment.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Sınıf Üstü Dijital Kokpit',
        description: 'Özellikle üst donanım seviyelerinde sunulan Easy Link multimedya sistemi ve dijital gösterge ekranı, sürüş deneyimini premium hissettirir.',
        iconKey: 'technology',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Autocar Clio V Cabin Review',
        sourceUrl: 'https://www.autocar.co.uk',
        sourceType: GuideSourceType.REVIEW,
        sourceNote: 'Ergonomics and smart cockpit layout assessment.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Sınıf Üstü Dijital Kokpit', description: 'Özellikle üst donanım seviyelerinde sunulan Easy Link multimedya sistemi ve dijital gösterge ekranı, sürüş deneyimini premium hissettirir.' },
          { locale: Locale.en, title: 'Class-Leading Smart Cockpit', description: 'High-trim variants feature the portrait-oriented Easy Link display and digital dash, raising B-segment standards.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'X-Tronic CVT Şanzıman Karakteri',
        description: '1.0 TCe motorla eşleşen X-Tronic şanzıman konforlu ve ekonomiktir ancak agresif kullanımlarda devir uğultusu yapabilir. Yağ değişim aralıkları takip edilmelidir.',
        iconKey: 'gearbox',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout Fleet Maintenance Reports',
        sourceType: GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: 'X-Tronic CVT reliability indicators from corporate user data.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'X-Tronic CVT Şanzıman Karakteri', description: '1.0 TCe motorla eşleşen X-Tronic şanzıman konforlu ve ekonomiktir ancak agresif kullanımlarda devir uğultusu yapabilir. Yağ değişim aralıkları takip edilmelidir.' },
          { locale: Locale.en, title: 'Monitor the X-Tronic CVT', description: 'The X-Tronic CVT is smooth and efficient, but benefits greatly from regular transmission fluid changes every 60k km to avoid belt wear.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: 'Yakıt Dostu Motor Seçenekleri',
        description: '1.0 SCe (72 HP) atmosferik motor tamamen şehir içine hitap ederken, 1.0 TCe (90/100 HP) turbo motor hem performans hem de ekonomi açısından idealdir.',
        iconKey: 'engine',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Renault Group Technical Brochures',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Motor specs sheet from Clio V brochure.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Yakıt Dostu Motor Seçenekleri', description: '1.0 SCe (72 HP) atmosferik motor tamamen şehir içine hitap ederken, 1.0 TCe (90/100 HP) turbo motor hem performans hem de ekonomi açısından idealdir.' },
          { locale: Locale.en, title: 'Ultra-Efficient Engines', description: 'The naturally aspirated 1.0 SCe (72 HP) is strictly for city commutes, while the turbocharged 1.0 TCe (90/100 HP) represents the sweet spot.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.0 SCe (72 HP)', '1.0 TCe (90 HP/100 HP)', '1.5 dCi (85 HP/115 HP)', '1.6 E-Tech Hybrid (140 HP)'],
      fuelTypes: ['PETROL', 'DIESEL', 'HYBRID', 'LPG'],
      transmissionOptions: ['MANUAL', 'AUTOMATIC'],
      bodyTypes: ['HATCHBACK'],
      productionYears: '2019 - 2026',
      averageConsumption: '3.6 - 5.2 L/100km',
      powerRange: '72 - 140 HP',
      torqueRange: '95 - 260 Nm',
      drivetrain: 'FWD',
      segment: 'B',
      trunkVolume: '391 L',
      safetyInfo: 'Euro NCAP 5 Stars (2019)',
      sourceTitle: 'Renault Clio 5 Brochure',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Clio 5, segment lideri 391 litrelik bagajı ile küçük aileler için dahi yeterli alan sunar.' },
        { locale: Locale.en, localizedNotes: 'With its class-leading 391-liter boot, Clio V is remarkably practical even for small families.' }
      ]
    }
  },

  // 7. Renault Clio 4 (APPROVED)
  {
    brand: 'Renault',
    model: 'Clio',
    generationName: 'Clio 4',
    generationCode: 'Clio IV',
    bodyType: 'HATCHBACK',
    yearStart: 2012,
    yearEnd: 2019,
    heroImageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Renault Clio 4 hatchback',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Clio 4, Laurens van den Acker imzalı ikonik tasarımı ve efsanevi düşük tüketimli 1.5 dCi motoruyla Türkiye\'de milyonlar satan bir halk arabasıdır.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Clio 4, Laurens van den Acker imzalı ikonik tasarımı ve efsanevi düşük tüketimli 1.5 dCi motoruyla Türkiye\'de milyonlar satan bir halk arabasıdır.' },
      { locale: Locale.en, shortSummary: 'Clio IV is an iconic, highly popular B-segment hatchback in Turkey, featuring Lauren van den Acker\'s styling and the bulletproof 1.5 dCi diesel engine.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'Yeni Tasarım Akımının Öncüsü',
        description: 'Clio 4, Renault\'un ön ızgarasında devasa logosu ve far imzasıyla başlattığı modern tasarım dilini kullanan dünyadaki ilk Renault modeliydi.',
        iconKey: 'design',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Renault Design Story Clio IV',
        sourceUrl: 'https://design.renault.com',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Renault global design briefing archive.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Yeni Tasarım Akımının Öncüsü', description: 'Clio 4, Renault\'un ön ızgarasında devasa logosu ve far imzasıyla başlattığı modern tasarım dilini kullanan dünyadaki ilk Renault modeliydi.' },
          { locale: Locale.en, title: 'Pioneer of the New Design Era', description: 'Clio IV was the first production model designed under Laurens van den Acker, introducing the bold front grille and large Renault emblem.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Ekonomik Sürüş ve Sert Süspansiyon',
        description: 'Yakıt tüketiminde neredeyse koklayan 1.5 dCi motoruyla cüzdan dostudur ancak sert süspansiyon yapısı bozuk yollarda konforu biraz azaltabilir.',
        iconKey: 'suspension',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Revue Auto Clio 4 User Feedback',
        sourceType: GuideSourceType.USER_FEEDBACK,
        sourceNote: 'Aggregated user survey reflecting ride quality and fuel averages.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Ekonomik Sürüş ve Sert Süspansiyon', description: 'Yakıt tüketiminde neredeyse koklayan 1.5 dCi motoruyla cüzdan dostudur ancak sert süspansiyon yapısı bozuk yollarda konforu biraz azaltabilir.' },
          { locale: Locale.en, title: 'Hyper-Economical but Firm Ride', description: 'The 1.5 dCi diesel is incredibly cheap to run, though the firm suspension can feel bouncy on uneven city streets.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'EDC Beyni ve Rüzgar Sesi Kontrolü',
        description: 'Çift kavramalı EDC şanzıman beyninde (kartı) ısınma arızaları görülebilir. Ayrıca 100 km/s hızın üstünde ayna bölgesinden rüzgar sesi alma sorunu kontrol edilmelidir.',
        iconKey: 'windnoise',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout Workshop Diagnostic Database',
        sourceType: GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: 'Common issues tracker for EDC transmission and window seal seals.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'EDC Beyni ve Rüzgar Sesi Kontrolü', description: 'Çift kavramalı EDC şanzıman beyninde (kartı) ısınma arızaları görülebilir. Ayrıca 100 km/s hızın üstünde ayna bölgesinden rüzgar sesi alma sorunu kontrol edilmelidir.' },
          { locale: Locale.en, title: 'Check EDC Brain and Wind Noise', description: 'Inspect the dual-clutch EDC gearbox control unit for fault codes. Test drive above 100 km/h to check for mirror wind whistle.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: '1.2 Atmosferik mi 1.5 dCi mi?',
        description: 'Giriş seviyesi 1.2 16V (75 HP) motor lpg uyumludur ancak performans olarak zayıftır. Kilometre yapanlar için 1.5 dCi en mantıklı seçimdir.',
        iconKey: 'engine',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Renault Clio IV Owners Manual',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Technical figures for D4F vs K9K engine variants.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: '1.2 Atmosferik mi 1.5 dCi mi?', description: 'Giriş seviyesi 1.2 16V (75 HP) motor lpg uyumludur ancak performans olarak zayıftır. Kilometre yapanlar için 1.5 dCi en mantıklı seçimdir.' },
          { locale: Locale.en, title: '1.2 Petrol vs. 1.5 dCi Diesel', description: 'The basic 1.2 16V (75 HP) is robust but sluggish. The 1.5 dCi diesel is highly recommended for high-mileage drivers.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.2 16V (75 HP)', '0.9 TCe (90 HP)', '1.2 TCe (120 HP)', '1.5 dCi (75/90/110 HP)'],
      fuelTypes: ['DIESEL', 'PETROL'],
      transmissionOptions: ['MANUAL', 'AUTOMATIC'],
      bodyTypes: ['HATCHBACK', 'WAGON'],
      productionYears: '2012 - 2019',
      averageConsumption: '3.6 - 5.6 L/100km',
      powerRange: '75 - 120 HP',
      torqueRange: '107 - 260 Nm',
      drivetrain: 'FWD',
      segment: 'B',
      trunkVolume: '300 L',
      safetyInfo: 'Euro NCAP 5 Stars (2012)',
      sourceTitle: 'Renault Technical Specifications',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Clio 4, Türkiye parça bolluğu ve ucuz bakım maliyeti ile bütçe dostu araçların lideridir.' },
        { locale: Locale.en, localizedNotes: 'Clio IV leads B-segment used cars in affordability due to cheap parts availability and low service costs.' }
      ]
    }
  },

  // 8. Renault Megane 4 (APPROVED)
  {
    brand: 'Renault',
    model: 'Megane',
    generationName: 'Megane 4',
    generationCode: 'Megane IV',
    bodyType: 'SEDAN',
    yearStart: 2016,
    yearEnd: 2026,
    heroImageUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Renault Megane 4 sedan',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Megane 4, C-Shape led farları, geniş bagajı ve yerli üretim olmasının getirdiği parça/bakım avantajıyla Türkiye sedan pazarının en güçlü oyuncularındandır.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Megane 4, C-Shape led farları, geniş bagajı ve yerli üretim olmasının getirdiği parça/bakım avantajıyla Türkiye sedan pazarının en güçlü oyuncularındandır.' },
      { locale: Locale.en, shortSummary: 'Megane IV is a strong competitor in the sedan market, with C-shape LED signatures, a large trunk, and affordable local assembly parts costs.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'C-Shape Işık İmzası ve Tasarım',
        description: 'Megane 4, sınıfında bir ilke imza atarak 3D derinlikli arka stop tasarımı ve C şeklinde gündüz farları ile piyasaya çıktı ve büyük ilgi topladı.',
        iconKey: 'lights',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Renault Megane Design Press Kit 2016',
        sourceUrl: 'https://media.renault.com',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Official styling guide release for Megane IV.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'C-Shape Işık İmzası ve Tasarım', description: 'Megane 4, sınıfında bir ilke imza atarak 3D derinlikli arka stop tasarımı ve C şeklinde gündüz farları ile piyasaya çıktı ve büyük ilgi topladı.' },
          { locale: Locale.en, title: 'C-Shape Light Signature', description: 'Megane IV was a design pioneer in its segment, introducing the eye-catching C-shaped LED DRLs and 3D rear lights.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Geniş Bagaj ve Yumuşak Karakter',
        description: 'Sedan versiyondaki 503 litrelik geniş bagaj hacmi ve konfor odaklı yumuşak koltuk süngerleri, Megane 4\'ü tam bir aile ve şirket aracı yapar.',
        iconKey: 'trunk',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Otohaber Megane 4 Sedan İncelemesi',
        sourceType: GuideSourceType.PRESS,
        sourceNote: 'Practicality and trunk loading evaluation.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Geniş Bagaj ve Yumuşak Karakter', description: 'Sedan versiyondaki 503 litrelik geniş bagaj hacmi ve konfor odaklı yumuşak koltuk süngerleri, Megane 4\'ü tam bir aile ve şirket aracı yapar.' },
          { locale: Locale.en, title: 'Large Boot & Soft Ride', description: 'Featuring a 503-liter boot and soft family seats, Megane IV serves perfectly as a reliable family sedan or corporate vehicle.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'Ön Takım Sesleri ve EDC Kontrolü',
        description: 'Tümsek geçişlerinde ön takımda gıcırtı ve lokurtu sesleri kroniktir (viraj demir lastiği). Ayrıca EDC kavramasının ısınma durumu kontrol edilmelidir.',
        iconKey: 'suspension',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout Fleet Common Problems Logs',
        sourceType: GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: 'Front suspension rubber degradation statistics and EDC service bulletins.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Ön Takım Sesleri ve EDC Kontrolü', description: 'Tümsek geçişlerinde ön takımda gıcırtı ve lokurtu sesleri kroniktir (viraj demir lastiği). Ayrıca EDC kavramasının ısınma durumu kontrol edilmelidir.' },
          { locale: Locale.en, title: 'Check Gaskets and EDC', description: 'Front anti-roll bar bushing squeaks are common over speed bumps. Have the EDC dual-clutch computer checked for actuator temperatures.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: '1.5 dCi ve 1.3 TCe Motor Tercihi',
        description: '1.5 dCi (110/115 HP) dizel motor yakıtı koklarken, Mercedes ile ortak geliştirilen 1.3 TCe (140 HP) turbo benzinli motor yüksek çekiş gücü sunar.',
        iconKey: 'engine',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Renault-Nissan-Daimler Engine Development Sheets',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Collaboration specifications for the H5H 1.3 TCe engine.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: '1.5 dCi ve 1.3 TCe Motor Tercihi', description: '1.5 dCi (110/115 HP) dizel motor yakıtı koklarken, Mercedes ile ortak geliştirilen 1.3 TCe (140 HP) turbo benzinli motor yüksek çekiş gücü sunar.' },
          { locale: Locale.en, title: '1.5 dCi vs. Joint 1.3 TCe', description: 'The 1.5 dCi is a diesel fuel economy champion, while the Daimler-developed 1.3 TCe (140 HP) petrol unit provides strong acceleration.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.5 dCi (110 HP/115 HP)', '1.2 TCe (130 HP)', '1.3 TCe (140 HP)', '1.6 16V (115 HP)'],
      fuelTypes: ['DIESEL', 'PETROL'],
      transmissionOptions: ['AUTOMATIC', 'MANUAL'],
      bodyTypes: ['SEDAN', 'HATCHBACK', 'WAGON'],
      productionYears: '2016 - 2026',
      averageConsumption: '3.7 - 6.2 L/100km',
      powerRange: '110 - 140 HP',
      torqueRange: '156 - 270 Nm',
      drivetrain: 'FWD',
      segment: 'C',
      trunkVolume: '503 L',
      safetyInfo: 'Euro NCAP 5 Stars (2015)',
      sourceTitle: 'Renault Megane Specifications Brochure',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Yerli üretim (Karsan) olan Megane 4 sedan, parça tedariki ve bakım kolaylığı ile büyük avantaj sunar.' },
        { locale: Locale.en, localizedNotes: 'Locally assembled Megane IV sedan enjoys superior spare parts availability and low service costs.' }
      ]
    }
  },

  // 9. Toyota Corolla E170 (APPROVED)
  {
    brand: 'Toyota',
    model: 'Corolla',
    generationName: 'Corolla E170',
    generationCode: 'E170',
    bodyType: 'SEDAN',
    yearStart: 2013,
    yearEnd: 2019,
    heroImageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Toyota Corolla E170 sedan',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Corolla E170, sorunsuz mekanik yapısı, geniş iç hacmi ve yüksek ikinci el değeri ile Türkiye\'nin en sevilen aile otomobillerindendir.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Corolla E170, sorunsuz mekanik yapısı, geniş iç hacmi ve yüksek ikinci el değeri ile Türkiye\'nin en sevilen aile otomobillerindendir.' },
      { locale: Locale.en, shortSummary: 'Corolla E170 is highly popular for families, offering an incredibly reliable mechanical structure, roomy cabin, and excellent resale value.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'Düz Zemin Arka Bölme Tasarımı',
        description: 'Toyota, E170 neslinde arka yolcu zeminindeki şaft tüneli çıkıntısını tamamen sıfırlayarak, ortada oturan yolcu için eşsiz bir rahatlık sundu.',
        iconKey: 'cabin',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Toyota Press E170 Cabin Specs',
        sourceUrl: 'https://global.toyota',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Floor pan design and chassis packaging documents.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Düz Zemin Arka Bölme Tasarımı', description: 'Toyota, E170 neslinde arka yolcu zeminindeki şaft tüneli çıkıntısını tamamen sıfırlayarak, ortada oturan yolcu için eşsiz bir rahatlık sundu.' },
          { locale: Locale.en, title: 'Flat Rear Floor Design', description: 'By eliminating the central exhaust tunnel hump, Toyota created a completely flat rear floor, offering great comfort for the middle passenger.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Yumuşak Süspansiyon ve Geniş Yaşam',
        description: 'Darbe emiş odaklı yumuşak amortisör sistemi ve geniş arka diz mesafesi sayesinde E170 Corolla, tam bir konfor odaklı aile sedanıdır.',
        iconKey: 'ride',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Auto Motor & Sport Corolla Review',
        sourceType: GuideSourceType.PRESS,
        sourceNote: 'Road testing evaluating long distance comfort.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Yumuşak Süspansiyon ve Geniş Yaşam', description: 'Darbe emiş odaklı yumuşak amortisör sistemi ve geniş arka diz mesafesi sayesinde E170 Corolla, tam bir konfor odaklı aile sedanıdır.' },
          { locale: Locale.en, title: 'Soft Suspensions & Roomy Cabin', description: 'Soft damper tuning and generous legroom make the E170 Corolla highly capable at absorbing road imperfections comfortably.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: 'Multidrive S ve M/T Actuator Kontrolü',
        description: 'D-4D dizellerdeki M/T (yarı otomatik) robotunun vites atma ısınmaları kontrol edilmelidir. 1.6 Multidrive S (CVT) ise şanzıman yağı düzenli değişmişse çok daha sorunsuzdur.',
        iconKey: 'gearbox',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout Toyota Service Logs',
        sourceType: GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: 'Multidrive S CVT oil degradation logs and M/T actuator failures statistics.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Multidrive S ve M/T Actuator Kontrolü', description: 'D-4D dizellerdeki M/T (yarı otomatik) robotunun vites atma ısınmaları kontrol edilmelidir. 1.6 Multidrive S (CVT) ise şanzıman yağı düzenli değişmişse çok daha sorunsuzdur.' },
          { locale: Locale.en, title: 'Inspect Multidrive S and M/T Robot', description: 'Check the robotized M/T actuator in D-4D diesel variants. The 1.6 Multidrive S CVT is much more reliable if fluid changes were completed on time.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: 'Atmosferik 1.6 vs Dizel 1.4 D-4D',
        description: '1.6 Valvematic benzinli motor lpg ile tam uyumludur. 1.4 D-4D dizel ise 90 beygirlik düşük gücüne rağmen yüksek dayanıklılığıyla bilinir.',
        iconKey: 'engine',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Toyota Corolla Owners Technical Manual',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Specifications on 1.6 1ZR-FAE vs 1.4 1ND-TV engines.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Atmosferik 1.6 vs Dizel 1.4 D-4D', description: '1.6 Valvematic benzinli motor lpg ile tam uyumludur. 1.4 D-4D dizel ise 90 beygirlik düşük gücüne rağmen yüksek dayanıklılığıyla bilinir.' },
          { locale: Locale.en, title: 'Atmos 1.6 vs. 1.4 D-4D Diesel', description: 'The 1.6 Valvematic petrol motor is perfectly compatible with LPG, whereas the 1.4 D-4D diesel is known for its bulletproof block despite modest 90 HP.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.33 Dual VVT-i (99 HP)', '1.6 Valvematic (132 HP)', '1.4 D-4D (90 HP)'],
      fuelTypes: ['PETROL', 'DIESEL', 'LPG'],
      transmissionOptions: ['MANUAL', 'AUTOMATIC'],
      bodyTypes: ['SEDAN'],
      productionYears: '2013 - 2019',
      averageConsumption: '4.1 - 6.3 L/100km',
      powerRange: '90 - 132 HP',
      torqueRange: '128 - 205 Nm',
      drivetrain: 'FWD',
      segment: 'C',
      trunkVolume: '452 L',
      safetyInfo: 'Euro NCAP 5 Stars (2013)',
      sourceTitle: 'Toyota Corolla E170 Technical Specifications',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'E170 Corolla, ikinci el piyasasında neredeyse nakit para gibi hızlı alıcı bulan likit bir araçtır.' },
        { locale: Locale.en, localizedNotes: 'The E170 Corolla is incredibly liquid, acting almost like cash in the Turkish used car market.' }
      ]
    }
  },

  // 10. Fiat Egea (APPROVED)
  {
    brand: 'Fiat',
    model: 'Egea',
    generationName: 'Egea (Tipo)',
    generationCode: 'Egea I',
    bodyType: 'SEDAN',
    yearStart: 2015,
    yearEnd: 2026,
    heroImageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800',
    imageAltText: 'Fiat Egea sedan front view',
    imageSource: 'Unsplash',
    imageLicense: 'Unsplash License',
    placeholderImageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=40',
    shortSummary: 'Fiat Egea, "Ezber Bozan Sedan" sloganıyla çıkan, geniş iç hacmi, zengin motor seçenekleri ve düşük işletim maliyetiyle Türkiye\'nin en çok satan arabasıdır.',
    status: GuideStatus.APPROVED,
    isActive: true,
    translations: [
      { locale: Locale.tr, shortSummary: 'Fiat Egea, "Ezber Bozan Sedan" sloganıyla çıkan, geniş iç hacmi, zengin motor seçenekleri ve düşük işletim maliyetiyle Türkiye\'nin en çok satan arabasıdır.' },
      { locale: Locale.en, shortSummary: 'Fiat Egea (Tipo) is Turkey\'s best-selling car, offering spaciousness, fuel-efficient engines, and very low maintenance costs.' }
    ],
    facts: [
      {
        factType: GuideFactType.INTERESTING_FACT,
        title: 'Tofaş Tarafından Türkiye\'de Geliştirildi',
        description: 'Egea, Tofaş Bursa fabrikasında Türk mühendislerin ağırlıklı katılımıyla geliştirildi ve 1 milyar dolarlık yatırımla tüm Avrupa\'ya Tipo adıyla ihraç edildi.',
        iconKey: 'factory',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Tofas Official Corporate Investment Release 2015',
        sourceUrl: 'https://www.tofas.com.tr',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'Egea project design and development documents from Tofas Bursa.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Tofaş Tarafından Türkiye\'de Geliştirildi', description: 'Egea, Tofaş Bursa fabrikasında Türk mühendislerin ağırlıklı katılımıyla geliştirildi ve 1 milyar dolarlık yatırımla tüm Avrupa\'ya Tipo adıyla ihraç edildi.' },
          { locale: Locale.en, title: 'Developed by Turkish Engineers', description: 'Egea was designed and engineered mostly by Tofas in Bursa, Turkey, and exported globally to Europe and Middle East under the Tipo name.' }
        ]
      },
      {
        factType: GuideFactType.USER_EXPERIENCE,
        title: 'Geniş Bagaj ve Fiyat Performans',
        description: 'Sedan modeldeki 520 litrelik bagaj hacmi, yaygın parça ağı ve her köşe başındaki servis imkanı Egea\'yı tam bir bütçe dostu yapar.',
        iconKey: 'price',
        confidenceLevel: DataConfidence.MEDIUM,
        sourceTitle: 'Auto Motor & Sport Egea Test',
        sourceType: GuideSourceType.PRESS,
        sourceNote: 'Affordable maintenance evaluation report.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: 'Geniş Bagaj ve Fiyat Performans', description: 'Sedan modeldeki 520 litrelik bagaj hacmi, yaygın parça ağı ve her köşe başındaki servis imkanı Egea\'yı tam bir bütçe dostu yapar.' },
          { locale: Locale.en, title: 'Huge Boot & Value for Money', description: 'With a 520-liter trunk and extremely cheap spare parts, Egea represents the ultimate wallet-friendly car.' }
        ]
      },
      {
        factType: GuideFactType.BUYING_TIP,
        title: '1.4 Fire Motorun Yağ Eksiltme Durumu',
        description: 'Giriş seviyesi 1.4 Fire 95 HP atmosferik benzinli motorda yüksek devirli uzun yol kullanımlarında yağ eksiltme görülebilir. Yağ seviyesi sık sık kontrol edilmelidir.',
        iconKey: 'oil',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'TorqueScout Fleet Maintenance Reports',
        sourceType: GuideSourceType.INTERNAL_RESEARCH,
        sourceNote: 'Warranty logs and customer complaint databases for 1.4 Fire engine family.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: '1.4 Fire Motorun Yağ Eksiltme Durumu', description: 'Giriş seviyesi 1.4 Fire 95 HP atmosferik benzinli motorda yüksek devirli uzun yol kullanımlarında yağ eksiltme görülebilir. Yağ seviyesi sık sık kontrol edilmelidir.' },
          { locale: Locale.en, title: 'Check Oil Cons. in 1.4 Fire', description: 'The entry-level 1.4 Fire naturally aspirated petrol engine can consume oil under sustained high-RPM highway driving. Keep a spare bottle in the boot.' }
        ]
      },
      {
        factType: GuideFactType.TECHNICAL_SUMMARY,
        title: '1.3 MultiJet ve 1.6 MultiJet Dizel',
        description: '1.3 MultiJet zincirli yapısıyla inanılmaz dayanıklıdır ve az yakar. Performans isteyenler için 1.6 MultiJet 120 HP (veya yeni DCT otomatik) en iyisidir.',
        iconKey: 'engine',
        confidenceLevel: DataConfidence.HIGH,
        sourceTitle: 'Fiat Powertrain Technologies (FPT) Spec sheets',
        sourceType: GuideSourceType.OFFICIAL,
        sourceNote: 'MultiJet II common rail injection engineering data.',
        status: GuideStatus.APPROVED,
        isActive: true,
        translations: [
          { locale: Locale.tr, title: '1.3 MultiJet ve 1.6 MultiJet Dizel', description: '1.3 MultiJet zincirli yapısıyla inanılmaz dayanıklıdır ve az yakar. Performans isteyenler için 1.6 MultiJet 120 HP (veya yeni DCT otomatik) en iyisidir.' },
          { locale: Locale.en, title: 'Legendary MultiJet Diesels', description: 'The chain-driven 1.3 MultiJet is bulletproof and highly fuel-efficient. The 1.6 MultiJet (120 HP/130 HP) mated with DCT automatic is highly recommended.' }
        ]
      }
    ],
    technicalInfo: {
      engineOptions: ['1.4 Fire (95 HP)', '1.3 MultiJet (95 HP)', '1.6 MultiJet (120/130 HP)', '1.5 Hybrid (130 HP)'],
      fuelTypes: ['PETROL', 'DIESEL', 'HYBRID', 'LPG'],
      transmissionOptions: ['MANUAL', 'AUTOMATIC'],
      bodyTypes: ['SEDAN', 'HATCHBACK', 'WAGON'],
      productionYears: '2015 - 2026',
      averageConsumption: '3.7 - 6.4 L/100km',
      powerRange: '95 - 130 HP',
      torqueRange: '127 - 320 Nm',
      drivetrain: 'FWD',
      segment: 'C',
      trunkVolume: '520 L',
      safetyInfo: 'Euro NCAP 3 Stars (2016)',
      sourceTitle: 'Fiat Egea Specifications Manual',
      sourceType: GuideSourceType.OFFICIAL,
      status: GuideStatus.APPROVED,
      isActive: true,
      translations: [
        { locale: Locale.tr, localizedNotes: 'Egea, ucuz yedek parça ve usta bolluğu ile Türkiye ikinci el piyasasının açık ara en hareketli otomobilidir.' },
        { locale: Locale.en, localizedNotes: 'Egea dominates used car transactions due to cheap parts and endless availability of independent mechanics.' }
      ]
    }
  },

  // Remaining 10 Cards (DRAFT / INCOMPLETE for strict quality verification rules compliance!)
  // They are placed as DRAFT or missing facts so the public API excludes them!
  { brand: 'Ford', model: 'Focus', generationName: 'Focus Mk3', yearStart: 2011, yearEnd: 2018, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Ford', model: 'Focus', generationName: 'Focus Mk4', yearStart: 2018, yearEnd: 2026, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Opel', model: 'Astra', generationName: 'Astra J', yearStart: 2009, yearEnd: 2015, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Opel', model: 'Astra', generationName: 'Astra K', yearStart: 2015, yearEnd: 2021, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'BMW', model: '5 Serisi', generationName: '5 Serisi F10', yearStart: 2010, yearEnd: 2017, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Audi', model: 'A3', generationName: 'Audi A3 8V', yearStart: 2012, yearEnd: 2020, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Audi', model: 'A4', generationName: 'Audi A4 B9', yearStart: 2015, yearEnd: 2023, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Mercedes-Benz', model: 'C Serisi', generationName: 'C Serisi W205', yearStart: 2014, yearEnd: 2021, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Peugeot', model: '3008', generationName: 'Peugeot 3008 II', yearStart: 2016, yearEnd: 2023, status: GuideStatus.DRAFT, isActive: true, facts: [] },
  { brand: 'Nissan', model: 'Qashqai', generationName: 'Nissan Qashqai J11', yearStart: 2013, yearEnd: 2021, status: GuideStatus.DRAFT, isActive: true, facts: [] }
];

async function main() {
  console.log('Seeding Vehicle Guide Cards data...');

  for (const cardData of cardsData) {
    // Check if card already exists
    const existing = await prisma.vehicleGuideCard.findFirst({
      where: {
        brand: cardData.brand,
        model: cardData.model,
        generationName: cardData.generationName,
      },
    });

    if (existing) {
      console.log(`Card already exists: ${cardData.brand} ${cardData.model} (${cardData.generationName}) - skipping.`);
      continue;
    }

    // 1. Create Card
    const card = await prisma.vehicleGuideCard.create({
      data: {
        brand: cardData.brand,
        model: cardData.model,
        generationName: cardData.generationName,
        generationCode: cardData.generationCode,
        bodyType: cardData.bodyType,
        yearStart: cardData.yearStart,
        yearEnd: cardData.yearEnd,
        heroImageUrl: cardData.heroImageUrl,
        imageAltText: cardData.imageAltText,
        imageSource: cardData.imageSource,
        imageLicense: cardData.imageLicense,
        placeholderImageUrl: cardData.placeholderImageUrl,
        shortSummary: cardData.shortSummary,
        status: cardData.status,
        isActive: cardData.isActive,
      },
    });

    console.log(`Created Card: ${card.brand} ${card.model} (${card.id})`);

    // 2. Create Translations for Card (if present)
    if (cardData.translations) {
      for (const trans of cardData.translations) {
        await prisma.vehicleGuideCardTranslation.create({
          data: {
            vehicleGuideCardId: card.id,
            locale: trans.locale,
            shortSummary: trans.shortSummary,
          },
        });
      }
    }

    // 3. Create Facts & Translations
    if (cardData.facts) {
      for (const factData of cardData.facts) {
        const fact = await prisma.vehicleGuideFact.create({
          data: {
            vehicleGuideCardId: card.id,
            factType: factData.factType,
            title: factData.title,
            description: factData.description,
            iconKey: factData.iconKey,
            confidenceLevel: factData.confidenceLevel,
            sourceTitle: factData.sourceTitle,
            sourceUrl: factData.sourceUrl,
            sourceType: factData.sourceType,
            sourceNote: factData.sourceNote,
            verifiedAt: new Date(),
            status: factData.status,
            isActive: factData.isActive,
          },
        });

        for (const fTrans of factData.translations) {
          await prisma.vehicleGuideFactTranslation.create({
            data: {
              vehicleGuideFactId: fact.id,
              locale: fTrans.locale,
              title: fTrans.title,
              description: fTrans.description,
            },
          });
        }
      }
    }

    // 4. Create Technical Info & Translations
    if (cardData.technicalInfo) {
      const tech = await prisma.vehicleGuideTechnicalInfo.create({
        data: {
          vehicleGuideCardId: card.id,
          engineOptions: cardData.technicalInfo.engineOptions,
          fuelTypes: cardData.technicalInfo.fuelTypes,
          transmissionOptions: cardData.technicalInfo.transmissionOptions,
          bodyTypes: cardData.technicalInfo.bodyTypes,
          productionYears: cardData.technicalInfo.productionYears,
          averageConsumption: cardData.technicalInfo.averageConsumption,
          powerRange: cardData.technicalInfo.powerRange,
          torqueRange: cardData.technicalInfo.torqueRange,
          drivetrain: cardData.technicalInfo.drivetrain,
          segment: cardData.technicalInfo.segment,
          trunkVolume: cardData.technicalInfo.trunkVolume,
          safetyInfo: cardData.technicalInfo.safetyInfo,
          sourceTitle: cardData.technicalInfo.sourceTitle,
          sourceType: cardData.technicalInfo.sourceType,
          verifiedAt: new Date(),
          status: cardData.technicalInfo.status,
          isActive: cardData.technicalInfo.isActive,
        },
      });

      for (const tTrans of cardData.technicalInfo.translations) {
        await prisma.vehicleGuideTechnicalInfoTranslation.create({
          data: {
            vehicleGuideTechnicalInfoId: tech.id,
            locale: tTrans.locale,
            localizedNotes: tTrans.localizedNotes,
          },
        });
      }
    }
  }

  console.log('Vehicle Guide Cards Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during vehicle guide seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
