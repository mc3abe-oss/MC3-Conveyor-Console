/**
 * Gearmotor Candidate Evaluation Helper
 *
 * Centralized logic for evaluating whether a gearmotor candidate
 * passes requirements and computing derived values like margin.
 *
 * CANONICAL FORMULAS (single source of truth):
 *
 * SERVICE FACTOR APPLICATION:
 * - required_torque_with_sf = required_output_torque_lb_in * service_factor_applied
 * - candidate_available_torque = catalog_output_torque_lb_in (exact catalog value, NO SF applied)
 *
 * PASS/FAIL RULES:
 * - passTorque = candidate_available_torque >= required_torque_with_sf
 * - passRpm = candidate RPM within tolerance of required RPM
 *
 * MARGIN (only for passing candidates):
 * - marginPct = (candidate_available_torque - required_torque_with_sf) / required_torque_with_sf * 100
 */

export interface EvaluationInputs {
  requiredTorque: number; // Base required torque (before SF)
  requiredRpm: number;
  serviceFactor: number; // Applied service factor
  candidateTorque: number; // Raw catalog torque (no SF applied)
  candidateRpm: number;
  speedTolerancePct?: number; // Default 15%
}

export interface EvaluationResult {
  // Pass/fail
  passTorque: boolean;
  passRpm: boolean;
  passAll: boolean;

  // Computed values
  requiredTorqueWithSF: number; // requiredTorque * serviceFactor
  candidateAvailableTorque: number; // Raw catalog torque (no SF)
  marginPct: number; // ((candidate - required_with_sf) / required_with_sf) * 100
  rpmDeltaPct: number; // ((candidateRpm - requiredRpm) / requiredRpm) * 100
}

/**
 * Evaluate a gearmotor candidate against requirements.
 *
 * @param inputs - The candidate and requirement values
 * @returns Evaluation result with pass/fail status and computed values
 */
export function evaluateGearmotorCandidate(inputs: EvaluationInputs): EvaluationResult {
  const {
    requiredTorque,
    requiredRpm,
    serviceFactor,
    candidateTorque,
    candidateRpm,
    speedTolerancePct = 15,
  } = inputs;

  // SERVICE FACTOR APPLICATION (per canonical formulas)
  // SF is applied to REQUIREMENT, not to candidate
  const requiredTorqueWithSF = requiredTorque * serviceFactor;
  const candidateAvailableTorque = candidateTorque; // Raw catalog value, NO SF

  // TORQUE PASS: candidate must meet or exceed required torque WITH SF
  const passTorque = candidateAvailableTorque >= requiredTorqueWithSF;

  // RPM PASS: candidate RPM must be within tolerance of required RPM
  const rpmDeltaPct =
    requiredRpm > 0 ? ((candidateRpm - requiredRpm) / requiredRpm) * 100 : 0;
  const passRpm = Math.abs(rpmDeltaPct) <= speedTolerancePct;

  // MARGIN: (candidate - required_with_sf) / required_with_sf * 100
  // Only meaningful for passing candidates, but we compute it regardless
  const marginPct =
    requiredTorqueWithSF > 0
      ? ((candidateAvailableTorque - requiredTorqueWithSF) / requiredTorqueWithSF) * 100
      : 0;

  // Overall pass
  const passAll = passTorque && passRpm;

  return {
    passTorque,
    passRpm,
    passAll,
    requiredTorqueWithSF,
    candidateAvailableTorque,
    marginPct,
    rpmDeltaPct,
  };
}

/**
 * Format margin percentage for display.
 * Returns a rounded integer.
 */
export function formatMarginPct(marginPct: number): number {
  return Math.round(marginPct);
}
