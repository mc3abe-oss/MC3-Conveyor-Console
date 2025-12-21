/**
 * Payload Hash Utilities
 *
 * Computes stable SHA-256 hash of configuration payload for deduplication
 */

import crypto from 'crypto';

/**
 * Stable JSON stringify - ensures consistent key ordering
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
 * Compute SHA-256 hash of payload
 */
export function computePayloadHash(payload: {
  inputs_json: any;
  parameters_json: any;
  application_json: any;
}): string {
  const stableJson = stableStringify(payload);
  return crypto.createHash('sha256').update(stableJson).digest('hex');
}

/**
 * Deep equality check for payloads (fallback for old revisions without hash)
 */
export function payloadsEqual(a: any, b: any): boolean {
  return stableStringify(a) === stableStringify(b);
}
