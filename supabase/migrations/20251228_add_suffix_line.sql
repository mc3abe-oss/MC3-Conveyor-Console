-- ============================================================================
-- MIGRATION: Add suffix_line to quotes and sales_orders
-- ============================================================================
-- Adds the suffix_line column for storing the optional ".line" suffix
-- from user input like "62633.2"
--
-- This is separate from the job_line used in configuration linking.

-- Add suffix_line to quotes
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS suffix_line INTEGER;

COMMENT ON COLUMN quotes.suffix_line IS 'Optional suffix line from dotted input (e.g., 2 for "62633.2")';

-- Add suffix_line to sales_orders
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS suffix_line INTEGER;

COMMENT ON COLUMN sales_orders.suffix_line IS 'Optional suffix line from dotted input (e.g., 2 for "12345.2")';

-- Update the unique constraint on quotes to include suffix_line
-- First drop the old index if it exists
DROP INDEX IF EXISTS idx_quotes_base_number;

-- Create new unique index on (base_number, suffix_line) with NULL handling
-- Two quotes with same base_number but different suffix_lines are allowed
-- Two quotes with same base_number and both NULL suffix_line are not allowed
CREATE UNIQUE INDEX idx_quotes_base_number_suffix
ON quotes(base_number, COALESCE(suffix_line, 0))
WHERE deleted_at IS NULL;

-- Same for sales_orders
DROP INDEX IF EXISTS idx_sales_orders_base_number;

CREATE UNIQUE INDEX idx_sales_orders_base_number_suffix
ON sales_orders(base_number, COALESCE(suffix_line, 0))
WHERE deleted_at IS NULL;
