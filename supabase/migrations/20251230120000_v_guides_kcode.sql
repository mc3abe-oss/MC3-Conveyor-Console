-- ============================================================================
-- Migration: V-Guides K-Code as Canonical Key
-- Version: v1.22.1
--
-- Fixes V-Guides so K-code (K10, K13, etc.) is the canonical key.
-- NA letter (O/A/B/C) becomes an optional alias.
-- ============================================================================

-- Step 1: Add na_letter column (nullable)
ALTER TABLE v_guides ADD COLUMN IF NOT EXISTS na_letter TEXT;

-- Step 2: Migrate existing data from EU letter keys to K-code keys
-- Map: O->K10, A->K13, B->K17, C->K22

-- First, populate na_letter from eu_code for existing rows
UPDATE v_guides SET na_letter = eu_code WHERE na_letter IS NULL;

-- Update the keys from NA letter to K-code
UPDATE v_guides SET
  key = 'K10',
  label = 'O (K10)'
WHERE key = 'O';

UPDATE v_guides SET
  key = 'K13',
  label = 'A (K13)'
WHERE key = 'A';

UPDATE v_guides SET
  key = 'K17',
  label = 'B (K17)'
WHERE key = 'B';

UPDATE v_guides SET
  key = 'K22',
  label = 'C (K22)'
WHERE key = 'C';

-- Step 3: Drop old columns that are no longer needed
-- eu_code is replaced by na_letter
-- na_code is replaced by key (which is now the K-code)
ALTER TABLE v_guides DROP COLUMN IF EXISTS eu_code;
ALTER TABLE v_guides DROP COLUMN IF EXISTS na_code;

-- Step 4: Add comments for clarity
COMMENT ON COLUMN v_guides.key IS 'Canonical K-code identifier (K10, K13, K17, K22, etc.). Stable key for saved configs.';
COMMENT ON COLUMN v_guides.na_letter IS 'Optional NA letter alias (O, A, B, C). Null for K-codes without NA equivalent.';
COMMENT ON COLUMN v_guides.label IS 'Display label. Format: "O (K10)" if na_letter exists, else "K10"';
