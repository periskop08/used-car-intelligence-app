/**
 * TORQUESCOUT — MOTOSİKLET MODU FİLTRE & TAKSONOMİ SÖZLEŞMESİ
 * FINAL LOCKED CONTRACT & FUTURE INTEGRATION SCAFFOLD
 * 
 * 🔒 KİLİTLİ KURALLAR (FROZEN RULES):
 * 1. MOTOR / VERSİYON ≠ MOTOR HACMİ:
 *    - "Motor / Versiyon" alanı motor hacmini tekrar göstermek için kullanılmaz (Örn: "249 cc" yazılamaz).
 *    - Amacı: Gerçek ticari/teknik varyantları ayırmaktır (Örn: GV250i, EFI, ABS, SP, R, S, Touring, Factory).
 *    - "Motor Hacmi" ayrı bir sınıflandırma alanıdır (Örn: 151–250 cc).
 * 
 * 2. MOTOR / VERSİYON İÇİN ZORLA SAHTE VERİ ÜRETME:
 *    - Ayrı bir ticari versiyon yoksa tek varyant olarak çözülür, "249 cc V-Twin" gibi sentetik etiket üretilmez.
 *    - cc, silindir, soğutma, zamanlama gibi özellikler ayrı teknik alanlarda tutulur.
 * 
 * 3. SINGLE OPTION AUTO-SELECT (GLOBAL KURAL):
 *    - Herhangi bir dependent motorcycle filtresinde validOptions.length === 1 ise SİSTEM OTOMATİK SEÇER.
 *    - Kullanıcıya gereksiz ikinci tıklama yaptırılmaz.
 *    - Model Ailesi -> Yıl -> Tip / Kasa Tipi -> Motor / Versiyon -> Yakıt / Güç Ünitesi -> Motor Hacmi -> Vites Tipi
 *      tüm zincir boyunca geçerlidir.
 * 
 * 4. CASCADING AUTO-SELECT:
 *    - Bir alan otomatik seçildiğinde bir sonraki dependent alan hemen resolve edilir.
 *    - 1 seçenek kaldığı sürece zincirleme (cascading) otomatik seçim devam eder.
 * 
 * 5. UPSTREAM CHANGE INVALIDATION & SIFIR STALE SELECTION:
 *    - Kullanıcı üst seviyedeki herhangi bir seçimi (Marka, Model, Yıl vb.) değiştirdiğinde,
 *      yeni seçimle uyumsuz tüm alt seçimler DERHAL TEMİZLENİR (CLEAR).
 *    - UI hiçbir zaman eski yıla ait motor veya hacim seçimini yeni yılda gösteremez (Stale selection = 0).
 *    - Ardından yeni seçenek listesi hesaplanır ve tek kalanlar otomatik seçilir.
 */

export interface MotorcycleTypeItem {
  key: string;
  label: string;
  aliases: string[];
}

/**
 * 1. TİP / KASA TİPİ — KANONİK 17 SEÇENEK
 * Sahibinden + Arabam.com gerçek pazar sınıflarından türetilmiştir.
 * Uydurma kategori (Cafe Racer, Scrambler, Adventure vb.) kesinlikle eklenmez.
 */
export const CANONICAL_MOTORCYCLE_TYPES: readonly MotorcycleTypeItem[] = [
  { key: 'CHOPPER_CRUISER', label: 'Chopper / Cruiser', aliases: ['chopper', 'cruiser'] },
  { key: 'COMMUTER', label: 'Commuter', aliases: ['commuter'] },
  { key: 'CROSS_MOTOCROSS', label: 'Cross / Motocross', aliases: ['cross', 'motocross', 'moto-cross'] },
  { key: 'CUB', label: 'Cub', aliases: ['cub'] },
  { key: 'FOUR_WHEEL', label: 'Dört Tekerlekli', aliases: ['dört tekerlekli', 'atv', 'quad'] },
  { key: 'E_PICKUP', label: 'E-Pikap', aliases: ['e-pikap', 'elektrikli pikap', 'epickup'] },
  { key: 'ENDURO_OFF_ROAD', label: 'Enduro / Off-Road', aliases: ['enduro', 'off-road', 'enduro / offroad', 'enduro / off-road'] },
  { key: 'SNOW_MOTORCYCLE', label: 'Kar Motosikleti', aliases: ['kar motosikleti', 'snowmobile'] },
  { key: 'MOPED', label: 'Moped', aliases: ['moped', 'mobilet'] },
  { key: 'NAKED_ROADSTER', label: 'Naked / Roadster', aliases: ['naked', 'roadster', 'naked / roadstar'] },
  { key: 'SCOOTER_MAXI_SCOOTER', label: 'Scooter / Maxi Scooter', aliases: ['scooter', 'maxi scooter', 'maxiscooter'] },
  { key: 'SPORT_TOURING', label: 'Sport Touring', aliases: ['sport touring', 'sport-touring'] },
  { key: 'SUPER_SPORT', label: 'Super Sport', aliases: ['super sport', 'supersport', 'racing'] },
  { key: 'TOURING', label: 'Touring', aliases: ['touring'] },
  { key: 'TRIAL', label: 'Trial', aliases: ['trial'] },
  { key: 'TRIPORTER', label: 'Triportör', aliases: ['triportör', 'triporter'] },
  { key: 'THREE_WHEEL', label: 'Üç Tekerlekli', aliases: ['üç tekerlekli', 'trike'] },
] as const;

