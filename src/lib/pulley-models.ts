/**
 * Pulley Models Library
 *
 * Utilities for working with pulley library models including:
 * - Model selection and filtering
 * - Face width validation
 * - Wall thickness validation (PCI tube stress)
 * - Finished OD computation
 */

import { PulleyFaceProfile } from './pulley-tracking';

// Types for pulley model data
export interface PulleyModel {
  model_key: string;
  display_name: string;
  description: string | null;
  style_key: string;
  shell_od_in: number;
  default_shell_wall_in: number;
  allowed_wall_steps_in: number[];
  face_width_min_in: number;
  face_width_max_in: number;
  face_width_allowance_in: number;
  eligible_drive: boolean;
  eligible_tail: boolean;
  eligible_dirty_side: boolean;
  eligible_crown: boolean;
  eligible_v_guided: boolean;
  eligible_lagging: boolean;
  tube_stress_limit_flat_psi: number | null;
  tube_stress_limit_vgroove_psi: number | null;
  is_active: boolean;
}

export type PulleyPosition = 'DRIVE' | 'TAIL';

export type WallValidationStatus =
  | 'NOT_VALIDATED'
  | 'PASS'
  | 'RECOMMEND_UPGRADE'
  | 'FAIL_ENGINEERING_REQUIRED';

export interface WallValidationInput {
  model: PulleyModel;
  shellWallIn: number;
  faceWidthIn: number;
  trackingMode: PulleyFaceProfile;
  beltTensionLbs?: number; // Optional - uses default if not provided
  laggingThicknessIn?: number;
}

export interface WallValidationResult {
  status: WallValidationStatus;
  computedStressPsi: number;
  stressLimitPsi: number;
  utilizationPercent: number;
  recommendedWallIn: number | null;
  nextWallStepIn: number | null;
  message: string;
  details: {
    shellOdIn: number;
    shellWallIn: number;
    faceWidthIn: number;
    trackingMode: PulleyFaceProfile;
    momentOfInertia: number;
    sectionModulus: number;
  };
}

// Default values for stress calculation
const DEFAULT_BELT_TENSION_LBS = 500;
const STRESS_SAFETY_FACTOR = 1.25; // 25% margin before recommending upgrade

/**
 * Filter models by position and tracking eligibility
 */
export function getEligibleModels(
  models: PulleyModel[],
  position: PulleyPosition,
  trackingMode: PulleyFaceProfile
): PulleyModel[] {
  return models.filter((m) => {
    if (!m.is_active) return false;

    // Position eligibility
    if (position === 'DRIVE' && !m.eligible_drive) return false;
    if (position === 'TAIL' && !m.eligible_tail) return false;

    // Tracking eligibility
    if (trackingMode === 'CROWNED' && !m.eligible_crown) return false;
    if (trackingMode === 'V_GUIDED' && !m.eligible_v_guided) return false;

    return true;
  });
}

/**
 * Filter models by belt width (face width must accommodate)
 */
export function getModelsForBeltWidth(
  models: PulleyModel[],
  beltWidthIn: number
): PulleyModel[] {
  return models.filter((m) => {
    const requiredFaceWidth = beltWidthIn + m.face_width_allowance_in;
    return requiredFaceWidth >= m.face_width_min_in && requiredFaceWidth <= m.face_width_max_in;
  });
}

/**
 * Validate face width against model limits
 */
export function validateFaceWidth(
  model: PulleyModel,
  faceWidthIn: number
): { valid: boolean; message: string } {
  if (faceWidthIn < model.face_width_min_in) {
    return {
      valid: false,
      message: `Face width ${faceWidthIn}" is below minimum ${model.face_width_min_in}" for this ${model.shell_od_in}" pulley.`,
    };
  }
  if (faceWidthIn > model.face_width_max_in) {
    return {
      valid: false,
      message: `Face width ${faceWidthIn}" exceeds maximum ${model.face_width_max_in}" for this ${model.shell_od_in}" pulley.`,
    };
  }
  return { valid: true, message: 'Face width is within limits.' };
}

/**
 * Get default face width for a model and belt width
 */
export function getDefaultFaceWidth(model: PulleyModel, beltWidthIn: number): number {
  return beltWidthIn + model.face_width_allowance_in;
}

