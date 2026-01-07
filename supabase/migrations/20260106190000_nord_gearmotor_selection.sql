-- =============================================================================
-- MIGRATION: NORD Gearmotor Selection v1
-- =============================================================================
-- Purpose: Add tables for vendor component catalog and drive configuration
--          to support NORD FLEXBLOC gearmotor selection.
--
-- Tables:
--   1. vendor_components - Vendor part catalog (gear units, motors, adapters)
--   2. vendor_performance_points - Performance data points from catalog
--   3. vendor_component_compat - Compatibility rules for mix-and-match recipes
--   4. application_drive_config - Per-application drive selection state
--   5. application_drive_component_selection - Selected components for a config
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

-- Component types in vendor catalog
CREATE TYPE vendor_component_type AS ENUM (
  'GEAR_UNIT',
  'MOTOR',
  'INPUT_ADAPTER',
  'OUTPUT_KIT',
  'OPTION'
);

-- Gearmotor series (FLEXBLOC first policy; MINICASE as fallback)
CREATE TYPE vendor_gearmotor_series AS ENUM (
  'FLEXBLOC',
  'MINICASE'
);

-- Compatibility relationship types
CREATE TYPE vendor_compat_type AS ENUM (
  'ALLOWED',
  'REQUIRED',
  'FORBIDDEN'
);

-- -----------------------------------------------------------------------------
-- TABLE: vendor_components
-- -----------------------------------------------------------------------------
-- Catalog of vendor parts: gear units, motors, adapters, kits, options.
-- Each row is a distinct part number from a vendor.

CREATE TABLE vendor_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL DEFAULT 'NORD',
  component_type vendor_component_type NOT NULL,
  vendor_part_number TEXT NOT NULL,
  description TEXT,
  metadata_json JSONB,  -- For future: bore/shaft specs, dimensions, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique per vendor+part_number (simplest constraint)
  CONSTRAINT uq_vendor_part UNIQUE (vendor, vendor_part_number)
);

-- Indexes
CREATE INDEX idx_vendor_components_type ON vendor_components(vendor, component_type);
CREATE INDEX idx_vendor_components_part ON vendor_components(vendor_part_number);

-- Comments
COMMENT ON TABLE vendor_components IS 'Vendor part catalog for gearmotors, motors, adapters, kits.';
COMMENT ON COLUMN vendor_components.vendor IS 'Vendor name, e.g., NORD, SEW, etc.';
COMMENT ON COLUMN vendor_components.component_type IS 'Type of component: GEAR_UNIT, MOTOR, INPUT_ADAPTER, OUTPUT_KIT, OPTION';
COMMENT ON COLUMN vendor_components.vendor_part_number IS 'Vendor-specific part number (unique within vendor)';
COMMENT ON COLUMN vendor_components.metadata_json IS 'Future: bore sizes, shaft specs, dimensions, notes';

-- -----------------------------------------------------------------------------
-- TABLE: vendor_performance_points
-- -----------------------------------------------------------------------------
-- Performance data from vendor catalogs.
-- Each row represents one operating point: HP/RPM/Torque/SF combination.

CREATE TABLE vendor_performance_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL DEFAULT 'NORD',
  series vendor_gearmotor_series NOT NULL,
  size_code TEXT NOT NULL,  -- e.g., '31', '40', '50', '63', '75'
  gear_unit_component_id UUID NOT NULL REFERENCES vendor_components(id) ON DELETE CASCADE,
  motor_hp NUMERIC(6,3) NOT NULL,  -- e.g., 0.5, 0.75, 1.0, 1.5, 2.0
  output_rpm NUMERIC(8,2) NOT NULL,
  output_torque_lb_in NUMERIC(10,2) NOT NULL,
  service_factor_catalog NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  source_ref TEXT,  -- Reference to source document/table
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Uniqueness for idempotent upserts
  CONSTRAINT uq_performance_point UNIQUE (
    vendor, series, size_code, gear_unit_component_id,
    motor_hp, output_rpm, output_torque_lb_in, service_factor_catalog
  )
);

-- Indexes for selector queries
CREATE INDEX idx_perf_vendor_series_hp ON vendor_performance_points(vendor, series, motor_hp);
CREATE INDEX idx_perf_gear_unit ON vendor_performance_points(gear_unit_component_id);
CREATE INDEX idx_perf_rpm_torque ON vendor_performance_points(output_rpm, output_torque_lb_in);

