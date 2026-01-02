/**
 * CANONICAL PAYLOAD UTILITIES
 *
 * Single source of truth for payload canonicalization.
 * Used by both:
 * - Client-side: dirty tracking (payloadsEqual)
 * - Server-side: recipe hashing (hashCanonical)
 *
 * RULES:
 * - Objects: keys sorted alphabetically
 * - Arrays: order preserved
 * - undefined: SKIPPED (treated as missing key)
 * - null: KEPT (explicit null is meaningful)
 *
 * This ensures client and server always agree on payload equality.
 */

/**
 * Recursively strip undefined values from an object.
 * This is the normalization step before comparison or hashing.
 *
 * @param obj - Object to normalize
 * @returns New object with undefined values removed at all levels
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = stripUndefined(value);
    }
  }
  return result as T;
}

/**
 * Canonical JSON stringify with stable key ordering at all nesting levels.
 *
 * IMPORTANT: This function assumes undefined values have already been stripped.
 * For full canonicalization, use canonicalizePayload() instead.
 *
 * Rules:
 * - Objects: keys sorted alphabetically
 * - Arrays: order preserved, elements recursively processed
 * - null: "null"
 * - Primitives: JSON.stringify
 *
 * @param value - Value to stringify (should be pre-normalized)
 * @returns Canonical JSON string
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    // Should not happen after normalization, but handle gracefully
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalStringify(item));
    return '[' + items.join(',') + ']';
  }

  // Object: sort keys alphabetically
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();

  const pairs: string[] = [];
  for (const key of sortedKeys) {
    const val = obj[key];
    // Skip undefined (should already be stripped, but belt-and-suspenders)
    if (val === undefined) {
      continue;
    }
    const keyStr = JSON.stringify(key);
    const valStr = canonicalStringify(val);
    pairs.push(keyStr + ':' + valStr);
  }

  return '{' + pairs.join(',') + '}';
}

/**
 * Canonicalize a payload for comparison or hashing.
 *
 * This is THE canonical function for payload normalization.
 * Steps:
 * 1. Strip undefined values recursively
 * 2. Stringify with stable key ordering
 *
 * @param payload - Any payload object
 * @returns Canonical string representation
 */
export function canonicalizePayload(payload: unknown): string {
  const normalized = stripUndefined(payload);
  return canonicalStringify(normalized);
}

/**
 * Compare two payloads for equality using canonical form.
 *
 * Two payloads are equal if their canonical forms are identical.
 * This means:
 * - { a: 1, b: undefined } equals { a: 1 }
 * - { a: 1, b: null } does NOT equal { a: 1 }
 * - Key order doesn't matter
 *
 * @param a - First payload
 * @param b - Second payload
 * @returns true if payloads are canonically equal
 */
export function payloadsEqual(a: unknown, b: unknown): boolean {
  return canonicalizePayload(a) === canonicalizePayload(b);
}
