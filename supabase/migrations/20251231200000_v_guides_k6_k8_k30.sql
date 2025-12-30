-- ============================================================================
-- Migration: Add V-Guides K6, K8, K30
-- Version: v1.25
--
-- Adds 3 new V-Guide profiles from PVC Guides and Data.pdf
-- ============================================================================

-- Insert K6, K8, K30 (upsert - skip if already exists)
INSERT INTO v_guides (key, na_letter, label, min_pulley_dia_solid_in, min_pulley_dia_notched_in, sort_order, is_active)
VALUES
  ('K6', 'OOO', 'OOO (K6)', 1.5, 0.5, 5, true),
  ('K8', 'OO', 'OO (K8)', 2.0, 1.0, 8, true),
  ('K30', 'D', 'D (K30)', 8.0, 7.0, 60, true)
ON CONFLICT (key) DO NOTHING;
