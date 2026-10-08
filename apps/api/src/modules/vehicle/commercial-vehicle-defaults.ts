/**
 * Commercial Vehicle Defaults & Segment Taxonomy Resolver
 * Provides authentic, model-specific commercial defaults (cargo volume, displacement, power, suspension, timing architecture)
 * for Minivan & Panelvan commercial vehicles.
 */

export interface CommercialVehicleDefaults {
  segment: 'COMPACT' | 'MEDIUM' | 'LARGE';
  segmentNameTr: string;
  defaultCc: number;
  defaultHp: number;
  candidatePowers: number[];
  cargoVolumeM3: number;
  trunkCapacityLiters: number;
  curbWeightKg: number;
  hasLeafSprings: boolean;
  suspensionType: string;
  hasWetTimingBelt: boolean;
  typicalFocusIssues: string[];
}

export function resolveCommercialVehicleDefaults(
  brand: string,
  model: string,
  engine?: string,
  trimPackage?: string,
  year?: number,
): CommercialVehicleDefaults {
  const normBrand = (brand || '').toLowerCase().trim();
  const normModel = (model || '').toLowerCase().trim();
  const normEngine = (engine || '').toLowerCase().trim();
  const normTrim = (trimPackage || '').toLowerCase().trim();

  // 1. Identify Segment
  let segment: 'COMPACT' | 'MEDIUM' | 'LARGE' = 'COMPACT';

  const compactKeywords = [
    'doblo', 'fiorino', 'nemo', 'bipper', 'qubo',
    'courier', 'connect', 'caddy', 'partner', 'rifter',
    'berlingo', 'kangoo', 'express', 'combo', 'citan',
    'dokker', 'lodgy', 'proace city', 'townstar',
  ];

  const mediumKeywords = [
    'custom', 'transporter', 'caravelle', 'multivan',
    'vito', 'v-klasse', 'viano', 'trafic', 'vivaro',
    'expert', 'traveller', 'jumpy', 'spacetourer',
    'proace', 'scudo', 'staria', 'h-1', 'h1', 'h350',
  ];

  const largeKeywords = [
    'transit', 'ducato', 'master', 'crafter', 'sprinter',
    'daily', 'boxer', 'jumper', 'movano', 'interstar', 'nv400',
  ];

  if (compactKeywords.some((k) => normModel.includes(k))) {
    segment = 'COMPACT';
  } else if (mediumKeywords.some((k) => normModel.includes(k))) {
    segment = 'MEDIUM';
  } else if (largeKeywords.some((k) => normModel.includes(k))) {
    segment = 'LARGE';
  } else {
    // Brand-specific inferences
    if (normBrand === 'iveco') {
      segment = 'LARGE';
    } else if (normModel.includes('van') || normModel.includes('kargo') || normModel.includes('cargo')) {
      segment = 'COMPACT';
    } else {
      segment = 'COMPACT';
    }
  }

  // 2. Suspension Architecture
  let hasLeafSprings = true;
  let suspensionType = 'Parabolik Makas (Yaprak Yay)';

  if (normModel.includes('doblo')) {
    hasLeafSprings = false;
    suspensionType = 'Bi-Link Bağımsız Helezon Yay (Makas Yoktur)';
  } else if (normModel.includes('fiorino') || normModel.includes('courier') || normModel.includes('bipper') || normModel.includes('nemo')) {
    hasLeafSprings = false;
    suspensionType = 'Torsiyon Kirişli Helezon Yay (Makas Yoktur)';
  } else if (normModel.includes('transporter') || normModel.includes('caravelle') || normModel.includes('multivan')) {
    hasLeafSprings = false;
    suspensionType = 'Bağımsız Helezon Yay ve Salıncak (Makas Yoktur)';
  } else if (normModel.includes('vito') || normModel.includes('v-klasse') || normModel.includes('viano')) {
    hasLeafSprings = false;
    suspensionType = 'Bağımsız Helezon Yay (Makas Yoktur)';
  } else if (normModel.includes('caddy')) {
    if (year && year >= 2021) {
      hasLeafSprings = false;
      suspensionType = 'Helezon Yaylı Arka Aks (Makas Yoktur)';
    } else {
      hasLeafSprings = true;
      suspensionType = 'Tek Yaprak Parabolik Makas';
    }
  } else if (normModel.includes('custom')) {
    hasLeafSprings = true;
    suspensionType = 'Tek Yaprak Parabolik Makas ve Gazlı Amortisör';
  } else if (segment === 'COMPACT') {
    hasLeafSprings = false;
    suspensionType = 'Torsiyon Kirişli Helezon Yay (Makas Yoktur)';
  } else {
    hasLeafSprings = true;
    suspensionType = 'Çok Katlı Parabolik Makas';
  }

  // 3. Engine Architecture (Displacement, Power, Wet Timing Belt)
  let defaultCc = 1598;
  let defaultHp = 105;
  let candidatePowers = [90, 105, 120];
  let hasWetTimingBelt = false;

  // Check Wet Timing Belt (Ford 2.0 EcoBlue)
  if (normEngine.includes('ecoblue') || (normBrand.includes('ford') && normEngine.includes('2.0') && (!year || year >= 2016))) {
    hasWetTimingBelt = true;
  }

  // Extract explicit horsepower from engine string if present (e.g. "1.6 MultiJet 105 HP", "120 bg", "130 PS")
  const hpMatch = normEngine.match(/(\d{2,3})\s*(?:hp|ps|bg)\b/i) || normTrim.match(/(\d{2,3})\s*(?:hp|ps|bg)\b/i);
  const explicitHp = hpMatch ? parseInt(hpMatch[1], 10) : undefined;

  if (normEngine.includes('1.3') || normEngine.includes('1,3')) {
    defaultCc = 1248;
    defaultHp = explicitHp || (normEngine.includes('75') ? 75 : 95);
    candidatePowers = [75, 90, 95];
  } else if (normEngine.includes('1.4') || normEngine.includes('1,4')) {
    defaultCc = 1368;
    defaultHp = explicitHp || 95;
    candidatePowers = [77, 95];
  } else if (normEngine.includes('1.5') || normEngine.includes('1,5')) {
    defaultCc = normBrand.includes('renault') || normBrand.includes('dacia') ? 1461 : 1499;
    defaultHp = explicitHp || (normEngine.includes('75') ? 75 : normEngine.includes('120') ? 120 : 100);
    candidatePowers = [75, 100, 120, 130];
  } else if (normEngine.includes('1.6') || normEngine.includes('1,6')) {
    defaultCc = normBrand.includes('ford') || normBrand.includes('peugeot') || normBrand.includes('citroen') ? 1560 : 1598;
    defaultHp = explicitHp || (normEngine.includes('120') ? 120 : normEngine.includes('90') ? 90 : 105);
    candidatePowers = [90, 105, 120];
  } else if (normEngine.includes('1.9') || normEngine.includes('1,9')) {
    defaultCc = 1910;
    defaultHp = explicitHp || 105;
    candidatePowers = [100, 105];
  } else if (normEngine.includes('2.0') || normEngine.includes('2,0')) {
    if (normBrand.includes('ford')) {
      defaultCc = 1995;
      defaultHp = explicitHp || 130;
      candidatePowers = [105, 130, 170, 185];
    } else if (normBrand.includes('volkswagen') || normBrand.includes('vw')) {
      defaultCc = 1968;
      defaultHp = explicitHp || 140;
      candidatePowers = [102, 140, 150, 177, 204];
    } else if (normBrand.includes('mercedes')) {
      defaultCc = 1950;
      defaultHp = explicitHp || 136;
      candidatePowers = [136, 163, 190];
    } else {
      defaultCc = 1995;
      defaultHp = explicitHp || 130;
      candidatePowers = [105, 130, 150];
    }
  } else if (normEngine.includes('2.2') || normEngine.includes('2,2')) {
    if (normBrand.includes('mercedes')) {
      defaultCc = 2143;
      defaultHp = explicitHp || 136;
      candidatePowers = [136, 163];
    } else {
      defaultCc = 2198;
      defaultHp = explicitHp || 130;
      candidatePowers = [100, 125, 130, 155];
    }
  } else if (normEngine.includes('2.3') || normEngine.includes('2,3')) {
    if (normBrand.includes('fiat') || normBrand.includes('iveco')) {
      defaultCc = 2287;
      defaultHp = explicitHp || 130;
      candidatePowers = [120, 130, 150, 180];
    } else {
      defaultCc = 2299;
      defaultHp = explicitHp || 130;
      candidatePowers = [125, 130, 150, 165];
    }
  } else if (normEngine.includes('2.5') || normEngine.includes('2,5')) {
    defaultCc = 2464;
    defaultHp = explicitHp || 120;
    candidatePowers = [100, 120, 140];
  } else if (normEngine.includes('3.0') || normEngine.includes('3,0') || normEngine.includes('2.8')) {
    defaultCc = 2998;
    defaultHp = explicitHp || 160;
    candidatePowers = [140, 160, 180, 205];
  } else {
    // Segment-based fallbacks if engine string didn't specify
    if (segment === 'COMPACT') {
      defaultCc = normModel.includes('fiorino') ? 1248 : 1598;
      defaultHp = explicitHp || (normModel.includes('fiorino') ? 95 : 105);
      candidatePowers = normModel.includes('fiorino') ? [75, 95] : [90, 105, 120];
    } else if (segment === 'MEDIUM') {
      defaultCc = normBrand.includes('volkswagen') ? 1968 : 1995;
      defaultHp = explicitHp || 130;
      candidatePowers = [105, 130, 170];
    } else {
      defaultCc = normBrand.includes('fiat') ? 2287 : normBrand.includes('ford') ? 2198 : 2299;
      defaultHp = explicitHp || 130;
      candidatePowers = [125, 130, 150, 165];
    }
  }

  if (explicitHp && !candidatePowers.includes(explicitHp)) {
    candidatePowers.push(explicitHp);
    candidatePowers.sort((a, b) => a - b);
  }

  // 4. Cargo Volume & Curb Weight
  let curbWeightKg = segment === 'LARGE' ? 2350 : segment === 'MEDIUM' ? 2050 : 1420;
  let cargoVolumeM3 = segment === 'LARGE' ? 13.0 : segment === 'MEDIUM' ? 6.0 : 3.4;
  let trunkCapacityLiters = Math.round(cargoVolumeM3 * 1000);

  // Check if volume is explicitly specified in trim (e.g. "13 m3", "11.5 m³", "5.8 m3", "3.4 m3")
  const volMatch = (trimPackage || '').match(/(\d+(?:[.,]\d+)?)\s*m[3³]/i);
  if (volMatch) {
    cargoVolumeM3 = parseFloat(volMatch[1].replace(',', '.'));
    trunkCapacityLiters = Math.round(cargoVolumeM3 * 1000);
  } else if (segment === 'COMPACT') {
    if (normTrim.includes('maxi') || normTrim.includes('l2')) {
      cargoVolumeM3 = 4.2;
      trunkCapacityLiters = 4200;
      curbWeightKg = 1490;
    } else {
      cargoVolumeM3 = normModel.includes('fiorino') ? 2.5 : 3.4;
      trunkCapacityLiters = normModel.includes('fiorino') ? 2500 : 3400;
      curbWeightKg = normModel.includes('fiorino') ? 1260 : 1420;
    }
  } else if (segment === 'MEDIUM') {
    if (normTrim.includes('uzun') || normTrim.includes('l2') || normTrim.includes('320l') || normTrim.includes('340l')) {
      cargoVolumeM3 = 6.8;
      trunkCapacityLiters = 6800;
      curbWeightKg = 2120;
    } else {
      cargoVolumeM3 = 6.0;
      trunkCapacityLiters = 6000;
      curbWeightKg = 2050;
    }
  } else {
    // LARGE
    if (normTrim.includes('15') || normTrim.includes('17') || normTrim.includes('l4')) {
      cargoVolumeM3 = 15.0;
      trunkCapacityLiters = 15000;
      curbWeightKg = 2450;
    } else if (normTrim.includes('11') || normTrim.includes('l2')) {
      cargoVolumeM3 = 11.5;
      trunkCapacityLiters = 11500;
      curbWeightKg = 2280;
    } else {
      cargoVolumeM3 = 13.0;
      trunkCapacityLiters = 13000;
      curbWeightKg = 2350;
    }
  }

  // 5. Segment Name in Turkish
  const segmentNameTr =
    segment === 'COMPACT'
      ? 'Kompakt Panelvan / Minivan'
      : segment === 'MEDIUM'
      ? 'Orta Boy Panelvan / Minivan'
      : 'Büyük Boy Panelvan';

  // 6. Typical Focus Issues
  const typicalFocusIssues: string[] = [];
  if (hasWetTimingBelt) {
    typicalFocusIssues.push(
      'Yağ içinde çalışan ıslak triger kayışı (Belt-in-Oil / BIO) lif ayrışması ve karter yağ süzgeci tıkanması sonucu motor yatak sarması riski',
    );
  }
  if (!hasLeafSprings && normModel.includes('doblo')) {
    typicalFocusIssues.push(
      'Bi-Link bağımsız arka süspansiyon rot ve salıncak burçlarında boşluk; 1.6 MultiJet EGR soğutucu ve manifold kurum birikimi',
    );
  }
  if (hasLeafSprings) {
    typicalFocusIssues.push(
      'Ağır ticari yük altında arka parabolik makas yapraklarında çökme, merkez cıvatası ve makas burcu aşınması',
    );
  }
  typicalFocusIssues.push(
    'Sürgülü yan kapı alt/orta makara rulman boşluğu ve kilit karşılığı aşınması',
    'Şehir içi dur-kalk teslimatlarda debriyaj baskı balata ve çift kütleli volan (DMF) vuruntusu',
  );

  return {
    segment,
    segmentNameTr,
    defaultCc,
    defaultHp,
    candidatePowers,
    cargoVolumeM3,
    trunkCapacityLiters,
    curbWeightKg,
    hasLeafSprings,
    suspensionType,
    hasWetTimingBelt,
    typicalFocusIssues,
  };
}
