/**
 * MAGNETIC CONVEYOR v1.0 - GEOMETRY CALCULATIONS
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * Pure functions for geometry calculations:
 * - Incline length and run
 * - Path length and belt length
 * - Chain length (rounded to pitch)
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
// INCLINE CALCULATIONS
// ============================================================================

/**
 * Calculate incline length from discharge height and angle.
 *
 * Formula: inclineLength = dischargeHeight / sin(angle)
 *
 * For Style C (horizontal only), returns 0 when height or angle is 0.
 *
 * @param dischargeHeightIn - Discharge height in inches
 * @param angleDeg - Incline angle in degrees
 * @returns Incline length in inches
 */
export function calculateInclineLength(
  dischargeHeightIn: number,
  angleDeg: number
): number {
  // Style C case: horizontal only
  if (dischargeHeightIn === 0 || angleDeg === 0) {
    return 0;
  }

  const angleRad = angleDeg * DEG_TO_RAD;
  const sinAngle = Math.sin(angleRad);

  // Guard against division by zero (shouldn't happen with valid angles)
  if (sinAngle === 0) {
    return 0;
  }

  return dischargeHeightIn / sinAngle;
}

/**
 * Calculate incline run (horizontal projection) from discharge height and angle.
 *
 * Formula: inclineRun = dischargeHeight / tan(angle)
 *
 * For Style C (horizontal only), returns 0 when height or angle is 0.
 *
 * @param dischargeHeightIn - Discharge height in inches
 * @param angleDeg - Incline angle in degrees
 * @returns Incline run (horizontal projection) in inches
 */
export function calculateInclineRun(
  dischargeHeightIn: number,
  angleDeg: number
): number {
  // Style C case: horizontal only
  if (dischargeHeightIn === 0 || angleDeg === 0) {
    return 0;
  }

  const angleRad = angleDeg * DEG_TO_RAD;
  const tanAngle = Math.tan(angleRad);

  // Guard against division by zero (shouldn't happen with valid angles)
  if (tanAngle === 0) {
    return 0;
  }

  // At 90°, tan approaches infinity, run approaches 0
  if (angleDeg === 90) {
    return 0;
  }

  return dischargeHeightIn / tanAngle;
}

// ============================================================================
// LENGTH CALCULATIONS
// ============================================================================

/**
 * Calculate total horizontal length.
 *
 * Formula: horizontalLength = infeed + inclineRun + discharge
 *
 * @param infeedLengthIn - Infeed length in inches
 * @param inclineRunIn - Incline run (horizontal projection) in inches
 * @param dischargeLengthIn - Discharge length in inches
 * @returns Total horizontal length in inches
 */
export function calculateHorizontalLength(
  infeedLengthIn: number,
  inclineRunIn: number,
  dischargeLengthIn: number
): number {
  return infeedLengthIn + inclineRunIn + dischargeLengthIn;
}

/**
 * Calculate path length (one side of chain).
 *
 * Formula: pathLength = (infeed + inclineLength + discharge) / 12
 *
 * This is the actual travel distance along the conveyor path.
 *
 * @param infeedLengthIn - Infeed length in inches
 * @param inclineLengthIn - Incline length in inches
 * @param dischargeLengthIn - Discharge length in inches
 * @returns Path length in feet
 */
export function calculatePathLength(
  infeedLengthIn: number,
  inclineLengthIn: number,
  dischargeLengthIn: number
): number {
  return (infeedLengthIn + inclineLengthIn + dischargeLengthIn) / 12;
}

/**
 * Calculate belt length (both sides of chain).
 *
 * Formula: beltLength = pathLength * 2
 *
 * The belt travels the full path on top and returns underneath.
 *
 * @param pathLengthFt - Path length in feet
 * @returns Belt length in feet
 */
export function calculateBeltLength(pathLengthFt: number): number {
  return pathLengthFt * 2;
}

/**
 * Calculate chain length rounded up to nearest pitch.
 *
 * Formula: chainLength = ceil(beltLength * 12 / chainPitch) * chainPitch
 *
 * From drawing notes: "round chain up to nearest pitch"
 *
 * @param beltLengthFt - Belt length in feet
 * @param chainPitchIn - Chain pitch in inches (1.0 for Standard, 1.5 for Heavy Duty)
 * @returns Chain length in inches (rounded up to nearest pitch)
 */
export function calculateChainLength(
  beltLengthFt: number,
  chainPitchIn: number
): number {
  const rawLengthIn = beltLengthFt * 12;
  const pitchCount = Math.ceil(rawLengthIn / chainPitchIn);
  return pitchCount * chainPitchIn;
}

// ============================================================================
// COMPOSITE CALCULATION
// ============================================================================

/**
 * Result of all geometry calculations.
 */
export interface GeometryResult {
  /** Incline length in inches */
  incline_length_in: number;
  /** Incline run (horizontal projection) in inches */
  incline_run_in: number;
  /** Total horizontal length in inches */
  horizontal_length_in: number;
  /** Path length in feet (one side) */
  path_length_ft: number;
  /** Belt length in feet (both sides) */
  belt_length_ft: number;
  /** Chain length in inches (rounded to pitch) */
  chain_length_in: number;
}

/**
 * Calculate all geometry values in one call.
 *
 * This is a convenience function that calls all individual geometry
 * functions in the correct order.
 *
 * @param infeedLengthIn - Infeed length in inches
 * @param dischargeHeightIn - Discharge height in inches
 * @param angleDeg - Incline angle in degrees
 * @param dischargeLengthIn - Discharge length in inches
 * @param chainPitchIn - Chain pitch in inches
 * @returns All geometry calculation results
 */
export function calculateGeometry(
  infeedLengthIn: number,
  dischargeHeightIn: number,
  angleDeg: number,
  dischargeLengthIn: number,
  chainPitchIn: number
): GeometryResult {
  // Step 1: Incline calculations
  const incline_length_in = calculateInclineLength(dischargeHeightIn, angleDeg);
  const incline_run_in = calculateInclineRun(dischargeHeightIn, angleDeg);

  // Step 2: Horizontal length
  const horizontal_length_in = calculateHorizontalLength(
    infeedLengthIn,
    incline_run_in,
    dischargeLengthIn
  );

  // Step 3: Path and belt length
  const path_length_ft = calculatePathLength(
    infeedLengthIn,
    incline_length_in,
    dischargeLengthIn
  );
  const belt_length_ft = calculateBeltLength(path_length_ft);

  // Step 4: Chain length (rounded to pitch)
  const chain_length_in = calculateChainLength(belt_length_ft, chainPitchIn);

  return {
    incline_length_in,
    incline_run_in,
    horizontal_length_in,
    path_length_ft,
    belt_length_ft,
    chain_length_in,
  };
}
