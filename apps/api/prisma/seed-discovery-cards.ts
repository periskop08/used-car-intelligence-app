import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_MODELS = [
  {
    brand: "Volkswagen",
    modelFamily: "Passat",
    bodyType: "Sedan",
    fuelType: "DIESEL",
    transmissionType: "AUTOMATIC",
    engineVersion: "2.0 TDI DSG",
    power: "150 PS",
    torque: "340 Nm",
    productionYears: "2015 - 2020",
    averageConsumption: "4.5 L/100 km",
    drivetrain: "FWD",
    tags: ["sedan", "d-segment", "dizel", "otomatik", "aile-aracı", "uzun-yol", "geniş-bagaj", "konfor"]
  },
  {
    brand: "Volkswagen",
    modelFamily: "Golf",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.5 TSI Act",
    power: "150 PS",
    torque: "250 Nm",
    productionYears: "2017 - 2023",
    averageConsumption: "5.2 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "c-segment", "benzinli", "otomatik", "şehir-içi", "kolay-park", "sportif", "popüler"]
  },
  {
    brand: "Opel",
    modelFamily: "Astra",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.2 Turbo EAT8",
    power: "130 PS",
    torque: "230 Nm",
    productionYears: "2021 - 2026",
    averageConsumption: "5.4 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "c-segment", "benzinli", "otomatik", "tasarım", "şehir-içi", "ekonomik", "kolay-park"]
  },
  {
    brand: "BMW",
    modelFamily: "3 Serisi",
    bodyType: "Sedan",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "320i 1.6",
    power: "170 PS",
    torque: "250 Nm",
    productionYears: "2019 - 2026",
    averageConsumption: "6.3 L/100 km",
    drivetrain: "RWD",
    tags: ["sedan", "d-segment", "benzinli", "otomatik", "performans", "sportif", "premium", "sürüş-keyfi"]
  },
  {
    brand: "BMW",
    modelFamily: "5 Serisi",
    bodyType: "Sedan",
    fuelType: "DIESEL",
    transmissionType: "AUTOMATIC",
    engineVersion: "520d xDrive",
    power: "190 PS",
    torque: "400 Nm",
    productionYears: "2017 - 2023",
    averageConsumption: "5.2 L/100 km",
    drivetrain: "AWD",
    tags: ["sedan", "e-segment", "dizel", "otomatik", "premium", "konfor", "uzun-yol", "prestij"]
  },
  {
    brand: "Mercedes-Benz",
    modelFamily: "C Serisi",
    bodyType: "Sedan",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "C180 1.6",
    power: "156 PS",
    torque: "250 Nm",
    productionYears: "2014 - 2021",
    averageConsumption: "6.2 L/100 km",
    drivetrain: "RWD",
    tags: ["sedan", "d-segment", "benzinli", "otomatik", "premium", "konfor", "prestij", "aile-aracı"]
  },
  {
    brand: "Renault",
    modelFamily: "Megane",
    bodyType: "Sedan",
    fuelType: "DIESEL",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.5 dCi EDC",
    power: "115 PS",
    torque: "260 Nm",
    productionYears: "2016 - 2024",
    averageConsumption: "4.1 L/100 km",
    drivetrain: "FWD",
    tags: ["sedan", "c-segment", "dizel", "otomatik", "ekonomik", "aile-aracı", "geniş-bagaj", "popüler"]
  },
  {
    brand: "Fiat",
    modelFamily: "Egea",
    bodyType: "Sedan",
    fuelType: "DIESEL",
    transmissionType: "MANUAL",
    engineVersion: "1.3 Multijet",
    power: "95 PS",
    torque: "200 Nm",
    productionYears: "2015 - 2026",
    averageConsumption: "4.0 L/100 km",
    drivetrain: "FWD",
    tags: ["sedan", "c-segment", "dizel", "manuel", "ekonomik", "düşük-bakım", "yedek-parça", "popüler"]
  },
  {
    brand: "Honda",
    modelFamily: "Civic",
    bodyType: "Sedan",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.5 VTEC Turbo",
    power: "182 PS",
    torque: "220 Nm",
    productionYears: "2016 - 2021",
    averageConsumption: "5.7 L/100 km",
    drivetrain: "FWD",
    tags: ["sedan", "c-segment", "benzinli", "otomatik", "performans", "sorunsuzluk", "geniş-iç-hacim", "sportif"]
  },
  {
    brand: "Renault",
    modelFamily: "Clio",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.0 TCe X-Tronic",
    power: "90 PS",
    torque: "142 Nm",
    productionYears: "2019 - 2026",
    averageConsumption: "5.0 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "b-segment", "benzinli", "otomatik", "şehir-içi", "kolay-park", "ekonomik", "popüler"]
  },
  {
    brand: "Toyota",
    modelFamily: "Corolla",
    bodyType: "Sedan",
    fuelType: "HIBRIT",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.8 Hybrid e-CVT",
    power: "122 PS",
    torque: "142 Nm",
    productionYears: "2019 - 2026",
    averageConsumption: "3.8 L/100 km",
    drivetrain: "FWD",
    tags: ["sedan", "c-segment", "hibrit", "otomatik", "ekonomik", "sorunsuzluk", "düşük-tüketim", "aile-aracı"]
  },
  {
    brand: "Audi",
    modelFamily: "A4",
    bodyType: "Sedan",
    fuelType: "DIESEL",
    transmissionType: "AUTOMATIC",
    engineVersion: "2.0 TDI S-Tronic",
    power: "150 PS",
    torque: "320 Nm",
    productionYears: "2015 - 2020",
    averageConsumption: "4.2 L/100 km",
    drivetrain: "FWD",
    tags: ["sedan", "d-segment", "dizel", "otomatik", "premium", "konfor", "prestij", "yol-tutuşu"]
  },
  {
    brand: "Peugeot",
    modelFamily: "3008",
    bodyType: "SUV",
    fuelType: "DIESEL",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.5 BlueHDi EAT8",
    power: "130 PS",
    torque: "300 Nm",
    productionYears: "2016 - 2023",
    averageConsumption: "4.4 L/100 km",
    drivetrain: "FWD",
    tags: ["suv", "c-segment", "dizel", "otomatik", "tasarım", "geniş-bagaj", "teknoloji", "aile-aracı"]
  },
  {
    brand: "Audi",
    modelFamily: "A3",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.5 TFSI S-Tronic",
    power: "150 PS",
    torque: "250 Nm",
    productionYears: "2016 - 2020",
    averageConsumption: "4.9 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "c-segment", "benzinli", "otomatik", "premium", "sportif", "kalite", "şehir-içi"]
  },
  {
    brand: "Ford",
    modelFamily: "Focus",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.5 Ti-VCT SelectShift",
    power: "123 PS",
    torque: "150 Nm",
    productionYears: "2018 - 2024",
    averageConsumption: "6.0 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "c-segment", "benzinli", "otomatik", "yol-tutuşu", "güvenlik", "sportif", "sürüş-keyfi"]
  },
  {
    brand: "Nissan",
    modelFamily: "Qashqai",
    bodyType: "SUV",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.3 DIG-T DCT",
    power: "160 PS",
    torque: "270 Nm",
    productionYears: "2018 - 2021",
    averageConsumption: "5.6 L/100 km",
    drivetrain: "FWD",
    tags: ["suv", "c-segment", "benzinli", "otomatik", "popüler", "yüksek-oturuş", "aile-aracı", "kolay-satış"]
  },
  {
    brand: "Ford",
    modelFamily: "Fiesta",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.0 EcoBoost",
    power: "100 PS",
    torque: "170 Nm",
    productionYears: "2017 - 2023",
    averageConsumption: "4.8 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "b-segment", "benzinli", "otomatik", "kolay-park", "şehir-içi", "yol-tutuşu", "genç-işi"]
  },
  {
    brand: "TOGG",
    modelFamily: "T10X",
    bodyType: "SUV",
    fuelType: "ELEKTRIK",
    transmissionType: "AUTOMATIC",
    engineVersion: "V2 RWD Uzun Menzil",
    power: "218 PS",
    torque: "350 Nm",
    productionYears: "2023 - 2026",
    averageConsumption: "16.9 kWh/100 km",
    drivetrain: "RWD",
    tags: ["suv", "c-segment", "elektrik", "otomatik", "yerli", "teknoloji", "geniş-ekran", "düşük-maliyet"]
  },
  {
    brand: "Hyundai",
    modelFamily: "i20",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.4 MPI 6 ileri",
    power: "100 PS",
    torque: "134 Nm",
    productionYears: "2020 - 2026",
    averageConsumption: "6.2 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "b-segment", "benzinli", "otomatik", "sorunsuzluk", "şehir-içi", "kolay-park", "düşük-bakım"]
  },
  {
    brand: "Hyundai",
    modelFamily: "Tucson",
    bodyType: "SUV",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.6 T-GDI DCT",
    power: "180 PS",
    torque: "265 Nm",
    productionYears: "2021 - 2026",
    averageConsumption: "7.3 L/100 km",
    drivetrain: "FWD",
    tags: ["suv", "c-segment", "benzinli", "otomatik", "tasarım", "geniş-bagaj", "performans", "aile-aracı"]
  },
  {
    brand: "Nissan",
    modelFamily: "Micra",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.0 IG-T CVT",
    power: "92 PS",
    torque: "144 Nm",
    productionYears: "2017 - 2023",
    averageConsumption: "4.8 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "b-segment", "benzinli", "otomatik", "şehir-içi", "kolay-park", "ekonomik", "kadın-dostu"]
  },
  {
    brand: "Peugeot",
    modelFamily: "2008",
    bodyType: "SUV",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.2 PureTech EAT8",
    power: "130 PS",
    torque: "230 Nm",
    productionYears: "2019 - 2026",
    averageConsumption: "5.0 L/100 km",
    drivetrain: "FWD",
    tags: ["suv", "b-segment", "benzinli", "otomatik", "tasarım", "şehir-içi", "teknoloji", "popüler"]
  },
  {
    brand: "Audi",
    modelFamily: "A6",
    bodyType: "Sedan",
    fuelType: "DIESEL",
    transmissionType: "AUTOMATIC",
    engineVersion: "40 TDI Quattro",
    power: "204 PS",
    torque: "400 Nm",
    productionYears: "2018 - 2026",
    averageConsumption: "5.4 L/100 km",
    drivetrain: "AWD",
    tags: ["sedan", "e-segment", "dizel", "otomatik", "premium", "yol-tutuşu", "prestij", "uzun-yol"]
  },
  {
    brand: "Hyundai",
    modelFamily: "Elantra",
    bodyType: "Sedan",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.6 MPI CVT",
    power: "123 PS",
    torque: "154 Nm",
    productionYears: "2021 - 2026",
    averageConsumption: "6.0 L/100 km",
    drivetrain: "FWD",
    tags: ["sedan", "c-segment", "benzinli", "otomatik", "tasarım", "sorunsuzluk", "ekonomik", "aile-aracı"]
  },
  {
    brand: "Peugeot",
    modelFamily: "208",
    bodyType: "Hatchback",
    fuelType: "BENZINLI",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.2 PureTech EAT8",
    power: "100 PS",
    torque: "205 Nm",
    productionYears: "2019 - 2026",
    averageConsumption: "4.8 L/100 km",
    drivetrain: "FWD",
    tags: ["hatchback", "b-segment", "benzinli", "otomatik", "tasarım", "şehir-içi", "kolay-park", "sportif"]
  },
  {
    brand: "Ford",
    modelFamily: "Kuga",
    bodyType: "SUV",
    fuelType: "DIESEL",
    transmissionType: "AUTOMATIC",
    engineVersion: "1.5 EcoBlue 8 ileri",
    power: "120 PS",
    torque: "300 Nm",
    productionYears: "2020 - 2026",
    averageConsumption: "5.0 L/100 km",
    drivetrain: "FWD",
    tags: ["suv", "c-segment", "dizel", "otomatik", "yol-tutuşu", "geniş-bagaj", "konfor", "aile-aracı"]
  }
];

