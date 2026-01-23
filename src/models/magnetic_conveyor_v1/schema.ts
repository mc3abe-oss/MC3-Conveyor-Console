/**
 * MAGNETIC CONVEYOR v1.0 - TYPE DEFINITIONS
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 * Model Key: magnetic_conveyor_v1
 *
 * This file defines the complete type system for inputs, parameters, and outputs.
 * All units are explicit. No hidden conversions.
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Conveyor Style
 * Determines geometry configuration and body construction.
 */
export enum ConveyorStyle {
  /** Horiz → Incline → Horiz (standard body) */
  A = 'A',
  /** Horiz → Incline → Horiz (alternate body, compact at 90°) */
  B = 'B',
  /** Horizontal only (0° angle, floor mounted) */
  C = 'C',
  /** Incline primary with minimal infeed (~3") */
  D = 'D',
}

export const CONVEYOR_STYLE_LABELS: Record<ConveyorStyle, string> = {
  [ConveyorStyle.A]: 'Style A - Standard Incline',
  [ConveyorStyle.B]: 'Style B - Alternate Body',
  [ConveyorStyle.C]: 'Style C - Horizontal Only',
  [ConveyorStyle.D]: 'Style D - Incline Primary',
};

/**
 * Conveyor Class
 * Determines chain type, sprockets, and calculation parameters.
 */
export enum ConveyorClass {
  /** C2040 chain, 1" pitch, lighter duty */
  Standard = 'standard',
  /** C2060H chain, 1.5" pitch, heavy duty */
  HeavyDuty = 'heavy_duty',
}

export const CONVEYOR_CLASS_LABELS: Record<ConveyorClass, string> = {
  [ConveyorClass.Standard]: 'Standard (C2040)',
  [ConveyorClass.HeavyDuty]: 'Heavy Duty (C2060H)',
};

/**
 * Magnet Type
 * Determines magnetic strength and configuration.
 */
export enum MagnetType {
  Ceramic5 = 'ceramic_5',
  Ceramic8 = 'ceramic_8',
  Neo35 = 'neo_35',
  Neo50 = 'neo_50',
}

export const MAGNET_TYPE_LABELS: Record<MagnetType, string> = {
  [MagnetType.Ceramic5]: 'Ceramic 5',
  [MagnetType.Ceramic8]: 'Ceramic 8',
  [MagnetType.Neo35]: 'Neo 35',
  [MagnetType.Neo50]: 'Neo 50',
};

/**
 * Chip Type
 * Type of material being conveyed - affects throughput and warnings.
 */
export enum ChipType {
  Small = 'small',
  Stringers = 'stringers',
  BirdNests = 'bird_nests',
  SawFines = 'saw_fines',
  Parts = 'parts',
  SteelFiber = 'steel_fiber',
}

export const CHIP_TYPE_LABELS: Record<ChipType, string> = {
  [ChipType.Small]: 'Small Chips',
  [ChipType.Stringers]: 'Stringers',
  [ChipType.BirdNests]: 'Bird Nests',
  [ChipType.SawFines]: 'Saw Fines',
  [ChipType.Parts]: 'Parts',
  [ChipType.SteelFiber]: 'Steel Fiber',
};

/**
 * Material Type
 * Material being conveyed - some cannot be magnetized.
 */
export enum MaterialType {
  Steel = 'steel',
  CastIron = 'cast_iron',
  /** Warning: Cannot be magnetized */
  Aluminum = 'aluminum',
  /** Warning: Cannot be magnetized */
  StainlessSteel = 'stainless_steel',
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  [MaterialType.Steel]: 'Steel',
  [MaterialType.CastIron]: 'Cast Iron',
  [MaterialType.Aluminum]: 'Aluminum (non-magnetic)',
  [MaterialType.StainlessSteel]: 'Stainless Steel (non-magnetic)',
};

/**
 * Temperature Class
 * Operating temperature of material being conveyed.
 */
export enum TemperatureClass {
  Ambient = 'ambient',
  Warm = 'warm',
  /** Warning: Poor choice for magnetic conveyor */
  RedHot = 'red_hot',
}

export const TEMPERATURE_CLASS_LABELS: Record<TemperatureClass, string> = {
  [TemperatureClass.Ambient]: 'Ambient',
  [TemperatureClass.Warm]: 'Warm',
  [TemperatureClass.RedHot]: 'Red Hot',
};

/**
 * Fluid Type
 * Coolant/fluid present on chips.
 */
