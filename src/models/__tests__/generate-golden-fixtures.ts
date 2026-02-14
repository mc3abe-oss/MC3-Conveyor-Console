/**
 * GOLDEN FIXTURE GENERATOR
 *
 * Runs representative input sets through BOTH rule paths (sliderbed_v1 and belt_conveyor_v1)
 * and serializes the complete errors[] and warnings[] output to JSON files.
 *
 * Usage: npx ts-node -O '{"module":"commonjs"}' src/models/__tests__/generate-golden-fixtures.ts
 */

import * as fs from 'fs';
import * as path from 'path';

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
} from '../sliderbed_v1/schema';

import {
  validate as sliderbedValidate,
  applyApplicationRules as sliderbedAppRules,
  validateInputs as sliderbedValidateInputs,
} from '../sliderbed_v1/rules';

import {
  validate as beltValidate,
  applyApplicationRules as beltAppRules,
  validateInputs as beltValidateInputs,
} from '../belt_conveyor_v1/rules';

import { DEFAULT_PARAMETERS } from '../belt_conveyor_v1';

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
  belt_catalog_key: 'TEST_BELT',
  belt_piw: 0.109,
  belt_pil: 0.109,
  ...APPLICATION_DEFAULTS,
};

interface FixtureDef {
  name: string;
  description: string;
  inputs: SliderbedInputs;
}

const fixtures: FixtureDef[] = [
  {
    name: '01-clean-config',
    description: 'Clean config with zero warnings/errors (except belt-required which is satisfied)',
    inputs: { ...baseInputs },
  },
  {
    name: '02-heavy-sideload-vguided',
    description: 'Heavy side load + V-guided (Phase 1 fix — warning only, no error)',
    inputs: {
      ...baseInputs,
      side_loading_direction: SideLoadingDirection.Left,
      side_loading_severity: SideLoadingSeverity.Heavy,
      belt_tracking_method: BeltTrackingMethod.VGuided,
      v_guide_profile: 'K13',
    },
  },
  {
    name: '03-heavy-sideload-crowned',
    description: 'Heavy side load + Crowned (should be blocking error)',
    inputs: {
      ...baseInputs,
      side_loading_direction: SideLoadingDirection.Left,
      side_loading_severity: SideLoadingSeverity.Heavy,
      belt_tracking_method: BeltTrackingMethod.Crowned,
    },
  },
  {
    name: '04-incline-25-cleats-warning',
    description: 'Incline at 25° — cleats warning',
    inputs: { ...baseInputs, conveyor_incline_deg: 25 },
  },
  {
    name: '05-incline-40-engagement-warning',
    description: 'Incline at 40° — positive engagement warning',
    inputs: { ...baseInputs, conveyor_incline_deg: 40 },
  },
  {
    name: '06-incline-50-blocking-error',
    description: 'Incline at 50° — blocking error',
    inputs: { ...baseInputs, conveyor_incline_deg: 50 },
  },
  {
    name: '07-multiple-warnings',
    description: 'Config triggering multiple warnings: incline 25° + moderate side load + high drop',
    inputs: {
      ...baseInputs,
      conveyor_incline_deg: 25,
      side_loading_direction: SideLoadingDirection.Both,
      side_loading_severity: SideLoadingSeverity.Moderate,
      drop_height_in: 30,
    },
  },
  {
    name: '08-red-hot-parts',
    description: 'Red hot parts — blocking error',
    inputs: {
      ...baseInputs,
      part_temperature_class: PartTemperatureClass.RedHot,
    },
  },
  {
    name: '09-belt-pulley-min-error',
    description: 'Belt-specific: pulley too small for belt minimum (ERROR in belt, WARNING in sliderbed)',
    inputs: {
      ...baseInputs,
      pulley_diameter_in: 2,
      drive_pulley_diameter_in: 2,
      tail_pulley_diameter_in: 2,
      belt_min_pulley_dia_no_vguide_in: 3,
    },
  },
  {
    name: '10-finger-safe-no-guards',
    description: 'Finger safe without end guards or bottom covers — belt-specific warnings',
    inputs: {
      ...baseInputs,
      finger_safe: true,
      end_guards: EndGuards.None,
      bottom_covers: false,
    },
  },
];

interface GoldenFixture {
  name: string;
  description: string;
  inputs: Record<string, unknown>;
  sliderbed_v1: {
    validateInputs: { errors: unknown[] };
    applyApplicationRules: { errors: unknown[]; warnings: unknown[] };
    validate: { errors: unknown[]; warnings: unknown[] };
  };
  belt_conveyor_v1: {
    validateInputs: { errors: unknown[] };
    applyApplicationRules: { errors: unknown[]; warnings: unknown[] };
    validate: { errors: unknown[]; warnings: unknown[] };
  };
}

const outputDir = path.join(__dirname, '__goldens__');
fs.mkdirSync(outputDir, { recursive: true });

for (const fixture of fixtures) {
  const params = DEFAULT_PARAMETERS;

  const golden: GoldenFixture = {
    name: fixture.name,
    description: fixture.description,
    inputs: fixture.inputs as unknown as Record<string, unknown>,
    sliderbed_v1: {
      validateInputs: { errors: sliderbedValidateInputs(fixture.inputs) },
      applyApplicationRules: sliderbedAppRules(fixture.inputs),
      validate: sliderbedValidate(fixture.inputs, params),
    },
    belt_conveyor_v1: {
      validateInputs: { errors: beltValidateInputs(fixture.inputs as any) },
      applyApplicationRules: beltAppRules(fixture.inputs as any),
      validate: beltValidate(fixture.inputs as any, params as any),
    },
  };

  const filepath = path.join(outputDir, `rules-baseline-${fixture.name}.json`);
  fs.writeFileSync(filepath, JSON.stringify(golden, null, 2) + '\n');
  console.log(`Written: ${filepath}`);
  console.log(`  sliderbed: ${golden.sliderbed_v1.validate.errors.length} errors, ${golden.sliderbed_v1.validate.warnings.length} warnings`);
  console.log(`  belt:      ${golden.belt_conveyor_v1.validate.errors.length} errors, ${golden.belt_conveyor_v1.validate.warnings.length} warnings`);
}

console.log('\nDone. Golden fixtures written to', outputDir);
