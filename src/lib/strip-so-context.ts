/**
 * Query params that represent SO/Quote context.
 * These are stripped when the user clicks "Clear" to start fresh.
 */
export const SO_CONTEXT_PARAMS = ['app', 'quote', 'so', 'suffix', 'jobLine'] as const;

/**
 * Strips SO/Quote context query params from a URLSearchParams object.
 * Returns the cleaned search string (without leading '?').
 *
 * Used when the user clicks "Clear" to ensure the URL no longer
 * references a specific Sales Order or Quote, preventing rehydration
 * on page refresh.
 */
export function stripSoContextFromSearchParams(params: URLSearchParams): string {
  const cleaned = new URLSearchParams(params);
  for (const key of SO_CONTEXT_PARAMS) {
    cleaned.delete(key);
  }
  return cleaned.toString();
}
