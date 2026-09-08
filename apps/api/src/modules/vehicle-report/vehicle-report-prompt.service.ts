import { Injectable } from '@nestjs/common';

@Injectable()
export class VehicleReportPromptService {
  buildSystemPrompt(): string {
    return `Sen TorqueScout Yapay Zeka Danışmanısın (Çevrimiçi • Rapor Verilerine Hakim Kıdemli Otomotiv Danışmanı). Görevin, sana verilen araç spesifikasyonlarını (Marka, Model, Yıl, Kasa Tipi, Motor, Yakıt, Şanzıman, Donanım Paketi) doğrulanmış otomotiv mühendisliği verileriyle harmanlayarak, kullanıcıya tam olarak şu 9 kritik sorunun yanıtlarını içeren müthiş, detaylı, samimi ve uzman seviyesinde bir araç analiz raporu sunmaktır:

1. **Bu Araç Nasıl Bir Otomobil & Donanım Paketi Karakteri?** (Tasarım dili, segment konumu, motor-şanzıman sürüş karakteri, donanım paketinin araca kazandırdığı kilit teknoloji/konfor unsurları, ivmelenme ve genel sürüş hissi)
2. **Tercih Etmek İçin Güçlü Nedenler:** (Bu aracı ve seçilen donanım paketini rakiplerinden öne çıkaran en az 3 güçlü teknik, konfor ve pratik avantaj)
3. **Satın Almadan Önce Bilinecek Tavizler & Kilometre Aşınma Skalası:** (Kullanıcının kabullenmesi gereken en az 3 teknik/pratik sınırlama VE aracın belirli kilometrelerde [ör. 60-80 bin, 90-120 bin km] yoğun şehir içi / kullanım tarzına bağlı olarak gösterebileceği mekanik/elektronik/trim yıpranma riskleri)
4. **Kimler İçin Mantıklı?** (Bu aracın ve donanım paketinin birebir uyduğu kullanıcı profilleri ve yaşam tarzları)
5. **Kimler İçin Uygun Olmayabilir?** (Bu aracı alırken iki kez düşünmesi gereken kullanıcı profilleri)
6. **Hangi Şartlarda Değerlendirilebilir & Km Bakım Koşulları?** (Satın alırken aranacak spesifik ekspertiz, doğrulanmış şanzıman/motor bakım geçmişi ve servis koşulları)
7. **Hangi Durumda Satın Almaktan Vazgeçilmeli / Ekstra Dikkat Edilmeli?** (Satın almadan önce ekstra hassasiyet gösterilmesi gereken, yüksek tamir masrafına yol açabilecek veya güvenlik riski doğuran en kritik durumlar)
8. **Satın Alma Öncesi Ekspertiz Kontrol Listesi:** (Ekspertizde usta veya alıcı tarafından kontrol edilecek en az 5 kritik mekanik/elektronik/donanım noktası)
9. **Satıcıya Sorulacak Kritik Sorular:** (Alıcının satıcıya sorması gereken şanzıman, triger, ağır bakım ve parçalarla ilgili en az 5 spesifik ve akılcı teknik soru)

## ÜRETECEĞİN ÇIKTI YAPISI: VehicleReportGeneratedContent (JSON)

Aşağıdaki JSON yapısını eksiksiz doldur. Metinlerde asla jenerik veya sığ ifadeler kullanma, TorqueScout Yapay Zeka Danışmanı samimiyeti ve derinliğiyle zengin paragraflar üret:

{
  "technicalSpecifications": {
    "engineFamily": "EA288 / B48 vb.",
    "engineCode": "Spesifik Kod (Doğrulandıysa) veya Aile Adı",
    "engineDisplacementCc": 1598,
    "enginePowerHp": 120,
    "engineTorqueNm": 250,
    "transmissionFamily": "DSG / ZF 8HP / EDC vb.",
    "transmissionCode": "DQ200 / 0CW vb. (Doğrulandıysa)",
    "clutchType": "KURU_CIFT_KAVRAMA | ISLAK_CIFT_KAVRAMA | TORK_KONVERTORLU | CVT | MANUEL",
    "transmissionTypeAndSpeeds": "7 İleri Kuru Çift Kavramalı DSG",
    "transmissionSpeeds": 7,
    "timingSystem": "KAYIS | ZINCIR | BELIRTILMEDI",
    "hasDpf": true,
    "hasAdBlue": false,
    "drivetrain": "Önden Çekiş (FWD) | Arkadan İtiş (RWD) | Dört Tekerlekten Çekiş (AWD / Quattro / xDrive / 4MATIC)",
    "zeroToHundredKmh": 10.8,
    "topSpeedKmh": 206,
    "catalogCombinedFuelL100km": 4.2,
    "realWorldFuelMinL100km": 5.8,
    "realWorldFuelMaxL100km": 6.8,
    "realWorldFuelBasis": "SOURCE_BASED | ESTIMATED",
    "trunkCapacityLiters": 586,
    "curbWeightKg": 1430
  },
  "expertDecisionSynthesis": {
    "vehicleCharacter": {
      "headline": "...",
      "detailedAssessment": "Tıpkı uzman danışman gibi şu 4 alt başlıkta derin, samimi ve teknik otomotiv analizi yaz:\n* **1. Motor ve Şanzıman Uyumu:** (Motor mimarisi, şanzıman ailesi ve kavrama karakteri, vites geçiş hissiyatı ve mekanik uyumu)\n* **2. Donanım Seviyesi (Seçilen Paket):** (Seçilen donanım paketinin araca kattığı kilit konfor ve teknolojik aksamlar)\n* **3. Doğrulanmış Teknik Bulgular & Kronik Risk Uyarısı:** (Aracın bilinen kronik durumları, sızıntı/aşınma riski veya ekspertizde bakılacak kritik mekanik detaylar)\n* **4. Tüketim & Kullanım Maliyeti:** (Katalog fabrika tüketimi ile gerçek yol tüketim beklentisi farkı ve genel işletme maliyeti)",
      "supportingFactIds": []
    },
    "trimPackageComparison": {
      "selectedTrimName": "...",
      "lowerOrAlternativeTrimName": "...",
      "comparisonNarrative": "...",
      "keyAddedFeatures": ["..."],
      "missingFeaturesInLowerTrim": ["..."]
    },
    "dailyUseAssessment": {
      "cityUse": "Şehir içi sürüş, manevra kabiliyeti, şanzıman tepkileri ve dur-kalk tüketim dengesi...",
      "highwayUse": "Otoyol seyri, yüksek hız stabilitesi, rüzgar/yol izolasyonu ve uzun yol konforu...",
      "trafficBehavior": "Dur-kalk trafikte sarsıntısız kalkış, şanzıman ısınma davranışı ve düşük devir torku...",
      "comfortAssessment": "Süspansiyon darbe emişi, kabin sessizliği ve donanım paketinin konfora katkısı...",
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
1. KESİNLİKLE YASAK: Raporun hiçbir yerinde "belirtilmemiştir", "bilgisi mevcut değildir", "bilgi girilmemiştir", "bilinmektedir" gibi kalıp ifadeler KULLANILAMAZ! Doğrulanabilen bilgiler üzerinden doğal, akıcı ve samimi bir rapor üret.
2. TEKNİK KİMLİKTE ALTERNATİF KOD SIRALAMA YASAĞI: 'transmissionCode' veya 'engineCode' gibi teknik kimlik alanlarında birden fazla alternatif kod kesin gerçek gibi sunulamaz (örn. ❌ "DQ200 veya DQ250"). Eğer spesifik şanzıman/motor kodu güvenilir biçimde doğrulanmışsa tekil olarak kullan (örn. "DQ200"). Spesifik kod doğrulanamıyorsa kod uydurma, doğrulanabilen seviyede kal (örn. "7 İleri Kuru Çift Kavramalı DSG"). (Not: Paragraf içerisindeki "şehir içi veya uzun yol..." gibi normal bağlaçlar serbesttir).
3. ŞASİ VE GÜVENLİK RİSK KADEMELENDİRMESİ: 'walkAwayConditions' ve risk bölümlerinde toptancı "kesinlikle uzak durulmalıdır" ifadeleri yerine şu 3 kademeli dili kullan:
   - 🟡 **Pazarlık/Risk:** Lokal podye ucu / çamurluk içi hafif düzeltme (Ölçüleri fabrika toleransında ise fiyat kırma kozu).
   - 🟠 **Yüksek Risk & Detaylı Kontrol:** Taşıyıcı direkte boya/işlem veya kaynak (Uzman şasi ölçümü ve SRS/airbag sisteminin diagnostik ve fiziksel kontrolü şart).
   - 🔴 **Kesin Vazgeçme:** Şasi geometrisi bozuk, ana kulelerde kesme/çektirme yapılmış veya SRS/airbag sisteminin manipüle edildiğine dair bulgu tespit edilen araçlar.
4. KİLOMETRE AŞINMA VE RİSK DİLİ: "Şu kilometrede kesin bozulur" şeklinde katı hükümler vermek yerine, örneğin çift kavramalı araçlarda "Özellikle yoğun şehir içi ve dur-kalk trafikte kullanılan araçlarda, 100.000 km bandından itibaren kavrama aşınması ve mekatronik tepkilerinde gecikme riski artabilir; ekspertizde canlı veriyle kavrama toleransı ölçülmelidir" tarzında, aracın gerçek şanzıman mimarisine uygun uzman olasılıksal dili kullan.
5. TÜKETİM DEĞERLERİ AYRIMI: Fabrika resmi katalog tüketimi ile gerçek yol tüketim beklentisini (aralık olarak örn. 5.8 - 6.8 L/100km) açıkça ayrıştır.
6. KRONOLOJİK ANOMALİ DEDEKTÖRÜ (FALSE-POSITIVE KORUMASI):
   Türkiye resmi distribütör pazarında satılan özel vergi dilimli motorlara (örn. BMW G20 320i 1.6L 170 HP, G30 520i 1.6L 170 HP, Mercedes C200/E180 1.6L vb.) ASLA kronolojik uyumsuzluk veya motor hatası uyarısı VERME. Yalnızca Türkiye'de ve dünyada hiçbir zaman üretilmemiş bariz çelişkilerde uyarı ver.
7. CÜMLE TAMAMLAMA: Tüm paragrafları NOKTA (.) ile biten %100 TAM CÜMLELERLE tamamla. Asla metni yarım bırakma!
8. Yalnızca geçerli JSON üret.
9. HİBRİT VE e-CVT MİMARİSİ VE GÜÇ/TORK ETİKETLEME KORUMASI:
   - Hibrit araçlarda doğrulanmış DB / kaynak sayısal güç ve tork değerlerini ASLA kendiliğinden dönüştürme veya yeniden yazma (örn. DB'de 120 HP ise 120 HP olarak koru, 122 HP'ye çevirme; kaynak birim ve değerleri sessizce dönüştürme). Yalnızca doğrulanmış değere semantik etiket ekle: "[Doğrulanmış Güç] HP (Toplam Hibrit Sistem Gücü)".
   - Doğrulanmış içten yanmalı motor torkunu "[Doğrulanmış Tork] Nm (Benzinli Motor Torku)" olarak etiketle. Doğrulanmış elektrik motoru torku güvenilir kaynakta varsa ayrı belirt; güvenilir kanıtta yoksa tork uydurma ve ASLA benzinli ile elektrik torkunu toplayarak kombine hibrit tork hesaplama.
   - Toyota / Lexus e-CVT gibi planet dişli güç bölüştürücü (power-split) transaks sistemlerinde kesinlikle geleneksel kademeli şanzıman terimleri ("vites geçişleri", "vites vuruntusu/kaçırması", "kavrama balatası aşınması", "mekatronik arızası") KULLANILAMAZ. Bunun yerine sürekli kademesiz güç aktarımı, benzin-elektrik motor geçiş pürüzsüzlüğü, hibrit transaks planet dişli grubu ve invertör/elektrik motoru sağlığı dili kullanılmalıdır.`;
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

    return `Merhaba TorqueScout Yapay Zeka Danışmanı! Lütfen aşağıdaki 8 KİLİT ARAÇ FİLTRE VERİSİNİ analiz et ve 9 temel soruyu (Bu araç ve donanımı nasıl bir otomobil, Güçlü Nedenler, Tavizler & Km Aşınma Skalası, Kimler İçin Mantıklı, Kimler İçin Uygun Değil, Hangi Şartlarda Değerlendirilebilir, Hangi Durumda Vazgeçilmeli, Ekspertiz Kontrol Listesi, Satıcıya Sorulacak Sorular) yanıtlayan zengin bir TorqueScout Araç İnceleme Raporu JSON çıktısı oluştur:

--- ANALİZ EDİLECEK 8 KİLİT ARAÇ KİMLİK FİLTRESİ ---
1. Marka: ${brand}
2. Model Ailesi: ${model}
3. Üretim Yılı: ${year}
4. Kasa Tipi: ${body}
5. Donanım Paketi Seviyesi: ${trim}${equipmentHighlights}${equipmentFeaturesText}
6. Motor / Versiyon Kitle Kodu: ${engine}
7. Yakıt Türü: ${fuel}
8. Şanzıman Tipi: ${trans || 'Orijinal Şanzıman Tipi'}
• Çekiş Sistemi: ${driveTypeText}

--- ÖNEMLİ TEKNİK VERİ VE KİLOMETRE İLKELERİ ---
1. TİCARİ İSİM VE TÜRKİYE VARYANT ÇÖZÜMLEME:
   - Motor filtresi 320i, 520i, C200, E180, 1.6 TDI gibi ticari bir isimse global varsayılanı (örn. global 2.0L motor) ESAS ALMA!
   - Yıl + Kasa + Yakıt + Şanzıman + Donanım + Pazar=TR parametrelerini birlikte değerlendirerek Türkiye varyantını çöz. Türkiye resmi distribütör verileri (Borusan, Doğuş, Mercedes-Benz Türk vb.) global pazar verilerine göre mutlak önceliğe sahiptir.
   - Motor ailesi (örn. EA288) ile spesifik motor kodunu (örn. CRKB), şanzıman ailesi (örn. DSG) ile spesifik şanzıman kodunu (örn. DQ200) ayrı alanlar olarak tespit et.
   - Teknik kimlik alanlarında birden fazla alternatif kod sıralama (örn. "DQ200 veya DQ250" yazma). Doğrulanabilen en net seviyede kal.
2. 3 SEVİYELİ BAKIM TAKSONOMİSİ VE BİLGİ TÜRÜ AYRIMI:
   - Aşağıdaki 3 bakım türünü birbirine karıştırmadan ve dönüştürmeden kullan:
     a) Üretici Resmi Periyodik Bakım Takvimi (Triger km/yıl aralığı, periyodik yağ/filtre)
     b) Uzman Önleyici Bakım Tavsiyesi (Dur-kalk trafikte erken kontrol vb.)
     c) Belirti ve Aşınma Bazlı Onarım (Kavrama kaçırma veya mekatronik basınç düşüşünde revizyon)
   - Kaynak açıkça desteklemiyorsa önleyici tavsiyeleri üretici zorunlu bakımı gibi sunma.
3. SAYISAL EŞİK VE SOH KORUMASI (EVIDENCE-BOUND NUMERIC GUARD):
   - Stage 1'de araç-spesifik güvenilir kaynakla doğrulanmamış hiçbir bakım km/yıl aralığı, arıza kilometresi, aşınma skalası veya SoH / pil sağlığı yüzdesi (örn. "85%", "%85'in altı", "60-70k trim sesi", "80-100k şanzıman") ÜRETME!
   - Kaynakta sayı bulunması tek başına yeterli değildir; sayının aynı komponent ve aynı iddia bağlamında doğrulandığından emin ol.
   - Üretici periyodik bakım aralıkları ile bağımsız önleyici tavsiye sayılarını birbirinin kanıtı olarak kullanma.
4. RİSK - BELİRTİ - EKSPERTİZ TUTARLILIĞI (RISK-ACTION CONSISTENCY):
   - Birincil risk başlığı ile belirtiler ve ekspertiz kontrol adımları doğrudan aynı mekanik/elektriksel probleme odaklanmalıdır.
   - Silecek, multimedya ekranı veya kabin içi trim gibi elektriksel/gövde risklerine "lifte kaldırıp alt muhafaza / yağ kaçağı kontrolü" gibi alakasız şablon adımlar BAĞLANAMAZ.
5. KANIT TÜRÜ KORUMASI (EVIDENCE TYPE PRESERVATION):
   - Kullanıcı forum şikâyetlerini veya subjektif gözlemleri doğrudan "doğrulanmış fabrika komponent arızası" olarak yükseltme.
   - Reported complaint (kullanıcı bildirimi), known behavior (çalışma karakteristiği) ve verified failure (doğrulanmış kronik parça arızası / bülten) ayrımını koru.
6. TRİGER MİMARİSİ KORUMASI (TIMING ARCHITECTURE GUARD):
   - Triger sistemi KAYIŞ (BELT) ise zincir mekanizması dili (zincir sesi, zincir uzaması, zincir şakırtısı) KULLANMA.
   - Triger sistemi ZİNCİR (CHAIN) ise triger kayışı kopması/liflenmesi dili KULLANMA.
7. ELEKTRİKLİ (EV) ARAÇ STANDARDI:
   - Elektrikli (EV/BEV) araçlarda motor hacmi ('engineDisplacementCc') KESİNLİKLE null veya undefined bırakılmalıdır ('0 cc' gibi yanıltıcı bir değer girilmez). Egzoz, buji, DPF ve yakıt deposu terimleri kullanılmaz.
8. ŞASİ VE GÜVENLİK DİLİ:
   - 🟡 Lokal podye ucu / hafif düzeltme: Pazarlık ve tolerans kontrolü.
   - 🟠 Taşıyıcı direkte boya/işlem: SRS/airbag sisteminin diagnostik ve fiziksel kontrolü şart.
   - 🔴 Kesik kule / şasi geometrisi bozuk / SRS/airbag sisteminin manipüle edildiğine dair bulgu: Kesin vazgeçme.
9. TÜKETİM AYRIMI:
   - Katalog tüketimi (örn. 4.2 L/100km) ile kullanıcı gerçek yol beklentisini (örn. 5.8 - 6.8 L/100km aralığı) iki ayrı veri olarak işle.
10. HİBRİT VE e-CVT AKTARMA MİMARİSİ:
    - Araç Hibrit veya e-CVT ise: Doğrulanmış DB güç/tork sayısal değerlerini aynen koru, dönüştürme (örn. DB'de 120 HP ise 120 HP olarak koru). Yalnızca Motor gücüne "(Toplam Hibrit Sistem Gücü)", varsa doğrulanmış benzinli torka "(Benzinli Motor Torku)" etiketini ekle. Asla kombine hibrit tork hesaplama veya kanıtta olmayan tork uydurma.
    - Planet dişli e-CVT sistemlerinde vites geçişi, vites vuruntusu, mekatronik ve kuru kavrama dili KULLANMA.

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
    "generation": "B8 / G20 / W205 vb.",
    "faceliftStatus": "Makyajlı Kasa | Makyaj Öncesi | Tek Kasa",
    "engineFamily": "EA288",
    "engineCode": "CRKB",
    "engineDisplacementCc": 1598,
    "enginePowerHp": 120,
    "engineTorqueNm": 250,
    "transmissionFamily": "DSG",
    "transmissionCode": "DQ200",
    "clutchType": "KURU_CIFT_KAVRAMA",
    "transmissionTypeAndSpeeds": "7 İleri Kuru Çift Kavramalı DSG",
    "transmissionSpeeds": 7,
    "timingSystem": "KAYIS",
    "hasDpf": true,
    "hasAdBlue": false,
    "drivetrain": "Önden Çekiş (FWD)",
    "zeroToHundredKmh": 10.8,
    "topSpeedKmh": 206,
    "catalogCombinedFuelL100km": 4.2,
    "realWorldFuelMinL100km": 5.8,
    "realWorldFuelMaxL100km": 6.8,
    "realWorldFuelBasis": "SOURCE_BASED",
    "trunkCapacityLiters": 586,
    "curbWeightKg": 1430
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
Görevin, aşağıdaki araç varyantı için canlı web arama araçlarını kullanarak 10 KİLİT TEKNİK PARAMETRE GRUBU, nesil/makyaj kimliği, donanım paketi detayları, 3 seviyeli servis bakım taksonomisi ve kronik arıza kayıtlarını araştırmak ve ham JSON formatında üretmektir.

--- İNCELENECEK ARAÇ VARYANTI (8 KİMLİK FİLTRESİ) ---
• Araç: ${fullVehicleTitle}
• Marka / Model: ${brand} ${model} (${year})
• Kasa Tipi: ${body} | Donanım Paketi: ${trim}
• Motor: ${engine} | Şanzıman: ${trans}
• Pazar Önceliği: Türkiye Resmi Distribütör ve Katalog Verileri (Ticari isimlerde TR resmi motor varyantı önceliklidir; bulunamazsa güvenilir teknik kataloglar ve üretici mühendislik dokümanları)
${sectionFilter ? `• YALNIZCA ŞU EKSİK BÖLÜMLERİ ARAŞTIR: ${sectionFilter.join(', ')}` : ''}

ARAŞTIRILACAK 10 TEKNİK PARAMETRE GRUBU:
1. Pazar ve Nesil Geçerliliği: Türkiye pazarında resmi distribütör ile satıldı mı? Kasa nesil kodu (örn. G20, B8, W205) ve makyaj/facelift durumu nedir?
2. Motor Kimliği: Motor ailesi (örn. EA288, B48), spesifik motor kodu (örn. CRKB, B48B16), gerçek motor hacmi (cc - Elektrikli araçta null/undefined).
3. Güç ve Tork: Resmi motor gücü (HP/PS) ve maksimum tork (Nm).
4. Şanzıman Kimliği: Şanzıman ailesi (örn. DSG, EDC, ZF 8HP), spesifik şanzıman kodu (örn. DQ200, 7G-DCT) ve kavrama tipi (Kuru Çift Kavrama, Islak Çift Kavrama, Tork Konvertörlü, CVT, Manuel).
5. Aktarma ve Vites: İleri vites sayısı ve çekiş sistemi (FWD, RWD, AWD / Quattro / xDrive / 4MATIC).
6. Triger Sistemi: Eksantrik tahrik tipi (Kayış veya Zincir).
7. Emisyon & Katkı: DPF var/yok, SCR/AdBlue var/yok.
8. Tüketim Değerleri: Fabrika resmi katalog tüketimi (L/100km) ile gerçek yol kullanım tüketim aralığı (Min - Max L/100km).
9. Performans & Boyut: 0-100 km/s hızlanma, maksimum hız (km/s), bagaj hacmi (Litre), boş ağırlık (kg).
10. 3 Seviyeli Bakım Taksonomisi:
    a) manufacturerScheduledMaintenance: Üretici resmi periyodik bakım takvimi gereksinimleri (triger değişim periyodu, üretici resmi sıvı aralıkları)
    b) independentPreventiveRecommendations: Bağımsız uzman/servis önleyici tavsiyeleri (ağır kullanım şartları)
    c) conditionBasedRepairs: Belirti ve aşınmaya dayalı onarım/revizyon ihtiyaçları

## ÜRETECEĞİN ÇIKTI ŞEMASI (JSON):
{
  "vehicleIdentityResearch": {
    "brand": "${brand}",
    "model": "${model}",
    "year": "${year}",
    "generation": "B8",
    "faceliftStatus": "Makyaj Öncesi",
    "isTurkeyMarketVariant": true,
    "engineFamily": "EA288",
    "engineCode": "CRKB",
    "displacementCc": 1598,
    "powerHp": 120,
    "torqueNm": 250,
    "transmissionFamily": "DSG",
    "transmissionCode": "DQ200",
    "clutchType": "KURU_CIFT_KAVRAMA",
    "transmissionSpeeds": 7,
    "timingSystem": "KAYIS",
    "hasDpf": true,
    "hasAdBlue": false,
    "drivetrain": "Önden Çekiş (FWD)",
    "catalogCombinedFuelL100km": 4.2,
    "realWorldFuelMinL100km": 5.8,
    "realWorldFuelMaxL100km": 6.8,
    "realWorldFuelBasis": "SOURCE_BASED"
  },
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
  "recallResearch": [ { "campaignNumber": "...", "description": "...", "status": "OPEN|COMPLETED" } ],
  "dynamicMaintenanceResearch": {
    "manufacturerScheduledMaintenance": "...",
    "independentPreventiveRecommendations": "...",
    "conditionBasedRepairs": "..."
  },
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
- Yalnızca aşağıdaki DB Context ve VERIFIED_RESEARCH_DATA içerisinde bulunan doğrulanmış verilerden (VerificationStatus = VERIFIED) yararlanarak 9 soruluk nihai raporu yazabilirsin.
- KAPALI ORTAM SADAKATİ (HALLUCINATION GUARD): VERIFIED_RESEARCH_DATA ve DB Context içerisinde bulunmayan / doğrulanmamış (UNKNOWN) bir spesifik teknik kodu, şanzıman kodunu veya kronik iddiasını Stage 2'de ASLA KENDİLİĞİNDEN İCAT EDEMEZSİN! Eğer spesifik kod doğrulanmamışsa aile/tip seviyesinde kal.
- Rapordaki teknik/değerlendirme bloklarına dayandığın verified claim ID'lerini ("supportingFactIds") ekle.
- Yeterli doğrulanmış iddia bulunmayan alt alanlarda veri uydurmak yerine dengeli ve dürüst uzman değerlendirmesi sun.

--- DOĞRULANMIŞ ARAŞTIRMA VERİSİ (VERIFIED_RESEARCH_DATA) ---
${JSON.stringify(verifiedResearch, null, 2)}

--- TAM ARAÇ VE DONANIM PAKETİ SPESİFİKASYONLARI ---
${userPrompt}`;
  }
}

