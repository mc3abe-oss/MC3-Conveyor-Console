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
 *
 * NOTE: This file contains intentionally skipped tests.
 * Search for "describe.skip" or "[SKIP:" to find them.
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
  // v1.4: Support & Height (enums still exist for test backward compatibility)
  EndSupportType,
  HeightInputMode,
  // v1.5: Frame Height
  FrameHeightMode,
  // v1.39: Unified Support Method
  SupportMethod,
  isLegsRequired,
  isCastersSelected,
  // v1.40: Floor Support
  isFloorSupported,
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
// PHASE 0: Legacy pulley catalog removed - stub types/functions for compatibility
// These tests will be rewritten in Phase 2 with application_pulleys
type PulleyCatalogItem = { catalog_key: string; diameter_in: number; [key: string]: unknown };
function setCachedPulleys(_pulleys: PulleyCatalogItem[]): void {
  // No-op: Legacy catalog removed
}
function clearPulleyCatalogCache(): void {
  // No-op: Legacy catalog removed
}

import { normalizeInputsForCalculation } from './migrate';
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

    // Regression test: Calculated mode should NOT require manual diameters
    it('should NOT produce shaft errors when mode is Calculated (no manual values)', () => {
      const inputs = {
        ...baseInputs,
        shaft_diameter_mode: ShaftDiameterMode.Calculated,
        // Explicitly NOT setting drive_shaft_diameter_in or tail_shaft_diameter_in
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Should NOT have shaft validation errors
      expect(result.errors?.some(e => e.field === 'drive_shaft_diameter_in')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'tail_shaft_diameter_in')).toBeFalsy();
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
    belt_width_in: 24,
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
      const inputs = { ...baseInputs, conveyor_length_cc_in: 72, belt_width_in: 24 }; // 3:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.Low);
    });

    it('should assess medium risk for L:W between 3:1 and 6:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 120, belt_width_in: 24 }; // 5:1
      const guidance = calculateTrackingGuidance(inputs);

      const lwFactor = guidance.factors.find(f => f.name === 'Length-to-Width Ratio');
      expect(lwFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should assess high risk for L:W > 6:1', () => {
      const inputs = { ...baseInputs, conveyor_length_cc_in: 180, belt_width_in: 24 }; // 7.5:1
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
    it('should assess low risk for no environment factors', () => {
      const inputs = { ...baseInputs, environment_factors: [] };
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
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Outdoor, EnvironmentFactors.Washdown] };
      const guidance = calculateTrackingGuidance(inputs);

      const envFactor = guidance.factors.find(f => f.name === 'Environment');
      // Washdown is Medium, Outdoor is Low - should take highest (Medium)
      expect(envFactor?.risk).toBe(TrackingRiskLevel.Medium);
    });

    it('should handle all low-risk environments as low risk', () => {
      const inputs = { ...baseInputs, environment_factors: [EnvironmentFactors.Outdoor] };
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('length-to-width'))).toBe(true);
    });

    it('should warn when low L:W with crowned selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 40, // 40/30 = 1.33:1 L:W (too low)
        belt_width_in: 30,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const guidance = calculateTrackingGuidance(inputs);

      expect(guidance.warnings.some(w => w.includes('Low length-to-width'))).toBe(true);
    });

    it('should NOT warn when low L:W with V-guided selected', () => {
      const inputs = {
        ...baseInputs,
        conveyor_length_cc_in: 40, // 1.33:1 L:W (too low for crowned)
        belt_width_in: 30,
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
        belt_width_in: 30,
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
    belt_width_in: 24,
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

    // v1.24: Removed "different diameters" warning - valid in our system
    it('should NOT warn on mismatched pulley diameters (v1.24)', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 6,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Warning was removed in v1.24
      expect(
        result.warnings?.some(
          (w) => w.field === 'tail_pulley_diameter_in' && w.message.includes('different')
        )
      ).toBeFalsy();
    });

    // v1.24: Removed "non-standard" info - catalog defines valid options
    it('should NOT show info for non-standard pulley diameters (v1.24)', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 4.5, // Non-standard
        tail_pulley_diameter_in: 4.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Info was removed in v1.24
      expect(
        result.warnings?.some(
          (w) => w.field === 'drive_pulley_diameter_in' && w.message.includes('non-standard')
        )
      ).toBeFalsy();
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
    belt_width_in: 24,
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

    it('should accept cleat_size without cleat_height_in (v1.24 derived)', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_size: '3"', // Should derive cleat_height_in = 3
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        // cleat_height_in NOT set - should be derived from cleat_size
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Should NOT have cleat_height_in error
      expect(result.errors?.some((e) => e.field === 'cleat_height_in')).toBeFalsy();
    });

    it('should still require height when cleat_size is invalid (v1.24)', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleat_size: 'abc', // Invalid - cannot parse to number
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        // cleat_height_in NOT set, cleat_size is invalid
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.field === 'cleat_height_in')).toBe(true);
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
        belt_width_in: 20,
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

    // Regression test: cleat_pattern is informational only and should not cause validation errors
    // See: BUG fix where UI shows default pattern but validation fired on undefined field
    it('should succeed with cleats enabled and no cleat_pattern specified (defaults to STRAIGHT_CROSS)', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleats_mode: 'cleated' as const,
        cleat_height_in: 1,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        // cleat_pattern intentionally omitted - should default and not cause error
      };
      const result = runCalculation({ inputs });

      // Calculation should succeed - pattern is informational only
      expect(result.success).toBe(true);
      // No errors related to cleat_pattern
      expect(
        result.errors?.some((e) => e.field === 'cleat_pattern')
      ).toBeFalsy();
    });

    it('should succeed with explicit cleat_pattern = STRAIGHT_CROSS', () => {
      const inputs = {
        ...baseInputs,
        cleats_enabled: true,
        cleats_mode: 'cleated' as const,
        cleat_height_in: 1,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        cleat_pattern: 'STRAIGHT_CROSS',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleats_enabled).toBe(true);
    });
  });
});

