/**
 * Mounting Style Tests (v1.46)
 *
 * Tests for plug-in shaft style vs hollow shaft bushing based on mounting style:
 * - bottom_mount => inch_keyed => plug-in shaft style selector
 * - shaft_mounted => inch_hollow => hollow shaft bushing selector
 *
 * Lookup tests run against fixture rows mirroring the NORD vendor_components
 * catalog (v1.47 output kits, v1.48 bushing mapping) — the live table now
 * requires an authenticated client, so anon reads return zero rows.
 */

// bom.ts guards every lookup on isSupabaseConfigured(); force it on so the
// fixture-backed client below is exercised without live credentials.
jest.mock('../supabase/anon', () => ({
  isSupabaseConfigured: () => true,
}));

import type { SupabaseClient } from '@supabase/supabase-js';
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

// =============================================================================
// FIXTURES: vendor_components rows for lookup tests
// =============================================================================

interface VendorComponentRow {
  vendor: string;
  component_type: string;
  vendor_part_number: string;
  description: string;
  metadata_json: Record<string, unknown>;
}

// v1.47: every inch size carries all 3 plug-in shaft styles at a fixed OD.
// Part numbers are format-valid placeholders (tests assert styles/ODs, not PNs).
const OUTPUT_KIT_ROWS: VendorComponentRow[] = [
  { size: 'SI31', odIn: 0.625, pnBase: 63100000 },
  { size: 'SI40', odIn: 0.75, pnBase: 64100000 },
  { size: 'SI50', odIn: 1.0, pnBase: 65100000 },
  { size: 'SI63', odIn: 1.125, pnBase: 66100000 },
  { size: 'SI75', odIn: 1.375, pnBase: 67100000 },
].flatMap(({ size, odIn, pnBase }) =>
  ['single', 'double', 'flange_b5'].map((style, i) => ({
    vendor: 'NORD',
    component_type: 'OUTPUT_KIT',
    vendor_part_number: String(pnBase + i),
    description: `Plug-in shaft kit ${size} ${style}`,
    metadata_json: {
      gear_unit_size: size,
      output_shaft_option_key: 'inch_keyed',
      plug_in_shaft_style: style,
      plug_in_shaft_od_in: odIn,
    },
  }))
);

// v1.48 bushing mapping — real NORD part numbers from the vendor_components catalog.
const HOLLOW_SHAFT_BUSHING_ROWS: VendorComponentRow[] = [
  { size: 'SI50', boreIn: 1.0, pn: '60593400' },
  { size: 'SI63', boreIn: 1.0, pn: '60693400' },
  { size: 'SI63', boreIn: 1.1875, pn: '60693410' },
  { size: 'SI63', boreIn: 1.25, pn: '60693420' },
  { size: 'SI75', boreIn: 1.1875, pn: '60793430' },
  { size: 'SI75', boreIn: 1.25, pn: '60793400' },
  { size: 'SI75', boreIn: 1.4375, pn: '60793420' },
  { size: 'SI75', boreIn: 1.5, pn: '60793410' },
].map(({ size, boreIn, pn }) => ({
  vendor: 'NORD',
  component_type: 'HOLLOW_SHAFT_BUSHING',
  vendor_part_number: pn,
  description: `Hollow shaft bushing ${size} ${boreIn}"`,
  metadata_json: {
    gear_unit_size: size,
    shaft_interface_type: 'inch_hollow',
    bushing_bore_in: boreIn,
  },
}));

/**
 * Minimal PostgREST-style query builder over fixture rows. Supports the chain
 * bom.ts uses: from().select().eq().eq().filter('metadata_json->>key', 'eq', v)
 * and resolves to { data, error } when awaited.
 */
