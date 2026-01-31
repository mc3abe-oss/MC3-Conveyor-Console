/**
 * MAGNET BAR PATTERN SYSTEM - TESTS
 *
 * Tests for pattern logic and conveyor capacity calculations.
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

import {
  applyPattern,
  calculateConveyorCapacity,
  calculateConveyorCapacityFromValues,
  validatePattern,
  describePattern,
  previewPattern,
  calculateBarCounts,
  DEFAULT_PATTERNS,
  PatternConfig,
} from './patterns';

import {
  BarPatternMode,
  BarTemplate,
  BarSlot,
  MagnetCatalogItem,
  MagnetMaterialType,
  MagnetGrade,
} from './schema';

import { CERAMIC_5_3_5, NEO_35_2_0 } from './seed-data';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMagnet = (
  base: Omit<MagnetCatalogItem, 'id' | 'created_at' | 'updated_at'>,
  id: string
): MagnetCatalogItem => ({
  ...base,
  id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const CERAMIC_MAGNET = createMagnet(CERAMIC_5_3_5, 'ceramic-3.5');
const NEO_MAGNET = createMagnet(NEO_35_2_0, 'neo-2.0');
const TEST_MAGNETS: MagnetCatalogItem[] = [CERAMIC_MAGNET, NEO_MAGNET];

const createTemplate = (
  id: string,
  name: string,
  slots: Array<{ magnet_id: string }>
): BarTemplate & { slots: BarSlot[] } => ({
  id,
  name,
  family_id: 'test-family',
  target_oal_in: 12,
  gap_in: 0.25,
  end_clearance_in: 0,
  leftover_tolerance_in: 0.25,
  is_sweeper: false,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  slots: slots.map((s, i) => ({
    id: `slot-${id}-${i}`,
    bar_template_id: id,
    magnet_id: s.magnet_id,
    position_in: i * 3.75,
    slot_index: i,
    created_at: new Date().toISOString(),
  })),
});

// Template A: 3 ceramic magnets (capacity ~0.3621 lb)
const TEMPLATE_A = createTemplate('template-a', 'Standard Ceramic', [
  { magnet_id: 'ceramic-3.5' },
  { magnet_id: 'ceramic-3.5' },
  { magnet_id: 'ceramic-3.5' },
]);

// Template B: 2 ceramic + 1 neo (capacity ~0.5394 lb)
const TEMPLATE_B = createTemplate('template-b', 'Ceramic + Neo', [
  { magnet_id: 'ceramic-3.5' },
  { magnet_id: 'ceramic-3.5' },
  { magnet_id: 'neo-2.0' },
]);

// Template C: Sweeper bar (capacity ~0.24 lb)
const TEMPLATE_C = createTemplate('template-c', 'Sweeper', [
  { magnet_id: 'ceramic-3.5' },
  { magnet_id: 'ceramic-3.5' },
]);

const TEST_TEMPLATES = new Map<string, BarTemplate & { slots: BarSlot[] }>([
  ['template-a', TEMPLATE_A],
  ['template-b', TEMPLATE_B],
  ['template-c', TEMPLATE_C],
]);

// ============================================================================
// applyPattern TESTS
// ============================================================================

describe('applyPattern', () => {
  describe('all-same mode', () => {
    it('should return all same template for 10 bars', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.AllSame,
        primary_template_id: 'template-a',
      };

      const result = applyPattern(pattern, 10);

      expect(result.template_ids.length).toBe(10);
      expect(result.template_ids.every((id) => id === 'template-a')).toBe(true);
      expect(result.primary_count).toBe(10);
      expect(result.secondary_count).toBe(0);
    });

    it('should handle 0 bars', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.AllSame,
        primary_template_id: 'template-a',
      };

      const result = applyPattern(pattern, 0);

      expect(result.template_ids.length).toBe(0);
      expect(result.primary_count).toBe(0);
    });

    it('should handle 1 bar', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.AllSame,
        primary_template_id: 'template-a',
      };

      const result = applyPattern(pattern, 1);

      expect(result.template_ids).toEqual(['template-a']);
      expect(result.primary_count).toBe(1);
    });
  });

  describe('alternating mode', () => {
    it('should alternate A-B-A-B for 10 bars', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.Alternating,
        primary_template_id: 'template-a',
        secondary_template_id: 'template-b',
      };

      const result = applyPattern(pattern, 10);

      expect(result.template_ids.length).toBe(10);
      expect(result.template_ids[0]).toBe('template-a'); // position 1 (odd)
      expect(result.template_ids[1]).toBe('template-b'); // position 2 (even)
      expect(result.template_ids[2]).toBe('template-a'); // position 3 (odd)
      expect(result.template_ids[3]).toBe('template-b'); // position 4 (even)
      expect(result.primary_count).toBe(5);
      expect(result.secondary_count).toBe(5);
    });

    it('should handle odd number of bars', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.Alternating,
        primary_template_id: 'template-a',
        secondary_template_id: 'template-b',
      };

      const result = applyPattern(pattern, 7);

      expect(result.template_ids.length).toBe(7);
      expect(result.primary_count).toBe(4); // positions 1, 3, 5, 7
      expect(result.secondary_count).toBe(3); // positions 2, 4, 6
    });

    it('should use primary for all if no secondary', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.Alternating,
        primary_template_id: 'template-a',
      };

      const result = applyPattern(pattern, 4);

      expect(result.template_ids.every((id) => id === 'template-a')).toBe(true);
      expect(result.primary_count).toBe(4);
      expect(result.secondary_count).toBe(0);
    });
  });

  describe('interval mode', () => {
    it('should place secondary every 4th bar for 12 bars', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.Interval,
        primary_template_id: 'template-a',
        secondary_template_id: 'template-c',
        interval_count: 4,
      };

      const result = applyPattern(pattern, 12);

      expect(result.template_ids.length).toBe(12);
      // Secondary at positions 4, 8, 12
      expect(result.template_ids[3]).toBe('template-c'); // position 4
      expect(result.template_ids[7]).toBe('template-c'); // position 8
      expect(result.template_ids[11]).toBe('template-c'); // position 12
      // Primary at other positions
      expect(result.template_ids[0]).toBe('template-a'); // position 1
      expect(result.template_ids[1]).toBe('template-a'); // position 2
      expect(result.template_ids[2]).toBe('template-a'); // position 3
      expect(result.primary_count).toBe(9);
      expect(result.secondary_count).toBe(3);
    });

    it('should handle interval > total bars', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.Interval,
        primary_template_id: 'template-a',
        secondary_template_id: 'template-c',
        interval_count: 10,
      };

      const result = applyPattern(pattern, 5);

      // No secondary bars since we don't reach position 10
      expect(result.template_ids.every((id) => id === 'template-a')).toBe(true);
      expect(result.primary_count).toBe(5);
      expect(result.secondary_count).toBe(0);
    });

    it('should handle interval matching total bars', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.Interval,
        primary_template_id: 'template-a',
        secondary_template_id: 'template-c',
        interval_count: 5,
      };

      const result = applyPattern(pattern, 5);

      // Secondary at position 5 only
      expect(result.template_ids[4]).toBe('template-c');
      expect(result.primary_count).toBe(4);
      expect(result.secondary_count).toBe(1);
    });

    it('should default to interval of 4', () => {
      const pattern: PatternConfig = {
        mode: BarPatternMode.Interval,
        primary_template_id: 'template-a',
        secondary_template_id: 'template-c',
      };

      const result = applyPattern(pattern, 8);

      // Secondary at positions 4 and 8
      expect(result.secondary_count).toBe(2);
    });
  });
});

// ============================================================================
// calculateConveyorCapacity TESTS
// ============================================================================

describe('calculateConveyorCapacity', () => {
  it('should calculate capacity for all-same pattern', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: 'template-a',
    };

    const result = calculateConveyorCapacity(
      pattern,
      10,
      TEST_TEMPLATES,
      TEST_MAGNETS
    );

    // Template A: 3 ceramic × 0.1207 = 0.3621 lb per bar
    // 10 bars × 0.3621 = 3.621 lb total
    expect(result.bar_sequence.length).toBe(10);
    expect(result.primary_bar_count).toBe(10);
    expect(result.secondary_bar_count).toBe(0);
    expect(result.total_capacity_lb).toBeCloseTo(3.621, 2);
    expect(result.capacity_per_bar_avg).toBeCloseTo(0.3621, 3);
  });

  it('should calculate capacity for alternating pattern', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Alternating,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-b',
    };

    const result = calculateConveyorCapacity(
      pattern,
      10,
      TEST_TEMPLATES,
      TEST_MAGNETS
    );

    // 5 × Template A (0.3621) + 5 × Template B (0.5394) = 1.8105 + 2.697 = 4.5075
    expect(result.bar_sequence.length).toBe(10);
    expect(result.primary_bar_count).toBe(5);
    expect(result.secondary_bar_count).toBe(5);
    // Allow some tolerance for floating point
    expect(result.total_capacity_lb).toBeGreaterThan(4);
    expect(result.total_capacity_lb).toBeLessThan(5);
  });

  it('should calculate capacity for interval pattern', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Interval,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-c',
      interval_count: 4,
    };

    const result = calculateConveyorCapacity(
      pattern,
      12,
      TEST_TEMPLATES,
      TEST_MAGNETS
    );

    // 9 × Template A + 3 × Template C
    expect(result.bar_sequence.length).toBe(12);
    expect(result.primary_bar_count).toBe(9);
    expect(result.secondary_bar_count).toBe(3);
  });

  it('should handle empty bar count', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: 'template-a',
    };

    const result = calculateConveyorCapacity(pattern, 0, TEST_TEMPLATES, TEST_MAGNETS);

    expect(result.total_capacity_lb).toBe(0);
    expect(result.capacity_per_bar_avg).toBe(0);
    expect(result.bar_sequence.length).toBe(0);
  });

  it('should handle missing template gracefully', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: 'nonexistent',
    };

    const result = calculateConveyorCapacity(pattern, 5, TEST_TEMPLATES, TEST_MAGNETS);

    // Should have entries but with 0 capacity
    expect(result.bar_sequence.length).toBe(5);
    expect(result.total_capacity_lb).toBe(0);
  });
});

describe('calculateConveyorCapacityFromValues', () => {
  it('should calculate from pre-computed values', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Alternating,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-b',
    };

    const result = calculateConveyorCapacityFromValues(pattern, 10, 0.4, 0.6);

    // 5 × 0.4 + 5 × 0.6 = 2.0 + 3.0 = 5.0
    expect(result.total_capacity_lb).toBe(5.0);
    expect(result.capacity_per_bar_avg).toBe(0.5);
  });

  it('should handle all-same with single value', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: 'template-a',
    };

    const result = calculateConveyorCapacityFromValues(pattern, 20, 0.362);

    expect(result.total_capacity_lb).toBeCloseTo(7.24, 2);
  });
});

// ============================================================================
// validatePattern TESTS
// ============================================================================

describe('validatePattern', () => {
  it('should validate correct all-same pattern', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: 'template-a',
    };

    const result = validatePattern(pattern, TEST_TEMPLATES);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should error on missing primary template', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: '',
    };

    const result = validatePattern(pattern);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Primary template is required');
  });

  it('should error on nonexistent primary template when templates provided', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: 'nonexistent',
    };

    const result = validatePattern(pattern, TEST_TEMPLATES);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('should warn on alternating without secondary', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Alternating,
      primary_template_id: 'template-a',
    };

    const result = validatePattern(pattern, TEST_TEMPLATES);

    expect(result.valid).toBe(true); // Still valid, just a warning
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should error on invalid interval', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Interval,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-b',
      interval_count: 1, // Invalid: must be at least 2
    };

    const result = validatePattern(pattern, TEST_TEMPLATES);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least 2'))).toBe(true);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('describePattern', () => {
  it('should describe all-same pattern', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.AllSame,
      primary_template_id: 'template-a',
    };

    const description = describePattern(pattern, TEST_TEMPLATES);

    expect(description).toContain('Standard Ceramic');
    expect(description).toContain('All bars');
  });

  it('should describe alternating pattern', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Alternating,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-b',
    };

    const description = describePattern(pattern, TEST_TEMPLATES);

    expect(description).toContain('Alternating');
    expect(description).toContain('Standard Ceramic');
    expect(description).toContain('Ceramic + Neo');
  });

  it('should describe interval pattern', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Interval,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-c',
      interval_count: 4,
    };

    const description = describePattern(pattern, TEST_TEMPLATES);

    expect(description).toContain('every 4 bars');
    expect(description).toContain('Sweeper');
  });
});

describe('previewPattern', () => {
  it('should preview first 8 bars', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Alternating,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-b',
    };

    const preview = previewPattern(pattern, 8);

    expect(preview.length).toBe(8);
    expect(preview[0].isPrimary).toBe(true);
    expect(preview[1].isPrimary).toBe(false);
    expect(preview[2].isPrimary).toBe(true);
    expect(preview[3].isPrimary).toBe(false);
  });
});

describe('calculateBarCounts', () => {
  it('should calculate split for alternating', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Alternating,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-b',
    };

    const counts = calculateBarCounts(pattern, 10);

    expect(counts.primary).toBe(5);
    expect(counts.secondary).toBe(5);
  });

  it('should calculate split for interval', () => {
    const pattern: PatternConfig = {
      mode: BarPatternMode.Interval,
      primary_template_id: 'template-a',
      secondary_template_id: 'template-c',
      interval_count: 4,
    };

    const counts = calculateBarCounts(pattern, 12);

    expect(counts.primary).toBe(9);
    expect(counts.secondary).toBe(3);
  });
});

describe('DEFAULT_PATTERNS', () => {
  it('should create all-ceramic pattern', () => {
    const pattern = DEFAULT_PATTERNS.allCeramic('template-a');

    expect(pattern.mode).toBe(BarPatternMode.AllSame);
    expect(pattern.primary_template_id).toBe('template-a');
  });

  it('should create alternating pattern', () => {
    const pattern = DEFAULT_PATTERNS.alternating('template-a', 'template-b');

    expect(pattern.mode).toBe(BarPatternMode.Alternating);
    expect(pattern.primary_template_id).toBe('template-a');
    expect(pattern.secondary_template_id).toBe('template-b');
  });

  it('should create sweeper pattern', () => {
    const pattern = DEFAULT_PATTERNS.sweeperEvery4th('template-a', 'template-c');

    expect(pattern.mode).toBe(BarPatternMode.Interval);
    expect(pattern.interval_count).toBe(4);
  });
});
