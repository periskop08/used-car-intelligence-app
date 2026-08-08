/**
 * clean-arabam-data.js
 * 
 * Arabam.com'dan kazınan ham veriyi temizler ve doğru alanlara parse eder.
 * 
 * Arabam.com fullPath Yapısı:
 * 5 adım: Otomobil > Yıl > Yakıt > Marka > Model
 * 6 adım: Otomobil > Yıl > Yakıt > Marka > Model > (Motor VEYA Şanzıman)
 * 7 adım: Otomobil > Yıl > Yakıt > Marka > Model > Motor > (Trim VEYA Şanzıman)
 * 8 adım: Otomobil > Yıl > Yakıt > Marka > Model > AltModel > Motor > (Trim VEYA Şanzıman)
 * 9 adım: Otomobil > Yıl > Yakıt > Marka > Model > AltModel > Motor > Trim > Şanzıman
 */

const fs = require('fs');
const path = require('path');

// ========== KURAL TABLOLARI ==========

// Kasa tipi anahtar kelimeleri (bir segment bu kelimeleri içeriyorsa kasa tipidir)
const BODY_TYPE_KEYWORDS = [
  'hatchback', 'sedan', 'station wagon', 'coupe', 'cabrio', 'roadster',
  'mpv', 'suv', 'pickup', 'panelvan', 'van', 'minibüs', 'crossover',
  'liftback', 'fastback', 'gran coupe', 'shooting brake', 'estate',
  'convertible', 'targa', 'spider', 'avant', 'touring', 'break',
  'sw', 'kombi'
];

// Şanzıman anahtar kelimeleri
const TRANS_KEYWORDS = [
  'düz', 'otomatik', 'yarı otomatik', 'manuel', 'manual',
  's-tronic', 's tronic', 'dsg', 'edc', 'cvt', 'e-cvt',
  'tiptronic', 'multitronic', '9g-tronic', '7g-tronic', '6g-tronic',
  'steptronic', 'eat8', 'eat6', 'eat7', 'triptonik', 'ips',
  'xtronic', 'autoshift', 'stronic', 'quickshift'
];

// Gerçek donanım paketi anahtar kelimeleri (trim'ler)
const TRIM_KEYWORDS = [
  's line', 's-line', 'sline', 'advanced', 'sport', 'dynamic', 'design',
  'ambition', 'attraction', 'ambiente', 'comfort', 'executive', 'elegance',
  'luxury', 'titanium', 'trend', 'style', 'touch', 'joy', 'icon', 'prime',
  'active', 'm sport', 'amg', 'f-sport', 'gtd', 'gti', 'gts', 'gtx',
  'edition', 'launch', 'special', 'premium', 'prestige', 'signature',
  'exclusive', 'anniversary', 'lounge', 'progressive', 'avantgarde',
  'urban', 'classic', 'elite', 'luna', 'terra', 'sol', 'venture',
  'impression', 'motion', 'allure', 'selection', 'intuition', 'expression',
  'highline', 'trendline', 'sportline', 'business', 'tecnik', 'technik',
  'excellence', 'initiale', 'intense', 'zen', 'equilibre', 'evolution',
  'techno', 'rs', 'r-line', 'rline', 'cross', 'life', 'live', 'drive',
  'passion', 'vision', 'ikon', 'first edition', 'limited', 'plus',
  'quattro', 'xdrive', '4matic', 'awd', '4x4',
  'luxury line', 'sport line', 'sport edition', 'm sport',
  'l&k', 'laurin', 'ambition', 'scout', 'monte carlo',
  'jump', 'dolce', 'lounge', 'collezione', 'waze', 'city cross',
  'connect', 'turbo tech', 'popstar', 'my way', 'sky dome',
  'easy', 'comfort', 'go', 'team', 'family',
];

