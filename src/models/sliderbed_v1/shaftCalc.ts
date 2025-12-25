/**
 * Shaft Diameter Calculator (v1.12)
 *
 * Calculates required shaft diameter for conveyor pulleys based on
 * combined bending and torsion using von Mises yield criterion.
 *
 * Key assumptions:
 * - Simply supported shaft with center load
 * - 1045 steel default (Sy = 45,000 psi)
 * - Keyway stress concentration Kt = 1.6 for drive pulleys
 * - Euler-Eytelwein belt tension relationship
 * - Deflection limit: 0.001 x bearing span
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface ShaftSizingInputs {
  /** Belt width in inches */
  belt_width_in: number;

  /** Pulley diameter in inches */
  pulley_diameter_in: number;

  /** Effective belt tension (Te) in lbf - from belt pull calculations */
  effective_tension_lbf: number;

  /** Is this the drive pulley (has torque)? */
  is_drive_pulley: boolean;

  /** Belt wrap angle in degrees (default: 180) */
  wrap_angle_deg?: number;

  /** Coefficient of friction - pulley to belt (default: 0.3 for lagged) */
  friction_coefficient?: number;

  /** Bearing span in inches (default: belt_width + 5") */
  bearing_span_in?: number;

  /** Shaft material yield strength in psi (default: 45,000 for 1045 steel) */
  yield_strength_psi?: number;

  /** Safety factor (default: 3.0) */
  safety_factor?: number;

  /** Service factor for dynamic loads (default: 1.2) */
  service_factor?: number;
}

export interface ShaftSizingResult {
  /** Required shaft diameter in inches (rounded up to standard size) */
  required_diameter_in: number;

  /** Calculated minimum diameter before rounding */
  calculated_diameter_in: number;

  /** Tight side tension T1 in lbf */
  T1_lbf: number;

  /** Slack side tension T2 in lbf */
  T2_lbf: number;

  /** Radial load on bearings in lbf */
  radial_load_lbf: number;

  /** Bending moment in in-lbf */
  bending_moment_inlbf: number;

  /** Torque in in-lbf (0 for tail pulley) */
  torque_inlbf: number;

  /** Von Mises equivalent stress at calculated diameter in psi */
  von_mises_stress_psi: number;

  /** Shaft deflection at pulley center in inches */
  deflection_in: number;

  /** Is deflection within acceptable limits? */
  deflection_ok: boolean;

  /** Bearing span used in calculation */
  bearing_span_in: number;

