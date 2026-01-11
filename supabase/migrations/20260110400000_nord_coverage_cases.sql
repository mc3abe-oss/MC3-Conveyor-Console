-- =============================================================================
-- MIGRATION: NORD Coverage Cases (v1)
-- =============================================================================
-- Purpose: Store coverage analysis results for NORD BOM resolution.
--          This is derived data that can be safely regenerated.
--
-- Tables:
--   1. nord_coverage_cases - Coverage test results
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM: Coverage status
-- -----------------------------------------------------------------------------
CREATE TYPE nord_coverage_status AS ENUM (
  'resolved',   -- Exact PN found
  'ambiguous',  -- Multiple PNs match
  'unresolved', -- PN pending / not found in catalog
  'invalid'     -- Invalid combination (should not exist)
);

-- -----------------------------------------------------------------------------
-- TABLE: nord_coverage_cases
-- -----------------------------------------------------------------------------
-- Each row represents a coverage test case with its resolution status.

CREATE TABLE nord_coverage_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique key for the test case (hash of inputs)
  case_key TEXT NOT NULL UNIQUE,

  -- Input parameters for this coverage case
  inputs_json JSONB NOT NULL,

  -- Resolution status
  status nord_coverage_status NOT NULL,

  -- Resolved part numbers (if any)
  resolved_pns JSONB DEFAULT '[]'::jsonb,

  -- Diagnostic message (e.g., "no output shaft kit found for SI63 + inch_keyed")
  message TEXT,

  -- Component breakdown (gear_unit, motor, adapter, output_shaft_kit, bushing)
  components_json JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_coverage_status ON nord_coverage_cases(status);
CREATE INDEX idx_coverage_last_checked ON nord_coverage_cases(last_checked_at);

-- GIN index for JSONB inputs filtering
CREATE INDEX idx_coverage_inputs ON nord_coverage_cases USING GIN (inputs_json);

-- Comments
COMMENT ON TABLE nord_coverage_cases IS 'Coverage analysis results for NORD BOM resolution. Derived data, safe to regenerate.';
COMMENT ON COLUMN nord_coverage_cases.case_key IS 'Unique key derived from inputs_json for deduplication';
COMMENT ON COLUMN nord_coverage_cases.inputs_json IS 'Input parameters: gear_unit_size, mounting_style, output_shaft_option, etc.';
COMMENT ON COLUMN nord_coverage_cases.status IS 'Resolution status: resolved, ambiguous, unresolved, invalid';
COMMENT ON COLUMN nord_coverage_cases.resolved_pns IS 'Array of resolved part numbers';
COMMENT ON COLUMN nord_coverage_cases.components_json IS 'Component-level resolution breakdown';

-- =============================================================================
-- RLS: Allow authenticated users to read coverage data
-- =============================================================================

ALTER TABLE nord_coverage_cases ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Authenticated users can read coverage cases"
  ON nord_coverage_cases
  FOR SELECT
  TO authenticated
  USING (true);

-- Write access for belt admins only (for regeneration)
CREATE POLICY "Belt admins can manage coverage cases"
  ON nord_coverage_cases
  FOR ALL
  TO authenticated
  USING (public.has_belt_admin_access())
  WITH CHECK (public.has_belt_admin_access());

-- =============================================================================
-- END MIGRATION
-- =============================================================================