// Motor kodu → Şanzıman tipi kuralları (bilinen tek-varyant motörler)
const ENGINE_TO_TRANSMISSION = {
  // BMW - tümü otomatik (Steptronic)
  '116d': 'Otomatik', '118d': 'Otomatik', '120d': 'Otomatik',
  '316d': 'Otomatik', '318d': 'Otomatik', '320d': 'Otomatik',
  '116i': 'Otomatik', '118i': 'Otomatik', '120i': 'Otomatik',
  '420d': 'Otomatik', '520d': 'Otomatik', '730d': 'Otomatik',
  '840d': 'Otomatik', 'x5 40d': 'Otomatik',
  // Mercedes - tümü otomatik (9G-Tronic)
  'a 180': 'Otomatik', 'a 200': 'Otomatik', 'c 180': 'Otomatik',
  'c 200': 'Otomatik', 'e 200': 'Otomatik', 'e 220': 'Otomatik',
  // Audi - S-Tronic veya Tiptronic
  '35 tfsi': 'Otomatik', '40 tfsi': 'Otomatik', '45 tfsi': 'Otomatik',
  '30 tfsi': 'Otomatik', '35 tdi': 'Otomatik',
};

// Motor kodu → Kasa tipi kuralları
const ENGINE_CODE_PATTERNS = {
  // Motor kodu içinde kasa bilgisi geçiyorsa çıkar
  'gran coupe': 'Gran Coupe',
  'touring': 'Touring (Station Wagon)',
  'avant': 'Avant (Station Wagon)',
  'sportback': 'Sportback (Hatchback)',
  'sedan': 'Sedan',
};

// ========== YARDIMCI FONKSİYONLAR ==========

function segmentType(seg) {
  const lower = seg.toLowerCase().trim();
  if (!lower) return 'empty';

  // Şanzıman mı?
  if (TRANS_KEYWORDS.some(k => lower === k || lower.startsWith(k + ' ') || lower.endsWith(' ' + k) || lower.includes(' ' + k + ' '))) {
    return 'transmission';
  }

  // Kasa tipi mi? (tam eşleşme veya içeriyor + motor kodu değil)
  if (BODY_TYPE_KEYWORDS.some(k => lower.includes(k))) {
    // Motor kodu gibi görünmüyorsa kasa tipidir
    if (!/\d+\.\d+/.test(lower) && !/\d{2,4}[a-z]/.test(lower)) {
      return 'bodyType';
    }
  }

  // Motor/Versiyon kodu mu? (sayı içeriyor, motor adı gibi görünüyor)
  if (/\d+[\.,]\d+/.test(lower) || /^\d{2,3}[a-z]/.test(lower) ||
    /^[0-9]+\s*(tfsi|tsi|tdi|tdi|fsi|gdi|mpi|sce|tce|dci|d-4d|vtec|cdti|jtd|multijet|bluehdi|puretech|t6|hdi|crdi|itd|itec|crd|vvt|cvt|e-power)/i.test(lower)) {
    return 'engine';
  }

  // Donanım paketi mi?
  if (TRIM_KEYWORDS.some(k => lower.includes(k))) {
    return 'trim';
  }

  // Sayı içeriyorsa motor versiyonu olabilir
  if (/\d/.test(lower) && lower.length < 25) {
    return 'engine';
  }

  // Uzun metin ise büyük ihtimalle trim
  if (lower.length > 2) return 'trim';

  return 'unknown';
}

function detectTransmissionFromEngine(engineStr) {
  if (!engineStr) return null;
  const lower = engineStr.toLowerCase();
  for (const [code, trans] of Object.entries(ENGINE_TO_TRANSMISSION)) {
    if (lower.includes(code.toLowerCase())) return trans;
  }
  return null;
}

function normalizeTransmission(val) {
  if (!val) return null;
  const lower = val.toLowerCase().trim();
  if (lower.includes('yarı otomatik') || lower.includes('triptonik')) return 'Yarı Otomatik';
  if (lower.includes('düz') || lower.includes('manuel') || lower.includes('manual')) return 'Düz (Manuel)';
  if (lower.includes('otomatik') || lower.includes('s-tronic') || lower.includes('stronic') ||
    lower.includes('dsg') || lower.includes('edc') || lower.includes('cvt') ||
    lower.includes('tiptronic') || lower.includes('multitronic') ||
    lower.includes('9g-tronic') || lower.includes('7g-tronic') || lower.includes('6g-tronic') ||
    lower.includes('steptronic') || lower.includes('eat8') || lower.includes('eat6') ||
    lower.includes('eat7') || lower.includes('xtronic')) return 'Otomatik';
  return val;
}

