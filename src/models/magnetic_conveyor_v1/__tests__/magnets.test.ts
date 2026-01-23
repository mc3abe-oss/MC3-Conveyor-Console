/**
 * MAGNETIC CONVEYOR v1.0 - MAGNET TESTS
 *
 * Unit tests for magnet calculation functions.
 */

import {
  calculateMagnetWeight,
  calculateMagnetWeightCustom,
  calculateMagnetQuantity,
  calculateTotalMagnetWeight,
  calculateMagnets,
} from '../magnets';

import {
  MAGNET_WEIGHT_INTERCEPT,
  MAGNET_WEIGHT_SLOPE,
  STANDARD_MAGNET_WIDTHS_IN,
} from '../constants';

// ============================================================================
// MAGNET WEIGHT TESTS
// ============================================================================

describe('calculateMagnetWeight', () => {
  it('should calculate weight for 5" magnet (smallest standard)', () => {
    // weight = 0.22 + (5 × 0.5312) = 0.22 + 2.656 = 2.876 lb
    const result = calculateMagnetWeight(5);
    expect(result).toBeCloseTo(2.876, 2);
  });

  it('should calculate weight for 6" magnet', () => {
    // weight = 0.22 + (6 × 0.5312) = 0.22 + 3.1872 = 3.4072 lb
    const result = calculateMagnetWeight(6);
    expect(result).toBeCloseTo(3.41, 2);
  });

  it('should calculate weight for 12" magnet (common size)', () => {
    // weight = 0.22 + (12 × 0.5312) = 0.22 + 6.3744 = 6.5944 lb
    const result = calculateMagnetWeight(12);
    expect(result).toBeCloseTo(6.59, 2);
  });

  it('should calculate weight for 14" magnet', () => {
    // weight = 0.22 + (14 × 0.5312) = 0.22 + 7.4368 = 7.6568 lb
    const result = calculateMagnetWeight(14);
    expect(result).toBeCloseTo(7.66, 2);
  });

  it('should calculate weight for 18" magnet', () => {
    // weight = 0.22 + (18 × 0.5312) = 0.22 + 9.5616 = 9.7816 lb
    const result = calculateMagnetWeight(18);
    expect(result).toBeCloseTo(9.78, 2);
  });

  it('should calculate weight for 24" magnet', () => {
    // weight = 0.22 + (24 × 0.5312) = 0.22 + 12.7488 = 12.9688 lb
    const result = calculateMagnetWeight(24);
    expect(result).toBeCloseTo(12.97, 2);
  });

  it('should calculate weight for 30" magnet (largest standard, Job 32425)', () => {
    // weight = 0.22 + (30 × 0.5312) = 0.22 + 15.936 = 16.156 lb
    const result = calculateMagnetWeight(30);
    expect(result).toBeCloseTo(16.16, 2);
  });

  it('should use correct REV-1 formula constants', () => {
    // Verify the formula uses the documented constants
    const width = 10;
    const expected = MAGNET_WEIGHT_INTERCEPT + (width * MAGNET_WEIGHT_SLOPE);
    const result = calculateMagnetWeight(width);
    expect(result).toBe(expected);
  });

  it('should handle all standard magnet widths', () => {
    // Verify formula works for all standard widths without error
    STANDARD_MAGNET_WIDTHS_IN.forEach((width) => {
      const result = calculateMagnetWeight(width);
      expect(result).toBeGreaterThan(0);
      expect(Number.isFinite(result)).toBe(true);
    });
  });
});

describe('calculateMagnetWeightCustom', () => {
  it('should allow custom coefficients', () => {
    // Old Rev10/Rev15 formula: 0.1063 + (width × 0.3636)
    const result = calculateMagnetWeightCustom(12, 0.1063, 0.3636);
    // 0.1063 + (12 × 0.3636) = 0.1063 + 4.3632 = 4.4695 lb
    expect(result).toBeCloseTo(4.47, 2);
  });

  it('should produce same result as default when using default constants', () => {
    const width = 15;
    const defaultResult = calculateMagnetWeight(width);
    const customResult = calculateMagnetWeightCustom(
      width,
      MAGNET_WEIGHT_INTERCEPT,
      MAGNET_WEIGHT_SLOPE
    );
    expect(customResult).toBe(defaultResult);
  });
});

// ============================================================================
// MAGNET QUANTITY TESTS
// ============================================================================

