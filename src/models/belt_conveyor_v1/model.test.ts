/**
 * BELT CONVEYOR v1.0 - REGRESSION TESTS
 *
 * These tests ensure:
 * 1. Legacy sliderbed configs produce identical outputs (no math drift)
 * 2. New bed_type='slider_bed' matches legacy behavior exactly
 * 3. Roller bed changes COF correctly
 * 4. Premium flags work correctly
 * 5. COF override precedence is correct
 */

import {
  calculate,
  calculateBeltConveyor,
  BedType,
  PremiumLevel,
  DEFAULT_PARAMETERS,
  BeltConveyorInputs,
  resolveEffectiveCOF,
  resolveBedType,
  resolveModelKey,
  isLegacyModelKey,
  migrateLegacyInputs,
  calculatePremiumFlags,
} from './index';

import { calculate as sliderbedCalculate } from '../sliderbed_v1/formulas';
import {
  SliderbedInputs,
  DEFAULT_PARAMETERS as SLIDERBED_DEFAULT_PARAMETERS,
  Orientation,
  BeltTrackingMethod,
  DirectionMode,
  SideLoadingDirection,
  MaterialType,
  ProcessType,
  PartsSharp,
  EnvironmentFactors,
  FluidType,
  PartTemperatureClass,
  AmbientTemperature,
  PowerFeed,
  ControlsPackage,
  SpecSource,
  SupportOption,
  FieldWiringRequired,
  BearingGrade,
  DocumentationPackage,
  FinishPaintSystem,
  LabelsRequired,
  SendToEstimating,
  MotorBrand,
  SideRails,
  EndGuards,
  LacingStyle,
  PulleySurfaceType,
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  ShaftDiameterMode,
} from '../sliderbed_v1/schema';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Standard legacy sliderbed config (no bed_type field)
 */
const LEGACY_SLIDERBED_INPUTS: SliderbedInputs = {
  // Geometry
  conveyor_length_cc_in: 120,
  belt_width_in: 24,
  pulley_diameter_in: 4,
  conveyor_incline_deg: 0,

  // Speed
  belt_speed_fpm: 50,
  drive_rpm: 100,

  // Product
  part_weight_lbs: 5,
  part_length_in: 12,
  part_width_in: 6,
  drop_height_in: 0,
  part_temperature_class: PartTemperatureClass.Ambient,
  fluid_type: FluidType.None,
  orientation: Orientation.Lengthwise,
  part_spacing_in: 6,

  // Application
  material_type: MaterialType.Steel,
  process_type: ProcessType.Assembly,
  parts_sharp: PartsSharp.No,
  environment_factors: [],
  ambient_temperature: AmbientTemperature.Normal,
  power_feed: PowerFeed.V480_3Ph,
  controls_package: ControlsPackage.StartStop,
  spec_source: SpecSource.Standard,
  support_option: SupportOption.FloorMounted,
  field_wiring_required: FieldWiringRequired.No,
  bearing_grade: BearingGrade.Standard,
  documentation_package: DocumentationPackage.Basic,
  finish_paint_system: FinishPaintSystem.PowderCoat,
  labels_required: LabelsRequired.Yes,
  send_to_estimating: SendToEstimating.No,
  motor_brand: MotorBrand.Standard,

  // Features
  bottom_covers: false,
  side_rails: SideRails.None,
  end_guards: EndGuards.None,
  finger_safe: false,
  lacing_style: LacingStyle.Endless,
  side_skirts: false,
  sensor_options: [],

  // Application / Demand
  pulley_surface_type: PulleySurfaceType.Plain,
  start_stop_application: false,
  direction_mode: DirectionMode.OneDirection,
  side_loading_direction: SideLoadingDirection.None,

  // Specifications
  drive_location: DriveLocation.Head,
  brake_motor: false,
  gearmotor_orientation: GearmotorOrientation.SideMount,
  drive_hand: DriveHand.RightHand,

  // Belt tracking
  belt_tracking_method: BeltTrackingMethod.Crowned,
  shaft_diameter_mode: ShaftDiameterMode.Calculated,
};

// ============================================================================
// MODEL KEY RESOLUTION TESTS
// ============================================================================

describe('Model Key Resolution', () => {
  it('should resolve sliderbed_conveyor_v1 to belt_conveyor_v1', () => {
    expect(resolveModelKey('sliderbed_conveyor_v1')).toBe('belt_conveyor_v1');
  });

  it('should pass through belt_conveyor_v1 unchanged', () => {
    expect(resolveModelKey('belt_conveyor_v1')).toBe('belt_conveyor_v1');
  });

  it('should pass through unknown model keys unchanged', () => {
    expect(resolveModelKey('some_other_model_v1')).toBe('some_other_model_v1');
  });

  it('should identify legacy model keys', () => {
    expect(isLegacyModelKey('sliderbed_conveyor_v1')).toBe(true);
    expect(isLegacyModelKey('belt_conveyor_v1')).toBe(false);
  });
});

// ============================================================================
// LEGACY INPUT MIGRATION TESTS
// ============================================================================

