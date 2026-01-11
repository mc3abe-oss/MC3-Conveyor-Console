/**
 * Belt Compatibility Validation Tests (v1.38)
 *
 * Tests for temperature and oil compatibility checks between
 * part conditions and belt specifications.
 */

import { describe, it, expect } from 'vitest';
import {
  checkBeltCompatibility,
  toFahrenheit,
  ISSUE_CODES,
  type BeltCompatibilityInput,
  type BeltInfo,
} from './beltCompatibility';

// ============================================================================
// Helper: Create default test inputs
// ============================================================================

function createInput(overrides: Partial<BeltCompatibilityInput> = {}): BeltCompatibilityInput {
  return {
    partTempValue: null,
    partTempUnit: 'Fahrenheit',
    fluidsOnMaterial: null,
    materialFluidType: null,
    ...overrides,
  };
}

function createBelt(overrides: Partial<BeltInfo> = {}): BeltInfo {
  return {
    temp_min_f: 14,
    temp_max_f: 160,
    oil_resistant: false,
    ...overrides,
  };
}

// ============================================================================
// Temperature Conversion Tests
// ============================================================================

describe('toFahrenheit', () => {
  it('returns Fahrenheit unchanged', () => {
    expect(toFahrenheit(100, 'Fahrenheit')).toBe(100);
    expect(toFahrenheit(0, 'Fahrenheit')).toBe(0);
    expect(toFahrenheit(-40, 'Fahrenheit')).toBe(-40);
  });

  it('converts Celsius to Fahrenheit', () => {
    expect(toFahrenheit(0, 'Celsius')).toBe(32);
    expect(toFahrenheit(100, 'Celsius')).toBe(212);
    expect(toFahrenheit(-40, 'Celsius')).toBe(-40); // -40 is same in both
    expect(toFahrenheit(37, 'Celsius')).toBeCloseTo(98.6, 1); // Body temp
  });
});

// ============================================================================
// Temperature Validation Tests
// ============================================================================

describe('checkBeltCompatibility - Temperature', () => {
  it('returns no issues when part temp is well below max', () => {
    const input = createInput({ partTempValue: 100, partTempUnit: 'Fahrenheit' });
    const belt = createBelt({ temp_max_f: 160 });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns ERROR when part temp exceeds belt max', () => {
    const input = createInput({ partTempValue: 170, partTempUnit: 'Fahrenheit' });
    const belt = createBelt({ temp_max_f: 160 });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(ISSUE_CODES.BELT_TEMP_EXCEEDED);
    expect(result.errors[0].severity).toBe('error');
  });

  it('returns WARNING when part temp is within 10°F of belt max', () => {
    const input = createInput({ partTempValue: 155, partTempUnit: 'Fahrenheit' });
    const belt = createBelt({ temp_max_f: 160 });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_TEMP_NEAR_MAX);
    expect(result.warnings[0].severity).toBe('warning');
  });

  it('returns WARNING when part temp is exactly at margin boundary', () => {
    const input = createInput({ partTempValue: 150, partTempUnit: 'Fahrenheit' });
    const belt = createBelt({ temp_max_f: 160 });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_TEMP_NEAR_MAX);
  });

  it('returns WARNING when part temp is below belt min', () => {
    const input = createInput({ partTempValue: 10, partTempUnit: 'Fahrenheit' });
    const belt = createBelt({ temp_min_f: 14 });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_TEMP_BELOW_MIN);
  });

  it('handles Celsius input conversion - over max', () => {
    // 80°C = 176°F, which exceeds 160°F max
    const input = createInput({ partTempValue: 80, partTempUnit: 'Celsius' });
    const belt = createBelt({ temp_max_f: 160 });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(true);
    expect(result.errors[0].code).toBe(ISSUE_CODES.BELT_TEMP_EXCEEDED);
  });

  it('handles Celsius input conversion - within margin', () => {
    // 68°C = 154.4°F, which is within 10°F of 160°F max (>=150°F)
    const input = createInput({ partTempValue: 68, partTempUnit: 'Celsius' });
    const belt = createBelt({ temp_max_f: 160 });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_TEMP_NEAR_MAX);
  });

  it('returns WARNING when belt has no temperature rating set', () => {
    const input = createInput({ partTempValue: 100, partTempUnit: 'Fahrenheit' });
    const belt = createBelt({ temp_min_f: null, temp_max_f: null });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_TEMP_RATING_MISSING);
  });

  it('skips temp validation when part temp is not provided', () => {
    const input = createInput({ partTempValue: null });
    const belt = createBelt();

    const result = checkBeltCompatibility(input, belt);

    expect(result.issues).toHaveLength(0);
  });
});