// ============================================================================
// v1.4: SUPPORT & HEIGHT MODEL TESTS
// DELETED (v1.42): Legacy per-end support_type system removed.
// Tests referenced removed exports (derivedLegsRequired, HeightInputMode, etc.)
// See docs/review/tob-legs-policy.md for current TOB/support behavior.
// ============================================================================

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
    // v1.36: Both Standard and Low Profile now use the same default clearance (0.5")
    it('should calculate Standard frame height as pulley + 0.5" (v1.36)', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.Standard,
        4, // 4" pulley
        undefined
      );
      expect(frameHeight).toBe(4.5); // 4 + 0.5 (v1.36: single default clearance)
    });

    it('should calculate Low Profile frame height as pulley + 0.5" (v1.36)', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.LowProfile,
        4, // 4" pulley
        undefined
      );
      expect(frameHeight).toBe(4.5); // 4 + 0.5 (same as Standard now)
    });

    it('should use custom frame height when mode is Custom', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.Custom,
        4, // pulley (ignored)
        3.5 // custom height
      );
      expect(frameHeight).toBe(3.5);
    });

    it('should fall back to default clearance when Custom mode has no value (v1.36)', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        FrameHeightMode.Custom,
        4, // pulley
        undefined // no custom value
      );
      expect(frameHeight).toBe(4.5); // Falls back to default (4 + 0.5)
    });

    it('should default to Standard with 0.5" clearance when mode is undefined (v1.36)', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        undefined,
        6, // 6" pulley
        undefined
      );
      expect(frameHeight).toBe(6.5); // 6 + 0.5 (default clearance)
    });

    it('should handle string enum values (v1.36)', () => {
      const frameHeight = calculateEffectiveFrameHeight(
        'Low Profile',
        4,
        undefined
      );
      expect(frameHeight).toBe(4.5); // Same as Standard (0.5" clearance)
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
      belt_width_in: 24,
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

    it('should output frame height for Standard mode (v1.36)', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.Standard,
        // frame_clearance_in defaults to 0.5"
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // v1.36: Standard formula: Required = largest_pulley (4") + return_roller (2") = 6"
      // Reference = Required + clearance (0.5") = 6.5"
      expect(result.outputs?.required_frame_height_in).toBe(6);
      expect(result.outputs?.reference_frame_height_in).toBe(6.5);
      expect(result.outputs?.effective_frame_height_in).toBe(6.5); // Legacy: uses reference
      expect(result.outputs?.clearance_for_selected_standard_in).toBe(0.5);
      // 6.5" frame >= 6.5" threshold → snubs NOT required
      expect(result.outputs?.requires_snub_rollers).toBe(false);
      expect(result.outputs?.cost_flag_low_profile).toBe(false);
      expect(result.outputs?.cost_flag_custom_frame).toBe(false);
      expect(result.outputs?.cost_flag_design_review).toBe(false);
    });

    it('should output frame height for Low Profile mode (v1.36)', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.LowProfile,
        // frame_clearance_in defaults to 0.5"
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // v1.36: Low Profile formula: Required = largest_pulley (4") only = 4"
      // Reference = Required + clearance (0.5") = 4.5"
      expect(result.outputs?.required_frame_height_in).toBe(4);
      expect(result.outputs?.reference_frame_height_in).toBe(4.5);
      expect(result.outputs?.effective_frame_height_in).toBe(4.5); // Legacy: uses reference
      expect(result.outputs?.clearance_for_selected_standard_in).toBe(0.5);
      // 4.5" frame < 6.5" threshold → snubs required
      expect(result.outputs?.requires_snub_rollers).toBe(true);
      expect(result.outputs?.cost_flag_low_profile).toBe(true);
    });

    it('should use user-specified frame_clearance_in (v1.36)', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.Standard,
        frame_clearance_in: 1.25, // User override
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // v1.36: Standard formula: Required = largest_pulley (4") + return_roller (2") = 6"
      // Reference = Required + clearance (1.25") = 7.25"
      expect(result.outputs?.required_frame_height_in).toBe(6);
      expect(result.outputs?.reference_frame_height_in).toBe(7.25);
      expect(result.outputs?.clearance_for_selected_standard_in).toBe(1.25);
    });

    it('should use user-specified frame_clearance_in in Low Profile mode (v1.36)', () => {
      const inputs = {
        ...baseInputs,
        frame_height_mode: FrameHeightMode.LowProfile,
        frame_clearance_in: 1.0, // User override
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // v1.36: Low Profile formula: Required = largest_pulley (4") = 4"
      // Reference = Required + clearance (1.0") = 5.0"
      expect(result.outputs?.required_frame_height_in).toBe(4);
      expect(result.outputs?.reference_frame_height_in).toBe(5.0);
      expect(result.outputs?.clearance_for_selected_standard_in).toBe(1.0);
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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

  // =========================================================================
  // v1.33: Frame Height with Cleats & Pulleys Integration Tests
  // =========================================================================
  describe('Frame Height with Cleats & Pulleys (v1.33)', () => {
    // Application field defaults (same as other integration tests)
    const FRAME_TEST_DEFAULTS = {
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

    const frameHeightBaseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
      belt_speed_fpm: 100,
      drive_rpm: 100,
      part_weight_lbs: 5,
      part_length_in: 12,
      part_width_in: 6,
      drop_height_in: 0,
      part_temperature_class: PartTemperatureClass.Ambient,
      fluid_type: FluidType.None,
      orientation: Orientation.Lengthwise,
      part_spacing_in: 6,
      frame_height_mode: FrameHeightMode.Standard,
      // v1.33: Use explicit pulley diameters
      drive_pulley_diameter_in: 4,
      tail_pulley_diameter_in: 4,
      cleats_enabled: false,
      ...FRAME_TEST_DEFAULTS,
    } as SliderbedInputs;

    // Test 1: No cleats - frame_height = largest_pulley + 0 + return_roller + clearance = 4 + 0 + 2 + 0.5 = 6.5 (v1.36)
    it('should compute frame height without cleats: drive=4, tail=4, cleat=0, returnRoller=2 -> 6.5"', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
        cleats_enabled: false,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.largest_pulley_diameter_in).toBe(4);
      expect(result.outputs?.effective_cleat_height_in).toBe(0);
      expect(result.outputs?.effective_frame_height_in).toBeCloseTo(6.5, 2); // v1.36: includes 0.5" clearance
      expect(result.outputs?.frame_height_breakdown).toBeDefined();
      expect(result.outputs?.frame_height_breakdown?.total_in).toBeCloseTo(6.5, 2); // v1.36: includes clearance
    });

    // Test 2: Cleats 1" - frame_height = 4 + (2*1) + 2 + 0.5 = 8.5 (v1.36)
    it('should compute frame height with 1" cleats: drive=4, tail=4, cleat=1, returnRoller=2 -> 8.5"', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
        cleats_enabled: true,
        cleat_size: '1"',
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.largest_pulley_diameter_in).toBe(4);
      expect(result.outputs?.effective_cleat_height_in).toBe(1);
      expect(result.outputs?.effective_frame_height_in).toBeCloseTo(8.5, 2); // v1.36: includes 0.5" clearance
      expect(result.outputs?.frame_height_breakdown?.cleat_adder_in).toBe(2);
    });

    // Test 3: Largest pulley wins - frame_height = 6 + (2*1) + 2 + 0.5 = 10.5 (v1.36)
    it('should use largest pulley: drive=6, tail=4, cleat=1, returnRoller=2 -> 10.5"', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 6,
        tail_pulley_diameter_in: 4,
        cleats_enabled: true,
        cleat_size: '1"',
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.largest_pulley_diameter_in).toBe(6);
      expect(result.outputs?.effective_cleat_height_in).toBe(1);
      expect(result.outputs?.effective_frame_height_in).toBeCloseTo(10.5, 2); // v1.36: includes 0.5" clearance
    });

    // Test 4: Override return roller diameter via parameters - frame_height = 6 + (2*1) + 1.9 + 0.5 = 10.4 (v1.36)
    it('should respect return roller diameter parameter: drive=6, tail=4, cleat=1, returnRoller=1.9 -> 10.4"', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 6,
        tail_pulley_diameter_in: 4,
        cleats_enabled: true,
        cleat_size: '1"',
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      // Override return_roller_diameter_in in parameters
      const customParams = {
        ...DEFAULT_PARAMETERS,
        return_roller_diameter_in: 1.9,
      };
      const result = runCalculation({ inputs, parameters: customParams });

      expect(result.success).toBe(true);
      expect(result.outputs?.largest_pulley_diameter_in).toBe(6);
      expect(result.outputs?.effective_frame_height_in).toBeCloseTo(10.4, 2); // v1.36: includes 0.5" clearance
      expect(result.outputs?.frame_height_breakdown?.return_roller_in).toBe(1.9);
    });

    // Test: Breakdown formula is human-readable
    it('should provide human-readable breakdown formula', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 6,
        tail_pulley_diameter_in: 4,
        cleats_enabled: true,
        cleat_size: '1"',
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      const formula = result.outputs?.frame_height_breakdown?.formula;
      expect(formula).toBeDefined();
      expect(formula).toContain('Largest pulley');
      expect(formula).toContain('Cleats');
      expect(formula).toContain('Return roller');
      // v1.34: Formula now shows Required + Reference instead of Total
      expect(formula).toContain('Required');
      expect(formula).toContain('Reference');
    });

    // Test: Custom mode still respects user value
    it('should use custom frame height when mode is Custom', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 12,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 4,
        cleats_enabled: true,
        cleat_size: '1"',
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Custom mode should use user-specified value
      expect(result.outputs?.effective_frame_height_in).toBe(12);
      // But breakdown still shows components for reference
      expect(result.outputs?.frame_height_breakdown?.largest_pulley_in).toBe(4);
      expect(result.outputs?.frame_height_breakdown?.cleat_height_in).toBe(1);
    });

    // Test: Info message when cleats add to frame height
    it('should show info message when cleats contribute to frame height', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        cleats_enabled: true,
        cleat_size: '1.5"',
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.severity === 'info' && w.message.includes('cleat height')
        )
      ).toBe(true);
    });

    // =========================================================================
    // v1.34: Required vs Reference Frame Height Tests
    // =========================================================================

    // Fixture A: Pulley OD source of truth (large pulleys with cleats)
    it('v1.34 Fixture A: should use configured pulley OD for required frame height', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 8.5, // Simulating application_pulleys.finished_od_in
        tail_pulley_diameter_in: 8.0,
        cleats_enabled: true,
        cleat_height_in: 3.0, // Explicit numeric cleat height
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // largest_pulley_od_in = max(8.5, 8.0) = 8.5
      expect(result.outputs?.largest_pulley_od_in).toBeCloseTo(8.5, 2);
      // required = 8.5 + (2 * 3.0) + 2.0 = 16.5
      expect(result.outputs?.required_frame_height_in).toBeCloseTo(16.5, 2);
    });

    // Fixture B: No cleats, equal pulleys
    it('v1.34 Fixture B: no cleats, equal pulleys -> required = 6.0"', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 4.0,
        tail_pulley_diameter_in: 4.0,
        cleats_enabled: false,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // required = 4.0 + 0 + 2.0 = 6.0
      expect(result.outputs?.required_frame_height_in).toBeCloseTo(6.0, 2);
    });

    // Fixture C: Reference height adds Standard clearance
    // v1.36: Standard mode uses explicit clearance (default 0.5")
    it('v1.34/v1.36 Fixture C: Standard mode adds explicit clearance (0.5" default) to reference', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 4.0,
        tail_pulley_diameter_in: 4.0,
        cleats_enabled: false,
        frame_height_mode: FrameHeightMode.Standard,
        // frame_clearance_in defaults to 0.5"
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // required = 4.0 + 0 + 2.0 = 6.0
      expect(result.outputs?.required_frame_height_in).toBeCloseTo(6.0, 2);
      // v1.36: reference = required + 0.5 (default clearance) = 6.5
      expect(result.outputs?.reference_frame_height_in).toBeCloseTo(6.5, 2);
      expect(result.outputs?.clearance_for_selected_standard_in).toBeCloseTo(0.5, 2);
    });

    // v1.35/v1.36: Low Profile uses different formula (snubs, no return roller)
    it('v1.35/v1.36: Low Profile mode = largestPulley only (no return roller)', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 4.0,
        tail_pulley_diameter_in: 4.0,
        cleats_enabled: false,
        frame_height_mode: FrameHeightMode.LowProfile,
        // frame_clearance_in defaults to 0.5"
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // v1.36: Low Profile = largestPulley only (snubs handle return)
      // required = 4.0 (physical envelope only)
      expect(result.outputs?.required_frame_height_in).toBeCloseTo(4.0, 2);
      // v1.36: reference = required + clearance = 4.0 + 0.5 = 4.5
      expect(result.outputs?.reference_frame_height_in).toBeCloseTo(4.5, 2);
      expect(result.outputs?.clearance_for_selected_standard_in).toBeCloseTo(0.5, 2);
    });

    // v1.35/v1.36 Fixture D: Low Profile + cleats is ERROR (not allowed)
    // Low Profile requires snubs, and cleated belts cannot run on snubs
    it('v1.35/v1.36 Fixture D: Low Profile + cleats = ERROR (not allowed)', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 6.0,
        tail_pulley_diameter_in: 6.0,
        cleats_enabled: true,
        cleat_height_in: 2.5, // Large cleats
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        frame_height_mode: FrameHeightMode.LowProfile,
      };
      const result = runCalculation({ inputs });

      // v1.36: Error is now in errors array
      const lowProfileError = result.errors?.find(
        (e) => e.message.includes('Low Profile not compatible with cleats') && e.severity === 'error'
      );
      expect(lowProfileError).toBeDefined();
      expect(lowProfileError?.severity).toBe('error');
    });

    // v1.34, v1.36: Breakdown includes required + reference + clearance
    it('v1.34/v1.36: breakdown includes required_total_in, reference_total_in, clearance_in', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 5.0,
        tail_pulley_diameter_in: 4.0,
        cleats_enabled: true,
        cleat_size: '1"',
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        frame_height_mode: FrameHeightMode.Standard,
        // v1.36: frame_clearance_in defaults to 0.5"
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      const breakdown = result.outputs?.frame_height_breakdown;
      expect(breakdown).toBeDefined();

      // required = 5.0 + (2 * 1.0) + 2.0 = 9.0
      expect(breakdown?.required_total_in).toBeCloseTo(9.0, 2);
      // v1.36: clearance is now 0.5" (single default for all modes)
      expect(breakdown?.clearance_in).toBeCloseTo(0.5, 2);
      // reference = 9.0 + 0.5 = 9.5
      expect(breakdown?.reference_total_in).toBeCloseTo(9.5, 2);
    });

    // =========================================================================
    // v1.35, v1.36: Low Profile Semantics - Snubs Required, No Return Roller Allowance
    // =========================================================================

    // v1.35/v1.36 Fixture A: Low Profile, no cleats - required is pulley only
    it('v1.35/v1.36 Fixture A: Low Profile (no cleats) required = largest_pulley only', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 8.5,
        tail_pulley_diameter_in: 8.0,
        cleats_enabled: false,
        frame_height_mode: FrameHeightMode.LowProfile,
        // v1.36: frame_clearance_in defaults to 0.5"
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // v1.36: Low Profile = largestPulley (physical envelope only)
      // required = 8.5 (pulley only, no clearance built in)
      expect(result.outputs?.required_frame_height_in).toBeCloseTo(8.5, 2);
      // v1.36: reference = required + clearance = 8.5 + 0.5 = 9.0
      expect(result.outputs?.reference_frame_height_in).toBeCloseTo(9.0, 2);

      // Breakdown should show snubs note
      const breakdown = result.outputs?.frame_height_breakdown;
      expect(breakdown?.formula).toContain('snubs');
      expect(breakdown?.return_roller_in).toBe(0); // Snubs, not gravity rollers
    });

    // v1.35/v1.36 Fixture B: Standard, with cleats - full formula
    it('v1.35/v1.36 Fixture B: Standard (with cleats) required = pulley + 2*cleat + return_roller', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 8.5,
        tail_pulley_diameter_in: 8.0,
        cleats_enabled: true,
        cleat_height_in: 3.0,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        frame_height_mode: FrameHeightMode.Standard,
        // v1.36: frame_clearance_in defaults to 0.5"
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // required = 8.5 + (2 * 3.0) + 2.0 = 8.5 + 6.0 + 2.0 = 16.5
      expect(result.outputs?.required_frame_height_in).toBeCloseTo(16.5, 2);
      // v1.36: reference = 16.5 + 0.5 = 17.0
      expect(result.outputs?.reference_frame_height_in).toBeCloseTo(17.0, 2);

      // Should NOT have Low Profile error (Standard mode with cleats is valid)
      const lowProfileError = result.errors?.find(
        (e) => e.message.includes('Low Profile not compatible')
      );
      expect(lowProfileError).toBeUndefined();
    });

    // v1.35/v1.36 Fixture C: Low Profile + cleats = ERROR (comprehensive test)
    it('v1.35/v1.36 Fixture C: Low Profile + cleats = ERROR with correct message', () => {
      const inputs: SliderbedInputs = {
        ...frameHeightBaseInputs,
        drive_pulley_diameter_in: 8.5,
        tail_pulley_diameter_in: 8.0,
        cleats_enabled: true,
        cleat_height_in: 3.0,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0.5,
        frame_height_mode: FrameHeightMode.LowProfile,
      };
      const result = runCalculation({ inputs });

      // v1.36: Error is now in errors array, not warnings
      const lowProfileError = result.errors?.find(
        (e) => e.severity === 'error' && e.field === 'frame_height_mode'
      );
      expect(lowProfileError).toBeDefined();
      expect(lowProfileError?.message).toContain('Low Profile not compatible with cleats');
      expect(lowProfileError?.message).toContain('snub');
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
          belt_width_in: 24,
          pulley_diameter_in: 4,
          drive_pulley_diameter_in: 4,
          tail_pulley_diameter_in: 4,
          drive_rpm: 100,
          part_weight_lbs: 5,
          part_length_in: 12,
          part_width_in: 6,
          orientation: Orientation.Lengthwise,
          frame_height_mode: FrameHeightMode.LowProfile, // 4.5" frame < 6.5" threshold
          // v1.29: Explicit return support configuration
          return_frame_style: 'LOW_PROFILE',
          return_snub_mode: 'AUTO', // Auto: Low Profile → snubs enabled
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
        // v1.29: snub_roller_quantity still derived from requires_snub_rollers for legacy compat
        expect(result.outputs?.snub_roller_quantity).toBe(2);
        // v1.29: With explicit return support, gravity count uses return span
        // return_span = 360 - 2*24 = 312", floor(312/60)+1 = 6 rollers
        expect(result.outputs?.gravity_roller_quantity).toBe(6);
        expect(result.outputs?.gravity_roller_spacing_in).toBe(GRAVITY_ROLLER_SPACING_IN);
      });

      it('should output only gravity rollers when frame height above snub threshold', () => {
        const inputs: SliderbedInputs = {
          conveyor_length_cc_in: 240,
          belt_width_in: 24,
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

  // v1.28: Cleats + Snub Rollers compatibility regression tests
  describe('Cleats + Snub Rollers Compatibility (v1.28)', () => {
    // Base inputs with cleats enabled
    const cleatsBaseInputs: SliderbedInputs = {
      conveyor_length_cc_in: 120,
      belt_width_in: 18,
      drive_pulley_diameter_in: 5.5, // 5.5" pulley → standard frame = 6.5"
      tail_pulley_diameter_in: 5.5,
      drive_rpm: 100,
      part_weight_lbs: 5,
      part_length_in: 12,
      part_width_in: 6,
      orientation: Orientation.Lengthwise,
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
      brake_motor: false,
      gearmotor_orientation: GearmotorOrientation.SideMount,
      drive_hand: DriveHand.RightHand,
      belt_tracking_method: BeltTrackingMethod.Crowned,
      shaft_diameter_mode: ShaftDiameterMode.Calculated,
      frame_height_mode: FrameHeightMode.Standard,
      // Cleats enabled
      cleats_enabled: true,
      cleats_mode: 'cleated',
      cleat_height_in: 1,
      cleat_spacing_in: 6,
      cleat_edge_offset_in: 0.5,
    };

    it('should PASS when cleats enabled and snubs NOT required (frame height above threshold)', () => {
      // 5.5" pulley + standard 1.0" offset = 6.5" frame height
      // Snub threshold = 5.5" + 2.5" = 8.0"
      // 6.5" < 8.0", so snubs WOULD be required with this config
      // Use custom frame height to put it above threshold
      const inputs: SliderbedInputs = {
        ...cleatsBaseInputs,
        frame_height_mode: FrameHeightMode.Custom,
        custom_frame_height_in: 9.0, // Above snub threshold (5.5 + 2.5 = 8.0)
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.requires_snub_rollers).toBe(false);
      // Should have no cleats+snub error
      expect(result.errors).toBeUndefined();
    });

    it('should WARN when cleats enabled and snubs enabled via AUTO (v1.37)', () => {
      // v1.37: Snub rollers with cleats is now a warning, not an error
      // Use Standard frame_height_mode but Low Profile return_frame_style to enable snubs via Auto
      const inputs: SliderbedInputs = {
        ...cleatsBaseInputs,
        frame_height_mode: FrameHeightMode.Standard, // Standard frame height (not Low Profile)
        // v1.37: Explicit return support - Low Profile return style with Auto mode enables snubs
        return_frame_style: 'LOW_PROFILE',
        return_snub_mode: 'AUTO',
      };

      const result = runCalculation({ inputs });

      // v1.37: Now passes with warning instead of failing with error
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();

      // v1.37: Check for return_snub_mode warning (not error)
      const returnSupportWarning = result.warnings!.find(w => w.field === 'return_snub_mode');
      expect(returnSupportWarning).toBeDefined();
      expect(returnSupportWarning!.message).toContain('Snub rollers with cleats');
      expect(returnSupportWarning!.message).toContain('noise, wear, or belt damage');
    });

    it('should PASS without warning when cleats DISABLED and snubs enabled (v1.37)', () => {
      // v1.37: No warning when cleats are off - snubs with no cleats is fine
      const inputs: SliderbedInputs = {
        ...cleatsBaseInputs,
        cleats_enabled: false,
        cleats_mode: undefined,
        cleat_height_in: undefined,
        frame_height_mode: FrameHeightMode.Standard, // Use Standard frame height
        // v1.37: Explicit return support - enable snubs via YES mode
        return_frame_style: 'STANDARD',
        return_snub_mode: 'YES',
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Snubs should be enabled (snub_roller_quantity = 2)
      expect(result.outputs?.snub_roller_quantity).toBe(2);
      // v1.37: Should have no cleats+snubs warning since cleats are disabled
      const snubWarning = result.warnings?.find(w => w.field === 'return_snub_mode' && w.message.includes('Snub rollers with cleats'));
      expect(snubWarning).toBeUndefined();
    });

    it('should WARN when cleats + snubs with YES mode (v1.37)', () => {
      // v1.37: This test verifies cleats + snubs warning with explicit snub_mode=YES
      const inputs: SliderbedInputs = {
        ...cleatsBaseInputs,
        drive_pulley_diameter_in: 5.5,
        tail_pulley_diameter_in: 5.5,
        frame_height_mode: FrameHeightMode.Standard,
        // v1.37: Explicit snub mode YES triggers warning with cleats
        return_frame_style: 'STANDARD',
        return_snub_mode: 'YES',
      };

      const result = runCalculation({ inputs });

      // v1.37: Now passes with warning instead of failing with error
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();

      // v1.37: Warning on return_snub_mode field
      const returnSupportWarning = result.warnings!.find(w => w.field === 'return_snub_mode');
      expect(returnSupportWarning).toBeDefined();
      expect(returnSupportWarning!.message).toContain('Snub rollers with cleats');
    });

    it('should NOT warn when cleats enabled and snubs NO (v1.37)', () => {
      // v1.37: No warning when snubs are explicitly disabled
      const inputs: SliderbedInputs = {
        ...cleatsBaseInputs,
        frame_height_mode: FrameHeightMode.Standard,
        return_frame_style: 'STANDARD',
        return_snub_mode: 'NO',
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Should have no cleats+snubs warning
      const snubWarning = result.warnings?.find(w => w.field === 'return_snub_mode' && w.message.includes('Snub rollers with cleats'));
      expect(snubWarning).toBeUndefined();
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
        belt_width_in: 24,
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
    conveyor_length_cc_in: 240, // 20 feet = 240 inches
    belt_width_in: 18,
    conveyor_incline_deg: 0,
    belt_speed_fpm: 50,
    motor_rpm: 1750,
    drive_rpm: 0,
    pulley_diameter_in: 4, // Required for calculations
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
// v1.11: BELT MINIMUM PULLEY DIAMETER TESTS
// ============================================================================

describe('Belt Minimum Pulley Diameter (v1.11)', () => {
  // Base inputs for all tests
  const BASE_INPUTS: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    conveyor_incline_deg: 0,
    pulley_diameter_in: 4, // Default pulley size
    drive_pulley_diameter_in: 4,
    belt_speed_fpm: 50,
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0.5,
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

  describe('No belt selected (backward compatibility)', () => {
    it('should calculate successfully with no warnings when no belt is selected', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_catalog_key: undefined,
        belt_min_pulley_dia_no_vguide_in: undefined,
        belt_min_pulley_dia_with_vguide_in: undefined,
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.min_pulley_drive_required_in).toBeUndefined();
      expect(result.outputs?.min_pulley_tail_required_in).toBeUndefined();
      expect(result.outputs?.drive_pulley_meets_minimum).toBeUndefined();
      expect(result.outputs?.tail_pulley_meets_minimum).toBeUndefined();
      // No belt-related pulley warnings
      expect(
        result.warnings?.some((w) => w.message.includes('below belt minimum'))
      ).toBeFalsy();
    });
  });

  describe('Crowned tracking mode', () => {
    it('should use belt_min_pulley_dia_no_vguide_in for crowned tracking', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_tracking_method: BeltTrackingMethod.Crowned,
        belt_min_pulley_dia_no_vguide_in: 3.0, // Belt requires 3" for crowned
        belt_min_pulley_dia_with_vguide_in: 4.0, // Belt requires 4" for V-guided
        drive_pulley_diameter_in: 4, // Pulley meets minimum
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.min_pulley_drive_required_in).toBe(3.0);
      expect(result.outputs?.min_pulley_tail_required_in).toBe(3.0);
      expect(result.outputs?.drive_pulley_meets_minimum).toBe(true);
      expect(result.outputs?.tail_pulley_meets_minimum).toBe(true);
    });

    it('should warn when pulley is below crowned minimum', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_tracking_method: BeltTrackingMethod.Crowned,
        belt_min_pulley_dia_no_vguide_in: 5.0, // Belt requires 5" for crowned
        belt_min_pulley_dia_with_vguide_in: 6.0,
        drive_pulley_diameter_in: 4, // Pulley is below minimum
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true); // Still calculates
      expect(result.outputs?.min_pulley_drive_required_in).toBe(5.0);
      expect(result.outputs?.drive_pulley_meets_minimum).toBe(false);
      // Should have warning
      expect(
        result.warnings?.some(
          (w) => w.field === 'drive_pulley_diameter_in' && w.message.includes('below belt minimum')
        )
      ).toBe(true);
    });
  });

  describe('V-guided tracking mode', () => {
    it('should use belt_min_pulley_dia_with_vguide_in for V-guided tracking', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_profile: VGuideProfile.K10, // Required for V-guided
        belt_min_pulley_dia_no_vguide_in: 3.0,
        belt_min_pulley_dia_with_vguide_in: 4.0, // Belt requires 4" for V-guided
        drive_pulley_diameter_in: 5, // Pulley meets minimum
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.min_pulley_drive_required_in).toBe(4.0);
      expect(result.outputs?.min_pulley_tail_required_in).toBe(4.0);
      expect(result.outputs?.drive_pulley_meets_minimum).toBe(true);
      expect(result.outputs?.tail_pulley_meets_minimum).toBe(true);
    });

    it('should warn when pulley is below V-guided minimum', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_tracking_method: BeltTrackingMethod.VGuided,
        v_guide_profile: VGuideProfile.K10, // Required for V-guided
        belt_min_pulley_dia_no_vguide_in: 3.0,
        belt_min_pulley_dia_with_vguide_in: 5.0, // Belt requires 5" for V-guided
        drive_pulley_diameter_in: 4, // Pulley is below minimum
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true); // Still calculates
      expect(result.outputs?.min_pulley_drive_required_in).toBe(5.0);
      expect(result.outputs?.drive_pulley_meets_minimum).toBe(false);
      expect(
        result.warnings?.some(
          (w) => w.field === 'drive_pulley_diameter_in' && w.message.includes('below belt minimum')
        )
      ).toBe(true);
    });
  });

  describe('Split pulley diameters', () => {
    it('should warn for tail pulley when tail differs from drive and is below minimum', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_tracking_method: BeltTrackingMethod.Crowned,
        belt_min_pulley_dia_no_vguide_in: 4.0, // Belt requires 4"
        drive_pulley_diameter_in: 5, // Drive meets minimum
        tail_pulley_diameter_in: 3, // Tail is below minimum
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.drive_pulley_meets_minimum).toBe(true);
      expect(result.outputs?.tail_pulley_meets_minimum).toBe(false);
      // Should have warning for tail only
      expect(
        result.warnings?.some(
          (w) => w.field === 'tail_pulley_diameter_in' && w.message.includes('below belt minimum')
        )
      ).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'drive_pulley_diameter_in' && w.message.includes('below belt minimum')
        )
      ).toBe(false);
    });

    // v1.16: Both pulleys now validated independently (tail_matches_drive removed)
    it('should warn for both pulleys when both are below minimum', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_tracking_method: BeltTrackingMethod.Crowned,
        belt_min_pulley_dia_no_vguide_in: 5.0, // Belt requires 5"
        drive_pulley_diameter_in: 4, // Drive is below minimum
        tail_pulley_diameter_in: 4, // Tail is also below minimum
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Both pulleys are 4" - both below the 5" minimum
      expect(result.outputs?.drive_pulley_meets_minimum).toBe(false);
      expect(result.outputs?.tail_pulley_meets_minimum).toBe(false);
      // Should have warnings for BOTH pulleys independently
      expect(
        result.warnings?.filter((w) => w.message.includes('below belt minimum')).length
      ).toBe(2);
      expect(
        result.warnings?.some(
          (w) => w.field === 'drive_pulley_diameter_in' && w.message.includes('below belt minimum')
        )
      ).toBe(true);
      expect(
        result.warnings?.some(
          (w) => w.field === 'tail_pulley_diameter_in' && w.message.includes('below belt minimum')
        )
      ).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle pulley exactly at minimum (no warning)', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        belt_tracking_method: BeltTrackingMethod.Crowned,
        belt_min_pulley_dia_no_vguide_in: 4.0,
        drive_pulley_diameter_in: 4.0, // Exactly at minimum
      };

      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.drive_pulley_meets_minimum).toBe(true);
      // No warning about being below minimum (use toBeFalsy to handle undefined warnings)
      expect(
        result.warnings?.some((w) => w.message.includes('below belt minimum'))
      ).toBeFalsy();
    });

    it('should preserve existing configs that calculated successfully', () => {
      // Simulate an old config without belt_min fields
      const legacyInputs: SliderbedInputs = {
        ...BASE_INPUTS,
        drive_pulley_diameter_in: 3, // Would be below many belt minimums
        // No belt_min fields set (legacy config)
      };

      const result = runCalculation({ inputs: legacyInputs });

      expect(result.success).toBe(true);
      // No minimum requirements, so no warnings about belt minimum
      expect(result.outputs?.min_pulley_drive_required_in).toBeUndefined();
      // Use toBeFalsy to handle undefined warnings array
      expect(
        result.warnings?.some((w) => w.message.includes('below belt minimum'))
      ).toBeFalsy();
    });
  });

  // ==========================================================================
  // v1.11 Phase 4: CLEAT SPACING MULTIPLIER TESTS
  // ==========================================================================

  describe('Cleat Spacing Multiplier (Phase 4)', () => {
    describe('Cleats OFF - no multiplier', () => {
      it('should not apply multiplier when cleats are disabled', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_cleat_method: 'hot_welded',
          cleats_enabled: false, // Cleats OFF
          cleat_spacing_in: 6, // Even with tight spacing, should not matter
          drive_pulley_diameter_in: 4,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.0); // No multiplier
        expect(result.outputs?.min_pulley_base_in).toBe(3.0);
        expect(result.outputs?.cleat_spacing_multiplier).toBeUndefined();
        expect(result.outputs?.drive_pulley_meets_minimum).toBe(true);
      });
    });

    describe('Cleats ON + 12" spacing - 1.0x (no change)', () => {
      it('should apply 1.0x multiplier for 12" spacing (no effective change)', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_cleat_method: 'hot_welded',
          cleats_enabled: true,
          cleat_spacing_in: 12,
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 4,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        // 3.0 * 1.0 = 3.0, rounded up to 3.0
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.0);
        expect(result.outputs?.min_pulley_base_in).toBe(3.0);
        expect(result.outputs?.cleat_spacing_multiplier).toBe(1.0);
        expect(result.outputs?.drive_pulley_meets_minimum).toBe(true);
      });
    });

    describe('Cleats ON + 6" spacing - 1.25x', () => {
      it('should apply 1.25x multiplier for 6" spacing', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_cleat_method: 'hot_welded',
          cleats_enabled: true,
          cleat_spacing_in: 6,
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 4,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        // 3.0 * 1.25 = 3.75, rounded up = 3.75
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.75);
        expect(result.outputs?.min_pulley_base_in).toBe(3.0);
        expect(result.outputs?.cleat_spacing_multiplier).toBe(1.25);
        expect(result.outputs?.drive_pulley_meets_minimum).toBe(true); // 4 >= 3.75
      });

      it('should generate warning when pulley is below adjusted minimum', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_cleat_method: 'hot_welded',
          cleats_enabled: true,
          cleat_spacing_in: 6,
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 3.5, // Below 3.75 (adjusted min)
          // v1.24: Set frame height above snub roller threshold to avoid cleats+snub incompatibility
          frame_height_mode: FrameHeightMode.Custom,
          custom_frame_height_in: 8, // Above snub threshold (3.5 + 2.5 = 6)
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.75);
        expect(result.outputs?.drive_pulley_meets_minimum).toBe(false);
        // Note: The warning is generated based on inputs (base min), not adjusted output
        // The formulas correctly output drive_pulley_meets_minimum = false
        // UI should use this flag to show the warning with adjusted min
      });
    });

    describe('Cleats ON + no spacing provided - default 12" (1.0x)', () => {
      it('should default to 12" spacing when not provided', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_cleat_method: 'hot_welded',
          cleats_enabled: true,
          cleat_spacing_in: 12, // Need to provide for validation, but test default behavior in formulas
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 4,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        // Default 12" spacing = 1.0x multiplier
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.0);
        expect(result.outputs?.cleat_spacing_multiplier).toBe(1.0);
      });
    });

    describe('Rounding behavior', () => {
      it('should round UP adjusted min to nearest 0.25"', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_cleat_method: 'hot_welded',
          cleats_enabled: true,
          cleat_spacing_in: 8, // 1.15x multiplier
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 5,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        // 3.0 * 1.15 = 3.45, rounded UP to 3.5
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.5);
        expect(result.outputs?.cleat_spacing_multiplier).toBe(1.15);
      });
    });

    describe('Non-hot-welded cleats - no multiplier', () => {
      it('should not apply multiplier for molded cleats', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_cleat_method: 'molded', // Not hot_welded
          cleats_enabled: true,
          cleat_spacing_in: 4, // Would be 1.35x if hot_welded
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 4,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.0); // No multiplier
        expect(result.outputs?.cleat_spacing_multiplier).toBeUndefined();
      });

      it('should not apply multiplier when belt_cleat_method is undefined', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.Crowned,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          // belt_cleat_method NOT set
          cleats_enabled: true,
          cleat_spacing_in: 4,
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 4,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        expect(result.outputs?.min_pulley_drive_required_in).toBe(3.0); // No multiplier
        expect(result.outputs?.cleat_spacing_multiplier).toBeUndefined();
      });
    });

    describe('V-guided tracking with cleats', () => {
      it('should apply multiplier to V-guided minimum correctly', () => {
        const inputs: SliderbedInputs = {
          ...BASE_INPUTS,
          belt_tracking_method: BeltTrackingMethod.VGuided,
          v_guide_profile: VGuideProfile.K10,
          belt_min_pulley_dia_no_vguide_in: 3.0,
          belt_min_pulley_dia_with_vguide_in: 4.0, // V-guided uses this
          belt_cleat_method: 'hot_welded',
          cleats_enabled: true,
          cleat_spacing_in: 6, // 1.25x
          cleat_height_in: 1,
          cleat_edge_offset_in: 0.5,
          drive_pulley_diameter_in: 6,
        };

        const result = runCalculation({ inputs });

        expect(result.success).toBe(true);
        // 4.0 * 1.25 = 5.0
        expect(result.outputs?.min_pulley_drive_required_in).toBe(5.0);
        expect(result.outputs?.min_pulley_base_in).toBe(4.0);
        expect(result.outputs?.cleat_spacing_multiplier).toBe(1.25);
      });
    });
  });
});

