-- Belt Material Profile Migration (v1.11 Phase 2)
-- Adds optional material_profile JSONB column for structured belt material data
-- Run this in Supabase SQL editor

-- 1) Add material_profile JSONB column
ALTER TABLE public.belt_catalog
ADD COLUMN IF NOT EXISTS material_profile jsonb;

-- 2) Add version tracking for material_profile schema evolution
ALTER TABLE public.belt_catalog
ADD COLUMN IF NOT EXISTS material_profile_version int DEFAULT 1;

-- 3) Add comment explaining the structure
COMMENT ON COLUMN public.belt_catalog.material_profile IS
'Optional structured material profile (v1). Schema:
{
  "material_family": string,      // e.g. "PVC", "PU", "Rubber"
  "construction": string?,        // optional construction notes
  "min_dia_no_vguide_in": number?, // overrides flat column if present
  "min_dia_with_vguide_in": number?, // overrides flat column if present
  "notes": string?,               // additional notes
  "source_ref": string?           // reference document
}
When present, min_dia fields override the legacy flat columns.';

-- 4) Optional: Seed one belt with a material_profile example
UPDATE public.belt_catalog
SET material_profile = jsonb_build_object(
  'material_family', 'PVC',
  'construction', 'Standard 2-ply',
  'min_dia_no_vguide_in', 3.0,
  'min_dia_with_vguide_in', 4.0,
  'notes', 'General purpose conveying',
  'source_ref', 'Internal spec v1'
),
material_profile_version = 1
WHERE catalog_key = 'STD_PVC_120PIW';
