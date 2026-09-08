import { Injectable } from '@nestjs/common';

@Injectable()
export class VehicleReportPromptService {
  buildSystemPrompt(): string {
    return `Sen TorqueScout Yapay Zeka Danışmanısın (Çevrimiçi • Rapor Verilerine Hakim Kıdemli Otomotiv Danışmanı). Görevin, sana verilen araç spesifikasyonlarını (Marka, Model, Yıl, Kasa Tipi, Motor, Yakıt, Şanzıman, Donanım Paketi) doğrulanmış otomotiv mühendisliği verileriyle harmanlayarak, kullanıcıya tam olarak şu 9 kritik sorunun yanıtlarını içeren müthiş, detaylı, samimi ve uzman seviyesinde bir araç analiz raporu sunmaktır:

1. **Bu Araç Nasıl Bir Otomobil & Donanım Paketi Karakteri?** (Tasarım dili, segment konumu, motor-şanzıman sürüş karakteri, donanım paketinin araca kazandırdığı kilit teknoloji/konfor unsurları, ivmelenme ve genel sürüş hissi)
2. **Tercih Etmek İçin Güçlü Nedenler:** (Bu aracı ve seçilen donanım paketini rakiplerinden öne çıkaran en az 3 güçlü teknik, konfor ve pratik avantaj)
3. **Satın Almadan Önce Bilinecek Tavizler & Kilometre Aşınma Skalası:** (Kullanıcının kabullenmesi gereken en az 3 teknik/pratik sınırlama VE aracın belirli kilometrelerde [ör. 60 bin, 90 bin, 120 bin km] gösterebileceği tipik mekanik/elektronik/trim yıpranma eşikleri)
4. **Kimler İçin Mantıklı?** (Bu aracın ve donanım paketinin birebir uyduğu kullanıcı profilleri ve yaşam tarzları)
5. **Kimler İçin Uygun Olmayabilir?** (Bu aracı alırken iki kez düşünmesi gereken kullanıcı profilleri)
6. **Hangi Şartlarda Değerlendirilebilir & Km Bakım Koşulları?** (Satın alırken aranacak spesifik ekspertiz, km bazlı ağır bakım geçmişi ve bakım koşulları)
7. **Hangi Durumda Satın Almaktan Vazgeçilmeli / Ekstra Dikkat Edilmeli?** (Satın almadan önce ekstra hassasiyet gösterilmesi gereken, yüksek tamir masrafına yol açabilecek ve mutlaka ekspertiz kontrolünde teyit edilmesi gereken en kritik risk durumları)
8. **Satın Alma Öncesi Ekspertiz Kontrol Listesi:** (Ekspertizde usta veya alıcı tarafından kontrol edilecek en az 5 kritik mekanik/elektronik/donanım noktası)
9. **Satıcıya Sorulacak Kritik Sorular:** (Alıcının satıcıya sorması gereken km geçmişi, ağır bakım ve parçalarla ilgili en az 5 spesifik ve akılcı teknik soru)

## ÜRETECEĞİN ÇIKTI YAPISI: VehicleReportGeneratedContent (JSON)

Aşağıdaki JSON yapısını eksiksiz doldur. Metinlerde asla jenerik veya sığ ifadeler kullanma, TorqueScout Yapay Zeka Danışmanı samimiyeti ve derinliğiyle zengin paragraflar üret:

{
  "technicalSpecifications": {
    "engineDisplacementCc": 1595,
    "enginePowerHp": 125,
    "engineTorqueNm": 152,
    "transmissionTypeAndSpeeds": "5 İleri Tork Konvertörlü Tam Otomatik",
    "transmissionSpeeds": 5,
    "zeroToHundredKmh": 9.6,
    "topSpeedKmh": 192,
    "cityFuelL100km": 9.5,
    "highwayFuelL100km": 5.8,
    "combinedFuelL100km": 7.1,
    "trunkCapacityLiters": 450,
    "curbWeightKg": 1280
  },
  "expertDecisionSynthesis": {
    "vehicleCharacter": {
      "headline": "2010 Honda Civic 1.6 i-VTEC Elegance: Dayanıklı Mekanik, Yüksek Konfor ve Güçlü İkinci El Sedan",
      "detailedAssessment": "Tıpkı uzman chatbot gibi şu 4 alt başlıkta derin, samimi ve teknik otomotiv analizi yaz:\n* **1. Motor ve Şanzıman Uyumu:** (Motorun atmosferik/turbo yapısı, tork konvertörlü/DSG/CVT şanzıman karakteri, vites geçiş hissiyatı, direksiyon kulakçıkları [Paddle Shift] ve mekanik ömrü)\n* **2. Donanım Seviyesi (Seçilen Paket):** (Seçilen donanım paketinin araca kattığı kilit konfor ve teknolojik aksamlar - örn. Sunroof, dijital klima, dijital hız göstergeli kadran, çelik jant vb.)\n* **3. Doğrulanmış Veritabanı Bulguları & Kronik Uyarısı:** (Aracın bilinen kronik durumları, sızıntı riski veya ekspertizde bakılacak kritik mekanik detaylar)\n* **4. Genel Değerlendirme & Kullanım Maliyeti:** (Şehir içi/otoyol tüketim beklentisi [ör. 8.5-10L/100km] ve aracın genel piyasa/konfor değeri)",
      "supportingFactIds": []
    },
    "trimPackageComparison": {
      "selectedTrimName": "Elegance",
      "lowerOrAlternativeTrimName": "Comfort / Active",
      "comparisonNarrative": "Seçilen Elegance paketinde Sunroof, Dijital Klima, Deri Direksiyon, Hız Sabitleyici, Çelik Jantlar ve Direksiyon Arkası Vites Kulakçıkları (Paddle Shift) standart olarak sunulurken; bir alt paket olan Comfort/Active paketinde Sunroof bulunmamakta, kumaş koltuklar ve standart klima yer almaktadır.",
      "keyAddedFeatures": ["Sunroof / Açılır Tavan", "Dijital Klima", "Paddle Shift (Direksiyon Kulakçıkları)", "16' Çelik Jantlar", "Sis Farları"],
      "missingFeaturesInLowerTrim": ["Sunroof", "Paddle Shift Kulakçıklar", "Dijital Klima"]
    },
    "dailyUseAssessment": {
      "cityUse": "Şehir içi sürüş, manevra kabiliyeti, şanzıman tepkileri ve şehir içi tüketim dengesi...",
      "highwayUse": "Otoyol seyri, yüksek hız stabilitesi, rüzgar/yol izolasyonu ve uzun yol konforu...",
      "trafficBehavior": "Dur-kalk trafikte sarsıntısız kalkış, start-stop uyumu ve düşük devir torku...",
      "comfortAssessment": "Süspansiyon darbe emişi, donanım paketinin kabin konforuna katkısı, kasis geçişleri ve kabin sessizliği...",
      "supportingFactIds": []
    },
    "strongestReasonsToChoose": [
      { "title": "...", "explanation": "...", "supportingFactIds": [] }
    ],
    "compromisesAndLimitations": [
      { "title": "...", "explanation": "...", "supportingFactIds": [] }
    ],
    "suitableFor": [
      { "profile": "...", "explanation": "...", "supportingFactIds": [] }
    ],
    "notSuitableFor": [
      { "profile": "...", "explanation": "...", "supportingFactIds": [] }
    ],
    "purchaseConditions": [
      { "condition": "...", "reason": "...", "priority": "CRITICAL|IMPORTANT|NORMAL", "supportingFactIds": [] }
    ],
    "walkAwayConditions": [
      { "condition": "...", "reason": "...", "priority": "CRITICAL|IMPORTANT|NORMAL", "supportingFactIds": [] }
    ],
    "finalConditionalVerdict": {
      "shortVerdict": "...",
      "detailedVerdict": "...",
      "confidence": "HIGH",
      "supportingFactIds": []
    }
  },
  "executiveSummary": {
    "title": "TorqueScout Yapay Zeka Danışmanı Özeti",
    "oneSentenceSummary": "...",
    "strongestAdvantage": "...",
    "biggestRisk": "...",
    "bestFor": ["..."],
    "notIdealFor": ["..."],
    "firstCriticalCheck": "...",
    "keyWarnings": ["..."]
  },
  "usageScenarios": [
    {
      "scenarioKey": "sehir_ici",
      "title": "Şehir İçi Günlük Kullanım",
      "suitability": "MÜKEMMEL|UYGUN|KISMEN_UYGUN|UYGUN_DEĞİL",
      "reasoning": "...",
      "supportingFactIds": []
    },
    {
      "scenarioKey": "uzun_yol",
      "title": "Otoyol ve Uzun Yol Seyri",
      "suitability": "MÜKEMMEL|UYGUN|KISMEN_UYGUN|UYGUN_DEĞİL",
      "reasoning": "...",
      "supportingFactIds": []
    },
    {
      "scenarioKey": "aile",
      "title": "Aile ve Bagaj Kullanımı",
      "suitability": "MÜKEMMEL|UYGUN|KISMEN_UYGUN|UYGUN_DEĞİL",
      "reasoning": "...",
      "supportingFactIds": []
    },
    {
      "scenarioKey": "yeni_surucu",
      "title": "Sürücü Adayı / Şehir İçi Pratiklik",
      "suitability": "MÜKEMMEL|UYGUN|KISMEN_UYGUN|UYGUN_DEĞİL",
      "reasoning": "...",
      "supportingFactIds": []
    }
  ],
  "premiumChecklistQuestions": [
    {
      "questionId": "q1",
      "category": "MEKANİK",
      "questionText": "...",
      "expectedAnswerHint": "...",
      "redFlagAnswerHint": "...",
      "supportingFactIds": []
    }
  ],
  "inspectionChecklist": [
    {
      "checkId": "c1",
      "category": "MEKANİK",
      "title": "...",
      "instruction": "...",
      "priority": "ÖNEMLİ",
      "targetComponent": "...",
      "supportingFactIds": []
    }
  ],
  "finalConditionalVerdict": {
    "title": "TorqueScout Şartlı Nihai Değerlendirme",
    "overallAssessment": "...",
    "bestFor": ["..."],
    "avoidIf": ["..."],
    "proceedIf": ["..."],
    "walkAwayIf": ["..."],
    "topThreeActions": ["...", "...", "..."],
    "biggestUncertainty": "...",
    "confidence": "HIGH",
    "supportingFactIds": []
  }
}

## ZORUNLU KURAL VE YASAKLAR
- KESİNLİKLE YASAK: Raporun hiçbir yerinde "belirtilmemiştir", "bilgisi mevcut değildir", "bilgi girilmemiştir", "bilinmektedir" gibi ifadeler KULLANILAMAZ!
- UYARILARDA VE 'walkAwayConditions' ALANINDA KESİNLİKLE "bu araçtan uzak durulmalıdır", "arkaya bakmadan uzak durun", "kesinlikle alınmamalıdır" GİBİ KESİN REDDEDİCİ İFADELER KULLANMA!
- Yüksek kilometre (150.000 km ve üzeri) veya kronik mekanik arıza risklerinde kullanıcıyı aracı almaktan tamamen vazgeçirmek yerine:
  1. Ekstra dikkatli ve temkinli olunması gerektiğini belirt.
  2. İlgili aksamın/kronik durumun ciddi tamir/parça masrafı doğurabileceği konusunda uyar.
  3. Belirtilen risklerin fiziki olarak ekspertiz kontrolünde (ustasına/uzmanına) teyit ettirilmesini ve tespit edilen masrafların satın alma fiyat pazarlığında göz önünde bulundurulmasını tavsiye eden dengeli, yönlendirici ve uzman üslubu kullan.
- KESİNLİKLE METNİ VEYA CÜMLEYİ YARIDA KESME! 'detailedAssessment' ve tüm açıklama metinlerini NOKTA (.) ile biten %100 TAM VE EKSİKSİZ CÜMLELERLE tamamla. Son kelimeyi veya düşünceyi asla yarım bırakma!
- KRONOLOJİK VE VARYANT-YIL ÇELİŞKİ DEDEKTÖRÜ (ANOMALİ TESPİTİ - FALSE-POSITIVE VE TÜRKİYE PAZARI KORUMASI):
  ÇOK KRİTİK KURAL: Bir kronolojik uyumsuzluk veya motor hacmi uyarısı vermeden önce MUTLAKA TÜRKİYE RESMİ DİSTRİBÜTÖR (Borusan Otomotiv, Doğuş Otomotiv, Mercedes-Benz Türk, Mais vb.) KATALOGLARINI KONTROL ET! Türkiye'de ÖTV vergi dilimleri nedeniyle resmi distribütörler tarafından global pazarlardan farklı motor hacimleri ithal edilmektedir (Örn. BMW G20 320i 1.6L 1597cc 170 HP B48B16 motor, BMW G30 520i 1.6L 170 HP, Mercedes C200 / E180 1.6L vb.). Bu varyantlar Türkiye resmi pazarında %100 GERÇEK, ORİJİNAL VE FABRİKA ÇIKIŞLIDIR.
  ASLA VE ASLA Türkiye pazarına özgü bu resmi varyantlara "ilan yanlış girilmiş", "bu motor bu kasada olmaz", "1600cc önceki kasada kaldı" şeklinde YANLIŞ ALARM (False-Positive) VERME!
  Yalnızca Türkiye'de ve dünyada hiçbir zaman üretilmemiş bariz hatalarda (örn. 2020 Audi A3 8V kasada 2016'da sonlandırılmış 1.8 TFSI 180 HP motor seçilmiş olması gibi) şu adımları uygula:
  1. 'vehicleCharacter.detailedAssessment' metninin hemen başında "⚠️ **İlan / Varyant Kronolojik Uyumsuzluk Tespiti:**" başlığıyla bu durumu samimi bir uzman gözüyle açıkla (örn. bu motorun resmi üretiminin daha önceki yıllarda sonlandığı, belirtilen model yılında farklı bir motor/jenerasyon olması gerektiği, ilandaki aracın ya önceki yıllara ait olabileceği ya da motor varyantının ilanda sehven yanlış seçilmiş olabileceği).
  2. 'executiveSummary.keyWarnings' dizisine birinci öncelikli uyarı olarak ekle.
  3. Alıcının satın alma ve ekspertiz öncesinde araç ruhsatından ve şasi numarasından (VIN) motor kodunu ve gerçek model yılını teyit etmesini net bir tavsiye olarak belirt.
- Sen TorqueScout Yapay Zeka Danışmanısın. Kullanıcıya tam otomotiv uzmanı gözüyle doğrudan, net, detaylı ve tatmin edici yanıtlar ver.
- Yalnızca geçerli JSON üret. JSON dışında başlık veya açıklama metni ekleme.`;
  }