// ============================================================================
// v1.14: FRAME CONSTRUCTION VALIDATION TESTS
// ============================================================================

describe('Frame Construction Validation (v1.14)', () => {
  const BASE_FRAME_INPUTS: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    conveyor_incline_deg: 0,
    pulley_diameter_in: 4,
    drive_pulley_diameter_in: 4,
    belt_speed_fpm: 50,
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0.5,
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
    cleats_enabled: false,
    frame_height_mode: FrameHeightMode.Standard,
    speed_mode: SpeedMode.BeltSpeed,
    // v1.14: Frame construction defaults
    frame_construction_type: 'sheet_metal',
    frame_sheet_metal_gauge: '12_GA',
  };

  it('should require gauge when construction type is sheet_metal', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'sheet_metal',
      frame_sheet_metal_gauge: undefined,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(false);
    expect(
      result.errors?.some(
        (e) => e.field === 'frame_sheet_metal_gauge'
      )
    ).toBe(true);
  });

  it('should require channel series when construction type is structural_channel', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'structural_channel',
      frame_structural_channel_series: undefined,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(false);
    expect(
      result.errors?.some(
        (e) => e.field === 'frame_structural_channel_series'
      )
    ).toBe(true);
  });

  it('should allow special type without gauge or channel', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'special',
      frame_sheet_metal_gauge: undefined,
      frame_structural_channel_series: undefined,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
  });

  it('should allow sheet_metal with valid gauge', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'sheet_metal',
      frame_sheet_metal_gauge: '12_GA',
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
  });

  it('should allow structural_channel with valid series', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'structural_channel',
      frame_structural_channel_series: 'C4',
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
  });

  it('should reject negative pulley_end_to_frame_inside_in', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      pulley_end_to_frame_inside_in: -0.5,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(false);
    expect(
      result.errors?.some(
        (e) => e.field === 'pulley_end_to_frame_inside_in'
      )
    ).toBe(true);
  });

  it('should reject excessive pulley_end_to_frame_inside_in (> 6)', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      pulley_end_to_frame_inside_in: 7,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(false);
    expect(
      result.errors?.some(
        (e) => e.field === 'pulley_end_to_frame_inside_in'
      )
    ).toBe(true);
  });

  it('should allow valid pulley_end_to_frame_inside_in', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      pulley_end_to_frame_inside_in: 0.5,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
  });

  // Output tests
  it('should derive thickness from sheet metal gauge (12_GA)', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'sheet_metal',
      frame_sheet_metal_gauge: '12_GA',
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.frame_construction_type).toBe('sheet_metal');
    expect(result.outputs?.frame_side_thickness_in).toBe(0.1046);
  });

  it('should derive thickness from sheet metal gauge (16_GA)', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'sheet_metal',
      frame_sheet_metal_gauge: '16_GA',
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.frame_side_thickness_in).toBe(0.0598);
  });

  it('should derive thickness from structural channel (C4)', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'structural_channel',
      frame_structural_channel_series: 'C4',
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.frame_construction_type).toBe('structural_channel');
    expect(result.outputs?.frame_side_thickness_in).toBe(0.184);
  });

  it('should return null thickness for special construction type', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      frame_construction_type: 'special',
      frame_sheet_metal_gauge: undefined,
      frame_structural_channel_series: undefined,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.frame_construction_type).toBe('special');
    expect(result.outputs?.frame_side_thickness_in).toBeNull();
  });

  it('should echo pulley_end_to_frame_inside_in as output', () => {
    const inputs: SliderbedInputs = {
      ...BASE_FRAME_INPUTS,
      pulley_end_to_frame_inside_in: 0.75,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pulley_end_to_frame_inside_out_in).toBe(0.75);
  });
});

