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
  transmissionOptions: {
    hasAutomatic: boolean;
    manualType: string;
    automaticType: string;
    summaryTr: string;
  };
  operationalProfile: {
    turningRadiusMeters: number;
    heightMeters: number;
    cityManeuverSummaryTr: string;
    highwayStabilitySummaryTr: string;
  };
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
    // Fiat Doblo and Euro 6 diesel platforms: 2016+ models are officially 120 HP (Euro 6 / Euro 6D)
    const isPost2016Euro6 = Boolean(year && year >= 2016);
    const isFiat16 = normBrand.includes('fiat') || normModel.includes('doblo');
    defaultHp = explicitHp || (normEngine.includes('120') ? 120 : normEngine.includes('90') ? 90 : (isPost2016Euro6 && isFiat16 ? 120 : 105));
    candidatePowers = isPost2016Euro6 && isFiat16 ? [105, 120] : [90, 105, 120];
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
      const isPost2016Doblo = normModel.includes('doblo') && Boolean(year && year >= 2016);
      defaultHp = explicitHp || (normModel.includes('fiorino') ? 95 : isPost2016Doblo ? 120 : 105);
      candidatePowers = normModel.includes('fiorino') ? [75, 95] : isPost2016Doblo ? [105, 120] : [90, 105, 120];
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

  const isPassengerOrCombi =
    normModel.includes('combi') ||
    normModel.includes('kombi') ||
    normModel.includes('panorama') ||
    normModel.includes('tourneo') ||
    normModel.includes('tepee') ||
    normModel.includes('multispace') ||
    normModel.includes('camli') ||
    normTrim.includes('combi');

  // Check if volume is explicitly specified in trim (e.g. "13 m3", "11.5 m³", "5.8 m3", "3.4 m3")
  const volMatch = (trimPackage || '').match(/(\d+(?:[.,]\d+)?)\s*m[3³]/i);
  if (volMatch) {
    cargoVolumeM3 = parseFloat(volMatch[1].replace(',', '.'));
    trunkCapacityLiters = Math.round(cargoVolumeM3 * 1000);
  } else if (segment === 'COMPACT') {
    if (normTrim.includes('maxi') || normTrim.includes('l2')) {
      cargoVolumeM3 = 4.2;
      trunkCapacityLiters = isPassengerOrCombi ? 1050 : 4200;
      curbWeightKg = 1490;
    } else {
      cargoVolumeM3 = normModel.includes('fiorino') ? 2.5 : 3.4;
      trunkCapacityLiters = isPassengerOrCombi
        ? (normModel.includes('fiorino') ? 356 : 790)
        : (normModel.includes('fiorino') ? 2500 : 3400);
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

  // 7. Transmission Options Resolution
  let hasAutomatic = false;
  let manualType = '6 İleri Manuel';
  let automaticType = 'Mevcut Değil (Sadece Manuel)';
  let transmissionSummaryTr = '';

  if (normModel.includes('transporter') || normModel.includes('caravelle') || normModel.includes('multivan')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = '7 İleri DSG (DQ500 Islak Çift Kavrama)';
    transmissionSummaryTr =
      'Volkswagen Transporter serisinde ağır tork dayanımlı DQ500 ıslak çift kavramalı 7 ileri DSG şanzıman opsiyonu yaygındır. Manueli net geçişli ve dayanıklıdır; DSG versiyonunda ise 60.000 km şanzıman yağı/filtre değişimi ve yoğun dur-kalkta mekatronik basınç sağlığı hayati önem taşır.';
  } else if (normModel.includes('caddy')) {
    hasAutomatic = true;
    manualType = '5 veya 6 İleri Manuel';
    automaticType = '7 İleri DSG (Kuru veya Islak Çift Kavrama)';
    transmissionSummaryTr =
      'Caddy serisinde 7 ileri DSG çift kavrama şanzıman mevcuttur. Binek konforu sunsa da dur-kalk trafikte kavrama aşınması kontrol edilmelidir; manuel şanzıman ise düşük işletme maliyeti sunar.';
  } else if (normModel.includes('custom') || (normBrand.includes('ford') && segment === 'MEDIUM')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = '6 İleri SelectShift (Tork Konvertörlü)';
    transmissionSummaryTr =
      'Ford Transit Custom serisinde 6 ileri manuelin yanında 6 ileri SelectShift tork konvertörlü tam otomatik şanzıman sunulmaktadır. Tork konvertörlü yapı şehir içi dur-kalk teslimatlarda balata aşınması yaşatmaz, ticari kullanımda yüksek dayanıklılık sağlar.';
  } else if (normModel.includes('vito') || normModel.includes('v-klasse') || normModel.includes('viano')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = '7G-Tronic Plus / 9G-Tronic (Tork Konvertörlü)';
    transmissionSummaryTr =
      'Mercedes Vito serisinde 6 ileri manuelin yanı sıra konfor odaklı 7G-Tronic veya 9G-Tronic tork konvertörlü otomatik şanzımanlar sunulmaktadır. Filo ve VIP taşımacılıkta tork konvertörü uzun ömürlü ve sarsıntısızdır.';
  } else if (normModel.includes('doblo')) {
    hasAutomatic = year && year >= 2023 ? true : normEngine.includes('1.6');
    manualType = '5 veya 6 İleri Manuel';
    automaticType = year && year >= 2023 ? '8 İleri Tork Konvertörlü (EAT8)' : 'Comfort-Matic Robotize (Tek Kavrama)';
    transmissionSummaryTr =
      'Piyasada %90 oranında 5 veya 6 ileri manuel şanzımanla bulunur. Eski nesil Comfort-Matic robotize ünite dur-kalkta vites geçiş sarsıntısı yapabilir ve robot aktüatör bakımı ister; manuel versiyon ise çok düşük işletme maliyetiyle ticari olarak en ekonomik çözümdür.';
  } else if (normModel.includes('fiorino') || normModel.includes('nemo') || normModel.includes('bipper')) {
    hasAutomatic = false;
    manualType = '5 İleri Manuel';
    automaticType = 'Nadir Comfort-Matic Robotize';
    transmissionSummaryTr =
      'Ağırlıklı olarak 5 ileri manuel şanzımanla donatılmıştır. Kısa vites oranları şehir içi çevikliği destekler, debriyaj parça maliyeti son derece ekonomiktir.';
  } else if (normModel.includes('courier')) {
    hasAutomatic = Boolean(year && year >= 2024);
    manualType = '6 İleri Manuel';
    automaticType = year && year >= 2024 ? '7 İleri Çift Kavrama Otomatik' : 'Mevcut Değil (Sadece Manuel)';
    transmissionSummaryTr =
      'Model nesline göre 6 ileri manuel şanzıman hakimdir; vites yolları binek otomobil netliğinde olup debriyaj hafif ve ömürlüdür.';
  } else if (normModel.includes('berlingo') || normModel.includes('partner') || normModel.includes('rifter') || normModel.includes('combo')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = 'EAT8 (8 İleri Tork Konvertörlü Tam Otomatik)';
    transmissionSummaryTr =
      '6 ileri manuel ve Japon Aisin üretimi EAT8 tam otomatik tork konvertörlü şanzıman seçenekleri bulunur. EAT8 pürüzsüz geçişleri ve arıza direnciyle ticari/aile karması kullanımda büyük avantajdır.';
  } else if (normModel.includes('trafic') || normModel.includes('vivaro') || normModel.includes('expert') || normModel.includes('jumpy')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = normBrand.includes('renault') ? 'EDC Çift Kavrama Otomatik' : 'EAT8 Tork Konvertörlü Otomatik';
    transmissionSummaryTr =
      '6 ileri manuel standart olup, yeni nesillerde çift kavrama veya tork konvertörlü otomatik opsiyonları mevcuttur. Manuel şanzıman ağır yük altında kemikli ve dirençlidir.';
  } else if (normModel.includes('master')) {
    hasAutomatic = false;
    manualType = '6 İleri Manuel (Kısa 1. ve 2. Vites Oranlı)';
    automaticType = 'Nadir Quickshift Robotize (Piyasada %98 Manuel)';
    transmissionSummaryTr =
      'Renault Master serisinde ağır ticari yük taşımacılığına uygun kısa oranlı 6 ileri manuel şanzıman temel donanımdır. Türkiye pazarında otomatik opsiyonu neredeyse bulunmaz; manuel şanzımanın debriyaj baskısı ve senkromeçleri ağır tonajlı yüklere dirençlidir.';
  } else if (normModel.includes('ducato') || normModel.includes('boxer') || normModel.includes('jumper')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = 'ZF 9 İleri Tork Konvertörlü Otomatik veya Comfort-Matic Robotize';
    transmissionSummaryTr =
      'Standart olarak 6 ileri manuel sunulur; 2020 sonrası modellerde ZF kaynaklı 9 ileri tork konvertörlü otomatik şanzıman opsiyonu ile uzun yol yakıt ekonomisi ve sürüş konforu üst seviyeye çıkmıştır.';
  } else if (normModel.includes('daily')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = 'Hi-Matic (ZF 8 İleri Tork Konvertörlü Otomatik)';
    transmissionSummaryTr =
      'Iveco Daily sınıfında 8 ileri Hi-Matic tam otomatik tork konvertörlü şanzımanıyla öne çıkar. Ağır yük altında vites geçişleri kusursuzdur; manuel seçeneği ise şantiye ve ağır yük şartlarına azami direnç sunar.';
  } else if (normModel.includes('sprinter') || normModel.includes('crafter')) {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = normBrand.includes('mercedes') ? '7G-Tronic / 9G-Tronic Otomatik' : '8 İleri Tork Konvertörlü Otomatik';
    transmissionSummaryTr =
      '6 ileri manuel ve tork konvertörlü tam otomatik şanzıman opsiyonları mevcuttur. Uzun yol taşımacılığında otomatik şanzıman yakıt tüketimini ve sürücü yorgunluğunu minimize eder.';
  } else if (normModel.includes('transit') && segment === 'LARGE') {
    hasAutomatic = true;
    manualType = '6 İleri Manuel';
    automaticType = '10 İleri Otomatik (Arkadan İtiş) veya 6 İleri Otomatik (Önden Çekiş)';
    transmissionSummaryTr =
      'Büyük Transit modellerinde 6 ileri manuelin yanında arkadan itişli versiyonlarda 10 ileri tork konvertörlü otomatik şanzıman opsiyonu sunulmaktadır.';
  } else {
    hasAutomatic = segment === 'COMPACT';
    manualType = '5 veya 6 İleri Manuel';
    automaticType = segment === 'COMPACT' ? 'Tork Konvertörlü / Çift Kavrama Opsiyonel' : 'Mevcut Değil (Sadece Manuel)';
    transmissionSummaryTr = hasAutomatic
      ? 'Manuel ve otomatik şanzıman opsiyonları mevcuttur; ticari kullanımda manuel versiyon düşük bakım maliyeti sunar.'
      : 'Model ticari dayanıklılık ve işletme maliyeti gerekçesiyle ağırlıklı olarak manuel şanzıman ile üretilmiştir.';
  }

  // 8. Operational Dimensions & Ergonomics Profile
  const turningRadiusMeters = segment === 'LARGE' ? 14.1 : segment === 'MEDIUM' ? 12.0 : 10.8;
  const heightMeters = segment === 'LARGE' ? 2.50 : segment === 'MEDIUM' ? 1.97 : 1.83;
  let cityManeuverSummaryTr = '';
  let highwayStabilitySummaryTr = '';

  if (segment === 'COMPACT') {
    cityManeuverSummaryTr = `${turningRadiusMeters} metrelik dar dönüş yarıçapı, ${heightMeters} m tavan yüksekliği ve binek araç tabanlı şasisi sayesinde kapalı otoparklara sorunsuz girer, yoğun sokak arası teslimatlarda yüksek kıvraklık sunar.`;
    highwayStabilitySummaryTr = `${hasLeafSprings ? 'Arka yaprak yaylar yüksüzken arka aksta hafif sekme yapabilir' : 'Helezon yaylı arka süspansiyon sayesinde yüksüz durumda zıplama yapmaz'}; otoyolda binek otomobil dengesine yakın stabil bir seyir sergiler.`;
  } else if (segment === 'MEDIUM') {
    cityManeuverSummaryTr = `Yaklaşık ${heightMeters} m standart tavan yüksekliği sayesinde standart 2.0 metre tavan kotuna sahip kapalı AVM ve site otoparklarına giriş yapabilir; binek otomobili andıran kokpit ergonomisiyle şehir içi dağıtımda sürücüyü yormaz.`;
    highwayStabilitySummaryTr = `${hasLeafSprings ? 'Tek yaprak parabolik makaslar orta yükte optimum esneklik sağlar' : 'Dört tekerlekten bağımsız süspansiyonu sayesinde boşken bile savrulma ve arka sekme yaşatmaz'}; yüksek süratlerde binek araç konforunda şerit kararlılığı sunar.`;
  } else {
    // LARGE
    cityManeuverSummaryTr = `${heightMeters} metrelik H2 yüksek tavan yapısı ve 6 metreyi aşan gövde boyu nedeniyle kapalı otoparklara kesinlikle giremez. ${turningRadiusMeters} metrelik geniş dönüş çapı, dar şehir içi sokak dönüşlerinde arka aks salınımına ve kör noktalara ekstra dikkat gerektirir.`;
    highwayStabilitySummaryTr = `Büyük yan gövde panelleri viyadük ve köprü geçişlerinde şiddetli yan rüzgarlara karşı gövdeyi yanal kuvvete maruz bırakır. Ağır parabolik makas mimarisi yüklü durumda mükemmel yol tutuşu sağlarken yüksüz seyirde arka aksta rijit tepkiler verir.`;
  }

  const transmissionOptions = {
    hasAutomatic,
    manualType,
    automaticType,
    summaryTr: transmissionSummaryTr,
  };

  const operationalProfile = {
    turningRadiusMeters,
    heightMeters,
    cityManeuverSummaryTr,
    highwayStabilitySummaryTr,
  };

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
    transmissionOptions,
    operationalProfile,
  };
}
