-- Migration: Add Hub Connection Columns
-- Purpose: Add hub_connection_type and bushing_system columns to application_pulleys
--
-- Source: PCI Pulley Selection Guide (Pages 12-14)
-- Hub connection type affects fatigue life, serviceability, alignment/runout, and installation pre-stress.
--
-- Valid hub_connection_type values:
--   FIXED_STUB_SHAFTS, REMOVABLE_STUB_SHAFTS, KEYED_HUB_SET_SCREW,
--   ER_INTERNAL_BEARINGS, WELD_ON_HUB_COMPRESSION_BUSHINGS,
--   KEYLESS_LOCKING_DEVICES, FLAT_END_DISK_INTEGRAL_HUB,
--   CONTOURED_END_DISK_INTEGRAL_HUB, DEAD_SHAFT_ASSEMBLY
--
-- Valid bushing_system values (only when hub_connection_type = WELD_ON_HUB_COMPRESSION_BUSHINGS):
--   QD, XT, TAPER_LOCK, HE (legacy)

-- ============================================================================
-- PHASE 1: ADD COLUMNS
-- ============================================================================

-- Add hub_connection_type column
-- Default for drive = KEYED_HUB_SET_SCREW, for tail = ER_INTERNAL_BEARINGS
-- We use NULL as default and let the application layer apply position-specific defaults
ALTER TABLE application_pulleys
  ADD COLUMN hub_connection_type TEXT;

-- Add bushing_system column (only used when hub requires compression bushings)
ALTER TABLE application_pulleys
  ADD COLUMN bushing_system TEXT;

-- ============================================================================
-- PHASE 2: ADD CONSTRAINTS
-- ============================================================================

-- Constraint: hub_connection_type must be a valid enum value (if provided)
ALTER TABLE application_pulleys
  ADD CONSTRAINT hub_connection_type_values CHECK (
    hub_connection_type IS NULL OR hub_connection_type IN (
      'FIXED_STUB_SHAFTS',
      'REMOVABLE_STUB_SHAFTS',
      'KEYED_HUB_SET_SCREW',
      'ER_INTERNAL_BEARINGS',
      'WELD_ON_HUB_COMPRESSION_BUSHINGS',
      'KEYLESS_LOCKING_DEVICES',
      'FLAT_END_DISK_INTEGRAL_HUB',
      'CONTOURED_END_DISK_INTEGRAL_HUB',
      'DEAD_SHAFT_ASSEMBLY'
    )
  );

-- Constraint: bushing_system must be a valid enum value (if provided)
ALTER TABLE application_pulleys
  ADD CONSTRAINT bushing_system_values CHECK (
    bushing_system IS NULL OR bushing_system IN (
      'QD',
      'XT',
      'TAPER_LOCK',
      'HE'
    )
  );

-- Constraint: bushing_system only allowed when hub_connection_type requires it
ALTER TABLE application_pulleys
  ADD CONSTRAINT bushing_system_requires_weld_on_hub CHECK (
    bushing_system IS NULL OR hub_connection_type = 'WELD_ON_HUB_COMPRESSION_BUSHINGS'
  );

-- ============================================================================
-- PHASE 3: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Hub connection columns migration complete:';
  RAISE NOTICE '  - Added hub_connection_type column (TEXT with enum constraint)';
  RAISE NOTICE '  - Added bushing_system column (TEXT with enum constraint)';
  RAISE NOTICE '  - Added validation constraints';
END $$;
