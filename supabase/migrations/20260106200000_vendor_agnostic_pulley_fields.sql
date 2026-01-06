-- ============================================================================
-- Migration: Vendor-Agnostic Pulley Fields
-- Version: v1.53
--
-- Purpose: Add manufacturer attribution fields to pulley_library_models to
-- enable vendor-agnostic primary identity while preserving source traceability.
--
-- This migration adds columns only; key/display_name updates in separate migration.
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD MANUFACTURER ATTRIBUTION COLUMNS
-- ============================================================================

-- manufacturer_name: e.g., "PCI Manufacturing" or "Van Gorp"
ALTER TABLE pulley_library_models
ADD COLUMN IF NOT EXISTS manufacturer_name TEXT;

-- manufacturer_part_number: vendor's internal part number
ALTER TABLE pulley_library_models
ADD COLUMN IF NOT EXISTS manufacturer_part_number TEXT;

-- source_url: link to manufacturer catalog/spec sheet
ALTER TABLE pulley_library_models
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN pulley_library_models.manufacturer_name IS 'Original manufacturer name for traceability (e.g., "PCI Manufacturing")';
COMMENT ON COLUMN pulley_library_models.manufacturer_part_number IS 'Manufacturer part number for cross-reference';
COMMENT ON COLUMN pulley_library_models.source_url IS 'URL to manufacturer catalog or spec sheet';
COMMENT ON COLUMN pulley_library_models.source_doc IS 'Internal reference to source document (e.g., "PCI-001")';

-- ============================================================================
-- PHASE 2: POPULATE MANUFACTURER DATA FROM EXISTING PCI MODELS
-- ============================================================================

-- Guard: Only update if models exist and manufacturer_name is NULL
DO $$
DECLARE
  pci_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pci_count
  FROM pulley_library_models
  WHERE model_key LIKE 'PCI_%'
    AND manufacturer_name IS NULL;

  IF pci_count > 0 THEN
    UPDATE pulley_library_models
    SET
      manufacturer_name = 'PCI Manufacturing',
      manufacturer_part_number = CASE
        WHEN model_key = 'PCI_DRUM_4IN' THEN 'DRUM-4-STD'
        WHEN model_key = 'PCI_DRUM_6IN' THEN 'DRUM-6-STD'
        WHEN model_key = 'PCI_DRUM_8IN' THEN 'DRUM-8-STD'
        WHEN model_key = 'PCI_WING_6IN' THEN 'WING-6-SC'
        WHEN model_key = 'PCI_WING_8IN' THEN 'WING-8-SC'
        ELSE NULL
      END,
      source_url = 'https://www.pcimfg.com/pulley-selection-guide'
    WHERE model_key LIKE 'PCI_%'
      AND manufacturer_name IS NULL;

    RAISE NOTICE 'Updated % PCI models with manufacturer attribution', pci_count;
  ELSE
    RAISE NOTICE 'No PCI models found or already have manufacturer_name populated';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'pulley_library_models'
    AND column_name IN ('manufacturer_name', 'manufacturer_part_number', 'source_url');

  IF col_count = 3 THEN
    RAISE NOTICE 'Vendor-agnostic fields migration complete:';
    RAISE NOTICE '  - manufacturer_name column added';
    RAISE NOTICE '  - manufacturer_part_number column added';
    RAISE NOTICE '  - source_url column added';
  ELSE
    RAISE WARNING 'Expected 3 new columns, found %', col_count;
  END IF;
END $$;
