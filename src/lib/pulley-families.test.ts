/**
 * Pulley Families & Variants Tests (v1.24)
 *
 * Tests for pulley family/variant types, finished_od calculation, and validation.
 */

import {
  PulleyFamily,
  PulleyVariant,
  getShellOdIn,
  getFinishedOdIn,
  getVariantDisplayLabel,
  getVariantShortLabel,
  validatePulleyFamily,
  validatePulleyVariant,
  setCachedPulleyFamilies,
  setCachedPulleyVariants,
  clearPulleyFamiliesCache,
  getFamilyByKey,
  getVariantByKey,
  getFinishedOdByVariantKey,
  getShellOdByVariantKey,
} from './pulley-families';

// =============================================================================
// TEST DATA - Mirrors seed data from PCI spec
// =============================================================================

const FAMILY_8IN: PulleyFamily = {
  pulley_family_key: 'PCI_FC_8IN_48_5_K17',
  manufacturer: 'PCI',
  style: 'Flat Face',
  material: 'Mild steel',
  shell_od_in: 8.0,
  face_width_in: 48.5,
  shell_wall_in: 0.134,
  is_crowned: false,
  crown_type: null,
  v_groove_section: 'K17',
  v_groove_top_width_in: 0.919,
  v_groove_bottom_width_in: 0.595,
  v_groove_depth_in: 0.496,
  version: 1,
  source: 'PCL-Q143384',
  notes: 'Test family',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const FAMILY_4IN: PulleyFamily = {
  pulley_family_key: 'PCI_FC_4IN_42_5_K10',
  manufacturer: 'PCI',
  style: 'Flat Face',
  material: 'Mild steel',
  shell_od_in: 4.0,
  face_width_in: 42.5,
  shell_wall_in: 0.12,
  is_crowned: false,
  crown_type: null,
  v_groove_section: 'K10',
  v_groove_top_width_in: 0.65,
  v_groove_bottom_width_in: 0.447,
  v_groove_depth_in: 0.312,
  version: 1,
  source: 'PCL-Q173498',
  notes: 'Test family',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const VARIANT_8IN_LAGGED: PulleyVariant = {
  pulley_variant_key: 'PCI_FC_8IN_48_5_K17_LAGGED_BUSHED',
  pulley_family_key: 'PCI_FC_8IN_48_5_K17',
  bore_in: 1.938,
  hub_style: 'XTH25 integral hubs + XTB25 bushing',
  bearing_type: 'bushing',
  lagging_type: 'SBR',
  lagging_thickness_in: 0.25,
  lagging_durometer_shore_a: 60,
  finished_od_in: 8.5, // Lagged variant has explicit finished_od_in
  runout_max_in: 0.03,
  paint_spec: 'Paint ends only',
  version: 1,
  source: 'PCL-Q143384 item 1',
  notes: 'Quoted part F08ZX48HFZZZXX257ZC.',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const VARIANT_8IN_BEARING: PulleyVariant = {
  pulley_variant_key: 'PCI_FC_8IN_48_5_K17_BEARING',
  pulley_family_key: 'PCI_FC_8IN_48_5_K17',
  bore_in: 1.938,
  hub_style: 'Bearing hub',
  bearing_type: 'Timken',
  lagging_type: 'none',
  lagging_thickness_in: null,
  lagging_durometer_shore_a: null,
  finished_od_in: null, // Unlagged variant uses family shell_od_in
  runout_max_in: 0.06,
  paint_spec: 'SW Enamel RAL7024',
  version: 1,
  source: 'PCL-Q143384 item 2',
  notes: 'Quoted part F08ZX48HF031T3007ZZ.',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const VARIANT_4IN_LAGGED: PulleyVariant = {
  pulley_variant_key: 'PCI_FC_4IN_42_5_K10_LAGGED_BUSHED',
  pulley_family_key: 'PCI_FC_4IN_42_5_K10',
  bore_in: 1.25,
  hub_style: 'XTH15 integral hubs + XTB15 bushing',
  bearing_type: 'bushing',
  lagging_type: 'SBR',
  lagging_thickness_in: 0.25,
  lagging_durometer_shore_a: 60,
  finished_od_in: 4.5, // Lagged variant has explicit finished_od_in
  runout_max_in: 0.03,
  paint_spec: 'Paint ends only',
  version: 1,
  source: 'PCL-Q173498 item 1',
  notes: 'Quoted part F04ZW42HFZZZX015KZC.',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const VARIANT_4IN_BEARING: PulleyVariant = {
  pulley_variant_key: 'PCI_FC_4IN_42_5_K10_BEARING',
  pulley_family_key: 'PCI_FC_4IN_42_5_K10',
  bore_in: 1.25,
  hub_style: 'Bearing slug',
  bearing_type: 'ER style',
  lagging_type: 'none',
  lagging_thickness_in: null,
  lagging_durometer_shore_a: null,
  finished_od_in: null, // Unlagged variant uses family shell_od_in
  runout_max_in: 0.03,
  paint_spec: 'SW Enamel RAL7024',
  version: 1,
  source: 'PCL-Q173498 item 2',
  notes: 'Quoted part F04ZW42HF020T300KZZ.',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

beforeEach(() => {
  // Populate cache with test data
  setCachedPulleyFamilies([FAMILY_8IN, FAMILY_4IN]);
  setCachedPulleyVariants([
    VARIANT_8IN_LAGGED,
    VARIANT_8IN_BEARING,
    VARIANT_4IN_LAGGED,
    VARIANT_4IN_BEARING,
  ]);
});

afterEach(() => {
  clearPulleyFamiliesCache();
});

// =============================================================================
// getShellOdIn TESTS
// =============================================================================

describe('getShellOdIn', () => {
  test('returns family shell_od_in', () => {
    expect(getShellOdIn(FAMILY_8IN)).toBe(8.0);
    expect(getShellOdIn(FAMILY_4IN)).toBe(4.0);
  });
});

// =============================================================================
// getFinishedOdIn TESTS - CRITICAL BEHAVIOR
// =============================================================================

describe('getFinishedOdIn', () => {
  test('returns variant finished_od_in for lagged variant', () => {
    // Lagged variants have explicit finished_od_in
    expect(getFinishedOdIn(VARIANT_8IN_LAGGED, FAMILY_8IN)).toBe(8.5);
    expect(getFinishedOdIn(VARIANT_4IN_LAGGED, FAMILY_4IN)).toBe(4.5);
  });

  test('falls back to family shell_od_in for unlagged variant', () => {
    // Unlagged variants have finished_od_in = null, use family shell_od_in
    expect(getFinishedOdIn(VARIANT_8IN_BEARING, FAMILY_8IN)).toBe(8.0);
    expect(getFinishedOdIn(VARIANT_4IN_BEARING, FAMILY_4IN)).toBe(4.0);
  });
});

// =============================================================================
// CACHE LOOKUP TESTS
// =============================================================================

describe('cache lookups', () => {
  test('getFamilyByKey returns correct family', () => {
    const family = getFamilyByKey('PCI_FC_8IN_48_5_K17');
    expect(family).toEqual(FAMILY_8IN);
  });

  test('getVariantByKey returns correct variant', () => {
    const variant = getVariantByKey('PCI_FC_8IN_48_5_K17_LAGGED_BUSHED');
    expect(variant).toEqual(VARIANT_8IN_LAGGED);
  });

  test('getFinishedOdByVariantKey returns finished_od for lagged variant', () => {
    expect(getFinishedOdByVariantKey('PCI_FC_8IN_48_5_K17_LAGGED_BUSHED')).toBe(8.5);
    expect(getFinishedOdByVariantKey('PCI_FC_4IN_42_5_K10_LAGGED_BUSHED')).toBe(4.5);
  });

  test('getFinishedOdByVariantKey falls back to shell_od for unlagged variant', () => {
    expect(getFinishedOdByVariantKey('PCI_FC_8IN_48_5_K17_BEARING')).toBe(8.0);
    expect(getFinishedOdByVariantKey('PCI_FC_4IN_42_5_K10_BEARING')).toBe(4.0);
  });

  test('getShellOdByVariantKey returns family shell_od', () => {
    expect(getShellOdByVariantKey('PCI_FC_8IN_48_5_K17_LAGGED_BUSHED')).toBe(8.0);
    expect(getShellOdByVariantKey('PCI_FC_4IN_42_5_K10_BEARING')).toBe(4.0);
  });

  test('returns undefined for unknown keys', () => {
    expect(getFamilyByKey('UNKNOWN_KEY')).toBeUndefined();
    expect(getVariantByKey('UNKNOWN_KEY')).toBeUndefined();
    expect(getFinishedOdByVariantKey('UNKNOWN_KEY')).toBeUndefined();
    expect(getShellOdByVariantKey('UNKNOWN_KEY')).toBeUndefined();
  });
});

// =============================================================================
// DISPLAY LABEL TESTS
// =============================================================================

describe('display labels', () => {
  test('getVariantDisplayLabel for lagged variant', () => {
    const label = getVariantDisplayLabel(VARIANT_8IN_LAGGED, FAMILY_8IN);
    expect(label).toContain('8.5"');
    expect(label).toContain('SBR lagging');
    expect(label).toContain('bushing');
  });

  test('getVariantDisplayLabel for unlagged variant', () => {
    const label = getVariantDisplayLabel(VARIANT_8IN_BEARING, FAMILY_8IN);
    expect(label).toContain('8"');
    expect(label).not.toContain('lagging');
    expect(label).toContain('Timken');
  });

  test('getVariantShortLabel for lagged variant', () => {
    const label = getVariantShortLabel(VARIANT_8IN_LAGGED, FAMILY_8IN);
    expect(label).toContain('8.5"');
    expect(label).toContain('Lagged');
  });

  test('getVariantShortLabel for unlagged variant', () => {
    const label = getVariantShortLabel(VARIANT_8IN_BEARING, FAMILY_8IN);
    expect(label).toContain('8"');
    expect(label).not.toContain('Lagged');
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('validatePulleyFamily', () => {
  test('valid family passes', () => {
    const result = validatePulleyFamily(FAMILY_8IN);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing family_key fails', () => {
    const result = validatePulleyFamily({ ...FAMILY_8IN, pulley_family_key: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Family key is required');
  });

  test('zero shell_od_in fails', () => {
    const result = validatePulleyFamily({ ...FAMILY_8IN, shell_od_in: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Shell OD must be positive');
  });

  test('negative shell_wall_in fails', () => {
    const result = validatePulleyFamily({ ...FAMILY_8IN, shell_wall_in: -0.1 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Shell wall thickness cannot be negative');
  });
});

describe('validatePulleyVariant', () => {
  test('valid variant passes', () => {
    const result = validatePulleyVariant(VARIANT_8IN_LAGGED);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('missing variant_key fails', () => {
    const result = validatePulleyVariant({ ...VARIANT_8IN_LAGGED, pulley_variant_key: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Variant key is required');
  });

  test('missing family_key fails', () => {
    const result = validatePulleyVariant({ ...VARIANT_8IN_LAGGED, pulley_family_key: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Family key is required');
  });

  test('invalid durometer fails', () => {
    const result = validatePulleyVariant({ ...VARIANT_8IN_LAGGED, lagging_durometer_shore_a: 150 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Durometer must be between 0 and 100');
  });
});

// =============================================================================
// FIXTURE ASSERTIONS - SPEC REQUIREMENT
// =============================================================================

describe('spec fixture assertions', () => {
  test('FIXTURE 1: 8" lagged variant finished_od equals seeded 8.5"', () => {
    const finishedOd = getFinishedOdByVariantKey('PCI_FC_8IN_48_5_K17_LAGGED_BUSHED');
    expect(finishedOd).toBe(8.5);
  });

  test('FIXTURE 2: 8" unlagged variant finished_od falls back to shell 8.0"', () => {
    const finishedOd = getFinishedOdByVariantKey('PCI_FC_8IN_48_5_K17_BEARING');
    expect(finishedOd).toBe(8.0);
  });

  test('FIXTURE 3: 4" lagged variant finished_od equals seeded 4.5"', () => {
    const finishedOd = getFinishedOdByVariantKey('PCI_FC_4IN_42_5_K10_LAGGED_BUSHED');
    expect(finishedOd).toBe(4.5);
  });

  test('FIXTURE 4: 4" unlagged variant finished_od falls back to shell 4.0"', () => {
    const finishedOd = getFinishedOdByVariantKey('PCI_FC_4IN_42_5_K10_BEARING');
    expect(finishedOd).toBe(4.0);
  });
});
