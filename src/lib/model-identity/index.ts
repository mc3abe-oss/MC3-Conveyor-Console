/**
 * MODEL IDENTITY - SINGLE SOURCE OF TRUTH
 *
 * Canonical model identity for the belt conveyor calculation engine.
 *
 * IMPORTANT DISTINCTION:
 * - MODEL_KEY: Canonical model identifier (e.g., 'belt_conveyor_v1')
 * - MODEL_VERSION_ID: Stable immutable ID for calculation provenance (e.g., 'belt_conveyor_v1.0')
 * - MODEL_SEMVER: Human-readable semantic version for display (e.g., '1.32.0')
 *
 * WHY belt_conveyor_v1?
 * - belt_conveyor_v1/schema.ts states: "This model supersedes sliderbed_conveyor_v1"
 * - CalculationMetadata interface defines model_key as 'belt_conveyor_v1'
 * - The engine uses sliderbed_v1 formulas but the canonical name is belt_conveyor_v1
 *
 * ALL consumers must import from here:
 * - Calculation engine (engine.ts)
 * - Save route (save/route.ts)
 * - Model definition (belt_conveyor_v1/index.ts)
 *
 * DO NOT hard-code these values elsewhere.
 */

/**
 * Canonical model key - identifies the model type.
 * This is the primary identifier used in database queries and routing.
 *
 * Value: 'belt_conveyor_v1' (supersedes legacy 'sliderbed_conveyor_v1')
 */
export const MODEL_KEY = 'belt_conveyor_v1' as const;

/**
 * Model version identifier - STABLE IMMUTABLE ID for calculation provenance.
 *
 * Format: '{model_key}.{major_version}'
 * This ID is used for:
 * - Tracking which model produced a calculation
 * - Reproducibility and audit trails
 * - Database foreign keys
 *
 * This should ONLY change when formulas produce different outputs.
 */
export const MODEL_VERSION_ID = 'belt_conveyor_v1.0' as const;

/**
 * Human-readable semantic version for UI display.
 * Format: 'major.minor.patch'
 *
 * This can change for:
 * - Bug fixes (patch)
 * - New features (minor)
 * - Breaking changes (major)
 */
export const MODEL_SEMVER = '1.32.0' as const;

/**
 * Type for the model key literal.
 */
export type ModelKey = typeof MODEL_KEY;

/**
 * Complete model identity object for embedding in metadata.
 */
export interface ModelIdentity {
  model_key: ModelKey;
  model_version_id: string;
  model_semver: string;
}

/**
 * Get the current model identity.
 * Use this when you need all identity fields together.
 */
export function getModelIdentity(): ModelIdentity {
  return {
    model_key: MODEL_KEY,
    model_version_id: MODEL_VERSION_ID,
    model_semver: MODEL_SEMVER,
  };
}

/**
 * Create calculation metadata with current model identity.
 * This ensures all calculations include consistent identity information.
 *
 * @returns Metadata object for CalculationResult
 */
export function createCalculationMetadata(): {
  model_key: ModelKey;
  model_version_id: string;
  model_semver: string;
  calculated_at: string;
} {
  return {
    model_key: MODEL_KEY,
    model_version_id: MODEL_VERSION_ID,
    model_semver: MODEL_SEMVER,
    calculated_at: new Date().toISOString(),
  };
}
