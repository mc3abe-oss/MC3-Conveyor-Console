/**
 * V-Guide Utilities (v1.22.1)
 *
 * Helper functions for V-Guide key translation and backward compatibility.
 */

/**
 * Legacy NA letter to K-code mapping for backward compatibility
 * Used to translate old saved configs that used NA letters as keys
 */
export const NA_LETTER_TO_KCODE: Record<string, string> = {
  'O': 'K10',
  'A': 'K13',
  'B': 'K17',
  'C': 'K22',
};

/**
 * Translate a v_guide_key to canonical K-code
 * Handles backward compatibility for old configs saved with NA letters
 */
export function translateVGuideKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  // If it's an NA letter, translate to K-code
  if (NA_LETTER_TO_KCODE[key]) {
    return NA_LETTER_TO_KCODE[key];
  }
  // Already a K-code or unknown, return as-is
  return key;
}
