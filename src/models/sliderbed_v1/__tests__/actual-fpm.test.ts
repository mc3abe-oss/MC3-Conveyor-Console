/**
 * Tests for Actual Belt Speed (FPM) from Selected Gearmotor (v1.38)
 *
 * These tests verify the calculation of actual belt speed based on:
 * - Selected gearmotor output RPM
 * - Drive ratio (chain/sprocket configuration)
 * - Drive pulley diameter
 *
 * The function returns ActualBeltSpeedResult with:
 * - actualBeltSpeedFpm: computed belt speed (null if guards fail)
 * - actualDriveShaftRpm: computed drive shaft RPM (null if guards fail)
 * - warningCode: warning code if guards fail (null if successful)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateActualBeltSpeed,
  calculateSpeedDeltaPct,
} from '../formulas';

describe('calculateActualBeltSpeed', () => {
  // Test constants
  const PI = Math.PI;

  describe('shaft-mounted (direct drive)', () => {
    it('should calculate actual belt speed with direct drive (ratio = 1.0)', () => {
      // Given: gearmotor at 50 RPM, 4" pulley, shaft mounted
      const gearmotorRpm = 50;
      const pulleyDia = 4; // inches
      const isBottomMount = false;

      const result = calculateActualBeltSpeed(
        gearmotorRpm,
        pulleyDia,
        18, // gmTeeth (ignored for shaft mount)
        24, // driveTeeth (ignored for shaft mount)
        isBottomMount
      );

      // Expected: 50 * PI * (4/12) = 50 * PI * 0.333... = 52.36 FPM
      const expected = 50 * PI * (4 / 12);
      expect(result.actualBeltSpeedFpm).toBeCloseTo(expected, 2);
      expect(result.actualDriveShaftRpm).toBeCloseTo(50, 2);
      expect(result.warningCode).toBeNull();
    });

    it('should handle various pulley diameters', () => {
      const gearmotorRpm = 100;

      // 3" pulley
      const result3 = calculateActualBeltSpeed(gearmotorRpm, 3, 18, 24, false);
      expect(result3.actualBeltSpeedFpm).toBeCloseTo(100 * PI * (3 / 12), 2);

      // 6" pulley
      const result6 = calculateActualBeltSpeed(gearmotorRpm, 6, 18, 24, false);
      expect(result6.actualBeltSpeedFpm).toBeCloseTo(100 * PI * (6 / 12), 2);

      // 8" pulley
      const result8 = calculateActualBeltSpeed(gearmotorRpm, 8, 18, 24, false);
      expect(result8.actualBeltSpeedFpm).toBeCloseTo(100 * PI * (8 / 12), 2);
    });
  });

  describe('bottom-mount (chain drive)', () => {
    it('should apply drive ratio for bottom mount configuration', () => {
      // Given: gearmotor at 66.67 RPM (required for 50 FPM with 24/18 chain)
      // With 4" pulley, 18T gearmotor sprocket, 24T drive sprocket
      const gearmotorRpm = 66.67;
      const pulleyDia = 4;
      const gmTeeth = 18;
      const driveTeeth = 24;
      const isBottomMount = true;

      const result = calculateActualBeltSpeed(
        gearmotorRpm,
        pulleyDia,
        gmTeeth,
        driveTeeth,
        isBottomMount
      );

      // drive_ratio = 18/24 = 0.75
      // drive_pulley_rpm = 66.67 * 0.75 = 50 RPM
      // belt_speed = 50 * PI * (4/12) = 52.36 FPM
      const driveRatio = gmTeeth / driveTeeth;
      const expected = gearmotorRpm * driveRatio * PI * (pulleyDia / 12);
      expect(result.actualBeltSpeedFpm).toBeCloseTo(expected, 1);
      expect(result.actualDriveShaftRpm).toBeCloseTo(gearmotorRpm * driveRatio, 2);
      expect(result.warningCode).toBeNull();
    });

    it('should increase belt speed when gearmotor sprocket is larger', () => {
      // Larger gearmotor sprocket = faster pulley = faster belt
      const gearmotorRpm = 50;
      const pulleyDia = 4;
      const driveTeeth = 24;

      // 18T gearmotor sprocket (ratio 0.75)
      const result18T = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, 18, driveTeeth, true);

      // 24T gearmotor sprocket (ratio 1.0)
      const result24T = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, 24, driveTeeth, true);

      // 30T gearmotor sprocket (ratio 1.25)
      const result30T = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, 30, driveTeeth, true);

      expect(result24T.actualBeltSpeedFpm!).toBeGreaterThan(result18T.actualBeltSpeedFpm!);
      expect(result30T.actualBeltSpeedFpm!).toBeGreaterThan(result24T.actualBeltSpeedFpm!);
    });

    it('should decrease belt speed when drive shaft sprocket is larger', () => {
      // Larger drive shaft sprocket = slower pulley = slower belt
      const gearmotorRpm = 50;
      const pulleyDia = 4;
      const gmTeeth = 18;

      // 18T drive sprocket (ratio 1.0)
      const result18T = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, gmTeeth, 18, true);

      // 24T drive sprocket (ratio 0.75)
      const result24T = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, gmTeeth, 24, true);

      // 30T drive sprocket (ratio 0.6)
      const result30T = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, gmTeeth, 30, true);

      expect(result24T.actualBeltSpeedFpm!).toBeLessThan(result18T.actualBeltSpeedFpm!);
      expect(result30T.actualBeltSpeedFpm!).toBeLessThan(result24T.actualBeltSpeedFpm!);
    });

    it('should handle 1:1 chain ratio', () => {
      // 1:1 ratio means same speed as gearmotor output
      const gearmotorRpm = 50;
      const pulleyDia = 4;

      const resultChain = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, 18, 18, true);
      const resultDirect = calculateActualBeltSpeed(gearmotorRpm, pulleyDia, 18, 18, false);

      expect(resultChain.actualBeltSpeedFpm).toBeCloseTo(resultDirect.actualBeltSpeedFpm!, 2);
    });
  });

  describe('edge cases and guards', () => {
    it('should return null and warning code when gearmotor RPM is 0', () => {
      const result = calculateActualBeltSpeed(0, 4, 18, 24, false);
      expect(result.actualBeltSpeedFpm).toBeNull();
      expect(result.actualDriveShaftRpm).toBeNull();
      expect(result.warningCode).toBe('ACTUAL_GM_RPM_INVALID');
    });

    it('should return null with no warning when gearmotor RPM is null/undefined', () => {
      const resultNull = calculateActualBeltSpeed(null, 4, 18, 24, false);
      expect(resultNull.actualBeltSpeedFpm).toBeNull();
      expect(resultNull.warningCode).toBeNull();

      const resultUndefined = calculateActualBeltSpeed(undefined, 4, 18, 24, false);
      expect(resultUndefined.actualBeltSpeedFpm).toBeNull();
      expect(resultUndefined.warningCode).toBeNull();
    });

    it('should return null with no warning when gearmotor RPM is negative', () => {
      const result = calculateActualBeltSpeed(-50, 4, 18, 24, false);
      expect(result.actualBeltSpeedFpm).toBeNull();
      expect(result.warningCode).toBeNull();
    });

    it('should return warning code when pulley diameter is 0 or missing', () => {
      const result0 = calculateActualBeltSpeed(50, 0, 18, 24, false);
      expect(result0.actualBeltSpeedFpm).toBeNull();
      expect(result0.warningCode).toBe('PULLEY_DIAMETER_MISSING');

      const resultNull = calculateActualBeltSpeed(50, null, 18, 24, false);
      expect(resultNull.actualBeltSpeedFpm).toBeNull();
      expect(resultNull.warningCode).toBe('PULLEY_DIAMETER_MISSING');
    });

    it('should return warning code when sprocket teeth are missing for bottom mount', () => {
      // Zero gearmotor sprocket
      const resultGm0 = calculateActualBeltSpeed(50, 4, 0, 24, true);
      expect(resultGm0.actualBeltSpeedFpm).toBeNull();
      expect(resultGm0.warningCode).toBe('SPROCKET_TEETH_MISSING');

      // Zero drive sprocket
      const resultDrive0 = calculateActualBeltSpeed(50, 4, 18, 0, true);
      expect(resultDrive0.actualBeltSpeedFpm).toBeNull();
      expect(resultDrive0.warningCode).toBe('SPROCKET_TEETH_MISSING');

      // Null sprocket teeth
      const resultNull = calculateActualBeltSpeed(50, 4, null, 24, true);
      expect(resultNull.actualBeltSpeedFpm).toBeNull();
      expect(resultNull.warningCode).toBe('SPROCKET_TEETH_MISSING');
    });

    it('should succeed with null sprocket teeth for shaft mount (not used)', () => {
      // Sprocket teeth are ignored for shaft mount
      const result = calculateActualBeltSpeed(50, 4, null, null, false);
      const expected = 50 * PI * (4 / 12);
      expect(result.actualBeltSpeedFpm).toBeCloseTo(expected, 2);
      expect(result.warningCode).toBeNull();
    });

    it('should handle default sprocket values', () => {
      // Using default values (no sprocket params passed, isBottomMount defaults to false)
      const result = calculateActualBeltSpeed(50, 4);
      // Default is shaft mounted (no chain), so ratio = 1.0
      const expected = 50 * PI * (4 / 12);
      expect(result.actualBeltSpeedFpm).toBeCloseTo(expected, 2);
    });
  });
});

describe('calculateSpeedDeltaPct', () => {
  it('should calculate positive delta when actual is faster', () => {
    const desired = 50;
    const actual = 55;

    const result = calculateSpeedDeltaPct(desired, actual);

    // ((55 - 50) / 50) * 100 = 10%
    expect(result).toBeCloseTo(10, 2);
  });

  it('should calculate negative delta when actual is slower', () => {
    const desired = 50;
    const actual = 45;

    const result = calculateSpeedDeltaPct(desired, actual);

    // ((45 - 50) / 50) * 100 = -10%
    expect(result).toBeCloseTo(-10, 2);
  });

  it('should return 0 for exact match', () => {
    const desired = 50;
    const actual = 50;

    const result = calculateSpeedDeltaPct(desired, actual);

    expect(result).toBe(0);
  });

  it('should return 0 when desired is 0 or negative', () => {
    expect(calculateSpeedDeltaPct(0, 50)).toBe(0);
    expect(calculateSpeedDeltaPct(-10, 50)).toBe(0);
  });

  it('should handle small differences accurately', () => {
    const desired = 100;
    const actual = 101;

    const result = calculateSpeedDeltaPct(desired, actual);

    expect(result).toBeCloseTo(1, 2);
  });

  it('should handle large differences', () => {
    const desired = 50;
    const actual = 100;

    const result = calculateSpeedDeltaPct(desired, actual);

    // ((100 - 50) / 50) * 100 = 100%
    expect(result).toBeCloseTo(100, 2);
  });
});

describe('integration: full speed chain', () => {
  it('should match expected actual FPM from NORD selection example', () => {
    // Example: User wants 50 FPM, selects NORD at 66.7 RPM with bottom mount
    // Chain: 18T gearmotor, 24T drive shaft = 0.75 ratio
    // Pulley: 4"
    //
    // Desired: 50 FPM
    // Drive shaft RPM needed: 50 / (PI * (4/12)) = 47.75 RPM
    // Gearmotor RPM needed: 47.75 * (24/18) = 63.66 RPM
    // Selected NORD: 66.7 RPM (closest available)
    //
    // Actual drive shaft RPM: 66.7 * 0.75 = 50.025 RPM
    // Actual belt speed: 50.025 * PI * (4/12) = 52.4 FPM
    // Delta: ((52.4 - 50) / 50) * 100 = +4.8%

    const nordRpm = 66.7;
    const pulleyDia = 4;
    const gmTeeth = 18;
    const driveTeeth = 24;
    const desiredFpm = 50;

    const result = calculateActualBeltSpeed(nordRpm, pulleyDia, gmTeeth, driveTeeth, true);
    const actualFpm = result.actualBeltSpeedFpm!;
    const deltaPct = calculateSpeedDeltaPct(desiredFpm, actualFpm);

    // Actual should be around 52.4 FPM
    expect(actualFpm).toBeCloseTo(52.4, 0);

    // Delta should be positive (faster than desired)
    expect(deltaPct).toBeGreaterThan(0);
    expect(deltaPct).toBeLessThan(10); // Within reasonable range

    // Within 5% warning threshold
    expect(Math.abs(deltaPct)).toBeLessThan(5.5);
  });

  it('should handle shaft-mounted with exact RPM match', () => {
    // Shaft mounted = direct drive, no chain ratio
    // If user wants 50 FPM with 4" pulley:
    // Required RPM = 50 / (PI * (4/12)) = 47.75 RPM
    // If NORD matches exactly at 47.75 RPM:

    const requiredRpm = 50 / (Math.PI * (4 / 12));
    const pulleyDia = 4;
    const desiredFpm = 50;

    const result = calculateActualBeltSpeed(requiredRpm, pulleyDia, 18, 24, false);
    const actualFpm = result.actualBeltSpeedFpm!;
    const deltaPct = calculateSpeedDeltaPct(desiredFpm, actualFpm);

    expect(actualFpm).toBeCloseTo(50, 1);
    expect(deltaPct).toBeCloseTo(0, 1);
  });

  it('should return warning code when chain math fails', () => {
    // Bottom mount with missing sprocket config
    const result = calculateActualBeltSpeed(66.7, 4, null, null, true);

    expect(result.actualBeltSpeedFpm).toBeNull();
    expect(result.actualDriveShaftRpm).toBeNull();
    expect(result.warningCode).toBe('SPROCKET_TEETH_MISSING');
  });
});
