/**
 * Utility for sanitizing and completing vehicle defect titles and descriptions.
 * Guarantees that:
 * 1. English text (recalls, foreign news snippets) is replaced with professional Turkish engineering prose.
 * 2. Truncated sentences ending with ellipsis ("...") are either safely completed or mapped to authoritative domain explanations.
 * 3. Social media, repair-shop marketing jargon ("usta notu", "DM'den", etc.), and debug tokens ("UNRESOLVED") are removed.
 * 4. High-quality existing Turkish descriptions are preserved.
 */

export interface DefectSanitizationContext {
  domain?: string;
  title?: string;
  failureMode?: string;
  component?: string;
}

const DOMAIN_FAILURE_EXPLANATIONS_TR: Record<string, string> = {
  DUAL_CLUTCH:
    'Kuru tip çift kavramalı otomatik şanzımanlarda yoğun dur-kalk trafikte kavrama balatasında aşınma, kalkışta titreme veya vites geçiş kararsızlığı görülebilmektedir.',
  MECHATRONIC:
    'Çift kavramalı otomatik şanzıman mekatronik hidrolik kontrol ünitesi basınç tüpü ve valf gövdesinde basınç kaybı veya yazılım kararsızlığı yönünden kontrol edilmelidir.',
  COOLANT_LEAK:
    'Motor soğutma devresinde devirdaim su pompası ve termostat gövdesinde sızdırmazlık kaybı veya antifriz kaçağı görülebilmektedir. Hararet dengesi ve soğutma sıvısı seviyesi periyodik olarak kontrol edilmelidir.',
  CAMSHAFT_ADJUSTER:
    'Kam mili ayarlayıcı cıvatası, kasnak ve eksantrik dişlilerinde gevşeme veya aşınma riski motor zamanlaması ve performansı yönünden incelenmelidir.',
  WET_BELT:
    'Motor yağı içerisinde çalışan ıslak triger kayışında kimyasal aşınma ve kopan kauçuk parçacıklarının karter/yağ pompası süzgecini tıkama riski kontrol edilmelidir.',
  TIMING_CHAIN:
    'Triger zincirinde periyodik bakım veya yağlama kalitesine bağlı uzama, ilk çalıştırmada zincir sesi ve zamanlama hatası riski incelenmelidir.',
  OIL_LEAK:
    'Motor yağ soğutucusu contaları, filtre kütüğü ve külbütör kapağında ısıl döngülere bağlı sızdırmazlık durumu periyodik bakım kapsamında kontrol edilmelidir.',
  INJECTOR:
    'Yüksek basınçlı yakıt enjektörlerinde kurum birikmesi veya püskürtme dengesizliği bilgisayarlı arıza tespit cihazıyla kontrol edilmelidir.',
  TURBO:
    'Turboşarj mili boşluğu, tahliye kapağı (wastegate) ayarı ve hava soğutucu boru bağlantılarında yağ kaçağı kontrol edilmelidir.',
  EGR_DPF:
    'EGR valfi kurum birikimi ve Dizel Partikül Filtresi (DPF) doluluk oranı arıza tespit cihazıyla incelenmelidir.',
  BRAKE_VACUUM:
    'Fren hidrolik devresi, mekanik vakum pompası ve fren disk/balata aşınma seviyesi kontrol edilmelidir.',
  STEERING:
    'Elektrik destekli direksiyon kutusu, mafsal boşluğu ve tork sensörü kalibrasyonu kontrol edilmelidir.',
  BATTERY_DRAIN:
    '12V yardımcı akü şarj kapasitesi ve araç uyku modunda kaçak akım tüketimi kontrol edilmelidir.',
  ICCU:
    'Entegre şarj kontrol ünitesi (ICCU) yazılım versiyonu ve yüksek voltaj bağlantıları incelenmelidir.',
};

