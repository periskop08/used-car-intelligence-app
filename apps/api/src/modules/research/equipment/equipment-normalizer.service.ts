/**
 * equipment-normalizer.service.ts
 * 
 * Standardizes raw equipment feature names, categories, codes, and technical values (valueText, valueNumber, unit).
 */

import { Injectable } from '@nestjs/common';

export interface NormalizedFeature {
  featureCode: string;
  featureName: string;
  category: 'TECHNOLOGY' | 'COMFORT' | 'SAFETY' | 'INTERIOR' | 'EXTERIOR';
  valueText?: string;
  valueNumber?: number;
  unit?: string;
}

@Injectable()
export class EquipmentNormalizerService {
  /**
   * Normalizes raw feature names and extracts values.
   */
  normalize(rawName: string, rawValue?: string): NormalizedFeature {
    const s = rawName.toLowerCase().trim();

    if (s.includes('sunroof') || s.includes('açılır tavan') || s.includes('panoramik')) {
      return { featureCode: 'SUNROOF', featureName: 'Elektrikli Açılabilir Sunroof', category: 'EXTERIOR' };
    }
    if (s.includes('ön koltuk ısıtma') || s.includes('ön ısıtmalı')) {
      return { featureCode: 'FRONT_HEATED_SEATS', featureName: 'Isıtmalı Ön Koltuklar', category: 'COMFORT' };
    }
    if (s.includes('arka koltuk ısıtma') || s.includes('arka ısıtmalı')) {
      return { featureCode: 'REAR_HEATED_SEATS', featureName: 'Isıtmalı Arka Koltuklar', category: 'COMFORT' };
    }
    if (s.includes('direksiyon ısıtma')) {
      return { featureCode: 'HEATED_STEERING_WHEEL', featureName: 'Isıtmalı Direksiyon', category: 'COMFORT' };
    }
    if (s.includes('ekran') || s.includes('multimedya') || s.includes('dokunmatik')) {
      const match = rawName.match(/(\d+[\.,]?\d*)\s*(inç|inch|")/i);
      return {
        featureCode: 'INFOTAINMENT_SCREEN',
        featureName: 'Multimedya Ekranı',
        category: 'TECHNOLOGY',
        valueNumber: match ? parseFloat(match[1].replace(',', '.')) : 10.25,
        unit: 'inch'
      };
    }
    if (s.includes('jant') || s.includes('alaşım')) {
      const match = rawName.match(/(\d{2})\s*(inç|inch|")/i);
      return {
        featureCode: 'WHEEL_SIZE',
        featureName: 'Alaşım Jantlar',
        category: 'EXTERIOR',
        valueNumber: match ? parseInt(match[1]) : 17,
        unit: 'inch'
      };
    }
    if (s.includes('bagaj')) {
      const match = rawName.match(/(\d{3,4})\s*(litre|l)/i);
      return {
        featureCode: 'BOOT_CAPACITY',
        featureName: 'Bagaj Hacmi',
        category: 'INTERIOR',
        valueNumber: match ? parseInt(match[1]) : 502,
        unit: 'L'
      };
    }

    // Default fallback normalization
    const code = rawName.toUpperCase().replace(/[^A_Z0-9]/g, '_');
    return {
      featureCode: code,
      featureName: rawName.trim(),
      category: 'COMFORT',
      valueText: rawValue
    };
  }
}
