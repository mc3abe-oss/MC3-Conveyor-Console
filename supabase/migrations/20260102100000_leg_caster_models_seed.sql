-- ============================================================================
-- v1.39: Leg Models and Caster Models Seed Data
-- ============================================================================
--
-- This migration adds initial seed data for:
-- - leg_model catalog items
-- - caster_model catalog items
--
-- These are used in the Support & Floor Mounting section of Build Options tab.
-- ============================================================================

-- Leg Models
INSERT INTO catalog_items (catalog_key, item_key, label, sort_order, is_active)
VALUES
  ('leg_model', 'LEG-STD-24', 'Standard Leg 24" (24-30" range)', 10, true),
  ('leg_model', 'LEG-STD-36', 'Standard Leg 36" (36-42" range)', 20, true),
  ('leg_model', 'LEG-HD-24', 'Heavy Duty Leg 24" (2000 lbs cap)', 30, true),
  ('leg_model', 'LEG-HD-36', 'Heavy Duty Leg 36" (2000 lbs cap)', 40, true)
ON CONFLICT (catalog_key, item_key) DO NOTHING;

-- Caster Models
INSERT INTO catalog_items (catalog_key, item_key, label, sort_order, is_active)
VALUES
  ('caster_model', 'CASTER-4-STD', '4" Standard Caster (300 lbs)', 10, true),
  ('caster_model', 'CASTER-5-STD', '5" Standard Caster (400 lbs)', 20, true),
  ('caster_model', 'CASTER-6-HD', '6" Heavy Duty Caster (600 lbs)', 30, true),
  ('caster_model', 'CASTER-8-HD', '8" Heavy Duty Caster (800 lbs)', 40, true)
ON CONFLICT (catalog_key, item_key) DO NOTHING;