/**
 * 2. ALIAS NORMALİZASYON YARDIMCISI
 * Dış kaynaklardan gelebilecek yazım varyasyonlarını kanonik etikete çevirir.
 * Örn: "Trike" -> "Üç Tekerlekli", "Naked / Roadstar" -> "Naked / Roadster"
 */
export function normalizeMotorcycleType(input: string): string | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  
  for (const item of CANONICAL_MOTORCYCLE_TYPES) {
    if (item.label.toLowerCase() === clean || item.key.toLowerCase() === clean) {
      return item.label;
    }
    if (item.aliases.some((alias) => alias.toLowerCase() === clean)) {
      return item.label;
    }
  }
  return null;
}

/**
 * 3. MOTOR HACMİ — KANONİK ARALIK SÖZLEŞMESİ (14 KANONİK ARALIK)
 * Motor / Versiyon alanından kesinlikle bağımsızdır.
 */
export const MOTORCYCLE_DISPLACEMENT_RANGES = [
  '0 - 50 cc',
  '51 - 99 cc',
  '100 - 125 cc',
  '126 - 150 cc',
  '151 - 250 cc',
  '251 - 350 cc',
  '351 - 450 cc',
  '451 - 550 cc',
  '551 - 650 cc',
  '651 - 800 cc',
  '801 - 1000 cc',
  '1001 - 1200 cc',
  '1201 - 1500 cc',
  '1501 cc ve üzeri',
] as const;

/**
 * 4. YAKIT / GÜÇ ÜNİTESİ — SÖZLEŞME SEÇENEKLERİ
 * Not: Güç ünitesi 'Elektrik' olduğunda Motor Hacmi, Silindir ve Zamanlama
 * gibi içten yanmalı motor (ICE) alanları opsiyonel veya uygulanamaz hale gelir.
 */
export const MOTORCYCLE_POWERTRAIN_OPTIONS = [
  'Benzin',
  'Elektrik',
] as const;

/**
 * 5. VİTES TİPİ — SÖZLEŞME SEÇENEKLERİ
 */
export const MOTORCYCLE_TRANSMISSION_OPTIONS = [
  'Manuel',
  'Yarı Otomatik',
  'Otomatik',
] as const;

/**
 * 6. ARKA PLANDA TUTULACAK TEKNİK ALANLAR (ANA FORMA DROPDOWN OLARAK EKLENMEZ)
 * - Motor Gücü (hp aralıkları)
 * - Zamanlama Tipi (2 Zamanlı / 4 Zamanlı)
 * - Silindir Sayısı (Tek Silindir, Çift Silindir, 3, 4, 6+)
 * - Soğutma (Hava, Su, Yağ)
 * - Menşei
 * - Versiyon / Paket
 */
export const MOTORCYCLE_TECHNICAL_FIELDS = {
  TIMING: ['2 Zamanlı', '4 Zamanlı'],
  CYLINDERS: ['Tek Silindir', 'Çift Silindir', '3 Silindir', '4 Silindir', '6 Silindir ve üzeri'],
  COOLING: ['Hava', 'Su', 'Yağ'],
  POWER_RANGES: [
    "25 hp'e kadar",
    '26 - 50 hp',
    '51 - 75 hp',
    '76 - 100 hp',
    '101 - 125 hp',
    '126 - 150 hp',
    '151 - 175 hp',
    '176 - 200 hp',
    '201 - 225 hp',
    '226 - 250 hp',
    '251 hp ve üzeri',
  ],
} as const;

