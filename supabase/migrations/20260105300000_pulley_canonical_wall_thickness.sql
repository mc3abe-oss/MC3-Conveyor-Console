-- ============================================================================
-- Migration: Pulley Canonical Wall Thickness Keys
-- ============================================================================
--
-- Purpose: Add canonical thickness key columns to pulley_library_models
-- referencing the unified thickness library (ga_10, ga_12, frac_3_16, etc.)
--
-- Changes:
-- 1. Add allowed_wall_thickness_keys TEXT[] column
-- 2. Add default_wall_thickness_key TEXT column
-- 3. Backfill keys from legacy numeric values
--
-- BACKWARD COMPATIBLE: Legacy numeric columns are preserved.
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD NEW COLUMNS
-- ============================================================================

-- Array of canonical thickness keys allowed for this model
-- References thickness library keys (ga_10, ga_12, frac_3_16, etc.)
ALTER TABLE pulley_library_models
ADD COLUMN IF NOT EXISTS allowed_wall_thickness_keys TEXT[];

-- Default wall thickness key (must be in allowed_wall_thickness_keys)
ALTER TABLE pulley_library_models
ADD COLUMN IF NOT EXISTS default_wall_thickness_key TEXT;

-- Comments
COMMENT ON COLUMN pulley_library_models.allowed_wall_thickness_keys IS
  'Canonical thickness keys from thickness library (ga_10, ga_12, frac_3_16, etc.)';
COMMENT ON COLUMN pulley_library_models.default_wall_thickness_key IS
  'Default thickness key - must be in allowed_wall_thickness_keys';

-- ============================================================================
-- PHASE 2: BACKFILL FROM LEGACY NUMERIC VALUES
-- ============================================================================

-- Canonical thickness values (from src/lib/thickness/library.ts)
-- Must match THICKNESS_OPTIONS exactly
CREATE TEMP TABLE thickness_lookup (
  key TEXT PRIMARY KEY,
  thickness_in NUMERIC(5,3)
);

INSERT INTO thickness_lookup (key, thickness_in) VALUES
  ('ga_18', 0.048),
  ('ga_16', 0.060),
  ('ga_14', 0.075),
  ('ga_12', 0.109),
  ('ga_10', 0.134),
  ('ga_8',  0.165),
  ('frac_3_16', 0.188),
  ('frac_1_4',  0.250),
  ('frac_3_8',  0.375);

-- Function to convert numeric thickness to canonical key
-- Uses tolerance-based matching (0.005 inch tolerance)
CREATE OR REPLACE FUNCTION temp_thickness_to_key(thickness NUMERIC)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT key INTO result
  FROM thickness_lookup
  WHERE ABS(thickness_in - thickness) < 0.005
  ORDER BY ABS(thickness_in - thickness)
  LIMIT 1;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill allowed_wall_thickness_keys from allowed_wall_steps_in
UPDATE pulley_library_models
SET allowed_wall_thickness_keys = (
  SELECT ARRAY_AGG(temp_thickness_to_key(step) ORDER BY step)
  FROM UNNEST(allowed_wall_steps_in) AS step
  WHERE temp_thickness_to_key(step) IS NOT NULL
)
WHERE allowed_wall_thickness_keys IS NULL
  AND allowed_wall_steps_in IS NOT NULL
  AND array_length(allowed_wall_steps_in, 1) > 0;

-- Backfill default_wall_thickness_key from default_shell_wall_in
UPDATE pulley_library_models
SET default_wall_thickness_key = temp_thickness_to_key(default_shell_wall_in)
WHERE default_wall_thickness_key IS NULL
  AND default_shell_wall_in IS NOT NULL;

-- Clean up temp function
DROP FUNCTION IF EXISTS temp_thickness_to_key(NUMERIC);
DROP TABLE IF EXISTS thickness_lookup;

-- ============================================================================
-- PHASE 3: LOG UNMATCHED VALUES
-- ============================================================================

DO $$
DECLARE
  unmatched_count INTEGER;
  unmatched_models TEXT;
BEGIN
  -- Find models with unmatched thickness values
  SELECT COUNT(*), STRING_AGG(model_key, ', ')
  INTO unmatched_count, unmatched_models
  FROM pulley_library_models
  WHERE (
    -- Has legacy values but no canonical keys
    (allowed_wall_steps_in IS NOT NULL AND array_length(allowed_wall_steps_in, 1) > 0)
    AND (allowed_wall_thickness_keys IS NULL OR array_length(allowed_wall_thickness_keys, 1) = 0)
  ) OR (
    -- Default doesn't have a key
    default_shell_wall_in IS NOT NULL AND default_wall_thickness_key IS NULL
  );

  IF unmatched_count > 0 THEN
    RAISE WARNING 'ATTENTION: % models have unmatched thickness values: %', unmatched_count, unmatched_models;
    RAISE WARNING 'These models need manual review in Admin UI.';
  END IF;

  -- Log summary
  RAISE NOTICE '=== Pulley Canonical Wall Thickness Migration Complete ===';
  RAISE NOTICE 'New columns added: allowed_wall_thickness_keys, default_wall_thickness_key';

  SELECT COUNT(*) INTO unmatched_count
  FROM pulley_library_models
  WHERE allowed_wall_thickness_keys IS NOT NULL
    AND array_length(allowed_wall_thickness_keys, 1) > 0;
  RAISE NOTICE 'Models with canonical keys backfilled: %', unmatched_count;
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- ALTER TABLE pulley_library_models DROP COLUMN IF EXISTS allowed_wall_thickness_keys;
-- ALTER TABLE pulley_library_models DROP COLUMN IF EXISTS default_wall_thickness_key;
-- ============================================================================
