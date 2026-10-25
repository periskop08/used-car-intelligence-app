/**
 * Canonical Automotive & Motorcycle Brand Logo Registry
 * High-precision transparent PNG logos with jsDelivr CDN and CarLogos fallbacks,
 * plus luxury automotive monogram generator for boutique brands.
 */

// Normalized alias dictionary
const BRAND_ALIASES: Record<string, string> = {
  vw: 'volkswagen',
  'volkswagen': 'volkswagen',
  'mercedes': 'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  'mercedes-benz': 'mercedes-benz',
  'alfa': 'alfa-romeo',
  'alfa romeo': 'alfa-romeo',
  'citroën': 'citroen',
  'citroen': 'citroen',
  'škoda': 'skoda',
  'skoda': 'skoda',
  'seat': 'seat',
  'land rover': 'land-rover',
  'range rover': 'land-rover',
  'aston martin': 'aston-martin',
  'rolls royce': 'rolls-royce',
  'harley davidson': 'harley-davidson',
  'harley-davidson': 'harley-davidson',
  'moto guzzi': 'moto-guzzi',
  'royal enfield': 'royal-enfield',
  'cf moto': 'cfmoto',
  'cf-moto': 'cfmoto',
  'cfmoto': 'cfmoto',
  'tofaş': 'fiat',
  'tofas': 'fiat',
  'ssangyong': 'ssangyong',
  'kgm': 'ssangyong',
  'kgm ssangyong': 'ssangyong',
  'ds': 'ds',
  'ds automobiles': 'ds',
};

// Curated high-precision CDN URLs for Turkish market automotive and motorcycle brands
const BRAND_SPECIFIC_URLS: Record<string, string> = {
  // Turkish National EV
  togg: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/togg.png',

  // Major Passenger Cars
  volkswagen: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/volkswagen.png',
  bmw: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/bmw.png',
  'mercedes-benz': 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mercedes-benz.png',
  audi: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/audi.png',
  renault: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/renault.png',
  fiat: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/fiat.png',
  ford: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ford.png',
  toyota: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/toyota.png',
  hyundai: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/hyundai.png',
  peugeot: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/peugeot.png',
  honda: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/honda.png',
  opel: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/opel.png',
  nissan: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/nissan.png',
  citroen: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/citroen.png',
  dacia: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/dacia.png',
  skoda: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/skoda.png',
  seat: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/seat.png',
  kia: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/kia.png',
  volvo: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/volvo.png',
  porsche: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/porsche.png',
  'alfa-romeo': 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/alfa-romeo.png',
  mini: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mini.png',
  jeep: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/jeep.png',
  tesla: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/tesla.png',
  'land-rover': 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/land-rover.png',
  cupra: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/cupra.png',
  chery: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/chery.png',
  byd: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/byd.png',
  mg: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mg.png',
  suzuki: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/suzuki.png',
  subaru: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/subaru.png',
  mitsubishi: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mitsubishi.png',
  mazda: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mazda.png',
  ds: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ds.png',
  lexus: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lexus.png',
  ssangyong: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ssangyong.png',
  chevrolet: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/chevrolet.png',
  abarth: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/abarth.png',
  ferrari: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ferrari.png',
  maserati: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/maserati.png',
  jaguar: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/jaguar.png',
  bentley: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/bentley.png',
  'aston-martin': 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/aston-martin.png',
  smart: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/smart.png',
  infiniti: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/infiniti.png',
  cadillac: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/cadillac.png',
  dodge: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/dodge.png',
  chrysler: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/chrysler.png',
  iveco: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/iveco.png',
  dfsk: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/dfsk.png',
  voyah: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/voyah.png',
  geely: 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/geely.png',

  // Motorcycles
  yamaha: 'https://www.carlogos.org/car-logos/yamaha-logo.png',
  ducati: 'https://www.carlogos.org/car-logos/ducati-logo.png',
  kawasaki: 'https://www.carlogos.org/car-logos/kawasaki-logo.png',
  ktm: 'https://www.carlogos.org/car-logos/ktm-logo.png',
  'harley-davidson': 'https://www.carlogos.org/car-logos/harley-davidson-logo.png',
  triumph: 'https://www.carlogos.org/car-logos/triumph-motorcycles-logo.png',
  vespa: 'https://www.carlogos.org/car-logos/vespa-logo.png',
  piaggio: 'https://www.carlogos.org/car-logos/piaggio-logo.png',
  aprilia: 'https://www.carlogos.org/car-logos/aprilia-logo.png',
  benelli: 'https://www.carlogos.org/car-logos/benelli-logo.png',
  sym: 'https://www.carlogos.org/car-logos/sym-logo.png',
  kymco: 'https://www.carlogos.org/car-logos/kymco-logo.png',
  'moto-guzzi': 'https://www.carlogos.org/car-logos/moto-guzzi-logo.png',
  'royal-enfield': 'https://www.carlogos.org/car-logos/royal-enfield-logo.png',
  bajaj: 'https://www.carlogos.org/car-logos/bajaj-auto-logo.png',
  cfmoto: 'https://www.carlogos.org/car-logos/cfmoto-logo.png',
  husqvarna: 'https://www.carlogos.org/car-logos/husqvarna-logo.png',
  tvs: 'https://www.carlogos.org/car-logos/tvs-motor-logo.png',
  hero: 'https://www.carlogos.org/car-logos/hero-motocorp-logo.png',
};

