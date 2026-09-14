import {
  getCanonicalDisplayPowerHp,
  formatCanonicalPowerDisplay,
  convertPowerUnits,
} from '@used-car-intelligence/shared';

describe('Canonical Power Display Normalization Suite', () => {
  describe('Requirement 1-4: Unit Conversion to Canonical HP', () => {
    it('1. 217 PS -> 217 HP (TR/EU metric standard: 1 PS = 1 HP/BG)', () => {
      const canonicalHp = getCanonicalDisplayPowerHp(217, 'PS');
      expect(canonicalHp).toBe(217);
      expect(formatCanonicalPowerDisplay(217, 'PS')).toBe('217 HP');
    });

    it('2. 122 PS -> 122 HP (TR/EU metric standard: 1 PS = 1 HP/BG)', () => {
      const canonicalHp = getCanonicalDisplayPowerHp(122, 'PS');
      expect(canonicalHp).toBe(122);
      expect(formatCanonicalPowerDisplay(122, 'PS')).toBe('122 HP');
    });

    it('3. 90 kW -> 122 HP (kW conversion: 90 * 1.35962 = 122.36 -> 122 HP)', () => {
      const canonicalHp = getCanonicalDisplayPowerHp(90, 'kW');
      expect(canonicalHp).toBe(122);
      expect(formatCanonicalPowerDisplay(90, 'kW')).toBe('122 HP');
    });

    it('4. 170 HP -> 170 HP (HP: no conversion)', () => {
      const canonicalHp = getCanonicalDisplayPowerHp(170, 'HP');
      expect(canonicalHp).toBe(170);
      expect(formatCanonicalPowerDisplay(170, 'HP')).toBe('170 HP');
    });
  });

  describe('Requirement 5: Null / Undefined Display Fallback', () => {
    it('5. null / undefined -> —', () => {
      expect(getCanonicalDisplayPowerHp(null)).toBeNull();
      expect(getCanonicalDisplayPowerHp(undefined)).toBeNull();
      expect(formatCanonicalPowerDisplay(null)).toBe('—');
      expect(formatCanonicalPowerDisplay(undefined)).toBe('—');
      expect(formatCanonicalPowerDisplay('')).toBe('—');
    });
  });

  describe('Requirement 6: Hybrid Semantic Formatting', () => {
    it('6. hybrid semantic: 122 PS + TOTAL_HYBRID_SYSTEM_POWER -> 122 HP (Toplam Hibrit Sistem Gücü)', () => {
      const formatted = formatCanonicalPowerDisplay(122, 'PS', 'TOTAL_HYBRID_SYSTEM_POWER');
      expect(formatted).toBe('122 HP (Toplam Hibrit Sistem Gücü)');

      const formattedObj = formatCanonicalPowerDisplay({
        sourceValue: 122,
        sourceUnit: 'PS',
        powerSemantic: 'TOTAL_HYBRID_SYSTEM_POWER',
      });
      expect(formattedObj).toBe('122 HP (Toplam Hibrit Sistem Gücü)');
    });

    it('Conventional ICE: 170 HP -> 170 HP without semantic suffix', () => {
      const formatted = formatCanonicalPowerDisplay(170, 'HP', 'STANDARD_POWER');
      expect(formatted).toBe('170 HP');
    });
  });

  describe('Requirement 7: Source Data Preservation (Immutability)', () => {
    it('7. Source value/unit remain unchanged after display conversion', () => {
      const sourceRecord = {
        sourceValue: 217,
        sourceUnit: 'PS',
        powerSemantic: 'STANDARD_POWER',
        powerSource: 'VERIFIED_STAGE_1',
      };

      const sourceRecordSnapshot = JSON.stringify(sourceRecord);

      // Perform canonical conversions
      const displayString = formatCanonicalPowerDisplay(
        sourceRecord.sourceValue,
        sourceRecord.sourceUnit,
        sourceRecord.powerSemantic,
      );
      const canonicalHp = getCanonicalDisplayPowerHp(
        sourceRecord.sourceValue,
        sourceRecord.sourceUnit,
      );

      // Conversions produced expected canonical outputs
      expect(displayString).toBe('217 HP');
      expect(canonicalHp).toBe(217);

      // Source data MUST remain completely unchanged
      expect(JSON.stringify(sourceRecord)).toBe(sourceRecordSnapshot);
      expect(sourceRecord.sourceValue).toBe(217);
      expect(sourceRecord.sourceUnit).toBe('PS');

      // convertPowerUnits keeps source value and unit preserved
      const converted = convertPowerUnits(217, 'PS');
      expect(converted.sourceReportedValue).toBe(217);
      expect(converted.sourceReportedUnit).toBe('PS');
      expect(converted.powerHp).toBe(217);
      expect(converted.powerPs).toBe(217);
    });

    it('Toyota Corolla Hybrid: 122 PS source is preserved and renders 122 HP (Toplam Hibrit Sistem Gücü)', () => {
      const corollaSpecs = {
        sourceReportedValue: 122,
        sourceReportedUnit: 'PS' as const,
        powerSemantic: 'TOTAL_HYBRID_SYSTEM_POWER',
      };

      const converted = convertPowerUnits(corollaSpecs.sourceReportedValue, corollaSpecs.sourceReportedUnit);
      expect(converted.sourceReportedValue).toBe(122);
      expect(converted.sourceReportedUnit).toBe('PS');
      expect(converted.powerHp).toBe(122);

      const display = formatCanonicalPowerDisplay(
        corollaSpecs.sourceReportedValue,
        corollaSpecs.sourceReportedUnit,
        corollaSpecs.powerSemantic,
      );
      expect(display).toBe('122 HP (Toplam Hibrit Sistem Gücü)');
    });
  });
});
