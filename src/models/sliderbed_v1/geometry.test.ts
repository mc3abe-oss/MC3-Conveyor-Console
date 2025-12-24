/**
 * SLIDERBED CONVEYOR v1.10 - GEOMETRY UTILITIES TEST SUITE
 *
 * Tests for geometry.ts including:
 * - Basic geometry conversions (axis ↔ horizontal, rise calculations)
 * - TOB ↔ centerline conversions
 * - Angle calculations from centerlines/TOBs
 * - normalizeGeometry for all three modes (L_ANGLE, H_ANGLE, H_TOB)
 */

import {
  isEffectivelyHorizontal,
  axisFromHorizontal,
  horizontalFromAxis,
  riseFromAxisAndAngle,
  riseFromHorizontalAndAngle,
  tobToCenterline,
  centerlineToTob,
  angleFromCenterlines,
  calculateOppositeTobFromAngle,
  calculateImpliedAngleFromTobs,
  normalizeGeometry,
  DerivedGeometry,
} from './geometry';
import { GeometryMode, SliderbedInputs } from './schema';

describe('Geometry Utilities - Basic Functions', () => {
  describe('isEffectivelyHorizontal', () => {
    it('returns true for 0 degrees', () => {
      expect(isEffectivelyHorizontal(0)).toBe(true);
    });

    it('returns true for very small angles (< 0.01)', () => {
      expect(isEffectivelyHorizontal(0.005)).toBe(true);
      expect(isEffectivelyHorizontal(-0.005)).toBe(true);
    });

    it('returns false for angles >= 0.01', () => {
      expect(isEffectivelyHorizontal(0.01)).toBe(false);
      expect(isEffectivelyHorizontal(5)).toBe(false);
      expect(isEffectivelyHorizontal(-5)).toBe(false);
    });
  });

  describe('axisFromHorizontal', () => {
    it('returns 0 for zero or negative horizontal run', () => {
      expect(axisFromHorizontal(0, 10)).toBe(0);
      expect(axisFromHorizontal(-10, 10)).toBe(0);
    });

    it('returns horizontal run for horizontal conveyor (0°)', () => {
      expect(axisFromHorizontal(100, 0)).toBe(100);
    });

    it('returns horizontal run for effectively horizontal angles', () => {
      expect(axisFromHorizontal(100, 0.005)).toBe(100);
    });

    it('calculates axis length correctly for inclined conveyor', () => {
      // At 30°, cos(30°) ≈ 0.866, so L = H / cos = 100 / 0.866 ≈ 115.47
      const result = axisFromHorizontal(100, 30);
      expect(result).toBeCloseTo(115.47, 1);
    });

    it('calculates axis length for 45° incline', () => {
      // At 45°, cos(45°) ≈ 0.707, so L = H / cos = 100 / 0.707 ≈ 141.42
      const result = axisFromHorizontal(100, 45);
      expect(result).toBeCloseTo(141.42, 1);
    });

    it('handles near-vertical angles (extreme case)', () => {
      // Near 90°, cos approaches 0, should return a large finite value
      const result = axisFromHorizontal(100, 89);
      expect(result).toBeGreaterThan(5000);
      expect(isFinite(result)).toBe(true);
    });
  });

  describe('horizontalFromAxis', () => {
    it('returns 0 for zero or negative axis length', () => {
      expect(horizontalFromAxis(0, 10)).toBe(0);
      expect(horizontalFromAxis(-10, 10)).toBe(0);
    });

    it('returns axis length for horizontal conveyor (0°)', () => {
      expect(horizontalFromAxis(100, 0)).toBe(100);
    });

    it('returns axis length for effectively horizontal angles', () => {
      expect(horizontalFromAxis(100, 0.005)).toBe(100);
    });

    it('calculates horizontal run correctly for inclined conveyor', () => {
      // At 30°, cos(30°) ≈ 0.866, so H = L * cos = 100 * 0.866 ≈ 86.60
      const result = horizontalFromAxis(100, 30);
      expect(result).toBeCloseTo(86.60, 1);
    });

    it('is inverse of axisFromHorizontal', () => {
      const horizontal = 100;
      const angle = 25;
      const axis = axisFromHorizontal(horizontal, angle);
      const backToHorizontal = horizontalFromAxis(axis, angle);
      expect(backToHorizontal).toBeCloseTo(horizontal, 5);
    });
  });

  describe('riseFromAxisAndAngle', () => {
    it('returns 0 for zero or negative axis length', () => {
      expect(riseFromAxisAndAngle(0, 10)).toBe(0);
      expect(riseFromAxisAndAngle(-10, 10)).toBe(0);
    });

    it('returns 0 for horizontal conveyor (0°)', () => {
      expect(riseFromAxisAndAngle(100, 0)).toBe(0);
    });

    it('returns 0 for effectively horizontal angles', () => {
      expect(riseFromAxisAndAngle(100, 0.005)).toBe(0);
    });

    it('calculates rise correctly for inclined conveyor', () => {
      // At 30°, sin(30°) = 0.5, so rise = L * sin = 100 * 0.5 = 50
      const result = riseFromAxisAndAngle(100, 30);
      expect(result).toBeCloseTo(50, 1);
    });

    it('calculates rise for 45° incline', () => {
      // At 45°, sin(45°) ≈ 0.707, so rise = 100 * 0.707 ≈ 70.71
      const result = riseFromAxisAndAngle(100, 45);
      expect(result).toBeCloseTo(70.71, 1);
    });
  });

  describe('riseFromHorizontalAndAngle', () => {
    it('returns 0 for zero or negative horizontal run', () => {
      expect(riseFromHorizontalAndAngle(0, 10)).toBe(0);
      expect(riseFromHorizontalAndAngle(-10, 10)).toBe(0);
    });

    it('returns 0 for horizontal conveyor (0°)', () => {
      expect(riseFromHorizontalAndAngle(100, 0)).toBe(0);
    });

    it('calculates rise correctly using tangent', () => {
      // At 30°, tan(30°) ≈ 0.577, so rise = H * tan = 100 * 0.577 ≈ 57.74
      const result = riseFromHorizontalAndAngle(100, 30);
      expect(result).toBeCloseTo(57.74, 1);
    });

    it('calculates rise for 45° incline', () => {
      // At 45°, tan(45°) = 1, so rise = H * tan = 100 * 1 = 100
      const result = riseFromHorizontalAndAngle(100, 45);
      expect(result).toBeCloseTo(100, 1);
    });
  });
});