export enum FluidType {
  None = 'none',
  WaterSoluble = 'water_soluble',
  OilBased = 'oil_based',
  MinimalResidualOil = 'minimal_residual_oil',
}

export const FLUID_TYPE_LABELS: Record<FluidType, string> = {
  [FluidType.None]: 'None',
  [FluidType.WaterSoluble]: 'Water Soluble',
  [FluidType.OilBased]: 'Oil Based',
  [FluidType.MinimalResidualOil]: 'Minimal Residual Oil',
};

/**
 * Chip Delivery Method
 * How chips are fed to the conveyor.
 */
export enum ChipDelivery {
  ChipChute = 'chip_chute',
  VibratingFeeder = 'vibrating_feeder',
  AlongInfeed = 'along_infeed',
}

export const CHIP_DELIVERY_LABELS: Record<ChipDelivery, string> = {
  [ChipDelivery.ChipChute]: 'Chip Chute',
  [ChipDelivery.VibratingFeeder]: 'Vibrating Feeder/Chute',
  [ChipDelivery.AlongInfeed]: 'Along Infeed',
};

/**
 * Support Type
 * How the conveyor is supported.
 */
export enum SupportType {
  FixedLegs = 'fixed_legs',
  AdjustableLegs = 'adjustable_legs',
  Casters = 'casters',
  FootPads = 'foot_pads',
  LevelingFeet = 'leveling_feet',
}

export const SUPPORT_TYPE_LABELS: Record<SupportType, string> = {
  [SupportType.FixedLegs]: 'Fixed Legs',
  [SupportType.AdjustableLegs]: 'Adjustable Legs',
  [SupportType.Casters]: 'Casters',
  [SupportType.FootPads]: 'Foot Pads',
  [SupportType.LevelingFeet]: 'Leveling Feet',
};

/**
 * Magnet Centers (pitch between magnet bars)
 * Standard options in inches.
 */
export enum MagnetCenters {
  Twelve = 12,
  Eighteen = 18,
  TwentyFour = 24,
  ThirtySix = 36,
}

export const MAGNET_CENTERS_LABELS: Record<MagnetCenters, string> = {
  [MagnetCenters.Twelve]: '12"',
  [MagnetCenters.Eighteen]: '18"',
  [MagnetCenters.TwentyFour]: '24"',
  [MagnetCenters.ThirtySix]: '36"',
};

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

export type ValidationResult = ValidationError | ValidationWarning;

// ============================================================================
// INPUTS SCHEMA
// ============================================================================

/**
 * User inputs for magnetic conveyor calculation.
 * All dimensions in inches unless otherwise noted.
 */
export interface MagneticInputs {
  // =========================================================================
  // STYLE & CLASS
  // =========================================================================

  /** Conveyor style (A, B, C, D) */
  style: ConveyorStyle;

  /** Conveyor class - determines chain type and parameters */
  conveyor_class: ConveyorClass;

  // =========================================================================
  // GEOMETRY
  // =========================================================================

  /** Infeed (horizontal) length in inches */
  infeed_length_in: number;

  /** Discharge height in inches (0 for Style C) */
  discharge_height_in: number;

  /** Incline angle in degrees (0 for Style C) */
  incline_angle_deg: number;

  /** Discharge length in inches (default: 22") */
  discharge_length_in?: number;

  // =========================================================================
  // MAGNETS
  // =========================================================================

  /** Magnet bar width in inches (5", 6", 7.5", ..., 30") */
  magnet_width_in: number;

  /** Magnet type */
  magnet_type: MagnetType;

  /** Magnet centers (pitch) in inches (12, 18, 24, 36) */
  magnet_centers_in: number;

  // =========================================================================
  // OPERATION
  // =========================================================================

  /** Belt speed in feet per minute */
  belt_speed_fpm: number;

  /** Load (throughput) in lbs per hour */
  load_lbs_per_hr: number;

  /** Material type being conveyed */
  material_type: MaterialType;

  /** Chip type */
  chip_type: ChipType;

  /** Material temperature class */
  temperature_class?: TemperatureClass;

  /** Fluid type present on chips */
  fluid_type?: FluidType;

  /** Chip delivery method */
  chip_delivery?: ChipDelivery;

  // =========================================================================
  // SUPPORT & OPTIONS
  // =========================================================================

  /** Support type */
  support_type?: SupportType;

  // =========================================================================
  // POWER USER OVERRIDES
  // =========================================================================

  /** Override coefficient of friction (default from class) */
  coefficient_of_friction?: number;

  /** Override safety factor (default from class) */
  safety_factor?: number;

  /** Override starting belt pull in lbs (default: 100) */
  starting_belt_pull_lb?: number;

