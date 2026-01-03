/**
 * SLIDERBED CONVEYOR v1 - CORE TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains: Sliderbed Conveyor v1 - Calculation Engine
 */

import { runCalculation } from '../../../lib/calculator/engine';
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
  SupportMethod,
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
  FrameHeightMode,
  SpeedMode,
} from '../schema';

describe('Sliderbed Conveyor v1 - Calculation Engine', () => {
  // Application field defaults (used in all tests)
  const APPLICATION_DEFAULTS = {
    material_form: 'PARTS', // v1.48: Required for new applications
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: [EnvironmentFactors.Indoor],
    ambient_temperature: AmbientTemperature.Normal,
    power_feed: PowerFeed.V480_3Ph,
    controls_package: ControlsPackage.StartStop,
    spec_source: SpecSource.Standard,
    support_method: SupportMethod.External,
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
        belt_width_in: 24,
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
        belt_width_in: 20,
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
        belt_width_in: 20,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 20,
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
        belt_width_in: 20,
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
        belt_width_in: 20,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
      belt_width_in: 24,
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
        belt_width_in: 24,
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

      expect(result.metadata.model_key).toBe('belt_conveyor_v1');
      expect(result.metadata.model_version_id).toBeDefined();
      expect(result.metadata.calculated_at).toBeDefined();
    });

    it('should use custom model_version_id when provided', () => {
      const inputs: SliderbedInputs = {
        conveyor_length_cc_in: 120,
        belt_width_in: 24,
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
      belt_width_in: 24,
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
      belt_width_in: 24,
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

    it('should require v_guide_profile OR v_guide_key when V-guided', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        // Neither v_guide_profile nor v_guide_key set
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      // v1.23: Error field changed from v_guide_profile to v_guide_key
      expect(result.errors?.some(e => e.field === 'v_guide_key')).toBe(true);
    });

    it('should accept v_guide_key alone for V-guided (v1.23+)', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_key: 'K10_SOLID', // v1.22+ key format without v_guide_profile
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.is_v_guided).toBe(true);
    });

    it('should accept v_guide_profile alone for V-guided (legacy)', () => {
      const inputs = {
        ...baseInputs,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_profile: VGuideProfile.K10, // Legacy profile enum
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.is_v_guided).toBe(true);
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

    // Regression test: shaft outputs must NEVER be NaN
    it('should produce finite shaft outputs (never NaN or Infinity)', () => {
      const inputs = {
        ...baseInputs,
        shaft_diameter_mode: ShaftDiameterMode.Calculated,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Shaft outputs must be finite numbers if defined
      if (result.outputs?.drive_shaft_diameter_in !== undefined) {
        expect(Number.isFinite(result.outputs.drive_shaft_diameter_in)).toBe(true);
      }
      if (result.outputs?.tail_shaft_diameter_in !== undefined) {
        expect(Number.isFinite(result.outputs.tail_shaft_diameter_in)).toBe(true);
      }
    });
  });

  // ========================================================================
  // BELT PIW/PIL OVERRIDE TESTS
  // ========================================================================

  describe('Belt PIW/PIL Overrides', () => {
    const baseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
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
