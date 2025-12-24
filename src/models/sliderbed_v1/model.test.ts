/**
 * SLIDERBED CONVEYOR v1 - TEST SUITE
 *
 * This test suite ensures:
 * 1. All formulas execute without errors
 * 2. Validation rules work correctly
 * 3. Edge cases are handled
 * 4. Excel parity is maintained (when fixtures are provided)
 *
 * To add Excel test fixtures:
 * - Import actual Excel cases into fixtures.ts
 * - Each fixture should include inputs, expected outputs, and tolerances
 * - Tests will automatically run against all fixtures
 */

import { runCalculation } from '../../lib/calculator/engine';
import {
  SliderbedInputs,
  PartTemperatureClass,
  FluidType,
  Orientation,
  DEFAULT_PARAMETERS,
  MaterialType,
  ProcessType,
  PartsSharp,
  EnvironmentFactors,
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
  DirectionMode,
  SideLoadingDirection,
  SideLoadingSeverity,
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  BeltTrackingMethod,
  ShaftDiameterMode,
  VGuideProfile,
  // v1.4: Support & Height
  EndSupportType,
  HeightInputMode,
  derivedLegsRequired,
  TOB_FIELDS,
  // v1.5: Frame Height
  FrameHeightMode,
  // v1.6: Speed Mode
  SpeedMode,
  // v1.7: Gearmotor Mounting Style
  GearmotorMountingStyle,
} from './schema';
import {
  migrateInputs,
  calculateImpliedAngleDeg,
  calculateOppositeTob,
  hasAngleMismatch,
  clearTobFields,
} from './migrate';
import { validateTob, validateForCommit } from './rules';
import {
  calculateTrackingGuidance,
  getTrackingTooltip,
  isTrackingSelectionOptimal,
  getRiskLevelColor,
  TrackingRiskLevel,
} from './tracking-guidance';