describe('calculateMagnetQuantity', () => {
  describe('with 12" magnet centers', () => {
    it('should calculate quantity for typical conveyor', () => {
      // Belt length 29.42 ft = 353.04"
      // floor(353.04 / 12) - 1 = 29 - 1 = 28 magnets
      const result = calculateMagnetQuantity(29.42, 12);
      expect(result).toBe(28);
    });

    it('should calculate quantity for Style C horizontal', () => {
      // Belt length 16.67 ft = 200.04"
      // floor(200.04 / 12) - 1 = 16 - 1 = 15 magnets
      const result = calculateMagnetQuantity(16.67, 12);
      expect(result).toBe(15);
    });

    it('should calculate quantity for large HD conveyor', () => {
      // Belt length 47.5 ft = 570"
      // floor(570 / 12) - 1 = 47 - 1 = 46 magnets
      const result = calculateMagnetQuantity(47.5, 12);
      expect(result).toBe(46);
    });

    it('should match Job 32791 example (22 magnets)', () => {
      // From reference doc: 32791 has 22 magnets at 12" centers
      // 22 + 1 = 23, so belt = 23 × 12 = 276" = 23 ft
      // Let's verify: floor(276/12) - 1 = 23 - 1 = 22 ✓
      const result = calculateMagnetQuantity(23, 12);
      expect(result).toBe(22);
    });

    it('should match Job 32425 example (80 magnets)', () => {
      // From reference doc: 32425 HD has 80 magnets at 12" centers
      // 80 + 1 = 81, so belt = 81 × 12 = 972" = 81 ft
      // Let's verify: floor(972/12) - 1 = 81 - 1 = 80 ✓
      const result = calculateMagnetQuantity(81, 12);
      expect(result).toBe(80);
    });
  });

  describe('with 18" magnet centers', () => {
    it('should calculate quantity for typical conveyor', () => {
      // Belt length 29.42 ft = 353.04"
      // floor(353.04 / 18) - 1 = 19 - 1 = 18 magnets
      const result = calculateMagnetQuantity(29.42, 18);
      expect(result).toBe(18);
    });

    it('should calculate quantity for small conveyor', () => {
      // Belt length 15 ft = 180"
      // floor(180 / 18) - 1 = 10 - 1 = 9 magnets
      const result = calculateMagnetQuantity(15, 18);
      expect(result).toBe(9);
    });
  });

  describe('with 24" magnet centers', () => {
    it('should calculate quantity for typical conveyor', () => {
      // Belt length 29.42 ft = 353.04"
      // floor(353.04 / 24) - 1 = 14 - 1 = 13 magnets
      const result = calculateMagnetQuantity(29.42, 24);
      expect(result).toBe(13);
    });

    it('should calculate quantity for large conveyor', () => {
      // Belt length 50 ft = 600"
      // floor(600 / 24) - 1 = 25 - 1 = 24 magnets
      const result = calculateMagnetQuantity(50, 24);
      expect(result).toBe(24);
    });
  });

  describe('with 36" magnet centers', () => {
    it('should calculate quantity for typical conveyor', () => {
      // Belt length 29.42 ft = 353.04"
      // floor(353.04 / 36) - 1 = 9 - 1 = 8 magnets
      const result = calculateMagnetQuantity(29.42, 36);
      expect(result).toBe(8);
    });

    it('should calculate quantity for small conveyor', () => {
      // Belt length 10 ft = 120"
      // floor(120 / 36) - 1 = 3 - 1 = 2 magnets
      const result = calculateMagnetQuantity(10, 36);
      expect(result).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero belt length', () => {
      const result = calculateMagnetQuantity(0, 12);
      expect(result).toBe(0);
    });

    it('should return 0 for zero magnet centers (invalid)', () => {
      const result = calculateMagnetQuantity(29.42, 0);
      expect(result).toBe(0);
    });

    it('should return 0 for negative magnet centers (invalid)', () => {
      const result = calculateMagnetQuantity(29.42, -12);
      expect(result).toBe(0);
    });

    it('should return 0 when belt is shorter than one pitch', () => {
      // Belt length 0.5 ft = 6" < 12" centers
      // floor(6 / 12) - 1 = 0 - 1 = -1 → max(0, -1) = 0
      const result = calculateMagnetQuantity(0.5, 12);
      expect(result).toBe(0);
    });
  });
});