describe('Geometry Utilities - TOB/Centerline Conversions', () => {
  describe('tobToCenterline', () => {
    it('subtracts half the pulley diameter', () => {
      // TOB = 36, pulley dia = 4, so CL = 36 - 2 = 34
      expect(tobToCenterline(36, 4)).toBe(34);
    });

    it('handles different pulley sizes', () => {
      expect(tobToCenterline(40, 6)).toBe(37); // 40 - 3 = 37
      expect(tobToCenterline(30, 8)).toBe(26); // 30 - 4 = 26
    });
  });

  describe('centerlineToTob', () => {
    it('adds half the pulley diameter', () => {
      // CL = 34, pulley dia = 4, so TOB = 34 + 2 = 36
      expect(centerlineToTob(34, 4)).toBe(36);
    });

    it('is inverse of tobToCenterline', () => {
      const tob = 36;
      const pulleyDia = 4;
      const cl = tobToCenterline(tob, pulleyDia);
      const backToTob = centerlineToTob(cl, pulleyDia);
      expect(backToTob).toBe(tob);
    });
  });

  describe('angleFromCenterlines', () => {
    it('returns 0 for zero or negative horizontal run', () => {
      expect(angleFromCenterlines(30, 40, 0)).toBe(0);
      expect(angleFromCenterlines(30, 40, -10)).toBe(0);
    });

    it('returns 0 for level centerlines', () => {
      expect(angleFromCenterlines(30, 30, 100)).toBe(0);
    });

    it('returns 0 for near-zero rise', () => {
      expect(angleFromCenterlines(30, 30.0001, 100)).toBe(0);
    });

    it('calculates positive angle for incline (drive higher than tail)', () => {
      // rise = 10, horizontal = 100, so angle = atan(10/100) ≈ 5.71°
      const result = angleFromCenterlines(30, 40, 100);
      expect(result).toBeCloseTo(5.71, 1);
    });

    it('calculates negative angle for decline (drive lower than tail)', () => {
      // rise = -10, horizontal = 100, so angle = atan(-10/100) ≈ -5.71°
      const result = angleFromCenterlines(40, 30, 100);
      expect(result).toBeCloseTo(-5.71, 1);
    });

    it('clamps to max incline of 45°', () => {
      // Very steep rise
      const result = angleFromCenterlines(0, 200, 100);
      expect(result).toBe(45);
    });

    it('clamps to -45° for steep decline', () => {
      const result = angleFromCenterlines(200, 0, 100);
      expect(result).toBe(-45);
    });
  });

  describe('calculateImpliedAngleFromTobs', () => {
    it('correctly calculates angle from TOBs using horizontal run', () => {
      // Tail: TOB = 36, pulley = 4 → CL = 34
      // Drive: TOB = 46, pulley = 4 → CL = 44
      // Rise = 10, H_cc = 100
      // Angle = atan(10/100) ≈ 5.71°
      const result = calculateImpliedAngleFromTobs(36, 46, 100, 4, 4);
      expect(result).toBeCloseTo(5.71, 1);
    });

    it('handles different pulley diameters', () => {
      // Tail: TOB = 36, pulley = 4 → CL = 34
      // Drive: TOB = 50, pulley = 6 → CL = 47
      // Rise = 13, H_cc = 100
      // Angle = atan(13/100) ≈ 7.41°
      const result = calculateImpliedAngleFromTobs(36, 50, 100, 4, 6);
      expect(result).toBeCloseTo(7.41, 1);
    });
  });

  describe('calculateOppositeTobFromAngle', () => {
    it('calculates drive TOB from tail TOB and angle', () => {
      // Tail TOB = 36, tail pulley = 4 → tail CL = 34
      // Angle = 5°, H_cc = 100
      // Rise = 100 * tan(5°) ≈ 8.75
      // Drive CL = 34 + 8.75 = 42.75
      // Drive TOB = 42.75 + 2 = 44.75 (using drive pulley = 4)
      const result = calculateOppositeTobFromAngle(36, 5, 100, 4, 4, 'tail');
      expect(result).toBeCloseTo(44.75, 1);
    });

    it('calculates tail TOB from drive TOB and angle', () => {
      // Drive TOB = 46, drive pulley = 4 → drive CL = 44
      // Angle = 5°, H_cc = 100
      // Rise = 100 * tan(5°) ≈ 8.75
      // Tail CL = 44 - 8.75 = 35.25
      // Tail TOB = 35.25 + 2 = 37.25 (using tail pulley = 4)
      const result = calculateOppositeTobFromAngle(46, 5, 100, 4, 4, 'drive');
      expect(result).toBeCloseTo(37.25, 1);
    });

    it('handles different pulley diameters', () => {
      // Tail TOB = 36, tail pulley = 4 → tail CL = 34
      // Angle = 5°, H_cc = 100
      // Rise = 100 * tan(5°) ≈ 8.75
      // Drive CL = 34 + 8.75 = 42.75
      // Drive TOB = 42.75 + 3 = 45.75 (using drive pulley = 6)
      const result = calculateOppositeTobFromAngle(36, 5, 100, 4, 6, 'tail');
      expect(result).toBeCloseTo(45.75, 1);
    });
  });
});