const DOMAIN_FALLBACK_EXPLANATIONS_TR: Record<string, string> = {
  POWERTRAIN_TRANS:
    'Çift kavramalı otomatik şanzıman mekatronik hidrolik kontrol ünitesi basınç düşümü ve vites geçiş kararsızlığı yönünden kontrol edilmelidir.',
  THERMAL_COOLING:
    'Soğutma sistemi devirdaim su pompası ve termostat gövdesinde sızdırmazlık kaybı veya antifriz kaçağı kontrol edilmelidir.',
  POWERTRAIN_ENGINE:
    'Motor mekaniği, zamanlama parçaları ve yağ soğutucusu bağlantı contalarında sızdırmazlık durumu periyodik bakım kapsamında incelenmelidir.',
  CHASSIS_BRAKES:
    'Yürüyen aksam, süspansiyon geometrisi, direksiyon kutusu ve fren sistemi fiziki olarak kontrol edilmelidir.',
  ELECTRICAL_BODY:
    'Araç elektronik kontrol modülleri, tesisat soketleri ve konfor donanımı fonksiyonel testten geçirilmelidir.',
  DEFAULT:
    'Yetkili servis teknik bültenleri ve ekspertiz kontrol standartları kapsamında ilgili bileşen fiziki olarak kontrol edilmelidir.',
};

/**
 * Detects whether a string is primarily English or contains foreign recall/news snippet tokens.
 */
