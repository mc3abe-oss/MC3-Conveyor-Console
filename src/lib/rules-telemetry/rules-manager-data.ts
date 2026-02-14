/**
 * RULES MANAGER DATA — Phase 4.1
 *
 * Enriches the 158 rule definitions from rule-definitions.ts with
 * section mappings, plain English condition/action/threshold, and
 * engineering review TODO flags for the Rules Manager admin page.
 *
 * This file does NOT modify rule-definitions.ts. It imports the
 * existing definitions and attaches enrichment data via a lookup
 * table keyed by rule_id.
 *
 * Data shape matches the Rules Manager mockup (Reference/rules-manager-mockup.jsx).
 */

import {
  RULE_DEFINITIONS,
  CATEGORY_LABELS,
  type RuleCategory,
} from './rule-definitions';

// ============================================================================
// Types
// ============================================================================

export type RuleSection = 'Application' | 'Physical' | 'Drive & Controls' | 'Build Options';

export interface ManagerRule {
  /** Stable rule identifier (from rule-definitions.ts) */
  id: string;
  /** Section tab assignment */
  section: RuleSection;
  /** Human-readable category label */
  category: string;
  /** Raw category key */
  categoryKey: RuleCategory;
  /** Human-readable rule name */
  name: string;
  /** Default severity */
  severity: 'error' | 'warning' | 'info';
  /** Plain English IF clause — when does this rule fire? */
  condition: string;
  /** Monospace-friendly threshold value */
  threshold: string;
  /** Plain English THEN clause — what happens when it fires? */
  action: string;
  /** Description / message shown to user when rule fires */
  message: string;
  /** Input fields examined by this rule */
  fields: string[];
  /** Source function in rules.ts */
  sourceFunction: string;
  /** Approximate source line in rules.ts */
  sourceLine: number;
  /** Whether this rule needs engineering review */
  hasTodo: boolean;
  /** Engineering review note (when hasTodo is true) */
  todoNote?: string;
}

// ============================================================================
// Section Mapping: 18 categories → 4 sections
// ============================================================================

const SECTION_MAP: Record<RuleCategory, RuleSection> = {
  // Application — what's on the conveyor, environment, safety
  application: 'Application',
  material: 'Application',
  safety: 'Application',
  height: 'Application',

  // Physical — conveyor structure, geometry, belt
  geometry: 'Physical',
  pulley: 'Physical',
  belt: 'Physical',
  shaft: 'Physical',
  frame: 'Physical',
  pci: 'Physical',

  // Drive & Controls — motor, speed, gearbox
  speed: 'Drive & Controls',
  drive: 'Drive & Controls',
  sprocket: 'Drive & Controls',
  parameter: 'Drive & Controls',

  // Build Options — optional components, support
  cleat: 'Build Options',
  support: 'Build Options',
  return_support: 'Build Options',
  premium: 'Build Options',
};

// ============================================================================
// Enrichment lookup — condition / action / threshold / hasTodo per rule_id
// ============================================================================

interface Enrichment {
  condition: string;
  action: string;
  threshold: string;
  hasTodo?: boolean;
  todoNote?: string;
}

