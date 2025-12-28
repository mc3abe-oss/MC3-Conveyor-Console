/**
 * RECIPE SYSTEM - TYPE DEFINITIONS
 *
 * Recipes are saved snapshots of calculation inputs with optional expected outputs.
 * Used for validation, regression testing, and drift detection.
 *
 * Two types:
 *   - golden: Known-good outcomes used as deterministic tests (blocks CI)
 *   - reference: Historical/real-world inputs for regression/drift validation
 */

// ============================================================================
// ENUMS
// ============================================================================

export type RecipeType = 'golden' | 'reference';

export type RecipeTier = 'smoke' | 'regression' | 'edge' | 'longtail';

export type RecipeStatus = 'draft' | 'active' | 'locked' | 'deprecated';

/**
 * Recipe Role - Mutable lifecycle role for engineering references.
 *
 * - reference: Exploratory/informational, not used in automated tests
 * - regression: Included in regression test suite
 * - golden: Canonical reference, protected (admin-only to downgrade)
 * - deprecated: Kept for history, excluded from tests
 */
export type RecipeRole = 'reference' | 'regression' | 'golden' | 'deprecated';

export const RECIPE_ROLES: RecipeRole[] = ['reference', 'regression', 'golden', 'deprecated'];

/**
 * Derive role from legacy recipe_type + recipe_status fields.
 * Used for backward compatibility when role column doesn't exist.
 */
export function deriveRoleFromLegacy(
  recipeType: RecipeType,
  recipeStatus: RecipeStatus
): RecipeRole {
  if (recipeType === 'golden') return 'golden';
  if (recipeStatus === 'deprecated') return 'deprecated';
  if (recipeStatus === 'active') return 'regression';
  return 'reference';
}

export type TolerancePolicy = 'explicit' | 'default_fallback';

export type ComparisonMode = 'expected' | 'baseline' | 'legacy' | 'previous';

export type RunContext = 'ci' | 'manual' | 'scheduled' | 'regression_sweep';

export type RecipeSource = 'manual' | 'excel_import' | 'quote' | 'customer_rfq';

// ============================================================================
// TOLERANCE SPECIFICATION
// ============================================================================

/**
 * Tolerance specification for numeric field comparison.
 *
 * - abs: Absolute tolerance - |actual - expected| <= abs
 * - rel: Relative tolerance - |actual - expected| / |expected| <= rel (decimal, not %)
 * - round: Round both values to N decimals before comparing
 */
export interface ToleranceSpec {
  /** Absolute tolerance: |actual - expected| <= abs */
  abs?: number;
  /** Relative tolerance as decimal: |actual - expected| / |expected| <= rel */
  rel?: number;
  /** Round both to N decimals before comparing */
  round?: number;
}

/**
 * Default tolerances by output field suffix pattern.
 * Used when tolerance_policy = 'default_fallback'.
 */
export const DEFAULT_TOLERANCES: Record<string, ToleranceSpec> = {
  '_in': { abs: 0.001 },       // dimensions: 0.001"
  '_lbf': { abs: 0.1 },        // forces: 0.1 lbf
  '_lb': { abs: 0.1 },         // weights: 0.1 lb
  '_rpm': { rel: 0.001 },      // speeds: 0.1%
  '_pph': { rel: 0.01 },       // throughput: 1%
  '_ratio': { rel: 0.001 },    // ratios: 0.1%
  '_pct': { abs: 0.1 },        // percentages: 0.1 points
};

/** Fallback tolerance when no pattern matches */
export const FALLBACK_TOLERANCE: ToleranceSpec = { rel: 0.0001 };  // 0.01%

// ============================================================================
// EXPECTED ISSUE
// ============================================================================

/**
 * Expected issue definition for a recipe.
 */
export interface ExpectedIssue {
  /** Issue code (e.g., 'PULLEY_BELOW_BELT_MIN') */
  code: string;
  /** Expected severity */
  severity: 'error' | 'warning' | 'info';
  /** Must appear (true) vs. may appear (false) */
  required: boolean;
}

/**
 * Actual issue from calculation result.
 */
export interface ActualIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

// ============================================================================
// RECIPE
// ============================================================================

/**
 * Recipe record from calc_recipes table.
 */
export interface Recipe {
  id: string;

  // Identity
  recipe_type: RecipeType;
  recipe_tier: RecipeTier;
  name: string;
  slug: string | null;

  // Role (new unified lifecycle field, may be null for legacy records)
  role: RecipeRole | null;

  // Model binding
  model_key: string;
  model_version_id: string;
  model_build_id: string | null;
  model_snapshot_hash: string | null;

  // Payload
  inputs: Record<string, unknown>;
  inputs_hash: string;
  expected_outputs: Record<string, unknown> | null;
  expected_issues: ExpectedIssue[] | null;
  tolerances: Record<string, ToleranceSpec> | null;
  tolerance_policy: TolerancePolicy;
  legacy_outputs: Record<string, unknown> | null;

  // Lifecycle
  recipe_status: RecipeStatus;
  locked_at: string | null;
  locked_by: string | null;
  lock_reason: string | null;

  // Metadata
  source: RecipeSource | null;
  source_ref: string | null;
  tags: string[] | null;
  notes: string | null;
  belt_catalog_version: string | null;

  // Audit
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Input for updating recipe metadata (not inputs/outputs).
 * Inputs and expected_outputs are immutable - use duplicate to create variant.
 */
export interface RecipeUpdateInput {
  name?: string;
  notes?: string | null;
  role?: RecipeRole;
  tags?: string[] | null;
  /** Reason required when upgrading to golden or downgrading from golden */
  role_change_reason?: string;
}

/**
 * Input for creating a new recipe.
 */
export interface RecipeCreateInput {
  recipe_type: RecipeType;
  recipe_tier?: RecipeTier;
  name: string;
  slug?: string;

