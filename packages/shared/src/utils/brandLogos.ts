/**
 * Canonical Automotive & Motorcycle Brand Logo Registry
 * High-precision transparent PNG logos with jsDelivr CDN, Wikimedia, and GitHub Raw fallbacks,
 * plus luxury automotive monogram generator for boutique brands.
 */

// Normalized alias dictionary
export const BRAND_ALIASES: Record<string, string> = {
  vw: "volkswagen",
  "volkswagen": "volkswagen",
  "mercedes": "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  "mercedes-benz": "mercedes-benz",
  "mercedes - benz": "mercedes-benz",
  "mercedes---benz": "mercedes-benz",
  "alfa": "alfa-romeo",
  "alfa romeo": "alfa-romeo",
  "alfa-romeo": "alfa-romeo",
  "citroën": "citroen",
  "citroen": "citroen",
  "škoda": "skoda",
  "skoda": "skoda",
  "seat": "seat",
  "land rover": "land-rover",
  "range rover": "land-rover",
  "land-rover": "land-rover",
  "aston martin": "aston-martin",
  "aston-martin": "aston-martin",
  "rolls royce": "rolls-royce",
  "rolls-royce": "rolls-royce",
  "harley davidson": "harley-davidson",
  "harley-davidson": "harley-davidson",
  "moto guzzi": "moto-guzzi",
  "moto-guzzi": "moto-guzzi",
  "royal enfield": "royal-enfield",
  "royal-enfield": "royal-enfield",
  "cf moto": "cfmoto",
  "cf-moto": "cfmoto",
  "cfmoto": "cfmoto",
  "tofaş": "fiat",
  "tofas": "fiat",
  "ssangyong": "ssangyong",
  "kgm": "ssangyong",
  "kgm ssangyong": "ssangyong",
  "kgm-ssangyong": "ssangyong",
  "ds": "ds",
  "ds automobiles": "ds",
  "ds-automobiles": "ds",
  "lynk & co": "lynk-and-co",
  "lynk co": "lynk-and-co",
  "lynk-co": "lynk-and-co",
  "lynk-and-co": "lynk-and-co",
  "dfsk": "dongfeng",
  "dongfeng": "dongfeng",
  "benda motor": "benda",
  "benda-motor": "benda",
  "kuba motor": "kuba",
  "kuba-motor": "kuba",
  "rks motor": "rks",
  "rks-motor": "rks",
  "arora motor": "arora",
  "arora-motor": "arora",
  "yuki motor": "yuki",
  "yuki-motor": "yuki",
  "kanuni motor": "kanuni",
  "kanuni-motor": "kanuni",
  "falcon motor": "falcon",
  "falcon-motor": "falcon",
  "tvs motor": "tvs",
  "tvs-motor": "tvs",
  "hero motocorp": "hero",
  "hero-motocorp": "hero",
  "qj": "qjmotor",
  "qj motor": "qjmotor",
  "qj-motor": "qjmotor",
  "qjmotor": "qjmotor",
  "kral motor": "kral",
  "kral-motor": "kral",
  "asya motor": "asya",
  "asya-motor": "asya",
  "iveco - otoyol": "iveco",
  "iveco-otoyol": "iveco",
  "can am": "can-am",
  "can-am": "can-am",
  "mv agusta": "mv-agusta",
  "mv-agusta": "mv-agusta",
  "moto morini": "moto-morini",
  "moto-morini": "moto-morini",
  "anadol": "ford",
  "jaecoo": "chery",
  "dfm": "dongfeng",
  "hfkanuni": "kanuni",
  "hf-kanuni": "kanuni",
  "mclaren": "mclaren",
  "gmc": "gmc",
  "the london taxi": "the-london-taxi",
  "the-london-taxi": "the-london-taxi",
  "levc": "the-london-taxi",
  "orti": "ortimobil",
  "orti mobil": "ortimobil",
  "reeder": "reeder",
  "rainwoll": "rainwoll",
  "voyah": "voyah",
  "xev": "xev",
  "forthing": "forthing",
  "aion": "aion",
  "gac aion": "aion",
  "cenntro": "cenntro",
  "vanderhall": "vanderhall",
  "jiayuan": "jiayuan",
  "joyce": "joyce",
  "katren": "katren",
  "luqi": "luqi",
  "nieve": "nieve",
  "fest": "fest",
  "relive": "relive",
  "tenax": "tenax",
  "yudo": "yudo",
  "etox": "etox",
  "moskwitsch": "moskwitsch",
  "moskvich": "moskwitsch",
  "micro": "micro",
  "oldsmobile": "oldsmobile",
  "plymouth": "plymouth",
  "pontiac": "pontiac",
  "mercury": "mercury",
  "buick": "buick",
  "cadillac": "cadillac",
  "lincoln": "lincoln",
  "acura": "acura",
  "hummer": "hummer",
  "eagle": "eagle",
  "fisker": "fisker",
  "bugatti": "bugatti",
  "koenigsegg": "koenigsegg",
  "pagani": "pagani",
  "morgan": "morgan",
  "lancia": "lancia",
  "rover": "rover",
  "saab": "saab",
  "maybach": "maybach",
  "ikco": "ikco",
};

