-- ============================================================================
-- PULLEY CATALOG - Database Schema (v1.15)
-- ============================================================================

-- =============================================================================
-- 1) ENUM TYPES
-- =============================================================================

-- Shaft arrangement - how pulley interfaces with shaft/bearings
-- IMPORTANT: INTERNAL_BEARINGS must be tail-only (enforced by constraint)
CREATE TYPE public.shaft_arrangement AS ENUM (
  'THROUGH_SHAFT_EXTERNAL_BEARINGS',  -- Standard: shaft passes through, bearings external
  'STUB_SHAFT_EXTERNAL_BEARINGS',     -- Stub shafts on each end, bearings external
  'INTERNAL_BEARINGS'                  -- Self-contained bearings inside pulley (TAIL ONLY)
);

-- Hub connection - how pulley hub attaches to shaft
CREATE TYPE public.hub_connection AS ENUM (
  'KEYED',                    -- Keyway + set screw
  'KEYLESS_LOCKING_ASSEMBLY', -- Compression-style (e.g., Ringfeder)
  'TAPER_LOCK',               -- Taper lock bushing
  'QD_BUSHING',               -- Quick-disconnect bushing
  'SET_SCREW',                -- Set screw only (light duty)
  'WELD_ON'                   -- Welded to shaft
);

-- Pulley construction type
CREATE TYPE public.pulley_construction AS ENUM (
  'DRUM',     -- Standard drum pulley
  'WING',     -- Wing/cage pulley (self-cleaning)
  'SPIRAL',   -- Spiral/herringbone
  'MAGNETIC'  -- Magnetic head pulley
);

-- =============================================================================
-- 2) MAIN TABLE: pulley_catalog
-- =============================================================================

CREATE TABLE public.pulley_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  catalog_key TEXT UNIQUE NOT NULL,          -- e.g., 'STD_DRUM_4_STEEL'
  display_name TEXT NOT NULL,                -- e.g., 'Standard 4" Steel Drum'
  manufacturer TEXT,
  part_number TEXT,

  -- Physical specifications
  diameter_in NUMERIC NOT NULL,              -- Pulley diameter (inches)
  face_width_max_in NUMERIC NOT NULL,        -- Maximum face width supported
  face_width_min_in NUMERIC,                 -- Optional minimum face width
  crown_height_in NUMERIC DEFAULT 0,         -- Crown height for tracking (0 = flat)

  -- Construction
  construction public.pulley_construction NOT NULL DEFAULT 'DRUM',
  shell_material TEXT DEFAULT 'steel',       -- steel, stainless, aluminum

  -- Lagging
  is_lagged BOOLEAN DEFAULT FALSE,
  lagging_type TEXT,                         -- rubber, ceramic, diamond, urethane
  lagging_thickness_in NUMERIC,              -- Adds to effective diameter (each side)

  -- Shaft interface
  shaft_arrangement public.shaft_arrangement NOT NULL DEFAULT 'THROUGH_SHAFT_EXTERNAL_BEARINGS',
  hub_connection public.hub_connection NOT NULL DEFAULT 'KEYED',

  -- Station compatibility flags
  allow_head_drive BOOLEAN DEFAULT TRUE,
  allow_tail BOOLEAN DEFAULT TRUE,
  allow_snub BOOLEAN DEFAULT FALSE,
  allow_bend BOOLEAN DEFAULT FALSE,
  allow_takeup BOOLEAN DEFAULT FALSE,
  dirty_side_ok BOOLEAN DEFAULT TRUE,        -- Can contact product side of belt

  -- Operating limits
  max_shaft_rpm NUMERIC,                     -- Maximum shaft RPM
  max_belt_speed_fpm NUMERIC,                -- Max belt speed (B105.1 compliance)
  max_tension_pli NUMERIC,                   -- Max belt tension (lb/in)

  -- Status & metadata
  is_preferred BOOLEAN DEFAULT FALSE,        -- Show prominently in selection
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  tags TEXT[],

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3) AUDIT TABLE: pulley_catalog_versions
-- =============================================================================

CREATE TABLE public.pulley_catalog_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pulley_id UUID NOT NULL REFERENCES public.pulley_catalog(id) ON DELETE CASCADE,
  version INT NOT NULL,
  data JSONB NOT NULL,                       -- Full snapshot before change
  change_reason TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pulley_id, version)
);

-- =============================================================================
-- 4) INDEXES
-- =============================================================================