  model_key: string;
  model_version_id: string;
  model_build_id?: string;
  model_snapshot_hash?: string;

  inputs: Record<string, unknown>;
  inputs_hash: string;
  expected_outputs?: Record<string, unknown>;
  expected_issues?: ExpectedIssue[];
  tolerances?: Record<string, ToleranceSpec>;
  tolerance_policy?: TolerancePolicy;
  legacy_outputs?: Record<string, unknown>;

  source?: RecipeSource;
  source_ref?: string;
  tags?: string[];
  notes?: string;
  belt_catalog_version?: string;
}

// ============================================================================
// RECIPE RUN
// ============================================================================

/**
 * Recipe run record from recipe_runs table.
 */
export interface RecipeRun {
  id: string;
  recipe_id: string;

  // What was run
  model_version_id: string;
  model_build_id: string | null;
  model_snapshot_hash: string | null;
  inputs_hash: string;

  // Results
  actual_outputs: Record<string, unknown>;
  outputs_hash: string;
  actual_issues: ActualIssue[] | null;

  // Comparison config
  comparison_mode: ComparisonMode;
  baseline_recipe_run_id: string | null;
  baseline_model_version_id: string | null;

  // Comparison results
  passed: boolean | null;
  output_diff: FieldComparison[] | null;
  issue_diff: IssueDiff | null;
  max_drift_rel: number | null;
  max_drift_field: string | null;

  // Context
  run_context: RunContext;
  ci_run_id: string | null;
  run_at: string;
  run_by: string | null;
  duration_ms: number | null;
}

/**
 * Input for creating a recipe run.
 */
export interface RecipeRunCreateInput {
  recipe_id: string;

  model_version_id: string;
  model_build_id?: string;
  model_snapshot_hash?: string;
  inputs_hash: string;

  actual_outputs: Record<string, unknown>;
  outputs_hash: string;
  actual_issues?: ActualIssue[];

  comparison_mode: ComparisonMode;
  baseline_recipe_run_id?: string;
  baseline_model_version_id?: string;

  passed?: boolean;
  output_diff?: FieldComparison[];
  issue_diff?: IssueDiff;
  max_drift_rel?: number;
  max_drift_field?: string;

  run_context: RunContext;
  ci_run_id?: string;
  duration_ms?: number;
}

// ============================================================================
// COMPARISON RESULTS
// ============================================================================

export type FieldType = 'numeric' | 'boolean' | 'string' | 'null' | 'missing';

/**
 * Per-field comparison result.
 */
export interface FieldComparison {
  field: string;
  fieldType: FieldType;
  expected: unknown;
  actual: unknown;
  passed: boolean;

  // Numeric-specific
  delta?: number;
  deltaRel?: number;
  toleranceUsed?: ToleranceSpec;

  // Mismatch details
  reason?: FieldComparisonReason;
}

export type FieldComparisonReason =
  | 'exceeded_abs'
  | 'exceeded_rel'
  | 'exceeded_abs+exceeded_rel'
  | 'type_mismatch'
  | 'value_mismatch'
  | 'missing_expected'
  | 'missing_actual'
  | 'missing_tolerance_in_strict_mode';

/**
 * Issue comparison diff.
 */
export interface IssueDiff {
  passed: boolean;
  missing: ExpectedIssue[];
  unexpected: ActualIssue[];
  matched: string[];  // issue codes that matched
}

/**
 * Overall comparison result.
 */
export interface ComparisonResult {
  passed: boolean;
  comparisons: FieldComparison[];
  maxDriftRel: number | null;
  maxDriftField: string | null;
}

// ============================================================================
// RUNNER OPTIONS
// ============================================================================

/**
 * Options for running a recipe.
 */
export interface RunRecipeOptions {
  recipe: Recipe;
  comparisonMode: ComparisonMode;
  targetModelVersion?: string;  // override recipe's pinned version
  baselineRunId?: string;       // for 'previous' mode
  baselineModelVersion?: string; // for 'baseline' mode
  runContext: RunContext;
  ciRunId?: string;
}

/**
 * Result from running a recipe (before DB persistence).
 */
export interface RecipeRunResult {
  recipe_id: string;
  model_version_id: string;
  model_build_id: string | null;
  model_snapshot_hash: string | null;
  inputs_hash: string;

  actual_outputs: Record<string, unknown>;
  outputs_hash: string;
  actual_issues: ActualIssue[] | null;

  comparison_mode: ComparisonMode;
  baseline_recipe_run_id: string | null;
  baseline_model_version_id: string | null;

  passed: boolean | null;
  output_diff: FieldComparison[] | null;
  issue_diff: IssueDiff | null;
  max_drift_rel: number | null;
  max_drift_field: string | null;

  run_context: RunContext;
  ci_run_id: string | null;
  duration_ms: number;
}

// ============================================================================
// CI BLOCKING
// ============================================================================

/**
 * CI blocking configuration.
 */
export interface CIBlockingConfig {
  /** Which tiers block by default */
  blockingTiers: RecipeTier[];
  /** Specific recipe slugs that always block regardless of tier */
  alwaysBlock: string[];
  /** Specific recipe slugs that never block (escape hatch) */
  neverBlock: string[];
}

/**
 * Default CI blocking configuration.
 */
export const DEFAULT_CI_CONFIG: CIBlockingConfig = {
  blockingTiers: ['smoke'],
  alwaysBlock: [],
  neverBlock: [],
};

/**
 * Result of CI blocking check.
 */
export interface CIBlockingResult {
  block: boolean;
  reason: string;
}
