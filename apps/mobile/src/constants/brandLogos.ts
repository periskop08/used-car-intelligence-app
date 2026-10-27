import { Image, ImageSourcePropType } from "react-native";
import {
  getCanonicalBrandLogoUrl,
  BRAND_SPECIFIC_URLS,
  BRAND_ALIASES,
} from "@used-car-intelligence/shared";

/**
 * Local bundled high-resolution brand logo assets
 * Loaded with zero latency directly from the app bundle.
 */
export const LOCAL_BRAND_LOGOS: Record<string, ImageSourcePropType> = {
  "alfa-romeo": require("../../assets/brand-logos/alfa-romeo.png"),
  "alpine": require("../../assets/brand-logos/alpine.png"),
  "aprilia": require("../../assets/brand-logos/aprilia.png"),
  "arora": require("../../assets/brand-logos/arora.png"),
  "askam": require("../../assets/brand-logos/askam.png"),
  "asya": require("../../assets/brand-logos/asya.png"),
  "audi": require("../../assets/brand-logos/audi.png"),
  "bajaj": require("../../assets/brand-logos/bajaj.png"),
  "benda": require("../../assets/brand-logos/benda.png"),
  "benelli": require("../../assets/brand-logos/benelli.png"),
  "beta": require("../../assets/brand-logos/beta.png"),
  "bimota": require("../../assets/brand-logos/bimota.png"),
  "bmc": require("../../assets/brand-logos/bmc.png"),
  "bmw": require("../../assets/brand-logos/bmw.png"),
  "brixton": require("../../assets/brand-logos/brixton.png"),
  "byd": require("../../assets/brand-logos/byd.png"),
  "cagiva": require("../../assets/brand-logos/cagiva.png"),
  "can-am": require("../../assets/brand-logos/can-am.png"),
  "cfmoto": require("../../assets/brand-logos/cfmoto.png"),
  "chery": require("../../assets/brand-logos/chery.png"),
  "citroen": require("../../assets/brand-logos/citroen.png"),
  "cupra": require("../../assets/brand-logos/cupra.png"),
  "dacia": require("../../assets/brand-logos/dacia.png"),
  "daelim": require("../../assets/brand-logos/daelim.png"),
  "daewoo": require("../../assets/brand-logos/daewoo.png"),
  "daihatsu": require("../../assets/brand-logos/daihatsu.png"),
  "derbi": require("../../assets/brand-logos/derbi.png"),
  "dongfeng": require("../../assets/brand-logos/dongfeng.png"),
  "ducati": require("../../assets/brand-logos/ducati.png"),
  "falcon": require("../../assets/brand-logos/falcon.png"),
  "faw": require("../../assets/brand-logos/faw.png"),
  "fiat": require("../../assets/brand-logos/fiat.png"),
  "ford": require("../../assets/brand-logos/ford.png"),
  "foton": require("../../assets/brand-logos/foton.png"),
  "gaz": require("../../assets/brand-logos/gaz.png"),
  "geely": require("../../assets/brand-logos/geely.png"),
  "gilera": require("../../assets/brand-logos/gilera.png"),
  "haojue": require("../../assets/brand-logos/haojue.png"),
  "harley-davidson": require("../../assets/brand-logos/harley-davidson.png"),
  "hero": require("../../assets/brand-logos/hero.png"),
  "honda": require("../../assets/brand-logos/honda.png"),
  "hongqi": require("../../assets/brand-logos/hongqi.png"),
  "husqvarna": require("../../assets/brand-logos/husqvarna.png"),
  "hyosung": require("../../assets/brand-logos/hyosung.png"),
  "hyundai": require("../../assets/brand-logos/hyundai.png"),
  "isuzu": require("../../assets/brand-logos/isuzu.png"),
  "iveco": require("../../assets/brand-logos/iveco.png"),
  "jac": require("../../assets/brand-logos/jac.png"),
  "jeep": require("../../assets/brand-logos/jeep.png"),
  "kanuni": require("../../assets/brand-logos/kanuni.png"),
  "karsan": require("../../assets/brand-logos/karsan.png"),
  "kawasaki": require("../../assets/brand-logos/kawasaki.png"),
  "keeway": require("../../assets/brand-logos/keeway.png"),
  "kia": require("../../assets/brand-logos/kia.png"),
  "kove": require("../../assets/brand-logos/kove.png"),
  "kral": require("../../assets/brand-logos/kral.png"),
  "ktm": require("../../assets/brand-logos/ktm.png"),
  "kuba": require("../../assets/brand-logos/kuba.png"),
  "kymco": require("../../assets/brand-logos/kymco.png"),
  "lada": require("../../assets/brand-logos/lada.png"),
  "lamborghini": require("../../assets/brand-logos/lamborghini.png"),
  "lambretta": require("../../assets/brand-logos/lambretta.png"),
  "land-rover": require("../../assets/brand-logos/land-rover.png"),
  "leapmotor": require("../../assets/brand-logos/leapmotor.png"),
  "lotus": require("../../assets/brand-logos/lotus.png"),
  "lynk-and-co": require("../../assets/brand-logos/lynk-and-co.png"),
  "mahindra": require("../../assets/brand-logos/mahindra.png"),
  "malaguti": require("../../assets/brand-logos/malaguti.png"),
  "maxus": require("../../assets/brand-logos/maxus.png"),
  "mercedes-benz": require("../../assets/brand-logos/mercedes-benz.png"),
  "mg": require("../../assets/brand-logos/mg.png"),
  "mini": require("../../assets/brand-logos/mini.png"),
  "mondial": require("../../assets/brand-logos/mondial.png"),
  "moto-guzzi": require("../../assets/brand-logos/moto-guzzi.png"),
  "moto-morini": require("../../assets/brand-logos/moto-morini.png"),
  "motolux": require("../../assets/brand-logos/motolux.png"),
  "mv-agusta": require("../../assets/brand-logos/mv-agusta.png"),
  "nissan": require("../../assets/brand-logos/nissan.png"),
  "omoda": require("../../assets/brand-logos/omoda.png"),
  "opel": require("../../assets/brand-logos/opel.png"),
  "otokar": require("../../assets/brand-logos/otokar.png"),
  "peugeot": require("../../assets/brand-logos/peugeot.png"),
  "piaggio": require("../../assets/brand-logos/piaggio.png"),
  "polaris": require("../../assets/brand-logos/polaris.png"),
  "polestar": require("../../assets/brand-logos/polestar.png"),
  "porsche": require("../../assets/brand-logos/porsche.png"),
  "proton": require("../../assets/brand-logos/proton.png"),
  "qjmotor": require("../../assets/brand-logos/qjmotor.png"),
  "renault": require("../../assets/brand-logos/renault.png"),
  "rks": require("../../assets/brand-logos/rks.png"),
  "royal-enfield": require("../../assets/brand-logos/royal-enfield.png"),
  "salcano": require("../../assets/brand-logos/salcano.png"),
  "seat": require("../../assets/brand-logos/seat.png"),
  "seres": require("../../assets/brand-logos/seres.png"),
  "sherco": require("../../assets/brand-logos/sherco.png"),
  "skoda": require("../../assets/brand-logos/skoda.png"),
  "skywell": require("../../assets/brand-logos/skywell.png"),
  "stmax": require("../../assets/brand-logos/stmax.png"),
  "suzuki": require("../../assets/brand-logos/suzuki.png"),
  "swm": require("../../assets/brand-logos/swm.png"),
  "sym": require("../../assets/brand-logos/sym.png"),
  "tata": require("../../assets/brand-logos/tata.png"),
  "temsa": require("../../assets/brand-logos/temsa.png"),
  "tesla": require("../../assets/brand-logos/tesla.png"),
  "togg": require("../../assets/brand-logos/togg.png"),
  "toyota": require("../../assets/brand-logos/toyota.png"),
  "triumph": require("../../assets/brand-logos/triumph.png"),
  "tvs": require("../../assets/brand-logos/tvs.png"),
  "vespa": require("../../assets/brand-logos/vespa.png"),
  "voge": require("../../assets/brand-logos/voge.png"),
  "volkswagen": require("../../assets/brand-logos/volkswagen.png"),
  "volvo": require("../../assets/brand-logos/volvo.png"),
  "yamaha": require("../../assets/brand-logos/yamaha.png"),
  "yuki": require("../../assets/brand-logos/yuki.png"),
};

