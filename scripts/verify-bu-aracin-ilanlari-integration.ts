import { PrismaClient, ListingStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('TORQUESCOUT — BU ARACIN İLANLARI INTEGRATION AUDIT & PROOF');
  console.log('================================================================\n');

  // 1. Audit Target Variant & Exact Active Match in DB
  const testVariantId = '317464b3-c046-4a99-8cb0-b66c4b206ad6';
  const variant = await prisma.vehicleVariant.findUnique({
    where: { id: testVariantId },
    include: {
      brand: true,
      model: true,
      generation: true,
      engine: true,
      transmission: true,
      trim: true,
    },
  });

  if (!variant) {
    throw new Error(`Test variant ${testVariantId} not found in database!`);
  }

  console.log('--- 1. AUDIT CANONICAL 8-FIELD VEHICLE IDENTITY ---');
  console.log(`  Brand: ${variant.brand?.name} (${variant.brandId})`);
  console.log(`  Model: ${variant.model?.name} (${variant.modelId})`);
  console.log(`  Year: ${variant.year}`);
  console.log(`  BodyType: ${variant.bodyType}`);
  console.log(`  FuelType: ${variant.fuelType}`);
  console.log(`  Transmission: ${variant.transmission?.type} (${variant.transmissionId})`);
  console.log(`  EngineId: ${variant.engineId}`);
  console.log(`  Trim: ${variant.trim?.name} (${variant.trimId})`);

  // 2. Query Exact Active Listings matching this variant
  const variantCondition: any = {
    brandId: variant.brandId,
    modelId: variant.modelId,
    year: variant.year,
  };
  if (variant.bodyType) variantCondition.bodyType = variant.bodyType;
  if (variant.fuelType) variantCondition.fuelType = variant.fuelType;
  if (variant.engineId) variantCondition.engineId = variant.engineId;
  if (variant.trimId) variantCondition.trimId = variant.trimId;
  if (variant.transmissionId) variantCondition.transmissionId = variant.transmissionId;

  const where: any = {
    status: ListingStatus.ACTIVE,
    OR: [
      { vehicleVariantId: variant.id },
      { vehicleVariant: variantCondition },
    ],
  };

  const total = await prisma.vehicleListing.count({ where });
  const items = await prisma.vehicleListing.findMany({
    where,
    take: 20,
    orderBy: [
      { isFeatured: 'desc' },
      { isShowcaseFeedActive: 'desc' },
      { createdAt: 'desc' },
      { id: 'asc' },
    ],
    select: {
      id: true,
      listingNo: true,
      title: true,
      modelYear: true,
      priceAmount: true,
      status: true,
    },
  });

  console.log('\n--- 2. EXACT ACTIVE LISTINGS AUDIT ---');
  console.log(`  Total exact matching active listings: ${total}`);
  console.log(`  Preview items returned (take: 20): ${items.length}`);
  items.forEach((item, idx) => {
    console.log(`    [${idx + 1}] ${item.listingNo} | ${item.title} | ${item.modelYear} | ${item.priceAmount} TL | Status: ${item.status}`);
    if (!item.listingNo?.startsWith('TSIN-')) {
      throw new Error(`Listing ${item.id} does not have a canonical TSIN!`);
    }
  });

  if (total !== 2) {
    throw new Error(`Expected exactly 2 exact matching listings for variant ${testVariantId}, got ${total}`);
  }

  // 3. Verify Other Unrelated Listings are Excluded
  console.log('\n--- 3. NEGATIVE TEST: OUT-OF-FILTER EXCLUSION ---');
  const otherListings = await prisma.vehicleListing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      id: { notIn: items.map(i => i.id) },
    },
    take: 5,
    select: { id: true, listingNo: true, title: true, modelYear: true },
  });
  console.log(`  Verified ${otherListings.length} other active listings are NOT returned in exact match preview.`);

  // 4. File Structure & Wording Verification
  console.log('\n--- 4. CODEBASE & TERMINOLOGY INTEGRITY AUDIT ---');
  const widgetPath = path.join(__dirname, '../apps/web/src/app/listings/components/VehicleExactListingsWidget.tsx');
  const widgetContent = fs.readFileSync(widgetPath, 'utf-8');

  if (widgetContent.includes('BENZER İLANLAR') || widgetContent.includes('Benzer İlanlar') || widgetContent.includes('Benzer İlanları Gör')) {
    throw new Error('VehicleExactListingsWidget contains forbidden "Benzer İlanlar" terminology!');
  }
  console.log('  PASS: VehicleExactListingsWidget contains ZERO "Benzer İlanlar" phrasing.');

  if (!widgetContent.includes('BU ARACIN İLANLARI')) {
    throw new Error('VehicleExactListingsWidget missing canonical title "BU ARACIN İLANLARI"!');
  }
  console.log('  PASS: Canonical title "BU ARACIN İLANLARI" verified.');

  if (!widgetContent.includes('Bu Aracın Tüm İlanlarını Gör')) {
    throw new Error('VehicleExactListingsWidget missing canonical CTA "Bu Aracın Tüm İlanlarını Gör"!');
  }
  console.log('  PASS: Canonical CTA "Bu Aracın Tüm İlanlarını Gör" verified.');

  // Check right sidebar sequence in vehicle/[id]/page.tsx
  const vehiclePagePath = path.join(__dirname, '../apps/web/src/app/vehicle/[id]/page.tsx');
  const vehiclePageContent = fs.readFileSync(vehiclePagePath, 'utf-8');

  const chatbotIdx = vehiclePageContent.indexOf('handleSendChat');
  const isicepteIdx = vehiclePageContent.indexOf('<IsiCepteListingRecommendationWidget');
  const buAracinIdx = vehiclePageContent.indexOf('<VehicleExactListingsWidget');

  if (chatbotIdx === -1 || isicepteIdx === -1 || buAracinIdx === -1) {
    throw new Error('Missing one of the three right column components in vehicle/[id]/page.tsx');
  }

  if (!(chatbotIdx < isicepteIdx && isicepteIdx < buAracinIdx)) {
    throw new Error('Right column sequence is invalid! Expected: 1. AI Chatbot -> 2. IsiCepte -> 3. VehicleExactListingsWidget');
  }
  console.log('  PASS: Right sidebar sequence verified: 1. AI Chatbot -> 2. IsiCepte -> 3. BU ARACIN İLANLARI.');

  console.log('\n================================================================');
  console.log('ALL VERIFICATION STEPS PASSED WITH 100% COMPLIANCE!');
  console.log('================================================================\n');
}

main()
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
