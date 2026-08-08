/**
 * equipment-confidence.service.ts
 * 
 * Deterministic Equipment Confidence Engine for TorqueScout.
 * Calculates equipment confidence scores (0-100) using backend mathematical rules.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface EquipmentConfidenceParams {
  sourceRank: number; // 1 = Official Price List, 2 = Equipment Matrix, 3 = Brochure, 7 = Forum
  hasExactTrimMatch: boolean;
  hasExactYearMatch: boolean;
  hasExactMarketMatch: boolean;
  isOnlyFromOwnerManual: boolean;
}

@Injectable()
export class EquipmentConfidenceService {
  private readonly logger = new Logger(EquipmentConfidenceService.name);

  /**
   * Calculates deterministic equipment confidence score (0-100).
   */
  calculateScore(params: EquipmentConfidenceParams): number {
    // Hard Gates Check
    if (!params.hasExactTrimMatch || !params.hasExactYearMatch || !params.hasExactMarketMatch) {
      this.logger.warn(`Equipment Confidence HARD REJECT: Trim/Year/Market mismatch. Trim:${params.hasExactTrimMatch}, Year:${params.hasExactYearMatch}, Market:${params.hasExactMarketMatch}`);
      return 0;
    }

    let score = 0;

    // Source Rank Bonuses
    if (params.sourceRank === 1) score += 50; // Official Price List
    else if (params.sourceRank === 2) score += 40; // Official Equipment Matrix
    else if (params.sourceRank === 3) score += 30; // Official Brochure / Catalog
    else if (params.sourceRank === 4) score += 20; // Official Country Site
    else if (params.sourceRank === 5) score += 15; // Press / Dealer Doc
    else if (params.sourceRank === 6) score += 10; // Test Review

    // Owner Manual Penalty (Owner manual DOES NOT prove trim equipment)
    if (params.isOnlyFromOwnerManual) {
      score -= 40;
      this.logger.warn('Equipment Confidence Penalty: Claim is supported ONLY by Owner Manual.');
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
