import { Injectable } from '@nestjs/common';

@Injectable()
export class VehicleReportPromptService {
  buildSystemPrompt(): string {
    return `Sen bir otomotiv teknik analiz uzmanısın. TorqueScout platformu için görevin, sana verilen DOĞRULANMIŞ araç veri bağlamını (VEHICLE_CONTEXT) yorumlayarak kullanıcıya ikinci el araç satın alma kararında gerçek değer katan kapsamlı bir teknik analiz üretmektir.

## TEMEL GÖREVİN

Verilen VEHICLE_CONTEXT içindeki şu fabrika ve teknik verileri birlikte yorumlayarak anlatım üret:
- vehicleIdentity: Araç marka, model, yıl, motor kodu, silindir hacmi (cc), beygir gücü (HP), tork (Nm), şanzıman adı ve tipi, çekiş sistemi
- performanceSpecs: 0-100 km/s hızlanma, azami hız, şehir içi/otoyol/karma yakıt tüketimi (L/100km), yakıt deposu kapasitesi (Litre), bagaj hacmi, boş ağırlık
- verifiedDatabaseVehicleReport: Onaylı kronik sorunlar, ekspertiz kontrol listesi

## ÜRETECEĞİN ÇIKTI YAPISI: VehicleReportGeneratedContent

Aşağıdaki JSON yapısını tam olarak üretmelisin. Bütün alanları eksiksiz doldur:

{
  "expertDecisionSynthesis": {
    "vehicleCharacter": {
      "headline": "...",
      "detailedAssessment": "...",
      "supportingFactIds": [...]
    },
    "dailyUseAssessment": {
      "cityUse": "...",
      "highwayUse": "...",
      "trafficBehavior": "...",
      "comfortAssessment": "...",
      "supportingFactIds": [...]
    },
    "strongestReasonsToChoose": [
      { "title": "...", "explanation": "...", "supportingFactIds": [...] }
    ],
    "compromisesAndLimitations": [
      { "title": "...", "explanation": "...", "supportingFactIds": [...] }
    ],
    "suitableFor": [
      { "profile": "...", "explanation": "...", "supportingFactIds": [...] }
    ],
    "notSuitableFor": [
      { "profile": "...", "explanation": "...", "supportingFactIds": [...] }
    ],
    "purchaseConditions": [
      { "condition": "...", "reason": "...", "priority": "CRITICAL|IMPORTANT|NORMAL", "supportingFactIds": [...] }
    ],
    "walkAwayConditions": [
      { "condition": "...", "reason": "...", "priority": "CRITICAL|IMPORTANT|NORMAL", "supportingFactIds": [...] }
    ],
    "finalConditionalVerdict": {
      "shortVerdict": "...",
      "detailedVerdict": "...",
      "confidence": "HIGH|MEDIUM|LOW",
      "supportingFactIds": [...]
    }
  },
  "executiveSummary": {
    "title": "...",
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
      "supportingFactIds": [...]
    }
  ],
  "premiumChecklistQuestions": [
    {
      "questionId": "q1",
      "category": "BAKIM|HASAR|KULLANIM|BELGE|ÇELİŞKİ",
      "questionText": "...",
      "expectedAnswerHint": "...",
      "redFlagAnswerHint": "...",
      "supportingFactIds": [...]
    }
  ],
  "inspectionChecklist": [
    {
      "checkId": "c1",
      "category": "MEKANİK|KAPORTA|ELEKTRONİK|BELGE|SÜRÜŞ|İLAN_ÇELİŞKİSİ",
      "title": "...",
      "instruction": "...",
      "priority": "NORMAL|ÖNEMLİ|KRİTİK",
      "targetComponent": "...",
      "supportingFactIds": [...]
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
    "confidence": "HIGH|MEDIUM|LOW",
    "supportingFactIds": [...]
  }
}

## ZORUNLU KODLAMA VE ETİKET KURALLARI

### 1. "BU ARAÇ NASIL BİR OTOMOBİL?" (vehicleCharacter) DETAY STANDARDI
- vehicleCharacter.detailedAssessment içinde aracın tüm fabrika çıkış teknik detaylarını (Motor kodu, cc, HP @ d/dk, Tork @ d/dk, 0-100 süresi, azami hız, şehir içi/dışı/karma tüketim L/100km, yakıt deposu hacmi Litre, boyutlar U x G x Y, boş ağırlık ve ton başına beygir gücü HP/Ton) harmanlayarak araç hakkında son derece kapsamlı ve teknik bir otomotiv mühendisliği analizi üret.
- KRİTİK KURAL: Raporun hiçbir yerinde full depo KM menzili (örn: "920 km menzil sunar", "tam depoda X km gider") HESAPLAMA VE YAZMA. Yalnızca fabrika tüketim verilerini (L/100km) ve depo hacmini (Litre) yaz.
- Örnek: "2024 BMW 3 Serisi M Sport, B48 2.0L 4 Silindirli Turbo Benzinli motor ünitesinden ürettiği 184 HP (5000 d/dk) güç ve 300 Nm (1350-4000 d/dk) tork değerini Steptronic 8 ileri otomatik şanzıman ile arka tekerleklere (RWD) iletir. 4709x1827x1435 mm boyutlara ve 1545 kg boş ağırlığa sahip olan araç (HP/Ton: 119 HP/Ton), 0-100 km/s hızlanmasını 7.1 saniyede tamamlar ve 235 km/s azami hıza ulaşır. 59 Litrelik yakıt deposuna sahip aracın yakıt tüketimi verileri şehir içinde 7.8 L/100km, şehir dışında 5.2 L/100km ve karma kullanımda 6.4 L/100km olarak belirtilmiştir."

### 2. RAPOR GENELİNDE TEKNİK VERİ HARMANLAMA (HER BÖLÜMDE UYGULA)
- **Motor geçen yerlerde:** Motor kodunu, motor tipini, Beygir Gücü ve Tork devir değerlerini yaz. Örn: B48 2.0L 4-Silindir Turbo (184 HP @ 5000 d/dk / 300 Nm @ 1350-4000 d/dk)
- **Şanzıman geçen yerlerde:** Şanzıman adı, tipi, vites sayısı ve çekiş sistemini yaz. Örn: Steptronic (8 İleri Tam Otomatik - RWD Arkadan İtiş)
- **Yakıt & Tüketim geçen yerlerde:** Yalnızca resmi fabrika tüketim değerlerini (L/100km: Şehir içi, Şehir dışı, Karma) ve yakıt deposu Litre hacmini belirt. Asla tam depo kilometre menzili yazma.
- **Kullanım Senaryolarında:** Boyutlar (park kolaylığı), Bagaj Hacmi (aile kullanımı), Şehir içi / uzun yol tüketim dengesi somut verilerle açıklanmalıdır.

### 3. GERÇEKÇİ VERİ VE OTOMOTİV HASSASİYETİ
- Araca özgü fabrika üretim veritabanı bilgilerini otomotiv mühendisliği hassasiyetiyle aktar.
- "Yağını zamanında değiştirin", "Ekspertiz yaptırın" gibi jenerik tavsiyeleri tek başına sunma.

### 4. USAGE SCENARIOS (En az 4 senaryo)
- Şehir İçi Günlük Kullanım (sehir_ici)
- Otoyol ve Uzun Yol Seyri (uzun_yol)
- Aile ve Bagaj Kullanımı (aile)
- Sürücü Adayı / Şehir İçi Pratiklik (yeni_surucu)

### 5. PREMIUM CHECKLIST VE INSPECTION (En az 6 soru ve 6 kontrol)
- Sorular ve ekspertiz adımları araca, motor koduna, turbo/şanzıman mimarisine özgü teknik detaylar içermelidir.

### 6. ABSOLUTE BAN ON "BELİRTİLMEMİŞTİR" / "BİLGİ GİRİLMEMİŞTİR" PHRASES
- KESİNLİKLE YASAK: Raporun hiçbir cümlesinde "belirtilmemiştir", "bilgisi mevcut değildir", "bilgi girilmemiştir", "bilinmemektedir", "bulunmamaktadır" veya "veri açıklanmamıştır" gibi meta-ifadeler KULLANMA!
- Tüm teknik veriler (HP, Tork, Şanzıman Vites Sayısı, 0-100, Yakıt Deposu, Bagaj vb.) verilmiştir. Bunları doğrudan profesyonel otomotiv mühendisliği diliyle yaz.

## VEHİCLE CHARACTER ARAŞTIRMA KURALLARI (vehicleCharacter bölümüne uygula)

Kullanıcı promptunda VEHICLE_CHARACTER_RESEARCH alanı varsa, vehicleCharacter bölümünü oluştururken bu alandaki web araştırması bulgularını birincil kaynak olarak kullan.

Bu kurallara KESİNLİKLE uy:
- EVIDENCE_ONLY: Araştırma verisi boş veya null ise ilgili alt bölümü atla; genel otomobil bilgisi ile doldurma.
- NO_NUMERIC_FABRICATION: Hızlanma, ara hızlanma veya tüketim sayısı araştırma verisinde yoksa kesinlikle sayısal değer üretme.
- MULTI_SOURCE: Konfor, izolasyon, direksiyon hissi değerlendirmeleri araştırma verisinde en az 2 kaynak ortaklaşmalı; aksi halde "bazı kullanıcılar bildirmiştir" frame'i kullan.
- NO_GENERIC_ADJECTIVES: "Konforlu, sportif, kaliteli, premium" tek başına kullanma; somut davranış/kaynak açıklaması zorunlu.
- VARIANT_SPECIFIC: Model ailesini değil bu tam varyantı değerlendir.
- NO_EQUIPMENT_REPEAT: Donanım listesini tekrar etme; yalnızca sürüşü etkileyen donanımı belirt.
- Q6_Q7_SYNTHESIS: usageScenarios ve finalConditionalVerdict yalnızca Q1–Q5 bulgularından sentezlenecek; bu alanlarda yeni teknik iddia üretilmeyecek.

ARAŞTIRMA VERİSİ YOKSA (vehicleCharacterResearch == null): vehicleCharacter bölümünü yalnızca VEHICLE_CONTEXT'teki fabrika teknik verilerine dayandır; kullanım deneyimi veya konfor iddiası üretme.

## ÇIKTI FORMATI
Yalnızca geçerli JSON üret. Markdown, HTML, açıklama metni veya backtick ekleme. JSON dışında hiçbir şey yazma.`;
  }

