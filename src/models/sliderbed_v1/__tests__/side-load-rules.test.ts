/**
 * SLIDERBED CONVEYOR v1 - SIDE LOAD RULES TESTS
 *
 * Tests the side-load → V-guide validation rule:
 * - Heavy side load + Crowned → blocking ERROR (safety backstop)
 * - Heavy side load + V-guided → warning only (confirmation)
 * - Moderate side load → warning only (no error)
 * - No side load → no side-load warnings/errors
 *
 * Phase 1, Fix A1: Side load → V-guide auto-select
 */

import { applyApplicationRules } from '../rules';
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
  drive_location: DriveLocation.Head,
  brake_motor: false,
  gearmotor_orientation: GearmotorOrientation.SideMount,
  drive_hand: DriveHand.RightHand,
  shaft_diameter_mode: ShaftDiameterMode.Calculated,
  belt_coeff_piw: 0.109,
  belt_coeff_pil: 0.109,
};

const baseInputs: SliderbedInputs = {
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
  belt_tracking_method: BeltTrackingMethod.Crowned,
  side_loading_direction: SideLoadingDirection.None,
  ...APPLICATION_DEFAULTS,
};

describe('Side Load → V-Guide Rules', () => {
  describe('No side loading', () => {
    it('should produce no side-load warnings or errors when direction is None', () => {
      const inputs = { ...baseInputs, side_loading_direction: SideLoadingDirection.None };
      const { errors, warnings } = applyApplicationRules(inputs);

      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method' || e.field === 'side_loading_severity');
      const sideLoadWarnings = warnings.filter(w => w.field === 'side_loading_severity');

      expect(sideLoadErrors).toHaveLength(0);
      expect(sideLoadWarnings).toHaveLength(0);
    });
  });

  describe('Light side loading', () => {
    it('should produce no side-load warnings for Light severity', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Light,
      };
      const { errors, warnings } = applyApplicationRules(inputs);

      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method');
      const sideLoadWarnings = warnings.filter(w => w.field === 'side_loading_severity');

      expect(sideLoadErrors).toHaveLength(0);
      expect(sideLoadWarnings).toHaveLength(0);
    });
  });

  describe('Moderate side loading', () => {
    it('should produce warning (not error) for Moderate severity', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Moderate,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const { errors, warnings } = applyApplicationRules(inputs);

      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method');
      const sideLoadWarnings = warnings.filter(w => w.field === 'side_loading_severity');

      expect(sideLoadErrors).toHaveLength(0);
      expect(sideLoadWarnings).toHaveLength(1);
      expect(sideLoadWarnings[0].message).toContain('Moderate');
    });
  });

  describe('Heavy side loading', () => {
    it('should produce WARNING when Heavy + V-guided (confirmation)', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Heavy,
        belt_tracking_method: BeltTrackingMethod.VGuided,
      };
      const { errors, warnings } = applyApplicationRules(inputs);

      // No blocking error when V-guided
      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method');
      expect(sideLoadErrors).toHaveLength(0);

      // Confirmation warning still present
      const sideLoadWarnings = warnings.filter(w => w.field === 'side_loading_severity');
      expect(sideLoadWarnings).toHaveLength(1);
      expect(sideLoadWarnings[0].message).toContain('Heavy');
    });

    it('should produce blocking ERROR when Heavy + Crowned (safety backstop)', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Left,
        side_loading_severity: SideLoadingSeverity.Heavy,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const { errors, warnings } = applyApplicationRules(inputs);

      // Blocking error: Heavy without V-guided
      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method');
      expect(sideLoadErrors).toHaveLength(1);
      expect(sideLoadErrors[0].message).toContain('Heavy side loading requires V-guided tracking');

      // Confirmation warning also present
      const sideLoadWarnings = warnings.filter(w => w.field === 'side_loading_severity');
      expect(sideLoadWarnings).toHaveLength(1);
    });

    it('should produce same behavior for Right direction', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Right,
        side_loading_severity: SideLoadingSeverity.Heavy,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const { errors } = applyApplicationRules(inputs);

      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method');
      expect(sideLoadErrors).toHaveLength(1);
    });

    it('should produce same behavior for Both direction', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: SideLoadingDirection.Both,
        side_loading_severity: SideLoadingSeverity.Heavy,
        belt_tracking_method: BeltTrackingMethod.Crowned,
      };
      const { errors } = applyApplicationRules(inputs);

      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method');
      expect(sideLoadErrors).toHaveLength(1);
    });

    it('should work with string enum values (backward compat)', () => {
      const inputs = {
        ...baseInputs,
        side_loading_direction: 'Left' as SideLoadingDirection,
        side_loading_severity: 'Heavy' as SideLoadingSeverity,
        belt_tracking_method: 'Crowned' as BeltTrackingMethod,
      };
      const { errors } = applyApplicationRules(inputs);

      // The rule uses enum comparison, so string 'Left' !== SideLoadingDirection.Left ('Left')
      // This test verifies the enum values are the raw strings
      const sideLoadErrors = errors.filter(e => e.field === 'belt_tracking_method');
      expect(sideLoadErrors).toHaveLength(1);
    });
  });
});
