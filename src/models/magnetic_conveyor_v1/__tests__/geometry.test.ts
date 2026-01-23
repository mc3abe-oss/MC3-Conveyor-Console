/**
 * MAGNETIC CONVEYOR v1.0 - GEOMETRY TESTS
 *
 * Unit tests for geometry calculation functions.
 */

import {
  calculateInclineLength,
  calculateInclineRun,
  calculateHorizontalLength,
  calculatePathLength,
  calculateBeltLength,
  calculateChainLength,
  calculateGeometry,
} from '../geometry';

// ============================================================================
// INCLINE LENGTH TESTS
// ============================================================================

describe('calculateInclineLength', () => {
  it('should return 0 for Style C (height=0)', () => {
    expect(calculateInclineLength(0, 60)).toBe(0);
  });

  it('should return 0 for Style C (angle=0)', () => {
    expect(calculateInclineLength(100, 0)).toBe(0);
  });

  it('should calculate correctly for 45° angle', () => {
    // incline = 100 / sin(45°) = 100 / 0.7071 = 141.42
    const result = calculateInclineLength(100, 45);
    expect(result).toBeCloseTo(141.42, 1);
  });

  it('should calculate correctly for 60° angle', () => {
    // incline = 100 / sin(60°) = 100 / 0.866 = 115.47
    const result = calculateInclineLength(100, 60);
    expect(result).toBeCloseTo(115.47, 1);
  });

  it('should calculate correctly for 90° angle', () => {
    // incline = 100 / sin(90°) = 100 / 1 = 100
    const result = calculateInclineLength(100, 90);
    expect(result).toBeCloseTo(100, 1);
  });

  it('should calculate correctly for 30° angle', () => {
    // incline = 100 / sin(30°) = 100 / 0.5 = 200
    const result = calculateInclineLength(100, 30);
    expect(result).toBeCloseTo(200, 1);
  });

  it('should calculate correctly for 70° angle (Heavy Duty example)', () => {
    // Job 32425: 70° angle
    // incline = 100 / sin(70°) = 100 / 0.9397 = 106.42
    const result = calculateInclineLength(100, 70);
    expect(result).toBeCloseTo(106.42, 1);
  });
});

// ============================================================================
// INCLINE RUN TESTS
// ============================================================================

describe('calculateInclineRun', () => {
  it('should return 0 for Style C (height=0)', () => {
    expect(calculateInclineRun(0, 60)).toBe(0);
  });

  it('should return 0 for Style C (angle=0)', () => {
    expect(calculateInclineRun(100, 0)).toBe(0);
  });

  it('should return 0 for 90° angle (vertical)', () => {
    expect(calculateInclineRun(100, 90)).toBe(0);
  });

  it('should calculate correctly for 45° angle', () => {
    // run = 100 / tan(45°) = 100 / 1 = 100
    const result = calculateInclineRun(100, 45);
    expect(result).toBeCloseTo(100, 1);
  });

  it('should calculate correctly for 60° angle', () => {
    // run = 100 / tan(60°) = 100 / 1.732 = 57.74
    const result = calculateInclineRun(100, 60);
    expect(result).toBeCloseTo(57.74, 1);
  });

  it('should calculate correctly for 30° angle', () => {
    // run = 100 / tan(30°) = 100 / 0.577 = 173.2
    const result = calculateInclineRun(100, 30);
    expect(result).toBeCloseTo(173.2, 0);
  });

  it('should calculate correctly for 70° angle (Heavy Duty example)', () => {
    // run = 100 / tan(70°) = 100 / 2.747 = 36.4
    const result = calculateInclineRun(100, 70);
    expect(result).toBeCloseTo(36.4, 0);
  });
});

// ============================================================================
// HORIZONTAL LENGTH TESTS
// ============================================================================

describe('calculateHorizontalLength', () => {
  it('should sum all components', () => {
    const result = calculateHorizontalLength(39, 57.74, 22);
    expect(result).toBeCloseTo(118.74, 1);
  });

  it('should handle Style C (no incline)', () => {
    const result = calculateHorizontalLength(100, 0, 0);
    expect(result).toBe(100);
  });

  it('should handle zero infeed (Style D)', () => {
    const result = calculateHorizontalLength(3, 57.74, 22);
    expect(result).toBeCloseTo(82.74, 1);
  });
});

