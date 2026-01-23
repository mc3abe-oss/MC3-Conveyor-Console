/**
 * MAGNETIC CONVEYOR v1.0 - DRIVE TESTS
 *
 * Unit tests for drive calculation functions.
 */

import {
  calculateTotalBeltPull,
  calculateRunningTorque,
  calculateTotalTorque,
  calculateRequiredRpm,
  calculateSuggestedGearRatio,
  calculateDrive,
} from '../drive';

import {
  STANDARD_PARAMS,
  HEAVY_DUTY_PARAMS,
  STARTING_BELT_PULL_LB,
  MOTOR_BASE_RPM,
} from '../constants';

// ============================================================================
// BELT PULL TESTS
// ============================================================================

describe('calculateTotalBeltPull', () => {
  describe('Standard class', () => {
    it('should add starting pull to total load for typical conveyor', () => {
      // Starting: 100 lb, Load: 117.57 lb
      // totalBeltPull = 100 + 117.57 = 217.57 lb
      const result = calculateTotalBeltPull(100, 117.57);
      expect(result).toBeCloseTo(217.57, 1);
    });

    it('should add starting pull to Style C horizontal load', () => {
      // Starting: 100 lb, Load: 22.47 lb
      // totalBeltPull = 100 + 22.47 = 122.47 lb
      const result = calculateTotalBeltPull(100, 22.47);
      expect(result).toBeCloseTo(122.47, 1);
    });
  });

  describe('Heavy Duty class', () => {
    it('should add starting pull to HD load', () => {
      // Starting: 100 lb, Load: 646.46 lb
      // totalBeltPull = 100 + 646.46 = 746.46 lb
      const result = calculateTotalBeltPull(100, 646.46);
      expect(result).toBeCloseTo(746.46, 1);
    });
  });

  describe('edge cases', () => {
    it('should return starting pull when load is zero', () => {
      const result = calculateTotalBeltPull(100, 0);
      expect(result).toBe(100);
    });

    it('should use correct starting pull constant', () => {
      expect(STARTING_BELT_PULL_LB).toBe(100);
    });
  });
});

// ============================================================================
// RUNNING TORQUE TESTS
// ============================================================================

describe('calculateRunningTorque', () => {
  describe('Standard class (4.5" sprocket PD)', () => {
    it('should calculate torque for typical conveyor', () => {
      // totalBeltPull: 217.57 lb, sprocketPD: 4.5"
      // runningTorque = 217.57 × (4.5 / 2) = 217.57 × 2.25 = 489.53 in-lb
      const result = calculateRunningTorque(217.57, 4.5);
      expect(result).toBeCloseTo(489.53, 0);
    });

    it('should calculate torque for Style C horizontal', () => {
      // totalBeltPull: 122.47 lb, sprocketPD: 4.5"
      // runningTorque = 122.47 × (4.5 / 2) = 122.47 × 2.25 = 275.56 in-lb
      const result = calculateRunningTorque(122.47, 4.5);
      expect(result).toBeCloseTo(275.56, 0);
    });

    it('should use correct Standard sprocket PD from constants', () => {
      const pd = STANDARD_PARAMS.sprocket_pitch_diameter_in;
      expect(pd).toBe(4.5);
    });
  });

  describe('Heavy Duty class (6.74" sprocket PD)', () => {
    it('should calculate torque for HD conveyor', () => {
      // totalBeltPull: 746.46 lb, sprocketPD: 6.74"
      // runningTorque = 746.46 × (6.74 / 2) = 746.46 × 3.37 = 2515.57 in-lb
      const result = calculateRunningTorque(746.46, 6.74);
      expect(result).toBeCloseTo(2515.57, 0);
    });

    it('should use correct Heavy Duty sprocket PD from constants', () => {
      const pd = HEAVY_DUTY_PARAMS.sprocket_pitch_diameter_in;
      expect(pd).toBe(6.74);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero belt pull', () => {
      const result = calculateRunningTorque(0, 4.5);
      expect(result).toBe(0);
    });

    it('should return 0 for zero sprocket diameter', () => {
      const result = calculateRunningTorque(217.57, 0);
      expect(result).toBe(0);
    });
  });
});

// ============================================================================
// TOTAL TORQUE TESTS
// ============================================================================

