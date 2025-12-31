-- Migration: Pulley System Hard Reset
-- Purpose: Drop all legacy pulley tables and create clean PCI-aligned model
--
-- OLD TABLES DROPPED:
--   - pulley_catalog, pulley_catalog_versions
--   - pulley_families, pulley_variants
--   - pulley_definitions, pulley_configurations, pulley_aliases, pulley_overrides
--
-- NEW TABLES CREATED:
--   - pulley_library_styles (admin/engineering truth)
--   - application_pulleys (per-application-line configuration)

-- ============================================================================
-- PHASE 1: DROP LEGACY TABLES (order matters due to FKs)
-- ============================================================================

-- Drop new model tables (just created, no data loss concerns)
DROP TABLE IF EXISTS pulley_overrides CASCADE;
DROP TABLE IF EXISTS pulley_aliases CASCADE;
DROP TABLE IF EXISTS pulley_configurations CASCADE;
DROP TABLE IF EXISTS pulley_definitions CASCADE;

-- Drop families/variants model
DROP TABLE IF EXISTS pulley_variants CASCADE;
DROP TABLE IF EXISTS pulley_families CASCADE;

-- Drop legacy catalog
DROP TABLE IF EXISTS pulley_catalog_versions CASCADE;
DROP TABLE IF EXISTS pulley_catalog CASCADE;

-- Drop enums from pulley_definitions model
DROP TYPE IF EXISTS pulley_override_level CASCADE;
DROP TYPE IF EXISTS pulley_alias_type CASCADE;
DROP TYPE IF EXISTS pulley_bearing_arrangement CASCADE;
DROP TYPE IF EXISTS pulley_hub_style CASCADE;
DROP TYPE IF EXISTS pulley_lagging_type CASCADE;
DROP TYPE IF EXISTS pulley_material_class CASCADE;
DROP TYPE IF EXISTS pulley_type CASCADE;
DROP TYPE IF EXISTS pulley_definition_type CASCADE;

-- Drop legacy catalog enums
DROP TYPE IF EXISTS pulley_construction CASCADE;
DROP TYPE IF EXISTS pulley_hub_connection CASCADE;
DROP TYPE IF EXISTS pulley_shaft_arrangement CASCADE;

-- Drop functions/triggers
DROP FUNCTION IF EXISTS update_pulley_updated_at() CASCADE;
DROP FUNCTION IF EXISTS validate_pulley_configuration() CASCADE;

-- ============================================================================
-- PHASE 2: CREATE NEW ENUMS
-- ============================================================================

-- Pulley style type (construction)
CREATE TYPE pulley_style_type AS ENUM (
  'DRUM',           -- Standard drum pulley
  'WING',           -- Wing pulley (self-cleaning)
  'SPIRAL_WING'     -- Spiral wing (future)
);

-- Face profile options
CREATE TYPE pulley_face_profile AS ENUM (
  'FLAT',           -- Flat face
  'CROWNED',        -- Crowned for tracking
  'V_GUIDED'        -- V-groove for V-guided belts
);

-- Lagging type
CREATE TYPE pulley_lagging AS ENUM (
  'NONE',
  'RUBBER',
  'URETHANE'
);

-- Pulley position in application
CREATE TYPE pulley_position AS ENUM (
  'DRIVE',
  'TAIL'
);

-- ============================================================================
-- PHASE 3: CREATE ADMIN LIBRARY TABLE
-- ============================================================================

