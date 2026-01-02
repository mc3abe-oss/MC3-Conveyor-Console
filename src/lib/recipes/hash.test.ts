/**
 * Tests for canonical hashing utilities.
 */

import { canonicalStringify, hashCanonical, stripUndefined } from './hash';

describe('canonicalStringify', () => {
  describe('primitives', () => {
    it('handles null', () => {
      expect(canonicalStringify(null)).toBe('null');
    });

    it('handles undefined at top level (treated as null for consistency)', () => {
      // After normalization, undefined is treated as null
      // This ensures {a: undefined} equals {} after canonicalization
      expect(canonicalStringify(undefined)).toBe('null');
    });

    it('handles strings', () => {
      expect(canonicalStringify('hello')).toBe('"hello"');
      expect(canonicalStringify('')).toBe('""');
      expect(canonicalStringify('with "quotes"')).toBe('"with \\"quotes\\""');
    });

    it('handles numbers', () => {
      expect(canonicalStringify(42)).toBe('42');
      expect(canonicalStringify(3.14159)).toBe('3.14159');
      expect(canonicalStringify(-100)).toBe('-100');
      expect(canonicalStringify(0)).toBe('0');
    });

    it('handles booleans', () => {
      expect(canonicalStringify(true)).toBe('true');
      expect(canonicalStringify(false)).toBe('false');
    });
  });

  describe('arrays', () => {
    it('handles empty arrays', () => {
      expect(canonicalStringify([])).toBe('[]');
    });

    it('preserves array order', () => {
      expect(canonicalStringify([3, 1, 2])).toBe('[3,1,2]');
      expect(canonicalStringify(['c', 'a', 'b'])).toBe('["c","a","b"]');
    });

    it('handles nested arrays', () => {
      expect(canonicalStringify([[1, 2], [3, 4]])).toBe('[[1,2],[3,4]]');
    });

    it('handles arrays with objects (objects sorted)', () => {
      expect(canonicalStringify([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
    });
  });

  describe('objects', () => {
    it('handles empty objects', () => {
      expect(canonicalStringify({})).toBe('{}');
    });

    it('sorts keys alphabetically', () => {
      expect(canonicalStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
      expect(canonicalStringify({ z: 1, m: 2, a: 3 })).toBe('{"a":3,"m":2,"z":1}');
    });

    it('sorts nested object keys', () => {
      expect(canonicalStringify({ z: { b: 1, a: 2 } })).toBe('{"z":{"a":2,"b":1}}');
    });

    it('skips undefined values', () => {
      expect(canonicalStringify({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
    });

    it('handles null values (not skipped)', () => {
      expect(canonicalStringify({ a: 1, b: null, c: 3 })).toBe('{"a":1,"b":null,"c":3}');
    });

    it('handles deeply nested undefined', () => {
      const obj = {
        level1: {
          level2: {
            keep: 'value',
            skip: undefined,
          },
        },
      };
      expect(canonicalStringify(obj)).toBe('{"level1":{"level2":{"keep":"value"}}}');
    });
  });

  describe('complex structures', () => {
    it('handles mixed nested structures', () => {
      const obj = {
        users: [
          { name: 'Alice', age: 30 },
          { age: 25, name: 'Bob' },  // Different key order
        ],
        meta: { version: 1 },
      };
      // Objects within arrays should have sorted keys
      expect(canonicalStringify(obj)).toBe(
        '{"meta":{"version":1},"users":[{"age":30,"name":"Alice"},{"age":25,"name":"Bob"}]}'
      );
    });

    it('produces consistent output regardless of insertion order', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2: Record<string, number> = {};
      obj2.c = 3;
      obj2.a = 1;
      obj2.b = 2;

      expect(canonicalStringify(obj1)).toBe(canonicalStringify(obj2));
    });
  });
});

describe('hashCanonical', () => {
  it('produces consistent hashes for same content', () => {
    const obj1 = { b: 1, a: 2 };
    const obj2 = { a: 2, b: 1 };

    expect(hashCanonical(obj1)).toBe(hashCanonical(obj2));
  });

  it('produces different hashes for different content', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };

    expect(hashCanonical(obj1)).not.toBe(hashCanonical(obj2));
  });

  it('produces 64-character hex string (SHA256)', () => {
    const hash = hashCanonical({ test: 'value' });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles undefined values by skipping them', () => {
    const obj1 = { a: 1, b: undefined };
    const obj2 = { a: 1 };

    expect(hashCanonical(obj1)).toBe(hashCanonical(obj2));
  });

  it('distinguishes null from missing', () => {
    const obj1 = { a: 1, b: null };
    const obj2 = { a: 1 };

    expect(hashCanonical(obj1)).not.toBe(hashCanonical(obj2));
  });
});

describe('stripUndefined', () => {
  it('returns primitives unchanged', () => {
    expect(stripUndefined(42)).toBe(42);
    expect(stripUndefined('hello')).toBe('hello');
    expect(stripUndefined(null)).toBe(null);
    expect(stripUndefined(undefined)).toBe(undefined);
  });

  it('removes undefined from objects', () => {
    const input = { a: 1, b: undefined, c: 3 };
    const result = stripUndefined(input);

    expect(result).toEqual({ a: 1, c: 3 });
    expect('b' in result).toBe(false);
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

  it('processes arrays but does not remove undefined elements', () => {
    // Arrays keep their structure, only objects within are processed
    const input = [{ a: 1, b: undefined }, { c: 3 }];
    expect(stripUndefined(input)).toEqual([{ a: 1 }, { c: 3 }]);
  });

  it('does not modify the original object', () => {
    const input = { a: 1, b: undefined };
    const inputCopy = { ...input };

    stripUndefined(input);

    expect(input).toEqual(inputCopy);
  });
});
