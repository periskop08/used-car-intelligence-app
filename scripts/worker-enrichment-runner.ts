import { PrismaClient } from '@prisma/client';
import { VariantTechnicalFactsService } from '../apps/api/src/modules/vehicle/variant-technical-facts.service';
import { VehiclePowerEnrichmentService } from '../apps/api/src/modules/vehicle/vehicle-power-enrichment.service';
import { WebSearchProvider } from '../apps/api/src/modules/research/providers/web-search.provider';

async function main() {
  const args = process.argv.slice(2);
  const workerId = args.find((a) => a.startsWith('--workerId='))?.split('=')[1] || `Worker-${process.pid}`;
  const variantId = args.find((a) => a.startsWith('--variantId='))?.split('=')[1];

  if (!variantId) {
    console.error(JSON.stringify({ error: 'Missing --variantId argument' }));
    process.exit(1);
  }

  // Create isolated per-process Prisma client and services
  const prisma = new PrismaClient();
  const webSearch = new WebSearchProvider();
  const powerService = new VehiclePowerEnrichmentService(prisma as any, webSearch);
  const factsService = new VariantTechnicalFactsService(prisma as any, powerService, webSearch);

  factsService.resetMetrics();

  // Notify parent that worker is initialized and ready
  if (process.send) {
    process.send({ type: 'READY', workerId, pid: process.pid });
  }

  // Wait for START signal from parent if running as IPC child process
  await new Promise<void>((resolve) => {
    if (process.send) {
      process.on('message', (msg: any) => {
        if (msg === 'START' || msg?.type === 'START') {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });

  const startTime = Date.now();
  try {
    const result = await factsService.enrichVariantTechnicalSpecs(variantId, `user-${workerId}`);
    const elapsedMs = Date.now() - startTime;

    const report = {
      type: 'RESULT',
      workerId,
      pid: process.pid,
      elapsedMs,
      result: {
        variantId: result.variantId,
        engineDisplacementCc: result.engineDisplacementCc,
        enginePowerHp: result.enginePowerHp,
        displacementStatus: result.engineDisplacement.status,
        powerStatus: result.enginePower.status,
        isComplete: result.isComplete,
      },
      metrics: {
        externalWebCalls: factsService.totalExternalWebSearchCalls,
        externalLlmCalls: factsService.metrics.externalLLMCalls,
        externalLlmOperations: factsService.metrics.externalLLMResearchOperations,
        researchLocksAcquired: factsService.metrics.researchLocksAcquired,
        researchLocksContended: factsService.metrics.researchLocksContended,
        researchDeduplicatedCount: factsService.metrics.researchDeduplicatedCount,
        researchJobsCreated: factsService.metrics.researchJobsCreated,
        duplicateResearchTriggered: factsService.metrics.duplicateResearchTriggered,
      },
    };

    if (process.send) {
      process.send(report);
    } else {
      console.log(JSON.stringify(report));
    }
  } catch (err: any) {
    const errReport = {
      type: 'ERROR',
      workerId,
      pid: process.pid,
      error: err.message,
    };
    if (process.send) {
      process.send(errReport);
    } else {
      console.error(JSON.stringify(errReport));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
