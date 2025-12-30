-- ============================================================================
-- Migration: Cleats Catalog v1.23
-- Date: 2025-12-30
-- Description: Admin-driven cleat catalog with minimum pulley diameter constraints
-- ============================================================================

-- =============================================================================
-- TABLE 1: cleat_catalog
-- Stores cleat profile configurations with minimum pulley diameter requirements
-- =============================================================================

CREATE TABLE IF NOT EXISTS cleat_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Material family (lookup key)
  material_family TEXT NOT NULL DEFAULT 'PVC_HOT_WELDED',

  -- Cleat specification (composite key with material_family)
  cleat_profile TEXT NOT NULL,     -- e.g., 'T-Cleat', 'Straight', 'Scalloped'
  cleat_size TEXT NOT NULL,        -- e.g., '0.5"', '1"', '1.5"', '2"'
  cleat_pattern TEXT NOT NULL,     -- STRAIGHT_CROSS, CURVED_90, CURVED_120, CURVED_150

  -- Minimum pulley diameter requirements
  min_pulley_dia_12in_solid_in NUMERIC(5,2) NOT NULL,        -- Required: at 12" centers, solid style
  min_pulley_dia_12in_drill_siped_in NUMERIC(5,2),           -- Nullable: at 12" centers, drill & siped

  -- Metadata
  notes TEXT,
  source_doc TEXT,                  -- e.g., 'PVC Hot Welded Spec Rev 3.2'
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint for lookup
  CONSTRAINT cleat_catalog_unique_key
    UNIQUE (material_family, cleat_profile, cleat_size, cleat_pattern)
);

-- Index for active lookups
CREATE INDEX IF NOT EXISTS idx_cleat_catalog_active_lookup
  ON cleat_catalog(material_family, cleat_profile, cleat_size, cleat_pattern)
  WHERE is_active = true;

-- Index for admin list ordering
CREATE INDEX IF NOT EXISTS idx_cleat_catalog_sort
  ON cleat_catalog(is_active, sort_order, cleat_profile, cleat_size);

-- =============================================================================
-- TABLE 2: cleat_center_factors
-- Stores center-to-center spacing multiplier factors
-- =============================================================================

CREATE TABLE IF NOT EXISTS cleat_center_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  material_family TEXT NOT NULL DEFAULT 'PVC_HOT_WELDED',
  centers_in INTEGER NOT NULL,     -- 12, 8, 6, 4
  factor NUMERIC(4,2) NOT NULL,    -- 1.0, 1.15, 1.25, 1.35

  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cleat_center_factors_unique_key
    UNIQUE (material_family, centers_in)
);

-- =============================================================================
-- TRIGGERS: Auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_cleat_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleat_catalog_updated_at ON cleat_catalog;
CREATE TRIGGER cleat_catalog_updated_at
  BEFORE UPDATE ON cleat_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_cleat_tables_updated_at();

DROP TRIGGER IF EXISTS cleat_center_factors_updated_at ON cleat_center_factors;
CREATE TRIGGER cleat_center_factors_updated_at
  BEFORE UPDATE ON cleat_center_factors
  FOR EACH ROW
  EXECUTE FUNCTION update_cleat_tables_updated_at();

-- =============================================================================
-- SEED DATA: cleat_center_factors (replacing hardcoded CLEAT_SPACING_MULTIPLIERS)
-- =============================================================================

INSERT INTO cleat_center_factors (material_family, centers_in, factor, notes)
VALUES
  ('PVC_HOT_WELDED', 12, 1.00, 'Standard 12" spacing - no increase'),
  ('PVC_HOT_WELDED', 8, 1.15, '8" spacing - 15% increase'),
  ('PVC_HOT_WELDED', 6, 1.25, '6" spacing - 25% increase'),
  ('PVC_HOT_WELDED', 4, 1.35, '4" spacing - 35% increase')
ON CONFLICT (material_family, centers_in) DO NOTHING;

-- =============================================================================
-- SEED DATA: cleat_catalog (sample entries from PVC Hot Welded guide)
-- One row per pattern minimum so tests can run
-- =============================================================================

INSERT INTO cleat_catalog (material_family, cleat_profile, cleat_size, cleat_pattern,
                           min_pulley_dia_12in_solid_in, min_pulley_dia_12in_drill_siped_in,
                           notes, source_doc, sort_order)
