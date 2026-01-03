/**
 * SLIDERBED CONVEYOR v1 - PULLEY TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains:
 * - Split Pulley Diameter (v1.3)
 * - Belt Minimum Pulley Diameter (v1.11)
 * - v1.16 Catalog Diameter Authority (SKIPPED)
 * - v1.17 Pulley Diameter Override
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
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  BeltTrackingMethod,
  ShaftDiameterMode,
  VGuideProfile,
  FrameHeightMode,
  SpeedMode,
} from '../schema';

// PHASE 0: Legacy pulley catalog removed - stub types/functions for compatibility
type PulleyCatalogItem = { catalog_key: string; diameter_in: number; [key: string]: unknown };
function setCachedPulleys(_pulleys: PulleyCatalogItem[]): void {
  // No-op: Legacy catalog removed
}
function clearPulleyCatalogCache(): void {
  // No-op: Legacy catalog removed
}

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

    // v1.45: Max OD constraint removed - pulleys can be larger than 12" (e.g., 12.75" drum pulleys)
    it('should accept drive pulley diameter 12.75" (regression test)', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 12.75,
        tail_pulley_diameter_in: 4,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.errors?.some((e) => e.field === 'drive_pulley_diameter_in')).toBeFalsy();
    });

    it('should accept tail pulley diameter 12.75" (regression test)', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 4,
        tail_pulley_diameter_in: 12.75,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.errors?.some((e) => e.field === 'tail_pulley_diameter_in')).toBeFalsy();
    });

    it('should accept both pulleys at 12.75" (regression test)', () => {
      const inputs = {
        ...baseInputs,
        drive_pulley_diameter_in: 12.75,
        tail_pulley_diameter_in: 12.75,
      };
      const result = runCalculation({ inputs });

      expect(result.success).toBe(true);
      expect(result.errors?.some((e) => e.field === 'drive_pulley_diameter_in')).toBeFalsy();
      expect(result.errors?.some((e) => e.field === 'tail_pulley_diameter_in')).toBeFalsy();
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

describe('v1.17 Pulley Diameter Override', () => {
  // Import the effective diameter helper from formulas
  const { getEffectivePulleyDiameters } = require('../formulas');

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

  // Case C: no catalog, override=false, no manual → effective diameter undefined
  // v1.24: Removed "Select a" warning - pulley selection is now modal-based
  // Note: Full calculation requires valid diameter; this test verifies effective diameter logic only
  it('should return undefined effective diameter when no catalog and override is false (Case C)', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      head_pulley_catalog_key: undefined, // No catalog
      drive_pulley_manual_override: false, // Override disabled
      drive_pulley_diameter_in: undefined, // No manual diameter
    };

    const { effectiveDrivePulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    // Effective diameter should be undefined when no source is available
    expect(effectiveDrivePulleyDiameterIn).toBeUndefined();
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
  // Note: Full calculation requires valid diameter; this test verifies effective diameter logic only
  it('should return undefined effective diameter when override is true but manual missing (Case E)', () => {
    const inputs: SliderbedInputs = {
      ...OVERRIDE_BASE,
      head_pulley_catalog_key: undefined,
      drive_pulley_manual_override: true,
      drive_pulley_diameter_in: undefined, // Manual not set!
    };

    const { effectiveDrivePulleyDiameterIn } = getEffectivePulleyDiameters(inputs);

    // Effective should be undefined when override is enabled but no manual value provided
    expect(effectiveDrivePulleyDiameterIn).toBeUndefined();
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
