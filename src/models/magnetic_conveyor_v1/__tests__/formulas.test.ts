/**
 * MAGNETIC CONVEYOR v1.0 - MASTER CALCULATE TESTS
 *
 * Integration tests for the master calculate function that
 * orchestrates all individual calculation modules.
 */

import {
  calculate,
  resolveParameters,
  calculateThroughput,
} from '../formulas';

import {
  MagneticInputs,
  ConveyorStyle,
  ConveyorClass,
  MagnetType,
  ChipType,
  MaterialType,
} from '../schema';

import {
  STANDARD_PARAMS,
  HEAVY_DUTY_PARAMS,
  DEFAULT_DISCHARGE_LENGTH_IN,
} from '../constants';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Standard conveyor fixture - typical Style B incline.
 * Based on Job 32791 parameters.
 */
const standardInputs: MagneticInputs = {
  style: ConveyorStyle.B,
  conveyor_class: ConveyorClass.Standard,
  infeed_length_in: 48,
  discharge_height_in: 100,
  incline_angle_deg: 60,
  discharge_length_in: 22,
  magnet_width_in: 12,
  magnet_type: MagnetType.Ceramic8,
  magnet_centers_in: 12,
  belt_speed_fpm: 30,
  load_lbs_per_hr: 1000,
  material_type: MaterialType.Steel,
  chip_type: ChipType.Small,
};

/**
 * Heavy Duty conveyor fixture - large Style B incline.
 * Based on Job 32425 parameters.
 */
const heavyDutyInputs: MagneticInputs = {
  style: ConveyorStyle.B,
  conveyor_class: ConveyorClass.HeavyDuty,
  infeed_length_in: 60,
  discharge_height_in: 200,
  incline_angle_deg: 70,
  discharge_length_in: 22,
  magnet_width_in: 30,
  magnet_type: MagnetType.Neo35,
  magnet_centers_in: 12,
  belt_speed_fpm: 30,
  load_lbs_per_hr: 6000,
  material_type: MaterialType.CastIron,
  chip_type: ChipType.Small,
};

/**
 * Style C fixture - horizontal only configuration.
 */
const styleCInputs: MagneticInputs = {
  style: ConveyorStyle.C,
  conveyor_class: ConveyorClass.Standard,
  infeed_length_in: 100,
  discharge_height_in: 0, // Horizontal only
  incline_angle_deg: 0, // Horizontal only
  magnet_width_in: 9.5,
  magnet_type: MagnetType.Ceramic5,
  magnet_centers_in: 12,
  belt_speed_fpm: 45,
  load_lbs_per_hr: 500,
  material_type: MaterialType.Steel,
  chip_type: ChipType.Small,
};

// ============================================================================
// PARAMETER RESOLUTION TESTS
// ============================================================================