describe('calculateTotalTorque', () => {
  describe('Standard class (SF = 2.0)', () => {
    it('should apply safety factor to running torque', () => {
      // runningTorque: 489.53 in-lb, SF: 2.0
      // totalTorque = 489.53 × 2.0 = 979.06 in-lb
      const result = calculateTotalTorque(489.53, 2.0);
      expect(result).toBeCloseTo(979.06, 0);
    });

    it('should calculate total torque for Style C', () => {
      // runningTorque: 275.56 in-lb, SF: 2.0
      // totalTorque = 275.56 × 2.0 = 551.12 in-lb
      const result = calculateTotalTorque(275.56, 2.0);
      expect(result).toBeCloseTo(551.12, 0);
    });

    it('should use correct Standard safety factor from constants', () => {
      const sf = STANDARD_PARAMS.safety_factor;
      expect(sf).toBe(2.0);
    });
  });

  describe('Heavy Duty class (SF = 1.5)', () => {
    it('should apply safety factor to HD running torque', () => {
      // runningTorque: 2515.57 in-lb, SF: 1.5
      // totalTorque = 2515.57 × 1.5 = 3773.36 in-lb
      const result = calculateTotalTorque(2515.57, 1.5);
      expect(result).toBeCloseTo(3773.36, 0);
    });

    it('should use correct Heavy Duty safety factor from constants', () => {
      const sf = HEAVY_DUTY_PARAMS.safety_factor;
      expect(sf).toBe(1.5);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero running torque', () => {
      const result = calculateTotalTorque(0, 2.0);
      expect(result).toBe(0);
    });

    it('should return running torque for SF of 1.0', () => {
      const result = calculateTotalTorque(500, 1.0);
      expect(result).toBe(500);
    });
  });
});

// ============================================================================
// REQUIRED RPM TESTS
// ============================================================================

describe('calculateRequiredRpm', () => {
  describe('Standard class (lead = 14 in/rev)', () => {
    it('should calculate RPM for 30 FPM belt speed (reference example)', () => {
      // beltSpeed: 30 FPM, lead: 14 in/rev
      // requiredRPM = (30 × 12) / 14 = 360 / 14 = 25.71 RPM
      const result = calculateRequiredRpm(30, 14);
      expect(result).toBeCloseTo(25.71, 1);
    });

    it('should calculate RPM for 60 FPM belt speed', () => {
      // beltSpeed: 60 FPM, lead: 14 in/rev
      // requiredRPM = (60 × 12) / 14 = 720 / 14 = 51.43 RPM
      const result = calculateRequiredRpm(60, 14);
      expect(result).toBeCloseTo(51.43, 1);
    });

    it('should calculate RPM for 120 FPM belt speed (max warning)', () => {
      // beltSpeed: 120 FPM, lead: 14 in/rev
      // requiredRPM = (120 × 12) / 14 = 1440 / 14 = 102.86 RPM
      const result = calculateRequiredRpm(120, 14);
      expect(result).toBeCloseTo(102.86, 1);
    });

    it('should calculate RPM for 6 FPM belt speed (min)', () => {
      // beltSpeed: 6 FPM, lead: 14 in/rev
      // requiredRPM = (6 × 12) / 14 = 72 / 14 = 5.14 RPM
      const result = calculateRequiredRpm(6, 14);
      expect(result).toBeCloseTo(5.14, 1);
    });

    it('should use correct Standard lead from constants', () => {
      const lead = STANDARD_PARAMS.lead_in_per_rev;
      expect(lead).toBe(14);
    });
  });

  describe('Heavy Duty class (lead = 21 in/rev)', () => {
    it('should calculate RPM for 30 FPM belt speed', () => {
      // beltSpeed: 30 FPM, lead: 21 in/rev
      // requiredRPM = (30 × 12) / 21 = 360 / 21 = 17.14 RPM
      const result = calculateRequiredRpm(30, 21);
      expect(result).toBeCloseTo(17.14, 1);
    });

    it('should calculate RPM for 60 FPM belt speed', () => {
      // beltSpeed: 60 FPM, lead: 21 in/rev
      // requiredRPM = (60 × 12) / 21 = 720 / 21 = 34.29 RPM
      const result = calculateRequiredRpm(60, 21);
      expect(result).toBeCloseTo(34.29, 1);
    });

    it('should use correct Heavy Duty lead from constants', () => {
      const lead = HEAVY_DUTY_PARAMS.lead_in_per_rev;
      expect(lead).toBe(21);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero belt speed', () => {
      const result = calculateRequiredRpm(0, 14);
      expect(result).toBe(0);
    });

    it('should return 0 for zero lead (invalid)', () => {
      const result = calculateRequiredRpm(30, 0);
      expect(result).toBe(0);
    });

    it('should return 0 for negative lead (invalid)', () => {
      const result = calculateRequiredRpm(30, -14);
      expect(result).toBe(0);
    });
  });
});

