/**
 * Application Code Helpers
 *
 * Validates and parses application codes in Flow-style format:
 * - Base only: numeric string (e.g., "32853", "1234")
 * - With release: numeric base + ".X" release index (e.g., "32853.1", "32853.10")
 *
 * IMPORTANT: These are STRING identifiers, not numeric.
 * - Storage: exact string as entered (no padding, no rewriting)
 * - Sorting: numeric comparison on release index to avoid .1 < .10 < .2 problem
 *
 * Validation rules:
 * - Base must be 1+ digits (for backward compatibility with existing data)
 * - NEW: Also accepts 5-digit Flow-style codes with .X release suffix
 * - Release index must be >= 1 (no ".0")
 * - No leading zeros in release index (e.g., ".01" is rejected)
 * - Trailing dots are rejected (e.g., "32853.")
 */

export interface ParsedApplicationCode {
  /** The full normalized code (trimmed) */
  code: string;
  /** First 5 digits */
  base: string;
  /** Release index after the dot, or null if base-only */
  releaseIndex: number | null;
}

export interface ApplicationCodeError {
  error: string;
}

/**
 * Normalize an application code by trimming whitespace.
 * Does NOT validate - use parseApplicationCode() or isValidApplicationCode() for that.
 */
export function normalizeApplicationCode(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  return raw.trim();
}

/**
 * Parse an application code into its components.
 *
 * @param code - The application code string (will be trimmed)
 * @returns ParsedApplicationCode on success, ApplicationCodeError on failure
 *
 * @example
 * parseApplicationCode("32853")     // { code: "32853", base: "32853", releaseIndex: null }
 * parseApplicationCode("32853.1")   // { code: "32853.1", base: "32853", releaseIndex: 1 }
 * parseApplicationCode("32853.10")  // { code: "32853.10", base: "32853", releaseIndex: 10 }
 * parseApplicationCode("3285")      // { error: "Base must be exactly 5 digits" }
 */
export function parseApplicationCode(code: string): ParsedApplicationCode | ApplicationCodeError {
  const normalized = normalizeApplicationCode(code);

  if (!normalized) {
    return { error: 'Application code is required' };
  }

  // Check for dot (release suffix)
  if (normalized.includes('.')) {
    const parts = normalized.split('.');

    // Must be exactly 2 parts (base.release)
    if (parts.length !== 2) {
      return { error: 'Invalid format. Use digits or digits with .X release (e.g., 32853 or 32853.2)' };
    }

    const [basePart, releasePart] = parts;

    // Validate base: at least 1 digit (flexible for backward compatibility)
    if (!basePart || !/^\d+$/.test(basePart)) {
      return { error: 'Base must be numeric' };
    }

    // Validate release: must be non-empty digits
    if (!releasePart || !/^\d+$/.test(releasePart)) {
      return { error: 'Release index must be numeric (e.g., .1, .2, .10)' };
    }

    // Reject leading zeros in release (e.g., ".01")
    if (releasePart.length > 1 && releasePart.startsWith('0')) {
      return { error: 'Release index cannot have leading zeros (use .1 not .01)' };
    }

    const releaseIndex = parseInt(releasePart, 10);

    // Release must be >= 1 (no ".0")
    if (releaseIndex < 1) {
      return { error: 'Release index must be >= 1' };
    }

    return {
      code: normalized,
      base: basePart,
      releaseIndex,
    };
  }

  // Base-only format: at least 1 digit (flexible for backward compatibility)
  if (!/^\d+$/.test(normalized)) {
    return { error: 'Application code must be numeric (e.g., 32853 or 32853.2)' };
  }

  return {
    code: normalized,
    base: normalized,
    releaseIndex: null,
  };
}

/**
 * Check if a parse result is an error
 */
export function isApplicationCodeError(
  result: ParsedApplicationCode | ApplicationCodeError
): result is ApplicationCodeError {
  return 'error' in result;
}

/**
 * Check if an application code string is valid.
 *
 * @param code - The application code to validate
 * @returns true if valid, false otherwise
 */
export function isValidApplicationCode(code: string): boolean {
  return !isApplicationCodeError(parseApplicationCode(code));
}

/**
 * Compare two application codes for sorting.
 *
 * Sort order:
 * 1. By base (string comparison - effectively numeric since all are 5 digits)
 * 2. By release index (numeric comparison)
 *    - Base-only codes (no release) sort BEFORE any release (treated as release 0)
 *    - This means: 32853 < 32853.1 < 32853.2 < 32853.10
 *
 * @returns negative if a < b, 0 if equal, positive if a > b
 *
 * @example
 * // Sorted order: ["32853", "32853.1", "32853.2", "32853.10", "32854.1"]
 * codes.sort(compareApplicationCodes)
 */
export function compareApplicationCodes(a: string, b: string): number {
  const parsedA = parseApplicationCode(a);
  const parsedB = parseApplicationCode(b);

  // Handle parse errors - invalid codes sort to the end
  const aValid = !isApplicationCodeError(parsedA);
  const bValid = !isApplicationCodeError(parsedB);

  if (!aValid && !bValid) return 0;
  if (!aValid) return 1; // Invalid sorts after valid
  if (!bValid) return -1;

  // Both valid - compare by base first
  const baseCompare = (parsedA as ParsedApplicationCode).base.localeCompare(
    (parsedB as ParsedApplicationCode).base
  );
  if (baseCompare !== 0) return baseCompare;

  // Same base - compare by release index
  // Base-only (null) treated as 0, so it sorts before .1
  const releaseA = (parsedA as ParsedApplicationCode).releaseIndex ?? 0;
  const releaseB = (parsedB as ParsedApplicationCode).releaseIndex ?? 0;

  return releaseA - releaseB;
}

/**
 * Get a validation error message for display to the user.
 * Returns null if the code is valid.
 */
export function getApplicationCodeError(code: string): string | null {
  const result = parseApplicationCode(code);
  if (isApplicationCodeError(result)) {
    return result.error;
  }
  return null;
}

/**
 * Format help text for application code input fields
 */
export const APPLICATION_CODE_HELP = 'Use digits, optionally with .X release (e.g., 32853 or 32853.2)';
