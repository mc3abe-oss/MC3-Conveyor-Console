/**
 * MAGNETIC CONVEYOR v1.0 - CONSTANTS
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * This file contains all calculation constants and default parameters
 * for Standard and Heavy Duty conveyor classes.
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

import { MagneticParameters, ConveyorClass } from './schema';

// ============================================================================
// MAGNET WEIGHT FORMULA CONSTANTS (REV-1)
// ============================================================================

/**
 * Magnet weight formula: weight = INTERCEPT + (width × SLOPE)
 * From REV-1 Calculator - most accurate formula
 */
export const MAGNET_WEIGHT_INTERCEPT = 0.22;
export const MAGNET_WEIGHT_SLOPE = 0.5312;

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

/** Starting belt pull in lbs - fixed for both classes */
export const STARTING_BELT_PULL_LB = 100;

/** Motor base speed in RPM - standard NORD motor */
export const MOTOR_BASE_RPM = 1750;

/** Default discharge length in inches */
export const DEFAULT_DISCHARGE_LENGTH_IN = 22;

// ============================================================================
// STANDARD CLASS PARAMETERS (C2040 Chain)
// ============================================================================

/**
 * Standard class parameters for C2040 chain.
 * Used for lighter duty applications, magnet widths up to ~24".
 */
export const STANDARD_PARAMS: MagneticParameters = {
  // Chain
  chain_pitch_in: 1.0,
  chain_weight_lb_per_ft: 2.0,

  // Sprockets — C2040 is a DOUBLE-PITCH chain (1.0" pitch = 2× the ANSI 40
  // base pitch), so the chain engages every other sprocket tooth: a 28T
  // sprocket advances 28/2 = 14 chain pitches per revolution (D3/D4,
  // confirmed 2026-07-14). The naive single-pitch formulas in the spec's
  // constants-table annotations (PD = teeth × pitch / π → 8.91",
  // lead = teeth × pitch → 28) ignore this and are wrong; the values here
  // are correct: PD = 14 pitches × 1.0" / π ≈ 4.46" → 4.5" catalog sprocket.
  sprocket_pitch_diameter_in: 4.5,
  head_sprocket_teeth: 28,
  tail_sprocket_teeth: 16,

  // Drive
  // Lead = (28 teeth / 2) × 1.0" pitch = 14 in/rev — the /2 is the
  // double-pitch engagement (see sprocket note); lead ≈ π × PD holds
  // (π × 4.5 = 14.14).
  lead_in_per_rev: 14,
  motor_base_rpm: MOTOR_BASE_RPM,

  // Calculation factors
  coefficient_of_friction: 0.2,
  safety_factor: 2.0,
  starting_belt_pull_lb: STARTING_BELT_PULL_LB,
};

// ============================================================================
// HEAVY DUTY CLASS PARAMETERS (C2060H Chain)
// ============================================================================

/**
 * Heavy Duty class parameters for C2060H chain.
 * Used for heavy duty applications:
 * - Magnet width > 24"
 * - Load > 5,000 lbs/hr
 * - Discharge height > 200"
 * - Chain length > 500"
 */
export const HEAVY_DUTY_PARAMS: MagneticParameters = {
  // Chain
  chain_pitch_in: 1.5,
  chain_weight_lb_per_ft: 3.0,

  // Sprockets — C2060H is a DOUBLE-PITCH chain (1.5" pitch = 2× the ANSI 60
  // base pitch): a 28T sprocket advances 28/2 = 14 chain pitches per
  // revolution (D3/D4, confirmed 2026-07-14). The spec's naive annotations
  // (PD = teeth × pitch / π → 13.37", lead = teeth × pitch → 42) are wrong;
  // PD = 14 pitches × 1.5" / π ≈ 6.68" → 6.74" catalog sprocket.
  sprocket_pitch_diameter_in: 6.74,
  head_sprocket_teeth: 28,
  tail_sprocket_teeth: 14,

  // Drive
  // Lead = (28 teeth / 2) × 1.5" pitch = 21 in/rev — double-pitch engagement
  // (see sprocket note); lead ≈ π × PD holds (π × 6.74 = 21.17).
  lead_in_per_rev: 21,
  motor_base_rpm: MOTOR_BASE_RPM,

  // Calculation factors
  coefficient_of_friction: 0.15,
  safety_factor: 1.5,
  starting_belt_pull_lb: STARTING_BELT_PULL_LB,
};

// ============================================================================
// PARAMETER LOOKUP
// ============================================================================

/**
 * Get parameters for a given conveyor class.
 */
export function getParametersForClass(conveyorClass: ConveyorClass): MagneticParameters {
  switch (conveyorClass) {
    case ConveyorClass.Standard:
      return STANDARD_PARAMS;
    case ConveyorClass.HeavyDuty:
      return HEAVY_DUTY_PARAMS;
    default:
      return STANDARD_PARAMS;
  }
}

// ============================================================================
// HEAVY DUTY TRIGGER THRESHOLDS
// ============================================================================

/**
 * Thresholds that suggest Heavy Duty class.
 * Used for auto-suggestion/validation warnings.
 */
export const HEAVY_DUTY_THRESHOLDS = {
  /** Magnet width above which Heavy Duty is suggested (inches) */
  magnet_width_in: 24,

  /** Load above which Heavy Duty is suggested (lbs/hr) */
  load_lbs_per_hr: 5000,

  /** Discharge height above which Heavy Duty is suggested (inches) */
  discharge_height_in: 200,

  /** Chain length above which Heavy Duty is suggested (inches) */
  chain_length_in: 500,
};

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

/**
 * Geometry validation limits.
 */
export const GEOMETRY_LIMITS = {
  /** Minimum incline angle (degrees) - 0 only for Style C */
  min_angle_deg: 0,

  /** Maximum incline angle (degrees) */
  max_angle_deg: 90,

  /** Minimum belt speed (FPM) */
  min_belt_speed_fpm: 6,

  /** Maximum belt speed before warning (FPM) */
  max_belt_speed_fpm: 120,

  /** Minimum infeed length before warning (inches) - custom tail tracks needed below this */
  min_infeed_warning_in: 39,
};

// ============================================================================
// STANDARD MAGNET WIDTHS
// ============================================================================

/**
 * Standard magnet width options (inches).
 * From reference doc: 5", 6", 7.5", 8.5", 9.5", 10", 12", 12.5", 14", 15", 18", 24", 30"
 */
export const STANDARD_MAGNET_WIDTHS_IN = [
  5,
  6,
  7.5,
  8.5,
  9.5,
  10,
  12,
  12.5,
  14,
  15,
  18,
  24,
  30,
] as const;

// ============================================================================
// THROUGHPUT MARGIN THRESHOLDS
// ============================================================================

/**
 * Minimum throughput margin thresholds for warnings.
 */
export const THROUGHPUT_MARGIN_THRESHOLDS = {
  /** Minimum margin for chips */
  chips: 1.5,

  /** Minimum margin for parts */
  parts: 1.25,
};