describe('Sliderbed Conveyor v1 - Calculation Engine', () => {
  // Application field defaults (used in all tests)
  const APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
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
    // Features & Options
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
    // Belt tracking & pulley
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  };

  // ========================================================================
  // BASIC CALCULATION TESTS
  // ========================================================================

  describe('Basic Calculations', () => {
    it('should calculate successfully with valid inputs', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        conveyor_incline_deg: 0,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0.5,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should apply default values for optional inputs', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 100,
        conveyor_width_in: 20,
        pulley_diameter_in: 2.5,
        drive_rpm: 80,
        part_weight_lbs: 3,
        part_length_in: 10,
        part_width_in: 5,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();
    });

    it('should use parameter overrides when provided', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 100,
        conveyor_width_in: 20,
        pulley_diameter_in: 2.5,
        drive_rpm: 80,
        part_weight_lbs: 3,
        part_length_in: 10,
        part_width_in: 5,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const customSafetyFactor = 3.0;

      const result = runCalculation({
        inputs,
        parameters: { safety_factor: customSafetyFactor },
      });

      expect(result.success).toBe(true);
      expect(result.outputs?.safety_factor_used).toBe(customSafetyFactor);
    });
  });

  // ========================================================================
  // VALIDATION TESTS
  // ========================================================================

  describe('Input Validation', () => {
    it('should reject negative conveyor length', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: -10,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should reject zero drive RPM in drive_rpm mode', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        belt_speed_fpm: 65.45,
        drive_rpm: 0,
        speed_mode: SpeedMode.DriveRpm, // v1.6: must set mode to test drive_rpm validation
        drive_rpm_input: 0,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject negative part weight', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: -5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject negative drop height', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: -5,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.field === 'drop_height_in')).toBe(true);
      expect(result.errors?.some(e => e.message.includes('negative'))).toBe(true);
    });

    it('should allow zero drop height', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  // ========================================================================
  // APPLICATION RULES TESTS
  // ========================================================================

  describe('Application Rules', () => {
    it('should error on red hot parts', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        part_temperature_class: PartTemperatureClass.RedHot,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(
        result.errors?.some((e) =>
          e.message.includes('Do not use sliderbed conveyor for red hot parts')
        )
      ).toBe(true);
    });

    it('should warn on considerable oil', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.ConsiderableOilLiquid,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings?.some((w) => w.message.includes('ribbed or specialty belt'))
      ).toBe(true);
    });

    it('should warn on long conveyor', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 150,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings?.some((w) => w.message.includes('multi-section body'))
      ).toBe(true);
    });

    it('should warn on hot parts', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Hot,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings?.some((w) => w.message.includes('high-temperature belt'))
      ).toBe(true);
    });

    it('should warn on high drop height (>= 24 inches)', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 24,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings?.some((w) => w.field === 'drop_height_in' && w.message.includes('high'))
      ).toBe(true);
    });

    it('should show info on light oil', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.MinimalResidualOil,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings?.some(
          (w) => w.message.includes('Minimal residual oil present') && w.severity === 'info'
        )
      ).toBe(true);
    });
  });

  // ========================================================================
  // FORMULA CORRECTNESS TESTS
  // ========================================================================

  describe('Formula Correctness', () => {
    it('should calculate parts_on_belt correctly for lengthwise orientation', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 12, // 12 inches
        environment_factors: [EnvironmentFactors.Indoor],
      };

      const result = runCalculation({ inputs });

      // Expected: 120 / (12 + 12) = 120 / 24 = 5
      expect(result.outputs?.parts_on_belt).toBe(5);
    });

    it('should calculate parts_on_belt correctly for crosswise orientation', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Crosswise,
        part_spacing_in: 12, // 12 inches
        environment_factors: [EnvironmentFactors.Indoor],
      };

      const result = runCalculation({ inputs });

      // Expected: 120 / (6 + 12) = 120 / 18 = 6.666...
      expect(result.outputs?.parts_on_belt).toBeCloseTo(6.6667, 3);
    });

    it('should use correct belt weight coefficients for 2.5" pulley', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 100,
        conveyor_width_in: 20,
        pulley_diameter_in: 2.5,
        drive_rpm: 80,
        part_weight_lbs: 3,
        part_length_in: 10,
        part_width_in: 5,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.outputs?.piw_used).toBe(DEFAULT_PARAMETERS.piw_2p5);
      expect(result.outputs?.pil_used).toBe(DEFAULT_PARAMETERS.pil_2p5);
    });

    it('should use correct belt weight coefficients for non-2.5" pulley', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 100,
        conveyor_width_in: 20,
        pulley_diameter_in: 3.0,
        drive_rpm: 80,
        part_weight_lbs: 3,
        part_length_in: 10,
        part_width_in: 5,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.outputs?.piw_used).toBe(DEFAULT_PARAMETERS.piw_other);
      expect(result.outputs?.pil_used).toBe(DEFAULT_PARAMETERS.pil_other);
    });

    it('should calculate total belt length correctly', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 100,
        conveyor_width_in: 20,
        pulley_diameter_in: 2.5,
        drive_rpm: 80,
        part_weight_lbs: 3,
        part_length_in: 10,
        part_width_in: 5,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      // Expected: (2 * 100) + (PI * 2.5) = 200 + 7.854 = 207.854
      // v1.1: Changed from 2πD to πD for open-belt configuration
      expect(result.outputs?.total_belt_length_in).toBeCloseTo(207.854, 2);
    });
  });

  // ========================================================================
  // PARAMETER OVERRIDE TESTS
  // ========================================================================

  describe('Parameter Overrides', () => {
    it('should reject invalid friction coefficient', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({
        inputs,
        parameters: { friction_coeff: 1.5 }, // Out of range
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject safety factor < 1.0', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({
        inputs,
        parameters: { safety_factor: 0.5 },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  // ========================================================================
  // POWER-USER PARAMETERS (v1.2)
  // ========================================================================

  describe('Power-User Parameters', () => {
    const baseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      conveyor_width_in: 24,
      pulley_diameter_in: 2.5,
      drive_rpm: 100,
      part_weight_lbs: 5,
      part_length_in: 12,
      part_width_in: 6,
      drop_height_in: 0,
      part_temperature_class: PartTemperatureClass.Ambient,
      fluid_type: FluidType.None,
      orientation: Orientation.Lengthwise,
      part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
    };

    it('should use custom safety_factor when provided', () => {
      const inputs = { ...baseInputs, safety_factor: 3.0 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.safety_factor_used).toBe(3.0);
    });

    it('should reject safety_factor < 1.0 in inputs', () => {
      const inputs = { ...baseInputs, safety_factor: 0.5 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'safety_factor')).toBe(true);
    });

    it('should reject safety_factor > 5.0 in inputs', () => {
      const inputs = { ...baseInputs, safety_factor: 6.0 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'safety_factor')).toBe(true);
    });

    it('should use custom belt_coeff_piw and belt_coeff_pil', () => {
      const inputs = { ...baseInputs, belt_coeff_piw: 0.15, belt_coeff_pil: 0.12 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.piw_used).toBe(0.15);
      expect(result.outputs?.pil_used).toBe(0.12);
    });

    it('should reject belt_coeff_piw <= 0', () => {
      const inputs = { ...baseInputs, belt_coeff_piw: 0 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'belt_coeff_piw')).toBe(true);
    });

    it('should reject belt_coeff_piw out of range', () => {
      const inputs = { ...baseInputs, belt_coeff_piw: 0.35 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'belt_coeff_piw')).toBe(true);
    });

    it('should reject belt_coeff_pil <= 0', () => {
      const inputs = { ...baseInputs, belt_coeff_pil: -0.1 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'belt_coeff_pil')).toBe(true);
    });

    it('should use custom starting_belt_pull_lb', () => {
      const inputs = { ...baseInputs, starting_belt_pull_lb: 100 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.starting_belt_pull_lb_used).toBe(100);
    });

    it('should reject starting_belt_pull_lb < 0', () => {
      const inputs = { ...baseInputs, starting_belt_pull_lb: -10 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'starting_belt_pull_lb')).toBe(true);
    });

    it('should reject starting_belt_pull_lb > 2000', () => {
      const inputs = { ...baseInputs, starting_belt_pull_lb: 2500 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'starting_belt_pull_lb')).toBe(true);
    });
  });

  // ========================================================================
  // METADATA TESTS
  // ========================================================================

  describe('Result Metadata', () => {
    it('should include correct metadata', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.metadata.model_key).toBe('sliderbed_conveyor_v1');
      expect(result.metadata.model_version_id).toBeDefined();
      expect(result.metadata.calculated_at).toBeDefined();
    });

    it('should use custom model_version_id when provided', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 2.5,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
      };

      const customVersionId = 'test_version_123';
      const result = runCalculation({ inputs, model_version_id: customVersionId });

      expect(result.metadata.model_version_id).toBe(customVersionId);
    });
  });

  // ========================================================================
  // INCLINE CALCULATIONS AND WARNINGS
  // ========================================================================

  describe('Incline Calculations', () => {
    const baseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      conveyor_width_in: 24,
      pulley_diameter_in: 2.5,
      drive_rpm: 100,
      part_weight_lbs: 5,
      part_length_in: 12,
      part_width_in: 6,
      drop_height_in: 0,
      part_temperature_class: PartTemperatureClass.Ambient,
      fluid_type: FluidType.None,
      orientation: Orientation.Lengthwise,
      part_spacing_in: 0,
        ...APPLICATION_DEFAULTS,
    };

    it('should calculate incline pull correctly for 0° incline', () => {
      const inputs = { ...baseInputs, conveyor_incline_deg: 0 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.incline_pull_lb).toBeCloseTo(0, 2);
    });

    it('should calculate incline pull correctly for 30° incline', () => {
      const inputs = { ...baseInputs, conveyor_incline_deg: 30 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // sin(30°) = 0.5, so incline pull should be ~50% of total load
      const totalLoad = result.outputs!.total_load_lbf;
      const expectedInclinePull = totalLoad * Math.sin((30 * Math.PI) / 180);
      expect(result.outputs?.incline_pull_lb).toBeCloseTo(expectedInclinePull, 2);
    });

    it('should include incline pull in total belt pull', () => {
      const inputs = { ...baseInputs, conveyor_incline_deg: 30 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      const frictionPull = result.outputs!.friction_pull_lb;
      const inclinePull = result.outputs!.incline_pull_lb;
      const startingPull = result.outputs!.starting_belt_pull_lb;
      const totalPull = result.outputs!.total_belt_pull_lb;

      expect(totalPull).toBeCloseTo(frictionPull + inclinePull + startingPull, 2);
    });

    it('should warn on incline > 20°', () => {
      const inputs = { ...baseInputs, conveyor_incline_deg: 25 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.warnings?.some(w =>
        w.field === 'conveyor_incline_deg' && w.message.includes('20°')
      )).toBe(true);
    });

    it('should warn strongly on incline > 35°', () => {
      const inputs = { ...baseInputs, conveyor_incline_deg: 40 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.warnings?.some(w =>
        w.field === 'conveyor_incline_deg' && w.message.includes('35°')
      )).toBe(true);
    });

    it('should error on incline > 45°', () => {
      const inputs = { ...baseInputs, conveyor_incline_deg: 50 };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e =>
        e.field === 'conveyor_incline_deg' && e.message.includes('45°')
      )).toBe(true);
    });

    it('should use conservative friction (full load) regardless of incline', () => {
      const inputs0 = { ...baseInputs, conveyor_incline_deg: 0 };
      const inputs30 = { ...baseInputs, conveyor_incline_deg: 30 };

      const result0 = runCalculation({ inputs: inputs0 });
      const result30 = runCalculation({ inputs: inputs30 });

      // Friction pull should be the same for both (acts on full load)
      expect(result0.outputs?.friction_pull_lb).toBeCloseTo(result30.outputs!.friction_pull_lb, 2);
    });
  });

  // ========================================================================
  // BELT TRACKING & PULLEY CALCULATIONS
  // ========================================================================

  describe('Belt Tracking & Pulley', () => {
    const baseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      conveyor_width_in: 24,
      pulley_diameter_in: 2.5,
      drive_rpm: 100,
      part_weight_lbs: 5,
      part_length_in: 12,
      part_width_in: 6,
      drop_height_in: 0,
      part_temperature_class: PartTemperatureClass.Ambient,
      fluid_type: FluidType.None,
      orientation: Orientation.Lengthwise,
      part_spacing_in: 0,
      ...APPLICATION_DEFAULTS,
    };

    it('should identify V-guided belt tracking correctly', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_profile: VGuideProfile.K10,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.is_v_guided).toBe(true);
      expect(result.outputs?.pulley_requires_crown).toBe(false);
    });

    it('should identify crowned belt tracking correctly', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.is_v_guided).toBe(false);
      expect(result.outputs?.pulley_requires_crown).toBe(true);
    });

    it('should calculate pulley face extra correctly for V-guided (0.5")', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_profile: VGuideProfile.K10,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.pulley_face_extra_in).toBe(DEFAULT_PARAMETERS.pulley_face_extra_v_guided_in);
      expect(result.outputs?.pulley_face_extra_in).toBe(0.5);
    });

    it('should calculate pulley face extra correctly for crowned (2.0")', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.pulley_face_extra_in).toBe(DEFAULT_PARAMETERS.pulley_face_extra_crowned_in);
      expect(result.outputs?.pulley_face_extra_in).toBe(2.0);
    });

    it('should calculate pulley face length correctly', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // pulley_face_length = conveyor_width + extra = 24 + 2.0 = 26
      expect(result.outputs?.pulley_face_length_in).toBe(26);
    });

    it('should require v_guide_profile when V-guided', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        // v_guide_profile not set
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'v_guide_profile')).toBe(true);
    });

    it('should use manual shaft diameters when specified', () => {
      const inputs = {
        ...baseInputs,
        shaft_diameter_mode: ShaftDiameterMode.Manual,
        drive_shaft_diameter_in: 1.5,
        tail_shaft_diameter_in: 1.25,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.drive_shaft_diameter_in).toBe(1.5);
      expect(result.outputs?.tail_shaft_diameter_in).toBe(1.25);
    });

    it('should require shaft diameters when manual mode', () => {
      const inputs = {
        ...baseInputs,
        shaft_diameter_mode: ShaftDiameterMode.Manual,
        // drive_shaft_diameter_in and tail_shaft_diameter_in not set
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'drive_shaft_diameter_in')).toBe(true);
      expect(result.errors?.some(e => e.field === 'tail_shaft_diameter_in')).toBe(true);
    });

    it('should reject shaft diameter < 0.5"', () => {
      const inputs = {
        ...baseInputs,
        shaft_diameter_mode: ShaftDiameterMode.Manual,
        drive_shaft_diameter_in: 0.4,
        tail_shaft_diameter_in: 1.0,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'drive_shaft_diameter_in' && e.message.includes('0.5'))).toBe(true);
    });

    it('should reject shaft diameter > 4.0"', () => {
      const inputs = {
        ...baseInputs,
        shaft_diameter_mode: ShaftDiameterMode.Manual,
        drive_shaft_diameter_in: 1.5,
        tail_shaft_diameter_in: 4.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'tail_shaft_diameter_in' && e.message.includes('4.0'))).toBe(true);
    });

    it('should calculate shaft diameters automatically when in calculated mode', () => {
      const inputs = {
        ...baseInputs,
        shaft_diameter_mode: ShaftDiameterMode.Calculated,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.drive_shaft_diameter_in).toBeGreaterThan(0);
      expect(result.outputs?.tail_shaft_diameter_in).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // BELT PIW/PIL OVERRIDE TESTS
  // ========================================================================

  describe('Belt PIW/PIL Overrides', () => {
    const baseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      conveyor_width_in: 24,
      pulley_diameter_in: 4.0,
      drive_rpm: 100,
      part_weight_lbs: 5,
      part_length_in: 12,
      part_width_in: 6,
      drop_height_in: 0,
      part_temperature_class: PartTemperatureClass.Ambient,
      fluid_type: FluidType.None,
      orientation: Orientation.Lengthwise,
      part_spacing_in: 0,
      ...APPLICATION_DEFAULTS,
    };

    it('should use belt catalog PIW/PIL when provided', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.piw_used).toBe(0.109);
      expect(result.outputs?.pil_used).toBe(0.090);
      expect(result.outputs?.belt_piw_effective).toBe(0.109);
      expect(result.outputs?.belt_pil_effective).toBe(0.090);
    });

    it('should use override PIW/PIL when provided', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
        belt_piw_override: 0.150,
        belt_pil_override: 0.120,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.piw_used).toBe(0.150);
      expect(result.outputs?.pil_used).toBe(0.120);
      expect(result.outputs?.belt_piw_effective).toBe(0.150);
      expect(result.outputs?.belt_pil_effective).toBe(0.120);
    });

    it('should use partial override (PIW only)', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
        belt_piw_override: 0.150,
        // No PIL override - should use catalog
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.piw_used).toBe(0.150);
      expect(result.outputs?.pil_used).toBe(0.090);
      expect(result.outputs?.belt_piw_effective).toBe(0.150);
      expect(result.outputs?.belt_pil_effective).toBe(0.090);
    });

    it('should use partial override (PIL only)', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
        belt_pil_override: 0.120,
        // No PIW override - should use catalog
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.piw_used).toBe(0.109);
      expect(result.outputs?.pil_used).toBe(0.120);
      expect(result.outputs?.belt_piw_effective).toBe(0.109);
      expect(result.outputs?.belt_pil_effective).toBe(0.120);
    });

    it('should fall back to parameter defaults when no belt selected', () => {
      const inputs = {
        ...baseInputs,
        // No belt_catalog_key, belt_piw, or belt_pil
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // For 4.0" pulley, should use default piw_other = 0.109
      expect(result.outputs?.piw_used).toBe(DEFAULT_PARAMETERS.piw_other);
      expect(result.outputs?.pil_used).toBe(DEFAULT_PARAMETERS.pil_other);
    });

    it('should reject belt_piw_override <= 0', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
        belt_piw_override: 0,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'belt_piw_override')).toBe(true);
    });

    it('should reject belt_pil_override <= 0', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
        belt_pil_override: -0.05,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'belt_pil_override')).toBe(true);
    });

    it('should reject belt_piw_override out of range (< 0.05)', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
        belt_piw_override: 0.04,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e =>
        e.field === 'belt_piw_override' && e.message.includes('0.05')
      )).toBe(true);
    });

    it('should reject belt_piw_override out of range (> 0.30)', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
        belt_piw_override: 0.35,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e =>
        e.field === 'belt_piw_override' && e.message.includes('0.30')
      )).toBe(true);
    });

    it('should expose effective PIW/PIL in outputs', () => {
      const inputs = {
        ...baseInputs,
        belt_catalog_key: 'TEST_BELT',
        belt_piw: 0.109,
        belt_pil: 0.090,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.belt_piw_effective).toBeDefined();
      expect(result.outputs?.belt_pil_effective).toBeDefined();
    });
  });
});

// ============================================================================
// BELT TRACKING GUIDANCE TESTS
// ============================================================================

