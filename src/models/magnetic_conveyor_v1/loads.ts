/**
 * MAGNETIC CONVEYOR v1.0 - LOAD CALCULATIONS
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * Pure functions for load calculations:
 * - Weight per foot (chain + magnets)
 * - Belt pull from friction
 * - Belt pull from gravity (incline)
 * - Total load
 *
 * All functions are pure (no side effects) and individually testable.
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const DEG_TO_RAD = Math.PI / 180;

// ============================================================================
// WEIGHT PER FOOT CALCULATION
// ============================================================================

/**
 * Calculate weight per foot of the belt (chain + magnets).
 *
 * Formula: weightPerFoot = chainWeight + (totalMagnetWeight / beltLength)
 *
 * This represents the distributed weight along the belt that contributes
 * to friction and gravity loads.
 *
 * @param chainWeightLbPerFt - Chain weight in lb/ft (2.0 for Standard, 3.0 for HD)
 * @param totalMagnetWeightLb - Total weight of all magnets in lbs
 * @param beltLengthFt - Belt length in feet
 * @returns Weight per foot in lb/ft
 */
export function calculateWeightPerFoot(
  chainWeightLbPerFt: number,
  totalMagnetWeightLb: number,
  beltLengthFt: number
): number {
  if (beltLengthFt <= 0) {
    return chainWeightLbPerFt;
  }

  return chainWeightLbPerFt + (totalMagnetWeightLb / beltLengthFt);
}

// ============================================================================
// FRICTION PULL CALCULATION
// ============================================================================

/**
 * Calculate belt pull from friction.
 *
 * Formula: beltPullFriction = weightPerFoot × beltLength × coefficientOfFriction
 *
 * This is the force required to overcome sliding friction of the chain
 * and magnets against the UHMW track.
 *
 * @param weightPerFootLb - Weight per foot in lb/ft
 * @param beltLengthFt - Belt length in feet
 * @param coefficientOfFriction - CoF (0.2 for Standard, 0.15 for HD)
 * @returns Belt pull from friction in lbs
 */
export function calculateBeltPullFriction(
  weightPerFootLb: number,
  beltLengthFt: number,
  coefficientOfFriction: number
): number {
  return weightPerFootLb * beltLengthFt * coefficientOfFriction;
}

// ============================================================================
// GRAVITY PULL CALCULATION
// ============================================================================

/**
 * Calculate belt pull from gravity (incline component).
 *
 * Formula: beltPullGravity = (inclineLength / 12) × weightPerFoot × sin(angle)
 *
 * This is the force required to lift the belt and magnets up the incline.
 * Returns 0 for Style C (horizontal only) when angle is 0.
 *
 * @param inclineLengthIn - Incline length in inches
 * @param weightPerFootLb - Weight per foot in lb/ft
 * @param angleDeg - Incline angle in degrees
 * @returns Belt pull from gravity in lbs
 */
export function calculateBeltPullGravity(
  inclineLengthIn: number,
  weightPerFootLb: number,
  angleDeg: number
): number {
  // Style C: horizontal only, no gravity component
  if (angleDeg === 0 || inclineLengthIn === 0) {
    return 0;
  }

  const angleRad = angleDeg * DEG_TO_RAD;
  const inclineLengthFt = inclineLengthIn / 12;

  return inclineLengthFt * weightPerFootLb * Math.sin(angleRad);
}

// ============================================================================
// TOTAL LOAD CALCULATION
// ============================================================================

/**
 * Calculate total load on the belt.
 *
 * Formula: totalLoad = beltPullFriction + beltPullGravity + chipLoad
 *
 * @param beltPullFrictionLb - Belt pull from friction in lbs
 * @param beltPullGravityLb - Belt pull from gravity in lbs
 * @param chipLoadLb - Chip load on bed in lbs (from throughput calculation)
 * @returns Total load in lbs
 */
export function calculateTotalLoad(
  beltPullFrictionLb: number,
  beltPullGravityLb: number,
  chipLoadLb: number
): number {
  return beltPullFrictionLb + beltPullGravityLb + chipLoadLb;
}

// ============================================================================
// COMPOSITE CALCULATION
// ============================================================================

/**
 * Result of all load calculations.
 */
export interface LoadResult {
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
}

/**
 * Calculate all load values in one call.
 *
 * This is a convenience function that calls all individual load
 * functions in the correct order.
 *
 * @param chainWeightLbPerFt - Chain weight in lb/ft
 * @param totalMagnetWeightLb - Total weight of all magnets in lbs
 * @param beltLengthFt - Belt length in feet
 * @param inclineLengthIn - Incline length in inches
 * @param angleDeg - Incline angle in degrees
 * @param coefficientOfFriction - Coefficient of friction
 * @param chipLoadLb - Chip load on bed in lbs (default: 0)
 * @returns All load calculation results
 */
export function calculateLoads(
  chainWeightLbPerFt: number,
  totalMagnetWeightLb: number,
  beltLengthFt: number,
  inclineLengthIn: number,
  angleDeg: number,
  coefficientOfFriction: number,
  chipLoadLb: number = 0
): LoadResult {
  const weight_per_foot_lb = calculateWeightPerFoot(
    chainWeightLbPerFt,
    totalMagnetWeightLb,
    beltLengthFt
  );

  const belt_pull_friction_lb = calculateBeltPullFriction(
    weight_per_foot_lb,
    beltLengthFt,
    coefficientOfFriction
  );

  const belt_pull_gravity_lb = calculateBeltPullGravity(
    inclineLengthIn,
    weight_per_foot_lb,
    angleDeg
  );

  const total_load_lb = calculateTotalLoad(
    belt_pull_friction_lb,
    belt_pull_gravity_lb,
    chipLoadLb
  );

  return {
    weight_per_foot_lb,
    belt_pull_friction_lb,
    belt_pull_gravity_lb,
    chip_load_lb: chipLoadLb,
    total_load_lb,
  };
}
