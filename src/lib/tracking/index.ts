/**
 * Belt Tracking Module
 *
 * Exports tracking recommendation logic for use across conveyor models.
 */

export {
  // Types & Enums
  ApplicationClass,
  BeltConstruction,
  TrackingPreference,
  TrackingMode,
  LwBand,
  DisturbanceSeverity,
  // Interfaces
  type TrackingRecommendationInput,
  type TrackingRecommendationOutput,
  // Main function
  calculateTrackingRecommendation,
  // Helper functions (for testing/advanced use)
  calculateLwRatio,
  calculateLwBand,
  countDisturbances,
  calculateRawSeverity,
  applyModifiers,
  getRecommendedModeFromMatrix,
  // UI Labels
  TRACKING_MODE_LABELS,
  TRACKING_MODE_SHORT_LABELS,
  APPLICATION_CLASS_LABELS,
  BELT_CONSTRUCTION_LABELS,
  TRACKING_PREFERENCE_LABELS,
  LW_BAND_LABELS,
  DISTURBANCE_SEVERITY_LABELS,
} from './recommendation';
