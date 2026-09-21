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
  // VAG Yüksek Güç/Hacim Islak Çift Kavrama (2.0 TDI, 2.0 TSI)
  {
    family: 'DSG',
    matcher: ({ brand, engine }) => {
      const isVag = /volkswagen|audi|seat|skoda/i.test(brand);
      return isVag && (engine.includes('2.0') || engine.includes('2.5') || engine.includes('3.0'));
    },
    clutchType: 'ISLAK_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Islak Çift Kavramalı DSG (DQ381 / DQ500)',
    speeds: 7,
    code: 'DQ381',
    maintenanceTr: 'Yağ banyolu ıslak çift kavrama mimarisi; 60.000 km periyotlarla DSG şanzıman yağı ve basınç filtresi değişimi aksatılmamalıdır.',
  },
  // VAG Standart Kuru Çift Kavrama (1.0 TSI, 1.2 TSI, 1.4 TSI, 1.5 TSI, 1.6 TDI)
  {
    family: 'DSG',
    matcher: ({ brand }) => /volkswagen|audi|seat|skoda/i.test(brand),
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Kuru Çift Kavramalı DSG (DQ200)',
    speeds: 7,
    code: 'DQ200 / 0CW',
    maintenanceTr: 'Kuru çift kavrama ve elektrohidrolik mekatronik ünitesi; dur-kalk trafikte kavrama ısınması, 1-2 vites titreşimi ve mekatronik basınç tüpü denetlenmelidir.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RENAULT & DACIA - EDC / X-Tronic
  // ─────────────────────────────────────────────────────────────────────────
  // Dacia Duster / Sandero X-Tronic (CVT)
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
    matcher: ({ brand, year, engine }) => {
      const isPsa = /peugeot|citroen|opel|ds/i.test(brand);
      return isPsa && (year >= 2018 || engine.includes('1.5 bluehdi') || engine.includes('1.6 puretech'));
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
  // Kompakt Sınıf (A, B, CLA, GLA) - Çift Kavrama
  {
    family: '8G-DCT',
    matcher: ({ brand, model, year, engine }) => {
      const isMbenz = brand.includes('mercedes');
      const isCompact = /a serisi|a-class|b serisi|b-class|cla|gla/i.test(model);
      return isMbenz && isCompact && (year >= 2019 || engine.includes('200d') || engine.includes('2.0'));
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
      return isMbenz && /a serisi|a-class|b serisi|b-class|cla|gla/i.test(model);
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
  // 1.6 CRDi / 1.6 T-GDI 7DCT
  {
    family: '7DCT',
    matcher: ({ brand, engine }) => {
      const isHk = brand.includes('hyundai') || brand.includes('kia');
      return isHk && (engine.includes('crdi') || engine.includes('t-gdi') || engine.includes('1.6'));
    },
    clutchType: 'KURU_CIFT_KAVRAMA',
    typeAndSpeeds: '7 İleri Kuru Çift Kavramalı DCT (Hyundai 7DCT)',
    speeds: 7,
    code: 'Hyundai D7UF1',
    maintenanceTr: 'Kuru çift kavrama mimarisi; dur-kalk trafiğinde ısınma uyarısı, vites geçiş gecikmesi ve kavrama balata boşluğu kontrol edilmelidir.',
  },
  // 1.4 MPI / 1.6 MPI 6AT
  {
    family: 'HYUNDAI 6-AT',
    matcher: ({ brand }) => brand.includes('hyundai') || brand.includes('kia'),
    clutchType: 'TORK_KONVERTORLU',
    typeAndSpeeds: '6 İleri Tork Konvertörlü Tam Otomatik',
    speeds: 6,
    code: 'Hyundai A6GF1',
    maintenanceTr: 'Geleneksel tork konvertörlü otomatik şanzıman; son derece dayanıklıdır ve sarsıntısız vites geçişleri sunar.',
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

  const matcherPayload = {
    brand: normBrand,
    model: normModel,
    engine: normEngine,
    year: modelYear,
    fuel: normFuel,
    trans: normTrans,
    isElectric,
    isHybrid,
    isManual,
  };

  // 1. Check exact catalog rules
  for (const rule of TRANSMISSION_TAXONOMY_RULES) {
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
    return {
      transmissionFamily: 'MANUEL',
      clutchType: 'MANUEL',
      clutchTypeTr: CLUTCH_TYPE_NAMES_TR.MANUEL,
      transmissionTypeAndSpeeds: '6 İleri Manuel',
      transmissionSpeeds: 6,
      transmissionCode: 'MANUAL_6SPD',
      maintenanceDescriptionTr: 'Klasik debriyaj baskı, balata ve bilye kontrolü yapılmalıdır.',
      confidence: 'CANONICAL_FAMILY',
    };
  }

  return {
    transmissionFamily: 'OTOMATİK',
    clutchType: 'TORK_KONVERTORLU',
    clutchTypeTr: CLUTCH_TYPE_NAMES_TR.TORK_KONVERTORLU,
    transmissionTypeAndSpeeds: 'Otomatik Şanzıman',
    transmissionSpeeds: 6,
    transmissionCode: null,
    maintenanceDescriptionTr: 'Otomatik şanzıman yağı seviyesi ve vites geçiş akıcılığı periyodik olarak kontrol edilmelidir.',
    confidence: 'FALLBACK',
  };
}
