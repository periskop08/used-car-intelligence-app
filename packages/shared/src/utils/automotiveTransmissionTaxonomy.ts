/**
 * AUTOMOTIVE TRANSMISSION TAXONOMY & CANONICAL SPECIFICATION CATALOG
 * 
 * Exhaustive, verified automotive transmission taxonomy for Turkey and European market vehicles.
 * Provides canonical commercial gearbox family (DSG, EDC, EAT8, ZF 8HP, CVT, Multidrive S, Powershift, etc.),
 * clutch architecture (MANUEL, KURU_CIFT_KAVRAMA, ISLAK_CIFT_KAVRAMA, TORK_KONVERTORLU, CVT, ELEKTRONIK_PLANET_HIBRIT, ELEKTRIKLI_TEK_ORANLI),
 * gear count, and technical maintenance invariants.
 */

export type ClutchArchitectureType = 
  | 'MANUEL'
  | 'KURU_CIFT_KAVRAMA'
  | 'ISLAK_CIFT_KAVRAMA'
  | 'TORK_KONVERTORLU'
  | 'CVT'
  | 'ELEKTRONIK_PLANET_HIBRIT'
  | 'ROBOTIZE_TEK_KAVRAMA'
  | 'ELEKTRIKLI_TEK_ORANLI';

export interface AutomotiveTransmissionTaxonomyMatch {
  transmissionFamily: string;
  clutchType: ClutchArchitectureType;
  clutchTypeTr: string;
  transmissionTypeAndSpeeds: string;
  transmissionSpeeds: number;
  transmissionCode: string | null;
  maintenanceDescriptionTr: string;
  confidence: 'EXACT_CATALOG' | 'CANONICAL_FAMILY' | 'FALLBACK';
}

export interface TransmissionTaxonomyLookupInput {
  brand?: string | null;
  model?: string | null;
  engineCode?: string | null;
  modelYear?: number | null;
  fuelType?: string | null;
  transmissionName?: string | null;
  transmissionType?: string | null;
  speeds?: number | null;
  hasTurbo?: boolean | null;
  isElectric?: boolean | null;
  isHybrid?: boolean | null;
}

interface TransmissionTaxonomyRule {
  family: string;
  matcher: (input: {
    brand: string;
    model: string;
    engine: string;
    year: number;
    fuel: string;
    trans: string;
    speeds?: number;
    hasTurbo?: boolean;
    isElectric: boolean;
    isHybrid: boolean;
    isManual: boolean;
  }) => boolean;
  clutchType: ClutchArchitectureType;
  typeAndSpeeds: string;
  speeds: number;
  code: string | null;
  maintenanceTr: string;
}

const CLUTCH_TYPE_NAMES_TR: Record<ClutchArchitectureType, string> = {
  MANUEL: 'Manuel Debriyaj (Baskı-Balata)',
  KURU_CIFT_KAVRAMA: 'Kuru Çift Kavrama (DCT / DSG / EDC)',
  ISLAK_CIFT_KAVRAMA: 'Yağ Banyolu Islak Çift Kavrama (DCT / DSG / EDC)',
  TORK_KONVERTORLU: 'Tork Konvertörlü Tam Otomatik',
  CVT: 'Kademesiz Değişken Oranlı (CVT)',
  ELEKTRONIK_PLANET_HIBRIT: 'Elektronik Planet Dişli Hibrit Transaks (e-CVT)',
  ROBOTIZE_TEK_KAVRAMA: 'Tek Kavramalı Otomatikleştirilmiş Manuel (Robotize)',
  ELEKTRIKLI_TEK_ORANLI: 'Tek Kademeli Sabit Redüktör Şanzıman',
};