// ============================================================================
// PATH LENGTH TESTS
// ============================================================================

describe('calculatePathLength', () => {
  it('should calculate path length in feet', () => {
    // (39 + 115.47 + 22) / 12 = 176.47 / 12 = 14.71 ft
    const result = calculatePathLength(39, 115.47, 22);
    expect(result).toBeCloseTo(14.71, 1);
  });

  it('should handle Style C (no incline)', () => {
    // (100 + 0 + 0) / 12 = 8.33 ft
    const result = calculatePathLength(100, 0, 0);
    expect(result).toBeCloseTo(8.33, 1);
  });

  it('should handle large conveyors', () => {
    // Heavy Duty example: longer path
    // (50 + 200 + 22) / 12 = 272 / 12 = 22.67 ft
    const result = calculatePathLength(50, 200, 22);
    expect(result).toBeCloseTo(22.67, 1);
  });
});

// ============================================================================
// BELT LENGTH TESTS
// ============================================================================

describe('calculateBeltLength', () => {
  it('should double the path length', () => {
    const result = calculateBeltLength(14.71);
    expect(result).toBeCloseTo(29.42, 1);
  });

  it('should handle Style C', () => {
    const result = calculateBeltLength(8.33);
    expect(result).toBeCloseTo(16.66, 1);
  });

  it('should handle large conveyors', () => {
    const result = calculateBeltLength(22.67);
    expect(result).toBeCloseTo(45.34, 1);
  });
});

// ============================================================================
// CHAIN LENGTH TESTS
// ============================================================================

describe('calculateChainLength', () => {
  describe('Standard class (1.0" pitch)', () => {
    it('should round up to nearest pitch', () => {
      // 29.42 ft = 353.04" → ceil(353.04/1.0) = 354 → 354"
      const result = calculateChainLength(29.42, 1.0);
      expect(result).toBe(354);
    });

    it('should handle exact multiples', () => {
      // 30 ft = 360" → ceil(360/1.0) = 360 → 360"
      const result = calculateChainLength(30, 1.0);
      expect(result).toBe(360);
    });

    it('should handle small conveyors', () => {
      // 10 ft = 120" → ceil(120/1.0) = 120 → 120"
      const result = calculateChainLength(10, 1.0);
      expect(result).toBe(120);
    });
  });

  describe('Heavy Duty class (1.5" pitch)', () => {
    it('should round up to nearest pitch', () => {
      // 29.42 ft = 353.04" → ceil(353.04/1.5) = 236 → 354"
      const result = calculateChainLength(29.42, 1.5);
      expect(result).toBe(354); // ceil(353.04/1.5) = 236 pitches × 1.5 = 354
    });

    it('should handle exact multiples', () => {
      // 30 ft = 360" → ceil(360/1.5) = 240 → 360"
      const result = calculateChainLength(30, 1.5);
      expect(result).toBe(360);
    });

    it('should handle large conveyors (Job 32425 example)', () => {
      // Large Heavy Duty: ~80 ft belt = 960" → ceil(960/1.5) = 640 → 960"
      const result = calculateChainLength(80, 1.5);
      expect(result).toBe(960);
    });

    it('should round up non-exact values', () => {
      // 25 ft = 300" → ceil(300/1.5) = 200 → 300"
      // 25.1 ft = 301.2" → ceil(301.2/1.5) = 201 → 301.5"
      const result = calculateChainLength(25.1, 1.5);
      expect(result).toBe(301.5);
    });
  });
});

// ============================================================================
// COMPOSITE CALCULATION TESTS
// ============================================================================

