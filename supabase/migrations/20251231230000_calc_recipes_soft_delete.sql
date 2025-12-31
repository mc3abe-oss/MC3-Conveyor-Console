-- ============================================================================
-- Migration: Add soft delete to calc_recipes (Applications)
-- ============================================================================
-- Adds deleted_at and deleted_by columns for soft delete support.
-- ============================================================================

-- Add soft delete columns
ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users;

-- Index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_calc_recipes_deleted_at
  ON calc_recipes(deleted_at)
  WHERE deleted_at IS NULL;

-- Comment
COMMENT ON COLUMN calc_recipes.deleted_at IS 'Soft delete timestamp. NULL = active.';
COMMENT ON COLUMN calc_recipes.deleted_by IS 'User who performed the soft delete.';

-- ============================================================================
-- Migration complete: calc_recipes now supports soft delete
-- ============================================================================