describe('resolveParameters', () => {
  it('should return Standard class parameters for Standard conveyor', () => {
    const result = resolveParameters(standardInputs);

    expect(result.chain_pitch_in).toBe(STANDARD_PARAMS.chain_pitch_in);
    expect(result.chain_weight_lb_per_ft).toBe(
      STANDARD_PARAMS.chain_weight_lb_per_ft
    );
    expect(result.sprocket_pitch_diameter_in).toBe(
      STANDARD_PARAMS.sprocket_pitch_diameter_in
    );
    expect(result.coefficient_of_friction).toBe(
      STANDARD_PARAMS.coefficient_of_friction
    );
    expect(result.safety_factor).toBe(STANDARD_PARAMS.safety_factor);
  });

  it('should return Heavy Duty class parameters for HD conveyor', () => {
    const result = resolveParameters(heavyDutyInputs);

    expect(result.chain_pitch_in).toBe(HEAVY_DUTY_PARAMS.chain_pitch_in);
    expect(result.chain_weight_lb_per_ft).toBe(
      HEAVY_DUTY_PARAMS.chain_weight_lb_per_ft
    );
    expect(result.sprocket_pitch_diameter_in).toBe(
      HEAVY_DUTY_PARAMS.sprocket_pitch_diameter_in
    );
    expect(result.coefficient_of_friction).toBe(
      HEAVY_DUTY_PARAMS.coefficient_of_friction
    );
    expect(result.safety_factor).toBe(HEAVY_DUTY_PARAMS.safety_factor);
  });

  it('should apply user override for coefficient of friction', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      coefficient_of_friction: 0.25,
    };

    const result = resolveParameters(inputs);
    expect(result.coefficient_of_friction).toBe(0.25);
  });

  it('should apply user override for safety factor', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      safety_factor: 2.5,
    };

    const result = resolveParameters(inputs);
    expect(result.safety_factor).toBe(2.5);
  });

  it('should apply user override for starting belt pull', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      starting_belt_pull_lb: 150,
    };

    const result = resolveParameters(inputs);
    expect(result.starting_belt_pull_lb).toBe(150);
  });

  it('should apply user override for chain weight', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      chain_weight_lb_per_ft: 2.5,
    };

    const result = resolveParameters(inputs);
    expect(result.chain_weight_lb_per_ft).toBe(2.5);
  });

  it('should apply multiple overrides simultaneously', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      coefficient_of_friction: 0.18,
      safety_factor: 1.8,
      starting_belt_pull_lb: 120,
      chain_weight_lb_per_ft: 2.2,
    };

    const result = resolveParameters(inputs);
    expect(result.coefficient_of_friction).toBe(0.18);
    expect(result.safety_factor).toBe(1.8);
    expect(result.starting_belt_pull_lb).toBe(120);
    expect(result.chain_weight_lb_per_ft).toBe(2.2);
  });
});

// ============================================================================
// THROUGHPUT CALCULATION TESTS
// ============================================================================

describe('calculateThroughput', () => {
  it('should return chip load of 0 (placeholder)', () => {
    const result = calculateThroughput(28, 30, 12, 1000);
    expect(result.chip_load_lb).toBe(0);
  });

  it('should return requested throughput as achieved (placeholder)', () => {
    const result = calculateThroughput(28, 30, 12, 1000);
    expect(result.achieved_throughput_lbs_hr).toBe(1000);
  });

  it('should calculate margin of 1.0 (placeholder)', () => {
    const result = calculateThroughput(28, 30, 12, 1000);
    expect(result.throughput_margin).toBe(1.0);
  });

  it('should handle zero required throughput', () => {
    const result = calculateThroughput(28, 30, 12, 0);
    expect(result.achieved_throughput_lbs_hr).toBe(0);
    expect(result.throughput_margin).toBe(0);
  });
});

// ============================================================================
// MASTER CALCULATE TESTS - STANDARD CONVEYOR
// ============================================================================