describe('Geometry Utilities - normalizeGeometry', () => {
  describe('L_ANGLE mode (Length + Angle)', () => {
    it('derives horizontal run from axis length and angle', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.LengthAngle,
        conveyor_length_cc_in: 100,
        conveyor_incline_deg: 30,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
      };

      const { normalized, derived } = normalizeGeometry(inputs);

      expect(derived.mode).toBe(GeometryMode.LengthAngle);
      expect(derived.L_cc_in).toBe(100);
      expect(derived.theta_deg).toBe(30);
      expect(derived.H_cc_in).toBeCloseTo(86.60, 1);
      expect(derived.rise_in).toBeCloseTo(50, 1);
      expect(derived.isValid).toBe(true);
      expect(normalized.horizontal_run_in).toBeCloseTo(86.60, 1);
    });

    it('handles horizontal conveyor (0° angle)', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.LengthAngle,
        conveyor_length_cc_in: 120,
        conveyor_incline_deg: 0,
      };

      const { derived } = normalizeGeometry(inputs);

      expect(derived.L_cc_in).toBe(120);
      expect(derived.H_cc_in).toBe(120);
      expect(derived.theta_deg).toBe(0);
      expect(derived.rise_in).toBe(0);
      expect(derived.isValid).toBe(true);
    });

    it('defaults to L_ANGLE mode when not specified', () => {
      const inputs: Partial<SliderbedInputs> = {
        conveyor_length_cc_in: 100,
        conveyor_incline_deg: 10,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.mode).toBe(GeometryMode.LengthAngle);
      expect(derived.isValid).toBe(true);
    });

    it('returns error for zero length', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.LengthAngle,
        conveyor_length_cc_in: 0,
        conveyor_incline_deg: 10,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.isValid).toBe(false);
      expect(derived.error).toContain('length must be greater than 0');
    });
  });

  describe('H_ANGLE mode (Horizontal + Angle)', () => {
    it('derives axis length from horizontal run and angle', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.HorizontalAngle,
        horizontal_run_in: 100,
        conveyor_incline_deg: 30,
      };

      const { normalized, derived } = normalizeGeometry(inputs);

      expect(derived.mode).toBe(GeometryMode.HorizontalAngle);
      expect(derived.H_cc_in).toBe(100);
      expect(derived.theta_deg).toBe(30);
      expect(derived.L_cc_in).toBeCloseTo(115.47, 1);
      expect(derived.rise_in).toBeCloseTo(57.74, 1);
      expect(derived.isValid).toBe(true);
      expect(normalized.conveyor_length_cc_in).toBeCloseTo(115.47, 1);
    });

    it('falls back to conveyor_length_cc_in if horizontal_run_in not set', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.HorizontalAngle,
        conveyor_length_cc_in: 100, // Used as fallback
        conveyor_incline_deg: 0,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.H_cc_in).toBe(100);
      expect(derived.isValid).toBe(true);
    });

    it('returns error for zero horizontal run', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.HorizontalAngle,
        horizontal_run_in: 0,
        conveyor_incline_deg: 10,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.isValid).toBe(false);
      expect(derived.error).toContain('Horizontal run must be greater than 0');
    });
  });

  describe('H_TOB mode (Horizontal + TOBs)', () => {
    it('derives angle and axis length from horizontal run and TOBs', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.HorizontalTob,
        horizontal_run_in: 100,
        tail_tob_in: 36,
        drive_tob_in: 46,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
      };

      const { normalized, derived } = normalizeGeometry(inputs);

      expect(derived.mode).toBe(GeometryMode.HorizontalTob);
      expect(derived.H_cc_in).toBe(100);
      // Tail CL = 34, Drive CL = 44, rise = 10
      // angle = atan(10/100) ≈ 5.71°
      expect(derived.theta_deg).toBeCloseTo(5.71, 1);
      expect(derived.rise_in).toBe(10);
      expect(derived.tail_cl_in).toBe(34);
      expect(derived.drive_cl_in).toBe(44);
      expect(derived.isValid).toBe(true);
      expect(normalized.conveyor_incline_deg).toBeCloseTo(5.71, 1);
    });

    it('returns error when TOBs are missing', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.HorizontalTob,
        horizontal_run_in: 100,
        tail_tob_in: 36,
        // drive_tob_in missing
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.isValid).toBe(false);
      expect(derived.error).toContain('H_TOB mode requires both tail and drive TOB');
    });

    it('returns error for zero horizontal run', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.HorizontalTob,
        horizontal_run_in: 0,
        tail_tob_in: 36,
        drive_tob_in: 46,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.isValid).toBe(false);
      expect(derived.error).toContain('Horizontal run must be greater than 0');
    });

    it('handles horizontal conveyor (same TOBs with same pulley diameters)', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.HorizontalTob,
        horizontal_run_in: 100,
        tail_tob_in: 36,
        drive_tob_in: 36,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.theta_deg).toBe(0);
      expect(derived.rise_in).toBe(0);
      expect(derived.L_cc_in).toBe(100); // Same as horizontal
    });
  });

  describe('Pulley diameter handling', () => {
    it('uses default pulley diameter (4) when not specified', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.LengthAngle,
        conveyor_length_cc_in: 100,
        conveyor_incline_deg: 0,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.drive_pulley_dia_in).toBe(4);
      expect(derived.tail_pulley_dia_in).toBe(4);
    });

    it('falls back to legacy pulley_diameter_in', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.LengthAngle,
        conveyor_length_cc_in: 100,
        conveyor_incline_deg: 0,
        pulley_diameter_in: 6,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.drive_pulley_dia_in).toBe(6);
      expect(derived.tail_pulley_dia_in).toBe(6);
    });

    it('uses separate drive/tail pulley diameters when specified', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.LengthAngle,
        conveyor_length_cc_in: 100,
        conveyor_incline_deg: 0,
        drive_pulley_diameter_in: 6,
        tail_pulley_diameter_in: 5,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.drive_pulley_dia_in).toBe(6);
      expect(derived.tail_pulley_dia_in).toBe(5);
    });
  });

  describe('TOB centerline calculation in non-H_TOB modes', () => {
    it('calculates centerlines when TOBs are provided in L_ANGLE mode', () => {
      const inputs: Partial<SliderbedInputs> = {
        geometry_mode: GeometryMode.LengthAngle,
        conveyor_length_cc_in: 100,
        conveyor_incline_deg: 10,
        tail_tob_in: 36,
        drive_tob_in: 46,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
      };

      const { derived } = normalizeGeometry(inputs);
      expect(derived.tail_cl_in).toBe(34);
      expect(derived.drive_cl_in).toBe(44);
    });
  });
});