/**
 * Compute finished OD from shell OD and lagging
 */
export function computeFinishedOd(
  shellOdIn: number,
  laggingThicknessIn: number = 0
): number {
  return shellOdIn + 2 * laggingThicknessIn;
}

/**
 * Calculate tube stress using simplified beam theory
 *
 * This is a simplified model for initial validation.
 * Actual PCI calculations may be more complex.
 *
 * σ = M / Z where:
 *   M = moment from belt load (simplified as T * L / 8 for distributed load)
 *   Z = section modulus of hollow tube
 *   Z = π * (OD⁴ - ID⁴) / (32 * OD)
 */
function calculateTubeStress(
  shellOdIn: number,
  shellWallIn: number,
  faceWidthIn: number,
  beltTensionLbs: number
): number {
  const shellIdIn = shellOdIn - 2 * shellWallIn;

  // Moment of inertia for hollow tube: I = π/64 * (OD⁴ - ID⁴)
  const momentOfInertia =
    (Math.PI / 64) * (Math.pow(shellOdIn, 4) - Math.pow(shellIdIn, 4));

  // Section modulus: Z = I / (OD/2) = 2*I / OD
  const sectionModulus = (2 * momentOfInertia) / shellOdIn;

  // Simplified moment calculation (distributed load over face width)
  // M = w * L² / 8 where w = T / L (tension distributed over face)
  // Simplified: M = T * L / 8
  const moment = (beltTensionLbs * faceWidthIn) / 8;

  // Stress: σ = M / Z
  const stress = moment / sectionModulus;

  return stress;
}

/**
 * Find the next available wall thickness step
 */
function findNextWallStep(
  currentWall: number,
  allowedSteps: number[]
): number | null {
  const sortedSteps = [...allowedSteps].sort((a, b) => a - b);
  for (const step of sortedSteps) {
    if (step > currentWall) {
      return step;
    }
  }
  return null; // No larger step available
}

/**
 * Find minimum wall thickness to pass stress validation
 */
function findMinimumPassingWall(
  model: PulleyModel,
  faceWidthIn: number,
  stressLimitPsi: number,
  beltTensionLbs: number
): number | null {
  const sortedSteps = [...model.allowed_wall_steps_in].sort((a, b) => a - b);

  for (const wall of sortedSteps) {
    const stress = calculateTubeStress(model.shell_od_in, wall, faceWidthIn, beltTensionLbs);
    if (stress <= stressLimitPsi) {
      return wall;
    }
  }

  return null; // No wall thickness passes
}

/**
 * Validate wall thickness for a pulley configuration
 *
 * Returns:
 * - PASS: Current wall is adequate
 * - RECOMMEND_UPGRADE: Current wall is marginal, recommend next step
 * - FAIL_ENGINEERING_REQUIRED: No standard wall thickness works, needs engineering
 */
