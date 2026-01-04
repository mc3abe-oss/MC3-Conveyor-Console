/**
 * Thickness Library Tests
 *
 * Tests for unified thickness library used by:
 * - Frame sheet metal gauge dropdown
 * - Pulley wall thickness dropdown
 *
 * CRITICAL: Both dropdowns show THE SAME options list
 * with THE SAME labels. No filtering by context.
 */

import {
  THICKNESS_OPTIONS,
  getAllThicknessOptions,
  getThicknessOption,
  getThicknessOptionByValue,
  formatThickness,
  legacyGaugeToThicknessKey,
  thicknessKeyToLegacyGauge,
  legacyWallThicknessToKey,
  getThicknessInFromKey,
} from './index';
import { getSheetMetalThicknessOptions } from '../frame-catalog';
import { getPulleyWallThicknessOptions } from '../pulley-models';

describe('Thickness Library', () => {
  describe('THICKNESS_OPTIONS', () => {
    it('should have all required thickness options', () => {
      // Check expected options exist
      const keys = THICKNESS_OPTIONS.map(o => o.key);

      // Fractional thicknesses
      expect(keys).toContain('frac_3_8');
      expect(keys).toContain('frac_1_4');
      expect(keys).toContain('frac_3_16');

      // Gauge thicknesses
      expect(keys).toContain('ga_8');
      expect(keys).toContain('ga_10');
      expect(keys).toContain('ga_12');
      expect(keys).toContain('ga_14');
      expect(keys).toContain('ga_16');
      expect(keys).toContain('ga_18');
    });

    it('should have all required fields on each option', () => {
      THICKNESS_OPTIONS.forEach(opt => {
        expect(opt.key).toBeTruthy();
        expect(opt.system).toBeTruthy();
        expect(typeof opt.thickness_in).toBe('number');
        expect(opt.thickness_in).toBeGreaterThan(0);
        expect(opt.label).toBeTruthy();
        expect(typeof opt.sort_order).toBe('number');
        expect(typeof opt.is_active).toBe('boolean');
      });
    });
  });

  describe('getAllThicknessOptions', () => {
    it('should return options sorted by sort_order (thickest to thinnest)', () => {
      const options = getAllThicknessOptions();
      expect(options.length).toBeGreaterThanOrEqual(9);

      // Verify sorted order
      for (let i = 0; i < options.length - 1; i++) {
        expect(options[i].sort_order).toBeLessThanOrEqual(options[i + 1].sort_order);
      }
    });

    it('should only return active options', () => {
      const options = getAllThicknessOptions();
      options.forEach(opt => expect(opt.is_active).toBe(true));
    });

    it('should order from thinnest to thickest', () => {
      const options = getAllThicknessOptions();
      const thicknesses = options.map(o => o.thickness_in);

      // Should be ordered from thinnest to thickest
      for (let i = 0; i < thicknesses.length - 1; i++) {
        expect(thicknesses[i]).toBeLessThan(thicknesses[i + 1]);
      }
    });
  });

  describe('getThicknessOption', () => {
    it('should return option by key', () => {
      const opt = getThicknessOption('ga_12');
      expect(opt).toBeDefined();
      expect(opt?.thickness_in).toBe(0.109);
    });

    it('should return undefined for invalid key', () => {
      const opt = getThicknessOption('invalid_key');
      expect(opt).toBeUndefined();
    });
  });

  describe('getThicknessOptionByValue', () => {
    it('should find option by thickness value', () => {
      const opt = getThicknessOptionByValue(0.134);
      expect(opt).toBeDefined();
      expect(opt?.key).toBe('ga_10');
    });

    it('should find with tolerance', () => {
      // 0.1339 should match 0.134 with default tolerance
      const opt = getThicknessOptionByValue(0.1339);
      expect(opt).toBeDefined();
      expect(opt?.key).toBe('ga_10');
    });

    it('should return undefined when no match', () => {
      const opt = getThicknessOptionByValue(0.999);
      expect(opt).toBeUndefined();
    });
  });

  describe('formatThickness', () => {
    it('should format gauge label correctly', () => {
      const opt = getThicknessOption('ga_12');
      expect(opt).toBeDefined();
      const label = formatThickness(opt!);
      expect(label).toBe('12 ga (0.109")');
    });

    it('should format fractional label correctly', () => {
      const opt = getThicknessOption('frac_3_16');
      expect(opt).toBeDefined();
      const label = formatThickness(opt!);
      expect(label).toBe('3/16" (0.188")');
    });
  });
});

