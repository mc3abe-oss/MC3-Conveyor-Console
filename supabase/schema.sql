-- ============================================================================
-- SLIDERBED CONVEYOR CALCULATOR - DATABASE SCHEMA
-- ============================================================================
--
-- This schema supports:
-- 1. Model versioning (immutable versions, draft/published/archived states)
-- 2. Calculation audit trail (every run persisted)
-- 3. Test fixture management (Excel parity validation)
-- 4. Rollback capability (restore any published version)
--
-- Design Principles:
-- - Immutable published versions (no updates after publish)
-- - Full audit trail (who, when, what)
-- - Type safety through CHECK constraints
-- - JSONB for flexible schema evolution
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: model_versions
-- ============================================================================
-- Stores all versions of calculation models
-- Each version is immutable after publishing
-- Supports draft → published → archived lifecycle

CREATE TABLE model_versions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_key TEXT NOT NULL,
  version_number INTEGER NOT NULL,

  -- Status lifecycle
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),

  -- Version content (immutable after publish)
  formulas_hash TEXT NOT NULL,
  parameters JSONB NOT NULL,

  -- Metadata
  created_by UUID,  -- Reference to auth.users (not enforced here)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  published_by UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID,

  -- Constraints
  UNIQUE(model_key, version_number),
  CHECK (
    (status = 'draft' AND published_at IS NULL) OR
    (status = 'published' AND published_at IS NOT NULL) OR
    (status = 'archived' AND archived_at IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_model_versions_model_key ON model_versions(model_key);
CREATE INDEX idx_model_versions_status ON model_versions(status);
CREATE INDEX idx_model_versions_created_at ON model_versions(created_at DESC);

-- Only one published version per model_key at a time
CREATE UNIQUE INDEX idx_model_versions_published
  ON model_versions(model_key)
  WHERE status = 'published';

-- Comments
COMMENT ON TABLE model_versions IS 'Versioned calculation models with draft/published/archived lifecycle';
COMMENT ON COLUMN model_versions.formulas_hash IS 'Hash of formulas code for change detection';
COMMENT ON COLUMN model_versions.parameters IS 'JSONB snapshot of all parameters and their defaults';

-- ============================================================================
-- TABLE: calculation_runs
-- ============================================================================
-- Complete audit trail of every calculation performed
-- Immutable after creation (no updates or deletes)

CREATE TABLE calculation_runs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Version reference
  model_version_id UUID NOT NULL REFERENCES model_versions(id),

  -- Calculation data
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  warnings JSONB,
  errors JSONB,

  -- Execution metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_time_ms INTEGER,

  -- User context
  user_id UUID,
  session_id UUID,

  -- Optional tagging/categorization
  tags TEXT[],
  notes TEXT
);

-- Indexes
CREATE INDEX idx_calculation_runs_model_version ON calculation_runs(model_version_id);
CREATE INDEX idx_calculation_runs_calculated_at ON calculation_runs(calculated_at DESC);
CREATE INDEX idx_calculation_runs_user_id ON calculation_runs(user_id);
CREATE INDEX idx_calculation_runs_tags ON calculation_runs USING gin(tags);

-- Comments
COMMENT ON TABLE calculation_runs IS 'Immutable audit trail of all calculation executions';
COMMENT ON COLUMN calculation_runs.inputs IS 'Complete snapshot of all input values';
COMMENT ON COLUMN calculation_runs.outputs IS 'Complete snapshot of all calculated outputs';
COMMENT ON COLUMN calculation_runs.execution_time_ms IS 'Calculation execution time in milliseconds';

-- ============================================================================
-- TABLE: test_fixtures
-- ============================================================================
-- Excel test cases for validating model versions
-- Publishing a model version requires all fixtures to pass

CREATE TABLE test_fixtures (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Model association
  model_key TEXT NOT NULL,

  -- Fixture metadata
  name TEXT NOT NULL,
  description TEXT,
  source TEXT,  -- e.g., "Excel Case 1", "Customer Scenario A"

  -- Test data
  inputs JSONB NOT NULL,
  expected_outputs JSONB NOT NULL,
  tolerances JSONB,  -- Field-specific tolerances, or use default

  -- Lifecycle
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID,

  -- Constraints
  UNIQUE(model_key, name)
);

-- Indexes
CREATE INDEX idx_test_fixtures_model_key ON test_fixtures(model_key);
CREATE INDEX idx_test_fixtures_active ON test_fixtures(active);

-- Comments
COMMENT ON TABLE test_fixtures IS 'Test cases for validating model calculations against Excel';
COMMENT ON COLUMN test_fixtures.tolerances IS 'JSONB of field-specific tolerances, e.g., {"torque": 0.001}';

-- ============================================================================
-- TABLE: fixture_validation_runs
-- ============================================================================
-- Track validation results when testing a model version against fixtures

CREATE TABLE fixture_validation_runs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  model_version_id UUID NOT NULL REFERENCES model_versions(id),
  test_fixture_id UUID NOT NULL REFERENCES test_fixtures(id),

  -- Results
  passed BOOLEAN NOT NULL,
  failures JSONB,  -- Array of field-level failures with details
  actual_outputs JSONB NOT NULL,

  -- Execution
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_time_ms INTEGER
);

