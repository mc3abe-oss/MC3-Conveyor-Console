-- ============================================================================
-- MAGNET BAR CONFIGURATION TABLES
-- Migration: 20260131000000_magnet_bar_tables.sql
--
-- Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
--
-- This migration creates the 5-layer schema for magnet bar configuration:
--   Layer 0: conveyor_magnet_families (membership rules)
--   Layer 1: magnet_catalog (individual magnets)
--   Layer 2: bar_templates + bar_template_slots (bar configuration)
--   Layer 3: bar_patterns (how bars repeat)
--   Layer 4: magnet_layouts (applied to conveyor)
-- ============================================================================

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Magnet material type enum
CREATE TYPE magnet_material_type AS ENUM ('ceramic', 'neo');

-- Magnet grade enum
CREATE TYPE magnet_grade AS ENUM ('5', '8', '35', '50');

-- Bar pattern mode enum
CREATE TYPE bar_pattern_mode AS ENUM ('all_same', 'alternating', 'interval');

-- ============================================================================
-- LAYER 0: CONVEYOR MAGNET FAMILIES
-- ============================================================================

CREATE TABLE conveyor_magnet_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Cross-section constraints (membership rules)
  cross_section_key TEXT NOT NULL,        -- e.g., "1.00x1.38"
  magnet_width_in NUMERIC(6,3) NOT NULL,  -- e.g., 1.00
  magnet_height_in NUMERIC(6,3) NOT NULL, -- e.g., 1.38

  -- Allowed magnet lengths for this family
  allowed_lengths_in NUMERIC(6,3)[] NOT NULL DEFAULT '{}',  -- e.g., ARRAY[2.5, 3.5]

  -- Physical constraints
  max_magnets_per_bar INTEGER NOT NULL DEFAULT 20,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookup by slug
CREATE INDEX idx_conveyor_magnet_families_slug ON conveyor_magnet_families(slug);

-- Trigger to update updated_at
CREATE TRIGGER trg_conveyor_magnet_families_updated_at
  BEFORE UPDATE ON conveyor_magnet_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE conveyor_magnet_families IS 'Layer 0: Defines which magnets are allowed for a given conveyor type/size';

-- ============================================================================
-- LAYER 1: MAGNET CATALOG
-- ============================================================================

CREATE TABLE magnet_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  part_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Cross-section (for grouping magnets that can be mixed)
  cross_section_key TEXT NOT NULL,  -- e.g., "1.00x1.38"

  -- Type and grade
  material_type magnet_material_type NOT NULL,
  grade magnet_grade NOT NULL,

  -- Dimensions (all in inches)
  length_in NUMERIC(6,3) NOT NULL,  -- variable dimension (along bar)
  width_in NUMERIC(6,3) NOT NULL,   -- fixed (narrow dimension)
  height_in NUMERIC(6,3) NOT NULL,  -- fixed (thick dimension)

  -- Physical properties
  weight_lb NUMERIC(8,4) NOT NULL,

  -- Magnetic properties
  hold_force_proxy_lb NUMERIC(8,4) NOT NULL,  -- theoretical capacity
  efficiency_factor NUMERIC(4,3) NOT NULL DEFAULT 0.8,  -- typically 0.8

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookup by cross-section
CREATE INDEX idx_magnet_catalog_cross_section ON magnet_catalog(cross_section_key);

-- Index for lookup by material type
CREATE INDEX idx_magnet_catalog_material_type ON magnet_catalog(material_type);

-- Index for active magnets
CREATE INDEX idx_magnet_catalog_active ON magnet_catalog(is_active) WHERE is_active = true;

-- Trigger to update updated_at
CREATE TRIGGER trg_magnet_catalog_updated_at
  BEFORE UPDATE ON magnet_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE magnet_catalog IS 'Layer 1: Individual magnets with full specifications';

-- ============================================================================
-- LAYER 2: BAR TEMPLATES
-- ============================================================================

