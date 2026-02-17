/**
 * Zod Schema — Belt Conveyor (Sliderbed) Inputs
 *
 * Observe-mode schema for SliderbedInputs (src/models/sliderbed_v1/schema.ts).
 * Encodes SIMPLE constraints only: types, enums, min/max ranges.
 * No cross-field rules. No coercion. No transforms.
 *
 * Uses .passthrough() — real configs have 200+ fields including legacy fields,
 * UI state, and product-specific extensions that the schema doesn't know about.
 *
 * NOTE: SliderbedInputs is a very large interface (~200 fields). The TypeScript
 * interface marks many fields as required, but golden fixtures prove that
 * calculation configs only need a subset. Application/UI fields (material_type,
 * process_type, finish_paint_system, etc.) are optional here because they are
 * NOT consumed by the calculation engine.
 *
 * Fields marked required here are ONLY those that every golden fixture provides
 * and that the calculation engine actually needs.
 */

import { z } from 'zod';

// --- Enum value sets (from sliderbed_v1/schema.ts) ---

const GeometryModeValues = ['L_ANGLE', 'H_ANGLE', 'H_TOB', 'H_RISE'] as const;
const SpeedModeValues = ['belt_speed', 'drive_rpm'] as const;
const OrientationValues = ['Lengthwise', 'Crosswise'] as const;
const GearmotorMountingStyleValues = ['shaft_mounted', 'bottom_mount'] as const;
const SupportMethodValues = ['external', 'floor_supported', 'legs', 'casters'] as const;

// --- Main schema ---
// Core calculation fields are required. Application/UI fields are optional.
// This reflects what real golden fixtures actually provide.

export const BeltConfigSchema = z.object({
  // PRODUCT IDENTITY
  product_family_id: z.string().optional(),
  bed_type: z.string().optional(),

  // GEOMETRY & LAYOUT — core calculation fields
  geometry_mode: z.enum(GeometryModeValues).optional(),
  conveyor_length_cc_in: z.number().min(0),
  horizontal_run_in: z.number().min(0).optional(),
  input_rise_in: z.number().optional(),
  belt_width_in: z.number().min(1),
  conveyor_width_in: z.number().min(1).optional(), // deprecated alias
  conveyor_incline_deg: z.number().min(0).max(90).optional(),
  pulley_diameter_in: z.number().min(0).optional(), // legacy — may not be in fixtures

  // PULLEY DIAMETERS
  drive_pulley_diameter_in: z.number().min(0).optional(),
  tail_pulley_diameter_in: z.number().min(0).optional(),
  tail_matches_drive: z.boolean().optional(),

  // SPEED — core calculation fields
  belt_speed_fpm: z.number().min(0),
  speed_mode: z.enum(SpeedModeValues).optional(),
  drive_rpm: z.number().min(0).optional(), // may be derived from belt_speed_fpm
  drive_rpm_input: z.number().min(0).optional(),

  // MATERIAL FORM
  material_form: z.string().optional(),
  bulk_input_method: z.string().optional(),
  mass_flow_lbs_per_hr: z.number().min(0).optional(),
  volume_flow_ft3_per_hr: z.number().min(0).optional(),
  density_lbs_per_ft3: z.number().min(0).optional(),

  // PRODUCT / PART
  part_weight_lbs: z.number().min(0).optional(),
  part_length_in: z.number().min(0).optional(),
  part_width_in: z.number().min(0).optional(),
  drop_height_in: z.number().min(0).optional(),
  part_spacing_in: z.number().min(0).optional(),
  orientation: z.enum(OrientationValues).optional(),
  part_temperature_class: z.string().optional(),

  // FLUID
  fluid_type: z.string().optional(),

  // POWER-USER PARAMETERS (optional overrides with safe ranges)
  safety_factor: z.number().min(1).max(5).optional(),
  belt_coeff_piw: z.number().min(0.05).max(0.30).optional(),
  belt_coeff_pil: z.number().min(0.05).max(0.30).optional(),
  starting_belt_pull_lb: z.number().min(0).max(2000).optional(),
  friction_coeff: z.number().min(0.05).max(0.6).optional(),
  motor_rpm: z.number().min(800).max(3600).optional(),

  // APPLICATION FIELDS — optional (not consumed by calc engine)
  material_type: z.string().optional(),
  process_type: z.string().optional(),
  parts_sharp: z.string().optional(),
  environment_factors: z.array(z.string()).optional(),
  ambient_temperature: z.string().optional(),
  power_feed: z.string().optional(),
  controls_package: z.string().optional(),
  spec_source: z.string().optional(),

  // BUILD OPTIONS — optional (not consumed by calc engine)
  field_wiring_required: z.string().optional(),
  bearing_grade: z.string().optional(),
  documentation_package: z.string().optional(),
  finish_paint_system: z.string().optional(),
  labels_required: z.string().optional(),
  send_to_estimating: z.string().optional(),
  motor_brand: z.string().optional(),

  // FEATURES & OPTIONS — optional
  bottom_covers: z.boolean().optional(),
  side_rails: z.string().optional(),
  end_guards: z.string().optional(),
  finger_safe: z.boolean().optional(),
  lacing_style: z.string().optional(),
  side_skirts: z.boolean().optional(),

  // APPLICATION / DEMAND — optional
  pulley_surface_type: z.string().optional(),
  start_stop_application: z.boolean().optional(),
  direction_mode: z.string().optional(),
  side_loading_direction: z.string().optional(),

  // SPECIFICATIONS — optional
  drive_location: z.string().optional(),
  brake_motor: z.boolean().optional(),
  gearmotor_orientation: z.string().optional(),
  drive_hand: z.string().optional(),

  // BELT TRACKING & PULLEY — optional
  belt_tracking_method: z.string().optional(),
  shaft_diameter_mode: z.string().optional(),

  // GEARMOTOR — optional
  gearmotor_mounting_style: z.enum(GearmotorMountingStyleValues).optional(),
  frame_height_mode: z.string().optional(),
  support_method: z.enum(SupportMethodValues).optional(),
}).passthrough();

export type BeltConfigValidated = z.infer<typeof BeltConfigSchema>;
