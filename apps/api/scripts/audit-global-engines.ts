import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const engines = await prisma.engine.findMany({
    select: {
      id: true,
      code: true,
      displacement: true,
      horsepower: true,
      _count: { select: { variants: true } }
    },
    orderBy: { code: 'asc' }
  });

  const trimsPattern = /\b(TITANIUM\s+PLUS|TITANIUM|SPORT\s+COUPE|DYNAMIC|BUSINESS|LOUNGE|STYLE|COMFORT|PREMIUM|PRESTIGE|ELEGANCE|EXCLUSIVE|PASSION|PURE|N\s+LINE|R\s*[- ]?LINE|S\s*[- ]?LINE|GT\s*[- ]?LINE|FR|BLACK\s+LINE|JOURNEY\s+TITANIUM\s+PLUS|JOURNEY\s+TITANIUM|EX\s+COMFORT|MPFI\s+COMFORT|SX\s+COMFORT|SPORTY|ADVANTAGE|URBAN|PROGRESSION|ICONIC|ALLURE|FEEL\s+BOLD|FEEL|SHINE\s+BOLD|SHINE|LIVE|TOUCH\s+PLUS|TOUCH|JOY|ICON|INTENS|CROSS|ACTIVE|TREKKING|ST\s*[- ]?LINE|VIGNALE|LIFE|ELEGANCE\s+PLUS|PRIME|ELITE|DESIGN|ADVANCE|SOL|TERRA|VISION|LA\s+PRIMA|TECHNO|SIGNATURE|LOFT|SUITE|PORTFOLIO|XCLUSIVE|M\s+EXCELLENCE|POLARSTAR|VECTOR|LINEAR|REFLEX)\b/i;

  const hybridGroup: typeof engines = [];
  const pureWordGroup: typeof engines = [];

  for (const eng of engines) {
    if (eng._count.variants === 0) continue;
    const code = eng.code.trim();
    const hasDigits = /\d/.test(code);

    if (!hasDigits) {
      pureWordGroup.push(eng);
    } else if (trimsPattern.test(code)) {
      hybridGroup.push(eng);
    }
  }

  console.log('Total Active Engine Records in DB:', engines.filter(e => e._count.variants > 0).length);
  console.log('1. Pure Word Engines (no digits):', pureWordGroup.length);
  console.log('2. Hybrid Engines (engine + trim/package):', hybridGroup.length);

  console.log('\n--- TOP 30 HYBRID ENGINES (BY VARIANT COUNT) ---');
  hybridGroup.sort((a, b) => b._count.variants - a._count.variants);
  for (const e of hybridGroup.slice(0, 30)) {
    console.log(`  [${e._count.variants.toString().padStart(4)}] ${e.code}`);
  }

  console.log('\n--- TOP 30 PURE WORD ENGINES (BY VARIANT COUNT) ---');
  pureWordGroup.sort((a, b) => b._count.variants - a._count.variants);
  for (const e of pureWordGroup.slice(0, 30)) {
    console.log(`  [${e._count.variants.toString().padStart(4)}] ${e.code}`);
  }
}

main().finally(() => prisma.$disconnect());
