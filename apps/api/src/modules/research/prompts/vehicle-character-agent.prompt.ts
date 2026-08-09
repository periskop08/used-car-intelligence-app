/**
 * vehicle-character-agent.prompt.ts
 *
 * TorqueScout Vehicle Character Research Agent — 7-Question Framework
 *
 * Governs the "Bu Araç Nasıl Bir Otomobil?" section of the vehicle report.
 * This prompt is used to synthesise web search evidence into structured answers
 * for each of the 7 research questions. It is NOT used for chronic problem research.
 */

/**
 * Master instruction block injected at the top of every character research synthesis call.
 * The agent receives raw search snippets per question and must follow these rules strictly.
 */
export const CHARACTER_RESEARCH_MASTER_RULES = `
SYSTEM PROMPT — TORQUESCOUT VEHICLE CHARACTER RESEARCH AGENT

Yalnızca aşağıdaki 7 araştırma sorusunu cevapla.

Her cevabı araştırılan tam marka + model + model yılı + jenerasyon + kasa tipi + motor kodu + motor gücü + şanzıman + şanzıman tipi + çekiş sistemi + donanım paketi + pazar kombinasyonuna özel oluştur. Model ailesine ait genel değerlendirmeleri bu varyanta doğrudan aktarma.

Her değerlendirme için doğrulanabilir teknik veri, güvenilir dönem testi veya birden fazla bağımsız kullanım kaynağında ortaklaşan bulgu kullan. Tekil kullanıcı görüşünü genel özellik gibi sunma.

"Konforlu, kaliteli, sportif, yeterli, başarılı, premium" gibi soyut ifadeleri tek başına kullanma; her birini somut kullanım sonucu veya teknik gerekçeyle açıkla.

Güvenilir veri bulunmayan performans, ses seviyesi, hızlanma, tüketim veya kullanım davranışını tahmin etme.

Aynı bilgiyi farklı maddelerde tekrar etme.

Kronik arıza, recall, tamir maliyeti, donanım listesi, ekspertiz kontrolü ve satıcı sorularına girme.

Bir cümle araştırılan araç yerine aynı segmentteki çok sayıda araca değişiklik yapılmadan uygulanabiliyorsa o cümleyi kullanma; daha spesifik araştır veya çıkar.

Bir değerlendirmeyi destekleyen yeterli veri yoksa boşluğu genel otomobil bilgisiyle doldurma; o değerlendirmeyi rapordan çıkar ve ilgili alanı null bırak.
`;

/**
 * The 7 research questions with their search intent, forbidden patterns, and output field mapping.
 */