describe('Belt Tracking Guidance', () => {
  // Application field defaults (used in all tests)
  const TRACKING_APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
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
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  };

  const baseInputs: SliderbedInputs = {
    conveyor_length_cc_in: 72, // 72" / 24" = 3:1 L:W ratio (Low)
    conveyor_width_in: 24,
    pulley_diameter_in: 2.5,
    belt_speed_fpm: 50, // Low speed
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0,
    ...TRACKING_APPLICATION_DEFAULTS,
  };

  describe('Risk Assessment - L:W Ratio', () => {
    it('should assess low risk for L:W <= 3:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 72, conveyor_width_in: 24 }; // 3:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for L:W between 3:1 and 6:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 120, conveyor_width_in: 24 }; // 5:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess high risk for L:W > 6:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 180, conveyor_width_in: 24 }; // 7.5:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Risk Assessment - Reversing Operation', () => {
    it('should assess low risk for one-direction operation', () => {
      const inputs = { ...baseInputs, direction_mode: DirectionMode.OneDirection };
      const guidance = calculateTrackingGuidance(inputs);

      const reverseFactor = guidance.factors.find(f => f.name === 'Reversing Operation');
      expect(reverseFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess high risk for reversing operation', () => {
      const inputs = { ...baseInputs, direction_mode: DirectionMode.Reversing };
      const guidance = calculateTrackingGuidance(inputs);

      const reverseFactor = guidance.factors.find(f => f.name === 'Reversing Operation');
      expect(reverseFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Risk Assessment - Side Loading', () => {
    it('should assess low risk for no side loading', () => {
      const inputs = { ...baseInputs, side_loading_direction: SideLoadingDirection.None };
      const guidance = calculateTrackingGuidance(inputs);

      const sideFactor = guidance.factors.find(f => f.name === 'Side Loading');
      expect(sideFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for light side loading', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Light,
      };
      const guidance = calculateTrackingGuidance(inputs);

      const sideFactor = guidance.factors.find(f => f.name === 'Side Loading');
      expect(sideFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess high risk for heavy side loading', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Both,
        side_loading_severity: SideLoadingSeverity.Heavy,
      };
      const guidance = calculateTrackingGuidance(inputs);

      const sideFactor = guidance.factors.find(f => f.name === 'Side Loading');
      expect(sideFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Risk Assessment - Environment', () => {
    it('should assess low risk for indoor environment', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Indoor] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for washdown environment', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Washdown] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess medium risk for dusty environment', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Dusty] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    // v1.9: Multi-select environment tests
    it('should assess highest risk when multiple environments selected', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Indoor, EnvironmentFactors.Washdown] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      // Washdown is Medium, Indoor is Low - should take highest (Medium)
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should handle all low-risk environments as low risk', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Indoor, EnvironmentFactors.Outdoor] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Low);
    });
  });

  describe('Risk Assessment - Belt Speed', () => {
    it('should assess low risk for speed <= 100 FPM', () => {
      const inputs = { ...baseInputs, belt_speed_fpm: 80 };
      const guidance = calculateTrackingGuidance(inputs);

      const speedFactor = guidance.factors.find(f => f.name === 'Belt Speed');
      expect(speedFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for speed between 100-200 FPM', () => {
      const inputs = { ...baseInputs, belt_speed_fpm: 150 };
      const guidance = calculateTrackingGuidance(inputs);

      const speedFactor = guidance.factors.find(f => f.name === 'Belt Speed');
      expect(speedFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess high risk for speed > 200 FPM', () => {
      const inputs = { ...baseInputs, belt_speed_fpm: 250 };
      const guidance = calculateTrackingGuidance(inputs);

      const speedFactor = guidance.factors.find(f => f.name === 'Belt Speed');
      expect(speedFactor?.risk).toBe(TrackingRiskLevel.High);
    });
  });

  describe('Overall Recommendations', () => {
    it('should recommend crowned for low-risk conveyor', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 60, // 2.5:1 L:W
        conveyor_width_in: 24,
        belt_speed_fpm: 50,
        direction_mode: DirectionMode.OneDirection,
        side_loading_direction: SideLoadingDirection.None,
        environment_factors: [EnvironmentFactors.Indoor],
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.recommendation).toBe(BeltTrackingMethod.Crowned);
      expect(guidance.riskLevel).toBe(TrackingRiskLevel.Low);
    });

    it('should recommend V-guided for high-risk conveyor', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 180, // 7.5:1 L:W (High)
        conveyor_width_in: 24,
        direction_mode: DirectionMode.Reversing, // High
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.recommendation).toBe(BeltTrackingMethod.VGuided);
      expect(guidance.riskLevel).toBe(TrackingRiskLevel.High);
    });

    it('should recommend V-guided when multiple medium risks exist', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 120, // 5:1 L:W (Medium)
        conveyor_width_in: 24,
        belt_speed_fpm: 150, // Medium
        environment_factors: [EnvironmentFactors.Washdown], // Medium
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.recommendation).toBe(BeltTrackingMethod.VGuided);
      expect(guidance.riskLevel).toBe(TrackingRiskLevel.High); // Multiple mediums = High
    });
  });

  describe('Warnings', () => {
    it('should warn when reversing with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        direction_mode: DirectionMode.Reversing,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('Reversing'))).toBe(true);
    });

    it('should warn when high L:W with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 180, // 7.5:1 L:W
        conveyor_width_in: 24,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('length-to-width'))).toBe(true);
    });

    it('should warn when low L:W with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 40, // 40/30 = 1.33:1 L:W (too low)
        conveyor_width_in: 30,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('Low length-to-width'))).toBe(true);
    });

    it('should NOT warn when low L:W with V-guided selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 40, // 1.33:1 L:W (too low for crowned)
        conveyor_width_in: 30,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_profile: 'K10',
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('Low length-to-width'))).toBe(false);
    });

    it('should NOT warn when L:W is exactly at threshold (2.0) with crowned', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 60, // 60/30 = 2.0:1 L:W (at threshold, not below)
        conveyor_width_in: 30,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      // Threshold is strict < 2.0, so 2.0 exactly should NOT warn
      expect(guidance.warnings.some(w => w.includes('Low length-to-width'))).toBe(false);
    });

    it('should warn when heavy side loading with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Heavy,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('side loading'))).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('getTrackingTooltip should return appropriate text', () => {
      const lowRiskInputs = { ...baseInputs };
      const tooltip = getTrackingTooltip(lowRiskInputs);

      expect(tooltip).toContain('suitable');
    });

    it('isTrackingSelectionOptimal should return true for matching selection', () => {
      const inputs = {
        ...baseInputs,
        direction_mode: DirectionMode.OneDirection,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };

      expect(isTrackingSelectionOptimal(inputs)).toBe(true);
    });

    it('isTrackingSelectionOptimal should return false for non-optimal selection', () => {
      const inputs = {
        ...baseInputs,
        direction_mode: DirectionMode.Reversing,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };

      expect(isTrackingSelectionOptimal(inputs)).toBe(false);
    });

    it('getRiskLevelColor should return correct classes', () => {
      expect(getRiskLevelColor(TrackingRiskLevel.Low)).toContain('green');
      expect(getRiskLevelColor(TrackingRiskLevel.Medium)).toContain('yellow');
      expect(getRiskLevelColor(TrackingRiskLevel.High)).toContain('red');
    });
  });
});

// ============================================================================
// v1.3: SPLIT PULLEY DIAMETER TESTS
// ============================================================================

describe('Split Pulley Diameter (v1.3)', () => {
  // Application field defaults (used in all tests)
  const APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
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
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  };

  const baseInputs: SliderbedInputs = {
    conveyor_length_cc_in: 100,
    conveyor_width_in: 24,
    pulley_diameter_in: 4, // Legacy field
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0,
    ...APPLICATION_DEFAULTS,
  };

  describe('Backward Compatibility', () => {
    it('should produce identical results when drive == tail == legacy pulley diameter', () => {
      // Legacy config (using pulley_diameter_in only)
      const legacyInputs = {
        ...baseInputs,
        pulley_diameter_in: 4,
      };
      const legacyResult = runCalculation({ inputs: legacyInputs });

      // v1.3 config with same diameter for both
      const v13Inputs = {
        ...baseInputs,
        pulley_diameter_in: 4,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
        tail_matches_drive: true,
      };
      const v13Result = runCalculation({ inputs: v13Inputs });

      expect(legacyResult.success).toBe(true);
      expect(v13Result.success).toBe(true);

      // CRITICAL PARITY CHECK: Belt length must be identical
      expect(v13Result.outputs?.total_belt_length_in).toBe(
        legacyResult.outputs?.total_belt_length_in
      );

      // All other calculation outputs should match
      expect(v13Result.outputs?.belt_weight_lbf).toBe(legacyResult.outputs?.belt_weight_lbf);
      expect(v13Result.outputs?.total_belt_pull_lb).toBe(legacyResult.outputs?.total_belt_pull_lb);
      expect(v13Result.outputs?.torque_drive_shaft_inlbf).toBe(
        legacyResult.outputs?.torque_drive_shaft_inlbf
      );
    });

    it('should migrate legacy pulley_diameter_in to drive and tail', () => {
      const inputs = {
        ...baseInputs,
        pulley_diameter_in: 6,
        // No drive_pulley_diameter_in or tail_pulley_diameter_in
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.drive_pulley_diameter_in).toBe(6);
      expect(result.outputs?.tail_pulley_diameter_in).toBe(6);
    });
  });

  describe('Belt Length Formula Parity', () => {
    it('should calculate belt length correctly with equal pulleys (4" each)', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 100,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
      };
      const result = runCalculation({ inputs });

      // Formula: 2 * cc + π * (drive + tail) / 2
      // = 2 * 100 + π * (4 + 4) / 2
      // = 200 + π * 4
      // = 200 + 12.566
      // = 212.566
      expect(result.outputs?.total_belt_length_in).toBeCloseTo(212.566, 2);

      // This must equal legacy formula: 2 * cc + π * D = 200 + 12.566
    });

    it('should calculate belt length correctly with different pulleys (4" drive, 6" tail)', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 100,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 6,
        tail_matches_drive: false,
      };
      const result = runCalculation({ inputs });

      // Formula: 2 * cc + π * (drive + tail) / 2
      // = 2 * 100 + π * (4 + 6) / 2
      // = 200 + π * 5
      // = 200 + 15.708
      // = 215.708
      expect(result.outputs?.total_belt_length_in).toBeCloseTo(215.708, 2);
    });

    it('should output both pulley diameters', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 5,
        tail_pulley_diameter_in: 8,
        tail_matches_drive: false,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.drive_pulley_diameter_in).toBe(5);
      expect(result.outputs?.tail_pulley_diameter_in).toBe(8);
    });
  });

  describe('Pulley Diameter Validation', () => {
    it('should reject drive pulley diameter < 2.5"', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 2,
        tail_pulley_diameter_in: 4,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'drive_pulley_diameter_in')).toBe(true);
    });

    it('should reject tail pulley diameter < 2.5"', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 2,
        tail_matches_drive: false,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'tail_pulley_diameter_in')).toBe(true);
    });

    it('should reject drive pulley diameter > 12"', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 14,
        tail_pulley_diameter_in: 4,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'drive_pulley_diameter_in')).toBe(true);
    });

    it('should warn on mismatched pulley diameters', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 6,
        tail_matches_drive: false,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'tail_pulley_diameter_in' && w.message.includes('different')
        )
      ).toBe(true);
    });

    it('should show info for non-standard pulley diameters', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 4.5, // Non-standard
        tail_pulley_diameter_in: 4.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'drive_pulley_diameter_in' && w.severity === 'info'
        )
      ).toBe(true);
    });
  });
});

