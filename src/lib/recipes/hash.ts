/**
 * RECIPE SYSTEM - CANONICAL HASHING
 *
 * Provides stable, deterministic hashing for recipe inputs and outputs.
 * Key requirements:
 * - Recursive key sorting for nested objects
 * - Undefined keys are SKIPPED (treated as missing)
 * - Arrays preserve order, but objects within arrays are sorted
 * - Consistent number formatting
 */

import { createHash } from 'crypto';

/**
 * Canonical JSON stringify with stable key ordering at all nesting levels.
 *
 * Rules:
 * - Objects: keys sorted alphabetically, undefined values SKIPPED
 * - Arrays: order preserved, elements recursively processed
 * - null: "null"
 * - undefined (at top level): "undefined" (should not happen after normalization)
 * - Primitives: JSON.stringify
 *
 * @param value - Value to stringify
 * @returns Canonical JSON string
 */
export function canonicalStringify(value: unknown): string {
  // Handle undefined at top level (edge case, should not happen)
  if (value === undefined) {
    return 'undefined';
  }

  // Handle null
  if (value === null) {
    return 'null';
  }

  // Handle primitives (string, number, boolean)
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalStringify(item));
    return '[' + items.join(',') + ']';
  }

  // Handle objects: sort keys, skip undefined values
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();

  const pairs: string[] = [];
  for (const key of sortedKeys) {
    const val = obj[key];
    // SKIP undefined values (treat as missing)
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
 * Compute SHA256 hash of a canonical JSON string.
 *
 * @param value - Value to hash
 * @returns SHA256 hex digest
 */
export function hashCanonical(value: unknown): string {
  const canonical = canonicalStringify(value);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Strip undefined values from an object recursively.
 * Useful for normalizing inputs before hashing.
 *
 * @param obj - Object to strip
 * @returns New object with undefined values removed
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
