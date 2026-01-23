/**
 * MAGNETIC CONVEYOR v1.0 - LOAD TESTS
 *
 * Unit tests for load calculation functions.
 */

import {
  calculateWeightPerFoot,
  calculateBeltPullFriction,
  calculateBeltPullGravity,
  calculateTotalLoad,
  calculateLoads,
} from '../loads';

import { STANDARD_PARAMS, HEAVY_DUTY_PARAMS } from '../constants';

// ============================================================================
// WEIGHT PER FOOT TESTS
// ============================================================================

describe('calculateWeightPerFoot', () => {
  describe('Standard class (2.0 lb/ft chain)', () => {
    it('should calculate weight per foot for typical conveyor', () => {
      // Chain: 2.0 lb/ft, Magnets: 184.52 lb, Belt: 29.42 ft
      // weightPerFoot = 2.0 + (184.52 / 29.42) = 2.0 + 6.27 = 8.27 lb/ft
      const result = calculateWeightPerFoot(2.0, 184.52, 29.42);
      expect(result).toBeCloseTo(8.27, 1);
    });

    it('should calculate weight per foot for Style C horizontal', () => {
      // Chain: 2.0 lb/ft, Magnets: 79.0 lb, Belt: 16.67 ft
      // weightPerFoot = 2.0 + (79.0 / 16.67) = 2.0 + 4.74 = 6.74 lb/ft
      const result = calculateWeightPerFoot(2.0, 79.0, 16.67);
      expect(result).toBeCloseTo(6.74, 1);
    });

    it('should return chain weight when no magnets', () => {
      const result = calculateWeightPerFoot(2.0, 0, 29.42);
      expect(result).toBe(2.0);
    });
  });

  describe('Heavy Duty class (3.0 lb/ft chain)', () => {
    it('should calculate weight per foot for HD conveyor', () => {
      // Chain: 3.0 lb/ft, Magnets: 1292.48 lb, Belt: 81 ft
      // weightPerFoot = 3.0 + (1292.48 / 81) = 3.0 + 15.96 = 18.96 lb/ft
      const result = calculateWeightPerFoot(3.0, 1292.48, 81);
      expect(result).toBeCloseTo(18.96, 1);
    });

    it('should handle large magnet loads', () => {
      // Chain: 3.0 lb/ft, Magnets: 500 lb, Belt: 50 ft
      // weightPerFoot = 3.0 + (500 / 50) = 3.0 + 10.0 = 13.0 lb/ft
      const result = calculateWeightPerFoot(3.0, 500, 50);
      expect(result).toBe(13.0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero belt length gracefully', () => {
      // Should return just chain weight to avoid division by zero
      const result = calculateWeightPerFoot(2.0, 184.52, 0);
      expect(result).toBe(2.0);
    });

    it('should handle negative belt length gracefully', () => {
      const result = calculateWeightPerFoot(2.0, 184.52, -10);
      expect(result).toBe(2.0);
    });
  });
});

// ============================================================================
// BELT PULL FRICTION TESTS
// ============================================================================

describe('calculateBeltPullFriction', () => {
  describe('Standard class (CoF = 0.2)', () => {
    it('should calculate friction pull for typical conveyor', () => {
      // weightPerFoot: 8.27 lb/ft, beltLength: 29.42 ft, CoF: 0.2
      // friction = 8.27 × 29.42 × 0.2 = 48.67 lb
      const result = calculateBeltPullFriction(8.27, 29.42, 0.2);
      expect(result).toBeCloseTo(48.67, 0);
    });

    it('should calculate friction pull for Style C horizontal', () => {
      // weightPerFoot: 6.74 lb/ft, beltLength: 16.67 ft, CoF: 0.2
      // friction = 6.74 × 16.67 × 0.2 = 22.47 lb
      const result = calculateBeltPullFriction(6.74, 16.67, 0.2);
      expect(result).toBeCloseTo(22.47, 0);
    });

    it('should use correct Standard CoF from constants', () => {
      const cof = STANDARD_PARAMS.coefficient_of_friction;
      expect(cof).toBe(0.2);
      const result = calculateBeltPullFriction(8.27, 29.42, cof);
      expect(result).toBeCloseTo(48.67, 0);
    });
  });

  describe('Heavy Duty class (CoF = 0.15)', () => {
    it('should calculate friction pull for HD conveyor', () => {
      // weightPerFoot: 18.96 lb/ft, beltLength: 81 ft, CoF: 0.15
      // friction = 18.96 × 81 × 0.15 = 230.36 lb
      const result = calculateBeltPullFriction(18.96, 81, 0.15);
      expect(result).toBeCloseTo(230.36, 0);
    });

    it('should use correct Heavy Duty CoF from constants', () => {
      const cof = HEAVY_DUTY_PARAMS.coefficient_of_friction;
      expect(cof).toBe(0.15);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero weight', () => {
      const result = calculateBeltPullFriction(0, 29.42, 0.2);
      expect(result).toBe(0);
    });

    it('should return 0 for zero belt length', () => {
      const result = calculateBeltPullFriction(8.27, 0, 0.2);
      expect(result).toBe(0);
    });

    it('should return 0 for zero CoF', () => {
      const result = calculateBeltPullFriction(8.27, 29.42, 0);
      expect(result).toBe(0);
    });
  });
});

// ============================================================================
// BELT PULL GRAVITY TESTS
// ============================================================================

describe('calculateBeltPullGravity', () => {
  describe('inclined conveyors', () => {
    it('should calculate gravity pull for 60° angle', () => {
      // inclineLength: 115.47", weightPerFoot: 8.27 lb/ft, angle: 60°
      // gravity = (115.47 / 12) × 8.27 × sin(60°)
      //         = 9.62 × 8.27 × 0.866 = 68.90 lb
      const result = calculateBeltPullGravity(115.47, 8.27, 60);
      expect(result).toBeCloseTo(68.9, 0);
    });

    it('should calculate gravity pull for 45° angle', () => {
      // inclineLength: 141.42", weightPerFoot: 8.27 lb/ft, angle: 45°
      // gravity = (141.42 / 12) × 8.27 × sin(45°)
      //         = 11.79 × 8.27 × 0.707 = 68.94 lb
      const result = calculateBeltPullGravity(141.42, 8.27, 45);
      expect(result).toBeCloseTo(68.94, 0);
    });

    it('should calculate gravity pull for 70° angle (HD)', () => {
      // inclineLength: 212.84", weightPerFoot: 18.96 lb/ft, angle: 70°
      // gravity = (212.84 / 12) × 18.96 × sin(70°)
      //         = 17.74 × 18.96 × 0.9397 = 316.1 lb
      const result = calculateBeltPullGravity(212.84, 18.96, 70);
      expect(result).toBeCloseTo(316.1, 0);
    });

    it('should calculate gravity pull for 90° vertical', () => {
      // inclineLength: 100", weightPerFoot: 8.27 lb/ft, angle: 90°
      // gravity = (100 / 12) × 8.27 × sin(90°)
      //         = 8.33 × 8.27 × 1.0 = 68.91 lb
      const result = calculateBeltPullGravity(100, 8.27, 90);
      expect(result).toBeCloseTo(68.91, 0);
    });

    it('should calculate gravity pull for 30° angle', () => {
      // inclineLength: 200", weightPerFoot: 8.27 lb/ft, angle: 30°
      // gravity = (200 / 12) × 8.27 × sin(30°)
      //         = 16.67 × 8.27 × 0.5 = 68.91 lb
      const result = calculateBeltPullGravity(200, 8.27, 30);
      expect(result).toBeCloseTo(68.91, 0);
    });
  });

  describe('horizontal conveyors (Style C)', () => {
    it('should return 0 for 0° angle', () => {
      const result = calculateBeltPullGravity(100, 8.27, 0);
      expect(result).toBe(0);
    });

    it('should return 0 for zero incline length', () => {
      const result = calculateBeltPullGravity(0, 8.27, 60);
      expect(result).toBe(0);
    });

    it('should return 0 for Style C configuration', () => {
      // Style C: inclineLength = 0, angle = 0
      const result = calculateBeltPullGravity(0, 6.74, 0);
      expect(result).toBe(0);
    });
  });
});

// ============================================================================
// TOTAL LOAD TESTS
// ============================================================================

describe('calculateTotalLoad', () => {
  it('should sum friction, gravity, and chip load', () => {
    // friction: 48.67 lb, gravity: 68.90 lb, chips: 0 lb
    // total = 48.67 + 68.90 + 0 = 117.57 lb
    const result = calculateTotalLoad(48.67, 68.90, 0);
    expect(result).toBeCloseTo(117.57, 1);
  });

  it('should include chip load when present', () => {
    // friction: 48.67 lb, gravity: 68.90 lb, chips: 50 lb
    // total = 48.67 + 68.90 + 50 = 167.57 lb
    const result = calculateTotalLoad(48.67, 68.90, 50);
    expect(result).toBeCloseTo(167.57, 1);
  });

  it('should handle Style C (gravity = 0)', () => {
    // friction: 22.47 lb, gravity: 0 lb, chips: 10 lb
    // total = 22.47 + 0 + 10 = 32.47 lb
    const result = calculateTotalLoad(22.47, 0, 10);
    expect(result).toBeCloseTo(32.47, 1);
  });

  it('should handle Heavy Duty loads', () => {
    // friction: 230.36 lb, gravity: 316.1 lb, chips: 100 lb
    // total = 230.36 + 316.1 + 100 = 646.46 lb
    const result = calculateTotalLoad(230.36, 316.1, 100);
    expect(result).toBeCloseTo(646.46, 0);
  });

  it('should return friction only when no gravity or chips', () => {
    const result = calculateTotalLoad(50, 0, 0);
    expect(result).toBe(50);
  });
});

// ============================================================================
// COMPOSITE CALCULATION TESTS
// ============================================================================

describe('calculateLoads', () => {
  it('should calculate all loads for typical Standard conveyor', () => {
    // Chain: 2.0 lb/ft, Magnets: 184.52 lb, Belt: 29.42 ft
    // Incline: 115.47", Angle: 60°, CoF: 0.2, Chips: 0
    const result = calculateLoads(2.0, 184.52, 29.42, 115.47, 60, 0.2, 0);

    expect(result.weight_per_foot_lb).toBeCloseTo(8.27, 1);
    expect(result.belt_pull_friction_lb).toBeCloseTo(48.67, 0);
    expect(result.belt_pull_gravity_lb).toBeCloseTo(68.9, 0);
    expect(result.chip_load_lb).toBe(0);
    expect(result.total_load_lb).toBeCloseTo(117.57, 0);
  });

  it('should calculate all loads for Style C horizontal', () => {
    // Chain: 2.0 lb/ft, Magnets: 79.0 lb, Belt: 16.67 ft
    // Incline: 0", Angle: 0°, CoF: 0.2, Chips: 0
    const result = calculateLoads(2.0, 79.0, 16.67, 0, 0, 0.2, 0);

    expect(result.weight_per_foot_lb).toBeCloseTo(6.74, 1);
    expect(result.belt_pull_friction_lb).toBeCloseTo(22.47, 0);
    expect(result.belt_pull_gravity_lb).toBe(0);
    expect(result.chip_load_lb).toBe(0);
    expect(result.total_load_lb).toBeCloseTo(22.47, 0);
  });

  it('should calculate all loads for Heavy Duty conveyor', () => {
    // Chain: 3.0 lb/ft, Magnets: 1292.48 lb, Belt: 81 ft
    // Incline: 212.84", Angle: 70°, CoF: 0.15, Chips: 100
    const result = calculateLoads(3.0, 1292.48, 81, 212.84, 70, 0.15, 100);

    expect(result.weight_per_foot_lb).toBeCloseTo(18.96, 1);
    expect(result.belt_pull_friction_lb).toBeCloseTo(230.36, 0);
    expect(result.belt_pull_gravity_lb).toBeCloseTo(316.1, 0);
    expect(result.chip_load_lb).toBe(100);
    expect(result.total_load_lb).toBeCloseTo(646.46, 0);
  });

  it('should calculate all loads for 90° vertical conveyor', () => {
    // Chain: 2.0 lb/ft, Magnets: 100 lb, Belt: 20 ft
    // Incline: 100", Angle: 90°, CoF: 0.2, Chips: 0
    const result = calculateLoads(2.0, 100, 20, 100, 90, 0.2, 0);

    // weightPerFoot = 2.0 + (100/20) = 7.0 lb/ft
    expect(result.weight_per_foot_lb).toBe(7.0);
    // friction = 7.0 × 20 × 0.2 = 28 lb
    expect(result.belt_pull_friction_lb).toBe(28);
    // gravity = (100/12) × 7.0 × sin(90°) = 8.33 × 7.0 × 1.0 = 58.33 lb
    expect(result.belt_pull_gravity_lb).toBeCloseTo(58.33, 0);
    expect(result.total_load_lb).toBeCloseTo(86.33, 0);
  });

  it('should use default chip load of 0 when not provided', () => {
    const result = calculateLoads(2.0, 100, 20, 100, 60, 0.2);
    expect(result.chip_load_lb).toBe(0);
  });

  it('should handle conveyor with significant chip load', () => {
    // Chain: 2.0 lb/ft, Magnets: 184.52 lb, Belt: 29.42 ft
    // Incline: 115.47", Angle: 60°, CoF: 0.2, Chips: 200
    const result = calculateLoads(2.0, 184.52, 29.42, 115.47, 60, 0.2, 200);

    expect(result.chip_load_lb).toBe(200);
    // total = 48.67 + 68.9 + 200 = 317.57 lb
    expect(result.total_load_lb).toBeCloseTo(317.57, 0);
  });
});