export function isEnglishOrForeignText(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Strong English automotive/recall signals
  const englishPhrases = [
    /\brecall:\s*/i,
    /\bmore than \d+/i,
    /\bcaught up in\b/i,
    /\bdual[- ]clutch transmission\b/i,
    /\bmay cause\b/i,
    /\bincreases? the risk\b/i,
    /\baccording to\b/i,
    /\bconsequence:\s*/i,
    /\bdescription:\s*/i,
    /\bpower steering\b/i,
    /\bengine stall\b/i,
    /\bfuel leak\b/i,
    /\bwater pump\b/i,
    /\boil starvation\b/i,
  ];

  for (const phrase of englishPhrases) {
    if (phrase.test(lower)) return true;
  }

  const englishKeywords = [
    /\brecall\b/i,
    /\brecalled\b/i,
    /\bvehicles?\b/i,
    /\bcars?\b/i,
    /\btransmission\b/i,
    /\bgearbox\b/i,
    /\bengine\b/i,
    /\bissue\b/i,
    /\bissues\b/i,
    /\bfailure\b/i,
    /\bfailures\b/i,
    /\bdual[- ]clutch\b/i,
    /\bclutch\b/i,
    /\bmodels?\b/i,
    /\bstall\b/i,
    /\bleak\b/i,
    /\bleaks\b/i,
    /\bfire\b/i,
    /\bsafety\b/i,
    /\bsteering\b/i,
    /\bbraking\b/i,
    /\bdealer\b/i,
    /\binspect\b/i,
    /\binspection\b/i,
    /\bcoolant\b/i,
    /\bbracket\b/i,
    /\bscrew\b/i,
    /\bbolt\b/i,
    /\bdefective\b/i,
    /\btorque\b/i,
    /\bassembly\b/i,
    /\bplant\b/i,
    /\bdegradation\b/i,
    /\bstarvation\b/i,
    /\bvacuum\b/i,
    /\bpump\b/i,
    /\bassist\b/i,
    /\bdrive\b/i,
    /\bdriver\b/i,
    /\bwarning\b/i,
    /\bcrack\b/i,
    /\bcracking\b/i,
    /\bcorrosion\b/i,
    /\bwear\b/i,
    /\bpressure\b/i,
    /\bvalve\b/i,
    /\bwater\b/i,
    /\bcommon\b/i,
    /\bmost\b/i,
    /\bproblem\b/i,
    /\bproblems\b/i,
  ];

  let matches = 0;
  for (const kw of englishKeywords) {
    if (kw.test(lower)) {
      matches++;
      if (matches >= 2) return true;
    }
  }

  // Check English stop words if there are no Turkish characters
  const hasTurkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(text);
  if (!hasTurkishChars) {
    const englishStopWords = /\b(the|is|are|was|were|in|at|which|on|have|has|had|been|with|from|and|for|by|to|an|of|during|leads to|into)\b/gi;
    const stopMatches = lower.match(englishStopWords);
    if (stopMatches && stopMatches.length >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the best-matching authoritative Turkish automotive explanation for a given defect context.
 */
export function getStandardTurkishDefectExplanation(context: DefectSanitizationContext): string {
  const normKey = `${context.failureMode || ''} ${context.title || ''} ${context.component || ''}`.toUpperCase();

  if (normKey.includes('WET_BELT') || /wet[\s_-]?belt/i.test(normKey) || normKey.includes('ISLAK TRİGER')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.WET_BELT;
  }
  if (normKey.includes('MECHATRONIC') || normKey.includes('MEKATRONİK')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.MECHATRONIC;
  }
  if (normKey.includes('CLUTCH') || normKey.includes('KAVRAMA') || normKey.includes('DSG') || normKey.includes('EDC') || normKey.includes('POWERSHIFT')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.DUAL_CLUTCH;
  }
  if (
    normKey.includes('COOLANT') ||
    normKey.includes('THERMOSTAT') ||
    normKey.includes('DEVIRDAIM') ||
    normKey.includes('SU POMPASI') ||
    normKey.includes('WATER_PUMP') ||
    normKey.includes('HARARET')
  ) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.COOLANT_LEAK;
  }
  if (normKey.includes('CAMSHAFT') || normKey.includes('KAM MİLİ') || normKey.includes('EKSANTRİK')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.CAMSHAFT_ADJUSTER;
  }
  if (normKey.includes('TIMING_CHAIN') || normKey.includes('TRİGER ZİNCİR')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.TIMING_CHAIN;
  }
  if (normKey.includes('OIL_LEAK') || normKey.includes('YAĞ SOĞUTUCU') || normKey.includes('YAĞ FİLTRE')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.OIL_LEAK;
  }
  if (normKey.includes('INJECTOR') || normKey.includes('ENJEKTÖR')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.INJECTOR;
  }
  if (normKey.includes('TURBO') || normKey.includes('WASTEGATE')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.TURBO;
  }
  if (normKey.includes('EGR') || normKey.includes('DPF')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.EGR_DPF;
  }
  if (normKey.includes('BRAKE') || normKey.includes('FREN')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.BRAKE_VACUUM;
  }
  if (normKey.includes('STEERING') || normKey.includes('DİREKSİYON')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.STEERING;
  }
  if (normKey.includes('BATTERY') || normKey.includes('AKÜ')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.BATTERY_DRAIN;
  }
  if (normKey.includes('ICCU')) {
    return DOMAIN_FAILURE_EXPLANATIONS_TR.ICCU;
  }

  // Domain fallback
  const d = context.domain || '';
  if (DOMAIN_FALLBACK_EXPLANATIONS_TR[d]) {
    return DOMAIN_FALLBACK_EXPLANATIONS_TR[d];
  }

  return DOMAIN_FALLBACK_EXPLANATIONS_TR.DEFAULT;
}

/**
 * Cleans, completes, and formats a Turkish defect explanation so that no English text,
 * no truncated ellipsis (...), and no social media jargon ever reaches the user.
 */
export function sanitizeTurkishDefectDescription(
  rawReason: string | undefined | null,
  context: DefectSanitizationContext = {},
): string {
  if (!rawReason) {
    return getStandardTurkishDefectExplanation(context);
  }

  let text = rawReason.trim();

  // 1. Remove raw debug tokens or social media / marketing junk
  const isDebugOrJunk =
    text.toUpperCase() === 'UNRESOLVED' ||
    /usta notu|dm'den|instagram|tiktok|facebook|takip edin|abone olun/i.test(text) ||
    text.length < 15;

  if (isDebugOrJunk) {
    return getStandardTurkishDefectExplanation(context);
  }

  // 2. Reject English or foreign recall/news texts
  if (isEnglishOrForeignText(text)) {
    return getStandardTurkishDefectExplanation(context);
  }

  // 3. Handle truncation, ellipses (... or …), and cut-off sentences
  if (text.includes('...') || text.includes('…')) {
    // Look for complete sentence(s) before the first ellipsis
    const preEllipsis = text.split(/\.{3}|…/)[0].trim();

    // Check if there is a complete sentence (ending in '.', '!', '?')
    const sentenceEndMatch = preEllipsis.match(/(.*[.!?])\s*[^.!?]*$/);
    const completeSentences = sentenceEndMatch ? sentenceEndMatch[1].trim() : '';

    // If we have a robust complete sentence (at least 35 characters and not dangling with a colon)
    if (completeSentences.length >= 35 && !completeSentences.endsWith(':') && !completeSentences.endsWith(';')) {
      // Append a natural complement if relevant
      const normKey = `${context.failureMode || ''} ${context.title || ''} ${context.domain || ''}`.toUpperCase();
      if (normKey.includes('COOLANT') || normKey.includes('THERMOSTAT') || normKey.includes('DEVIRDAIM') || normKey.includes('HARARET')) {
        return `${completeSentences} Radyatör, su hortumları, devirdaim pompası ve termostat gövdesinde sızdırmazlık kontrolü yapılmalıdır.`;
      } else if (normKey.includes('TRANS') || normKey.includes('CLUTCH') || normKey.includes('MECHATRONIC')) {
        return `${completeSentences} Mekatronik hidrolik basıncı ve kavrama aşınma toleransları periyodik olarak kontrol edilmelidir.`;
      }
      return completeSentences;
    }

    // If pre-ellipsis text was too short or lacked complete sentences, fall back to standard explanation
    return getStandardTurkishDefectExplanation(context);
  }

  // 4. Clean parenthetical transmission acronyms like (DSG / EDC)
  text = text.replace(/\s*\(\s*(?:DSG|EDC|DCT|POWERSHIFT)(?:\s*[\/,-]\s*(?:DSG|EDC|DCT|POWERSHIFT))*\s*\)/gi, '');
  // Clean diagnostik loan words
  text = text.replace(/diagnostik cihaz[ıi]?(?:yla|yle)/gi, 'bilgisayarlı arıza tespit cihazıyla');
  text = text.replace(/diagnostik cihazda/gi, 'bilgisayarlı arıza tespit cihazında');
  text = text.replace(/diagnostik cihaz[ıi]?/gi, 'bilgisayarlı arıza tespit cihazı');
  text = text.replace(/diagnostik/gi, 'arıza tespit');
  // Clean kavrama kavrama typo
  text = text.replace(/kavrama kavrama noktas[ıi]/gi, 'kavrama temas noktası');
  text = text.replace(/kavrama kavrama/gi, 'kavrama');
  text = text.replace(/\s{2,}/g, ' ').trim();

  // 5. Ensure proper punctuation finish
  if (text.endsWith(':') || text.endsWith(';') || text.endsWith(',')) {
    text = text.slice(0, -1).trim();
  }
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

/**
 * Sanitizes and cleans pre-purchase inspection instructions:
 * Removes English loanwords ("diagnostik"), eliminates transmission acronyms in parens,
 * and fixes duplicate typos like "kavrama kavrama noktası".
 */
export function sanitizeTurkishInspectionInstruction(
  rawInstruction?: string | null,
): string | undefined {
  if (!rawInstruction) return undefined;

  let text = rawInstruction.trim();
  if (!text) return undefined;

  // Clean duplicate typo "kavrama kavrama noktası"
  text = text.replace(/kavrama kavrama noktas[ıi]/gi, 'kavrama temas noktası');
  text = text.replace(/kavrama kavrama/gi, 'kavrama');

  // Replace foreign "diagnostik" with Turkish equivalent
  text = text.replace(/diagnostik cihaz[ıi]?(?:yla|yle)/gi, 'bilgisayarlı arıza tespit cihazıyla');
  text = text.replace(/diagnostik cihazda/gi, 'bilgisayarlı arıza tespit cihazında');
  text = text.replace(/diagnostik cihaz ile/gi, 'bilgisayarlı arıza tespit cihazı ile');
  text = text.replace(/diagnostik cihaz[ıi]?/gi, 'bilgisayarlı arıza tespit cihazı');
  text = text.replace(/diagnostik test[i|e]?/gi, 'bilgisayarlı arıza testi');
  text = text.replace(/diagnostik/gi, 'arıza tespit');

  // Remove parenthetical transmission acronyms like (DSG / EDC)
  text = text.replace(/\s*\(\s*(?:DSG|EDC|DCT|POWERSHIFT)(?:\s*[\/,-]\s*(?:DSG|EDC|DCT|POWERSHIFT))*\s*\)/gi, '');

  text = text.replace(/\s{2,}/g, ' ').trim();

  // Ensure first letter is capitalized
  if (text.length > 0) {
    text = text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
  }

  if (text.endsWith(':') || text.endsWith(';') || text.endsWith(',')) {
    text = text.slice(0, -1).trim();
  }
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

/**
 * Cleans and standardizes the Turkish title of a defect.
 */
export function sanitizeTurkishDefectTitle(
  rawTitle: string | undefined | null,
  context: DefectSanitizationContext = {},
): string {
  if (!rawTitle) {
    return 'Doğrulanmış Teknik Kusur';
  }

  let title = rawTitle.trim();

  // Social media or clickbait titles
  if (/hararetin gizli sebebi|usta notu|on instagram|tiktok/i.test(title)) {
    return 'Devirdaim & Termostat Soğutma Sıvısı Sızıntısı';
  }

  // Water leak / coolant English patterns
  if (
    /water\s*leak|coolant\s*leak|water\s*pump|most\s*common\s*water/i.test(title) ||
    /water\s*leak|coolant\s*leak|water\s*pump/i.test(context.failureMode || '')
  ) {
    return 'Devirdaim & Termostat Soğutma Sıvısı Sızıntısı';
  }

  // English or raw enum / slug titles
  if (isEnglishOrForeignText(title) || /^[A-Z0-9_-]{4,}$/.test(title)) {
    const normKey = `${context.failureMode || ''} ${title} ${context.component || ''}`.toUpperCase();
    if (normKey.includes('WET_BELT') || /wet[\s_-]?belt/i.test(normKey)) return 'Islak Triger Kayışı Aşınması';
    if (normKey.includes('MECHATRONIC')) return 'Mekatronik Hidrolik Basınç Kaybı';
    if (normKey.includes('CLUTCH') || normKey.includes('KAVRAMA') || normKey.includes('DSG')) return 'Kuru Çift Kavrama Aşınması';
    if (
      normKey.includes('COOLANT') ||
      normKey.includes('THERMOSTAT') ||
      normKey.includes('WATER') ||
      normKey.includes('SU POMPA') ||
      normKey.includes('HARARET')
    ) {
      return 'Devirdaim & Termostat Soğutma Sıvısı Sızıntısı';
    }
    if (normKey.includes('CAMSHAFT') || normKey.includes('KAM MİLİ')) return 'Kam Mili Ayarlayıcı Cıvatasının Gevşemesi';
    if (normKey.includes('TIMING_CHAIN')) return 'Triger Zinciri Uzaması / Aşınması';
    if (normKey.includes('OIL_LEAK')) return 'Motor Yağı ve Soğutucu Kaçağı';
    if (normKey.includes('INJECTOR')) return 'Yakıt Enjektörü Kurum & Tıkanma';
    if (normKey.includes('TURBO')) return 'Turboşarj ve Wastegate Boşluğu';
    if (normKey.includes('BRAKE')) return 'Fren Vakum Pompası Kontrolü';
    if (normKey.includes('STEERING')) return 'Direksiyon Kutusu Kontrolü';

    if (context.domain === 'POWERTRAIN_TRANS') return 'Otomatik Şanzıman / Mekatronik Kontrolü';
    if (context.domain === 'THERMAL_COOLING') return 'Devirdaim & Termostat Soğutma Sıvısı Sızıntısı';
    if (context.domain === 'POWERTRAIN_ENGINE') return 'Motor Mekaniği & Zamanlama Kontrolü';
    return 'Teknik Servis Bülteni';
  }

  return title;
}
