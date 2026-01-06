/**
 * Recipe Input Canonicalization
 *
 * Transforms raw UI/form inputs into a canonical user_inputs blob that represents
 * engineering intent rather than stale UI artifacts.
 *
 * Key principles:
 * 1. Only store user-controlled, active inputs
 * 2. Drop deprecated keys
 * 3. Collapse aliases (drive_rpm -> drive_rpm_input)
 * 4. Drop derived/resolved keys (belt catalog lookups)
 * 5. Drop inactive keys based on mode switches (speed_mode gates RPM vs belt speed)
 */

// ============================================================================
// DENYLISTS
// ============================================================================

/**
 * Keys that are deprecated and should never be stored in user_inputs.
 * These are either removed features or internal flags.
 */
const DEPRECATED_KEYS: string[] = [
  'send_to_estimating', // Removed feature
];

/**
 * Keys that are derived from catalog lookups (belt, pulley, etc.)
 * and should not be stored as user inputs.
 * These values are resolved at calculation time from the catalog.
 */
const DERIVED_CATALOG_KEYS: string[] = [
  'belt_min_pulley_dia_no_vguide_in',
  'belt_min_pulley_dia_with_vguide_in',
  // Belt coefficients are looked up from catalog, but user CAN override
  // so we keep them as user inputs if explicitly set
];

/**
 * Keys that are internal/resolved values, not user inputs.
 */
const INTERNAL_RESOLVED_KEYS: string[] = [
  // Add any keys discovered to be internal
];

// ============================================================================
// ALIAS MAPPING
// ============================================================================

/**
 * Map of old key -> new key for aliases.
 * The old key should be collapsed to the new key.
 */
const ALIAS_MAP: Record<string, string> = {
  'drive_rpm': 'drive_rpm_input', // Legacy drive_rpm -> drive_rpm_input
};

// ============================================================================
// MODE-GATED KEYS
// ============================================================================

/**
 * Keys that should be removed based on mode switches.
 * Format: { modeKey: { modeValue: [keysToRemove] } }
 */
const MODE_GATED_KEYS: Record<string, Record<string, string[]>> = {
  'speed_mode': {
    'belt_speed': [
      'drive_rpm_input', // In belt_speed mode, user specifies belt_speed_fpm, not RPM
      'drive_rpm',       // Legacy alias also removed
    ],
    'drive_rpm': [
      // In drive_rpm mode, belt_speed_fpm is derived, but we keep it
      // as it may be used for display. Only remove if truly contradicting.
      // For now, keep belt_speed_fpm as it's harmless.
    ],
  },
};

// ============================================================================
// CANONICALIZATION FUNCTION
// ============================================================================

export interface CanonicalizationResult {
  /** Cleaned user inputs - only canonical, active, user-controlled values */
  userInputs: Record<string, unknown>;
  /** Keys that were removed and why (for debugging) */
  removedKeys: Array<{ key: string; reason: string }>;
}

/**
 * Canonicalize recipe inputs.
 *
 * This function takes raw inputs (typically from UI/form state) and produces
 * a clean user_inputs blob that represents engineering intent.
 *
 * @param rawInputs - Raw inputs from UI/form state
 * @returns Canonicalized user inputs and list of removed keys
 */
export function canonicalizeRecipeInputs(
  rawInputs: Record<string, unknown>
): CanonicalizationResult {
  const removedKeys: Array<{ key: string; reason: string }> = [];

  // Start with a copy
  const result: Record<string, unknown> = { ...rawInputs };

  // Rule 1: Drop deprecated keys
  for (const key of DEPRECATED_KEYS) {
    if (key in result) {
      delete result[key];
      removedKeys.push({ key, reason: 'deprecated' });
    }
  }

  // Rule 2: Collapse aliases
  for (const [oldKey, newKey] of Object.entries(ALIAS_MAP)) {
    if (oldKey in result) {
      // If new key doesn't exist, copy value to new key
      if (!(newKey in result)) {
        result[newKey] = result[oldKey];
      }
      // Always delete old key
      delete result[oldKey];
      removedKeys.push({ key: oldKey, reason: `aliased to ${newKey}` });
    }
  }

  // Rule 3: Drop derived catalog keys
  for (const key of DERIVED_CATALOG_KEYS) {
    if (key in result) {
      delete result[key];
      removedKeys.push({ key, reason: 'derived from catalog' });
    }
  }

  // Rule 4: Drop internal/resolved keys
  for (const key of INTERNAL_RESOLVED_KEYS) {
    if (key in result) {
      delete result[key];
      removedKeys.push({ key, reason: 'internal resolved value' });
    }
  }

  // Rule 5: Drop mode-gated keys based on current mode
  for (const [modeKey, modeMap] of Object.entries(MODE_GATED_KEYS)) {
    const modeValue = result[modeKey];
    if (typeof modeValue === 'string' && modeValue in modeMap) {
      const keysToRemove = modeMap[modeValue];
      for (const key of keysToRemove) {
        if (key in result) {
          delete result[key];
          removedKeys.push({ key, reason: `inactive in ${modeKey}=${modeValue} mode` });
        }
      }
    }
  }

  // Rule 6: Strip undefined and null values
  for (const [key, value] of Object.entries(result)) {
    if (value === undefined || value === null) {
      delete result[key];
      removedKeys.push({ key, reason: 'null/undefined' });
    }
  }

  return {
    userInputs: result,
    removedKeys,
  };
}

/**
 * Get list of all keys that will be removed during canonicalization.
 * Useful for documentation and testing.
 */
export function getCanonicalizedDenylist(): {
  deprecated: string[];
  derived: string[];
  internal: string[];
  aliases: Record<string, string>;
  modeGated: typeof MODE_GATED_KEYS;
} {
  return {
    deprecated: [...DEPRECATED_KEYS],
    derived: [...DERIVED_CATALOG_KEYS],
    internal: [...INTERNAL_RESOLVED_KEYS],
    aliases: { ...ALIAS_MAP },
    modeGated: { ...MODE_GATED_KEYS },
  };
}