// ============================================================================
// GEAR RATIO TESTS
// ============================================================================

describe('calculateSuggestedGearRatio', () => {
  describe('Standard class', () => {
    it('should calculate gear ratio for 30 FPM (reference example)', () => {
      // motorRPM: 1750, requiredRPM: 25.71
      // gearRatio = 1750 / 25.71 = 68.07:1
      const result = calculateSuggestedGearRatio(1750, 25.71);
      expect(result).toBeCloseTo(68.07, 0);
    });

    it('should calculate gear ratio for 60 FPM', () => {
      // motorRPM: 1750, requiredRPM: 51.43
      // gearRatio = 1750 / 51.43 = 34.03:1
      const result = calculateSuggestedGearRatio(1750, 51.43);
      expect(result).toBeCloseTo(34.03, 0);
    });

    it('should calculate gear ratio for 120 FPM', () => {
      // motorRPM: 1750, requiredRPM: 102.86
      // gearRatio = 1750 / 102.86 = 17.01:1
      const result = calculateSuggestedGearRatio(1750, 102.86);
      expect(result).toBeCloseTo(17.01, 0);
    });
  });

  describe('Heavy Duty class', () => {
    it('should calculate gear ratio for 30 FPM', () => {
      // motorRPM: 1750, requiredRPM: 17.14
      // gearRatio = 1750 / 17.14 = 102.10:1
      const result = calculateSuggestedGearRatio(1750, 17.14);
      expect(result).toBeCloseTo(102.10, 0);
    });

    it('should calculate gear ratio for 60 FPM', () => {
      // motorRPM: 1750, requiredRPM: 34.29
      // gearRatio = 1750 / 34.29 = 51.03:1
      const result = calculateSuggestedGearRatio(1750, 34.29);
      expect(result).toBeCloseTo(51.03, 0);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero required RPM', () => {
      const result = calculateSuggestedGearRatio(1750, 0);
      expect(result).toBe(0);
    });

    it('should return 0 for negative required RPM', () => {
      const result = calculateSuggestedGearRatio(1750, -25);
      expect(result).toBe(0);
    });

    it('should use correct motor base RPM constant', () => {
      expect(MOTOR_BASE_RPM).toBe(1750);
    });
  });
});

// ============================================================================
// COMPOSITE CALCULATION TESTS
// ============================================================================

