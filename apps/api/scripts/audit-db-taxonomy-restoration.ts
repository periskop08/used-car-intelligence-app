import { PrismaClient, FuelType } from '@prisma/client';

const prisma = new PrismaClient();

const TRIM_WORDS = [
  'LINE', 'SPORT', 'M SPORT', 'EDITION', 'LUXURY', 'COMFORT', 'ADVANTAGE', 'JOY',
  'PRESTIGE', 'PREMIUM', 'STYLE', 'PURE', 'URBAN', 'EXECUTIVE', 'STANDART', 'STANDARD',
  'AMG', 'AVANTGARDE', 'FASCINATION', 'EXCLUSIVE', 'PROGRESSIVE', 'ALLURE', 'GT LINE',
  'FEEL', 'SHINE', 'LIVE', 'TOUCH', 'ICON', 'INTENSE', 'TITANIUM', 'TREND',
  'ELITE', 'STYLE', 'ELEGANCE', 'AMBITION', 'ACTIVE', 'DYNAMIC', 'PASSION',
  'GHIA', 'FLAIR', 'FUN', 'F SPORT', 'BLUEEFFICIENCY', 'KOMP', 'E BOXER'
];

export function isContaminatedEngineCode(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  const hasDigits = /\d/.test(clean);
  
  // Specific known fake phrases
  if (clean.startsWith('BLUEEFFICIENCY ') || clean.startsWith('KOMP ') || clean.startsWith('E BOXER ')) {
    return true;
  }
  if (['F SPORT', 'F SPORT DESIGN', 'F SPORT PLUS', 'EDITION 1 AMG', '300 4 MATIC AMG'].includes(clean)) {
    return true;
  }

  const matchesTrimWord = TRIM_WORDS.some(
    w => clean === w || clean.endsWith(' ' + w) || clean.startsWith(w + ' ')
  );
  const isSpecialEdition =
    /edition|paket|package|donanim/i.test(clean) &&
    !/(\d+\.\d+)/.test(clean) &&
    !/tdi|tsi|tfsi|dci|cdi|crdi|puretech|ecoboost/i.test(clean);

  return (!hasDigits && matchesTrimWord) || isSpecialEdition;
}

async function main() {
  console.log('================================================================');
  console.log('🔍 COMPREHENSIVE TAXONOMY RESTORATION AUDIT');
  console.log('================================================================\n');

  const allEngines = await prisma.engine.findMany();
  const fakeEngines = allEngines.filter(e => isContaminatedEngineCode(e.code));
  const fakeEngineIds = fakeEngines.map(e => e.id);
  const fakeIdsList = fakeEngineIds.map(id => `'${id}'`).join(',');

  console.log(`Identified ${fakeEngines.length} fake engine codes in Engine table.\n`);

  const affectedModels: Array<{ brand: string; model: string; cnt: number }> =
    await prisma.$queryRawUnsafe(`
      SELECT b.name as brand, m.name as model, COUNT(v.id)::int as cnt
      FROM "VehicleVariant" v
      JOIN "Brand" b ON b.id = v."brandId"
      JOIN "Model" m ON m.id = v."modelId"
      WHERE v."engineId" IN (${fakeIdsList})
      GROUP BY b.name, m.name
      ORDER BY cnt DESC
    `);

  console.log(`Found ${affectedModels.length} brand+model combinations with contaminated engines.`);
  console.log(`Total contaminated variants: ${affectedModels.reduce((acc, r) => acc + r.cnt, 0)}\n`);

  console.log('Top 30 Affected Brand + Models:');
  affectedModels.slice(0, 30).forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.brand} ${r.model} (${r.cnt} variants)`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
