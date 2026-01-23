/**
 * MAGNETIC CONVEYOR v1.0 - MASTER CALCULATION
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * This is the main entry point for all magnetic conveyor calculations.
 * It orchestrates the individual calculation modules in the correct order.
 *
 * Calculation Flow:
 * 1. Get parameters for conveyor class (with user overrides)
 * 2. Calculate geometry (incline, run, path, belt, chain)
 * 3. Calculate magnets (weight, quantity, total)
 * 4. Calculate loads (weight/ft, friction, gravity, total)
 * 5. Calculate drive (belt pull, torque, RPM, gear ratio)
 * 6. Calculate throughput (achieved, margin)
 * 7. Collect validation warnings/errors
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

import {
  MagneticInputs,
  MagneticOutputs,
  MagneticParameters,
  ValidationWarning,
  ValidationError,
  ConveyorStyle,
} from './schema';

import {
  getParametersForClass,
  DEFAULT_DISCHARGE_LENGTH_IN,
} from './constants';

import { calculateGeometry } from './geometry';
import { calculateMagnets } from './magnets';
import { calculateLoads } from './loads';
import { calculateDrive } from './drive';
import { validateInputs, validateOutputs } from './validation';

// ============================================================================
// PARAMETER RESOLUTION
// ============================================================================

/**
 * Resolve calculation parameters with user overrides.
 *
 * Users can override specific parameters (CoF, SF, starting pull, chain weight)
 * for power user scenarios. This function merges overrides with class defaults.
 *
 * @param inputs - User inputs
 * @returns Resolved parameters with any overrides applied
 */
export function resolveParameters(inputs: MagneticInputs): MagneticParameters {
  const baseParams = getParametersForClass(inputs.conveyor_class);

  return {
    ...baseParams,
    // Apply user overrides if provided
    coefficient_of_friction:
      inputs.coefficient_of_friction ?? baseParams.coefficient_of_friction,
    safety_factor: inputs.safety_factor ?? baseParams.safety_factor,
    starting_belt_pull_lb:
      inputs.starting_belt_pull_lb ?? baseParams.starting_belt_pull_lb,
    chain_weight_lb_per_ft:
      inputs.chain_weight_lb_per_ft ?? baseParams.chain_weight_lb_per_ft,
  };
}

// ============================================================================
// THROUGHPUT CALCULATIONS
// ============================================================================

/**
 * Throughput calculation result.
 */
export interface ThroughputResult {
  /** Chip load on bed in lbs */
  chip_load_lb: number;
  /** Achieved throughput in lbs/hr */
  achieved_throughput_lbs_hr: number;
  /** Throughput margin (achieved / required) */
  throughput_margin: number;
}

/**
 * Calculate throughput values.
 *
 * Note: Full throughput calculation requires removal_per_bar lookup tables
 * based on magnet width and Neo count. This is a simplified placeholder
 * that sets chip load to 0 and returns the requested throughput as achieved.
 *
 * TODO: Implement full throughput calculation with lookup tables:
 * - chipLoad = removalPerBar × qtyMagnets / 2
 * - achievedThroughput = removalPerBar × qtyMagnets × beltSpeed × 60 / magnetCenters
 * - throughputMargin = achievedThroughput / requiredThroughput
 *
 * @param qtyMagnets - Number of magnets on belt
 * @param beltSpeedFpm - Belt speed in feet per minute
 * @param magnetCentersIn - Magnet pitch in inches
 * @param requiredThroughputLbsHr - Required throughput in lbs/hr
 * @returns Throughput calculation results
 */
export function calculateThroughput(
  _qtyMagnets: number,
  _beltSpeedFpm: number,
  _magnetCentersIn: number,
  requiredThroughputLbsHr: number
): ThroughputResult {
  // Placeholder: chip load set to 0 (requires removal_per_bar lookup table)
  const chip_load_lb = 0;

  // Placeholder: return requested throughput as achieved
  // Full implementation would use: removalPerBar × qtyMagnets × beltSpeed × 60 / magnetCenters
  const achieved_throughput_lbs_hr = requiredThroughputLbsHr;

  // Margin = achieved / required (1.0 when using placeholder)
  const throughput_margin =
    requiredThroughputLbsHr > 0
      ? achieved_throughput_lbs_hr / requiredThroughputLbsHr
      : 0;

  return {
    chip_load_lb,
    achieved_throughput_lbs_hr,
    throughput_margin,
  };
}

// ============================================================================
// MASTER CALCULATE FUNCTION
// ============================================================================

/**
 * Calculate all magnetic conveyor values from inputs.
 *
 * This is the main entry point for the calculation module.
 * It orchestrates all individual calculation functions in the correct order.
 *
 * @param inputs - User inputs for the magnetic conveyor
 * @returns Complete calculation outputs including all geometry, magnet, load,
 *          drive, and throughput values plus validation warnings/errors
 */
