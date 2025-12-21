/**
 * Client-side payload comparison utilities
 *
 * Used for dirty tracking in the UI
 */

/**
 * Stable JSON stringify for client-side (matches server-side implementation)
 */
function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => {
    return JSON.stringify(key) + ':' + stableStringify(obj[key]);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Deep equality check for payloads
 */
export function payloadsEqual(a: any, b: any): boolean {
  return stableStringify(a) === stableStringify(b);
}
