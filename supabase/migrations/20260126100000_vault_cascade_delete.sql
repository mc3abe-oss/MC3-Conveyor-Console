-- ============================================================================
-- MIGRATION: Add ON DELETE CASCADE to Vault Table Foreign Keys
-- ============================================================================
--
-- Purpose: When an Application (calc_recipes) is deleted, automatically
-- delete all associated vault entries (specs, notes, attachments, scope_lines).
--
-- This migration:
-- 1. Drops existing FK constraints on vault tables
-- 2. Re-adds them with ON DELETE CASCADE
--
-- Background: Applications can now be hard-deleted regardless of commercial
-- linkage (Quote/SO). Vault data should be cleaned up automatically.
--
-- ============================================================================

-- ============================================================================
-- SPECS TABLE - Add CASCADE
-- ============================================================================

-- Drop existing constraint
ALTER TABLE specs DROP CONSTRAINT IF EXISTS specs_application_id_fkey;

-- Re-add with CASCADE
ALTER TABLE specs
  ADD CONSTRAINT specs_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES calc_recipes(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT specs_application_id_fkey ON specs IS 'FK to calc_recipes with cascade delete';

-- ============================================================================
-- NOTES TABLE - Add CASCADE
-- ============================================================================

-- Drop existing constraint
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_application_id_fkey;

-- Re-add with CASCADE
ALTER TABLE notes
  ADD CONSTRAINT notes_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES calc_recipes(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT notes_application_id_fkey ON notes IS 'FK to calc_recipes with cascade delete';

-- ============================================================================
-- ATTACHMENTS TABLE - Add CASCADE
-- ============================================================================

-- Drop existing constraint
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_application_id_fkey;

-- Re-add with CASCADE
ALTER TABLE attachments
  ADD CONSTRAINT attachments_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES calc_recipes(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT attachments_application_id_fkey ON attachments IS 'FK to calc_recipes with cascade delete';

-- ============================================================================
-- SCOPE_LINES TABLE - Add CASCADE
-- ============================================================================

-- Drop existing constraint
ALTER TABLE scope_lines DROP CONSTRAINT IF EXISTS scope_lines_application_id_fkey;

-- Re-add with CASCADE
ALTER TABLE scope_lines
  ADD CONSTRAINT scope_lines_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES calc_recipes(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT scope_lines_application_id_fkey ON scope_lines IS 'FK to calc_recipes with cascade delete';

-- ============================================================================
-- Migration complete
-- ============================================================================
