/**
 * SLIDERBED CONVEYOR v1.2 - CALCULATION FORMULAS
 *
 * All formulas match Excel behavior exactly.
 * Units are explicit in variable names and comments.
 * No hidden conversions. No magic numbers.
 *
 * Execution order matters - formulas must be called in dependency order.
 *
 * CHANGELOG:
 * v1.2 (2025-12-19): Make key parameters power-user editable (safety_factor, belt coeffs, base pull)
 * v1.1 (2025-12-19): Fix open-belt wrap length: use πD not 2πD
 * v1.0 (2024-12-19): Initial implementation
 */

import {
  SliderbedInputs,
  SliderbedParameters,
  SliderbedOutputs,
  Orientation,
  BeltTrackingMethod,
  ShaftDiameterMode,
} from './schema';

// ============================================================================
// CONSTANTS
// ============================================================================

const PI = Math.PI;

// ============================================================================
// INTERMEDIATE CALCULATIONS
// ============================================================================

/**
 * Calculate effective belt PIW/PIL values
 *
 * v1.3: Compute effective values from override → catalog → parameter defaults chain
 *
 * Priority order:
 *   1. belt_piw_override / belt_pil_override (user-entered values)
 *   2. belt_piw / belt_pil (from catalog when belt is selected)
 *   3. belt_coeff_piw / belt_coeff_pil (advanced parameter overrides)
 *   4. Parameter defaults (pulley-diameter-based: 0.138 for 2.5", 0.109 otherwise)
 */
export function calculateEffectiveBeltCoefficients(
  pulleyDiameterIn: number,
  params: SliderbedParameters,
  beltPiwOverride?: number,
  beltPilOverride?: number,
  beltPiwFromCatalog?: number,
  beltPilFromCatalog?: number,
  advancedPiw?: number,
  advancedPil?: number
): { piw: number; pil: number; belt_piw_effective: number; belt_pil_effective: number } {
  // Compute belt-specific effective values (override → catalog)
  const beltPiwEffective = beltPiwOverride ?? beltPiwFromCatalog;
  const beltPilEffective = beltPilOverride ?? beltPilFromCatalog;

  // Compute final PIW/PIL used in calculations (belt effective → advanced → default)
  const defaultPiw = pulleyDiameterIn === 2.5 ? params.piw_2p5 : params.piw_other;
  const defaultPil = pulleyDiameterIn === 2.5 ? params.pil_2p5 : params.pil_other;

  const piw = beltPiwEffective ?? advancedPiw ?? defaultPiw;
  const pil = beltPilEffective ?? advancedPil ?? defaultPil;

  return {
    piw,
    pil,
    belt_piw_effective: beltPiwEffective ?? piw,
    belt_pil_effective: beltPilEffective ?? pil,
  };
}

/**
 * Calculate belt weight coefficients (piw, pil)
 *
 * v1.2: Now accepts user overrides, otherwise falls back to pulley-diameter-based defaults
 * @deprecated Use calculateEffectiveBeltCoefficients for new code
 *
 * Logic:
 *   If user provided belt_coeff_piw/pil, use those
 *   Otherwise: piw = IF(pulley_diameter_in == 2.5, 0.138, 0.109), pil = piw
 */
export function calculateBeltWeightCoefficients(
  pulleyDiameterIn: number,
  params: SliderbedParameters,
  userPiw?: number,
  userPil?: number
): { piw: number; pil: number } {
  const piw = userPiw ?? (pulleyDiameterIn === 2.5 ? params.piw_2p5 : params.piw_other);
  const pil = userPil ?? (pulleyDiameterIn === 2.5 ? params.pil_2p5 : params.pil_other);

  return { piw, pil };
}

/**
 * Calculate total belt length in inches
 *
 * Formula:
 *   total_belt_length_in = (2 * cc_length_in) + (PI * pulley_diameter_in)
 *
 * Note: Uses πD (half wrap) not 2πD (full wrap) for open-belt configuration
 */
