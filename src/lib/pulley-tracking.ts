/**
 * Pulley Tracking Utilities
 *
 * Derives pulley face profile from belt tracking selection.
 * Belt tracking is the single source of truth - pulleys react to it.
 */

import { BeltTrackingMethod } from '../models/sliderbed_v1/schema';

/**
 * Face profile types that align with pulley_library_styles eligibility flags.
 * Maps to database enum values in application_pulleys.face_profile.
 */
export type PulleyFaceProfile = 'FLAT' | 'CROWNED' | 'V_GUIDED';

/**
 * Inputs needed to derive the belt tracking mode.
 * Uses the same field names as the sliderbed_v1 schema.
 */
export interface TrackingInputs {
  belt_tracking_method?: BeltTrackingMethod | string | null;
  v_guide_key?: string | null;
  v_guide_profile?: string | null;
}

/**
 * Derives the pulley face profile from belt tracking inputs.
 *
 * Priority:
 * 1. If belt_tracking_method = 'V-guided' → V_GUIDED
 * 2. If belt_tracking_method = 'Crowned' → CROWNED
 * 3. Default → FLAT (no tracking / unspecified)
 *
 * @param inputs - Belt tracking inputs from the application
 * @returns The derived face profile for pulleys
 */
export function getBeltTrackingMode(inputs: TrackingInputs): PulleyFaceProfile {
  const method = inputs.belt_tracking_method;

  // V-guided check
  if (method === BeltTrackingMethod.VGuided || method === 'V-guided') {
    return 'V_GUIDED';
  }

  // Crowned check
  if (method === BeltTrackingMethod.Crowned || method === 'Crowned') {
    return 'CROWNED';
  }

  // Default to FLAT (no tracking or unspecified)
  return 'FLAT';
}

/**
 * Display label for the face profile.
 */
export function getFaceProfileLabel(profile: PulleyFaceProfile): string {
  switch (profile) {
    case 'V_GUIDED':
      return 'V-Guided';
    case 'CROWNED':
      return 'Crowned';
    case 'FLAT':
    default:
      return 'Flat';
  }
}

/**
 * Pulley style eligibility information from pulley_library_styles.
 */
export interface PulleyStyleEligibility {
  key: string;
  name: string;
  eligible_drive: boolean;
  eligible_tail: boolean;
  eligible_crown: boolean;
  eligible_v_guided: boolean;
  is_active: boolean;
}

/**
 * Filters pulley styles based on position and tracking mode.
 *
 * Rules:
 * - Position: DRIVE requires eligible_drive=true, TAIL requires eligible_tail=true
 * - Tracking:
 *   - V_GUIDED → only styles with eligible_v_guided=true
 *   - CROWNED → only styles with eligible_crown=true
 *   - FLAT → no additional filter (all position-eligible styles allowed)
 *
 * @param styles - All available pulley styles
 * @param position - 'DRIVE' or 'TAIL'
 * @param trackingMode - Face profile derived from belt tracking
 * @returns Filtered list of eligible styles
 */
export function getEligiblePulleyStyles(
  styles: PulleyStyleEligibility[],
  position: 'DRIVE' | 'TAIL',
  trackingMode: PulleyFaceProfile
): PulleyStyleEligibility[] {
  return styles.filter((style) => {
    // Must be active
    if (!style.is_active) return false;

    // Position eligibility
    if (position === 'DRIVE' && !style.eligible_drive) return false;
    if (position === 'TAIL' && !style.eligible_tail) return false;

    // Tracking eligibility
    if (trackingMode === 'V_GUIDED' && !style.eligible_v_guided) return false;
    if (trackingMode === 'CROWNED' && !style.eligible_crown) return false;
    // FLAT: no additional filter

    return true;
  });
}

/**
 * Checks if a specific style is compatible with the given position and tracking mode.
 *
 * @param style - The pulley style to check
 * @param position - 'DRIVE' or 'TAIL'
 * @param trackingMode - Face profile derived from belt tracking
 * @returns True if compatible, false otherwise
 */
export function isStyleCompatible(
  style: PulleyStyleEligibility | null | undefined,
  position: 'DRIVE' | 'TAIL',
  trackingMode: PulleyFaceProfile
): boolean {
  if (!style || !style.is_active) return false;

  // Position check
  if (position === 'DRIVE' && !style.eligible_drive) return false;
  if (position === 'TAIL' && !style.eligible_tail) return false;

  // Tracking check
  if (trackingMode === 'V_GUIDED' && !style.eligible_v_guided) return false;
  if (trackingMode === 'CROWNED' && !style.eligible_crown) return false;

  return true;
}

/**
 * Computes the finished OD from shell OD and lagging.
 *
 * Formula: finished_od = shell_od + 2 * lagging_thickness (if lagged)
 *
 * @param shellOdIn - Shell outer diameter in inches
 * @param isLagged - Whether the pulley is lagged
 * @param laggingThicknessIn - Lagging thickness in inches (default 0)
 * @returns Finished OD in inches
 */
export function computeFinishedOd(
  shellOdIn: number | null | undefined,
  isLagged: boolean,
  laggingThicknessIn?: number | null
): number | undefined {
  if (shellOdIn == null || shellOdIn <= 0) return undefined;

  const thickness = isLagged && laggingThicknessIn != null ? laggingThicknessIn : 0;
  return shellOdIn + 2 * thickness;
}
