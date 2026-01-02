/**
 * RECIPE SYSTEM - TYPE-AWARE COMPARATOR
 *
 * Compares expected vs actual outputs with:
 * - Numeric fields: tolerance-based (abs/rel/round)
 * - Boolean/string fields: exact match
 * - Missing vs null distinction
 * - Strict mode: fail if numeric field has no explicit tolerance
 */

import {
  ToleranceSpec,
  FieldComparison,
  FieldType,
  FieldComparisonReason,
  ComparisonResult,
  ExpectedIssue,
  ActualIssue,
  IssueDiff,
  DEFAULT_TOLERANCES,
  FALLBACK_TOLERANCE,
} from './types';

// ============================================================================
// FIELD TYPE DETECTION
// ============================================================================

/**
 * Determine the type of a field value.
 */
export function getFieldType(value: unknown): FieldType {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (typeof value === 'number') return 'numeric';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'string';  // includes enums
}

// ============================================================================
// DEEP EQUALITY
// ============================================================================

/**
 * Deep equality comparison for arrays and objects.
 * Uses a simple recursive approach suitable for JSON-serializable data.
 *
 * @param a - First value
 * @param b - Second value
 * @returns True if deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Primitive or reference equality
  if (a === b) return true;

  // Type check
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  // One is array, other is not
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
  }

  return false;
}

// ============================================================================
// DEFAULT TOLERANCE LOOKUP
// ============================================================================

/**
 * Get default tolerance for a field based on suffix patterns.
 *
 * @param field - Field name
 * @returns Default tolerance spec
 */
export function getDefaultTolerance(field: string): ToleranceSpec {
  for (const [suffix, tolerance] of Object.entries(DEFAULT_TOLERANCES)) {
    if (field.endsWith(suffix)) {
      return tolerance;
    }
  }
  return FALLBACK_TOLERANCE;
}

/**
 * Build default tolerances for all numeric fields in an output object.
 *
 * @param outputs - Output object
 * @returns Record of field -> tolerance
 */
export function getDefaultTolerancesForAllFields(
  outputs: Record<string, unknown>
): Record<string, ToleranceSpec> {
  const result: Record<string, ToleranceSpec> = {};

  for (const [field, value] of Object.entries(outputs)) {
    if (typeof value === 'number') {
      result[field] = getDefaultTolerance(field);
    }
  }

  return result;
}

// ============================================================================
// SINGLE FIELD COMPARISON
// ============================================================================

/**
 * Compare a single field between expected and actual.
 *
 * @param field - Field name
 * @param expected - Expected value
 * @param actual - Actual value
 * @param tolerance - Tolerance spec for numeric fields
 * @returns Field comparison result
 */
export function compareField(
  field: string,
  expected: unknown,
  actual: unknown,
  tolerance?: ToleranceSpec
): FieldComparison {
  const expectedType = getFieldType(expected);
  const actualType = getFieldType(actual);

  // Handle missing/null cases explicitly
  if (expectedType === 'missing' && actualType === 'missing') {
    return { field, fieldType: 'missing', expected, actual, passed: true };
  }
  if (expectedType === 'null' && actualType === 'null') {
    return { field, fieldType: 'null', expected, actual, passed: true };
  }

  // Expected nothing (missing/null), got something
  if (expectedType === 'missing' || expectedType === 'null') {
    if (actualType === 'missing' || actualType === 'null') {
      // Both are "empty" but different kinds - missing vs null mismatch
      return {
        field,
        fieldType: actualType,
        expected,
        actual,
        passed: false,
        reason: 'value_mismatch',
      };
    }
    return {
      field,
      fieldType: actualType,
      expected,
      actual,
      passed: false,
      reason: 'missing_expected',
    };
  }

  // Expected something, got nothing
  if (actualType === 'missing' || actualType === 'null') {
    return {
      field,
      fieldType: expectedType,
      expected,
      actual,
      passed: false,
      reason: 'missing_actual',
    };
  }

  // Type mismatch (both have values but different types)
  if (expectedType !== actualType) {
    return {
      field,
      fieldType: expectedType,
      expected,
      actual,
      passed: false,
      reason: 'type_mismatch',
    };
  }

  // Boolean: exact match
  if (expectedType === 'boolean') {
    const passed = expected === actual;
    return {
      field,
      fieldType: 'boolean',
      expected,
      actual,
      passed,
      reason: passed ? undefined : 'value_mismatch',
    };
  }

  // String/enum: exact match
  if (expectedType === 'string') {
    const passed = expected === actual;
    return {
      field,
      fieldType: 'string',
      expected,
      actual,
      passed,
      reason: passed ? undefined : 'value_mismatch',
    };
  }

  // Array: deep equality comparison
  if (expectedType === 'array') {
    const passed = deepEqual(expected, actual);
    return {
      field,
      fieldType: 'array',
      expected,
      actual,
      passed,
      reason: passed ? undefined : 'value_mismatch',
    };
  }

  // Object: deep equality comparison
  if (expectedType === 'object') {
    const passed = deepEqual(expected, actual);
    return {
      field,
      fieldType: 'object',
      expected,
      actual,
      passed,
      reason: passed ? undefined : 'value_mismatch',
    };
  }

  // Numeric: tolerance-based comparison
  const tol = tolerance ?? getDefaultTolerance(field);
  let exp = expected as number;
  let act = actual as number;

  // Apply rounding if specified
  if (tol.round !== undefined) {
    const factor = Math.pow(10, tol.round);
    exp = Math.round(exp * factor) / factor;
    act = Math.round(act * factor) / factor;
  }

  const delta = Math.abs(act - exp);
  const deltaRel = exp !== 0 ? delta / Math.abs(exp) : (act !== 0 ? Infinity : 0);

  let passed = true;
  let reason: FieldComparisonReason | undefined;

  if (tol.abs !== undefined && delta > tol.abs) {
    passed = false;
    reason = 'exceeded_abs';
  }

  if (tol.rel !== undefined && deltaRel > tol.rel) {
    passed = false;
    reason = reason ? 'exceeded_abs+exceeded_rel' : 'exceeded_rel';
  }

  return {
    field,
    fieldType: 'numeric',
    expected,
    actual,
    passed,
    delta,
    deltaRel,
    toleranceUsed: tol,
    reason,
  };
}

