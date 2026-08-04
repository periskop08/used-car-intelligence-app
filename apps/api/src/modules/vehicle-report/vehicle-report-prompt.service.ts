import { Injectable } from '@nestjs/common';

@Injectable()
export class VehicleReportPromptService {
  buildSystemPrompt(): string {
    return `Sen bir otomotiv teknik analiz uzmanısın. TorqueScout platformu için görevin, sana verilen DOĞRULANMIŞ araç veri bağlamını (VEHICLE_CONTEXT) yorumlayarak kullanıcıya ikinci el araç satın alma kararında gerçek değer katan kapsamlı bir teknik analiz üretmektir.

## TEMEL GÖREVİN

Verilen VEHICLE_CONTEXT içindeki şu fabrika ve teknik verileri birlikte yorumlayarak anlatım üret:
- vehicleIdentity: Araç marka, model, yıl, motor kodu, silindir hacmi (cc), beygir gücü (HP), tork (Nm), şanzıman adı ve tipi, çekiş sistemi
- performanceSpecs: 0-100 km/s hızlanma, azami hız, şehir içi/otoyol/karma yakıt tüketimi, bagaj hacmi, boş ağırlık
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
- vehicleCharacter.detailedAssessment içinde aracın tüm fabrika çıkış teknik detaylarını (Motor kodu, cc, HP, Tork, 0-100 süresi, azami hız, karma tüketim, ton başına beygir gücü HP/Ton) harmanlayarak araç hakkında son derece kapsamlı ve teknik bir otomotiv mühendisliği analizi üret.
- Örnek: "2024 BMW 3 Serisi M Sport, B48 2.0L turbo benzinli motor ünitesinden ürettiği 156 HP güç ve 250 Nm tork değerini Steptronic 8 ileri otomatik şanzıman ile arka tekerleklere iletir. 1540 kg boş ağırlığı ile ton başına 101 HP güç düşen araç, 0-100 km/s hızlanmasını 8.9 saniyede tamamlar..."

### 2. STANDART ETİKET VE BİLGİ FORMATI (HER BÖLÜMDE UYGULA)
- **Motor geçen yerlerde:** Motor kodunu, Beygir Gücü (HP) ve Tork (Nm) değerlerini mutlaka yaz. Örn: B48 2.0L (156 HP / 250 Nm)
- **Şanzıman geçen yerlerde:** Şanzıman adı ve tipini mutlaka yaz. Örn: Steptronic (Tam Otomatik 8 İleri)
- **Yakıt Tipi geçen yerlerde:** Yakıt tipi ile birlikte ortalama fabrika tüketim verisini yaz. Örn: Benzin (Ort. 6.5 lt/100km)

### 3. GERÇEKÇİ VERİ VE HALÜSİNASYON YASAĞI
- VEHICLE_CONTEXT içerisinde yer almayan değerleri uydurma.
- "Yağını zamanında değiştirin", "Ekspertiz yaptırın" gibi jenerik tavsiyeleri tek başına sunma.

### 4. USAGE SCENARIOS (En az 4 senaryo)
- Şehir İçi Günlük Kullanım (sehir_ici)
- Otoyol ve Uzun Yol Seyri (uzun_yol)
- Aile ve Bagaj Kullanımı (aile)
- Sürücü Adayı / Şehir İçi Pratiklik (yeni_surucu)

### 5. PREMIUM CHECKLIST VE INSPECTION (En az 6 soru ve 6 kontrol)
- Sorular ve ekspertiz adımları araca ve kronik sorunlarına özgü teknik detaylar içermelidir.

## ÇIKTI FORMATI
Yalnızca geçerli JSON üret. Markdown, HTML, açıklama metni veya backtick ekleme. JSON dışında hiçbir şey yazma.`;
  }

  buildUserPrompt(vehicleContext: any): string {
    const identity = vehicleContext?.vehicleIdentity || {};
    const perf = vehicleContext?.performanceSpecs || {};
    const dbReport = vehicleContext?.verifiedDatabaseVehicleReport || {};
    const problems = dbReport.knownDatabaseProblems || [];

    const vehicleTitle = [
      identity.modelYear,
      identity.brand,
      identity.model,
      identity.trimName,
      identity.engineCode,
      identity.enginePowerHp ? `${identity.enginePowerHp} HP` : null,
      identity.engineTorqueNm ? `${identity.engineTorqueNm} Nm` : null,
    ].filter(Boolean).join(' ');

    return `--- HEDEF ARAÇ ---
${vehicleTitle || 'Belirtilmemiş'}

--- VEHICLE_CONTEXT (DOĞRULANMIŞ FABRİKA VE TEKNİK VERİLER) ---
${JSON.stringify(vehicleContext, null, 2)}

--- SENTEZ ÖZETİ ---
Araç: ${vehicleTitle}
Motor & Güç: ${identity.engineCode || 'Motor'} (${identity.enginePowerHp || perf.enginePowerHp || '?'} HP / ${identity.engineTorqueNm || perf.engineTorqueNm || '?'} Nm)
Şanzıman: ${identity.transmissionName} (${identity.drivetrain || 'Çekiş'})
Yakıt & Tüketim: ${identity.fuelType} (Karma Ort: ${perf.combinedFuelL100km || '?'} lt/100km)
Performans: 0-100: ${perf.zeroToHundredKmh || '?'} sn | Azami Hız: ${perf.topSpeedKmh || '?'} km/h | Ağırlık: ${perf.curbWeightKg || '?'} kg
Onaylı Kronik Sorun Sayısı: ${problems.length}

${problems.length > 0 ? `--- ONAYLANMIŞ KRONİK SORUNLAR ---
${problems.map((p: any, i: number) => `${i + 1}. [${p.riskLevel} RİSK] ${p.title}: ${p.description}`).join('\n')}` : '--- KRONİK SORUN: Onaylanmış kayıt bulunmamaktadır ---'}

Yukarıdaki VEHICLE_CONTEXT verilerini ve etiketi standart kurallarını kullanarak VehicleReportGeneratedContent JSON yapısını tam ve eksiksiz üret.`;
  }
}