const ENRICHMENTS: Record<string, Enrichment> = {
  // ==========================================================================
  // validateInputs() — Input validation errors
  // ==========================================================================

  // --- Geometry & Layout ---
  vi_conveyor_length_zero: {
    condition: 'Conveyor center-to-center length is zero or not set',
    action: 'Block configuration',
    threshold: 'length ≤ 0',
  },
  vi_belt_width_zero: {
    condition: 'Belt width is zero or not set',
    action: 'Block configuration',
    threshold: 'belt_width ≤ 0',
  },
  vi_incline_negative: {
    condition: 'Incline angle is less than zero',
    action: 'Block configuration',
    threshold: 'incline < 0°',
  },
  vi_horizontal_run_zero: {
    condition: 'Geometry mode is H_ANGLE or H_TOB and horizontal run is zero or not set',
    action: 'Block configuration',
    threshold: 'horizontal_run ≤ 0 in H_ANGLE/H_TOB mode',
  },
  vi_tail_tob_required_htob: {
    condition: 'Geometry mode is H_TOB and Tail TOB is not provided',
    action: 'Block configuration',
    threshold: 'tail_tob undefined in H_TOB mode',
  },
  vi_drive_tob_required_htob: {
    condition: 'Geometry mode is H_TOB and Drive TOB is not provided',
    action: 'Block configuration',
    threshold: 'drive_tob undefined in H_TOB mode',
  },

  // --- Pulley Diameter ---
  vi_pulley_diameter_zero: {
    condition: 'Pulley diameter is zero or not set',
    action: 'Block configuration',
    threshold: 'pulley_diameter ≤ 0',
  },
  vi_drive_pulley_zero: {
    condition: 'Drive pulley diameter is provided but is zero or negative',
    action: 'Block configuration',
    threshold: 'drive_pulley ≤ 0',
  },
  vi_drive_pulley_min: {
    condition: 'Drive pulley diameter is below the minimum allowed',
    action: 'Block configuration',
    threshold: 'drive_pulley < 2.5″',
  },
  vi_tail_pulley_zero: {
    condition: 'Tail pulley diameter is provided but is zero or negative',
    action: 'Block configuration',
    threshold: 'tail_pulley ≤ 0',
  },
  vi_tail_pulley_min: {
    condition: 'Tail pulley diameter is below the minimum allowed',
    action: 'Block configuration',
    threshold: 'tail_pulley < 2.5″',
  },

  // --- Speed Mode ---
  vi_belt_speed_zero: {
    condition: 'Speed mode is Belt Speed and belt speed is zero or not set',
    action: 'Block configuration',
    threshold: 'belt_speed ≤ 0 in Belt Speed mode',
    hasTodo: true,
    todoNote: 'belt_conveyor_v1/rules.ts had a simpler check: just drive_rpm <= 0. Sliderbed evolved to speed_mode branching (belt_speed_fpm vs drive_rpm_input). Belt version was legacy.',
  },
  vi_drive_rpm_zero: {
    condition: 'Speed mode is Drive RPM and drive RPM is zero or not set',
    action: 'Block configuration',
    threshold: 'drive_rpm ≤ 0 in Drive RPM mode',
    hasTodo: true,
    todoNote: 'belt_conveyor_v1/rules.ts had a simpler check: just drive_rpm <= 0. Sliderbed evolved to speed_mode branching. Belt version was legacy.',
  },
  vi_pulley_dia_for_speed: {
    condition: 'Drive pulley diameter is zero or not set (needed for speed calculation)',
    action: 'Block configuration',
    threshold: 'drive_pulley ≤ 0',
  },

  // --- Sprocket (Bottom Mount) ---
  vi_gm_sprocket_teeth_zero: {
    condition: 'Gearmotor is bottom-mounted and sprocket teeth is zero or not set',
    action: 'Block configuration',
    threshold: 'gm_sprocket_teeth ≤ 0 when bottom-mounted',
  },
  vi_gm_sprocket_teeth_integer: {
    condition: 'Gearmotor sprocket teeth is not a whole number',
    action: 'Block configuration',
    threshold: 'gm_sprocket_teeth is not integer',
  },
  vi_drive_shaft_sprocket_zero: {
    condition: 'Gearmotor is bottom-mounted and drive shaft sprocket teeth is zero or not set',
    action: 'Block configuration',
    threshold: 'drive_shaft_sprocket ≤ 0 when bottom-mounted',
  },
  vi_drive_shaft_sprocket_integer: {
    condition: 'Drive shaft sprocket teeth is not a whole number',
    action: 'Block configuration',
    threshold: 'drive_shaft_sprocket is not integer',
  },

  // --- Throughput ---
  vi_throughput_negative: {
    condition: 'Required throughput is provided but is negative',
    action: 'Block configuration',
    threshold: 'throughput < 0',
  },
  vi_throughput_margin_negative: {
    condition: 'Throughput margin is provided but is negative',
    action: 'Block configuration',
    threshold: 'margin < 0%',
  },

  // --- Material Form ---
  vi_material_form_required: {
    condition: 'No material form (PARTS or BULK) is selected',
    action: 'Block configuration',
    threshold: 'material_form is empty',
  },

  // --- Parts Mode ---
  vi_part_weight_required: {
    condition: 'Material form is PARTS but part weight is missing or zero',
    action: 'Block configuration',
    threshold: 'part_weight undefined or ≤ 0 in PARTS mode',
    hasTodo: true,
    todoNote: 'belt_conveyor_v1/rules.ts treated part_weight_lbs as optional (!== undefined && <= 0). Sliderbed requires it in PARTS mode (=== undefined || <= 0). Sliderbed version is the evolved/correct one.',
  },
  vi_part_length_required: {
    condition: 'Material form is PARTS but part length is missing or zero',
    action: 'Block configuration',
    threshold: 'part_length undefined or ≤ 0 in PARTS mode',
    hasTodo: true,
    todoNote: 'belt_conveyor_v1/rules.ts treated part_length_in as optional. Sliderbed requires it in PARTS mode. Sliderbed version is the evolved/correct one.',
  },
  vi_part_width_required: {
    condition: 'Material form is PARTS but part width is missing or zero',
    action: 'Block configuration',
    threshold: 'part_width undefined or ≤ 0 in PARTS mode',
    hasTodo: true,
    todoNote: 'belt_conveyor_v1/rules.ts treated part_width_in as optional. Sliderbed requires it in PARTS mode. Sliderbed version is the evolved/correct one.',
  },

  // --- Bulk Mode ---
  vi_bulk_method_required: {
    condition: 'Material form is BULK but no bulk input method is selected',
    action: 'Block configuration',
    threshold: 'bulk_input_method is empty in BULK mode',
  },
  vi_mass_flow_required: {
    condition: 'Bulk input method is Weight Flow but mass flow rate is missing or zero',
    action: 'Block configuration',
    threshold: 'mass_flow ≤ 0 in Weight Flow mode',
  },
  vi_volume_flow_required: {
    condition: 'Bulk input method is Volume Flow but volume flow rate is missing or zero',
    action: 'Block configuration',
    threshold: 'volume_flow ≤ 0 in Volume Flow mode',
  },
  vi_density_required: {
    condition: 'Bulk input method is Volume Flow but material density is missing or zero',
    action: 'Block configuration',
    threshold: 'density ≤ 0 in Volume Flow mode',
  },
  vi_density_source_required: {
    condition: 'Bulk input method is Volume Flow but density source is not specified',
    action: 'Block configuration',
    threshold: 'density_source is empty in Volume Flow mode',
  },

  // --- Part Spacing ---
  vi_part_spacing_negative: {
    condition: 'Material form is PARTS and part spacing is negative',
    action: 'Block configuration',
    threshold: 'part_spacing < 0',
  },

  // --- Drop Height ---
  vi_drop_height_negative: {
    condition: 'Drop height is a negative value',
    action: 'Block configuration',
    threshold: 'drop_height < 0',
  },

  // --- Power-User Parameters ---
  vi_safety_factor_low: {
    condition: 'Safety factor is provided but is less than 1.0',
    action: 'Block configuration',
    threshold: 'SF < 1.0',
  },
  vi_safety_factor_high: {
    condition: 'Safety factor is provided but exceeds 5.0',
    action: 'Block configuration',
    threshold: 'SF > 5.0',
  },
  vi_piw_zero: {
    condition: 'Belt weight coefficient PIW is provided but is zero or negative',
    action: 'Block configuration',
    threshold: 'PIW ≤ 0',
  },
  vi_piw_range: {
    condition: 'Belt weight coefficient PIW is outside the valid range',
    action: 'Block configuration',
    threshold: 'PIW < 0.05 or PIW > 0.30 lb/in',
  },
  vi_pil_zero: {
    condition: 'Belt weight coefficient PIL is provided but is zero or negative',
    action: 'Block configuration',
    threshold: 'PIL ≤ 0',
  },
  vi_pil_range: {
    condition: 'Belt weight coefficient PIL is outside the valid range',
    action: 'Block configuration',
    threshold: 'PIL < 0.05 or PIL > 0.30 lb/in',
  },
  vi_starting_pull_negative: {
    condition: 'Starting belt pull is provided but is negative',
    action: 'Block configuration',
    threshold: 'starting_pull < 0 lb',
  },
  vi_starting_pull_high: {
    condition: 'Starting belt pull exceeds maximum allowed',
    action: 'Block configuration',
    threshold: 'starting_pull > 2000 lb',
  },
  vi_friction_coeff_low: {
    condition: 'Friction coefficient is provided but is below minimum',
    action: 'Block configuration',
    threshold: 'CoF < 0.05',
  },
  vi_friction_coeff_high: {
    condition: 'Friction coefficient is provided but exceeds maximum',
    action: 'Block configuration',
    threshold: 'CoF > 0.6',
  },
  vi_motor_rpm_low: {
    condition: 'Motor RPM is provided but is below 800',
    action: 'Block configuration',
    threshold: 'RPM < 800',
  },
  vi_motor_rpm_high: {
    condition: 'Motor RPM is provided but exceeds 3600',
    action: 'Block configuration',
    threshold: 'RPM > 3600',
  },

  // --- Belt Tracking & V-Guide ---
  vi_vguide_profile_required: {
    condition: 'Belt tracking is V-guided but no V-guide profile is selected',
    action: 'Block configuration',
    threshold: 'v_guide_key is empty when tracking = V-guided',
  },
  vi_pu_belt_vguide_incompatible: {
    condition: 'V-guided tracking with PU belt but V-guide has no PU pulley data',
    action: 'Block configuration',
    threshold: 'belt_family = PU AND v_guide has no PU data',
  },

  // --- Shaft Diameter ---
  vi_drive_shaft_manual_required: {
    condition: 'Shaft mode is Manual but drive shaft diameter is missing or zero',
    action: 'Block configuration',
    threshold: 'drive_shaft undefined or ≤ 0 in Manual mode',
  },
  vi_tail_shaft_manual_required: {
    condition: 'Shaft mode is Manual but tail shaft diameter is missing or zero',
    action: 'Block configuration',
    threshold: 'tail_shaft undefined or ≤ 0 in Manual mode',
  },

  // --- Belt Override ---
  vi_piw_override_zero: {
    condition: 'Belt PIW override is provided but is zero or negative',
    action: 'Block configuration',
    threshold: 'PIW override ≤ 0',
  },
  vi_piw_override_range: {
    condition: 'Belt PIW override is outside the valid range',
    action: 'Block configuration',
    threshold: 'PIW override < 0.05 or > 0.30 lb/in',
  },
  vi_pil_override_zero: {
    condition: 'Belt PIL override is provided but is zero or negative',
    action: 'Block configuration',
    threshold: 'PIL override ≤ 0',
  },
  vi_pil_override_range: {
    condition: 'Belt PIL override is outside the valid range',
    action: 'Block configuration',
    threshold: 'PIL override < 0.05 or > 0.30 lb/in',
  },

  // --- Belt Selection ---
  vi_belt_selection_required: {
    condition: 'No belt is selected from catalog and no manual coefficients are provided',
    action: 'Block configuration',
    threshold: 'belt_key is empty AND no PIW/PIL overrides',
  },

  // --- Shaft Range ---
  vi_drive_shaft_min: {
    condition: 'Drive shaft diameter is below the minimum allowed',
    action: 'Block configuration',
    threshold: 'drive_shaft < 0.5″',
  },
  vi_drive_shaft_max: {
    condition: 'Drive shaft diameter exceeds the maximum allowed',
    action: 'Block configuration',
    threshold: 'drive_shaft > 4.0″',
  },
  vi_tail_shaft_min: {
    condition: 'Tail shaft diameter is below the minimum allowed',
    action: 'Block configuration',
    threshold: 'tail_shaft < 0.5″',
  },
  vi_tail_shaft_max: {
    condition: 'Tail shaft diameter exceeds the maximum allowed',
    action: 'Block configuration',
    threshold: 'tail_shaft > 4.0″',
  },

  // --- Cleats ---
  vi_cleat_height_required: {
    condition: 'Cleats are enabled but cleat height is missing or zero',
    action: 'Block configuration',
    threshold: 'cleat_height undefined or ≤ 0 when cleats enabled',
  },
  vi_cleat_height_min: {
    condition: 'Cleat height is below the minimum allowed',
    action: 'Block configuration',
    threshold: 'cleat_height < 0.5″',
  },
  vi_cleat_height_max: {
    condition: 'Cleat height exceeds the maximum allowed',
    action: 'Block configuration',
    threshold: 'cleat_height > 6″',
  },
  vi_cleat_spacing_required: {
    condition: 'Cleats are enabled but cleat spacing is missing or zero',
    action: 'Block configuration',
    threshold: 'cleat_spacing undefined or ≤ 0 when cleats enabled',
  },
  vi_cleat_spacing_min: {
    condition: 'Cleat spacing is below the minimum allowed',
    action: 'Block configuration',
    threshold: 'cleat_spacing < 2″',
  },
  vi_cleat_spacing_max: {
    condition: 'Cleat spacing exceeds the maximum allowed',
    action: 'Block configuration',
    threshold: 'cleat_spacing > 48″',
  },
  vi_cleat_edge_offset_required: {
    condition: 'Cleats are enabled but cleat edge offset is missing or negative',
    action: 'Block configuration',
    threshold: 'edge_offset undefined or < 0 when cleats enabled',
  },
  vi_cleat_edge_offset_min: {
    condition: 'Cleat edge offset is negative',
    action: 'Block configuration',
    threshold: 'edge_offset < 0″',
  },
  vi_cleat_edge_offset_max: {
    condition: 'Cleat edge offset exceeds the maximum allowed',
    action: 'Block configuration',
    threshold: 'edge_offset > 12″',
  },

  // --- TOB Values ---
  vi_tail_tob_negative: {
    condition: 'Tail TOB is provided but is negative',
    action: 'Block configuration',
    threshold: 'tail_tob < 0″',
  },
  vi_drive_tob_negative: {
    condition: 'Drive TOB is provided but is negative',
    action: 'Block configuration',
    threshold: 'drive_tob < 0″',
  },
  vi_adjustment_range_negative: {
    condition: 'Adjustment range is provided but is negative',
    action: 'Block configuration',
    threshold: 'adjustment_range < 0″',
  },

  // --- Floor Support ---
  vi_tob_required_floor: {
    condition: 'Conveyor is floor supported but reference TOB is not provided',
    action: 'Block configuration',
    threshold: 'reference_tob undefined when floor supported',
  },
  vi_leg_model_required: {
    condition: 'Legs are included but no leg model is selected',
    action: 'Block configuration',
    threshold: 'leg_model_key is empty when include_legs = true',
  },
  vi_caster_qty_zero: {
    condition: 'Casters are included but total quantity (rigid + swivel) is zero',
    action: 'Block configuration',
    threshold: 'rigid_qty + swivel_qty = 0 when include_casters = true',
  },
  vi_rigid_caster_model_required: {
    condition: 'Rigid caster quantity is greater than zero but no model is selected',
    action: 'Block configuration',
    threshold: 'rigid_qty > 0 AND rigid_model_key is empty',
  },
  vi_swivel_caster_model_required: {
    condition: 'Swivel caster quantity is greater than zero but no model is selected',
    action: 'Block configuration',
    threshold: 'swivel_qty > 0 AND swivel_model_key is empty',
  },
  vi_leg_model_legacy: {
    condition: 'Legacy support method is "legs" but no leg model is selected',
    action: 'Block configuration',
    threshold: 'support_method = legs AND leg_model_key is empty',
  },
  vi_caster_qty_legacy: {
    condition: 'Legacy support method is "casters" but total caster quantity is zero',
    action: 'Block configuration',
    threshold: 'support_method = casters AND total_casters = 0',
  },
  vi_rigid_caster_model_legacy: {
    condition: 'Legacy casters: rigid quantity > 0 but no model selected',
    action: 'Block configuration',
    threshold: 'rigid_qty > 0 AND rigid_model_key is empty (legacy)',
  },
  vi_swivel_caster_model_legacy: {
    condition: 'Legacy casters: swivel quantity > 0 but no model selected',
    action: 'Block configuration',
    threshold: 'swivel_qty > 0 AND swivel_model_key is empty (legacy)',
  },

  // --- Frame Height ---
  vi_custom_frame_height_required: {
    condition: 'Frame height mode is Custom but no custom height is provided',
    action: 'Block configuration',
    threshold: 'custom_frame_height undefined in Custom mode',
  },
  vi_custom_frame_height_min: {
    condition: 'Custom frame height is below the system minimum',
    action: 'Block configuration',
    threshold: 'custom_frame_height < MIN_FRAME_HEIGHT',
  },
  vi_custom_frame_height_zero: {
    condition: 'Custom frame height is provided but is zero or negative',
    action: 'Block configuration',
    threshold: 'custom_frame_height ≤ 0″',
  },

  // --- Frame Construction ---
  vi_sheet_metal_gauge_required: {
    condition: 'Frame construction is Sheet Metal but no gauge is specified',
    action: 'Block configuration',
    threshold: 'gauge is empty when construction = Sheet Metal',
  },
  vi_channel_series_required: {
    condition: 'Frame construction is Structural Channel but no series is specified',
    action: 'Block configuration',
    threshold: 'series is empty when construction = Structural Channel',
  },
  vi_pulley_end_frame_min: {
    condition: 'Pulley end to frame inside distance is negative',
    action: 'Block configuration',
    threshold: 'pulley_end_to_frame < 0″',
  },
  vi_pulley_end_frame_max: {
    condition: 'Pulley end to frame inside distance exceeds maximum',
    action: 'Block configuration',
    threshold: 'pulley_end_to_frame > 6″',
  },

  // ==========================================================================
  // validateParameters() — Parameter validation errors
  // ==========================================================================
  vp_friction_coeff_range: {
    condition: 'Parameter friction coefficient is outside the valid range',
    action: 'Block configuration',
    threshold: 'CoF < 0.1 or CoF > 1.0',
  },
  vp_safety_factor_min: {
    condition: 'Parameter safety factor is below minimum',
    action: 'Block configuration',
    threshold: 'SF < 1.0',
  },
  vp_starting_pull_min: {
    condition: 'Parameter starting belt pull is negative',
    action: 'Block configuration',
    threshold: 'starting_pull < 0 lb',
  },
  vp_motor_rpm_zero: {
    condition: 'Parameter motor RPM is zero or negative',
    action: 'Block configuration',
    threshold: 'motor_rpm ≤ 0',
  },
  vp_gravity_zero: {
    condition: 'Parameter gravity constant is zero or negative',
    action: 'Block configuration',
    threshold: 'gravity ≤ 0',
  },

  // ==========================================================================
  // applyApplicationRules() — Application warnings and errors
  // ==========================================================================

  // --- Temperature & Fluid ---
  ar_red_hot_parts: {
    condition: 'Part temperature class is Red Hot',
    action: 'Block configuration',
    threshold: 'temperature_class = RED_HOT',
  },
  ar_considerable_oil: {
    condition: 'Fluid type is Considerable Oil/Liquid',
    action: 'Warn engineer',
    threshold: 'fluid_type = CONSIDERABLE',
  },
  ar_long_conveyor: {
    condition: 'Conveyor length exceeds 120 inches (10 feet)',
    action: 'Warn engineer',
    threshold: 'length > 120″',
  },
  ar_hot_parts: {
    condition: 'Part temperature class is Hot (not Red Hot)',
    action: 'Warn engineer',
    threshold: 'temperature_class = HOT',
  },
  ar_minimal_oil: {
    condition: 'Fluid type is Minimal Residual Oil',
    action: 'Inform engineer',
    threshold: 'fluid_type = MINIMAL',
  },
  ar_drop_height_high: {
    condition: 'Drop height is 24 inches or more',
    action: 'Warn engineer',
    threshold: 'drop_height ≥ 24″',
  },

  // --- Incline ---
  ar_incline_over_45: {
    condition: 'Incline angle exceeds 45 degrees',
    action: 'Block configuration',
    threshold: 'incline > 45°',
  },
  ar_incline_35_45: {
    condition: 'Incline angle is greater than 35° and 45° or less',
    action: 'Warn engineer',
    threshold: '35° < incline ≤ 45°',
  },
  ar_incline_20_35: {
    condition: 'Incline angle is greater than 20° and 35° or less',
    action: 'Warn engineer',
    threshold: '20° < incline ≤ 35°',
  },

  // --- Bulk Mode Warnings ---
  ar_density_assumed: {
    condition: 'Material form is Bulk and density source is Assumed from Class',
    action: 'Warn engineer',
    threshold: 'density_source = ASSUMED_CLASS',
  },
  ar_smallest_lump_negative: {
    condition: 'Smallest lump size is provided but is negative',
    action: 'Block configuration',
    threshold: 'smallest_lump < 0″',
  },
  ar_largest_lump_negative: {
    condition: 'Largest lump size is provided but is negative',
    action: 'Block configuration',
    threshold: 'largest_lump < 0″',
  },
  ar_lump_size_inversion: {
    condition: 'Smallest lump size exceeds largest lump size',
    action: 'Block configuration',
    threshold: 'smallest_lump > largest_lump',
  },
  ar_lump_exceeds_belt_width: {
    condition: 'Largest lump exceeds 80% of belt width',
    action: 'Warn engineer',
    threshold: 'largest_lump > belt_width × 0.8',
  },
  ar_surge_multiplier_low: {
    condition: 'Surge feed is selected and multiplier is below 1.0',
    action: 'Block configuration',
    threshold: 'surge_multiplier < 1.0',
  },
  ar_surge_multiplier_missing: {
    condition: 'Surge feed is selected but no multiplier is specified',
    action: 'Warn engineer',
    threshold: 'feed_behavior = SURGE AND surge_multiplier undefined',
  },
  ar_weight_flow_no_density: {
    condition: 'Bulk input method is Weight Flow but density is not provided',
    action: 'Warn engineer',
    threshold: 'bulk_method = WEIGHT_FLOW AND density undefined',
  },

  // --- Belt & Pulley Warnings ---
  ar_fleece_vguide: {
    condition: 'V-guided tracking with FLEECE belt family and a V-guide selected',
    action: 'Warn engineer',
    threshold: 'belt_family = FLEECE AND tracking = V-guided',
  },
  ar_drive_pulley_below_belt_min: {
    condition: 'Drive pulley diameter is below belt minimum for the current tracking method',
    action: 'Warn engineer',
    threshold: 'drive_pulley < belt_min_pulley',
  },
  ar_tail_pulley_below_belt_min: {
    condition: 'Tail pulley diameter is below belt minimum for the current tracking method',
    action: 'Warn engineer',
    threshold: 'tail_pulley < belt_min_pulley',
  },

  // --- Cleat Warnings ---
  ar_cleat_spacing_vs_part: {
    condition: 'Cleats are enabled and cleat spacing is less than the part travel dimension',
    action: 'Warn engineer',
    threshold: 'cleat_spacing < part_travel_dim',
  },
  ar_cleat_edge_offset_overlap: {
    condition: 'Cleat edge offset exceeds half of the belt width',
    action: 'Warn engineer',
    threshold: 'edge_offset > belt_width / 2',
  },

  // --- Safety & Features ---
  ar_finger_safe_no_guards: {
    condition: 'Finger-safe requirement is set but end guards are None',
    action: 'Warn engineer',
    threshold: 'finger_safe = true AND end_guards = None',
  },
  ar_finger_safe_no_covers: {
    condition: 'Finger-safe requirement is set but bottom covers are not enabled',
    action: 'Warn engineer',
    threshold: 'finger_safe = true AND bottom_covers = false',
  },
  ar_clipper_lacing: {
    condition: 'Lacing style is Clipper Lacing',
    action: 'Warn engineer',
    threshold: 'lacing_style = ClipperLacing',
  },

  // --- Belt Catalog Pulley Warnings ---
  ar_belt_catalog_drive_pulley_min: {
    condition: 'A belt is selected from catalog and drive pulley is below catalog belt minimum',
    action: 'Warn engineer',
    threshold: 'drive_pulley < belt_catalog_min_pulley',
    hasTodo: true,
    todoNote: 'belt_conveyor_v1/rules.ts had this as ERROR, not WARNING. Belt checked a single pulley_diameter_in; sliderbed checks drive and tail independently. Evaluate whether belt products should escalate to ERROR.',
  },
  ar_belt_catalog_tail_pulley_min: {
    condition: 'A belt is selected from catalog and tail pulley is below catalog belt minimum',
    action: 'Warn engineer',
    threshold: 'tail_pulley < belt_catalog_min_pulley',
    hasTodo: true,
    todoNote: 'belt_conveyor_v1/rules.ts had this as ERROR, not WARNING. Belt checked a single pulley_diameter_in; sliderbed checks drive and tail independently. Evaluate whether belt products should escalate to ERROR.',
  },

  // --- Application & Demand ---
  ar_start_stop_short_cycle: {
    condition: 'Start/stop application is enabled and cycle time is less than 10 seconds',
    action: 'Warn engineer',
    threshold: 'start_stop = true AND cycle_time < 10s',
  },
  ar_heavy_sideload_no_vguide: {
    condition: 'Side load direction is set, severity is Heavy, and tracking is not V-guided',
    action: 'Block configuration',
    threshold: 'severity = Heavy AND tracking ≠ V-guided',
  },
  ar_heavy_sideload_warning: {
    condition: 'Side load direction is set and severity is Heavy',
    action: 'Warn engineer',
    threshold: 'severity = Heavy',
  },
  ar_moderate_sideload: {
    condition: 'Side load direction is set and severity is Moderate',
    action: 'Warn engineer',
    threshold: 'severity = Moderate',
  },

  // --- Frame Height Warnings ---
  ar_frame_height_design_review: {
    condition: 'Effective frame height is below the design review threshold',
    action: 'Warn engineer',
    threshold: 'frame_height < DESIGN_REVIEW_THRESHOLD',
  },
  ar_snub_rollers_required: {
    condition: 'Frame height is below the snub roller threshold (largest pulley + 2.5″)',
    action: 'Inform engineer',
    threshold: 'frame_height < largest_pulley + 2.5″',
  },

  // --- Return Support ---
  ar_cleats_snub_interference: {
    condition: 'Cleats are enabled and return snub rollers are enabled',
    action: 'Warn engineer',
    threshold: 'cleats = true AND snub_rollers = true',
  },
  ar_low_profile_no_snubs: {
    condition: 'Return frame style is Low Profile and snub mode is explicitly No',
    action: 'Warn engineer',
    threshold: 'frame_style = LOW_PROFILE AND snub_mode = NO',
  },
  ar_gravity_roller_sag: {
    condition: 'Gravity roller spacing exceeds 72 inches',
    action: 'Warn engineer',
    threshold: 'roller_spacing > 72″',
  },
  ar_gravity_roller_over_engineered: {
    condition: 'Gravity roller spacing is less than 24 inches',
    action: 'Inform engineer',
    threshold: 'roller_spacing < 24″',
  },
  ar_end_offset_too_small: {
    condition: 'Return end offset is less than 6 inches',
    action: 'Warn engineer',
    threshold: 'end_offset < 6″',
  },
  ar_end_offset_too_large: {
    condition: 'Return end offset exceeds 60 inches',
    action: 'Warn engineer',
    threshold: 'end_offset > 60″',
  },

  // --- Frame Mode Info ---
  ar_low_profile_info: {
    condition: 'Frame height mode is Low Profile',
    action: 'Inform engineer',
    threshold: 'frame_height_mode = Low Profile',
  },
  ar_custom_frame_info: {
    condition: 'Frame height mode is Custom',
    action: 'Inform engineer',
    threshold: 'frame_height_mode = Custom',
  },
  ar_cleat_height_frame_contribution: {
    condition: 'Cleats are enabled (cleat height > 0)',
    action: 'Inform engineer',
    threshold: 'cleat_height > 0 (adds 2× to frame)',
  },
  ar_low_profile_cleats_error: {
    condition: 'Frame height mode is Low Profile and cleats are enabled',
    action: 'Block configuration',
    threshold: 'frame = Low Profile AND cleats enabled',
  },

  // --- Sprocket Warnings ---
  ar_chain_ratio_low: {
    condition: 'Bottom-mounted gearmotor chain ratio is below 0.5',
    action: 'Warn engineer',
    threshold: 'chain_ratio < 0.5',
  },
  ar_chain_ratio_high: {
    condition: 'Bottom-mounted gearmotor chain ratio exceeds 3.0',
    action: 'Warn engineer',
    threshold: 'chain_ratio > 3.0',
  },
  ar_gm_sprocket_small: {
    condition: 'Bottom-mounted gearmotor sprocket has fewer than 12 teeth',
    action: 'Warn engineer',
    threshold: 'gm_sprocket < 12T',
  },
  ar_drive_sprocket_small: {
    condition: 'Bottom-mounted drive shaft sprocket has fewer than 12 teeth',
    action: 'Warn engineer',
    threshold: 'drive_sprocket < 12T',
  },

  // --- Speed Warnings ---
  ar_belt_speed_high: {
    condition: 'Belt speed exceeds 300 feet per minute',
    action: 'Warn engineer',
    threshold: 'belt_speed > 300 FPM',
  },
  ar_gear_ratio_low: {
    condition: 'Calculated gear ratio (motor RPM / drive RPM) is below 5',
    action: 'Warn engineer',
    threshold: 'gear_ratio < 5',
  },
  ar_gear_ratio_high: {
    condition: 'Calculated gear ratio (motor RPM / drive RPM) exceeds 60',
    action: 'Warn engineer',
    threshold: 'gear_ratio > 60',
  },

  // --- Premium ---
  ar_premium_feature: {
    condition: 'Configuration includes premium features (belt conveyor only)',
    action: 'Inform engineer',
    threshold: 'is_premium = true (belt_conveyor_v1 only)',
  },

  // ==========================================================================
  // validateTob() — Commit-mode TOB validation
  // ==========================================================================
  tob_tail_htob_required: {
    condition: 'Saving in H_TOB geometry mode and Tail TOB is not provided',
    action: 'Block configuration',
    threshold: 'tail_tob undefined in H_TOB commit mode',
  },
  tob_drive_htob_required: {
    condition: 'Saving in H_TOB geometry mode and Drive TOB is not provided',
    action: 'Block configuration',
    threshold: 'drive_tob undefined in H_TOB commit mode',
  },
  tob_tail_floor_required: {
    condition: 'Saving with floor support, reference end is tail, and Tail TOB is not provided',
    action: 'Block configuration',
    threshold: 'tail_tob undefined when ref_end = tail (commit)',
  },
  tob_drive_floor_required: {
    condition: 'Saving with floor support, reference end is drive, and Drive TOB is not provided',
    action: 'Block configuration',
    threshold: 'drive_tob undefined when ref_end = drive (commit)',
  },

  // ==========================================================================
  // applyHeightWarnings() — Height and angle warnings
  // ==========================================================================
  hw_adjustment_range_very_large: {
    condition: 'Adjustment range exceeds 12 inches',
    action: 'Warn engineer',
    threshold: 'adjustment_range > 12″',
  },
  hw_adjustment_range_large: {
    condition: 'Adjustment range exceeds 6 inches (but 12 or less)',
    action: 'Inform engineer',
    threshold: '6″ < adjustment_range ≤ 12″',
  },
  hw_angle_mismatch: {
    condition: 'Implied angle from TOB heights differs from entered incline by more than 0.5°',
    action: 'Warn engineer',
    threshold: '|implied_angle − entered_incline| > 0.5°',
  },

  // ==========================================================================
  // applyPciOutputRules() — PCI tube stress validation
  // ==========================================================================
  pci_tube_geometry_error: {
    condition: 'Tube geometry data (OD/wall) is invalid or missing',
    action: 'Block configuration',
    threshold: 'tube geometry invalid',
  },
  pci_drive_stress_fail: {
    condition: 'Drive pulley tube stress exceeds PCI limit in enforce mode',
    action: 'Block configuration',
    threshold: 'drive_stress > PCI_limit (enforce)',
  },
  pci_tail_stress_fail: {
    condition: 'Tail pulley tube stress exceeds PCI limit in enforce mode',
    action: 'Block configuration',
    threshold: 'tail_stress > PCI_limit (enforce)',
  },
  pci_drive_stress_warn: {
    condition: 'Drive pulley tube stress exceeds PCI limit in warn mode',
    action: 'Warn engineer',
    threshold: 'drive_stress > PCI_limit (warn)',
  },
  pci_tail_stress_warn: {
    condition: 'Tail pulley tube stress exceeds PCI limit in warn mode',
    action: 'Warn engineer',
    threshold: 'tail_stress > PCI_limit (warn)',
  },
  pci_hub_centers_estimated: {
    condition: 'Hub centers not provided — defaulted to belt width',
    action: 'Inform engineer',
    threshold: 'hub_centers undefined (defaults to belt_width)',
  },
  pci_status_estimated: {
    condition: 'PCI tube stress check passed but with estimated hub centers',
    action: 'Inform engineer',
    threshold: 'stress OK with estimated hub_centers',
  },

  // ==========================================================================
  // applyHubConnectionRules() — Hub connection warnings
  // ==========================================================================
  hub_not_ideal_for_drive: {
    condition: 'Drive pulley uses ER internal bearings or dead shaft assembly',
    action: 'Warn engineer',
    threshold: 'hub_type = ER_internal or dead_shaft for drive',
  },
  hub_drive_taper_lock: {
    condition: 'Drive pulley uses Taper-Lock bushing with two-hub configuration',
    action: 'Warn engineer',
    threshold: 'bushing = Taper-Lock on two-hub drive pulley',
  },
  hub_tail_taper_lock: {
    condition: 'Tail pulley uses Taper-Lock bushing with two-hub configuration',
    action: 'Warn engineer',
    threshold: 'bushing = Taper-Lock on two-hub tail pulley',
  },
};