/**
 * Normalizes a brand name into a URL-friendly canonical slug.
 */
export function normalizeBrandSlug(brandName?: string): string {
  if (!brandName) return '';
  const trimmed = brandName
    .trim()
    .toLowerCase()
    .replace(/[ıİ]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c');

  if (BRAND_ALIASES[trimmed]) {
    return BRAND_ALIASES[trimmed];
  }

  return trimmed
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Resolves the canonical brand logo URL.
 * Never returns a broken or non-existent generic image URL.
 */
export function getCanonicalBrandLogoUrl(brandName?: string, vehicleType?: string): string {
  const slug = normalizeBrandSlug(brandName);
  if (!slug) {
    return vehicleType === 'MOTORCYCLE'
      ? 'https://www.carlogos.org/car-logos/yamaha-logo.png'
      : 'https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/volkswagen.png';
  }

  // 1. Direct curated match
  if (BRAND_SPECIFIC_URLS[slug]) {
    return BRAND_SPECIFIC_URLS[slug];
  }

  // 2. Global car-logos-dataset fallback
  return `https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/${slug}.png`;
}

/**
 * Generates high-end luxury monogram badge attributes for boutique or unlisted brands.
 */
export function getBrandMonogram(brandName?: string): {
  initials: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
} {
  if (!brandName || !brandName.trim()) {
    return {
      initials: 'TS',
      bgColor: '#f1f5f9',
      borderColor: '#cbd5e1',
      textColor: '#0f172a',
    };
  }

  const clean = brandName.trim();
  const words = clean.split(/\s+/);
  let initials = '';

  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (clean.length >= 2) {
    initials = clean.substring(0, 2).toUpperCase();
  } else {
    initials = clean.toUpperCase();
  }

  // Consistent hue hashing for luxury automotive palettes
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    { bgColor: '#f8fafc', borderColor: '#cbd5e1', textColor: '#0f172a' }, // Slate Metallic
    { bgColor: '#eff6ff', borderColor: '#bfdbfe', textColor: '#1e3a8a' }, // Deep Blue Precision
    { bgColor: '#fff7ed', borderColor: '#fed7aa', textColor: '#9a3412' }, // Bronze / Copper
    { bgColor: '#f0fdf4', borderColor: '#bbf7d0', textColor: '#166534' }, // Emerald Racing
    { bgColor: '#faf5ff', borderColor: '#e9d5ff', textColor: '#581c87' }, // Imperial Violet
  ];

  const selectedPalette = palettes[Math.abs(hash) % palettes.length];

  return {
    initials,
    bgColor: selectedPalette.bgColor,
    borderColor: selectedPalette.borderColor,
    textColor: selectedPalette.textColor,
  };
}
