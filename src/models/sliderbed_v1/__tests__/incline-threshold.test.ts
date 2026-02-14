/**
 * SLIDERBED CONVEYOR v1 - INCLINE THRESHOLD TESTS
 *
 * Tests incline warning/error boundaries from applyApplicationRules:
 * - 0°–20°: no incline warning (strict >20)
 * - >20°–35°: "cleats typically required" warning
 * - >35°–45°: "positive engagement required" warning
 * - >45°: blocking error
 *
 * Boundary behavior (from model): all comparisons use strict >
 * - 20° → NO warning (> 20 is false)
 * - 35° → in band 1 (> 20 && <= 35 is true)
 * - 45° → in band 2 (> 35 && <= 45 is true)
 *
 * Phase 1, Fix A3: Incline threshold consistency
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
  belt_tracking_method: BeltTrackingMethod.Crowned,
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
  ...APPLICATION_DEFAULTS,
};

function getInclineIssues(inclineDeg: number) {
  const inputs = { ...baseInputs, conveyor_incline_deg: inclineDeg };
  const { errors, warnings } = applyApplicationRules(inputs);
  const inclineErrors = errors.filter(e => e.field === 'conveyor_incline_deg');
  const inclineWarnings = warnings.filter(w => w.field === 'conveyor_incline_deg');
  return { inclineErrors, inclineWarnings };
}

describe('Incline Threshold Rules', () => {
  describe('No warning band (0° to 20° inclusive)', () => {
    it('should produce no incline warnings at 0°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(0);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(0);
    });

    it('should produce no incline warnings at 14°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(14);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(0);
    });

    it('should produce no incline warnings at 15° (was incorrectly triggering before fix)', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(15);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(0);
    });

    it('should produce no incline warnings at 19°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(19);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(0);
    });

    it('BOUNDARY: 20° produces no incline warning (strict > 20)', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(20);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(0);
    });
  });

  describe('Band 1: cleats warning (>20° to 35° inclusive)', () => {
    it('should produce "cleats" warning at 21°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(21);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(1);
      expect(inclineWarnings[0].message).toContain('20°');
      expect(inclineWarnings[0].message).toContain('Cleats or other retention');
    });

    it('should produce "cleats" warning at 25°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(25);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(1);
      expect(inclineWarnings[0].message).toContain('20°');
    });

    it('BOUNDARY: 35° is in band 1 (> 20 && <= 35 is true)', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(35);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(1);
      expect(inclineWarnings[0].message).toContain('20°');
      expect(inclineWarnings[0].message).toContain('Cleats or other retention');
    });
  });

  describe('Band 2: positive engagement warning (>35° to 45° inclusive)', () => {
    it('should produce "positive engagement" warning at 36°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(36);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(1);
      expect(inclineWarnings[0].message).toContain('35°');
      expect(inclineWarnings[0].message).toContain('positive engagement');
    });

    it('should produce "positive engagement" warning at 40°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(40);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(1);
      expect(inclineWarnings[0].message).toContain('35°');
    });

    it('BOUNDARY: 45° is in band 2 (> 35 && <= 45 is true)', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(45);
      expect(inclineErrors).toHaveLength(0);
      expect(inclineWarnings).toHaveLength(1);
      expect(inclineWarnings[0].message).toContain('35°');
      expect(inclineWarnings[0].message).toContain('positive engagement');
    });
  });

  describe('Band 3: blocking error (>45°)', () => {
    it('should produce blocking error at 46°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(46);
      expect(inclineErrors).toHaveLength(1);
      expect(inclineErrors[0].message).toContain('45°');
      expect(inclineErrors[0].severity).toBe('error');
    });

    it('should produce blocking error at 90°', () => {
      const { inclineErrors, inclineWarnings } = getInclineIssues(90);
      expect(inclineErrors).toHaveLength(1);
      expect(inclineErrors[0].message).toContain('45°');
    });
  });
});
