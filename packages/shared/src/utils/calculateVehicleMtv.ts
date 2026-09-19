/**
 * Motorlu Taşıtlar Vergisi (MTV) Hesaplama Modülü
 *
 * Gelir İdaresi Başkanlığı (GİB) 58 Seri No'lu Motorlu Taşıtlar Vergisi
 * Genel Tebliği (2026 yılı resmi tarifeleri) esas alınmıştır.
 *
 * MTV yılda 2 eşit taksitle (Ocak ve Temmuz) ödenir.
 */

export interface VehicleMtvInput {
  modelYear?: number | null;
  engineDisplacement?: number | string | null;
  fuelType?: string | null;
  horsepower?: number | string | null;
  powerKw?: number | string | null;
  currentYear?: number;
}

export interface VehicleMtvResult {
  annualTax: number;
  installment: number;
  displayInstallment: string;
  displayAnnual: string;
  age: number;
  displacementCc: number | null;
  isElectric: boolean;
  notes?: string;
}

// Yaş Dilimleri
type AgeBracket = '1-3' | '4-6' | '7-11' | '12-15' | '16+';

function getAgeBracket(age: number): AgeBracket {
  if (age <= 3) return '1-3';
  if (age <= 6) return '4-6';
  if (age <= 11) return '7-11';
  if (age <= 15) return '12-15';
  return '16+';
}

// 01/01/2018 ÖNCESİ TESCİL EDİLEN ARAÇLAR (I/A Sayılı Tarife - 2026)
const PRE_2018_TABLE: Array<{
  maxCc: number;
  rates: Record<AgeBracket, number>;
}> = [
  { maxCc: 1300, rates: { '1-3': 5750, '4-6': 4010, '7-11': 2238, '12-15': 1689, '16+': 593 } },
  { maxCc: 1600, rates: { '1-3': 10016, '4-6': 7510, '7-11': 4354, '12-15': 3077, '16+': 1181 } },
  { maxCc: 1800, rates: { '1-3': 17705, '4-6': 13829, '7-11': 8145, '12-15': 4957, '16+': 1917 } },
  { maxCc: 2000, rates: { '1-3': 27898, '4-6': 21478, '7-11': 12624, '12-15': 7510, '16+': 2958 } },
  { maxCc: 2500, rates: { '1-3': 41840, '4-6': 30372, '7-11': 18977, '12-15': 11333, '16+': 4479 } },
  { maxCc: 3000, rates: { '1-3': 58347, '4-6': 50754, '7-11': 31704, '12-15': 17044, '16+': 6255 } },
  { maxCc: 3500, rates: { '1-3': 88859, '4-6': 79955, '7-11': 48158, '12-15': 24031, '16+': 8813 } },
  { maxCc: 4000, rates: { '1-3': 139721, '4-6': 120647, '7-11': 71048, '12-15': 31704, '16+': 12624 } },
  { maxCc: Infinity, rates: { '1-3': 228681, '4-6': 171485, '7-11': 101555, '12-15': 45632, '16+': 17705 } },
];

// 01/01/2018 VE SONRASI TESCİL EDİLEN ARAÇLAR (I Sayılı Tarife - 2026 Standart Matrah)
const POST_2018_TABLE: Array<{
  maxCc: number;
  rates: Record<AgeBracket, number>;
}> = [
  { maxCc: 1300, rates: { '1-3': 6319, '4-6': 4409, '7-11': 2459, '12-15': 1861, '16+': 655 } },
  { maxCc: 1600, rates: { '1-3': 11023, '4-6': 8264, '7-11': 4794, '12-15': 3375, '16+': 1290 } },
  { maxCc: 1800, rates: { '1-3': 21251, '4-6': 16600, '7-11': 9775, '12-15': 5964, '16+': 2307 } },
  { maxCc: 2000, rates: { '1-3': 33474, '4-6': 25784, '7-11': 15147, '12-15': 9012, '16+': 3547 } },
  { maxCc: 2500, rates: { '1-3': 50217, '4-6': 36448, '7-11': 22768, '12-15': 13606, '16+': 5378 } },
  { maxCc: 3000, rates: { '1-3': 70018, '4-6': 60905, '7-11': 38053, '12-15': 20466, '16+': 7503 } },
  { maxCc: 3500, rates: { '1-3': 106631, '4-6': 95946, '7-11': 57790, '12-15': 28837, '16+': 10576 } },
  { maxCc: 4000, rates: { '1-3': 167665, '4-6': 144776, '7-11': 85258, '12-15': 38045, '16+': 15149 } },
  { maxCc: Infinity, rates: { '1-3': 274417, '4-6': 205782, '7-11': 121866, '12-15': 54758, '16+': 21246 } },
];

