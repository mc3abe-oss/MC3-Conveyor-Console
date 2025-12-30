-- ============================================================================
-- Migration: Add draft saves and calculation status tracking
-- Version: v1.21
-- ============================================================================

-- Add calculation status tracking columns to calc_recipes
ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS calculation_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (calculation_status IN ('draft', 'calculated'));

ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS is_calculated BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS outputs_stale BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ;

-- Index for filtering by calculation status
CREATE INDEX IF NOT EXISTS idx_calc_recipes_calculation_status
  ON calc_recipes(calculation_status);

-- Backfill existing records:
-- Only recipe_type='reference' apps with expected_outputs are actual saved calculations
-- (recipe_type='golden' uses expected_outputs for regression test data, not calc results)
UPDATE calc_recipes
SET
  calculation_status = 'calculated',
  is_calculated = true,
  outputs_stale = false,
  last_calculated_at = updated_at
WHERE recipe_type = 'reference'
  AND expected_outputs IS NOT NULL
  AND calculation_status = 'draft';

-- Add comments for clarity
COMMENT ON COLUMN calc_recipes.calculation_status IS 'draft = not calculated or stale, calculated = fresh valid outputs';
COMMENT ON COLUMN calc_recipes.is_calculated IS 'true only when calculation_status = calculated';
COMMENT ON COLUMN calc_recipes.outputs_stale IS 'true when outputs exist but inputs have changed since calculation';
COMMENT ON COLUMN calc_recipes.last_calculated_at IS 'Timestamp of most recent successful calculation';