export const CHARACTER_RESEARCH_QUESTIONS = [
  {
    questionId: 'Q1_CHARACTER_AND_SEGMENT',
    questionTitle: 'Araç karakteri ve segmentteki konumu',
    researchQuestion: `Araştırılan tam varyant, kendi üretim dönemindeki doğrudan segment rakipleriyle karşılaştırıldığında nasıl bir otomobil karakterine sahiptir; konfor, sürüş odaklılığı, günlük kullanım kolaylığı, iç mekân kullanışlılığı, ekonomi ve aile kullanımına uygunluk açısından hangi alanlarda belirgin şekilde güçlü veya zayıftır ve aracın rakiplerinden ayrılan temel kullanım karakteri nedir?`,
    researchNote: `"Audi premiumdur" gibi cevap istemiyoruz. "Arka yaşam alanı rakip X/Y'den daha sınırlı ama kabin izolasyonu daha güçlü" gibi karşılığı olan somut sonuç istiyoruz. Rakip isimlendirmesinde mutlaka "neye göre" gerekçesi olmalı.`,
    forbidden: ['Sadece marka prestij ifadesi', 'Boş sıfat karşılaştırması (daha iyi/daha kötü gerekçesiz)'],
    outputField: 'characterAndSegment',
    tavilyQueryTemplate: '{{year}} {{brand}} {{model}} {{trim}} {{engine}} vs competitors review segment comparison',
  },
  {
    questionId: 'Q2_ENGINE_TRANSMISSION_PERFORMANCE',
    questionTitle: 'Motor–şanzıman uyumu ve gerçek kullanım performansı',
    researchQuestion: `Araştırılan araçtaki doğrulanmış motor ve şanzıman kombinasyonu, aracın ağırlığı, güç ve tork üretim karakteri, vites oranları ve çekiş sistemi dikkate alındığında bu kasayla nasıl bir uyum gösterir; kalkış, düşük ve orta devir tepkileri, şehir içi ara hızlanmalar, sollama ihtiyacı, yokuş, tam yüklü kullanım ve otoyol seyri açısından sürücü hangi güçlü ve zayıf davranışları beklemelidir? Güvenilir hızlanma veya ara hızlanma ölçümleri mevcutsa kullan; mevcut değilse sayısal değer üretme.`,
    researchNote: `Güvenilir veri yoksa 80–120 km/s ara hızlanma gibi sayısal ölçüm ÜRETME. Niteliksel değerlendirme yap ve "ölçüm verisi mevcut değil" belirt.`,
    forbidden: ['Ölçüm kaynağı olmadan sayısal hızlanma verisi', 'Motor aile genellemesi (bu motorlu tüm araçlar...)'],
    outputField: 'engineTransmissionFit',
    tavilyQueryTemplate: '{{year}} {{brand}} {{model}} {{engineCode}} {{transmission}} acceleration performance highway test review',
  },
  {
    questionId: 'Q3_DRIVING_DYNAMICS',
    questionTitle: 'Sürüş dinamikleri ve yol davranışı',
    researchQuestion: `Araştırılan varyantın direksiyon sistemi, süspansiyon düzeni, dingil mesafesi, gövde yapısı, çekiş sistemi ve doğrulanmış jant/lastik kombinasyonu dikkate alındığında sürüş davranışı nasıldır; direksiyon tepkisi, viraj dengesi, gövde hareketleri, fren hissi, ani yön değişimleri, şehir içi manevra kabiliyeti ve otoyol stabilitesi açısından sürücünün gerçekten fark edeceği güçlü ve zayıf özellikler nelerdir?`,
    researchNote: `"Sportif" demek yerine sportifliği oluşturan davranışı anlatmak zorunda. "Ön çekişli kompakt, ivmelenme sırasında direksiyon çekme eğilimi gösterir" gibi somut ifade bekliyoruz.`,
    forbidden: ['Tek kelime sıfat (sportif/sert/yumuşak)', 'Ölçüm verisi olmadan g-kuvveti veya fren mesafesi'],
    outputField: 'drivingDynamics',
    tavilyQueryTemplate: '{{year}} {{brand}} {{model}} {{trim}} handling steering suspension dynamics road test',
  },
  {
    questionId: 'Q4_COMFORT_ISOLATION',
    questionTitle: 'Konfor, izolasyon ve yolculuk kalitesi',
    researchQuestion: `Araştırılan araç düşük hız, bozuk asfalt, kasis/çukur, normal şehir sürüşü ve otoyol koşullarında konfor ve izolasyon açısından nasıl davranır; süspansiyon darbeleri, yol ve lastik sesi, rüzgâr sesi, motor sesi, titreşim, koltuk yapısı ve sürüş pozisyonu birlikte değerlendirildiğinde kısa ve uzun yol rahatlığı nasıldır ve hangi koşullarda belirgin şekilde kötüleşir? Bu değerlendirmeyi mümkünse birden fazla bağımsız dönem testi veya ortaklaşan kullanıcı bulgusuyla destekle; tek bir subjektif yorumu genelleme.`,
    researchNote: `En subjektif alan. En az 2 bağımsız kaynak ortaklaşmalı. Tek kaynak bulgusu için "bazı kullanıcılar bildirdi" şeklinde frame etmelisin.`,
    forbidden: ['Tek kaynak konfor genellemesi', 'Subjektif duygu ifadesi kaynak gösterilmeden ("çok konforlu hissettirdi")'],
    outputField: 'comfortAndIsolation',
    tavilyQueryTemplate: '{{year}} {{brand}} {{model}} comfort noise road quality suspension owner review long term',
  },
  {
    questionId: 'Q5_INTERIOR_PRACTICALITY',
    questionTitle: 'İç mekân ve günlük kullanım pratikliği',
    researchQuestion: `Araştırılan aracın kabini gerçek günlük kullanım açısından ne kadar işlevseldir; sürüş pozisyonu, kumandalara erişim, ön/yan/arka görüş, ön ve arka yolcu alanı, orta arka koltuk kullanılabilirliği, dört yetişkinle seyahat, çocuk koltuğu ve ISOFIX erişimi, kapı açıklıkları, eşya alanları ve bagajın şekli/yükleme kolaylığı açısından hangi kullanıcı ihtiyaçlarını iyi karşılar ve hangi noktalarda sınırlama oluşturur?`,
    researchNote: `Ölçü → kullanım sonucu dönüşümü zorunlu. "450 L bagaj" değil, "450 L bagaj — bebek arabası ve hafta sonu valizi aynı anda girer, üçüncü büyük valiz için alan kalmaz" gibi somut kullanım sonucu.`,
    forbidden: ['Boyut/hacim rakamı tek başına (kullanım sonucu olmadan)', 'Donanım listesi tekrarı'],
    outputField: 'interiorPracticality',
    tavilyQueryTemplate: '{{year}} {{brand}} {{model}} interior space rear seat practicality cargo boot review',
  },
  // Q6 and Q7 are synthesis-only — no Tavily search, built from Q1-Q5 evidence
  {
    questionId: 'Q6_USAGE_SCENARIOS',
    questionTitle: 'Farklı kullanım senaryolarında uygunluk',
    researchQuestion: `Araştırılan araç yoğun dur-kalk trafik, kısa mesafeli günlük kullanım, sakin şehir içi sürüş, çevre yolu, uzun mesafe aile yolculuğu, otoyol, yokuşlu güzergâh ve tam yüklü kullanım senaryolarında nasıl davranır; motor-şanzıman karakteri, boyutlar, görüş, manevra, sürüş ve konfor özellikleri birlikte değerlendirildiğinde hangi senaryolarda güçlü bir tercih, hangi senaryolarda ise belirgin taviz isteyen bir otomobildir?`,
    researchNote: `Soru 1–5'teki doğrulanmış verileri kullanım senaryosuna dönüştürüyor. Bu soruda hiçbir yeni teknik iddia icat edilmemeli.`,
    forbidden: ['Q1-Q5 dışında yeni teknik iddia', 'Kaynak gösterilmemiş senaryo tespiti'],
    outputField: 'usageScenarios',
    isSynthesisOnly: true, // No Tavily search for this question
  },
  {
    questionId: 'Q7_USER_PROFILE_VERDICT',
    questionTitle: 'Kullanıcı profili ve tarafsız nihai değerlendirme',
    researchQuestion: `İlk altı araştırma sonucuna dayanarak bu tam varyant hangi kullanıcı profilleri için mantıklı bir seçimdir ve hangi kullanıcıların beklentilerini karşılamayabilir; günlük kullanım biçimi, şehir içi/uzun yol oranı, yolcu sayısı, aile kullanımı, performans beklentisi, konfor önceliği, sürüş karakteri beklentisi ve pratiklik ihtiyacı açısından en doğru kullanıcı profili nedir ve aracın genel karakteri artıları ile tavizlerini birlikte içeren tarafsız bir sonuçla nasıl özetlenmelidir?`,
    researchNote: `7. soruda agent yeni bilgi araştırıp yeni iddia üretmemeli. Bu bölüm bir sentez. Yalnızca Q1-Q6'dan elde edilen bulgulara dayanmalı.`,
    forbidden: ['Yeni teknik bilgi araştırması', 'Q1-Q6 dışı yeni iddia'],
    outputField: 'userProfileAndVerdict',
    isSynthesisOnly: true, // No Tavily search for this question
  },
] as const;

