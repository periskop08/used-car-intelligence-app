import { PrismaClient, Role, SubscriptionTier, SubscriptionStatus, ApprovalStatus, RiskLevel, TransmissionType, FuelType, BodyType } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

function mapBodyType(typeStr: string): BodyType {
  const cleanType = String(typeStr || '').toUpperCase().trim();
  
  if (cleanType.includes('SEDAN')) return BodyType.SEDAN;
  if (cleanType.includes('HATCHBACK')) return BodyType.HATCHBACK;
  if (cleanType.includes('SUV')) return BodyType.SUV;
  if (cleanType.includes('COUPE')) return BodyType.COUPE;
  if (cleanType.includes('WAGON') || cleanType.includes('ESTATE')) return BodyType.WAGON;
  if (cleanType.includes('PICKUP') || cleanType.includes('PICK-UP')) return BodyType.PICKUP;
  if (cleanType.includes('VAN') || cleanType.includes('MINIBUS')) return BodyType.VAN;
  if (cleanType.includes('CONVERTIBLE') || cleanType.includes('CABRIO') || cleanType.includes('ROADSTER')) return BodyType.CONVERTIBLE;
  if (cleanType.includes('MINIVAN') || cleanType.includes('MPV')) return BodyType.MINIVAN;
  
  return BodyType.SEDAN;
}

// Pazar/Market eşleştirmeleri
const marketToCountryMap = {
  'Turkey': { code: 'TR', name: 'Türkiye' },
  'Europe': { code: 'EU', name: 'Avrupa' },
  'USA': { code: 'US', name: 'Amerika Birleşik Devletleri' },
  'UK': { code: 'GB', name: 'Birleşik Krallık' },
  'Canada': { code: 'CA', name: 'Kanada' },
  'Australia': { code: 'AU', name: 'Avustralya' },
  'Japan': { code: 'JP', name: 'Japonya' },
  'Korea': { code: 'KR', name: 'Güney Kore' },
  'China': { code: 'CN', name: 'Çin' },
  'France': { code: 'FR', name: 'Fransa' },
  'Italy': { code: 'IT', name: 'İtalya' }
};

interface CsvRecord {
  brand: string;
  model: string;
  generation: string;
  body_type: string;
  start_year: number;
  end_year: number;
  year: number;
  engine_name: string;
  engine_code: string;
  fuel_type: string;
  power_hp: number;
  transmission: string;
  drivetrain: string;
  trim: string;
  market: string;
  source_url: string;
  confidence: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log('Veritabanı temizleme işlemi başlatılıyor...');
  
