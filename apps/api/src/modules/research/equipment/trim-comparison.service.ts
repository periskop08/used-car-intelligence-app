/**
 * trim-comparison.service.ts
 * 
 * Derives Trim Signature Features, Package Highlights, and Lower/Higher Trim Deltas programmatically.
 * No free-form LLM hallucination permitted; all signatures are derived from APPROVED EquipmentFeature IDs.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ApprovedEquipmentFeature {
  id: string;
  featureCode: string;
  featureName: string;
  category: string;
  status: string; // STANDARD, OPTIONAL, NOT_AVAILABLE, PERIOD_DEPENDENT
  valueText?: string;
  valueNumber?: number;
  unit?: string;
}

@Injectable()
export class TrimComparisonService {
  private readonly logger = new Logger(TrimComparisonService.name);

  /**
   * Programmatically derives trim signature feature IDs.
   */
  deriveTrimSignatureFeatureIds(features: ApprovedEquipmentFeature[]): string[] {
    // Signature features are STANDARD features in key high-value categories (EXTERIOR sunroof, COMFORT heated seats, TECH screen)
    const signatureCodes = ['SUNROOF', 'FRONT_HEATED_SEATS', 'REAR_HEATED_SEATS', 'INFOTAINMENT_SCREEN', 'WHEEL_SIZE', 'LEATHER_SEATS'];
    return features
      .filter(f => f.status === 'STANDARD' && signatureCodes.includes(f.featureCode))
      .map(f => f.id);
  }

  /**
   * Programmatically derives package highlights.
   */
  derivePackageHighlights(features: ApprovedEquipmentFeature[]): Array<{ code: string; name: string; value?: string }> {
    return features
      .filter(f => f.status === 'STANDARD')
      .map(f => ({
        code: f.featureCode,
        name: f.featureName,
        value: f.valueNumber ? `${f.valueNumber} ${f.unit || ''}`.trim() : f.valueText
      }));
  }

  /**
   * Compares target trim against lower/higher trim package features to calculate deltas.
   */
  calculateTrimDelta(
    targetTrimFeatures: ApprovedEquipmentFeature[],
    otherTrimFeatures: ApprovedEquipmentFeature[],
    comparisonType: 'LOWER_TRIM' | 'HIGHER_TRIM'
  ): string[] {
    const targetCodes = new Set(targetTrimFeatures.filter(f => f.status === 'STANDARD').map(f => f.featureCode));
    const otherCodes = new Set(otherTrimFeatures.filter(f => f.status === 'STANDARD').map(f => f.featureCode));

    if (comparisonType === 'LOWER_TRIM') {
      // Features standard on target trim but NOT on lower trim
      return targetTrimFeatures
        .filter(f => f.status === 'STANDARD' && !otherCodes.has(f.featureCode))
        .map(f => f.id);
    } else {
      // Features standard on higher trim but NOT on target trim
      return otherTrimFeatures
        .filter(f => f.status === 'STANDARD' && !targetCodes.has(f.featureCode))
        .map(f => f.id);
    }
  }
}
