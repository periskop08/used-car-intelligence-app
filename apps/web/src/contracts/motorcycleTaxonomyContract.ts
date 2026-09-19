/**
 * TORQUESCOUT — MOTOSİKLET MODU FİLTRE & TAKSONOMİ SÖZLEŞMESİ (FUTURE CONTRACT SCAFFOLD)
 * 
 * Bu dosya motosiklet veri entegrasyonu için kanonik tip listesini,
 * taksonomi alias normalizasyonunu ve tekil seçenek akıllı basamaklı (cascading)
 * otomatik seçim / geçersiz kılma (invalidation) sözleşmelerini tanımlar.
 * 
 * NOT: Bu sözleşme gelecekteki veri entegrasyonu içindir. Gerçek motosiklet verisi
 * bağlanana kadar üretim otomobil taksonomisine ve API'lerine müdahale etmez.
 */

export interface MotorcycleTypeItem {
  key: string;
  label: string;
  aliases: string[];
}

/**
 * 1. TİP / KASA TİPİ — KANONİK 17 SEÇENEK
 * Sahibinden + Arabam.com gerçek pazar sınıflarından türetilmiştir.
 * Uydurma kategori (Cafe Racer, Scrambler vb.) kesinlikle eklenmez.
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
 * 3. MOTOR HACMİ — KANONİK ARALIK SÖZLEŞMESİ
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
 * 6. ARKA PLANDA TUTULACAK TEKNİK ALANLAR (ANA FORMA EKLENMEZ)
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
 */
export interface MotorcycleFilterState {
  brand: string;
  model: string;
  year: string;
  bodyType: string;        // Tip / Kasa Tipi
  engineVersion: string;   // Motor / Versiyon
  powertrain: string;      // Yakıt / Güç Ünitesi
  displacement: string;    // Motor Hacmi (cc)
  transmission: string;    // Vites Tipi
}

/**
 * 8. SINGLE-OPTION AUTO-SELECT & CASCADING RECURSION CONTRACT
 * 
 * Gelecekte gerçek veri bağlandığında uygulanacak kural:
 * - Üst seçimlerden sonra bir alt alanda tek (1) geçerli seçenek kalmışsa
 *   kullanıcıya tekrar seçtirmeden otomatik olarak seçilir.
 * - Bu seçim bir sonraki alanı da tetikler ve zincirleme (cascading)
 *   olarak tek seçenekler otomatik çözülür.
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
 * 9. UPSTREAM INVALIDATION CONTRACT
 * 
 * Kullanıcı üst seviyedeki bir alanı (örn: Marka, Model veya Yıl) değiştirdiğinde,
 * yeni seçime uymayan bağımlı alt alanlar temizlenmeli (invalidation),
 * ardından yeni seçenek listesi hesaplanarak tek kalanlar otomatik seçilmelidir.
 */
export function invalidateDownstreamFields(
  state: MotorcycleFilterState,
  trigger: keyof MotorcycleFilterState
): MotorcycleFilterState {
  const fieldsOrder: (keyof MotorcycleFilterState)[] = [
    'brand',
    'model',
    'year',
    'bodyType',
    'engineVersion',
    'powertrain',
    'displacement',
    'transmission',
  ];

  const triggerIndex = fieldsOrder.indexOf(trigger);
  if (triggerIndex === -1) return state;

  const nextState = { ...state };
  for (let i = triggerIndex + 1; i < fieldsOrder.length; i++) {
    nextState[fieldsOrder[i]] = '';
  }
  return nextState;
}
