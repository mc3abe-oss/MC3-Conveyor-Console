/**
 * SLIDERBED CONVEYOR v1 - FRAME TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains:
 * - Frame Height & Snub Roller Logic (v1.5)
 * - Frame Construction Validation (v1.14)
 * - Frame Construction Migration (v1.14)
 */

import { runCalculation } from '../../../lib/calculator/engine';
import {
  SliderbedInputs,
  PartTemperatureClass,
  FluidType,
  Orientation,
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
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  BeltTrackingMethod,
  ShaftDiameterMode,
  FrameHeightMode,
  SpeedMode,
  EndSupportType,
  DEFAULT_PARAMETERS,
} from '../schema';
import { migrateInputs } from '../migrate';

describe('Frame Height & Snub Roller Logic (v1.5)', () => {
  // Import frame height functions and constants for testing
  const {
    calculateEffectiveFrameHeight,
    calculateRequiresSnubRollers,
    calculateFrameHeightCostFlags,
    FRAME_HEIGHT_CONSTANTS,
  } = require('../formulas');

  const { FrameHeightMode } = require('../schema');

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
    const { validateInputs } = require('../rules');

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
    const { calculateGravityRollerQuantity, calculateSnubRollerQuantity, GRAVITY_ROLLER_SPACING_IN } = require('../formulas');

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
