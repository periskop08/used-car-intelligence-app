import { PrismaClient, BodyType, FuelType, TransmissionType, PriceConfidenceLevel, VehiclePriceSourceType, CardVariantReviewStatus, CardVariantMatchSource } from "@prisma/client";

const prisma = new PrismaClient();

function cleanOutliersAndCalculate(prices: number[]): { min: number; max: number; median: number; cleanedCount: number } {
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;

  const getPercentile = (p: number) => {
    const idx = (n - 1) * p;
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
  };

  const median = getPercentile(0.5);

  if (n < 5) {
    return { min: sorted[0], max: sorted[n - 1], median, cleanedCount: n };
  }

  const q1 = getPercentile(0.25);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const cleaned = sorted.filter(p => p >= lowerBound && p <= upperBound);

  if (cleaned.length < 3) {
    // Fallback if IQR cleans out too many values
    return { min: sorted[0], max: sorted[n - 1], median, cleanedCount: n };
  }

  return {
    min: cleaned[0],
    max: cleaned[cleaned.length - 1],
    median: cleaned[Math.floor(cleaned.length / 2)],
    cleanedCount: cleaned.length
  };
}

function parseProductionYears(yearsStr: string): { yearFrom: number | null; yearTo: number | null } {
  // Matches patterns like "2012 - 2017" or "2018 - Günümüz"
  const cleanStr = yearsStr.replace(/günümüz/i, "").trim();
  const parts = cleanStr.split("-").map(p => p.trim());
  
  const yearFrom = parts[0] ? parseInt(parts[0], 10) : null;
  const yearTo = parts[1] ? parseInt(parts[1], 10) : null;

  return {
    yearFrom: isNaN(yearFrom as any) ? null : yearFrom,
    yearTo: isNaN(yearTo as any) ? null : yearTo
  };
}