describe('Legacy Input Migration', () => {
  it('should add bed_type=slider_bed to legacy inputs', () => {
    const migrated = migrateLegacyInputs(LEGACY_SLIDERBED_INPUTS);
    expect(migrated.bed_type).toBe(BedType.SliderBed);
  });

  it('should preserve all original fields', () => {
    const migrated = migrateLegacyInputs(LEGACY_SLIDERBED_INPUTS);
    expect(migrated.conveyor_length_cc_in).toBe(120);
    expect(migrated.belt_width_in).toBe(24);
    expect(migrated.part_weight_lbs).toBe(5);
  });
});

// ============================================================================
// BED TYPE RESOLUTION TESTS
// ============================================================================

describe('Bed Type Resolution', () => {
  it('should default to slider_bed when undefined', () => {
    expect(resolveBedType(undefined)).toBe(BedType.SliderBed);
  });

  it('should resolve slider_bed string', () => {
    expect(resolveBedType('slider_bed')).toBe(BedType.SliderBed);
  });

  it('should resolve roller_bed string', () => {
    expect(resolveBedType('roller_bed')).toBe(BedType.RollerBed);
  });

  it('should resolve enum values', () => {
    expect(resolveBedType(BedType.SliderBed)).toBe(BedType.SliderBed);
    expect(resolveBedType(BedType.RollerBed)).toBe(BedType.RollerBed);
    expect(resolveBedType(BedType.Other)).toBe(BedType.Other);
  });

  it('should fallback to slider_bed for unknown values', () => {
    expect(resolveBedType('unknown' as any)).toBe(BedType.SliderBed);
  });
});

// ============================================================================
// COF RESOLUTION TESTS
// ============================================================================

describe('COF Resolution', () => {
  const baseInputs: BeltConveyorInputs = {
    ...LEGACY_SLIDERBED_INPUTS,
  };

  it('should use slider_bed COF (0.25) when bed_type is undefined', () => {
    const cof = resolveEffectiveCOF(baseInputs, DEFAULT_PARAMETERS);
    expect(cof).toBe(0.25);
  });

  it('should use slider_bed COF (0.25) when bed_type is slider_bed', () => {
    const inputs = { ...baseInputs, bed_type: BedType.SliderBed };
    const cof = resolveEffectiveCOF(inputs, DEFAULT_PARAMETERS);
    expect(cof).toBe(0.25);
  });

  it('should use roller_bed COF (0.03) when bed_type is roller_bed', () => {
    const inputs = { ...baseInputs, bed_type: BedType.RollerBed };
    const cof = resolveEffectiveCOF(inputs, DEFAULT_PARAMETERS);
    expect(cof).toBe(0.03);
  });

  it('should use explicit friction_coeff override over bed_type default', () => {
    const inputs = {
      ...baseInputs,
      bed_type: BedType.RollerBed, // Would default to 0.03
      friction_coeff: 0.15, // Explicit override
    };
    const cof = resolveEffectiveCOF(inputs, DEFAULT_PARAMETERS);
    expect(cof).toBe(0.15);
  });
});

// ============================================================================
// LEGACY EQUIVALENCE TESTS (No Math Drift)
// ============================================================================

describe('Legacy Equivalence - No Math Drift', () => {
  it('should produce identical outputs for legacy sliderbed vs belt_conveyor with slider_bed', () => {
    // Run legacy sliderbed calculation
    const legacyResult = sliderbedCalculate(LEGACY_SLIDERBED_INPUTS, SLIDERBED_DEFAULT_PARAMETERS);

    // Run belt_conveyor calculation with explicit slider_bed
    const beltInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
    };
    const beltResult = calculate(beltInputs, DEFAULT_PARAMETERS);

    // All core outputs must match exactly
    expect(beltResult.friction_coeff_used).toBe(legacyResult.friction_coeff_used);
    expect(beltResult.friction_pull_lb).toBe(legacyResult.friction_pull_lb);
    expect(beltResult.total_belt_pull_lb).toBe(legacyResult.total_belt_pull_lb);
    expect(beltResult.torque_drive_shaft_inlbf).toBe(legacyResult.torque_drive_shaft_inlbf);
    expect(beltResult.parts_on_belt).toBe(legacyResult.parts_on_belt);
    expect(beltResult.belt_weight_lbf).toBe(legacyResult.belt_weight_lbf);
    expect(beltResult.total_load_lbf).toBe(legacyResult.total_load_lbf);
  });

  it('should produce identical outputs when bed_type is undefined (legacy behavior)', () => {
    // Run legacy sliderbed calculation
    const legacyResult = sliderbedCalculate(LEGACY_SLIDERBED_INPUTS, SLIDERBED_DEFAULT_PARAMETERS);

    // Run belt_conveyor calculation without bed_type (simulates legacy config)
    const beltInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      // NO bed_type field
    };
    const beltResult = calculate(beltInputs, DEFAULT_PARAMETERS);

    // All core outputs must match exactly
    expect(beltResult.friction_coeff_used).toBe(legacyResult.friction_coeff_used);
    expect(beltResult.friction_pull_lb).toBe(legacyResult.friction_pull_lb);
    expect(beltResult.total_belt_pull_lb).toBe(legacyResult.total_belt_pull_lb);
  });
});

