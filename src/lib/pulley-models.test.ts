/**
 * Tests for pulley models utilities
 */

import {
  PulleyModel,
  getEligibleModels,
  getModelsForBeltWidth,
  validateFaceWidth,
  getDefaultFaceWidth,
  computeFinishedOd,
  validateWallThickness,
  getWallOptions,
  formatWallThickness,
} from './pulley-models';

// Mock models for testing
const mockModels: PulleyModel[] = [
  {
    model_key: 'PCI_DRUM_4IN',
    display_name: 'PCI Drum – 4"',
    description: null,
    style_key: 'DRUM_STEEL_STANDARD',
    shell_od_in: 4.0,
    default_shell_wall_in: 0.134,
    allowed_wall_steps_in: [0.109, 0.134, 0.165],
    face_width_min_in: 6.0,
    face_width_max_in: 36.0,
    face_width_allowance_in: 2.0,
    eligible_drive: true,
    eligible_tail: true,
    eligible_dirty_side: false,
    eligible_crown: true,
    eligible_v_guided: true,
    eligible_lagging: true,
    tube_stress_limit_flat_psi: 10000,
    tube_stress_limit_vgroove_psi: 3400,
    is_active: true,
  },
  {
    model_key: 'PCI_DRUM_6IN',
    display_name: 'PCI Drum – 6"',
    description: null,
    style_key: 'DRUM_STEEL_STANDARD',
    shell_od_in: 6.0,
    default_shell_wall_in: 0.134,
    allowed_wall_steps_in: [0.109, 0.134, 0.188, 0.250],
    face_width_min_in: 6.0,
    face_width_max_in: 54.0,
    face_width_allowance_in: 2.0,
    eligible_drive: true,
    eligible_tail: true,
    eligible_dirty_side: false,
    eligible_crown: true,
    eligible_v_guided: true,
    eligible_lagging: true,
    tube_stress_limit_flat_psi: 10000,
    tube_stress_limit_vgroove_psi: 3400,
    is_active: true,
  },
  {
    model_key: 'PCI_WING_6IN',
    display_name: 'PCI Wing – 6"',
    description: null,
    style_key: 'WING_STEEL_STANDARD',
    shell_od_in: 6.0,
    default_shell_wall_in: 0.188,
    allowed_wall_steps_in: [0.134, 0.188, 0.250],
    face_width_min_in: 12.0,
    face_width_max_in: 48.0,
    face_width_allowance_in: 4.0,
    eligible_drive: false, // Wing not eligible for drive
    eligible_tail: true,
    eligible_dirty_side: true,
    eligible_crown: false, // Wing not eligible for crown
    eligible_v_guided: false, // Wing not eligible for V-guided
    eligible_lagging: false,
    tube_stress_limit_flat_psi: 8000,
    tube_stress_limit_vgroove_psi: null,
    is_active: true,
  },
  {
    model_key: 'INACTIVE_MODEL',
    display_name: 'Inactive',
    description: null,
    style_key: 'DRUM_STEEL_STANDARD',
    shell_od_in: 4.0,
    default_shell_wall_in: 0.134,
    allowed_wall_steps_in: [0.134],
    face_width_min_in: 6.0,
    face_width_max_in: 24.0,
    face_width_allowance_in: 2.0,
    eligible_drive: true,
    eligible_tail: true,
    eligible_dirty_side: false,
    eligible_crown: true,
    eligible_v_guided: true,
    eligible_lagging: true,
    tube_stress_limit_flat_psi: 10000,
    tube_stress_limit_vgroove_psi: 3400,
    is_active: false, // Inactive
  },
];

describe('getEligibleModels', () => {
  it('filters by DRIVE position', () => {
    const result = getEligibleModels(mockModels, 'DRIVE', 'FLAT');
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_4IN');
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_6IN');
    expect(result.map((m) => m.model_key)).not.toContain('PCI_WING_6IN'); // Wing not drive-eligible
  });

  it('filters by TAIL position', () => {
    const result = getEligibleModels(mockModels, 'TAIL', 'FLAT');
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_4IN');
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_6IN');
    expect(result.map((m) => m.model_key)).toContain('PCI_WING_6IN');
  });

  it('filters by CROWNED tracking', () => {
    const result = getEligibleModels(mockModels, 'TAIL', 'CROWNED');
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_4IN');
    expect(result.map((m) => m.model_key)).not.toContain('PCI_WING_6IN'); // Wing not crown-eligible
  });

  it('filters by V_GUIDED tracking', () => {
    const result = getEligibleModels(mockModels, 'TAIL', 'V_GUIDED');
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_4IN');
    expect(result.map((m) => m.model_key)).not.toContain('PCI_WING_6IN'); // Wing not V-guided eligible
  });

  it('excludes inactive models', () => {
    const result = getEligibleModels(mockModels, 'DRIVE', 'FLAT');
    expect(result.map((m) => m.model_key)).not.toContain('INACTIVE_MODEL');
  });
});

describe('getModelsForBeltWidth', () => {
  it('returns models that can accommodate belt width', () => {
    const result = getModelsForBeltWidth(mockModels, 24);
    // 24" belt + 2" allowance = 26" face width needed
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_4IN'); // max 36"
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_6IN'); // max 54"
    expect(result.map((m) => m.model_key)).toContain('PCI_WING_6IN'); // max 48" (needs 28" with 4" allowance)
  });

  it('excludes models where belt exceeds max face width', () => {
    const result = getModelsForBeltWidth(mockModels, 48);
    // 48" belt + 2" allowance = 50" face width needed
    expect(result.map((m) => m.model_key)).not.toContain('PCI_DRUM_4IN'); // max 36"
    expect(result.map((m) => m.model_key)).toContain('PCI_DRUM_6IN'); // max 54"
    // Wing needs 48 + 4 = 52", max 48", so excluded
    expect(result.map((m) => m.model_key)).not.toContain('PCI_WING_6IN');
  });
});

