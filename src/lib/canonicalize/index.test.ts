/**
 * CANONICAL PAYLOAD TESTS
 *
 * Tests for unified canonicalization behavior:
 * 1. undefined/null handling matrix
 * 2. Client-server consistency
 * 3. Key ordering stability
 */

import {
  stripUndefined,
  canonicalStringify,
  canonicalizePayload,
  payloadsEqual,
} from './index';

describe('stripUndefined', () => {
  describe('primitives', () => {
    it('returns primitives unchanged', () => {
      expect(stripUndefined(42)).toBe(42);
      expect(stripUndefined('hello')).toBe('hello');
      expect(stripUndefined(true)).toBe(true);
      expect(stripUndefined(null)).toBe(null);
      expect(stripUndefined(undefined)).toBe(undefined);
    });
  });

  describe('objects', () => {
    it('removes undefined from flat objects', () => {
      const input = { a: 1, b: undefined, c: 3 };
      const result = stripUndefined(input);
      expect(result).toEqual({ a: 1, c: 3 });
      expect('b' in result).toBe(false);
    });

    it('preserves null values', () => {
      const input = { a: 1, b: null, c: 3 };
      const result = stripUndefined(input);
      expect(result).toEqual({ a: 1, b: null, c: 3 });
    });

    it('removes undefined from nested objects', () => {
      const input = {
        level1: {
          keep: 'value',
          remove: undefined,
          nested: {
            also_keep: 42,
            also_remove: undefined,
          },
        },
      };
      expect(stripUndefined(input)).toEqual({
        level1: {
          keep: 'value',
          nested: {
            also_keep: 42,
          },
        },
      });
    });

    it('does not modify original object', () => {
      const input = { a: 1, b: undefined };
      const original = { ...input };
      stripUndefined(input);
      expect(input).toEqual(original);
    });
  });

  describe('arrays', () => {
    it('processes objects within arrays', () => {
      const input = [{ a: 1, b: undefined }, { c: 3 }];
      expect(stripUndefined(input)).toEqual([{ a: 1 }, { c: 3 }]);
    });

    it('preserves array order', () => {
      const input = [3, 1, 2];
      expect(stripUndefined(input)).toEqual([3, 1, 2]);
    });
  });
});

