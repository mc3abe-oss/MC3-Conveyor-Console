-- ============================================================================
-- Admin Multi-Product Architecture
-- ============================================================================
--
-- This migration creates the database structure for multi-product admin pages:
-- - product_families: Product family registry (e.g., Belt Conveyor, Roller Conveyor)
-- - admin_pages: Registry of admin pages with category classification
-- - admin_page_product_families: Junction table for page-to-family tagging
--
-- ============================================================================

-- Product Families table
CREATE TABLE public.product_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Pages table
CREATE TABLE public.admin_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  href TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('system', 'catalog')),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for admin page to product family relationships
CREATE TABLE public.admin_page_product_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_page_id UUID REFERENCES public.admin_pages(id) ON DELETE CASCADE,
  product_family_id UUID REFERENCES public.product_families(id) ON DELETE CASCADE,
  UNIQUE(admin_page_id, product_family_id)
);

-- Add indexes for common queries
CREATE INDEX idx_admin_pages_category ON public.admin_pages(category);
CREATE INDEX idx_admin_pages_sort_order ON public.admin_pages(sort_order);
CREATE INDEX idx_product_families_sort_order ON public.product_families(sort_order);
CREATE INDEX idx_admin_page_product_families_page ON public.admin_page_product_families(admin_page_id);
CREATE INDEX idx_admin_page_product_families_family ON public.admin_page_product_families(product_family_id);

-- ============================================================================
-- Seed Data: Product Families
-- ============================================================================

INSERT INTO public.product_families (name, slug, sort_order, is_active)
VALUES
  ('Belt Conveyor', 'belt-conveyor', 10, true);

-- ============================================================================
-- Seed Data: Admin Pages (System Category)
-- ============================================================================

INSERT INTO public.admin_pages (name, slug, href, category, sort_order, is_active)
VALUES
  ('Users', 'users', '/console/admin/system/users', 'system', 10, true),
  ('Product Families', 'product-families', '/console/admin/system/product-families', 'system', 20, true),
  ('Orphaned Applications', 'orphaned-applications', '/console/admin/system/orphaned-applications', 'system', 30, true);

-- ============================================================================
-- Seed Data: Admin Pages (Catalog Category)
-- ============================================================================

INSERT INTO public.admin_pages (name, slug, href, category, sort_order, is_active)
VALUES
  ('Gearmotors', 'gearmotors', '/console/admin/catalog/gearmotors', 'catalog', 10, true),
  ('Belts', 'belts', '/console/admin/catalog/belts', 'catalog', 20, true),
  ('Pulley Library', 'pulley-library', '/console/admin/catalog/pulley-library', 'catalog', 30, true),
  ('V-Guides', 'v-guides', '/console/admin/catalog/v-guides', 'catalog', 40, true),
  ('Cleats', 'cleats', '/console/admin/catalog/cleats', 'catalog', 50, true),
  ('Caster Models', 'caster-models', '/console/admin/catalog/caster-models', 'catalog', 60, true),
  ('Leg Models', 'leg-models', '/console/admin/catalog/leg-models', 'catalog', 70, true),
  ('Power Feed', 'power-feed', '/console/admin/catalog/power-feed', 'catalog', 80, true),
  ('Controls Package', 'controls-package', '/console/admin/catalog/controls-package', 'catalog', 90, true),
  ('Sensor Models', 'sensor-models', '/console/admin/catalog/sensor-models', 'catalog', 100, true),
  ('Documentation Package', 'documentation-package', '/console/admin/catalog/documentation-package', 'catalog', 110, true),
  ('Powder Colors', 'powder-colors', '/console/admin/catalog/powder-colors', 'catalog', 120, true),
  ('Environment Factors', 'environment-factors', '/console/admin/catalog/environment-factors', 'catalog', 130, true),
  ('Process Types', 'process-types', '/console/admin/catalog/process-types', 'catalog', 140, true);

-- ============================================================================
-- Seed Data: Tag all catalog pages with Belt Conveyor product family
-- ============================================================================

INSERT INTO public.admin_page_product_families (admin_page_id, product_family_id)
SELECT ap.id, pf.id
FROM public.admin_pages ap
CROSS JOIN public.product_families pf
WHERE ap.category = 'catalog'
  AND pf.slug = 'belt-conveyor';

-- ============================================================================
-- Enable RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_page_product_families ENABLE ROW LEVEL SECURITY;

-- Product families: readable by all authenticated users
CREATE POLICY "product_families_select_authenticated"
  ON public.product_families FOR SELECT
  TO authenticated
  USING (true);

-- Product families: writable by service role only (admin API)
CREATE POLICY "product_families_insert_service"
  ON public.product_families FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "product_families_update_service"
  ON public.product_families FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin pages: readable by all authenticated users
CREATE POLICY "admin_pages_select_authenticated"
  ON public.admin_pages FOR SELECT
  TO authenticated
  USING (true);

-- Admin pages: writable by service role only
CREATE POLICY "admin_pages_insert_service"
  ON public.admin_pages FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "admin_pages_update_service"
  ON public.admin_pages FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Junction table: readable by all authenticated users
CREATE POLICY "admin_page_product_families_select_authenticated"
  ON public.admin_page_product_families FOR SELECT
  TO authenticated
  USING (true);

-- Junction table: writable by service role only
CREATE POLICY "admin_page_product_families_insert_service"
  ON public.admin_page_product_families FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "admin_page_product_families_delete_service"
  ON public.admin_page_product_families FOR DELETE
  TO service_role
  USING (true);
