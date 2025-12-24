/**
 * Geometry Utilities (v1.10)
 *
 * Functions for converting between different geometry representations:
 * - L_cc (axis length between pulley centers)
 * - H_cc (horizontal projection/run)
 * - theta (incline angle in degrees)
 * - TOB (Top of Belt) and centerline heights
 *
 * These utilities support three geometry input modes:
 * - L_ANGLE: User specifies L_cc + angle -> derive H_cc
 * - H_ANGLE: User specifies H_cc + angle -> derive L_cc
 * - H_TOB: User specifies H_cc + both TOBs -> derive angle + L_cc
 */

import { SliderbedInputs, GeometryMode } from './schema';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Threshold below which angle is treated as horizontal (0°) */
const HORIZONTAL_THRESHOLD_DEG = 0.01;

/** Maximum supported incline angle (matches existing rules.ts limit) */
const MAX_INCLINE_DEG = 45;

/**
 * Check if an angle should be treated as horizontal (effectively 0°)
 */
export function isEffectivelyHorizontal(angleDeg: number): boolean {
  return Math.abs(angleDeg) < HORIZONTAL_THRESHOLD_DEG;
}

/**
 * Calculate axis length (L_cc) from horizontal run (H_cc) and angle.
 *
 * L_cc = H_cc / cos(theta)
 *
 * @param horizontalRunIn - Horizontal run in inches (H_cc)
 * @param angleDeg - Incline angle in degrees
 * @returns Axis length in inches (L_cc)
 */
export function axisFromHorizontal(horizontalRunIn: number, angleDeg: number): number {
  if (horizontalRunIn <= 0) return 0;
  if (isEffectivelyHorizontal(angleDeg)) return horizontalRunIn;

  const angleRad = angleDeg * DEG_TO_RAD;
  const cosTheta = Math.cos(angleRad);

  // Guard against near-vertical angles where cos approaches 0
  if (Math.abs(cosTheta) < 0.01) {
    // At 89.4°, cos is ~0.01. Return a large but finite value.
    return horizontalRunIn / 0.01;
  }

  return horizontalRunIn / cosTheta;
}

/**
 * Calculate horizontal run (H_cc) from axis length (L_cc) and angle.
 *
 * H_cc = L_cc * cos(theta)
 *
 * @param axisLengthIn - Axis length in inches (L_cc)
 * @param angleDeg - Incline angle in degrees
 * @returns Horizontal run in inches (H_cc)
 */
export function horizontalFromAxis(axisLengthIn: number, angleDeg: number): number {
  if (axisLengthIn <= 0) return 0;
  if (isEffectivelyHorizontal(angleDeg)) return axisLengthIn;

  const angleRad = angleDeg * DEG_TO_RAD;
  return axisLengthIn * Math.cos(angleRad);
}

/**
 * Calculate rise from axis length and angle.
 *
 * rise = L_cc * sin(theta)
 *
 * @param axisLengthIn - Axis length in inches (L_cc)
 * @param angleDeg - Incline angle in degrees
 * @returns Rise in inches (positive = incline toward drive)
 */
export function riseFromAxisAndAngle(axisLengthIn: number, angleDeg: number): number {
  if (axisLengthIn <= 0) return 0;
  if (isEffectivelyHorizontal(angleDeg)) return 0;

  const angleRad = angleDeg * DEG_TO_RAD;
  return axisLengthIn * Math.sin(angleRad);
}

/**
 * Calculate rise from horizontal run and angle.
 *
 * rise = H_cc * tan(theta)
 *
 * @param horizontalRunIn - Horizontal run in inches (H_cc)
 * @param angleDeg - Incline angle in degrees
 * @returns Rise in inches (positive = incline toward drive)
 */
export function riseFromHorizontalAndAngle(horizontalRunIn: number, angleDeg: number): number {
  if (horizontalRunIn <= 0) return 0;
  if (isEffectivelyHorizontal(angleDeg)) return 0;

  const angleRad = angleDeg * DEG_TO_RAD;
  return horizontalRunIn * Math.tan(angleRad);
}

