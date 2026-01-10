-- ============================================================================
-- Powder Color Options Table
-- ============================================================================
--
-- Admin-managed table for powder coat color selections.
-- Supports smart dropdown behavior with stock/non-stock flagging.
-- Used for both conveyor finish and guarding finish selections.
-- ============================================================================

-- Create the powder_colors table
CREATE TABLE IF NOT EXISTS public.powder_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('conveyor', 'guarding', 'both')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_stock BOOLEAN NOT NULL DEFAULT false,
  is_default_conveyor BOOLEAN NOT NULL DEFAULT false,
  is_default_guarding BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: code must be unique
  UNIQUE (code)
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_powder_colors_lookup
  ON public.powder_colors (scope, is_active, sort_order);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_powder_colors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS powder_colors_updated_at ON public.powder_colors;
CREATE TRIGGER powder_colors_updated_at
  BEFORE UPDATE ON public.powder_colors
  FOR EACH ROW EXECUTE FUNCTION update_powder_colors_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.powder_colors ENABLE ROW LEVEL SECURITY;

-- Read: All authenticated users can read
DROP POLICY IF EXISTS "Authenticated can read powder_colors" ON public.powder_colors;
CREATE POLICY "Authenticated can read powder_colors"
  ON public.powder_colors FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert/Update/Delete: Admins only
DROP POLICY IF EXISTS "Admins can insert powder_colors" ON public.powder_colors;
CREATE POLICY "Admins can insert powder_colors"
  ON public.powder_colors FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

DROP POLICY IF EXISTS "Admins can update powder_colors" ON public.powder_colors;
CREATE POLICY "Admins can update powder_colors"
  ON public.powder_colors FOR UPDATE
  USING (public.has_belt_admin_access());

DROP POLICY IF EXISTS "Admins can delete powder_colors" ON public.powder_colors;
CREATE POLICY "Admins can delete powder_colors"
  ON public.powder_colors FOR DELETE
  USING (public.has_belt_admin_access());

-- ============================================================================
-- Seed Data: Powder Colors
-- ============================================================================
-- Scope: 'both' means available for conveyor and guarding
-- Scope: 'conveyor' or 'guarding' means only available for that category
-- ============================================================================

INSERT INTO public.powder_colors
  (scope, code, name, description, is_stock, is_default_conveyor, is_default_guarding, sort_order)
VALUES
  -- Conveyor default: RAL 5015 Sky Blue
  ('both', 'RAL5015', 'RAL 5015', 'Sky Blue (Stock)', true, true, false, 10),

  -- Guarding default: RAL 1023 Traffic Yellow (safety standard)
  ('both', 'RAL1023', 'RAL 1023', 'Traffic Yellow (Stock)', true, false, true, 20),

  -- Common stock neutrals
  ('both', 'RAL9005', 'RAL 9005', 'Jet Black (Stock)', true, false, false, 30),
  ('both', 'RAL9006', 'RAL 9006', 'White Aluminum (Stock)', true, false, false, 40),
  ('both', 'RAL7035', 'RAL 7035', 'Light Grey (Stock)', true, false, false, 50),

  -- Custom sentinel (always sorts last)
  ('both', 'CUSTOM', 'CUSTOM', 'Custom / Not listed', false, false, false, 9999)

ON CONFLICT (code) DO UPDATE SET
  scope = EXCLUDED.scope,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_stock = EXCLUDED.is_stock,
  is_default_conveyor = EXCLUDED.is_default_conveyor,
  is_default_guarding = EXCLUDED.is_default_guarding,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