export function calculateTotalBeltLength(
  conveyorLengthCcIn: number,
  pulleyDiameterIn: number
): number {
  return 2 * conveyorLengthCcIn + PI * pulleyDiameterIn;
}

/**
 * Calculate belt weight in lbf (pounds-force)
 *
 * Formula:
 *   belt_weight_lb = belt_coeff_piw * belt_coeff_pil * conveyor_width_in * total_belt_length_in
 */
export function calculateBeltWeight(
  piw: number,
  pil: number,
  beltWidthIn: number,
  totalBeltLengthIn: number
): number {
  return piw * pil * beltWidthIn * totalBeltLengthIn;
}

/**
 * Calculate number of parts on belt
 *
 * Formula:
 *   parts_on_belt = conveyor_length_cc_in / (travel_dim_in + part_spacing_in)
 *
 * Where travel_dim_in is part_length_in (lengthwise) or part_width_in (crosswise)
 */
export function calculatePartsOnBelt(
  conveyorLengthCcIn: number,
  partLengthIn: number,
  partWidthIn: number,
  partSpacingIn: number,
  orientation: Orientation
): number {
  const travelDim = orientation === Orientation.Lengthwise ? partLengthIn : partWidthIn;
  return conveyorLengthCcIn / (travelDim + partSpacingIn);
}

/**
 * Calculate load on belt from parts in lbf
 *
 * Formula:
 *   load_on_belt_lbs = parts_on_belt * part_weight_lbs
 */
export function calculateLoadOnBelt(
  partsOnBelt: number,
  partWeightLbs: number
): number {
  return partsOnBelt * partWeightLbs;
}

/**
 * Calculate total load (belt + parts) in lbf
 *
 * Formula:
 *   total_load_lbs = belt_weight_lbs + load_on_belt_lbs
 */
export function calculateTotalLoad(
  beltWeightLbf: number,
  loadOnBeltLbf: number
): number {
  return beltWeightLbf + loadOnBeltLbf;
}

/**
 * Calculate average load per foot in lbf/ft
 *
 * Formula:
 *   avg_load_per_ft = total_load_lbs / (cc_length_in / 12)
 *
 * Note: cc_length_in / 12 converts inches to feet
 */
export function calculateAvgLoadPerFoot(
  totalLoadLbf: number,
  conveyorLengthCcIn: number
): number {
  const conveyorLengthFt = conveyorLengthCcIn / 12;
  return totalLoadLbf / conveyorLengthFt;
}

/**
 * Calculate belt pull (friction-based) in lbf
 *
 * Formula:
 *   belt_pull_calc = (avg_load_per_ft * friction_coeff) * (cc_length_in / 12)
 */
export function calculateBeltPull(
  avgLoadPerFt: number,
  frictionCoeff: number,
  conveyorLengthCcIn: number
): number {
  const conveyorLengthFt = conveyorLengthCcIn / 12;
  return avgLoadPerFt * frictionCoeff * conveyorLengthFt;
}

/**
 * Calculate friction pull in lb
 *
 * Formula:
 *   friction_pull_lb = friction_coeff * total_load_lb
 *
 * Note: Friction is conservatively assumed to act on the full load regardless of incline
 */
export function calculateFrictionPull(
  frictionCoeff: number,
  totalLoadLb: number
): number {
  return frictionCoeff * totalLoadLb;
}

/**
 * Calculate incline pull in lb
 *
 * Formula:
 *   incline_pull_lb = total_load_lb * sin(incline_rad)
 *   where incline_rad = incline_deg * PI / 180
 */
export function calculateInclinePull(
  totalLoadLb: number,
  inclineDeg: number
): number {
  const inclineRad = (inclineDeg * PI) / 180;
  return totalLoadLb * Math.sin(inclineRad);
}

/**
 * Calculate total belt pull in lb
 *
 * Formula:
 *   total_belt_pull_lb = friction_pull_lb + incline_pull_lb + starting_belt_pull_lb
 *
 * Note: Starting belt pull is a fixed value (not per-foot)
 */
