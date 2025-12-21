/**
 * Migration: Add reference_line column and update unique constraint
 *
 * Changes:
 * 1. Add reference_line column to configurations table (default 1)
 * 2. Drop old unique constraint on (reference_type, reference_number)
 * 3. Add new unique constraint on (reference_type, reference_number, reference_line)
 * 4. Add index for efficient lookups
 */

-- Add reference_line column
ALTER TABLE configurations
ADD COLUMN IF NOT EXISTS reference_line integer NOT NULL DEFAULT 1;

-- Drop old unique constraint (if exists)
-- Note: constraint name may vary depending on how it was created
DO $$
BEGIN
    -- Drop the constraint if it exists (check common naming patterns)
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'configurations_reference_type_reference_number_key'
    ) THEN
        ALTER TABLE configurations
        DROP CONSTRAINT configurations_reference_type_reference_number_key;
    END IF;

    -- Also check for line_key variant (in case it was named differently)
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'configurations_reference_type_reference_number_line_key_key'
    ) THEN
        ALTER TABLE configurations
        DROP CONSTRAINT configurations_reference_type_reference_number_line_key_key;
    END IF;
END $$;

-- Add new unique constraint with reference_line
ALTER TABLE configurations
ADD CONSTRAINT configurations_reference_key
UNIQUE (reference_type, reference_number, reference_line);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_configurations_reference
ON configurations (reference_type, reference_number, reference_line);

-- Update any existing rows to ensure reference_line is set
-- (This is a safety measure - default value should handle it)
UPDATE configurations
SET reference_line = COALESCE(reference_line, 1)
WHERE reference_line IS NULL;
