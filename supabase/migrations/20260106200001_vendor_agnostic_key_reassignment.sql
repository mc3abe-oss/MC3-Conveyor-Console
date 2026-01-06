-- ============================================================================
-- Migration: Vendor-Agnostic Key Reassignment
-- Version: v1.53
--
-- Purpose: Change model_key and display_name from PCI-branded to vendor-agnostic.
--
-- CHANGES:
--   model_key: PCI_DRUM_6IN → DRUM_6IN
--   display_name: "PCI Drum – 6"" → "Standard Drum – 6""
--
-- GUARDS:
--   - Only runs if old keys exist
--   - Preserves manufacturer attribution in dedicated columns
--   - Updates FK references in application_pulleys
--
-- IMPORTANT: This is UPDATE-only. No new rows are created.
-- ============================================================================

-- ============================================================================
-- PHASE 1: GUARD - VERIFY OLD KEYS EXIST
-- ============================================================================

DO $$
DECLARE
  old_key_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_key_count
  FROM pulley_library_models
  WHERE model_key LIKE 'PCI_%';

  IF old_key_count = 0 THEN
    RAISE NOTICE 'No PCI-prefixed model_keys found. Migration may have already run.';
    -- We'll continue anyway to handle partial migrations
  ELSE
    RAISE NOTICE 'Found % PCI-prefixed model_keys to migrate', old_key_count;
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: DROP FK CONSTRAINT FIRST
-- ============================================================================

-- Drop the FK constraint so we can update both tables
ALTER TABLE application_pulleys
DROP CONSTRAINT IF EXISTS application_pulleys_model_key_fkey;

-- ============================================================================
-- PHASE 3: UPDATE MODEL KEYS AND DISPLAY NAMES (source table first)
-- ============================================================================

-- Create a temporary mapping table to handle the PK update
CREATE TEMP TABLE model_key_mapping (
  old_key TEXT PRIMARY KEY,
  new_key TEXT NOT NULL,
  new_display_name TEXT NOT NULL
);

INSERT INTO model_key_mapping (old_key, new_key, new_display_name) VALUES
  ('PCI_DRUM_4IN', 'DRUM_4IN', 'Standard Drum – 4"'),
  ('PCI_DRUM_6IN', 'DRUM_6IN', 'Standard Drum – 6"'),
  ('PCI_DRUM_8IN', 'DRUM_8IN', 'Standard Drum – 8"'),
  ('PCI_WING_6IN', 'WING_6IN', 'Wing Pulley – 6"'),
  ('PCI_WING_8IN', 'WING_8IN', 'Wing Pulley – 8"');

-- Update each model one by one to handle PK constraint
DO $$
DECLARE
  mapping RECORD;
BEGIN
  FOR mapping IN SELECT * FROM model_key_mapping LOOP
    -- Check if old key exists
    IF EXISTS (SELECT 1 FROM pulley_library_models WHERE model_key = mapping.old_key) THEN
      -- Update PK and display_name
      UPDATE pulley_library_models
      SET
        model_key = mapping.new_key,
        display_name = mapping.new_display_name
      WHERE model_key = mapping.old_key;

      RAISE NOTICE 'Migrated % → %', mapping.old_key, mapping.new_key;
    ELSE
      RAISE NOTICE 'Key % not found (may already be migrated)', mapping.old_key;
    END IF;
  END LOOP;
END $$;

-- Clean up temp table
DROP TABLE model_key_mapping;

-- ============================================================================
-- PHASE 4: UPDATE APPLICATION_PULLEYS REFERENCES
-- ============================================================================

-- Update FK references in application_pulleys to use new keys
UPDATE application_pulleys
SET model_key = CASE model_key
  WHEN 'PCI_DRUM_4IN' THEN 'DRUM_4IN'
  WHEN 'PCI_DRUM_6IN' THEN 'DRUM_6IN'
  WHEN 'PCI_DRUM_8IN' THEN 'DRUM_8IN'
  WHEN 'PCI_WING_6IN' THEN 'WING_6IN'
  WHEN 'PCI_WING_8IN' THEN 'WING_8IN'
  ELSE model_key  -- Keep unknown keys unchanged
END
WHERE model_key LIKE 'PCI_%';

-- ============================================================================
-- PHASE 5: RESTORE FK CONSTRAINT
-- ============================================================================

-- Re-add the FK constraint
ALTER TABLE application_pulleys
ADD CONSTRAINT application_pulleys_model_key_fkey
FOREIGN KEY (model_key) REFERENCES pulley_library_models(model_key);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
  orphan_count INTEGER;
BEGIN
  -- Check for any remaining PCI-prefixed keys
  SELECT COUNT(*) INTO old_count
  FROM pulley_library_models
  WHERE model_key LIKE 'PCI_%';

  -- Check new keys exist
  SELECT COUNT(*) INTO new_count
  FROM pulley_library_models
  WHERE model_key IN ('DRUM_4IN', 'DRUM_6IN', 'DRUM_8IN', 'WING_6IN', 'WING_8IN');

  -- Check for orphaned application_pulleys references
  SELECT COUNT(*) INTO orphan_count
  FROM application_pulleys ap
  WHERE ap.model_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pulley_library_models plm
      WHERE plm.model_key = ap.model_key
    );

  RAISE NOTICE 'Key reassignment migration complete:';
  RAISE NOTICE '  - Remaining PCI-prefixed keys: % (should be 0)', old_count;
  RAISE NOTICE '  - Vendor-agnostic keys present: % (should be 5)', new_count;
  RAISE NOTICE '  - Orphaned application_pulleys: % (should be 0)', orphan_count;

  IF old_count > 0 THEN
    RAISE WARNING 'Some PCI-prefixed keys were not migrated!';
  END IF;

  IF orphan_count > 0 THEN
    RAISE WARNING 'Some application_pulleys have orphaned model_key references!';
  END IF;
END $$;
