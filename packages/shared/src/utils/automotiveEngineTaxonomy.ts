/**
 * AUTOMOTIVE ENGINE TAXONOMY & CANONICAL SPECIFICATION CATALOG
 * 
 * Exhaustive, verified automotive engine taxonomy for Turkey and European market vehicles.
 * Provides canonical catalog displacement (cc), timing architecture (KAYIS, ZINCIR, ISLAK_KAYIS, KAYIS_VE_ZINCIR, NONE),
 * and truthful powertrain fuel classification.
 */

export type TimingSystemType = 'KAYIS' | 'ZINCIR' | 'ISLAK_KAYIS' | 'KAYIS_VE_ZINCIR' | 'NONE';

export interface AutomotiveEngineTaxonomyMatch {
  engineFamily: string;
  catalogDisplacementCc: number | null;
  timingSystem: TimingSystemType;
  timingSystemTr: string;
  timingDescriptionTr: string;
  canonicalFuelType: 'DIESEL' | 'PETROL' | 'HYBRID' | 'ELECTRIC';
  confidence: 'EXACT_CATALOG' | 'CANONICAL_FAMILY' | 'UNRESOLVED';
}

export interface EngineTaxonomyLookupInput {
  brand?: string | null;
  model?: string | null;
  engineCode?: string | null;
  engineDesc?: string | null;
  modelYear?: number | null;
  fuelType?: string | null;
  isElectric?: boolean | null;
  isHybrid?: boolean | null;
}

interface TaxonomyRule {
  family: string;
  matcher: (input: {
    brand: string;
    model: string;
    engine: string;
    year: number;
    fuel: string;
    isElectric: boolean;
    isHybrid: boolean;
  }) => boolean;
  cc: number | null;
  timing: TimingSystemType;
  fuel: 'DIESEL' | 'PETROL' | 'HYBRID' | 'ELECTRIC';
  descTr: string;
}

const TIMING_SYSTEM_NAMES_TR: Record<TimingSystemType, string> = {
  KAYIS: 'Triger Kayışı',
  ZINCIR: 'Triger Zinciri',
  ISLAK_KAYIS: 'Yağ Banyolu Islak Triger Kayışı',
  KAYIS_VE_ZINCIR: 'Triger Kayışı ve Eksantrik Zinciri',
  NONE: 'Triger Sistemi Bulunmaz (Elektrik Motoru)',
};

const TIMING_SYSTEM_DESCRIPTIONS_TR: Record<TimingSystemType, string> = {
  KAYIS: 'Periyodik kilometre ve yıl aralığında (genellikle 4-5 yıl / 80.000-120.000 km) devirdaim pompasıyla birlikte set halinde yenilenmelidir.',
  ZINCIR: 'Normal şartlarda motor ömrüyle paralel çalışır; ancak soğuk çalıştırmada şakırtı, uzama veya sente kayması periyodik olarak dinlenmelidir.',
  ISLAK_KAYIS: 'Triger kayışı motor yağı içerisinde çalışır. Yalnızca üretici onaylı spesifik motor yağı kullanılmalı, kayış liflenmesi ve karter süzgeci tıkanması her bakımda denetlenmelidir.',
  KAYIS_VE_ZINCIR: 'Krank ile eksantrik arası triger kayışıyla, çift eksantrik milleri arası ise zincirle senkronizedir. Hem kayış bakım periyoduna hem de eksantrik zincir gergi sesine dikkat edilmelidir.',
  NONE: 'Doğrudan tahrikli elektrik motoru mimarisi; triger kayışı, zinciri veya subap mekanizması barındırmaz.',
};