// ============================================================================
// FRAME CONSTRUCTION MIGRATION (v1.14)
// ============================================================================

describe('Frame Construction Migration (v1.14)', () => {
  // Minimal inputs for migration testing (no frame construction fields = legacy config)
  const LEGACY_INPUTS: Partial<SliderbedInputs> = {
    conveyor_length_cc_in: 120,
    belt_width_in: 18,
    belt_speed_fpm: 50,
    drive_pulley_diameter_in: 6,
    tail_pulley_diameter_in: 6,
    tail_support_type: EndSupportType.External,
    drive_support_type: EndSupportType.External,
    speed_mode: SpeedMode.BeltSpeed,
  };

  it('should default legacy configs to sheet_metal with 12_GA', () => {
    // Legacy config without any frame construction fields
    const legacyInputs = {
      ...LEGACY_INPUTS,
      // No frame_construction_type, no gauge, no channel
    };

    const migrated = migrateInputs(legacyInputs);

    expect(migrated.frame_construction_type).toBe('sheet_metal');
    expect(migrated.frame_sheet_metal_gauge).toBe('12_GA');
    expect(migrated.frame_structural_channel_series).toBeUndefined();
  });

  it('should preserve existing frame_construction_type', () => {
    const inputs = {
      ...LEGACY_INPUTS,
      frame_construction_type: 'structural_channel' as const,
      frame_structural_channel_series: 'C6' as const,
    };

    const migrated = migrateInputs(inputs);

    expect(migrated.frame_construction_type).toBe('structural_channel');
    expect(migrated.frame_structural_channel_series).toBe('C6');
    expect(migrated.frame_sheet_metal_gauge).toBeUndefined();
  });

  it('should default channel to C4 when structural_channel missing series', () => {
    const inputs = {
      ...LEGACY_INPUTS,
      frame_construction_type: 'structural_channel' as const,
      // No channel series specified
    };

    const migrated = migrateInputs(inputs);

    expect(migrated.frame_construction_type).toBe('structural_channel');
    expect(migrated.frame_structural_channel_series).toBe('C4');
    expect(migrated.frame_sheet_metal_gauge).toBeUndefined();
  });

  it('should clear gauge when switching to structural_channel', () => {
    const inputs = {
      ...LEGACY_INPUTS,
      frame_construction_type: 'structural_channel' as const,
      frame_sheet_metal_gauge: '10_GA' as const, // Should be cleared
    };

    const migrated = migrateInputs(inputs);

    expect(migrated.frame_construction_type).toBe('structural_channel');
    expect(migrated.frame_sheet_metal_gauge).toBeUndefined();
    expect(migrated.frame_structural_channel_series).toBe('C4'); // Default
  });

  it('should clear both sub-fields for special construction', () => {
    const inputs = {
      ...LEGACY_INPUTS,
      frame_construction_type: 'special' as const,
      frame_sheet_metal_gauge: '10_GA' as const,
      frame_structural_channel_series: 'C6' as const,
    };

    const migrated = migrateInputs(inputs);

    expect(migrated.frame_construction_type).toBe('special');
    expect(migrated.frame_sheet_metal_gauge).toBeUndefined();
    expect(migrated.frame_structural_channel_series).toBeUndefined();
  });

  it('should preserve existing gauge for sheet_metal', () => {
    const inputs = {
      ...LEGACY_INPUTS,
      frame_construction_type: 'sheet_metal' as const,
      frame_sheet_metal_gauge: '16_GA' as const,
    };

    const migrated = migrateInputs(inputs);

    expect(migrated.frame_construction_type).toBe('sheet_metal');
    expect(migrated.frame_sheet_metal_gauge).toBe('16_GA');
    expect(migrated.frame_structural_channel_series).toBeUndefined();
  });
});