// ============================================================================
// v1.3: BELT CLEAT TESTS
// ============================================================================

describe('Belt Cleats (v1.3)', () => {
  // Application field defaults
  const APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
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
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  };

  const baseInputs: SliderbedInputs = {
    conveyor_length_cc_in: 100,
    conveyor_width_in: 24,
    pulley_diameter_in: 4,
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0,
    ...APPLICATION_DEFAULTS,
  };

  describe('Cleats Disabled (Default)', () => {
    it('should not require cleat fields when disabled', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: false,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleats_enabled).toBe(false);
      expect(result.outputs?.cleats_summary).toBeUndefined();
    });

    it('should default to cleats_enabled = false when not specified', () => {
      const inputs = {
        ...baseInputs,
        // cleats_enabled not set
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleats_enabled).toBe(false);
    });
  });

  describe('Cleats Enabled', () => {
    it('should require cleat height when enabled', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        // cleat_height_in missing
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'cleat_height_in')).toBe(true);
    });

    it('should require cleat spacing when enabled', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_edge_offset_in: 0.5,
        // cleat_spacing_in missing
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'cleat_spacing_in')).toBe(true);
    });

    it('should require cleat edge offset when enabled', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 12,
        // cleat_edge_offset_in missing
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'cleat_edge_offset_in')).toBe(true);
    });

    it('should calculate successfully with valid cleat config', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleats_enabled).toBe(true);
      expect(result.outputs?.cleats_summary).toBe('Cleats: 1" high @ 12" c/c, 0.5" from belt edge');
    });

    it('should NOT affect power/tension calculations (spec only)', () => {
      const withoutCleats = {
        ...baseInputs,
        cleats_enabled: false,
      };
      const withCleats = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 2,
        cleat_spacing_in: 8,
        cleat_edge_offset_in: 1,
      };

      const resultWithout = runCalculation({ inputs: withoutCleats });
      const resultWith = runCalculation({ inputs: withCleats });

      expect(resultWithout.success).toBe(true);
      expect(resultWith.success).toBe(true);

      // All power/tension calculations should be identical
      expect(resultWith.outputs?.total_belt_pull_lb).toBe(resultWithout.outputs?.total_belt_pull_lb);
      expect(resultWith.outputs?.torque_drive_shaft_inlbf).toBe(
        resultWithout.outputs?.torque_drive_shaft_inlbf
      );
      expect(resultWith.outputs?.belt_weight_lbf).toBe(resultWithout.outputs?.belt_weight_lbf);
      expect(resultWith.outputs?.total_belt_length_in).toBe(
        resultWithout.outputs?.total_belt_length_in
      );
    });
  });

  describe('Cleat Validation', () => {
    it('should reject cleat height < 0.5"', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 0.25,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(
        result.errors?.some((e) => e.field === 'cleat_height_in' && e.message.includes('0.5'))
      ).toBe(true);
    });

    it('should reject cleat height > 6"', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 7,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(
        result.errors?.some((e) => e.field === 'cleat_height_in' && e.message.includes('6'))
      ).toBe(true);
    });

    it('should reject cleat spacing < 2"', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 1,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(
        result.errors?.some((e) => e.field === 'cleat_spacing_in' && e.message.includes('2'))
      ).toBe(true);
    });

    it('should reject cleat spacing > 48"', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 50,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(
        result.errors?.some((e) => e.field === 'cleat_spacing_in' && e.message.includes('48'))
      ).toBe(true);
    });

    it('should reject cleat edge offset > 12"', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 15,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(
        result.errors?.some((e) => e.field === 'cleat_edge_offset_in' && e.message.includes('12'))
      ).toBe(true);
    });

    it('should warn when cleat spacing < part travel dimension', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 8, // Less than part_length_in (12)
        cleat_edge_offset_in: 0.5,
        orientation: Orientation.Lengthwise,
        part_length_in: 12,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'cleat_spacing_in' && w.message.includes('travel dimension')
        )
      ).toBe(true);
    });

    it('should warn when cleat edge offset exceeds half belt width', () => {
      const inputs = {
        ...baseInputs,
        conveyor_width_in: 20,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 11, // > 20/2 = 10
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'cleat_edge_offset_in' && w.message.includes('overlap')
        )
      ).toBe(true);
    });
  });
});

// ============================================================================
// v1.4: SUPPORT & HEIGHT MODEL TESTS
// ============================================================================