CREATE TABLE pulley_library_styles (
  -- Primary key
  key TEXT PRIMARY KEY,

  -- Display
  name TEXT NOT NULL,
  description TEXT,

  -- Classification
  style_type pulley_style_type NOT NULL,
  material_class TEXT NOT NULL DEFAULT 'STEEL',

  -- Eligibility flags (what positions/features this style supports)
  eligible_drive BOOLEAN NOT NULL DEFAULT TRUE,
  eligible_tail BOOLEAN NOT NULL DEFAULT TRUE,
  eligible_dirty_side BOOLEAN NOT NULL DEFAULT TRUE,
  eligible_crown BOOLEAN NOT NULL DEFAULT TRUE,
  eligible_v_guided BOOLEAN NOT NULL DEFAULT FALSE,
  eligible_lagging BOOLEAN NOT NULL DEFAULT TRUE,

  -- Face width rules
  face_width_rule TEXT NOT NULL DEFAULT 'BELT_PLUS_ALLOWANCE',  -- or 'MANUAL_RANGE'
  face_width_allowance_in NUMERIC(4,2) DEFAULT 2.0,
  face_width_min_in NUMERIC(5,2),
  face_width_max_in NUMERIC(5,2),

  -- Stress limits (PCI)
  tube_stress_limit_flat_psi NUMERIC(8,0) DEFAULT 10000,
  tube_stress_limit_vgroove_psi NUMERIC(8,0) DEFAULT 3400,

  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_pulley_library_styles_active ON pulley_library_styles(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PHASE 4: CREATE APPLICATION TABLE
-- ============================================================================

CREATE TABLE application_pulleys (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to application line (quote line / SO line)
  application_line_id UUID NOT NULL,  -- FK added later if table exists

  -- Position (DRIVE or TAIL)
  position pulley_position NOT NULL,

  -- Style selection (FK to library)
  style_key TEXT NOT NULL REFERENCES pulley_library_styles(key),

  -- Face profile selection
  face_profile pulley_face_profile NOT NULL DEFAULT 'FLAT',

  -- V-guide key (only if face_profile = V_GUIDED)
  v_guide_key TEXT,  -- FK to v_guide_catalog if exists

  -- Lagging
  lagging_type pulley_lagging NOT NULL DEFAULT 'NONE',
  lagging_thickness_in NUMERIC(4,3),

  -- Resolved geometry (for calculations)
  face_width_in NUMERIC(5,2),
  shell_od_in NUMERIC(6,3),
  shell_wall_in NUMERIC(5,3),
  hub_centers_in NUMERIC(6,2),
  finished_od_in NUMERIC(6,3),  -- shell_od + 2*lagging_thickness

  -- PCI enforcement flag
  enforce_pci_checks BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_line_position UNIQUE (application_line_id, position),
  CONSTRAINT v_guide_requires_profile CHECK (
    face_profile = 'V_GUIDED' OR v_guide_key IS NULL
  ),
  CONSTRAINT lagging_thickness_required CHECK (
    lagging_type = 'NONE' OR lagging_thickness_in IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_application_pulleys_line ON application_pulleys(application_line_id);
CREATE INDEX idx_application_pulleys_style ON application_pulleys(style_key);

-- ============================================================================
-- PHASE 5: TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_pulley_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pulley_library_styles_updated
  BEFORE UPDATE ON pulley_library_styles
  FOR EACH ROW EXECUTE FUNCTION update_pulley_timestamp();

CREATE TRIGGER trigger_application_pulleys_updated
  BEFORE UPDATE ON application_pulleys
  FOR EACH ROW EXECUTE FUNCTION update_pulley_timestamp();

-- Auto-compute finished_od_in
CREATE OR REPLACE FUNCTION compute_finished_od()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shell_od_in IS NOT NULL THEN
    NEW.finished_od_in := NEW.shell_od_in + COALESCE(NEW.lagging_thickness_in, 0) * 2;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_application_pulleys_finished_od
  BEFORE INSERT OR UPDATE ON application_pulleys
  FOR EACH ROW EXECUTE FUNCTION compute_finished_od();

-- ============================================================================
-- PHASE 6: SEED INITIAL LIBRARY DATA
-- ============================================================================

INSERT INTO pulley_library_styles (key, name, description, style_type, eligible_drive, eligible_tail, eligible_dirty_side, eligible_crown, eligible_v_guided, eligible_lagging, notes) VALUES
(
  'DRUM_STEEL_STANDARD',
  'Standard Drum',
  'Standard steel drum pulley for general purpose conveyor applications',
  'DRUM',
  TRUE,   -- eligible_drive
  TRUE,   -- eligible_tail
  FALSE,  -- eligible_dirty_side (debris can damage belt)
  TRUE,   -- eligible_crown
  TRUE,   -- eligible_v_guided
  TRUE,   -- eligible_lagging
  'Most common pulley type. Use crowned face for tracking on non-V-guided belts.'
),
(
  'WING_STEEL_STANDARD',
  'Wing Pulley',
  'Self-cleaning wing pulley for dirty/return side applications',
  'WING',
  FALSE,  -- eligible_drive (not typically used as drive)
  TRUE,   -- eligible_tail
  TRUE,   -- eligible_dirty_side (self-cleaning)
  FALSE,  -- eligible_crown (wings don't crown)
  FALSE,  -- eligible_v_guided (not compatible)
  FALSE,  -- eligible_lagging (wings don't lag)
  'Use on dirty/return side where debris carryback is expected. Self-cleaning design.'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Pulley reset complete:';
  RAISE NOTICE '  - Legacy tables dropped';
  RAISE NOTICE '  - pulley_library_styles created with 2 seed records';
  RAISE NOTICE '  - application_pulleys created';
END $$;
