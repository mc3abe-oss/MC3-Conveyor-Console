/**
 * BELT TRACKING RECOMMENDATION MODULE (v1)
 *
 * Shared, model-agnostic logic for recommending belt tracking methods.
 * This module is designed to be reused across conveyor models (sliderbed, roller bed, etc.).
 *
 * v1 Scope:
 * - Guidance only. No pulley machining, crown geometry, or groove specs.
 * - Recommendations + notes. No hard blocks.
 * - Uses L/W ratio bands + disturbance severity + modifiers to determine mode.
 *
 * Tracking Modes:
 * - Crowned: Crowned pulleys (default tracking method)
 * - Hybrid: Crowned pulleys + V-guide
 * - V-guided: Flat pulleys + V-guide
 */

// ============================================================================
// TYPES & ENUMS
// ============================================================================

/** Application class - affects tracking sensitivity */
export enum ApplicationClass {
  UnitHandling = 'unit_handling',
  BulkHandling = 'bulk_handling',
}

/** Belt construction - affects tracking sensitivity */
export enum BeltConstruction {
  General = 'general',
  FabricPly = 'fabric_ply',
  ThermoplasticPvcPu = 'thermoplastic_pvc_pu',
  RubberCompound = 'rubber_compound',
  SteelCordOrVeryStiff = 'steel_cord_or_very_stiff',
  ProfiledSidewallOrHighCleat = 'profiled_sidewall_or_high_cleat',
}

/** User preference for tracking mode */
export enum TrackingPreference {
  Auto = 'auto',
  PreferCrowned = 'prefer_crowned',
  PreferHybrid = 'prefer_hybrid',
  PreferVGuided = 'prefer_v_guided',
}

/** Recommended tracking mode */
export enum TrackingMode {
  Crowned = 'crowned',
  Hybrid = 'hybrid',
  VGuided = 'v_guided',
}

