-- Enable RLS with Permissive Policies for Authenticated Users
--
-- This migration enables Row Level Security on all tables and grants
-- full access to authenticated users. This gates all data behind login
-- without implementing per-user isolation.
--
-- RUN THIS: In Supabase Dashboard > SQL Editor, paste and execute this script.

-- ============================================================================
-- CONFIGURATIONS TABLE
-- ============================================================================
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotence)
DROP POLICY IF EXISTS "Authenticated users can read configurations" ON configurations;
DROP POLICY IF EXISTS "Authenticated users can insert configurations" ON configurations;
DROP POLICY IF EXISTS "Authenticated users can update configurations" ON configurations;
DROP POLICY IF EXISTS "Authenticated users can delete configurations" ON configurations;

-- Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can read configurations"
  ON configurations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert configurations"
  ON configurations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update configurations"
  ON configurations FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete configurations"
  ON configurations FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- CONFIGURATION_REVISIONS TABLE
-- ============================================================================
ALTER TABLE configuration_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read revisions" ON configuration_revisions;
DROP POLICY IF EXISTS "Authenticated users can insert revisions" ON configuration_revisions;
DROP POLICY IF EXISTS "Authenticated users can update revisions" ON configuration_revisions;
DROP POLICY IF EXISTS "Authenticated users can delete revisions" ON configuration_revisions;

CREATE POLICY "Authenticated users can read revisions"
  ON configuration_revisions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert revisions"
  ON configuration_revisions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update revisions"
  ON configuration_revisions FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete revisions"
  ON configuration_revisions FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- BELT_CATALOG TABLE
-- ============================================================================
ALTER TABLE belt_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read belt_catalog" ON belt_catalog;
DROP POLICY IF EXISTS "Authenticated users can insert belt_catalog" ON belt_catalog;
DROP POLICY IF EXISTS "Authenticated users can update belt_catalog" ON belt_catalog;
DROP POLICY IF EXISTS "Authenticated users can delete belt_catalog" ON belt_catalog;

CREATE POLICY "Authenticated users can read belt_catalog"
  ON belt_catalog FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert belt_catalog"
  ON belt_catalog FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update belt_catalog"
  ON belt_catalog FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete belt_catalog"
  ON belt_catalog FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- MODEL_VERSIONS TABLE (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'model_versions') THEN
    ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can read model_versions" ON model_versions;
    CREATE POLICY "Authenticated users can read model_versions"
      ON model_versions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================================
-- Verification: List tables with RLS status
-- ============================================================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
