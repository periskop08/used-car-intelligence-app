import { PrismaClient } from '@prisma/client';
import { VariantTechnicalFactsService } from '../apps/api/src/modules/vehicle/variant-technical-facts.service';
import { VehiclePowerEnrichmentService } from '../apps/api/src/modules/vehicle/vehicle-power-enrichment.service';
import { WebSearchProvider } from '../apps/api/src/modules/research/providers/web-search.provider';

const prisma = new PrismaClient();

async function run() {
  const webSearch = new WebSearchProvider();
  const powerService = new VehiclePowerEnrichmentService(prisma as any, webSearch);
  const factsService = new VariantTechnicalFactsService(prisma as any, powerService, webSearch);

  const canaries = [
    { name: 'Subaru Impreza 2006', variantId: '317464b3-c046-4a99-8cb0-b66c4b206ad6' },
    { name: 'Audi A3 35 TFSI 2020', variantId: 'dde6b4e3-40a0-4652-b038-e10324bd077d' },
    { name: 'Subaru BRZ 2013', variantId: 'ae5c8d89-21dd-4c32-aad1-6e517510f9fa' },
  ];

  console.log('==================================================');
  console.log('PRE-WRITE PURE-READ AUDIT (ZERO WRITES, ZERO RESEARCH)');
  console.log('==================================================');

  factsService.resetMetrics();

  for (const c of canaries) {
    const res = await factsService.getVariantTechnicalFacts(c.variantId);
    console.log(`\nCanary: ${c.name} (${c.variantId})`);
    console.log(`  Displacement: ${res.engineDisplacementCc} cc (Status: ${res.engineDisplacement.status}, Quality: ${res.engineDisplacement.evidenceQuality})`);
    console.log(`  Displacement Source: ${res.sources.displacement || 'NONE'}`);
    console.log(`  Power: ${res.enginePowerHp} HP (Status: ${res.enginePower.status}, Quality: ${res.enginePower.evidenceQuality})`);
    console.log(`  Power Source: ${res.sources.power || 'NONE'}`);
    console.log(`  isComplete: ${res.isComplete}`);
  }

  console.log('\nTelemetry Metrics:');
  console.log(`  externalWebSearchCalls: ${factsService.totalExternalWebSearchCalls}`);
  console.log(`  externalLLMCalls: ${factsService.metrics.externalLLMCalls}`);
  console.log(`  researchTriggeredCount: ${factsService.metrics.researchTriggeredCount}`);

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
