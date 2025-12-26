/**
 * RECIPE SYSTEM - RUNNER
 *
 * Executes recipes against the calculation engine and compares results.
 * Supports multiple comparison modes:
 * - expected: Compare against recipe.expected_outputs
 * - baseline: Compare against outputs from a specific model version
 * - legacy: Compare against recipe.legacy_outputs
 * - previous: Compare against the last run for this recipe
 */

import { runCalculation } from '../calculator';
import { SliderbedInputs, ValidationWarning, ValidationError } from '../../models/sliderbed_v1/schema';
import { hashCanonical, stripUndefined } from './hash';
import { compareOutputs, compareIssues, getDefaultTolerancesForAllFields } from './compare';
import {
  Recipe,
  RecipeRunResult,
  RunRecipeOptions,
  ComparisonMode,
  ActualIssue,
  ToleranceSpec,
  FieldComparison,
  IssueDiff,
} from './types';

// ============================================================================
// MODEL VERSION INFO
// ============================================================================

/**
 * Get current model version info.
 * In a real system, this would come from package.json or git.
 */
export function getModelVersionInfo(): {
  model_version_id: string;
  model_build_id: string | null;
  model_snapshot_hash: string | null;
} {
  // TODO: In production, these would come from build-time constants
  return {
    model_version_id: 'v1.12.0',
    model_build_id: null,  // Would be git SHA in CI
    model_snapshot_hash: null,  // Would be computed from formulas
  };
}

// ============================================================================
// INPUT NORMALIZATION
// ============================================================================

/**
 * Normalize inputs for calculation.
 * This mirrors the normalizeInputs function in engine.ts.
 *
 * @param inputs - Raw inputs from recipe
 * @returns Normalized inputs
 */
export function normalizeInputs(inputs: Record<string, unknown>): SliderbedInputs {
  const normalized = { ...inputs } as Record<string, unknown>;

  // v1.12: conveyor_width_in renamed to belt_width_in
  if (normalized.belt_width_in === undefined && normalized.conveyor_width_in !== undefined) {
    normalized.belt_width_in = normalized.conveyor_width_in;
  }

  // Strip undefined values for consistent hashing
  return stripUndefined(normalized) as unknown as SliderbedInputs;
}

// ============================================================================
// RESULT CONVERSION
// ============================================================================

/**
 * Convert calculation warnings/errors to ActualIssue format.
 */
