/**
 * claim-evidence.service.ts
 * 
 * Claim Evidence Mapping and Anti-Syndication Copycat Filter.
 * Manages explicit stance tracking (SUPPORTS, REFUTES, NEUTRAL) for every claim (CLM-XXX).
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EvidenceSource {
  id?: string;
  url: string;
  domain: string;
  sourceKind: string;
  stance: 'SUPPORTS' | 'REFUTES' | 'NEUTRAL';
  snippet?: string;
  contentHash?: string;
}

export interface ClaimItem {
  claimId: string;
  claimText: string;
  claimType: 'SYMPTOM' | 'ROOT_CAUSE' | 'REVISED_PART' | 'YEARS' | 'COST';
  evidenceSources: EvidenceSource[];
}

export interface StructuredRelevanceBasis {
  generation: { required: boolean; match: boolean };
  year: { required: boolean; match: boolean };
  engineCode: { required: boolean; match: boolean };
  transmissionCode: { required: boolean; match: boolean | null };
  market: { required: boolean; match: boolean };
}

@Injectable()
export class ClaimEvidenceService {
  private readonly logger = new Logger(ClaimEvidenceService.name);

  /**
   * Computes SHA-256 contentHash for anti-syndication deduplication.
   */
  generateContentHash(content: string): string {
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Filters out syndicated copycat articles that share the exact same contentHash.
   */
  deduplicateSyndicatedSources(sources: EvidenceSource[]): EvidenceSource[] {
    const seenHashes = new Set<string>();
    const uniqueSources: EvidenceSource[] = [];

    for (const src of sources) {
      if (src.contentHash) {
        if (seenHashes.has(src.contentHash)) {
          this.logger.debug(`Deduplicated syndicated copycat source: ${src.url}`);
          continue;
        }
        seenHashes.add(src.contentHash);
      }
      uniqueSources.push(src);
    }

    return uniqueSources;
  }

  /**
   * Evaluates evidence stance balance (SUPPORTS vs REFUTES).
   * Returns false if refuting evidence strictly outweighs supporting evidence.
   */
  isClaimSupported(claim: ClaimItem): boolean {
    const supporting = claim.evidenceSources.filter(s => s.stance === 'SUPPORTS').length;
    const refuting = claim.evidenceSources.filter(s => s.stance === 'REFUTES').length;

    if (refuting > 0 && refuting >= supporting) {
      this.logger.warn(`Claim ${claim.claimId} ("${claim.claimText}") rejected due to counter-research refutation (${refuting} refutations vs ${supporting} supports).`);
      return false;
    }

    return supporting > 0;
  }

  /**
   * Generates why_this_vehicle text programmatically from relevance_basis.
   */
  deriveWhyThisVehicleText(basis: StructuredRelevanceBasis, variantSummary: string): string {
    const matches: string[] = [];
    if (basis.generation.match) matches.push('jenerasyon');
    if (basis.year.match) matches.push('üretim yılı');
    if (basis.engineCode.match) matches.push('motor kodu');
    if (basis.transmissionCode.match === true) matches.push('şanzıman kodu');
    if (basis.market.match) matches.push('Türkiye pazarı');

    return `Bu problem, ${variantSummary} varyantının ${matches.join(', ')} uyumluluğu temelinde doğrulanmıştır.`;
  }
}