CREATE TABLE bar_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  description TEXT,

  -- Family (membership rules)
  family_id UUID NOT NULL REFERENCES conveyor_magnet_families(id),

  -- Bar configuration
  target_oal_in NUMERIC(6,3) NOT NULL,       -- what we're trying to fill (bar width)
  gap_in NUMERIC(6,3) NOT NULL DEFAULT 0.25, -- gap between magnets
  end_clearance_in NUMERIC(6,3) NOT NULL DEFAULT 0, -- margin at ends
  leftover_tolerance_in NUMERIC(6,3) NOT NULL DEFAULT 0.25, -- max unfilled space

  -- Type flags
  is_sweeper BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookup by family
CREATE INDEX idx_bar_templates_family ON bar_templates(family_id);

-- Index for active templates
CREATE INDEX idx_bar_templates_active ON bar_templates(is_active) WHERE is_active = true;

-- Index for lookup by OAL
CREATE INDEX idx_bar_templates_oal ON bar_templates(target_oal_in);

-- Trigger to update updated_at
CREATE TRIGGER trg_bar_templates_updated_at
  BEFORE UPDATE ON bar_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bar_templates IS 'Layer 2: Bar configurations defined by filling OAL with magnets + gaps';

-- ============================================================================
-- LAYER 2: BAR TEMPLATE SLOTS (Junction Table)
-- ============================================================================

CREATE TABLE bar_template_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  bar_template_id UUID NOT NULL REFERENCES bar_templates(id) ON DELETE CASCADE,
  magnet_id UUID NOT NULL REFERENCES magnet_catalog(id),

  -- Position
  position_in NUMERIC(6,3) NOT NULL,  -- position along bar (from left/start)
  slot_index INTEGER NOT NULL,         -- sort order (0-indexed)

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE (bar_template_id, slot_index)
);

-- Index for lookup by template
CREATE INDEX idx_bar_template_slots_template ON bar_template_slots(bar_template_id);

-- Index for lookup by magnet
CREATE INDEX idx_bar_template_slots_magnet ON bar_template_slots(magnet_id);

COMMENT ON TABLE bar_template_slots IS 'Junction table: magnets positioned within a bar template';

-- ============================================================================
-- LAYER 3: BAR PATTERNS
-- ============================================================================

CREATE TABLE bar_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  description TEXT,

  -- Pattern configuration
  mode bar_pattern_mode NOT NULL DEFAULT 'all_same',
  primary_template_id UUID NOT NULL REFERENCES bar_templates(id),
  secondary_template_id UUID REFERENCES bar_templates(id),  -- nullable
  secondary_every_n INTEGER,  -- for interval mode

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_secondary_required_for_alternating
    CHECK (mode = 'all_same' OR secondary_template_id IS NOT NULL),
  CONSTRAINT chk_secondary_every_n_required_for_interval
    CHECK (mode != 'interval' OR secondary_every_n IS NOT NULL),
  CONSTRAINT chk_secondary_every_n_positive
    CHECK (secondary_every_n IS NULL OR secondary_every_n > 1)
);

-- Index for active patterns
CREATE INDEX idx_bar_patterns_active ON bar_patterns(is_active) WHERE is_active = true;

-- Index for lookup by primary template
CREATE INDEX idx_bar_patterns_primary_template ON bar_patterns(primary_template_id);

-- Trigger to update updated_at
CREATE TRIGGER trg_bar_patterns_updated_at
  BEFORE UPDATE ON bar_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bar_patterns IS 'Layer 3: How bars repeat along the chain (all-same, alternating, interval)';

-- ============================================================================
-- LAYER 4: MAGNET LAYOUTS
-- ============================================================================