const TAXONOMY_RULES: TaxonomyRule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 0. TAM ELEKTRİKLİ MİMARİLER (BEV)
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Elektrik Motoru (BEV)',
    matcher: ({ isElectric, fuel, engine }) =>
      isElectric ||
      /elektrik|electric|\bbev\b/i.test(fuel) ||
      /\b(?:kwh|elektrik|ev)\b/i.test(engine),
    cc: null,
    timing: 'NONE',
    fuel: 'ELECTRIC',
    descTr: 'Elektrikli tahrik ünitesi — mekanik sübap ve triger mimarisi bulunmaz.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 1. RENAULT / DACIA / NISSAN / MERCEDES (ALLIANCE)
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Renault K9K (1.5 dCi / Blue dCi)',
    matcher: ({ engine, brand }) =>
      /1\.5\s*(?:dci|blue\s*dci)|k9k/i.test(engine) ||
      ((brand.includes('renault') || brand.includes('dacia') || brand.includes('nissan')) && /1\.5/i.test(engine) && /dizel|diesel|dci/i.test(engine)),
    cc: 1461,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.5 dCi (K9K) — 1461 cc, triger kayışlı.',
  },
  {
    family: 'Renault R9M (1.6 dCi)',
    matcher: ({ engine }) => /1\.6\s*dci|r9m/i.test(engine),
    cc: 1598,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.6 dCi (R9M) — 1598 cc, triger zincirli.',
  },
  {
    family: 'Renault M9R (2.0 dCi)',
    matcher: ({ engine }) => /2\.0\s*dci|m9r/i.test(engine),
    cc: 1995,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '2.0 dCi (M9R) — 1995 cc, triger zincirli.',
  },
  {
    family: 'Renault-Daimler H5Ht / HR13DDT / M282 (1.3 TCe / 1.3 DIG-T)',
    matcher: ({ engine }) => /1\.3\s*(?:tce|t-gdi|dig-t)|h5ht|hr13|m282/i.test(engine),
    cc: 1332,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.3 TCe / M282 — 1332 cc, triger zincirli.',
  },
  {
    family: 'Renault H4Dt / B4D (1.0 TCe / SCe)',
    matcher: ({ engine }) => /1\.0\s*(?:tce|sce)|h4dt/i.test(engine),
    cc: 999,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.0 TCe / SCe — 999 cc, triger zincirli.',
  },
  {
    family: 'Renault H5Ft (1.2 TCe)',
    matcher: ({ engine }) => /1\.2\s*tce|h5ft/i.test(engine),
    cc: 1197,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.2 TCe (H5Ft) — 1197 cc, triger zincirli.',
  },
  {
    family: 'Renault H4Bt (0.9 TCe)',
    matcher: ({ engine }) => /0\.9\s*tce|h4bt/i.test(engine),
    cc: 898,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '0.9 TCe (H4Bt) — 898 cc, triger zincirli.',
  },
  {
    family: 'Renault K4M (1.6 16V)',
    matcher: ({ engine, brand }) =>
      /k4m/i.test(engine) ||
      ((brand.includes('renault') || brand.includes('dacia')) && /\b1\.6\b/i.test(engine) && !/dci/i.test(engine)),
    cc: 1598,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.6 16V (K4M) — 1598 cc, triger kayışlı.',
  },
  {
    family: 'Renault K7J / K4J (1.4 MPI / 16V)',
    matcher: ({ engine, brand }) =>
      /k7j|k4j/i.test(engine) ||
      ((brand.includes('renault') || brand.includes('dacia')) && /\b1\.4\b/i.test(engine)),
    cc: 1390,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.4 (K7J/K4J) — 1390 cc, triger kayışlı.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. VAG (VOLKSWAGEN, AUDI, SEAT, SKODA, CUPRA)
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'VAG EA189 / EA288 (1.6 TDI)',
    matcher: ({ engine, brand }) =>
      /1\.6\s*tdi|cayc|clha|crkb|ddya|dgte/i.test(engine) ||
      (/vw|volkswagen|audi|seat|skoda/i.test(brand) && /\b1\.6\b/i.test(engine) && /dizel|diesel|tdi/i.test(engine)),
    cc: 1598,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.6 TDI (EA189/EA288) — 1598 cc, triger kayışlı.',
  },
  {
    family: 'VAG EA189 / EA288 / EA288 Evo (2.0 TDI)',
    matcher: ({ engine, brand }) =>
      /2\.0\s*tdi|40\s*tdi/i.test(engine) ||
      (/vw|volkswagen|audi|seat|skoda/i.test(brand) && /\b2\.0\b/i.test(engine) && /dizel|diesel|tdi/i.test(engine)),
    cc: 1968,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '2.0 TDI (EA189/EA288) — 1968 cc, triger kayışlı.',
  },
  {
    family: 'VAG EA189 / EA288 3-Silindir (1.4 TDI)',
    matcher: ({ engine }) => /1\.4\s*tdi/i.test(engine),
    cc: 1422,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.4 TDI 3-silindir — 1422 cc, triger kayışlı.',
  },
  {
    family: 'VAG Pumpe-Düse / Dağıtıcı Pompa (1.9 TDI)',
    matcher: ({ engine }) => /1\.9\s*tdi/i.test(engine),
    cc: 1896,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.9 TDI — 1896 cc, triger kayışlı.',
  },
  {
    family: 'VAG EA897 V6 (3.0 TDI / 45 TDI / 50 TDI)',
    matcher: ({ engine }) => /3\.0\s*tdi|50\s*tdi|45\s*tdi/i.test(engine),
    cc: 2967,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '3.0 TDI V6 (EA897) — 2967 cc, triger zincirli.',
  },
  {
    family: 'VAG EA211 (1.0 TSI / TFSI / 30 TFSI)',
    matcher: ({ engine }) => /1\.0\s*t(?:si|fsi)|30\s*tfsi|chzb|chzc|dkla|dlaa/i.test(engine),
    cc: 999,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.0 TSI / TFSI (EA211) — 999 cc, triger kayışlı.',
  },
  {
    family: 'VAG EA211 Evo (1.5 TSI / TFSI / 35 TFSI)',
    matcher: ({ engine }) => /1\.5\s*t(?:si|fsi)|35\s*tfsi|dada|dpca|dxdb/i.test(engine),
    cc: 1498,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.5 TSI / TFSI (EA211 Evo) — 1498 cc, triger kayışlı.',
  },
  {
    family: 'VAG EA211 (1.4 TSI / TFSI - 2013+ Kayışlı)',
    matcher: ({ engine, year }) =>
      (/1\.4\s*t(?:si|fsi)/i.test(engine) && year >= 2013) ||
      /chpa|czca|czea|czda/i.test(engine),
    cc: 1395,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.4 TSI (EA211) — 1395 cc, triger kayışlı.',
  },
  {
    family: 'VAG EA111 (1.4 TSI Twincharger / Turbo - 2006-2012 Zincirli)',
    matcher: ({ engine, year }) =>
      (/1\.4\s*t(?:si|fsi)/i.test(engine) && year < 2013) ||
      /caxa|cavd|cthd|blg|bmy/i.test(engine),
    cc: 1390,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.4 TSI (EA111) — 1390 cc, triger zincirli.',
  },
  {
    family: 'VAG EA211 (1.2 TSI - 2013+ Kayışlı)',
    matcher: ({ engine, year }) =>
      (/1\.2\s*t(?:si|fsi)/i.test(engine) && year >= 2013) ||
      /cjza|cjzb|cyvb/i.test(engine),
    cc: 1197,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.2 TSI (EA211) — 1197 cc, triger kayışlı.',
  },
  {
    family: 'VAG EA111 (1.2 TSI - 2009-2012 Zincirli)',
    matcher: ({ engine, year }) =>
      (/1\.2\s*t(?:si|fsi)/i.test(engine) && year < 2013) ||
      /cbza|cbzb/i.test(engine),
    cc: 1197,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.2 TSI (EA111) — 1197 cc, triger zincirli.',
  },
  {
    family: 'VAG EA888 Gen 1/2/3/4 (2.0 TSI / TFSI / 40 TFSI)',
    matcher: ({ engine, brand }) =>
      /2\.0\s*t(?:si|fsi)|40\s*tfsi|45\s*tfsi|ccza|chhb|dktb|dnna/i.test(engine) ||
      (/vw|volkswagen|audi|seat|skoda|cupra/i.test(brand) && /2\.0\s*turbo/i.test(engine)),
    cc: 1984,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '2.0 TSI / TFSI (EA888) — 1984 cc, triger zincirli.',
  },
  {
    family: 'VAG EA888 Gen 1/2/3 (1.8 TSI / TFSI)',
    matcher: ({ engine }) => /1\.8\s*t(?:si|fsi)|bzb|cdaa|cjsa/i.test(engine),
    cc: 1798,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.8 TSI / TFSI (EA888) — 1798 cc, triger zincirli.',
  },
  {
    family: 'VAG BSE / BSF / CWVA (1.6 MPI)',
    matcher: ({ engine, brand }) =>
      /1\.6\s*mpi|cwva|bse|bsf/i.test(engine) ||
      (/vw|volkswagen|audi|seat|skoda/i.test(brand) && /\b1\.6\b/i.test(engine) && !/tdi/i.test(engine)),
    cc: 1598,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.6 MPI — 1598 cc, triger kayışlı.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. STELLANTIS / FIAT / ALFA ROMEO / JEEP
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Fiat SDE 1.3 (1.3 MultiJet / JTD / CDTI)',
    matcher: ({ engine }) => /1\.3\s*(?:multijet|mjet|jtd|cdti)/i.test(engine),
    cc: 1248,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.3 MultiJet (SDE 1.3) — 1248 cc, triger zincirli.',
  },
  {
    family: 'Fiat / Alfa 1.6 MultiJet / JTDm',
    matcher: ({ engine }) => /1\.6\s*(?:multijet|mjet|jtdm?)/i.test(engine),
    cc: 1598,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.6 MultiJet — 1598 cc, triger kayışlı.',
  },
  {
    family: 'Fiat / Alfa 2.0 MultiJet / JTDm',
    matcher: ({ engine }) => /2\.0\s*(?:multijet|mjet|jtdm?)/i.test(engine),
    cc: 1956,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '2.0 MultiJet — 1956 cc, triger kayışlı.',
  },
  {
    family: 'Fiat 1.4 Fire (8V / 16V)',
    matcher: ({ engine }) => /1\.4\s*fire(?!\s*fly)/i.test(engine),
    cc: 1368,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.4 Fire — 1368 cc, triger kayışlı.',
  },
  {
    family: 'Fiat / Alfa 1.4 T-Jet / MultiAir',
    matcher: ({ engine }) => /1\.4\s*(?:t-jet|multiair)/i.test(engine),
    cc: 1368,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.4 T-Jet / MultiAir — 1368 cc, triger kayışlı.',
  },
  {
    family: 'Fiat FireFly T3 (1.0 FireFly)',
    matcher: ({ engine }) => /1\.0\s*firefly|1\.0\s*t3/i.test(engine),
    cc: 999,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.0 FireFly — 999 cc, triger zincirli.',
  },
  {
    family: 'Fiat FireFly T4 (1.3 FireFly)',
    matcher: ({ engine }) => /1\.3\s*firefly|1\.3\s*t4/i.test(engine),
    cc: 1332,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.3 FireFly (T4) — 1332 cc, triger zincirli.',
  },
  {
    family: 'Fiat FireFly GSE 1.5 e-Hybrid',
    matcher: ({ engine }) => /1\.5\s*(?:firefly|hybrid|e-hybrid|t4\s*hybrid)/i.test(engine),
    cc: 1469,
    timing: 'KAYIS',
    fuel: 'HYBRID',
    descTr: '1.5 e-Hybrid — 1469 cc, triger kayışlı.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. STELLANTIS / PSA (PEUGEOT, CITROEN, DS, OPEL)
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'PSA EB2 (1.2 PureTech - Islak Kayışlı)',
    matcher: ({ engine, year }) =>
      (/1\.2\s*puretech|eb2/i.test(engine) && year < 2024) ||
      (/peugeot|citroen|ds|opel/i.test(engine) && /1\.2\s*turbo/i.test(engine)),
    cc: 1199,
    timing: 'ISLAK_KAYIS',
    fuel: 'PETROL',
    descTr: '1.2 PureTech (EB2) — 1199 cc, yağ banyolu ıslak triger kayışlı.',
  },
  {
    family: 'PSA EB2 Gen 3 (1.2 PureTech Hybrid 136 HP - Zincirli 2024+)',
    matcher: ({ engine, year }) =>
      /1\.2\s*(?:puretech|hybrid).*(?:136|e-dcs6)/i.test(engine) ||
      (year >= 2024 && /1\.2\s*(?:hybrid|puretech)/i.test(engine)),
    cc: 1199,
    timing: 'ZINCIR',
    fuel: 'HYBRID',
    descTr: '1.2 PureTech Hybrid (EB2 Gen 3) — 1199 cc, triger zincirli.',
  },
  {
    family: 'PSA DV5 (1.5 BlueHDi / CDTI)',
    matcher: ({ engine }) => /1\.5\s*(?:bluehdi|cdti|hdi)|dv5/i.test(engine),
    cc: 1499,
    timing: 'KAYIS_VE_ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.5 BlueHDi (DV5) — 1499 cc, ana triger kayışlı ve eksantrikler arası zincirli.',
  },
  {
    family: 'PSA DV6 (1.6 BlueHDi / HDi / e-HDi)',
    matcher: ({ engine }) => /1\.6\s*(?:bluehdi|hdi|e-hdi)|dv6/i.test(engine),
    cc: 1560,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.6 BlueHDi / HDi (DV6) — 1560 cc, triger kayışlı.',
  },
  {
    family: 'PSA DW10 (2.0 BlueHDi / HDi)',
    matcher: ({ engine }) => /2\.0\s*(?:bluehdi|hdi)|dw10/i.test(engine),
    cc: 1997,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '2.0 BlueHDi / HDi (DW10) — 1997 cc, triger kayışlı.',
  },
  {
    family: 'PSA / BMW Prince EP6 (1.6 THP / PureTech)',
    matcher: ({ engine }) => /1\.6\s*(?:thp|puretech)|ep6/i.test(engine),
    cc: 1598,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.6 THP / PureTech (EP6) — 1598 cc, triger zincirli.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FORD
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Ford Fox (1.0 EcoBoost - Islak Kayışlı)',
    matcher: ({ engine }) => /1\.0\s*ecoboost/i.test(engine),
    cc: 998,
    timing: 'ISLAK_KAYIS',
    fuel: 'PETROL',
    descTr: '1.0 EcoBoost (Fox) — 998 cc, yağ banyolu ıslak triger kayışlı.',
  },
  {
    family: 'Ford Dragon (1.5 EcoBoost 3-Silindir)',
    matcher: ({ engine }) => /1\.5\s*ecoboost.*(?:3|dragon|150|182|200)/i.test(engine),
    cc: 1496,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.5 EcoBoost (Dragon 3-silindir) — 1496 cc, triger zincirli.',
  },
  {
    family: 'Ford 1.5 TDCi / EcoBlue',
    matcher: ({ engine }) => /1\.5\s*(?:tdci|ecoblue)/i.test(engine),
    cc: 1499,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.5 TDCi / EcoBlue — 1499 cc, triger kayışlı.',
  },
  {
    family: 'Ford 1.6 TDCi Duratorq',
    matcher: ({ engine }) => /1\.6\s*tdci/i.test(engine),
    cc: 1560,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '1.6 TDCi (Duratorq) — 1560 cc, triger kayışlı.',
  },
  {
    family: 'Ford 2.0 TDCi / EcoBlue',
    matcher: ({ engine }) => /2\.0\s*(?:tdci|ecoblue)/i.test(engine),
    cc: 1995,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: '2.0 TDCi / EcoBlue — 1995 cc, triger kayışlı.',
  },
  {
    family: 'Ford 1.6 Duratec Ti-VCT',
    matcher: ({ engine, brand }) =>
      /duratec|ti-vct/i.test(engine) ||
      (brand.includes('ford') && /\b1\.6\b/i.test(engine) && !/tdci|ecoblue/i.test(engine)),
    cc: 1596,
    timing: 'KAYIS',
    fuel: 'PETROL',
    descTr: '1.6 Duratec Ti-VCT — 1596 cc, triger kayışlı.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. HYUNDAI / KIA
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Hyundai / Kia U2 / Smartstream (1.6 CRDi)',
    matcher: ({ engine }) => /1\.6\s*crdi/i.test(engine),
    cc: 1598,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.6 CRDi — 1598 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia U2 (1.4 CRDi)',
    matcher: ({ engine }) => /1\.4\s*crdi/i.test(engine),
    cc: 1396,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.4 CRDi — 1396 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Kappa (1.0 T-GDI)',
    matcher: ({ engine }) => /1\.0\s*t-gdi/i.test(engine),
    cc: 998,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.0 T-GDI — 998 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Kappa (1.4 T-GDI)',
    matcher: ({ engine }) => /1\.4\s*t-gdi/i.test(engine),
    cc: 1353,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.4 T-GDI — 1353 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Smartstream (1.5 T-GDI)',
    matcher: ({ engine }) => /1\.5\s*t-gdi/i.test(engine),
    cc: 1482,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.5 T-GDI — 1482 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Gamma (1.6 T-GDI)',
    matcher: ({ engine }) => /1\.6\s*t-gdi/i.test(engine),
    cc: 1591,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.6 T-GDI — 1591 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Kappa (1.2 MPi)',
    matcher: ({ engine }) => /1\.2\s*mpi/i.test(engine),
    cc: 1197,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.2 MPi — 1197 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Kappa (1.4 MPi)',
    matcher: ({ engine }) => /1\.4\s*mpi/i.test(engine),
    cc: 1368,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.4 MPi — 1368 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Gamma (1.6 MPi)',
    matcher: ({ engine }) => /1\.6\s*mpi/i.test(engine),
    cc: 1591,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.6 MPi — 1591 cc, triger zincirli.',
  },
  {
    family: 'Hyundai / Kia Kappa 1.6 GDI Hybrid',
    matcher: ({ engine }) => /1\.6\s*(?:gdi|hybrid).*hybrid|niro.*1\.6|kona.*hybrid/i.test(engine),
    cc: 1580,
    timing: 'ZINCIR',
    fuel: 'HYBRID',
    descTr: '1.6 GDI Hybrid — 1580 cc, triger zincirli.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. TOYOTA
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Toyota 1ND-TV (1.4 D-4D)',
    matcher: ({ engine }) => /1\.4\s*d-?4d|1nd-tv/i.test(engine),
    cc: 1364,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.4 D-4D (1ND-TV) — 1364 cc, triger zincirli.',
  },
  {
    family: 'Toyota 1WW (1.6 D-4D)',
    matcher: ({ engine }) => /1\.6\s*d-?4d|1ww/i.test(engine),
    cc: 1598,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.6 D-4D — 1598 cc, triger zincirli.',
  },
  {
    family: 'Toyota 1AD-FTV (2.0 D-4D)',
    matcher: ({ engine }) => /2\.0\s*d-?4d|1ad-ftv/i.test(engine),
    cc: 1998,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '2.0 D-4D — 1998 cc, triger zincirli.',
  },
  {
    family: 'Toyota 1ZR-FAE / 1ZR-FE (1.6 Valvematic / Dual VVT-i)',
    matcher: ({ engine, brand }) =>
      /1\.6\s*(?:valvematic|vvt-i)|1zr/i.test(engine) ||
      (brand.includes('toyota') && /\b1\.6\b/i.test(engine) && !/d-?4d/i.test(engine)),
    cc: 1598,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.6 Valvematic (1ZR-FAE) — 1598 cc, triger zincirli.',
  },
  {
    family: 'Toyota 1NR-FE (1.33 Dual VVT-i)',
    matcher: ({ engine }) => /1\.33|1nr-fe/i.test(engine),
    cc: 1329,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.33 Dual VVT-i (1NR-FE) — 1329 cc, triger zincirli.',
  },
  {
    family: 'Toyota 2ZR-FXE (1.8 Hybrid)',
    matcher: ({ engine }) => /1\.8\s*(?:hybrid|vvt-i\s*hybrid)|2zr-fxe/i.test(engine),
    cc: 1798,
    timing: 'ZINCIR',
    fuel: 'HYBRID',
    descTr: '1.8 Hybrid (2ZR-FXE) — 1798 cc, triger zincirli.',
  },
  {
    family: 'Toyota M15A Dynamic Force (1.5 Hybrid / Benzin)',
    matcher: ({ engine }) => /1\.5\s*(?:dynamic\s*force|hybrid)|m15a/i.test(engine),
    cc: 1490,
    timing: 'ZINCIR',
    fuel: 'HYBRID',
    descTr: '1.5 Dynamic Force — 1490 cc, triger zincirli.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. BMW & MINI
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'BMW B38 (1.5 Turbo 3-Silindir - 118i, 218i, 318i, Cooper)',
    matcher: ({ engine }) => /b38|1\.5.*(?:118i|218i|318i)|\b118i\b|\b218i\b|\b318i\b/i.test(engine),
    cc: 1499,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: 'BMW B38 (1.5 Turbo) — 1499 cc, triger zincirli.',
  },
  {
    family: 'BMW B48B16 / N13B16 (1.6 Turbo - 320i Türkiye Özel / 316i / 320i ED)',
    matcher: ({ engine, brand }) =>
      /b48b16|n13b16/i.test(engine) ||
      (brand.includes('bmw') && /320i.*1\.6|520i.*1\.6|316i|320i\s*ed/i.test(engine)),
    cc: 1598,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: 'BMW 1.6 Turbo (B48B16/N13B16 TR Özel) — 1598 cc, triger zincirli.',
  },
  {
    family: 'BMW B48B20 (2.0 Turbo Benzin - 330i, 430i, 530i, 320i Global)',
    matcher: ({ engine }) => /b48b20|\b330i\b|\b430i\b|\b530i\b/i.test(engine),
    cc: 1998,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: 'BMW B48B20 (2.0 Turbo) — 1998 cc, triger zincirli.',
  },
  {
    family: 'BMW N20B20 (2.0 Turbo Benzin - 320i, 328i, 520i, 528i F30/F10)',
    matcher: ({ engine }) => /n20b20|\b328i\b|\b528i\b/i.test(engine),
    cc: 1997,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: 'BMW N20B20 (2.0 Turbo) — 1997 cc, triger zincirli.',
  },
  {
    family: 'BMW N47 / B47 (2.0 Dizel - 118d, 120d, 320d, 520d)',
    matcher: ({ engine }) => /b47|n47|\b118d\b|\b120d\b|\b320d\b|\b520d\b|xdrive20d/i.test(engine),
    cc: 1995,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: 'BMW 2.0 Dizel (N47/B47) — 1995 cc, triger zincirli.',
  },
  {
    family: 'BMW B58 (3.0 Turbo 6-Silindir - M140i, M340i, 540i)',
    matcher: ({ engine }) => /b58|m140i|m340i|\b540i\b/i.test(engine),
    cc: 2998,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: 'BMW B58 (3.0 Turbo 6-silindir) — 2998 cc, triger zincirli.',
  },
  {
    family: 'BMW N57 / B57 (3.0 Dizel 6-Silindir - 330d, 530d, 730d)',
    matcher: ({ engine }) => /b57|n57|\b330d\b|\b530d\b|\b730d\b/i.test(engine),
    cc: 2993,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: 'BMW 3.0 Dizel (N57/B57) — 2993 cc, triger zincirli.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. MERCEDES-BENZ
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Mercedes M270 / M274 (1.6 Turbo - C180, E180, CLA180)',
    matcher: ({ engine }) => /m274|m270|\bc\s*180\b|\be\s*180\b|\bcla\s*180\b|1\.5\s*c180/i.test(engine),
    cc: 1595,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: 'Mercedes M274/M270 (1.6 Turbo) — 1595 cc, triger zincirli.',
  },
  {
    family: 'Mercedes M264 (1.5 EQ Boost - C200 Facelift)',
    matcher: ({ engine }) => /m264|\bc\s*200\s*eq\b/i.test(engine),
    cc: 1497,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: 'Mercedes M264 (1.5 EQ Boost) — 1497 cc, triger zincirli.',
  },
  {
    family: 'Mercedes OM651 (2.1 CDI - C200d, C220d, E220d)',
    matcher: ({ engine }) => /om651|220\s*cdi|220\s*d/i.test(engine),
    cc: 2143,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: 'Mercedes OM651 (2.1 CDI) — 2143 cc, triger zincirli.',
  },
  {
    family: 'Mercedes OM654 (2.0 d - C200d 2.0, C220d, E200d, E220d)',
    matcher: ({ engine }) => /om654|\b200\s*d\b/i.test(engine),
    cc: 1950,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: 'Mercedes OM654 (2.0 d) — 1950 cc, triger zincirli.',
  },
  {
    family: 'Mercedes OM626 (1.6 d - C200d 1.6 / Renault Ortaklığı)',
    matcher: ({ engine }) => /om626/i.test(engine),
    cc: 1598,
    timing: 'KAYIS',
    fuel: 'DIESEL',
    descTr: 'Mercedes OM626 (1.6 d) — 1598 cc, triger kayışlı.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. HONDA
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Honda L15B7 (1.5 VTEC Turbo)',
    matcher: ({ engine }) => /1\.5\s*vtec|l15b/i.test(engine),
    cc: 1498,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.5 VTEC Turbo (L15B) — 1498 cc, triger zincirli.',
  },
  {
    family: 'Honda N16A (1.6 i-DTEC)',
    matcher: ({ engine }) => /1\.6\s*i-dtec|n16a/i.test(engine),
    cc: 1597,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.6 i-DTEC (N16A) — 1597 cc, triger zincirli.',
  },
  {
    family: 'Honda R16B (1.6 i-VTEC)',
    matcher: ({ engine }) => /1\.6\s*i-vtec|r16b/i.test(engine),
    cc: 1595,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.6 i-VTEC (R16B) — 1595 cc, triger zincirli.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. OPEL (GM DÖNEMİ)
  // ─────────────────────────────────────────────────────────────────────────
  {
    family: 'Opel B16DTL / B16DTH (1.6 CDTI Whisper Diesel)',
    matcher: ({ engine }) => /1\.6\s*cdti/i.test(engine),
    cc: 1598,
    timing: 'ZINCIR',
    fuel: 'DIESEL',
    descTr: '1.6 CDTI (Whisper Diesel) — 1598 cc, triger zincirli (arka/şanzıman tarafı).',
  },
  {
    family: 'Opel A14NET / B14NET (1.4 Turbo)',
    matcher: ({ engine }) => /a14net|b14net|1\.4\s*turbo.*opel/i.test(engine),
    cc: 1364,
    timing: 'ZINCIR',
    fuel: 'PETROL',
    descTr: '1.4 Turbo (A14NET/B14NET) — 1364 cc, triger zincirli.',
  },
];

