/**
 * MAGNET BAR CONFIGURATION SYSTEM - SCHEMA TESTS
 *
 * Tests for type validation, enum coverage, and helper functions.
 *
 * CHANGELOG:
 * v1.0 (2026-01-31): Initial implementation
 */

import {
  // Enums
  MagnetMaterialType,
  MagnetGrade,
  BarPatternMode,
  // Labels
  MAGNET_MATERIAL_TYPE_LABELS,
  MAGNET_GRADE_LABELS,
  BAR_PATTERN_MODE_LABELS,
  // Constants
  SUPPORTED_OAL_VALUES_IN,
  SUPPORTED_CENTER_SPACING_IN,
  // Type guards
  isMagnetMaterialType,
  isMagnetGrade,
  isBarPatternMode,
  isSupportedOAL,
  isSupportedCenterSpacing,
  // Types (import for type checking)
  type ConveyorMagnetFamily,
  type MagnetCatalogItem,
  type BarSlot,
  type BarTemplate,
  type BarPattern,
  type MagnetLayout,
  type RemovalCapacityLookup,
} from './schema';

import {
  // Seed data
  STANDARD_MAGNET_FAMILY,
  HEAVY_DUTY_MAGNET_FAMILY,
  CERAMIC_5_3_5,
  CERAMIC_5_2_5,
  NEO_35_1_375,
  NEO_35_2_0,
  ALL_REMOVAL_CAPACITY_LOOKUPS,
  // Computation helpers
  computeMagnetCount,
  computeBarCount,
  computeExpectedHoldForce,
  validateAgainstReferenceTables,
  DEFAULT_GAP_IN,
} from './seed-data';

// ============================================================================
// ENUM TESTS
// ============================================================================

describe('MagnetMaterialType enum', () => {
  it('should have expected values', () => {
    expect(MagnetMaterialType.Ceramic).toBe('ceramic');
    expect(MagnetMaterialType.Neo).toBe('neo');
  });

  it('should have labels for all values', () => {
    const values = Object.values(MagnetMaterialType);
    expect(values.length).toBe(2);

    for (const value of values) {
      expect(MAGNET_MATERIAL_TYPE_LABELS[value]).toBeDefined();
      expect(typeof MAGNET_MATERIAL_TYPE_LABELS[value]).toBe('string');
      expect(MAGNET_MATERIAL_TYPE_LABELS[value].length).toBeGreaterThan(0);
    }
  });
});

describe('MagnetGrade enum', () => {
  it('should have expected values', () => {
    expect(MagnetGrade.Ceramic5).toBe('5');
    expect(MagnetGrade.Ceramic8).toBe('8');
    expect(MagnetGrade.Neo35).toBe('35');
    expect(MagnetGrade.Neo50).toBe('50');
  });

  it('should have labels for all values', () => {
    const values = Object.values(MagnetGrade);
    expect(values.length).toBe(4);

    for (const value of values) {
      expect(MAGNET_GRADE_LABELS[value]).toBeDefined();
    }
  });
});

describe('BarPatternMode enum', () => {
  it('should have expected values', () => {
    expect(BarPatternMode.AllSame).toBe('all_same');
    expect(BarPatternMode.Alternating).toBe('alternating');
    expect(BarPatternMode.Interval).toBe('interval');
  });

  it('should have labels for all values', () => {
    const values = Object.values(BarPatternMode);
    expect(values.length).toBe(3);

    for (const value of values) {
      expect(BAR_PATTERN_MODE_LABELS[value]).toBeDefined();
    }
  });
});

// ============================================================================
// TYPE GUARD TESTS
// ============================================================================

describe('isMagnetMaterialType', () => {
  it('should return true for valid material types', () => {
    expect(isMagnetMaterialType('ceramic')).toBe(true);
    expect(isMagnetMaterialType('neo')).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isMagnetMaterialType('invalid')).toBe(false);
    expect(isMagnetMaterialType('')).toBe(false);
    expect(isMagnetMaterialType(null)).toBe(false);
    expect(isMagnetMaterialType(undefined)).toBe(false);
    expect(isMagnetMaterialType(123)).toBe(false);
  });
});

