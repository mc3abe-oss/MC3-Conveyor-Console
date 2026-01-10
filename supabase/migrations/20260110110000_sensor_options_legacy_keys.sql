-- ============================================================================
-- Sensor Options - Use Legacy Keys for Backward Compatibility
-- ============================================================================
--
-- The original SensorOption enum stored values like 'Product present (photoeye)'
-- directly in the database. To maintain backward compatibility, we use these
-- exact strings as item_key values.
-- ============================================================================

-- Delete the incorrectly keyed sensor options
DELETE FROM catalog_items WHERE catalog_key = 'sensor_option';

-- Re-insert with legacy-compatible keys (matching stored enum values)
INSERT INTO catalog_items (catalog_key, item_key, label, sort_order, is_active)
VALUES
  ('sensor_option', 'Product present (photoeye)', 'Product present (photoeye)', 10, true),
  ('sensor_option', 'Jam detection', 'Jam detection', 20, true),
  ('sensor_option', 'Belt mis-tracking', 'Belt mis-tracking', 30, true),
  ('sensor_option', 'Zero speed / motion', 'Zero speed / motion', 40, true),
  ('sensor_option', 'Encoder', 'Encoder', 50, true)
ON CONFLICT (catalog_key, item_key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;
