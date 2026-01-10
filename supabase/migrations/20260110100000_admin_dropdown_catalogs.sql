-- ============================================================================
-- Admin-Managed Dropdown Catalogs
-- ============================================================================
--
-- This migration seeds catalog items for admin-managed dropdowns:
-- - power_feed: Electrical power feed options
-- - controls_package: Controls package options
-- - documentation_package: Documentation deliverable options
-- - sensor_option: Sensors/Controls options (includes field wiring intent)
--
-- Field Wiring is consolidated into sensor_option entries with appropriate labels.
-- ============================================================================

-- Power Feed Options
INSERT INTO catalog_items (catalog_key, item_key, label, sort_order, is_active)
VALUES
  ('power_feed', 'V120_1PH', '120V 1-Phase', 10, true),
  ('power_feed', 'V240_1PH', '240V 1-Phase', 20, true),
  ('power_feed', 'V480_3PH', '480V 3-Phase', 30, true),
  ('power_feed', 'V600_3PH', '600V 3-Phase', 40, true)
ON CONFLICT (catalog_key, item_key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- Controls Package Options
INSERT INTO catalog_items (catalog_key, item_key, label, sort_order, is_active)
VALUES
  ('controls_package', 'NONE', 'None', 10, true),
  ('controls_package', 'START_STOP', 'Start/Stop', 20, true),
  ('controls_package', 'VFD', 'VFD', 30, true),
  ('controls_package', 'FULL_AUTOMATION', 'Full Automation', 40, true)
ON CONFLICT (catalog_key, item_key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- Documentation Package Options
INSERT INTO catalog_items (catalog_key, item_key, label, sort_order, is_active)
VALUES
  ('documentation_package', 'BASIC', 'Basic', 10, true),
  ('documentation_package', 'FULL', 'Full', 20, true),
  ('documentation_package', 'AS_BUILT', 'As-Built Drawings', 30, true)
ON CONFLICT (catalog_key, item_key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- Sensor Options (placeholder - will be replaced by next migration with legacy keys)
INSERT INTO catalog_items (catalog_key, item_key, label, sort_order, is_active)
VALUES
  ('sensor_option', 'PHOTOEYE', 'Product present (photoeye)', 10, true),
  ('sensor_option', 'JAM_DETECTION', 'Jam detection', 20, true),
  ('sensor_option', 'BELT_MISTRACKING', 'Belt mis-tracking', 30, true),
  ('sensor_option', 'ZERO_SPEED', 'Zero speed / motion', 40, true),
  ('sensor_option', 'ENCODER', 'Encoder', 50, true)
ON CONFLICT (catalog_key, item_key) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;
