-- ============================================================================
-- Migration: Add is_fixture column to calc_recipes
-- ============================================================================
-- Distinguishes CI fixtures (engineering recipes) from application snapshots.
--
-- - is_fixture = true: Curated CI fixture for validation/regression testing
-- - is_fixture = false: Operational config (sales order, quote, ad hoc work)
--
-- The /console/recipes page will only show records where is_fixture = true.
-- Applications/snapshots are managed separately in sales orders and quotes.
-- ============================================================================

-- Add is_fixture column (default false = applications)
ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS is_fixture BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient filtering of fixtures
CREATE INDEX IF NOT EXISTS idx_calc_recipes_is_fixture
  ON calc_recipes(is_fixture)
  WHERE is_fixture = true;

-- Comment
COMMENT ON COLUMN calc_recipes.is_fixture IS 'True = CI fixture for validation/regression. False = application snapshot.';

-- ============================================================================
-- BACKFILL: Mark existing CI fixtures
-- ============================================================================
-- Heuristic: Records that are NOT linked to quotes/sales orders AND
-- have recipe_tier in ('golden', 'regression', 'smoke') are likely fixtures.
-- Exclude anything with 'SALES_ORDER' or 'QUOTE' in the name.

UPDATE calc_recipes
SET is_fixture = true
WHERE quote_id IS NULL
  AND sales_order_id IS NULL
  AND recipe_tier IN ('golden', 'regression', 'smoke', 'edge')
  AND name NOT LIKE 'SALES_ORDER%'
  AND name NOT LIKE 'QUOTE%'
  AND name NOT LIKE 'SO%'
  AND name NOT LIKE 'Q%[0-9]%';

-- ============================================================================
-- Migration complete
-- ============================================================================
