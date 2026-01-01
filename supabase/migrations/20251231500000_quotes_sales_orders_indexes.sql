-- Migration: Add indexes for quotes and sales orders list performance
-- Purpose: Support efficient search, pagination, and date range filtering

-- ============================================================================
-- QUOTES INDEXES
-- ============================================================================

-- Index for date range filtering and sorting (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_quotes_created_at
  ON quotes(created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for quote number search (ilike patterns)
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number_lower
  ON quotes(lower(quote_number))
  WHERE deleted_at IS NULL;

-- Index for customer name search (ilike patterns)
CREATE INDEX IF NOT EXISTS idx_quotes_customer_name_lower
  ON quotes(lower(customer_name))
  WHERE deleted_at IS NULL AND customer_name IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_quotes_status
  ON quotes(quote_status)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- SALES ORDERS INDEXES
-- ============================================================================

-- Index for date range filtering and sorting (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at
  ON sales_orders(created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for sales order number search (ilike patterns)
CREATE INDEX IF NOT EXISTS idx_sales_orders_so_number_lower
  ON sales_orders(lower(sales_order_number))
  WHERE deleted_at IS NULL;

-- Index for customer name search (ilike patterns)
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_name_lower
  ON sales_orders(lower(customer_name))
  WHERE deleted_at IS NULL AND customer_name IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Quote/Sales Order list indexes created successfully';
END $$;