/**
 * Convert Top of Belt (TOB) height to centerline height.
 *
 * CL = TOB - (pulley_diameter / 2)
 *
 * @param tobIn - Top of Belt height in inches
 * @param pulleyDiameterIn - Pulley diameter in inches
 * @returns Centerline height in inches
 */
export function tobToCenterline(tobIn: number, pulleyDiameterIn: number): number {
  return tobIn - pulleyDiameterIn / 2;
}

/**
 * Convert centerline height to Top of Belt (TOB) height.
 *
 * TOB = CL + (pulley_diameter / 2)
 *
 * @param centerlineIn - Centerline height in inches
 * @param pulleyDiameterIn - Pulley diameter in inches
 * @returns Top of Belt height in inches
 */
export function centerlineToTob(centerlineIn: number, pulleyDiameterIn: number): number {
  return centerlineIn + pulleyDiameterIn / 2;
}

/**
 * Calculate incline angle from two centerline heights and horizontal run.
 *
 * theta = atan(rise / H_cc) where rise = driveCL - tailCL
 *
 * @param tailCenterlineIn - Centerline height at tail end (inches)
 * @param driveCenterlineIn - Centerline height at drive end (inches)
 * @param horizontalRunIn - Horizontal run in inches (H_cc)
 * @returns Angle in degrees (positive = incline toward drive, negative = decline)
 */
export function angleFromCenterlines(
  tailCenterlineIn: number,
  driveCenterlineIn: number,
  horizontalRunIn: number
): number {
  if (horizontalRunIn <= 0) return 0;

  const rise = driveCenterlineIn - tailCenterlineIn;

  // If rise is effectively zero, return 0
  if (Math.abs(rise) < 0.001) return 0;

  const angleDeg = Math.atan(rise / horizontalRunIn) * RAD_TO_DEG;

  // Clamp to max supported angle
  if (angleDeg > MAX_INCLINE_DEG) return MAX_INCLINE_DEG;
  if (angleDeg < -MAX_INCLINE_DEG) return -MAX_INCLINE_DEG;

  return angleDeg;
}

/**
 * Calculate the opposite TOB given a reference TOB, angle, and horizontal run.
 *
 * This is used in ReferenceAndAngle height input mode to derive the non-reference TOB.
 *
 * @param referenceTobIn - Reference TOB (at the specified end) in inches
 * @param angleDeg - Incline angle in degrees (positive = incline toward drive)
 * @param horizontalRunIn - Horizontal run in inches (H_cc)
 * @param referencePulleyDia - Pulley diameter at reference end in inches
 * @param oppositePulleyDia - Pulley diameter at opposite end in inches
 * @param referenceEnd - Which end the reference TOB is at ('tail' or 'drive')
 * @returns The calculated TOB at the opposite end in inches
 */
export function calculateOppositeTobFromAngle(
  referenceTobIn: number,
  angleDeg: number,
  horizontalRunIn: number,
  referencePulleyDia: number,
  oppositePulleyDia: number,
  referenceEnd: 'tail' | 'drive'
): number {
  // Convert reference TOB to centerline
  const referenceCl = tobToCenterline(referenceTobIn, referencePulleyDia);

  // Calculate rise using horizontal run (NOT axis length)
  const rise = riseFromHorizontalAndAngle(horizontalRunIn, angleDeg);

  // Calculate opposite centerline
  let oppositeCl: number;
  if (referenceEnd === 'tail') {
    // Reference is tail, calculating drive (add rise)
    oppositeCl = referenceCl + rise;
  } else {
    // Reference is drive, calculating tail (subtract rise)
    oppositeCl = referenceCl - rise;
  }

  // Convert back to TOB
  return centerlineToTob(oppositeCl, oppositePulleyDia);
}