// Curated high-precision CDN URLs for Turkish market automotive and motorcycle brands
export const BRAND_SPECIFIC_URLS: Record<string, string> = {
  // Turkish National EV
  togg: "https://thumb.wikimedia.org/wikipedia/tr/thumb/b/b1/TOGG_logosu.svg/500px-TOGG_logosu.svg.png",

  // Major Passenger Cars
  volkswagen: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/volkswagen.png",
  bmw: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/bmw.png",
  "mercedes-benz": "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mercedes-benz.png",
  audi: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/audi.png",
  renault: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/renault.png",
  fiat: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/fiat.png",
  ford: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ford.png",
  toyota: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/toyota.png",
  hyundai: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/hyundai.png",
  peugeot: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/peugeot.png",
  honda: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/honda.png",
  opel: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/opel.png",
  nissan: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/nissan.png",
  citroen: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/citroen.png",
  dacia: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/dacia.png",
  skoda: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/skoda.png",
  seat: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/seat.png",
  kia: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/kia.png",
  volvo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/volvo.png",
  porsche: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/porsche.png",
  "alfa-romeo": "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/alfa-romeo.png",
  mini: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mini.png",
  jeep: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/jeep.png",
  tesla: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/tesla.png",
  "land-rover": "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/land-rover.png",
  cupra: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/cupra.png",
  chery: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/chery.png",
  byd: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/byd.png",
  mg: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mg.png",
  suzuki: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/suzuki.png",
  subaru: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/subaru.png",
  mitsubishi: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mitsubishi.png",
  mazda: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mazda.png",
  ds: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ds.png",
  lexus: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lexus.png",
  ssangyong: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ssangyong.png",
  chevrolet: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/chevrolet.png",
  abarth: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/abarth.png",
  ferrari: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ferrari.png",
  maserati: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/maserati.png",
  jaguar: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/jaguar.png",
  bentley: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/bentley.png",
  "aston-martin": "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/aston-martin.png",
  smart: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/smart.png",
  infiniti: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/infiniti.png",
  cadillac: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/cadillac.png",
  dodge: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/dodge.png",
  chrysler: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/chrysler.png",
  iveco: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/iveco.png",
  dongfeng: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/dongfeng.png",
  geely: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/geely.png",
  isuzu: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/isuzu.png",
  tata: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/tata.png",
  lada: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lada.png",
  daewoo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/daewoo.png",
  lamborghini: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lamborghini.png",
  lotus: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lotus.png",
  polestar: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/polestar.png",
  alpine: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/alpine.png",
  leapmotor: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/leapmotor.png",
  "lynk-and-co": "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lynk-and-co.png",
  omoda: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/omoda.png",
  skywell: "https://upload.wikimedia.org/wikipedia/commons/9/97/SkyWelllogo.png",
  seres: "https://seres.com.tr/wp-content/uploads/2021/12/seres-logo-son.png",
  foton: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/foton.png",
  jac: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/jac.png",
  daihatsu: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/daihatsu.png",
  mahindra: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mahindra.png",
  hongqi: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/hongqi.png",
  proton: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/proton.png",
  maxus: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/maxus.png",
  gaz: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/gaz.png",
  askam: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/askam.png",
  faw: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/faw.png",
  otokar: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Otokar_logo.svg/500px-Otokar_logo.svg.png",
  karsan: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Karsan_logo.svg/500px-Karsan_logo.svg.png",
  bmc: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/bmc.png",
  temsa: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/temsa.png",
  acura: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/acura.png",
  aion: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/AION_Auto_UK_simple_logo.svg/960px-AION_Auto_UK_simple_logo.svg.png",
  bugatti: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/bugatti.png",
  buick: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/buick.png",
  cenntro: "https://1000logos.net/wp-content/uploads/2024/01/Cenntro-logo.png",
  eagle: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/eagle.png",
  etox: "http://zafersonmezates.com/ckfinder/userfiles/images/etox_amblem.jpg",
  fest: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/mobile/assets/brand-logos/fest.png",
  fisker: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/fisker.png",
  forthing: "https://images.seeklogo.com/logo-png/64/1/forthing-logo-png_seeklogo-649477.png",
  gmc: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/gmc.png",
  hummer: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/hummer.png",
  ikco: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/ikco.png",
  jiayuan: "https://upload.wikimedia.org/wikipedia/commons/4/47/Jiayuan-ev.jpg",
  joyce: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/mobile/assets/brand-logos/joyce.png",
  katren: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/mobile/assets/brand-logos/katren.png",
  koenigsegg: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/koenigsegg.png",
  lancia: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lancia.png",
  lincoln: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/lincoln.png",
  luqi: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/mobile/assets/brand-logos/luqi.png",
  maybach: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/maybach.png",
  mclaren: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mclaren.png",
  mercury: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/mercury.png",
  micro: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/microcar.png",
  morgan: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/morgan.png",
  moskwitsch: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Logo_of_Moskvich.svg/960px-Logo_of_Moskvich.svg.png",
  nieve: "https://www.nieve.com.tr/images/nieve-logo.svg",
  oldsmobile: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/oldsmobile.png",
  orti: "https://ortimobil.com/wp-content/uploads/2024/03/ortimobil-logo-3d.png",
  ortimobil: "https://ortimobil.com/wp-content/uploads/2024/03/ortimobil-logo-3d.png",
  pagani: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/pagani.png",
  plymouth: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/plymouth.png",
  pontiac: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/pontiac.png",
  rainwoll: "https://www.rainwoll.com/wp-content/uploads/2023/02/rainwoll-logo.png",
  reeder: "https://images.seeklogo.com/logo-png/44/1/reeder-logo-png_seeklogo-441394.png",
  relive: "https://www.relive.com.tr/images/logo_international.svg",
  "rolls-royce": "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/rolls-royce.png",
  rover: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/rover.png",
  saab: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/saab.png",
  tenax: "https://www.tenaxinternational.com/wp-content/uploads/2020/10/logo.png",
  "the-london-taxi": "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/mobile/assets/brand-logos/the-london-taxi.png",
  vanderhall: "https://1000logos.net/wp-content/uploads/2024/01/Vanderhall-logo.png",
  voyah: "https://upload.wikimedia.org/wikipedia/he/9/9e/Voyah_Logo.png",
  xev: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/XEV_logo_2023.svg/960px-XEV_logo_2023.svg.png",
  yudo: "https://images.seeklogo.com/logo-png/53/1/yudo-auto-logo-png_seeklogo-535371.png",

  // Verified Motorcycles
  hyosung: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Hyosung_Group_logo.svg/500px-Hyosung_Group_logo.svg.png",
  mondial: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Mondial_logo.png/500px-Mondial_logo.png",
  rks: "https://www.rksmotor.com.tr/images/logo-rks-black.png",
  kuba: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/kuba.png",
  arora: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/ARORA.png/500px-ARORA.png",
  yuki: "https://yukimotor.com.tr/wp-content/themes/yuki-motosiklet/images/logo.png",
  kanuni: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/kanuni.png",
  voge: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/voge.png",
  benda: "https://www.bendaturkiye.com.tr/wp-content/uploads/2023/01/benda.png",
  falcon: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/falcon.png",
  tvs: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/tvs.png",
  hero: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Hero_MotoCorp.svg/500px-Hero_MotoCorp.svg.png",
  qjmotor: "https://static.wixstatic.com/media/b01f85_525fd3d771b944a48c8bd3802114e5ee~mv2.png",
  kove: "https://www.kovemoto.com/wp-content/uploads/2026/05/logo-2.png",
  motolux: "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/motolux.png",
  kral: "https://kralmotor.tr/images/logo.png",
  salcano: "https://www.salcano.com/wp-content/uploads/2026/01/cropped-salcanologo.png",
  stmax: "https://stmax.com.tr/wp-content/uploads/2026/02/logo.png",
  asya: "https://www.asyamotor.com.tr/images/logo.png",
  beta: "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/beta.png",
  bimota: "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/bimota.png",
  cagiva: "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/cagiva.png",
  gilera: "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/gilera.png",
  "mv-agusta": "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/mv-agusta.png",
  "moto-morini": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Moto_Morini_Logo_2023.png/500px-Moto_Morini_Logo_2023.png",
  keeway: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Keeway_logo.svg/500px-Keeway_logo.svg.png",
  haojue: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/Haojue_Holdings_logo.svg/500px-Haojue_Holdings_logo.svg.png",
  daelim: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Daelim.svg/500px-Daelim.svg.png",
  brixton: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Brixton_motorcycles_logo.png/500px-Brixton_motorcycles_logo.png",
  sherco: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Logo_Sherco.svg/500px-Logo_Sherco.svg.png",
  swm: "https://cdn.worldvectorlogo.com/logos/moto-swm.svg",
  derbi: "https://cdn.worldvectorlogo.com/logos/derbi.svg",
  malaguti: "https://cdn.worldvectorlogo.com/logos/malaguti.svg",
  lambretta: "https://cdn.worldvectorlogo.com/logos/lambretta.svg",
  "can-am": "https://raw.githubusercontent.com/periskop08/used-car-intelligence-app/main/apps/web/public/brand-logos/can-am.png",
  polaris: "https://cdn.worldvectorlogo.com/logos/polaris-industries.svg",
  vespa: "https://cdn.worldvectorlogo.com/logos/vespa.svg",
  benelli: "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/benelli.png",
  "harley-davidson": "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/harley-davidson.png",
  "moto-guzzi": "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/moto-guzzi.png",
  triumph: "https://cdn.jsdelivr.net/gh/lucapsq/motorcycle-logos-dataset@master/src/triumph.png",
  yamaha: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Yamaha_Motor_logo.svg/500px-Yamaha_Motor_logo.svg.png",
  kawasaki: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Kawasaki-logo.svg/500px-Kawasaki-logo.svg.png",
  ducati: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Ducati_red_logo.svg/500px-Ducati_red_logo.svg.png",
  ktm: "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ktm.png",
  aprilia: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Aprilia-logo.svg/500px-Aprilia-logo.svg.png",
  piaggio: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Piaggio_Group_logo.svg/500px-Piaggio_Group_logo.svg.png",
  bajaj: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Bajaj_Auto_Ltd_logo.svg/500px-Bajaj_Auto_Ltd_logo.svg.png",
  cfmoto: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/CFMOTO_Logo.svg/500px-CFMOTO_Logo.svg.png",
  kymco: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/55/KYMCO_logo.svg/500px-KYMCO_logo.svg.png",
  sym: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/SYM_logo_of_Sanyang_Motor_20180408.svg/500px-SYM_logo_of_Sanyang_Motor_20180408.svg.png",
  "royal-enfield": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Royal_Enfield_logo.svg/500px-Royal_Enfield_logo.svg.png",
  husqvarna: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Husqvarna_Logo.png/500px-Husqvarna_Logo.png",
};

