import { PrismaClient } from '@prisma/client';
import { VariantTechnicalFactsService } from '../apps/api/src/modules/vehicle/variant-technical-facts.service';
import { VehiclePowerEnrichmentService } from '../apps/api/src/modules/vehicle/vehicle-power-enrichment.service';
import { WebSearchProvider } from '../apps/api/src/modules/research/providers/web-search.provider';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RUNNING MULTI-BRAND CANARY REGRESSION CERTIFICATION ---');
  const webSearch = new WebSearchProvider();
  const powerService = new VehiclePowerEnrichmentService(prisma as any, webSearch);
  const factsService = new VariantTechnicalFactsService(prisma as any, powerService, webSearch);

  const canaries = [
    { name: 'Subaru Impreza 2006 (Reference Image 1)', id: 'a533988f-e3d8-4660-8876-0ca3f2065d75' },
    { name: 'Subaru BRZ 2013 (Canary ID: ae5c8d89-21dd-4c32-aad1-6e517510f9fa)', id: 'ae5c8d89-21dd-4c32-aad1-6e517510f9fa' },
    { name: 'Audi A3 35 TFSI Canary', id: '00664a70-2260-44d1-88be-8128ea4067e3' },
    { name: 'Renault Diesel (1.5 dCi)', id: '5c5aefd7-7cc9-4537-8b5d-c3c4fdf8545f' },
    { name: 'Volkswagen Turbo Petrol (2.0 TSI)', id: '25509b64-dfe5-4af7-a390-b93ef1dd30ae' },
    { name: 'Toyota NA Petrol (Corolla)', id: '044f81e1-8739-4e89-a7e4-c2ae50a740a5' },
  ];

  for (const c of canaries) {
    factsService.resetMetrics();
    const facts = await factsService.getVariantTechnicalFacts(c.id);
    console.log(`\nCanary: ${c.name} [${c.id}]`);
    console.log(`- Status: ccStatus=${facts.engineDisplacement.status}, powerStatus=${facts.enginePower.status}, isComplete=${facts.isComplete}`);
    console.log(`- Values: cc=${facts.engineDisplacementCc}, hp=${facts.enginePowerHp}`);
    console.log(`- Sources: ccSource=${facts.sources.displacement || 'NONE'}, powerSource=${facts.sources.power || 'NONE'}`);
    console.log(`- Read-path external calls: ${factsService.totalExternalWebSearchCalls}`);
  }

  // Verify second-user reuse for BRZ
  factsService.resetMetrics();
  const brzReuse = await factsService.getVariantTechnicalFacts('ae5c8d89-21dd-4c32-aad1-6e517510f9fa');
  console.log(`\nBRZ Second User Read Calls: ${factsService.totalExternalWebSearchCalls} (Required: 0)`);
  console.log(`BRZ Final Power: ${brzReuse.enginePowerHp} HP (Expected: 200 HP)`);
  console.log(`BRZ Final Displacement: ${brzReuse.engineDisplacementCc} cc (Expected: 1998 cc)`);
}

main().finally(() => prisma.$disconnect());