describe('Support & Height Model (v1.4)', () => {
  // Application field defaults
  const APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
    ambient_temperature: AmbientTemperature.Normal,
    power_feed: PowerFeed.V480_3Ph,
    controls_package: ControlsPackage.StartStop,
    spec_source: SpecSource.Standard,
    field_wiring_required: FieldWiringRequired.No,
    bearing_grade: BearingGrade.Standard,
    documentation_package: DocumentationPackage.Basic,
    finish_paint_system: FinishPaintSystem.PowderCoat,
    labels_required: LabelsRequired.Yes,
    send_to_estimating: SendToEstimating.No,
    motor_brand: MotorBrand.Standard,
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    finger_safe: false,
    lacing_style: LacingStyle.Endless,
    side_skirts: false,
    sensor_options: [],
    pulley_surface_type: PulleySurfaceType.Plain,
    start_stop_application: false,
    direction_mode: DirectionMode.OneDirection,
    side_loading_direction: SideLoadingDirection.None,
    drive_location: DriveLocation.Head,
    brake_motor: false,
    gearmotor_orientation: GearmotorOrientation.SideMount,
    drive_hand: DriveHand.RightHand,
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
  };

  const baseInputs: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    conveyor_width_in: 24,
    pulley_diameter_in: 4,
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0,
    belt_speed_fpm: 50,
    ...APPLICATION_DEFAULTS,
  };

  describe('derivedLegsRequired', () => {
    it('should return false when both ends are External', () => {
      expect(derivedLegsRequired(EndSupportType.External, EndSupportType.External)).toBe(false);
    });

    it('should return true when tail is Legs', () => {
      expect(derivedLegsRequired(EndSupportType.Legs, EndSupportType.External)).toBe(true);
    });

    it('should return true when drive is Legs', () => {
      expect(derivedLegsRequired(EndSupportType.External, EndSupportType.Legs)).toBe(true);
    });

    it('should return true when both ends are Legs', () => {
      expect(derivedLegsRequired(EndSupportType.Legs, EndSupportType.Legs)).toBe(true);
    });

    it('should return true when tail is Casters', () => {
      expect(derivedLegsRequired(EndSupportType.Casters, EndSupportType.External)).toBe(true);
    });

    it('should return true when drive is Casters', () => {
      expect(derivedLegsRequired(EndSupportType.External, EndSupportType.Casters)).toBe(true);
    });

    it('should return true when both ends are Casters', () => {
      expect(derivedLegsRequired(EndSupportType.Casters, EndSupportType.Casters)).toBe(true);
    });

    it('should return true for mixed Legs and Casters', () => {
      expect(derivedLegsRequired(EndSupportType.Legs, EndSupportType.Casters)).toBe(true);
    });
  });

  describe('Legacy support_option Migration', () => {
    it('should migrate FloorMounted to Legs + Legs', () => {
      const inputs = {
        ...baseInputs,
        support_option: SupportOption.FloorMounted,
      };
      const migrated = migrateInputs(inputs);

      expect(migrated.tail_support_type).toBe(EndSupportType.Legs);
      expect(migrated.drive_support_type).toBe(EndSupportType.Legs);
      expect((migrated as Record<string, unknown>).support_option).toBeUndefined();
    });

    it('should migrate Suspended to External + External', () => {
      const inputs = {
        ...baseInputs,
        support_option: SupportOption.Suspended,
      };
      const migrated = migrateInputs(inputs);

      expect(migrated.tail_support_type).toBe(EndSupportType.External);
      expect(migrated.drive_support_type).toBe(EndSupportType.External);
    });

    it('should migrate IntegratedFrame to External + External', () => {
      const inputs = {
        ...baseInputs,
        support_option: SupportOption.IntegratedFrame,
      };
      const migrated = migrateInputs(inputs);

      expect(migrated.tail_support_type).toBe(EndSupportType.External);
      expect(migrated.drive_support_type).toBe(EndSupportType.External);
    });

    it('should not override existing per-end support types', () => {
      const inputs = {
        ...baseInputs,
        support_option: SupportOption.FloorMounted,
        tail_support_type: EndSupportType.External,
        drive_support_type: EndSupportType.Casters,
      };
      const migrated = migrateInputs(inputs);

      expect(migrated.tail_support_type).toBe(EndSupportType.External);
      expect(migrated.drive_support_type).toBe(EndSupportType.Casters);
    });
  });

  describe('TOB Field Existence Rules', () => {
    it('should remove TOB fields when legs_required=false', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.External,
        drive_support_type: EndSupportType.External,
        // These should be removed
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        tail_tob_in: 36,
        adjustment_required_in: 2,
      } as SliderbedInputs;
      const migrated = migrateInputs(inputs);

      expect((migrated as Record<string, unknown>).height_input_mode).toBeUndefined();
      expect((migrated as Record<string, unknown>).tail_tob_in).toBeUndefined();
      expect((migrated as Record<string, unknown>).adjustment_required_in).toBeUndefined();
    });

    it('should keep TOB fields when legs_required=true', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'tail' as const,
        tail_tob_in: 36,
        adjustment_required_in: 2,
      };
      const migrated = migrateInputs(inputs);

      expect(migrated.height_input_mode).toBe(HeightInputMode.ReferenceAndAngle);
      expect(migrated.tail_tob_in).toBe(36);
      expect(migrated.adjustment_required_in).toBe(2);
    });
  });

  describe('Height Geometry Calculations', () => {
    it('should calculate implied angle from TOB heights', () => {
      // 10" rise over 120" run = atan(10/120) = 4.76°
      const angle = calculateImpliedAngleDeg(36, 46, 120);
      expect(angle).toBeCloseTo(4.76, 1);
    });

    it('should return 0 for level conveyor', () => {
      const angle = calculateImpliedAngleDeg(36, 36, 120);
      expect(angle).toBe(0);
    });

    it('should return negative angle for decline', () => {
      const angle = calculateImpliedAngleDeg(46, 36, 120);
      expect(angle).toBeCloseTo(-4.76, 1);
    });

    it('should calculate opposite TOB from tail reference', () => {
      // Tail at 36", 5° incline, 120" run
      // rise = tan(5°) * 120 = 10.49"
      // drive = 36 + 10.49 = 46.49"
      const driveTob = calculateOppositeTob(36, 5, 120, 'tail');
      expect(driveTob).toBeCloseTo(46.49, 1);
    });

    it('should calculate opposite TOB from drive reference', () => {
      // Drive at 46", 5° incline, 120" run
      // rise = tan(5°) * 120 = 10.49"
      // tail = 46 - 10.49 = 35.51"
      const tailTob = calculateOppositeTob(46, 5, 120, 'drive');
      expect(tailTob).toBeCloseTo(35.51, 1);
    });

    it('should detect angle mismatch beyond tolerance', () => {
      expect(hasAngleMismatch(5.7, 5, 0.5)).toBe(true); // 0.7° > 0.5°
      expect(hasAngleMismatch(5.3, 5, 0.5)).toBe(false); // 0.3° < 0.5°
      expect(hasAngleMismatch(5.5, 5, 0.5)).toBe(false); // exactly at tolerance
    });
  });

  describe('Draft vs Commit Validation', () => {
    it('should pass draft validation for migrated FloorMounted without TOB', () => {
      // Fixture 7: Migrated FloorMounted with no TOB
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        // No TOB fields - mimics migrated legacy config
      };

      const errors = validateTob(inputs, 'draft');
      expect(errors.length).toBe(0);
    });

    it('should fail commit validation for Legs config without TOB (Mode A)', () => {
      // Fixture 12: Commit-mode failure for missing TOB
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'tail' as const,
        adjustment_required_in: 2,
        // tail_tob_in missing
      };

      const errors = validateTob(inputs, 'commit');
      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe('tail_tob_in');
    });

    it('should fail commit validation for Legs config without both TOBs (Mode B)', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.BothEnds,
        tail_tob_in: 36,
        // drive_tob_in missing
      };

      const errors = validateTob(inputs, 'commit');
      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe('drive_tob_in');
    });

    it('should pass commit validation for Mode A with reference TOB', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'tail' as const,
        tail_tob_in: 36,
        adjustment_required_in: 2,
      };

      const errors = validateTob(inputs, 'commit');
      expect(errors.length).toBe(0);
    });

    it('should pass commit validation for Mode B with both TOBs', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.BothEnds,
        tail_tob_in: 36,
        drive_tob_in: 46,
        adjustment_required_in: 2,
      };

      const errors = validateTob(inputs, 'commit');
      expect(errors.length).toBe(0);
    });

    it('should skip TOB validation when legs_required=false', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.External,
        drive_support_type: EndSupportType.External,
      };

      const errors = validateTob(inputs, 'commit');
      expect(errors.length).toBe(0);
    });
  });

  describe('Mode Switching (clearTobFields)', () => {
    it('should clear both TOB fields', () => {
      const inputs: Partial<SliderbedInputs> = {
        tail_tob_in: 36,
        drive_tob_in: 46,
      };
      clearTobFields(inputs);

      expect(inputs.tail_tob_in).toBeUndefined();
      expect(inputs.drive_tob_in).toBeUndefined();
    });
  });

  describe('Adjustment Range Warnings', () => {
    it('should warn on adjustment > 6"', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'tail' as const,
        tail_tob_in: 36,
        adjustment_required_in: 8,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'adjustment_required_in' && w.severity === 'info'
        )
      ).toBe(true);
    });

    it('should strongly warn on adjustment > 12"', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'tail' as const,
        tail_tob_in: 36,
        adjustment_required_in: 14,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'adjustment_required_in' && w.severity === 'warning'
        )
      ).toBe(true);
    });
  });

  describe('Angle Mismatch Warning', () => {
    it('should warn when implied angle differs from entered angle > 0.5°', () => {
      // Fixture 11: Angle mismatch
      const inputs = {
        ...baseInputs,
        conveyor_incline_deg: 3, // Entered angle
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.BothEnds,
        tail_tob_in: 36,
        drive_tob_in: 48, // Implies ~5.7° over 120"
        adjustment_required_in: 2,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'conveyor_incline_deg' && w.message.includes('differs')
        )
      ).toBe(true);
    });

    it('should not warn when implied angle matches entered angle', () => {
      // 10.49" rise over 120" = 5°
      const inputs = {
        ...baseInputs,
        conveyor_incline_deg: 5,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.BothEnds,
        tail_tob_in: 36,
        drive_tob_in: 46.49, // tan(5°) * 120 + 36 = 46.49
        adjustment_required_in: 2,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Check no angle mismatch warning exists
      const hasMismatchWarning = result.warnings?.some(
        (w) => w.field === 'conveyor_incline_deg' && w.message.includes('differs')
      ) ?? false;
      expect(hasMismatchWarning).toBe(false);
    });
  });

  describe('Test Fixtures (from Spec)', () => {
    it('Fixture 1: External both ends (no TOB fields)', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.External,
        drive_support_type: EndSupportType.External,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type)).toBe(false);
    });

    it('Fixture 2: Legs both ends, Mode A (tail reference)', () => {
      const inputs = {
        ...baseInputs,
        conveyor_incline_deg: 5,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'tail' as const,
        tail_tob_in: 36,
        adjustment_required_in: 2,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type)).toBe(true);
    });

    it('Fixture 3: Legs both ends, Mode A (drive reference)', () => {
      const inputs = {
        ...baseInputs,
        conveyor_incline_deg: 5,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'drive' as const,
        drive_tob_in: 42,
        adjustment_required_in: 2,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
    });

    it('Fixture 4: Legs both ends, Mode B (both TOBs)', () => {
      const inputs = {
        ...baseInputs,
        conveyor_incline_deg: 5,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.BothEnds,
        tail_tob_in: 36,
        drive_tob_in: 46.5,
        adjustment_required_in: 2,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
    });

    it('Fixture 5: Mixed support (tail External, drive Legs)', () => {
      const inputs = {
        ...baseInputs,
        conveyor_incline_deg: 0,
        tail_support_type: EndSupportType.External,
        drive_support_type: EndSupportType.Legs,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'drive' as const,
        drive_tob_in: 36,
        adjustment_required_in: 2,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type)).toBe(true);
    });

    it('Fixture 6: Casters both ends', () => {
      const inputs = {
        ...baseInputs,
        conveyor_incline_deg: 0,
        tail_support_type: EndSupportType.Casters,
        drive_support_type: EndSupportType.Casters,
        height_input_mode: HeightInputMode.BothEnds,
        tail_tob_in: 34,
        drive_tob_in: 34,
        adjustment_required_in: 4,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type)).toBe(true);
    });

    it('Fixture 8: Migrated Suspended (legacy) - passes both modes', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.External,
        drive_support_type: EndSupportType.External,
      };

      const draftErrors = validateTob(inputs, 'draft');
      const commitErrors = validateTob(inputs, 'commit');

      expect(draftErrors.length).toBe(0);
      expect(commitErrors.length).toBe(0);
    });

    it('Fixture 9: Invalid - TOB field present when legs_required=false', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.External,
        drive_support_type: EndSupportType.External,
        tail_tob_in: 36, // Should not exist
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'tail_tob_in')).toBe(true);
    });

    // =========================================================================
    // SMOKE TESTS: TOB visibility conditions
    // =========================================================================

    it('Smoke: Tail=Legs + Drive=Casters triggers legs_required=true', () => {
      // This is the exact case that was failing in the UI
      expect(derivedLegsRequired(EndSupportType.Legs, EndSupportType.Casters)).toBe(true);
    });

    it('Smoke: Tail=External + Drive=External triggers legs_required=false', () => {
      expect(derivedLegsRequired(EndSupportType.External, EndSupportType.External)).toBe(false);
    });

    it('Smoke: Mixed Legs+Casters with TOB fields is valid', () => {
      const inputs = {
        ...baseInputs,
        tail_support_type: EndSupportType.Legs,
        drive_support_type: EndSupportType.Casters,
        height_input_mode: HeightInputMode.ReferenceAndAngle,
        reference_end: 'tail' as const,
        tail_tob_in: 36,
        adjustment_required_in: 2,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type)).toBe(true);
    });
  });
});

// ============================================================================
// v1.5: FRAME HEIGHT & SNUB ROLLER TESTS
// ============================================================================