export function calculateTotalBeltPull(
  frictionPullLb: number,
  inclinePullLb: number,
  startingBeltPullLb: number
): number {
  return frictionPullLb + inclinePullLb + startingBeltPullLb;
}

/**
 * Calculate drive shaft RPM
 *
 * Formula:
 *   drive_shaft_rpm = belt_speed_fpm / ((pulley_diameter_in / 12) * PI)
 *
 * Note: pulley_diameter_in / 12 converts inches to feet
 */
export function calculateDriveShaftRpm(
  beltSpeedFpm: number,
  pulleyDiameterIn: number
): number {
  const pulleyDiameterFt = pulleyDiameterIn / 12;
  return beltSpeedFpm / (pulleyDiameterFt * PI);
}

/**
 * Calculate torque on drive shaft in in-lbf (inch-pounds-force)
 *
 * Formula:
 *   torque_drive_shaft_inlb = total_belt_pull_lb * (pulley_diameter_in/2) * safety_factor
 */
export function calculateTorqueDriveShaft(
  totalBeltPullLbf: number,
  pulleyDiameterIn: number,
  safetyFactor: number
): number {
  return totalBeltPullLbf * (pulleyDiameterIn / 2) * safetyFactor;
}

/**
 * Calculate gear ratio
 *
 * Formula:
 *   gear_ratio = motor_rpm / drive_shaft_rpm
 */
export function calculateGearRatio(motorRpm: number, driveShaftRpm: number): number {
  return motorRpm / driveShaftRpm;
}

// ============================================================================
// THROUGHPUT CALCULATIONS
// ============================================================================

/**
 * Calculate pitch in inches
 *
 * Formula:
 *   pitch_in = travel_dim_in + part_spacing_in
 *
 * Where travel_dim_in is part_length_in (lengthwise) or part_width_in (crosswise)
 */
export function calculatePitch(
  partLengthIn: number,
  partWidthIn: number,
  partSpacingIn: number,
  orientation: Orientation
): number {
  const travelDim = orientation === Orientation.Lengthwise ? partLengthIn : partWidthIn;
  return travelDim + partSpacingIn;
}

/**
 * Calculate belt speed in FPM from drive RPM
 *
 * Formula:
 *   belt_speed_fpm = drive_rpm * (PI * (pulley_diameter_in / 12))
 *
 * Note: pulley_diameter_in / 12 converts inches to feet
 * This is the inverse of calculateDriveShaftRpm
 */
export function calculateBeltSpeed(
  driveRpm: number,
  pulleyDiameterIn: number
): number {
  const pulleyDiameterFt = pulleyDiameterIn / 12;
  return driveRpm * (PI * pulleyDiameterFt);
}

/**
 * Calculate capacity in parts per hour
 *
 * Formula:
 *   capacity_pph = (belt_speed_fpm * 12 * 60) / pitch_in
 *
 * Note: 12 converts feet to inches, 60 converts minutes to hours
 */
export function calculateCapacity(
  beltSpeedFpm: number,
  pitchIn: number
): number {
  return (beltSpeedFpm * 12 * 60) / pitchIn;
}

/**
 * Calculate target throughput with margin
 *
 * Formula:
 *   target_pph = required_throughput_pph * (1 + throughput_margin_pct / 100)
 */
export function calculateTargetThroughput(
  requiredThroughputPph: number,
  throughputMarginPct: number
): number {
  return requiredThroughputPph * (1 + throughputMarginPct / 100);
}

/**
 * Calculate RPM required to achieve target throughput
 *
 * Formula:
 *   rpm_required = (target_pph * pitch_in) / (12 * 60 * PI * (pulley_diameter_in / 12))
 *
 * This is derived by solving capacity formula for drive_rpm
 */
export function calculateRpmRequired(
  targetPph: number,
  pitchIn: number,
  pulleyDiameterIn: number
): number {
  const pulleyDiameterFt = pulleyDiameterIn / 12;
  return (targetPph * pitchIn) / (12 * 60 * PI * pulleyDiameterFt);
}