async function syncDiscoveryData() {
  console.log("Starting Discovery Card Variant matching and Pricing Snapshots calculation...");

  const cards = await prisma.vehicleDiscoveryCard.findMany();
  console.log(`Loaded ${cards.length} discovery cards.`);

  const brands = await prisma.brand.findMany();
  const models = await prisma.model.findMany();

  const usedRepresentativeVariantIds = new Set<string>();

  // Clear existing mappings and representative relations before rebuild
  await prisma.vehicleDiscoveryCardVariant.deleteMany();
  await prisma.vehicleDiscoveryCard.updateMany({ data: { representativeVariantId: null } });

  for (const card of cards) {
    // Parse years
    const { yearFrom, yearTo } = parseProductionYears(card.productionYears);

    // Find brand matching card
    const brand = brands.find(b => b.name.toLowerCase() === card.brand.toLowerCase());
    if (!brand) {
      console.log(`[Warning] No brand found for card brand: ${card.brand}`);
      continue;
    }

    // Find model family matches
    // Curated models can have sub-models, like "Duster Journey" or "3 Serisi M Sport".
    // We check if model name is contained within modelFamily or vice-versa
    const modelMatches = models.filter(m => 
      m.brandId === brand.id &&
      (card.modelFamily.toLowerCase().includes(m.name.toLowerCase()) || 
       m.name.toLowerCase().includes(card.modelFamily.toLowerCase()))
    );

    if (modelMatches.length === 0) {
      console.log(`[Warning] No model found for card modelFamily: ${card.modelFamily} (Brand: ${brand.name})`);
      continue;
    }

    const modelIds = modelMatches.map(m => m.id);

    // Map body type string to enum
    let cardBodyType: BodyType | null = null;
    const bodyStr = card.bodyType.toUpperCase();
    if (bodyStr.includes("SEDAN")) cardBodyType = BodyType.SEDAN;
    else if (bodyStr.includes("HATCHBACK")) cardBodyType = BodyType.HATCHBACK;
    else if (bodyStr.includes("SUV")) cardBodyType = BodyType.SUV;
    else if (bodyStr.includes("WAGON") || bodyStr.includes("STATION")) cardBodyType = BodyType.WAGON;
    else if (bodyStr.includes("PICKUP")) cardBodyType = BodyType.PICKUP;
    else if (bodyStr.includes("MINIVAN") || bodyStr.includes("VAN")) cardBodyType = BodyType.VAN;
    else cardBodyType = BodyType.OTHER;

    // Map fuel type string to enum
    let cardFuelType: FuelType | null = null;
    const fuelStr = card.fuelType.toLowerCase();
    if (fuelStr.includes("benzin")) cardFuelType = FuelType.PETROL;
    else if (fuelStr.includes("dizel")) cardFuelType = FuelType.DIESEL;
    else if (fuelStr.includes("lpg")) cardFuelType = FuelType.LPG;
    else if (fuelStr.includes("hibrit")) cardFuelType = FuelType.HYBRID;
    else if (fuelStr.includes("plug-in")) cardFuelType = FuelType.PLUG_IN_HYBRID;
    else if (fuelStr.includes("elektrik")) cardFuelType = FuelType.ELECTRIC;
    else cardFuelType = FuelType.OTHER;

    // Map transmission type string to enum array
    let variantTransTypes: TransmissionType[] = [];
    const transStr = card.transmissionType.toLowerCase();
    if (transStr.includes("manuel")) {
      variantTransTypes = [TransmissionType.MANUAL];
    } else {
      variantTransTypes = [TransmissionType.AUTOMATIC, TransmissionType.DCT, TransmissionType.CVT];
    }

    // Query variants matching criteria
    const variants = await prisma.vehicleVariant.findMany({
      where: {
        brandId: brand.id,
        modelId: { in: modelIds },
        bodyType: cardBodyType,
        fuelType: cardFuelType,
        transmission: { type: { in: variantTransTypes } },
        year: {
          gte: yearFrom || undefined,
          lte: yearTo || undefined
        }
      },
      include: {
        transmission: true
      }
    });

    if (variants.length === 0) {
      console.log(`[Warning] No matching VehicleVariant found for card: ${card.brand} ${card.modelFamily} (${card.bodyType}, ${card.fuelType}, ${card.transmissionType})`);
      continue;
    }

    // Link card to variants with APPROVED status (curated seed matching)
    await prisma.vehicleDiscoveryCardVariant.createMany({
      data: variants.map(v => ({
        cardId: card.id,
        vehicleVariantId: v.id,
        matchConfidence: 1.0,
        matchSource: CardVariantMatchSource.AUTO,
        reviewStatus: CardVariantReviewStatus.APPROVED
      }))
    });

    // Update representative variant and year boundaries on the card
    const representative = variants.find(v => !usedRepresentativeVariantIds.has(v.id)) || variants[0];
    usedRepresentativeVariantIds.add(representative.id);

    await prisma.vehicleDiscoveryCard.update({
      where: { id: card.id },
      data: {
        representativeVariantId: representative.id,
        yearFrom,
        yearTo
      }
    });

    console.log(`Mapped card [${card.brand} ${card.modelFamily}] to ${variants.length} variants. Representative: ${representative.id}`);
  }

  console.log("Card variant mapping finished successfully. Starting Variant Price Snapshots calculation...");

  // Get all unique variants that have active listings
  const variantsWithActiveListings = await prisma.vehicleVariant.findMany({
    where: {
      listings: {
        some: { status: "ACTIVE" }
      }
    },
    include: {
      listings: {
        where: { status: "ACTIVE" }
      }
    }
  });

  const now = new Date();
  const freshUntil = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
  const validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  for (const variant of variantsWithActiveListings) {
    const rawPrices = variant.listings
      .map(l => Number(l.priceAmount))
      .filter(p => p > 0 && !isNaN(p)); // Filter out <= 0 and invalid prices

    if (rawPrices.length < 3) continue;

    const { min, max, median, cleanedCount } = cleanOutliersAndCalculate(rawPrices);

    let confidenceLevel: PriceConfidenceLevel = PriceConfidenceLevel.LOW;
    if (cleanedCount >= 10) confidenceLevel = PriceConfidenceLevel.HIGH;
    else if (cleanedCount >= 5) confidenceLevel = PriceConfidenceLevel.MEDIUM;

    await prisma.vehicleVariantPriceSnapshot.upsert({
      where: { vehicleVariantId: variant.id },
      update: {
        estimatedMin: min,
        estimatedMax: max,
        medianPrice: median,
        sampleSize: cleanedCount,
        confidenceLevel,
        sourceType: VehiclePriceSourceType.ACTIVE_LISTINGS,
        calculatedAt: now,
        freshUntil,
        validUntil
      },
      create: {
        vehicleVariantId: variant.id,
        estimatedMin: min,
        estimatedMax: max,
        medianPrice: median,
        sampleSize: cleanedCount,
        confidenceLevel,
        sourceType: VehiclePriceSourceType.ACTIVE_LISTINGS,
        calculatedAt: now,
        freshUntil,
        validUntil
      }
    });
  }

  console.log("Variant Price Snapshots finished. Starting Card Price Snapshots calculation...");

  // Recalculate Card Price Snapshots from mapped variants' active listings
  const activeCards = await prisma.vehicleDiscoveryCard.findMany({
    where: { isActive: true }
  });

  for (const card of activeCards) {
    // Fetch mapped variants and listings for this specific card to avoid prepared statement limits
    const mappedVariants = await prisma.vehicleDiscoveryCardVariant.findMany({
      where: {
        cardId: card.id,
        reviewStatus: CardVariantReviewStatus.APPROVED
      },
      include: {
        variant: {
          include: {
            listings: {
              where: { status: "ACTIVE" }
            }
          }
        }
      }
    });

    // Collect distinct listing prices across all approved mapped variants
    const listingMap = new Map<string, number>();

    mappedVariants.forEach(mv => {
      mv.variant.listings.forEach(l => {
        const val = Number(l.priceAmount);
        if (val > 0 && !isNaN(val)) {
          listingMap.set(l.id, val);
        }
      });
    });

    const prices = Array.from(listingMap.values());

    if (prices.length < 3) {
      // If not enough listings, fallback to representative variant's price snapshot if exists
      const repSnapshot = card.representativeVariantId 
        ? await prisma.vehicleVariantPriceSnapshot.findUnique({ where: { vehicleVariantId: card.representativeVariantId } })
        : null;

      if (repSnapshot) {
        await prisma.vehicleDiscoveryCardPriceSnapshot.upsert({
          where: { cardId: card.id },
          update: {
            estimatedMin: repSnapshot.estimatedMin,
            estimatedMax: repSnapshot.estimatedMax,
            medianPrice: repSnapshot.medianPrice,
            sampleSize: repSnapshot.sampleSize,
            confidenceLevel: repSnapshot.confidenceLevel,
            sourceType: VehiclePriceSourceType.RELATED_VARIANT_FALLBACK,
            calculatedAt: now,
            freshUntil,
            validUntil
          },
          create: {
            cardId: card.id,
            estimatedMin: repSnapshot.estimatedMin,
            estimatedMax: repSnapshot.estimatedMax,
            medianPrice: repSnapshot.medianPrice,
            sampleSize: repSnapshot.sampleSize,
            confidenceLevel: repSnapshot.confidenceLevel,
            sourceType: VehiclePriceSourceType.RELATED_VARIANT_FALLBACK,
            calculatedAt: now,
            freshUntil,
            validUntil
          }
        });
      }
      continue;
    }

    const { min, max, median, cleanedCount } = cleanOutliersAndCalculate(prices);

    let confidenceLevel: PriceConfidenceLevel = PriceConfidenceLevel.LOW;
    if (cleanedCount >= 10) confidenceLevel = PriceConfidenceLevel.HIGH;
    else if (cleanedCount >= 5) confidenceLevel = PriceConfidenceLevel.MEDIUM;

    await prisma.vehicleDiscoveryCardPriceSnapshot.upsert({
      where: { cardId: card.id },
      update: {
        estimatedMin: min,
        estimatedMax: max,
        medianPrice: median,
        sampleSize: cleanedCount,
        confidenceLevel,
        sourceType: VehiclePriceSourceType.ACTIVE_LISTINGS,
        calculatedAt: now,
        freshUntil,
        validUntil
      },
      create: {
        cardId: card.id,
        estimatedMin: min,
        estimatedMax: max,
        medianPrice: median,
        sampleSize: cleanedCount,
        confidenceLevel,
        sourceType: VehiclePriceSourceType.ACTIVE_LISTINGS,
        calculatedAt: now,
        freshUntil,
        validUntil
      }
    });
  }

  console.log("All pricing snapshots generated and synced successfully!");
}

syncDiscoveryData()
  .catch(err => {
    console.error("Error synchronizing discovery card variants & pricing:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