export function validateWallThickness(input: WallValidationInput): WallValidationResult {
  const {
    model,
    shellWallIn,
    faceWidthIn,
    trackingMode,
    beltTensionLbs = DEFAULT_BELT_TENSION_LBS,
  } = input;

  // Determine stress limit based on tracking mode
  const stressLimitPsi =
    trackingMode === 'V_GUIDED'
      ? model.tube_stress_limit_vgroove_psi || 3400
      : model.tube_stress_limit_flat_psi || 10000;

  // Calculate current stress
  const computedStressPsi = calculateTubeStress(
    model.shell_od_in,
    shellWallIn,
    faceWidthIn,
    beltTensionLbs
  );

  const utilizationPercent = (computedStressPsi / stressLimitPsi) * 100;
  const shellIdIn = model.shell_od_in - 2 * shellWallIn;

  // Calculate moment of inertia and section modulus for details
  const momentOfInertia =
    (Math.PI / 64) * (Math.pow(model.shell_od_in, 4) - Math.pow(shellIdIn, 4));
  const sectionModulus = (2 * momentOfInertia) / model.shell_od_in;

  const details = {
    shellOdIn: model.shell_od_in,
    shellWallIn,
    faceWidthIn,
    trackingMode,
    momentOfInertia,
    sectionModulus,
  };

  // Find next wall step
  const nextWallStepIn = findNextWallStep(shellWallIn, model.allowed_wall_steps_in);

  // Determine status
  if (computedStressPsi <= stressLimitPsi / STRESS_SAFETY_FACTOR) {
    // Well within limits
    return {
      status: 'PASS',
      computedStressPsi,
      stressLimitPsi,
      utilizationPercent,
      recommendedWallIn: null,
      nextWallStepIn,
      message: `Wall thickness ${shellWallIn}" is adequate. Stress utilization: ${utilizationPercent.toFixed(0)}%.`,
      details,
    };
  }

  if (computedStressPsi <= stressLimitPsi) {
    // Within limits but marginal - recommend upgrade
    const recommendedWall = findMinimumPassingWall(
      model,
      faceWidthIn,
      stressLimitPsi / STRESS_SAFETY_FACTOR,
      beltTensionLbs
    );

    return {
      status: 'RECOMMEND_UPGRADE',
      computedStressPsi,
      stressLimitPsi,
      utilizationPercent,
      recommendedWallIn: recommendedWall,
      nextWallStepIn,
      message: `Wall thickness ${shellWallIn}" passes but is marginal (${utilizationPercent.toFixed(0)}% utilization). Consider upgrading to ${recommendedWall || nextWallStepIn}" for better safety margin.`,
      details,
    };
  }

  // Exceeds limit - find if any standard wall works
  const passingWall = findMinimumPassingWall(
    model,
    faceWidthIn,
    stressLimitPsi,
    beltTensionLbs
  );

  if (passingWall) {
    return {
      status: 'RECOMMEND_UPGRADE',
      computedStressPsi,
      stressLimitPsi,
      utilizationPercent,
      recommendedWallIn: passingWall,
      nextWallStepIn,
      message: `Wall thickness ${shellWallIn}" is insufficient (${utilizationPercent.toFixed(0)}% utilization). Upgrade to ${passingWall}" required.`,
      details,
    };
  }

  // No standard wall works
  return {
    status: 'FAIL_ENGINEERING_REQUIRED',
    computedStressPsi,
    stressLimitPsi,
    utilizationPercent,
    recommendedWallIn: null,
    nextWallStepIn: null,
    message: `No standard wall thickness is adequate for this configuration. Engineering review required. Consider a larger pulley diameter.`,
    details,
  };
}

/**
 * Get all available wall thickness options for a model
 * Returns sorted array from thinnest to thickest
 */
export function getWallOptions(model: PulleyModel): number[] {
  return [...model.allowed_wall_steps_in].sort((a, b) => a - b);
}

/**
 * Format wall thickness for display
 *
 * Rules:
 * - Sheet gauge thicknesses show gauge callout (e.g., "0.134" (10 ga)")
 * - Plate thicknesses show inch fractions only (e.g., "0.188" (3/16")")
 * - Other thicknesses show decimal only
 *
 * Uses tolerance-based lookup for floating point safety.
 */
export function formatWallThickness(wallIn: number): string {
  const TOLERANCE = 0.002; // Allow small float tolerance for matching

  // Sheet gauge mappings (true gauge thicknesses)
  const gaugeThicknesses: Array<{ nominal: number; label: string }> = [
    { nominal: 0.109, label: '12 ga' },  // 12 ga ≈ 0.1046", 0.109 is common industrial callout
    { nominal: 0.134, label: '10 ga' },  // 10 ga = 0.1345"
    { nominal: 0.165, label: '8 ga' },   // 8 ga = 0.1644"
  ];

  // Plate thicknesses (show fractions, NOT gauge)
  const plateThicknesses: Array<{ nominal: number; label: string }> = [
    { nominal: 0.188, label: '3/16"' },  // 3/16" = 0.1875"
    { nominal: 0.250, label: '1/4"' },   // 1/4" = 0.25"
    { nominal: 0.375, label: '3/8"' },   // 3/8" = 0.375"
  ];

  // Check gauge thicknesses
  for (const g of gaugeThicknesses) {
    if (Math.abs(wallIn - g.nominal) < TOLERANCE) {
      return `${wallIn}" (${g.label})`;
    }
  }

  // Check plate thicknesses
  for (const p of plateThicknesses) {
    if (Math.abs(wallIn - p.nominal) < TOLERANCE) {
      return `${wallIn}" (${p.label})`;
    }
  }

  // Default: just show decimal
  return `${wallIn}"`;
}