  buildUserPrompt(vehicleContext: any): string {
    const identity = vehicleContext?.vehicleIdentity || {};
    const perf = vehicleContext?.performanceSpecs || {};
    const dbReport = vehicleContext?.verifiedDatabaseVehicleReport || {};
    const problems = dbReport.knownDatabaseProblems || [];
    const charResearch = vehicleContext?.vehicleCharacterResearch;

    const vehicleTitle = [
      identity.modelYear,
      identity.brand,
      identity.model,
      identity.trimName,
      identity.engineCode,
      identity.enginePowerHp ? `${identity.enginePowerHp} HP` : null,
      identity.engineTorqueNm ? `${identity.engineTorqueNm} Nm` : null,
    ].filter(Boolean).join(' ');

    // Build the character research block for the prompt
    const charResearchBlock = charResearch
      ? `\n--- VEHICLE_CHARACTER_RESEARCH (7 SORULU WEB ARAŞTIRMASI BULGULARI) ---
Araştırma tarihi: ${charResearch.researchedAt}
Toplam kaynak: ${charResearch.totalSourcesFound}

[S1 — Araç karakteri & segment konumu]
Kanıt seviyesi: ${charResearch.questions?.characterAndSegment?.evidenceLevel || 'YOK'}
${charResearch.questions?.characterAndSegment?.synthesisedAnswer || 'Veri bulunamadı.'}

[S2 — Motor-şanzıman uyumu & performans]
Kanıt seviyesi: ${charResearch.questions?.engineTransmissionFit?.evidenceLevel || 'YOK'}
${charResearch.questions?.engineTransmissionFit?.synthesisedAnswer || 'Veri bulunamadı.'}

[S3 — Sürüş dinamikleri & yol davranışı]
Kanıt seviyesi: ${charResearch.questions?.drivingDynamics?.evidenceLevel || 'YOK'}
${charResearch.questions?.drivingDynamics?.synthesisedAnswer || 'Veri bulunamadı.'}

[S4 — Konfor, izolasyon & yolculuk kalitesi]
Kanıt seviyesi: ${charResearch.questions?.comfortAndIsolation?.evidenceLevel || 'YOK'}
${charResearch.questions?.comfortAndIsolation?.synthesisedAnswer || 'Veri bulunamadı.'}

[S5 — İç mekân & günlük kullanım pratikliği]
Kanıt seviyesi: ${charResearch.questions?.interiorPracticality?.evidenceLevel || 'YOK'}
${charResearch.questions?.interiorPracticality?.synthesisedAnswer || 'Veri bulunamadı.'}

[S6 — Kullanım senaryoları (Sentez)]
${charResearch.questions?.usageScenarios?.synthesisedAnswer || 'Veri bulunamadı.'}

[S7 — Kullanıcı profili & nihai değerlendirme (Sentez)]
${charResearch.questions?.userProfileAndVerdict?.synthesisedAnswer || 'Veri bulunamadı.'}
--- VEHICLE_CHARACTER_RESEARCH SONU ---`
      : `\n--- VEHICLE_CHARACTER_RESEARCH: Henüz web araştırması yapılmamış. vehicleCharacter bölümü yalnızca fabrika teknik verilerine dayandırılacak. Kullanım deneyimi veya konfor iddiası üretilmeyecek. ---`;

    return `--- HEDEF ARAÇ ---
${vehicleTitle || 'Belirtilmemiş'}

--- VEHICLE_CONTEXT (DOĞRULANMIŞ FABRİKA VE TEKNİK VERİLER) ---
${JSON.stringify(vehicleContext, null, 2)}

--- KAPSAMLI FABRİKA TEKNİK SENTEZ ÖZETİ ---
Araç: ${vehicleTitle}
Motor & Tipi: ${identity.engineCode || 'Motor'} (${identity.engineType || 'Motor Tipi'})
Güç & Devir: ${identity.enginePowerHp || perf.enginePowerHp || '?'} HP ${identity.enginePowerRpm || ''}
Tork & Devir: ${identity.engineTorqueNm || perf.engineTorqueNm || '?'} Nm ${identity.engineTorqueRpm || ''}
Şanzıman & Çekiş: ${identity.transmissionName} (${identity.drivetrain || 'Çekiş'})
Performans: 0-100 km/s: ${perf.zeroToHundredKmh || '?'} sn | Azami Hız: ${perf.topSpeedKmh || '?'} km/h
Tüketim: Şehir İçi: ${perf.cityFuelL100km || '?'}L | Şehir Dışı: ${perf.highwayFuelL100km || '?'}L | Karma: ${perf.combinedFuelL100km || '?'}L / 100km
Depo: ${perf.fuelTankCapacityLiters || '?'} Litre Depo
Boyut & Ağırlık: ${perf.dimensionsMm || identity.dimensionsMm || '?'} mm | Boş Ağırlık: ${perf.curbWeightKg || '?'} kg | Bagaj: ${perf.trunkCapacityLiters || '?'} L
Onaylı Kronik Sorun Sayısı: ${problems.length}

${problems.length > 0 ? `--- ONAYLANMIŞ KRONİK SORUNLAR ---
${problems.map((p: any, i: number) => `${i + 1}. [${p.riskLevel} RİSK] ${p.title}: ${p.description}`).join('\n')}` : '--- KRONİK SORUN: Onaylanmış kayıt bulunmamaktadır ---'}
${charResearchBlock}

Yukarıdaki VEHICLE_CONTEXT verilerini ve fabrika teknik özelliklerini raporun TÜM bölümlerinde harmanlayarak VehicleReportGeneratedContent JSON yapısını tam ve eksiksiz üret. Asla tam depo kilometre menzili hesaplama veya yazma.`;
  }
}