/**
 * Calculate implied incline angle from two TOB heights and horizontal run.
 *
 * This is the FIXED version that correctly uses horizontal run (H_cc),
 * NOT axis length (L_cc) as was incorrectly done before.
 *
 * @param tailTobIn - Top of Belt at tail end (inches)
 * @param driveTobIn - Top of Belt at drive end (inches)
 * @param horizontalRunIn - Horizontal run in inches (H_cc)
 * @param tailPulleyDia - Tail pulley diameter in inches
 * @param drivePulleyDia - Drive pulley diameter in inches
 * @returns Angle in degrees (positive = incline toward drive)
 */
export function calculateImpliedAngleFromTobs(
  tailTobIn: number,
  driveTobIn: number,
  horizontalRunIn: number,
  tailPulleyDia: number,
  drivePulleyDia: number
): number {
  // Convert TOBs to centerlines
  const tailCl = tobToCenterline(tailTobIn, tailPulleyDia);
  const driveCl = tobToCenterline(driveTobIn, drivePulleyDia);

  // Use centerline-based angle calculation
  return angleFromCenterlines(tailCl, driveCl, horizontalRunIn);
}

// ============================================================================
// GEOMETRY NORMALIZATION
// ============================================================================

/** Default pulley diameter if none specified */
const DEFAULT_PULLEY_DIAMETER_IN = 4;

/**
 * Derived geometry values computed from normalized inputs.
 * These are the "source of truth" values that downstream calculations should use.
 */
export interface DerivedGeometry {
  /** Mode used for normalization */
  mode: GeometryMode;

  /** Axis length between pulley centers (L_cc) in inches */
  L_cc_in: number;

  /** Horizontal run (H_cc) in inches */
  H_cc_in: number;

  /** Incline angle in degrees (positive = incline toward drive) */
  theta_deg: number;

  /** Rise in inches (drive centerline - tail centerline) */
  rise_in: number;

  /** Tail pulley centerline height in inches (if TOBs provided) */
  tail_cl_in?: number;

  /** Drive pulley centerline height in inches (if TOBs provided) */
  drive_cl_in?: number;

  /** Drive pulley diameter used in calculations */
  drive_pulley_dia_in: number;

  /** Tail pulley diameter used in calculations */
  tail_pulley_dia_in: number;

  /** Whether the inputs were valid for the specified mode */
  isValid: boolean;

  /** Error message if inputs are invalid */
  error?: string;
}

/**
 * Normalize geometry inputs based on the geometry mode.
 *
 * This function is the single source of truth for geometry calculations.
 * It should be called BEFORE any formulas that depend on geometry.
 *
 * Normalization rules by mode:
 *
 * L_ANGLE (Length + Angle):
 *   Primary: conveyor_length_cc_in (L_cc), conveyor_incline_deg (theta)
 *   Derived: horizontal_run_in (H_cc = L_cc * cos(theta))
 *
 * H_ANGLE (Horizontal + Angle):
 *   Primary: horizontal_run_in (H_cc), conveyor_incline_deg (theta)
 *   Derived: conveyor_length_cc_in (L_cc = H_cc / cos(theta))
 *
 * H_TOB (Horizontal + TOBs):
 *   Primary: horizontal_run_in (H_cc), tail_tob_in, drive_tob_in
 *   Derived: conveyor_incline_deg (theta), conveyor_length_cc_in (L_cc)
 *
 * @param inputs - The input values (may be partial)
 * @returns Object containing normalized inputs and derived geometry values
 */