describe('canonicalStringify', () => {
  describe('primitives', () => {
    it('handles null', () => {
      expect(canonicalStringify(null)).toBe('null');
    });

    it('handles strings', () => {
      expect(canonicalStringify('hello')).toBe('"hello"');
      expect(canonicalStringify('')).toBe('""');
    });

    it('handles numbers', () => {
      expect(canonicalStringify(42)).toBe('42');
      expect(canonicalStringify(3.14)).toBe('3.14');
      expect(canonicalStringify(-100)).toBe('-100');
    });

    it('handles booleans', () => {
      expect(canonicalStringify(true)).toBe('true');
      expect(canonicalStringify(false)).toBe('false');
    });
  });

  describe('objects', () => {
    it('sorts keys alphabetically', () => {
      expect(canonicalStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
      expect(canonicalStringify({ z: 1, m: 2, a: 3 })).toBe('{"a":3,"m":2,"z":1}');
    });

    it('sorts nested object keys', () => {
      expect(canonicalStringify({ z: { b: 1, a: 2 } })).toBe('{"z":{"a":2,"b":1}}');
    });

    it('handles empty objects', () => {
      expect(canonicalStringify({})).toBe('{}');
    });
  });

  describe('arrays', () => {
    it('preserves array order', () => {
      expect(canonicalStringify([3, 1, 2])).toBe('[3,1,2]');
    });

    it('sorts object keys within arrays', () => {
      expect(canonicalStringify([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
    });

    it('handles empty arrays', () => {
      expect(canonicalStringify([])).toBe('[]');
    });
  });
});

describe('canonicalizePayload', () => {
  it('strips undefined and stringifies', () => {
    const input = { a: 1, b: undefined, c: 3 };
    expect(canonicalizePayload(input)).toBe('{"a":1,"c":3}');
  });

  it('preserves null values', () => {
    const input = { a: 1, b: null, c: 3 };
    expect(canonicalizePayload(input)).toBe('{"a":1,"b":null,"c":3}');
  });

  it('handles deeply nested undefined', () => {
    const input = {
      level1: {
        level2: {
          keep: 'value',
          skip: undefined,
        },
      },
    };
    expect(canonicalizePayload(input)).toBe('{"level1":{"level2":{"keep":"value"}}}');
  });
});

describe('payloadsEqual', () => {
  describe('undefined/null matrix', () => {
    it('treats {a: undefined} as equal to {}', () => {
      expect(payloadsEqual({ a: undefined }, {})).toBe(true);
    });

    it('treats {a: null} as NOT equal to {}', () => {
      expect(payloadsEqual({ a: null }, {})).toBe(false);
    });

    it('treats {a: undefined} as NOT equal to {a: null}', () => {
      expect(payloadsEqual({ a: undefined }, { a: null })).toBe(false);
    });

    it('treats nested {settings: {theme: undefined}} as equal to {settings: {}}', () => {
      expect(
        payloadsEqual(
          { settings: { theme: undefined } },
          { settings: {} }
        )
      ).toBe(true);
    });

    it('treats nested {settings: {theme: null}} as NOT equal to {settings: {}}', () => {
      expect(
        payloadsEqual(
          { settings: { theme: null } },
          { settings: {} }
        )
      ).toBe(false);
    });
  });

  describe('key order independence', () => {
    it('ignores key order in objects', () => {
      expect(payloadsEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });

    it('ignores key order in nested objects', () => {
      expect(
        payloadsEqual(
          { outer: { a: 1, b: 2 } },
          { outer: { b: 2, a: 1 } }
        )
      ).toBe(true);
    });
  });

  describe('array order significance', () => {
    it('preserves array order (different order = not equal)', () => {
      expect(payloadsEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });

    it('same array order = equal', () => {
      expect(payloadsEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('handles typical form payload comparison', () => {
      const initial = {
        belt_width_in: 24,
        conveyor_length_cc_in: 120,
        _config: {
          reference_type: 'QUOTE',
          reference_number: '12345',
        },
      };

      const current = {
        conveyor_length_cc_in: 120,
        belt_width_in: 24,
        _config: {
          reference_number: '12345',
          reference_type: 'QUOTE',
        },
      };

      expect(payloadsEqual(initial, current)).toBe(true);
    });

    it('detects actual changes in form payloads', () => {
      const initial = {
        belt_width_in: 24,
        conveyor_length_cc_in: 120,
      };

      const current = {
        belt_width_in: 24,
        conveyor_length_cc_in: 150, // Changed
      };

      expect(payloadsEqual(initial, current)).toBe(false);
    });
  });
});

describe('Client-Server Consistency', () => {
  /**
   * These tests verify that the canonicalization behavior matches
   * what the server-side hash.ts expects, ensuring that:
   * - Client dirty tracking agrees with server deduplication
   * - No "dirty but no_change" scenarios
   */

  it('client sees same equality as server hash comparison', () => {
    // Scenario: User loads a config, makes no changes, saves
    const serverStored = { a: 1, b: 2 };
    const clientCurrent = { b: 2, a: 1 }; // Same data, different key order

    // Client should see: not dirty
    expect(payloadsEqual(serverStored, clientCurrent)).toBe(true);

    // Server would see: same hash (no_change)
    // Both use same canonicalizePayload, so this is guaranteed
  });

  it('undefined handling matches server stripUndefined behavior', () => {
    // Scenario: Form has optional field that user didn't fill
    const withUndefined = { required: 'value', optional: undefined };
    const withoutKey = { required: 'value' };

    // Both client and server should treat these as equal
    expect(payloadsEqual(withUndefined, withoutKey)).toBe(true);
  });
});
