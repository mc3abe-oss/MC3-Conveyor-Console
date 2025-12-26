-- ============================================================================
-- CALC_RECIPES: Core recipe storage for validation and regression testing
-- ============================================================================
--
-- Recipes are saved snapshots of calculation inputs with optional expected outputs.
-- Two types:
--   - golden: Known-good outcomes used as deterministic tests (blocks CI)
--   - reference: Historical/real-world inputs for regression/drift validation
--
-- See: Recipe Architecture Spec (v1.0)
-- ============================================================================

CREATE TABLE calc_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  recipe_type TEXT NOT NULL,  -- 'golden' | 'reference'
  recipe_tier TEXT NOT NULL DEFAULT 'regression',  -- 'smoke' | 'regression' | 'edge' | 'longtail'
  name TEXT NOT NULL,
  slug TEXT UNIQUE,  -- human-readable key: 'heavy-load-incline-24in'

  -- Model binding (frozen at lock for golden)
  model_key TEXT NOT NULL,  -- 'sliderbed_conveyor_v1'
  model_version_id TEXT NOT NULL,  -- 'v1.12.0'
  model_build_id TEXT,  -- git SHA: 'abc123def456'
  model_snapshot_hash TEXT,  -- SHA256(formulas + params + rules + belt_catalog_version)

  -- Payload
  inputs JSONB NOT NULL,
  inputs_hash TEXT NOT NULL,  -- SHA256 of canonicalized NORMALIZED inputs
  expected_outputs JSONB,  -- required for golden, optional for reference
  expected_issues JSONB,  -- [{code, severity, required}]
  tolerances JSONB,  -- required for golden: {"field": {abs?, rel?, round?}}
  tolerance_policy TEXT NOT NULL DEFAULT 'explicit',  -- 'explicit' | 'default_fallback'
  legacy_outputs JSONB,  -- historical outputs for 'legacy' comparison mode

  -- Lifecycle
  recipe_status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'active' | 'locked' | 'deprecated'
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users,
  lock_reason TEXT,

  -- Metadata
  source TEXT,  -- 'manual' | 'excel_import' | 'quote' | 'customer_rfq'
  source_ref TEXT,
  tags TEXT[],
  notes TEXT,
  belt_catalog_version TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users,

  -- Constraints
  CONSTRAINT valid_recipe_type CHECK (recipe_type IN ('golden', 'reference')),
  CONSTRAINT valid_recipe_tier CHECK (recipe_tier IN ('smoke', 'regression', 'edge', 'longtail')),
  CONSTRAINT valid_recipe_status CHECK (recipe_status IN ('draft', 'active', 'locked', 'deprecated')),
  CONSTRAINT valid_tolerance_policy CHECK (tolerance_policy IN ('explicit', 'default_fallback')),

  -- Golden requires expected_outputs AND tolerances
  CONSTRAINT golden_requires_expected CHECK (
    recipe_type != 'golden' OR (expected_outputs IS NOT NULL AND tolerances IS NOT NULL)
  ),

  -- Only golden can be locked
  CONSTRAINT only_golden_lockable CHECK (
    recipe_status != 'locked' OR recipe_type = 'golden'
  ),

  -- Locked requires audit fields
  CONSTRAINT locked_requires_audit CHECK (
    recipe_status != 'locked' OR (locked_at IS NOT NULL AND locked_by IS NOT NULL)
  ),

  -- Locked golden must use explicit tolerance policy (no silent defaults)
  CONSTRAINT locked_golden_explicit_tolerances CHECK (
    recipe_status != 'locked' OR tolerance_policy = 'explicit'
  )
);

-- Indexes for calc_recipes
CREATE INDEX idx_calc_recipes_type ON calc_recipes(recipe_type);
CREATE INDEX idx_calc_recipes_tier ON calc_recipes(recipe_tier);
CREATE INDEX idx_calc_recipes_status ON calc_recipes(recipe_status);
CREATE INDEX idx_calc_recipes_model ON calc_recipes(model_key, model_version_id);
CREATE INDEX idx_calc_recipes_tags ON calc_recipes USING GIN(tags);

-- ============================================================================
-- RECIPE_RUNS: Execution history for recipes
-- ============================================================================

CREATE TABLE recipe_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES calc_recipes ON DELETE CASCADE,

  -- What was run
  model_version_id TEXT NOT NULL,
  model_build_id TEXT,
  model_snapshot_hash TEXT,
  inputs_hash TEXT NOT NULL,  -- hash of normalized inputs used for this run

  -- Results
  actual_outputs JSONB NOT NULL,
  outputs_hash TEXT NOT NULL,
  actual_issues JSONB,  -- [{code, severity, message}]

  -- Comparison config
  comparison_mode TEXT NOT NULL,  -- 'expected' | 'baseline' | 'legacy' | 'previous'
  baseline_recipe_run_id UUID REFERENCES recipe_runs,  -- for 'previous' mode
  baseline_model_version_id TEXT,  -- for 'baseline' mode

  -- Comparison results
  passed BOOLEAN,  -- null if no comparison possible
  output_diff JSONB,  -- per-field comparison results
  issue_diff JSONB,  -- {missing: [], unexpected: [], matched: []}
  max_drift_rel NUMERIC,  -- worst relative deviation (as decimal, not %)
  max_drift_field TEXT,  -- which field had worst drift

  -- Context
  run_context TEXT NOT NULL,  -- 'ci' | 'manual' | 'scheduled' | 'regression_sweep'
  ci_run_id TEXT,
  run_at TIMESTAMPTZ DEFAULT now(),
  run_by UUID REFERENCES auth.users,
  duration_ms INTEGER,

  -- Constraints
  CONSTRAINT valid_comparison_mode CHECK (
    comparison_mode IN ('expected', 'baseline', 'legacy', 'previous')
  ),
  CONSTRAINT valid_run_context CHECK (
    run_context IN ('ci', 'manual', 'scheduled', 'regression_sweep')
  )
);

-- Indexes for recipe_runs
CREATE INDEX idx_recipe_runs_recipe ON recipe_runs(recipe_id);
CREATE INDEX idx_recipe_runs_passed ON recipe_runs(passed) WHERE passed = false;
CREATE INDEX idx_recipe_runs_context ON recipe_runs(run_context, run_at DESC);
CREATE INDEX idx_recipe_runs_drift ON recipe_runs(max_drift_rel DESC NULLS LAST)
  WHERE max_drift_rel IS NOT NULL;
CREATE INDEX idx_recipe_runs_failed_recent ON recipe_runs(run_at DESC)
  WHERE passed = false;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- For now, disable RLS (internal tool, not user-facing)
-- Can be enabled later with appropriate policies
ALTER TABLE calc_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_runs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TRIGGER: Auto-update updated_at on calc_recipes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_calc_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_recipes_updated_at
  BEFORE UPDATE ON calc_recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_calc_recipes_updated_at();
