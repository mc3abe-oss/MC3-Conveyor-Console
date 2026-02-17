/**
 * Zod Schema — Magnetic Conveyor Inputs
 *
 * Observe-mode schema for MagneticInputs (src/models/magnetic_conveyor_v1/schema.ts).
 * Encodes SIMPLE constraints only: types, enums, min/max ranges.
 * No cross-field rules. No coercion. No transforms.
 *
 * Uses .passthrough() — real configs may have extra keys (legacy fields, UI state).
 */

import { z } from 'zod';

// --- Enum value sets (from magnetic_conveyor_v1/schema.ts) ---

const ConveyorStyleValues = ['A', 'B', 'C', 'D'] as const;
const ConveyorClassValues = ['standard', 'heavy_duty'] as const;
const MagnetTypeValues = ['ceramic_5', 'ceramic_8', 'neo_35', 'neo_50'] as const;
const ChipTypeValues = ['small', 'stringers', 'bird_nests', 'saw_fines', 'parts', 'steel_fiber'] as const;
const MaterialTypeValues = ['steel', 'cast_iron', 'aluminum', 'stainless_steel'] as const;
const TemperatureClassValues = ['ambient', 'warm', 'red_hot'] as const;
const FluidTypeValues = ['none', 'water_soluble', 'oil_based', 'minimal_residual_oil'] as const;
const ChipDeliveryValues = ['chip_chute', 'vibrating_feeder', 'along_infeed'] as const;
const SupportTypeValues = ['fixed_legs', 'adjustable_legs', 'casters', 'foot_pads', 'leveling_feet'] as const;
const BarPatternModeValues = ['all_same', 'alternating', 'interval'] as const;

// Valid magnet widths (inches) — from engineering reference
const VALID_MAGNET_WIDTHS = [5, 6, 7.5, 8.5, 9.5, 10, 12, 12.5, 14, 15, 18, 24, 30] as const;
// Valid magnet centers (inches) — standard pitch options
const VALID_MAGNET_CENTERS = [12, 18, 24, 36] as const;

// --- Sub-schemas ---

const BarConfigurationSchema = z.object({
  bar_capacity_lb: z.number(),
  ceramic_count: z.number().int().min(0),
  neo_count: z.number().int().min(0),
  pattern_mode: z.enum(BarPatternModeValues).optional(),
  secondary_bar_capacity_lb: z.number().optional(),
  interval_count: z.number().int().min(1).optional(),
}).passthrough();

// --- Main schema ---

export const MagneticConfigSchema = z.object({
  // STYLE & CLASS
  style: z.enum(ConveyorStyleValues),
  conveyor_class: z.enum(ConveyorClassValues),

  // GEOMETRY
  infeed_length_in: z.number().min(0),
  discharge_height_in: z.number().min(0),
  incline_angle_deg: z.number().min(0).max(90),
  discharge_length_in: z.number().min(0).optional(),

  // MAGNETS
  magnet_width_in: z.number().refine(
    (v) => (VALID_MAGNET_WIDTHS as readonly number[]).includes(v),
    { message: `magnet_width_in must be one of: ${VALID_MAGNET_WIDTHS.join(', ')}` }
  ),
  magnet_type: z.enum(MagnetTypeValues),
  magnet_centers_in: z.number().refine(
    (v) => (VALID_MAGNET_CENTERS as readonly number[]).includes(v),
    { message: `magnet_centers_in must be one of: ${VALID_MAGNET_CENTERS.join(', ')}` }
  ),
  bar_configuration: BarConfigurationSchema.optional(),

  // OPERATION
  belt_speed_fpm: z.number().min(6),
  load_lbs_per_hr: z.number().min(0),
  material_type: z.enum(MaterialTypeValues),
  chip_type: z.enum(ChipTypeValues),
  temperature_class: z.enum(TemperatureClassValues).optional(),
  fluid_type: z.enum(FluidTypeValues).optional(),
  chip_delivery: z.enum(ChipDeliveryValues).optional(),

  // SUPPORT
  support_type: z.enum(SupportTypeValues).optional(),

  // POWER USER OVERRIDES
  coefficient_of_friction: z.number().min(0).max(1).optional(),
  safety_factor: z.number().min(1).max(10).optional(),
  starting_belt_pull_lb: z.number().min(0).optional(),
  chain_weight_lb_per_ft: z.number().min(0).optional(),
}).passthrough();

export type MagneticConfigValidated = z.infer<typeof MagneticConfigSchema>;
