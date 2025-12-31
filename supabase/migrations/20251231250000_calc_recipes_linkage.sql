-- ============================================================================
-- Migration: Add direct linkage columns to calc_recipes
-- ============================================================================
-- Adds quote_id and sales_order_id foreign keys for real DB-level linkage.
-- These replace the JSON-based reference_type/reference_number approach
-- for determining delete eligibility.
--
-- An application with quote_id=NULL AND sales_order_id=NULL can be hard deleted.
-- An application with either FK set can only be deactivated.
-- ============================================================================

-- Add linkage columns (nullable = unlinked application)
ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id),
  ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_calc_recipes_quote_id
  ON calc_recipes(quote_id)
  WHERE quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calc_recipes_sales_order_id
  ON calc_recipes(sales_order_id)
  WHERE sales_order_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN calc_recipes.quote_id IS 'FK to quotes. If set, application is linked to a Quote.';
COMMENT ON COLUMN calc_recipes.sales_order_id IS 'FK to sales_orders. If set, application is linked to a Sales Order.';

-- ============================================================================
-- Migration complete
-- ============================================================================
