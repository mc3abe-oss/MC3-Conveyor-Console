-- ============================================================================
-- Add description column to catalog_items
-- ============================================================================
-- The CatalogAdmin UI uses a 'description' field, but the table only had
-- 'description_long'. This adds the short description column.
-- ============================================================================

ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN catalog_items.description IS 'Short description/helper text for catalog items';