-- Comments
COMMENT ON TABLE vendor_performance_points IS 'Performance data points from vendor catalogs for gearmotor selection.';
COMMENT ON COLUMN vendor_performance_points.series IS 'Gearmotor series: FLEXBLOC (preferred) or MINICASE (fallback)';
COMMENT ON COLUMN vendor_performance_points.size_code IS 'Frame/housing size: 31, 40, 50, 63, 75, etc.';
COMMENT ON COLUMN vendor_performance_points.motor_hp IS 'Motor horsepower rating';
COMMENT ON COLUMN vendor_performance_points.output_rpm IS 'Output shaft RPM at this operating point';
COMMENT ON COLUMN vendor_performance_points.output_torque_lb_in IS 'Output torque capacity in lb-in at this point';
COMMENT ON COLUMN vendor_performance_points.service_factor_catalog IS 'Catalog service factor (typically 1.0)';

-- -----------------------------------------------------------------------------
-- TABLE: vendor_component_compat
-- -----------------------------------------------------------------------------
-- Compatibility rules for mix-and-match component recipes.
-- Defines which components can/must/cannot be combined.

CREATE TABLE vendor_component_compat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_component_id UUID NOT NULL REFERENCES vendor_components(id) ON DELETE CASCADE,
  child_component_id UUID NOT NULL REFERENCES vendor_components(id) ON DELETE CASCADE,
  compat_type vendor_compat_type NOT NULL DEFAULT 'ALLOWED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique relationship
  CONSTRAINT uq_compat_pair UNIQUE (parent_component_id, child_component_id, compat_type)
);

-- Indexes
CREATE INDEX idx_compat_parent ON vendor_component_compat(parent_component_id);
CREATE INDEX idx_compat_child ON vendor_component_compat(child_component_id);

-- Comments
COMMENT ON TABLE vendor_component_compat IS 'Compatibility rules for vendor component combinations.';
COMMENT ON COLUMN vendor_component_compat.compat_type IS 'ALLOWED: can combine, REQUIRED: must include, FORBIDDEN: cannot combine';

-- -----------------------------------------------------------------------------
-- TABLE: application_drive_config
-- -----------------------------------------------------------------------------
-- Per-application drive configuration and selection state.
-- Links to calc_recipes (applications are stored there).

CREATE TABLE application_drive_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES calc_recipes(id) ON DELETE CASCADE,
  required_output_rpm NUMERIC(8,2),
  required_output_torque_lb_in NUMERIC(10,2),
  chosen_service_factor NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  speed_tolerance_pct NUMERIC(5,2) NOT NULL DEFAULT 15.0,
  selected_performance_point_id UUID REFERENCES vendor_performance_points(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One drive config per application
  CONSTRAINT uq_app_drive_config UNIQUE (application_id)
);

-- Indexes
CREATE INDEX idx_drive_config_app ON application_drive_config(application_id);
CREATE INDEX idx_drive_config_selected ON application_drive_config(selected_performance_point_id)
  WHERE selected_performance_point_id IS NOT NULL;

-- Comments
COMMENT ON TABLE application_drive_config IS 'Per-application drive selection configuration and state.';
COMMENT ON COLUMN application_drive_config.application_id IS 'FK to calc_recipes (application storage)';
COMMENT ON COLUMN application_drive_config.required_output_rpm IS 'Snapshot of required RPM when selection made';
COMMENT ON COLUMN application_drive_config.required_output_torque_lb_in IS 'Snapshot of required torque when selection made';
COMMENT ON COLUMN application_drive_config.chosen_service_factor IS 'User-selected service factor for selection';
COMMENT ON COLUMN application_drive_config.speed_tolerance_pct IS 'Allowed RPM deviation percentage (default 15%)';

-- -----------------------------------------------------------------------------
-- TABLE: application_drive_component_selection
-- -----------------------------------------------------------------------------
-- Selected vendor components for a drive configuration.
-- Supports multi-component recipes (gear unit + motor + adapter + etc.).

CREATE TABLE application_drive_component_selection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_config_id UUID NOT NULL REFERENCES application_drive_config(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES vendor_components(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per component per config
  CONSTRAINT uq_drive_component UNIQUE (drive_config_id, component_id)
);

-- Indexes
CREATE INDEX idx_drive_selection_config ON application_drive_component_selection(drive_config_id);
CREATE INDEX idx_drive_selection_component ON application_drive_component_selection(component_id);

-- Comments
COMMENT ON TABLE application_drive_component_selection IS 'Selected vendor components for a drive recipe.';
COMMENT ON COLUMN application_drive_component_selection.qty IS 'Quantity of this component in the recipe (typically 1)';

-- -----------------------------------------------------------------------------
-- TRIGGERS: updated_at
-- -----------------------------------------------------------------------------

-- Reuse existing trigger function if available, otherwise create
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_components_updated_at
  BEFORE UPDATE ON vendor_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_performance_points_updated_at
  BEFORE UPDATE ON vendor_performance_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_drive_config_updated_at
  BEFORE UPDATE ON application_drive_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- END MIGRATION
-- =============================================================================