function createFixtureClient(rows: VendorComponentRow[]): SupabaseClient {
  const builder = (filtered: VendorComponentRow[]) => ({
    select: () => builder(filtered),
    eq: (column: string, value: unknown) =>
      builder(filtered.filter((row) => row[column as keyof VendorComponentRow] === value)),
    filter: (column: string, _operator: string, value: unknown) => {
      const key = column.replace('metadata_json->>', '');
      return builder(
        filtered.filter((row) => String(row.metadata_json[key]) === String(value))
      );
    },
    then: <T>(onfulfilled: (result: { data: VendorComponentRow[]; error: null }) => T) =>
      Promise.resolve({ data: filtered, error: null }).then(onfulfilled),
  });
  return {
    from: (table: string) => builder(table === 'vendor_components' ? rows : []),
  } as unknown as SupabaseClient;
}

const supabase = createFixtureClient([...OUTPUT_KIT_ROWS, ...HOLLOW_SHAFT_BUSHING_ROWS]);

describe('Available shaft styles and bushings (fixture-backed)', () => {
  describe('getAvailableShaftStyles - full coverage v1.47', () => {
    // v1.47: All inch sizes now have plug-in shaft style data
    const expectedSizes = ['SI31', 'SI40', 'SI50', 'SI63', 'SI75'];
    const expectedStyles = ['single', 'double', 'flange_b5'];

    it.each(expectedSizes)('should return 3 styles for %s with inch_keyed', async (size) => {
      const styles = await getAvailableShaftStyles(supabase,size, 'inch_keyed');
      expect(styles.length).toBe(3);
      expect(styles.some(s => s.style === 'single')).toBe(true);
      expect(styles.some(s => s.style === 'double')).toBe(true);
      expect(styles.some(s => s.style === 'flange_b5')).toBe(true);
    });

    it('should return correct OD for SI31 (0.625")', async () => {
      const styles = await getAvailableShaftStyles(supabase,'SI31', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(0.625, 2);
      });
    });

    it('should return correct OD for SI40 (0.75")', async () => {
      const styles = await getAvailableShaftStyles(supabase,'SI40', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(0.75, 2);
      });
    });

    it('should return correct OD for SI50 (1.0")', async () => {
      const styles = await getAvailableShaftStyles(supabase,'SI50', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(1.0, 2);
      });
    });

    it('should return correct OD for SI63 (1.125")', async () => {
      const styles = await getAvailableShaftStyles(supabase,'SI63', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(1.125, 2);
      });
    });

    it('should return correct OD for SI75 (1.375")', async () => {
      const styles = await getAvailableShaftStyles(supabase,'SI75', 'inch_keyed');
      expect(styles.length).toBe(3);
      styles.forEach(s => {
        expect(s.od_in).toBeCloseTo(1.375, 2);
      });
    });

    it('should return empty array for unknown size', async () => {
      const styles = await getAvailableShaftStyles(supabase,'SI99', 'inch_keyed');
      expect(styles).toEqual([]);
    });
  });

  describe('getAvailableHollowShaftBushings - full coverage v1.48', () => {
    // v1.48: Hollow shaft bushings mapped for SI50, SI63, SI75
    // SI31 and SI40 have no bushings (hollow bore already small)

    it('should return empty array for SI31 (no bushings - bore too small)', async () => {
      const bushings = await getAvailableHollowShaftBushings(supabase,'SI31', 'inch_hollow');
      expect(bushings).toEqual([]);
    });

    it('should return empty array for SI40 (no bushings - bore too small)', async () => {
      const bushings = await getAvailableHollowShaftBushings(supabase,'SI40', 'inch_hollow');
      expect(bushings).toEqual([]);
    });

    it('should return 1 bushing for SI50 (1.000")', async () => {
      const bushings = await getAvailableHollowShaftBushings(supabase,'SI50', 'inch_hollow');
      expect(bushings.length).toBe(1);
      expect(bushings[0].bore_in).toBeCloseTo(1.0, 2);
      expect(bushings[0].part_number).toBe('60593400');
    });

    it('should return 3 bushings for SI63 (1.000", 1.1875", 1.250")', async () => {
      const bushings = await getAvailableHollowShaftBushings(supabase,'SI63', 'inch_hollow');
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
      const bushings = await getAvailableHollowShaftBushings(supabase,'SI75', 'inch_hollow');
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
      const bushings = await getAvailableHollowShaftBushings(supabase,'SI99', 'inch_hollow');
      expect(bushings).toEqual([]);
    });
  });
});