describe('Geometry - Roundtrip Consistency', () => {
  it('L_ANGLE → H_ANGLE roundtrip preserves values', () => {
    // Start with L_ANGLE inputs
    const lAngleInputs: Partial<SliderbedInputs> = {
      geometry_mode: GeometryMode.LengthAngle,
      conveyor_length_cc_in: 100,
      conveyor_incline_deg: 15,
    };

    const { normalized: normFromL, derived: derivedFromL } = normalizeGeometry(lAngleInputs);

    // Switch to H_ANGLE using derived horizontal
    const hAngleInputs: Partial<SliderbedInputs> = {
      geometry_mode: GeometryMode.HorizontalAngle,
      horizontal_run_in: derivedFromL.H_cc_in,
      conveyor_incline_deg: 15,
    };

    const { derived: derivedFromH } = normalizeGeometry(hAngleInputs);

    // Both should produce the same geometry
    expect(derivedFromH.L_cc_in).toBeCloseTo(derivedFromL.L_cc_in, 5);
    expect(derivedFromH.H_cc_in).toBeCloseTo(derivedFromL.H_cc_in, 5);
    expect(derivedFromH.rise_in).toBeCloseTo(derivedFromL.rise_in, 5);
  });

  it('H_TOB → L_ANGLE roundtrip preserves values', () => {
    // Start with H_TOB inputs
    const hTobInputs: Partial<SliderbedInputs> = {
      geometry_mode: GeometryMode.HorizontalTob,
      horizontal_run_in: 100,
      tail_tob_in: 36,
      drive_tob_in: 50,
      drive_pulley_diameter_in: 4,
      tail_pulley_diameter_in: 4,
    };

    const { derived: derivedFromTob } = normalizeGeometry(hTobInputs);

    // Switch to L_ANGLE using derived axis length and angle
    const lAngleInputs: Partial<SliderbedInputs> = {
      geometry_mode: GeometryMode.LengthAngle,
      conveyor_length_cc_in: derivedFromTob.L_cc_in,
      conveyor_incline_deg: derivedFromTob.theta_deg,
      drive_pulley_diameter_in: 4,
      tail_pulley_diameter_in: 4,
    };

    const { derived: derivedFromL } = normalizeGeometry(lAngleInputs);

    // Both should produce the same geometry
    expect(derivedFromL.L_cc_in).toBeCloseTo(derivedFromTob.L_cc_in, 5);
    expect(derivedFromL.H_cc_in).toBeCloseTo(derivedFromTob.H_cc_in, 5);
    expect(derivedFromL.rise_in).toBeCloseTo(derivedFromTob.rise_in, 5);
  });
});

