/**
 * SLIDERBED CONVEYOR v1 - CLEATS TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains:
 * - Belt Cleats (v1.3)
 * - Cleat Weight & Spacing (v1.43)
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
  SupportMethod,
} from '../schema';

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
    support_method: SupportMethod.External,
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

    // v1.43: Cleat weight now affects belt pull calculations
    it('should increase belt pull when cleat weight is enabled (v1.43)', () => {
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

      // Cleat weight adds to effective belt weight, increasing belt pull
      const pullWithout = resultWithout.outputs?.total_belt_pull_lb ?? 0;
      const pullWith = resultWith.outputs?.total_belt_pull_lb ?? 0;
      expect(pullWith).toBeGreaterThan(pullWithout);

      // Torque should also increase proportionally
      const torqueWithout = resultWithout.outputs?.torque_drive_shaft_inlbf ?? 0;
      const torqueWith = resultWith.outputs?.torque_drive_shaft_inlbf ?? 0;
      expect(torqueWith).toBeGreaterThan(torqueWithout);

      // Belt length should NOT change (cleats don't affect geometry)
      expect(resultWith.outputs?.total_belt_length_in).toBe(
        resultWithout.outputs?.total_belt_length_in
      );
    });

    it('should match baseline when cleats are disabled', () => {
      const baseline = {
        ...baseInputs,
        cleats_enabled: false,
      };
      const alsoDisabled = {
        ...baseInputs,
        cleats_enabled: false,
        cleat_height_in: 2, // These values should be ignored
        cleat_spacing_in: 8,
      };

      const resultBaseline = runCalculation({ inputs: baseline });
      const resultAlso = runCalculation({ inputs: alsoDisabled });

      expect(resultBaseline.success).toBe(true);
      expect(resultAlso.success).toBe(true);

      // When disabled, cleat config values should have no effect
      expect(resultAlso.outputs?.total_belt_pull_lb).toBe(
        resultBaseline.outputs?.total_belt_pull_lb
      );
      expect(resultAlso.outputs?.torque_drive_shaft_inlbf).toBe(
        resultBaseline.outputs?.torque_drive_shaft_inlbf
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

// v1.43: Cleat Weight & Spacing

describe('Cleat Weight & Spacing (v1.43)', () => {
  // Base inputs for cleat weight tests
  const BASE_CLEAT_WEIGHT_INPUTS: SliderbedInputs = {
    conveyor_length_cc_in: 120,
    belt_width_in: 48, // 48" belt
    pulley_diameter_in: 4,
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 0.5,
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
    cleats_enabled: false,
    frame_height_mode: FrameHeightMode.Standard,
    speed_mode: SpeedMode.BeltSpeed,
    frame_construction_type: 'sheet_metal',
    frame_sheet_metal_gauge: '12_GA',
  };

  describe('Cleat Width Calculation', () => {
    it('should calculate cleat width = belt_width - (2 × edge_offset): 48" belt, 3" offset → 42" cleat', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 48,
        cleats_enabled: true,
        cleat_height_in: 3,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 3,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleat_width_in).toBeCloseTo(42, 3);
    });

    it('should handle zero edge offset: cleat_width = belt_width', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 24,
        cleats_enabled: true,
        cleat_height_in: 2,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleat_width_in).toBeCloseTo(24, 3);
    });
  });

  describe('Cleat Weight Calculation', () => {
    // Formula: W_each = thickness × (base + height) × width × density
    // = 0.25 × (1.5 + 3) × 42 × 0.045
    // = 0.25 × 4.5 × 42 × 0.045
    // = 1.125 × 42 × 0.045
    // = 47.25 × 0.045
    // = 2.12625 lb
    it('should calculate cleat weight: 3" height, 42" width → ~2.13 lb each', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 48,
        cleats_enabled: true,
        cleat_height_in: 3,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 3,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Expected: 0.25 × (1.5 + 3) × 42 × 0.045 = 2.12625 lb
      expect(result.outputs?.cleat_weight_lb_each).toBeCloseTo(2.12625, 2);
    });

    it('should calculate different weight for different heights: 1" height, 24" width', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 24,
        cleats_enabled: true,
        cleat_height_in: 1,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 0,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Expected: 0.25 × (1.5 + 1) × 24 × 0.045 = 0.675 lb
      expect(result.outputs?.cleat_weight_lb_each).toBeCloseTo(0.675, 2);
    });
  });

  describe('Cleat Weight Per Foot', () => {
    // Formula: W_per_ft = W_each × (12 / pitch)
    // For 12" spacing: W_per_ft = W_each × 1.0
    it('should calculate weight per foot at 12" spacing: W_each × (12/12) = W_each', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 48,
        cleats_enabled: true,
        cleat_height_in: 3,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 3,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // At 12" pitch, cleat_weight_per_ft = cleat_weight_each
      expect(result.outputs?.cleat_weight_lb_per_ft).toBeCloseTo(2.12625, 2);
    });

    it('should calculate weight per foot at 6" spacing: W_each × 2', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 48,
        cleats_enabled: true,
        cleat_height_in: 3,
        cleat_spacing_in: 6,
        cleat_edge_offset_in: 3,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // At 6" pitch, cleat_weight_per_ft = W_each × 2 = 4.2525 lb/ft
      expect(result.outputs?.cleat_weight_lb_per_ft).toBeCloseTo(4.2525, 2);
    });
  });

  describe('Belt Weight Integration', () => {
    it('should include cleat weight in effective belt weight when cleats enabled', () => {
      const inputsWithCleats: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 48,
        cleats_enabled: true,
        cleat_height_in: 3,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 3,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs: inputsWithCleats });

      expect(result.success).toBe(true);
      // belt_weight_effective = belt_weight_base + cleat_weight_per_ft
      const baseWeight = result.outputs?.belt_weight_lb_per_ft_base ?? 0;
      const cleatWeight = result.outputs?.cleat_weight_lb_per_ft ?? 0;
      expect(result.outputs?.belt_weight_lb_per_ft_effective).toBeCloseTo(baseWeight + cleatWeight, 3);
    });

    it('should NOT change belt pull when cleats OFF (regression test)', () => {
      const inputsWithoutCleats: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        cleats_enabled: false,
      };
      const inputsWithCleatsOff = {
        ...inputsWithoutCleats,
        cleat_height_in: undefined,
        cleat_spacing_in: undefined,
        cleat_edge_offset_in: undefined,
      };

      const result1 = runCalculation({ inputs: inputsWithoutCleats });
      const result2 = runCalculation({ inputs: inputsWithCleatsOff });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Belt pull should be identical
      expect(result1.outputs?.belt_pull_lb).toBe(result2.outputs?.belt_pull_lb);
      // No cleat weight outputs
      expect(result1.outputs?.cleat_weight_lb_each).toBeUndefined();
      expect(result2.outputs?.cleat_weight_lb_each).toBeUndefined();
    });

    it('should increase belt pull when cleats enabled', () => {
      const inputsWithoutCleats: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        cleats_enabled: false,
      };
      const inputsWithCleats: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        belt_width_in: 48,
        cleats_enabled: true,
        cleat_height_in: 3,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 3,
        cleat_spacing_mode: 'use_nominal',
      };

      const resultWithout = runCalculation({ inputs: inputsWithoutCleats });
      const resultWith = runCalculation({ inputs: inputsWithCleats });

      expect(resultWithout.success).toBe(true);
      expect(resultWith.success).toBe(true);

      // Belt pull should be higher with cleats due to added cleat weight
      const pullWithout = resultWithout.outputs!.total_belt_pull_lb!;
      const pullWith = resultWith.outputs!.total_belt_pull_lb!;
      expect(pullWith).toBeGreaterThan(pullWithout);
    });
  });

  describe('Cleat Spacing Modes', () => {
    it('should calculate pitch for divide_evenly mode: count=10, length=120 → pitch=12"', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        conveyor_length_cc_in: 120,
        cleats_enabled: true,
        cleat_height_in: 2,
        cleat_edge_offset_in: 1,
        cleat_spacing_in: 12, // Required by validation even in divide_evenly mode
        cleat_spacing_mode: 'divide_evenly',
        cleat_count: 10,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleat_pitch_in).toBeCloseTo(12, 1);
      expect(result.outputs?.cleat_count_actual).toBe(10);
    });

    it('should calculate count for use_nominal mode: spacing=12", length=120 → count=10', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        conveyor_length_cc_in: 120,
        cleats_enabled: true,
        cleat_height_in: 2,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 1,
        cleat_spacing_mode: 'use_nominal',
        cleat_remainder_mode: 'spread_evenly',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleat_count_actual).toBe(10);
    });

    it('should generate layout summary string', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        conveyor_length_cc_in: 120,
        cleats_enabled: true,
        cleat_height_in: 2,
        cleat_spacing_in: 12,
        cleat_edge_offset_in: 1,
        cleat_spacing_mode: 'use_nominal',
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.outputs?.cleat_layout_summary).toBeDefined();
      expect(typeof result.outputs?.cleat_layout_summary).toBe('string');
    });
  });

  describe('No Cleat Weight Outputs When Disabled', () => {
    it('should NOT produce cleat-specific outputs when cleats_enabled = false', () => {
      const inputs: SliderbedInputs = {
        ...BASE_CLEAT_WEIGHT_INPUTS,
        cleats_enabled: false,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      // Cleat-specific outputs should be undefined
      expect(result.outputs?.cleat_width_in).toBeUndefined();
      expect(result.outputs?.cleat_weight_lb_each).toBeUndefined();
      expect(result.outputs?.cleat_weight_lb_per_ft).toBeUndefined();
      expect(result.outputs?.cleat_pitch_in).toBeUndefined();
      expect(result.outputs?.cleat_count_actual).toBeUndefined();
      expect(result.outputs?.cleat_layout_summary).toBeUndefined();
      // Belt weight base/effective are always computed (for belt pull calculations)
      // When cleats OFF, effective = base (no cleat adder)
      expect(result.outputs?.belt_weight_lb_per_ft_base).toBeDefined();
      expect(result.outputs?.belt_weight_lb_per_ft_effective).toBeDefined();
      expect(result.outputs?.belt_weight_lb_per_ft_effective).toBe(
        result.outputs?.belt_weight_lb_per_ft_base
      );
    });
  });
});
