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
  "abush": require("../../assets/brand-logos/abush.png"),
  "acura": require("../../assets/brand-logos/acura.png"),
  "aeon": require("../../assets/brand-logos/aeon.png"),
  "aion": require("../../assets/brand-logos/aion.png"),
  "airforce": require("../../assets/brand-logos/airforce.png"),
  "ajp": require("../../assets/brand-logos/ajp.png"),
  "alfa-romeo": require("../../assets/brand-logos/alfa-romeo.png"),
  "alpine": require("../../assets/brand-logos/alpine.png"),
  "altai": require("../../assets/brand-logos/altai.png"),
  "apachi": require("../../assets/brand-logos/apachi.png"),
  "apec": require("../../assets/brand-logos/apec.png"),
  "aprilia": require("../../assets/brand-logos/aprilia.png"),
  "argo": require("../../assets/brand-logos/argo.png"),
  "ariic": require("../../assets/brand-logos/ariic.png"),
  "armode": require("../../assets/brand-logos/armode.png"),
  "arora": require("../../assets/brand-logos/arora.png"),
  "askam": require("../../assets/brand-logos/askam.png"),
  "aston-martin": require("../../assets/brand-logos/aston-martin.png"),
  "asya": require("../../assets/brand-logos/asya.png"),
  "audi": require("../../assets/brand-logos/audi.png"),
  "bajaj": require("../../assets/brand-logos/bajaj.png"),
  "banhe": require("../../assets/brand-logos/banhe.png"),
  "baotian": require("../../assets/brand-logos/baotian.png"),
  "barossa": require("../../assets/brand-logos/barossa.png"),
  "bashan": require("../../assets/brand-logos/bashan.png"),
  "belderia": require("../../assets/brand-logos/belderia.png"),
  "benda": require("../../assets/brand-logos/benda.png"),
  "benelli": require("../../assets/brand-logos/benelli.png"),
  "bentley": require("../../assets/brand-logos/bentley.png"),
  "beta": require("../../assets/brand-logos/beta.png"),
  "better": require("../../assets/brand-logos/better.png"),
  "beyaz-benli": require("../../assets/brand-logos/beyaz-benli.png"),
  "bianchi": require("../../assets/brand-logos/bianchi.png"),
  "bimota": require("../../assets/brand-logos/bimota.png"),
  "birdhunter": require("../../assets/brand-logos/birdhunter.png"),
  "bisan": require("../../assets/brand-logos/bisan.png"),
  "bmc": require("../../assets/brand-logos/bmc.png"),
  "bmw": require("../../assets/brand-logos/bmw.png"),
  "boom": require("../../assets/brand-logos/boom.png"),
  "borelli-ledow": require("../../assets/brand-logos/borelli-ledow.png"),
  "brixton": require("../../assets/brand-logos/brixton.png"),
  "bsa": require("../../assets/brand-logos/bsa.png"),
  "buell": require("../../assets/brand-logos/buell.png"),
  "bugatti": require("../../assets/brand-logos/bugatti.png"),
  "buick": require("../../assets/brand-logos/buick.png"),
  "bumotojinling": require("../../assets/brand-logos/bumotojinling.png"),
  "byd": require("../../assets/brand-logos/byd.png"),
  "cadillac": require("../../assets/brand-logos/cadillac.png"),
  "cagiva": require("../../assets/brand-logos/cagiva.png"),
  "can-am": require("../../assets/brand-logos/can-am.png"),
  "caza": require("../../assets/brand-logos/caza.png"),
  "celik-motor": require("../../assets/brand-logos/celik-motor.png"),
  "cenntro": require("../../assets/brand-logos/cenntro.png"),
  "cezeta": require("../../assets/brand-logos/cezeta.png"),
  "cfmoto": require("../../assets/brand-logos/cfmoto.png"),
  "cheeta": require("../../assets/brand-logos/cheeta.png"),
  "chery": require("../../assets/brand-logos/chery.png"),
  "chevrolet": require("../../assets/brand-logos/chevrolet.png"),
  "chopper": require("../../assets/brand-logos/chopper.png"),
  "chrysler": require("../../assets/brand-logos/chrysler.png"),
  "citroen": require("../../assets/brand-logos/citroen.png"),
  "coral": require("../../assets/brand-logos/coral.png"),
  "cosmopolitan": require("../../assets/brand-logos/cosmopolitan.png"),
  "cq": require("../../assets/brand-logos/cq.png"),
  "crn": require("../../assets/brand-logos/crn.png"),
  "csn-motor": require("../../assets/brand-logos/csn-motor.png"),
  "cupra": require("../../assets/brand-logos/cupra.png"),
  "dacia": require("../../assets/brand-logos/dacia.png"),
  "daelim": require("../../assets/brand-logos/daelim.png"),
  "daewoo": require("../../assets/brand-logos/daewoo.png"),
  "daihatsu": require("../../assets/brand-logos/daihatsu.png"),
  "dayun": require("../../assets/brand-logos/dayun.png"),
  "delta-motorcycle": require("../../assets/brand-logos/delta-motorcycle.png"),
  "derbi": require("../../assets/brand-logos/derbi.png"),
  "dfm": require("../../assets/brand-logos/dfm.png"),
  "di-blasi": require("../../assets/brand-logos/di-blasi.png"),
  "dodge": require("../../assets/brand-logos/dodge.png"),
  "dofern": require("../../assets/brand-logos/dofern.png"),
  "dongfeng": require("../../assets/brand-logos/dongfeng.png"),
  "doohan": require("../../assets/brand-logos/doohan.png"),
  "dorado": require("../../assets/brand-logos/dorado.png"),
  "ds": require("../../assets/brand-logos/ds.png"),
  "ducati": require("../../assets/brand-logos/ducati.png"),
  "eagle": require("../../assets/brand-logos/eagle.png"),
  "easycool": require("../../assets/brand-logos/easycool.png"),
  "ecotrike": require("../../assets/brand-logos/ecotrike.png"),
  "elitte": require("../../assets/brand-logos/elitte.png"),
  "enbest": require("../../assets/brand-logos/enbest.png"),
  "ersi": require("../../assets/brand-logos/ersi.png"),
  "etox": require("../../assets/brand-logos/etox.png"),
  "falcon": require("../../assets/brand-logos/falcon.png"),
  "fantic": require("../../assets/brand-logos/fantic.png"),
  "faw": require("../../assets/brand-logos/faw.png"),
  "fcm": require("../../assets/brand-logos/fcm.png"),
  "fengchi": require("../../assets/brand-logos/fengchi.png"),
  "ferrari": require("../../assets/brand-logos/ferrari.png"),
  "fest": require("../../assets/brand-logos/fest.png"),
  "fiat": require("../../assets/brand-logos/fiat.png"),
  "fisker": require("../../assets/brand-logos/fisker.png"),
  "ford": require("../../assets/brand-logos/ford.png"),
  "forthing": require("../../assets/brand-logos/forthing.png"),
  "fosti": require("../../assets/brand-logos/fosti.png"),
  "foton": require("../../assets/brand-logos/foton.png"),
  "fym": require("../../assets/brand-logos/fym.png"),
  "gaoming": require("../../assets/brand-logos/gaoming.png"),
  "garelli": require("../../assets/brand-logos/garelli.png"),
  "gas-gas": require("../../assets/brand-logos/gas-gas.png"),
  "gasgas": require("../../assets/brand-logos/gasgas.png"),
  "gaz": require("../../assets/brand-logos/gaz.png"),
  "geely": require("../../assets/brand-logos/geely.png"),
  "gilera": require("../../assets/brand-logos/gilera.png"),
  "gmc": require("../../assets/brand-logos/gmc.png"),
  "gomoto": require("../../assets/brand-logos/gomoto.png"),
  "haojiang": require("../../assets/brand-logos/haojiang.png"),
  "haojin": require("../../assets/brand-logos/haojin.png"),
  "haojue": require("../../assets/brand-logos/haojue.png"),
  "harley-davidson": require("../../assets/brand-logos/harley-davidson.png"),
  "harput": require("../../assets/brand-logos/harput.png"),
  "hazey-turk": require("../../assets/brand-logos/hazey-turk.png"),
  "hercules": require("../../assets/brand-logos/hercules.png"),
  "hero": require("../../assets/brand-logos/hero.png"),
  "hf-kanuni": require("../../assets/brand-logos/hf-kanuni.png"),
  "hfkanuni": require("../../assets/brand-logos/hfkanuni.png"),
  "hh-moto": require("../../assets/brand-logos/hh-moto.png"),
  "hm-moto": require("../../assets/brand-logos/hm-moto.png"),
  "honda": require("../../assets/brand-logos/honda.png"),
  "hongqi": require("../../assets/brand-logos/hongqi.png"),
  "hsun": require("../../assets/brand-logos/hsun.png"),
  "hummer": require("../../assets/brand-logos/hummer.png"),
  "husaberg": require("../../assets/brand-logos/husaberg.png"),
  "husqvarna": require("../../assets/brand-logos/husqvarna.png"),
  "hyosung": require("../../assets/brand-logos/hyosung.png"),
  "hyundai": require("../../assets/brand-logos/hyundai.png"),
  "ikco": require("../../assets/brand-logos/ikco.png"),
  "indian": require("../../assets/brand-logos/indian.png"),
  "infiniti": require("../../assets/brand-logos/infiniti.png"),
  "isildar": require("../../assets/brand-logos/isildar.png"),
  "isuzu": require("../../assets/brand-logos/isuzu.png"),
  "italjet": require("../../assets/brand-logos/italjet.png"),
  "iveco": require("../../assets/brand-logos/iveco.png"),
  "izh": require("../../assets/brand-logos/izh.png"),
  "jac": require("../../assets/brand-logos/jac.png"),
  "jaecoo": require("../../assets/brand-logos/jaecoo.png"),
  "jaguar": require("../../assets/brand-logos/jaguar.png"),
  "jawa": require("../../assets/brand-logos/jawa.png"),
  "jaxin": require("../../assets/brand-logos/jaxin.png"),
  "jeep": require("../../assets/brand-logos/jeep.png"),
  "jiajue": require("../../assets/brand-logos/jiajue.png"),
  "jiayuan": require("../../assets/brand-logos/jiayuan.png"),
  "jinding": require("../../assets/brand-logos/jinding.png"),
  "jinlun": require("../../assets/brand-logos/jinlun.png"),
  "jonway": require("../../assets/brand-logos/jonway.png"),
  "joyce": require("../../assets/brand-logos/joyce.png"),
  "jpn-motor": require("../../assets/brand-logos/jpn-motor.png"),
  "kadirga": require("../../assets/brand-logos/kadirga.png"),
  "kaldera": require("../../assets/brand-logos/kaldera.png"),
  "kamax": require("../../assets/brand-logos/kamax.png"),
  "kangda": require("../../assets/brand-logos/kangda.png"),
  "kanuni": require("../../assets/brand-logos/kanuni.png"),
  "karpaty": require("../../assets/brand-logos/karpaty.png"),
  "karsan": require("../../assets/brand-logos/karsan.png"),
  "kastino": require("../../assets/brand-logos/kastino.png"),
  "katren": require("../../assets/brand-logos/katren.png"),
  "kawasaki": require("../../assets/brand-logos/kawasaki.png"),
  "kayo": require("../../assets/brand-logos/kayo.png"),
  "kayo-moto": require("../../assets/brand-logos/kayo-moto.png"),
  "keeway": require("../../assets/brand-logos/keeway.png"),
  "kentoya": require("../../assets/brand-logos/kentoya.png"),
  "kia": require("../../assets/brand-logos/kia.png"),
  "kimmi": require("../../assets/brand-logos/kimmi.png"),
  "kinetic": require("../../assets/brand-logos/kinetic.png"),
  "kinroad": require("../../assets/brand-logos/kinroad.png"),
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
  "lanying": require("../../assets/brand-logos/lanying.png"),
  "leapmotor": require("../../assets/brand-logos/leapmotor.png"),
  "leksas": require("../../assets/brand-logos/leksas.png"),
  "lem": require("../../assets/brand-logos/lem.png"),
  "levc": require("../../assets/brand-logos/levc.png"),
  "lexus": require("../../assets/brand-logos/lexus.png"),
  "lifan": require("../../assets/brand-logos/lifan.png"),
  "lincoln": require("../../assets/brand-logos/lincoln.png"),
  "lintex": require("../../assets/brand-logos/lintex.png"),
  "lml": require("../../assets/brand-logos/lml.png"),
  "lotus": require("../../assets/brand-logos/lotus.png"),
  "luqi": require("../../assets/brand-logos/luqi.png"),
  "lynk-and-co": require("../../assets/brand-logos/lynk-and-co.png"),
  "lynx": require("../../assets/brand-logos/lynx.png"),
  "mahindra": require("../../assets/brand-logos/mahindra.png"),
  "malaguti": require("../../assets/brand-logos/malaguti.png"),
  "maranta": require("../../assets/brand-logos/maranta.png"),
  "maserati": require("../../assets/brand-logos/maserati.png"),
  "maxus": require("../../assets/brand-logos/maxus.png"),
  "maybach": require("../../assets/brand-logos/maybach.png"),
  "mazda": require("../../assets/brand-logos/mazda.png"),
  "mclaren": require("../../assets/brand-logos/mclaren.png"),
  "megelli": require("../../assets/brand-logos/megelli.png"),
  "meiduo": require("../../assets/brand-logos/meiduo.png"),
  "meka-motor": require("../../assets/brand-logos/meka-motor.png"),
  "memnun": require("../../assets/brand-logos/memnun.png"),
  "mercedes-benz": require("../../assets/brand-logos/mercedes-benz.png"),
  "mercury": require("../../assets/brand-logos/mercury.png"),
  "mg": require("../../assets/brand-logos/mg.png"),
  "micro": require("../../assets/brand-logos/micro.png"),
  "mini": require("../../assets/brand-logos/mini.png"),
  "minsk": require("../../assets/brand-logos/minsk.png"),
  "mirage": require("../../assets/brand-logos/mirage.png"),
  "mitsubishi": require("../../assets/brand-logos/mitsubishi.png"),
  "mobylette": require("../../assets/brand-logos/mobylette.png"),
  "modenas": require("../../assets/brand-logos/modenas.png"),
  "mondial": require("../../assets/brand-logos/mondial.png"),
  "monero": require("../../assets/brand-logos/monero.png"),
  "morgan": require("../../assets/brand-logos/morgan.png"),
  "moskwitsch": require("../../assets/brand-logos/moskwitsch.png"),
  "motard": require("../../assets/brand-logos/motard.png"),
  "moto-gusto": require("../../assets/brand-logos/moto-gusto.png"),
  "moto-guzzi": require("../../assets/brand-logos/moto-guzzi.png"),
  "moto-morini": require("../../assets/brand-logos/moto-morini.png"),
  "moto-zeen": require("../../assets/brand-logos/moto-zeen.png"),
  "moto-zeta": require("../../assets/brand-logos/moto-zeta.png"),
  "motobecane": require("../../assets/brand-logos/motobecane.png"),
  "motolux": require("../../assets/brand-logos/motolux.png"),
  "motoran": require("../../assets/brand-logos/motoran.png"),
  "motosan": require("../../assets/brand-logos/motosan.png"),
  "motozeus": require("../../assets/brand-logos/motozeus.png"),
  "motti": require("../../assets/brand-logos/motti.png"),
  "muravey": require("../../assets/brand-logos/muravey.png"),
  "musatti": require("../../assets/brand-logos/musatti.png"),
  "mutt": require("../../assets/brand-logos/mutt.png"),
  "mv-agusta": require("../../assets/brand-logos/mv-agusta.png"),
  "mz": require("../../assets/brand-logos/mz.png"),
  "nanok": require("../../assets/brand-logos/nanok.png"),
  "nibbi": require("../../assets/brand-logos/nibbi.png"),
  "nieve": require("../../assets/brand-logos/nieve.png"),
  "nimizi-borelli": require("../../assets/brand-logos/nimizi-borelli.png"),
  "nissan": require("../../assets/brand-logos/nissan.png"),
  "norton": require("../../assets/brand-logos/norton.png"),
  "nova": require("../../assets/brand-logos/nova.png"),
  "nsu": require("../../assets/brand-logos/nsu.png"),
  "ocherk": require("../../assets/brand-logos/ocherk.png"),
  "ohvale": require("../../assets/brand-logos/ohvale.png"),
  "oldsmobile": require("../../assets/brand-logos/oldsmobile.png"),
  "omi": require("../../assets/brand-logos/omi.png"),
  "omoda": require("../../assets/brand-logos/omoda.png"),
  "opel": require("../../assets/brand-logos/opel.png"),
  "orti": require("../../assets/brand-logos/orti.png"),
  "ortimobil": require("../../assets/brand-logos/ortimobil.png"),
  "otokar": require("../../assets/brand-logos/otokar.png"),
  "oubao": require("../../assets/brand-logos/oubao.png"),
  "oxobike": require("../../assets/brand-logos/oxobike.png"),
  "pagani": require("../../assets/brand-logos/pagani.png"),
  "peugeot": require("../../assets/brand-logos/peugeot.png"),
  "pgo": require("../../assets/brand-logos/pgo.png"),
  "piaggio": require("../../assets/brand-logos/piaggio.png"),
  "pioneer": require("../../assets/brand-logos/pioneer.png"),
  "planet": require("../../assets/brand-logos/planet.png"),
  "plymouth": require("../../assets/brand-logos/plymouth.png"),
  "polaris": require("../../assets/brand-logos/polaris.png"),
  "polestar": require("../../assets/brand-logos/polestar.png"),
  "polini": require("../../assets/brand-logos/polini.png"),
  "pontiac": require("../../assets/brand-logos/pontiac.png"),
  "porsche": require("../../assets/brand-logos/porsche.png"),
  "presto": require("../../assets/brand-logos/presto.png"),
  "proton": require("../../assets/brand-logos/proton.png"),
  "puch": require("../../assets/brand-logos/puch.png"),
  "qjmotor": require("../../assets/brand-logos/qjmotor.png"),
  "qooder": require("../../assets/brand-logos/qooder.png"),
  "qstrong": require("../../assets/brand-logos/qstrong.png"),
  "rainwoll": require("../../assets/brand-logos/rainwoll.png"),
  "ramex": require("../../assets/brand-logos/ramex.png"),
  "ramzey": require("../../assets/brand-logos/ramzey.png"),
  "rasler": require("../../assets/brand-logos/rasler.png"),
  "reeder": require("../../assets/brand-logos/reeder.png"),
  "regal-raptor": require("../../assets/brand-logos/regal-raptor.png"),
  "relive": require("../../assets/brand-logos/relive.png"),
  "renault": require("../../assets/brand-logos/renault.png"),
  "renda": require("../../assets/brand-logos/renda.png"),
  "revolt": require("../../assets/brand-logos/revolt.png"),
  "rewaco": require("../../assets/brand-logos/rewaco.png"),
  "rialli": require("../../assets/brand-logos/rialli.png"),
  "rieju": require("../../assets/brand-logos/rieju.png"),
  "rkn": require("../../assets/brand-logos/rkn.png"),
  "rks": require("../../assets/brand-logos/rks.png"),
  "rmg-moto-gusto": require("../../assets/brand-logos/rmg-moto-gusto.png"),
  "rolls-royce": require("../../assets/brand-logos/rolls-royce.png"),
  "romet": require("../../assets/brand-logos/romet.png"),
  "rover": require("../../assets/brand-logos/rover.png"),
  "royal-alloy": require("../../assets/brand-logos/royal-alloy.png"),
  "royal-enfield": require("../../assets/brand-logos/royal-enfield.png"),
  "rutec": require("../../assets/brand-logos/rutec.png"),
  "saab": require("../../assets/brand-logos/saab.png"),
  "salcano": require("../../assets/brand-logos/salcano.png"),
  "sam-motor": require("../../assets/brand-logos/sam-motor.png"),
  "scorpa": require("../../assets/brand-logos/scorpa.png"),
  "seat": require("../../assets/brand-logos/seat.png"),
  "seger": require("../../assets/brand-logos/seger.png"),
  "seres": require("../../assets/brand-logos/seres.png"),
  "sfm": require("../../assets/brand-logos/sfm.png"),
  "shenke": require("../../assets/brand-logos/shenke.png"),
  "sherco": require("../../assets/brand-logos/sherco.png"),
  "shinari": require("../../assets/brand-logos/shinari.png"),
  "simson": require("../../assets/brand-logos/simson.png"),
  "ski-doo": require("../../assets/brand-logos/ski-doo.png"),
  "skoda": require("../../assets/brand-logos/skoda.png"),
  "skygo": require("../../assets/brand-logos/skygo.png"),
  "skyjet": require("../../assets/brand-logos/skyjet.png"),
  "skyteam": require("../../assets/brand-logos/skyteam.png"),
  "skywell": require("../../assets/brand-logos/skywell.png"),
  "smart": require("../../assets/brand-logos/smart.png"),
  "spada": require("../../assets/brand-logos/spada.png"),
  "ssangyong": require("../../assets/brand-logos/ssangyong.png"),
  "stmax": require("../../assets/brand-logos/stmax.png"),
  "subaru": require("../../assets/brand-logos/subaru.png"),
  "sukida": require("../../assets/brand-logos/sukida.png"),
  "superking": require("../../assets/brand-logos/superking.png"),
  "suzuki": require("../../assets/brand-logos/suzuki.png"),
  "swm": require("../../assets/brand-logos/swm.png"),
  "sym": require("../../assets/brand-logos/sym.png"),
  "takashi": require("../../assets/brand-logos/takashi.png"),
  "taktas-motor": require("../../assets/brand-logos/taktas-motor.png"),
  "taro": require("../../assets/brand-logos/taro.png"),
  "tata": require("../../assets/brand-logos/tata.png"),
  "telstar": require("../../assets/brand-logos/telstar.png"),
  "temsa": require("../../assets/brand-logos/temsa.png"),
  "tenax": require("../../assets/brand-logos/tenax.png"),
  "tesla": require("../../assets/brand-logos/tesla.png"),
  "tgb": require("../../assets/brand-logos/tgb.png"),
  "the-london-taxi": require("../../assets/brand-logos/the-london-taxi.png"),
  "titan": require("../../assets/brand-logos/titan.png"),
  "tm": require("../../assets/brand-logos/tm.png"),
  "tm-racing": require("../../assets/brand-logos/tm-racing.png"),
  "togg": require("../../assets/brand-logos/togg.png"),
  "togo": require("../../assets/brand-logos/togo.png"),
  "toyota": require("../../assets/brand-logos/toyota.png"),
  "triumph": require("../../assets/brand-logos/triumph.png"),
  "tt": require("../../assets/brand-logos/tt.png"),
  "tvs": require("../../assets/brand-logos/tvs.png"),
  "ugursam": require("../../assets/brand-logos/ugursam.png"),
  "um": require("../../assets/brand-logos/um.png"),
  "ural": require("../../assets/brand-logos/ural.png"),
  "vanderhall": require("../../assets/brand-logos/vanderhall.png"),
  "velosolex": require("../../assets/brand-logos/velosolex.png"),
  "vespa": require("../../assets/brand-logos/vespa.png"),
  "victory": require("../../assets/brand-logos/victory.png"),
  "vitello": require("../../assets/brand-logos/vitello.png"),
  "voge": require("../../assets/brand-logos/voge.png"),
  "volkswagen": require("../../assets/brand-logos/volkswagen.png"),
  "volta": require("../../assets/brand-logos/volta.png"),
  "volvo": require("../../assets/brand-logos/volvo.png"),
  "voyah": require("../../assets/brand-logos/voyah.png"),
  "wangye": require("../../assets/brand-logos/wangye.png"),
  "wsk": require("../../assets/brand-logos/wsk.png"),
  "wuxi": require("../../assets/brand-logos/wuxi.png"),
  "xev": require("../../assets/brand-logos/xev.png"),
  "xgjao": require("../../assets/brand-logos/xgjao.png"),
  "xingyue": require("../../assets/brand-logos/xingyue.png"),
  "xintian": require("../../assets/brand-logos/xintian.png"),
  "yamaha": require("../../assets/brand-logos/yamaha.png"),
  "yiben": require("../../assets/brand-logos/yiben.png"),
  "yuan": require("../../assets/brand-logos/yuan.png"),
  "yudo": require("../../assets/brand-logos/yudo.png"),
  "yuki": require("../../assets/brand-logos/yuki.png"),
  "zealsun": require("../../assets/brand-logos/zealsun.png"),
  "zongshen": require("../../assets/brand-logos/zongshen.png"),
  "zontes": require("../../assets/brand-logos/zontes.png"),
  "zorro": require("../../assets/brand-logos/zorro.png"),
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