describe('Frame Height & Snub Roller Logic (v1.5)', () => {
  // Import frame height functions and constants for testing
  const {
    calculateEffectiveFrameHeight,
    calculateRequiresSnubRollers,
    calculateFrameHeightCostFlags,
    FRAME_HEIGHT_CONSTANTS,
  } = require('./formulas');

  const { FrameHeightMode } = require('./schema');

  describe('calculateEffectiveFrameHeight', () => {
    it('should calculate Standard frame height as pulley + 2.5"', () => {
      // Standard mode uses 2.5" offset to match snub threshold (no snubs needed)
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.Standard,
        4, // 4" pulley
        undefined
      );
      expect(frameHeight).toBe(6.5); // 4 + 2.5
    });

    it('should calculate Low Profile frame height as pulley + 0.5"', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.LowProfile,
        4, // 4" pulley
        undefined
      );
      expect(frameHeight).toBe(4.5); // 4 + 0.5
    });

    it('should use custom frame height when mode is Custom', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.Custom,
        4, // pulley (ignored)
        3.5 // custom height
      );
      expect(frameHeight).toBe(3.5);
    });

    it('should fall back to standard when Custom mode has no value', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.Custom,
        4, // pulley
        undefined // no custom value
      );
      expect(frameHeight).toBe(6.5); // Falls back to standard (4 + 2.5)
    });

    it('should default to Standard when mode is undefined', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        undefined,
        6, // 6" pulley
        undefined
      );
      expect(frameHeight).toBe(8.5); // 6 + 2.5 (Standard offset)
    });

    it('should handle string enum values', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        'Low Profile',
        4,
        undefined
      );
      expect(frameHeight).toBe(4.5);
    });
  });

  describe('calculateRequiresSnubRollers', () => {
    // NEW LOGIC (v1.5 FIX): requires_snub = frame_height < (largest_pulley + 2.5")
    // Snub rollers handle HIGH-TENSION zones near pulleys

    it('should NOT require snub rollers when frame height >= largest pulley + 2.5"', () => {
      // 7" frame >= (4" pulley + 2.5") = 6.5" threshold - no snub rollers needed
      expect(calculateRequiresSnubRollers(7.0, 4.0, 4.0)).toBe(false);
    });

    it('should NOT require snub rollers when frame height equals threshold exactly', () => {
      // 6.5" frame == (4" + 2.5") - no snub rollers needed (just at threshold)
      expect(calculateRequiresSnubRollers(6.5, 4.0, 4.0)).toBe(false);
    });

    it('should require snub rollers when frame height < largest pulley + 2.5"', () => {
      // 6" frame < (4" pulley + 2.5") = 6.5" threshold - snub rollers required
      expect(calculateRequiresSnubRollers(6.0, 4.0, 4.0)).toBe(true);
    });

    it('should require snub rollers for Standard mode with 4" pulley', () => {
      // Standard: 4" pulley + 1" = 5" frame
      // 5" < (4" + 2.5") = 6.5" threshold - snub rollers REQUIRED
      expect(calculateRequiresSnubRollers(5.0, 4.0, 4.0)).toBe(true);
    });

    it('should require snub rollers for Low Profile mode with 4" pulley', () => {
      // Low profile: 4" pulley + 0.5" = 4.5" frame
      // 4.5" < (4" + 2.5") = 6.5" threshold - snub rollers REQUIRED
      expect(calculateRequiresSnubRollers(4.5, 4.0, 4.0)).toBe(true);
    });

    it('should use largest pulley for threshold when drive and tail differ', () => {
      // 7" frame, 4" drive, 6" tail
      // Threshold = 6" (largest) + 2.5" = 8.5"
      // 7" < 8.5" - snub rollers required
      expect(calculateRequiresSnubRollers(7.0, 4.0, 6.0)).toBe(true);

      // 9" frame - above threshold
      expect(calculateRequiresSnubRollers(9.0, 4.0, 6.0)).toBe(false);
    });

    it('should require snub rollers for custom low frame', () => {
      // Custom: 3.5" frame < (4" + 2.5") = 6.5" threshold
      expect(calculateRequiresSnubRollers(3.5, 4.0, 4.0)).toBe(true);
    });
  });

  describe('calculateFrameHeightCostFlags', () => {
    it('should set no cost flags for Standard mode with standard height', () => {
      const flags = calculateFrameHeightCostFlags(
        FrameHeightMode.Standard,
        5.0, // 4" pulley + 1"
        false
      );
      expect(flags.cost_flag_low_profile).toBe(false);
      expect(flags.cost_flag_custom_frame).toBe(false);
      expect(flags.cost_flag_snub_rollers).toBe(false);
      expect(flags.cost_flag_design_review).toBe(false);
    });

    it('should set low_profile flag for Low Profile mode', () => {
      const flags = calculateFrameHeightCostFlags(
        FrameHeightMode.LowProfile,
        4.5,
        false
      );
      expect(flags.cost_flag_low_profile).toBe(true);
      expect(flags.cost_flag_custom_frame).toBe(false);
    });

    it('should set custom_frame flag for Custom mode', () => {
      const flags = calculateFrameHeightCostFlags(
        FrameHeightMode.Custom,
        5.0,
        false
      );
      expect(flags.cost_flag_low_profile).toBe(false);
      expect(flags.cost_flag_custom_frame).toBe(true);
    });

    it('should set snub_rollers flag when requiresSnubRollers is true', () => {
      const flags = calculateFrameHeightCostFlags(
        FrameHeightMode.Custom,
        3.5,
        true // snub rollers required
      );
      expect(flags.cost_flag_snub_rollers).toBe(true);
    });

    it('should set design_review flag when frame height < 4.0"', () => {
      const flags = calculateFrameHeightCostFlags(
        FrameHeightMode.Custom,
        3.5,
        true
      );
      expect(flags.cost_flag_design_review).toBe(true);
    });

    it('should NOT set design_review flag when frame height >= 4.0"', () => {
      const flags = calculateFrameHeightCostFlags(
        FrameHeightMode.Standard,
        4.5,
        false
      );
      expect(flags.cost_flag_design_review).toBe(false);
    });
  });

  describe('Integration: Full Calculation with Frame Height', () => {
    const APPLICATION_DEFAULTS = {
      material_type: MaterialType.Steel,
      process_type: ProcessType.Assembly,
      parts_sharp: PartsSharp.No,
      environment_factors: [EnvironmentFactors.Indoor],
      ambient_temperature: AmbientTemperature.Normal,
      power_feed: PowerFeed.V480_3Ph,
      controls_package: ControlsPackage.StartStop,
      spec_source: SpecSource.Standard,
      field_wiring_required: FieldWiringRequired.No,
      bearing_grade: BearingGrade.Standard,
      documentation_package: DocumentationPackage.Basic,
      finish_paint_system: FinishPaintSystem.PowderCoat,
      labels_required: LabelsRequired.Yes,
      send_to_estimating: SendToEstimating.No,
      motor_brand: MotorBrand.Standard,
      bottom_covers: false,
      side_rails: SideRails.None,
      end_guards: EndGuards.None,
      finger_safe: false,
      lacing_style: LacingStyle.Endless,
      side_skirts: false,
      sensor_options: [],
      pulley_surface_type: PulleySurfaceType.Plain,
      start_stop_application: false,
      direction_mode: DirectionMode.OneDirection,
      side_loading_direction: SideLoadingDirection.None,
      drive_location: DriveLocation.Head,
      brake_motor: false,
      gearmotor_orientation: GearmotorOrientation.SideMount,
      drive_hand: DriveHand.RightHand,
      belt_tracking_method: BeltTrackingMethod.Crowned,
      shaft_diameter_mode: ShaftDiameterMode.Calculated,
    };

    const baseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      conveyor_width_in: 24,
      pulley_diameter_in: 4,
      drive_pulley_diameter_in: 4,
      tail_pulley_diameter_in: 4,
      drive_rpm: 100,
      part_weight_lbs: 5,
      part_length_in: 12,
      part_width_in: 6,
      drop_height_in: 0,
      part_temperature_class: PartTemperatureClass.Ambient,
      fluid_type: FluidType.None,
      orientation: Orientation.Lengthwise,
      part_spacing_in: 0,
      belt_speed_fpm: 50,
      ...APPLICATION_DEFAULTS,
    };

    it('should output frame height for Standard mode', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.Standard,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Standard mode: 4" pulley + 2.5" = 6.5" frame (matches snub threshold exactly)
      expect(result.outputs?.effective_frame_height_in).toBe(6.5);
      // Standard mode should NOT require snub rollers (frame height >= threshold)
      expect(result.outputs?.requires_snub_rollers).toBe(false);
      expect(result.outputs?.cost_flag_low_profile).toBe(false);
      expect(result.outputs?.cost_flag_custom_frame).toBe(false);
      expect(result.outputs?.cost_flag_design_review).toBe(false);
    });

    it('should output frame height for Low Profile mode', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.LowProfile,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.effective_frame_height_in).toBe(4.5); // 4" pulley + 0.5"
      // NEW LOGIC: 4.5" frame < (4" pulley + 2.5") = 6.5" threshold → snubs REQUIRED
      expect(result.outputs?.requires_snub_rollers).toBe(true);
      expect(result.outputs?.cost_flag_low_profile).toBe(true);
    });

    it('should output frame height for Custom mode', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 5.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.effective_frame_height_in).toBe(5.5);
      expect(result.outputs?.cost_flag_custom_frame).toBe(true);
    });

    it('should require snub rollers for low custom frame height', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 3.5, // Less than 4" pulley
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.effective_frame_height_in).toBe(3.5);
      expect(result.outputs?.requires_snub_rollers).toBe(true);
      expect(result.outputs?.cost_flag_snub_rollers).toBe(true);
      expect(result.outputs?.cost_flag_design_review).toBe(true);
    });

    it('should warn on design review for low frame heights', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 3.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'frame_height_mode' && w.message.includes('Design review')
        )
      ).toBe(true);
    });

    it('should info on snub roller requirement', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 3.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // v1.5 FIX: Message now mentions snub roller threshold
      expect(
        result.warnings?.some(
          (w) => w.field === 'frame_height_mode' && w.message.includes('Snub rollers will be required')
        )
      ).toBe(true);
    });
  });

  describe('Validation: Custom Frame Height', () => {
    const { validateInputs } = require('./rules');

    it('should error when Custom mode has no custom_frame_height_in', () => {
      const inputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 4,
        frame_height_mode: FrameHeightMode.Custom,
        // custom_frame_height_in missing
      } as unknown as SliderbedInputs;

      const errors = validateInputs(inputs);
      expect(errors.some((e: { field: string }) => e.field === 'custom_frame_height_in')).toBe(true);
    });

    it('should error when custom_frame_height_in < minimum', () => {
      const inputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 4,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 2.5, // Below 3.0" minimum
      } as unknown as SliderbedInputs;

      const errors = validateInputs(inputs);
      expect(errors.some((e: { field: string; message: string }) =>
        e.field === 'custom_frame_height_in' && e.message.includes('3')
      )).toBe(true);
    });

    it('should pass validation for valid custom frame height', () => {
      const inputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        pulley_diameter_in: 4,
        drive_rpm: 100,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 4.0, // Valid
      } as unknown as SliderbedInputs;

      const errors = validateInputs(inputs);
      expect(errors.filter((e: { field: string }) => e.field === 'custom_frame_height_in').length).toBe(0);
    });
  });

  describe('Roller Quantity Calculations', () => {
    const { calculateGravityRollerQuantity, calculateSnubRollerQuantity, GRAVITY_ROLLER_SPACING_IN } = require('./formulas');

    describe('calculateGravityRollerQuantity', () => {
      it('should return 0 for zero-length conveyor', () => {
        expect(calculateGravityRollerQuantity(0, false)).toBe(0);
      });

      it('should return minimum 2 rollers for short conveyor without snubs', () => {
        // 30" conveyor / 60" spacing = 0 + 1 = 1, but min is 2
        expect(calculateGravityRollerQuantity(30, false)).toBe(2);
      });

      it('should calculate rollers based on spacing without snubs', () => {
        // 120" conveyor / 60" spacing = 2 + 1 = 3 rollers
        expect(calculateGravityRollerQuantity(120, false)).toBe(3);
        // 240" conveyor / 60" spacing = 4 + 1 = 5 rollers
        expect(calculateGravityRollerQuantity(240, false)).toBe(5);
      });

      it('should subtract end rollers when snubs are present', () => {
        // 120" conveyor / 60" spacing = 3 total positions
        // With snubs: 3 - 2 = 1 gravity roller (mid-span)
        expect(calculateGravityRollerQuantity(120, true)).toBe(1);
      });

      it('should return 0 gravity rollers when snubs handle everything', () => {
        // 30" conveyor / 60" spacing = 2 total positions
        // With snubs: 2 - 2 = 0 gravity rollers (snubs cover both ends)
        expect(calculateGravityRollerQuantity(30, true)).toBe(0);
      });

      it('should have snubs and gravity rollers coexist for long conveyors', () => {
        // 360" conveyor (30 feet) / 60" spacing = 6 + 1 = 7 total positions
        // With snubs: 7 - 2 = 5 gravity rollers in mid-span
        expect(calculateGravityRollerQuantity(360, true)).toBe(5);
        // Layout: [snub]---[gravity]---[gravity]---[gravity]---[gravity]---[gravity]---[snub]
      });
    });

    describe('calculateSnubRollerQuantity', () => {
      it('should return 0 when snubs not required', () => {
        expect(calculateSnubRollerQuantity(false)).toBe(0);
      });

      it('should return 2 when snubs are required', () => {
        // One at each end (near drive and tail pulleys)
        expect(calculateSnubRollerQuantity(true)).toBe(2);
      });
    });

    describe('Integration: Roller Coexistence', () => {
      it('should output both gravity and snub rollers for low profile long conveyor', () => {
        const inputs: SliderbedInputs = {
          conveyor_length_cc_in: 360, // 30 feet
          conveyor_width_in: 24,
          pulley_diameter_in: 4,
          drive_pulley_diameter_in: 4,
          tail_pulley_diameter_in: 4,
          drive_rpm: 100,
          part_weight_lbs: 5,
          part_length_in: 12,
          part_width_in: 6,
          orientation: Orientation.Lengthwise,
          frame_height_mode: FrameHeightMode.LowProfile, // 4.5" frame < 6.5" threshold
          drop_height_in: 0,
          part_temperature_class: PartTemperatureClass.Ambient,
          fluid_type: FluidType.None,
          part_spacing_in: 0,
          belt_speed_fpm: 50,
          material_type: MaterialType.Steel,
          process_type: ProcessType.Assembly,
          parts_sharp: PartsSharp.No,
          environment_factors: [EnvironmentFactors.Indoor],
          ambient_temperature: AmbientTemperature.Normal,
          power_feed: PowerFeed.V480_3Ph,
          controls_package: ControlsPackage.StartStop,
          spec_source: SpecSource.Standard,
          field_wiring_required: FieldWiringRequired.No,
          bearing_grade: BearingGrade.Standard,
          documentation_package: DocumentationPackage.Basic,
          finish_paint_system: FinishPaintSystem.PowderCoat,
          labels_required: LabelsRequired.Yes,
          send_to_estimating: SendToEstimating.No,
          motor_brand: MotorBrand.Standard,
          bottom_covers: false,
          side_rails: SideRails.None,
          end_guards: EndGuards.None,
          finger_safe: false,
          lacing_style: LacingStyle.Endless,
          side_skirts: false,
          sensor_options: [],
          pulley_surface_type: PulleySurfaceType.Plain,
          start_stop_application: false,
          direction_mode: DirectionMode.OneDirection,
          side_loading_direction: SideLoadingDirection.None,
          drive_location: DriveLocation.Head,
          brake_motor: false,
          gearmotor_orientation: GearmotorOrientation.SideMount,
          drive_hand: DriveHand.RightHand,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          shaft_diameter_mode: ShaftDiameterMode.Calculated,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        expect(result.outputs?.requires_snub_rollers).toBe(true);
        expect(result.outputs?.snub_roller_quantity).toBe(2);
        // 360" / 60" = 7 positions, minus 2 for snubs = 5 gravity rollers
        expect(result.outputs?.gravity_roller_quantity).toBe(5);
        expect(result.outputs?.gravity_roller_spacing_in).toBe(GRAVITY_ROLLER_SPACING_IN);
      });

      it('should output only gravity rollers when frame height above snub threshold', () => {
        const inputs: SliderbedInputs = {
          conveyor_length_cc_in: 240,
          conveyor_width_in: 24,
          pulley_diameter_in: 4,
          drive_pulley_diameter_in: 4,
          tail_pulley_diameter_in: 4,
          drive_rpm: 100,
          part_weight_lbs: 5,
          part_length_in: 12,
          part_width_in: 6,
          orientation: Orientation.Lengthwise,
          frame_height_mode: FrameHeightMode.Custom,
          custom_frame_height_in: 7.0, // Above 6.5" threshold (4" + 2.5")
          drop_height_in: 0,
          part_temperature_class: PartTemperatureClass.Ambient,
          fluid_type: FluidType.None,
          part_spacing_in: 0,
          belt_speed_fpm: 50,
          material_type: MaterialType.Steel,
          process_type: ProcessType.Assembly,
          parts_sharp: PartsSharp.No,
          environment_factors: [EnvironmentFactors.Indoor],
          ambient_temperature: AmbientTemperature.Normal,
          power_feed: PowerFeed.V480_3Ph,
          controls_package: ControlsPackage.StartStop,
          spec_source: SpecSource.Standard,
          field_wiring_required: FieldWiringRequired.No,
          bearing_grade: BearingGrade.Standard,
          documentation_package: DocumentationPackage.Basic,
          finish_paint_system: FinishPaintSystem.PowderCoat,
          labels_required: LabelsRequired.Yes,
          send_to_estimating: SendToEstimating.No,
          motor_brand: MotorBrand.Standard,
          bottom_covers: false,
          side_rails: SideRails.None,
          end_guards: EndGuards.None,
          finger_safe: false,
          lacing_style: LacingStyle.Endless,
          side_skirts: false,
          sensor_options: [],
          pulley_surface_type: PulleySurfaceType.Plain,
          start_stop_application: false,
          direction_mode: DirectionMode.OneDirection,
          side_loading_direction: SideLoadingDirection.None,
          drive_location: DriveLocation.Head,
          brake_motor: false,
          gearmotor_orientation: GearmotorOrientation.SideMount,
          drive_hand: DriveHand.RightHand,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          shaft_diameter_mode: ShaftDiameterMode.Calculated,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        expect(result.outputs?.requires_snub_rollers).toBe(false);
        expect(result.outputs?.snub_roller_quantity).toBe(0);
        // 240" / 60" = 4 + 1 = 5 gravity rollers (all positions)
        expect(result.outputs?.gravity_roller_quantity).toBe(5);
      });
    });
  });
});

