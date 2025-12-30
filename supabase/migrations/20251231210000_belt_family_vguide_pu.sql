-- ============================================================================
-- Migration: Belt Family + V-Guide PU Min Pulley Columns
-- Version: v1.26
--
-- Part 1: Add belt_family to belt_catalog
-- Part 2: Add PU min pulley columns to v_guides
-- Part 3: Seed/backfill data
-- ============================================================================

-- ============================================================================
-- PART 1: Add belt_family to belt_catalog
-- ============================================================================

-- Add belt_family column (nullable first for safe migration)
ALTER TABLE public.belt_catalog
ADD COLUMN IF NOT EXISTS belt_family TEXT;

-- Backfill existing rows with PVC (safe default)
UPDATE public.belt_catalog
SET belt_family = 'PVC'
WHERE belt_family IS NULL;

-- Now make it NOT NULL with default
ALTER TABLE public.belt_catalog
ALTER COLUMN belt_family SET NOT NULL;

ALTER TABLE public.belt_catalog
ALTER COLUMN belt_family SET DEFAULT 'PVC';

-- Add check constraint for allowed values
ALTER TABLE public.belt_catalog
DROP CONSTRAINT IF EXISTS belt_catalog_belt_family_check;

ALTER TABLE public.belt_catalog
ADD CONSTRAINT belt_catalog_belt_family_check
CHECK (belt_family IN ('PVC', 'PU'));

-- Add comment
COMMENT ON COLUMN public.belt_catalog.belt_family IS 'Belt material family: PVC or PU. Determines which V-guide min pulley values to use.';

-- ============================================================================
-- PART 2: Add PU min pulley columns to v_guides
-- ============================================================================

-- Add PU solid min pulley column
ALTER TABLE public.v_guides
ADD COLUMN IF NOT EXISTS min_pulley_dia_solid_pu_in NUMERIC(5,2);

-- Add PU notched min pulley column
ALTER TABLE public.v_guides
ADD COLUMN IF NOT EXISTS min_pulley_dia_notched_pu_in NUMERIC(5,2);

-- Add comments
COMMENT ON COLUMN public.v_guides.min_pulley_dia_solid_pu_in IS 'Minimum pulley diameter for PU solid belt (inches). Null if not applicable.';
COMMENT ON COLUMN public.v_guides.min_pulley_dia_notched_pu_in IS 'Minimum pulley diameter for PU notched belt (inches). Null if not applicable.';

-- ============================================================================
-- PART 3: Seed PU min pulley values for V-guides
-- Source: PVC Guides and Data.pdf page 1
-- ============================================================================

-- K6: PU solid 2.5, notched 1.5
UPDATE public.v_guides
SET min_pulley_dia_solid_pu_in = 2.5,
    min_pulley_dia_notched_pu_in = 1.5
WHERE key = 'K6';

-- K8: PU solid 3.5, notched 2.5
UPDATE public.v_guides
SET min_pulley_dia_solid_pu_in = 3.5,
    min_pulley_dia_notched_pu_in = 2.5
WHERE key = 'K8';

-- K10: PU solid 4.0, notched 3.0
UPDATE public.v_guides
SET min_pulley_dia_solid_pu_in = 4.0,
    min_pulley_dia_notched_pu_in = 3.0
WHERE key = 'K10';

-- K13: PU solid 5.0, notched 4.0
UPDATE public.v_guides
SET min_pulley_dia_solid_pu_in = 5.0,
    min_pulley_dia_notched_pu_in = 4.0
WHERE key = 'K13';

-- K17: PU solid 8.0, notched 7.0
UPDATE public.v_guides
SET min_pulley_dia_solid_pu_in = 8.0,
    min_pulley_dia_notched_pu_in = 7.0
WHERE key = 'K17';

-- K22: PU solid 9.0, notched 8.0
UPDATE public.v_guides
SET min_pulley_dia_solid_pu_in = 9.0,
    min_pulley_dia_notched_pu_in = 8.0
WHERE key = 'K22';

-- K30: PU solid 10.0, notched 9.0
UPDATE public.v_guides
SET min_pulley_dia_solid_pu_in = 10.0,
    min_pulley_dia_notched_pu_in = 9.0
WHERE key = 'K30';