/**
 * Sayısal formatlayıcı (Türk Lirası para birimi: 1.479 ₺)
 */
export function formatTurkishLira(amount: number): string {
  const rounded = Math.round(amount);
  return `${new Intl.NumberFormat('tr-TR').format(rounded)} ₺`;
}

/**
 * Gelen motor hacmini (cc) sayısal değere normalize eder
 */
export function parseDisplacementCc(raw?: number | string | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    if (raw > 0 && raw < 10) {
      return Math.round(raw * 1000);
    }
    return Math.round(raw);
  }

  const str = String(raw).trim();
  // "1994 cc" or "1.6" or "1994"
  const match = str.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;

  const num = parseFloat(match[1].replace(',', '.'));
  if (isNaN(num)) return null;

  if (num > 0 && num < 10) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

/**
 * Gelen beygir gücünü sayısal HP olarak normalize eder
 */
function parseHp(raw?: number | string | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Math.round(raw);
  const match = String(raw).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Araç için 2026 yılı Motorlu Taşıtlar Vergisi'ni hesaplar
 */
export function calculateVehicleMtv(input: VehicleMtvInput): VehicleMtvResult | null {
  const currentYear = input.currentYear || new Date().getFullYear() || 2026;
  const modelYear = typeof input.modelYear === 'number' ? input.modelYear : null;

  // Model yılı yoksa vergi hesaplanamaz
  if (!modelYear || modelYear > currentYear + 1 || modelYear < 1950) {
    return null;
  }

  // Yaş Formülü: (Güncel Yıl - Model Yılı + 1)
  const age = Math.max(1, currentYear - modelYear + 1);
  const ageBracket = getAgeBracket(age);

  // Yakıt kontrolü
  const fuel = (input.fuelType || '').toUpperCase().trim();
  const isElectric = fuel === 'ELEKTRIK' || fuel === 'ELECTRIC' || fuel === 'EV';

  const displacementCc = parseDisplacementCc(input.engineDisplacement);

  let annualTax = 0;

  if (isElectric) {
    // Elektrikli araçlarda kW baz alınır ve %25 vergi uygulanır
    let kw = typeof input.powerKw === 'number' ? input.powerKw : null;
    if (!kw && input.powerKw) {
      const match = String(input.powerKw).match(/(\d+)/);
      if (match) kw = parseInt(match[1], 10);
    }
    if (!kw) {
      const hp = parseHp(input.horsepower);
      if (hp) {
        kw = Math.round(hp * 0.7457);
      }
    }

    // Elektrikli araç eşdeğer CC eşlemesi
    let equivalentCc = 1300;
    if (kw) {
      if (kw <= 70) equivalentCc = 1300;
      else if (kw <= 85) equivalentCc = 1600;
      else if (kw <= 105) equivalentCc = 1800;
      else if (kw <= 120) equivalentCc = 2000;
      else if (kw <= 150) equivalentCc = 2500;
      else equivalentCc = 3000;
    }

    const table = modelYear < 2018 ? PRE_2018_TABLE : POST_2018_TABLE;
    const bracket = table.find((b) => equivalentCc <= b.maxCc) || table[table.length - 1];
    const baseRate = bracket.rates[ageBracket];
    // Kanuni %25 oranı
    annualTax = Math.round(baseRate * 0.25);
  } else {
    // İçten yanmalı / Hibrit motor
    if (!displacementCc) {
      return null;
    }

    const table = modelYear < 2018 ? PRE_2018_TABLE : POST_2018_TABLE;
    const bracket = table.find((b) => displacementCc <= b.maxCc) || table[table.length - 1];
    annualTax = bracket.rates[ageBracket];
  }

  const installment = Math.round(annualTax / 2);

  return {
    annualTax,
    installment,
    displayInstallment: `${formatTurkishLira(installment)} x 2`,
    displayAnnual: formatTurkishLira(annualTax),
    age,
    displacementCc,
    isElectric,
  };
}