// ============================================================================
// v1.6: SPEED MODE REGRESSION TESTS
// ============================================================================

describe('v1.6 Speed Mode Regression Tests', () => {
  // Application field defaults (used in all tests)
  const APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
    ambient_temperature: AmbientTemperature.Normal,
    power_feed: PowerFeed.V480_3Ph,
    controls_package: ControlsPackage.StartStop,
    spec_source: SpecSource.Standard,
    field_wiring_required: FieldWiringRequired.No,
    bearing_grade: BearingGrade.Standard,
    documentation_package: DocumentationPackage.Basic,
    finish_paint_system: FinishPaintSystem.PowderCoat,
    labels_required: LabelsRequired.Yes,
    send_to_estimating: SendToEstimating.No,
    motor_brand: MotorBrand.Standard,
    // Features & Options
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
    // Belt tracking & pulley
    belt_tracking_method: BeltTrackingMethod.Crowned,
    shaft_diameter_mode: ShaftDiameterMode.Calculated,
    // v1.4: Support types
    tail_support_type: EndSupportType.External,
    drive_support_type: EndSupportType.External,
  };

  // Tolerance for floating point comparisons
  const TOLERANCE = 0.02;

  describe('Fixture A: Belt Speed Mode', () => {
    /**
     * Fixture A: Belt Speed Mode
     * Inputs:
     * - speed_mode = belt_speed
     * - belt_speed_fpm = 65.45
     * - motor_rpm = 1750
     * - drive_pulley_diameter_in = 2.5
     *
     * Expected:
     * - drive_rpm ≈ 100.00
     * - belt_speed_fpm_calc = 65.45 (same as input)
     * - gear_ratio = 17.50
     */
    it('should calculate drive_rpm from belt_speed_fpm correctly', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        conveyor_incline_deg: 0,
        pulley_diameter_in: 2.5,
        drive_pulley_diameter_in: 2.5,
        tail_pulley_diameter_in: 2.5,
        // v1.6: Speed mode inputs
        speed_mode: SpeedMode.BeltSpeed,
        belt_speed_fpm: 65.45,
        motor_rpm: 1750,
        drive_rpm: 0, // Legacy field, not used in belt_speed mode
        // Product
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0.5,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();

      // Verify speed mode was used
      expect(result.outputs?.speed_mode_used).toBe(SpeedMode.BeltSpeed);

      // Calculate expected drive RPM:
      // drive_rpm = belt_speed_fpm * 12 / (PI * pulley_diameter_in)
      // = 65.45 * 12 / (PI * 2.5)
      // = 785.4 / 7.854
      // ≈ 100.00
      expect(result.outputs?.drive_shaft_rpm).toBeCloseTo(100.00, 1);

      // Belt speed should be unchanged (it's the input)
      expect(result.outputs?.belt_speed_fpm).toBeCloseTo(65.45, 2);

      // Gear ratio = motor_rpm / drive_rpm = 1750 / 100 = 17.5
      expect(result.outputs?.gear_ratio).toBeCloseTo(17.50, 2);

      // Motor RPM used should be the input value
      expect(result.outputs?.motor_rpm_used).toBe(1750);
    });
  });

  describe('Fixture B: Drive RPM Mode', () => {
    /**
     * Fixture B: Drive RPM Mode
     * Inputs:
     * - speed_mode = drive_rpm
     * - drive_rpm_input = 100
     * - motor_rpm = 1750
     * - drive_pulley_diameter_in = 2.5
     *
     * Expected:
     * - belt_speed_fpm_calc ≈ 65.45
     * - gear_ratio = 17.50
     */
    it('should calculate belt_speed_fpm from drive_rpm_input correctly', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        conveyor_incline_deg: 0,
        pulley_diameter_in: 2.5,
        drive_pulley_diameter_in: 2.5,
        tail_pulley_diameter_in: 2.5,
        // v1.6: Speed mode inputs
        speed_mode: SpeedMode.DriveRpm,
        drive_rpm_input: 100,
        motor_rpm: 1750,
        belt_speed_fpm: 0, // Not used in drive_rpm mode
        drive_rpm: 100, // Legacy field, synced with drive_rpm_input
        // Product
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0.5,
        ...APPLICATION_DEFAULTS,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();

      // Verify speed mode was used
      expect(result.outputs?.speed_mode_used).toBe(SpeedMode.DriveRpm);

      // Drive RPM should be the input value
      expect(result.outputs?.drive_shaft_rpm).toBeCloseTo(100.00, 2);

      // Calculate expected belt speed:
      // belt_speed_fpm = drive_rpm * PI * pulley_diameter_in / 12
      // = 100 * PI * 2.5 / 12
      // = 100 * 7.854 / 12
      // ≈ 65.45
      expect(result.outputs?.belt_speed_fpm).toBeCloseTo(65.45, 1);

      // Gear ratio = motor_rpm / drive_rpm = 1750 / 100 = 17.5
      expect(result.outputs?.gear_ratio).toBeCloseTo(17.50, 2);

      // Motor RPM used should be the input value
      expect(result.outputs?.motor_rpm_used).toBe(1750);
    });
  });

  describe('Speed Mode Migration', () => {
    it('should migrate legacy configs to drive_rpm mode', () => {
      // Legacy config: has drive_rpm but no speed_mode
      const legacyInputs: Partial<SliderbedInputs> = {
        drive_rpm: 100,
        belt_speed_fpm: 50,
        // No speed_mode set
      };

      const migrated = migrateInputs(legacyInputs);

      // Should be migrated to drive_rpm mode to preserve original behavior
      expect(migrated.speed_mode).toBe(SpeedMode.DriveRpm);
      expect(migrated.drive_rpm_input).toBe(100);
    });

    it('should default new configs to belt_speed mode', () => {
      // New config: no drive_rpm set
      const newInputs: Partial<SliderbedInputs> = {
        belt_speed_fpm: 65.45,
        // No drive_rpm or speed_mode
      };

      const migrated = migrateInputs(newInputs);

      // Should default to belt_speed mode (v1.6 default)
      expect(migrated.speed_mode).toBe(SpeedMode.BeltSpeed);
    });
  });

  describe('Math Consistency', () => {
    it('should produce same results regardless of mode when inputs are equivalent', () => {
      // Define the expected pulley diameter
      const pulleyDia = 4.0;
      const motorRpm = 1750;
      const targetDriveRpm = 100;

      // Calculate belt speed from drive RPM
      const beltSpeedFromDriveRpm = targetDriveRpm * Math.PI * pulleyDia / 12;

      // Test in Belt Speed mode
      const beltSpeedInputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        conveyor_width_in: 24,
        conveyor_incline_deg: 0,
        pulley_diameter_in: pulleyDia,
        drive_pulley_diameter_in: pulleyDia,
        tail_pulley_diameter_in: pulleyDia,
        speed_mode: SpeedMode.BeltSpeed,
        belt_speed_fpm: beltSpeedFromDriveRpm,
        motor_rpm: motorRpm,
        drive_rpm: 0,
        part_weight_lbs: 5,
        part_length_in: 12,
        part_width_in: 6,
        drop_height_in: 0,
        part_temperature_class: PartTemperatureClass.Ambient,
        fluid_type: FluidType.None,
        orientation: Orientation.Lengthwise,
        part_spacing_in: 0.5,
        ...APPLICATION_DEFAULTS,
      };

      // Test in Drive RPM mode
      const driveRpmInputs: SliderbedInputs = {
        ...beltSpeedInputs,
        speed_mode: SpeedMode.DriveRpm,
        drive_rpm_input: targetDriveRpm,
        belt_speed_fpm: 0,
        drive_rpm: targetDriveRpm,
      };

      const resultBeltSpeed = runCalculation({ inputs: beltSpeedInputs });
      const resultDriveRpm = runCalculation({ inputs: driveRpmInputs });

      expect(resultBeltSpeed.success).toBe(true);
      expect(resultDriveRpm.success).toBe(true);

      // Both should produce the same drive shaft RPM
      expect(resultBeltSpeed.outputs?.drive_shaft_rpm).toBeCloseTo(
        resultDriveRpm.outputs?.drive_shaft_rpm ?? 0,
        1
      );

      // Both should produce the same belt speed
      expect(resultBeltSpeed.outputs?.belt_speed_fpm).toBeCloseTo(
        resultDriveRpm.outputs?.belt_speed_fpm ?? 0,
        1
      );

      // Both should produce the same gear ratio
      expect(resultBeltSpeed.outputs?.gear_ratio).toBeCloseTo(
        resultDriveRpm.outputs?.gear_ratio ?? 0,
        2
      );
    });
  });
});

