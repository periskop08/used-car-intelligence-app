/**
 * identity-gate.service.ts
 * 
 * Identity Gate Service for TorqueScout Enterprise AI (v2.1).
 * Validates variant identity and enforces INTERSECTION_ONLY mode when AMBIGUOUS.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface VariantIdentity {
  brand: string;
  model: string;
  year: number;
  generation: string;
  platformCode?: string;
  faceliftStatus?: string;
  bodyType: string;
  engineMarketingName: string;
  engineFamily?: string;
  engineCodes: string[];
  transmissionMarketingName: string;
  transmissionFamily?: string;
  transmissionCodes: string[];
  transmissionType: string;
  trim: string;
  market: string;
  variantStatus: 'VERIFIED' | 'PROBABLE' | 'AMBIGUOUS';
  identityConfidence: number;
}

@Injectable()
export class IdentityGateService {
  private readonly logger = new Logger(IdentityGateService.name);

  /**
   * Evaluates identity confidence and determines execution mode.
   */
  evaluateGate(identity: VariantIdentity): {
    mode: 'FULL_RESEARCH' | 'RESTRICTED_RESEARCH' | 'INTERSECTION_ONLY';
    canProceed: boolean;
    reason: string;
  } {
    if (identity.variantStatus === 'VERIFIED' && identity.identityConfidence >= 85) {
      return {
        mode: 'FULL_RESEARCH',
        canProceed: true,
        reason: 'Variant identity 100% verified with high confidence.'
      };
    }

    if (identity.variantStatus === 'PROBABLE' || (identity.identityConfidence >= 65 && identity.identityConfidence < 85)) {
      return {
        mode: 'RESTRICTED_RESEARCH',
        canProceed: true,
        reason: 'Variant identity is probable. Restricted research enabled (only candidate-universal claims).'
      };
    }

    // AMBIGUOUS: Force INTERSECTION_ONLY Mode
    this.logger.warn(`Identity Gate: Variant ${identity.brand} ${identity.model} (${identity.year}) is AMBIGUOUS (Confidence: ${identity.identityConfidence}%). Enforcing INTERSECTION_ONLY mode.`);
    return {
      mode: 'INTERSECTION_ONLY',
      canProceed: true,
      reason: 'Variant identity is ambiguous. Enforcing INTERSECTION_ONLY mode (only claims applying to ALL candidates allowed).'
    };
  }
}