// ============================================================================
// Build the enriched MANAGER_RULES array
// ============================================================================

export const MANAGER_RULES: ManagerRule[] = RULE_DEFINITIONS.map((def) => {
  const enrichment = ENRICHMENTS[def.rule_id];

  if (!enrichment) {
    // Fallback for any rule missing enrichment — should not happen
    // but prevents runtime errors during development
    return {
      id: def.rule_id,
      section: SECTION_MAP[def.category],
      category: CATEGORY_LABELS[def.category],
      categoryKey: def.category,
      name: def.human_name,
      severity: def.default_severity,
      condition: def.check_description,
      threshold: '—',
      action: def.default_severity === 'error' ? 'Block configuration' : def.default_severity === 'warning' ? 'Warn engineer' : 'Inform engineer',
      message: def.check_description,
      fields: [def.field],
      sourceFunction: def.source_function,
      sourceLine: def.source_line,
      hasTodo: true,
      todoNote: `Missing enrichment data for rule ${def.rule_id}. Add to ENRICHMENTS lookup.`,
    };
  }

  return {
    id: def.rule_id,
    section: SECTION_MAP[def.category],
    category: CATEGORY_LABELS[def.category],
    categoryKey: def.category,
    name: def.human_name,
    severity: def.default_severity,
    condition: enrichment.condition,
    threshold: enrichment.threshold,
    action: enrichment.action,
    message: def.check_description,
    fields: [def.field],
    sourceFunction: def.source_function,
    sourceLine: def.source_line,
    hasTodo: enrichment.hasTodo ?? false,
    todoNote: enrichment.todoNote,
  };
});

// ============================================================================
// Exports for convenience
// ============================================================================

/** All 4 section values in tab order */
export const SECTIONS: RuleSection[] = ['Application', 'Physical', 'Drive & Controls', 'Build Options'];

/** Total enriched rule count */
export const MANAGER_RULE_COUNT = MANAGER_RULES.length;

/** Quick lookup by rule ID */
export const MANAGER_RULES_MAP = new Map(
  MANAGER_RULES.map((r) => [r.id, r])
);

/** Section → category mapping for use in the Section Map constant */
export { SECTION_MAP };