describe('Frame and Pulley Dropdown Consistency', () => {
  it('CRITICAL: Frame and Pulley dropdowns must show IDENTICAL options', () => {
    const frameOptions = getSheetMetalThicknessOptions();
    const pulleyOptions = getPulleyWallThicknessOptions();

    // Same number of options
    expect(frameOptions.length).toBe(pulleyOptions.length);

    // Same options in same order
    for (let i = 0; i < frameOptions.length; i++) {
      expect(frameOptions[i].key).toBe(pulleyOptions[i].key);
      expect(frameOptions[i].thickness_in).toBe(pulleyOptions[i].thickness_in);
      expect(frameOptions[i].label).toBe(pulleyOptions[i].label);
    }
  });

  it('should have the same label format for frame and pulley', () => {
    const opt = getThicknessOption('ga_10');
    expect(opt).toBeDefined();

    // Same label everywhere
    expect(opt?.label).toBe('10 ga (0.134")');
  });

  it('MUST include ga_12 in canonical list', () => {
    const opt = getThicknessOption('ga_12');
    expect(opt).toBeDefined();
    expect(opt?.thickness_in).toBe(0.109);
  });

  it('MUST include frac_3_16 in canonical list', () => {
    const opt = getThicknessOption('frac_3_16');
    expect(opt).toBeDefined();
    expect(opt?.thickness_in).toBe(0.188);
  });
});

describe('Legacy Compatibility', () => {
  describe('legacyGaugeToThicknessKey', () => {
    it('should map legacy frame gauge keys', () => {
      expect(legacyGaugeToThicknessKey('10_GA')).toBe('ga_10');
      expect(legacyGaugeToThicknessKey('12_GA')).toBe('ga_12');
      expect(legacyGaugeToThicknessKey('14_GA')).toBe('ga_14');
      expect(legacyGaugeToThicknessKey('16_GA')).toBe('ga_16');
      expect(legacyGaugeToThicknessKey('18_GA')).toBe('ga_18');
    });

    it('should return undefined for unknown keys', () => {
      expect(legacyGaugeToThicknessKey('INVALID')).toBeUndefined();
    });
  });

  describe('thicknessKeyToLegacyGauge', () => {
    it('should map thickness keys to legacy gauge keys', () => {
      expect(thicknessKeyToLegacyGauge('ga_10')).toBe('10_GA');
      expect(thicknessKeyToLegacyGauge('ga_12')).toBe('12_GA');
      expect(thicknessKeyToLegacyGauge('ga_14')).toBe('14_GA');
      expect(thicknessKeyToLegacyGauge('ga_16')).toBe('16_GA');
      expect(thicknessKeyToLegacyGauge('ga_18')).toBe('18_GA');
    });
  });

  describe('legacyWallThicknessToKey', () => {
    it('should map legacy wall thickness values to keys', () => {
      expect(legacyWallThicknessToKey(0.134)).toBe('ga_10');
      expect(legacyWallThicknessToKey(0.109)).toBe('ga_12');
      expect(legacyWallThicknessToKey(0.188)).toBe('frac_3_16');
      expect(legacyWallThicknessToKey(0.250)).toBe('frac_1_4');
      expect(legacyWallThicknessToKey(0.375)).toBe('frac_3_8');
    });

    it('should handle tolerance', () => {
      // Slightly off values should still match
      expect(legacyWallThicknessToKey(0.1879)).toBe('frac_3_16');
      expect(legacyWallThicknessToKey(0.1881)).toBe('frac_3_16');
    });

    it('should return undefined for unknown values', () => {
      expect(legacyWallThicknessToKey(0.999)).toBeUndefined();
    });
  });

  describe('getThicknessInFromKey', () => {
    it('should return thickness from key', () => {
      expect(getThicknessInFromKey('ga_12')).toBe(0.109);
      expect(getThicknessInFromKey('ga_10')).toBe(0.134);
      expect(getThicknessInFromKey('frac_3_16')).toBe(0.188);
    });

    it('should return undefined for invalid key', () => {
      expect(getThicknessInFromKey('invalid')).toBeUndefined();
    });
  });
});

describe('Thickness Value Consistency', () => {
  it('should have correct gauge thickness values', () => {
    const ga8 = getThicknessOption('ga_8');
    const ga10 = getThicknessOption('ga_10');
    const ga12 = getThicknessOption('ga_12');
    const ga14 = getThicknessOption('ga_14');
    const ga16 = getThicknessOption('ga_16');
    const ga18 = getThicknessOption('ga_18');

    expect(ga8?.thickness_in).toBe(0.165);
    expect(ga10?.thickness_in).toBe(0.134);
    expect(ga12?.thickness_in).toBe(0.109);
    expect(ga14?.thickness_in).toBe(0.075);
    expect(ga16?.thickness_in).toBe(0.060);
    expect(ga18?.thickness_in).toBe(0.048);
  });

  it('should have correct fractional thickness values', () => {
    const frac316 = getThicknessOption('frac_3_16');
    const frac14 = getThicknessOption('frac_1_4');
    const frac38 = getThicknessOption('frac_3_8');

    expect(frac316?.thickness_in).toBe(0.188);
    expect(frac14?.thickness_in).toBe(0.250);
    expect(frac38?.thickness_in).toBe(0.375);
  });
});
