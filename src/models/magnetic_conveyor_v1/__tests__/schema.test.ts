/**
 * MAGNETIC CONVEYOR v1.0 - SCHEMA TESTS
 *
 * Tests for type definitions, enums, and constants.
 */

import {
  // Enums
  ConveyorStyle,
  ConveyorClass,
  MagnetType,
  ChipType,
  MaterialType,
  TemperatureClass,
  FluidType,
  ChipDelivery,
  SupportType,
  MagnetCenters,
  // Labels
  CONVEYOR_STYLE_LABELS,
  CONVEYOR_CLASS_LABELS,
  MAGNET_TYPE_LABELS,
  CHIP_TYPE_LABELS,
  MATERIAL_TYPE_LABELS,
  TEMPERATURE_CLASS_LABELS,
  FLUID_TYPE_LABELS,
  CHIP_DELIVERY_LABELS,
  SUPPORT_TYPE_LABELS,
  MAGNET_CENTERS_LABELS,
  // Types
  MagneticInputs,
  MagneticParameters,
  MagneticOutputs,
} from '../schema';

import {
  STANDARD_PARAMS,
  HEAVY_DUTY_PARAMS,
  MAGNET_WEIGHT_INTERCEPT,
  MAGNET_WEIGHT_SLOPE,
  STARTING_BELT_PULL_LB,
  MOTOR_BASE_RPM,
  getParametersForClass,
  HEAVY_DUTY_THRESHOLDS,
  STANDARD_MAGNET_WIDTHS_IN,
} from '../constants';

// ============================================================================
// ENUM TESTS
// ============================================================================

describe('ConveyorStyle enum', () => {
  it('should have 4 styles', () => {
    expect(Object.keys(ConveyorStyle)).toHaveLength(4);
  });

  it('should have correct values', () => {
    expect(ConveyorStyle.A).toBe('A');
    expect(ConveyorStyle.B).toBe('B');
    expect(ConveyorStyle.C).toBe('C');
    expect(ConveyorStyle.D).toBe('D');
  });

  it('should have labels for all values', () => {
    Object.values(ConveyorStyle).forEach((style) => {
      expect(CONVEYOR_STYLE_LABELS[style]).toBeDefined();
      expect(typeof CONVEYOR_STYLE_LABELS[style]).toBe('string');
    });
  });
});

describe('ConveyorClass enum', () => {
  it('should have 2 classes', () => {
    expect(Object.keys(ConveyorClass)).toHaveLength(2);
  });

  it('should have correct values', () => {
    expect(ConveyorClass.Standard).toBe('standard');
    expect(ConveyorClass.HeavyDuty).toBe('heavy_duty');
  });

  it('should have labels for all values', () => {
    Object.values(ConveyorClass).forEach((cls) => {
      expect(CONVEYOR_CLASS_LABELS[cls]).toBeDefined();
    });
  });
});

describe('MagnetType enum', () => {
  it('should have 4 types', () => {
    expect(Object.keys(MagnetType)).toHaveLength(4);
  });

  it('should have labels for all values', () => {
    Object.values(MagnetType).forEach((type) => {
      expect(MAGNET_TYPE_LABELS[type]).toBeDefined();
    });
  });
});

describe('ChipType enum', () => {
  it('should have 6 types', () => {
    expect(Object.keys(ChipType)).toHaveLength(6);
  });

  it('should include stringers and bird_nests (warning triggers)', () => {
    expect(ChipType.Stringers).toBe('stringers');
    expect(ChipType.BirdNests).toBe('bird_nests');
  });

  it('should have labels for all values', () => {
    Object.values(ChipType).forEach((type) => {
      expect(CHIP_TYPE_LABELS[type]).toBeDefined();
    });
  });
});

describe('MaterialType enum', () => {
  it('should have 4 types', () => {
    expect(Object.keys(MaterialType)).toHaveLength(4);
  });

  it('should include non-magnetic materials (error triggers)', () => {
    expect(MaterialType.Aluminum).toBe('aluminum');
    expect(MaterialType.StainlessSteel).toBe('stainless_steel');
  });

  it('should have labels for all values', () => {
    Object.values(MaterialType).forEach((type) => {
      expect(MATERIAL_TYPE_LABELS[type]).toBeDefined();
    });
  });
});

describe('TemperatureClass enum', () => {
  it('should have 3 classes', () => {
    expect(Object.keys(TemperatureClass)).toHaveLength(3);
  });

  it('should include red_hot (warning trigger)', () => {
    expect(TemperatureClass.RedHot).toBe('red_hot');
  });

  it('should have labels for all values', () => {
    Object.values(TemperatureClass).forEach((cls) => {
      expect(TEMPERATURE_CLASS_LABELS[cls]).toBeDefined();
    });
  });
});