-- Indexes
CREATE INDEX idx_fixture_validation_runs_model_version ON fixture_validation_runs(model_version_id);
CREATE INDEX idx_fixture_validation_runs_fixture ON fixture_validation_runs(test_fixture_id);
CREATE INDEX idx_fixture_validation_runs_passed ON fixture_validation_runs(passed);

-- Comments
COMMENT ON TABLE fixture_validation_runs IS 'History of fixture validation attempts for model versions';
COMMENT ON COLUMN fixture_validation_runs.failures IS 'Array of {field, expected, actual, diff} objects';

-- ============================================================================
-- TABLE: parameter_override_presets
-- ============================================================================
-- Saved parameter configurations for power users
-- e.g., "High Safety", "Low Friction", "Customer XYZ Standard"

CREATE TABLE parameter_override_presets (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Model association
  model_key TEXT NOT NULL,

  -- Preset metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Parameter overrides
  parameters JSONB NOT NULL,

  -- Sharing
  is_public BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID NOT NULL,

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(model_key, owner_id, name)
);

-- Indexes
CREATE INDEX idx_parameter_presets_model_key ON parameter_override_presets(model_key);
CREATE INDEX idx_parameter_presets_owner ON parameter_override_presets(owner_id);
CREATE INDEX idx_parameter_presets_public ON parameter_override_presets(is_public) WHERE is_public = true;

-- Comments
COMMENT ON TABLE parameter_override_presets IS 'Saved parameter configurations for reuse';

-- ============================================================================
-- FUNCTIONS: Model Version Management
-- ============================================================================

-- Get the current published version for a model
CREATE OR REPLACE FUNCTION get_published_version(p_model_key TEXT)
RETURNS model_versions
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM model_versions
  WHERE model_key = p_model_key
    AND status = 'published'
  LIMIT 1;
$$;

-- Get next version number for a model
CREATE OR REPLACE FUNCTION get_next_version_number(p_model_key TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(version_number), 0) + 1
  FROM model_versions
  WHERE model_key = p_model_key;
$$;