export type CharacterResearchQuestionId = typeof CHARACTER_RESEARCH_QUESTIONS[number]['questionId'];

/**
 * Domain whitelist for vehicle character research.
 * Ordered by reliability tier. Tavily `include_domains` uses these.
 */
export const CHARACTER_RESEARCH_DOMAINS = {
  /** Tier 1 — Aggregated review / test databases */
  tier1_aggregate: [
    'carcomplaints.com',
    'repairpal.com',
    'edmunds.com',
  ],
  /** Tier 2 — Community & long-term owner experiences */
  tier2_community: [
    'reddit.com',
    'forums.edmunds.com',
    'forum.donanimhaber.com',
    'otoforum.com',
  ],
  /** Tier 3 — Automotive press / Turkey-specific */
  tier3_press: [
    'motortrend.com',
    'caranddriver.com',
    'autocar.co.uk',
    'motormagazin.com.tr',
    'otomobiltutkunu.com',
  ],
} as const;

/**
 * Strict evidence rules enforced at code level.
 * Any answer violating these must be flagged as INSUFFICIENT_EVIDENCE.
 */
export const CHARACTER_EVIDENCE_RULES = [
  'EVIDENCE_ONLY: No data → exclude that assessment entirely.',
  'NO_NUMERIC_FABRICATION: No acceleration/consumption figures without a cited measured source.',
  'MULTI_SOURCE_REQUIRED: Comfort/NVH/steering assessments require ≥2 independent sources agreeing.',
  'NO_GENERIC_ADJECTIVES: "Comfortable / sporty / quality" must be backed by a specific behavior or source.',
  'VARIANT_SPECIFIC: Evaluate this exact variant, not the model family.',
  'NO_EQUIPMENT_LIST_REPEAT: Do not re-list equipment; only mention it if it directly affects driving or comfort.',
  'NO_BASELESS_COMPETITOR_CLAIM: Competitor comparisons must cite a specific metric or source.',
  'SYNTHESIS_ONLY_Q6_Q7: Questions 6 and 7 must NOT trigger new web searches; derive from Q1-Q5 only.',
] as const;