/**
 * Calculate throughput margin achieved in percent
 *
 * Formula:
 *   margin_achieved_pct = (capacity_pph / required_throughput_pph - 1) * 100
 *
 * Note: Returns 0 if required_throughput_pph is 0 (guard against division by zero)
 */
export function calculateMarginAchieved(
  capacityPph: number,
  requiredThroughputPph: number
): number {
  if (requiredThroughputPph === 0) return 0;
  return (capacityPph / requiredThroughputPph - 1) * 100;
}

// ============================================================================
// BELT TRACKING & PULLEY CALCULATIONS
// ============================================================================

/**
 * Determine if belt tracking method is V-guided
 *
 * Formula:
 *   is_v_guided = (belt_tracking_method === 'V-guided')
 */
export function calculateIsVGuided(beltTrackingMethod: BeltTrackingMethod | string): boolean {
  return beltTrackingMethod === BeltTrackingMethod.VGuided || beltTrackingMethod === 'V-guided';
}

/**
 * Determine if pulley requires crown
 *
 * Formula:
 *   pulley_requires_crown = !is_v_guided
 *
 * Note: V-guided belts don't need crown, crowned belts need crown on at least one pulley
 */
export function calculatePulleyRequiresCrown(isVGuided: boolean): boolean {
  return !isVGuided;
}

/**
 * Calculate pulley face extra allowance in inches
 *
 * Formula:
 *   pulley_face_extra_in = is_v_guided ? 0.5 : 2.0
 *
 * Note: V-guided needs less extra face width since the V-guide keeps belt centered
 */
export function calculatePulleyFaceExtra(
  isVGuided: boolean,
  params: SliderbedParameters
): number {
  return isVGuided
    ? params.pulley_face_extra_v_guided_in
    : params.pulley_face_extra_crowned_in;
}

/**
 * Calculate pulley face length in inches
 *
 * Formula:
 *   pulley_face_length_in = conveyor_width_in + pulley_face_extra_in
 */
export function calculatePulleyFaceLength(
  conveyorWidthIn: number,
  pulleyFaceExtraIn: number
): number {
  return conveyorWidthIn + pulleyFaceExtraIn;
}

/**
 * Calculate shaft diameter in inches
 *
 * If shaft_diameter_mode is 'Manual', use the provided value
 * If shaft_diameter_mode is 'Calculated', use a default lookup (simplified for now)
 *
 * Formula (simplified):
 *   For calculated mode, use a torque-based lookup or a simple heuristic
 *   Current implementation uses a simplified approach:
 *   - For small conveyors (width <= 18"): 1.0"
 *   - For medium conveyors (width <= 36"): 1.25"
 *   - For large conveyors (width > 36"): 1.5"
 *
 * Note: In production, this would reference a shaft selection table
 */
export function calculateShaftDiameter(
  shaftDiameterMode: ShaftDiameterMode | string,
  manualDiameter: number | undefined,
  conveyorWidthIn: number,
  _torqueDriveShaftInlbf: number // Reserved for future torque-based shaft sizing
): number {
  if (shaftDiameterMode === ShaftDiameterMode.Manual || shaftDiameterMode === 'Manual') {
    return manualDiameter ?? 1.0;
  }

  // Calculated mode: simple heuristic based on width and torque
  // This is a simplified placeholder - real implementation would use shaft selection tables
  if (conveyorWidthIn <= 18) {
    return 1.0;
  } else if (conveyorWidthIn <= 36) {
    return 1.25;
  } else {
    return 1.5;
  }
}

// ============================================================================
// MASTER CALCULATION FUNCTION
// ============================================================================

/**
 * Execute all calculations in proper dependency order
 *
 * This is a pure function - no side effects, no I/O, no mutations.
 * Given inputs and parameters, it returns outputs.
 */