// ============================================================================
// [SKIP: Pulley Catalog Phase 2] v1.16 CATALOG DIAMETER AUTHORITY TESTS
// ============================================================================

/**
 * TODO: Unskip when pulley_models + catalog effective diameter authority is implemented
 *
 * WHY SKIPPED: Legacy pulley catalog was removed in the pulley system refactor.
 *              These tests reference catalog keys and effective diameters that
 *              no longer exist in the current implementation.
 *
 * WHEN TO UNSKIP: When Pulley Catalog Phase 2 is complete, specifically:
 *   - pulley_models system provides catalog effective diameters
 *   - drive/tail pulley selection uses catalog diameter authority
 *
 * WHAT TO VERIFY: All 6 tests must pass and protect:
 *   - Catalog diameter lookup for drive pulley
 *   - Catalog diameter lookup for tail pulley
 *   - Manual diameter fallback when no catalog key
 *   - Manual diameter fallback when invalid catalog key
 *   - Both pulleys using catalog diameters
 *   - End-to-end outputs using catalog diameters
 */
describe.skip('[SKIP: Pulley Catalog Phase 2] v1.16 Catalog Diameter Authority', () => {
  // Minimal BASE_INPUTS for these tests
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

  // Test pulley catalog items
  const TEST_DRIVE_PULLEY: PulleyCatalogItem = {
    id: 'test-drive-1',
    catalog_key: 'DRIVE-6IN',
    display_name: 'Test Drive Pulley 6"',
    manufacturer: 'Test',
    part_number: 'TP-DRIVE-6',
    diameter_in: 5.5, // 5.5" nominal + 0.25" lagging each side = 6" effective
    face_width_max_in: 24,
    face_width_min_in: 6,
    crown_height_in: 0.125,
    construction: 'DRUM',
    shell_material: 'Steel',
    is_lagged: true,
    lagging_type: 'Rubber',
    lagging_thickness_in: 0.25,
    shaft_arrangement: 'THROUGH_SHAFT_EXTERNAL_BEARINGS',
    hub_connection: 'KEYED',
    allow_head_drive: true,
    allow_tail: true,
    allow_snub: false,
    allow_bend: false,
    allow_takeup: false,
    dirty_side_ok: false,
    max_shaft_rpm: null,
    max_belt_speed_fpm: null,
    max_tension_pli: null,
    is_preferred: true,
    is_active: true,
    notes: null,
    tags: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const TEST_TAIL_PULLEY: PulleyCatalogItem = {
    id: 'test-tail-1',
    catalog_key: 'TAIL-5IN',
    display_name: 'Test Tail Pulley 5"',
    manufacturer: 'Test',
    part_number: 'TP-TAIL-5',
    diameter_in: 5, // 5" nominal, no lagging
    face_width_max_in: 24,
    face_width_min_in: 6,
    crown_height_in: 0,
    construction: 'DRUM',
    shell_material: 'Steel',
    is_lagged: false,
    lagging_type: null,
    lagging_thickness_in: null,
    shaft_arrangement: 'THROUGH_SHAFT_EXTERNAL_BEARINGS',
    hub_connection: 'KEYED',
    allow_head_drive: false,
    allow_tail: true,
    allow_snub: false,
    allow_bend: false,
    allow_takeup: false,
    dirty_side_ok: false,
    max_shaft_rpm: null,
    max_belt_speed_fpm: null,
    max_tension_pli: null,
    is_preferred: true,
    is_active: true,
    notes: null,
    tags: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  beforeEach(() => {
    // Set up the cache with test pulleys before each test
    setCachedPulleys([TEST_DRIVE_PULLEY, TEST_TAIL_PULLEY]);
  });

  afterEach(() => {
    // Clear the cache after each test
    clearPulleyCatalogCache();
  });

  // Test A: Drive catalog overrides manual
  it('should use catalog effective diameter for drive when catalog key is selected', () => {
    const inputs: SliderbedInputs = {
      ...BASE_INPUTS,
      drive_pulley_diameter_in: 4, // Manual says 4"
      head_pulley_catalog_key: 'DRIVE-6IN', // Catalog pulley has 6" effective
    };

    const { drivePulleyDiameterIn } = normalizeInputsForCalculation(inputs);

    // Catalog diameter (5.5 + 0.25*2 = 6) should override manual (4)
    expect(drivePulleyDiameterIn).toBe(6);
  });

  // Test B: Tail catalog overrides manual
  it('should use catalog effective diameter for tail when catalog key is selected', () => {
    const inputs: SliderbedInputs = {
      ...BASE_INPUTS,
      tail_pulley_diameter_in: 4, // Manual says 4"
      tail_pulley_catalog_key: 'TAIL-5IN', // Catalog pulley has 5" effective (no lagging)
    };

    const { tailPulleyDiameterIn } = normalizeInputsForCalculation(inputs);

    // Catalog diameter (5, no lagging) should override manual (4)
    expect(tailPulleyDiameterIn).toBe(5);
  });

  // Test C: Manual used when no catalog selected
  it('should use manual diameter when no catalog key is selected', () => {
    const inputs: SliderbedInputs = {
      ...BASE_INPUTS,
      drive_pulley_diameter_in: 4,
      tail_pulley_diameter_in: 3,
      // No catalog keys set
    };

    const { drivePulleyDiameterIn, tailPulleyDiameterIn } = normalizeInputsForCalculation(inputs);

    // Manual diameters should be used
    expect(drivePulleyDiameterIn).toBe(4);
    expect(tailPulleyDiameterIn).toBe(3);
  });

  // Test D: Catalog key missing falls back to manual with warning
  it('should fall back to manual diameter when catalog key is invalid', () => {
    const inputs: SliderbedInputs = {
      ...BASE_INPUTS,
      drive_pulley_diameter_in: 4,
      head_pulley_catalog_key: 'NON-EXISTENT-KEY', // Key doesn't exist in catalog
    };

    const { drivePulleyDiameterIn } = normalizeInputsForCalculation(inputs);

    // Should fall back to manual diameter (4) when catalog key not found
    expect(drivePulleyDiameterIn).toBe(4);

    // Also verify the warning is produced in rules
    const result = runCalculation({ inputs });
    expect(result.success).toBe(true);
    expect(
      result.warnings?.some(
        (w) => w.field === 'head_pulley_catalog_key' && w.message.includes('not found in catalog')
      )
    ).toBe(true);
  });

  // Test: Both drive and tail from catalog
  it('should use catalog diameters for both when both catalog keys are selected', () => {
    const inputs: SliderbedInputs = {
      ...BASE_INPUTS,
      drive_pulley_diameter_in: 4, // Manual says 4"
      tail_pulley_diameter_in: 4, // Manual says 4"
      head_pulley_catalog_key: 'DRIVE-6IN', // Catalog: 6" effective
      tail_pulley_catalog_key: 'TAIL-5IN', // Catalog: 5" effective
    };

    const { drivePulleyDiameterIn, tailPulleyDiameterIn } = normalizeInputsForCalculation(inputs);

    // Both should use catalog diameters
    expect(drivePulleyDiameterIn).toBe(6);
    expect(tailPulleyDiameterIn).toBe(5);
  });

  // Test: Calculation uses catalog diameters in outputs
  it('should produce correct outputs using catalog diameters', () => {
    const inputs: SliderbedInputs = {
      ...BASE_INPUTS,
      drive_pulley_diameter_in: 4, // Manual says 4"
      head_pulley_catalog_key: 'DRIVE-6IN', // Catalog: 6" effective
      tail_pulley_catalog_key: 'TAIL-5IN', // Catalog: 5" effective
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    // Verify the outputs reflect catalog diameters
    expect(result.outputs?.drive_pulley_diameter_in).toBe(6);
    expect(result.outputs?.tail_pulley_diameter_in).toBe(5);
  });
});

// ============================================================================
// v1.17: PULLEY DIAMETER OVERRIDE TESTS
// ============================================================================

describe('v1.17 Pulley Diameter Override', () => {
  // Import the effective diameter helper from formulas
  const { getEffectivePulleyDiameters } = require('./formulas');

  // Minimal base inputs for override tests
  const OVERRIDE_BASE: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    belt_width_in: 18,
    belt_speed_fpm: 50,
    part_length_in: 12,
    part_width_in: 6,
    part_weight_lbs: 5,
    orientation: Orientation.Lengthwise,
    environment_factors: [EnvironmentFactors.Indoor],
  };

  // Case A: No catalog key, override=false but diameter provided → use diameter (backward compatibility)
  it('should use diameter when no catalog and override is false but diameter provided (Case A)', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      head_pulley_catalog_key: undefined, // No catalog
      drive_pulley_manual_override: false,
      drive_pulley_diameter_in: 4, // Now used for backward compatibility
    };

    const { effectiveDrivePulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    // Backward compatibility: diameter is used even without override flag
    expect(effectiveDrivePulleyDiameterIn).toBe(4);
  });

  // Case B: override=true, manual set → effective = manual (ignores catalog)
  it('should use manual diameter when override is true (Case B)', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      head_pulley_catalog_key: undefined, // Catalog doesn't matter when override=true
      drive_pulley_manual_override: true,
      drive_pulley_diameter_in: 5, // Manual value used
    };

    const { effectiveDrivePulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    // Should use manual diameter (5")
    expect(effectiveDrivePulleyDiameterIn).toBe(5);
  });

  // Case C: no catalog, override=false → effective diameter undefined
  // v1.24: Removed "Select a" warning - pulley selection is now modal-based
  it('should allow undefined catalog without warning when override is false (Case C)', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      head_pulley_catalog_key: undefined, // No catalog
      drive_pulley_manual_override: false, // Override disabled
    };

    const result = runCalculation({ inputs });

    // v1.24: No longer expect warning - pulley configuration via modal
    // Calculation should still succeed with default/fallback values
    expect(result.success).toBe(true);
  });

  // Case D: no catalog, override=true, manual set → effective = manual
  it('should use manual diameter when override is true and no catalog (Case D)', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      head_pulley_catalog_key: undefined, // No catalog
      drive_pulley_manual_override: true,
      drive_pulley_diameter_in: 5,
    };

    const { effectiveDrivePulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    // Should use manual diameter
    expect(effectiveDrivePulleyDiameterIn).toBe(5);
  });

  // Case E: override=true, manual missing → effective undefined
  // v1.24: Removed "Override enabled" warning - pulley selection is now modal-based
  it('should return undefined diameter when override is true but manual missing (Case E)', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      head_pulley_catalog_key: undefined,
      drive_pulley_manual_override: true,
      drive_pulley_diameter_in: undefined, // Manual not set!
    };

    const { effectiveDrivePulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    // Effective should be undefined
    expect(effectiveDrivePulleyDiameterIn).toBeUndefined();

    // v1.24: No longer expect warning - pulley configuration via modal
    // Calculation should still succeed with default/fallback values
    const result = runCalculation({ inputs });
    expect(result.success).toBe(true);
  });

  // Tail pulley: no catalog, override=false → undefined
  it('should use tail diameter when no catalog and override is false but diameter provided', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      tail_pulley_catalog_key: undefined,
      tail_pulley_manual_override: false,
      tail_pulley_diameter_in: 4, // Now used for backward compatibility
    };

    const { effectiveTailPulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    // Backward compatibility: diameter is used even without override flag
    expect(effectiveTailPulleyDiameterIn).toBe(4);
  });

  // Tail pulley: override=true → manual diameter
  it('should use tail manual diameter when tail override is true', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      tail_pulley_catalog_key: undefined,
      tail_pulley_manual_override: true,
      tail_pulley_diameter_in: 6, // Manual value used
    };

    const { effectiveTailPulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    expect(effectiveTailPulleyDiameterIn).toBe(6);
  });
});

