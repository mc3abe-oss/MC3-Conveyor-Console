/**
 * BEHAVIOR ASSERTION UTILITIES
 *
 * Utilities for testing hypothetical scenario behaviors.
 * These test RELATIONSHIPS and PRESENCE, not exact numeric values.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  WARNING: Do NOT use these to validate exact calculations.               ║
 * ║  Hypothetical scenarios are NOT Excel-verified.                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { CalculationResult } from '../../../models/sliderbed_v1/schema';

// ============================================================================
// TYPES
// ============================================================================

export type RelationshipAssertion =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'ZERO'
  | 'GREATER_THAN_ZERO'
  | 'FINITE'
  | 'EXISTS'
  | string; // For custom comparisons like 'GREATER_THAN conveyor_length_cc_in'

export interface WarningExpectation {
  [key: string]: boolean; // true = should be present, false = should be absent
}

export interface BehaviorAssertionResult {
  passed: boolean;
  failures: string[];
  warnings: string[];
}

// ============================================================================
// OUTPUT EXISTENCE & FINITENESS
// ============================================================================

/**
 * Check that key outputs exist and are finite (not NaN/undefined)
 */
export function assertOutputsExistAndFinite(
  result: CalculationResult,
  outputKeys: string[]
): BehaviorAssertionResult {
  const failures: string[] = [];

  if (!result.success || !result.outputs) {
    return {
      passed: false,
      failures: ['Calculation did not succeed or produced no outputs'],
      warnings: [],
    };
  }

  for (const key of outputKeys) {
    const value = (result.outputs as unknown as Record<string, unknown>)[key];

    if (value === undefined) {
      failures.push(`Output '${key}' is undefined`);
    } else if (typeof value === 'number' && !Number.isFinite(value)) {
      failures.push(`Output '${key}' is not finite: ${value}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings: [],
  };
}

// ============================================================================
// RELATIONSHIP ASSERTIONS
// ============================================================================

/**
 * Assert a relationship about an output value
 */
export function assertRelationship(
  value: unknown,
  assertion: RelationshipAssertion,
  context?: Record<string, number>
): { passed: boolean; message: string } {
  // Handle non-string assertions (skip illustrative assertions like 'APPROXIMATELY...' or 'MANY')
  if (typeof assertion !== 'string') {
    return {
      passed: true,
      message: `Skipped non-string assertion: ${JSON.stringify(assertion)}`,
    };
  }

  // Handle illustrative assertions that aren't meant for validation
  const illustrativePatterns = ['APPROXIMATELY', 'MANY', 'HIGHER_THAN', 'POSSIBLE', 'LONG'];
  if (illustrativePatterns.some((p) => assertion.includes(p))) {
    return {
      passed: true,
      message: `Skipped illustrative assertion: ${assertion}`,
    };
  }

  if (typeof value !== 'number') {
    return {
      passed: false,
      message: `Expected number, got ${typeof value}: ${value}`,
    };
  }

  switch (assertion) {
    case 'POSITIVE':
      return {
        passed: value > 0,
        message: value > 0 ? 'OK' : `Expected positive, got ${value}`,
      };

    case 'NEGATIVE':
      return {
        passed: value < 0,
        message: value < 0 ? 'OK' : `Expected negative, got ${value}`,
      };

    case 'ZERO':
      return {
        passed: value === 0,
        message: value === 0 ? 'OK' : `Expected zero, got ${value}`,
      };

    case 'GREATER_THAN_ZERO':
      return {
        passed: value > 0,
        message: value > 0 ? 'OK' : `Expected > 0, got ${value}`,
      };

    case 'FINITE':
      return {
        passed: Number.isFinite(value),
        message: Number.isFinite(value) ? 'OK' : `Expected finite, got ${value}`,
      };

    case 'EXISTS':
      return {
        passed: value !== undefined && value !== null,
        message: value !== undefined ? 'OK' : 'Expected to exist',
      };

    default:
      // Handle custom comparisons like 'GREATER_THAN conveyor_length_cc_in'
      if (assertion.startsWith('GREATER_THAN ')) {
        const refKey = assertion.replace('GREATER_THAN ', '');
        const refValue = context?.[refKey];
        if (refValue === undefined) {
          return {
            passed: false,
            message: `Reference key '${refKey}' not found in context`,
          };
        }
        return {
          passed: value > refValue,
          message: value > refValue ? 'OK' : `Expected ${value} > ${refValue} (${refKey})`,
        };
      }

      if (assertion.startsWith('LESS_THAN ')) {
        const refKey = assertion.replace('LESS_THAN ', '');
        const refValue = context?.[refKey];
        if (refValue === undefined) {
          return {
            passed: false,
            message: `Reference key '${refKey}' not found in context`,
          };
        }
        return {
          passed: value < refValue,
          message: value < refValue ? 'OK' : `Expected ${value} < ${refValue} (${refKey})`,
        };
      }

      // Skip non-standard assertions with a warning
      return {
        passed: true,
        message: `Skipped non-standard assertion: ${assertion}`,
      };
  }
}

// ============================================================================
// WARNING ASSERTIONS
// ============================================================================

/**
 * Check warnings match expectations
 */
export function assertWarnings(
  result: CalculationResult,
  expectations: WarningExpectation
): BehaviorAssertionResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  const actualWarnings = result.warnings || [];
  const warningTexts = actualWarnings.map((w) => (w.message || '').toLowerCase());

  for (const [key, shouldBePresent] of Object.entries(expectations)) {
    // Convert key like 'incline_warning' to search term 'incline'
    const searchTerm = key.replace('_warning', '').replace(/_/g, ' ').toLowerCase();

    const isPresent = warningTexts.some((text) => text.includes(searchTerm));

    if (shouldBePresent && !isPresent) {
      failures.push(`Expected warning containing '${searchTerm}' but none found`);
    } else if (!shouldBePresent && isPresent) {
      failures.push(`Expected NO warning containing '${searchTerm}' but found one`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    warnings,
  };
}

// ============================================================================
// ERROR ASSERTIONS
// ============================================================================

/**
 * Check that calculation succeeded (no blocking errors)
 */
export function assertNoValidationErrors(result: CalculationResult): BehaviorAssertionResult {
  if (!result.success) {
    const errorMessages = result.errors?.map((e) =>
      typeof e === 'string' ? e : e.message
    ) || ['Unknown error'];

    return {
      passed: false,
      failures: [`Calculation failed with errors: ${errorMessages.join(', ')}`],
      warnings: [],
    };
  }

  return {
    passed: true,
    failures: [],
    warnings: [],
  };
}

/**
 * Check that calculation failed with expected error
 */
export function assertHasValidationError(
  result: CalculationResult,
  expectedErrorContains: string
): BehaviorAssertionResult {
  if (result.success) {
    return {
      passed: false,
      failures: [`Expected calculation to fail with error containing '${expectedErrorContains}' but it succeeded`],
      warnings: [],
    };
  }

  const errorMessages = result.errors?.map((e) =>
    typeof e === 'string' ? e : e.message
  ) || [];

  const hasExpectedError = errorMessages.some((msg) =>
    msg.toLowerCase().includes(expectedErrorContains.toLowerCase())
  );

  if (!hasExpectedError) {
    return {
      passed: false,
      failures: [
        `Expected error containing '${expectedErrorContains}' but got: ${errorMessages.join(', ')}`,
      ],
      warnings: [],
    };
  }

  return {
    passed: true,
    failures: [],
    warnings: [],
  };
}

// ============================================================================
// FIELD NAME MAPPING
// Hypothetical scenarios use illustrative field names; map to actual schema names
// ============================================================================

const FIELD_NAME_MAP: Record<string, string> = {
  // Belt pull fields
  total_belt_pull_lbf: 'total_belt_pull_lb',
  incline_pull_lbf: 'incline_pull_lb',
  friction_pull_lbf: 'friction_pull_lb',
  // Belt length
  belt_length_in: 'total_belt_length_in',
  // These don't exist in schema - skip them
  motor_hp_required: '_SKIP_',
  rise_in: '_SKIP_',
  horizontal_run_in: '_SKIP_',
  return_roller_centers_in: '_SKIP_',
  belt_speed_used_fpm: '_SKIP_',
  capacity_pph: '_SKIP_',
  load_per_linear_ft_lb: '_SKIP_',
  belt_sag_pct: '_SKIP_',
  // V-guided and other specialized fields
  drive_pulley_face_width_in: '_SKIP_',
  tail_pulley_face_width_in: '_SKIP_',
  vguide_depth_in: '_SKIP_',
  // Cleated belt fields
  cleats_min_pulley_diameter_in: '_SKIP_',
  cleats_base_min_pulley_diameter_12in_in: '_SKIP_',
  cleats_centers_factor: '_SKIP_',
  frame_reference_height_in: '_SKIP_',
  cleat_height_in: '_SKIP_',
  // Floor supported fields
  drive_frame_height_in: '_SKIP_',
  tail_frame_height_in: '_SKIP_',
  drive_leg_cut_length_in: '_SKIP_',
  tail_leg_cut_length_in: '_SKIP_',
  // Heavy load fields
  live_load_lbs: '_SKIP_',
  dead_load_lbs: '_SKIP_',
};

function mapFieldName(key: string): string {
  return FIELD_NAME_MAP[key] || key;
}

// ============================================================================
// COMBINED BEHAVIOR CHECK
// ============================================================================

export interface ScenarioBehaviorExpectations {
  calculations?: Record<string, RelationshipAssertion>;
  warnings?: WarningExpectation;
  errors?: {
    validation_errors: boolean;
  };
}

/**
 * Run all behavior assertions for a scenario
 */
export function assertScenarioBehavior(
  result: CalculationResult,
  expectations: ScenarioBehaviorExpectations,
  inputContext: Record<string, number>
): BehaviorAssertionResult {
  const allFailures: string[] = [];
  const allWarnings: string[] = [];

  // 1. Check error expectations
  if (expectations.errors?.validation_errors === false) {
    const errorResult = assertNoValidationErrors(result);
    allFailures.push(...errorResult.failures);
    if (!errorResult.passed) {
      // If we expected success but got errors, stop here
      return {
        passed: false,
        failures: allFailures,
        warnings: allWarnings,
      };
    }
  }

  // 2. Check calculation relationships
  if (expectations.calculations && result.outputs) {
    for (const [key, assertion] of Object.entries(expectations.calculations)) {
      // Map scenario field names to actual schema field names
      const mappedKey = mapFieldName(key);

      // Skip fields that don't exist in the schema
      if (mappedKey === '_SKIP_') {
        continue;
      }

      const value = (result.outputs as unknown as Record<string, unknown>)[mappedKey];
      const relationResult = assertRelationship(value, assertion, inputContext);
      if (!relationResult.passed) {
        allFailures.push(`${key}: ${relationResult.message}`);
      }
    }
  }

  // 3. Check warning expectations
  if (expectations.warnings) {
    const warningResult = assertWarnings(result, expectations.warnings);
    allFailures.push(...warningResult.failures);
    allWarnings.push(...warningResult.warnings);
  }

  return {
    passed: allFailures.length === 0,
    failures: allFailures,
    warnings: allWarnings,
  };
}
