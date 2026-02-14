/**
 * SLIDERBED CONVEYOR v1 - SIDE LOAD INTEGRATION TESTS
 *
 * Tests the full calculation pipeline with side load scenarios
 * through runCalculation() (engine → validate → calculate → results).
 *
 * Phase 1, Fix A1: Side load → V-guide auto-select
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
} from '../schema';

const APPLICATION_DEFAULTS = {
  material_form: 'PARTS',
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
  pulley_surface_type: PulleySurfaceType.Plain,
  start_stop_application: false,
  direction_mode: DirectionMode.OneDirection,
  side_loading_direction: SideLoadingDirection.None,
  drive_location: DriveLocation.Head,
  brake_motor: false,
  gearmotor_orientation: GearmotorOrientation.SideMount,
  drive_hand: DriveHand.RightHand,
  shaft_diameter_mode: ShaftDiameterMode.Calculated,
  belt_coeff_piw: 0.109,
  belt_coeff_pil: 0.109,
};

/**
 * Complete valid input set that produces a successful calculation.
 * Belt selection included (belt_catalog_key + piw/pil).
 */
const validInputs: SliderbedInputs = {
  conveyor_length_cc_in: 120,
  belt_width_in: 24,
  conveyor_incline_deg: 0,
  pulley_diameter_in: 4,
  drive_pulley_diameter_in: 4,
  tail_pulley_diameter_in: 4,
  belt_speed_fpm: 50,
  drive_rpm: 100,
  part_weight_lbs: 5,
  part_length_in: 12,
  part_width_in: 6,
  drop_height_in: 0,
  part_temperature_class: PartTemperatureClass.Ambient,
  fluid_type: FluidType.None,
  orientation: Orientation.Lengthwise,
  part_spacing_in: 0,
  belt_catalog_key: 'TEST_BELT',
  belt_piw: 0.109,
  belt_pil: 0.109,
  ...APPLICATION_DEFAULTS,
};

describe('Side Load Integration (Full Pipeline)', () => {
  it('Heavy side load + V-guided → calculation succeeds, warning present', () => {
    const inputs: SliderbedInputs = {
      ...validInputs,
      side_loading_direction: SideLoadingDirection.Left,
      side_loading_severity: SideLoadingSeverity.Heavy,
      belt_tracking_method: BeltTrackingMethod.VGuided,
      v_guide_profile: 'K13',
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.warnings?.some(w =>
      w.field === 'side_loading_severity' && w.message.includes('Heavy')
    )).toBe(true);
  });

  it('Heavy side load + Crowned → calculation fails with error', () => {
    const inputs: SliderbedInputs = {
      ...validInputs,
      side_loading_direction: SideLoadingDirection.Left,
      side_loading_severity: SideLoadingSeverity.Heavy,
      belt_tracking_method: BeltTrackingMethod.Crowned,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(false);
    expect(result.errors?.some(e =>
      e.field === 'belt_tracking_method' && e.message.includes('Heavy side loading requires V-guided')
    )).toBe(true);
  });

  it('Moderate side load + Crowned → calculation succeeds, warning present', () => {
    const inputs: SliderbedInputs = {
      ...validInputs,
      side_loading_direction: SideLoadingDirection.Left,
      side_loading_severity: SideLoadingSeverity.Moderate,
      belt_tracking_method: BeltTrackingMethod.Crowned,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    expect(result.warnings?.some(w =>
      w.field === 'side_loading_severity' && w.message.includes('Moderate')
    )).toBe(true);
  });

  it('No side load + Crowned → calculation succeeds, no side load warnings', () => {
    const inputs: SliderbedInputs = {
      ...validInputs,
      side_loading_direction: SideLoadingDirection.None,
      belt_tracking_method: BeltTrackingMethod.Crowned,
    };
    const result = runCalculation({ inputs });

    expect(result.success).toBe(true);
    const sideLoadWarnings = result.warnings?.filter(w => w.field === 'side_loading_severity') ?? [];
    expect(sideLoadWarnings).toHaveLength(0);
  });

  it('Heavy side load + Crowned via belt_conveyor_v1 product → also fails', () => {
    const inputs: SliderbedInputs = {
      ...validInputs,
      side_loading_direction: SideLoadingDirection.Both,
      side_loading_severity: SideLoadingSeverity.Heavy,
      belt_tracking_method: BeltTrackingMethod.Crowned,
    };
    const result = runCalculation({ inputs, productKey: 'belt_conveyor_v1' });

    expect(result.success).toBe(false);
    expect(result.errors?.some(e =>
      e.field === 'belt_tracking_method'
    )).toBe(true);
  });
});