// ============================================================================
// Oil/Fluid Validation Tests
// ============================================================================

describe('checkBeltCompatibility - Oil/Fluid', () => {
  it('returns ERROR when oil present and belt not oil resistant', () => {
    const input = createInput({
      fluidsOnMaterial: 'YES',
      materialFluidType: 'OIL',
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(ISSUE_CODES.BELT_OIL_INCOMPATIBLE);
  });

  it('returns ERROR when mixed fluid present and belt not oil resistant', () => {
    const input = createInput({
      fluidsOnMaterial: 'YES',
      materialFluidType: 'MIXED',
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(true);
    expect(result.errors[0].code).toBe(ISSUE_CODES.BELT_OIL_INCOMPATIBLE);
  });

  it('returns no error when oil present and belt IS oil resistant', () => {
    const input = createInput({
      fluidsOnMaterial: 'YES',
      materialFluidType: 'OIL',
    });
    const belt = createBelt({ oil_resistant: true });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.errors).toHaveLength(0);
    // No warnings either for this case
    expect(result.warnings.filter(w => w.code === ISSUE_CODES.BELT_OIL_INCOMPATIBLE)).toHaveLength(0);
  });

  it('returns no oil error when fluid is WATER (not oil)', () => {
    const input = createInput({
      fluidsOnMaterial: 'YES',
      materialFluidType: 'WATER',
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    // No oil-related issues
    expect(result.errors.filter(e => e.code === ISSUE_CODES.BELT_OIL_INCOMPATIBLE)).toHaveLength(0);
  });

  it('returns no oil error when fluid is COOLANT (not oil)', () => {
    const input = createInput({
      fluidsOnMaterial: 'YES',
      materialFluidType: 'COOLANT',
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    expect(result.errors.filter(e => e.code === ISSUE_CODES.BELT_OIL_INCOMPATIBLE)).toHaveLength(0);
  });

  it('returns WARNING when fluid type is UNKNOWN', () => {
    const input = createInput({
      fluidsOnMaterial: 'YES',
      materialFluidType: 'UNKNOWN',
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_FLUID_TYPE_UNKNOWN);
  });

  it('returns WARNING when fluid type is OTHER', () => {
    const input = createInput({
      fluidsOnMaterial: 'YES',
      materialFluidType: 'OTHER',
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_FLUID_TYPE_UNKNOWN);
  });

  it('skips fluid validation when fluidsOnMaterial is NO', () => {
    const input = createInput({
      fluidsOnMaterial: 'NO',
      materialFluidType: 'OIL', // Should be ignored
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    // No oil-related issues
    expect(result.issues.filter(i =>
      i.code === ISSUE_CODES.BELT_OIL_INCOMPATIBLE ||
      i.code === ISSUE_CODES.BELT_FLUID_TYPE_UNKNOWN
    )).toHaveLength(0);
  });

  it('skips fluid validation when fluidsOnMaterial is null', () => {
    const input = createInput({
      fluidsOnMaterial: null,
    });
    const belt = createBelt({ oil_resistant: false });

    const result = checkBeltCompatibility(input, belt);

    expect(result.issues.filter(i =>
      i.code === ISSUE_CODES.BELT_OIL_INCOMPATIBLE ||
      i.code === ISSUE_CODES.BELT_FLUID_TYPE_UNKNOWN
    )).toHaveLength(0);
  });
});

// ============================================================================
// Combined Validation Tests
// ============================================================================

describe('checkBeltCompatibility - Combined', () => {
  it('returns both temp and oil errors when both conditions fail', () => {
    const input = createInput({
      partTempValue: 200,
      partTempUnit: 'Fahrenheit',
      fluidsOnMaterial: 'YES',
      materialFluidType: 'OIL',
    });
    const belt = createBelt({
      temp_max_f: 160,
      oil_resistant: false,
    });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(true);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map(e => e.code)).toContain(ISSUE_CODES.BELT_TEMP_EXCEEDED);
    expect(result.errors.map(e => e.code)).toContain(ISSUE_CODES.BELT_OIL_INCOMPATIBLE);
  });

  it('returns temp warning and oil error together', () => {
    const input = createInput({
      partTempValue: 155,
      partTempUnit: 'Fahrenheit',
      fluidsOnMaterial: 'YES',
      materialFluidType: 'OIL',
    });
    const belt = createBelt({
      temp_max_f: 160,
      oil_resistant: false,
    });

    const result = checkBeltCompatibility(input, belt);

    expect(result.hasErrors).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(ISSUE_CODES.BELT_OIL_INCOMPATIBLE);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe(ISSUE_CODES.BELT_TEMP_NEAR_MAX);
  });
});