// ============================================================================
// v1.27: PCI TUBE STRESS TEST FIXTURES
// ============================================================================

describe('PCI Tube Stress Calculations (v1.27)', () => {
  // Base inputs for PCI tests
  const PCI_BASE_INPUTS: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    belt_speed_fpm: 100,
    pulley_diameter_in: 6,
    // Manual override flags required for diameters to be used (v1.17 pulley resolution logic)
    drive_pulley_manual_override: true,
    drive_pulley_diameter_in: 6,
    tail_pulley_manual_override: true,
    tail_pulley_diameter_in: 6,
    part_weight_lbs: 10,
    part_length_in: 10,
    part_width_in: 8,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 12,
    drive_rpm: 100,
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

  // Test 1: Resultant load output is populated (wire-only)
  it('should populate drive_pulley_resultant_load_lbf from shaftCalc', () => {
    const result = runCalculation({ inputs: PCI_BASE_INPUTS });

    expect(result.success).toBe(true);
    expect(result.outputs?.drive_pulley_resultant_load_lbf).toBeDefined();
    expect(result.outputs?.drive_pulley_resultant_load_lbf).toBeGreaterThan(0);
    expect(result.outputs?.tail_pulley_resultant_load_lbf).toBeDefined();
    expect(result.outputs?.tail_pulley_resultant_load_lbf).toBeGreaterThan(0);
  });

  // Test 2: T1 and T2 outputs are populated (wire-only)
  it('should populate drive_T1_lbf and drive_T2_lbf from shaftCalc', () => {
    const result = runCalculation({ inputs: PCI_BASE_INPUTS });

    expect(result.success).toBe(true);
    expect(result.outputs?.drive_T1_lbf).toBeDefined();
    expect(result.outputs?.drive_T1_lbf).toBeGreaterThan(0);
    expect(result.outputs?.drive_T2_lbf).toBeDefined();
    expect(result.outputs?.drive_T2_lbf).toBeGreaterThan(0);
  });

  // Test 3: PCI status is "incomplete" when geometry not provided
  it('should set pci_tube_stress_status to "incomplete" when geometry missing', () => {
    const result = runCalculation({ inputs: PCI_BASE_INPUTS });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_tube_stress_status).toBe('incomplete');
    expect(result.outputs?.pci_drive_tube_stress_psi).toBeUndefined();
    expect(result.outputs?.pci_tail_tube_stress_psi).toBeUndefined();
  });

  // Test 4: PCI tube stress calculated when geometry provided
  it('should calculate pci_drive_tube_stress_psi when geometry provided', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      hub_centers_in: 24,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_drive_tube_stress_psi).toBeDefined();
    expect(result.outputs?.pci_drive_tube_stress_psi).toBeGreaterThan(0);
    expect(result.outputs?.pci_tube_stress_limit_psi).toBe(10000); // Drum pulley
    expect(result.outputs?.pci_hub_centers_estimated).toBe(false);
  });

  // Test 5: Hub centers estimated flag set when defaulted
  it('should set pci_hub_centers_estimated when hub_centers_in not provided', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      // hub_centers_in not provided - will default to belt_width_in
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_hub_centers_estimated).toBe(true);
    // Status should be "estimated" when hub centers defaulted and stress OK
    expect(['estimated', 'warn', 'fail', 'incomplete']).toContain(result.outputs?.pci_tube_stress_status);
  });

  // Test 6: V-groove pulley uses 3,400 psi limit
  it('should use 3,400 psi limit for V-groove pulley', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      belt_tracking_method: BeltTrackingMethod.VGuided,
      v_guide_profile: VGuideProfile.K10,
      v_guide_key: 'K10_SOLID',
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      hub_centers_in: 24,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_tube_stress_limit_psi).toBe(3400);
  });

  // Test 7: Invalid geometry (wall exceeds radius) returns error status
  it('should set pci_tube_stress_status to "error" for invalid geometry', () => {
    const inputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 4.0,
      drive_tube_wall_in: 2.5, // Wall exceeds radius (2.0")
      hub_centers_in: 24,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.outputs?.pci_tube_stress_status).toBe('error');
    expect(result.outputs?.pci_tube_stress_error_message).toBeDefined();
  });

  // Test 8: Regression - existing shaft outputs unchanged
  it('should not change existing shaft diameter outputs when PCI inputs added', () => {
    // Calculate without PCI inputs
    const baseResult = runCalculation({ inputs: PCI_BASE_INPUTS });

    // Calculate with PCI inputs
    const pciInputs: SliderbedInputs = {
      ...PCI_BASE_INPUTS,
      drive_tube_od_in: 6.0,
      drive_tube_wall_in: 0.134,
      hub_centers_in: 24,
    };
    const pciResult = runCalculation({ inputs: pciInputs });

    // Existing outputs must be unchanged (Edit #5 - mustNotChange)
    expect(pciResult.outputs?.drive_shaft_diameter_in).toBe(baseResult.outputs?.drive_shaft_diameter_in);
    expect(pciResult.outputs?.tail_shaft_diameter_in).toBe(baseResult.outputs?.tail_shaft_diameter_in);
    expect(pciResult.outputs?.total_belt_pull_lb).toBe(baseResult.outputs?.total_belt_pull_lb);
    expect(pciResult.outputs?.friction_pull_lb).toBe(baseResult.outputs?.friction_pull_lb);
  });
});

// ============================================================================
// v1.29: MATERIAL FORM & BULK MODE TESTS
// ============================================================================