function toActualIssues(
  errors: ValidationError[] | undefined,
  warnings: ValidationWarning[] | undefined
): ActualIssue[] {
  const issues: ActualIssue[] = [];

  if (errors) {
    for (const err of errors) {
      issues.push({
        code: err.field ? `ERROR_${err.field.toUpperCase()}` : 'ERROR',
        severity: 'error',
        message: err.message,
        field: err.field,
      });
    }
  }

  if (warnings) {
    for (const warn of warnings) {
      issues.push({
        code: warn.field ? `WARN_${warn.field.toUpperCase()}` : 'WARN',
        severity: warn.severity === 'info' ? 'info' : 'warning',
        message: warn.message,
        field: warn.field,
      });
    }
  }

  return issues;
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

/**
 * Run a recipe and compare results.
 *
 * @param options - Run options
 * @returns Recipe run result (not yet persisted)
 */
export async function runRecipe(options: RunRecipeOptions): Promise<RecipeRunResult> {
  const { recipe, comparisonMode, runContext, ciRunId } = options;
  const startTime = Date.now();

  // Get model version info
  const modelVersion = options.targetModelVersion ?? recipe.model_version_id;
  const versionInfo = getModelVersionInfo();

  // Normalize inputs
  const normalizedInputs = normalizeInputs(recipe.inputs);
  const inputsHash = hashCanonical(normalizedInputs);

  // Execute calculation
  const result = runCalculation({
    inputs: normalizedInputs,
    model_version_id: modelVersion,
  });

  // Extract outputs and issues
  const actualOutputs = result.outputs ?? {};
  const outputsHash = hashCanonical(actualOutputs);
  const actualIssues = toActualIssues(result.errors, result.warnings);

  // Determine comparison target
  let comparisonTarget: Record<string, unknown> | null = null;
  let baselineRecipeRunId: string | null = null;
  let baselineModelVersion: string | null = null;

  switch (comparisonMode) {
    case 'expected':
      comparisonTarget = recipe.expected_outputs;
      break;

    case 'baseline':
      // In a full implementation, we would run against an older version
      // For now, we only support 'expected' and 'legacy'
      baselineModelVersion = options.baselineModelVersion ?? null;
      // Would need to load and run older calculator version
      comparisonTarget = null;
      break;

    case 'legacy':
      comparisonTarget = recipe.legacy_outputs;
      break;

    case 'previous':
      // In a full implementation, we would query the last run
      baselineRecipeRunId = options.baselineRunId ?? null;
      // Would need to load previous run from DB
      comparisonTarget = null;
      break;
  }

  // Perform comparison
  let outputDiff: FieldComparison[] | null = null;
  let issueDiff: IssueDiff | null = null;
  let passed: boolean | null = null;
  let maxDriftRel: number | null = null;
  let maxDriftField: string | null = null;

  if (comparisonTarget) {
    // Determine effective tolerances
    let effectiveTolerances: Record<string, ToleranceSpec>;

    if (recipe.tolerance_policy === 'explicit') {
      effectiveTolerances = recipe.tolerances ?? {};
    } else {
      // 'default_fallback': merge explicit with defaults
      effectiveTolerances = {
        ...getDefaultTolerancesForAllFields(actualOutputs),
        ...(recipe.tolerances ?? {}),
      };
    }

    // Compare outputs
    const strictMode = recipe.tolerance_policy === 'explicit';
    const outputComparison = compareOutputs(
      comparisonTarget,
      actualOutputs,
      effectiveTolerances,
      strictMode
    );

    outputDiff = outputComparison.comparisons;
    maxDriftRel = outputComparison.maxDriftRel;
    maxDriftField = outputComparison.maxDriftField;

    // Compare issues if expected
    if (recipe.expected_issues && recipe.expected_issues.length > 0) {
      issueDiff = compareIssues(recipe.expected_issues, actualIssues);
      passed = outputComparison.passed && issueDiff.passed;
    } else {
      passed = outputComparison.passed;
    }
  }

  const duration = Date.now() - startTime;

  return {
    recipe_id: recipe.id,
    model_version_id: modelVersion,
    model_build_id: versionInfo.model_build_id,
    model_snapshot_hash: versionInfo.model_snapshot_hash,
    inputs_hash: inputsHash,

    actual_outputs: actualOutputs,
    outputs_hash: outputsHash,
    actual_issues: actualIssues.length > 0 ? actualIssues : null,

    comparison_mode: comparisonMode,
    baseline_recipe_run_id: baselineRecipeRunId,
    baseline_model_version_id: baselineModelVersion,

    passed,
    output_diff: outputDiff,
    issue_diff: issueDiff,
    max_drift_rel: maxDriftRel,
    max_drift_field: maxDriftField,

    run_context: runContext,
    ci_run_id: ciRunId ?? null,
    duration_ms: duration,
  };
}

/**
 * Run multiple recipes and collect results.
 *
 * @param recipes - Recipes to run
 * @param comparisonMode - Comparison mode for all recipes
 * @param runContext - Run context
 * @returns Array of run results
 */
export async function runRecipes(
  recipes: Recipe[],
  comparisonMode: ComparisonMode,
  runContext: 'ci' | 'manual' | 'scheduled' | 'regression_sweep'
): Promise<RecipeRunResult[]> {
  const results: RecipeRunResult[] = [];

  for (const recipe of recipes) {
    const result = await runRecipe({
      recipe,
      comparisonMode,
      runContext,
    });
    results.push(result);
  }

  return results;
}

/**
 * Format a run result for display.
 *
 * @param result - Run result
 * @param recipe - Original recipe
 * @returns Formatted string
 */
export function formatRunResult(result: RecipeRunResult, recipe: Recipe): string {
  const status = result.passed === null
    ? '⚪ SKIP'
    : result.passed
    ? '✅ PASS'
    : '❌ FAIL';

  const lines = [
    `${status} ${recipe.name} (${recipe.recipe_tier})`,
  ];

  if (result.passed === false && result.output_diff) {
    const failures = result.output_diff.filter((d) => !d.passed);
    for (const f of failures.slice(0, 5)) {
      const driftPct = f.deltaRel !== undefined ? ` (${(f.deltaRel * 100).toFixed(2)}%)` : '';
      lines.push(`  - ${f.field}: expected ${f.expected}, got ${f.actual}${driftPct}`);
      if (f.reason) {
        lines.push(`    reason: ${f.reason}`);
      }
    }
    if (failures.length > 5) {
      lines.push(`  ... and ${failures.length - 5} more failures`);
    }
  }

  if (result.issue_diff && !result.issue_diff.passed) {
    if (result.issue_diff.missing.length > 0) {
      lines.push(`  Missing issues: ${result.issue_diff.missing.map((i) => i.code).join(', ')}`);
    }
    if (result.issue_diff.unexpected.length > 0) {
      lines.push(`  Unexpected errors: ${result.issue_diff.unexpected.map((i) => i.code).join(', ')}`);
    }
  }

  lines.push(`  Duration: ${result.duration_ms}ms`);

  return lines.join('\n');
}