// ============================================================================
// OUTPUT COMPARISON
// ============================================================================

/**
 * Compare all output fields between expected and actual.
 *
 * @param expected - Expected outputs
 * @param actual - Actual outputs
 * @param tolerances - Explicit tolerances per field
 * @param strictMode - If true, fail if numeric field has no explicit tolerance
 * @returns Comparison result
 */
export function compareOutputs(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  tolerances: Record<string, ToleranceSpec> = {},
  strictMode = false
): ComparisonResult {
  const allFields = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  const comparisons: FieldComparison[] = [];
  let maxDriftRel: number | null = null;
  let maxDriftField: string | null = null;

  for (const field of allFields) {
    const expectedVal = expected[field];
    const actualVal = actual[field];
    const tolerance = tolerances[field];

    // In strict mode, numeric fields without explicit tolerance are errors
    if (
      strictMode &&
      typeof expectedVal === 'number' &&
      tolerance === undefined
    ) {
      comparisons.push({
        field,
        fieldType: 'numeric',
        expected: expectedVal,
        actual: actualVal,
        passed: false,
        reason: 'missing_tolerance_in_strict_mode',
      });
      continue;
    }

    const comparison = compareField(field, expectedVal, actualVal, tolerance);
    comparisons.push(comparison);

    // Track worst drift for numeric fields
    if (comparison.fieldType === 'numeric' && comparison.deltaRel !== undefined) {
      if (maxDriftRel === null || comparison.deltaRel > maxDriftRel) {
        maxDriftRel = comparison.deltaRel;
        maxDriftField = field;
      }
    }
  }

  const passed = comparisons.every((c) => c.passed);

  return { passed, comparisons, maxDriftRel, maxDriftField };
}

// ============================================================================
// ISSUE COMPARISON
// ============================================================================

/**
 * Compare expected issues against actual issues.
 *
 * @param expected - Expected issues
 * @param actual - Actual issues from calculation
 * @returns Issue diff
 */
export function compareIssues(
  expected: ExpectedIssue[],
  actual: ActualIssue[]
): IssueDiff {
  const actualCodes = new Set(actual.map((i) => i.code));

  // Find required issues that are missing
  const missing = expected.filter(
    (e) => e.required && !actualCodes.has(e.code)
  );

  // Find unexpected error-severity issues
  const expectedCodes = new Set(expected.map((e) => e.code));
  const unexpected = actual.filter(
    (a) => a.severity === 'error' && !expectedCodes.has(a.code)
  );

  // Find matched issues
  const matched = expected
    .filter((e) => actualCodes.has(e.code))
    .map((e) => e.code);

  const passed = missing.length === 0 && unexpected.length === 0;

  return { passed, missing, unexpected, matched };
}
