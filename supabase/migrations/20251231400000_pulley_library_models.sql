-- Migration: Pulley Library Models (Level 2)
-- Purpose: Add concrete, selectable pulley models with size/limit constraints
--
-- LEVEL 1: pulley_library_styles - conceptual (DRUM, WING, SPIRAL_WING)
-- LEVEL 2: pulley_library_models - concrete (PCI_DRUM_4IN, PCI_DRUM_6IN, etc.)
--
-- Key change: application_pulleys now references model_key, not style_key

-- ============================================================================
-- PHASE 1: MAKE STYLE_TYPE IMMUTABLE IN STYLES TABLE
-- ============================================================================

-- Trigger to prevent style_type changes after creation
CREATE OR REPLACE FUNCTION prevent_style_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.style_type IS DISTINCT FROM NEW.style_type THEN
    RAISE EXCEPTION 'style_type is immutable once created. Create a new style instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pulley_style_type_immutable
  BEFORE UPDATE ON pulley_library_styles
  FOR EACH ROW EXECUTE FUNCTION prevent_style_type_change();

-- ============================================================================
-- PHASE 2: CREATE MODELS TABLE
-- ============================================================================

CREATE TABLE pulley_library_models (
  -- Primary key
  model_key TEXT PRIMARY KEY,

  -- Display
  display_name TEXT NOT NULL,
  description TEXT,

  -- Link to conceptual style (FK)
  style_key TEXT NOT NULL REFERENCES pulley_library_styles(key),

  -- Shell geometry (REQUIRED for models)
  shell_od_in NUMERIC(6,3) NOT NULL,
  default_shell_wall_in NUMERIC(5,3) NOT NULL,

  -- Allowed wall thickness steps (for validation)
  -- Array of standard wall thicknesses available for this model
  allowed_wall_steps_in NUMERIC(5,3)[] NOT NULL DEFAULT ARRAY[0.134, 0.188, 0.250]::NUMERIC[],

  -- Face width constraints
  face_width_min_in NUMERIC(5,2) NOT NULL,
  face_width_max_in NUMERIC(5,2) NOT NULL,
  face_width_allowance_in NUMERIC(4,2) NOT NULL DEFAULT 2.0,

  -- Position eligibility (can override style defaults)
  eligible_drive BOOLEAN NOT NULL DEFAULT TRUE,
  eligible_tail BOOLEAN NOT NULL DEFAULT TRUE,
  eligible_dirty_side BOOLEAN NOT NULL DEFAULT FALSE,

  -- Tracking eligibility (can override style defaults)
  eligible_crown BOOLEAN NOT NULL DEFAULT TRUE,
  eligible_v_guided BOOLEAN NOT NULL DEFAULT FALSE,

  -- Lagging eligibility
  eligible_lagging BOOLEAN NOT NULL DEFAULT TRUE,

  -- Stress limits (PCI) - nullable to inherit from style
  tube_stress_limit_flat_psi NUMERIC(8,0),
  tube_stress_limit_vgroove_psi NUMERIC(8,0),

  -- Metadata
  notes TEXT,
  source_doc TEXT,  -- Reference to PCI doc or other source
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT face_width_range_valid CHECK (face_width_min_in <= face_width_max_in),
  CONSTRAINT shell_od_positive CHECK (shell_od_in > 0),
  CONSTRAINT default_wall_positive CHECK (default_shell_wall_in > 0)
);