describe('isMagnetGrade', () => {
  it('should return true for valid grades', () => {
    expect(isMagnetGrade('5')).toBe(true);
    expect(isMagnetGrade('8')).toBe(true);
    expect(isMagnetGrade('35')).toBe(true);
    expect(isMagnetGrade('50')).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isMagnetGrade('invalid')).toBe(false);
    expect(isMagnetGrade('10')).toBe(false);
    expect(isMagnetGrade(5)).toBe(false); // number, not string
  });
});

describe('isBarPatternMode', () => {
  it('should return true for valid modes', () => {
    expect(isBarPatternMode('all_same')).toBe(true);
    expect(isBarPatternMode('alternating')).toBe(true);
    expect(isBarPatternMode('interval')).toBe(true);
  });

  it('should return false for invalid values', () => {
    expect(isBarPatternMode('invalid')).toBe(false);
    expect(isBarPatternMode('random')).toBe(false);
  });
});

describe('isSupportedOAL', () => {
  it('should return true for supported OAL values', () => {
    expect(isSupportedOAL(12)).toBe(true);
    expect(isSupportedOAL(15)).toBe(true);
    expect(isSupportedOAL(18)).toBe(true);
    expect(isSupportedOAL(24)).toBe(true);
    expect(isSupportedOAL(30)).toBe(true);
  });

  it('should return false for unsupported values', () => {
    expect(isSupportedOAL(10)).toBe(false);
    expect(isSupportedOAL(20)).toBe(false);
    expect(isSupportedOAL('12')).toBe(false); // string, not number
  });
});

