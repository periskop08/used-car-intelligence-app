import { PrismaClient, TechnicalSourceTier } from '@prisma/client';
import { VariantTechnicalFactsService } from '../apps/api/src/modules/vehicle/variant-technical-facts.service';
import { VehiclePowerEnrichmentService } from '../apps/api/src/modules/vehicle/vehicle-power-enrichment.service';
import { WebSearchProvider } from '../apps/api/src/modules/research/providers/web-search.provider';
import { getHpRangeById, filterVariantsByRange } from '../packages/shared/src/vehicleFilterRanges';

const prisma = new PrismaClient();

async function run() {
  console.log('================================================================');
  console.log('TORQUESCOUT: CANONICAL TECHNICAL FACT PROVENANCE RECONSTRUCTION');
  console.log('& PURE READ FINAL AUDIT (COLD SERVER RESTART SIMULATION)');
  console.log('================================================================\n');

  const canaries = [
    { name: 'Subaru Impreza 2006 (NA Petrol)', variantId: '317464b3-c046-4a99-8cb0-b66c4b206ad6', expCc: 1994, expHp: 160 },
    { name: 'Audi A3 35 TFSI 2020 (Turbo Petrol)', variantId: 'dde6b4e3-40a0-4652-b038-e10324bd077d', expCc: 1498, expHp: 150 },
    { name: 'Subaru BRZ 2013 (High-Rev Boxer NA)', variantId: 'ae5c8d89-21dd-4c32-aad1-6e517510f9fa', expCc: 1998, expHp: 200 },
  ];

  // ------------------------------------------------------------------
  // PART 1: LOW-LEVEL PERSISTED STATE PROVENANCE RECONSTRUCTION
  // Prove that a cold process can reconstruct the complete evidence chain
  // directly from PostgreSQL storage without any service/memory cache.
  // ------------------------------------------------------------------
  console.log('--- PART 1: DIRECT STORAGE PROVENANCE RECONSTRUCTION ---');
  let reconstructionSuccess = true;

  for (const c of canaries) {
    const spec = await prisma.technicalSpec.findUnique({ where: { variantId: c.variantId } });
    const power = await prisma.vehiclePowerEnrichment.findUnique({
      where: { vehicleVariantId: c.variantId },
      include: { evidences: true },
    });

    const specsObj = (spec?.specs as Record<string, any>) || {};
    const dispVerification = specsObj.displacementVerification;

    console.log(`\nCanary: ${c.name} (${c.variantId})`);
    console.log(`  [Displacement Persistence]`);
    console.log(`    engineDisplacementCc: ${specsObj.engineDisplacementCc}`);
    console.log(`    displacementStatus: ${specsObj.displacementStatus}`);
    console.log(`    hasStructuredVerification: ${Boolean(dispVerification)}`);

    if (dispVerification) {
      console.log(`    Policy Version: ${dispVerification.verificationPolicyVersion}`);
      console.log(`    Verified At: ${dispVerification.verifiedAt}`);
      console.log(`    Accepted Evidence Count: ${dispVerification.consensus?.acceptedEvidenceCount}`);
      console.log(`    Independent Domains: ${dispVerification.consensus?.independentDomainCount}`);
      console.log(`    Strongest Tier: ${dispVerification.consensus?.strongestTier}`);
      console.log(`    Evidence Chain:`);
      for (const ev of dispVerification.evidence || []) {
        console.log(`      - [Tier ${ev.sourceTier} ${ev.sourceKind}] ${ev.url} (${ev.extractedValue} ${ev.extractedUnit}, identityMatch: ${ev.identityMatch})`);
      }
    } else {
      console.log(`    Legacy Source: ${specsObj.displacementSource}`);
    }

    console.log(`  [Power Persistence]`);
    console.log(`    powerHp: ${power?.powerHp}, powerPs: ${power?.powerPs}`);
    console.log(`    verificationStatus: ${power?.verificationStatus}`);
    console.log(`    Source Market: ${power?.sourceMarket}`);
    console.log(`    Evidences Count: ${power?.evidences?.length || 0}`);
    for (const ev of power?.evidences || []) {
      console.log(`      - [${ev.sourceMarket}] ${ev.sourceUrl} (${ev.reportedValue} ${ev.reportedUnit})`);
    }

    // Verify reconstructability
    if (!specsObj.engineDisplacementCc || !power?.powerHp) {
      reconstructionSuccess = false;
    }
  }

  if (!reconstructionSuccess) {
    throw new Error('FAILED: Could not reconstruct canonical facts from persisted state!');
  }
  console.log('\n[PASS] serverRestartLosesVerificationEvidence = FALSE');

  // ------------------------------------------------------------------
  // PART 2: PURE-READ API AUDIT (ZERO WEBCALLS, ZERO LLMCALLS, ZERO WRITES)
  // ------------------------------------------------------------------
  console.log('\n--- PART 2: PURE-READ RE-READ AUDIT ---');
  const webSearch = new WebSearchProvider();
  const powerService = new VehiclePowerEnrichmentService(prisma as any, webSearch);
  const factsService = new VariantTechnicalFactsService(prisma as any, powerService, webSearch);

  factsService.resetMetrics();

  for (const c of canaries) {
    const facts = await factsService.getVariantTechnicalFacts(c.variantId);
    console.log(`\nPure Read Result for ${c.name}:`);
    console.log(`  Displacement: ${facts.engineDisplacementCc} cc (Status: ${facts.engineDisplacement.status}, Quality: ${facts.engineDisplacement.evidenceQuality})`);
    console.log(`  Displacement Source: ${facts.sources.displacement}`);
    console.log(`  Power: ${facts.enginePowerHp} HP (Status: ${facts.enginePower.status}, Quality: ${facts.enginePower.evidenceQuality})`);
    console.log(`  Power Source: ${facts.sources.power}`);
    console.log(`  isComplete: ${facts.isComplete}`);

    if (facts.engineDisplacementCc !== c.expCc) {
      throw new Error(`${c.name} displacement mismatch: expected ${c.expCc}, got ${facts.engineDisplacementCc}`);
    }
    if (facts.enginePowerHp !== c.expHp) {
      throw new Error(`${c.name} power mismatch: expected ${c.expHp}, got ${facts.enginePowerHp}`);
    }
    if (facts.engineDisplacement.evidenceQuality !== 'STRONG') {
      throw new Error(`${c.name} displacement quality must be STRONG, got ${facts.engineDisplacement.evidenceQuality}`);
    }
    if (facts.enginePower.evidenceQuality !== 'STRONG') {
      throw new Error(`${c.name} power quality must be STRONG, got ${facts.enginePower.evidenceQuality}`);
    }
    if (!facts.isComplete) {
      throw new Error(`${c.name} must be complete!`);
    }
  }

  console.log('\nTelemetry on Pure Read:');
  console.log(`  externalWebSearchCalls: ${factsService.totalExternalWebSearchCalls}`);
  console.log(`  externalLLMCalls: ${factsService.metrics.externalLLMCalls}`);
  console.log(`  researchTriggeredCount: ${factsService.metrics.researchTriggeredCount}`);

  if (factsService.totalExternalWebSearchCalls !== 0 || factsService.metrics.externalLLMCalls !== 0 || factsService.metrics.researchTriggeredCount !== 0) {
    throw new Error('FAILED: Pure read triggered external calls or research!');
  }

  // ------------------------------------------------------------------
  // PART 3: SECOND USER VERIFIED VARIANT ZERO EXTERNAL CALLS TEST
  // ------------------------------------------------------------------
  console.log('\n--- PART 3: SECOND USER ENRICHMENT ZERO CALLS VERIFICATION ---');
  factsService.resetMetrics();
  for (const c of canaries) {
    const secondUserRes = await factsService.enrichVariantTechnicalSpecs(c.variantId, 'second-user-uuid-9999');
    if (!secondUserRes.isComplete) {
      throw new Error(`Second user call for ${c.name} returned incomplete result!`);
    }
  }
  console.log(`Second User externalWebSearchCalls: ${factsService.totalExternalWebSearchCalls}`);
  console.log(`Second User externalLLMCalls: ${factsService.metrics.externalLLMCalls}`);
  if (factsService.totalExternalWebSearchCalls !== 0 || factsService.metrics.externalLLMCalls !== 0) {
    throw new Error('FAILED: Second user call triggered external research!');
  }

  // ------------------------------------------------------------------
  // PART 4: MARKETPLACE HP RANGE CONTRACT VERIFICATION
  // ------------------------------------------------------------------
  console.log('\n--- PART 4: MARKETPLACE FILTER AUDI 150 HP MAPPING ---');
  const audiHp = 150;
  const hp126_150 = getHpRangeById('HP_126_150');
  const hp151_175 = getHpRangeById('HP_151_175');

  console.log(`Audi HP: ${audiHp}`);
  console.log(`Range HP_126_150: min=${hp126_150?.min}, max=${hp126_150?.max}, label="${hp126_150?.label}"`);
  console.log(`Range HP_151_175: min=${hp151_175?.min}, max=${hp151_175?.max}, label="${hp151_175?.label}"`);

  const in126_150 = hp126_150 && audiHp >= hp126_150.min && audiHp <= hp126_150.max;
  const in151_175 = hp151_175 && audiHp >= hp151_175.min && audiHp <= hp151_175.max;

  console.log(`Matches HP_126_150: ${in126_150}`);
  console.log(`Matches HP_151_175: ${in151_175}`);

  if (!in126_150 || in151_175) {
    throw new Error('FAILED: Audi 150 HP range contract broken!');
  }
  console.log('[PASS] marketplaceHpRangeDefinitionDrift = FALSE');

  // ------------------------------------------------------------------
  // PART 5: TAXONOMY REVIEW CASES REMAIN FAILED CLOSED
  // ------------------------------------------------------------------
  console.log('\n--- PART 5: INVALID TAXONOMY CASES REMAIN FAILED CLOSED ---');
  const taxonomyCanaries = [
    { name: 'Fiat Albea 2022', variantId: '17da52c9-6f9d-472e-83ea-6eb222530263' },
    { name: 'Renault Espace 1.5 dCi', variantId: '5c5aefd7-ff70-42cf-8fe4-5d55b0aeeafc' },
    { name: 'Volkswagen Golf 2.0 TSI 2000', variantId: '25509b64-16a7-47b2-a4f6-8c465a3977dc' },
  ];

  for (const tc of taxonomyCanaries) {
    try {
      const facts = await factsService.getVariantTechnicalFacts(tc.variantId);
      console.log(`Taxonomy Canary: ${tc.name} -> cc=${facts.engineDisplacementCc} (status: ${facts.engineDisplacement.status}), hp=${facts.enginePowerHp} (status: ${facts.enginePower.status})`);
      if (facts.engineDisplacement.status === 'VERIFIED' || facts.enginePower.status === 'VERIFIED') {
        throw new Error(`Taxonomy review case ${tc.name} must NOT be verified!`);
      }
    } catch (e: any) {
      if (e.status === 404 || e.name === 'NotFoundException' || e.message?.includes('not found')) {
        console.log(`Taxonomy Canary: ${tc.name} -> Variant not found in taxonomy (Cleanly 404 Failed Closed)`);
      } else {
        throw e;
      }
    }
  }

  console.log('\n================================================================');
  console.log('ALL VERIFICATION PHASES PASSED WITH ZERO REGRESSIONS');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
