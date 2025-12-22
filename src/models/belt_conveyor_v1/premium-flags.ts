/**
 * BELT CONVEYOR - PREMIUM FEATURE FLAGS
 *
 * Detects premium features for build cost estimation.
 * Premium flags are informational only - they do NOT block calculations.
 *
 * Premium Feature Matrix:
 * | Bed Type    | Tracking    | Premium Level |
 * |-------------|-------------|---------------|
 * | slider_bed  | crowned     | standard      |
 * | slider_bed  | v_guided    | premium       |
 * | roller_bed  | crowned     | premium       |
 * | roller_bed  | v_guided    | premium_plus  |
 */

import {
  BeltConveyorInputs,
  BedType,
  PremiumLevel,
  PremiumFlags,
  resolveBedType,
} from './schema';
import { BeltTrackingMethod } from '../sliderbed_v1/schema';

// ============================================================================
// PREMIUM FEATURE DETECTION
// ============================================================================

/**
 * Calculate premium flags based on conveyor configuration
 *
 * Premium features are:
 * 1. Roller bed construction (vs slider bed)
 * 2. V-guided belt tracking (vs crowned)
 *
 * These are cost drivers, not capability limiters.
 */
export function calculatePremiumFlags(inputs: BeltConveyorInputs): PremiumFlags {
  const reasons: string[] = [];

  // Check bed type
  const bedType = resolveBedType(inputs.bed_type);
  if (bedType === BedType.RollerBed) {
    reasons.push('Roller bed construction');
  }

  // Check tracking method
  const isVGuided =
    inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
    inputs.belt_tracking_method === 'V-guided';
  if (isVGuided) {
    reasons.push('V-guided belt tracking');
  }

  // Determine premium level
  let level: PremiumLevel;
  if (reasons.length >= 2) {
    level = PremiumLevel.PremiumPlus;
  } else if (reasons.length === 1) {
    level = PremiumLevel.Premium;
  } else {
    level = PremiumLevel.Standard;
  }

  return {
    is_premium: reasons.length > 0,
    premium_reasons: reasons,
    premium_level: level,
  };
}

/**
 * Get human-readable premium level description
 */
export function getPremiumLevelDescription(level: PremiumLevel): string {
  switch (level) {
    case PremiumLevel.Standard:
      return 'Standard build';
    case PremiumLevel.Premium:
      return 'Premium build (includes upgraded features)';
    case PremiumLevel.PremiumPlus:
      return 'Premium Plus build (multiple upgraded features)';
  }
}

/**
 * Get CSS class for premium level badge
 */
export function getPremiumLevelColor(level: PremiumLevel): string {
  switch (level) {
    case PremiumLevel.Standard:
      return 'bg-gray-100 text-gray-800';
    case PremiumLevel.Premium:
      return 'bg-blue-100 text-blue-800';
    case PremiumLevel.PremiumPlus:
      return 'bg-purple-100 text-purple-800';
  }
}