export function calculate(inputs: MagneticInputs): MagneticOutputs {
  // =========================================================================
  // Step 1: Resolve parameters with user overrides
  // =========================================================================

  const parameters = resolveParameters(inputs);

  // Extract key parameters
  const cof = parameters.coefficient_of_friction;
  const sf = parameters.safety_factor;
  const startingPull = parameters.starting_belt_pull_lb;
  const chainWeight = parameters.chain_weight_lb_per_ft;

  // =========================================================================
  // Step 2: Calculate Geometry
  // =========================================================================

  const dischargeLength =
    inputs.discharge_length_in ?? DEFAULT_DISCHARGE_LENGTH_IN;

  // Style C is horizontal-only (0 angle, 0 discharge height)
  const isStyleC = inputs.style === ConveyorStyle.C;
  const effectiveAngle = isStyleC ? 0 : inputs.incline_angle_deg;
  const effectiveHeight = isStyleC ? 0 : inputs.discharge_height_in;
  const effectiveDischarge = isStyleC ? 0 : dischargeLength;

  const geometry = calculateGeometry(
    inputs.infeed_length_in,
    effectiveHeight,
    effectiveAngle,
    effectiveDischarge,
    parameters.chain_pitch_in
  );

  // =========================================================================
  // Step 3: Calculate Magnets
  // =========================================================================

  const magnets = calculateMagnets(
    inputs.magnet_width_in,
    geometry.belt_length_ft,
    inputs.magnet_centers_in
  );

  // =========================================================================
  // Step 4: Calculate Throughput (for chip load)
  // =========================================================================

  const throughput = calculateThroughput(
    magnets.qty_magnets,
    inputs.belt_speed_fpm,
    inputs.magnet_centers_in,
    inputs.load_lbs_per_hr
  );

  // =========================================================================
  // Step 5: Calculate Loads
  // =========================================================================

  const loads = calculateLoads(
    chainWeight,
    magnets.total_magnet_weight_lb,
    geometry.belt_length_ft,
    geometry.incline_length_in,
    effectiveAngle,
    cof,
    throughput.chip_load_lb
  );

  // =========================================================================
  // Step 6: Calculate Drive
  // =========================================================================

  const drive = calculateDrive(
    startingPull,
    loads.total_load_lb,
    parameters.sprocket_pitch_diameter_in,
    sf,
    inputs.belt_speed_fpm,
    parameters.lead_in_per_rev,
    parameters.motor_base_rpm
  );

  // =========================================================================
  // Step 7: Build Output (before validation)
  // =========================================================================

  const outputsWithoutValidation: MagneticOutputs = {
    // Geometry
    incline_length_in: geometry.incline_length_in,
    incline_run_in: geometry.incline_run_in,
    horizontal_length_in: geometry.horizontal_length_in,
    path_length_ft: geometry.path_length_ft,
    belt_length_ft: geometry.belt_length_ft,
    chain_length_in: geometry.chain_length_in,

    // Magnets
    magnet_weight_each_lb: magnets.magnet_weight_each_lb,
    qty_magnets: magnets.qty_magnets,
    total_magnet_weight_lb: magnets.total_magnet_weight_lb,

    // Loads
    weight_per_foot_lb: loads.weight_per_foot_lb,
    belt_pull_friction_lb: loads.belt_pull_friction_lb,
    belt_pull_gravity_lb: loads.belt_pull_gravity_lb,
    chip_load_lb: loads.chip_load_lb,
    total_load_lb: loads.total_load_lb,

    // Drive
    total_belt_pull_lb: drive.total_belt_pull_lb,
    running_torque_in_lb: drive.running_torque_in_lb,
    total_torque_in_lb: drive.total_torque_in_lb,
    required_rpm: drive.required_rpm,
    suggested_gear_ratio: drive.suggested_gear_ratio,

    // Throughput
    achieved_throughput_lbs_hr: throughput.achieved_throughput_lbs_hr,
    throughput_margin: throughput.throughput_margin,

    // Parameters used (echo for transparency)
    coefficient_of_friction_used: cof,
    safety_factor_used: sf,
    starting_belt_pull_lb_used: startingPull,
    chain_weight_lb_per_ft_used: chainWeight,

    // Validation (placeholder, will be populated below)
    warnings: [],
    errors: [],
  };

  // =========================================================================
  // Step 8: Run Validation
  // =========================================================================

  const inputMessages = validateInputs(inputs);
  const outputMessages = validateOutputs(inputs, outputsWithoutValidation);
  const allMessages = [...inputMessages, ...outputMessages];

  // Convert ValidationMessage to ValidationWarning/ValidationError
  const warnings: ValidationWarning[] = allMessages
    .filter((m) => m.type === 'warning')
    .map((m) => ({
      field: m.field || '',
      message: m.message,
      severity: 'warning' as const,
    }));

  const errors: ValidationError[] = allMessages
    .filter((m) => m.type === 'error')
    .map((m) => ({
      field: m.field || '',
      message: m.message,
      severity: 'error' as const,
    }));

  // =========================================================================
  // Step 9: Return Final Output with Validation
  // =========================================================================

  return {
    ...outputsWithoutValidation,
    warnings,
    errors,
  };
}
