import { PrismaClient } from '@prisma/client';
import { VariantTechnicalFactsService } from '../apps/api/src/modules/vehicle/variant-technical-facts.service';
import { VehiclePowerEnrichmentService } from '../apps/api/src/modules/vehicle/vehicle-power-enrichment.service';
import { WebSearchProvider } from '../apps/api/src/modules/research/providers/web-search.provider';

const prisma = new PrismaClient();

async function run() {
  console.log('================================================================');
  console.log('RECONCILE CANARIES STRICTLY THROUGH PRODUCTION SERVICE');
  console.log('ZERO DIRECT PRISMA WRITES — CANONICAL DISCOVERY & PERSISTENCE');
  console.log('================================================================\n');

  const webSearch = new WebSearchProvider();
  const powerService = new VehiclePowerEnrichmentService(prisma as any, webSearch);
  const factsService = new VariantTechnicalFactsService(prisma as any, powerService, webSearch);

  // Canary IDs
  const audiVariantId = 'dde6b4e3-40a0-4652-b038-e10324bd077d';
  const brzVariantId = 'ae5c8d89-21dd-4c32-aad1-6e517510f9fa';
  const imprezaVariantId = '317464b3-c046-4a99-8cb0-b66c4b206ad6';

  // 1. AUDI RE-ENRICHMENT THROUGH PRODUCTION SERVICE
  console.log('--- 1. AUDI ENRICHMENT VIA factsService.enrichVariantTechnicalSpecs ---');
  factsService.resetMetrics();
  const audiResult = await factsService.enrichVariantTechnicalSpecs(audiVariantId, 'production-enrichment-user');
  console.log(`Audi Result:`);
  console.log(`  Displacement: ${audiResult.engineDisplacementCc} cc (Status: ${audiResult.engineDisplacement.status}, Quality: ${audiResult.engineDisplacement.evidenceQuality})`);
  console.log(`  Displacement Source: ${audiResult.sources.displacement}`);
  console.log(`  Power: ${audiResult.enginePowerHp} HP (Status: ${audiResult.enginePower.status}, Quality: ${audiResult.enginePower.evidenceQuality})`);
  console.log(`  isComplete: ${audiResult.isComplete}`);
  console.log(`  Web calls: ${factsService.totalExternalWebSearchCalls}, LLM calls: ${factsService.metrics.externalLLMCalls}`);

  // Assert Audi expected values POST-discovery (never fed as inputs)
  if (audiResult.engineDisplacementCc !== 1498 || audiResult.engineDisplacement.status !== 'VERIFIED') {
    throw new Error(`Audi expected 1498 cc VERIFIED, got ${audiResult.engineDisplacementCc} (status: ${audiResult.engineDisplacement.status})`);
  }
  if (audiResult.enginePowerHp !== 150 || audiResult.enginePower.status !== 'VERIFIED') {
    throw new Error(`Audi expected 150 HP VERIFIED, got ${audiResult.enginePowerHp} (status: ${audiResult.enginePower.status})`);
  }

  // 2. BRZ RE-ENRICHMENT THROUGH PRODUCTION SERVICE
  console.log('\n--- 2. BRZ ENRICHMENT VIA factsService.enrichVariantTechnicalSpecs ---');
  factsService.resetMetrics();
  const brzResult = await factsService.enrichVariantTechnicalSpecs(brzVariantId, 'production-enrichment-user');
  console.log(`BRZ Result:`);
  console.log(`  Displacement: ${brzResult.engineDisplacementCc} cc (Status: ${brzResult.engineDisplacement.status}, Quality: ${brzResult.engineDisplacement.evidenceQuality})`);
  console.log(`  Displacement Source: ${brzResult.sources.displacement}`);
  console.log(`  Power: ${brzResult.enginePowerHp} HP (Status: ${brzResult.enginePower.status}, Quality: ${brzResult.enginePower.evidenceQuality})`);
  console.log(`  isComplete: ${brzResult.isComplete}`);
  console.log(`  Web calls: ${factsService.totalExternalWebSearchCalls}, LLM calls: ${factsService.metrics.externalLLMCalls}`);

  // Assert BRZ expected values POST-discovery (never fed as inputs)
  if (brzResult.engineDisplacementCc !== 1998 || brzResult.engineDisplacement.status !== 'VERIFIED') {
    throw new Error(`BRZ expected 1998 cc VERIFIED, got ${brzResult.engineDisplacementCc} (status: ${brzResult.engineDisplacement.status})`);
  }
  if (brzResult.enginePowerHp !== 200 || brzResult.enginePower.status !== 'VERIFIED') {
    throw new Error(`BRZ expected 200 HP VERIFIED, got ${brzResult.enginePowerHp} (status: ${brzResult.enginePower.status})`);
  }

  // 3. IMPREZA VERIFICATION (Should require 0 external calls because already complete and verified)
  console.log('\n--- 3. IMPREZA VERIFICATION VIA factsService.enrichVariantTechnicalSpecs ---');
  factsService.resetMetrics();
  const imprezaResult = await factsService.enrichVariantTechnicalSpecs(imprezaVariantId, 'production-enrichment-user');
  console.log(`Impreza Result:`);
  console.log(`  Displacement: ${imprezaResult.engineDisplacementCc} cc (Status: ${imprezaResult.engineDisplacement.status}, Quality: ${imprezaResult.engineDisplacement.evidenceQuality})`);
  console.log(`  Power: ${imprezaResult.enginePowerHp} HP (Status: ${imprezaResult.enginePower.status}, Quality: ${imprezaResult.enginePower.evidenceQuality})`);
  console.log(`  isComplete: ${imprezaResult.isComplete}`);
  console.log(`  Web calls: ${factsService.totalExternalWebSearchCalls}, LLM calls: ${factsService.metrics.externalLLMCalls}`);

  if (imprezaResult.engineDisplacementCc !== 1994 || imprezaResult.enginePowerHp !== 160) {
    throw new Error(`Impreza expected 1994 cc and 160 HP, got ${imprezaResult.engineDisplacementCc} cc / ${imprezaResult.enginePowerHp} HP`);
  }
  if (factsService.totalExternalWebSearchCalls !== 0 || factsService.metrics.externalLLMCalls !== 0) {
    throw new Error(`Impreza expected 0 external research calls, got ${factsService.totalExternalWebSearchCalls} web / ${factsService.metrics.externalLLMCalls} LLM`);
  }

  console.log('\n>>> CANARY RECONCILIATION VIA PRODUCTION SERVICE COMPLETED SUCCESSFULLY <<<');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