/** L/W ratio band */
export enum LwBand {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

/** Disturbance severity level */
export enum DisturbanceSeverity {
  Minimal = 'minimal',
  Moderate = 'moderate',
  Significant = 'significant',
}

// ============================================================================
// INPUT/OUTPUT INTERFACES
// ============================================================================

/** Inputs for tracking recommendation calculation */
export interface TrackingRecommendationInput {
  /** Conveyor length center-to-center in inches */
  conveyor_length_cc_in: number;
  /** Belt width in inches */
  belt_width_in: number;
  /** Application class */
  application_class?: ApplicationClass | string;
  /** Belt construction type */
  belt_construction?: BeltConstruction | string;
  /** Reversing operation */
  reversing_operation?: boolean;
  /** Side loading disturbance (feeds, plows, transfers) */
  disturbance_side_loading?: boolean;
  /** Load variability disturbance (inconsistent placement/weight) */
  disturbance_load_variability?: boolean;
  /** Environment disturbance (dirty/wet/outdoor/temperature swings) */
  disturbance_environment?: boolean;
  /** Installation risk disturbance (long frames, site-built, tolerance stack-up) */
  disturbance_installation_risk?: boolean;
  /** User tracking preference */
  tracking_preference?: TrackingPreference | string;
}

/** Outputs from tracking recommendation calculation */
export interface TrackingRecommendationOutput {
  /** L/W ratio (rounded to 0.1) */
  tracking_lw_ratio: number;
  /** L/W band classification */
  tracking_lw_band: LwBand;
  /** Count of disturbance factors */
  tracking_disturbance_count: number;
  /** Raw severity before modifiers */
  tracking_disturbance_severity_raw: DisturbanceSeverity;
  /** Modified severity after belt/application modifiers */
  tracking_disturbance_severity_modified: DisturbanceSeverity;
  /** Recommended tracking mode */
  tracking_mode_recommended: TrackingMode;
  /** Short recommendation note (optional, for "with note" cases or override conflicts) */
  tracking_recommendation_note: string | null;
  /** 1-2 sentence rationale */
  tracking_recommendation_rationale: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** L/W ratio band thresholds */
const LW_BAND_LOW_MAX = 5;
const LW_BAND_MEDIUM_MAX = 10;

/** Disturbance count thresholds */
const SEVERITY_SIGNIFICANT_MIN_COUNT = 3;

/** Belt constructions that nudge severity worse */
const STIFF_BELT_CONSTRUCTIONS: string[] = [
  BeltConstruction.SteelCordOrVeryStiff,
  BeltConstruction.ProfiledSidewallOrHighCleat,
];

// ============================================================================
// PURE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate L/W ratio (rounded to 0.1)
 */
export function calculateLwRatio(lengthIn: number, widthIn: number): number {
  if (!widthIn || widthIn <= 0) return Infinity;
  const ratio = lengthIn / widthIn;
  return Math.round(ratio * 10) / 10;
}

/**
 * Determine L/W band from ratio
 */
export function calculateLwBand(ratio: number): LwBand {
  if (ratio <= LW_BAND_LOW_MAX) return LwBand.Low;
  if (ratio <= LW_BAND_MEDIUM_MAX) return LwBand.Medium;
  return LwBand.High;
}

/**
 * Count disturbance factors
 */
export function countDisturbances(input: TrackingRecommendationInput): number {
  let count = 0;
  if (input.reversing_operation) count++;
  if (input.disturbance_side_loading) count++;
  if (input.disturbance_load_variability) count++;
  if (input.disturbance_environment) count++;
  if (input.disturbance_installation_risk) count++;
  return count;
}

/**
 * Calculate raw disturbance severity from count and special combinations
 *
 * Rules:
 * - significant if count >= 3 OR (reversing AND side_loading)
 * - moderate if count in [1, 2]
 * - minimal if count == 0
 */
export function calculateRawSeverity(input: TrackingRecommendationInput): DisturbanceSeverity {
  const count = countDisturbances(input);

  // Special rule: reversing + side_loading = significant even if count == 2
  if (input.reversing_operation && input.disturbance_side_loading) {
    return DisturbanceSeverity.Significant;
  }

  if (count >= SEVERITY_SIGNIFICANT_MIN_COUNT) {
    return DisturbanceSeverity.Significant;
  }
  if (count >= 1) {
    return DisturbanceSeverity.Moderate;
  }
  return DisturbanceSeverity.Minimal;
}

/**
 * Nudge severity one step worse
 */
function nudgeSeverityWorse(severity: DisturbanceSeverity): DisturbanceSeverity {
  switch (severity) {
    case DisturbanceSeverity.Minimal:
      return DisturbanceSeverity.Moderate;
    case DisturbanceSeverity.Moderate:
      return DisturbanceSeverity.Significant;
    case DisturbanceSeverity.Significant:
      return DisturbanceSeverity.Significant; // Already at max
  }
}

/**
 * Apply modifiers to severity for recommendation purposes
 *
 * Modifiers that nudge severity one step worse:
 * - application_class == bulk_handling
 * - belt_construction in [steel_cord_or_very_stiff, profiled_sidewall_or_high_cleat]
 */
export function applyModifiers(
  rawSeverity: DisturbanceSeverity,
  applicationClass?: ApplicationClass | string,
  beltConstruction?: BeltConstruction | string
): DisturbanceSeverity {
  let modified = rawSeverity;

  // Bulk handling nudge
  if (applicationClass === ApplicationClass.BulkHandling) {
    modified = nudgeSeverityWorse(modified);
  }

  // Stiff/profiled belt nudge
  if (beltConstruction && STIFF_BELT_CONSTRUCTIONS.includes(beltConstruction as string)) {
    modified = nudgeSeverityWorse(modified);
  }

  return modified;
}

/**
 * Get recommended mode from the matrix
 *
 * Matrix:
 * LOW:  minimal->Crowned, moderate->Crowned(note), significant->Hybrid
 * MED:  minimal->Crowned(note), moderate->Hybrid, significant->V-guided
 * HIGH: minimal->Hybrid, moderate->V-guided, significant->V-guided
 *
 * Returns { mode, withNote } where withNote indicates if a note should be shown
 */
export function getRecommendedModeFromMatrix(
  band: LwBand,
  severity: DisturbanceSeverity
): { mode: TrackingMode; withNote: boolean } {
  switch (band) {
    case LwBand.Low:
      switch (severity) {
        case DisturbanceSeverity.Minimal:
          return { mode: TrackingMode.Crowned, withNote: false };
        case DisturbanceSeverity.Moderate:
          return { mode: TrackingMode.Crowned, withNote: true };
        case DisturbanceSeverity.Significant:
          return { mode: TrackingMode.Hybrid, withNote: false };
      }
      break;
    case LwBand.Medium:
      switch (severity) {
        case DisturbanceSeverity.Minimal:
          return { mode: TrackingMode.Crowned, withNote: true };
        case DisturbanceSeverity.Moderate:
          return { mode: TrackingMode.Hybrid, withNote: false };
        case DisturbanceSeverity.Significant:
          return { mode: TrackingMode.VGuided, withNote: false };
      }
      break;
    case LwBand.High:
      switch (severity) {
        case DisturbanceSeverity.Minimal:
          return { mode: TrackingMode.Hybrid, withNote: false };
        case DisturbanceSeverity.Moderate:
          return { mode: TrackingMode.VGuided, withNote: false };
        case DisturbanceSeverity.Significant:
          return { mode: TrackingMode.VGuided, withNote: false };
      }
      break;
  }
  // Fallback (should never reach)
  return { mode: TrackingMode.Crowned, withNote: false };
}

/**
 * Convert tracking preference to mode
 */
function preferenceToMode(preference: TrackingPreference | string): TrackingMode | null {
  switch (preference) {
    case TrackingPreference.PreferCrowned:
      return TrackingMode.Crowned;
    case TrackingPreference.PreferHybrid:
      return TrackingMode.Hybrid;
    case TrackingPreference.PreferVGuided:
      return TrackingMode.VGuided;
    default:
      return null;
  }
}

/**
 * Get mode display name for rationale text
 */
function getModeDisplayName(mode: TrackingMode): string {
  switch (mode) {
    case TrackingMode.Crowned:
      return 'Crowned pulleys';
    case TrackingMode.Hybrid:
      return 'Hybrid (crowned pulleys + V-guide)';
    case TrackingMode.VGuided:
      return 'V-guided (flat pulleys + V-guide)';
  }
}

/**
 * Build rationale string
 */
function buildRationale(
  band: LwBand,
  severity: DisturbanceSeverity,
  mode: TrackingMode,
  isOverride: boolean,
  computedMode?: TrackingMode
): string {
  if (isOverride && computedMode && computedMode !== mode) {
    return `User preference applied. ${getModeDisplayName(mode)} selected. System would recommend ${getModeDisplayName(computedMode)} for these conditions.`;
  }

  const bandText =
    band === LwBand.Low ? 'favorable' : band === LwBand.Medium ? 'moderate' : 'high';

  switch (mode) {
    case TrackingMode.Crowned:
      if (severity === DisturbanceSeverity.Minimal) {
        return `Crowned pulleys are appropriate. L/W ratio is ${bandText} and disturbance factors are minimal.`;
      }
      return `Crowned pulleys are appropriate for this geometry. Selected conditions may reduce tracking margin.`;

    case TrackingMode.Hybrid:
      return `Hybrid adds tracking margin by combining crowned pulleys with a V-guide. Recommended given ${bandText} L/W ratio and selected conditions.`;

    case TrackingMode.VGuided:
      return `V-guided provides positive belt constraint. Recommended when geometry and conditions increase tracking sensitivity.`;
  }
}

/**
 * Build note string (for "with note" cases or override conflicts)
 */
function buildNote(
  withNote: boolean,
  isOverride: boolean,
  mode: TrackingMode,
  computedMode?: TrackingMode
): string | null {
  // Override conflict note takes priority
  if (isOverride && computedMode && computedMode !== mode) {
    // Determine if user is choosing less tracking control
    const modeOrder = [TrackingMode.Crowned, TrackingMode.Hybrid, TrackingMode.VGuided];
    const userIdx = modeOrder.indexOf(mode);
    const computedIdx = modeOrder.indexOf(computedMode);

    if (userIdx < computedIdx) {
      return 'Selected mode provides less tracking control than recommended. Tracking margin may be reduced.';
    }
    // User chose more control than needed - no warning needed
    return null;
  }

  // Standard "with note" case
  if (withNote) {
    return 'Conditions may reduce tracking margin. Consider Hybrid if issues appear in service.';
  }

  return null;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate belt tracking recommendation
 *
 * Pure function that takes geometry, application, and disturbance inputs
 * and returns the recommended tracking mode with rationale.
 */
export function calculateTrackingRecommendation(
  input: TrackingRecommendationInput
): TrackingRecommendationOutput {
  // 1. Calculate L/W ratio and band
  const lwRatio = calculateLwRatio(input.conveyor_length_cc_in, input.belt_width_in);
  const lwBand = calculateLwBand(lwRatio);

  // 2. Count disturbances and calculate raw severity
  const disturbanceCount = countDisturbances(input);
  const rawSeverity = calculateRawSeverity(input);

  // 3. Apply modifiers for recommendation severity
  const modifiedSeverity = applyModifiers(
    rawSeverity,
    input.application_class,
    input.belt_construction
  );

  // 4. Get recommendation from matrix
  const { mode: computedMode, withNote } = getRecommendedModeFromMatrix(lwBand, modifiedSeverity);

  // 5. Handle preference override
  const preference = input.tracking_preference ?? TrackingPreference.Auto;
  const preferredMode = preferenceToMode(preference);
  const isOverride = preferredMode !== null;
  const finalMode = preferredMode ?? computedMode;

  // 6. Build rationale and note
  const rationale = buildRationale(lwBand, modifiedSeverity, finalMode, isOverride, computedMode);
  const note = buildNote(withNote, isOverride, finalMode, computedMode);

  return {
    tracking_lw_ratio: lwRatio,
    tracking_lw_band: lwBand,
    tracking_disturbance_count: disturbanceCount,
    tracking_disturbance_severity_raw: rawSeverity,
    tracking_disturbance_severity_modified: modifiedSeverity,
    tracking_mode_recommended: finalMode,
    tracking_recommendation_note: note,
    tracking_recommendation_rationale: rationale,
  };
}

// ============================================================================
// UI DISPLAY HELPERS
// ============================================================================

/** Display labels for tracking modes */
export const TRACKING_MODE_LABELS: Record<TrackingMode, string> = {
  [TrackingMode.Crowned]: 'Crowned Pulleys',
  [TrackingMode.Hybrid]: 'Hybrid (Crowned + V-Guide)',
  [TrackingMode.VGuided]: 'V-Guided (Flat Pulleys + V-Guide)',
};

/** Short display labels for tracking modes */
export const TRACKING_MODE_SHORT_LABELS: Record<TrackingMode, string> = {
  [TrackingMode.Crowned]: 'Crowned',
  [TrackingMode.Hybrid]: 'Hybrid',
  [TrackingMode.VGuided]: 'V-Guided',
};

/** Display labels for application class */
export const APPLICATION_CLASS_LABELS: Record<ApplicationClass, string> = {
  [ApplicationClass.UnitHandling]: 'Unit Handling',
  [ApplicationClass.BulkHandling]: 'Bulk Handling',
};

/** Display labels for belt construction */
export const BELT_CONSTRUCTION_LABELS: Record<BeltConstruction, string> = {
  [BeltConstruction.General]: 'General / Unknown',
  [BeltConstruction.FabricPly]: 'Fabric Ply',
  [BeltConstruction.ThermoplasticPvcPu]: 'Thermoplastic (PVC/PU)',
  [BeltConstruction.RubberCompound]: 'Rubber Compound',
  [BeltConstruction.SteelCordOrVeryStiff]: 'Steel Cord / Very Stiff',
  [BeltConstruction.ProfiledSidewallOrHighCleat]: 'Profiled Sidewall / High Cleat',
};

/** Display labels for tracking preference */
export const TRACKING_PREFERENCE_LABELS: Record<TrackingPreference, string> = {
  [TrackingPreference.Auto]: 'Auto (System Recommendation)',
  [TrackingPreference.PreferCrowned]: 'Prefer Crowned',
  [TrackingPreference.PreferHybrid]: 'Prefer Hybrid',
  [TrackingPreference.PreferVGuided]: 'Prefer V-Guided',
};

/** Display labels for L/W band (admin/advanced use only) */
export const LW_BAND_LABELS: Record<LwBand, string> = {
  [LwBand.Low]: 'Low (≤5:1)',
  [LwBand.Medium]: 'Medium (5-10:1)',
  [LwBand.High]: 'High (>10:1)',
};

/** Display labels for disturbance severity (admin/advanced use only) */
export const DISTURBANCE_SEVERITY_LABELS: Record<DisturbanceSeverity, string> = {
  [DisturbanceSeverity.Minimal]: 'Minimal',
  [DisturbanceSeverity.Moderate]: 'Moderate',
  [DisturbanceSeverity.Significant]: 'Significant',
};