-- Primary lookups
CREATE INDEX idx_pulley_catalog_key ON public.pulley_catalog(catalog_key);
CREATE INDEX idx_pulley_active ON public.pulley_catalog(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pulley_preferred ON public.pulley_catalog(is_preferred) WHERE is_preferred = TRUE AND is_active = TRUE;

-- Filtering indexes
CREATE INDEX idx_pulley_diameter ON public.pulley_catalog(diameter_in);
CREATE INDEX idx_pulley_face_width_max ON public.pulley_catalog(face_width_max_in);
CREATE INDEX idx_pulley_construction ON public.pulley_catalog(construction);
CREATE INDEX idx_pulley_shaft_arrangement ON public.pulley_catalog(shaft_arrangement);

-- Station compatibility (partial indexes for common queries)
CREATE INDEX idx_pulley_allow_head ON public.pulley_catalog(allow_head_drive)
  WHERE allow_head_drive = TRUE AND is_active = TRUE;
CREATE INDEX idx_pulley_allow_tail ON public.pulley_catalog(allow_tail)
  WHERE allow_tail = TRUE AND is_active = TRUE;

-- Audit lookups
CREATE INDEX idx_pulley_versions_pulley ON public.pulley_catalog_versions(pulley_id);
CREATE INDEX idx_pulley_versions_changed_at ON public.pulley_catalog_versions(changed_at DESC);

-- =============================================================================
-- 5) CONSTRAINTS
-- =============================================================================

-- INTERNAL_BEARINGS must be tail-only (CRITICAL CONSTRAINT)
ALTER TABLE public.pulley_catalog ADD CONSTRAINT chk_internal_bearings_tail_only
  CHECK (
    shaft_arrangement != 'INTERNAL_BEARINGS'
    OR (
      allow_head_drive = FALSE
      AND allow_snub = FALSE
      AND allow_bend = FALSE
      AND allow_takeup = FALSE
      AND allow_tail = TRUE
    )
  );

-- Lagging thickness required when is_lagged = true
ALTER TABLE public.pulley_catalog ADD CONSTRAINT chk_lagging_thickness
  CHECK (
    is_lagged = FALSE
    OR (lagging_thickness_in IS NOT NULL AND lagging_thickness_in >= 0)
  );

-- Positive dimensions
ALTER TABLE public.pulley_catalog ADD CONSTRAINT chk_positive_diameter
  CHECK (diameter_in > 0);
ALTER TABLE public.pulley_catalog ADD CONSTRAINT chk_positive_face_width_max
  CHECK (face_width_max_in > 0);
ALTER TABLE public.pulley_catalog ADD CONSTRAINT chk_non_negative_crown
  CHECK (crown_height_in IS NULL OR crown_height_in >= 0);

-- Face width min <= max
ALTER TABLE public.pulley_catalog ADD CONSTRAINT chk_face_width_range
  CHECK (face_width_min_in IS NULL OR face_width_min_in <= face_width_max_in);

-- =============================================================================
-- 6) TRIGGERS
-- =============================================================================

-- Auto-update updated_at (reuse existing function if exists)
CREATE OR REPLACE FUNCTION public.set_pulley_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pulley_catalog_updated_at
  BEFORE UPDATE ON public.pulley_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pulley_updated_at();

-- Snapshot before update for audit trail
CREATE OR REPLACE FUNCTION public.snapshot_pulley_catalog_before_update()
RETURNS TRIGGER AS $$
DECLARE
  next_version INT;
  change_reason TEXT;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM public.pulley_catalog_versions
  WHERE pulley_id = OLD.id;

  -- Get change reason from session variable
  change_reason := current_setting('app.change_reason', TRUE);
  IF change_reason IS NULL OR change_reason = '' THEN
    change_reason := 'No reason provided';
  END IF;

  -- Insert snapshot of OLD record
  INSERT INTO public.pulley_catalog_versions (
    pulley_id, version, data, change_reason, changed_by, changed_at
  ) VALUES (
    OLD.id,
    next_version,
    to_jsonb(OLD),
    change_reason,
    NULLIF(current_setting('app.changed_by', TRUE), '')::UUID,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pulley_catalog_snapshot
  BEFORE UPDATE ON public.pulley_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_pulley_catalog_before_update();

-- =============================================================================
-- 7) ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.pulley_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulley_catalog_versions ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users (active pulleys only)
CREATE POLICY "read_active_pulleys"
  ON public.pulley_catalog
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Read access for anonymous (public catalog)
CREATE POLICY "anon_read_active_pulleys"
  ON public.pulley_catalog
  FOR SELECT
  TO anon
  USING (is_active = TRUE);

-- Versions readable by authenticated users
CREATE POLICY "read_pulley_versions"
  ON public.pulley_catalog_versions
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- =============================================================================
-- 8) SEED DATA
-- =============================================================================