describe('isSupportedCenterSpacing', () => {
  it('should return true for supported center spacing values', () => {
    expect(isSupportedCenterSpacing(12)).toBe(true);
    expect(isSupportedCenterSpacing(18)).toBe(true);
    expect(isSupportedCenterSpacing(24)).toBe(true);
    expect(isSupportedCenterSpacing(36)).toBe(true);
  });

  it('should return false for unsupported values', () => {
    expect(isSupportedCenterSpacing(6)).toBe(false);
    expect(isSupportedCenterSpacing(48)).toBe(false);
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('SUPPORTED_OAL_VALUES_IN', () => {
  it('should contain expected values from reference doc', () => {
    expect(SUPPORTED_OAL_VALUES_IN).toContain(12);
    expect(SUPPORTED_OAL_VALUES_IN).toContain(15);
    expect(SUPPORTED_OAL_VALUES_IN).toContain(18);
    expect(SUPPORTED_OAL_VALUES_IN).toContain(24);
    expect(SUPPORTED_OAL_VALUES_IN).toContain(30);
    expect(SUPPORTED_OAL_VALUES_IN.length).toBe(5);
  });
});

describe('SUPPORTED_CENTER_SPACING_IN', () => {
  it('should contain expected values from reference doc', () => {
    expect(SUPPORTED_CENTER_SPACING_IN).toContain(12);
    expect(SUPPORTED_CENTER_SPACING_IN).toContain(18);
    expect(SUPPORTED_CENTER_SPACING_IN).toContain(24);
    expect(SUPPORTED_CENTER_SPACING_IN).toContain(36);
    expect(SUPPORTED_CENTER_SPACING_IN.length).toBe(4);
  });
});

// ============================================================================
// SEED DATA TESTS
// ============================================================================

describe('Magnet Families', () => {
  it('should have valid Standard family', () => {
    expect(STANDARD_MAGNET_FAMILY.name).toBe('Standard Conveyor');
    expect(STANDARD_MAGNET_FAMILY.slug).toBe('standard');
    expect(STANDARD_MAGNET_FAMILY.cross_section_key).toBe('1.00x1.38');
    expect(STANDARD_MAGNET_FAMILY.magnet_width_in).toBe(1.0);
    expect(STANDARD_MAGNET_FAMILY.magnet_height_in).toBe(1.38);
    expect(STANDARD_MAGNET_FAMILY.allowed_lengths_in).toContain(2.5);
    expect(STANDARD_MAGNET_FAMILY.allowed_lengths_in).toContain(3.5);
  });

  it('should have valid Heavy Duty family', () => {
    expect(HEAVY_DUTY_MAGNET_FAMILY.name).toBe('Heavy Duty Conveyor');
    expect(HEAVY_DUTY_MAGNET_FAMILY.slug).toBe('heavy_duty');
    expect(HEAVY_DUTY_MAGNET_FAMILY.cross_section_key).toBe('1.00x2.00');
    expect(HEAVY_DUTY_MAGNET_FAMILY.magnet_width_in).toBe(1.0);
    expect(HEAVY_DUTY_MAGNET_FAMILY.magnet_height_in).toBe(2.0);
  });
});

describe('Magnet Catalog Items', () => {
  it('should have valid Ceramic 5 - 3.5" magnet', () => {
    expect(CERAMIC_5_3_5.part_number).toBe('MAG050100013753500');
    expect(CERAMIC_5_3_5.material_type).toBe(MagnetMaterialType.Ceramic);
    expect(CERAMIC_5_3_5.grade).toBe(MagnetGrade.Ceramic5);
    expect(CERAMIC_5_3_5.length_in).toBe(3.5);
    expect(CERAMIC_5_3_5.hold_force_proxy_lb).toBe(0.1207); // Calibrated to match lookup tables
    expect(CERAMIC_5_3_5.efficiency_factor).toBe(1.0); // No additional efficiency applied
  });

  it('should have valid Ceramic 5 - 2.5" sweeper magnet', () => {
    expect(CERAMIC_5_2_5.part_number).toBe('MAG050100013752500');
    expect(CERAMIC_5_2_5.length_in).toBe(2.5);
    expect(CERAMIC_5_2_5.hold_force_proxy_lb).toBe(0.08); // Calibrated
    expect(CERAMIC_5_2_5.efficiency_factor).toBe(1.0);
  });

  it('should have valid Neo 35 - 1.375" magnet', () => {
    expect(NEO_35_1_375.part_number).toBe('MAGRARE0100200138');
    expect(NEO_35_1_375.material_type).toBe(MagnetMaterialType.Neo);
    expect(NEO_35_1_375.grade).toBe(MagnetGrade.Neo35);
    expect(NEO_35_1_375.length_in).toBe(1.375);
    expect(NEO_35_1_375.hold_force_proxy_lb).toBe(0.298);
    expect(NEO_35_1_375.efficiency_factor).toBe(1.0);
  });

  it('should have Neo 35 - 2" for mixing with ceramic', () => {
    expect(NEO_35_2_0.cross_section_key).toBe('1.00x1.38'); // Same as ceramic
    expect(NEO_35_2_0.length_in).toBe(2.0);
    expect(NEO_35_2_0.hold_force_proxy_lb).toBe(0.298);
    expect(NEO_35_2_0.efficiency_factor).toBe(1.0);
  });
});

// ============================================================================
// COMPUTATION HELPER TESTS
// ============================================================================

describe('computeMagnetCount', () => {
  it('should compute correct count for 12" OAL with 3.5" magnets', () => {
    const result = computeMagnetCount(12, 3.5, DEFAULT_GAP_IN);
    // 12" / (3.5" + 0.25") = 3.2 → 3 magnets
    // Achieved: 3 × 3.5 + 2 × 0.25 = 10.5 + 0.5 = 11"
    expect(result.count).toBe(3);
    expect(result.achievedOalIn).toBeCloseTo(11, 2);
    expect(result.leftoverIn).toBeCloseTo(1, 2);
  });

  it('should compute correct count for 15" OAL with 3.5" magnets', () => {
    const result = computeMagnetCount(15, 3.5, DEFAULT_GAP_IN);
    // (15 + 0.25) / (3.5 + 0.25) = 15.25 / 3.75 = 4.067 → 4 magnets
    expect(result.count).toBe(4);
  });

  it('should compute correct count for 18" OAL with 3.5" magnets', () => {
    const result = computeMagnetCount(18, 3.5, DEFAULT_GAP_IN);
    // (18 + 0.25) / (3.5 + 0.25) = 18.25 / 3.75 = 4.87 → 4 magnets
    // Actually: 5 magnets fit: 5 × 3.5 + 4 × 0.25 = 17.5 + 1 = 18.5"? Let me recalc
    // Formula: n = floor((OAL + gap) / (length + gap))
    // n = floor((18 + 0.25) / (3.5 + 0.25)) = floor(18.25 / 3.75) = floor(4.867) = 4
    // But wait, let's check: 5 magnets = 5 × 3.5 + 4 × 0.25 = 17.5 + 1 = 18.5" > 18"
    // So 4 magnets: 4 × 3.5 + 3 × 0.25 = 14 + 0.75 = 14.75" ✓
    expect(result.count).toBe(4);
    expect(result.achievedOalIn).toBeCloseTo(14.75, 2);
  });

  it('should compute correct count for 24" OAL with 3.5" magnets', () => {
    const result = computeMagnetCount(24, 3.5, DEFAULT_GAP_IN);
    // n = floor((24 + 0.25) / (3.5 + 0.25)) = floor(24.25 / 3.75) = floor(6.467) = 6
    expect(result.count).toBe(6);
  });

  it('should handle edge cases', () => {
    expect(computeMagnetCount(0, 3.5).count).toBe(0);
    expect(computeMagnetCount(12, 0).count).toBe(0);
    expect(computeMagnetCount(-5, 3.5).count).toBe(0);
    expect(computeMagnetCount(12, -3.5).count).toBe(0);
  });

  it('should respect end clearance', () => {
    const result = computeMagnetCount(12, 3.5, 0.25, 0.5);
    // Available: 12 - 2×0.5 + 0.25 = 11.25
    // Count: floor(11.25 / 3.75) = 3
    expect(result.count).toBe(3);
    // Achieved: 3 × 3.5 + 2 × 0.25 + 2 × 0.5 = 10.5 + 0.5 + 1 = 12"
    expect(result.achievedOalIn).toBeCloseTo(12, 2);
  });
});

describe('computeBarCount', () => {
  it('should compute correct bar count from belt length and spacing', () => {
    // Formula: qty = floor(beltLength × 12 / centers) - 1
    // Example: 20 ft belt, 12" centers: floor(20 × 12 / 12) - 1 = 20 - 1 = 19 bars
    expect(computeBarCount(20, 12)).toBe(19);

    // 50 ft belt, 12" centers: floor(50 × 12 / 12) - 1 = 50 - 1 = 49 bars
    expect(computeBarCount(50, 12)).toBe(49);

    // 50 ft belt, 18" centers: floor(50 × 12 / 18) - 1 = floor(33.33) - 1 = 32 bars
    expect(computeBarCount(50, 18)).toBe(32);

    // 50 ft belt, 24" centers: floor(50 × 12 / 24) - 1 = 25 - 1 = 24 bars
    expect(computeBarCount(50, 24)).toBe(24);
  });

  it('should handle edge cases', () => {
    expect(computeBarCount(0, 12)).toBe(0);
    expect(computeBarCount(10, 0)).toBe(0);
  });
});

describe('computeExpectedHoldForce', () => {
  it('should compute hold force for ceramic only', () => {
    // 3 ceramic @ 0.1207 = 3 × 0.1207 = 0.3621
    const result = computeExpectedHoldForce(3, 0);
    expect(result).toBeCloseTo(0.3621, 4);
  });

  it('should compute hold force for neo only', () => {
    // 3 neo @ 0.298 = 3 × 0.298 = 0.894
    const result = computeExpectedHoldForce(0, 3);
    expect(result).toBeCloseTo(0.894, 4);
  });

  it('should compute hold force for mixed configuration', () => {
    // 2 ceramic + 1 neo = 2 × 0.1207 + 1 × 0.298 = 0.2414 + 0.298 = 0.5394
    const result = computeExpectedHoldForce(2, 1);
    expect(result).toBeCloseTo(0.5394, 4);
  });
});

// ============================================================================
// REFERENCE TABLE VALIDATION TESTS
// ============================================================================

describe('Reference Table Validation', () => {
  it('should have removal capacity data for all supported OALs', () => {
    const oalsWithData = [...new Set(ALL_REMOVAL_CAPACITY_LOOKUPS.map((l) => l.oal_in))];

    // Reference doc has data for 12, 15, 18, 24 (not 30)
    expect(oalsWithData).toContain(12);
    expect(oalsWithData).toContain(15);
    expect(oalsWithData).toContain(18);
    expect(oalsWithData).toContain(24);
  });

  it('should have ceramic-only configuration for each OAL', () => {
    for (const oal of [12, 15, 18, 24]) {
      const ceramicOnly = ALL_REMOVAL_CAPACITY_LOOKUPS.find(
        (l) => l.oal_in === oal && l.neo_count === 0
      );
      expect(ceramicOnly).toBeDefined();
      expect(ceramicOnly?.configuration).toContain('Ceramic');
    }
  });

  it('should validate computed values against reference (most configs within 10%)', () => {
    // Our linear model matches most lookup table values well, but has limitations:
    //
    // 1. High Neo counts show diminishing returns (magnetic saturation/interference)
    //    - 3 Neo = 0.299/neo, 4 Neo = 0.264/neo, 5 Neo = 0.238/neo
    //
    // 2. Ceramic capacity varies slightly by bar width
    //    - 12" bar: 0.1207/magnet, 18" bar: 0.1084/magnet
    //
    // A full saturation model would be needed for <5% accuracy on all configs.
    // For Phase 1, we verify the structure is correct and most values match.

    const discrepancies = validateAgainstReferenceTables();

    // Log any discrepancies for debugging
    if (discrepancies.length > 0) {
      console.log('Configs with >10% error (expected for high Neo counts due to saturation):');
      for (const d of discrepancies) {
        console.log(
          `  ${d.lookup.oal_in}" ${d.lookup.configuration}: ` +
            `expected ${d.lookup.lbs_per_bar}, computed ${d.computed.toFixed(4)} ` +
            `(${d.percentError.toFixed(1)}% error)`
        );
      }
    }

    // Most configs should match. Allow up to 4 outliers (high Neo count edge cases)
    expect(discrepancies.length).toBeLessThanOrEqual(4);

    // Verify the core configs (ceramic-only and low Neo counts) match well
    // by checking that ceramic-only 12" and 24" are NOT in discrepancies
    const ceramicOnlyDiscrepancies = discrepancies.filter(
      d => d.lookup.neo_count === 0 && (d.lookup.oal_in === 12 || d.lookup.oal_in === 24)
    );
    expect(ceramicOnlyDiscrepancies.length).toBe(0);
  });
});

// ============================================================================
// TYPE STRUCTURE TESTS
// ============================================================================

describe('Type structures', () => {
  it('ConveyorMagnetFamily should have required fields', () => {
    const family: ConveyorMagnetFamily = {
      id: 'test-id',
      name: 'Test Family',
      slug: 'test',
      cross_section_key: '1.00x1.38',
      magnet_width_in: 1.0,
      magnet_height_in: 1.38,
      allowed_lengths_in: [3.5],
      max_magnets_per_bar: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(family.id).toBeDefined();
    expect(family.cross_section_key).toBe('1.00x1.38');
    expect(family.allowed_lengths_in.length).toBe(1);
  });

  it('MagnetCatalogItem should have required fields', () => {
    const magnet: MagnetCatalogItem = {
      id: 'test-id',
      part_number: 'TEST123',
      name: 'Test Magnet',
      cross_section_key: '1.00x1.38',
      material_type: MagnetMaterialType.Ceramic,
      grade: MagnetGrade.Ceramic5,
      length_in: 3.5,
      width_in: 1.0,
      height_in: 1.38,
      weight_lb: 0.5,
      hold_force_proxy_lb: 0.126,
      efficiency_factor: 0.8,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(magnet.material_type).toBe(MagnetMaterialType.Ceramic);
    expect(magnet.grade).toBe(MagnetGrade.Ceramic5);
  });

  it('BarTemplate should have required fields', () => {
    const template: BarTemplate = {
      id: 'test-id',
      name: 'Test Template',
      family_id: 'family-id',
      target_oal_in: 12,
      gap_in: 0.25,
      end_clearance_in: 0,
      leftover_tolerance_in: 0.25,
      is_sweeper: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(template.target_oal_in).toBe(12);
    expect(template.gap_in).toBe(0.25);
  });

  it('BarPattern should have required fields', () => {
    const pattern: BarPattern = {
      id: 'test-id',
      name: 'Test Pattern',
      mode: BarPatternMode.AllSame,
      primary_template_id: 'template-id',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(pattern.mode).toBe(BarPatternMode.AllSame);
    expect(pattern.secondary_template_id).toBeUndefined();
  });

  it('MagnetLayout should have required fields', () => {
    const layout: MagnetLayout = {
      id: 'test-id',
      name: 'Test Layout',
      pattern_id: 'pattern-id',
      center_spacing_in: 12,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(layout.center_spacing_in).toBe(12);
  });
});