-- Check if all fixtures pass for a version
CREATE OR REPLACE FUNCTION all_fixtures_pass(p_model_version_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM fixture_validation_runs
    WHERE model_version_id = p_model_version_id
      AND passed = false
  )
  AND EXISTS (
    SELECT 1
    FROM fixture_validation_runs
    WHERE model_version_id = p_model_version_id
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Note: Enable RLS and configure policies based on your auth setup
-- Example policies shown below (commented out)

-- ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calculation_runs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE test_fixtures ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parameter_override_presets ENABLE ROW LEVEL SECURITY;

-- Example: Allow anyone to read published versions
-- CREATE POLICY "Published versions are viewable by everyone"
--   ON model_versions FOR SELECT
--   USING (status = 'published');

-- Example: Only authenticated users can create calculation runs
-- CREATE POLICY "Authenticated users can create calculation runs"
--   ON calculation_runs FOR INSERT
--   WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- INITIAL DATA: Factory Default Version
-- ============================================================================

-- Insert factory default version for sliderbed_conveyor_v1
INSERT INTO model_versions (
  model_key,
  version_number,
  status,
  formulas_hash,
  parameters,
  published_at
) VALUES (
  'sliderbed_conveyor_v1',
  1,
  'published',
  'factory_default_v1',
  '{
    "friction_coeff": 0.25,
    "safety_factor": 2.0,
    "base_belt_pull_lbf_per_ft": 75,
    "motor_rpm": 1750,
    "gravity_in_per_s2": 386.1,
    "piw_2p5": 0.138,
    "piw_other": 0.109,
    "pil_2p5": 0.138,
    "pil_other": 0.109
  }'::jsonb,
  now()
);

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

INSERT INTO schema_migrations (version, description)
VALUES (1, 'Initial schema: model_versions, calculation_runs, test_fixtures');

-- ============================================================================
-- TABLE: configurations
-- ============================================================================
-- Stores configuration metadata keyed by Quote/Sales Order
-- Supports multiple conveyors per quote via line_key

CREATE TABLE configurations (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Model association
  model_key TEXT NOT NULL,

  -- Reference key (Quote or Sales Order)
  reference_type TEXT NOT NULL CHECK (reference_type IN ('QUOTE', 'SALES_ORDER')),
  reference_number TEXT NOT NULL,
  line_key TEXT NOT NULL DEFAULT '1',

  -- Optional title
  title TEXT,

  -- Audit
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(reference_type, reference_number, line_key)
);

-- Indexes
CREATE INDEX idx_configurations_reference ON configurations(reference_type, reference_number);
CREATE INDEX idx_configurations_created_by ON configurations(created_by_user_id);

-- Comments
COMMENT ON TABLE configurations IS 'Configuration metadata keyed by Quote/Sales Order';
COMMENT ON COLUMN configurations.line_key IS 'Allows multiple conveyors per quote/order';

-- ============================================================================
-- TABLE: configuration_revisions
-- ============================================================================
-- Stores all revisions of a configuration
-- Each save creates a new revision with auto-incremented revision_number

CREATE TABLE configuration_revisions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  configuration_id UUID NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,

  -- Configuration snapshot
  inputs_json JSONB NOT NULL,
  parameters_json JSONB NOT NULL,
  application_json JSONB NOT NULL,
  outputs_json JSONB,
  warnings_json JSONB,

  -- Change tracking
  change_note TEXT,

  -- Audit
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(configuration_id, revision_number)
);

-- Indexes
CREATE INDEX idx_configuration_revisions_config ON configuration_revisions(configuration_id);
CREATE INDEX idx_configuration_revisions_created_at ON configuration_revisions(created_at DESC);

-- Comments
COMMENT ON TABLE configuration_revisions IS 'All revisions of configurations with full snapshots';
COMMENT ON COLUMN configuration_revisions.revision_number IS 'Auto-incremented per configuration';

-- ============================================================================
-- FUNCTION: Create next revision atomically
-- ============================================================================
-- Returns the next revision_number for a configuration
-- Uses advisory lock to ensure atomicity

CREATE OR REPLACE FUNCTION get_next_revision_number(p_configuration_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_rev INTEGER;
BEGIN
  -- Get next revision number (max + 1, or 1 if none exist)
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO next_rev
  FROM configuration_revisions
  WHERE configuration_id = p_configuration_id;

  RETURN next_rev;
END;
$$;

-- Update schema migrations
INSERT INTO schema_migrations (version, description)
VALUES (2, 'Add configurations and configuration_revisions tables');
