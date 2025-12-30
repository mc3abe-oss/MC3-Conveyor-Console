-- ============================================================================
-- Migration: V-Guides Catalog
-- Version: v1.22
-- ============================================================================

-- Create v_guides table for admin-managed V-Guide catalog
CREATE TABLE IF NOT EXISTS v_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,                      -- Canonical key: "O", "A", "B", "C"
  eu_code TEXT NOT NULL,                         -- EU designation: "O", "A", "B", "C"
  na_code TEXT NOT NULL,                         -- NA equivalent: "K10", "K13", "K17", "K22"
  label TEXT NOT NULL,                           -- Display label: "O (K10)"
  min_pulley_dia_solid_in NUMERIC(5,2) NOT NULL, -- Min pulley diameter for solid belt (inches)
  min_pulley_dia_notched_in NUMERIC(5,2) NOT NULL, -- Min pulley diameter for notched belt (inches)
  notes TEXT,                                    -- Optional notes
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active items ordered by sort_order
CREATE INDEX IF NOT EXISTS idx_v_guides_active_sort
  ON v_guides(is_active, sort_order);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_v_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS v_guides_updated_at ON v_guides;
CREATE TRIGGER v_guides_updated_at
  BEFORE UPDATE ON v_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_v_guides_updated_at();

-- Seed data: 4 standard V-Guide profiles (EU-first designation)
-- Source: Belt Service guide - minimum pulley diameters (solid/notched)
INSERT INTO v_guides (key, eu_code, na_code, label, min_pulley_dia_solid_in, min_pulley_dia_notched_in, sort_order)
VALUES
  ('O', 'O', 'K10', 'O (K10)', 2.5, 2.0, 10),
  ('A', 'A', 'K13', 'A (K13)', 3.0, 2.5, 20),
  ('B', 'B', 'K17', 'B (K17)', 5.0, 3.0, 30),
  ('C', 'C', 'K22', 'C (K22)', 6.0, 4.0, 40)
ON CONFLICT (key) DO NOTHING;

-- Add comments for clarity
COMMENT ON TABLE v_guides IS 'Admin-managed V-Guide profiles with minimum pulley diameter constraints';
COMMENT ON COLUMN v_guides.key IS 'Canonical key (EU letter): O, A, B, C. Stable identifier for saved configs.';
COMMENT ON COLUMN v_guides.eu_code IS 'EU designation (single letter)';
COMMENT ON COLUMN v_guides.na_code IS 'NA equivalent code (K10, K13, K17, K22)';
COMMENT ON COLUMN v_guides.min_pulley_dia_solid_in IS 'Minimum pulley diameter for solid belt (inches)';
COMMENT ON COLUMN v_guides.min_pulley_dia_notched_in IS 'Minimum pulley diameter for notched belt (inches)';
