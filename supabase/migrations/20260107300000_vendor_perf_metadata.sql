-- =============================================================================
-- MIGRATION: Add metadata_json to vendor_performance_points
-- =============================================================================
-- Purpose: Store model_type and parsed component data for BOM resolution.
--          Required for NORD FLEXBLOC v2 seeder which stores model_type
--          (e.g., "SK 1SI31 - 56C - 63S/4") for component lookup.
-- =============================================================================

ALTER TABLE vendor_performance_points
ADD COLUMN IF NOT EXISTS metadata_json JSONB;

COMMENT ON COLUMN vendor_performance_points.metadata_json IS 'Model type, parsed components, catalog reference data for BOM resolution';

-- =============================================================================
-- END MIGRATION
-- =============================================================================
