/**
 * research-confidence.service.ts
 * 
 * Deterministic Confidence Engine for TorqueScout Enterprise AI.
 * Calculates confidence scores (0-100) using backend mathematical rules.
 * Does NOT rely on LLM guesswork for scoring.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ConfidenceCalculationParams {
  hasOfficialSource: boolean; // TSB, Recall, Manufacturer doc
  hasExactEngineMatch: boolean;
  hasExactTransmissionMatch: boolean;
  uniqueDomainCount: number;
  uniqueSourceKindCount: number;
  hasProductionPeriodMatch: boolean;
  hasMarketMatch: boolean;
  isEngineAmbiguous?: boolean;
}

@Injectable()
export class ResearchConfidenceService {
  private readonly logger = new Logger(ResearchConfidenceService.name);

  /**
   * Calculates a deterministic confidence score (0-100) for a candidate problem claim.
   */
  calculateScore(params: ConfidenceCalculationParams): number {
    let score = 0;

    // Official evidence bonus (+30)
    if (params.hasOfficialSource) {
      score += 30;
    }

    // Engine code exact match bonus (+20)
    if (params.hasExactEngineMatch) {
      score += 20;
    }

    // Transmission code exact match bonus (+15)
    if (params.hasExactTransmissionMatch) {
      score += 15;
    }

    // Corroboration by multiple independent domains (+10)
    if (params.uniqueDomainCount >= 2) {
      score += 10;
    }

    // Corroboration by different source kinds (+10)
    if (params.uniqueSourceKindCount >= 2) {
      score += 10;
    }

    // Production period match bonus (+10)
    if (params.hasProductionPeriodMatch) {
      score += 10;
    }

    // Market match bonus (+5)
    if (params.hasMarketMatch) {
      score += 5;
    }

    // Penalties
    if (params.isEngineAmbiguous) {
      score -= 20;
    }

    // Clamp score to [0, 100] range
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    this.logger.debug(`Calculated deterministic confidence score: ${finalScore} for params: ${JSON.stringify(params)}`);
    return finalScore;
  }
}