export function calculate(
  inputs: SliderbedInputs,
  parameters: SliderbedParameters
): SliderbedOutputs {
  // Apply defaults for optional inputs
  // Note: conveyor_incline_deg is not used in current formula set but reserved for future incline calculations
  const partSpacingIn = inputs.part_spacing_in ?? 0;
  const throughputMarginPct = inputs.throughput_margin_pct ?? 0;

  // v1.2: Extract power-user parameters with fallbacks
  const safetyFactor = inputs.safety_factor ?? parameters.safety_factor;
  const startingBeltPullLb = inputs.starting_belt_pull_lb ?? parameters.starting_belt_pull_lb;
  const frictionCoeff = inputs.friction_coeff ?? parameters.friction_coeff;
  const motorRpm = inputs.motor_rpm ?? parameters.motor_rpm;

  // Step 1: Belt weight coefficients (v1.3: now uses effective belt coefficients)
  const { piw, pil, belt_piw_effective, belt_pil_effective } = calculateEffectiveBeltCoefficients(
    inputs.pulley_diameter_in,
    parameters,
    inputs.belt_piw_override,
    inputs.belt_pil_override,
    inputs.belt_piw,
    inputs.belt_pil,
    inputs.belt_coeff_piw,
    inputs.belt_coeff_pil
  );

  // Step 2: Total belt length
  const totalBeltLengthIn = calculateTotalBeltLength(
    inputs.conveyor_length_cc_in,
    inputs.pulley_diameter_in
  );

  // Step 3: Belt weight
  const beltWeightLbf = calculateBeltWeight(
    piw,
    pil,
    inputs.conveyor_width_in,
    totalBeltLengthIn
  );

  // Step 4: Parts on belt
  const partsOnBelt = calculatePartsOnBelt(
    inputs.conveyor_length_cc_in,
    inputs.part_length_in,
    inputs.part_width_in,
    partSpacingIn,
    inputs.orientation
  );

  // Step 5: Load on belt from parts
  const loadOnBeltLbf = calculateLoadOnBelt(partsOnBelt, inputs.part_weight_lbs);

  // Step 6: Total load
  const totalLoadLbf = calculateTotalLoad(beltWeightLbf, loadOnBeltLbf);

  // Step 7: Average load per foot
  const avgLoadPerFt = calculateAvgLoadPerFoot(
    totalLoadLbf,
    inputs.conveyor_length_cc_in
  );

  // Step 8: Legacy belt pull calculation (kept for compatibility)
  const beltPullCalcLb = calculateBeltPull(
    avgLoadPerFt,
    frictionCoeff,
    inputs.conveyor_length_cc_in
  );

  // Step 9: Friction pull (conservative: acts on full load regardless of incline)
  const frictionPullLb = calculateFrictionPull(frictionCoeff, totalLoadLbf);

  // Step 10: Incline pull (gravitational component)
  const inclineDeg = inputs.conveyor_incline_deg ?? 0;
  const inclinePullLb = calculateInclinePull(totalLoadLbf, inclineDeg);

  // Step 11: Total belt pull (friction + incline + starting)
  const totalBeltPullLb = calculateTotalBeltPull(
    frictionPullLb,
    inclinePullLb,
    startingBeltPullLb
  );

  // Step 12: Pitch (travel dimension + spacing)
  const pitchIn = calculatePitch(
    inputs.part_length_in,
    inputs.part_width_in,
    partSpacingIn,
    inputs.orientation
  );

  // Step 11: Belt speed (derived from drive RPM)
  const beltSpeedFpm = calculateBeltSpeed(
    inputs.drive_rpm,
    inputs.pulley_diameter_in
  );

  // Step 12: Capacity (parts per hour)
  const capacityPph = calculateCapacity(beltSpeedFpm, pitchIn);

  // Step 13: Drive shaft RPM (same as drive_rpm input for now, but keep for backwards compatibility)
  const driveShaftRpm = inputs.drive_rpm;

  // Step 14: Torque on drive shaft (v1.2: now uses user safety_factor if provided)
  const torqueDriveShaftInlbf = calculateTorqueDriveShaft(
    totalBeltPullLb,
    inputs.pulley_diameter_in,
    safetyFactor
  );

  // Step 15: Gear ratio (v1.2: now uses user motor_rpm if provided)
  const gearRatio = calculateGearRatio(motorRpm, driveShaftRpm);

  // Step 16: Throughput calculations (optional - only if required_throughput_pph provided)
  let targetPph: number | undefined;
  let meetsThroughput: boolean | undefined;
  let rpmRequiredForTarget: number | undefined;
  let throughputMarginAchievedPct: number | undefined;

  if (inputs.required_throughput_pph !== undefined && inputs.required_throughput_pph > 0) {
    targetPph = calculateTargetThroughput(inputs.required_throughput_pph, throughputMarginPct);
    meetsThroughput = capacityPph >= targetPph;
    rpmRequiredForTarget = calculateRpmRequired(targetPph, pitchIn, inputs.pulley_diameter_in);
    throughputMarginAchievedPct = calculateMarginAchieved(capacityPph, inputs.required_throughput_pph);
  }

  // Step 17: Belt tracking & pulley face calculations
  const beltTrackingMethod = inputs.belt_tracking_method ?? BeltTrackingMethod.Crowned;
  const isVGuided = calculateIsVGuided(beltTrackingMethod);
  const pulleyRequiresCrown = calculatePulleyRequiresCrown(isVGuided);
  const pulleyFaceExtraIn = calculatePulleyFaceExtra(isVGuided, parameters);
  const pulleyFaceLengthIn = calculatePulleyFaceLength(inputs.conveyor_width_in, pulleyFaceExtraIn);

  // Step 18: Shaft diameter calculations
  const shaftDiameterMode = inputs.shaft_diameter_mode ?? ShaftDiameterMode.Calculated;
  const driveShaftDiameterIn = calculateShaftDiameter(
    shaftDiameterMode,
    inputs.drive_shaft_diameter_in,
    inputs.conveyor_width_in,
    torqueDriveShaftInlbf
  );
  const tailShaftDiameterIn = calculateShaftDiameter(
    shaftDiameterMode,
    inputs.tail_shaft_diameter_in,
    inputs.conveyor_width_in,
    torqueDriveShaftInlbf * 0.5 // Tail shaft typically sees less torque
  );

  // Return all outputs
  return {
    // Intermediate outputs
    parts_on_belt: partsOnBelt,
    load_on_belt_lbf: loadOnBeltLbf,
    belt_weight_lbf: beltWeightLbf,
    total_load_lbf: totalLoadLbf,
    total_belt_length_in: totalBeltLengthIn,
    friction_pull_lb: frictionPullLb,
    incline_pull_lb: inclinePullLb,
    starting_belt_pull_lb: startingBeltPullLb,
    total_belt_pull_lb: totalBeltPullLb,
    belt_pull_calc_lb: beltPullCalcLb,
    piw_used: piw,
    pil_used: pil,
    belt_piw_effective,
    belt_pil_effective,

    // Throughput outputs
    pitch_in: pitchIn,
    belt_speed_fpm: beltSpeedFpm,
    capacity_pph: capacityPph,
    target_pph: targetPph,
    meets_throughput: meetsThroughput,
    rpm_required_for_target: rpmRequiredForTarget,
    throughput_margin_achieved_pct: throughputMarginAchievedPct,

    // Final outputs
    drive_shaft_rpm: driveShaftRpm,
    torque_drive_shaft_inlbf: torqueDriveShaftInlbf,
    gear_ratio: gearRatio,
    safety_factor_used: safetyFactor,
    starting_belt_pull_lb_used: startingBeltPullLb,
    friction_coeff_used: frictionCoeff,
    motor_rpm_used: motorRpm,

    // Belt tracking & pulley outputs
    is_v_guided: isVGuided,
    pulley_requires_crown: pulleyRequiresCrown,
    pulley_face_extra_in: pulleyFaceExtraIn,
    pulley_face_length_in: pulleyFaceLengthIn,
    drive_shaft_diameter_in: driveShaftDiameterIn,
    tail_shaft_diameter_in: tailShaftDiameterIn,
  };
}