function generateAllCards() {
  const cards: any[] = [];
  BASE_MODELS.forEach((base, idx) => {
    // 1. Eco Variant (Diesel/Hybrid/Electric automatic)
    cards.push({
      ...base,
      modelFamily: `${base.modelFamily}`,
      imageUrl: "",
      isActive: true
    });

    // 2. Petrol Sporty Variant
    cards.push({
      ...base,
      modelFamily: `${base.modelFamily} 1.5 TSI/Turbo`,
      fuelType: "BENZINLI",
      transmissionType: "AUTOMATIC",
      engineVersion: "1.5 Turbo/TSI",
      power: `${parseInt(base.power) + 20} PS`,
      torque: `${parseInt(base.torque) + 30} Nm`,
      averageConsumption: `${(parseFloat(base.averageConsumption) + 0.8).toFixed(1)} L/100 km`,
      imageUrl: "",
      tags: [...base.tags, "sportif", "performans"],
      isActive: true
    });

    // 3. Economy Manual Variant
    cards.push({
      ...base,
      modelFamily: `${base.modelFamily} Trendline/Eco`,
      transmissionType: "MANUAL",
      power: `${parseInt(base.power) - 15} PS`,
      torque: `${parseInt(base.torque) - 40} Nm`,
      averageConsumption: `${(parseFloat(base.averageConsumption) - 0.4).toFixed(1)} L/100 km`,
      imageUrl: "",
      tags: [...base.tags, "manuel", "ekonomik", "düşük-bakım"],
      isActive: true
    });

    // 4. Premium High-End Variant
    cards.push({
      ...base,
      modelFamily: `${base.modelFamily} Exclusive/Highline`,
      power: `${parseInt(base.power) + 40} PS`,
      torque: `${parseInt(base.torque) + 80} Nm`,
      averageConsumption: `${(parseFloat(base.averageConsumption) + 1.2).toFixed(1)} L/100 km`,
      imageUrl: "",
      tags: [...base.tags, "premium", "prestij", "donanım"],
      isActive: true
    });
  });

  return cards;
}

