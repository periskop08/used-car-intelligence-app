const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Heuristic function to estimate expected fuel type from engine code
function getExpectedFuelType(engineCode, modelName) {
  const code = (engineCode || "").toLowerCase().trim();
  const model = (modelName || "").toLowerCase().trim();

  // 1. Electric indicators
  const electricKeywords = ["electric", "bev", "ev", "e-tron", "taycan", "eqc", "eqe", "eqs", "i3s", "zoe", "leaf"];
  if (electricKeywords.some(kw => code.includes(kw) || model.includes(kw))) {
    return "ELECTRIC";
  }

  // 2. Hybrid indicators
  const hybridKeywords = ["hybrid", "phev", "mhev", "plug-in", "e-hybrid", "h hybrid", "e-power"];
  if (hybridKeywords.some(kw => code.includes(kw) || model.includes(kw))) {
    return "HYBRID";
  }

  // 3. LPG indicators
  const lpgKeywords = ["lpg", "g-tec", "eco-g", "cng", "tgi", "g-tron"];
  if (lpgKeywords.some(kw => code.includes(kw))) {
    return "LPG";
  }

  // 4. Diesel indicators
  // Standalone 'd' pattern: e.g. "320d", "1.6 d", "2.0d", "530d", but NOT ending in "hybrid"
  const hasDieselKeyword = /(?:tdi|dci|cdi|hdi|tdci|crdi|multijet|jtd|ddis|bluehdi|d-4d|did|ctdi|i-dtec|dtci|sd4|td4|td6|d-lock|d-cvt)\b/i.test(code);
  const endsWithD = /[^a-zA-Z]d$/i.test(code) || /\b\d{3}d\b/i.test(code) || /\b\d\.\d\s*d\b/i.test(code) || (code.endsWith('d') && !code.endsWith('hybrid') && !code.endsWith('forward') && !code.endsWith('second'));

  if (hasDieselKeyword || endsWithD) {
    return "DIESEL";
  }

  // Default to PETROL (since most other options are petrol like TFSI, TSI, VTI, Turbo, naturally aspirated, etc.)
  return "PETROL";
}

async function main() {
  console.log("Starting vehicle fuel type verification...");

  console.log("Fetching all Brands...");
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" }
  });
  console.log(`Found ${brands.length} brands in DB.`);

  let totalAnalyzed = 0;
  let totalMismatches = 0;
  const mismatches = [];
  const brandStats = {};

  for (const brand of brands) {
    console.log(`Analyzing brand: ${brand.name}...`);
    
    const variants = await prisma.vehicleVariant.findMany({
      where: { brandId: brand.id },
      include: {
        model: true,
        engine: true
      }
    });

    brandStats[brand.name] = {
      total: variants.length,
      mismatches: 0
    };

    for (const v of variants) {
      totalAnalyzed++;
      if (!v.engine || !v.engine.code) continue;

      const currentFuel = v.fuelType;
      const expectedFuel = getExpectedFuelType(v.engine.code, v.model.name);

      // We compare PLUG_IN_HYBRID and HYBRID as matching
      const isMatch = currentFuel === expectedFuel || 
                      ((currentFuel === "HYBRID" || currentFuel === "PLUG_IN_HYBRID") && expectedFuel === "HYBRID");

      if (!isMatch) {
        brandStats[brand.name].mismatches++;
        totalMismatches++;
        mismatches.push({
          id: v.id,
          brand: brand.name,
          model: v.model.name,
          year: v.year,
          engineCode: v.engine.code,
          dbFuel: currentFuel,
          expectedFuel: expectedFuel
        });
      }
    }
    
    if (brandStats[brand.name].mismatches > 0) {
      console.log(`-> ${brand.name}: Found ${brandStats[brand.name].mismatches} mismatches out of ${brandStats[brand.name].total} variants.`);
    }
  }

  console.log("\nGenerating reports...");
  
  // Save detailed JSON
  const reportJsonPath = path.join(__dirname, "../vehicle-verification-report.json");
  fs.writeFileSync(reportJsonPath, JSON.stringify(mismatches, null, 2), "utf-8");

  // Save Markdown Report
  const reportMdPath = path.join(__dirname, "../vehicle-verification-report.md");
  let mdContent = `# Araç Yakıt Tipi Doğrulama Raporu\n\n`;
  mdContent += `**Tarih:** ${new Date().toLocaleString("tr-TR")}\n`;
  mdContent += `**Analiz Edilen Toplam Varyant:** ${totalAnalyzed}\n`;
  mdContent += `**Tespit Edilen Toplam Uyuşmazlık (Hatalı Yakıt Türü):** ${totalMismatches}\n`;
  mdContent += `**Hata Oranı:** %${((totalMismatches / totalAnalyzed) * 100).toFixed(2)}\n\n`;

  mdContent += `## Marka Bazlı Hata Özetleri\n\n`;
  mdContent += `| Marka | Toplam Varyant | Hatalı Varyant Sayısı | Hata Oranı |\n`;
  mdContent += `| :--- | :---: | :---: | :---: |\n`;
  
  Object.keys(brandStats).forEach(brandName => {
    const stats = brandStats[brandName];
    if (stats.total > 0) {
      const rate = ((stats.mismatches / stats.total) * 100).toFixed(2);
      mdContent += `| **${brandName}** | ${stats.total} | ${stats.mismatches} | %${rate} |\n`;
    }
  });

  mdContent += `\n## Tespit Edilen Uyuşmazlık Örnekleri (İlk 100 Kayıt)\n\n`;
  mdContent += `| Marka | Model | Yıl | Motor Kodu | DB Yakıt Türü | Beklenen Yakıt Türü |\n`;
  mdContent += `| :--- | :--- | :---: | :--- | :---: | :---: |\n`;

  mismatches.slice(0, 100).forEach(m => {
    mdContent += `| ${m.brand} | ${m.model} | ${m.year} | \`${m.engineCode}\` | **${m.dbFuel}** | **${m.expectedFuel}** |\n`;
  });

  fs.writeFileSync(reportMdPath, mdContent, "utf-8");
  console.log(`Markdown report saved to: ${reportMdPath}`);
  console.log(`JSON report saved to: ${reportJsonPath}`);
  console.log(`Verification completed! Found ${totalMismatches} mismatches out of ${totalAnalyzed} variants.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