  // Tabloları temizleme (TRUNCATE CASCADE ile milisaniyeler sürer)
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "TechnicalSpec", "CommonProblemTranslation", "CommonProblemSource", "CommonProblem", 
    "RecallSource", "Recall", "SellerQuestionTranslation", "SellerQuestion", 
    "InspectionChecklistItemTranslation", "InspectionChecklistItem", "UserRating", "UserReview", 
    "FavoriteVehicle", "VehicleComparison", "AiChatLog", "RawSource", "VehicleListing", 
    "VehicleResearchJob", "AiVehicleReport", "VehicleVariant", "GenerationTranslation", 
    "Generation", "ModelTranslation", "Model", "BrandTranslation", "Brand", "Engine", 
    "Transmission", "TrimTranslation", "Trim", "AuditLog" CASCADE;
  `);
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.country.deleteMany();
  await prisma.language.deleteMany();
  
  console.log('Temizleme işlemi tamamlandı.');

  // Temel kurulum verileri (Language, Country, SubscriptionPlan, User)
  console.log('Temel kurulum verileri ekleniyor...');
  const langTr = await prisma.language.create({ data: { code: 'tr', name: 'Türkçe' } });
  
  // Pazarları/Ülkeleri ekleme
  const countryMap: { [key: string]: string } = {};
  for (const [marketName, countryInfo] of Object.entries(marketToCountryMap)) {
    const c = await prisma.country.create({
      data: { code: countryInfo.code, name: countryInfo.name }
    });
    countryMap[marketName] = c.id;
  }
  
  const countryTrId = countryMap['Turkey'];

  // Abonelik Planları
  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      tier: SubscriptionTier.FREE,
      name: 'Ücretsiz Plan',
      priceTrl: 0,
      priceUsd: 0,
      limits: {
        aiChat: { period: 'daily', limit: 5 },
        vehicleComparison: { period: 'lifetime', limit: 1 },
        favoriteVehicle: { period: 'lifetime', limit: 0 },
        sellerQuestions: false,
        inspectionChecklist: false,
        detailedRiskNotes: false
      }
    }
  });

  const premiumPlan = await prisma.subscriptionPlan.create({
    data: {
      tier: SubscriptionTier.PREMIUM,
      name: 'Premium Paket',
      priceTrl: 899,
      priceUsd: 24.99,
      limits: {
        aiChat: { period: 'daily', limit: 100 },
        vehicleComparison: { period: 'monthly', limit: null },
        favoriteVehicle: { period: 'lifetime', limit: null },
        sellerQuestions: true,
        inspectionChecklist: true,
        detailedRiskNotes: true
      }
    }
  });

  // Kullanıcılar
  const demoAdmin = await prisma.user.create({
    data: {
      email: 'admin@usedcarintel.com',
      passwordHash: '$2b$12$demoAdminHashForTestingPassword123!',
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PREMIUM,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTrId
    }
  });

  const demoUser = await prisma.user.create({
    data: {
      email: 'user@usedcarintel.com',
      passwordHash: '$2b$12$demoUserHashForTestingPassword123!',
      role: Role.USER,
      subscriptionTier: SubscriptionTier.FREE,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTrId
    }
  });

  await prisma.user.create({
    data: {
      email: 'm.efeeguven@gmail.com',
      passwordHash: 'password123',
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PREMIUM,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTrId
    }
  });

  await prisma.user.create({
    data: {
      email: 'burhanseckin08@gmail.com',
      passwordHash: 'password123',
      role: Role.ADMIN,
      subscriptionTier: SubscriptionTier.PREMIUM,
      preferredLanguageCode: 'tr',
      preferredCountryId: countryTrId
    }
  });

  console.log('Temel kurulum verileri başarıyla eklendi.');

  // CSV dosyasını yükleme
  const csvPath = path.join(__dirname, '../TorqueScout_Global_Vehicle_Variant_Database_2000_2026.csv');
  console.log(`CSV dosyası okunuyor: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV dosyası bulunamadı: ${csvPath}. Lütfen önce Python betiğini çalıştırın.`);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  
  const records: CsvRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (fields.length < headers.length) continue;
    
    const record: any = {};
    headers.forEach((header, idx) => {
      let val: any = fields[idx];
      if (header === 'start_year' || header === 'end_year' || header === 'year' || header === 'power_hp' || header === 'confidence') {
        val = Number(val) || 0;
      }
      record[header] = val;
    });
    
    if (record.year < 2000) continue;
    records.push(record as CsvRecord);
  }
  console.log(`CSV başarıyla okundu. Toplam satır sayısı: ${records.length}`);

  // 1. Markaları Ekle
  console.log('Markalar ekleniyor...');
  const uniqueBrands = Array.from(new Set(records.map(r => r.brand)));
  await prisma.brand.createMany({
    data: uniqueBrands.map(b => ({ name: b, isActive: true })),
    skipDuplicates: true
  });
  const brands = await prisma.brand.findMany();
  const brandMap = new Map<string, string>();
  brands.forEach(b => brandMap.set(b.name, b.id));

  // 2. Modelleri Ekle
  console.log('Modeller ekleniyor...');
  const uniqueModelsMap = new Map<string, { brandId: string; name: string; startYear: number; endYear: number | null }>();
  records.forEach(r => {
    const brandId = brandMap.get(r.brand);
    if (!brandId) return;
    const modelName = String(r.model);
    const key = `${brandId}_${modelName}`;
    if (!uniqueModelsMap.has(key)) {
      uniqueModelsMap.set(key, {
        brandId,
        name: modelName,
        startYear: Number(r.start_year) || 2000,
        endYear: Number(r.end_year) || 2026
      });
    }
  });
  await prisma.model.createMany({
    data: Array.from(uniqueModelsMap.values()),
    skipDuplicates: true
  });
  const models = await prisma.model.findMany();
  const modelMap = new Map<string, string>();
  models.forEach(m => modelMap.set(`${m.brandId}_${m.name}`, m.id));

  // 3. Jenerasyonları Ekle
  console.log('Jenerasyonlar ekleniyor...');
  const uniqueGensMap = new Map<string, { modelId: string; name: string; startYear: number; endYear: number | null; bodyType: BodyType }>();
  records.forEach(r => {
    const brandId = brandMap.get(r.brand);
    if (!brandId) return;
    const modelId = modelMap.get(`${brandId}_${String(r.model)}`);
    if (!modelId) return;
    const genName = String(r.generation);
    const key = `${modelId}_${genName}_${r.start_year}_${mapBodyType(r.body_type)}`;
    if (!uniqueGensMap.has(key)) {
      uniqueGensMap.set(key, {
        modelId,
        name: genName,
        startYear: Number(r.start_year) || 2000,
        endYear: Number(r.end_year) || 2026,
        bodyType: mapBodyType(r.body_type)
      });
    }
  });
  await prisma.generation.createMany({
    data: Array.from(uniqueGensMap.values()),
    skipDuplicates: true
  });
  const generations = await prisma.generation.findMany();
  const genMap = new Map<string, string>();
  generations.forEach(g => genMap.set(`${g.modelId}_${g.name}_${g.startYear}_${g.bodyType}`, g.id));

  // 4. Motorları Ekle
  console.log('Motorlar ekleniyor...');
  const fuelMapTrToEnum: Record<string, FuelType> = {
    'Benzin': FuelType.PETROL,
    'Dizel': FuelType.DIESEL,
    'LPG': FuelType.LPG,
    'LPG & Benzin': FuelType.LPG,
    'Hibrit': FuelType.HYBRID,
    'Plug-in Hibrit': FuelType.PLUG_IN_HYBRID,
    'Elektrik': FuelType.ELECTRIC,
    'Diğer': FuelType.OTHER,
    'PETROL': FuelType.PETROL,
    'DIESEL': FuelType.DIESEL,
    'HYBRID': FuelType.HYBRID,
    'PLUG_IN_HYBRID': FuelType.PLUG_IN_HYBRID,
    'ELECTRIC': FuelType.ELECTRIC,
    'OTHER': FuelType.OTHER
  };

  const uniqueEnginesMap = new Map<string, { code: string; displacement: number; horsepower: number; torque: number; fuelType: FuelType; hasTurbo: boolean; isHybrid: boolean; isElectric: boolean }>();
  records.forEach(r => {
    const fuelTypeStr = String(r.fuel_type);
    const fuelType = fuelMapTrToEnum[fuelTypeStr] || FuelType.PETROL;
    const isElectric = fuelType === FuelType.ELECTRIC;
    const isHybrid = fuelType === FuelType.HYBRID || fuelType === FuelType.PLUG_IN_HYBRID;
    
    const engineName = String(r.engine_name);
    let displacement = 1600;
    if (isElectric) {
      displacement = 0;
    } else {
      const match = engineName.match(/(\d+\.\d+)/);
      if (match) {
        displacement = Math.round(parseFloat(match[1]) * 1000);
      }
    }
    
    const hp = Number(r.power_hp) || 100;
    const torque = Math.round(hp * 1.2);
    const engineCode = String(r.engine_code);
    const hasTurbo = engineName.toLowerCase().includes('turbo') || engineName.toLowerCase().includes('t') || engineName.toLowerCase().includes('tdi');
    
    const key = `${engineCode}_${displacement}_${hp}_${torque}_${fuelType}`;
    if (!uniqueEnginesMap.has(key)) {
      uniqueEnginesMap.set(key, {
        code: engineCode,
        displacement,
        horsepower: hp,
        torque,
        fuelType,
        hasTurbo,
        isHybrid,
        isElectric
      });
    }
  });
  await prisma.engine.createMany({
    data: Array.from(uniqueEnginesMap.values()),
    skipDuplicates: true
  });
  const engines = await prisma.engine.findMany();
  const engineMap = new Map<string, string>();
  engines.forEach(e => engineMap.set(`${e.code}_${e.displacement}_${e.horsepower}_${e.torque}_${e.fuelType}`, e.id));

  // 5. Şanzımanları Ekle
  console.log('Şanzımanlar ekleniyor...');
  const uniqueTransMap = new Map<string, { name: string; type: TransmissionType; speeds: number }>();
  records.forEach(r => {
    const transType = (r.transmission as TransmissionType) || TransmissionType.MANUAL;
    const speeds = transType === TransmissionType.MANUAL ? 6 : (r.fuel_type === 'ELECTRIC' || r.fuel_type === 'Elektrik') ? 1 : 8;
    const name = transType === TransmissionType.MANUAL ? 'Manuel' : (transType === TransmissionType.DCT ? 'Yarı Otomatik' : 'Otomatik');
    const key = `${name}_${transType}_${speeds}`;
    if (!uniqueTransMap.has(key)) {
      uniqueTransMap.set(key, {
        name,
        type: transType,
        speeds
      });
    }
  });
  await prisma.transmission.createMany({
    data: Array.from(uniqueTransMap.values()),
    skipDuplicates: true
  });
  const transmissions = await prisma.transmission.findMany();
  const transMap = new Map<string, string>();
  transmissions.forEach(t => transMap.set(`${t.name}_${t.type}_${t.speeds}`, t.id));

  // 6. Donanımları (Trim) Ekle
  console.log('Donanım paketleri ekleniyor...');
  const uniqueTrims = Array.from(new Set(records.map(r => String(r.trim || '')).filter(Boolean)));
  await prisma.trim.createMany({
    data: uniqueTrims.map(t => ({ name: t })),
    skipDuplicates: true
  });
  const trims = await prisma.trim.findMany();
  const trimMap = new Map<string, string>();
  trims.forEach(t => trimMap.set(t.name, t.id));

  console.log('brandMap size:', brandMap.size);
  console.log('modelMap size:', modelMap.size);
  console.log('genMap size:', genMap.size);
  console.log('engineMap size:', engineMap.size);
  console.log('transMap size:', transMap.size);
  console.log('trimMap size:', trimMap.size);
  console.log('countryMap:', countryMap);

  const first = records[0];
  const firstBrandId = brandMap.get(first.brand);
  const firstModelId = modelMap.get(`${firstBrandId}_${String(first.model)}`);
  const firstGenKey = `${firstModelId}_${String(first.generation)}_${first.start_year}_${mapBodyType(first.body_type)}`;
  console.log('First record:', first);
  console.log('brandId for first:', firstBrandId);
  console.log('modelId for first:', firstModelId);
  console.log('generationId key for first:', firstGenKey);
  console.log('generationId in genMap for first:', genMap.get(firstGenKey));

  // 7. Varyantları Ekle (Batching & Deduplication)
  console.log('Araç varyantları eşleştiriliyor ve tekilleştiriliyor...');
  const variantsToInsert: any[] = [];
  const variantKeys = new Set<string>();

  records.forEach((r, idx) => {
    const brandId = brandMap.get(r.brand);
    if (!brandId) return;
    const modelId = modelMap.get(`${brandId}_${String(r.model)}`);
    if (!modelId) return;
    const generationId = genMap.get(`${modelId}_${String(r.generation)}_${r.start_year}_${mapBodyType(r.body_type)}`);
    if (!generationId) return;
    
    // Motor ID eşleştirme anahtarı
    const fuelTypeStr = String(r.fuel_type);
    const fuelType = fuelMapTrToEnum[fuelTypeStr] || FuelType.PETROL;
    const isElectric = fuelType === FuelType.ELECTRIC;
    
    const engineName = String(r.engine_name);
    let displacement = 1600;
    if (isElectric) {
      displacement = 0;
    } else {
      const match = engineName.match(/(\d+\.\d+)/);
      if (match) {
        displacement = Math.round(parseFloat(match[1]) * 1000);
      }
    }
    
    const hp = Number(r.power_hp) || 100;
    const torque = Math.round(hp * 1.2);
    const engineCode = String(r.engine_code);
    const engineId = engineMap.get(`${engineCode}_${displacement}_${hp}_${torque}_${fuelType}`);
    if (!engineId) return;

    // Şanzıman ID eşleştirme anahtarı
    const transType = (r.transmission as TransmissionType) || TransmissionType.MANUAL;
    const speeds = transType === TransmissionType.MANUAL ? 6 : fuelType === FuelType.ELECTRIC ? 1 : 8;
    const transName = transType === TransmissionType.MANUAL ? 'Manuel' : (transType === TransmissionType.DCT ? 'Yarı Otomatik' : 'Otomatik');
    const transmissionId = transMap.get(`${transName}_${transType}_${speeds}`);
    if (!transmissionId) return;

    // Trim ID
    const trimId = trimMap.get(String(r.trim || '')) || '';
    
    // Country ID
    const countryId = countryMap[r.market];
    if (!countryId) return;

    const year = Number(r.year);

    // Tekillik anahtarı (brandId, modelId, generationId, engineId, transmissionId, trimId, countryId, year)
    const uniqueKey = `${brandId}_${modelId}_${generationId}_${engineId}_${transmissionId}_${trimId}_${countryId}_${year}`;
    if (!variantKeys.has(uniqueKey)) {
      variantKeys.add(uniqueKey);
      variantsToInsert.push({
        brandId,
        modelId,
        generationId,
        engineId,
        transmissionId,
        trimId,
        countryId,
        year,
        yearStart: Number(r.start_year) || 2000,
        yearEnd: Number(r.end_year) || 2026,
        bodyType: mapBodyType(r.body_type),
        fuelType,
        marketRegion: r.market,
        status: ApprovalStatus.APPROVED
      });
    }

    if (idx > 0 && idx % 50000 === 0) {
      console.log(`Eşleştirme ilerlemesi: ${idx}/${records.length} satır işlendi...`);
    }
  });

  // Array.prototype.append düzeltmesi: variantsToInsert bir array olduğundan push kullanmalıyız.
  // JavaScript'te array için push kullanırız. python'da append vardı, dikkat!
  console.log(`Tekil varyant sayısı: ${variantsToInsert.length}. Veritabanına aktarım başlıyor...`);

  // 5000'erlik parçalar halinde (chunks) yazma
  const chunkSize = 5000;
  for (let i = 0; i < variantsToInsert.length; i += chunkSize) {
    const chunk = variantsToInsert.slice(i, i + chunkSize);
    await prisma.vehicleVariant.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Aktarım ilerlemesi: ${Math.min(i + chunkSize, variantsToInsert.length)}/${variantsToInsert.length} varyant eklendi.`);
  }

  console.log('Seeding işlemi başarıyla tamamlandı!');
}

main()
  .catch((e) => {
    console.error('Seeding sırasında hata oluştu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