-- Index
CREATE INDEX idx_pulley_library_models_active ON pulley_library_models(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pulley_library_models_style ON pulley_library_models(style_key);

-- Timestamp trigger
CREATE TRIGGER trigger_pulley_library_models_updated
  BEFORE UPDATE ON pulley_library_models
  FOR EACH ROW EXECUTE FUNCTION update_pulley_timestamp();

-- ============================================================================
-- PHASE 3: UPDATE APPLICATION_PULLEYS TO USE MODEL_KEY
-- ============================================================================

-- Add model_key column
ALTER TABLE application_pulleys
  ADD COLUMN model_key TEXT REFERENCES pulley_library_models(model_key);

-- Add override reason column (for when user deviates from defaults)
ALTER TABLE application_pulleys
  ADD COLUMN override_reason TEXT;

-- Add validation status columns
ALTER TABLE application_pulleys
  ADD COLUMN wall_validation_status TEXT DEFAULT 'NOT_VALIDATED',
  ADD COLUMN wall_validation_result JSONB;

-- Add constraint for validation status values
ALTER TABLE application_pulleys
  ADD CONSTRAINT wall_validation_status_values CHECK (
    wall_validation_status IN ('NOT_VALIDATED', 'PASS', 'RECOMMEND_UPGRADE', 'FAIL_ENGINEERING_REQUIRED')
  );

-- Note: We keep style_key for backward compatibility during migration
-- New records should use model_key; style_key will be deprecated

-- ============================================================================
-- PHASE 4: SEED INITIAL MODELS
-- ============================================================================

-- PCI Drum pulleys (various sizes)
INSERT INTO pulley_library_models (
  model_key, display_name, description, style_key,
  shell_od_in, default_shell_wall_in, allowed_wall_steps_in,
  face_width_min_in, face_width_max_in, face_width_allowance_in,
  eligible_drive, eligible_tail, eligible_dirty_side,
  eligible_crown, eligible_v_guided, eligible_lagging,
  tube_stress_limit_flat_psi, tube_stress_limit_vgroove_psi,
  notes, source_doc, sort_order
) VALUES
-- 4" Drum
(
  'PCI_DRUM_4IN',
  'PCI Drum – 4"',
  'Standard 4" drum pulley for light-duty applications',
  'DRUM_STEEL_STANDARD',
  4.0,                                      -- shell_od_in
  0.134,                                    -- default_shell_wall_in (11 ga)
  ARRAY[0.109, 0.134, 0.165]::NUMERIC[],   -- allowed_wall_steps_in (13ga, 11ga, 8ga)
  6.0,                                      -- face_width_min_in
  36.0,                                     -- face_width_max_in
  2.0,                                      -- face_width_allowance_in
  TRUE, TRUE, FALSE,                        -- eligible_drive, tail, dirty_side
  TRUE, TRUE, TRUE,                         -- eligible_crown, v_guided, lagging
  10000, 3400,                              -- stress limits
  'Light-duty applications. Consider upgrading wall for V-guided tracking.',
  'PCI-001',
  10
),
-- 6" Drum
(
  'PCI_DRUM_6IN',
  'PCI Drum – 6"',
  'Standard 6" drum pulley for medium-duty applications',
  'DRUM_STEEL_STANDARD',
  6.0,                                      -- shell_od_in
  0.134,                                    -- default_shell_wall_in
  ARRAY[0.109, 0.134, 0.188, 0.250]::NUMERIC[],
  6.0,                                      -- face_width_min_in
  54.0,                                     -- face_width_max_in
  2.0,                                      -- face_width_allowance_in
  TRUE, TRUE, FALSE,
  TRUE, TRUE, TRUE,
  10000, 3400,
  'Most common size. Good balance of capacity and cost.',
  'PCI-001',
  20
),
-- 8" Drum
(
  'PCI_DRUM_8IN',
  'PCI Drum – 8"',
  'Standard 8" drum pulley for heavy-duty applications',
  'DRUM_STEEL_STANDARD',
  8.0,                                      -- shell_od_in
  0.188,                                    -- default_shell_wall_in (3/16")
  ARRAY[0.134, 0.188, 0.250, 0.375]::NUMERIC[],
  6.0,                                      -- face_width_min_in
  72.0,                                     -- face_width_max_in
  2.0,                                      -- face_width_allowance_in
  TRUE, TRUE, FALSE,
  TRUE, TRUE, TRUE,
  10000, 3400,
  'Heavy-duty applications. Use for wider belts or higher tensions.',
  'PCI-001',
  30
),
-- 6" Wing (tail only)
(
  'PCI_WING_6IN',
  'PCI Wing – 6"',
  '6" self-cleaning wing pulley for tail/return applications',
  'WING_STEEL_STANDARD',
  6.0,                                      -- shell_od_in (effective)
  0.188,                                    -- default_shell_wall_in
  ARRAY[0.134, 0.188, 0.250]::NUMERIC[],
  12.0,                                     -- face_width_min_in (wings need more width)
  48.0,                                     -- face_width_max_in
  4.0,                                      -- face_width_allowance_in (wings need more clearance)
  FALSE, TRUE, TRUE,                        -- NOT eligible for drive
  FALSE, FALSE, FALSE,                      -- NOT eligible for crown/v-guided/lagging
  8000, NULL,                               -- lower stress limit, no V-groove option
  'Self-cleaning for dirty environments. Tail position only.',
  'PCI-002',
  40
),
-- 8" Wing (tail only)
(
  'PCI_WING_8IN',
  'PCI Wing – 8"',
  '8" self-cleaning wing pulley for tail/return applications',
  'WING_STEEL_STANDARD',
  8.0,                                      -- shell_od_in
  0.188,                                    -- default_shell_wall_in
  ARRAY[0.188, 0.250, 0.375]::NUMERIC[],
  12.0,                                     -- face_width_min_in
  60.0,                                     -- face_width_max_in
  4.0,                                      -- face_width_allowance_in
  FALSE, TRUE, TRUE,                        -- NOT eligible for drive
  FALSE, FALSE, FALSE,                      -- NOT eligible for crown/v-guided/lagging
  8000, NULL,
  'Heavy-duty self-cleaning. For wider belts in dirty environments.',
  'PCI-002',
  50
);

-- ============================================================================
-- PHASE 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  model_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO model_count FROM pulley_library_models WHERE is_active = TRUE;
  RAISE NOTICE 'Pulley library models migration complete:';
  RAISE NOTICE '  - style_type now immutable in pulley_library_styles';
  RAISE NOTICE '  - pulley_library_models created with % seed records', model_count;
  RAISE NOTICE '  - application_pulleys updated with model_key column';
END $$;