describe('calculateDrive', () => {
  it('should calculate all drive values for typical Standard conveyor', () => {
    // Starting: 100 lb, Load: 117.57 lb, PD: 4.5", SF: 2.0
    // Belt speed: 30 FPM, Lead: 14 in/rev, Motor: 1750 RPM
    const result = calculateDrive(100, 117.57, 4.5, 2.0, 30, 14, 1750);

    // totalBeltPull = 100 + 117.57 = 217.57 lb
    expect(result.total_belt_pull_lb).toBeCloseTo(217.57, 1);

    // runningTorque = 217.57 × 2.25 = 489.53 in-lb
    expect(result.running_torque_in_lb).toBeCloseTo(489.53, 0);

    // totalTorque = 489.53 × 2.0 = 979.06 in-lb
    expect(result.total_torque_in_lb).toBeCloseTo(979.06, 0);

    // requiredRPM = (30 × 12) / 14 = 25.71 RPM
    expect(result.required_rpm).toBeCloseTo(25.71, 1);

    // gearRatio = 1750 / 25.71 = 68.07
    expect(result.suggested_gear_ratio).toBeCloseTo(68.07, 0);
  });

  it('should calculate all drive values for Style C horizontal', () => {
    // Starting: 100 lb, Load: 22.47 lb, PD: 4.5", SF: 2.0
    // Belt speed: 45 FPM, Lead: 14 in/rev, Motor: 1750 RPM
    const result = calculateDrive(100, 22.47, 4.5, 2.0, 45, 14, 1750);

    // totalBeltPull = 100 + 22.47 = 122.47 lb
    expect(result.total_belt_pull_lb).toBeCloseTo(122.47, 1);

    // runningTorque = 122.47 × 2.25 = 275.56 in-lb
    expect(result.running_torque_in_lb).toBeCloseTo(275.56, 0);

    // totalTorque = 275.56 × 2.0 = 551.12 in-lb
    expect(result.total_torque_in_lb).toBeCloseTo(551.12, 0);

    // requiredRPM = (45 × 12) / 14 = 38.57 RPM
    expect(result.required_rpm).toBeCloseTo(38.57, 1);

    // gearRatio = 1750 / 38.57 = 45.37
    expect(result.suggested_gear_ratio).toBeCloseTo(45.37, 0);
  });

  it('should calculate all drive values for Heavy Duty conveyor', () => {
    // Starting: 100 lb, Load: 646.46 lb, PD: 6.74", SF: 1.5
    // Belt speed: 30 FPM, Lead: 21 in/rev, Motor: 1750 RPM
    const result = calculateDrive(100, 646.46, 6.74, 1.5, 30, 21, 1750);

    // totalBeltPull = 100 + 646.46 = 746.46 lb
    expect(result.total_belt_pull_lb).toBeCloseTo(746.46, 1);

    // runningTorque = 746.46 × 3.37 = 2515.57 in-lb
    expect(result.running_torque_in_lb).toBeCloseTo(2515.57, 0);

    // totalTorque = 2515.57 × 1.5 = 3773.36 in-lb
    expect(result.total_torque_in_lb).toBeCloseTo(3773.36, 0);

    // requiredRPM = (30 × 12) / 21 = 17.14 RPM
    expect(result.required_rpm).toBeCloseTo(17.14, 1);

    // gearRatio = 1750 / 17.14 = 102.10
    expect(result.suggested_gear_ratio).toBeCloseTo(102.10, 0);
  });

  it('should calculate for high speed conveyor (120 FPM)', () => {
    // Starting: 100 lb, Load: 50 lb, PD: 4.5", SF: 2.0
    // Belt speed: 120 FPM, Lead: 14 in/rev, Motor: 1750 RPM
    const result = calculateDrive(100, 50, 4.5, 2.0, 120, 14, 1750);

    // totalBeltPull = 100 + 50 = 150 lb
    expect(result.total_belt_pull_lb).toBe(150);

    // runningTorque = 150 × 2.25 = 337.5 in-lb
    expect(result.running_torque_in_lb).toBe(337.5);

    // totalTorque = 337.5 × 2.0 = 675 in-lb
    expect(result.total_torque_in_lb).toBe(675);

    // requiredRPM = (120 × 12) / 14 = 102.86 RPM
    expect(result.required_rpm).toBeCloseTo(102.86, 1);

    // gearRatio = 1750 / 102.86 = 17.01
    expect(result.suggested_gear_ratio).toBeCloseTo(17.01, 0);
  });

  it('should calculate for low speed conveyor (6 FPM)', () => {
    // Starting: 100 lb, Load: 200 lb, PD: 4.5", SF: 2.0
    // Belt speed: 6 FPM, Lead: 14 in/rev, Motor: 1750 RPM
    const result = calculateDrive(100, 200, 4.5, 2.0, 6, 14, 1750);

    // totalBeltPull = 100 + 200 = 300 lb
    expect(result.total_belt_pull_lb).toBe(300);

    // runningTorque = 300 × 2.25 = 675 in-lb
    expect(result.running_torque_in_lb).toBe(675);

    // totalTorque = 675 × 2.0 = 1350 in-lb
    expect(result.total_torque_in_lb).toBe(1350);

    // requiredRPM = (6 × 12) / 14 = 5.14 RPM
    expect(result.required_rpm).toBeCloseTo(5.14, 1);

    // gearRatio = 1750 / 5.14 = 340.5
    expect(result.suggested_gear_ratio).toBeCloseTo(340.5, 0);
  });

  it('should handle edge case with zero load', () => {
    const result = calculateDrive(100, 0, 4.5, 2.0, 30, 14, 1750);

    expect(result.total_belt_pull_lb).toBe(100);
    expect(result.running_torque_in_lb).toBe(225); // 100 × 2.25
    expect(result.total_torque_in_lb).toBe(450); // 225 × 2.0
    expect(result.required_rpm).toBeCloseTo(25.71, 1);
    expect(result.suggested_gear_ratio).toBeCloseTo(68.07, 0);
  });
});
