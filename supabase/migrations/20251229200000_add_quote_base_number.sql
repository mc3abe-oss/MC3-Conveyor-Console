-- ============================================================================
-- ADD base_number AND suffix_line TO quotes AND sales_orders
-- ============================================================================
-- The original migration file was modified after being applied.
-- This migration adds the missing columns.

-- Add columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS base_number INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS suffix_line INTEGER;

-- Populate base_number from quote_number (parse "Q12" -> 12, "Q12.1" -> 12)
UPDATE quotes
SET base_number = CASE
  WHEN quote_number ~ '^Q(\d+)' THEN
    (regexp_match(quote_number, '^Q(\d+)'))[1]::INTEGER
  ELSE NULL
END
WHERE base_number IS NULL AND quote_number IS NOT NULL;

-- Populate suffix_line from quote_number (parse "Q12.1" -> 1)
UPDATE quotes
SET suffix_line = CASE
  WHEN quote_number ~ '^Q\d+\.(\d+)$' THEN
    (regexp_match(quote_number, '^Q\d+\.(\d+)$'))[1]::INTEGER
  ELSE NULL
END
WHERE suffix_line IS NULL AND quote_number IS NOT NULL;

-- Make base_number required for new rows (existing nulls allowed for backward compat)
-- We can't add NOT NULL constraint since existing rows might have NULL

-- Create index on base_number if not exists
CREATE INDEX IF NOT EXISTS idx_quotes_base_number ON quotes(base_number) WHERE base_number IS NOT NULL;

-- Add columns to sales_orders table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
    ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS base_number INTEGER;
    ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS suffix_line INTEGER;

    -- Populate from sales_order_number
    UPDATE sales_orders
    SET base_number = CASE
      WHEN sales_order_number ~ '^SO(\d+)' THEN
        (regexp_match(sales_order_number, '^SO(\d+)'))[1]::INTEGER
      ELSE NULL
    END
    WHERE base_number IS NULL AND sales_order_number IS NOT NULL;

    UPDATE sales_orders
    SET suffix_line = CASE
      WHEN sales_order_number ~ '^SO\d+\.(\d+)$' THEN
        (regexp_match(sales_order_number, '^SO\d+\.(\d+)$'))[1]::INTEGER
      ELSE NULL
    END
    WHERE suffix_line IS NULL AND sales_order_number IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_sales_orders_base_number ON sales_orders(base_number) WHERE base_number IS NOT NULL;
  END IF;
END $$;

-- Comments
COMMENT ON COLUMN quotes.base_number IS 'Numeric identifier extracted from quote_number (e.g., 12 from Q12)';
COMMENT ON COLUMN quotes.suffix_line IS 'Line suffix from quote_number (e.g., 1 from Q12.1)';