export function normalizeGeometry(inputs: Partial<SliderbedInputs>): {
  normalized: Partial<SliderbedInputs>;
  derived: DerivedGeometry;
} {
  const mode = inputs.geometry_mode ?? GeometryMode.LengthAngle;

  // Get pulley diameters (needed for TOB ↔ centerline conversion)
  const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? DEFAULT_PULLEY_DIAMETER_IN;
  const tailPulleyDia = inputs.tail_pulley_diameter_in ?? inputs.pulley_diameter_in ?? drivePulleyDia;

  // Initialize derived with defaults
  const derived: DerivedGeometry = {
    mode,
    L_cc_in: 0,
    H_cc_in: 0,
    theta_deg: 0,
    rise_in: 0,
    drive_pulley_dia_in: drivePulleyDia,
    tail_pulley_dia_in: tailPulleyDia,
    isValid: true,
  };

  // Clone inputs for normalization
  const normalized = { ...inputs };

  switch (mode) {
    case GeometryMode.LengthAngle: {
      // L_ANGLE: L_cc and theta are primary
      const L_cc = inputs.conveyor_length_cc_in ?? 0;
      const theta = inputs.conveyor_incline_deg ?? 0;

      if (L_cc <= 0) {
        derived.isValid = false;
        derived.error = 'Conveyor length must be greater than 0';
        return { normalized, derived };
      }

      const H_cc = horizontalFromAxis(L_cc, theta);
      const rise = riseFromAxisAndAngle(L_cc, theta);

      derived.L_cc_in = L_cc;
      derived.H_cc_in = H_cc;
      derived.theta_deg = theta;
      derived.rise_in = rise;

      // Update normalized inputs
      normalized.horizontal_run_in = H_cc;
      break;
    }

    case GeometryMode.HorizontalAngle: {
      // H_ANGLE: H_cc and theta are primary
      const H_cc = inputs.horizontal_run_in ?? inputs.conveyor_length_cc_in ?? 0;
      const theta = inputs.conveyor_incline_deg ?? 0;

      if (H_cc <= 0) {
        derived.isValid = false;
        derived.error = 'Horizontal run must be greater than 0';
        return { normalized, derived };
      }

      const L_cc = axisFromHorizontal(H_cc, theta);
      const rise = riseFromHorizontalAndAngle(H_cc, theta);

      derived.L_cc_in = L_cc;
      derived.H_cc_in = H_cc;
      derived.theta_deg = theta;
      derived.rise_in = rise;

      // Update normalized inputs
      normalized.conveyor_length_cc_in = L_cc;
      normalized.horizontal_run_in = H_cc;
      break;
    }

    case GeometryMode.HorizontalTob: {
      // H_TOB: H_cc and both TOBs are primary
      const H_cc = inputs.horizontal_run_in ?? inputs.conveyor_length_cc_in ?? 0;
      const tailTob = inputs.tail_tob_in;
      const driveTob = inputs.drive_tob_in;

      if (H_cc <= 0) {
        derived.isValid = false;
        derived.error = 'Horizontal run must be greater than 0';
        return { normalized, derived };
      }

      if (tailTob === undefined || driveTob === undefined) {
        derived.isValid = false;
        derived.error = 'H_TOB mode requires both tail and drive TOB values';
        return { normalized, derived };
      }

      // Convert TOBs to centerlines
      const tailCl = tobToCenterline(tailTob, tailPulleyDia);
      const driveCl = tobToCenterline(driveTob, drivePulleyDia);

      // Calculate angle from centerlines and horizontal run
      const theta = angleFromCenterlines(tailCl, driveCl, H_cc);
      const L_cc = axisFromHorizontal(H_cc, theta);
      const rise = driveCl - tailCl;

      derived.L_cc_in = L_cc;
      derived.H_cc_in = H_cc;
      derived.theta_deg = theta;
      derived.rise_in = rise;
      derived.tail_cl_in = tailCl;
      derived.drive_cl_in = driveCl;

      // Update normalized inputs
      normalized.conveyor_length_cc_in = L_cc;
      normalized.horizontal_run_in = H_cc;
      normalized.conveyor_incline_deg = theta;
      break;
    }
  }

  // Calculate centerlines if TOBs are provided (for any mode)
  if (inputs.tail_tob_in !== undefined && derived.tail_cl_in === undefined) {
    derived.tail_cl_in = tobToCenterline(inputs.tail_tob_in, tailPulleyDia);
  }
  if (inputs.drive_tob_in !== undefined && derived.drive_cl_in === undefined) {
    derived.drive_cl_in = tobToCenterline(inputs.drive_tob_in, drivePulleyDia);
  }

  return { normalized, derived };
}
