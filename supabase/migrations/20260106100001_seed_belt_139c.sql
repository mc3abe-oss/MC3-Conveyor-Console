-- ============================================================================
-- Migration: Seed Belt Catalog - Beltservice 139C (NW 60 Green NA)
-- Version: v1.27
--
-- Adds Polyester Fleece belt from Beltservice Corporation spec sheet.
-- Source: Beltservice Corporation – Light Weight Belting Specification Sheet
--         Catalog #139C, Item #26568
--
-- IDEMPOTENT: Uses ON CONFLICT (catalog_key) to prevent duplicates.
-- ============================================================================

-- Ensure unique constraint exists on catalog_key (for idempotency)
-- This is a no-op if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'belt_catalog_catalog_key_key'
  ) THEN
    ALTER TABLE public.belt_catalog
    ADD CONSTRAINT belt_catalog_catalog_key_key UNIQUE (catalog_key);
  END IF;
END $$;

-- Insert Beltservice 139C - NW 60 Green NA (Polyester Fleece)
INSERT INTO public.belt_catalog (
  catalog_key,
  display_name,
  manufacturer,
  material,
  belt_family,
  surface,
  food_grade,
  cut_resistant,
  oil_resistant,
  abrasion_resistant,
  antistatic,
  thickness_in,
  piw,
  pil,
  min_pulley_dia_no_vguide_in,
  min_pulley_dia_with_vguide_in,
  notes,
  tags,
  is_active,
  material_profile,
  material_profile_version
) VALUES (
  -- catalog_key: stable unique key per instructions
  'beltservice:139C:26568',

  -- display_name
  'NW 60 Green NA (Beltservice #139C)',

  -- manufacturer
  'Beltservice Corporation',

  -- material
  'Polyester Fleece',

  -- belt_family (v1.27: FLEECE - no V-guide rules)
  'FLEECE',

  -- surface
  'Non-Woven Polyester Fleece / Non-Woven Polyester Fleece',

  -- food_grade (FDA_approved: false)
  false,

  -- cut_resistant (wear_resistant per spec)
  true,

  -- oil_resistant (Yes per spec sheet)
  true,

  -- abrasion_resistant (wear_resistant per spec)
  true,

  -- antistatic (Anti Static: No)
  false,

  -- thickness_in (overall_gauge_in: 0.2220)
  0.2220,

  -- piw (belt_weight_lb_per_in_per_ft: 0.0580)
  0.0580,

  -- pil (same as piw for this belt type)
  0.0580,

  -- min_pulley_dia_no_vguide_in (min_pulley_diameter_in.normal_flex: 5.0000)
  5.0000,

  -- min_pulley_dia_with_vguide_in (min_pulley_diameter_in.back_flex: 5.0000)
  5.0000,

  -- notes (comprehensive spec from PDF)
  'Beltservice Corporation Catalog #139C
Item Number: 26568
International Designation: NW 60 Green NA
Material: Polyester Fleece (Non-Woven)
Color: Green
Plies: 1
Overall Thickness: 0.2220" (5.64mm)
Top Cover: Non-Woven Polyester Fleece
Bottom Cover: Non-Woven Polyester Fleece
Belt Strength: 100 lbs/in (18 N/mm) at 1% elongation
Min Pulley Diameter (Normal/Back Flex): 5.0" (127mm)
Temperature Range: 14°F to 250°F
Oil Resistant: Yes
Fire Resistant: No
Anti-Static: No
Cross Rigid: No
High Heat: No
FDA Approved: No
Impression Top: No
Maximum Width: 72"
Splice Type: Skive
Splice Press Temp: 180°F
Splice Pressure: 18 PSI
Foil Required: No
Special Characteristics: Designed for wear and cut resistance, soft impact surface, high temperature resistance up to 250°F, quiet running with felt type construction.
Common Industries: Automotive, airports, package handling, packing lines, cutting machines.
Source: Beltservice Corporation – Light Weight Belting Specification Sheet Catalog #139C
Note: All values are nominal and subject to change without notice per manufacturer.',

  -- tags
  ARRAY['beltservice', 'fleece', 'polyester', 'non-woven', 'catalog-139c', 'skive-splice', 'quiet-running', 'wear-resistant', 'oil-resistant', 'lightweight'],

  -- is_active
  true,

  -- material_profile (JSONB with full spec data)
  '{
    "material_family": "Polyester Fleece",
    "construction": "1-ply Non-Woven Polyester Fleece",
    "min_dia_no_vguide_in": 5.0,
    "min_dia_with_vguide_in": 5.0,
    "notes": "Oil resistant. Temperature range 14-250°F. Quiet running. Designed for wear and cut resistance.",
    "source_ref": "Beltservice Corporation Catalog #139C",
    "supports_banding": false
  }'::jsonb,

  -- material_profile_version
  1
)
ON CONFLICT (catalog_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  manufacturer = EXCLUDED.manufacturer,
  material = EXCLUDED.material,
  belt_family = EXCLUDED.belt_family,
  surface = EXCLUDED.surface,
  food_grade = EXCLUDED.food_grade,
  cut_resistant = EXCLUDED.cut_resistant,
  oil_resistant = EXCLUDED.oil_resistant,
  abrasion_resistant = EXCLUDED.abrasion_resistant,
  antistatic = EXCLUDED.antistatic,
  thickness_in = EXCLUDED.thickness_in,
  piw = EXCLUDED.piw,
  pil = EXCLUDED.pil,
  min_pulley_dia_no_vguide_in = EXCLUDED.min_pulley_dia_no_vguide_in,
  min_pulley_dia_with_vguide_in = EXCLUDED.min_pulley_dia_with_vguide_in,
  notes = EXCLUDED.notes,
  tags = EXCLUDED.tags,
  is_active = EXCLUDED.is_active,
  material_profile = EXCLUDED.material_profile,
  material_profile_version = EXCLUDED.material_profile_version;