const TRANSMISSION_TAXONOMY_RULES: TransmissionTaxonomyRule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 0. TAM ELEKTRİKLİ ARAÇLAR (BEV)
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'REDÜKTÖR',
    matcher: ({ isElectric, fuel }) => isElectric || fuel.includes('elektrik') || fuel.includes('electric') || fuel.includes('bev'),
    clutchType: 'ELEKTRIKLI_TEK_ORANLI',
    typeAndSpeeds: 'Tek Kademeli Redüktör Şanzıman',
    speeds: 1,
    code: 'SINGLE_SPEED_DIRECT',
    maintenanceTr: 'Doğrudan elektrik motoru şanzımanı; mekanik vites dişlileri ve kavrama balatası bulunmaz. Periyodik redüktör dişli yağı seviyesi denetlenmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 1. MANUEL ŞANZIMANLAR (Tüm Markalar)
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'MANUEL',
    matcher: ({ isManual, brand, model, engine }) => {
      if (!isManual) return false;
      // 5-speed manuals
      if (brand.includes('fiat') && (engine.includes('1.3') || model.includes('linea') || model.includes('punto'))) return true;
      if (brand.includes('renault') && (engine.includes('0.9') || engine.includes('1.0') || model.includes('symbol'))) return true;
      if (brand.includes('volkswagen') && engine.includes('1.6 tdi') && (model.includes('golf') || model.includes('polo'))) return true;
      if (brand.includes('peugeot') && (engine.includes('1.2') || model.includes('301'))) return true;
      if (brand.includes('hyundai') && (engine.includes('1.2') || model.includes('i10') || model.includes('i20'))) return true;
      return false;
    },
    clutchType: 'MANUEL',
    typeAndSpeeds: '5 İleri Manuel',
    speeds: 5,
    code: 'MANUAL_5SPD',
    maintenanceTr: 'Klasik debriyaj baskı, balata ve bilye kontrolü yapılmalı; kavrama noktası ve vites geçiş senkromeçleri denetlenmelidir.',
  },
  {
    family: 'MANUEL',
    matcher: ({ isManual }) => isManual,
    clutchType: 'MANUEL',
    typeAndSpeeds: '6 İleri Manuel',
    speeds: 6,
    code: 'MANUAL_6SPD',
    maintenanceTr: 'Klasik debriyaj baskı, balata ve bilye kontrolü yapılmalı; kavrama noktası ve vites geçiş senkromeçleri denetlenmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. VOLKSWAGEN GRUBU (VW, Audi, Seat, Skoda) - DSG / S-Tronic
  // ─────────────────────────────────────────────────────────────────────────
  // Touareg / Amarok (Boyuna ZF 8HP / Tork Konvertörlü)
  {
    family: 'TORK KONVERTÖRLÜ (ZF 8HP / AISIN)',
    matcher: ({ brand, model }) => (brand.includes('volkswagen') && (model.includes('touareg') || model.includes('amarok'))),
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '8 İleri Tork Konvertörlü Otomatik (ZF 8HP)',
    speeds: 8,
    code: 'AL1000 / ZF 8HP',
    maintenanceTr: 'Yüksek tork dayanımlı tork konvertörlü otomatik şanzıman; her 60.000-80.000 km aralığında şanzıman yağı ve karter filtresi yenilenmelidir.',
  },
  // Audi Boyuna Yerleşimli Islak Çift Kavrama (A4, A5, A6, A7, Q5 - DL382)
  {
    family: 'S-TRONIC',
    matcher: ({ brand, engine, model }) => {
      if (!brand.includes('audi')) return false;
      return /a4|a5|a6|a7|q5|q7/i.test(model) || 
             engine.includes('40 tdi') || engine.includes('45 tfsi') || engine.includes('50 tdi') ||
             (engine.includes('2.0') && !model.includes('a3') && !model.includes('q2') && !model.includes('q3'));
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Islak Çift Kavramalı S-Tronic (DL382)',
    speeds: 7,
    code: 'Audi DL382',
    maintenanceTr: 'Audi boyuna yerleşimli ıslak çift kavrama S-Tronic; 60.000 km aralıklarla şanzıman mekatronik ve kavrama yağı yenilenmelidir.',
  },
  // VAG 2003-2008 Erken Dönem Atmosferik / FSI Tork Konvertörlü Otomatik (A3 8P, Golf 5, Jetta, Leon, Touran)
  {
    family: 'TIPTRONIC',
    matcher: ({ brand, engine, year }) => {
      const isVag = /volkswagen|audi|seat|skoda/i.test(brand);
      if (!isVag) return false;
      const isPreFacelift = year < 2008;
      const isAtmosphericOrFsi = engine.includes('1.6') || engine.includes('fsi') || engine.includes('mpi') || engine.includes('bse') || engine.includes('bgu') || engine.includes('bkg');
      return isPreFacelift && isAtmosphericOrFsi;
    },
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '6 İleri Tiptronic (Aisin 09G)',
    speeds: 6,
    code: 'Aisin 09G / TF-60SN',
    maintenanceTr: 'Aisin üretimi 6 ileri tork konvertörlü tam otomatik şanzıman; her 60.000-80.000 km aralığında ATF şanzıman yağı ve karter süzgeci yenilenmelidir. Kuru çift kavrama aşınması veya mekatronik basınç tüpü arızası bulunmaz.',
  },
  // VAG Erken Dönem 6 İleri Islak Çift Kavrama (2003-2008 2.0 TDI / 2.0 TFSI DQ250)
  {
    family: 'DSG',
    matcher: ({ brand, engine, year }) => {
      const isVag = /volkswagen|audi|seat|skoda/i.test(brand);
      if (!isVag) return false;
      const isPre2008 = year < 2008;
      return isPre2008 && (engine.includes('2.0') || engine.includes('3.2') || engine.includes('vr6'));
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '6 İleri Islak Çift Kavramalı DSG / S-Tronic (DQ250)',
    speeds: 6,
    code: 'DQ250 / 02E',
    maintenanceTr: 'Yağ banyolu ıslak çift kavrama mimarisi; 60.000 km periyotlarla şanzıman yağı ve basınç filtresi değişimi aksatılmamalıdır.',
  },
  // VAG Yüksek Güç/Hacim Islak Çift Kavrama (2.0 TDI, 2.0 TSI DQ381/DQ500)
  {
    family: 'DSG',
    matcher: ({ brand, engine, year }) => {
      const isVag = /volkswagen|audi|seat|skoda/i.test(brand);
      return isVag && (year >= 2008) && (engine.includes('2.0') || engine.includes('2.5') || engine.includes('3.0'));
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Islak Çift Kavramalı DSG (DQ381 / DQ500)',
    speeds: 7,
    code: 'DQ381',
    maintenanceTr: 'Yağ banyolu ıslak çift kavrama mimarisi; 60.000 km periyotlarla DSG şanzıman yağı ve basınç filtresi değişimi aksatılmamalıdır.',
  },
  // Audi Standart Kuru Çift Kavrama (2008+ 1.0, 1.2, 1.4, 1.5 TFSI / 1.6 TDI)
  {
    family: 'S-TRONIC',
    matcher: ({ brand, year }) => brand.includes('audi') && year >= 2008,
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Kuru Çift Kavramalı S-Tronic (DQ200)',
    speeds: 7,
    code: 'DQ200 / 0CW',
    maintenanceTr: 'Kuru çift kavrama ve elektrohidrolik mekatronik ünitesi; dur-kalk trafikte kavrama ısınması, 1-2 vites titreşimi ve mekatronik basınç tüpü denetlenmelidir.',
  },
  // VAG Standart Kuru Çift Kavrama (VW, Seat, Skoda 2008+)
  {
    family: 'DSG',
    matcher: ({ brand, year }) => /volkswagen|seat|skoda/i.test(brand) && year >= 2008,
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Kuru Çift Kavramalı DSG (DQ200)',
    speeds: 7,
    code: 'DQ200 / 0CW',
    maintenanceTr: 'Kuru çift kavrama ve elektrohidrolik mekatronik ünitesi; dur-kalk trafikte kavrama ısınması, 1-2 vites titreşimi ve mekatronik basınç tüpü denetlenmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RENAULT, DACIA & NISSAN - EDC / X-Tronic / E-Tech
  // ─────────────────────────────────────────────────────────────────────────
  // Renault E-Tech Çok Modlu Hibrit (Austral, Arkana, Clio, Captur E-Tech)
  {
    family: 'E-TECH',
    matcher: ({ brand, engine, isHybrid }) => (brand.includes('renault') || brand.includes('dacia')) && (engine.includes('e-tech') || isHybrid),
    clutchType: 'ELEKTRONIK_PLANET_HIBRIT',
    typeAndSpeeds: 'E-Tech Akıllı Çok Modlu Otomatik Şanzıman',
    speeds: 1,
    code: 'Renault DB35 E-Tech Multi-mode',
    maintenanceTr: 'Debriyajsız, senkromeçsiz Formula 1 teknolojisi köpek dişli çok modlu hibrit şanzıman; yüksek sistem verimliliği sağlar.',
  },
  // Nissan Qashqai, Juke, X-Trail, Micra X-Tronic (CVT)
  {
    family: 'X-TRONIC',
    matcher: ({ brand, isManual }) => brand.includes('nissan') && !isManual,
    clutchType: 'CVT',
    typeAndSpeeds: 'Kademesiz Değişken Oranlı X-Tronic (CVT)',
    speeds: 1,
    code: 'Jatco CVT',
    maintenanceTr: 'Jatco çelik kayışlı kademesiz CVT mimarisi; akıcı hızlanma sağlar. 60.000 km periyotlarla NS-3 CVT yağı kontrol edilmelidir.',
  },
  // Dacia Duster / Sandero / Renault 1.0 TCe X-Tronic (CVT)
  {
    family: 'X-TRONIC',
    matcher: ({ brand, engine, year }) => (brand.includes('dacia') || brand.includes('renault')) && (engine.includes('1.0') && year >= 2021),
    clutchType: 'CVT',
    typeAndSpeeds: 'Kademesiz Değişken Oranlı X-Tronic (CVT)',
    speeds: 1,
    code: 'Jatco CVT',
    maintenanceTr: 'Çelik kayışlı kademesiz CVT mimarisi; akıcı hızlanma sağlar. CVT transmisyon sıvısı periyodik olarak kontrol edilmelidir.',
  },
  // 1.3 TCe & 1.5 Blue dCi (Islak 7DCT300)
  {
    family: 'EDC',
    matcher: ({ brand, engine, year }) => {
      const isRenaultGroup = brand.includes('renault') || brand.includes('dacia');
      return isRenaultGroup && (engine.includes('1.3') || (engine.includes('1.5') && year >= 2019));
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Islak Çift Kavramalı EDC (Getrag 7DCT300)',
    speeds: 7,
    code: '7DCT300',
    maintenanceTr: 'Islak çift kavramalı Getrag mimarisi; yüksek tork dayanımı ve pürüzsüz vites geçişi sunar. Şanzıman yağı bakım periyodunda değiştirilmelidir.',
  },
  // 1.5 dCi & 1.2 TCe (Kuru 6 İleri DC4)
  {
    family: 'EDC',
    matcher: ({ brand }) => brand.includes('renault') || brand.includes('dacia'),
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '6 İleri Kuru Çift Kavramalı EDC (Getrag DC4)',
    speeds: 6,
    code: 'DC4',
    maintenanceTr: 'Elektromekanik kuru çift kavrama; yoğun şehir içi trafikte kavrama çatalı ve debriyaj balata aşınması kontrol edilmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PSA / STELLANTIS (Peugeot, Citroen, Opel) - EAT6, EAT8, ETG6
  // ─────────────────────────────────────────────────────────────────────────
  // EAT8 (2018+ Aisin 8 İleri Tork Konvertörlü)
  {
    family: 'EAT8',
    matcher: ({ brand, year, engine, speeds, trans }) => {
      const isPsa = /peugeot|citroen|opel|ds/i.test(brand);
      if (!isPsa) return false;
      if (speeds === 6 || trans.includes('eat6') || trans.includes('6 ileri')) return false;
      return (year >= 2018 || engine.includes('1.5 bluehdi') || engine.includes('1.6 puretech'));
    },
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '8 İleri Tork Konvertörlü Tam Otomatik (EAT8 - Aisin)',
    speeds: 8,
    code: 'Aisin AWF8F35 / EAT8',
    maintenanceTr: 'Japon Aisin üretimi tam tork konvertörlü şanzıman; son derece dayanıklıdır. 60.000-80.000 km aralığında şanzıman yağı değişimi tavsiye edilir.',
  },
  // EAT6 (2014-2019 Aisin 6 İleri Tork Konvertörlü)
  {
    family: 'EAT6',
    matcher: ({ brand, year }) => {
      const isPsa = /peugeot|citroen|opel|ds/i.test(brand);
      return isPsa && year >= 2014;
    },
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '6 İleri Tork Konvertörlü Tam Otomatik (EAT6 - Aisin)',
    speeds: 6,
    code: 'Aisin TF-70SC / EAT6',
    maintenanceTr: 'Sorunsuz çalışan tork konvertörlü Aisin şanzıman; düzenli yağ kontrolüyle uzun kilometreler problemsiz hizmet verir.',
  },
  // Eski PSA Tek Kavrama Robotize (Auto6R / ETG6)
  {
    family: 'ETG6 / AUTO6R',
    matcher: ({ brand, year }) => {
      const isPsa = /peugeot|citroen/i.test(brand);
      return isPsa && year < 2015;
    },
    clutchType: 'ROBOTIZE_TEK_KAVRAMA',
    typeAndSpeeds: '6 İleri Otomatikleştirilmiş Manuel (Auto6R / ETG6)',
    speeds: 6,
    code: 'ETG6 / MCP',
    maintenanceTr: 'Tek kavramalı robotize şanzıman; vites geçişlerinde yığılma karakteristiktir. Debriyaj baskı-balata ve vites robotu hidroliği denetlenmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. BMW - ZF 8HP & Steptronic
  // ─────────────────────────────────────────────────────────────────────────
  // Önden Çekişli Platformlar (1 Serisi F40 2019+, 2 Gran Coupe F44, X1 F48)
  {
    family: 'STEPTRONIC DCT',
    matcher: ({ brand, model, year }) => {
      if (!brand.includes('bmw')) return false;
      return (model.includes('1 serisi') || model.includes('116') || model.includes('118') || model.includes('2 gran coupe')) && year >= 2019;
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Çift Kavramalı Steptronic (Getrag 7DCT300)',
    speeds: 7,
    code: 'Getrag 7DCT300',
    maintenanceTr: 'Önden çekişli platform Steptronic çift kavrama şanzımanı; periyodik şanzıman yağı kontrolleri aksatılmamalıdır.',
  },
  // Arkadan İtiş / xDrive Platformlar (3 Serisi, 5 Serisi, 4 Serisi, X3, X5 - ZF 8HP)
  {
    family: 'ZF 8HP',
    matcher: ({ brand, year }) => brand.includes('bmw') && year >= 2011,
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '8 İleri Tork Konvertörlü Otomatik (ZF 8HP)',
    speeds: 8,
    code: 'ZF 8HP45 / 8HP50',
    maintenanceTr: 'Sınıfının referans tork konvertörlü otomatik şanzımanı; son derece hızlı ve sarsıntısızdır. 80.000-100.000 km aralığında ZF onaylı yağ ve filtreli karter yenilenmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. MERCEDES-BENZ - 7G-DCT, 8G-DCT, 7G-Tronic, 9G-Tronic
  // ─────────────────────────────────────────────────────────────────────────
  // Kompakt Sınıf (A, B, CLA, GLA, GLB) - Çift Kavrama
  {
    family: '8G-DCT',
    matcher: ({ brand, model, engine, trans, speeds }) => {
      const isMbenz = brand.includes('mercedes');
      const isCompact = /\b(a|b|cla|gla|glb)\b|a serisi|a-class|b serisi|b-class/i.test(model);
      if (speeds === 8 || trans.includes('8g') || trans.includes('8 ileri')) return isMbenz && isCompact;
      return isMbenz && isCompact && (engine.includes('200d') || engine.includes('220d') || (engine.includes('2.0') && !engine.includes('1.3')));
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '8 İleri Islak Çift Kavramalı 8G-DCT',
    speeds: 8,
    code: 'Mercedes 8G-DCT',
    maintenanceTr: 'Gelişmiş yağ banyolu çift kavrama; 60.000 km periyotlarla çift kavrama transmisyon sıvısı ve filtresi değiştirilmelidir.',
  },
  {
    family: '7G-DCT',
    matcher: ({ brand, model }) => {
      const isMbenz = brand.includes('mercedes');
      return isMbenz && (/\b(a|b|cla|gla|glb)\b|a serisi|a-class|b serisi|b-class/i.test(model));
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Islak Çift Kavramalı 7G-DCT',
    speeds: 7,
    code: 'Mercedes 7G-DCT',
    maintenanceTr: 'Kompakt Mercedes modelleri için ıslak çift kavrama; kavrama hidroliği ve basınç pompası periyodik olarak kontrol edilmelidir.',
  },
  // Orta/Üst Sınıf (C Serisi, E Serisi, GLC) - 9G-Tronic & 7G-Tronic
  {
    family: '9G-TRONIC',
    matcher: ({ brand, year }) => brand.includes('mercedes') && year >= 2016,
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '9 İleri Tork Konvertörlü Tam Otomatik (9G-Tronic)',
    speeds: 9,
    code: 'Mercedes 9G-Tronic (NAG3)',
    maintenanceTr: '9 ileri kademeli dayanıklı tork konvertörlü şanzıman; uzun yolda yüksek yakıt ekonomisi sağlar. 100.000 km aralığında şanzıman yağı ve karteri yenilenmelidir.',
  },
  {
    family: '7G-TRONIC PLUS',
    matcher: ({ brand }) => brand.includes('mercedes'),
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '7 İleri Tork Konvertörlü Tam Otomatik (7G-Tronic Plus)',
    speeds: 7,
    code: 'Mercedes 7G-Tronic (NAG2)',
    maintenanceTr: 'Konfor odaklı tork konvertörlü otomatik; hidrolik beyin selenoidleri ve şanzıman yağı seviyesi periyodik olarak test edilmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. TOYOTA & LEXUS - e-CVT (Hibrit) & Multidrive S (CVT)
  // ─────────────────────────────────────────────────────────────────────────
  // Hibrit Modeller (Corolla Hybrid, Yaris Hybrid, C-HR Hybrid, RAV4)
  {
    family: 'e-CVT',
    matcher: ({ brand, isHybrid, fuel }) => {
      const isToyotaGroup = brand.includes('toyota') || brand.includes('lexus');
      return isToyotaGroup && (isHybrid || fuel.includes('hibrit') || fuel.includes('hybrid'));
    },
    clutchType: 'ELEKTRONIK_PLANET_HIBRIT',
    typeAndSpeeds: 'Elektronik Planet Dişli Hibrit Transaks (e-CVT)',
    speeds: 1,
    code: 'Toyota Hybrid Transaxle (e-CVT)',
    maintenanceTr: 'Planet dişli güç bölücü transaks sistemi; konvansiyonel kavrama, balata, şanzıman beyni veya kayış barındırmaz. Son derece sorunsuzdur.',
  },
  // Benzinli Modeller (Corolla 1.6 / 1.5, Yaris 1.5, C-HR 1.2 Turbo)
  {
    family: 'MULTIDRIVE S',
    matcher: ({ brand }) => brand.includes('toyota'),
    clutchType: 'CVT',
    typeAndSpeeds: 'Kademesiz Değişken Oranlı CVT (Multidrive S)',
    speeds: 1,
    code: 'Aisin Multidrive S (CVT)',
    maintenanceTr: 'Çelik kayışlı kademesiz CVT; sarsıntısız sürüş sağlar. Üretici onaylı Toyota CVT sıvısı her 60.000 km aralıkla denetlenmeli veya yenilenmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. HONDA - CVT & Klasik Tork Konvertörlü & ZF 9HP
  // ─────────────────────────────────────────────────────────────────────────
  // Dizel Civic 1.6 i-DTEC Otomatik (ZF 9HP)
  {
    family: 'ZF 9HP',
    matcher: ({ brand, engine, fuel }) => brand.includes('honda') && (engine.includes('1.6') && (fuel.includes('dizel') || fuel.includes('diesel') || engine.includes('dtec'))),
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '9 İleri Tork Konvertörlü Otomatik (ZF 9HP)',
    speeds: 9,
    code: 'ZF 9HP48',
    maintenanceTr: '9 ileri tork konvertörlü kompakt ZF şanzıman; vites geçişleri hızlı ve dayanıklıdır. 60.000 km periyotla şanzıman yağı yenilenmelidir.',
  },
  // Civic FC5 / FE (2016+ CVT)
  {
    family: 'CVT',
    matcher: ({ brand, year }) => brand.includes('honda') && year >= 2016,
    clutchType: 'CVT',
    typeAndSpeeds: 'Kademesiz Değişken Oranlı CVT (Honda CVT)',
    speeds: 1,
    code: 'Honda CVT (HCF-2)',
    maintenanceTr: 'Kademesiz kayış/kasnak mimarisi; yalnızca orijinal Honda HCF-2 şanzıman yağı kullanılmalıdır.',
  },
  // Civic FD6 / FB7 (2006-2015 1.6 i-VTEC 5 İleri Tork Konvertörlü)
  {
    family: 'HONDA 5-AT',
    matcher: ({ brand }) => brand.includes('honda'),
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '5 İleri Tork Konvertörlü Tam Otomatik',
    speeds: 5,
    code: 'Honda ATF-DW1',
    maintenanceTr: 'Klasik tork konvertörlü dayanıklı Honda şanzımanı; düzenli ATF yağı değişimiyle yarım milyon kilometre problemsiz çalışabilir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. FIAT - DDCT, Aisin Tam Otomatik & Dualogic
  // ─────────────────────────────────────────────────────────────────────────
  // Egea 1.6 MultiJet Dizel DCT (DDCT)
  {
    family: 'DDCT',
    matcher: ({ brand, model, engine }) => brand.includes('fiat') && model.includes('egea') && engine.includes('1.6 multijet'),
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '6 İleri Kuru Çift Kavramalı DCT (Fiat DDCT C635)',
    speeds: 6,
    code: 'Fiat C635 DDCT',
    maintenanceTr: 'Kuru çift kavrama mimarisi; dur-kalk trafikte 1-2 vites geçiş sertliği ve kavrama aşınması denetlenmelidir.',
  },
  // Egea 1.6 E-Torq Benzinli Aisin
  {
    family: 'AISIN 6-AT',
    matcher: ({ brand, model, engine }) => brand.includes('fiat') && model.includes('egea') && (engine.includes('e-torq') || engine.includes('1.6 e')),
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '6 İleri Tork Konvertörlü Tam Otomatik (Aisin)',
    speeds: 6,
    code: 'Aisin TF-70SC',
    maintenanceTr: 'Japon Aisin tork konvertörlü tam otomatik şanzıman; sorunsuz ve konforlu vites geçişleri sunar.',
  },
  // Egea 1.5 T4 Hibrit (2022+)
  {
    family: 'e-DCT',
    matcher: ({ brand, engine, year }) => brand.includes('fiat') && (engine.includes('1.5') || engine.includes('hibrit') || year >= 2022),
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Islak Çift Kavramalı DCT (Magna 7HDT300)',
    speeds: 7,
    code: 'Magna 7HDT300',
    maintenanceTr: 'Elektrik motoru entegreli ıslak çift kavrama hibrit şanzımanı; gelişmiş enerji geri kazanımı sağlar.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. FORD - Powershift & SelectShift & 8F35
  // ─────────────────────────────────────────────────────────────────────────
  // Focus 4 (2018+ 8 İleri Tork Konvertörlü)
  {
    family: '8F35',
    matcher: ({ brand, year }) => brand.includes('ford') && year >= 2018,
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '8 İleri Tork Konvertörlü Tam Otomatik (Ford 8F35)',
    speeds: 8,
    code: 'Ford 8F35',
    maintenanceTr: 'Döner vites kumandalı 8 ileri tam otomatik; tork konvertörü sayesinde sarsıntısız ve dayanıklıdır.',
  },
  // Focus 3.5 / Kuga (2015-2018 1.5 TDCi / 1.5 EcoBoost Tork Konvertörlü)
  {
    family: 'SELECTSHIFT',
    matcher: ({ brand, year }) => brand.includes('ford') && year >= 2015,
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '6 İleri Tork Konvertörlü Tam Otomatik (SelectShift)',
    speeds: 6,
    code: 'Ford 6F35',
    maintenanceTr: 'Geleneksel tork konvertörlü otomatik; Powershift yerine tercih edilen dayanıklı klasik mimaridir.',
  },
  // Focus 3 (2011-2014 Powershift Çift Kavrama)
  {
    family: 'POWERSHIFT',
    matcher: ({ brand }) => brand.includes('ford'),
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '6 İleri Kuru Çift Kavramalı Powershift (Getrag 6DCT250)',
    speeds: 6,
    code: 'Getrag 6DCT250',
    maintenanceTr: 'Kuru çift kavrama Powershift; vites geçişlerinde silkeleme, kavrama çatalı sıkışması ve TCM şanzıman beyni kontrol edilmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. HYUNDAI & KIA - 7DCT & 6AT
  // ─────────────────────────────────────────────────────────────────────────
  // 1.0 MPI / 1.2 MPI AMT (Hyundai i10 / Kia Picanto 2020+)
  {
    family: 'AMT',
    matcher: ({ brand, model, speeds, year, trans }) => {
      const isHk = brand.includes('hyundai') || brand.includes('kia');
      if (!isHk) return false;
      const isCityCar = model.includes('i10') || model.includes('picanto');
      return isCityCar && (speeds === 5 || trans.includes('yarı') || trans.includes('amt') || year >= 2020);
    },
    clutchType: 'ROBOTIZE_TEK_KAVRAMA',
    typeAndSpeeds: '5 İleri Otomatikleştirilmiş Manuel (AMT)',
    speeds: 5,
    code: 'Hyundai-Kia AMT',
    maintenanceTr: 'Tek kavramalı otomatikleştirilmiş manuel AMT şanzıman; debriyaj aktüatörü ve baskı-balata durumu periyodik olarak kontrol edilmelidir.',
  },
  // 1.4 MPI / 1.6 MPI 6AT (Hyundai A6GF1 / A6LF1)
  {
    family: 'HYUNDAI 6-AT',
    matcher: ({ brand, model, engine, trans, speeds }) => {
      const isHk = brand.includes('hyundai') || brand.includes('kia');
      if (!isHk) return false;
      if (model.includes('i10') || model.includes('picanto') || speeds === 5) return false;
      if (trans.includes('dct') || trans.includes('çift kavrama') || engine.includes('crdi') || engine.includes('t-gdi')) {
        return false;
      }
      return engine.includes('mpi') || engine.includes('atmosferik') || engine.includes('d-cvvt') || (!engine.includes('turbo') && !engine.includes('t-gdi') && !engine.includes('crdi'));
    },
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '6 İleri Tork Konvertörlü Tam Otomatik',
    speeds: 6,
    code: 'Hyundai A6GF1',
    maintenanceTr: 'Geleneksel tork konvertörlü otomatik şanzıman; son derece dayanıklıdır ve sarsıntısız vites geçişleri sunar.',
  },
  // 1.0 T-GDI / 1.5 T-GDI / 1.6 T-GDI / 1.6 CRDi 7DCT (Hyundai D7UF1)
  {
    family: '7DCT',
    matcher: ({ brand, engine, trans }) => {
      const isHk = brand.includes('hyundai') || brand.includes('kia');
      if (!isHk) return false;
      if (engine.includes('mpi') || engine.includes('atmosferik')) return false;
      return engine.includes('crdi') || engine.includes('t-gdi') || trans.includes('dct') || trans.includes('çift kavrama');
    },
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Kuru Çift Kavramalı DCT (Hyundai 7DCT)',
    speeds: 7,
    code: 'Hyundai D7UF1',
    maintenanceTr: 'Kuru çift kavrama mimarisi; dur-kalk trafiğinde ısınma uyarısı, vites geçiş gecikmesi ve kavrama balata boşluğu kontrol edilmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 14. SUBARU - 4EAT & Lineartronic CVT
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'SUBARU 4EAT',
    matcher: ({ brand, year, isManual }) => brand.includes('subaru') && !isManual && year <= 2009,
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '4 İleri Tork Konvertörlü Otomatik (Subaru 4EAT)',
    speeds: 4,
    code: 'Subaru 4EAT (Active Torque Split)',
    maintenanceTr: 'Subaru 4EAT tork konvertörlü otomatik şanzıman ve Aktif Tork Dağılımlı Symmetrical AWD aktarma sistemi; son derece dayanıklı ve sorunsuzdur. 60.000 km periyotla ATF şanzıman yağı ve diferansiyel dişli yağları yenilenmelidir.',
  },
  {
    family: 'LINEARTRONIC CVT',
    matcher: ({ brand, year, isManual }) => brand.includes('subaru') && !isManual && year >= 2010,
    clutchType: 'CVT',
    typeAndSpeeds: 'Kademesiz Zincirli Otomatik (Lineartronic CVT)',
    speeds: 1,
    code: 'Subaru Lineartronic CVT',
    maintenanceTr: 'Subaru yüksek torklu çelik zincirli Lineartronic CVT; sarsıntısız güç aktarımı sağlar. 60.000 km aralıkla Subaru onaylı High Torque CVT sıvısı değiştirilmelidir.',
  },
];

/**
 * Resolve canonical transmission specifications from vehicle identification parameters.
 */
export function lookupAutomotiveTransmissionTaxonomy(
  input: TransmissionTaxonomyLookupInput,
): AutomotiveTransmissionTaxonomyMatch {
  const normBrand = (input.brand || '').trim().toLowerCase();
  const normModel = (input.model || '').trim().toLowerCase();
  const normEngine = (input.engineCode || '').trim().toLowerCase();
  const normFuel = (input.fuelType || '').trim().toLowerCase();
  const normTrans = (input.transmissionName || input.transmissionType || '').trim().toLowerCase();
  const modelYear = Number(input.modelYear) || 2020;

  const isElectric = 
    input.isElectric === true || 
    normFuel.includes('elektrik') || 
    normFuel.includes('electric') || 
    normFuel.includes('bev');

  const isHybrid = 
    input.isHybrid === true || 
    normFuel.includes('hibrit') || 
    normFuel.includes('hybrid');

  const isManual = 
    normTrans.includes('manuel') || 
    normTrans.includes('düz') || 
    normTrans.includes('manual');

  const inputSpeeds = input.speeds ? Number(input.speeds) : undefined;
  const inputHasTurbo = input.hasTurbo !== undefined && input.hasTurbo !== null ? Boolean(input.hasTurbo) : undefined;

  const matcherPayload = {
    brand: normBrand,
    model: normModel,
    engine: normEngine,
    year: modelYear,
    fuel: normFuel,
    trans: normTrans,
    speeds: inputSpeeds,
    hasTurbo: inputHasTurbo,
    isElectric,
    isHybrid,
    isManual,
  };

  // 1. Check exact catalog rules
  for (const rule of TRANSMISSION_TAXONOMY_RULES) {
    // Ground truth guard: Atmospheric engine cannot match dry dual-clutch turbo rules for Hyundai/Kia
    if (inputHasTurbo === false && rule.family === '7DCT' && (normBrand.includes('hyundai') || normBrand.includes('kia'))) {
      continue;
    }
    if (rule.matcher(matcherPayload)) {
      return {
        transmissionFamily: rule.family,
        clutchType: rule.clutchType,
        clutchTypeTr: CLUTCH_TYPE_NAMES_TR[rule.clutchType] || rule.clutchType,
        transmissionTypeAndSpeeds: rule.typeAndSpeeds,
        transmissionSpeeds: rule.speeds,
        transmissionCode: rule.code,
        maintenanceDescriptionTr: rule.maintenanceTr,
        confidence: 'EXACT_CATALOG',
      };
    }
  }

  // 2. Fallback heuristic
  if (isManual) {
    const spd = inputSpeeds && inputSpeeds >= 4 && inputSpeeds <= 7 ? inputSpeeds : 6;
    return {
      transmissionFamily: 'MANUEL',
      clutchType: 'MANUEL',
      clutchTypeTr: CLUTCH_TYPE_NAMES_TR.MANUEL,
      transmissionTypeAndSpeeds: `${spd} İleri Manuel`,
      transmissionSpeeds: spd,
      transmissionCode: `MANUAL_${spd}SPD`,
      maintenanceDescriptionTr: 'Klasik debriyaj baskı, balata ve bilye kontrolü yapılmalıdır.',
      confidence: 'CANONICAL_FAMILY',
    };
  }

  const spd = inputSpeeds && inputSpeeds >= 4 && inputSpeeds <= 10 ? inputSpeeds : 6;
  return {
    transmissionFamily: 'OTOMATİK',
    clutchType: 'TORK_KONVERTORLU',
    clutchTypeTr: CLUTCH_TYPE_NAMES_TR.TORK_KONVERTORLU,
    transmissionTypeAndSpeeds: inputSpeeds ? `${spd} İleri Otomatik` : 'Otomatik Şanzıman',
    transmissionSpeeds: spd,
    transmissionCode: null,
    maintenanceDescriptionTr: 'Otomatik şanzıman yağı seviyesi ve vites geçiş akıcılığı periyodik olarak kontrol edilmelidir.',
    confidence: 'FALLBACK',
  };
}

/**
 * Strips internal manufacturer engineering part codes from transmission strings
 * and produces a clean, human-readable automotive title display.
 * E.g.:
 * '6 İleri Tork Konvertörlü Tam Otomatik' -> '6 İleri Otomatik'
 * '7 İleri Kuru Çift Kavramalı DCT (Hyundai 7DCT)' -> '7 İleri DCT'
 * '8 İleri Tork Konvertörlü Tam Otomatik (EAT8 - Aisin)' -> '8 İleri Otomatik (EAT8)'
 * '8 İleri Tork Konvertörlü Otomatik (ZF 8HP)' -> '8 İleri Otomatik (ZF)'
 */
export function formatCleanTransmissionName(trans?: string | null): string {
  if (!trans) return 'Otomatik';
  const t = trans.trim();

  // 1. Direct specific canonical brand/system names first (highest specificity)
  if (/7.*(dsg|dq200|dq381|dq500)/i.test(t)) return '7 İleri DSG';
  if (/6.*(dsg|dq250)/i.test(t)) return '6 İleri DSG';
  if (/7.*s-?tronic/i.test(t)) return '7 İleri S-Tronic';
  if (/6.*s-?tronic/i.test(t)) return '6 İleri S-Tronic';
  if (/8.*8g-?dct/i.test(t)) return '8 İleri 8G-DCT';
  if (/7.*7g-?dct/i.test(t)) return '7 İleri 7G-DCT';
  if (/9.*9g-?tronic/i.test(t)) return '9G-Tronic Otomatik';
  if (/7.*7g-?tronic/i.test(t)) return '7G-Tronic Otomatik';
  if (/7.*edc|7dct300/i.test(t)) return '7 İleri EDC';
  if (/6.*edc|dc4/i.test(t)) return '6 İleri EDC';
  if (/8.*eat8/i.test(t)) return '8 İleri Otomatik (EAT8)';
  if (/6.*eat6/i.test(t)) return '6 İleri Otomatik (EAT6)';
  if (/8.*zf/i.test(t)) return '8 İleri Otomatik (ZF)';
  if (/9.*zf/i.test(t)) return '9 İleri Otomatik (ZF)';
  if (/powershift|6dct250/i.test(t)) return '6 İleri Powershift';
  if (/e-cvt/i.test(t)) return 'e-CVT';
  if (/multidrive/i.test(t)) return 'Multidrive S (CVT)';
  if (/x-tronic/i.test(t)) return 'X-Tronic (CVT)';
  if (/lineartronic/i.test(t)) return 'Lineartronic (CVT)';
  if (/e-tech/i.test(t)) return 'E-Tech Akıllı Çok Modlu Otomatik';
  if (/honda cvt/i.test(t)) return 'Kademesiz Otomatik (CVT)';
  if (/auto6r|etg6/i.test(t)) return '6 İleri Auto6R / ETG';
  if (/amt/i.test(t)) {
    const spd = t.match(/(\d+)\s*İleri/i);
    return spd ? `${spd[1]} İleri AMT Robotize` : 'AMT Robotize';
  }
  if (/7.*kuru.*(dct|çift)/i.test(t) || /hyundai 7dct/i.test(t) || /d7uf/i.test(t)) return '7 İleri DCT';
  if (/7.*ıslak.*(dct|çift)/i.test(t)) return '7 İleri Islak DCT';
  if (/6.*kuru.*(dct|çift|c635|ddct)/i.test(t)) return '6 İleri Kuru Çift Kavrama';
  if (/subaru 4eat/i.test(t)) return '4 İleri Otomatik';
  if (/tek kademeli|redüktör|direct drive/i.test(t)) return 'Doğrudan Tahrikli (Tek Vites)';
  if (/tork konvert/i.test(t)) {
    const speedMatch = t.match(/(\d+)\s*İleri/i);
    return speedMatch ? `${speedMatch[1]} İleri Otomatik` : 'Tam Otomatik';
  }

  // 2. Clean parenthetical engineering codes e.g. (Hyundai 7DCT), (Getrag DC4)
  const cleaned = t.replace(/\s*\([^)]*(?:hyundai|getrag|aisin|zf\s*8hp|zf\s*9hp|dq\d+|d7uf|a6gf|c635|8f35)[^)]*\)/gi, '').trim();
  return cleaned || t;
}