/**
 * Output interface for structured character research results.
 * Each field corresponds to one of the 7 questions.
 * null = insufficient evidence found; must NOT be filled with generic content.
 */
export interface VehicleCharacterResearchResult {
  variantTitle: string;
  researchedAt: string; // ISO timestamp
  totalSourcesFound: number;
  questions: {
    characterAndSegment: CharacterQuestionAnswer | null;
    engineTransmissionFit: CharacterQuestionAnswer | null;
    drivingDynamics: CharacterQuestionAnswer | null;
    comfortAndIsolation: CharacterQuestionAnswer | null;
    interiorPracticality: CharacterQuestionAnswer | null;
    usageScenarios: CharacterQuestionAnswer | null;       // Synthesised from above
    userProfileAndVerdict: CharacterQuestionAnswer | null; // Synthesised from above
  };
}

export interface CharacterQuestionAnswer {
  questionId: CharacterResearchQuestionId;
  evidenceLevel: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';
  sourceCount: number;
  sources: Array<{
    url: string;
    domain: string;
    title: string;
    relevantSnippet: string;
    reliabilityTier: 1 | 2 | 3;
  }>;
  synthesisedAnswer: string; // Turkish, based solely on found evidence
  caveats: string[];         // e.g. "Bu bulgu yalnızca tek bir foruma dayanmaktadır"
}
