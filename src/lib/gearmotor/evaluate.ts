/**
 * Gearmotor Candidate Evaluation Helper
 *
 * Centralized logic for evaluating whether a gearmotor candidate
 * passes requirements and computing derived values like margin.
 *
 * CANONICAL FORMULAS (single source of truth):
 *
 * SERVICE FACTOR:
 * - SF affects FILTERING ONLY (done in selector.ts)
 * - Filtering rule: service_factor_catalog >= applied_service_factor
 * - SF does NOT affect torque capacity calculations
 *
 * PASS/FAIL RULES:
 * - passTorque = catalog_torque >= raw_required_torque (no SF adjustment)
 * - passRpm = candidate RPM within tolerance of required RPM
 *
 * MARGIN (uses RAW required torque, no SF multiplier):
 * - margin = (catalog_output_torque_lb_in / required_output_torque_raw) - 1
 * - marginPct = margin * 100
 */

export interface EvaluationInputs {
  requiredTorque: number; // Raw required torque (no SF applied)
  requiredRpm: number;
  serviceFactor: number; // Applied service factor (used for SF filtering info only)
  candidateTorque: number; // Raw catalog torque
  candidateSF: number; // Catalog service factor
  candidateRpm: number;
  speedTolerancePct?: number; // Default 15%
}

export interface EvaluationResult {
  // Pass/fail
  passTorque: boolean;
  passRpm: boolean;
  passSF: boolean; // catalog SF >= applied SF
  passAll: boolean;

  // Computed values
  requiredTorqueRaw: number; // Raw required torque (no SF)
  candidateAvailableTorque: number; // Raw catalog torque
  marginPct: number; // ((catalog_torque / raw_required_torque) - 1) * 100
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
    candidateSF = 1.0,
    candidateRpm,
    speedTolerancePct = 15,
  } = inputs;

  // Raw values (no SF adjustment)
  const requiredTorqueRaw = requiredTorque;
  const candidateAvailableTorque = candidateTorque;

  // SF PASS: catalog SF must meet or exceed applied SF
  const passSF = candidateSF >= serviceFactor;

  // TORQUE PASS: catalog torque >= raw required torque (no SF adjustment)
  const passTorque = candidateAvailableTorque >= requiredTorqueRaw;

  // RPM PASS: candidate RPM must be within tolerance of required RPM
  const rpmDeltaPct =
    requiredRpm > 0 ? ((candidateRpm - requiredRpm) / requiredRpm) * 100 : 0;
  const passRpm = Math.abs(rpmDeltaPct) <= speedTolerancePct;

  // MARGIN: (catalog_torque / raw_required_torque) - 1
  // Uses RAW required torque, NO SF multiplier
  const marginPct =
    requiredTorqueRaw > 0
      ? ((candidateAvailableTorque / requiredTorqueRaw) - 1) * 100
      : 0;

  // Overall pass requires all three conditions
  const passAll = passTorque && passRpm && passSF;

  return {
    passTorque,
    passRpm,
    passSF,
    passAll,
    requiredTorqueRaw,
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