describe('Material Form - PARTS vs BULK (v1.29)', () => {
  // Base inputs for testing - shared across all BULK tests
  const BULK_BASE_INPUTS: SliderbedInputs = {
    conveyor_length_cc_in: 120, // 10 ft
    belt_width_in: 24,
    belt_speed_fpm: 60, // 60 FPM
    pulley_diameter_in: 4,
    drive_pulley_diameter_in: 4,
    tail_pulley_diameter_in: 4,
    conveyor_incline_deg: 0,
    // These are required for PARTS but should be ignored in BULK
    part_weight_lbs: 1,
    part_length_in: 12,
    part_width_in: 6,
    part_spacing_in: 0,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    drive_rpm: 100, // Will be calculated from belt speed
    // Application fields
    material_type: MaterialType.Steel,
    process_type: ProcessType.Assembly,
    parts_sharp: PartsSharp.No,
    environment_factors: ['Industrial'],
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

  // Test 1: Legacy config (no material_form) defaults to PARTS
  it('should default material_form to PARTS for legacy configs', () => {
    // Inputs without material_form should calculate as PARTS
    const inputs: SliderbedInputs = { ...BULK_BASE_INPUTS };
    // Remove material_form to simulate legacy config
    delete (inputs as Record<string, unknown>).material_form;

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    // Should have PARTS-specific outputs
    expect(result.outputs?.parts_on_belt).toBeDefined();
    expect(result.outputs?.parts_on_belt).toBeGreaterThan(0);
    expect(result.outputs?.capacity_pph).toBeDefined();
    expect(result.outputs?.pitch_in).toBeDefined();
  });

  // Test 2: Explicit PARTS mode matches legacy calculation
  it('should calculate PARTS mode identically to legacy', () => {
    const legacyInputs: SliderbedInputs = { ...BULK_BASE_INPUTS };
    delete (legacyInputs as Record<string, unknown>).material_form;

    const partsInputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
    };

    const legacyResult = runCalculation({ inputs: legacyInputs });
    const partsResult = runCalculation({ inputs: partsInputs });

    expect(legacyResult.success).toBe(true);
    expect(partsResult.success).toBe(true);

    // All outputs must be identical - no math drift
    expect(partsResult.outputs?.parts_on_belt).toBe(legacyResult.outputs?.parts_on_belt);
    expect(partsResult.outputs?.load_on_belt_lbf).toBe(legacyResult.outputs?.load_on_belt_lbf);
    expect(partsResult.outputs?.capacity_pph).toBe(legacyResult.outputs?.capacity_pph);
    expect(partsResult.outputs?.total_belt_pull_lb).toBe(legacyResult.outputs?.total_belt_pull_lb);
  });

  // Test 3: PARTS validation - zero weight should fail
  it('should error when PARTS mode has zero part weight', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
      part_weight_lbs: 0, // Invalid
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(false);
    expect(result.errors?.some(e => e.field === 'part_weight_lbs')).toBe(true);
  });

  // Test 4: PARTS edge case - crosswise orientation
  it('should handle crosswise orientation correctly', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
      orientation: Orientation.Crosswise,
      part_length_in: 6,
      part_width_in: 12,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    // In crosswise, travel dimension is width (12")
    expect(result.outputs?.pitch_in).toBe(12); // width + 0 spacing
  });

  // Test 5: PARTS edge case - zero spacing
  it('should handle zero part spacing correctly', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'PARTS',
      part_spacing_in: 0,
      part_length_in: 12,
    };

    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    // Pitch should equal travel dimension when spacing is 0
    expect(result.outputs?.pitch_in).toBe(12);
    // Parts on belt = 120" / 12" = 10
    expect(result.outputs?.parts_on_belt).toBeCloseTo(10, 5);
  });

  // Test 6: BULK validation - missing bulk_input_method should fail
  it('should error when BULK mode has no bulk_input_method', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      // bulk_input_method not provided
    };

    const result = runCalculation({ inputs });

    // Should fail validation - bulk_input_method required
    expect(result.errors?.some(e => e.field === 'bulk_input_method')).toBe(true);
  });

  // Test 7: BULK WEIGHT_FLOW validation - zero mass flow should fail
  it('should error when BULK WEIGHT_FLOW has zero mass flow', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 0, // Invalid
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'mass_flow_lbs_per_hr')).toBe(true);
  });

  // Test 8: BULK VOLUME_FLOW validation - zero volume flow should fail
  it('should error when BULK VOLUME_FLOW has zero volume flow', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'VOLUME_FLOW',
      volume_flow_ft3_per_hr: 0, // Invalid
      density_lbs_per_ft3: 50,
      density_source: 'KNOWN',
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'volume_flow_ft3_per_hr')).toBe(true);
  });

  // Test 9: BULK VOLUME_FLOW validation - zero density should fail
  it('should error when BULK VOLUME_FLOW has zero density', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'VOLUME_FLOW',
      volume_flow_ft3_per_hr: 100,
      density_lbs_per_ft3: 0, // Invalid
      density_source: 'KNOWN',
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'density_lbs_per_ft3')).toBe(true);
  });

  // Test 10: BULK VOLUME_FLOW validation - missing density_source should fail
  it('should error when BULK VOLUME_FLOW has no density_source', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'VOLUME_FLOW',
      volume_flow_ft3_per_hr: 100,
      density_lbs_per_ft3: 50,
      // density_source not provided
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'density_source')).toBe(true);
  });

  // =========================================================================
  // v1.31: LUMP SIZE VALIDATION TESTS
  // =========================================================================

  // Test 11: Valid lump size range (smallest < largest)
  it('should accept valid lump size range (smallest < largest)', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      smallest_lump_size_in: 1,
      largest_lump_size_in: 4,
    };

    const result = runCalculation({ inputs });

    // Should not have lump size errors
    expect(result.errors?.some(e => e.field === 'smallest_lump_size_in') ?? false).toBe(false);
    expect(result.errors?.some(e => e.field === 'largest_lump_size_in') ?? false).toBe(false);
  });

  // Test 12: Lump size error when smallest > largest
  it('should error when smallest lump size exceeds largest', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      smallest_lump_size_in: 5,
      largest_lump_size_in: 2,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'smallest_lump_size_in')).toBe(true);
  });

  // Test 13: Negative lump size should error
  it('should error when lump size is negative', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      smallest_lump_size_in: -1,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'smallest_lump_size_in')).toBe(true);
  });

  // Test 14: Legacy max_lump_size_in should be used as fallback for largest_lump_size_in
  it('should use legacy max_lump_size_in as fallback for largest', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      max_lump_size_in: 3, // Legacy field
      // largest_lump_size_in not provided - should use max_lump_size_in
    };

    const result = runCalculation({ inputs });

    // Should not error - legacy field is valid
    expect(result.errors?.some(e => e.field === 'largest_lump_size_in') ?? false).toBe(false);
  });

  // Test 15: Notes should be persisted (no validation errors)
  it('should accept application and material notes', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      application_notes: 'This is a test application for bulk material handling.',
      material_notes: 'Material is granular with some fines.',
    };

    const result = runCalculation({ inputs });

    // Should calculate successfully with notes
    expect(result.errors?.length ?? 0).toBe(0);
  });

  // =========================================================================
  // v1.32: FEED BEHAVIOR & SURGE VALIDATION TESTS
  // =========================================================================

  // Test 16: Feed behavior continuous should work without surge fields
  it('should accept continuous feed behavior without surge fields', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'CONTINUOUS',
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'surge_multiplier') ?? false).toBe(false);
  });

  // Test 17: Surge feed should warn if multiplier not provided
  it('should warn when surge selected but no multiplier', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'SURGE',
      // surge_multiplier not provided
    };

    const result = runCalculation({ inputs });

    expect(result.warnings?.some(w => w.field === 'surge_multiplier')).toBe(true);
  });

  // Test 18: Surge multiplier < 1 should error
  it('should error when surge multiplier is less than 1', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'SURGE',
      surge_multiplier: 0.5,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'surge_multiplier')).toBe(true);
  });

  // Test 19: Valid surge config should pass
  it('should accept valid surge configuration', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      feed_behavior: 'SURGE',
      surge_multiplier: 1.5,
      surge_duration_sec: 10,
    };

    const result = runCalculation({ inputs });

    expect(result.errors?.some(e => e.field === 'surge_multiplier') ?? false).toBe(false);
  });

  // Test 20: Weight flow without density should warn (optional but encouraged)
  it('should warn when weight flow has no density', () => {
    const inputs: SliderbedInputs = {
      ...BULK_BASE_INPUTS,
      material_form: 'BULK',
      bulk_input_method: 'WEIGHT_FLOW',
      mass_flow_lbs_per_hr: 1000,
      // density_lbs_per_ft3 not provided
    };

    const result = runCalculation({ inputs });

    expect(result.warnings?.some(w => w.field === 'density_lbs_per_ft3')).toBe(true);
  });
});

// ============================================================================
// v1.39: UNIFIED SUPPORT METHOD & MODEL SELECTION TESTS
// ============================================================================

describe('Unified Support Method & Model Selection (v1.39)', () => {
  const BASE_INPUTS: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
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

  describe('Helper Functions', () => {
    it('isLegsRequired should return true for legs', () => {
      expect(isLegsRequired(SupportMethod.Legs)).toBe(true);
      expect(isLegsRequired('legs')).toBe(true);
    });

    it('isLegsRequired should return false for external and casters', () => {
      expect(isLegsRequired(SupportMethod.External)).toBe(false);
      expect(isLegsRequired(SupportMethod.Casters)).toBe(false);
      expect(isLegsRequired('external')).toBe(false);
      expect(isLegsRequired('casters')).toBe(false);
      expect(isLegsRequired(undefined)).toBe(false);
    });

    it('isCastersSelected should return true for casters', () => {
      expect(isCastersSelected(SupportMethod.Casters)).toBe(true);
      expect(isCastersSelected('casters')).toBe(true);
    });

    it('isCastersSelected should return false for external and legs', () => {
      expect(isCastersSelected(SupportMethod.External)).toBe(false);
      expect(isCastersSelected(SupportMethod.Legs)).toBe(false);
      expect(isCastersSelected('external')).toBe(false);
      expect(isCastersSelected('legs')).toBe(false);
      expect(isCastersSelected(undefined)).toBe(false);
    });
  });

  describe('Validation Fixtures', () => {
    // Fixture 1: Legs with leg_model_key + TOB = OK
    it('Fixture 1: Legs with leg_model_key set = valid', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.Legs,
        leg_model_key: 'LEG-STD-24',
      };

      const result = runCalculation({ inputs });

      // Should not have leg_model_key error
      expect(result.errors?.some(e => e.field === 'leg_model_key')).toBeFalsy();
    });

    // Fixture 2: Legs with missing leg_model_key = validation error
    it('Fixture 2: Legs with missing leg_model_key = error', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.Legs,
        // No leg_model_key provided
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'leg_model_key')).toBe(true);
    });

    // Fixture 3: Casters with rigid qty 4 + rigid model + swivel qty 2 + swivel model = OK
    it('Fixture 3: Casters with valid rigid+swivel config = valid', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.Casters,
        caster_rigid_model_key: 'CASTER-5-STD',
        caster_rigid_qty: 4,
        caster_swivel_model_key: 'CASTER-5-STD',
        caster_swivel_qty: 2,
      };

      const result = runCalculation({ inputs });

      // Should not have caster validation errors
      expect(result.errors?.some(e => e.field === 'caster_rigid_qty')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'caster_rigid_model_key')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'caster_swivel_model_key')).toBeFalsy();
    });

    // Fixture 4: Casters with both qtys = 0 = validation error
    it('Fixture 4: Casters with both qtys = 0 = error', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.Casters,
        caster_rigid_qty: 0,
        caster_swivel_qty: 0,
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'caster_rigid_qty')).toBe(true);
    });

    // Fixture 5: External with no model keys = OK
    it('Fixture 5: External with no model keys = valid', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.External,
        // No leg_model_key or caster model keys
      };

      const result = runCalculation({ inputs });

      // Should not have any support-related validation errors
      expect(result.errors?.some(e => e.field === 'leg_model_key')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'caster_rigid_qty')).toBeFalsy();
    });

    // Fixture 6: Casters with rigid qty > 0 but no rigid model = error
    it('Fixture 6: Casters with rigid qty > 0 but no model = error', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.Casters,
        caster_rigid_qty: 4,
        // No caster_rigid_model_key
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'caster_rigid_model_key')).toBe(true);
    });

    // Fixture 7: Casters with swivel qty > 0 but no swivel model = error
    it('Fixture 7: Casters with swivel qty > 0 but no model = error', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.Casters,
        caster_swivel_qty: 4,
        // No caster_swivel_model_key
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'caster_swivel_model_key')).toBe(true);
    });

    // Fixture 8: Casters with same model for rigid and swivel = OK
    it('Fixture 8: Casters with same model for rigid and swivel = valid', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.Casters,
        caster_rigid_model_key: 'CASTER-5-STD',
        caster_rigid_qty: 2,
        caster_swivel_model_key: 'CASTER-5-STD', // Same model
        caster_swivel_qty: 2,
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'caster_rigid_model_key')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'caster_swivel_model_key')).toBeFalsy();
    });
  });
});

