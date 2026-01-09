/**
 * Output Interface Type v1.41 Tests
 *
 * Tests for:
 * - OutputInterfaceType enum values
 * - getOutputInterfaceType helper
 * - Correct mapping of output_shaft_option to interface type
 * - Diameter clearing logic (unit level)
 */

import {
  OutputInterfaceType,
  getOutputInterfaceType,
} from './schema';

/**
 * Simulates the gear unit change detection logic from DriveSelectorModal.
 * This is a unit test for the clearing behavior.
 */
function shouldClearDiameter(
  prevGearUnitSize: string | null,
  currentGearUnitSize: string | null,
  currentDiameter: number | null
): { shouldClear: boolean; reason: string | null } {
  // No change or no previous value
  if (prevGearUnitSize === null || currentGearUnitSize === null) {
    return { shouldClear: false, reason: null };
  }

  // Gear unit changed
  if (prevGearUnitSize !== currentGearUnitSize) {
    // Only clear if there's a diameter to clear
    if (currentDiameter !== null && currentDiameter !== undefined) {
      return {
        shouldClear: true,
        reason: `Output shaft diameter cleared (gear unit changed to ${currentGearUnitSize})`
      };
    }
  }

  return { shouldClear: false, reason: null };
}

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

describe('shouldClearDiameter (gear unit change detection)', () => {
  describe('clearing when gear unit changes', () => {
    it('should clear diameter when switching from SI63 to SI50 with diameter set', () => {
      const result = shouldClearDiameter('SI63', 'SI50', 1.125);
      expect(result.shouldClear).toBe(true);
      expect(result.reason).toBe('Output shaft diameter cleared (gear unit changed to SI50)');
    });

    it('should clear diameter when switching from SI50 to SI63 with diameter set', () => {
      const result = shouldClearDiameter('SI50', 'SI63', 1.0);
      expect(result.shouldClear).toBe(true);
      expect(result.reason).toContain('SI63');
    });
  });

  describe('no clearing when appropriate', () => {
    it('should NOT clear when gear unit stays the same', () => {
      const result = shouldClearDiameter('SI63', 'SI63', 1.125);
      expect(result.shouldClear).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should NOT clear when diameter is null', () => {
      const result = shouldClearDiameter('SI63', 'SI50', null);
      expect(result.shouldClear).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should NOT clear when previous gear unit is null (first selection)', () => {
      const result = shouldClearDiameter(null, 'SI63', 1.125);
      expect(result.shouldClear).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should NOT clear when current gear unit is null (cleared selection)', () => {
      const result = shouldClearDiameter('SI63', null, 1.125);
      expect(result.shouldClear).toBe(false);
      expect(result.reason).toBeNull();
    });
  });
});