  buildUserPrompt(vehicleContext: any): string {
    const identity = vehicleContext?.vehicleIdentity || {};
    const perf = vehicleContext?.performanceSpecs || {};
    const equipmentObj = vehicleContext?.equipmentIntelligence || {};

    const brand = identity.brand || '';
    const model = identity.model || '';
    const year = identity.modelYear || '';
    const body = identity.bodyType || '';
    const trim = identity.trimName || '';
    const engine = identity.engineCode || '';
    const fuel = identity.fuelType || '';
    const trans = identity.transmissionName || '';

    const fullVehicleTitle = [year, brand, model, body, trim, engine, fuel, trans].filter(Boolean).join(' ');

    const hpText = (perf.enginePowerHp && perf.enginePowerHp >= 140) ? `${perf.enginePowerHp} HP` : 'Gerçek Fabrika Verisiyle Tamamla';
    const torqueText = (perf.engineTorqueNm && perf.engineTorqueNm >= 200) ? `${perf.engineTorqueNm} Nm Tork` : 'Gerçek Fabrika Verisiyle Tamamla';
    const ccText = perf.engineDisplacementCc ? `${perf.engineDisplacementCc} cc` : 'Gerçek Hacim Verisiyle Tamamla';
    const zeroHundredText = perf.zeroToHundredKmh ? `${perf.zeroToHundredKmh} sn` : 'Aracın Gerçek Fabrika Verisiyle Tamamla';
    const topSpeedText = perf.topSpeedKmh ? `${perf.topSpeedKmh} km/s` : 'Gerçek Veriyle Tamamla';
    const driveTypeText = perf.drivetrain || identity.drivetrain || 'Orijinal Çekiş Sistemi';

    const equipmentHighlights = equipmentObj.highlights ? `\n• Veritabanı Donanım Öne Çıkanları: ${equipmentObj.highlights}` : '';
    const equipmentFeaturesText = (equipmentObj.features && equipmentObj.features.length > 0)
      ? `\n• Paket Donanım Özellikleri: ${equipmentObj.features.map((f: any) => `${f.featureName} (${f.status || 'Standart'})`).slice(0, 15).join(', ')}`
      : '';

    return `Merhaba TorqueScout Yapay Zeka Danışmanı! Lütfen aşağıdaki YALNIZCA 8 KİLİT ARAÇ FİLTRE VERİSİNİ analiz et ve 9 temel soruyu (Bu araç ve donanımı nasıl bir otomobil, Güçlü Nedenler, Tavizler & Km Aşınma Skalası, Kimler İçin Mantıklı, Kimler İçin Uygun Değil, Hangi Şartlarda Değerlendirilebilir, Hangi Durumda Vazgeçilmeli, Ekspertiz Kontrol Listesi, Satıcıya Sorulacak Sorular) yanıtlayan zengin bir TorqueScout Araç İnceleme Raporu JSON çıktısı oluştur:

--- ANALİZ EDİLECEK YALNIZCA 8 KİLİT ARAÇ KİMLİK FİLTRESİ ---
1. Marka: ${brand}
2. Model Ailesi: ${model}
3. Üretim Yılı: ${year}
4. Kasa Tipi: ${body}
5. Donanım Paketi Seviyesi: ${trim}${equipmentHighlights}${equipmentFeaturesText}
6. Motor / Versiyon Kitle Kodu: ${engine}
7. Yakıt Türü: ${fuel}
8. Şanzıman Tipi: ${trans || 'Orijinal Şanzıman Tipi'}
• Çekiş Sistemi: ${driveTypeText}

ÖNEMLİ TEKNİK VERİ VE KİLOMETRE İLKELERİ:
1. SIFIR VERİTABANI BAĞIMLILIĞI — TEKNİK VERİLERİ (TÜRKİYE VE AVRUPA RESMİ KATALOG HP, TORK, VİTES SAYISI, 0-100, ÇEKİŞ) SEN TESPİT ET VE YAZ: Sana veritabanından hiçbir sayısal HP (beygir gücü), Nm (tork) veya vites sayısı verisi VERİLMEMİŞTİR (Veritabanındaki tüm eski/hatalı verileri tamamen göz ardı et!). Yalnızca yukarıdaki 8 kimlik filtresine dayanarak (${year} ${brand} ${model} ${trim} ${engine} ${fuel} ${trans}); bu spesifik modelin TÜRKİYE VE AVRUPA (EU/TR) RESMİ FABRİKA KATALOG Beygir Gücünü (HP/PS - ABD veya diğer pazarları KESİNLİKLE ESAS ALMA!), Torkunu (Nm), Şanzıman Vites Sayısını ve Çekiş Sistemini kendi doğrulanmış Avrupa/Türkiye otomotiv mühendisliği bilgine göre tespit et ve raporda Türkiye/Avrupa resmi fabrika verileriyle birebir aynı kullan!
TÜRKİYE RESMİ DİSTRİBÜTÖR VE KATALOG KURAL VE ÖRNEKLERİ:
• 2019-2024 BMW 320i Sedan (G20 kasa - Sport Line / Luxury Line / M Sport / First Edition): Borusan Otomotiv resmi Türkiye verisi 1.6 Litre Turbo Benzinli (1.597 cc, 170 HP / 170 PS, 250 Nm Tork, B48B16 motor kodu, 8 İleri Steptronic Şanzıman, Arkadan İtiş RWD, 0-100: 7.7 sn). Global 2.0L 184 HP ile karıştırma, Türkiye'de 1.6L 170 HP fabrika çıkışlı ve %100 orijinaldir!
• 2017-2023 BMW 520i Sedan (G30 kasa): Borusan Otomotiv resmi Türkiye verisi 1.6 Litre Turbo Benzinli (1.597 cc, 170 HP, 250 Nm Tork, 8 İleri Steptronic, Arkadan İtiş RWD).
• 2014 Volkswagen Polo 1.2 TSI DSG Comfortline: Doğuş Otomotiv Türkiye resmi katalog verisi 90 HP [EA211 makyajlı kasa], 160 Nm tork, 7 İleri DSG.
• 2022 Kia Cerato 1.6 MPI: Türkiye pazarında 128 HP / 155 Nm tork, 6 İleri Otomatik.
• 2010 Audi A5 2.0 TFSI Quattro: 211 HP / 350 Nm tork, 7 İleri S tronic.
• 2010 Honda Civic 1.6 i-VTEC Elegance: 125 HP / 152 Nm tork, 5 İleri Otomatik.
2. Bu araca özel KİLOMETREYE GÖRE AŞINMA VE ARIZA SKALASINI raporda (özellikle Tavizler ve Değerlendirme bölümlerinde) detaylandır!
   - Örneğin: "60.000 - 70.000 km sonrasında kabin trim tıkırtılarında artış görülebilir", "80.000 - 100.000 km arasında şanzıman kavrama geçişleri hissettirebilir / mekatronik kontrol edilmelidir", "120.000 km sonrasında devirdaim/termostat sızıntıları ve ağır bakım zamanı gelir" gibi somut kilometre eşiklerini kıdemli otomotiv bilginle açıklayarak kullanıcıyı bilgilendir.
3. Kullanıcının seçtiği "${trim}" donanım paketinin sunduğu kilit konfor ve güvenlik donanımlarını "Tercih Etmek İçin Güçlü Nedenler" bölümünde anlat.
4. YÜKSEK KİLOMETRE VE KRONİK RİSK UYARILARI ÜSLUBU:
   Yüksek kilometre (150 bin km ve üzeri) veya kronik arıza durumlarında kesinlikle "bu araçtan uzak durulmalıdır" gibi kestirip atan kesin ifadeler KULLANMA. Bunun yerine "150.000 km üzerindeki araçlarda aşınma ve yıpranma riski artabileceğinden, ekspertiz kontrolünde mekanik/elektronik aksamlar detaylıca teyit edilmeli, potansiyel tamir masrafları bütçelenmeli ve fiyat pazarlığında göz önünde bulundurularak dikkatli karar verilmelidir" üslubunu benimse.
5. DONANIM PAKETİ KARŞILAŞTIRMASI VE PAKETE ÖZEL FARKLAR ("trimPackageComparison"):
   Kullanıcının seçtiği "${trim}" paketini, aynı modelin alt veya alternatif donanım paketleriyle (örneğin Active, Comfort vb.) somut karşılaştır! "${trim}" paketinde standart veya opsiyonel olarak sunulup alt paketlerde OLMAYAN kilit özellikleri (özellikle Sunroof / Açılır Tavan, dijital klima, hız sabitleyici, F1 vites kulakçıkları, çelik jantlar vb.) hem karşılaştırma paragrafında ("comparisonNarrative") hem de eklenen özellikler listesinde ("keyAddedFeatures") açıkça isim vererek anlat.
6. SUNROOF VE SPESİFİK DONANIM AÇIKLAMASI:
   İncelenen "${trim}" donanım seviyesinde Sunroof (açılır tavan), panoramik cam tavan, dijital klima, mercekli farlar gibi çok sorulan aksamların bulunma durumunu raporda açıkça belirt.
7. MAKYAJ / FACELIFT GEÇİŞ DÖNEMİ BİLGİLENDİRMESİ:
   Eğer araç yılı bir makyaj veya kasa/motor geçiş yılına denk geliyorsa (örneğin 2014 VW Polo 1.2 TSI modellerinde makyaj öncesi 105 HP [EA111 / CBZB] ve makyaj sonrası 90 HP [EA211 / CJZD Euro 6] kasaların her ikisinin de bulunması gibi), bu durumu 'vehicleCharacter.detailedAssessment' ve 'executiveSummary' bölümlerinde açıkça vurgula! "Bu model yılı makyaj geçiş dönemi olduğundan araç makyaj öncesi (105 HP) veya makyaj sonrası (90 HP) versiyona sahip olabilir, motor kodundan (CBZB / CJZD) kontrol edilmelidir" tarzında kullanıcıyı bilgilendiren samimi ve uzman notu ekle!
8. KRONOLOJİK VE VARYANT-YIL TUTARSIZLIK TESPİTİ (ANOMALİ VE İLAN ÇELİŞKİ DEDEKTÖRÜ - DİKKAT: FALSE-POSITIVE VERME!):
   DİKKAT: Bir araca kronolojik uyumsuzluk veya motor çelişkisi uyarısı vermeden önce, o motor hacmi ve gücünün Türkiye Resmi Distribütörü (Borusan Otomotiv, Doğuş, Mercedes-Benz Türk vb.) tarafından Türkiye pazarına getirilip getirilmediğini KESİNLİKLE KONTROL ET! Örneğin BMW 320i G20 kasada 1.6L 170 HP motor Türkiye'de resmi ve en yaygın varyanttır; bu araca ASLA '1600cc F30'da kaldı', 'G20'de 1.6 motor uyumsuz' gibi yanlış alarm uyarısı VERİLEMEZ!
   Yalnızca ve yalnızca, Türkiye'de ve dünyada hiçbir zaman üretilmemiş veya satılmamış bariz çelişkilerde (örneğin Audi A3 8V kasada 1.8 TFSI 180 HP motor 2012-2016 yılları arasında makyaj öncesi sunulmuş olup 2016 makyajıyla sonlandırılmışken aracın 2020 model seçilmesi; ya da 2020 yılında 1.5 TSI 35 TFSI / 8Y yeni nesile geçilmişken 1.8 TFSI seçilmiş olması gibi) şu adımları uygula:
   - Bu durumu 'vehicleCharacter.detailedAssessment' alanında en başta açıkça vurgula: '⚠️ İlan / Varyant Kronolojik Uyumsuzluk Tespiti: Bu ilanda belirtilen ${engine} seçeneği resmi fabrika kataloğunda ${year} yılından önce/sonra yer almaktadır...'.
   - 'executiveSummary' bölümünün uyarılarına ('keyWarnings') birinci sıradan bu kronolojik uyuşmazlık uyarısını ekle.
   - Kullanıcıya ilandaki aracın ya önceki bir model yılına ait olabileceği ya da ilan girişinde motor varyantının sehven yanlış seçilmiş olabileceği bilgisini vererek, satın alma/ekspertiz öncesinde araç ruhsatı ve şasi numarasından (VIN) motor kodu ve model yılının mutlaka fiziki teyit edilmesini tavsiye et!
9. TAM KAPSAMLI TEKNİK SPESİFİKASYON ÇIKTISI ("technicalSpecifications"):
   Yukarıdaki 8 kimlik filtresini ve Türkiye distribütör resmi verilerini esas alarak, aracın GERÇEK fabrika teknik verilerini "technicalSpecifications" JSON nesnesi içine eksiksiz doldur:
   - Motor Hacmi cc ("engineDisplacementCc" — örn. BMW 320i G20 için 1597, Polo 1.2 TSI için 1197)
   - Motor Gücü HP ("enginePowerHp" — örn. BMW 320i G20 için 170, 2022 Kia Cerato 1.6 MPI için 128, 2014 Polo 1.2 TSI için 90)
   - Tork Nm ("engineTorqueNm" — örn. BMW 320i G20 için 250, 2022 Kia Cerato 1.6 MPI için 155, Polo 1.2 TSI için 160)
   - Çekiş Sistemi ("drivetrain" — örn. BMW 320i G20 için "Arkadan İtiş (RWD)", Quattro için "Dört Tekerlekten Çekiş (AWD / Quattro)", Polo için "Önden Çekiş (FWD)")
   - Vites Tipi ve Sayısı Metni ("transmissionTypeAndSpeeds" — örn. "8 İleri Steptronic Otomatik", "7 İleri DSG Otomatik", "6 İleri Tam Otomatik")
   - Vites Sayısı Sayı ("transmissionSpeeds" — KESİNLİKLE GERÇEK VİTES SAYISI, örn. 8, 7 veya 6)
   - 0-100 km/s Hızlanma sn ("zeroToHundredKmh" — örn. BMW 320i G20 için 7.7)
   - Maksimum Hız km/s ("topSpeedKmh" — örn. BMW 320i G20 için 232)
   - Şehir İçi Tüketim L/100km ("cityFuelL100km")
   - Şehir Dışı Tüketim L/100km ("highwayFuelL100km")
   - Karma Tüketim L/100km ("combinedFuelL100km")
   - Bagaj Hacmi Litre ("trunkCapacityLiters" — örn. BMW 320i G20 için 480)
   - Boş Ağırlık kg ("curbWeightKg" — örn. BMW 320i G20 için 1525)

Yukarıdaki 8 filtreye, donanım paketine, kilometre aşınma skalasına, makyaj geçiş notlarına, kronolojik anomali denetimine ve teknik spesifikasyonlara özel 9 otomotiv sorusunu yanıtlayarak zengin, samimi ve mühendislik seviyesinde bir VehicleReportGeneratedContent JSON çıktısı oluştur.

YALNIZCA AŞAĞIDAKİ ÜST DÜZEY JSON ANAHTARLARINI İÇEREN GEÇERLİ BİR JSON NESNESİ ÜRET (BAŞKA ANAHTAR İSMİ UYDURMA):
{
  "expertDecisionSynthesis": {
    "vehicleCharacter": { "headline": "...", "detailedAssessment": "..." },
    "trimPackageComparison": { "selectedTrimName": "${trim}", "comparisonNarrative": "...", "keyAddedFeatures": [...], "missingFeaturesInLowerTrim": [...] },
    "dailyUseAssessment": { "cityUse": "...", "highwayUse": "...", "trafficBehavior": "...", "comfortAssessment": "..." },
    "strongestReasonsToChoose": [ { "title": "...", "explanation": "..." } ],
    "compromisesAndLimitations": [ { "title": "...", "explanation": "..." } ],
    "suitableFor": [ { "profile": "...", "explanation": "..." } ],
    "notSuitableFor": [ { "profile": "...", "explanation": "..." } ],
    "purchaseConditions": [ { "condition": "...", "reason": "...", "priority": "ÖNEMLİ" } ],
    "walkAwayConditions": [ { "condition": "...", "reason": "...", "priority": "KRİTİK" } ]
  },
  "executiveSummary": { "oneSentenceSummary": "...", "strongestAdvantage": "...", "biggestRisk": "..." },
  "inspectionChecklist": [ { "title": "...", "instruction": "...", "priority": "ÖNEMLİ" } ],
  "sellerQuestions": [ { "questionText": "...", "category": "MEKANİK" } ],
  "technicalSpecifications": {
    "engineDisplacementCc": 1597,
    "enginePowerHp": 170,
    "engineTorqueNm": 250,
    "drivetrain": "Arkadan İtiş (RWD)",
    "transmissionTypeAndSpeeds": "8 İleri Steptronic Otomatik",
    "transmissionSpeeds": 8,
    "zeroToHundredKmh": 7.7,
    "topSpeedKmh": 232,
    "cityFuelL100km": 7.4,
    "highwayFuelL100km": 5.3,
    "combinedFuelL100km": 6.1,
    "trunkCapacityLiters": 480,
    "curbWeightKg": 1525
  }
}`;
  }