describe('calculate - Standard conveyor', () => {
  let result: ReturnType<typeof calculate>;

  beforeAll(() => {
    result = calculate(standardInputs);
  });

  describe('geometry outputs', () => {
    it('should calculate incline length', () => {
      // height / sin(60°) = 100 / 0.866 = 115.47"
      expect(result.incline_length_in).toBeCloseTo(115.47, 0);
    });

    it('should calculate incline run', () => {
      // height / tan(60°) = 100 / 1.732 = 57.74"
      expect(result.incline_run_in).toBeCloseTo(57.74, 0);
    });

    it('should calculate horizontal length', () => {
      // infeed + run + discharge = 48 + 57.74 + 22 = 127.74"
      expect(result.horizontal_length_in).toBeCloseTo(127.74, 0);
    });

    it('should calculate path length in feet', () => {
      // (infeed + incline + discharge) / 12 = (48 + 115.47 + 22) / 12 = 15.46 ft
      expect(result.path_length_ft).toBeCloseTo(15.46, 1);
    });

    it('should calculate belt length', () => {
      // path × 2 = 15.46 × 2 = 30.91 ft
      expect(result.belt_length_ft).toBeCloseTo(30.91, 0);
    });

    it('should calculate chain length', () => {
      // ceil(belt × 12 / pitch) × pitch = ceil(30.91 × 12 / 1.0) × 1.0 = 371"
      expect(result.chain_length_in).toBe(371);
    });
  });

  describe('magnet outputs', () => {
    it('should calculate magnet weight', () => {
      // 0.22 + (12 × 0.5312) = 6.59 lb
      expect(result.magnet_weight_each_lb).toBeCloseTo(6.59, 2);
    });

    it('should calculate magnet quantity', () => {
      // floor(30.91 × 12 / 12) - 1 = 30 - 1 = 29 magnets
      expect(result.qty_magnets).toBe(29);
    });

    it('should calculate total magnet weight', () => {
      // 6.59 × 29 = 191.25 lb
      expect(result.total_magnet_weight_lb).toBeCloseTo(191.2, 0);
    });
  });

  describe('load outputs', () => {
    it('should calculate weight per foot', () => {
      // 2.0 + (191.25 / 30.91) = 2.0 + 6.19 = 8.19 lb/ft
      expect(result.weight_per_foot_lb).toBeCloseTo(8.19, 1);
    });

    it('should calculate belt pull friction', () => {
      // 8.19 × 30.91 × 0.2 = 50.6 lb
      expect(result.belt_pull_friction_lb).toBeCloseTo(50.6, 0);
    });

    it('should calculate belt pull gravity', () => {
      // (115.47 / 12) × 8.19 × sin(60°) = 9.62 × 8.19 × 0.866 = 68.2 lb
      expect(result.belt_pull_gravity_lb).toBeCloseTo(68.2, 0);
    });

    it('should set chip load to 0 (placeholder)', () => {
      expect(result.chip_load_lb).toBe(0);
    });

    it('should calculate total load', () => {
      // friction + gravity + chip = 50.6 + 68.2 + 0 = 118.8 lb
      expect(result.total_load_lb).toBeCloseTo(118.8, 0);
    });
  });

  describe('drive outputs', () => {
    it('should calculate total belt pull', () => {
      // 100 + 118.8 = 218.8 lb
      expect(result.total_belt_pull_lb).toBeCloseTo(218.8, 0);
    });

    it('should calculate running torque', () => {
      // 218.8 × (4.5 / 2) = 218.8 × 2.25 = 492.3 in-lb
      expect(result.running_torque_in_lb).toBeCloseTo(492.3, 0);
    });

    it('should calculate total torque with safety factor', () => {
      // 492.3 × 2.0 = 984.6 in-lb
      expect(result.total_torque_in_lb).toBeCloseTo(984.6, 0);
    });

    it('should calculate required RPM', () => {
      // (30 × 12) / 14 = 25.71 RPM
      expect(result.required_rpm).toBeCloseTo(25.71, 1);
    });

    it('should calculate suggested gear ratio', () => {
      // 1750 / 25.71 = 68.07
      expect(result.suggested_gear_ratio).toBeCloseTo(68.07, 0);
    });
  });

  describe('throughput outputs', () => {
    it('should return achieved throughput', () => {
      expect(result.achieved_throughput_lbs_hr).toBe(1000);
    });

    it('should return throughput margin', () => {
      expect(result.throughput_margin).toBe(1.0);
    });
  });

  describe('parameters echoed', () => {
    it('should echo coefficient of friction used', () => {
      expect(result.coefficient_of_friction_used).toBe(0.2);
    });

    it('should echo safety factor used', () => {
      expect(result.safety_factor_used).toBe(2.0);
    });

    it('should echo starting belt pull used', () => {
      expect(result.starting_belt_pull_lb_used).toBe(100);
    });

    it('should echo chain weight used', () => {
      expect(result.chain_weight_lb_per_ft_used).toBe(2.0);
    });
  });

  describe('validation', () => {
    it('should return throughput warning due to placeholder margin', () => {
      // Note: The throughput calculation is a placeholder that returns margin = 1.0
      // This triggers the "undersized for chips" warning (threshold 1.5)
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(
        result.warnings.some((w) => w.message === 'Undersized for chips')
      ).toBe(true);
    });

    it('should return empty errors array', () => {
      expect(result.errors).toEqual([]);
    });
  });
});