describe('MagnetCenters enum', () => {
  it('should have 4 options', () => {
    // Numeric enums have reverse mapping, so filter to just the string keys
    const options = Object.keys(MagnetCenters).filter((k) => isNaN(Number(k)));
    expect(options).toHaveLength(4);
  });

  it('should have correct numeric values', () => {
    expect(MagnetCenters.Twelve).toBe(12);
    expect(MagnetCenters.Eighteen).toBe(18);
    expect(MagnetCenters.TwentyFour).toBe(24);
    expect(MagnetCenters.ThirtySix).toBe(36);
  });

  it('should have labels for all values', () => {
    Object.values(MagnetCenters)
      .filter((v) => typeof v === 'number')
      .forEach((centers) => {
        expect(MAGNET_CENTERS_LABELS[centers as MagnetCenters]).toBeDefined();
      });
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('STANDARD_PARAMS', () => {
  it('should have correct chain parameters', () => {
    expect(STANDARD_PARAMS.chain_pitch_in).toBe(1.0);
    expect(STANDARD_PARAMS.chain_weight_lb_per_ft).toBe(2.0);
  });

  it('should have correct sprocket parameters', () => {
    expect(STANDARD_PARAMS.sprocket_pitch_diameter_in).toBe(4.5);
    expect(STANDARD_PARAMS.head_sprocket_teeth).toBe(28);
    expect(STANDARD_PARAMS.tail_sprocket_teeth).toBe(16);
  });

  it('should have correct drive parameters', () => {
    expect(STANDARD_PARAMS.lead_in_per_rev).toBe(14);
    expect(STANDARD_PARAMS.motor_base_rpm).toBe(1750);
  });

  it('should have correct calculation factors', () => {
    expect(STANDARD_PARAMS.coefficient_of_friction).toBe(0.2);
    expect(STANDARD_PARAMS.safety_factor).toBe(2.0);
    expect(STANDARD_PARAMS.starting_belt_pull_lb).toBe(100);
  });
});

describe('HEAVY_DUTY_PARAMS', () => {
  it('should have correct chain parameters', () => {
    expect(HEAVY_DUTY_PARAMS.chain_pitch_in).toBe(1.5);
    expect(HEAVY_DUTY_PARAMS.chain_weight_lb_per_ft).toBe(3.0);
  });

  it('should have correct sprocket parameters', () => {
    expect(HEAVY_DUTY_PARAMS.sprocket_pitch_diameter_in).toBe(6.74);
    expect(HEAVY_DUTY_PARAMS.head_sprocket_teeth).toBe(28);
    expect(HEAVY_DUTY_PARAMS.tail_sprocket_teeth).toBe(14);
  });

  it('should have correct drive parameters', () => {
    expect(HEAVY_DUTY_PARAMS.lead_in_per_rev).toBe(21);
    expect(HEAVY_DUTY_PARAMS.motor_base_rpm).toBe(1750);
  });

  it('should have correct calculation factors', () => {
    expect(HEAVY_DUTY_PARAMS.coefficient_of_friction).toBe(0.15);
    expect(HEAVY_DUTY_PARAMS.safety_factor).toBe(1.5);
    expect(HEAVY_DUTY_PARAMS.starting_belt_pull_lb).toBe(100);
  });
});

describe('Magnet weight constants', () => {
  it('should have correct REV-1 formula constants', () => {
    expect(MAGNET_WEIGHT_INTERCEPT).toBe(0.22);
    expect(MAGNET_WEIGHT_SLOPE).toBe(0.5312);
  });

  it('should calculate expected weight for 12" magnet', () => {
    const weight = MAGNET_WEIGHT_INTERCEPT + 12 * MAGNET_WEIGHT_SLOPE;
    expect(weight).toBeCloseTo(6.5944, 4);
  });

  it('should calculate expected weight for 30" magnet', () => {
    const weight = MAGNET_WEIGHT_INTERCEPT + 30 * MAGNET_WEIGHT_SLOPE;
    expect(weight).toBeCloseTo(16.156, 3);
  });
});

describe('Shared constants', () => {
  it('should have correct starting belt pull', () => {
    expect(STARTING_BELT_PULL_LB).toBe(100);
  });

  it('should have correct motor base RPM', () => {
    expect(MOTOR_BASE_RPM).toBe(1750);
  });
});

describe('getParametersForClass', () => {
  it('should return STANDARD_PARAMS for Standard class', () => {
    const params = getParametersForClass(ConveyorClass.Standard);
    expect(params).toBe(STANDARD_PARAMS);
  });

  it('should return HEAVY_DUTY_PARAMS for HeavyDuty class', () => {
    const params = getParametersForClass(ConveyorClass.HeavyDuty);
    expect(params).toBe(HEAVY_DUTY_PARAMS);
  });
});

describe('HEAVY_DUTY_THRESHOLDS', () => {
  it('should have correct threshold values', () => {
    expect(HEAVY_DUTY_THRESHOLDS.magnet_width_in).toBe(24);
    expect(HEAVY_DUTY_THRESHOLDS.load_lbs_per_hr).toBe(5000);
    expect(HEAVY_DUTY_THRESHOLDS.discharge_height_in).toBe(200);
    expect(HEAVY_DUTY_THRESHOLDS.chain_length_in).toBe(500);
  });
});

describe('STANDARD_MAGNET_WIDTHS_IN', () => {
  it('should include all standard widths from reference doc', () => {
    expect(STANDARD_MAGNET_WIDTHS_IN).toContain(5);
    expect(STANDARD_MAGNET_WIDTHS_IN).toContain(6);
    expect(STANDARD_MAGNET_WIDTHS_IN).toContain(12);
    expect(STANDARD_MAGNET_WIDTHS_IN).toContain(24);
    expect(STANDARD_MAGNET_WIDTHS_IN).toContain(30);
  });

  it('should have 13 standard widths', () => {
    expect(STANDARD_MAGNET_WIDTHS_IN).toHaveLength(13);
  });
});

// ============================================================================
// TYPE STRUCTURE TESTS
// ============================================================================

describe('MagneticInputs interface', () => {
  it('should accept valid input object', () => {
    const validInputs: MagneticInputs = {
      style: ConveyorStyle.B,
      conveyor_class: ConveyorClass.Standard,
      infeed_length_in: 39,
      discharge_height_in: 100,
      incline_angle_deg: 60,
      magnet_width_in: 12,
      magnet_type: MagnetType.Ceramic8,
      magnet_centers_in: 12,
      belt_speed_fpm: 30,
      load_lbs_per_hr: 1000,
      material_type: MaterialType.Steel,
      chip_type: ChipType.Small,
    };

    // TypeScript compilation is the test - this should compile without errors
    expect(validInputs.style).toBe(ConveyorStyle.B);
    expect(validInputs.conveyor_class).toBe(ConveyorClass.Standard);
  });

  it('should accept optional overrides', () => {
    const inputsWithOverrides: MagneticInputs = {
      style: ConveyorStyle.A,
      conveyor_class: ConveyorClass.Standard,
      infeed_length_in: 39,
      discharge_height_in: 100,
      incline_angle_deg: 60,
      magnet_width_in: 12,
      magnet_type: MagnetType.Ceramic8,
      magnet_centers_in: 12,
      belt_speed_fpm: 30,
      load_lbs_per_hr: 1000,
      material_type: MaterialType.Steel,
      chip_type: ChipType.Small,
      // Optional overrides
      coefficient_of_friction: 0.25,
      safety_factor: 2.5,
      starting_belt_pull_lb: 150,
      discharge_length_in: 24,
    };

    expect(inputsWithOverrides.coefficient_of_friction).toBe(0.25);
    expect(inputsWithOverrides.safety_factor).toBe(2.5);
  });
});

describe('MagneticParameters interface', () => {
  it('should have all required fields in STANDARD_PARAMS', () => {
    const params: MagneticParameters = STANDARD_PARAMS;

    expect(params.chain_pitch_in).toBeDefined();
    expect(params.chain_weight_lb_per_ft).toBeDefined();
    expect(params.sprocket_pitch_diameter_in).toBeDefined();
    expect(params.lead_in_per_rev).toBeDefined();
    expect(params.coefficient_of_friction).toBeDefined();
    expect(params.safety_factor).toBeDefined();
    expect(params.starting_belt_pull_lb).toBeDefined();
    expect(params.motor_base_rpm).toBeDefined();
    expect(params.head_sprocket_teeth).toBeDefined();
    expect(params.tail_sprocket_teeth).toBeDefined();
  });
});

describe('MagneticOutputs interface', () => {
  it('should define all expected output fields', () => {
    // This is a compile-time check - we create a partial object
    // to verify the interface structure
    const partialOutputs: Partial<MagneticOutputs> = {
      incline_length_in: 115.47,
      incline_run_in: 57.74,
      horizontal_length_in: 118.74,
      path_length_ft: 14.71,
      belt_length_ft: 29.42,
      chain_length_in: 354,
      magnet_weight_each_lb: 6.59,
      qty_magnets: 28,
      total_magnet_weight_lb: 184.52,
      weight_per_foot_lb: 8.27,
      belt_pull_friction_lb: 48.67,
      belt_pull_gravity_lb: 68.90,
      chip_load_lb: 0,
      total_load_lb: 117.57,
      total_belt_pull_lb: 217.57,
      running_torque_in_lb: 489.53,
      total_torque_in_lb: 979.07,
      required_rpm: 25.71,
      suggested_gear_ratio: 68.06,
      achieved_throughput_lbs_hr: 0,
      throughput_margin: 0,
      coefficient_of_friction_used: 0.2,
      safety_factor_used: 2.0,
      starting_belt_pull_lb_used: 100,
      chain_weight_lb_per_ft_used: 2.0,
      warnings: [],
      errors: [],
    };

    expect(partialOutputs.total_torque_in_lb).toBeCloseTo(979.07, 1);
  });
});