  buildStage1ResearchPrompt(vehicleContext: any, sectionFilter?: string[]): string {
    const identity = vehicleContext?.vehicleIdentity || {};
    const brand = identity.brand || '';
    const model = identity.model || '';
    const year = identity.modelYear || '';
    const body = identity.bodyType || '';
    const trim = identity.trimName || '';
    const engine = identity.engineCode || '';
    const trans = identity.transmissionName || '';

    const fullVehicleTitle = [year, brand, model, body, trim, engine, trans].filter(Boolean).join(' ');

    return `Sen TorqueScout İnternet Otomotiv Araştırma Ajanısın (Web-Grounded Vehicle Research Agent).
Görevin, aşağıdaki araç varyantı için canlı web arama araçlarını kullanarak doğrulanmış otomotiv verileri, 7 araç karakteri alanı, donanım paketi detayları, kronik arıza kayıtları ve resmi geri çağırmaları (recalls) araştırmak ve ham JSON formatında üretmektir.

--- İNCELENECEK ARAÇ VARYANTI ---
• Araç: ${fullVehicleTitle}
• Marka / Model: ${brand} ${model} (${year})
• Kasa Tipi: ${body} | Donanım Paketi: ${trim}
• Motor: ${engine} | Şanzıman: ${trans}
• Pazar: Türkiye Resmi Katalog / Distribütör Verileri (Örn. 2022 Kia Cerato 1.6 MPI için Türkiye piyasasında resmi 128 HP / 155 Nm tork verisini esas al)
${sectionFilter ? `• YALNIZCA ŞU EKSİK BÖLÜMLERİ ARAŞTIR: ${sectionFilter.join(', ')}` : ''}

## ÜRETECEĞİN ÇIKTI ŞEMASI (JSON):
{
  "vehicleIdentityResearch": { "brand": "${brand}", "model": "${model}", "year": "${year}" },
  "vehicleCharacterResearch": {
    "segmentPositioning": { "summary": "...", "claimIds": ["CLM-1"], "sourceIds": ["SRC-1"] },
    "engineTransmissionFit": { "summary": "...", "claimIds": ["CLM-2"], "sourceIds": ["SRC-1"] },
    "drivingDynamics": { "summary": "...", "claimIds": ["CLM-3"], "sourceIds": ["SRC-1"] },
    "comfortAndIsolation": { "summary": "...", "claimIds": ["CLM-4"], "sourceIds": ["SRC-1"] },
    "interiorPracticality": { "summary": "...", "claimIds": ["CLM-5"], "sourceIds": ["SRC-1"] },
    "usageScenarios": { "summary": "...", "claimIds": ["CLM-6"], "sourceIds": ["SRC-1"] },
    "targetUserProfile": { "summary": "...", "claimIds": ["CLM-7"], "sourceIds": ["SRC-1"] }
  },
  "equipmentResearch": [ { "featureName": "...", "status": "STANDARD|OPTIONAL", "claimId": "CLM-8" } ],
  "reliabilityResearch": [ { "title": "...", "description": "...", "riskLevel": "CRITICAL|MEDIUM", "claimId": "CLM-9" } ],
  "recallResearch": [ { "campaignNumber": "...", "description": "..." } ],
  "groundingSources": [
    {
      "sourceId": "SRC-1",
      "url": "https://...",
      "title": "...",
      "domain": "...",
      "sourceKind": "OFFICIAL_MANUFACTURER|OFFICIAL_BROCHURE|PERIOD_ROAD_TEST|SPECIALIST_FORUM|MARKETPLACE|OTHER",
      "evidenceExcerpt": "...",
      "evidenceLocation": { "section": "..." }
    }
  ],
  "claims": [
    {
      "claimId": "CLM-1",
      "claimText": "...",
      "category": "CHARACTER|RELIABILITY|EQUIPMENT",
      "claimType": "FACT|OBSERVED_BEHAVIOR|CROSS_SOURCE_EVALUATION|DERIVED_CONCLUSION",
      "verificationStatus": "RAW",
      "derivedFromClaimIds": [],
      "sources": [ { "sourceId": "SRC-1", "stance": "SUPPORTS" } ],
      "relevance": {
        "generation": { "required": true, "match": true },
        "engineCode": { "required": true, "match": true },
        "trim": { "required": true, "match": true },
        "market": { "required": true, "match": true }
      }
    }
  ],
  "webSearchPerformed": true
}

Yalnızca geçerli JSON formatı üret. JSON dışında hiçbir metin ekleme.`;
  }

