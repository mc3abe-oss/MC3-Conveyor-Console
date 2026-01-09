/**
 * Output Interface Type v1.41 Tests
 *
 * Tests for:
 * - OutputInterfaceType enum values
 * - getOutputInterfaceType helper
 * - Correct mapping of output_shaft_option to interface type
 */

import {
  OutputInterfaceType,
  getOutputInterfaceType,
} from './schema';

describe('OutputInterfaceType enum', () => {
  it('should have hollow_shaft value', () => {
    expect(OutputInterfaceType.HollowShaft).toBe('hollow_shaft');
  });

  it('should have solid_shaft value', () => {
    expect(OutputInterfaceType.SolidShaft).toBe('solid_shaft');
  });
});

describe('getOutputInterfaceType', () => {
  describe('solid shaft options (keyed)', () => {
    it('should return SolidShaft for inch_keyed', () => {
      const result = getOutputInterfaceType('inch_keyed');
      expect(result).toBe(OutputInterfaceType.SolidShaft);
    });

    it('should return SolidShaft for metric_keyed', () => {
      const result = getOutputInterfaceType('metric_keyed');
      expect(result).toBe(OutputInterfaceType.SolidShaft);
    });
  });

  describe('hollow shaft options', () => {
    it('should return HollowShaft for inch_hollow', () => {
      const result = getOutputInterfaceType('inch_hollow');
      expect(result).toBe(OutputInterfaceType.HollowShaft);
    });

    it('should return HollowShaft for metric_hollow', () => {
      const result = getOutputInterfaceType('metric_hollow');
      expect(result).toBe(OutputInterfaceType.HollowShaft);
    });
  });

  describe('null/undefined/empty inputs', () => {
    it('should return HollowShaft for null', () => {
      const result = getOutputInterfaceType(null);
      expect(result).toBe(OutputInterfaceType.HollowShaft);
    });

    it('should return HollowShaft for undefined', () => {
      const result = getOutputInterfaceType(undefined);
      expect(result).toBe(OutputInterfaceType.HollowShaft);
    });

    it('should return HollowShaft for empty string', () => {
      const result = getOutputInterfaceType('');
      expect(result).toBe(OutputInterfaceType.HollowShaft);
    });
  });

  describe('unknown values', () => {
    it('should default to HollowShaft for unknown option', () => {
      const result = getOutputInterfaceType('some_future_option');
      expect(result).toBe(OutputInterfaceType.HollowShaft);
    });
  });
});