VALUES
  -- T-Cleat profile - STRAIGHT_CROSS pattern
  ('PVC_HOT_WELDED', 'T-Cleat', '0.5"', 'STRAIGHT_CROSS', 3.0, 2.5, 'Small T-cleat', 'PVC Hot Welded Guide', 10),
  ('PVC_HOT_WELDED', 'T-Cleat', '1"', 'STRAIGHT_CROSS', 4.0, 3.0, 'Standard T-cleat', 'PVC Hot Welded Guide', 20),
  ('PVC_HOT_WELDED', 'T-Cleat', '1.5"', 'STRAIGHT_CROSS', 5.0, 4.0, 'Medium T-cleat', 'PVC Hot Welded Guide', 30),
  ('PVC_HOT_WELDED', 'T-Cleat', '2"', 'STRAIGHT_CROSS', 6.0, 5.0, 'Large T-cleat', 'PVC Hot Welded Guide', 40),
  ('PVC_HOT_WELDED', 'T-Cleat', '3"', 'STRAIGHT_CROSS', 8.0, NULL, 'Extra large T-cleat (no D&S)', 'PVC Hot Welded Guide', 50),

  -- T-Cleat profile - CURVED_90 pattern
  ('PVC_HOT_WELDED', 'T-Cleat', '0.5"', 'CURVED_90', 3.5, 3.0, '90 degree curved - small', 'PVC Hot Welded Guide', 60),
  ('PVC_HOT_WELDED', 'T-Cleat', '1"', 'CURVED_90', 4.5, 3.5, '90 degree curved - standard', 'PVC Hot Welded Guide', 70),
  ('PVC_HOT_WELDED', 'T-Cleat', '1.5"', 'CURVED_90', 5.5, 4.5, '90 degree curved - medium', 'PVC Hot Welded Guide', 80),
  ('PVC_HOT_WELDED', 'T-Cleat', '2"', 'CURVED_90', 7.0, 6.0, '90 degree curved - large', 'PVC Hot Welded Guide', 90),

  -- T-Cleat profile - CURVED_120 pattern
  ('PVC_HOT_WELDED', 'T-Cleat', '0.5"', 'CURVED_120', 4.0, 3.5, '120 degree curved - small', 'PVC Hot Welded Guide', 100),
  ('PVC_HOT_WELDED', 'T-Cleat', '1"', 'CURVED_120', 5.0, 4.0, '120 degree curved - standard', 'PVC Hot Welded Guide', 110),
  ('PVC_HOT_WELDED', 'T-Cleat', '1.5"', 'CURVED_120', 6.0, 5.0, '120 degree curved - medium', 'PVC Hot Welded Guide', 120),
  ('PVC_HOT_WELDED', 'T-Cleat', '2"', 'CURVED_120', 8.0, NULL, '120 degree curved - large (no D&S)', 'PVC Hot Welded Guide', 130),

  -- T-Cleat profile - CURVED_150 pattern
  ('PVC_HOT_WELDED', 'T-Cleat', '0.5"', 'CURVED_150', 4.5, 4.0, '150 degree curved - small', 'PVC Hot Welded Guide', 140),
  ('PVC_HOT_WELDED', 'T-Cleat', '1"', 'CURVED_150', 5.5, 4.5, '150 degree curved - standard', 'PVC Hot Welded Guide', 150),
  ('PVC_HOT_WELDED', 'T-Cleat', '1.5"', 'CURVED_150', 7.0, NULL, '150 degree curved - medium (no D&S)', 'PVC Hot Welded Guide', 160),
  ('PVC_HOT_WELDED', 'T-Cleat', '2"', 'CURVED_150', 9.0, NULL, '150 degree curved - large (no D&S)', 'PVC Hot Welded Guide', 170),

  -- Straight profile samples
  ('PVC_HOT_WELDED', 'Straight', '1"', 'STRAIGHT_CROSS', 4.0, 3.0, 'Straight cleat', 'PVC Hot Welded Guide', 200),
  ('PVC_HOT_WELDED', 'Straight', '2"', 'STRAIGHT_CROSS', 6.0, 5.0, 'Straight cleat - large', 'PVC Hot Welded Guide', 210),

  -- Scalloped profile samples
  ('PVC_HOT_WELDED', 'Scalloped', '1"', 'STRAIGHT_CROSS', 3.5, 3.0, 'Scalloped cleat', 'PVC Hot Welded Guide', 300),
  ('PVC_HOT_WELDED', 'Scalloped', '2"', 'STRAIGHT_CROSS', 5.5, 4.5, 'Scalloped cleat - large', 'PVC Hot Welded Guide', 310)
ON CONFLICT (material_family, cleat_profile, cleat_size, cleat_pattern) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE cleat_catalog IS 'Admin-managed cleat catalog with minimum pulley diameter requirements (v1.23)';
COMMENT ON COLUMN cleat_catalog.material_family IS 'Material family key (e.g., PVC_HOT_WELDED)';
COMMENT ON COLUMN cleat_catalog.cleat_profile IS 'Cleat profile type (e.g., T-Cleat, Straight, Scalloped)';
COMMENT ON COLUMN cleat_catalog.cleat_size IS 'Cleat height/size (e.g., 0.5", 1", 1.5", 2", 3")';
COMMENT ON COLUMN cleat_catalog.cleat_pattern IS 'Cleat pattern (STRAIGHT_CROSS, CURVED_90, CURVED_120, CURVED_150)';
COMMENT ON COLUMN cleat_catalog.min_pulley_dia_12in_solid_in IS 'Min pulley diameter at 12" centers for SOLID style';
COMMENT ON COLUMN cleat_catalog.min_pulley_dia_12in_drill_siped_in IS 'Min pulley diameter at 12" centers for DRILL_SIPED_1IN style (NULL if not supported)';

COMMENT ON TABLE cleat_center_factors IS 'Center-to-center spacing multiplier factors (v1.23)';
COMMENT ON COLUMN cleat_center_factors.centers_in IS 'Center-to-center spacing in inches (4, 6, 8, 12)';
COMMENT ON COLUMN cleat_center_factors.factor IS 'Multiplier applied to base min pulley diameter';
