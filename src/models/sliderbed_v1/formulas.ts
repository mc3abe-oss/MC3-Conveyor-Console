/**
 * SLIDERBED CONVEYOR v1.11 - CALCULATION FORMULAS
 *
 * All formulas match Excel behavior exactly.
 * Units are explicit in variable names and comments.
 * No hidden conversions. No magic numbers.
 *
 * Execution order matters - formulas must be called in dependency order.
 *
 * CHANGELOG:
 * v1.12 (2025-12-25): Von Mises-based shaft diameter calculation, belt_width_in rename
 * v1.11 Phase 4 (2025-12-24): Cleat spacing multiplier for hot-welded PVC cleats
 * v1.11 (2025-12-24): Belt minimum pulley diameter outputs
 * v1.7 (2025-12-22): Chain ratio stage for bottom-mount gearmotor configuration
 * v1.6 (2025-12-22): Speed mode - Belt Speed + Motor RPM as primary inputs, derive Drive RPM
 * v1.5 (2025-12-21): Frame height modes, snub roller requirements, cost flags
 * v1.3 (2025-12-21): Split pulley diameter into drive/tail, update belt length formula
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
  FrameHeightMode,
  SpeedMode,
  GearmotorMountingStyle,
} from './schema';
import { normalizeInputsForCalculation, buildCleatsSummary } from './migrate';
import { getCleatSpacingMultiplier, roundUpToIncrement } from '../../lib/belt-catalog';
import { getShaftSizingFromOutputs } from './shaftCalc';
import { calculateTrackingRecommendation } from '../../lib/tracking';

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
 * Calculate total belt length in inches (LEGACY - single pulley diameter)
 *
 * Formula:
 *   total_belt_length_in = (2 * cc_length_in) + (PI * pulley_diameter_in)
 *
 * Note: Uses πD (half wrap) not 2πD (full wrap) for open-belt configuration
 *
 * @deprecated Use calculateTotalBeltLengthSplit for v1.3+ calculations
 */
export function calculateTotalBeltLength(
  conveyorLengthCcIn: number,
  pulleyDiameterIn: number
): number {
  return 2 * conveyorLengthCcIn + PI * pulleyDiameterIn;
}

/**
 * Calculate total belt length in inches (v1.3 - split pulley diameters)
 *
 * Formula:
 *   total_belt_length_in = (2 * cc_length_in) + PI * (drive_pulley_diameter_in + tail_pulley_diameter_in) / 2
 *
 * PARITY GUARANTEE: When drive == tail == D:
 *   = 2 * cc + PI * (D + D) / 2
 *   = 2 * cc + PI * D
 *   = legacy formula (bit-for-bit identical)
 *
 * Note: Uses half-wrap for each pulley in open-belt configuration
 */
export function calculateTotalBeltLengthSplit(
  conveyorLengthCcIn: number,
  drivePulleyDiameterIn: number,
  tailPulleyDiameterIn: number
): number {
  return 2 * conveyorLengthCcIn + PI * (drivePulleyDiameterIn + tailPulleyDiameterIn) / 2;
}

/**
 * Calculate belt weight in lbf (pounds-force)
 *
 * Formula:
 *   belt_weight_lb = belt_coeff_piw * belt_coeff_pil * belt_width_in * total_belt_length_in
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
 *   pulley_face_length_in = belt_width_in + pulley_face_extra_in
 */
export function calculatePulleyFaceLength(
  beltWidthIn: number,
  pulleyFaceExtraIn: number
): number {
  return beltWidthIn + pulleyFaceExtraIn;
}

/**
 * Calculate shaft diameter in inches (legacy heuristic method)
 *
 * @deprecated Use getShaftSizingFromOutputs from shaftCalc.ts for von Mises-based calculation
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
export function calculateShaftDiameterLegacy(
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
// v1.5: FRAME HEIGHT CALCULATIONS
// ============================================================================

/**
 * Frame height constants (v1.5)
 */
