-- ============================================================================
-- Migration: Add user_inputs_json column to calc_recipes
-- ============================================================================
-- Stores canonicalized user inputs separately from raw/legacy inputs.
--
-- user_inputs_json: Only user-controlled, active inputs (no derived values)
-- inputs: Preserved as legacy/audit column (contains raw UI state)
--
-- Recipe hash should be computed from user_inputs_json, not inputs.
-- ============================================================================

-- Add user_inputs_json column
-- Nullable initially to allow backfill
ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS user_inputs_json JSONB;

-- Comment
COMMENT ON COLUMN calc_recipes.user_inputs_json IS 'Canonicalized user inputs - only active, user-controlled values. Used for hash computation.';

-- Note: The existing 'inputs' column is preserved for audit/legacy purposes.
-- New recipes should populate both:
--   - inputs: raw form state (for audit)
--   - user_inputs_json: canonicalized (for hash/display)

-- ============================================================================
-- Migration complete
-- ============================================================================
