/**
 * SLIDERBED CONVEYOR v1 - DRIVE TESTS
 * 
 * Split from model.test.ts for readability.
 * Contains:
 * - v1.6 Speed Mode Regression Tests
 * - v1.7 Gearmotor Mounting Style & Sprocket Chain Ratio
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
  GearmotorMountingStyle,
  EndSupportType,
} from '../schema';
import { migrateInputs } from '../migrate';

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