/**
 * High-resolution verified automotive & motorcycle brand logo CDN mappings
 */
export const VERIFIED_BRAND_LOGOS: Record<string, string> = {
  ...BRAND_SPECIFIC_URLS,
};

/**
 * Normalizes a brand name into standard slug format
 */
export function normalizeBrandKey(brandName?: string): string {
  if (!brandName) return "";
  const trimmed = brandName
    .trim()
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c");

  if (BRAND_ALIASES[trimmed]) {
    return BRAND_ALIASES[trimmed];
  }

  const slug = trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (BRAND_ALIASES[slug]) {
    return BRAND_ALIASES[slug];
  }

  return slug;
}

/**
 * Extracts a distinctive 2-letter uppercase monogram for fallback badges
 */
export function getBrandMonogram(brandName?: string): string {
  if (!brandName) return "TS";
  const clean = brandName.trim();
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Resolves high-resolution transparent brand logo URL or local asset URI
 */
export function getBrandLogoUrl(brandName?: string, vehicleType?: string): string | null {
  if (!brandName) return null;
  const slug = normalizeBrandKey(brandName);

  // 1. Try local bundled asset first (0ms load, offline ready)
  if (LOCAL_BRAND_LOGOS[slug]) {
    try {
      const resolved = Image.resolveAssetSource(LOCAL_BRAND_LOGOS[slug]);
      if (resolved && resolved.uri) {
        return resolved.uri;
      }
    } catch {
      // Fallback to remote if resolveAssetSource fails in special context
    }
  }

  // 2. Curated direct match
  const rawKey = brandName.trim().toLowerCase();
  if (VERIFIED_BRAND_LOGOS[rawKey]) {
    return VERIFIED_BRAND_LOGOS[rawKey];
  }
  if (VERIFIED_BRAND_LOGOS[slug]) {
    return VERIFIED_BRAND_LOGOS[slug];
  }

  // 3. Shared canonical URL
  return getCanonicalBrandLogoUrl(brandName, vehicleType);
}

/**
 * Dynamic lookup proxy for seamless backward compatibility with BRAND_LOGOS[brandName]
 */
export const BRAND_LOGOS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_, prop: string) {
    if (typeof prop !== "string") return undefined;
    return getBrandLogoUrl(prop) || undefined;
  },
});
