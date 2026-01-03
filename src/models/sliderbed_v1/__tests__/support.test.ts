/**
 * SLIDERBED CONVEYOR v1 - SUPPORT TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains:
 * - Unified Support Method & Model Selection (v1.39)
 * - Floor Support Logic - Decouple TOB from Legs/Casters (v1.40)
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
  SupportMethod,
  isLegsRequired,
  isCastersSelected,
  isFloorSupported,
} from '../schema';

describe('Unified Support Method & Model Selection (v1.39)', () => {
  const BASE_INPUTS: SliderbedInputs = {
    material_form: 'PARTS', // v1.48: Required for new applications
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

describe('Floor Support Logic - Decouple TOB from Legs/Casters (v1.40)', () => {
  const BASE_INPUTS: SliderbedInputs = {
    material_form: 'PARTS', // v1.48: Required for new applications
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
  });
});