describe('validateFaceWidth', () => {
  const model = mockModels[0]; // PCI_DRUM_4IN: min 6", max 36"

  it('returns valid for face width within limits', () => {
    const result = validateFaceWidth(model, 24);
    expect(result.valid).toBe(true);
  });

  it('returns invalid for face width below minimum', () => {
    const result = validateFaceWidth(model, 4);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('below minimum');
  });

  it('returns invalid for face width above maximum', () => {
    const result = validateFaceWidth(model, 48);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('exceeds maximum');
  });
});

describe('getDefaultFaceWidth', () => {
  it('returns belt width plus model allowance', () => {
    const model = mockModels[0]; // allowance = 2.0
    expect(getDefaultFaceWidth(model, 24)).toBe(26);
  });

  it('uses model-specific allowance', () => {
    const wingModel = mockModels[2]; // allowance = 4.0
    expect(getDefaultFaceWidth(wingModel, 24)).toBe(28);
  });
});

describe('computeFinishedOd', () => {
  it('returns shell OD when no lagging', () => {
    expect(computeFinishedOd(6.0, 0)).toBe(6.0);
  });

  it('adds 2x lagging thickness', () => {
    expect(computeFinishedOd(6.0, 0.5)).toBe(7.0);
  });
});

describe('validateWallThickness', () => {
  const model = mockModels[1]; // PCI_DRUM_6IN

  it('returns PASS for adequate wall thickness', () => {
    const result = validateWallThickness({
      model,
      shellWallIn: 0.250,
      faceWidthIn: 24,
      trackingMode: 'FLAT',
    });
    expect(result.status).toBe('PASS');
    expect(result.computedStressPsi).toBeLessThan(result.stressLimitPsi);
  });

  it('uses lower stress limit for V_GUIDED tracking', () => {
    const result = validateWallThickness({
      model,
      shellWallIn: 0.134,
      faceWidthIn: 24,
      trackingMode: 'V_GUIDED',
    });
    expect(result.stressLimitPsi).toBe(3400); // V-guided limit
  });

  it('uses higher stress limit for FLAT tracking', () => {
    const result = validateWallThickness({
      model,
      shellWallIn: 0.134,
      faceWidthIn: 24,
      trackingMode: 'FLAT',
    });
    expect(result.stressLimitPsi).toBe(10000); // Flat limit
  });

  it('returns utilization percentage', () => {
    const result = validateWallThickness({
      model,
      shellWallIn: 0.188,
      faceWidthIn: 24,
      trackingMode: 'FLAT',
    });
    expect(result.utilizationPercent).toBeGreaterThan(0);
    expect(result.utilizationPercent).toBeLessThan(200);
  });

  it('includes detailed calculation info', () => {
    const result = validateWallThickness({
      model,
      shellWallIn: 0.188,
      faceWidthIn: 24,
      trackingMode: 'FLAT',
    });
    expect(result.details.shellOdIn).toBe(6.0);
    expect(result.details.shellWallIn).toBe(0.188);
    expect(result.details.faceWidthIn).toBe(24);
    expect(result.details.trackingMode).toBe('FLAT');
    expect(result.details.momentOfInertia).toBeGreaterThan(0);
    expect(result.details.sectionModulus).toBeGreaterThan(0);
  });
});

describe('getWallOptions', () => {
  it('returns sorted wall thickness options', () => {
    const model = mockModels[1]; // [0.109, 0.134, 0.188, 0.250]
    const options = getWallOptions(model);
    expect(options).toEqual([0.109, 0.134, 0.188, 0.250]);
  });

  it('sorts unsorted input', () => {
    const model = { ...mockModels[0], allowed_wall_steps_in: [0.165, 0.109, 0.134] };
    const options = getWallOptions(model);
    expect(options).toEqual([0.109, 0.134, 0.165]);
  });
});

describe('formatWallThickness', () => {
  it('formats sheet gauge thicknesses with correct gauge callouts', () => {
    // 0.134" is 10 gauge (NOT 11 gauge) - regression test
    expect(formatWallThickness(0.134)).toBe('0.134" (10 ga)');
    expect(formatWallThickness(0.134)).toContain('10 ga');

    // 0.109" commonly called 12 ga in industry
    expect(formatWallThickness(0.109)).toBe('0.109" (12 ga)');

    // 0.165" is 8 gauge
    expect(formatWallThickness(0.165)).toBe('0.165" (8 ga)');
  });

  it('formats plate thicknesses with fractions, NO gauge', () => {
    // 3/16" plate - regression test: should NOT contain "ga"
    expect(formatWallThickness(0.188)).toBe('0.188" (3/16")');
    expect(formatWallThickness(0.188)).not.toContain('ga');

    // 1/4" plate
    expect(formatWallThickness(0.250)).toBe('0.25" (1/4")');
    expect(formatWallThickness(0.250)).not.toContain('ga');

    // 3/8" plate
    expect(formatWallThickness(0.375)).toBe('0.375" (3/8")');
    expect(formatWallThickness(0.375)).not.toContain('ga');
  });

  it('formats unknown thicknesses as decimal only', () => {
    expect(formatWallThickness(0.200)).toBe('0.2"');
    expect(formatWallThickness(0.200)).not.toContain('ga');
    expect(formatWallThickness(0.200)).not.toContain('/');
  });

  it('handles float tolerance for lookups', () => {
    // Slight variations should still match
    expect(formatWallThickness(0.1339)).toContain('10 ga');
    expect(formatWallThickness(0.1341)).toContain('10 ga');
    expect(formatWallThickness(0.1879)).toContain('3/16"');
  });
});
