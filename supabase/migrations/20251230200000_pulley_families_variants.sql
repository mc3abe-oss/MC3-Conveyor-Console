-- ============================================================================
-- PULLEY FAMILIES & VARIANTS - Database Schema
-- ============================================================================
-- This migration introduces a new "families + variants" model for pulleys.
-- Families define the shell/construction, variants define bore/hub/lagging options.
-- The old pulley_catalog table remains for backward compatibility but will be
-- deprecated once migration is complete.
-- ============================================================================

-- =============================================================================
-- 1) PULLEY FAMILIES TABLE
-- =============================================================================

CREATE TABLE public.pulley_families (
  -- Primary key
  pulley_family_key TEXT PRIMARY KEY,

  -- Manufacturer info
  manufacturer TEXT NOT NULL,

  -- Style and construction
  style TEXT NOT NULL,                       -- 'Flat Face', 'Crowned', etc.
  material TEXT NOT NULL DEFAULT 'Mild steel',
  shell_od_in NUMERIC NOT NULL,              -- Shell outer diameter (inches)
  face_width_in NUMERIC NOT NULL,            -- Face width (inches)
  shell_wall_in NUMERIC,                     -- Shell wall thickness (inches), nullable

  -- Crown specifications
  is_crowned BOOLEAN NOT NULL DEFAULT FALSE,
  crown_type TEXT,                           -- e.g., 'Standard', 'Trapezoidal', nullable

  -- V-groove specifications (for V-guided belts)
  v_groove_section TEXT,                     -- K10, K17, etc.
  v_groove_top_width_in NUMERIC,
  v_groove_bottom_width_in NUMERIC,
  v_groove_depth_in NUMERIC,

  -- Versioning and audit
  version INT NOT NULL DEFAULT 1,
  source TEXT,                               -- Data source reference
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2) PULLEY VARIANTS TABLE
-- =============================================================================

CREATE TABLE public.pulley_variants (
  -- Primary key
  pulley_variant_key TEXT PRIMARY KEY,

  -- Foreign key to family
  pulley_family_key TEXT NOT NULL REFERENCES public.pulley_families(pulley_family_key),

  -- Bore and hub
  bore_in NUMERIC,                           -- Bore diameter (inches), nullable
  hub_style TEXT,                            -- e.g., 'XTH25 integral hubs + XTB25 bushing'
  bearing_type TEXT,                         -- 'bushing', 'Timken', 'ER style', etc.

  -- Lagging specifications
  lagging_type TEXT,                         -- 'none', 'SBR', 'Urethane', etc.
  lagging_thickness_in NUMERIC,
  lagging_durometer_shore_a NUMERIC,

  -- Finished diameter (if lagged or machined)
  finished_od_in NUMERIC,                    -- If null, use family shell_od_in

  -- Quality specifications
  runout_max_in NUMERIC,
  paint_spec TEXT,

  -- Versioning and audit
  version INT NOT NULL DEFAULT 1,
  source TEXT,                               -- Data source reference
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3) INDEXES
-- =============================================================================

-- Family indexes
CREATE INDEX idx_pulley_families_active ON public.pulley_families(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pulley_families_manufacturer ON public.pulley_families(manufacturer);
CREATE INDEX idx_pulley_families_style ON public.pulley_families(style);
CREATE INDEX idx_pulley_families_shell_od ON public.pulley_families(shell_od_in);

-- Variant indexes
CREATE INDEX idx_pulley_variants_family ON public.pulley_variants(pulley_family_key);
CREATE INDEX idx_pulley_variants_active ON public.pulley_variants(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pulley_variants_bearing_type ON public.pulley_variants(bearing_type);
CREATE INDEX idx_pulley_variants_lagging_type ON public.pulley_variants(lagging_type);

-- =============================================================================
-- 4) CONSTRAINTS
-- =============================================================================

-- Positive dimensions for families
ALTER TABLE public.pulley_families ADD CONSTRAINT chk_family_shell_od_positive
  CHECK (shell_od_in > 0);
ALTER TABLE public.pulley_families ADD CONSTRAINT chk_family_face_width_positive
  CHECK (face_width_in > 0);
ALTER TABLE public.pulley_families ADD CONSTRAINT chk_family_shell_wall_non_negative
  CHECK (shell_wall_in IS NULL OR shell_wall_in >= 0);

-- Positive dimensions for variants
ALTER TABLE public.pulley_variants ADD CONSTRAINT chk_variant_bore_positive
  CHECK (bore_in IS NULL OR bore_in > 0);
ALTER TABLE public.pulley_variants ADD CONSTRAINT chk_variant_lagging_thickness_non_negative
  CHECK (lagging_thickness_in IS NULL OR lagging_thickness_in >= 0);
ALTER TABLE public.pulley_variants ADD CONSTRAINT chk_variant_finished_od_positive
  CHECK (finished_od_in IS NULL OR finished_od_in > 0);
ALTER TABLE public.pulley_variants ADD CONSTRAINT chk_variant_durometer_range
  CHECK (lagging_durometer_shore_a IS NULL OR (lagging_durometer_shore_a >= 0 AND lagging_durometer_shore_a <= 100));

-- =============================================================================
-- 5) TRIGGERS
-- =============================================================================

-- Auto-update updated_at for families
CREATE OR REPLACE FUNCTION public.set_pulley_family_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pulley_families_updated_at
  BEFORE UPDATE ON public.pulley_families
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pulley_family_updated_at();

-- Auto-update updated_at for variants
CREATE OR REPLACE FUNCTION public.set_pulley_variant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pulley_variants_updated_at
  BEFORE UPDATE ON public.pulley_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pulley_variant_updated_at();

-- =============================================================================
-- 6) ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.pulley_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulley_variants ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users (active only)
CREATE POLICY "read_active_pulley_families"
  ON public.pulley_families
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "read_active_pulley_variants"
  ON public.pulley_variants
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Read access for anonymous (public catalog)
CREATE POLICY "anon_read_active_pulley_families"
  ON public.pulley_families
  FOR SELECT
  TO anon
  USING (is_active = TRUE);

CREATE POLICY "anon_read_active_pulley_variants"
  ON public.pulley_variants
  FOR SELECT
  TO anon
  USING (is_active = TRUE);

-- =============================================================================
-- 7) COMMENTS
-- =============================================================================

COMMENT ON TABLE public.pulley_families IS 'Pulley family definitions with shell/construction specs. Each family can have multiple variants.';
COMMENT ON TABLE public.pulley_variants IS 'Pulley variant configurations with bore/hub/lagging specs. References a pulley family.';
COMMENT ON COLUMN public.pulley_families.shell_od_in IS 'Shell outer diameter before lagging (inches).';
COMMENT ON COLUMN public.pulley_variants.finished_od_in IS 'Final outer diameter after lagging (inches). If null, use family shell_od_in.';
COMMENT ON COLUMN public.pulley_variants.pulley_family_key IS 'FK to pulley_families. Variant inherits shell specs from family.';
