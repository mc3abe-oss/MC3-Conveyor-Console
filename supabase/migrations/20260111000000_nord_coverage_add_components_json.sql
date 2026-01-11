-- =============================================================================
-- MIGRATION: Add components_json to nord_coverage_cases
-- =============================================================================
-- Fixes: Coverage insert failing with "Could not find the 'components_json' column"
-- This column was missing from the initial table creation.
-- =============================================================================

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nord_coverage_cases'
      AND column_name = 'components_json'
  ) THEN
    ALTER TABLE nord_coverage_cases
      ADD COLUMN components_json JSONB DEFAULT '{}'::jsonb;

    COMMENT ON COLUMN nord_coverage_cases.components_json IS 'Component-level resolution breakdown';
  END IF;
END $$;

-- =============================================================================
-- END MIGRATION
-- =============================================================================