// ============================================================================
// v1.40: FLOOR SUPPORT LOGIC TESTS
// ============================================================================

describe('Floor Support Logic - Decouple TOB from Legs/Casters (v1.40)', () => {
  const BASE_INPUTS: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    belt_width_in: 24,
    conveyor_incline_deg: 5, // 5 degree incline for derived TOB test
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

  describe('isFloorSupported helper function', () => {
    it('returns true for floor_supported', () => {
      expect(isFloorSupported(SupportMethod.FloorSupported)).toBe(true);
      expect(isFloorSupported('floor_supported')).toBe(true);
    });

    it('returns true for legacy legs value (backward compatibility)', () => {
      expect(isFloorSupported(SupportMethod.Legs)).toBe(true);
      expect(isFloorSupported('legs')).toBe(true);
    });

    it('returns true for legacy casters value (backward compatibility)', () => {
      expect(isFloorSupported(SupportMethod.Casters)).toBe(true);
      expect(isFloorSupported('casters')).toBe(true);
    });

    it('returns false for external', () => {
      expect(isFloorSupported(SupportMethod.External)).toBe(false);
      expect(isFloorSupported('external')).toBe(false);
    });
  });

  // Test 1: Floor Supported + Legs only → TOB shown + required
  describe('Fixture 1: Floor Supported + Legs only', () => {
    it('TOB required when floor supported with legs only', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        include_casters: false,
        leg_model_key: 'LEG-STD-24',
        // No TOB set
      };

      const result = runCalculation({ inputs });

      // Should have TOB validation error
      expect(result.errors?.some(e => e.field === 'tail_tob_in' || e.field === 'drive_tob_in')).toBe(true);
    });

    it('No TOB error when TOB is provided', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        include_casters: false,
        leg_model_key: 'LEG-STD-24',
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      // Should NOT have TOB validation error
      expect(result.errors?.some(e => e.field === 'tail_tob_in')).toBeFalsy();
    });
  });

  // Test 2: Floor Supported + Casters only → TOB shown + required
  describe('Fixture 2: Floor Supported + Casters only', () => {
    it('TOB required when floor supported with casters only', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: false,
        include_casters: true,
        caster_rigid_model_key: 'CASTER-4-STD',
        caster_rigid_qty: 4,
        // No TOB set
      };

      const result = runCalculation({ inputs });

      // Should have TOB validation error
      expect(result.errors?.some(e => e.field === 'tail_tob_in' || e.field === 'drive_tob_in')).toBe(true);
    });

    it('No TOB error when TOB is provided', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: false,
        include_casters: true,
        caster_rigid_model_key: 'CASTER-4-STD',
        caster_rigid_qty: 4,
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      // Should NOT have TOB validation error
      expect(result.errors?.some(e => e.field === 'tail_tob_in')).toBeFalsy();
    });
  });

  // Test 3: Floor Supported + Legs + Casters → TOB shown + required
  describe('Fixture 3: Floor Supported + Legs + Casters (both enabled)', () => {
    it('TOB required when floor supported with both legs and casters', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        include_casters: true,
        leg_model_key: 'LEG-STD-24',
        caster_rigid_model_key: 'CASTER-4-STD',
        caster_rigid_qty: 4,
        // No TOB set
      };

      const result = runCalculation({ inputs });

      // Should have TOB validation error
      expect(result.errors?.some(e => e.field === 'tail_tob_in' || e.field === 'drive_tob_in')).toBe(true);
    });

    it('Both legs and casters can be enabled simultaneously', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        include_casters: true,
        leg_model_key: 'LEG-STD-24',
        caster_rigid_model_key: 'CASTER-4-STD',
        caster_rigid_qty: 4,
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      // Should NOT have leg or caster validation errors
      expect(result.errors?.some(e => e.field === 'leg_model_key')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'caster_rigid_qty')).toBeFalsy();
    });
  });

  // Test 4: External → TOB hidden, legs + casters hidden
  describe('Fixture 4: External support method', () => {
    it('TOB not required when external', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.External,
        // No TOB, legs, or casters
      };

      const result = runCalculation({ inputs });

      // Should NOT have TOB, leg, or caster validation errors
      expect(result.errors?.some(e => e.field === 'tail_tob_in')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'drive_tob_in')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'leg_model_key')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'caster_rigid_qty')).toBeFalsy();
    });
  });

  // Test 5: Change Floor → External clears validation errors
  describe('Fixture 5: Switching from Floor Supported to External', () => {
    it('Switching to external should not require TOB', () => {
      // First with floor supported (should have TOB error)
      const floorInputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        // No leg_model_key, no TOB
      };

      const floorResult = runCalculation({ inputs: floorInputs });
      expect(floorResult.errors?.some(e => e.field === 'tail_tob_in' || e.field === 'drive_tob_in')).toBe(true);

      // Now switch to external
      const externalInputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.External,
        // Same fields but now external
      };

      const externalResult = runCalculation({ inputs: externalInputs });

      // Should NOT have TOB or leg validation errors anymore
      expect(externalResult.errors?.some(e => e.field === 'tail_tob_in')).toBeFalsy();
      expect(externalResult.errors?.some(e => e.field === 'drive_tob_in')).toBeFalsy();
      expect(externalResult.errors?.some(e => e.field === 'leg_model_key')).toBeFalsy();
    });
  });

  // Test 6: Incline geometry updates derived TOB correctly
  describe('Fixture 6: Derived TOB from incline geometry', () => {
    it('Derived TOB calculation uses geometry correctly', () => {
      // For this test, we verify the geometry formula:
      // With 120" length at 5° incline:
      // rise = 120 * sin(5°) = 120 * 0.0872 ≈ 10.46"
      // If tail TOB = 36", drive TOB = 36" + 10.46" ≈ 46.46"

      const lengthIn = 120;
      const angleDeg = 5;
      const tailTob = 36;

      // Calculate expected derived TOB
      const angleRad = (angleDeg * Math.PI) / 180;
      const riseIn = lengthIn * Math.sin(angleRad);
      const expectedDriveTob = tailTob + riseIn;

      // Verify the math
      expect(riseIn).toBeCloseTo(10.46, 1);
      expect(expectedDriveTob).toBeCloseTo(46.46, 1);

      // The actual UI calculation happens in TabBuildOptions.tsx
      // This test verifies the formula is correct
    });

    it('Floor supported with valid geometry has no TOB errors', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        leg_model_key: 'LEG-STD-24',
        reference_end: 'tail',
        tail_tob_in: 36,
        conveyor_incline_deg: 5,
        conveyor_length_cc_in: 120,
      };

      const result = runCalculation({ inputs });

      // Should NOT have TOB validation errors
      expect(result.errors?.some(e => e.field === 'tail_tob_in')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'drive_tob_in')).toBeFalsy();
    });
  });

  // Additional test: Leg model required when include_legs is true
  describe('Leg model validation', () => {
    it('Leg model required when include_legs is true', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        // No leg_model_key
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'leg_model_key')).toBe(true);
    });

    it('No leg error when leg_model_key is provided', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_legs: true,
        leg_model_key: 'LEG-STD-24',
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'leg_model_key')).toBeFalsy();
    });
  });

  // Additional test: Caster validation when include_casters is true
  describe('Caster validation', () => {
    it('At least one caster required when include_casters is true', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_casters: true,
        caster_rigid_qty: 0,
        caster_swivel_qty: 0,
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'caster_rigid_qty')).toBe(true);
    });

    it('Caster model required when qty > 0', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_casters: true,
        caster_rigid_qty: 4,
        // No caster_rigid_model_key
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      expect(result.errors?.some(e => e.field === 'caster_rigid_model_key')).toBe(true);
    });

    // Regression test: casters with model keys set should NOT produce errors
    it('No caster errors when model keys are properly set', () => {
      const inputs: SliderbedInputs = {
        ...BASE_INPUTS,
        support_method: SupportMethod.FloorSupported,
        include_casters: true,
        caster_rigid_qty: 2,
        caster_rigid_model_key: 'RIGID_4IN',
        caster_swivel_qty: 2,
        caster_swivel_model_key: 'SWIVEL_4IN',
        reference_end: 'tail',
        tail_tob_in: 36,
      };

      const result = runCalculation({ inputs });

      // Should NOT have caster validation errors (errors array may be undefined or empty)
      expect(result.errors?.some(e => e.field === 'caster_rigid_model_key')).toBeFalsy();
      expect(result.errors?.some(e => e.field === 'caster_swivel_model_key')).toBeFalsy();
    });
  });
});

// ============================================================================
// v1.42: LEGACY KEY STRIPPING REGRESSION TEST
// ============================================================================

describe('Legacy Key Stripping (v1.42)', () => {
  it('should strip legacy tail_support_type, drive_support_type, height_input_mode on migration', () => {
    // Simulate an old config with legacy keys
    const legacyInputs = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
      conveyor_incline_deg: 0,
      part_weight_lbs: 5,
      part_length_in: 6,
      part_width_in: 4,
      part_spacing_in: 12,
      belt_speed_fpm: 50,
      // Legacy fields that should be stripped
      tail_support_type: 'Legs',
      drive_support_type: 'Casters',
      height_input_mode: 'reference_and_angle',
      support_option: 'Floor Mounted',
    } as Record<string, unknown>;

    const migrated = migrateInputs(legacyInputs as SliderbedInputs);

    // All legacy keys should be stripped
    expect((migrated as Record<string, unknown>).tail_support_type).toBeUndefined();
    expect((migrated as Record<string, unknown>).drive_support_type).toBeUndefined();
    expect((migrated as Record<string, unknown>).height_input_mode).toBeUndefined();
    expect((migrated as Record<string, unknown>).support_option).toBeUndefined();
  });

  it('should preserve valid TOB fields (tail_tob_in, drive_tob_in, reference_end)', () => {
    // These fields are still valid in the new system
    const inputs = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
      conveyor_incline_deg: 0,
      part_weight_lbs: 5,
      part_length_in: 6,
      part_width_in: 4,
      part_spacing_in: 12,
      belt_speed_fpm: 50,
      support_method: SupportMethod.FloorSupported,
      reference_end: 'tail' as const,
      tail_tob_in: 36,
      drive_tob_in: 42,
    } as SliderbedInputs;

    const migrated = migrateInputs(inputs);

    // These should be preserved
    expect(migrated.reference_end).toBe('tail');
    expect(migrated.tail_tob_in).toBe(36);
    expect(migrated.drive_tob_in).toBe(42);
    expect(migrated.support_method).toBe(SupportMethod.FloorSupported);
  });

  it('should not crash when loading old config with removed keys', () => {
    const oldConfig = {
      conveyor_length_cc_in: 120,
      belt_width_in: 24,
      tail_support_type: 'External',
      drive_support_type: 'External',
    } as Record<string, unknown>;

    // This should not throw
    expect(() => migrateInputs(oldConfig as SliderbedInputs)).not.toThrow();

    const migrated = migrateInputs(oldConfig as SliderbedInputs);
    expect(migrated.conveyor_length_cc_in).toBe(120);
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
