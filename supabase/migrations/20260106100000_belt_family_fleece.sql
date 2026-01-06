-- ============================================================================
-- Migration: Add FLEECE belt family
-- Version: v1.27
--
-- Adds 'FLEECE' to the belt_family CHECK constraint to support Polyester Fleece
-- belts (e.g., Beltservice 139C - NW 60 Green NA).
--
-- IMPORTANT: FLEECE belts do NOT have V-guide min pulley rules defined.
-- Application logic must handle this by returning null/warning for V-guide lookups.
-- ============================================================================

-- Step 1: Drop existing constraint
ALTER TABLE public.belt_catalog
DROP CONSTRAINT IF EXISTS belt_catalog_belt_family_check;

-- Step 2: Add updated constraint with FLEECE
ALTER TABLE public.belt_catalog
ADD CONSTRAINT belt_catalog_belt_family_check
CHECK (belt_family IN ('PVC', 'PU', 'FLEECE'));

-- Step 3: Update comment
COMMENT ON COLUMN public.belt_catalog.belt_family IS 'Belt material family: PVC, PU, or FLEECE. Determines which V-guide min pulley values to use. FLEECE has no V-guide rules defined.';