/**
 * 7. MOTOSİKLET 8 ALANLI FİLTRE FORM DURUMU
 * 
 * SEMANTİK ROLLER (BİRBİRİNİN YERİNE KULLANILAMAZ):
 * - MARKA: manufacturer identity
 * - MODEL AİLESİ: commercial model family
 * - YIL: model year
 * - TİP / KASA TİPİ: motorcycle category (17 canonical options)
 * - MOTOR / VERSİYON: real canonical commercial/technical variant distinction (Örn: EFI, ABS, SP)
 * - YAKIT / GÜÇ ÜNİTESİ: powertrain type (Benzin / Elektrik)
 * - MOTOR HACMİ: displacement range / canonical cc classification (Örn: 151-250 cc)
 * - VİTES TİPİ: transmission type (Manuel, Yarı Otomatik, Otomatik)
 */
export interface MotorcycleFilterState {
  brand: string;
  model: string;
  year: string;
  bodyType: string;        // Tip / Kasa Tipi
  engineVersion: string;   // Motor / Versiyon (Asla cc ile doldurulmaz)
  powertrain: string;      // Yakıt / Güç Ünitesi
  displacement: string;    // Motor Hacmi (Ayrı cc aralığı)
  transmission: string;    // Vites Tipi
}

export const MOTORCYCLE_FILTER_KEYS: readonly (keyof MotorcycleFilterState)[] = [
  'brand',
  'model',
  'year',
  'bodyType',
  'engineVersion',
  'powertrain',
  'displacement',
  'transmission',
] as const;

/**
 * 8. SINGLE-OPTION AUTO-SELECT & CASCADING RECURSION CONTRACT
 * 
 * Gelecekte gerçek veri bağlandığında:
 * - Bir alanda tek (1) geçerli seçenek kaldığında kullanıcıya tekrar seçtirmeden otomatik seçilir.
 * - Bu seçim bir sonraki alanı da tetikler ve zincirleme (cascading) devam eder.
 */
export function evaluateSingleOptionCascade<T extends Record<string, string>>(
  current: T,
  fieldKey: keyof T,
  availableOptions: string[]
): { updated: T; autoSelected: boolean } {
  if (availableOptions.length === 1 && current[fieldKey] !== availableOptions[0]) {
    return {
      updated: {
        ...current,
        [fieldKey]: availableOptions[0],
      },
      autoSelected: true,
    };
  }
  return { updated: current, autoSelected: false };
}

/**
 * 9. UPSTREAM INVALIDATION CONTRACT (STALE SELECTION = 0)
 * 
 * Kullanıcı üst seviyedeki bir alanı değiştirdiğinde (örn: Yıl 2024 -> 2023):
 * - Alt seviyedeki bağımlı seçimler derhal temizlenir.
 * - Geçersiz eski değerlerin kalması kesinlikle engellenir.
 */
export function invalidateDownstreamFields(
  state: MotorcycleFilterState,
  trigger: keyof MotorcycleFilterState
): MotorcycleFilterState {
  const triggerIndex = MOTORCYCLE_FILTER_KEYS.indexOf(trigger);
  if (triggerIndex === -1) return state;

  const nextState = { ...state };
  for (let i = triggerIndex + 1; i < MOTORCYCLE_FILTER_KEYS.length; i++) {
    nextState[MOTORCYCLE_FILTER_KEYS[i]] = '';
  }
  return nextState;
}

/**
 * 10. RECURSIVE CASCADING RESOLVER SPECIFICATION
 * 
 * Gelecekte gerçek veri bağlandığında kullanılacak referans zincir çözücü:
 * Tek seçenekler tükenene veya birden fazla seçenek kalana kadar zincirleme seçer.
 */
export function resolveCascadingChain(
  initialState: MotorcycleFilterState,
  optionsProvider: (state: MotorcycleFilterState, key: keyof MotorcycleFilterState) => string[]
): MotorcycleFilterState {
  let currentState = { ...initialState };
  let mutated = false;

  for (const key of MOTORCYCLE_FILTER_KEYS) {
    if (!currentState[key]) {
      const options = optionsProvider(currentState, key);
      if (options.length === 1) {
        currentState[key] = options[0];
        mutated = true;
      } else {
        // Birden fazla veya sıfır seçenek kaldığında zincir durur
        break;
      }
    }
  }

  return currentState;
}
