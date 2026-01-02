/**
 * Tests for type-aware comparator.
 */

import {
  getFieldType,
  getDefaultTolerance,
  getDefaultTolerancesForAllFields,
  compareField,
  compareOutputs,
  compareIssues,
} from './compare';
import { ToleranceSpec, ExpectedIssue, ActualIssue } from './types';

describe('getFieldType', () => {
  it('identifies missing (undefined)', () => {
    expect(getFieldType(undefined)).toBe('missing');
  });

  it('identifies null', () => {
    expect(getFieldType(null)).toBe('null');
  });

  it('identifies numeric', () => {
    expect(getFieldType(42)).toBe('numeric');
    expect(getFieldType(3.14)).toBe('numeric');
    expect(getFieldType(0)).toBe('numeric');
    expect(getFieldType(-100)).toBe('numeric');
  });

  it('identifies boolean', () => {
    expect(getFieldType(true)).toBe('boolean');
    expect(getFieldType(false)).toBe('boolean');
  });

  it('identifies string', () => {
    expect(getFieldType('hello')).toBe('string');
    expect(getFieldType('')).toBe('string');
    expect(getFieldType('EnumValue')).toBe('string');
  });

  it('identifies array', () => {
    expect(getFieldType([])).toBe('array');
    expect(getFieldType([1, 2, 3])).toBe('array');
    expect(getFieldType(['a', 'b'])).toBe('array');
  });

  it('identifies object', () => {
    expect(getFieldType({})).toBe('object');
    expect(getFieldType({ a: 1 })).toBe('object');
    expect(getFieldType({ nested: { value: true } })).toBe('object');
  });
});

describe('getDefaultTolerance', () => {
  it('returns correct tolerance for _in suffix', () => {
    const tol = getDefaultTolerance('belt_width_in');
    expect(tol).toEqual({ abs: 0.001 });
  });

  it('returns correct tolerance for _lbf suffix', () => {
    const tol = getDefaultTolerance('total_load_lbf');
    expect(tol).toEqual({ abs: 0.1 });
  });

  it('returns correct tolerance for _rpm suffix', () => {
    const tol = getDefaultTolerance('drive_shaft_rpm');
    expect(tol).toEqual({ rel: 0.001 });
  });

  it('returns fallback for unknown suffix', () => {
    const tol = getDefaultTolerance('some_unknown_field');
    expect(tol).toEqual({ rel: 0.0001 });
  });
});

describe('getDefaultTolerancesForAllFields', () => {
  it('generates tolerances for all numeric fields', () => {
    const outputs = {
      belt_width_in: 24,
      drive_shaft_rpm: 100,
      is_v_guided: true,
      speed_mode_used: 'belt_speed',
    };

    const tolerances = getDefaultTolerancesForAllFields(outputs);

    expect(tolerances).toHaveProperty('belt_width_in');
    expect(tolerances).toHaveProperty('drive_shaft_rpm');
    expect(tolerances).not.toHaveProperty('is_v_guided');
    expect(tolerances).not.toHaveProperty('speed_mode_used');
  });
});

