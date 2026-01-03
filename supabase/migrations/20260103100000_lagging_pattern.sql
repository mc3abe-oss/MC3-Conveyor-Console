-- Migration: Add Lagging Pattern Support
-- Purpose: Add lagging pattern columns to application_pulleys
--
-- Lagging pattern describes the surface pattern of the lagging material:
-- - none: No pattern (smooth or not applicable)
-- - smooth: Smooth lagging surface
-- - herringbone_clockwise: Herringbone pattern, clockwise orientation
-- - herringbone_counterclockwise: Herringbone pattern, counterclockwise orientation
-- - straight_grooves: Straight groove pattern
-- - diamond: Diamond pattern
-- - custom: Custom pattern (requires notes)

-- ============================================================================
-- PHASE 1: ADD COLUMNS
-- ============================================================================

-- Add lagging_pattern column
ALTER TABLE application_pulleys
  ADD COLUMN lagging_pattern TEXT DEFAULT 'none';

-- Add lagging_pattern_notes column for custom patterns or clarifications
ALTER TABLE application_pulleys
  ADD COLUMN lagging_pattern_notes TEXT;

-- ============================================================================
-- PHASE 2: ADD CONSTRAINTS
-- ============================================================================

-- Constraint: lagging_pattern must be a valid enum value
ALTER TABLE application_pulleys
  ADD CONSTRAINT lagging_pattern_values CHECK (
    lagging_pattern IN (
      'none',
      'smooth',
      'herringbone_clockwise',
      'herringbone_counterclockwise',
      'straight_grooves',
      'diamond',
      'custom'
    )
  );

-- Constraint: custom pattern requires notes
ALTER TABLE application_pulleys
  ADD CONSTRAINT lagging_pattern_custom_requires_notes CHECK (
    lagging_pattern != 'custom' OR lagging_pattern_notes IS NOT NULL
  );

-- Constraint: pattern must be 'none' when lagging is disabled
ALTER TABLE application_pulleys
  ADD CONSTRAINT lagging_pattern_requires_lagging CHECK (
    lagging_type != 'NONE' OR lagging_pattern = 'none' OR lagging_pattern IS NULL
  );

-- ============================================================================
-- PHASE 3: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Lagging pattern migration complete:';
  RAISE NOTICE '  - Added lagging_pattern column (TEXT with enum constraint)';
  RAISE NOTICE '  - Added lagging_pattern_notes column';
  RAISE NOTICE '  - Added validation constraints';
END $$;
