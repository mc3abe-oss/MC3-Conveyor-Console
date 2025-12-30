/**
 * PCI Tube Stress Calculations (v1.27)
 *
 * Implements PCI Conveyor Pulley Selection Guide Rev 2.1 tube stress formula.
 * Source: Appendix A, p.34
 *
 * Key formula:
 *   σ = 8(OD)(F)(H) / (π(OD⁴ - ID⁴))
 *
 * Where:
 * - OD = tube outer diameter (inches)
 * - ID = OD - 2×wall (tube inner diameter)
 * - F = radial_load_lbf (PCI "F" - resultant pulley load)
 * - H = hub_centers_in (hub center-to-center distance)
 *
 * Stress limits per PCI:
 * - 10,000 psi for drum (plain) pulleys
 * - 3,400 psi for V-groove pulleys
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PciTubeStressInputs {
  /** Tube outer diameter in inches */
  tube_od_in: number;
  /** Tube wall thickness in inches */
  tube_wall_in: number;
  /** Hub center-to-center distance in inches */
  hub_centers_in: number;
  /** Radial load on pulley (PCI "F") in lbf */
  radial_load_lbf: number;
}

export interface PciTubeStressResult {
  /** Calculated tube stress in psi (undefined if geometry invalid/incomplete) */
  stress_psi: number | undefined;
  /**
   * Check status:
   * - "pass": stress ≤ limit, all geometry provided
   * - "estimated": stress ≤ limit but hub_centers was defaulted
   * - "warn": stress > limit (default mode)
   * - "fail": stress > limit (enforce mode)
   * - "incomplete": missing tube geometry inputs
   * - "error": invalid geometry (ID≤0 or OD⁴-ID⁴≤0)
   */
  status: 'pass' | 'estimated' | 'warn' | 'fail' | 'incomplete' | 'error';
  /** Error message when status is 'error' */
  error_message?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum tube stress for drum (plain) pulleys in psi */
export const PCI_TUBE_STRESS_LIMIT_DRUM_PSI = 10000;

/** Maximum tube stress for V-groove pulleys in psi */
export const PCI_TUBE_STRESS_LIMIT_VGROOVE_PSI = 3400;

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate PCI tube stress and determine check status.
 *
 * PCI Formula: σ = 8(OD)(F)(H) / (π(OD⁴ - ID⁴))
 *
 * @param inputs - Tube geometry and load inputs
 * @param stressLimitPsi - Applicable stress limit (10,000 or 3,400 psi)
 * @param hubCentersEstimated - True if hub_centers was defaulted (not user-provided)
 * @param enforceChecks - True to return "fail" instead of "warn" when exceeded
 * @returns Tube stress result with status
 */
export function calculatePciTubeStress(
  inputs: PciTubeStressInputs,
  stressLimitPsi: number,
  hubCentersEstimated: boolean,
  enforceChecks: boolean
): PciTubeStressResult {
  const { tube_od_in: OD, tube_wall_in: wall, hub_centers_in: H, radial_load_lbf: F } = inputs;

  // Geometry guardrails (Edit #3)
  if (OD <= 0 || wall <= 0) {
    return { stress_psi: undefined, status: 'incomplete' };
  }

  const ID = OD - 2 * wall;
  if (ID <= 0) {
    return {
      stress_psi: undefined,
      status: 'error',
      error_message: `Invalid tube geometry: wall thickness (${wall}") exceeds radius (${OD / 2}")`,
    };
  }

  const od4 = Math.pow(OD, 4);
  const id4 = Math.pow(ID, 4);
  if (od4 - id4 <= 0) {
    return {
      stress_psi: undefined,
      status: 'error',
      error_message: `Invalid tube geometry: OD⁴ - ID⁴ ≤ 0`,
    };
  }

  // PCI Formula: σ = 8(OD)(F)(H) / (π(OD⁴ - ID⁴))
  const numerator = 8 * OD * F * H;
  const denominator = Math.PI * (od4 - id4);
  const stressPsi = numerator / denominator;

  // Determine status
  const exceeds = stressPsi > stressLimitPsi;
  let status: PciTubeStressResult['status'];

  if (exceeds) {
    status = enforceChecks ? 'fail' : 'warn';
  } else if (hubCentersEstimated) {
    status = 'estimated'; // Edit #2: flag as estimated, not authoritative pass
  } else {
    status = 'pass';
  }

  return { stress_psi: Math.round(stressPsi), status };
}

/**
 * Determine tube stress limit based on pulley type.
 *
 * LIMITATION (Edit #4): Currently uses belt tracking method as proxy for V-groove.
 * If pulley catalog has face_profile or pulley_type field, prefer that instead.
 *
 * @param isVGroovePulley - True if pulley has V-groove
 * @returns Applicable stress limit in psi
 */
export function getTubeStressLimit(isVGroovePulley: boolean): number {
  return isVGroovePulley ? PCI_TUBE_STRESS_LIMIT_VGROOVE_PSI : PCI_TUBE_STRESS_LIMIT_DRUM_PSI;
}

/**
 * Detect if pulley is V-groove based on tracking method.
 *
 * LIMITATION: This is a proxy detection. Ideally would use pulley catalog data.
 * Current logic: V-groove if tracking is V-guided AND v_guide_key is set.
 *
 * @param beltTrackingMethod - Belt tracking method (V-guided or Crowned)
 * @param vGuideKey - Selected V-guide key (undefined if no V-guide selected)
 * @returns True if pulley is V-groove
 */
export function isVGroovePulley(
  beltTrackingMethod: string | undefined,
  vGuideKey: string | undefined
): boolean {
  return beltTrackingMethod === 'V-guided' && vGuideKey !== undefined;
}
