-- ============================================================================
-- Application Creator Stamp
-- ============================================================================
-- Add created_by_display column to calc_recipes for stable creator display.
-- This stores a formatted display name at creation time ("FirstName L." or email prefix).
-- ============================================================================

-- Add created_by_display column (nullable for existing records)
ALTER TABLE public.calc_recipes
  ADD COLUMN IF NOT EXISTS created_by_display TEXT;

COMMENT ON COLUMN public.calc_recipes.created_by_display IS
  'Formatted creator display name stamped at creation time (e.g., "Bob M." or "bob")';

-- Index for potential filtering/sorting by creator
CREATE INDEX IF NOT EXISTS idx_calc_recipes_created_by_display
  ON public.calc_recipes(created_by_display)
  WHERE created_by_display IS NOT NULL;