// ============================================================================
// MASTER CALCULATE TESTS - HEAVY DUTY CONVEYOR
// ============================================================================

describe('calculate - Heavy Duty conveyor', () => {
  let result: ReturnType<typeof calculate>;

  beforeAll(() => {
    result = calculate(heavyDutyInputs);
  });

  describe('geometry outputs', () => {
    it('should calculate incline length for 70° angle', () => {
      // height / sin(70°) = 200 / 0.9397 = 212.84"
      expect(result.incline_length_in).toBeCloseTo(212.84, 0);
    });

    it('should calculate incline run for 70° angle', () => {
      // height / tan(70°) = 200 / 2.747 = 72.83"
      expect(result.incline_run_in).toBeCloseTo(72.83, 0);
    });
  });

  describe('magnet outputs', () => {
    it('should calculate 30" magnet weight', () => {
      // 0.22 + (30 × 0.5312) = 16.156 lb
      expect(result.magnet_weight_each_lb).toBeCloseTo(16.16, 2);
    });
  });

  describe('drive outputs', () => {
    it('should use Heavy Duty sprocket PD (6.74")', () => {
      // Verify by checking torque calculation uses correct PD
      // runningTorque = beltPull × (6.74 / 2) = beltPull × 3.37
      const expectedRunningTorque = result.total_belt_pull_lb * 3.37;
      expect(result.running_torque_in_lb).toBeCloseTo(expectedRunningTorque, 0);
    });

    it('should use Heavy Duty safety factor (1.5)', () => {
      // totalTorque = runningTorque × 1.5
      const expectedTotalTorque = result.running_torque_in_lb * 1.5;
      expect(result.total_torque_in_lb).toBeCloseTo(expectedTotalTorque, 0);
    });

    it('should use Heavy Duty lead (21 in/rev)', () => {
      // requiredRPM = (30 × 12) / 21 = 17.14
      expect(result.required_rpm).toBeCloseTo(17.14, 1);
    });
  });

  describe('parameters echoed', () => {
    it('should echo Heavy Duty coefficient of friction', () => {
      expect(result.coefficient_of_friction_used).toBe(0.15);
    });

    it('should echo Heavy Duty safety factor', () => {
      expect(result.safety_factor_used).toBe(1.5);
    });

    it('should echo Heavy Duty chain weight', () => {
      expect(result.chain_weight_lb_per_ft_used).toBe(3.0);
    });
  });
});

// ============================================================================
// MASTER CALCULATE TESTS - STYLE C (HORIZONTAL)
// ============================================================================

describe('calculate - Style C horizontal', () => {
  let result: ReturnType<typeof calculate>;

  beforeAll(() => {
    result = calculate(styleCInputs);
  });

  describe('geometry outputs', () => {
    it('should have zero incline length', () => {
      expect(result.incline_length_in).toBe(0);
    });

    it('should have zero incline run', () => {
      expect(result.incline_run_in).toBe(0);
    });

    it('should calculate horizontal length as infeed only', () => {
      // For Style C: no discharge length, just infeed
      expect(result.horizontal_length_in).toBe(100);
    });

    it('should calculate path length from infeed only', () => {
      // path = infeed / 12 = 100 / 12 = 8.33 ft
      expect(result.path_length_ft).toBeCloseTo(8.33, 1);
    });

    it('should calculate belt length', () => {
      // belt = path × 2 = 8.33 × 2 = 16.67 ft
      expect(result.belt_length_ft).toBeCloseTo(16.67, 0);
    });
  });

  describe('load outputs', () => {
    it('should have zero gravity pull (horizontal)', () => {
      expect(result.belt_pull_gravity_lb).toBe(0);
    });

    it('should have total load equal to friction (no gravity)', () => {
      expect(result.total_load_lb).toBeCloseTo(result.belt_pull_friction_lb, 1);
    });
  });
});

// ============================================================================
// USER OVERRIDE TESTS
// ============================================================================

