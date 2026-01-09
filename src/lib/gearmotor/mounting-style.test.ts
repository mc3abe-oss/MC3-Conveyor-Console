/**
 * Mounting Style Tests (v1.46)
 *
 * Tests for plug-in shaft style vs hollow shaft bushing based on mounting style:
 * - bottom_mount => inch_keyed => plug-in shaft style selector
 * - shaft_mounted => inch_hollow => hollow shaft bushing selector
 */

import { GearmotorMountingStyle } from '../../models/sliderbed_v1/schema';
import { getAvailableShaftStyles, getAvailableHollowShaftBushings } from './bom';

/**
 * Helper to determine what configuration UI to show based on mounting style.
 * This mirrors the logic in DriveSelectorModal.tsx.
 */
function getConfigTypeForMountingStyle(mountingStyle: GearmotorMountingStyle | string | null | undefined): 'plug_in_shaft' | 'hollow_shaft' {
  const isBottomMount = mountingStyle === GearmotorMountingStyle.BottomMount || mountingStyle === 'bottom_mount';
  return isBottomMount ? 'plug_in_shaft' : 'hollow_shaft';
}

describe('Mounting style configuration logic', () => {
  describe('getConfigTypeForMountingStyle', () => {
    it('should return plug_in_shaft for bottom_mount enum', () => {
      expect(getConfigTypeForMountingStyle(GearmotorMountingStyle.BottomMount)).toBe('plug_in_shaft');
    });

    it('should return plug_in_shaft for bottom_mount string', () => {
      expect(getConfigTypeForMountingStyle('bottom_mount')).toBe('plug_in_shaft');
    });

    it('should return hollow_shaft for shaft_mounted enum', () => {
      expect(getConfigTypeForMountingStyle(GearmotorMountingStyle.ShaftMounted)).toBe('hollow_shaft');
    });

    it('should return hollow_shaft for shaft_mounted string', () => {
      expect(getConfigTypeForMountingStyle('shaft_mounted')).toBe('hollow_shaft');
    });

    it('should default to hollow_shaft for null', () => {
      expect(getConfigTypeForMountingStyle(null)).toBe('hollow_shaft');
    });

    it('should default to hollow_shaft for undefined', () => {
      expect(getConfigTypeForMountingStyle(undefined)).toBe('hollow_shaft');
    });
  });

  describe('State clearing on mounting style change', () => {
    /**
     * Simulates the clearing behavior when mounting style changes.
     * This mirrors the logic in DriveArrangementModal.tsx.
     */
    interface DriveConfig {
      plugInShaftStyle: string | null;
      hollowShaftBushingBoreIn: number | null;
    }

    function clearConfigOnMountingStyleChange(
      newMountingStyle: GearmotorMountingStyle,
      currentConfig: DriveConfig
    ): DriveConfig {
      if (newMountingStyle === GearmotorMountingStyle.ShaftMounted) {
        // Switching to shaft_mounted: clear plug-in shaft style
        return {
          plugInShaftStyle: null,
          hollowShaftBushingBoreIn: currentConfig.hollowShaftBushingBoreIn,
        };
      } else if (newMountingStyle === GearmotorMountingStyle.BottomMount) {
        // Switching to bottom_mount: clear hollow shaft bushing
        return {
          plugInShaftStyle: currentConfig.plugInShaftStyle,
          hollowShaftBushingBoreIn: null,
        };
      }
      return currentConfig;
    }

    it('should clear plug_in_shaft_style when switching to shaft_mounted', () => {
      const currentConfig: DriveConfig = {
        plugInShaftStyle: 'single',
        hollowShaftBushingBoreIn: null,
      };

      const result = clearConfigOnMountingStyleChange(GearmotorMountingStyle.ShaftMounted, currentConfig);

      expect(result.plugInShaftStyle).toBeNull();
      expect(result.hollowShaftBushingBoreIn).toBeNull(); // unchanged
    });

    it('should clear hollow_shaft_bushing_bore_in when switching to bottom_mount', () => {
      const currentConfig: DriveConfig = {
        plugInShaftStyle: null,
        hollowShaftBushingBoreIn: 1.1875,
      };

      const result = clearConfigOnMountingStyleChange(GearmotorMountingStyle.BottomMount, currentConfig);

      expect(result.plugInShaftStyle).toBeNull(); // unchanged
      expect(result.hollowShaftBushingBoreIn).toBeNull();
    });

    it('should preserve other config when switching', () => {
      const currentConfig: DriveConfig = {
        plugInShaftStyle: 'double',
        hollowShaftBushingBoreIn: 1.0,
      };

      // Switching to shaft_mounted
      const result1 = clearConfigOnMountingStyleChange(GearmotorMountingStyle.ShaftMounted, currentConfig);
      expect(result1.plugInShaftStyle).toBeNull();
      expect(result1.hollowShaftBushingBoreIn).toBe(1.0); // preserved

      // Switching to bottom_mount
      const result2 = clearConfigOnMountingStyleChange(GearmotorMountingStyle.BottomMount, currentConfig);
      expect(result2.plugInShaftStyle).toBe('double'); // preserved
      expect(result2.hollowShaftBushingBoreIn).toBeNull();
    });
  });
});

