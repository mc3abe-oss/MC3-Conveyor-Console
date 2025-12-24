/**
 * SLIDERBED CONVEYOR v1 - TEST FIXTURES
 *
 * This file contains test fixtures extracted from Excel.
 * Each fixture represents a complete calculation case with:
 * - Input values
 * - Expected output values
 * - Tolerances for numeric comparison
 *
 * These fixtures are the source of truth for Excel parity.
 * A model version cannot be published unless all fixtures pass.
 */

import {
  SliderbedInputs,
  SliderbedOutputs,
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
} from './schema';

// ============================================================================
// FIXTURE TYPE DEFINITIONS
// ============================================================================

export interface TestFixture {
  /** Fixture name/description */
  name: string;

  /** Input values */
  inputs: SliderbedInputs;

  /** Expected output values */
  expected_outputs: Partial<SliderbedOutputs>;

  /** Numeric tolerance (default: 0.5% unless specified per field) */
  tolerance?: number | Partial<Record<keyof SliderbedOutputs, number>>;

  /** Expected warnings (optional) */
  expected_warnings?: string[];

  /** Expected errors (optional) */
  expected_errors?: string[];
}

// ============================================================================
// TOLERANCE HELPERS
// ============================================================================

/**
 * Default numeric tolerance: ±0.5% unless Excel formatting implies tighter
 */
export const DEFAULT_TOLERANCE = 0.005; // 0.5%

/**
 * Check if actual value is within tolerance of expected value
 */
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  const absoluteTolerance = Math.abs(expected * tolerance);
  return Math.abs(actual - expected) <= absoluteTolerance;
}

// ============================================================================
// EXAMPLE FIXTURES
// ============================================================================

/**
 * Example fixture showing the structure
 * Replace with actual Excel cases
 */
export const EXAMPLE_FIXTURE: TestFixture = {
  name: 'Example Case - Basic Conveyor',
  inputs: {
    conveyor_length_cc_in: 120,
    conveyor_width_in: 24,
    conveyor_incline_deg: 0,
    pulley_diameter_in: 4,
    belt_speed_fpm: 104.72,
    drive_rpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    drop_height_in: 0,
    part_temperature_class: PartTemperatureClass.Ambient,
    fluid_type: FluidType.None,
    orientation: Orientation.Lengthwise,
    part_spacing_in: 12,
    // Application fields
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
  },
  expected_outputs: {
    parts_on_belt: 5.0,
    // Add expected values from Excel here
    // drive_shaft_rpm: 100,
    // torque_drive_shaft_inlbf: 1234.56,
    // gear_ratio: 11.46,
  },
  tolerance: DEFAULT_TOLERANCE,
};

// ============================================================================
// FIXTURE REGISTRY
// ============================================================================

/**
 * All test fixtures
 *
 * TODO: Add actual Excel test cases here
 * Each uploaded Excel case should be converted to a fixture
 */
export const ALL_FIXTURES: TestFixture[] = [
  // EXAMPLE_FIXTURE,
  // Add more fixtures here as they are extracted from Excel
];

// ============================================================================
// FIXTURE EXECUTION HELPERS
// ============================================================================

/**
 * Compare actual outputs against expected outputs with tolerance
 */
export function compareOutputs(
  actual: SliderbedOutputs,
  expected: Partial<SliderbedOutputs>,
  tolerance: number | Partial<Record<keyof SliderbedOutputs, number>> = DEFAULT_TOLERANCE
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const key in expected) {
    const expectedKey = key as keyof SliderbedOutputs;
    const actualValue = actual[expectedKey];
    const expectedValue = expected[expectedKey];

    if (expectedValue === undefined) continue;

    // Determine tolerance for this field
    const fieldTolerance =
      typeof tolerance === 'number' ? tolerance : tolerance[expectedKey] ?? DEFAULT_TOLERANCE;

    // Compare values
    if (typeof expectedValue === 'number' && typeof actualValue === 'number') {
      if (!isWithinTolerance(actualValue, expectedValue, fieldTolerance)) {
        const percentDiff = ((actualValue - expectedValue) / expectedValue) * 100;
        failures.push(
          `${expectedKey}: expected ${expectedValue}, got ${actualValue} (${percentDiff.toFixed(2)}% difference)`
        );
      }
    } else if (actualValue !== expectedValue) {
      failures.push(
        `${expectedKey}: expected ${expectedValue}, got ${actualValue}`
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