describe('calculate - with user overrides', () => {
  it('should use overridden coefficient of friction', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      coefficient_of_friction: 0.25,
    };

    const result = calculate(inputs);
    expect(result.coefficient_of_friction_used).toBe(0.25);

    // Friction should be higher with higher CoF
    const standardResult = calculate(standardInputs);
    expect(result.belt_pull_friction_lb).toBeGreaterThan(
      standardResult.belt_pull_friction_lb
    );
  });

  it('should use overridden safety factor', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      safety_factor: 2.5,
    };

    const result = calculate(inputs);
    expect(result.safety_factor_used).toBe(2.5);

    // Total torque should be higher with higher SF
    const standardResult = calculate(standardInputs);
    expect(result.total_torque_in_lb).toBeGreaterThan(
      standardResult.total_torque_in_lb
    );
  });

  it('should use overridden starting belt pull', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      starting_belt_pull_lb: 150,
    };

    const result = calculate(inputs);
    expect(result.starting_belt_pull_lb_used).toBe(150);

    // Total belt pull should be higher with higher starting pull
    const standardResult = calculate(standardInputs);
    expect(result.total_belt_pull_lb).toBeGreaterThan(
      standardResult.total_belt_pull_lb
    );
  });

  it('should use overridden chain weight', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      chain_weight_lb_per_ft: 2.5,
    };

    const result = calculate(inputs);
    expect(result.chain_weight_lb_per_ft_used).toBe(2.5);

    // Weight per foot should be higher with heavier chain
    const standardResult = calculate(standardInputs);
    expect(result.weight_per_foot_lb).toBeGreaterThan(
      standardResult.weight_per_foot_lb
    );
  });
});

// ============================================================================
// DEFAULT VALUE TESTS
// ============================================================================

describe('calculate - default values', () => {
  it('should use default discharge length when not specified', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      discharge_length_in: undefined,
    };

    const result = calculate(inputs);

    // Calculate expected horizontal length with default discharge
    // infeed + run + DEFAULT_DISCHARGE = 48 + 57.74 + 22 = 127.74
    expect(result.horizontal_length_in).toBeCloseTo(127.74, 0);
    expect(DEFAULT_DISCHARGE_LENGTH_IN).toBe(22);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('calculate - edge cases', () => {
  it('should handle 90° vertical conveyor', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      incline_angle_deg: 90,
    };

    const result = calculate(inputs);

    // Incline length = height (for 90°)
    expect(result.incline_length_in).toBe(100);

    // Incline run = 0 (vertical)
    expect(result.incline_run_in).toBe(0);

    // sin(90°) = 1, so gravity pull is maximized
    expect(result.belt_pull_gravity_lb).toBeGreaterThan(0);
  });

  it('should handle minimum belt speed (6 FPM)', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      belt_speed_fpm: 6,
    };

    const result = calculate(inputs);

    // RPM = (6 × 12) / 14 = 5.14
    expect(result.required_rpm).toBeCloseTo(5.14, 1);

    // Gear ratio = 1750 / 5.14 = 340.5
    expect(result.suggested_gear_ratio).toBeCloseTo(340.5, 0);
  });

  it('should handle maximum belt speed (120 FPM)', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      belt_speed_fpm: 120,
    };

    const result = calculate(inputs);

    // RPM = (120 × 12) / 14 = 102.86
    expect(result.required_rpm).toBeCloseTo(102.86, 1);

    // Gear ratio = 1750 / 102.86 = 17.01
    expect(result.suggested_gear_ratio).toBeCloseTo(17.01, 0);
  });

  it('should handle small magnet width (5")', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      magnet_width_in: 5,
    };

    const result = calculate(inputs);

    // weight = 0.22 + (5 × 0.5312) = 2.876 lb
    expect(result.magnet_weight_each_lb).toBeCloseTo(2.88, 2);
  });

  it('should handle large magnet centers (36")', () => {
    const inputs: MagneticInputs = {
      ...standardInputs,
      magnet_centers_in: 36,
    };

    const result = calculate(inputs);

    // Fewer magnets with larger centers
    const standardResult = calculate(standardInputs);
    expect(result.qty_magnets).toBeLessThan(standardResult.qty_magnets);
  });
});