  /** Wrap angle used in calculation */
  wrap_angle_deg: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Standard shaft diameters in inches */
export const STANDARD_SHAFT_DIAMETERS = [
  0.5, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25, 1.375, 1.5,
  1.625, 1.75, 1.875, 2.0, 2.25, 2.5, 2.75, 3.0,
];

/** Modulus of elasticity for steel in psi */
const E_STEEL_PSI = 30e6;

/** Default yield strength for 1045 steel in psi */
const DEFAULT_YIELD_STRENGTH_PSI = 45000;

/** Default safety factor */
const DEFAULT_SAFETY_FACTOR = 3.0;

/** Default service factor for dynamic loads */
const DEFAULT_SERVICE_FACTOR = 1.2;

/** Default wrap angle in degrees */
const DEFAULT_WRAP_ANGLE_DEG = 180;

/** Default coefficient of friction (lagged pulley) */
const DEFAULT_FRICTION_COEFFICIENT = 0.3;

/** Default bearing span offset from belt width */
const DEFAULT_BEARING_SPAN_OFFSET_IN = 5;

/** Keyway stress concentration factor for drive shafts */
const KEYWAY_STRESS_CONCENTRATION = 1.6;

/** Maximum deflection as fraction of bearing span */
const MAX_DEFLECTION_RATIO = 0.001;

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate required shaft diameter for a conveyor pulley
 *
 * Uses von Mises yield criterion for combined bending and torsion:
 *   σ_vm = √(σ_b² + 3τ²)
 *
 * Shaft diameter formula:
 *   d = ∛( (32 × SF × Kt / (π × Sy)) × √(M² + 0.75×T²) )
 */
export function calculateShaftDiameter(inputs: ShaftSizingInputs): ShaftSizingResult {
  // Apply defaults
  const wrapAngleDeg = inputs.wrap_angle_deg ?? DEFAULT_WRAP_ANGLE_DEG;
  const mu = inputs.friction_coefficient ?? DEFAULT_FRICTION_COEFFICIENT;
  const bearingSpan = inputs.bearing_span_in ?? (inputs.belt_width_in + DEFAULT_BEARING_SPAN_OFFSET_IN);
  const Sy = inputs.yield_strength_psi ?? DEFAULT_YIELD_STRENGTH_PSI;
  const SF = inputs.safety_factor ?? DEFAULT_SAFETY_FACTOR;
  const serviceFactor = inputs.service_factor ?? DEFAULT_SERVICE_FACTOR;

  // Convert wrap angle to radians
  const theta = (wrapAngleDeg * Math.PI) / 180;

  // Calculate tension ratio from Euler-Eytelwein formula
  // T1/T2 = e^(μθ)
  const tensionRatio = Math.exp(mu * theta);

  // Apply service factor to effective tension
  const Te = inputs.effective_tension_lbf * serviceFactor;

  // Handle edge case of zero tension
  if (Te <= 0) {
    return createMinimalResult(inputs, bearingSpan, wrapAngleDeg);
  }

  // Calculate T1 and T2 from Te and ratio
  // Te = T1 - T2
  // T1 = T2 × ratio
  // Therefore: Te = T2 × ratio - T2 = T2 × (ratio - 1)
  const T2 = Te / (tensionRatio - 1);
  const T1 = T2 * tensionRatio;

  // Radial load on shaft (vector sum of tensions)
  // For any wrap angle: R = √(T1² + T2² - 2×T1×T2×cos(θ))
  const radialLoad = Math.sqrt(
    T1 * T1 + T2 * T2 - 2 * T1 * T2 * Math.cos(theta)
  );

  // Bending moment (simply supported shaft, center load)
  // M = W × L / 4
  const M = (radialLoad * bearingSpan) / 4;

  // Torque (only for drive pulley)
  // T = Te × pulley_radius
  const pulleyRadius = inputs.pulley_diameter_in / 2;
  const torque = inputs.is_drive_pulley ? Te * pulleyRadius : 0;

  // Keyway stress concentration factor
  const Kt = inputs.is_drive_pulley ? KEYWAY_STRESS_CONCENTRATION : 1.0;

  // Calculate required diameter using von Mises criterion
  // d = ∛( (32 × SF × Kt / (π × Sy)) × √(M² + 0.75×T²) )
  const equivalentMoment = Math.sqrt(M * M + 0.75 * torque * torque);
  const calculatedDiameter = Math.pow(
    (32 * SF * Kt * equivalentMoment) / (Math.PI * Sy),
    1 / 3
  );

  // Round up to next standard size
  const requiredDiameter =
    STANDARD_SHAFT_DIAMETERS.find((d) => d >= calculatedDiameter) ??
    Math.ceil(calculatedDiameter * 4) / 4; // Round to nearest 0.25" if beyond standard sizes

  // Calculate actual von Mises stress at selected diameter
  const d = requiredDiameter;
  const sigma_b = (32 * M * Kt) / (Math.PI * Math.pow(d, 3));
  const tau = (16 * torque) / (Math.PI * Math.pow(d, 3));
  const vonMisesStress = Math.sqrt(sigma_b * sigma_b + 3 * tau * tau);

  // Deflection check (simply supported, center load)
  // δ = W × L³ / (48 × E × I)
  const I = (Math.PI * Math.pow(d, 4)) / 64;
  const deflection = (radialLoad * Math.pow(bearingSpan, 3)) / (48 * E_STEEL_PSI * I);
  const maxDeflection = MAX_DEFLECTION_RATIO * bearingSpan;
  const deflectionOk = deflection <= maxDeflection;

  return {
    required_diameter_in: requiredDiameter,
    calculated_diameter_in: roundTo(calculatedDiameter, 3),
    T1_lbf: roundTo(T1, 1),
    T2_lbf: roundTo(T2, 1),
    radial_load_lbf: roundTo(radialLoad, 1),
    bending_moment_inlbf: Math.round(M),
    torque_inlbf: Math.round(torque),
    von_mises_stress_psi: Math.round(vonMisesStress),
    deflection_in: roundTo(deflection, 4),
    deflection_ok: deflectionOk,
    bearing_span_in: bearingSpan,
    wrap_angle_deg: wrapAngleDeg,
  };
}

/**
 * Helper to get shaft sizing from existing formula outputs
 *
 * This is the primary integration point for formulas.ts
 */
export function getShaftSizingFromOutputs(
  beltWidthIn: number,
  pulleyDiameterIn: number,
  totalBeltPullLb: number,
  isDrivePulley: boolean
): ShaftSizingResult {
  return calculateShaftDiameter({
    belt_width_in: beltWidthIn,
    pulley_diameter_in: pulleyDiameterIn,
    effective_tension_lbf: totalBeltPullLb,
    is_drive_pulley: isDrivePulley,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Round a number to specified decimal places
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Create a minimal result for edge cases (zero tension, etc.)
 */
function createMinimalResult(
  _inputs: ShaftSizingInputs,
  bearingSpan: number,
  wrapAngleDeg: number
): ShaftSizingResult {
  // Return minimum standard shaft size
  const minDiameter = STANDARD_SHAFT_DIAMETERS[0];

  return {
    required_diameter_in: minDiameter,
    calculated_diameter_in: minDiameter,
    T1_lbf: 0,
    T2_lbf: 0,
    radial_load_lbf: 0,
    bending_moment_inlbf: 0,
    torque_inlbf: 0,
    von_mises_stress_psi: 0,
    deflection_in: 0,
    deflection_ok: true,
    bearing_span_in: bearingSpan,
    wrap_angle_deg: wrapAngleDeg,
  };
}

/**
 * Get the next standard shaft diameter above a given size
 */
export function getNextStandardDiameter(minDiameter: number): number {
  return (
    STANDARD_SHAFT_DIAMETERS.find((d) => d >= minDiameter) ??
    Math.ceil(minDiameter * 4) / 4
  );
}

/**
 * Check if a diameter is a standard size
 */
export function isStandardDiameter(diameter: number): boolean {
  return STANDARD_SHAFT_DIAMETERS.includes(diameter);
}