/**
 * Normalizes a brand name into a URL-friendly canonical slug.
 */
export function normalizeBrandSlug(brandName?: string): string {
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
 * Resolves the canonical brand logo URL.
 * Never returns a broken or non-existent generic image URL.
 */
export function getCanonicalBrandLogoUrl(brandName?: string, vehicleType?: string): string {
  const slug = normalizeBrandSlug(brandName);
  if (!slug) {
    return vehicleType === "MOTORCYCLE"
      ? "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Yamaha_Motor_logo.svg/500px-Yamaha_Motor_logo.svg.png"
      : "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/optimized/volkswagen.png";
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
      initials: "TS",
      bgColor: "#f1f5f9",
      borderColor: "#cbd5e1",
      textColor: "#0f172a",
    };
  }

  const clean = brandName.trim();
  const words = clean.split(/\s+/);
  let initials = "";

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
    { bgColor: "#f8fafc", borderColor: "#cbd5e1", textColor: "#0f172a" }, // Slate Metallic
    { bgColor: "#eff6ff", borderColor: "#bfdbfe", textColor: "#1e3a8a" }, // Deep Blue Precision
    { bgColor: "#fff7ed", borderColor: "#fed7aa", textColor: "#9a3412" }, // Bronze / Copper
    { bgColor: "#f0fdf4", borderColor: "#bbf7d0", textColor: "#166534" }, // Emerald Racing
    { bgColor: "#faf5ff", borderColor: "#e9d5ff", textColor: "#581c87" }, // Imperial Violet
  ];

  const selectedPalette = palettes[Math.abs(hash) % palettes.length];

  return {
    initials,
    bgColor: selectedPalette.bgColor,
    borderColor: selectedPalette.borderColor,
    textColor: selectedPalette.textColor,
  };
}
