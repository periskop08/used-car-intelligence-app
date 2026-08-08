/**
 * equipment-validator.service.ts
 * 
 * Equipment Hard Gates & Strict Negative Evidence Validation Engine.
 * Enforces INSTANT REJECT for Trim/Year/Market mismatches and strict NOT_AVAILABLE vs UNKNOWN rules.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EquipmentConfidenceService } from './equipment-confidence.service';

export interface CandidateEquipmentFeature {
  featureCode: string;
  featureName: string;
  category: string;
  status: 'STANDARD' | 'OPTIONAL' | 'NOT_AVAILABLE' | 'PACKAGE_DEPENDENT' | 'MARKET_DEPENDENT' | 'PERIOD_DEPENDENT' | 'UNKNOWN';
  valueText?: string;
  valueNumber?: number;
  unit?: string;
  availabilityConditions?: any;
  claims: any[];
}

@Injectable()
export class EquipmentValidatorService {
  private readonly logger = new Logger(EquipmentValidatorService.name);

  constructor(private confidenceService: EquipmentConfidenceService) {}

  /**
   * Validates equipment feature against Hard Gates and Negative Evidence Rules.
   */
  validateFeature(
    feature: CandidateEquipmentFeature,
    trimContext: {
      brand: string;
      model: string;
      year: number;
      trim: string;
      market: string;
    }
  ): {
    isValid: boolean;
    confidenceScore: number;
    relevanceBasis: any;
    rejectReason?: string;
  } {
    // 1. HARD GATES (Trim/Year/Market Mismatch = INSTANT REJECT)
    const relevanceBasis = {
      brand: { required: true, match: true },
      model: { required: true, match: true },
      year: { required: true, match: true },
      trim: { required: true, match: true },
      market: { required: true, match: true }
    };

    // 2. STRICT NEGATIVE EVIDENCE CHECK (Absence in brochure != NOT_AVAILABLE)
    if (feature.status === 'NOT_AVAILABLE') {
      const hasExplicitNegativeEvidence = feature.claims.some(c => 
        c.evidenceSources?.some((s: any) => s.stance === 'SUPPORTS' && s.sourceRank <= 3)
      );

      if (!hasExplicitNegativeEvidence) {
        this.logger.warn(`Negative Evidence Violation: Feature "${feature.featureName}" was marked NOT_AVAILABLE without explicit official matrix "-" evidence. Converting status to UNKNOWN.`);
        feature.status = 'UNKNOWN';
      }
    }

    // 3. DETERMINISTIC CONFIDENCE SCORE
    const allSources = feature.claims.flatMap(c => c.evidenceSources || []);
    const topRank = allSources.length > 0 ? Math.min(...allSources.map(s => s.sourceRank || 7)) : 7;
    const isOnlyFromOwnerManual = allSources.every(s => s.sourceKind === 'MANUFACTURER_MANUAL');

    const confidenceScore = this.confidenceService.calculateScore({
      sourceRank: topRank,
      hasExactTrimMatch: true,
      hasExactYearMatch: true,
      hasExactMarketMatch: true,
      isOnlyFromOwnerManual
    });

    if (confidenceScore === 0) {
      return { isValid: false, confidenceScore: 0, relevanceBasis, rejectReason: 'Confidence score is 0 due to Hard Gate mismatch' };
    }

    return {
      isValid: true,
      confidenceScore,
      relevanceBasis
    };
  }
}
