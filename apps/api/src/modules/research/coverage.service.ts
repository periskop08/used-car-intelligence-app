import { Injectable } from '@nestjs/common';
import { DataCoverage, SourceKind } from '@used-car-intelligence/shared';

@Injectable()
export class CoverageService {
  /**
   * Calculates DataCoverage enum based on the count of approved items.
   * Only counts approved CommonProblem, Recall, and InspectionChecklistItem.
   */
  calculateDataCoverage(approvedCount: number): DataCoverage {
    if (approvedCount === 0) return DataCoverage.NONE;
    if (approvedCount <= 2) return DataCoverage.LIMITED;
    if (approvedCount <= 5) return DataCoverage.MODERATE;
    return DataCoverage.GOOD;
  }

  /**
   * Calculates the coverage score (0-100) based on source qualities.
   * Limits impact of duplicate domains to max 2 sources per domain.
   * Mock sources give 0. Unknown sources give 1.
   */
  calculateCoverageScore(sources: Array<{ url: string; sourceKind: SourceKind }>): number {
    if (sources.length === 0) return 0;

    const sourceKindWeights: Record<SourceKind, number> = {
      [SourceKind.OFFICIAL_RECALL]: 30,
      [SourceKind.MANUFACTURER]: 25,
      [SourceKind.SERVICE_NOTE]: 20,
      [SourceKind.COMPLAINT_PLATFORM]: 10,
      [SourceKind.USER_REVIEW]: 7,
      [SourceKind.FORUM]: 5,
      [SourceKind.BLOG_REVIEW]: 4,
      [SourceKind.VIDEO_REVIEW]: 4,
      [SourceKind.ADMIN_DEMO]: 1,
      [SourceKind.UNKNOWN]: 1,
      [SourceKind.MOCK]: 0,
    };

    const domainCount: Record<string, number> = {};
    let totalWeight = 0;

    for (const source of sources) {
      const domain = this.extractDomain(source.url);
      
      // Limit to maximum of 2 sources per domain
      if (domain) {
        domainCount[domain] = (domainCount[domain] || 0) + 1;
        if (domainCount[domain] > 2) {
          continue; // Skip contribution if domain threshold exceeded
        }
      }

      const weight = sourceKindWeights[source.sourceKind] ?? 1;
      totalWeight += weight;
    }

    // Normalize to 0-100 scale (capped at 100)
    const normalized = Math.round(totalWeight);
    return Math.min(100, Math.max(0, normalized));
  }

  private extractDomain(url: string): string {
    try {
      if (!url) return '';
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }
}
