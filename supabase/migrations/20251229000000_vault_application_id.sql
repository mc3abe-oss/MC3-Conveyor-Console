-- ============================================================================
-- MIGRATION: Add application_id to Vault Tables
-- ============================================================================
--
-- Purpose: Vault (specs, notes, attachments, scope_lines) should be keyed to
-- Applications, not directly to Quotes/Sales Orders. The Application is the
-- primary working object; Quotes and Sales Orders are commercial identifiers.
--
-- This migration:
-- 1. Adds application_id column to all vault tables
-- 2. Creates foreign key constraints to calc_recipes
-- 3. Adds indexes for efficient lookup
--
-- The existing parent_type/parent_id columns are preserved for backward compat
-- and will be deprecated in a future migration.
--
-- ============================================================================

-- ============================================================================
-- SPECS TABLE
-- ============================================================================

ALTER TABLE specs
  ADD COLUMN application_id UUID REFERENCES calc_recipes(id);

-- Index for looking up specs by application
CREATE INDEX idx_specs_application_id ON specs(application_id)
  WHERE application_id IS NOT NULL;

COMMENT ON COLUMN specs.application_id IS 'FK to calc_recipes. Vault ownership by Application.';

-- ============================================================================
-- NOTES TABLE
-- ============================================================================

ALTER TABLE notes
  ADD COLUMN application_id UUID REFERENCES calc_recipes(id);

-- Index for looking up notes by application
CREATE INDEX idx_notes_application_id ON notes(application_id)
  WHERE application_id IS NOT NULL;

COMMENT ON COLUMN notes.application_id IS 'FK to calc_recipes. Vault ownership by Application.';

-- ============================================================================
-- ATTACHMENTS TABLE
-- ============================================================================

ALTER TABLE attachments
  ADD COLUMN application_id UUID REFERENCES calc_recipes(id);

-- Index for looking up attachments by application
CREATE INDEX idx_attachments_application_id ON attachments(application_id)
  WHERE application_id IS NOT NULL;

COMMENT ON COLUMN attachments.application_id IS 'FK to calc_recipes. Vault ownership by Application.';

-- ============================================================================
-- SCOPE_LINES TABLE
-- ============================================================================

ALTER TABLE scope_lines
  ADD COLUMN application_id UUID REFERENCES calc_recipes(id);

-- Index for looking up scope_lines by application
CREATE INDEX idx_scope_lines_application_id ON scope_lines(application_id)
  WHERE application_id IS NOT NULL;

COMMENT ON COLUMN scope_lines.application_id IS 'FK to calc_recipes. Vault ownership by Application.';

-- ============================================================================
-- UNIQUE CONSTRAINT: Specs by Application
-- ============================================================================
-- Only one is_current=true per (application_id, key)
-- This replaces the parent-based uniqueness when application_id is used

CREATE UNIQUE INDEX idx_specs_application_current_unique
  ON specs(application_id, key)
  WHERE is_current = true AND application_id IS NOT NULL;

-- ============================================================================
-- Migration complete
-- ============================================================================
