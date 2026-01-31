/**
 * MAGNET BAR BUILDER - TESTS
 *
 * Tests for bar builder calculation engine.
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

import {
  computeMagnetFit,
  buildBarTemplate,
  calculateBarCapacity,
  calculateBarCapacityFromCounts,
  validateBarConfig,
  applySaturationCorrection,
  countMagnetsByType,
  createSlotSpecsFromCounts,
  computeOptimalMix,
} from './bar-builder';

import {
  MagnetMaterialType,
  MagnetGrade,
  MagnetCatalogItem,
  ConveyorMagnetFamily,
  BarTemplate,
  BarSlot,
} from './schema';

import {
  CERAMIC_5_3_5,
  CERAMIC_5_2_5,
  NEO_35_2_0,
  STANDARD_MAGNET_FAMILY,
  ALL_REMOVAL_CAPACITY_LOOKUPS,
  DEFAULT_GAP_IN,
} from './seed-data';

// ============================================================================
// TEST FIXTURES
// ============================================================================

// Create full magnet catalog items with IDs for testing
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
const CERAMIC_SWEEPER = createMagnet(CERAMIC_5_2_5, 'ceramic-2.5');
const NEO_MAGNET = createMagnet(NEO_35_2_0, 'neo-2.0');

const TEST_MAGNETS: MagnetCatalogItem[] = [CERAMIC_MAGNET, CERAMIC_SWEEPER, NEO_MAGNET];

const createFamily = (
  base: Omit<ConveyorMagnetFamily, 'id' | 'created_at' | 'updated_at'>,
  id: string
): ConveyorMagnetFamily => ({
  ...base,
  id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const TEST_FAMILY = createFamily(STANDARD_MAGNET_FAMILY, 'standard-family');

// ============================================================================
// computeMagnetFit TESTS
// ============================================================================

describe('computeMagnetFit', () => {
  describe('12" OAL', () => {
    it('should fit 3 ceramic 3.5" magnets', () => {
      const result = computeMagnetFit(12, 3.5, 0.25);
      expect(result.count).toBe(3);
      // 3 magnets × 3.5" + 2 gaps × 0.25" = 10.5 + 0.5 = 11"
      expect(result.achieved_oal).toBeCloseTo(11, 2);
      expect(result.remaining).toBeCloseTo(1, 2);
    });

    it('should fit 5 neo 2" magnets', () => {
      const result = computeMagnetFit(12, 2.0, 0.25);
      expect(result.count).toBe(5);
      // 5 magnets × 2" + 4 gaps × 0.25" = 10 + 1 = 11"
      expect(result.achieved_oal).toBeCloseTo(11, 2);
    });
  });

  describe('15" OAL', () => {
    it('should fit 4 ceramic 3.5" magnets', () => {
      const result = computeMagnetFit(15, 3.5, 0.25);
      expect(result.count).toBe(4);
      // 4 × 3.5 + 3 × 0.25 = 14 + 0.75 = 14.75"
      expect(result.achieved_oal).toBeCloseTo(14.75, 2);
    });
  });

  describe('18" OAL', () => {
    it('should fit 4 ceramic 3.5" magnets (not 5)', () => {
      const result = computeMagnetFit(18, 3.5, 0.25);
      // 5 magnets would need: 5 × 3.5 + 4 × 0.25 = 17.5 + 1 = 18.5" > 18"
      expect(result.count).toBe(4);
      expect(result.achieved_oal).toBeCloseTo(14.75, 2);
    });

    it('should fit 8 neo 2" magnets', () => {
      const result = computeMagnetFit(18, 2.0, 0.25);
      expect(result.count).toBe(8);
      // 8 × 2 + 7 × 0.25 = 16 + 1.75 = 17.75"
      expect(result.achieved_oal).toBeCloseTo(17.75, 2);
    });
  });

  describe('24" OAL', () => {
    it('should fit 6 ceramic 3.5" magnets', () => {
      const result = computeMagnetFit(24, 3.5, 0.25);
      expect(result.count).toBe(6);
      // 6 × 3.5 + 5 × 0.25 = 21 + 1.25 = 22.25"
      expect(result.achieved_oal).toBeCloseTo(22.25, 2);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for invalid inputs', () => {
      expect(computeMagnetFit(0, 3.5).count).toBe(0);
      expect(computeMagnetFit(12, 0).count).toBe(0);
      expect(computeMagnetFit(-5, 3.5).count).toBe(0);
      expect(computeMagnetFit(12, -3.5).count).toBe(0);
    });

    it('should handle end clearance', () => {
      const result = computeMagnetFit(12, 3.5, 0.25, 0.5);
      // Available space = 12 - 2×0.5 + 0.25 = 11.25", divided by (3.5 + 0.25) = 3.0 magnets
      expect(result.count).toBe(3);
      // 3 × 3.5 + 2 × 0.25 + 2 × 0.5 = 10.5 + 0.5 + 1 = 12"
      expect(result.achieved_oal).toBeCloseTo(12, 2);
    });
  });
});

// ============================================================================
// buildBarTemplate TESTS
// ============================================================================

describe('buildBarTemplate', () => {
  it('should build ceramic-only 12" bar', () => {
    const slots = [{ magnet_id: 'ceramic-3.5', quantity: 3 }];
    const result = buildBarTemplate(12, slots, 0.25, TEST_MAGNETS, 'test-family');

    expect(result.computed.magnet_count).toBe(3);
    expect(result.computed.achieved_oal_in).toBeCloseTo(11, 2);
    expect(result.computed.leftover_in).toBeCloseTo(1, 2);
    // 3 × 0.1207 = 0.3621
    expect(result.computed.bar_hold_force_lb).toBeCloseTo(0.3621, 4);
  });

  it('should build mixed ceramic+neo 12" bar', () => {
    const slots = [
      { magnet_id: 'ceramic-3.5', quantity: 2 },
      { magnet_id: 'neo-2.0', quantity: 1 },
    ];
    const result = buildBarTemplate(12, slots, 0.25, TEST_MAGNETS, 'test-family');

    expect(result.computed.magnet_count).toBe(3);
    // 2 × 3.5 + 1 × 2 + 2 × 0.25 = 7 + 2 + 0.5 = 9.5"
    expect(result.computed.achieved_oal_in).toBeCloseTo(9.5, 2);
    // 2 × 0.1207 + 1 × 0.298 = 0.2414 + 0.298 = 0.5394
    expect(result.computed.bar_hold_force_lb).toBeCloseTo(0.5394, 4);
  });

  it('should detect overfill', () => {
    const slots = [{ magnet_id: 'ceramic-3.5', quantity: 4 }];
    const result = buildBarTemplate(12, slots, 0.25, TEST_MAGNETS, 'test-family');

    // 4 × 3.5 + 3 × 0.25 = 14 + 0.75 = 14.75" > 12"
    expect(result.computed.leftover_in).toBeLessThan(0);
    expect(result.computed.is_valid).toBe(false);
    expect(result.computed.validation_errors.length).toBeGreaterThan(0);
  });

  it('should handle missing magnet', () => {
    const slots = [{ magnet_id: 'unknown-magnet', quantity: 1 }];
    const result = buildBarTemplate(12, slots, 0.25, TEST_MAGNETS, 'test-family');

    expect(result.computed.magnet_count).toBe(0);
    expect(result.computed.validation_errors).toContain('Magnet unknown-magnet not found in catalog');
  });

  it('should build 24" bar with 4 neo + 2 ceramic', () => {
    const slots = [
      { magnet_id: 'ceramic-3.5', quantity: 2 },
      { magnet_id: 'neo-2.0', quantity: 4 },
    ];
    const result = buildBarTemplate(24, slots, 0.25, TEST_MAGNETS, 'test-family');

    expect(result.computed.magnet_count).toBe(6);
    // 2 × 3.5 + 4 × 2 + 5 × 0.25 = 7 + 8 + 1.25 = 16.25"
    expect(result.computed.achieved_oal_in).toBeCloseTo(16.25, 2);
  });
});

// ============================================================================
// calculateBarCapacity TESTS
// ============================================================================

describe('calculateBarCapacity', () => {
  it('should calculate capacity for ceramic-only bar', () => {
    const template: BarTemplate & { slots: BarSlot[] } = {
      id: 'test',
      name: 'Test',
      family_id: 'family',
      target_oal_in: 12,
      gap_in: 0.25,
      end_clearance_in: 0,
      leftover_tolerance_in: 0.25,
      is_sweeper: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      slots: [
        { id: '1', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 0, slot_index: 0, created_at: '' },
        { id: '2', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 3.75, slot_index: 1, created_at: '' },
        { id: '3', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 7.5, slot_index: 2, created_at: '' },
      ],
    };

    const capacity = calculateBarCapacity(template, TEST_MAGNETS);
    // 3 × 0.1207 = 0.3621 (no saturation for ceramic)
    expect(capacity).toBeCloseTo(0.3621, 4);
  });

  it('should return 0 for empty template', () => {
    const template: BarTemplate & { slots: BarSlot[] } = {
      id: 'test',
      name: 'Test',
      family_id: 'family',
      target_oal_in: 12,
      gap_in: 0.25,
      end_clearance_in: 0,
      leftover_tolerance_in: 0.25,
      is_sweeper: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      slots: [],
    };

    expect(calculateBarCapacity(template, TEST_MAGNETS)).toBe(0);
  });
});

describe('calculateBarCapacityFromCounts', () => {
  it('should match lookup table for 12" ceramic only', () => {
    const expected = 0.362;
    const computed = calculateBarCapacityFromCounts(3, 0, 12);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.05); // Within 5%
  });

  it('should match lookup table for 12" with 1 Neo', () => {
    const expected = 0.52;
    const computed = calculateBarCapacityFromCounts(2, 1, 12);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.05);
  });

  it('should match lookup table for 12" with 2 Neo', () => {
    const expected = 0.717;
    const computed = calculateBarCapacityFromCounts(1, 2, 12);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.20); // Allow higher tolerance for mixed config variance
  });

  it('should match lookup table for 24" ceramic only', () => {
    const expected = 0.723;
    const computed = calculateBarCapacityFromCounts(6, 0, 24);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.05);
  });

  it('should match lookup table for 24" with 2 Neo', () => {
    const expected = 1.061;
    const computed = calculateBarCapacityFromCounts(4, 2, 24);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.20);
  });
});

// ============================================================================
// SATURATION CORRECTION TESTS
// ============================================================================

describe('applySaturationCorrection', () => {
  it('should not apply correction for 3 or fewer Neo', () => {
    const base = 0.894; // 3 × 0.298
    expect(applySaturationCorrection(base, 3, 0, 12)).toBe(base);
    expect(applySaturationCorrection(base, 2, 0, 12)).toBe(base);
    expect(applySaturationCorrection(base, 1, 0, 12)).toBe(base);
  });

  it('should not apply correction when ceramic is present', () => {
    const base = 1.192; // 4 × 0.298
    // Even with 4 Neo, presence of ceramic prevents saturation
    expect(applySaturationCorrection(base, 4, 1, 12)).toBe(base);
  });

  it('should apply correction for 4 Neo on 12" bar', () => {
    const base = 1.192; // 4 × 0.298
    const corrected = applySaturationCorrection(base, 4, 0, 12);
    // Expect ~88.4% of base (from lookup table: 1.054 / 1.192 = 0.884)
    expect(corrected).toBeCloseTo(1.054, 2);
  });

  it('should apply correction for 5 Neo on 12" bar', () => {
    const base = 1.49; // 5 × 0.298
    const corrected = applySaturationCorrection(base, 5, 0, 12);
    // Expect ~80% of base (from lookup table: 1.192 / 1.49 = 0.80)
    expect(corrected).toBeCloseTo(1.192, 2);
  });

  it('should apply less correction for wider bars', () => {
    const base = 1.192; // 4 × 0.298
    const corrected12 = applySaturationCorrection(base, 4, 0, 12);
    const corrected15 = applySaturationCorrection(base, 4, 0, 15);
    const corrected24 = applySaturationCorrection(base, 4, 0, 24);

    // Wider bars should have less reduction
    expect(corrected12).toBeLessThan(corrected15);
    expect(corrected15).toBeLessThan(corrected24);
  });
});

describe('Saturation correction - outlier verification', () => {
  // These were the 4 outliers from Phase 1 with >10% error without correction
  // With saturation correction, they should now be within 10%

  it('should correct 12" with 4 Neo within 10%', () => {
    const expected = 1.054;
    const computed = calculateBarCapacityFromCounts(0, 4, 12);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.10);
  });

  it('should correct 12" with 5 Neo within 10%', () => {
    const expected = 1.192;
    const computed = calculateBarCapacityFromCounts(0, 5, 12);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.10);
  });

  it('should correct 15" with 4 Neo within 10%', () => {
    const expected = 1.155;
    const computed = calculateBarCapacityFromCounts(0, 4, 15);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.10);
  });

  it('should correct 15" with 5 Neo within 10%', () => {
    const expected = 1.352;
    const computed = calculateBarCapacityFromCounts(0, 5, 15);
    const error = Math.abs(computed - expected) / expected;
    expect(error).toBeLessThan(0.10);
  });
});

// ============================================================================
// LOOKUP TABLE VALIDATION TESTS
// ============================================================================

describe('Lookup table matching', () => {
  // Test all lookup table entries to ensure most are within 5%
  const testCases = ALL_REMOVAL_CAPACITY_LOOKUPS.map((lookup) => ({
    name: `${lookup.oal_in}" ${lookup.configuration}`,
    oal: lookup.oal_in,
    ceramic: lookup.ceramic_count,
    neo: lookup.neo_count,
    expected: lookup.lbs_per_bar,
  }));

  const results: Array<{ name: string; expected: number; computed: number; error: number }> = [];

  it.each(testCases)('$name should be within tolerance', ({ oal, ceramic, neo, expected, name }) => {
    const computed = calculateBarCapacityFromCounts(ceramic, neo, oal);
    const error = Math.abs(computed - expected) / expected;
    results.push({ name, expected, computed, error });

    // Allow 20% for mixed configs due to interaction effects
    // Allow 15% for pure ceramic configs (width-based capacity variation)
    // Allow 10% for pure neo configs with saturation correction
    let tolerance = 0.10;
    if (ceramic > 0 && neo > 0) {
      tolerance = 0.20; // Mixed configs have interaction effects
    } else if (ceramic > 0 && neo === 0) {
      tolerance = 0.15; // Pure ceramic has width-based variation
    }
    expect(error).toBeLessThan(tolerance);
  });

  afterAll(() => {
    // Log summary for debugging
    const within5 = results.filter((r) => r.error < 0.05).length;
    const within10 = results.filter((r) => r.error < 0.10).length;
    const total = results.length;
    console.log(`\nLookup table match summary:`);
    console.log(`  Within 5%: ${within5}/${total} (${((within5 / total) * 100).toFixed(1)}%)`);
    console.log(`  Within 10%: ${within10}/${total} (${((within10 / total) * 100).toFixed(1)}%)`);

    // Log outliers
    const outliers = results.filter((r) => r.error >= 0.10);
    if (outliers.length > 0) {
      console.log(`  Outliers (>10% error):`);
      for (const o of outliers) {
        console.log(`    ${o.name}: expected ${o.expected}, computed ${o.computed.toFixed(4)} (${(o.error * 100).toFixed(1)}%)`);
      }
    }
  });
});

// ============================================================================
// validateBarConfig TESTS
// ============================================================================

describe('validateBarConfig', () => {
  const createTemplate = (slots: BarSlot[]): BarTemplate & { slots: BarSlot[] } => ({
    id: 'test',
    name: 'Test',
    family_id: TEST_FAMILY.id,
    target_oal_in: 12,
    gap_in: 0.25,
    end_clearance_in: 0,
    leftover_tolerance_in: 0.25,
    is_sweeper: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slots,
  });

  it('should validate correct configuration', () => {
    const template = createTemplate([
      { id: '1', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 0, slot_index: 0, created_at: '' },
      { id: '2', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 3.75, slot_index: 1, created_at: '' },
      { id: '3', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 7.5, slot_index: 2, created_at: '' },
    ]);

    const result = validateBarConfig(template, TEST_FAMILY, TEST_MAGNETS);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject empty template', () => {
    const template = createTemplate([]);
    const result = validateBarConfig(template, TEST_FAMILY, TEST_MAGNETS);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Bar template has no slots');
  });

  it('should reject too many magnets', () => {
    const slots: BarSlot[] = [];
    for (let i = 0; i < 15; i++) {
      slots.push({
        id: `${i}`,
        bar_template_id: 'test',
        magnet_id: 'ceramic-3.5',
        position_in: i * 3.75,
        slot_index: i,
        created_at: '',
      });
    }

    const template = createTemplate(slots);
    const result = validateBarConfig(template, TEST_FAMILY, TEST_MAGNETS);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Too many magnets'))).toBe(true);
  });

  it('should reject wrong cross-section', () => {
    // Create a magnet with different cross-section
    const wrongMagnet: MagnetCatalogItem = {
      ...CERAMIC_MAGNET,
      id: 'wrong-cross',
      cross_section_key: '2.00x2.00',
    };
    const magnets = [...TEST_MAGNETS, wrongMagnet];

    const template = createTemplate([
      { id: '1', bar_template_id: 'test', magnet_id: 'wrong-cross', position_in: 0, slot_index: 0, created_at: '' },
    ]);

    const result = validateBarConfig(template, TEST_FAMILY, magnets);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('wrong cross-section'))).toBe(true);
  });

  it('should warn about non-standard lengths', () => {
    // Create a magnet with non-allowed length
    const oddMagnet: MagnetCatalogItem = {
      ...CERAMIC_MAGNET,
      id: 'odd-length',
      length_in: 4.0, // Not in allowed_lengths_in [2.5, 3.5]
    };
    const magnets = [...TEST_MAGNETS, oddMagnet];

    const template = createTemplate([
      { id: '1', bar_template_id: 'test', magnet_id: 'odd-length', position_in: 0, slot_index: 0, created_at: '' },
    ]);

    const result = validateBarConfig(template, TEST_FAMILY, magnets);
    expect(result.warnings.some((w) => w.includes('non-standard length'))).toBe(true);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('countMagnetsByType', () => {
  it('should count ceramic and neo magnets', () => {
    const template: BarTemplate & { slots: BarSlot[] } = {
      id: 'test',
      name: 'Test',
      family_id: 'family',
      target_oal_in: 12,
      gap_in: 0.25,
      end_clearance_in: 0,
      leftover_tolerance_in: 0.25,
      is_sweeper: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      slots: [
        { id: '1', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 0, slot_index: 0, created_at: '' },
        { id: '2', bar_template_id: 'test', magnet_id: 'ceramic-3.5', position_in: 3.75, slot_index: 1, created_at: '' },
        { id: '3', bar_template_id: 'test', magnet_id: 'neo-2.0', position_in: 7.5, slot_index: 2, created_at: '' },
      ],
    };

    const counts = countMagnetsByType(template, TEST_MAGNETS);
    expect(counts.ceramic).toBe(2);
    expect(counts.neo).toBe(1);
    expect(counts.total).toBe(3);
  });
});

describe('createSlotSpecsFromCounts', () => {
  it('should create specs for mixed configuration', () => {
    const specs = createSlotSpecsFromCounts('ceramic-3.5', 2, 'neo-2.0', 1);
    expect(specs.length).toBe(2);
    expect(specs[0]).toEqual({ magnet_id: 'ceramic-3.5', quantity: 2 });
    expect(specs[1]).toEqual({ magnet_id: 'neo-2.0', quantity: 1 });
  });

  it('should handle ceramic-only', () => {
    const specs = createSlotSpecsFromCounts('ceramic-3.5', 3, 'neo-2.0', 0);
    expect(specs.length).toBe(1);
    expect(specs[0]).toEqual({ magnet_id: 'ceramic-3.5', quantity: 3 });
  });

  it('should handle neo-only', () => {
    const specs = createSlotSpecsFromCounts('ceramic-3.5', 0, 'neo-2.0', 4);
    expect(specs.length).toBe(1);
    expect(specs[0]).toEqual({ magnet_id: 'neo-2.0', quantity: 4 });
  });
});

describe('computeOptimalMix', () => {
  it('should fill 12" with ceramic only', () => {
    const result = computeOptimalMix(12, 3.5, 2.0, 0.25, 0);
    expect(result.ceramic).toBe(3);
    expect(result.neo).toBe(0);
  });

  it('should replace 1 ceramic with neo', () => {
    const result = computeOptimalMix(12, 3.5, 2.0, 0.25, 1);
    expect(result.ceramic).toBe(2);
    expect(result.neo).toBe(1);
  });

  it('should limit replacements to maintain fit', () => {
    // Can't replace too many because neo is shorter
    const result = computeOptimalMix(12, 3.5, 2.0, 0.25, 10);
    expect(result.ceramic + result.neo).toBeLessThanOrEqual(5);
  });
});