describe('Available shaft styles and bushings (integration)', () => {
  describe('getAvailableShaftStyles - full coverage v1.47', () => {
    // v1.47: All inch sizes now have plug-in shaft style data
    const expectedSizes = ['SI31', 'SI40', 'SI50', 'SI63', 'SI75'];
    const expectedStyles = ['single', 'double', 'flange_b5'];

    it.each(expectedSizes)('should return 3 styles for %s with inch_keyed', async (size) => {
      const styles = await getAvailableShaftStyles(size, 'inch_keyed');
      expect(styles.length).toBe(3);
      expect(styles.some(s => s.style === 'single')).toBe(true);
      expect(styles.some(s => s.style === 'double')).toBe(true);
      expect(styles.some(s => s.style === 'flange_b5')).toBe(true);
    });

    it('should return correct OD for SI31 (0.625")', async () => {
      const styles = await getAvailableShaftStyles('SI31', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(0.625, 2);
      });
    });

    it('should return correct OD for SI40 (0.75")', async () => {
      const styles = await getAvailableShaftStyles('SI40', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(0.75, 2);
      });
    });

    it('should return correct OD for SI50 (1.0")', async () => {
      const styles = await getAvailableShaftStyles('SI50', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(1.0, 2);
      });
    });

    it('should return correct OD for SI63 (1.125")', async () => {
      const styles = await getAvailableShaftStyles('SI63', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(1.125, 2);
      });
    });

    it('should return correct OD for SI75 (1.375")', async () => {
      const styles = await getAvailableShaftStyles('SI75', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(1.375, 2);
      });
    });

    it('should return empty array for unknown size', async () => {
      const styles = await getAvailableShaftStyles('SI99', 'inch_keyed');
      expect(styles).toEqual([]);
    });
  });

  describe('getAvailableHollowShaftBushings - full coverage v1.48', () => {
    // v1.48: Hollow shaft bushings mapped for SI50, SI63, SI75
    // SI31 and SI40 have no bushings (hollow bore already small)

    it('should return empty array for SI31 (no bushings - bore too small)', async () => {
      const bushings = await getAvailableHollowShaftBushings('SI31', 'inch_hollow');
      expect(bushings).toEqual([]);
    });

    it('should return empty array for SI40 (no bushings - bore too small)', async () => {
      const bushings = await getAvailableHollowShaftBushings('SI40', 'inch_hollow');
      expect(bushings).toEqual([]);
    });

    it('should return 1 bushing for SI50 (1.000")', async () => {
      const bushings = await getAvailableHollowShaftBushings('SI50', 'inch_hollow');
      expect(bushings.length).toBe(1);
      expect(bushings[0].bore_in).toBeCloseTo(1.0, 2);
      expect(bushings[0].part_number).toBe('60593400');
    });

    it('should return 3 bushings for SI63 (1.000", 1.1875", 1.250")', async () => {
      const bushings = await getAvailableHollowShaftBushings('SI63', 'inch_hollow');
      expect(bushings.length).toBe(3);

      // Verify specific bore sizes
      const bores = bushings.map(b => b.bore_in).sort((a, b) => a - b);
      expect(bores[0]).toBeCloseTo(1.0, 2);
      expect(bores[1]).toBeCloseTo(1.1875, 2);
      expect(bores[2]).toBeCloseTo(1.25, 2);

      // Verify PNs
      expect(bushings.find(b => Math.abs(b.bore_in - 1.0) < 0.01)?.part_number).toBe('60693400');
      expect(bushings.find(b => Math.abs(b.bore_in - 1.1875) < 0.01)?.part_number).toBe('60693410');
      expect(bushings.find(b => Math.abs(b.bore_in - 1.25) < 0.01)?.part_number).toBe('60693420');
    });

    it('should return 4 bushings for SI75 (1.1875", 1.250", 1.4375", 1.500")', async () => {
      const bushings = await getAvailableHollowShaftBushings('SI75', 'inch_hollow');
      expect(bushings.length).toBe(4);

      // Verify specific bore sizes
      const bores = bushings.map(b => b.bore_in).sort((a, b) => a - b);
      expect(bores[0]).toBeCloseTo(1.1875, 2);
      expect(bores[1]).toBeCloseTo(1.25, 2);
      expect(bores[2]).toBeCloseTo(1.4375, 2);
      expect(bores[3]).toBeCloseTo(1.5, 2);

      // Verify PNs
      expect(bushings.find(b => Math.abs(b.bore_in - 1.1875) < 0.01)?.part_number).toBe('60793430');
      expect(bushings.find(b => Math.abs(b.bore_in - 1.25) < 0.01)?.part_number).toBe('60793400');
      expect(bushings.find(b => Math.abs(b.bore_in - 1.4375) < 0.01)?.part_number).toBe('60793420');
      expect(bushings.find(b => Math.abs(b.bore_in - 1.5) < 0.01)?.part_number).toBe('60793410');
    });

    it('should return empty array for unknown size', async () => {
      const bushings = await getAvailableHollowShaftBushings('SI99', 'inch_hollow');
      expect(bushings).toEqual([]);
    });
  });
});