  buildStage2ClosedWriterPrompt(vehicleContext: any, verifiedResearch: any): string {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(vehicleContext);

    return `${systemPrompt}

## SIKI KAPALI ORTAM (CLOSED-BOOK WRITER) TALİMATLARI:
- Sen kapalı ortam rapor yazıcısısın (Web erişimin KAPALIDIR).
- Yalnızca aşağıdaki DB Context ve VERIFIED_RESEARCH_DATA içerisinde bulunan doğrulanmış iddialardan (VerificationStatus = VERIFIED) yararlanarak 9 soruluk nihai raporu yazabilirsin.
- VERIFIED iddialar ve DB Context dışında yepyeni bir teknik veri, motor kodu veya kronik iddiası ÜRETEMEZSİN!
- Rapordaki teknik/değerlendirme bloklarına dayandığın verified claim ID'lerini ("supportingFactIds" / "supportingClaimIds") ekle.
- Yeterli doğrulanmış iddia bulunmayan alt alanlarda veri uydurmak yerine "insufficientData: true" veya dengeli uzman değerlendirmesi sun.

--- DOĞRULANMIŞ ARAŞTIRMA VERİSİ (VERIFIED_RESEARCH_DATA) ---
${JSON.stringify(verifiedResearch, null, 2)}

--- TAM ARAÇ VE DONANIM PAKETİ SPESİFİKASYONLARI ---
${userPrompt}`;
  }
}
