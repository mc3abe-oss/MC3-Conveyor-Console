-- ============================================================================
-- Add product_family_id to calc_recipes
-- ============================================================================
--
-- Links application configurations to product families for multi-product support.
-- This allows the system to route to product-specific calculations and templates.
--
-- ============================================================================

-- Add product_family_id column
ALTER TABLE calc_recipes
ADD COLUMN product_family_id UUID REFERENCES product_families(id);

-- Create index for filtering by product family
CREATE INDEX idx_calc_recipes_product_family ON calc_recipes(product_family_id);

-- Add comment
COMMENT ON COLUMN calc_recipes.product_family_id IS 'Links to product_families table. Determines which product-specific calculations and templates to use.';
