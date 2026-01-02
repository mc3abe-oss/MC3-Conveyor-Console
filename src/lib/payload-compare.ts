/**
 * Client-side payload comparison utilities
 *
 * Used for dirty tracking in the UI.
 *
 * IMPORTANT: This module re-exports from the canonical source of truth
 * at src/lib/canonicalize to ensure client and server agree on equality.
 */

export { payloadsEqual } from './canonicalize';