/**
 * Resolves exact automotive engine taxonomy, canonical displacement, and timing architecture.
 */
export function resolveAutomotiveEngineTaxonomy(
  input: EngineTaxonomyLookupInput,
): AutomotiveEngineTaxonomyMatch {
  const brand = (input.brand || '').trim().toLowerCase();
  const model = (input.model || '').trim().toLowerCase();
  const engineCode = (input.engineCode || '').trim();
  const engineDesc = (input.engineDesc || '').trim();
  const rawEngineCombined = `${engineCode} ${engineDesc}`.trim();
  const year = input.modelYear || 0;
  const fuel = (input.fuelType || '').trim().toLowerCase();
  const isElectric = Boolean(input.isElectric);
  const isHybrid = Boolean(input.isHybrid);

  // Normalize search context
  const context = {
    brand,
    model,
    engine: `${brand} ${model} ${rawEngineCombined}`.toLowerCase(),
    year,
    fuel,
    isElectric,
    isHybrid,
  };

  for (const rule of TAXONOMY_RULES) {
    if (rule.matcher(context)) {
      return {
        engineFamily: rule.family,
        catalogDisplacementCc: rule.cc,
        timingSystem: rule.timing,
        timingSystemTr: TIMING_SYSTEM_NAMES_TR[rule.timing],
        timingDescriptionTr: TIMING_SYSTEM_DESCRIPTIONS_TR[rule.timing],
        canonicalFuelType: rule.fuel,
        confidence: 'EXACT_CATALOG',
      };
    }
  }

  // Fallback heuristic if electric
  if (isElectric || fuel.includes('elektrik') || fuel.includes('electric')) {
    return {
      engineFamily: 'Elektrik Motoru (BEV)',
      catalogDisplacementCc: null,
      timingSystem: 'NONE',
      timingSystemTr: TIMING_SYSTEM_NAMES_TR.NONE,
      timingDescriptionTr: TIMING_SYSTEM_DESCRIPTIONS_TR.NONE,
      canonicalFuelType: 'ELECTRIC',
      confidence: 'EXACT_CATALOG',
    };
  }

  // Fallback heuristic if diesel
  const isDiesel =
    fuel.includes('dizel') ||
    fuel.includes('diesel') ||
    /dci|tdi|hdi|cdi|multijet|jtd|bluehdi|ecoblue|tdci|d4d|crdi|cdti|bluetec/i.test(rawEngineCombined);

  return {
    engineFamily: rawEngineCombined || 'Orijinal Motor',
    catalogDisplacementCc: null,
    timingSystem: isDiesel ? 'KAYIS' : 'ZINCIR', // safe conservative default
    timingSystemTr: isDiesel ? TIMING_SYSTEM_NAMES_TR.KAYIS : TIMING_SYSTEM_NAMES_TR.ZINCIR,
    timingDescriptionTr: isDiesel
      ? TIMING_SYSTEM_DESCRIPTIONS_TR.KAYIS
      : TIMING_SYSTEM_DESCRIPTIONS_TR.ZINCIR,
    canonicalFuelType: isDiesel ? 'DIESEL' : isHybrid ? 'HYBRID' : 'PETROL',
    confidence: 'UNRESOLVED',
  };
}