  /** Override chain weight in lb/ft (default from class) */
  chain_weight_lb_per_ft?: number;
}

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

/**
 * Calculation parameters derived from conveyor class.
 * These are the constants used in formulas.
 */
export interface MagneticParameters {
  /** Chain pitch in inches (1.0 for Standard, 1.5 for Heavy Duty) */
  chain_pitch_in: number;

  /** Chain weight in lb/ft (2.0 for Standard, 3.0 for Heavy Duty) */
  chain_weight_lb_per_ft: number;

  /** Drive sprocket pitch diameter in inches (4.5 for Standard, 6.74 for Heavy Duty) */
  sprocket_pitch_diameter_in: number;

  /** Lead (travel per revolution) in inches (14 for Standard, 21 for Heavy Duty) */
  lead_in_per_rev: number;

  /** Coefficient of friction - steel on UHMW (0.2 for Standard, 0.15 for Heavy Duty) */
  coefficient_of_friction: number;

  /** Safety factor applied to torque (2.0 for Standard, 1.5 for Heavy Duty) */
  safety_factor: number;

  /** Starting belt pull in lbs (100, fixed for both classes) */
  starting_belt_pull_lb: number;

  /** Motor base speed in RPM (1750, fixed) */
  motor_base_rpm: number;

  /** Head sprocket teeth count */
  head_sprocket_teeth: number;

  /** Tail sprocket teeth count */
  tail_sprocket_teeth: number;
}

// ============================================================================
// OUTPUTS SCHEMA
// ============================================================================

/**
 * Calculated outputs from magnetic conveyor calculation.
 * All dimensions in inches unless otherwise noted.
 */
export interface MagneticOutputs {
  // =========================================================================
  // GEOMETRY OUTPUTS
  // =========================================================================

  /** Incline length in inches (0 for Style C) */
  incline_length_in: number;

  /** Incline run (horizontal projection) in inches (0 for Style C) */
  incline_run_in: number;

  /** Total horizontal length in inches */
  horizontal_length_in: number;

  /** Path length in feet (one side of chain) */
  path_length_ft: number;

  /** Belt length in feet (both sides of chain) */
  belt_length_ft: number;

  /** Chain length in inches (rounded up to nearest pitch) */
  chain_length_in: number;

  // =========================================================================
  // MAGNET OUTPUTS
  // =========================================================================

  /** Weight of each magnet bar in lbs */
  magnet_weight_each_lb: number;

  /** Quantity of magnets on belt */
  qty_magnets: number;

  /** Total magnet weight in lbs */
  total_magnet_weight_lb: number;

  // =========================================================================
  // LOAD OUTPUTS
  // =========================================================================

  /** Weight per foot of chain + magnets in lb/ft */
  weight_per_foot_lb: number;

  /** Belt pull from friction in lbs */
  belt_pull_friction_lb: number;

  /** Belt pull from gravity (incline) in lbs */
  belt_pull_gravity_lb: number;

  /** Chip load on bed in lbs */
  chip_load_lb: number;

  /** Total load in lbs */
  total_load_lb: number;

  // =========================================================================
  // DRIVE OUTPUTS (Torque & Speed - NO HP)
  // =========================================================================

  /** Total belt pull in lbs (starting + load) */
  total_belt_pull_lb: number;

  /** Running torque in in-lb */
  running_torque_in_lb: number;

  /** Total torque in in-lb (with safety factor) */
  total_torque_in_lb: number;

  /** Required output shaft RPM */
  required_rpm: number;

  /** Suggested gear ratio (motor RPM / required RPM) */
  suggested_gear_ratio: number;

  // =========================================================================
  // THROUGHPUT OUTPUTS
  // =========================================================================

  /** Achieved throughput in lbs/hr */
  achieved_throughput_lbs_hr: number;

  /** Throughput margin (achieved / required) */
  throughput_margin: number;

  // =========================================================================
  // PARAMETERS USED (echoed for transparency)
  // =========================================================================

  /** Coefficient of friction used in calculation */
  coefficient_of_friction_used: number;

  /** Safety factor used in calculation */
  safety_factor_used: number;

  /** Starting belt pull used in calculation */
  starting_belt_pull_lb_used: number;

  /** Chain weight used in calculation */
  chain_weight_lb_per_ft_used: number;

  // =========================================================================
  // VALIDATION OUTPUTS
  // =========================================================================

  /** Validation warnings */
  warnings: ValidationWarning[];

  /** Validation errors */
  errors: ValidationError[];
}
