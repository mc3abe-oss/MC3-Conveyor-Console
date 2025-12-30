/**
 * Cleat Catalog Tests (v1.23)
 *
 * Tests for cleat catalog lookup, centers factor calculation, and UI helpers.
 */

import {
  CleatCatalogItem,
  CleatCenterFactor,
  CleatPattern,
  CleatStyle,
  lookupCleatBaseMinDia12,
  getCentersFactor,
  computeCleatsMinPulleyDia,
  lookupCleatsMinPulleyDia,
  getUniqueCleatProfiles,
  getCleatSizesForProfile,
  getCleatPatternsForProfileSize,
  isDrillSipedSupported,
  CLEAT_CENTERS_OPTIONS,
  DEFAULT_CLEAT_MATERIAL_FAMILY,
} from './cleat-catalog';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createCatalogItem = (
  profile: string,
  size: string,
  pattern: CleatPattern,
  minSolid: number,
  minDrillSiped: number | null = null,
  isActive = true
): CleatCatalogItem => ({
  id: `test-${profile}-${size}-${pattern}`,
  material_family: 'PVC_HOT_WELDED',
  cleat_profile: profile,
  cleat_size: size,
  cleat_pattern: pattern,
  min_pulley_dia_12in_solid_in: minSolid,
  min_pulley_dia_12in_drill_siped_in: minDrillSiped,
  notes: null,
  source_doc: 'Test Spec',
  sort_order: 1,
  is_active: isActive,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const testCatalog: CleatCatalogItem[] = [
  createCatalogItem('T-Cleat', '1"', 'STRAIGHT_CROSS', 6, 8),
  createCatalogItem('T-Cleat', '1"', 'CURVED_90', 8, 10),
  createCatalogItem('T-Cleat', '1.5"', 'STRAIGHT_CROSS', 8, 10),
  createCatalogItem('T-Cleat', '1.5"', 'CURVED_90', 10, null), // No drill & siped
  createCatalogItem('Chevron', '0.75"', 'CURVED_120', 5, 6),
  createCatalogItem('Inactive', '1"', 'STRAIGHT_CROSS', 6, 8, false), // Inactive
];

const testCenterFactors: CleatCenterFactor[] = [
  { id: 'cf-12', material_family: 'PVC_HOT_WELDED', centers_in: 12, factor: 1.0, notes: null, is_active: true },
  { id: 'cf-8', material_family: 'PVC_HOT_WELDED', centers_in: 8, factor: 1.15, notes: null, is_active: true },
  { id: 'cf-6', material_family: 'PVC_HOT_WELDED', centers_in: 6, factor: 1.25, notes: null, is_active: true },
  { id: 'cf-4', material_family: 'PVC_HOT_WELDED', centers_in: 4, factor: 1.35, notes: null, is_active: true },
  { id: 'cf-inactive', material_family: 'PVC_HOT_WELDED', centers_in: 3, factor: 1.5, notes: null, is_active: false },
];

// =============================================================================
// lookupCleatBaseMinDia12 Tests
// =============================================================================

describe('lookupCleatBaseMinDia12', () => {
  it('should return base min diameter for solid style', () => {
    const result = lookupCleatBaseMinDia12(
      testCatalog,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID'
    );

    expect(result.success).toBe(true);
    expect(result.baseMinDia12In).toBe(6);
    expect(result.ruleSource).toContain('T-Cleat 1" STRAIGHT_CROSS');
  });

  it('should return base min diameter for drill & siped style', () => {
    const result = lookupCleatBaseMinDia12(
      testCatalog,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS',
      'DRILL_SIPED_1IN'
    );

    expect(result.success).toBe(true);
    expect(result.baseMinDia12In).toBe(8);
    expect(result.ruleSource).toContain('T-Cleat 1" STRAIGHT_CROSS');
  });

  it('should fail when drill & siped is not supported', () => {
    const result = lookupCleatBaseMinDia12(
      testCatalog,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1.5"',
      'CURVED_90',
      'DRILL_SIPED_1IN'
    );

    expect(result.success).toBe(false);
    expect(result.baseMinDia12In).toBeNull();
    expect(result.error).toContain('Drill & Siped style not supported');
  });

  it('should fail when catalog entry not found', () => {
    const result = lookupCleatBaseMinDia12(
      testCatalog,
      'PVC_HOT_WELDED',
      'NonExistent',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID'
    );

    expect(result.success).toBe(false);
    expect(result.baseMinDia12In).toBeNull();
    expect(result.error).toContain('not found');
  });

  it('should ignore inactive catalog entries', () => {
    const result = lookupCleatBaseMinDia12(
      testCatalog,
      'PVC_HOT_WELDED',
      'Inactive',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID'
    );

    expect(result.success).toBe(false);
    expect(result.baseMinDia12In).toBeNull();
  });

  it('should fail for wrong material family', () => {
    const result = lookupCleatBaseMinDia12(
      testCatalog,
      'WRONG_FAMILY',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID'
    );

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// getCentersFactor Tests
// =============================================================================

describe('getCentersFactor', () => {
  it('should return 1.0 for 12" centers', () => {
    const result = getCentersFactor(testCenterFactors, 'PVC_HOT_WELDED', 12);

    expect(result.success).toBe(true);
    expect(result.factor).toBe(1.0);
  });

  it('should return 1.15 for 8" centers', () => {
    const result = getCentersFactor(testCenterFactors, 'PVC_HOT_WELDED', 8);

    expect(result.success).toBe(true);
    expect(result.factor).toBe(1.15);
  });

  it('should return 1.25 for 6" centers', () => {
    const result = getCentersFactor(testCenterFactors, 'PVC_HOT_WELDED', 6);

    expect(result.success).toBe(true);
    expect(result.factor).toBe(1.25);
  });

  it('should return 1.35 for 4" centers', () => {
    const result = getCentersFactor(testCenterFactors, 'PVC_HOT_WELDED', 4);

    expect(result.success).toBe(true);
    expect(result.factor).toBe(1.35);
  });

  it('should fail for unknown centers value', () => {
    const result = getCentersFactor(testCenterFactors, 'PVC_HOT_WELDED', 10);

    expect(result.success).toBe(false);
    expect(result.factor).toBe(1.0); // Default fallback
    expect(result.error).toContain('not found');
  });

  it('should ignore inactive center factors', () => {
    const result = getCentersFactor(testCenterFactors, 'PVC_HOT_WELDED', 3);

    expect(result.success).toBe(false); // 3" is inactive
  });
});

// =============================================================================
// computeCleatsMinPulleyDia Tests
// =============================================================================

describe('computeCleatsMinPulleyDia', () => {
  it('should compute correct value for 12" centers (factor 1.0)', () => {
    const result = computeCleatsMinPulleyDia(6, 1.0);

    expect(result.adjusted).toBe(6);
    expect(result.roundedUp).toBe(6);
  });

  it('should compute correct value for 4" centers (factor 1.35)', () => {
    const result = computeCleatsMinPulleyDia(6, 1.35);

    expect(result.adjusted).toBeCloseTo(8.1, 2);
    expect(result.roundedUp).toBe(8.5); // Rounded up to nearest 0.5
  });

  it('should round up correctly for 6" centers (factor 1.25)', () => {
    const result = computeCleatsMinPulleyDia(6, 1.25);

    expect(result.adjusted).toBe(7.5);
    expect(result.roundedUp).toBe(7.5); // Already on 0.5 boundary
  });

  it('should use custom rounding increment', () => {
    const result = computeCleatsMinPulleyDia(6, 1.35, 0.25);

    expect(result.roundedUp).toBe(8.25); // Rounded up to nearest 0.25
  });
});

// =============================================================================
// lookupCleatsMinPulleyDia (Full Integration) Tests
// =============================================================================

describe('lookupCleatsMinPulleyDia', () => {
  it('should compute full result for solid at 12" centers', () => {
    const result = lookupCleatsMinPulleyDia(
      testCatalog,
      testCenterFactors,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID',
      12
    );

    expect(result.success).toBe(true);
    expect(result.baseMinDia12In).toBe(6);
    expect(result.centersFactor).toBe(1.0);
    expect(result.roundedMinDia).toBe(6);
    expect(result.drillSipedCaution).toBe(false);
  });

  it('should compute full result for solid at 4" centers', () => {
    const result = lookupCleatsMinPulleyDia(
      testCatalog,
      testCenterFactors,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID',
      4
    );

    expect(result.success).toBe(true);
    expect(result.baseMinDia12In).toBe(6);
    expect(result.centersFactor).toBe(1.35);
    expect(result.roundedMinDia).toBe(8.5); // 6 * 1.35 = 8.1 → 8.5
    expect(result.drillSipedCaution).toBe(false);
  });

  it('should compute full result for drill & siped with caution', () => {
    const result = lookupCleatsMinPulleyDia(
      testCatalog,
      testCenterFactors,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS',
      'DRILL_SIPED_1IN',
      12
    );

    expect(result.success).toBe(true);
    expect(result.baseMinDia12In).toBe(8);
    expect(result.roundedMinDia).toBe(8);
    expect(result.drillSipedCaution).toBe(true);
  });

  it('should fail when catalog entry not found', () => {
    const result = lookupCleatsMinPulleyDia(
      testCatalog,
      testCenterFactors,
      'PVC_HOT_WELDED',
      'NonExistent',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID',
      12
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should fail when drill & siped not supported', () => {
    const result = lookupCleatsMinPulleyDia(
      testCatalog,
      testCenterFactors,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1.5"',
      'CURVED_90',
      'DRILL_SIPED_1IN',
      12
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Drill & Siped style not supported');
    expect(result.drillSipedCaution).toBe(true); // Still set
  });

  it('should include rule source in result', () => {
    const result = lookupCleatsMinPulleyDia(
      testCatalog,
      testCenterFactors,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS',
      'SOLID',
      8
    );

    expect(result.ruleSource).toContain('T-Cleat 1" STRAIGHT_CROSS');
    expect(result.ruleSource).toContain('8" centers');
  });
});

// =============================================================================
// UI Helper Functions Tests
// =============================================================================

describe('getUniqueCleatProfiles', () => {
  it('should return unique active profiles', () => {
    const profiles = getUniqueCleatProfiles(testCatalog);

    expect(profiles).toContain('T-Cleat');
    expect(profiles).toContain('Chevron');
    expect(profiles).not.toContain('Inactive');
    expect(profiles.length).toBe(2);
  });

  it('should return sorted profiles', () => {
    const profiles = getUniqueCleatProfiles(testCatalog);

    expect(profiles).toEqual(['Chevron', 'T-Cleat']);
  });

  it('should return empty array for empty catalog', () => {
    const profiles = getUniqueCleatProfiles([]);

    expect(profiles).toEqual([]);
  });
});

describe('getCleatSizesForProfile', () => {
  it('should return sizes for given profile', () => {
    const sizes = getCleatSizesForProfile(testCatalog, 'T-Cleat');

    expect(sizes).toContain('1"');
    expect(sizes).toContain('1.5"');
    expect(sizes.length).toBe(2);
  });

  it('should return numerically sorted sizes', () => {
    const sizes = getCleatSizesForProfile(testCatalog, 'T-Cleat');

    expect(sizes).toEqual(['1"', '1.5"']);
  });

  it('should return empty array for unknown profile', () => {
    const sizes = getCleatSizesForProfile(testCatalog, 'Unknown');

    expect(sizes).toEqual([]);
  });
});

describe('getCleatPatternsForProfileSize', () => {
  it('should return patterns for given profile and size', () => {
    const patterns = getCleatPatternsForProfileSize(testCatalog, 'T-Cleat', '1"');

    expect(patterns).toContain('STRAIGHT_CROSS');
    expect(patterns).toContain('CURVED_90');
    expect(patterns.length).toBe(2);
  });

  it('should return patterns in standard order', () => {
    const patterns = getCleatPatternsForProfileSize(testCatalog, 'T-Cleat', '1"');

    // STRAIGHT_CROSS should come before CURVED_90 in standard order
    expect(patterns.indexOf('STRAIGHT_CROSS')).toBeLessThan(patterns.indexOf('CURVED_90'));
  });

  it('should return empty array for unknown combination', () => {
    const patterns = getCleatPatternsForProfileSize(testCatalog, 'T-Cleat', '2"');

    expect(patterns).toEqual([]);
  });
});

describe('isDrillSipedSupported', () => {
  it('should return true when drill & siped is available', () => {
    const supported = isDrillSipedSupported(
      testCatalog,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1"',
      'STRAIGHT_CROSS'
    );

    expect(supported).toBe(true);
  });

  it('should return false when drill & siped is null', () => {
    const supported = isDrillSipedSupported(
      testCatalog,
      'PVC_HOT_WELDED',
      'T-Cleat',
      '1.5"',
      'CURVED_90'
    );

    expect(supported).toBe(false);
  });

  it('should return false for unknown entry', () => {
    const supported = isDrillSipedSupported(
      testCatalog,
      'PVC_HOT_WELDED',
      'Unknown',
      '1"',
      'STRAIGHT_CROSS'
    );

    expect(supported).toBe(false);
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Constants', () => {
  it('should have correct CLEAT_CENTERS_OPTIONS', () => {
    expect(CLEAT_CENTERS_OPTIONS).toEqual([12, 8, 6, 4]);
  });

  it('should have correct DEFAULT_CLEAT_MATERIAL_FAMILY', () => {
    expect(DEFAULT_CLEAT_MATERIAL_FAMILY).toBe('PVC_HOT_WELDED');
  });
});