describe('compareField', () => {
  describe('missing/null handling', () => {
    it('passes when both are missing', () => {
      const result = compareField('field', undefined, undefined);
      expect(result.passed).toBe(true);
      expect(result.fieldType).toBe('missing');
    });

    it('passes when both are null', () => {
      const result = compareField('field', null, null);
      expect(result.passed).toBe(true);
      expect(result.fieldType).toBe('null');
    });

    it('fails when expected is missing but actual has value', () => {
      const result = compareField('field', undefined, 42);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('missing_expected');
    });

    it('fails when expected has value but actual is missing', () => {
      const result = compareField('field', 42, undefined);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('missing_actual');
    });

    it('fails when expected is null but actual has value', () => {
      const result = compareField('field', null, 42);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('missing_expected');
    });

    it('fails when missing vs null (they are different)', () => {
      const result = compareField('field', undefined, null);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });
  });

  describe('type mismatch', () => {
    it('fails when types differ (number vs string)', () => {
      const result = compareField('field', 42, '42');
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('type_mismatch');
    });

    it('fails when types differ (boolean vs number)', () => {
      const result = compareField('field', true, 1);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('type_mismatch');
    });
  });

  describe('boolean comparison', () => {
    it('passes when booleans match', () => {
      expect(compareField('field', true, true).passed).toBe(true);
      expect(compareField('field', false, false).passed).toBe(true);
    });

    it('fails when booleans differ', () => {
      const result = compareField('field', true, false);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });
  });

  describe('string comparison', () => {
    it('passes when strings match exactly', () => {
      expect(compareField('field', 'hello', 'hello').passed).toBe(true);
    });

    it('fails when strings differ', () => {
      const result = compareField('field', 'hello', 'world');
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });

    it('is case-sensitive', () => {
      const result = compareField('field', 'Hello', 'hello');
      expect(result.passed).toBe(false);
    });
  });

  describe('array comparison', () => {
    it('passes when arrays are deeply equal', () => {
      const result = compareField('field', [1, 2, 3], [1, 2, 3]);
      expect(result.passed).toBe(true);
      expect(result.fieldType).toBe('array');
    });

    it('passes when empty arrays match', () => {
      const result = compareField('field', [], []);
      expect(result.passed).toBe(true);
      expect(result.fieldType).toBe('array');
    });

    it('passes when nested arrays match', () => {
      const result = compareField('field', [[1, 2], [3, 4]], [[1, 2], [3, 4]]);
      expect(result.passed).toBe(true);
    });

    it('fails when arrays have different lengths', () => {
      const result = compareField('field', [1, 2], [1, 2, 3]);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });

    it('fails when array elements differ', () => {
      const result = compareField('field', [1, 2, 3], [1, 2, 4]);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });

    it('fails when array order differs', () => {
      const result = compareField('field', [1, 2, 3], [3, 2, 1]);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });
  });

  describe('object comparison', () => {
    it('passes when objects are deeply equal', () => {
      const result = compareField('field', { a: 1, b: 2 }, { a: 1, b: 2 });
      expect(result.passed).toBe(true);
      expect(result.fieldType).toBe('object');
    });

    it('passes when empty objects match', () => {
      const result = compareField('field', {}, {});
      expect(result.passed).toBe(true);
      expect(result.fieldType).toBe('object');
    });

    it('passes when nested objects match', () => {
      const result = compareField(
        'field',
        { a: { b: { c: 1 } } },
        { a: { b: { c: 1 } } }
      );
      expect(result.passed).toBe(true);
    });

    it('passes regardless of key order', () => {
      const result = compareField('field', { a: 1, b: 2 }, { b: 2, a: 1 });
      expect(result.passed).toBe(true);
    });

    it('fails when objects have different keys', () => {
      const result = compareField('field', { a: 1 }, { b: 1 });
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });

    it('fails when object values differ', () => {
      const result = compareField('field', { a: 1 }, { a: 2 });
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('value_mismatch');
    });

    it('handles objects with array values', () => {
      const result = compareField(
        'field',
        { items: [1, 2, 3] },
        { items: [1, 2, 3] }
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('numeric comparison with tolerances', () => {
    it('passes when values are equal', () => {
      const result = compareField('field', 100, 100, { abs: 0.1 });
      expect(result.passed).toBe(true);
      expect(result.delta).toBe(0);
    });

    it('passes when within absolute tolerance', () => {
      const result = compareField('field', 100, 100.05, { abs: 0.1 });
      expect(result.passed).toBe(true);
      expect(result.delta).toBeCloseTo(0.05);
    });

    it('fails when exceeds absolute tolerance', () => {
      const result = compareField('field', 100, 100.2, { abs: 0.1 });
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('exceeded_abs');
    });

    it('passes when within relative tolerance', () => {
      const result = compareField('field', 100, 100.05, { rel: 0.001 });
      expect(result.passed).toBe(true);
      expect(result.deltaRel).toBeCloseTo(0.0005);
    });

    it('fails when exceeds relative tolerance', () => {
      const result = compareField('field', 100, 101, { rel: 0.001 });
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('exceeded_rel');
    });

    it('applies rounding before comparison', () => {
      // Without rounding: 100.004 vs 100.006 would differ
      // With round=2: both become 100.00 and 100.01
      const result = compareField('field', 100.004, 100.006, { abs: 0.001, round: 2 });
      // After rounding to 2 decimals: 100.00 vs 100.01, delta = 0.01
      expect(result.delta).toBeCloseTo(0.01);
    });

    it('handles zero expected value', () => {
      const result = compareField('field', 0, 0.001, { abs: 0.01 });
      expect(result.passed).toBe(true);
      expect(result.deltaRel).toBe(Infinity);  // relative is infinite when expected is 0
    });

    it('handles both abs and rel tolerance', () => {
      // Exceeds both
      const result = compareField('field', 100, 110, { abs: 5, rel: 0.01 });
      expect(result.passed).toBe(false);
      expect(result.reason).toBe('exceeded_abs+exceeded_rel');
    });
  });
});

describe('compareOutputs', () => {
  it('compares all fields from both expected and actual', () => {
    const expected = { a: 1, b: 2 };
    const actual = { b: 2, c: 3 };

    const result = compareOutputs(expected, actual, {
      a: { abs: 0.1 },
      b: { abs: 0.1 },
      c: { abs: 0.1 },
    });

    expect(result.comparisons).toHaveLength(3);
    expect(result.comparisons.find((c) => c.field === 'a')?.passed).toBe(false);  // missing actual
    expect(result.comparisons.find((c) => c.field === 'b')?.passed).toBe(true);
    expect(result.comparisons.find((c) => c.field === 'c')?.passed).toBe(false);  // missing expected
  });

  it('tracks max drift', () => {
    const expected = { a: 100, b: 100 };
    const actual = { a: 101, b: 110 };  // b has 10% drift

    const result = compareOutputs(expected, actual, {
      a: { rel: 0.2 },
      b: { rel: 0.2 },
    });

    expect(result.maxDriftRel).toBeCloseTo(0.1);
    expect(result.maxDriftField).toBe('b');
  });

  it('uses default tolerances when not specified', () => {
    const expected = { belt_width_in: 24 };
    const actual = { belt_width_in: 24.0005 };

    const result = compareOutputs(expected, actual);

    expect(result.passed).toBe(true);  // within default abs: 0.001
  });

  describe('strict mode', () => {
    it('fails for numeric fields without explicit tolerance in strict mode', () => {
      const expected = { value: 100 };
      const actual = { value: 100 };

      const result = compareOutputs(expected, actual, {}, true);

      expect(result.passed).toBe(false);
      expect(result.comparisons[0].reason).toBe('missing_tolerance_in_strict_mode');
    });

    it('passes in strict mode when tolerances are provided', () => {
      const expected = { value: 100 };
      const actual = { value: 100 };

      const result = compareOutputs(expected, actual, { value: { abs: 0.1 } }, true);

      expect(result.passed).toBe(true);
    });

    it('non-numeric fields do not require tolerance in strict mode', () => {
      const expected = { flag: true, name: 'test' };
      const actual = { flag: true, name: 'test' };

      const result = compareOutputs(expected, actual, {}, true);

      expect(result.passed).toBe(true);
    });
  });
});

describe('compareIssues', () => {
  it('passes when all required issues are present', () => {
    const expected: ExpectedIssue[] = [
      { code: 'ISSUE_A', severity: 'warning', required: true },
      { code: 'ISSUE_B', severity: 'info', required: false },
    ];
    const actual: ActualIssue[] = [
      { code: 'ISSUE_A', severity: 'warning', message: 'Issue A occurred' },
    ];

    const result = compareIssues(expected, actual);

    expect(result.passed).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.matched).toContain('ISSUE_A');
  });

  it('fails when required issue is missing', () => {
    const expected: ExpectedIssue[] = [
      { code: 'ISSUE_A', severity: 'warning', required: true },
    ];
    const actual: ActualIssue[] = [];

    const result = compareIssues(expected, actual);

    expect(result.passed).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].code).toBe('ISSUE_A');
  });

  it('fails when unexpected error appears', () => {
    const expected: ExpectedIssue[] = [];
    const actual: ActualIssue[] = [
      { code: 'UNEXPECTED', severity: 'error', message: 'Unexpected error' },
    ];

    const result = compareIssues(expected, actual);

    expect(result.passed).toBe(false);
    expect(result.unexpected).toHaveLength(1);
    expect(result.unexpected[0].code).toBe('UNEXPECTED');
  });

  it('ignores unexpected warnings/info', () => {
    const expected: ExpectedIssue[] = [];
    const actual: ActualIssue[] = [
      { code: 'WARN', severity: 'warning', message: 'Some warning' },
      { code: 'INFO', severity: 'info', message: 'Some info' },
    ];

    const result = compareIssues(expected, actual);

    expect(result.passed).toBe(true);
    expect(result.unexpected).toHaveLength(0);
  });

  it('handles non-required issues correctly', () => {
    const expected: ExpectedIssue[] = [
      { code: 'OPTIONAL', severity: 'warning', required: false },
    ];
    const actual: ActualIssue[] = [];

    const result = compareIssues(expected, actual);

    expect(result.passed).toBe(true);  // OPTIONAL is not required
    expect(result.missing).toHaveLength(0);
  });
});