// ============================================================================
// v1.7 GEARMOTOR MOUNTING STYLE & SPROCKET CHAIN RATIO TESTS
// ============================================================================

describe('v1.7 Gearmotor Mounting Style & Sprocket Chain Ratio', () => {
  // Application field defaults (used in all tests)
  const APPLICATION_DEFAULTS = {
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
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
    bottom_covers: false,
    side_rails: SideRails.None,
    end_guards: EndGuards.None,
    lacing_style: LacingStyle.Standard,
    head_pulley_surface: PulleySurfaceType.Bare,
    tail_pulley_surface: PulleySurfaceType.Bare,
  };

  const BASE_INPUTS: SliderbedInputs = {
    belt_width_in: 18,
    length_ft: 20,
    incline_deg: 0,
    belt_speed_fpm: 50,
    motor_rpm: 1750,
    drive_rpm: 0,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0.5,
    speed_mode: SpeedMode.BeltSpeed,
    ...APPLICATION_DEFAULTS,
  };

  describe('Fixture 1: Shaft mounted ignores sprockets', () => {
    it('should have chain_ratio = 1 when shaft_mounted (default)', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.ShaftMounted,
        gm_sprocket_teeth: 18,
        drive_shaft_sprocket_teeth: 36,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);
      expect(result.outputs?.chain_ratio).toBe(1);
      expect(result.outputs?.gearmotor_output_rpm).toBe(result.outputs?.drive_shaft_rpm);
      expect(result.outputs?.total_drive_ratio).toBe(result.outputs?.gear_ratio);
    });

    it('should default to shaft_mounted when not specified', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);
      expect(result.outputs?.chain_ratio).toBe(1);
    });
  });

  describe('Fixture 2: Bottom mount 18T -> 24T (chain_ratio = 1.333)', () => {
    it('should calculate chain_ratio as driven/driver (24/18 = 1.333)', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 18,
        drive_shaft_sprocket_teeth: 24,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);
      expect(result.outputs?.chain_ratio).toBeCloseTo(24 / 18, 4);
      expect(result.outputs?.chain_ratio).toBeCloseTo(1.3333, 3);
    });

    it('should calculate gearmotor_output_rpm = drive_shaft_rpm * chain_ratio', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 18,
        drive_shaft_sprocket_teeth: 24,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);

      const expectedChainRatio = 24 / 18;
      const driveShaftRpm = result.outputs?.drive_shaft_rpm ?? 0;
      const expectedGearmotorRpm = driveShaftRpm * expectedChainRatio;

      expect(result.outputs?.gearmotor_output_rpm).toBeCloseTo(expectedGearmotorRpm, 2);
    });

    it('should calculate total_drive_ratio = gear_ratio * chain_ratio', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 18,
        drive_shaft_sprocket_teeth: 24,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);

      const expectedChainRatio = 24 / 18;
      const gearRatio = result.outputs?.gear_ratio ?? 0;
      const expectedTotalRatio = gearRatio * expectedChainRatio;

      expect(result.outputs?.total_drive_ratio).toBeCloseTo(expectedTotalRatio, 2);
    });
  });

  describe('Fixture 3: Bottom mount 24T -> 18T (chain_ratio = 0.75)', () => {
    it('should calculate chain_ratio for speed-up configuration (18/24 = 0.75)', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 24,
        drive_shaft_sprocket_teeth: 18,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);
      expect(result.outputs?.chain_ratio).toBeCloseTo(18 / 24, 4);
      expect(result.outputs?.chain_ratio).toBeCloseTo(0.75, 3);
    });

    it('should produce lower gearmotor_output_rpm than drive_shaft_rpm', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 24,
        drive_shaft_sprocket_teeth: 18,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);

      const driveShaftRpm = result.outputs?.drive_shaft_rpm ?? 0;
      const gearmotorRpm = result.outputs?.gearmotor_output_rpm ?? 0;

      expect(gearmotorRpm).toBeLessThan(driveShaftRpm);
      expect(gearmotorRpm).toBeCloseTo(driveShaftRpm * 0.75, 2);
    });
  });

  describe('Fixture 4: Validation failures', () => {
    it('should fail validation when gm_sprocket_teeth = 0 for bottom_mount', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 0,
        drive_shaft_sprocket_teeth: 24,
      };

      const result = runCalculation({ inputs });
      expect(result.errors?.some((e) => e.field === 'gm_sprocket_teeth')).toBe(true);
    });

    it('should fail validation when drive_shaft_sprocket_teeth = 0 for bottom_mount', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 18,
        drive_shaft_sprocket_teeth: 0,
      };

      const result = runCalculation({ inputs });
      expect(result.errors?.some((e) => e.field === 'drive_shaft_sprocket_teeth')).toBe(true);
    });

    it('should warn when chain_ratio > 3.0', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 10,
        drive_shaft_sprocket_teeth: 40,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);
      expect(result.outputs?.chain_ratio).toBeCloseTo(4.0, 2);
      expect(result.warnings?.some((w) => w.message.toLowerCase().includes('chain ratio'))).toBe(
        true
      );
    });

    it('should warn when chain_ratio < 0.5', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 40,
        drive_shaft_sprocket_teeth: 10,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);
      expect(result.outputs?.chain_ratio).toBeCloseTo(0.25, 2);
      expect(result.warnings?.some((w) => w.message.toLowerCase().includes('chain ratio'))).toBe(
        true
      );
    });

    it('should warn when sprocket teeth < 12', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        gearmotor_mounting_style: GearmotorMountingStyle.BottomMount,
        gm_sprocket_teeth: 10,
        drive_shaft_sprocket_teeth: 24,
      };

      const result = runCalculation({ inputs });
      expect(result.success).toBe(true);
      expect(
        result.warnings?.some((w) => w.message.includes('sprocket') && w.message.includes('12'))
      ).toBe(true);
    });
  });
});

// ============================================================================
// EXCEL PARITY TEST FIXTURES
// ============================================================================

describe('Excel Parity Tests', () => {
  it('should be implemented with actual Excel fixtures', () => {
    // TODO: Import fixtures from Excel and validate outputs match within tolerance
    // See fixtures.ts for structure
    expect(true).toBe(true);
  });
});