// ============================================================================
// TOTAL MAGNET WEIGHT TESTS
// ============================================================================

describe('calculateTotalMagnetWeight', () => {
  it('should multiply weight by quantity', () => {
    const result = calculateTotalMagnetWeight(6.59, 28);
    expect(result).toBeCloseTo(184.52, 1);
  });

  it('should handle large quantities (Job 32425)', () => {
    // 30" magnet = 16.16 lb, 80 magnets
    const result = calculateTotalMagnetWeight(16.16, 80);
    expect(result).toBeCloseTo(1292.8, 0);
  });

  it('should return 0 for zero quantity', () => {
    const result = calculateTotalMagnetWeight(6.59, 0);
    expect(result).toBe(0);
  });

  it('should handle small conveyors', () => {
    // 5" magnet = 2.88 lb, 5 magnets
    const result = calculateTotalMagnetWeight(2.88, 5);
    expect(result).toBeCloseTo(14.4, 1);
  });
});

// ============================================================================
// COMPOSITE CALCULATION TESTS
// ============================================================================

describe('calculateMagnets', () => {
  it('should calculate all magnet values for typical Standard conveyor', () => {
    // 12" magnet width, 29.42 ft belt, 12" centers
    const result = calculateMagnets(12, 29.42, 12);

    expect(result.magnet_weight_each_lb).toBeCloseTo(6.59, 2);
    expect(result.qty_magnets).toBe(28);
    expect(result.total_magnet_weight_lb).toBeCloseTo(184.59, 0);
  });

  it('should calculate all magnet values for Style C horizontal', () => {
    // 9.5" magnet width, 16.67 ft belt, 12" centers
    const result = calculateMagnets(9.5, 16.67, 12);

    // weight = 0.22 + (9.5 × 0.5312) = 5.2664 lb
    expect(result.magnet_weight_each_lb).toBeCloseTo(5.27, 2);
    // qty = floor(200.04 / 12) - 1 = 15
    expect(result.qty_magnets).toBe(15);
    // total = 5.27 × 15 = 79.05 lb
    expect(result.total_magnet_weight_lb).toBeCloseTo(79.0, 0);
  });

  it('should calculate all magnet values for Heavy Duty conveyor (Job 32425)', () => {
    // 30" magnet width, 81 ft belt (to get 80 magnets), 12" centers
    const result = calculateMagnets(30, 81, 12);

    expect(result.magnet_weight_each_lb).toBeCloseTo(16.16, 2);
    expect(result.qty_magnets).toBe(80);
    expect(result.total_magnet_weight_lb).toBeCloseTo(1292.48, 0);
  });

  it('should calculate with 18" magnet centers', () => {
    // 14" magnet width, 30 ft belt, 18" centers
    const result = calculateMagnets(14, 30, 18);

    // weight = 0.22 + (14 × 0.5312) = 7.6568 lb
    expect(result.magnet_weight_each_lb).toBeCloseTo(7.66, 2);
    // qty = floor(360 / 18) - 1 = 20 - 1 = 19
    expect(result.qty_magnets).toBe(19);
    // total = 7.66 × 19 = 145.54 lb
    expect(result.total_magnet_weight_lb).toBeCloseTo(145.5, 0);
  });

  it('should calculate with 24" magnet centers', () => {
    // 18" magnet width, 40 ft belt, 24" centers
    const result = calculateMagnets(18, 40, 24);

    // weight = 0.22 + (18 × 0.5312) = 9.7816 lb
    expect(result.magnet_weight_each_lb).toBeCloseTo(9.78, 2);
    // qty = floor(480 / 24) - 1 = 20 - 1 = 19
    expect(result.qty_magnets).toBe(19);
    // total = 9.78 × 19 = 185.82 lb
    expect(result.total_magnet_weight_lb).toBeCloseTo(185.8, 0);
  });

  it('should handle edge case with very small conveyor', () => {
    // 5" magnet width, 5 ft belt, 36" centers
    const result = calculateMagnets(5, 5, 36);

    expect(result.magnet_weight_each_lb).toBeCloseTo(2.88, 2);
    // qty = floor(60 / 36) - 1 = 1 - 1 = 0
    expect(result.qty_magnets).toBe(0);
    expect(result.total_magnet_weight_lb).toBe(0);
  });
});