describe('Geometry - Bug Fix: TOB implied angle uses horizontal run', () => {
  /**
   * This test documents the fix for the bug where calculateImpliedAngleDeg
   * incorrectly used conveyor_length_cc_in (axis length) instead of
   * horizontal_run_in when calculating angle from TOBs.
   *
   * The correct formula is: angle = atan(rise / H_cc)
   * NOT: angle = atan(rise / L_cc) ← this was the bug
   */
  it('uses horizontal run, not axis length, for angle calculation', () => {
    // Example: 30° incline
    // Axis length (L_cc) = 100
    // Horizontal run (H_cc) = 100 * cos(30°) ≈ 86.60
    // Rise = 100 * sin(30°) = 50
    //
    // BUG formula: atan(50/100) ≈ 26.57° (WRONG - too shallow)
    // CORRECT formula: atan(50/86.60) ≈ 30° (RIGHT)

    const tailTob = 36; // CL = 34
    const rise = 50;
    const driveTob = tailTob + rise; // CL = 84
    const horizontalRun = 86.60; // NOT the axis length of 100

    const impliedAngle = calculateImpliedAngleFromTobs(
      tailTob,
      driveTob,
      horizontalRun,
      4,
      4
    );

    // Should be close to 30°
    expect(impliedAngle).toBeCloseTo(30, 0.5);

    // If we had used axis length (100) instead, we'd get ~26.57°
    const wrongAngle = calculateImpliedAngleFromTobs(
      tailTob,
      driveTob,
      100, // Using axis length instead of horizontal run
      4,
      4
    );
    expect(wrongAngle).toBeCloseTo(26.57, 0.5);
    expect(wrongAngle).not.toBeCloseTo(30, 1); // Confirms this would be wrong
  });
});