describe('calculateGeometry', () => {
  it('should calculate all geometry for typical Style B conveyor', () => {
    // Standard: 39" infeed, 100" discharge height, 60° angle, 22" discharge, 1.0" pitch
    const result = calculateGeometry(39, 100, 60, 22, 1.0);

    expect(result.incline_length_in).toBeCloseTo(115.47, 1);
    expect(result.incline_run_in).toBeCloseTo(57.74, 1);
    expect(result.horizontal_length_in).toBeCloseTo(118.74, 1);
    expect(result.path_length_ft).toBeCloseTo(14.71, 1);
    expect(result.belt_length_ft).toBeCloseTo(29.42, 1);
    // belt = 29.41 ft = 352.94" → ceil(352.94/1.0) = 353"
    expect(result.chain_length_in).toBe(353);
  });

  it('should calculate all geometry for Style C (horizontal)', () => {
    // Style C: 100" infeed, 0" height, 0° angle, 0" discharge, 1.0" pitch
    const result = calculateGeometry(100, 0, 0, 0, 1.0);

    expect(result.incline_length_in).toBe(0);
    expect(result.incline_run_in).toBe(0);
    expect(result.horizontal_length_in).toBe(100);
    expect(result.path_length_ft).toBeCloseTo(8.33, 1);
    expect(result.belt_length_ft).toBeCloseTo(16.67, 1);
    expect(result.chain_length_in).toBe(200);
  });

  it('should calculate all geometry for Heavy Duty conveyor', () => {
    // Heavy Duty (Job 32425-like): 50" infeed, 200" height, 70° angle, 22" discharge, 1.5" pitch
    const result = calculateGeometry(50, 200, 70, 22, 1.5);

    // incline = 200 / sin(70°) = 212.84"
    expect(result.incline_length_in).toBeCloseTo(212.84, 0);
    // run = 200 / tan(70°) = 72.79"
    expect(result.incline_run_in).toBeCloseTo(72.79, 0);
    // horizontal = 50 + 72.79 + 22 = 144.79"
    expect(result.horizontal_length_in).toBeCloseTo(144.79, 0);
    // path = (50 + 212.84 + 22) / 12 = 23.74 ft
    expect(result.path_length_ft).toBeCloseTo(23.74, 1);
    // belt = 23.74 * 2 = 47.48 ft
    expect(result.belt_length_ft).toBeCloseTo(47.48, 1);
    // chain = ceil(569.7 / 1.5) * 1.5 = 380 * 1.5 = 570"
    expect(result.chain_length_in).toBe(570);
  });

  it('should calculate all geometry for 90° vertical conveyor', () => {
    // 90° vertical: 10" infeed, 100" height, 90° angle, 10" discharge, 1.0" pitch
    const result = calculateGeometry(10, 100, 90, 10, 1.0);

    expect(result.incline_length_in).toBe(100);
    expect(result.incline_run_in).toBe(0);
    expect(result.horizontal_length_in).toBe(20); // 10 + 0 + 10
    expect(result.path_length_ft).toBe(10); // (10 + 100 + 10) / 12
    expect(result.belt_length_ft).toBe(20);
    expect(result.chain_length_in).toBe(240);
  });

  it('should calculate all geometry for Style D (minimal infeed)', () => {
    // Style D: 3" infeed, 150" height, 60° angle, 22" discharge, 1.0" pitch
    const result = calculateGeometry(3, 150, 60, 22, 1.0);

    // incline = 150 / sin(60°) = 173.21"
    expect(result.incline_length_in).toBeCloseTo(173.21, 0);
    // run = 150 / tan(60°) = 86.6"
    expect(result.incline_run_in).toBeCloseTo(86.6, 0);
    // horizontal = 3 + 86.6 + 22 = 111.6"
    expect(result.horizontal_length_in).toBeCloseTo(111.6, 0);
    // path = (3 + 173.21 + 22) / 12 = 16.52 ft
    expect(result.path_length_ft).toBeCloseTo(16.52, 1);
    // belt = 16.52 * 2 = 33.04 ft
    expect(result.belt_length_ft).toBeCloseTo(33.04, 1);
    // chain = ceil(396.4 / 1.0) * 1.0 = 397"
    expect(result.chain_length_in).toBe(397);
  });
});