export const FRAME_HEIGHT_CONSTANTS = {
  /**
   * Standard frame height offset above largest pulley diameter.
   * Set to 2.5" to match the snub roller clearance threshold, ensuring
   * Standard mode never requires snub rollers.
   */
  STANDARD_OFFSET_IN: 2.5,
  /** Low profile frame height offset above drive pulley diameter */
  LOW_PROFILE_OFFSET_IN: 0.5,
  /** Minimum allowed frame height */
  MIN_FRAME_HEIGHT_IN: 3.0,
  /** Threshold below which design review is required */
  DESIGN_REVIEW_THRESHOLD_IN: 4.0,
} as const;

/**
 * Calculate effective frame height in inches based on mode
 *
 * Formula:
 *   Standard: drive_pulley_diameter_in + 1.0"
 *   Low Profile: drive_pulley_diameter_in + 0.5"
 *   Custom: user-specified custom_frame_height_in
 *
 * @param frameHeightMode - The frame height mode
 * @param drivePulleyDiameterIn - Drive pulley diameter in inches
 * @param customFrameHeightIn - Custom frame height (required if mode is Custom)
 * @returns Effective frame height in inches
 */
export function calculateEffectiveFrameHeight(
  frameHeightMode: FrameHeightMode | string | undefined,
  drivePulleyDiameterIn: number,
  customFrameHeightIn?: number
): number {
  const mode = frameHeightMode ?? FrameHeightMode.Standard;

  if (mode === FrameHeightMode.Custom || mode === 'Custom') {
    // Custom mode: use user-specified value, or fall back to standard if not provided
    return customFrameHeightIn ?? (drivePulleyDiameterIn + FRAME_HEIGHT_CONSTANTS.STANDARD_OFFSET_IN);
  }

  if (mode === FrameHeightMode.LowProfile || mode === 'Low Profile') {
    return drivePulleyDiameterIn + FRAME_HEIGHT_CONSTANTS.LOW_PROFILE_OFFSET_IN;
  }

  // Standard mode (default)
  return drivePulleyDiameterIn + FRAME_HEIGHT_CONSTANTS.STANDARD_OFFSET_IN;
}

/**
 * Snub roller clearance threshold constant (inches)
 *
 * Snub rollers are required when frame height doesn't provide sufficient clearance
 * above the largest pulley. This 2.5" threshold accounts for belt return path
 * geometry and pulley bearing housings in the high-tension zones near pulleys.
 */
export const SNUB_ROLLER_CLEARANCE_THRESHOLD_IN = 2.5;

/**
 * Determine if snub rollers are required
 *
 * Snub rollers handle HIGH-TENSION zones near the drive and tail pulleys.
 * They are required when the frame height doesn't provide enough clearance
 * above the largest pulley for the belt return path.
 *
 * Formula:
 *   requires_snub_rollers = frame_height_in < (largest_pulley_diameter_in + 2.5")
 *
 * Note: Snub rollers do NOT replace all gravity return rollers - they only
 * replace the ones at the ends (near pulleys). Gravity rollers still support
 * the mid-span belt return path.
 *
 * @param effectiveFrameHeightIn - Effective frame height in inches
 * @param drivePulleyDiameterIn - Drive pulley diameter in inches
 * @param tailPulleyDiameterIn - Tail pulley diameter in inches
 * @returns True if snub rollers are required
 */
export function calculateRequiresSnubRollers(
  effectiveFrameHeightIn: number,
  drivePulleyDiameterIn: number,
  tailPulleyDiameterIn: number
): boolean {
  const largestPulleyDiameter = Math.max(drivePulleyDiameterIn, tailPulleyDiameterIn);
  return effectiveFrameHeightIn < (largestPulleyDiameter + SNUB_ROLLER_CLEARANCE_THRESHOLD_IN);
}

/**
 * Gravity return roller spacing constant (inches)
 * Standard spacing for gravity return rollers under the belt return path
 */
export const GRAVITY_ROLLER_SPACING_IN = 60;

