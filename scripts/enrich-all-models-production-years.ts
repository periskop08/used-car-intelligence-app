import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ModelItem {
  id: string;
  name: string;
  brandName: string;
}

interface BatchResult {
  brand: string;
  model: string;
  startYear: number;
  endYear: number;
}

async function processBrandBatch(brandName: string, models: ModelItem[], retryCount = 0): Promise<BatchResult[]> {
  const modelNames = models.map(m => m.name);
  const prompt = `You are a certified automotive catalog database specialist for European and Turkish automotive markets.
For brand "${brandName}", provide the authentic European / Turkish market production and sales year range (startYear and endYear) for each of these models:
${JSON.stringify(modelNames)}

CRITICAL AUTOMOTIVE CATALOG RULES:
1. startYear: 4-digit integer when the model first launched or was sold (e.g. 2004 for Kia Cerato, 2010 for Peugeot RCZ, 1996 for Renault Megane, 2015 for Fiat Egea, 2008 for VW Scirocco, 2009 for Chevrolet Cruze).
2. endYear: 4-digit integer when the model's production or Turkish market sales officially ended (e.g. 2024 for Kia Cerato, 2015 for Peugeot RCZ, 2017 for VW Scirocco, 2015 for Chevrolet Cruze, 2018 for Fiat Punto, 2020 for Alfa Romeo Giulietta).
3. Active Models: If the model is STILL in active production and sold today as of 2025/2026 (e.g. Renault Clio, Megane, VW Golf, Passat, Toyota Corolla, Kia Sportage, BMW 3 Serisi, Fiat Egea), set endYear to 2026.
4. Accuracy is paramount for Turkish and European market automotive specifications.

Return valid JSON with format:
{
  "results": [
    { "brand": "${brandName}", "model": "ModelName", "startYear": 2004, "endYear": 2024 }
  ]
}`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const parsed = JSON.parse(res.choices[0].message.content || '{}');
    const list = parsed.results || parsed.models || [];
    return list.map((item: any) => ({
      brand: brandName,
      model: item.model || item.name,
      startYear: Number(item.startYear),
      endYear: Number(item.endYear),
    })).filter((item: BatchResult) => 
      item.model && 
      !isNaN(item.startYear) && 
      !isNaN(item.endYear) &&
      item.startYear > 1950 &&
      item.endYear >= item.startYear &&
      item.endYear <= 2026
    );
  } catch (err: any) {
    if (retryCount < 2) {
      console.warn(`[Retry ${retryCount + 1}] Failed for ${brandName}: ${err.message}. Retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      return processBrandBatch(brandName, models, retryCount + 1);
    }
    console.error(`[Error] Failed processing ${brandName}:`, err.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting Turkish & European Market Model Production Years Enrichment...');

  const allModels = await prisma.model.findMany({
    select: {
      id: true,
      name: true,
      startYear: true,
      endYear: true,
      brand: { select: { id: true, name: true } },
    },
    orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
  });

  console.log(`📊 Found ${allModels.length} models across database.`);

  // Group by brand
  const byBrand = new Map<string, ModelItem[]>();
  for (const m of allModels) {
    const bName = m.brand.name;
    if (!byBrand.has(bName)) byBrand.set(bName, []);
    byBrand.get(bName)!.push({ id: m.id, name: m.name, brandName: bName });
  }

  const brands = Array.from(byBrand.keys());
  console.log(`🏢 Total brands to process: ${brands.length}`);

  let updatedCount = 0;
  const CONCURRENCY = 5;

  // Process in chunks of CONCURRENCY
  for (let i = 0; i < brands.length; i += CONCURRENCY) {
    const chunk = brands.slice(i, i + CONCURRENCY);
    const promises = chunk.map(async (brandName) => {
      const models = byBrand.get(brandName)!;
      const results = await processBrandBatch(brandName, models);
      
      let brandUpdated = 0;
      for (const res of results) {
        const targetModel = models.find(m => m.name.toLowerCase() === res.model.toLowerCase());
        if (targetModel) {
          await prisma.model.update({
            where: { id: targetModel.id },
            data: {
              startYear: res.startYear,
              endYear: res.endYear,
            },
          });
          brandUpdated++;
        }
      }
      return { brandName, total: models.length, updated: brandUpdated };
    });

    const chunkResults = await Promise.all(promises);
    for (const cr of chunkResults) {
      updatedCount += cr.updated;
      console.log(`[${i + 1}/${brands.length}] ${cr.brandName}: ${cr.updated}/${cr.total} models updated.`);
    }
  }

  console.log(`\n🎉 SUCCESS: Enriched ${updatedCount} / ${allModels.length} models with authentic production years.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