async function main() {
  console.log("Truncating existing VehicleDiscoveryCard records...");
  await prisma.userVehiclePreferenceSwipe.deleteMany();
  await prisma.userVehiclePreferenceProfile.deleteMany();
  await prisma.vehicleDiscoveryCard.deleteMany();

  // Load guide cards for matching image URLs
  const guideCards = await prisma.vehicleGuideCard.findMany({
    select: { brand: true, model: true, heroImageUrl: true }
  });

  const cards = generateAllCards();

  // Map card image URLs dynamically to the corresponding guide card's heroImageUrl
  const mappedCards = cards.map((c) => {
    // Normalization helper
    const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "").replace("serisi", "").replace("series", "");
    const cBrand = norm(c.brand);
    const cModel = norm(c.modelFamily);

    // Find best match in guideCards
    const match = guideCards.find((g) => {
      if (norm(g.brand) !== cBrand) return false;
      const gModel = norm(g.model);
      return cModel.includes(gModel) || gModel.includes(cModel);
    });

    const finalImageUrl = (match && match.heroImageUrl) ? match.heroImageUrl : c.imageUrl;

    return {
      ...c,
      imageUrl: finalImageUrl,
    };
  });

  console.log(`Seeding ${mappedCards.length} VehicleDiscoveryCard records with realistic specs...`);

  await prisma.vehicleDiscoveryCard.createMany({
    data: mappedCards.map((c) => ({
      brand: c.brand,
      modelFamily: c.modelFamily,
      bodyType: c.bodyType,
      fuelType: c.fuelType,
      transmissionType: c.transmissionType,
      engineVersion: c.engineVersion,
      power: c.power,
      torque: c.torque,
      productionYears: c.productionYears,
      averageConsumption: c.averageConsumption,
      drivetrain: c.drivetrain,
      imageUrl: c.imageUrl,
      tags: c.tags,
      isActive: true
    }))
  });

  console.log("VehicleDiscoveryCard records seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding discovery cards:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