CREATE TABLE magnet_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL,
  description TEXT,

  -- Configuration
  pattern_id UUID NOT NULL REFERENCES bar_patterns(id),
  center_spacing_in NUMERIC(6,3) NOT NULL,  -- 12, 18, 24, 36
  chain_length_ft NUMERIC(8,3),  -- optional, for calculating bar count

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_center_spacing_valid
    CHECK (center_spacing_in IN (12, 18, 24, 36))
);

-- Index for active layouts
CREATE INDEX idx_magnet_layouts_active ON magnet_layouts(is_active) WHERE is_active = true;

-- Index for lookup by pattern
CREATE INDEX idx_magnet_layouts_pattern ON magnet_layouts(pattern_id);

-- Trigger to update updated_at
CREATE TRIGGER trg_magnet_layouts_updated_at
  BEFORE UPDATE ON magnet_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE magnet_layouts IS 'Layer 4: Applied to a specific conveyor with center spacing and bar count';

-- ============================================================================
-- VIEWS: Computed Values
-- ============================================================================

-- View: Bar template with computed values
CREATE VIEW bar_templates_computed AS
SELECT
  bt.id,
  bt.name,
  bt.target_oal_in,
  bt.gap_in,
  bt.end_clearance_in,
  bt.leftover_tolerance_in,
  bt.is_sweeper,
  bt.is_active,
  -- Computed: magnet count
  COALESCE(slot_counts.magnet_count, 0) AS magnet_count,
  -- Computed: achieved OAL
  COALESCE(slot_counts.achieved_oal_in, 0) AS achieved_oal_in,
  -- Computed: leftover
  bt.target_oal_in - COALESCE(slot_counts.achieved_oal_in, 0) AS leftover_in,
  -- Computed: is valid
  (bt.target_oal_in - COALESCE(slot_counts.achieved_oal_in, 0)) <= bt.leftover_tolerance_in AS is_valid,
  -- Computed: total hold force
  COALESCE(slot_counts.total_hold_force_lb, 0) AS bar_hold_force_lb,
  -- Computed: total weight
  COALESCE(slot_counts.total_weight_lb, 0) AS bar_weight_lb
FROM bar_templates bt
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS magnet_count,
    -- Sum of magnet lengths + gaps between them + end clearances
    SUM(mc.length_in) +
      (GREATEST(COUNT(*) - 1, 0) * bt.gap_in) +
      (bt.end_clearance_in * 2) AS achieved_oal_in,
    SUM(mc.hold_force_proxy_lb * mc.efficiency_factor) AS total_hold_force_lb,
    SUM(mc.weight_lb) AS total_weight_lb
  FROM bar_template_slots bts
  JOIN magnet_catalog mc ON mc.id = bts.magnet_id
  WHERE bts.bar_template_id = bt.id
) slot_counts ON true;

COMMENT ON VIEW bar_templates_computed IS 'Bar templates with computed magnet count, achieved OAL, hold force, etc.';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE conveyor_magnet_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE magnet_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE magnet_layouts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all records
CREATE POLICY "Allow authenticated read on conveyor_magnet_families"
  ON conveyor_magnet_families FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on magnet_catalog"
  ON magnet_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on bar_templates"
  ON bar_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on bar_template_slots"
  ON bar_template_slots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on bar_patterns"
  ON bar_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on magnet_layouts"
  ON magnet_layouts FOR SELECT
  TO authenticated
  USING (true);

-- Admin policies for write operations would be added based on RBAC requirements
-- For now, service role can do everything (which is the default)

-- ============================================================================
-- SEED DATA: Conveyor Magnet Families
-- ============================================================================

INSERT INTO conveyor_magnet_families (
  name,
  slug,
  description,
  cross_section_key,
  magnet_width_in,
  magnet_height_in,
  allowed_lengths_in,
  max_magnets_per_bar
) VALUES
(
  'Standard Conveyor',
  'standard',
  'Standard conveyor family using C2040 chain. Uses 1" x 1.38" cross-section magnets with 2.5" or 3.5" lengths.',
  '1.00x1.38',
  1.0,
  1.38,
  ARRAY[2.5, 3.5]::NUMERIC(6,3)[],
  12
),
(
  'Heavy Duty Conveyor',
  'heavy_duty',
  'Heavy duty conveyor family using C2060H chain. Uses 1" x 2" cross-section Neo magnets.',
  '1.00x2.00',
  1.0,
  2.0,
  ARRAY[1.375, 2.0]::NUMERIC(6,3)[],
  16
);

