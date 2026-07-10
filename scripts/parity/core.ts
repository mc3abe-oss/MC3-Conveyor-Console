/**
 * Parity harness — core data & helpers.
 *
 * Belt golden corpus generator support: clean-success baselines, the legacy->canonical
 * name map (decision brief §2), and the stable rule-ID catalog (§5 — the engine has no
 * stable rule IDs, so the parity layer assigns them without touching engine code).
 *
 * NOTHING here is imported by app/engine code; this is generation-only tooling.
 */
import {
  buildDefaultInputs,
  SliderbedInputs,
} from '../../src/models/sliderbed_v1/schema';

export const GENERATOR_VERSION = '1';
export const CORPUS_VERSION = 'belt-v1';
export const PRODUCT_KEY = 'belt_conveyor_v1';
export const CANONICAL_PRODUCT = 'belt_conveyor';

// ============================================================================
// CLEAN-SUCCESS BASELINES
// buildDefaultInputs() omits material_form and belt selection; a valid config
// needs material_form + belt coefficients (or a catalog key). These two seeds
// produce success:true (only a benign snub-roller frame-height warning).
// ============================================================================

export function partsBaseline(): SliderbedInputs {
  return {
    ...buildDefaultInputs(),
    material_form: 'PARTS',
    belt_coeff_piw: 0.109,
    belt_coeff_pil: 0.109,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    part_spacing_in: 0,
    drop_height_in: 0,
  };
}

export function bulkBaseline(): SliderbedInputs {
  return {
    ...buildDefaultInputs(),
    material_form: 'BULK',
    belt_coeff_piw: 0.109,
    belt_coeff_pil: 0.109,
    bulk_input_method: 'WEIGHT_FLOW',
    mass_flow_lbs_per_hr: 5000,
    density_lbs_per_ft3: 50,
    density_source: 'KNOWN',
    belt_width_in: 24,
    belt_speed_fpm: 100,
    max_fill_height_in: 3,
    pile_shape: 'FLAT',
  };
}

// ============================================================================
// NAME MAP (decision brief §2) — the frozen contract speaks v2 language.
// No output/input KEY contains legacy "sliderbed" naming (physics keys are
// already canonical), so the map covers the product identifier and the
// bed_type VALUE only. Emitted verbatim to parity/name-map.json.
// ============================================================================

export const NAME_MAP = {
  note:
    'Legacy->canonical map per decision brief §2. Belt conveyor is the product; ' +
    'bed type (slider|roller) is a configuration. No physics output/input key ' +
    'carries legacy naming, so only the product identifier and the bed_type value ' +
    'are normalized. The frozen corpus speaks v2 language; ClearCode never builds ' +
    'against "sliderbed".',
  product_identifier: {
    comment: 'Legacy model/product identifiers -> canonical v2 product.',
    map: {
      sliderbed_conveyor_v1: CANONICAL_PRODUCT,
      sliderbed_v1: CANONICAL_PRODUCT,
      belt_conveyor_v1: CANONICAL_PRODUCT,
    },
  },
  field_values: {
    bed_type: {
      comment:
        'bed_type is a configuration attribute; values shortened per §2 (slider|roller). ' +
        '"other" has no _bed suffix and is unchanged.',
      map: { slider_bed: 'slider', roller_bed: 'roller', other: 'other' },
    },
  },
  output_keys: {
    comment:
      'All physics output keys carry over UNCHANGED — none contain legacy naming. ' +
      'The belt-only additions bed_type_used and premium_flags are canonical.',
    renamed: {},
  },
} as const;

const BED_TYPE_VALUE_MAP: Record<string, string> = NAME_MAP.field_values.bed_type.map;

/** Normalize a bed_type value (input `bed_type` or output `bed_type_used`). */
export function canonicalBedType(value: unknown): unknown {
  if (typeof value === 'string' && value in BED_TYPE_VALUE_MAP) {
    return BED_TYPE_VALUE_MAP[value];
  }
  return value;
}

// ============================================================================
// STABLE RULE-ID CATALOG (§5)
// A firing is (field, severity, message). Messages interpolate values, so each
// catalog entry matches on field + severity + a message pattern. classifyRule()
// returns the stable id; an unmatched firing is a completeness gap -> STOP.
// Emitted (id/field/severity/description) to parity/rule-ids.json.
// ============================================================================