function normalizeBodyType(val) {
  if (!val) return null;
  const lower = val.toLowerCase();
  if (lower.includes('hatchback/5') || lower === 'hatchback/5') return 'Hatchback (5 Kapı)';
  if (lower.includes('hatchback/3') || lower === 'hatchback/3') return 'Hatchback (3 Kapı)';
  if (lower.includes('hatchback')) return 'Hatchback';
  if (lower.includes('station wagon') || lower.includes('sw') || lower.includes('break') || lower.includes('avant') || lower.includes('touring')) return 'Station Wagon';
  if (lower.includes('gran coupe')) return 'Gran Coupe';
  if (lower.includes('coupe')) return 'Coupe';
  if (lower.includes('cabrio') || lower.includes('convertible') || lower.includes('spider') || lower.includes('targa')) return 'Cabriolet';
  if (lower.includes('roadster')) return 'Roadster';
  if (lower.includes('sedan')) return 'Sedan';
  if (lower.includes('suv') || lower.includes('crossover')) return 'SUV';
  if (lower.includes('pickup')) return 'Pickup';
  if (lower.includes('mpv') || lower.includes('minivan')) return 'MPV';
  if (lower.includes('panelvan') || lower.includes('van')) return 'Panelvan';
  return val;
}

/**
 * Ana parse fonksiyonu: fullPath'den doğru alanları çıkarır
 */
function parseRecord(item) {
  const parts = (item.fullPath || '').split(' > ').map(s => s.trim());

  // Sabit alanlar (her zaman aynı pozisyonda)
  const category = parts[0] || '';   // Otomobil
  const year = parseInt(parts[1]) || 0;
  const fuel = parts[2] || '';
  const brand = parts[3] || '';
  const model = parts[4] || '';

  // Dinamik alanlar (adım sayısına göre değişiyor)
  const dynamicParts = parts.slice(5);

  let subModel = '';
  let engine = '';
  let bodyType = '';
  let transmission = '';
  let trim = '';

  // Kasa tipi kelimeleri içeren segmentleri ayır
  const BODY_SEGMENTS_WITH_MODELS = [
    'A3 Sedan', 'A3 Hatchback', 'A4 Sedan', 'A4 Avant', 'A6 Sedan', 'A6 Avant',
    'Golf Variant', 'Passat SW', 'Passat Sedan', 'C4 Sedan', 'C4 Picasso',
    '3 Serisi', '5 Serisi', '1 Serisi',
  ];

  for (const seg of dynamicParts) {
    if (!seg) continue;
    const lower = seg.toLowerCase();
    const type = segmentType(seg);

    // Alt model (Marka+Model ağacında kasa gibi görünen model ismi)
    // Örn: "A3 Sedan", "A4 Avant", "Clio Grandtour"
    const isModelVariant = BODY_SEGMENTS_WITH_MODELS.some(m => seg.includes(m));

    if (isModelVariant && !subModel) {
      subModel = seg;
      // Kasa tipi de çıkaralım
      for (const k of BODY_TYPE_KEYWORDS) {
        if (lower.includes(k)) {
          bodyType = normalizeBodyType(seg);
          break;
        }
      }
      continue;
    }

    if (type === 'transmission' && !transmission) {
      transmission = normalizeTransmission(seg);
      continue;
    }

    if (type === 'bodyType' && !bodyType) {
      bodyType = normalizeBodyType(seg);
      // Bazı kasa segmentleri şanzıman da içerebilir: "Düz > Hatchback/5"
      for (const k of TRANS_KEYWORDS) {
        if (lower === k || lower.startsWith(k + ' ')) {
          transmission = normalizeTransmission(k);
          break;
        }
      }
      continue;
    }

    if (type === 'engine' && !engine) {
      engine = seg;
      continue;
    }

    if (type === 'trim' && !trim) {
      trim = seg;
      continue;
    }

    // Kalan segmentler: eğer engine doluysa trim, değilse engine olarak ata
    if (!engine) engine = seg;
    else if (!trim) trim = seg;
  }

  // Şanzıman hâlâ boşsa motor kodundan çıkarmaya çalış
  if (!transmission && engine) {
    const inferred = detectTransmissionFromEngine(engine);
    if (inferred) transmission = inferred;
  }

  // Şanzıman hâlâ boşsa ve trim içinde şanzıman bilgisi varsa çıkar
  if (!transmission && trim) {
    const trimLower = trim.toLowerCase();
    const transInTrim = TRANS_KEYWORDS.find(k => trimLower === k || trimLower.startsWith(k + ' ') || trimLower.endsWith(' ' + k));
    if (transInTrim) {
      transmission = normalizeTransmission(transInTrim);
      // trim'den şanzımanı çıkar
      trim = trim.replace(new RegExp(transInTrim, 'gi'), '').replace(/\s*>\s*/g, '').trim();
      if (!trim) trim = '';
    }
  }

  // Trim içinde kasa bilgisi varsa ayır
  if (trim && !bodyType) {
    const trimLower = trim.toLowerCase();
    for (const k of BODY_TYPE_KEYWORDS) {
      if (trimLower.includes(k)) {
        bodyType = normalizeBodyType(trim);
        trim = '';
        break;
      }
    }
  }

  return {
    brand,
    model,
    subModel: subModel || '',
    year,
    fuel,
    bodyType: bodyType || '',
    engine: engine || '',
    transmission: transmission || '',
    trim: trim || '',
    fullPath: item.fullPath,
    scrapedAt: item.scrapedAt,
  };
}