-- ============================================================================
-- SEED DATA: Magnet Catalog
-- Values calibrated to match reference lookup tables (Phase 1)
-- ============================================================================

INSERT INTO magnet_catalog (
  part_number,
  name,
  description,
  cross_section_key,
  material_type,
  grade,
  length_in,
  width_in,
  height_in,
  weight_lb,
  hold_force_proxy_lb,
  efficiency_factor,
  is_active
) VALUES
-- Ceramic 5 - 3.5" (standard primary magnet)
(
  'MAG050100013753500',
  'Ceramic 5 - 3.5" Standard',
  'Standard ceramic grade 5 magnet, 3.5" length. Primary magnet for standard bars.',
  '1.00x1.38',
  'ceramic',
  '5',
  3.5,
  1.0,
  1.38,
  0.5,
  0.1207,  -- Calibrated: 0.362 / 3 magnets on 12" bar
  1.0,
  true
),
-- Ceramic 5 - 2.5" (sweeper magnet)
(
  'MAG050100013752500',
  'Ceramic 5 - 2.5" Sweeper',
  'Sweeper ceramic grade 5 magnet, 2.5" length. Used for sweeper bars.',
  '1.00x1.38',
  'ceramic',
  '5',
  2.5,
  1.0,
  1.38,
  0.35,
  0.08,  -- From reference: 0.10 x 0.8
  1.0,
  true
),
-- Neo 35 - 1.375" (heavy duty)
(
  'MAGRARE0100200138',
  'Neo 35 - 1.375"',
  'Neodymium grade 35 magnet, 1.375" length. High-strength magnet for heavy duty applications.',
  '1.00x2.00',
  'neo',
  '35',
  1.375,
  1.0,
  2.0,
  0.3,
  0.298,  -- From reference doc
  1.0,
  true
),
-- Neo 50 - 1.375" (heavy duty, highest strength)
(
  'MAGRARE0100200138N50',
  'Neo 50 - 1.375"',
  'Neodymium grade 50 magnet, 1.375" length. Highest-strength magnet for demanding applications.',
  '1.00x2.00',
  'neo',
  '50',
  1.375,
  1.0,
  2.0,
  0.3,
  0.298,  -- Same as Neo 35 per reference
  1.0,
  true
),
-- Neo 35 - 2" (for mixing with ceramic on standard bars)
(
  'MAGRARE0100200200',
  'Neo 35 - 2"',
  'Neodymium grade 35 magnet, 2" length. Used for boost configurations on standard bars.',
  '1.00x1.38',
  'neo',
  '35',
  2.0,
  1.0,
  1.38,
  0.25,
  0.298,  -- Back-calculated from lookup tables
  1.0,
  true
);

-- ============================================================================
-- SEED DATA: Admin Page Entry
-- Registers the Magnets admin page in the admin hub
-- ============================================================================

INSERT INTO admin_pages (
  name,
  slug,
  href,
  category,
  sort_order,
  is_active
) VALUES (
  'Magnets',
  'magnets',
  '/console/admin/catalog/magnets',
  'catalog',
  50,  -- After existing catalog pages
  true
);

-- Link magnets page to magnetic-conveyor product family (if exists)
INSERT INTO admin_page_product_families (admin_page_id, product_family_id)
SELECT
  ap.id,
  pf.id
FROM admin_pages ap
CROSS JOIN product_families pf
WHERE ap.slug = 'magnets'
  AND pf.slug = 'magnetic-conveyor'
ON CONFLICT DO NOTHING;
