import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of legitimate engine patterns or keywords to NEVER touch
const PROTECTED_ENGINE_PATTERNS = [
  /electric/i,
  /elektrik/i,
  /dual motor/i,
  /twin motor/i,
  /single motor/i,
  /long range/i,
  /standard range/i,
];

// Trims, editions, body types that get mistakenly appended to engine codes
const TRIM_SUFFIXES = [
  'TITANIUM PLUS', 'TITANIUM PLU', 'TITANIUM', 'SPORT COUPE', 'DYNAMIC', 'BUSINESS',
  'LOUNGE', 'STYLE', 'COMFORT', 'PREMIUM', 'PRESTIGE', 'ELEGANCE PLUS', 'ELEGANCE',
  'EXCLUSIVE', 'PASSION', 'PURE EXCELLENCE', 'PURE', 'N LINE', 'N-LINE', 'R-LINE',
  'R LINE', 'S-LINE', 'S LINE', 'GT-LINE', 'GT LINE', 'FR', 'BLACK LINE',
  'JOURNEY TITANIUM PLUS', 'JOURNEY TITANIUM PLU', 'JOURNEY TITANIUM',
  'EX COMFORT', 'MPFI COMFORT', 'SX COMFORT', 'SPORTY', 'ADVANTAGE', 'URBAN',
  'PROGRESSION', 'ICONIC', 'ALLURE', 'FEEL BOLD', 'FEEL', 'SHINE BOLD', 'SHINE',
  'LIVE', 'TOUCH PLUS', 'TOUCH', 'JOY', 'ICON', 'INTENS', 'CROSS', 'ACTIVE TOURER',
  'ACTIVE', 'TREKKING', 'ST-LINE', 'ST LINE', 'VIGNALE', 'LIFE', 'PRIME', 'ELITE',
  'DESIGN', 'ADVANCE', 'M EXCELLENCE', 'S PREMIUM', 'GT PREMIUM', 'BLACK EDITION',
  'SPECIAL EDITION'
];

// Pure words that are trims, editions, or body types mistakenly created as Engine
const PURE_WORDS_TO_TRIM: Record<string, string> = {
  'STANDART': 'Standart',
  'EXECUTIVE': 'Executive',
  'LOFT': 'Loft',
  'SUITE': 'Suite',
  'SIGNATURE': 'Signature',
  'TECHNO': 'Techno',
  'XCLUSIVE': 'Xclusive',
  'E XTRA': 'Extra',
  'E XTREME': 'Extreme',
  'LS': 'LS',
  'LT': 'LT',
  'LA PRIMA': 'La Prima',
  'MY FIESTA': 'My Fiesta',
  'ES': 'ES',
  'ECO': 'Eco',
  'SS': 'SS',
  'HALO': 'Halo',
  'LODGE': 'Lodge',
  'POLARSTAR': 'Polarstar',
  'VISION': 'Vision',
  'BOYUT': 'Boyut',
  'EMOTION': 'Emotion',
  'GRAND PRIX': 'Grand Prix',
  'TERRA': 'Terra',
  'SOL': 'Sol',
  'LINEAR': 'Linear',
  'VECTOR': 'Vector',
  'ROADSTER': 'Roadster',
  'PORTFOLIO': 'Portfolio',
  'M EXCELLENCE': 'M Excellence',
  'REFLEX': 'Reflex',
  'SPIRIT': 'Spirit',
  'SPORT PLUS': 'Sport Plus',
  'TERRA SPORTY': 'Terra Sporty',
  'TORNADO': 'Tornado',
  'TORNADO CRAWLER': 'Tornado Crawler',
  'MACAN': 'Macan',
  'MACAN TURBO': 'Macan Turbo',
  'MAGNUM': 'Magnum',
  'OBSIDIYEN': 'Obsidiyen',
  'POWER SENSE PLUS': 'Power Sense Plus',
  'R SPORT PLUS': 'R Sport Plus',
  'SINGLE ULTIMATE': 'Single Ultimate',
  'TWIN ULTIMATE': 'Twin Ultimate',
  'RECHARGE PRO': 'Recharge Pro',
  'RECHARGE ULTIMATE': 'Recharge Ultimate',
  'STORM': 'Storm',
};

function parseHybridEngine(code: string): { cleanEngine: string; trimName: string } | null {
  for (const pattern of PROTECTED_ENGINE_PATTERNS) {
    if (pattern.test(code)) return null;
  }

  const upper = code.trim().toUpperCase();

  for (const suffix of TRIM_SUFFIXES) {
    // Check if code ends with suffix or contains suffix as a word boundary
    const regex = new RegExp(`[\\s\\-_/]+${suffix}$`, 'i');
    if (regex.test(upper)) {
      const clean = code.replace(regex, '').trim();
      if (clean.length >= 2 && /\d/.test(clean)) {
        return {
          cleanEngine: clean,
          trimName: formatTitleCase(suffix)
        };
      }
    }
  }

  return null;
}

function formatTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function main() {
  console.log('================================================================');
  console.log('🔍 GLOBAL TAXONOMY CLEAN DRY-RUN AUDIT');
  console.log('================================================================\n');

  const allEngines = await prisma.engine.findMany({
    select: {
      id: true,
      code: true,
      displacement: true,
      horsepower: true,
      fuelType: true,
      _count: { select: { variants: true } }
    },
    orderBy: { code: 'asc' }
  });

  const hybridMatches: Array<{
    id: string;
    original: string;
    cleanEngine: string;
    trim: string;
    variants: number;
  }> = [];

  const pureWordMatches: Array<{
    id: string;
    original: string;
    trim: string;
    variants: number;
  }> = [];

  for (const eng of allEngines) {
    if (eng._count.variants === 0) continue;
    const upper = eng.code.trim().toUpperCase();

    // Check pure words
    if (PURE_WORDS_TO_TRIM[upper]) {
      pureWordMatches.push({
        id: eng.id,
        original: eng.code,
        trim: PURE_WORDS_TO_TRIM[upper],
        variants: eng._count.variants
      });
      continue;
    }

    // Check hybrid
    const hybrid = parseHybridEngine(eng.code);
    if (hybrid) {
      hybridMatches.push({
        id: eng.id,
        original: eng.code,
        cleanEngine: hybrid.cleanEngine,
        trim: hybrid.trimName,
        variants: eng._count.variants
      });
    }
  }

  console.log(`1. Hybrid Engines Found: ${hybridMatches.length} engine records`);
  const totalHybridVariants = hybridMatches.reduce((acc, m) => acc + m.variants, 0);
  console.log(`   -> Total variants impacted: ${totalHybridVariants}`);
  console.table(hybridMatches.slice(0, 35));

  console.log(`\n2. Pure Word Engines Found: ${pureWordMatches.length} engine records`);
  const totalPureWordVariants = pureWordMatches.reduce((acc, m) => acc + m.variants, 0);
  console.log(`   -> Total variants impacted: ${totalPureWordVariants}`);
  console.table(pureWordMatches.slice(0, 35));

  console.log(`\nTOTAL AFFECTED VARIANTS: ${totalHybridVariants + totalPureWordVariants}`);
}

main().finally(() => prisma.$disconnect());
