import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import {
  EngineResolutionInput,
  EngineResolutionResult,
  normalizeCode,
  isContaminated,
  hasTechnicalDistinction,
  parseHorsepowerSafely,
  resolveEngineCore,
} from './engine-identity-core';

export {
  EngineResolutionInput,
  EngineResolutionResult,
  EngineResolutionStatus,
  normalizeCode,
  isContaminated,
  hasTechnicalDistinction,
  parseHorsepowerSafely,
} from './engine-identity-core';

@Injectable()
export class EngineIdentityResolverService {
  private readonly logger = new Logger(EngineIdentityResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  public normalizeCode(code: string): string {
    return normalizeCode(code);
  }

  public isContaminated(code: string): boolean {
    return isContaminated(code);
  }

  public hasTechnicalDistinction(codeA: string, codeB: string): boolean {
    return hasTechnicalDistinction(codeA, codeB);
  }

  public parseHorsepowerSafely(rawCode: string, providedHp?: number | null): number | null {
    return parseHorsepowerSafely(rawCode, providedHp);
  }

  /**
   * Main Shared Engine Identity Resolver for NestJS dependency injection context.
   */
  public async resolveEngine(
    input: EngineResolutionInput,
    tx?: Prisma.TransactionClient,
  ): Promise<EngineResolutionResult> {
    const prismaClient = tx || this.prisma;
    const existingEngines = await prismaClient.engine.findMany();

    const result = resolveEngineCore(input, existingEngines);

    if (result.status === 'ENGINE_FIELD_CONTAMINATION') {
      this.logger.warn(`[INGESTION_GUARD] Field contamination blocked for rawCode: "${input.rawCode}"`);
      return result;
    }

    if (result.status === 'ENGINE_EXISTING_EXACT_MATCH') {
      this.logger.log(`[INGESTION_GUARD] Exact normalized match found. Reusing Engine ID ${result.engineId} ("${result.resolvedCode}") for incoming "${input.rawCode}"`);
      return result;
    }

    if (result.status === 'ENGINE_IDENTITY_REVIEW_REQUIRED') {
      this.logger.warn(`[INGESTION_GUARD] Ambiguous engine variation detected for "${input.rawCode}". Candidates: ${result.candidateEngineCodes?.join(', ')}`);
      return result;
    }

    if (result.status === 'ENGINE_CREATED_NEW_DISTINCT' && result.newEngineData) {
      const newEngine = await prismaClient.engine.create({
        data: result.newEngineData,
      });
      this.logger.log(`[INGESTION_GUARD] Created new distinct Engine record ID ${newEngine.id} ("${newEngine.code}")`);
      return {
        status: 'ENGINE_CREATED_NEW_DISTINCT',
        engineId: newEngine.id,
        resolvedCode: newEngine.code,
        reason: result.reason,
      };
    }

    return result;
  }
}
