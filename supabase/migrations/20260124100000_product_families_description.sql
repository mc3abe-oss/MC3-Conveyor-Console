-- ============================================================================
-- Product Families: Add short_description and model_key columns
-- ============================================================================
--
-- Enables the Product Picker UI to display meaningful descriptions and
-- map product families to their calculation model keys.
--
-- Changes:
-- 1. Add short_description column for UI display
-- 2. Add model_key column to link product families to calculation models
-- 3. Update existing products with descriptions and model keys
--
-- ============================================================================

-- Add short_description column
ALTER TABLE public.product_families
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Add model_key column (links to calculation models)
ALTER TABLE public.product_families
ADD COLUMN IF NOT EXISTS model_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.product_families.short_description IS
'Brief description of the product family, displayed in product picker UI.';

COMMENT ON COLUMN public.product_families.model_key IS
'Calculation model key (e.g., belt_conveyor_v1). Used to route to correct calculator.';

-- ============================================================================
-- Update existing products with descriptions and model keys
-- ============================================================================

UPDATE public.product_families
SET
  short_description = 'Slider bed and roller bed belt conveyor configurations',
  model_key = 'belt_conveyor_v1'
WHERE slug = 'belt-conveyor';

UPDATE public.product_families
SET
  short_description = 'Magnetic slider bed conveyor configurations',
  model_key = 'magnetic_conveyor_v1'
WHERE slug = 'magnetic-conveyor';

-- ============================================================================
-- Create index on model_key for efficient lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_product_families_model_key
ON public.product_families(model_key);
