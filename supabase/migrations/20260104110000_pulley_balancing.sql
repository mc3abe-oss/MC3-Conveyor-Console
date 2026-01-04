-- Migration: Add Pulley Balancing Columns
-- Purpose: Add balancing configuration fields to application_pulleys
--
-- Fields:
--   balance_required: Whether balancing is required for this pulley
--   balance_method: 'static' or 'dynamic' balancing
--   balance_rpm: RPM for balancing (defaults to calculated pulley RPM)
--   balance_grade: Optional grade specification (e.g., 'G100')
--   balance_source: Where the balancing requirement came from

-- ============================================================================
-- PHASE 1: ADD COLUMNS
-- ============================================================================

-- balance_required: boolean, default false
ALTER TABLE application_pulleys
  ADD COLUMN balance_required BOOLEAN NOT NULL DEFAULT FALSE;

-- balance_method: 'static' or 'dynamic', default 'dynamic'
ALTER TABLE application_pulleys
  ADD COLUMN balance_method TEXT DEFAULT 'dynamic';

-- balance_rpm: number, the RPM for balancing specification
ALTER TABLE application_pulleys
  ADD COLUMN balance_rpm NUMERIC(8,2);

-- balance_grade: optional text (e.g., 'G100')
ALTER TABLE application_pulleys
  ADD COLUMN balance_grade TEXT;

-- balance_source: where the balancing requirement originated
ALTER TABLE application_pulleys
  ADD COLUMN balance_source TEXT DEFAULT 'internal_guideline';

-- ============================================================================
-- PHASE 2: ADD CONSTRAINTS
-- ============================================================================

-- Constraint: balance_method must be valid enum value
ALTER TABLE application_pulleys
  ADD CONSTRAINT balance_method_values CHECK (
    balance_method IS NULL OR balance_method IN ('static', 'dynamic')
  );

-- Constraint: balance_source must be valid enum value
ALTER TABLE application_pulleys
  ADD CONSTRAINT balance_source_values CHECK (
    balance_source IS NULL OR balance_source IN (
      'internal_guideline',
      'vendor_spec',
      'user_override'
    )
  );

-- Constraint: balance_rpm must be positive if provided
ALTER TABLE application_pulleys
  ADD CONSTRAINT balance_rpm_positive CHECK (
    balance_rpm IS NULL OR balance_rpm > 0
  );

-- ============================================================================
-- PHASE 3: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Pulley balancing migration complete:';
  RAISE NOTICE '  - Added balance_required (BOOLEAN, default FALSE)';
  RAISE NOTICE '  - Added balance_method (TEXT: static/dynamic, default dynamic)';
  RAISE NOTICE '  - Added balance_rpm (NUMERIC)';
  RAISE NOTICE '  - Added balance_grade (TEXT, optional)';
  RAISE NOTICE '  - Added balance_source (TEXT: internal_guideline/vendor_spec/user_override)';
END $$;
