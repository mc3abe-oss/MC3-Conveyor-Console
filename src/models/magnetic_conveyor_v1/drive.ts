/**
 * MAGNETIC CONVEYOR v1.0 - DRIVE CALCULATIONS
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * Pure functions for drive calculations:
 * - Total belt pull (starting + load)
 * - Running torque
 * - Total torque (with safety factor)
 * - Required RPM
 * - Suggested gear ratio
 *
 * Note: HP calculation removed per reference doc - motor selection done via
 * NORD catalog based on torque and speed requirements.
 *
 * All functions are pure (no side effects) and individually testable.
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

// ============================================================================
// BELT PULL CALCULATION
// ============================================================================

/**
 * Calculate total belt pull (starting pull + load).
 *
 * Formula: totalBeltPull = startingBeltPull + totalLoad
 *
 * The starting belt pull is a fixed constant (100 lb) that accounts for
 * the minimum force needed to overcome initial static friction.
 *
 * @param startingBeltPullLb - Starting belt pull in lbs (typically 100)
 * @param totalLoadLb - Total load from friction, gravity, and chips in lbs
 * @returns Total belt pull in lbs
 */
export function calculateTotalBeltPull(
  startingBeltPullLb: number,
  totalLoadLb: number
): number {
  return startingBeltPullLb + totalLoadLb;
}

// ============================================================================
// TORQUE CALCULATIONS
// ============================================================================

/**
 * Calculate running torque at the drive sprocket.
 *
 * Formula: runningTorque = totalBeltPull × (sprocketPD / 2)
 *
 * This is the torque required to maintain belt movement under load.
 *
 * @param totalBeltPullLb - Total belt pull in lbs
 * @param sprocketPitchDiameterIn - Sprocket pitch diameter in inches (4.5 std, 6.74 HD)
 * @returns Running torque in in-lb
 */
export function calculateRunningTorque(
  totalBeltPullLb: number,
  sprocketPitchDiameterIn: number
): number {
  return totalBeltPullLb * (sprocketPitchDiameterIn / 2);
}

/**
 * Calculate total torque with safety factor.
 *
 * Formula: totalTorque = runningTorque × safetyFactor
 *
 * The safety factor accounts for startup loads, shock loads, and
 * application uncertainty. Standard = 2.0, Heavy Duty = 1.5.
 *
 * @param runningTorqueInLb - Running torque in in-lb
 * @param safetyFactor - Safety factor (2.0 for Standard, 1.5 for HD)
 * @returns Total torque in in-lb (for gearbox selection)
 */
export function calculateTotalTorque(
  runningTorqueInLb: number,
  safetyFactor: number
): number {
  return runningTorqueInLb * safetyFactor;
}

// ============================================================================
// SPEED CALCULATIONS
// ============================================================================

/**
 * Calculate required output shaft RPM.
 *
 * Formula: requiredRPM = (beltSpeed × 12) / lead
 *
 * Converts belt speed (FPM) to output shaft RPM based on sprocket lead.
 * Lead = teeth × pitch / 2 (14 for Standard, 21 for HD).
 *
 * @param beltSpeedFpm - Belt speed in feet per minute
 * @param leadInPerRev - Sprocket lead in inches per revolution (14 std, 21 HD)
 * @returns Required output shaft RPM
 */
export function calculateRequiredRpm(
  beltSpeedFpm: number,
  leadInPerRev: number
): number {
  if (leadInPerRev <= 0) {
    return 0;
  }
  return (beltSpeedFpm * 12) / leadInPerRev;
}

/**
 * Calculate suggested gear ratio for motor selection.
 *
 * Formula: gearRatio = motorBaseRPM / requiredRPM
 *
 * Standard NORD gear ratios: 30:1, 40:1, 50:1, 60:1, 80:1, 100:1
 * (varies by gearbox model)
 *
 * @param motorBaseRpm - Motor base speed in RPM (typically 1750)
 * @param requiredRpm - Required output shaft RPM
 * @returns Suggested gear ratio (actual ratio should be selected from standard options)
 */
export function calculateSuggestedGearRatio(
  motorBaseRpm: number,
  requiredRpm: number
): number {
  if (requiredRpm <= 0) {
    return 0;
  }
  return motorBaseRpm / requiredRpm;
}

// ============================================================================
// COMPOSITE CALCULATION
// ============================================================================

/**
 * Result of all drive calculations.
 */
export interface DriveResult {
  /** Total belt pull in lbs (starting + load) */
  total_belt_pull_lb: number;
  /** Running torque in in-lb */
  running_torque_in_lb: number;
  /** Total torque in in-lb (with safety factor) */
  total_torque_in_lb: number;
  /** Required output shaft RPM */
  required_rpm: number;
  /** Suggested gear ratio */
  suggested_gear_ratio: number;
}

/**
 * Calculate all drive values in one call.
 *
 * This is a convenience function that calls all individual drive
 * functions in the correct order.
 *
 * @param startingBeltPullLb - Starting belt pull in lbs (typically 100)
 * @param totalLoadLb - Total load from friction, gravity, and chips in lbs
 * @param sprocketPitchDiameterIn - Sprocket pitch diameter in inches
 * @param safetyFactor - Safety factor (2.0 for Standard, 1.5 for HD)
 * @param beltSpeedFpm - Belt speed in feet per minute
 * @param leadInPerRev - Sprocket lead in inches per revolution
 * @param motorBaseRpm - Motor base speed in RPM (typically 1750)
 * @returns All drive calculation results
 */
export function calculateDrive(
  startingBeltPullLb: number,
  totalLoadLb: number,
  sprocketPitchDiameterIn: number,
  safetyFactor: number,
  beltSpeedFpm: number,
  leadInPerRev: number,
  motorBaseRpm: number
): DriveResult {
  const total_belt_pull_lb = calculateTotalBeltPull(
    startingBeltPullLb,
    totalLoadLb
  );

  const running_torque_in_lb = calculateRunningTorque(
    total_belt_pull_lb,
    sprocketPitchDiameterIn
  );

  const total_torque_in_lb = calculateTotalTorque(
    running_torque_in_lb,
    safetyFactor
  );

  const required_rpm = calculateRequiredRpm(beltSpeedFpm, leadInPerRev);

  const suggested_gear_ratio = calculateSuggestedGearRatio(
    motorBaseRpm,
    required_rpm
  );

  return {
    total_belt_pull_lb,
    running_torque_in_lb,
    total_torque_in_lb,
    required_rpm,
    suggested_gear_ratio,
  };
}