/**
 * Calculate the number of gravity return rollers needed
 *
 * Gravity return rollers support the belt in the FREE-SPAN zone (mid-section)
 * of the return path. They are spaced at regular intervals (typically 60" / 5 feet).
 *
 * IMPORTANT: When snub rollers are present, they handle the HIGH-TENSION zones
 * at both ends (near the pulleys). In this case, gravity rollers only cover
 * the mid-span, so we subtract 2 from the total count (one end roller replaced
 * by each snub).
 *
 * Layout:
 *   Without snubs: [gravity]---[gravity]---[gravity]---[gravity]
 *   With snubs:    [snub]---[gravity]---[gravity]---[snub]
 *
 * Formula:
 *   total_positions = floor(conveyor_length_cc_in / spacing) + 1
 *   gravity_count = requiresSnubs ? max(total_positions - 2, 0) : max(total_positions, 2)
 *
 * @param conveyorLengthCcIn - Center-to-center conveyor length in inches
 * @param requiresSnubRollers - Whether snub rollers are required (ends handled by snubs)
 * @param spacingIn - Spacing between rollers (default: 60")
 * @returns Number of gravity return rollers
 */
export function calculateGravityRollerQuantity(
  conveyorLengthCcIn: number,
  requiresSnubRollers: boolean,
  spacingIn: number = GRAVITY_ROLLER_SPACING_IN
): number {
  if (conveyorLengthCcIn <= 0) {
    return 0;
  }

  // Calculate total roller positions based on spacing
  const totalPositions = Math.floor(conveyorLengthCcIn / spacingIn) + 1;

  if (requiresSnubRollers) {
    // Snubs replace the end positions, gravity rollers cover mid-span only
    // If total positions <= 2, snubs handle everything, no gravity rollers needed
    return Math.max(totalPositions - 2, 0);
  }

  // No snubs: gravity rollers at all positions, minimum of 2
  return Math.max(totalPositions, 2);
}

/**
 * Calculate the number of snub rollers needed
 *
 * Snub rollers handle the HIGH-TENSION zones near the drive and tail pulleys.
 * They are required when frame height is below the clearance threshold.
 * Typically 2 rollers are needed (one at each end near the pulleys).
 *
 * Note: Snub rollers replace the END positions of gravity return rollers,
 * so gravity roller count should be reduced by 2 when snubs are present.
 *
 * @param requiresSnubRollers - Whether snub rollers are required
 * @returns Number of snub rollers (0 if not required, 2 if required)
 */
export function calculateSnubRollerQuantity(
  requiresSnubRollers: boolean
): number {
  return requiresSnubRollers ? 2 : 0;
}

/**
 * Calculate all cost flags for frame height configuration
 *
 * @param frameHeightMode - The frame height mode
 * @param effectiveFrameHeightIn - Effective frame height in inches
 * @param requiresSnubRollers - Whether snub rollers are required
 * @returns Object with all cost flag booleans
 */
