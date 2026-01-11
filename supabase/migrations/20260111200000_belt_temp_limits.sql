-- ============================================================================
-- Migration: Add Belt Temperature Limits
-- Version: v1.38
--
-- Adds temp_min_f and temp_max_f columns to belt_catalog for temperature
-- compatibility validation. These values are admin-editable and nullable.
--
-- Temperature defaults are seeded based on belt family/material:
-- - PVC: 14°F to 160°F (typical for standard PVC belts)
-- - PU: 14°F to 180°F (food-grade polyurethane)
-- - Urethane: 14°F to 200°F (higher heat resistance)
-- - FLEECE: 14°F to 250°F (per Beltservice 139C spec sheet)
--
-- IMPORTANT: These are conservative defaults. Specific belt models may have
-- different ratings. Always verify with manufacturer specs.
-- ============================================================================

-- Step 1: Add temperature columns (nullable to allow belts without ratings)
ALTER TABLE public.belt_catalog
  ADD COLUMN IF NOT EXISTS temp_min_f NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS temp_max_f NUMERIC(5,1);

COMMENT ON COLUMN public.belt_catalog.temp_min_f IS 'Minimum operating temperature in Fahrenheit. Nullable if not specified.';
COMMENT ON COLUMN public.belt_catalog.temp_max_f IS 'Maximum operating temperature in Fahrenheit. Nullable if not specified.';

-- Step 2: Seed defaults for existing belts based on belt family/material

-- Standard PVC (STD_PVC_120PIW)
UPDATE public.belt_catalog
SET temp_min_f = 14, temp_max_f = 160
WHERE catalog_key = 'STD_PVC_120PIW';

-- Food Grade PU (FG_PU_CLEAR_MATTE_150PIW)
UPDATE public.belt_catalog
SET temp_min_f = 14, temp_max_f = 180
WHERE catalog_key = 'FG_PU_CLEAR_MATTE_150PIW';

-- Heavy Duty PVC (HD_PVC_200PIW)
UPDATE public.belt_catalog
SET temp_min_f = 14, temp_max_f = 160
WHERE catalog_key = 'HD_PVC_200PIW';

-- Urethane (URETHANE_180PIW)
UPDATE public.belt_catalog
SET temp_min_f = 14, temp_max_f = 200
WHERE catalog_key = 'URETHANE_180PIW';

-- Polyester Fleece / Beltservice 139C (per spec sheet: 14°F to 250°F)
UPDATE public.belt_catalog
SET temp_min_f = 14, temp_max_f = 250
WHERE catalog_key = 'beltservice:139C:26568';

-- Step 3: Add constraint to ensure min < max when both are set
ALTER TABLE public.belt_catalog
  ADD CONSTRAINT belt_catalog_temp_range_valid
  CHECK (temp_min_f IS NULL OR temp_max_f IS NULL OR temp_min_f < temp_max_f);

-- ============================================================================
-- END MIGRATION
-- ============================================================================
