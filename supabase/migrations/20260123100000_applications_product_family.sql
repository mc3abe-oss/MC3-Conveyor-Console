-- ============================================================================
-- Applications Product Family Lock
-- ============================================================================
--
-- This migration ensures every application (calc_recipes) is linked to a
-- product family, enabling correct routing based on application type.
--
-- Changes:
-- 1. Add 'Magnetic Conveyor' product family (only 'Belt Conveyor' was seeded)
-- 2. Backfill existing applications with product_family_id based on model_key
-- 3. Make product_family_id required for new applications
--
-- ============================================================================

-- ============================================================================
-- Step 1: Add Magnetic Conveyor product family
-- ============================================================================

INSERT INTO public.product_families (name, slug, sort_order, is_active)
VALUES ('Magnetic Conveyor', 'magnetic-conveyor', 20, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Step 2: Backfill existing applications with product_family_id
-- ============================================================================

-- Map model_key to product_family:
-- - 'belt_conveyor_v1', 'sliderbed_conveyor_v1' → Belt Conveyor
-- - 'magnetic_conveyor_v1' → Magnetic Conveyor
-- - Unknown → Belt Conveyor (safe default, existing apps are all belt)

-- First, backfill Belt Conveyor applications
UPDATE calc_recipes
SET product_family_id = (
  SELECT id FROM product_families WHERE slug = 'belt-conveyor' LIMIT 1
)
WHERE product_family_id IS NULL
  AND (
    model_key ILIKE '%belt%'
    OR model_key ILIKE '%sliderbed%'
    OR model_key ILIKE '%rollerbed%'
  );

-- Then, backfill Magnetic Conveyor applications
UPDATE calc_recipes
SET product_family_id = (
  SELECT id FROM product_families WHERE slug = 'magnetic-conveyor' LIMIT 1
)
WHERE product_family_id IS NULL
  AND model_key ILIKE '%magnetic%';

-- Finally, set any remaining NULL to Belt Conveyor (safe default)
UPDATE calc_recipes
SET product_family_id = (
  SELECT id FROM product_families WHERE slug = 'belt-conveyor' LIMIT 1
)
WHERE product_family_id IS NULL;

-- ============================================================================
-- Step 3: Add NOT NULL constraint (after backfill completes)
-- ============================================================================
-- Note: This makes product_family_id required for all new applications.
-- Existing records were just backfilled above.

ALTER TABLE calc_recipes
ALTER COLUMN product_family_id SET NOT NULL;

-- ============================================================================
-- Step 4: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN calc_recipes.product_family_id IS
'Product family this application belongs to. Determines routing to correct product UI.
Required for all applications. Set at creation time based on model_key.';
