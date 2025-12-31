-- ============================================================================
-- Migration: Fix unique indexes to allow soft-deleted duplicates
-- ============================================================================
-- Problem: The original unique indexes on base_number block ALL duplicates,
-- even when records are soft-deleted (deleted_at IS NOT NULL).
-- This prevents users from creating a new Quote/SO with the same number
-- after deleting a draft.
--
-- Fix: Replace non-partial unique indexes with partial unique indexes that
-- only apply to non-deleted records.
-- ============================================================================

-- === CLEANUP DUPLICATES FIRST ===

-- Clean up duplicate quotes (keep most recent)
DELETE FROM quotes a
USING quotes b
WHERE a.base_number = b.base_number
  AND a.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND a.created_at < b.created_at;

-- Clean up duplicate sales_orders (keep most recent)
DELETE FROM sales_orders a
USING sales_orders b
WHERE a.base_number = b.base_number
  AND a.deleted_at IS NULL
  AND b.deleted_at IS NULL
  AND a.created_at < b.created_at;

-- === SALES ORDERS ===

-- Drop the original non-partial unique index on base_number
DROP INDEX IF EXISTS idx_sales_orders_base_number;

-- Ensure partial unique index exists for base_number
DROP INDEX IF EXISTS idx_sales_orders_base_number_unique;
CREATE UNIQUE INDEX idx_sales_orders_base_number_unique
  ON sales_orders (base_number)
  WHERE deleted_at IS NULL;

-- Fix sales_order_number unique constraint (display number like "SO30884")
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_sales_order_number_key;
DROP INDEX IF EXISTS sales_orders_sales_order_number_key;
CREATE UNIQUE INDEX idx_sales_orders_number_unique
  ON sales_orders (sales_order_number)
  WHERE deleted_at IS NULL;

-- === QUOTES ===

-- Drop the original non-partial unique index on base_number
DROP INDEX IF EXISTS idx_quotes_base_number;

-- Create partial unique index for base_number
DROP INDEX IF EXISTS idx_quotes_base_number_unique;
CREATE UNIQUE INDEX idx_quotes_base_number_unique
  ON quotes (base_number)
  WHERE deleted_at IS NULL;

-- Fix quote_number unique constraint (display number like "Q12345")
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_quote_number_key;
DROP INDEX IF EXISTS quotes_quote_number_key;
CREATE UNIQUE INDEX idx_quotes_number_unique
  ON quotes (quote_number)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- Result: Same base_number can now exist multiple times as long as only ONE
-- has deleted_at IS NULL. This allows:
-- 1. User creates SO30886 (draft)
-- 2. User deletes draft -> sets deleted_at
-- 3. User creates SO30886 again -> works because old one is soft-deleted
-- ============================================================================
