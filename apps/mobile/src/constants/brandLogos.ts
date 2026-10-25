import { getCanonicalBrandLogoUrl } from '@used-car-intelligence/shared';

/**
 * High-resolution verified automotive & motorcycle brand logo CDN mappings
 * Uses raw.githubusercontent optimized vector-derived PNGs & Wikimedia official renders.
 */
export const VERIFIED_BRAND_LOGOS: Record<string, string> = {
  // Mainstream Turkish Market Passenger Cars
  volkswagen: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volkswagen.png',
  vw: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volkswagen.png',
  bmw: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bmw.png',
  'mercedes-benz': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mercedes-benz.png',
  mercedes: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mercedes-benz.png',
  audi: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/audi.png',
  renault: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/renault.png',
  fiat: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/fiat.png',
  ford: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ford.png',
  toyota: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/toyota.png',
  hyundai: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/hyundai.png',
  peugeot: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/peugeot.png',
  opel: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/opel.png',
  citroen: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/citroen.png',
  'citroën': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/citroen.png',
  skoda: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/skoda.png',
  'škoda': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/skoda.png',
  seat: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/seat.png',
  dacia: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/dacia.png',
  honda: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/honda.png',
  nissan: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/nissan.png',
  kia: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/kia.png',
  volvo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volvo.png',
  porsche: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/porsche.png',
  'alfa-romeo': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/alfa-romeo.png',
  'alfa romeo': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/alfa-romeo.png',
  mini: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mini.png',
  jeep: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/jeep.png',
  'land-rover': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/land-rover.png',
  'land rover': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/land-rover.png',
  suzuki: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/suzuki.png',
  subaru: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/subaru.png',
  mazda: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mazda.png',
  lexus: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lexus.png',
  mitsubishi: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mitsubishi.png',
  jaguar: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/jaguar.png',
  ds: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ds.png',
  'ds automobiles': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ds.png',
  abarth: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/abarth.png',
  chevrolet: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/chevrolet.png',

  // Modern Chinese & EV Marque Intelligence
  cupra: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/cupra.png',
  chery: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/chery.png',
  byd: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/byd.png',
  tesla: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/tesla.png',
  togg: 'https://thumb.wikimedia.org/wikipedia/tr/thumb/b/b1/TOGG_logosu.svg/500px-TOGG_logosu.svg.png',
  mg: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mg.png',
  leapmotor: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/leapmotor.png',
  omoda: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/omoda.png',
  jaecoo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/chery.png',
  'lynk-and-co': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lynk-and-co.png',
  'lynk & co': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lynk-and-co.png',
  'lynk co': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lynk-and-co.png',
  dfsk: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/dongfeng.png',
  seres: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/dongfeng.png',
  voyah: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/dongfeng.png',
  ssangyong: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ssangyong.png',
  kgm: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ssangyong.png',
  'kgm ssangyong': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ssangyong.png',

  // High-End Luxury & Exotic Brands
  'aston-martin': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/aston-martin.png',
  'aston martin': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/aston-martin.png',
  bentley: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bentley.png',
  ferrari: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ferrari.png',
  lamborghini: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lamborghini.png',
  maserati: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/maserati.png',
  'rolls-royce': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/rolls-royce.png',
  'rolls royce': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/rolls-royce.png',
  smart: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/smart.png',

  // Motorcycles & Powersports
  yamaha: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Yamaha_Motor_logo.svg/500px-Yamaha_Motor_logo.svg.png',
  kawasaki: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Kawasaki-logo.svg/500px-Kawasaki-logo.svg.png',
  ducati: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Ducati_red_logo.svg/500px-Ducati_red_logo.svg.png',
  ktm: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ktm.png',
  'harley-davidson': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/harley-davidson.png',
  'harley davidson': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/harley-davidson.png',
  triumph: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/triumph.png',
  aprilia: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Aprilia-logo.svg/500px-Aprilia-logo.svg.png',
  piaggio: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Piaggio_Group_logo.svg/500px-Piaggio_Group_logo.svg.png',
  vespa: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Piaggio_Group_logo.svg/500px-Piaggio_Group_logo.svg.png',
  bajaj: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Bajaj_Auto_Ltd_logo.svg/500px-Bajaj_Auto_Ltd_logo.svg.png',
  cfmoto: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/CFMOTO_Logo.svg/500px-CFMOTO_Logo.svg.png',
  'cf moto': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/CFMOTO_Logo.svg/500px-CFMOTO_Logo.svg.png',
  kymco: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/KYMCO_logo.svg/500px-KYMCO_logo.svg.png',
  sym: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/SYM_logo_of_Sanyang_Motor_20180408.svg/500px-SYM_logo_of_Sanyang_Motor_20180408.svg.png',
  'royal-enfield': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Royal_Enfield_logo.svg/500px-Royal_Enfield_logo.svg.png',
  'royal enfield': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Royal_Enfield_logo.svg/500px-Royal_Enfield_logo.svg.png',
  husqvarna: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Husqvarna_Logo.png/500px-Husqvarna_Logo.png',
  benelli: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Logo_Benelli_Armi.svg/500px-Logo_Benelli_Armi.svg.png',

  // Commercial Vehicle Brands
  iveco: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/iveco.png',
  isuzu: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/isuzu.png',
  maxus: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/maxus.png',
};

/**
 * Normalizes a brand name into standard slug format
 */
export function normalizeBrandKey(brandName?: string): string {
  if (!brandName) return '';
  return brandName
    .trim()
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extracts a distinctive 2-letter uppercase monogram for fallback badges
 */
export function getBrandMonogram(brandName?: string): string {
  if (!brandName) return 'TS';
  const clean = brandName.trim();
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Resolves high-resolution transparent brand logo URL with intelligent fallback
 */
export function getBrandLogoUrl(brandName?: string, vehicleType?: string): string | null {
  if (!brandName) return null;
  const rawKey = brandName.trim().toLowerCase();
  if (VERIFIED_BRAND_LOGOS[rawKey]) {
    return VERIFIED_BRAND_LOGOS[rawKey];
  }

  const slug = normalizeBrandKey(brandName);
  if (VERIFIED_BRAND_LOGOS[slug]) {
    return VERIFIED_BRAND_LOGOS[slug];
  }

  return getCanonicalBrandLogoUrl(brandName, vehicleType);
}

/**
 * Dynamic lookup proxy for seamless backward compatibility with BRAND_LOGOS[brandName]
 */
export const BRAND_LOGOS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_, prop: string) {
    if (typeof prop !== 'string') return undefined;
    return getBrandLogoUrl(prop) || undefined;
  },
});