INSERT INTO public.pulley_catalog (
  catalog_key, display_name, manufacturer, part_number,
  diameter_in, face_width_max_in, face_width_min_in, crown_height_in,
  construction, shell_material,
  is_lagged, lagging_type, lagging_thickness_in,
  shaft_arrangement, hub_connection,
  allow_head_drive, allow_tail, allow_snub, allow_bend, allow_takeup, dirty_side_ok,
  max_shaft_rpm, max_belt_speed_fpm, max_tension_pli,
  is_preferred, is_active, notes, tags
) VALUES
  -- 1) Standard 4" drum (preferred)
  (
    'STD_DRUM_4_STEEL',
    'Standard 4" Steel Drum',
    'Generic',
    NULL,
    4.0, 24.0, 6.0, 0.0625,
    'DRUM', 'steel',
    FALSE, NULL, NULL,
    'THROUGH_SHAFT_EXTERNAL_BEARINGS', 'KEYED',
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
    NULL, 800, NULL,
    TRUE, TRUE,
    'Standard duty drum pulley. B105.1 compliant up to 800 fpm.',
    ARRAY['standard', 'drum', '4-inch']
  ),
  -- 2) Lagged 4" drum (rubber)
  (
    'LAGGED_DRUM_4_RUBBER',
    '4" Lagged Drum (Rubber)',
    'Generic',
    NULL,
    4.0, 24.0, 6.0, 0.0625,
    'DRUM', 'steel',
    TRUE, 'rubber', 0.25,
    'THROUGH_SHAFT_EXTERNAL_BEARINGS', 'KEYED',
    TRUE, TRUE, FALSE, FALSE, FALSE, TRUE,
    NULL, 800, NULL,
    FALSE, TRUE,
    'Lagged for increased traction. Effective diameter 4.5" with lagging.',
    ARRAY['lagged', 'drum', '4-inch', 'rubber']
  ),
  -- 3) Wing tail pulley
  (
    'WING_TAIL_4',
    '4" Wing Tail Pulley',
    'Generic',
    NULL,
    4.0, 18.0, 6.0, 0.0,
    'WING', 'steel',
    FALSE, NULL, NULL,
    'THROUGH_SHAFT_EXTERNAL_BEARINGS', 'SET_SCREW',
    FALSE, TRUE, FALSE, FALSE, FALSE, TRUE,
    NULL, 600, NULL,
    FALSE, TRUE,
    'Self-cleaning wing design. Ideal for sticky/wet materials. Tail only.',
    ARRAY['wing', 'self-cleaning', 'tail', '4-inch']
  ),
  -- 4) Internal bearing tail pulley (TAIL ONLY per constraint)
  (
    'INTERNAL_BEARING_TAIL_4',
    '4" Internal Bearing Tail Pulley',
    'Generic',
    NULL,
    4.0, 18.0, 6.0, 0.0625,
    'DRUM', 'steel',
    FALSE, NULL, NULL,
    'INTERNAL_BEARINGS', 'SET_SCREW',
    FALSE, TRUE, FALSE, FALSE, FALSE, TRUE,
    500, 500, 50,
    FALSE, TRUE,
    'Self-contained bearings. TAIL ONLY. Lower speed/tension limits.',
    ARRAY['internal-bearing', 'tail-only', '4-inch']
  ),
  -- 5) Standard 6" drum (preferred, heavy duty)
  (
    'STD_DRUM_6_STEEL',
    'Standard 6" Steel Drum',
    'Generic',
    NULL,
    6.0, 36.0, 8.0, 0.0625,
    'DRUM', 'steel',
    FALSE, NULL, NULL,
    'THROUGH_SHAFT_EXTERNAL_BEARINGS', 'TAPER_LOCK',
    TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
    NULL, 800, NULL,
    TRUE, TRUE,
    'Heavy-duty 6" drum. Taper lock for secure shaft connection.',
    ARRAY['standard', 'drum', '6-inch', 'heavy-duty']
  )
ON CONFLICT (catalog_key) DO NOTHING;

-- =============================================================================
-- 9) COMMENTS
-- =============================================================================

COMMENT ON TABLE public.pulley_catalog IS 'Catalog of available conveyor pulleys with specifications and station compatibility';
COMMENT ON COLUMN public.pulley_catalog.shaft_arrangement IS 'How pulley interfaces with shaft. INTERNAL_BEARINGS is tail-only.';
COMMENT ON COLUMN public.pulley_catalog.hub_connection IS 'How pulley hub attaches to shaft.';
COMMENT ON COLUMN public.pulley_catalog.face_width_max_in IS 'Maximum face width this pulley supports. Recipe face_width must be <= this.';
COMMENT ON COLUMN public.pulley_catalog.max_belt_speed_fpm IS 'B105.1 speed limit. Standard drum typically 800 fpm max.';
COMMENT ON CONSTRAINT chk_internal_bearings_tail_only ON public.pulley_catalog IS 'Internal bearing pulleys can only be used at tail position';