export interface RuleSpec {
  id: string;
  field?: string; // omit to match any field (message-driven)
  severity: 'error' | 'warning' | 'info';
  test: RegExp; // matched against the concrete message
  description: string;
}

export const RULE_CATALOG: RuleSpec[] = [
  // --- material form / parts ---
  { id: 'MATERIAL_FORM_MISSING', field: 'material_form', severity: 'error', test: /Material form not selected/, description: 'material_form not chosen (PARTS/BULK)' },
  { id: 'PART_WEIGHT_REQUIRED', field: 'part_weight_lbs', severity: 'error', test: /Part weight is required/, description: 'PARTS: part weight missing/zero' },
  { id: 'PART_LENGTH_REQUIRED', field: 'part_length_in', severity: 'error', test: /Part length is required/, description: 'PARTS: part length missing/zero' },
  { id: 'PART_WIDTH_REQUIRED', field: 'part_width_in', severity: 'error', test: /Part width is required/, description: 'PARTS: part width missing/zero' },
  { id: 'PART_SPACING_NEGATIVE', field: 'part_spacing_in', severity: 'error', test: /Part Spacing must be/, description: 'PARTS: part spacing negative' },
  { id: 'DROP_HEIGHT_NEGATIVE', field: 'drop_height_in', severity: 'error', test: /Drop height cannot be negative/, description: 'drop height negative' },
  // --- geometry ---
  { id: 'LENGTH_POSITIVE', field: 'conveyor_length_cc_in', severity: 'error', test: /Conveyor Length .* greater than 0/, description: 'length must be > 0' },
  { id: 'WIDTH_POSITIVE', field: 'belt_width_in', severity: 'error', test: /Belt Width must be greater than 0/, description: 'belt width must be > 0' },
  { id: 'INCLINE_NONNEGATIVE', field: 'conveyor_incline_deg', severity: 'error', test: /Incline Angle must be/, description: 'incline must be >= 0' },
  { id: 'HRUN_POSITIVE', field: 'horizontal_run_in', severity: 'error', test: /Horizontal run/, description: 'horizontal run must be > 0 for geometry mode' },
  { id: 'PULLEY_POSITIVE', field: 'pulley_diameter_in', severity: 'error', test: /Pulley Diameter must be greater than 0/, description: 'legacy pulley diameter > 0' },
  { id: 'DRIVE_PULLEY_POSITIVE', field: 'drive_pulley_diameter_in', severity: 'error', test: /Drive pulley diameter must be greater than 0(?! for speed)/, description: 'drive pulley > 0' },
  { id: 'DRIVE_PULLEY_MIN_2_5', field: 'drive_pulley_diameter_in', severity: 'error', test: /Drive pulley diameter must be >= 2\.5/, description: 'drive pulley >= 2.5"' },
  { id: 'TAIL_PULLEY_POSITIVE', field: 'tail_pulley_diameter_in', severity: 'error', test: /Tail pulley diameter must be greater than 0/, description: 'tail pulley > 0' },
  { id: 'TAIL_PULLEY_MIN_2_5', field: 'tail_pulley_diameter_in', severity: 'error', test: /Tail pulley diameter must be >= 2\.5/, description: 'tail pulley >= 2.5"' },
  { id: 'DRIVE_PULLEY_SPEED_POSITIVE', field: 'drive_pulley_diameter_in', severity: 'error', test: /greater than 0 for speed calculations/, description: 'drive pulley > 0 for speed calc' },
  // --- speed / sprocket ---
  { id: 'BELT_SPEED_POSITIVE', field: 'belt_speed_fpm', severity: 'error', test: /Belt Speed .* greater than 0/, description: 'belt speed > 0' },
  { id: 'DRIVE_RPM_POSITIVE', field: 'drive_rpm_input', severity: 'error', test: /Drive RPM must be greater than 0/, description: 'drive rpm > 0' },
  // --- bulk inputs ---
  { id: 'BULK_METHOD_REQUIRED', field: 'bulk_input_method', severity: 'error', test: /Bulk input method must be selected/, description: 'BULK: input method required' },
  { id: 'MASS_FLOW_POSITIVE', field: 'mass_flow_lbs_per_hr', severity: 'error', test: /Mass flow rate must be greater than 0/, description: 'BULK weight-flow: mass flow > 0' },
  { id: 'VOLUME_FLOW_POSITIVE', field: 'volume_flow_ft3_per_hr', severity: 'error', test: /Volume flow rate must be greater than 0/, description: 'BULK volume-flow: volume flow > 0' },
  { id: 'DENSITY_POSITIVE', field: 'density_lbs_per_ft3', severity: 'error', test: /Material density must be greater than 0/, description: 'BULK volume-flow: density > 0' },
  { id: 'DENSITY_SOURCE_REQUIRED', field: 'density_source', severity: 'error', test: /Density source must be specified/, description: 'BULK volume-flow: density source required' },
  // --- power-user params ---
  { id: 'SAFETY_FACTOR_MIN', field: 'safety_factor', severity: 'error', test: /Safety factor must be >= 1\.0/, description: 'safety factor >= 1.0' },
  { id: 'SAFETY_FACTOR_MAX', field: 'safety_factor', severity: 'error', test: /Safety factor must be <= 5\.0/, description: 'safety factor <= 5.0' },
  { id: 'PIW_POSITIVE', field: 'belt_coeff_piw', severity: 'error', test: /PIW must be > 0/, description: 'PIW > 0' },
  { id: 'PIW_RANGE', field: 'belt_coeff_piw', severity: 'error', test: /PIW should be between/, description: 'PIW 0.05-0.30' },
  { id: 'PIL_POSITIVE', field: 'belt_coeff_pil', severity: 'error', test: /PIL must be > 0/, description: 'PIL > 0' },
  { id: 'PIL_RANGE', field: 'belt_coeff_pil', severity: 'error', test: /PIL should be between/, description: 'PIL 0.05-0.30' },
  { id: 'STARTING_PULL_MIN', field: 'starting_belt_pull_lb', severity: 'error', test: /Starting belt pull must be >= 0/, description: 'starting pull >= 0' },
  { id: 'STARTING_PULL_MAX', field: 'starting_belt_pull_lb', severity: 'error', test: /Starting belt pull must be <= 2000/, description: 'starting pull <= 2000' },
  { id: 'FRICTION_MIN', field: 'friction_coeff', severity: 'error', test: /Friction coefficient must be >= 0\.05/, description: 'friction >= 0.05' },
  { id: 'FRICTION_MAX', field: 'friction_coeff', severity: 'error', test: /Friction coefficient must be <= 0\.6/, description: 'friction <= 0.6' },
  { id: 'MOTOR_RPM_MIN', field: 'motor_rpm', severity: 'error', test: /Motor RPM must be >= 800/, description: 'motor rpm >= 800' },
  { id: 'MOTOR_RPM_MAX', field: 'motor_rpm', severity: 'error', test: /Motor RPM must be <= 3600/, description: 'motor rpm <= 3600' },
  // --- belt / tracking / shaft ---
  { id: 'BELT_SELECTION_REQUIRED', field: 'belt_catalog_key', severity: 'error', test: /Belt selection is required/, description: 'belt catalog key or coefficients required' },
  { id: 'VGUIDE_PROFILE_REQUIRED', field: 'v_guide_key', severity: 'error', test: /V-guide profile is required/, description: 'V-guided tracking needs a profile' },
  { id: 'THROUGHPUT_REQUIRED_NONNEG', field: 'required_throughput_pph', severity: 'error', test: /Required throughput must be/, description: 'required throughput >= 0' },
  { id: 'THROUGHPUT_MARGIN_NONNEG', field: 'throughput_margin_pct', severity: 'error', test: /Throughput margin must be/, description: 'throughput margin >= 0' },
  // --- application errors ---
  { id: 'PART_RED_HOT', field: 'part_temperature_class', severity: 'error', test: /red hot parts/, description: 'red hot parts not supported' },
  { id: 'INCLINE_OVER_45_BLOCK', field: 'conveyor_incline_deg', severity: 'error', test: /Incline exceeds 45/, description: 'incline > 45 without positive engagement' },
  { id: 'HEAVY_SIDELOAD_VGUIDE_REQUIRED', field: 'belt_tracking_method', severity: 'error', test: /Heavy side loading requires V-guided/, description: 'heavy side load needs V-guide' },
  { id: 'LOWPROFILE_CLEATS_INCOMPATIBLE', field: 'frame_height_mode', severity: 'error', test: /Low Profile not compatible with cleats/, description: 'low-profile frame incompatible with cleats' },
  { id: 'SURGE_MULT_MIN', field: 'surge_multiplier', severity: 'error', test: /Surge multiplier must be >= 1\.0/, description: 'surge multiplier >= 1.0' },
  // --- application warnings/info ---
  { id: 'INCLINE_35_WARN', field: 'conveyor_incline_deg', severity: 'warning', test: /Incline exceeds 35/, description: 'incline 35-45 retention warning' },
  { id: 'INCLINE_20_WARN', field: 'conveyor_incline_deg', severity: 'warning', test: /Incline exceeds 20/, description: 'incline 20-35 retention warning' },
  { id: 'DROP_HEIGHT_HIGH_WARN', field: 'drop_height_in', severity: 'warning', test: /Drop height is high/, description: 'high drop height' },
  { id: 'LENGTH_MULTISECTION_WARN', field: 'conveyor_length_cc_in', severity: 'warning', test: /multi-section body/, description: 'long conveyor multi-section' },
  { id: 'DENSITY_ASSUMED_WARN', field: 'density_lbs_per_ft3', severity: 'warning', test: /Density assumed from material class/, description: 'assumed-class density' },
  { id: 'DENSITY_MISSING_WARN', field: 'density_lbs_per_ft3', severity: 'warning', test: /Bulk density not provided/, description: 'weight-flow without density' },
  { id: 'SIDELOAD_HEAVY_WARN', field: 'side_loading_severity', severity: 'warning', test: /Heavy side loading typically requires/, description: 'heavy side loading warning' },
  { id: 'SIDELOAD_MODERATE_WARN', field: 'side_loading_severity', severity: 'warning', test: /Moderate side loading/, description: 'moderate side loading warning' },
  { id: 'BELT_SPEED_HIGH_WARN', field: 'belt_speed_fpm', severity: 'warning', test: /exceeds 300 FPM/, description: 'belt speed > 300 FPM' },
  { id: 'GEAR_RATIO_LOW_WARN', field: 'belt_speed_fpm', severity: 'warning', test: /gear ratio .* is below 5/, description: 'implied gear ratio < 5' },
  { id: 'GEAR_RATIO_HIGH_WARN', field: 'belt_speed_fpm', severity: 'warning', test: /gear ratio .* exceeds 60/, description: 'implied gear ratio > 60' },
  { id: 'PULLEY_BELOW_MIN_DRIVE_WARN', field: 'drive_pulley_diameter_in', severity: 'warning', test: /below (the )?belt minimum/, description: 'drive pulley below belt minimum' },
  { id: 'PULLEY_BELOW_MIN_TAIL_WARN', field: 'tail_pulley_diameter_in', severity: 'warning', test: /below (the )?belt minimum/, description: 'tail pulley below belt minimum' },
  { id: 'CLEAT_SPACING_PART_WARN', field: 'cleat_spacing_in', severity: 'warning', test: /less than part travel dimension/, description: 'cleat spacing < part travel' },
  { id: 'CLEAT_OFFSET_WARN', field: 'cleat_edge_offset_in', severity: 'warning', test: /exceeds half of belt width/, description: 'cleat edge offset too large' },
  { id: 'FINGER_SAFE_END_GUARDS_WARN', field: 'end_guards', severity: 'warning', test: /Finger safety may require end guards/, description: 'finger-safe end guards' },
  { id: 'FINGER_SAFE_BOTTOM_COVERS_WARN', field: 'bottom_covers', severity: 'warning', test: /Bottom covers may be required/, description: 'finger-safe bottom covers' },
  { id: 'CLIPPER_LACING_END_GUARDS_WARN', field: 'lacing_style', severity: 'warning', test: /Clipper lacing may interfere with end guards/, description: 'clipper lacing vs end guards' },
  { id: 'START_STOP_GEARBOX_WARN', field: 'cycle_time_seconds', severity: 'warning', test: /higher-duty gearbox/, description: 'frequent start/stop duty' },
  { id: 'FRAME_SNUB_REQUIRED_INFO', field: 'frame_height_mode', severity: 'info', test: /Snub rollers will be required/, description: 'frame height below snub threshold (info)' },
  { id: 'FRAME_DESIGN_REVIEW_WARN', field: 'frame_height_mode', severity: 'warning', test: /Design review required/, description: 'frame height below design-review threshold' },
  { id: 'PREMIUM_FEATURE_INFO', field: 'premium', severity: 'info', test: /Premium feature:/, description: 'premium feature (belt path)' },
  // --- cleat input requirements (when cleats enabled) ---
  { id: 'CLEAT_HEIGHT_REQUIRED', field: 'cleat_height_in', severity: 'error', test: /Cleat height is required when cleats are enabled/, description: 'cleats enabled: cleat height required' },
  { id: 'CLEAT_SPACING_REQUIRED', field: 'cleat_spacing_in', severity: 'error', test: /Cleat spacing is required when cleats are enabled/, description: 'cleats enabled: cleat spacing required' },
  { id: 'CLEAT_EDGE_OFFSET_REQUIRED', field: 'cleat_edge_offset_in', severity: 'error', test: /Cleat edge offset is required when cleats are enabled/, description: 'cleats enabled: cleat edge offset required' },
  // --- part thermal / frame / return-support info & warnings ---
  { id: 'PART_HOT_BELT_WARN', field: 'part_temperature_class', severity: 'warning', test: /Consider high-temperature belt/, description: 'hot parts: consider high-temp belt' },
  { id: 'FRAME_CLEAT_HEIGHT_INFO', field: 'frame_height_mode', severity: 'info', test: /Frame height includes 2 .* cleat height/, description: 'frame height includes 2x cleat height (info)' },
  { id: 'FRAME_LOW_PROFILE_COST_INFO', field: 'frame_height_mode', severity: 'info', test: /Low profile frame selected\. This is a cost option/, description: 'low-profile frame cost option (info)' },
  { id: 'FRAME_CUSTOM_COST_INFO', field: 'frame_height_mode', severity: 'info', test: /Custom frame height selected\. This is a cost option/, description: 'custom frame height cost option (info)' },
  { id: 'GRAVITY_ROLLER_SPACING_HIGH_WARN', field: 'return_gravity_roller_count', severity: 'warning', test: /Gravity roller spacing .* exceeds 72/, description: 'gravity roller spacing > 72" (sag)' },
  { id: 'GRAVITY_ROLLER_SPACING_LOW_INFO', field: 'return_gravity_roller_count', severity: 'info', test: /Gravity roller spacing .* less than 24/, description: 'gravity roller spacing < 24" (over-engineered)' },
  // --- bulk capacity (post-calculate) ---
  { id: 'BULK_BELT_TOO_NARROW', field: 'belt_width_in', severity: 'error', test: /too narrow for bulk loading/, description: 'CEMA usable width not positive' },
  { id: 'BULK_CLEAT_GEOMETRY_REQUIRED', field: 'cleat_height_in', severity: 'error', test: /Cleated bulk conveyor requires cleat height/, description: 'cleated bulk missing pocket geometry' },
  { id: 'BULK_FILL_HEIGHT_MISSING', field: 'max_fill_height_in', severity: 'warning', test: /Enter a max fill height/, description: 'non-cleated bulk missing fill height' },
  { id: 'BULK_OVERFILL', severity: 'error', test: /exceeds capacity .*% fill/, description: 'bulk required load > capacity (>100% fill)' },
  { id: 'BULK_NEAR_CAPACITY', severity: 'warning', test: /Bulk fill is at .*% of capacity/, description: 'bulk fill 90-100% (little headroom)' },
];

/**
 * Return the stable rule id for a firing, or null if unmatched (completeness gap).
 */
export function classifyRule(field: string, severity: string, message: string): string | null {
  for (const spec of RULE_CATALOG) {
    if (spec.severity !== severity) continue;
    if (spec.field !== undefined && spec.field !== field) continue;
    if (spec.test.test(message)) return spec.id;
  }
  return null;
}