export function calculateFrameHeightCostFlags(
  frameHeightMode: FrameHeightMode | string | undefined,
  effectiveFrameHeightIn: number,
  requiresSnubRollers: boolean
): {
  cost_flag_low_profile: boolean;
  cost_flag_custom_frame: boolean;
  cost_flag_snub_rollers: boolean;
  cost_flag_design_review: boolean;
} {
  const mode = frameHeightMode ?? FrameHeightMode.Standard;

  return {
    cost_flag_low_profile: mode === FrameHeightMode.LowProfile || mode === 'Low Profile',
    cost_flag_custom_frame: mode === FrameHeightMode.Custom || mode === 'Custom',
    cost_flag_snub_rollers: requiresSnubRollers,
    cost_flag_design_review: effectiveFrameHeightIn < FRAME_HEIGHT_CONSTANTS.DESIGN_REVIEW_THRESHOLD_IN,
  };
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

  // v1.3: Normalize pulley diameters (handles legacy migration)
  const { drivePulleyDiameterIn, tailPulleyDiameterIn } = normalizeInputsForCalculation(inputs);

  // Step 1: Belt weight coefficients (v1.3: uses drive pulley for PIW/PIL lookup)
  const { piw, pil, belt_piw_effective, belt_pil_effective } = calculateEffectiveBeltCoefficients(
    drivePulleyDiameterIn, // Use drive pulley for coefficient lookup
    parameters,
    inputs.belt_piw_override,
    inputs.belt_pil_override,
    inputs.belt_piw,
    inputs.belt_pil,
    inputs.belt_coeff_piw,
    inputs.belt_coeff_pil
  );

  // Step 2: Total belt length (v1.3: uses split pulley diameters)
  const totalBeltLengthIn = calculateTotalBeltLengthSplit(
    inputs.conveyor_length_cc_in,
    drivePulleyDiameterIn,
    tailPulleyDiameterIn
  );

  // Step 3: Belt weight
  const beltWeightLbf = calculateBeltWeight(
    piw,
    pil,
    inputs.belt_width_in,
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

  // =========================================================================
  // v1.6: SPEED MODE CALCULATION
  // =========================================================================
  // Determine speed mode (default to belt_speed for new behavior)
  const speedMode = inputs.speed_mode ?? SpeedMode.BeltSpeed;
  const isBeltSpeedMode = speedMode === SpeedMode.BeltSpeed || speedMode === 'belt_speed';

  let beltSpeedFpm: number;
  let driveShaftRpm: number;

  if (isBeltSpeedMode) {
    // Belt Speed mode (v1.6 default): User specifies belt_speed_fpm, derive drive_rpm
    // Formula: drive_rpm = belt_speed_fpm * 12 / (PI * drive_pulley_diameter_in)
    beltSpeedFpm = inputs.belt_speed_fpm;
    driveShaftRpm = calculateDriveShaftRpm(beltSpeedFpm, drivePulleyDiameterIn);
  } else {
    // Drive RPM mode (legacy): User specifies drive_rpm_input, derive belt_speed
    // Use drive_rpm_input if available, otherwise fall back to legacy drive_rpm
    const driveRpmInput = inputs.drive_rpm_input ?? inputs.drive_rpm;
    driveShaftRpm = driveRpmInput;
    beltSpeedFpm = calculateBeltSpeed(driveShaftRpm, drivePulleyDiameterIn);
  }

  // Step 12: Capacity (parts per hour)
  const capacityPph = calculateCapacity(beltSpeedFpm, pitchIn);

  // Step 14: Torque on drive shaft (v1.2: now uses user safety_factor if provided, v1.3: uses drive pulley)
  const torqueDriveShaftInlbf = calculateTorqueDriveShaft(
    totalBeltPullLb,
    drivePulleyDiameterIn,
    safetyFactor
  );

  // Step 15: Gear ratio (v1.2: now uses user motor_rpm if provided)
  const gearRatio = calculateGearRatio(motorRpm, driveShaftRpm);

  // =========================================================================
  // v1.7: CHAIN RATIO STAGE
  // =========================================================================
  // Calculate chain ratio based on gearmotor mounting style
  const mountingStyle = inputs.gearmotor_mounting_style ?? GearmotorMountingStyle.ShaftMounted;
  const isBottomMount = mountingStyle === GearmotorMountingStyle.BottomMount || mountingStyle === 'bottom_mount';

  let chainRatio: number;
  if (isBottomMount) {
    // Chain ratio = driven_teeth / driver_teeth
    // driver = gearmotor sprocket, driven = drive shaft sprocket
    const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
    const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;
    chainRatio = gmTeeth > 0 ? driveTeeth / gmTeeth : 1;
  } else {
    // Shaft-mounted: no chain, ratio = 1
    chainRatio = 1;
  }

  // Gearmotor output RPM required = drive_shaft_rpm * chain_ratio
  const gearmotorOutputRpm = driveShaftRpm * chainRatio;

  // Total drive ratio = gear_ratio * chain_ratio
  const totalDriveRatio = gearRatio * chainRatio;

  // Step 16: Throughput calculations (optional - only if required_throughput_pph provided)
  let targetPph: number | undefined;
  let meetsThroughput: boolean | undefined;
  let rpmRequiredForTarget: number | undefined;
  let throughputMarginAchievedPct: number | undefined;

  if (inputs.required_throughput_pph !== undefined && inputs.required_throughput_pph > 0) {
    targetPph = calculateTargetThroughput(inputs.required_throughput_pph, throughputMarginPct);
    meetsThroughput = capacityPph >= targetPph;
    rpmRequiredForTarget = calculateRpmRequired(targetPph, pitchIn, drivePulleyDiameterIn);
    throughputMarginAchievedPct = calculateMarginAchieved(capacityPph, inputs.required_throughput_pph);
  }

  // Step 17: Belt tracking & pulley face calculations
  const beltTrackingMethod = inputs.belt_tracking_method ?? BeltTrackingMethod.Crowned;
  const isVGuided = calculateIsVGuided(beltTrackingMethod);
  const pulleyRequiresCrown = calculatePulleyRequiresCrown(isVGuided);
  const pulleyFaceExtraIn = calculatePulleyFaceExtra(isVGuided, parameters);
  const pulleyFaceLengthIn = calculatePulleyFaceLength(inputs.belt_width_in, pulleyFaceExtraIn);

  // Step 18: Shaft diameter calculations (v1.12 - von Mises based)
  const shaftDiameterMode = inputs.shaft_diameter_mode ?? ShaftDiameterMode.Calculated;

  let driveShaftDiameterIn: number;
  let tailShaftDiameterIn: number;

  if (shaftDiameterMode === ShaftDiameterMode.Manual || shaftDiameterMode === 'Manual') {
    // Manual mode: use user-specified values
    driveShaftDiameterIn = inputs.drive_shaft_diameter_in ?? 1.0;
    tailShaftDiameterIn = inputs.tail_shaft_diameter_in ?? 1.0;
  } else {
    // Calculated mode: use von Mises-based shaft sizing
    const driveShaftSizing = getShaftSizingFromOutputs(
      inputs.belt_width_in,
      drivePulleyDiameterIn,
      totalBeltPullLb,
      true // is drive pulley
    );
    const tailShaftSizing = getShaftSizingFromOutputs(
      inputs.belt_width_in,
      tailPulleyDiameterIn,
      totalBeltPullLb,
      false // is tail pulley
    );

    driveShaftDiameterIn = driveShaftSizing.required_diameter_in;
    tailShaftDiameterIn = tailShaftSizing.required_diameter_in;
  }

  // Step 19: Frame height calculations (v1.5)
  const effectiveFrameHeightIn = calculateEffectiveFrameHeight(
    inputs.frame_height_mode,
    drivePulleyDiameterIn,
    inputs.custom_frame_height_in
  );
  // v1.5 FIX: Use largest pulley + 2.5" threshold for snub roller requirement
  const requiresSnubRollers = calculateRequiresSnubRollers(
    effectiveFrameHeightIn,
    drivePulleyDiameterIn,
    tailPulleyDiameterIn
  );
  const costFlags = calculateFrameHeightCostFlags(
    inputs.frame_height_mode,
    effectiveFrameHeightIn,
    requiresSnubRollers
  );

  // Step 20: Roller quantities (v1.5)
  // Note: Gravity roller count depends on whether snubs are present (snubs replace end positions)
  const snubRollerQuantity = calculateSnubRollerQuantity(requiresSnubRollers);
  const gravityRollerQuantity = calculateGravityRollerQuantity(
    inputs.conveyor_length_cc_in,
    requiresSnubRollers
  );

  // Step 21: Belt minimum pulley diameter requirements (v1.11)
  // Determine base minimum pulley diameter based on belt spec and tracking method
  const minPulleyBaseFromBelt = isVGuided
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;

  // Step 21b: Apply cleat spacing multiplier for hot-welded cleats (v1.11 Phase 4)
  // Multiplier applies when:
  // 1. Belt has a minimum requirement (belt is selected)
  // 2. Cleats are enabled
  // 3. Belt uses hot_welded cleat method
  const cleatsEnabled = inputs.cleats_enabled === true;
  const isHotWeldedCleats = inputs.belt_cleat_method === 'hot_welded';
  const cleatSpacingIn = inputs.cleat_spacing_in ?? 12; // Default to 12" if not specified

  let cleatSpacingMultiplier: number | undefined;
  let minPulleyDriveRequiredIn: number | undefined;
  let minPulleyTailRequiredIn: number | undefined;

  if (minPulleyBaseFromBelt !== undefined) {
    if (cleatsEnabled && isHotWeldedCleats) {
      // Apply multiplier and round UP to nearest 0.25"
      cleatSpacingMultiplier = getCleatSpacingMultiplier(cleatSpacingIn);
      const adjustedMin = roundUpToIncrement(
        minPulleyBaseFromBelt * cleatSpacingMultiplier,
        0.25
      );
      minPulleyDriveRequiredIn = adjustedMin;
      minPulleyTailRequiredIn = adjustedMin; // Same as drive in v1.11
    } else {
      // No multiplier - use base value
      cleatSpacingMultiplier = undefined;
      minPulleyDriveRequiredIn = minPulleyBaseFromBelt;
      minPulleyTailRequiredIn = minPulleyBaseFromBelt;
    }
  }

  // Check if current pulleys meet the minimum (undefined if no belt selected)
  const drivePulleyMeetsMinimum = minPulleyDriveRequiredIn !== undefined
    ? drivePulleyDiameterIn >= minPulleyDriveRequiredIn
    : undefined;
  const tailPulleyMeetsMinimum = minPulleyTailRequiredIn !== undefined
    ? tailPulleyDiameterIn >= minPulleyTailRequiredIn
    : undefined;

  // Step 22: Tracking recommendation (v1.13)
  const trackingRecommendation = calculateTrackingRecommendation({
    conveyor_length_cc_in: inputs.conveyor_length_cc_in,
    belt_width_in: inputs.belt_width_in,
    application_class: inputs.application_class,
    belt_construction: inputs.belt_construction,
    reversing_operation: inputs.reversing_operation,
    disturbance_side_loading: inputs.disturbance_side_loading,
    disturbance_load_variability: inputs.disturbance_load_variability,
    disturbance_environment: inputs.disturbance_environment,
    disturbance_installation_risk: inputs.disturbance_installation_risk,
    tracking_preference: inputs.tracking_preference,
  });

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

    // v1.6: Speed mode
    speed_mode_used: speedMode,

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

    // v1.7: Chain ratio stage
    chain_ratio: chainRatio,
    gearmotor_output_rpm: gearmotorOutputRpm,
    total_drive_ratio: totalDriveRatio,

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

    // v1.3: Split pulley diameters
    drive_pulley_diameter_in: drivePulleyDiameterIn,
    tail_pulley_diameter_in: tailPulleyDiameterIn,

    // v1.11: Belt minimum pulley diameter outputs
    min_pulley_drive_required_in: minPulleyDriveRequiredIn,
    min_pulley_tail_required_in: minPulleyTailRequiredIn,
    drive_pulley_meets_minimum: drivePulleyMeetsMinimum,
    tail_pulley_meets_minimum: tailPulleyMeetsMinimum,

    // v1.11 Phase 4: Cleat spacing multiplier outputs
    min_pulley_base_in: minPulleyBaseFromBelt,
    cleat_spacing_multiplier: cleatSpacingMultiplier,

    // v1.3: Cleats (spec-only, no calculation impact)
    cleats_enabled: inputs.cleats_enabled ?? false,
    cleats_summary: buildCleatsSummary(inputs),

    // v1.5: Frame height & snub roller outputs
    effective_frame_height_in: effectiveFrameHeightIn,
    requires_snub_rollers: requiresSnubRollers,
    ...costFlags,

    // v1.5: Roller quantities
    gravity_roller_quantity: gravityRollerQuantity,
    gravity_roller_spacing_in: GRAVITY_ROLLER_SPACING_IN,
    snub_roller_quantity: snubRollerQuantity,

    // v1.13: Tracking recommendation outputs
    tracking_lw_ratio: trackingRecommendation.tracking_lw_ratio,
    tracking_lw_band: trackingRecommendation.tracking_lw_band,
    tracking_disturbance_count: trackingRecommendation.tracking_disturbance_count,
    tracking_disturbance_severity_raw: trackingRecommendation.tracking_disturbance_severity_raw,
    tracking_disturbance_severity_modified: trackingRecommendation.tracking_disturbance_severity_modified,
    tracking_mode_recommended: trackingRecommendation.tracking_mode_recommended,
    tracking_recommendation_note: trackingRecommendation.tracking_recommendation_note,
    tracking_recommendation_rationale: trackingRecommendation.tracking_recommendation_rationale,
  };
}
