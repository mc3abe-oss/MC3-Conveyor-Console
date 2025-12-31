-- ============================================================================
-- Migration: Add is_active column to calc_recipes (Applications)
-- ============================================================================
-- Adds is_active column for explicit active/inactive state.
-- This supplements deleted_at for clearer filtering logic.
-- ============================================================================

-- Add is_active column with default true
ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index for efficient filtering of active records
CREATE INDEX IF NOT EXISTS idx_calc_recipes_is_active
  ON calc_recipes(is_active)
  WHERE is_active = true;

-- Comment
COMMENT ON COLUMN calc_recipes.is_active IS 'Active flag. false = deactivated (hidden from lists but kept for lineage).';

-- ============================================================================
-- Migration complete: calc_recipes now has is_active column
-- ============================================================================
