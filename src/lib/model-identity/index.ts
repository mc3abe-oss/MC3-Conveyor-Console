/**
 * MODEL IDENTITY - SINGLE SOURCE OF TRUTH
 *
 * Canonical model identity for the belt conveyor calculation engine.
 * This module provides THE authoritative values for:
 * - model_key: Identifies the model type
 * - model_version_id: Identifies the specific version
 * - model_semver: Human-readable semantic version
 *
 * ALL consumers must import from here:
 * - Calculation engine (engine.ts)
 * - Save route (save/route.ts)
 * - Model definition (belt_conveyor_v1/index.ts)
 * - Schema metadata types
 *
 * DO NOT hard-code these values elsewhere.
 */

/**
 * Canonical model key - identifies the model type.
 * This is the primary identifier used in database queries and routing.
 */
export const MODEL_KEY = 'belt_conveyor_v1' as const;

/**
 * Model version identifier - used for tracking calculation provenance.
 * Format: semantic version string (e.g., 'v1.32.0')
 *
 * This should be bumped when:
 * - Formulas change (affecting calculation outputs)
 * - Schema changes (affecting input/output structure)
 * - Parameters change (affecting default behavior)
 */
export const MODEL_VERSION_ID = 'v1.32.0' as const;

/**
 * Semantic version for display purposes.
 * Keep in sync with MODEL_VERSION_ID.
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
  calculated_at: string;
} {
  return {
    model_key: MODEL_KEY,
    model_version_id: MODEL_VERSION_ID,
    calculated_at: new Date().toISOString(),
  };
}
