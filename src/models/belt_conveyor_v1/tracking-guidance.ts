/**
 * BELT CONVEYOR - TRACKING GUIDANCE
 *
 * Re-exports tracking guidance from sliderbed_v1.
 * Tracking logic is unchanged - bed type does not affect tracking recommendations.
 */

// Re-export enums and functions
export {
  TrackingRiskLevel,
  calculateTrackingGuidance,
  getTrackingTooltip,
  isTrackingSelectionOptimal,
  getRiskLevelColor,
} from '../sliderbed_v1/tracking-guidance';

// Re-export types
export type { TrackingRiskFactor, TrackingGuidance } from '../sliderbed_v1/tracking-guidance';