// ============================================================================
// ROLLER BED COF CHANGE TESTS
// ============================================================================

describe('Roller Bed COF Changes Math', () => {
  it('should use lower friction coefficient for roller bed', () => {
    const sliderInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
    };
    const rollerInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.RollerBed,
    };

    const sliderResult = calculate(sliderInputs, DEFAULT_PARAMETERS);
    const rollerResult = calculate(rollerInputs, DEFAULT_PARAMETERS);

    expect(sliderResult.friction_coeff_used).toBe(0.25);
    expect(rollerResult.friction_coeff_used).toBe(0.03);
  });

  it('should have lower friction_pull for roller bed', () => {
    const sliderInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
    };
    const rollerInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.RollerBed,
    };

    const sliderResult = calculate(sliderInputs, DEFAULT_PARAMETERS);
    const rollerResult = calculate(rollerInputs, DEFAULT_PARAMETERS);

    // Roller bed friction pull should be ~12% of slider bed (0.03/0.25)
    const ratio = rollerResult.friction_pull_lb / sliderResult.friction_pull_lb;
    expect(ratio).toBeCloseTo(0.03 / 0.25, 5);
  });

  it('should have lower torque for roller bed', () => {
    const sliderInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
    };
    const rollerInputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.RollerBed,
    };

    const sliderResult = calculate(sliderInputs, DEFAULT_PARAMETERS);
    const rollerResult = calculate(rollerInputs, DEFAULT_PARAMETERS);

    expect(rollerResult.torque_drive_shaft_inlbf).toBeLessThan(sliderResult.torque_drive_shaft_inlbf);
  });
});

// ============================================================================
// PREMIUM FLAGS TESTS
// ============================================================================

describe('Premium Flags', () => {
  it('should flag slider_bed + crowned as standard', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
      belt_tracking_method: BeltTrackingMethod.Crowned,
    };

    const flags = calculatePremiumFlags(inputs);

    expect(flags.is_premium).toBe(false);
    expect(flags.premium_level).toBe(PremiumLevel.Standard);
    expect(flags.premium_reasons).toHaveLength(0);
  });

  it('should flag slider_bed + v_guided as premium', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
      belt_tracking_method: BeltTrackingMethod.VGuided,
    };

    const flags = calculatePremiumFlags(inputs);

    expect(flags.is_premium).toBe(true);
    expect(flags.premium_level).toBe(PremiumLevel.Premium);
    expect(flags.premium_reasons).toContain('V-guided belt tracking');
  });

  it('should flag roller_bed + crowned as premium', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.RollerBed,
      belt_tracking_method: BeltTrackingMethod.Crowned,
    };

    const flags = calculatePremiumFlags(inputs);

    expect(flags.is_premium).toBe(true);
    expect(flags.premium_level).toBe(PremiumLevel.Premium);
    expect(flags.premium_reasons).toContain('Roller bed construction');
  });

  it('should flag roller_bed + v_guided as premium_plus', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.RollerBed,
      belt_tracking_method: BeltTrackingMethod.VGuided,
    };

    const flags = calculatePremiumFlags(inputs);

    expect(flags.is_premium).toBe(true);
    expect(flags.premium_level).toBe(PremiumLevel.PremiumPlus);
    expect(flags.premium_reasons).toContain('Roller bed construction');
    expect(flags.premium_reasons).toContain('V-guided belt tracking');
  });
});

// ============================================================================
// CALCULATION RESULT TESTS
// ============================================================================

describe('Calculation Result', () => {
  it('should include bed_type_used in outputs', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
    };

    const result = calculate(inputs, DEFAULT_PARAMETERS);

    expect(result.bed_type_used).toBe(BedType.SliderBed);
  });

  it('should include premium_flags in outputs', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.RollerBed,
    };

    const result = calculate(inputs, DEFAULT_PARAMETERS);

    expect(result.premium_flags).toBeDefined();
    expect(result.premium_flags.is_premium).toBe(true);
    expect(result.premium_flags.premium_level).toBe(PremiumLevel.Premium);
  });

  it('calculateBeltConveyor should include metadata with belt_conveyor_v1 model_key', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      bed_type: BedType.SliderBed,
    };

    const result = calculateBeltConveyor(inputs, DEFAULT_PARAMETERS);

    expect(result.success).toBe(true);
    expect(result.metadata.model_key).toBe('belt_conveyor_v1');
    expect(result.metadata.model_version_id).toBe('belt_conveyor_v1');
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Validation - Updated Terminology', () => {
  it('should use belt conveyor terminology in error messages', () => {
    const inputs: BeltConveyorInputs = {
      ...LEGACY_SLIDERBED_INPUTS,
      part_temperature_class: PartTemperatureClass.RedHot,
    };

    const result = calculateBeltConveyor(inputs, DEFAULT_PARAMETERS);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some((e) => e.message.includes('belt conveyor'))).toBe(true);
    expect(result.errors!.some((e) => e.message.includes('sliderbed'))).toBe(false);
  });
});