// ========== ANA PROGRAM ==========

async function main() {
  const inputPath = path.join(__dirname, '../scratch/arabam_wizard_all.json');
  const outputJsonPath = path.join(__dirname, '../scratch/arabam_clean.json');

  console.log('Loading arabam_wizard_all.json...');
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  console.log(`Total raw records: ${raw.length}`);

  console.log('Parsing and cleaning records...');
  const cleaned = raw.map(parseRecord);

  // İstatistik
  const withTrans = cleaned.filter(d => d.transmission).length;
  const withTrim = cleaned.filter(d => d.trim).length;
  const withBody = cleaned.filter(d => d.bodyType).length;
  const withEngine = cleaned.filter(d => d.engine).length;

  console.log('\n=== TEMİZLEME SONUÇ İSTATİSTİKLERİ ===');
  console.log(`Toplam kayıt: ${cleaned.length}`);
  console.log(`Şanzıman dolu: ${withTrans} (%${((withTrans/cleaned.length)*100).toFixed(1)})`);
  console.log(`Donanım Paketi dolu: ${withTrim} (%${((withTrim/cleaned.length)*100).toFixed(1)})`);
  console.log(`Kasa Tipi dolu: ${withBody} (%${((withBody/cleaned.length)*100).toFixed(1)})`);
  console.log(`Motor dolu: ${withEngine} (%${((withEngine/cleaned.length)*100).toFixed(1)})`);

  // Örnek çıktı
  console.log('\n=== ÖRNEK TEMIZLENMIŞ KAYITLAR ===');
  const samples = ['BMW', 'Audi', 'Renault', 'Fiat', 'Skoda', 'Hyundai'];
  samples.forEach(brand => {
    const s = cleaned.find(d => d.brand === brand && d.trim);
    if (s) {
      console.log(`\n[${brand}]`);
      console.log(`  Model: ${s.model} | Yıl: ${s.year} | Yakıt: ${s.fuel}`);
      console.log(`  Kasa: ${s.bodyType || '—'} | Motor: ${s.engine || '—'}`);
      console.log(`  Şanzıman: ${s.transmission || '—'} | Paket: ${s.trim || '—'}`);
    }
  });

  // Kaydet
  console.log(`\nSaving to ${outputJsonPath}...`);
  fs.writeFileSync(outputJsonPath, JSON.stringify(cleaned, null, 2));
  console.log('✅ Done!');
}

main().catch(console.error);
