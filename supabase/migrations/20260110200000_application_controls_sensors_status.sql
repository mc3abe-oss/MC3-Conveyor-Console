-- ============================================================================
-- Application Admin: Controls, Sensors, Creator, Status
-- ============================================================================
--
-- This migration implements:
-- 1. Controls Package long description support (description_long column)
-- 2. Sensor Models catalog (caster-like pattern)
-- 3. Application Creator tracking (created_by_user_id)
-- 4. Application Status state machine (DRAFT/FINALIZED/SO_CREATED)
-- ============================================================================

-- ============================================================================
-- 1. CONTROLS PACKAGE: Add description_long column
-- ============================================================================

-- Add description_long column to catalog_items (nullable, for controls_package)
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS description_long TEXT;

COMMENT ON COLUMN catalog_items.description_long IS 'Extended description for catalog items (used by controls_package)';

-- ============================================================================
-- 2. SENSOR MODELS: Create sensor_models catalog
-- ============================================================================

-- Seed sensor_models catalog (caster-like pattern)
-- Note: catalog_items doesn't have a description column, using description_long instead
INSERT INTO catalog_items (catalog_key, item_key, label, description_long, sort_order, is_active)
VALUES
  ('sensor_model', 'PHOTOEYE-STD', 'Standard Photoeye', 'Banner QS18 or equivalent', 10, true),
  ('sensor_model', 'PHOTOEYE-LR', 'Long Range Photoeye', 'Banner QS30 long range sensor', 20, true),
  ('sensor_model', 'PROX-IND', 'Inductive Proximity', 'Metal detection proximity sensor', 30, true),
  ('sensor_model', 'PROX-CAP', 'Capacitive Proximity', 'Non-metal detection proximity sensor', 40, true),
  ('sensor_model', 'ENCODER-STD', 'Standard Encoder', '1024 PPR incremental encoder', 50, true),
  ('sensor_model', 'ENCODER-ABS', 'Absolute Encoder', 'Multi-turn absolute encoder', 60, true),
  ('sensor_model', 'SPEED-ZERO', 'Zero Speed Switch', 'Under-speed detection switch', 70, true),
  ('sensor_model', 'BELT-ALIGN', 'Belt Alignment Switch', 'Belt mis-tracking detection', 80, true)
ON CONFLICT (catalog_key, item_key) DO UPDATE SET
  label = EXCLUDED.label,
  description_long = EXCLUDED.description_long,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 3. APPLICATION CREATOR: Ensure created_by tracking
-- ============================================================================
-- Note: calc_recipes.created_by already exists per schema exploration.
-- We just need to ensure it's populated and add a helper view.

-- No schema change needed - created_by UUID column already exists.
-- The API will be updated to stamp this on creation.

-- ============================================================================
-- 4. APPLICATION STATUS: Add status column to calc_recipes
-- ============================================================================

-- Add application_status column with CHECK constraint
ALTER TABLE calc_recipes
  ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'DRAFT'
  CHECK (application_status IN ('DRAFT', 'FINALIZED', 'SO_CREATED'));

COMMENT ON COLUMN calc_recipes.application_status IS 'Application status: DRAFT (editable/deletable), FINALIZED (no delete), SO_CREATED (from quote conversion)';

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_calc_recipes_application_status ON calc_recipes(application_status);

-- ============================================================================
-- 5. Update Controls Package with description_long
-- ============================================================================

-- Update existing controls_package items with description_long
UPDATE catalog_items
SET description_long = 'No controls package included. Customer is responsible for all electrical controls and wiring.'
WHERE catalog_key = 'controls_package' AND item_key = 'NONE';

UPDATE catalog_items
SET description_long = 'Basic start/stop push button station with motor starter. Includes emergency stop and local on/off control.'
WHERE catalog_key = 'controls_package' AND item_key = 'START_STOP';

UPDATE catalog_items
SET description_long = 'Variable frequency drive for speed control. Includes VFD enclosure, operator interface, and basic fault diagnostics. Allows adjustable belt speed from 0-100% of rated speed.'
WHERE catalog_key = 'controls_package' AND item_key = 'VFD';

UPDATE catalog_items
SET description_long = 'Complete automation package with PLC integration, HMI touchscreen, and network connectivity. Includes full I/O for sensors, interlocks, and upstream/downstream communication.'
WHERE catalog_key = 'controls_package' AND item_key = 'FULL_AUTOMATION';
