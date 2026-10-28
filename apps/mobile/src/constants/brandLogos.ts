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
  "abarth": require("../../assets/brand-logos/abarth.png"),
  "acura": require("../../assets/brand-logos/acura.png"),
  "aion": require("../../assets/brand-logos/aion.png"),
  "ajp": require("../../assets/brand-logos/ajp.png"),
  "alfa-romeo": require("../../assets/brand-logos/alfa-romeo.png"),
  "alpine": require("../../assets/brand-logos/alpine.png"),
  "altai": require("../../assets/brand-logos/altai.png"),
  "apachi": require("../../assets/brand-logos/apachi.png"),
  "apec": require("../../assets/brand-logos/apec.png"),
  "aprilia": require("../../assets/brand-logos/aprilia.png"),
  "arora": require("../../assets/brand-logos/arora.png"),
  "askam": require("../../assets/brand-logos/askam.png"),
  "aston-martin": require("../../assets/brand-logos/aston-martin.png"),
  "asya": require("../../assets/brand-logos/asya.png"),
  "audi": require("../../assets/brand-logos/audi.png"),
  "bajaj": require("../../assets/brand-logos/bajaj.png"),
  "belderia": require("../../assets/brand-logos/belderia.png"),
  "benda": require("../../assets/brand-logos/benda.png"),
  "benelli": require("../../assets/brand-logos/benelli.png"),
  "bentley": require("../../assets/brand-logos/bentley.png"),
  "beta": require("../../assets/brand-logos/beta.png"),
  "bianchi": require("../../assets/brand-logos/bianchi.png"),
  "bimota": require("../../assets/brand-logos/bimota.png"),
  "bisan": require("../../assets/brand-logos/bisan.png"),
  "bmc": require("../../assets/brand-logos/bmc.png"),
  "bmw": require("../../assets/brand-logos/bmw.png"),
  "brixton": require("../../assets/brand-logos/brixton.png"),
  "bsa": require("../../assets/brand-logos/bsa.png"),
  "buell": require("../../assets/brand-logos/buell.png"),
  "bugatti": require("../../assets/brand-logos/bugatti.png"),
  "buick": require("../../assets/brand-logos/buick.png"),
  "byd": require("../../assets/brand-logos/byd.png"),
  "cadillac": require("../../assets/brand-logos/cadillac.png"),
  "cagiva": require("../../assets/brand-logos/cagiva.png"),
  "can-am": require("../../assets/brand-logos/can-am.png"),
  "cenntro": require("../../assets/brand-logos/cenntro.png"),
  "cfmoto": require("../../assets/brand-logos/cfmoto.png"),
  "chery": require("../../assets/brand-logos/chery.png"),
  "chevrolet": require("../../assets/brand-logos/chevrolet.png"),
  "chrysler": require("../../assets/brand-logos/chrysler.png"),
  "citroen": require("../../assets/brand-logos/citroen.png"),
  "cupra": require("../../assets/brand-logos/cupra.png"),
  "dacia": require("../../assets/brand-logos/dacia.png"),
  "daelim": require("../../assets/brand-logos/daelim.png"),
  "daewoo": require("../../assets/brand-logos/daewoo.png"),
  "daihatsu": require("../../assets/brand-logos/daihatsu.png"),
  "derbi": require("../../assets/brand-logos/derbi.png"),
  "dfm": require("../../assets/brand-logos/dfm.png"),
  "dodge": require("../../assets/brand-logos/dodge.png"),
  "dongfeng": require("../../assets/brand-logos/dongfeng.png"),
  "ds": require("../../assets/brand-logos/ds.png"),
  "ducati": require("../../assets/brand-logos/ducati.png"),
  "eagle": require("../../assets/brand-logos/eagle.png"),
  "etox": require("../../assets/brand-logos/etox.png"),
  "falcon": require("../../assets/brand-logos/falcon.png"),
  "fantic": require("../../assets/brand-logos/fantic.png"),
  "faw": require("../../assets/brand-logos/faw.png"),
  "ferrari": require("../../assets/brand-logos/ferrari.png"),
  "fest": require("../../assets/brand-logos/fest.png"),
  "fiat": require("../../assets/brand-logos/fiat.png"),
  "fisker": require("../../assets/brand-logos/fisker.png"),
  "ford": require("../../assets/brand-logos/ford.png"),
  "forthing": require("../../assets/brand-logos/forthing.png"),
  "foton": require("../../assets/brand-logos/foton.png"),
  "gas-gas": require("../../assets/brand-logos/gas-gas.png"),
  "gasgas": require("../../assets/brand-logos/gasgas.png"),
  "gaz": require("../../assets/brand-logos/gaz.png"),
  "geely": require("../../assets/brand-logos/geely.png"),
  "gilera": require("../../assets/brand-logos/gilera.png"),
  "gmc": require("../../assets/brand-logos/gmc.png"),
  "haojue": require("../../assets/brand-logos/haojue.png"),
  "harley-davidson": require("../../assets/brand-logos/harley-davidson.png"),
  "hero": require("../../assets/brand-logos/hero.png"),
  "hf-kanuni": require("../../assets/brand-logos/hf-kanuni.png"),
  "hfkanuni": require("../../assets/brand-logos/hfkanuni.png"),
  "honda": require("../../assets/brand-logos/honda.png"),
  "hongqi": require("../../assets/brand-logos/hongqi.png"),
  "hummer": require("../../assets/brand-logos/hummer.png"),
  "husaberg": require("../../assets/brand-logos/husaberg.png"),
  "husqvarna": require("../../assets/brand-logos/husqvarna.png"),
  "hyosung": require("../../assets/brand-logos/hyosung.png"),
  "hyundai": require("../../assets/brand-logos/hyundai.png"),
  "ikco": require("../../assets/brand-logos/ikco.png"),
  "indian": require("../../assets/brand-logos/indian.png"),
  "infiniti": require("../../assets/brand-logos/infiniti.png"),
  "isuzu": require("../../assets/brand-logos/isuzu.png"),
  "italjet": require("../../assets/brand-logos/italjet.png"),
  "iveco": require("../../assets/brand-logos/iveco.png"),
  "jac": require("../../assets/brand-logos/jac.png"),
  "jaecoo": require("../../assets/brand-logos/jaecoo.png"),
  "jaguar": require("../../assets/brand-logos/jaguar.png"),
  "jawa": require("../../assets/brand-logos/jawa.png"),
  "jeep": require("../../assets/brand-logos/jeep.png"),
  "jiayuan": require("../../assets/brand-logos/jiayuan.png"),
  "joyce": require("../../assets/brand-logos/joyce.png"),
  "kanuni": require("../../assets/brand-logos/kanuni.png"),
  "karsan": require("../../assets/brand-logos/karsan.png"),
  "katren": require("../../assets/brand-logos/katren.png"),
  "kawasaki": require("../../assets/brand-logos/kawasaki.png"),
  "kayo-moto": require("../../assets/brand-logos/kayo-moto.png"),
  "kayo": require("../../assets/brand-logos/kayo.png"),
  "keeway": require("../../assets/brand-logos/keeway.png"),
  "kia": require("../../assets/brand-logos/kia.png"),
  "koenigsegg": require("../../assets/brand-logos/koenigsegg.png"),
  "kove": require("../../assets/brand-logos/kove.png"),
  "kral": require("../../assets/brand-logos/kral.png"),
  "ktm": require("../../assets/brand-logos/ktm.png"),
  "kuba": require("../../assets/brand-logos/kuba.png"),
  "kymco": require("../../assets/brand-logos/kymco.png"),
  "lada": require("../../assets/brand-logos/lada.png"),
  "lamborghini": require("../../assets/brand-logos/lamborghini.png"),
  "lambretta": require("../../assets/brand-logos/lambretta.png"),
  "lancia": require("../../assets/brand-logos/lancia.png"),
  "land-rover": require("../../assets/brand-logos/land-rover.png"),
  "leapmotor": require("../../assets/brand-logos/leapmotor.png"),
  "levc": require("../../assets/brand-logos/levc.png"),
  "lexus": require("../../assets/brand-logos/lexus.png"),
  "lifan": require("../../assets/brand-logos/lifan.png"),
  "lincoln": require("../../assets/brand-logos/lincoln.png"),
  "lotus": require("../../assets/brand-logos/lotus.png"),
  "luqi": require("../../assets/brand-logos/luqi.png"),
  "lynk-and-co": require("../../assets/brand-logos/lynk-and-co.png"),
  "lynx": require("../../assets/brand-logos/lynx.png"),
  "mahindra": require("../../assets/brand-logos/mahindra.png"),
  "malaguti": require("../../assets/brand-logos/malaguti.png"),
  "maserati": require("../../assets/brand-logos/maserati.png"),
  "maxus": require("../../assets/brand-logos/maxus.png"),
  "maybach": require("../../assets/brand-logos/maybach.png"),
  "mazda": require("../../assets/brand-logos/mazda.png"),
  "mclaren": require("../../assets/brand-logos/mclaren.png"),
  "mercedes-benz": require("../../assets/brand-logos/mercedes-benz.png"),
  "mercury": require("../../assets/brand-logos/mercury.png"),
  "mg": require("../../assets/brand-logos/mg.png"),
  "micro": require("../../assets/brand-logos/micro.png"),
  "mini": require("../../assets/brand-logos/mini.png"),
  "mitsubishi": require("../../assets/brand-logos/mitsubishi.png"),
  "mobylette": require("../../assets/brand-logos/mobylette.png"),
  "modenas": require("../../assets/brand-logos/modenas.png"),
  "mondial": require("../../assets/brand-logos/mondial.png"),
  "morgan": require("../../assets/brand-logos/morgan.png"),
  "moskwitsch": require("../../assets/brand-logos/moskwitsch.png"),
  "moto-gusto": require("../../assets/brand-logos/moto-gusto.png"),
  "moto-guzzi": require("../../assets/brand-logos/moto-guzzi.png"),
  "moto-morini": require("../../assets/brand-logos/moto-morini.png"),
  "motobecane": require("../../assets/brand-logos/motobecane.png"),
  "motolux": require("../../assets/brand-logos/motolux.png"),
  "motoran": require("../../assets/brand-logos/motoran.png"),
  "mutt": require("../../assets/brand-logos/mutt.png"),
  "mv-agusta": require("../../assets/brand-logos/mv-agusta.png"),
  "mz": require("../../assets/brand-logos/mz.png"),
  "nieve": require("../../assets/brand-logos/nieve.png"),
  "nissan": require("../../assets/brand-logos/nissan.png"),
  "norton": require("../../assets/brand-logos/norton.png"),
  "nsu": require("../../assets/brand-logos/nsu.png"),
  "oldsmobile": require("../../assets/brand-logos/oldsmobile.png"),
  "omoda": require("../../assets/brand-logos/omoda.png"),
  "opel": require("../../assets/brand-logos/opel.png"),
  "orti": require("../../assets/brand-logos/orti.png"),
  "ortimobil": require("../../assets/brand-logos/ortimobil.png"),
  "otokar": require("../../assets/brand-logos/otokar.png"),
  "pagani": require("../../assets/brand-logos/pagani.png"),
  "peugeot": require("../../assets/brand-logos/peugeot.png"),
  "pgo": require("../../assets/brand-logos/pgo.png"),
  "piaggio": require("../../assets/brand-logos/piaggio.png"),
  "plymouth": require("../../assets/brand-logos/plymouth.png"),
  "polaris": require("../../assets/brand-logos/polaris.png"),
  "polestar": require("../../assets/brand-logos/polestar.png"),
  "polini": require("../../assets/brand-logos/polini.png"),
  "pontiac": require("../../assets/brand-logos/pontiac.png"),
  "porsche": require("../../assets/brand-logos/porsche.png"),
  "proton": require("../../assets/brand-logos/proton.png"),
  "puch": require("../../assets/brand-logos/puch.png"),
  "qjmotor": require("../../assets/brand-logos/qjmotor.png"),
  "rainwoll": require("../../assets/brand-logos/rainwoll.png"),
  "ramzey": require("../../assets/brand-logos/ramzey.png"),
  "reeder": require("../../assets/brand-logos/reeder.png"),
  "regal-raptor": require("../../assets/brand-logos/regal-raptor.png"),
  "relive": require("../../assets/brand-logos/relive.png"),
  "renault": require("../../assets/brand-logos/renault.png"),
  "revolt": require("../../assets/brand-logos/revolt.png"),
  "rieju": require("../../assets/brand-logos/rieju.png"),
  "rks": require("../../assets/brand-logos/rks.png"),
  "rmg-moto-gusto": require("../../assets/brand-logos/rmg-moto-gusto.png"),
  "rolls-royce": require("../../assets/brand-logos/rolls-royce.png"),
  "romet": require("../../assets/brand-logos/romet.png"),
  "rover": require("../../assets/brand-logos/rover.png"),
  "royal-alloy": require("../../assets/brand-logos/royal-alloy.png"),
  "royal-enfield": require("../../assets/brand-logos/royal-enfield.png"),
  "saab": require("../../assets/brand-logos/saab.png"),
  "salcano": require("../../assets/brand-logos/salcano.png"),
  "seat": require("../../assets/brand-logos/seat.png"),
  "seres": require("../../assets/brand-logos/seres.png"),
  "sherco": require("../../assets/brand-logos/sherco.png"),
  "simson": require("../../assets/brand-logos/simson.png"),
  "ski-doo": require("../../assets/brand-logos/ski-doo.png"),
  "skoda": require("../../assets/brand-logos/skoda.png"),
  "skywell": require("../../assets/brand-logos/skywell.png"),
  "smart": require("../../assets/brand-logos/smart.png"),
  "ssangyong": require("../../assets/brand-logos/ssangyong.png"),
  "stmax": require("../../assets/brand-logos/stmax.png"),
  "subaru": require("../../assets/brand-logos/subaru.png"),
  "suzuki": require("../../assets/brand-logos/suzuki.png"),
  "swm": require("../../assets/brand-logos/swm.png"),
  "sym": require("../../assets/brand-logos/sym.png"),
  "tata": require("../../assets/brand-logos/tata.png"),
  "temsa": require("../../assets/brand-logos/temsa.png"),
  "tenax": require("../../assets/brand-logos/tenax.png"),
  "tesla": require("../../assets/brand-logos/tesla.png"),
  "tgb": require("../../assets/brand-logos/tgb.png"),
  "the-london-taxi": require("../../assets/brand-logos/the-london-taxi.png"),
  "tm-racing": require("../../assets/brand-logos/tm-racing.png"),
  "tm": require("../../assets/brand-logos/tm.png"),
  "togg": require("../../assets/brand-logos/togg.png"),
  "toyota": require("../../assets/brand-logos/toyota.png"),
  "triumph": require("../../assets/brand-logos/triumph.png"),
  "tvs": require("../../assets/brand-logos/tvs.png"),
  "ural": require("../../assets/brand-logos/ural.png"),
  "vanderhall": require("../../assets/brand-logos/vanderhall.png"),
  "velosolex": require("../../assets/brand-logos/velosolex.png"),
  "vespa": require("../../assets/brand-logos/vespa.png"),
  "victory": require("../../assets/brand-logos/victory.png"),
  "voge": require("../../assets/brand-logos/voge.png"),
  "volkswagen": require("../../assets/brand-logos/volkswagen.png"),
  "volta": require("../../assets/brand-logos/volta.png"),
  "volvo": require("../../assets/brand-logos/volvo.png"),
  "voyah": require("../../assets/brand-logos/voyah.png"),
  "xev": require("../../assets/brand-logos/xev.png"),
  "yamaha": require("../../assets/brand-logos/yamaha.png"),
  "yudo": require("../../assets/brand-logos/yudo.png"),
  "yuki": require("../../assets/brand-logos/yuki.png"),
  "zontes": require("../../assets/brand-logos/zontes.png"),
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
