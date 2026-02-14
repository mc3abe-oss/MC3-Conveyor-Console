/**
 * DEDUP VERIFICATION TESTS — Phase 2.1
 *
 * Verifies the specific dedup properties:
 * 1. Product name templating works (belt vs sliderbed wording)
 * 2. Premium flags only fire for belt_conveyor_v1 productKey
 * 3. Single source of truth — no belt_conveyor_v1/rules.ts exists
 * 4. Engine, product module, and convenience function all route to sliderbed rules
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  validate,
  applyApplicationRules,
} from '../sliderbed_v1/rules';

import { DEFAULT_PARAMETERS } from '../belt_conveyor_v1';

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
} from '../sliderbed_v1/schema';

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
  belt_catalog_key: 'TEST_BELT',
  belt_piw: 0.109,
  belt_pil: 0.109,
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

// ============================================================================
// 1. Product name templating
// ============================================================================

describe('Product name templating', () => {
  const redHotInputs = {
    ...baseInputs,
    part_temperature_class: PartTemperatureClass.RedHot,
  };

  it('sliderbed path says "sliderbed conveyor" for red hot parts', () => {
    const result = applyApplicationRules(redHotInputs);
    const redHotError = result.errors.find((e: any) => e.field === 'part_temperature_class');
    expect(redHotError).toBeDefined();
    expect((redHotError as any).message).toContain('sliderbed conveyor');
    expect((redHotError as any).message).not.toContain('belt conveyor');
  });

  it('belt path says "belt conveyor" for red hot parts', () => {
    const result = applyApplicationRules(redHotInputs, 'belt_conveyor_v1');
    const redHotError = result.errors.find((e: any) => e.field === 'part_temperature_class');
    expect(redHotError).toBeDefined();
    expect((redHotError as any).message).toContain('belt conveyor');
    expect((redHotError as any).message).not.toContain('sliderbed conveyor');
  });

  const steepInputs = {
    ...baseInputs,
    conveyor_incline_deg: 50,
  };

  it('sliderbed path says "Sliderbed conveyor" for incline >45°', () => {
    const result = applyApplicationRules(steepInputs);
    const inclineError = result.errors.find(
      (e: any) => e.field === 'conveyor_incline_deg' && e.severity === 'error'
    );
    expect(inclineError).toBeDefined();
    expect((inclineError as any).message).toContain('Sliderbed conveyor');
  });

  it('belt path says "Belt conveyor" for incline >45°', () => {
    const result = applyApplicationRules(steepInputs, 'belt_conveyor_v1');
    const inclineError = result.errors.find(
      (e: any) => e.field === 'conveyor_incline_deg' && e.severity === 'error'
    );
    expect(inclineError).toBeDefined();
    expect((inclineError as any).message).toContain('Belt conveyor');
  });
});

// ============================================================================
// 2. Premium flags — belt-only
// ============================================================================

describe('Premium flags — belt-only gate', () => {
  it('no productKey: no premium warnings', () => {
    const result = applyApplicationRules(baseInputs);
    const premiumWarnings = result.warnings.filter((w: any) => w.field === 'premium');
    expect(premiumWarnings.length).toBe(0);
  });

  it('productKey=belt_conveyor_v1: premium warnings emitted when applicable', () => {
    // V-guided tracking triggers a premium flag
    const vGuidedInputs = {
      ...baseInputs,
      belt_tracking_method: BeltTrackingMethod.VGuided,
      v_guide_profile: 'K13',
    };
    const result = applyApplicationRules(vGuidedInputs, 'belt_conveyor_v1');
    const premiumWarnings = result.warnings.filter((w: any) => w.field === 'premium');
    expect(premiumWarnings.length).toBeGreaterThan(0);
    expect(premiumWarnings[0].severity).toBe('info');
  });

  it('productKey=sliderbed_v1: no premium warnings (not belt product)', () => {
    const vGuidedInputs = {
      ...baseInputs,
      belt_tracking_method: BeltTrackingMethod.VGuided,
      v_guide_profile: 'K13',
    };
    const result = applyApplicationRules(vGuidedInputs, 'sliderbed_v1');
    const premiumWarnings = result.warnings.filter((w: any) => w.field === 'premium');
    expect(premiumWarnings.length).toBe(0);
  });
});

// ============================================================================
// 3. Single source of truth — dead file deleted
// ============================================================================

describe('Single source of truth', () => {
  it('belt_conveyor_v1/rules.ts no longer exists', () => {
    const deadFile = path.join(__dirname, '..', 'belt_conveyor_v1', 'rules.ts');
    expect(fs.existsSync(deadFile)).toBe(false);
  });

  it('belt_conveyor_v1 model index re-exports validate from sliderbed rules', () => {
    // The model barrel file re-exports validate from sliderbed rules
    const { validate: beltValidate } = require('../belt_conveyor_v1/index');
    const { validate: sliderbedValidate } = require('../sliderbed_v1/rules');
    expect(beltValidate).toBe(sliderbedValidate);
  });
});

// ============================================================================
// 4. Equivalence: no-productKey vs explicit sliderbed_v1
// ============================================================================

describe('Default path equivalence', () => {
  it('validate() with no productKey matches validate() with sliderbed_v1', () => {
    const noKey = validate(baseInputs, DEFAULT_PARAMETERS as any);
    const withKey = validate(baseInputs, DEFAULT_PARAMETERS as any, 'sliderbed_v1');
    expect(noKey.errors).toEqual(withKey.errors);
    expect(noKey.warnings).toEqual(withKey.warnings);
  });
});
