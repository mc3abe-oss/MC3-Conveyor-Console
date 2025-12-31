-- ============================================================================
-- Migration: Enable direct Sales Order creation
-- ============================================================================
-- Changes:
-- 1. Drop NOT NULL constraint on origin_quote_id (allows direct SO creation)
-- 2. Add suffix_line column for SO variants (e.g., SO30884.2)
-- 3. Add unique constraint on base_number (prevent duplicates)
-- ============================================================================

-- 1. Drop NOT NULL on origin_quote_id
ALTER TABLE sales_orders ALTER COLUMN origin_quote_id DROP NOT NULL;

-- 2. Add suffix_line column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'suffix_line'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN suffix_line INTEGER;
  END IF;
END $$;

-- 3. Add unique constraint on base_number (partial: only for non-deleted records)
-- First, clean up any duplicates that might exist in dev data
-- (keeps the most recent one)
DELETE FROM sales_orders a
USING sales_orders b
WHERE a.base_number = b.base_number
  AND a.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND a.created_at < b.created_at;

-- Create partial unique index (only for non-deleted records)
DROP INDEX IF EXISTS idx_sales_orders_base_number_unique;
CREATE UNIQUE INDEX idx_sales_orders_base_number_unique
  ON sales_orders (base_number)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- Migration complete: Sales Orders can now be created directly
-- ============================================================================
