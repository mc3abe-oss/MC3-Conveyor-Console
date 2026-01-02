/**
 * RECIPE SYSTEM - CANONICAL HASHING
 *
 * Provides stable, deterministic hashing for recipe inputs and outputs.
 *
 * IMPORTANT: This module re-exports canonicalization functions from
 * the single source of truth at src/lib/canonicalize. This ensures
 * client dirty tracking and server hashing use identical logic.
 *
 * Key behaviors:
 * - Recursive key sorting for nested objects
 * - Undefined keys are SKIPPED (treated as missing)
 * - null keys are KEPT (explicit null is meaningful)
 * - Arrays preserve order, but objects within arrays are sorted
 */

import { createHash } from 'crypto';
import {
  stripUndefined,
  canonicalStringify,
  canonicalizePayload,
} from '../canonicalize';

// Re-export for backward compatibility
export { stripUndefined, canonicalStringify, canonicalizePayload };

/**
 * Compute SHA256 hash of a canonical JSON string.
 *
 * @param value - Value to hash
 * @returns SHA256 hex digest (64 characters)
 */
export function hashCanonical(value: unknown): string {
  const canonical = canonicalizePayload(value);
  return createHash('sha256').update(canonical).digest('hex');
}
