/**
 * trim-equipment-resolver.service.ts
 * 
 * Trim Identity Gate & Equipment Effective Period Ambiguity Engine.
 * Handles mid-year equipment revisions when user selects only the model year.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface TrimIdentity {
  brand: string;
  model: string;
  year: number;
  trim: string;
  market: string;
  trimExistsInMarket: boolean;
  periodStatus: 'PERIOD_VERIFIED' | 'PERIOD_PROBABLE' | 'PERIOD_AMBIGUOUS';
  effectiveFrom?: string;
  effectiveTo?: string;
  equipmentRevision?: string;
  confidenceScore: number;
}

@Injectable()
export class TrimEquipmentResolverService {
  private readonly logger = new Logger(TrimEquipmentResolverService.name);

  /**
   * Compares feature statuses across candidate mid-year revisions.
   * If a feature status differs between revisions (e.g. pre-Sept 2022 vs Sept 2022+), returns PERIOD_DEPENDENT.
   */
  resolvePeriodAmbiguity(
    candidatePeriodFeatures: Map<string, Array<{ periodRevision: string; status: string }>>
  ): Map<string, { status: string; isPeriodDependent: boolean; explanation?: string }> {
    const resolvedMap = new Map<string, { status: string; isPeriodDependent: boolean; explanation?: string }>();

    for (const [featureCode, periodStatuses] of candidatePeriodFeatures.entries()) {
      if (periodStatuses.length === 0) continue;

      const firstStatus = periodStatuses[0].status;
      const isUniform = periodStatuses.every(p => p.status === firstStatus);

      if (isUniform) {
        resolvedMap.set(featureCode, {
          status: firstStatus,
          isPeriodDependent: false
        });
      } else {
        this.logger.warn(`Period Ambiguity detected for feature "${featureCode}": Status differs between revisions (${periodStatuses.map(p => `${p.periodRevision}: ${p.status}`).join(', ')}). Setting status = PERIOD_DEPENDENT.`);
        resolvedMap.set(featureCode, {
          status: 'PERIOD_DEPENDENT',
          isPeriodDependent: true,
          explanation: `Bu donanım ${periodStatuses[0].periodRevision} ile yapılan revizyona göre farklılık göstermektedir.`
        });
      }
    }

    return resolvedMap;
  }
}
