/**
 * SLIDERBED CONVEYOR v1.29 - INPUT MIGRATION
 *
 * Handles migration of legacy inputs to the new schema.
 *
 * PULLEY DIAMETER MIGRATION (v1.3):
 * 1. If legacy pulley_diameter_in exists and new drive/tail are missing:
 *    - Set drive_pulley_diameter_in = pulley_diameter_in
 *    - Set tail_pulley_diameter_in = pulley_diameter_in
 *    - Set tail_matches_drive = true
 *
 * 2. If only drive exists: tail = drive, tail_matches_drive = true
 * 3. If only tail exists: drive = tail, tail_matches_drive = true
 * 4. If neither exists: use schema default (4")
 *
 * Cleats: If missing, default to cleats_enabled = false
 *
 * SUPPORT OPTION MIGRATION (v1.4):
 * Migrates legacy support_option to per-end support types:
 * - FloorMounted → Legs + Legs
 * - Suspended → External + External
 * - IntegratedFrame → External + External
 * - Casters (if added) → Casters + Casters
 *
 * TOB FIELD HANDLING (v1.4):
 * - When legs_required=false: Remove any TOB fields that exist
 * - When legs_required=true: Legacy configs may be missing TOB (allowed in draft mode)
 *
 * SPEED MODE MIGRATION (v1.6):
 * - Old configs have drive_rpm as primary input
 * - Migrate to speed_mode = 'drive_rpm' with drive_rpm_input = drive_rpm
 * - DO NOT silently reinterpret drive_rpm as belt_speed
 *
 * GEOMETRY MODE MIGRATION (v1.10):
 * - Old configs have no geometry_mode, default to L_ANGLE
 * - Derive horizontal_run_in from conveyor_length_cc_in and angle if missing
 * - Deprecated helpers calculateImpliedAngleDeg/calculateOppositeTob
 *   remain for backward compatibility but are incorrect for inclined conveyors
 *
 * FRAME CONSTRUCTION MIGRATION (v1.14):
 * - Legacy configs may not have frame_construction_type field
 * - Default to 'sheet_metal' with gauge '12_GA' (standard build)
 * - This ensures frame_side_thickness_in can be derived in formulas
 *
 * MATERIAL FORM MIGRATION (v1.29):
 * - Legacy configs do not have material_form field
 * - Default to PARTS to preserve existing behavior exactly
 * - All PARTS logic remains unchanged (no math drift)
 * - BULK fields are only validated when material_form = BULK
 */

import {
  SliderbedInputs,
  SpeedMode,
  GeometryMode,
  FrameConstructionType,
  SheetMetalGauge,
  MaterialForm,
} from './schema';
import { horizontalFromAxis, normalizeGeometry, DerivedGeometry } from './geometry';
// PHASE 0: Legacy pulley catalog import removed - will be replaced by application_pulleys in Phase 2
// Stub function to maintain API compatibility during transition
function getEffectiveDiameterByKey(_key: string | undefined): number | undefined {
  return undefined; // Pulley diameter resolution moved to application_pulleys
}

const DEFAULT_PULLEY_DIAMETER_IN = 4;

/**
 * Migrate legacy inputs to v1.3 schema
 *
 * This function is idempotent - calling it multiple times produces the same result.
 * It does NOT modify the original object; returns a new object with migrated fields.
 */
export function migrateInputs(inputs: Partial<SliderbedInputs>): SliderbedInputs {
  const migrated = { ...inputs } as SliderbedInputs;

  // =========================================================================
  // PULLEY DIAMETER MIGRATION
  // =========================================================================

  const legacyPulleyDia = inputs.pulley_diameter_in;
  const hasDrive = inputs.drive_pulley_diameter_in !== undefined && inputs.drive_pulley_diameter_in > 0;
  const hasTail = inputs.tail_pulley_diameter_in !== undefined && inputs.tail_pulley_diameter_in > 0;

  if (!hasDrive && !hasTail) {
    // Neither new field exists - use legacy or default
    const diameter = legacyPulleyDia && legacyPulleyDia > 0 ? legacyPulleyDia : DEFAULT_PULLEY_DIAMETER_IN;
    migrated.drive_pulley_diameter_in = diameter;
    migrated.tail_pulley_diameter_in = diameter;
    migrated.drive_pulley_preset = undefined; // Custom since migrated
    migrated.tail_pulley_preset = undefined;
  } else if (hasDrive && !hasTail) {
    // Drive exists but tail missing - tail compat shim will handle later
    // (see v1.16 TAIL MATCHES DRIVE COMPATIBILITY SHIM section below)
  } else if (!hasDrive && hasTail) {
    // Tail exists but drive missing - set drive = tail
    migrated.drive_pulley_diameter_in = migrated.tail_pulley_diameter_in;
  }
  // If both exist, keep them as-is

  // Ensure pulley_diameter_in stays in sync (for backward compatibility in formulas)
  // Use drive pulley as the "primary" for legacy compatibility
  if (migrated.drive_pulley_diameter_in) {
    migrated.pulley_diameter_in = migrated.drive_pulley_diameter_in;
  }

  // =========================================================================
  // CLEAT MIGRATION (v1.23)
  // =========================================================================

  if (migrated.cleats_enabled === undefined) {
    migrated.cleats_enabled = false;
  }

  // v1.23: Sync cleats_mode with cleats_enabled
  // SYNC RULE: cleats_mode='cleated' <=> cleats_enabled=true
  if (migrated.cleats_mode === undefined) {
    migrated.cleats_mode = migrated.cleats_enabled ? 'cleated' : 'none';
  } else if (migrated.cleats_mode === 'cleated') {
    migrated.cleats_enabled = true;
  } else if (migrated.cleats_mode === 'none') {
    migrated.cleats_enabled = false;
  }

  // v1.23: Set defaults for new catalog fields when cleats enabled
  // Do NOT auto-map legacy numeric fields to catalog selections
  // Leave new fields unset - validation will prompt user to complete
  if (migrated.cleats_enabled) {
    // Default material family (locked)
    if (migrated.cleat_material_family === undefined) {
      migrated.cleat_material_family = 'PVC_HOT_WELDED';
    }
    // Default style to SOLID
    if (migrated.cleat_style === undefined) {
      migrated.cleat_style = 'SOLID';
    }
    // Default centers to 12"
    if (migrated.cleat_centers_in === undefined) {
      migrated.cleat_centers_in = 12;
    }
    // cleat_profile, cleat_size must be selected by user from catalog
    // cleat_pattern defaults to STRAIGHT_CROSS (informational only, no calc impact)
    if (migrated.cleat_pattern === undefined) {
      migrated.cleat_pattern = 'STRAIGHT_CROSS';
    }
  }

  // If cleats disabled, DO NOT clear legacy fields (preserve for backward compat)
  // Just ensure cleats_mode is synced
  if (!migrated.cleats_enabled) {
    migrated.cleats_mode = 'none';
  }

  // =========================================================================
  // v1.16: TAIL MATCHES DRIVE COMPATIBILITY SHIM
  // =========================================================================
  // Legacy configs may have tail_matches_drive = true (or undefined, which meant true).
  // When this is the case and tail_pulley_diameter_in is not explicitly set,
  // we set tail = drive to preserve the old behavior.
  // After migration, we delete tail_matches_drive so it doesn't persist forward.

  if (
    (migrated.tail_matches_drive === true || migrated.tail_matches_drive === undefined) &&
    migrated.tail_pulley_diameter_in === undefined &&
    migrated.drive_pulley_diameter_in !== undefined
  ) {
    migrated.tail_pulley_diameter_in = migrated.drive_pulley_diameter_in;
  }

  // Delete the deprecated field so it doesn't persist in new saves
  delete migrated.tail_matches_drive;

  // =========================================================================
  // v1.42: LEGACY SUPPORT/HEIGHT FIELD STRIPPING
  // Remove deprecated fields: tail_support_type, drive_support_type, height_input_mode
  // =========================================================================

  delete (migrated as unknown as Record<string, unknown>).support_option;
  delete (migrated as unknown as Record<string, unknown>).tail_support_type;
  delete (migrated as unknown as Record<string, unknown>).drive_support_type;
  delete (migrated as unknown as Record<string, unknown>).height_input_mode;

  // =========================================================================
  // v1.6: SPEED MODE MIGRATION
  // =========================================================================

  // Check if this is a legacy config (has drive_rpm but no speed_mode)
  if (inputs.speed_mode === undefined) {
    // Legacy config detection:
    // - If drive_rpm exists and is > 0, this is a legacy config
    // - Set speed_mode = 'drive_rpm' to preserve original behavior
    // - Copy drive_rpm to drive_rpm_input
    if (inputs.drive_rpm !== undefined && inputs.drive_rpm > 0) {
      migrated.speed_mode = SpeedMode.DriveRpm;
      migrated.drive_rpm_input = inputs.drive_rpm;
    } else {
      // New config or no drive_rpm - default to belt_speed mode (v1.6 default)
      migrated.speed_mode = SpeedMode.BeltSpeed;
    }
  }

  // Ensure drive_rpm stays in sync for backward compatibility in calculation
  // This is needed for any code that still reads drive_rpm directly
  if (migrated.speed_mode === SpeedMode.DriveRpm || migrated.speed_mode === 'drive_rpm') {
    if (migrated.drive_rpm_input !== undefined) {
      migrated.drive_rpm = migrated.drive_rpm_input;
    }
  }

  // =========================================================================
  // GEOMETRY MODE MIGRATION (v1.10)
  // =========================================================================

  // If geometry_mode is missing, default to L_ANGLE (Length + Angle mode)
  // This preserves existing behavior where conveyor_length_cc_in was the primary input
  if (migrated.geometry_mode === undefined) {
    migrated.geometry_mode = GeometryMode.LengthAngle;
  }

  // If horizontal_run_in is missing, derive it from L_cc and angle
  // This ensures the field exists for the new geometry functions
  if (migrated.horizontal_run_in === undefined) {
    const angleDeg = migrated.conveyor_incline_deg ?? 0;
    const axisLength = migrated.conveyor_length_cc_in;
    if (axisLength > 0) {
      migrated.horizontal_run_in = horizontalFromAxis(axisLength, angleDeg);
    }
  }

  // =========================================================================
  // FRAME CONSTRUCTION MIGRATION (v1.14)
  // =========================================================================

  // Legacy configs may not have frame construction fields
  // Default to sheet_metal with 12 gauge (standard build)
  if (migrated.frame_construction_type === undefined) {
    migrated.frame_construction_type = 'sheet_metal' as FrameConstructionType;
    // Only set gauge if not already set
    if (migrated.frame_sheet_metal_gauge === undefined) {
      migrated.frame_sheet_metal_gauge = '12_GA' as SheetMetalGauge;
    }
  }

  // Ensure appropriate sub-field is set based on construction type
  if (migrated.frame_construction_type === 'sheet_metal') {
    // Default gauge if missing
    if (migrated.frame_sheet_metal_gauge === undefined) {
      migrated.frame_sheet_metal_gauge = '12_GA' as SheetMetalGauge;
    }
    // Clear channel field since not applicable
    migrated.frame_structural_channel_series = undefined;
  } else if (migrated.frame_construction_type === 'structural_channel') {
    // Default channel if missing
    if (migrated.frame_structural_channel_series === undefined) {
      migrated.frame_structural_channel_series = 'C4';
    }
    // Clear gauge field since not applicable
    migrated.frame_sheet_metal_gauge = undefined;
  } else if (migrated.frame_construction_type === 'special') {
    // Special construction - clear both sub-fields
    migrated.frame_sheet_metal_gauge = undefined;
    migrated.frame_structural_channel_series = undefined;
  }

  // =========================================================================
  // v1.29: MATERIAL FORM MIGRATION
  // =========================================================================

  // Default material_form to PARTS for legacy configs
  // This preserves existing behavior exactly - no math drift
  if (migrated.material_form === undefined) {
    migrated.material_form = MaterialForm.Parts;
  }

  // Note: BULK-specific fields (bulk_input_method, mass_flow_lbs_per_hr, etc.)
  // are NOT defaulted here. They are only required when material_form = BULK.
  // Validation in rules.ts will enforce their presence when needed.

  return migrated;
}

/**
 * Normalize inputs before calculation
 *
 * This ensures all required pulley diameter fields are populated.
 * Call this at the start of calculate() to handle any legacy configs.
 *
 * v1.16: CATALOG AUTHORITY RULE
 * If a catalog key is selected for a station, that catalog's effective diameter
 * is the source of truth. Manual diameter is only used when no catalog is selected.
 */
export function normalizeInputsForCalculation(inputs: SliderbedInputs): {
  drivePulleyDiameterIn: number;
  tailPulleyDiameterIn: number;
} {
  // Apply migration if needed
  const migrated = migrateInputs(inputs);

  // v1.16: Catalog diameter takes precedence over manual
  // For drive: check head_pulley_catalog_key first
  const catalogDriveDia = getEffectiveDiameterByKey(migrated.head_pulley_catalog_key);
  const manualDriveDia = migrated.drive_pulley_diameter_in ?? migrated.pulley_diameter_in ?? DEFAULT_PULLEY_DIAMETER_IN;
  const drivePulleyDiameterIn = catalogDriveDia ?? manualDriveDia;

  // Warn if catalog key was provided but lookup failed (stub returns undefined)
  if (migrated.head_pulley_catalog_key && catalogDriveDia === undefined && process.env.NODE_ENV !== 'production') {
    console.warn(`[Migrate] Drive pulley catalog key "${migrated.head_pulley_catalog_key}" not found. Using fallback: ${drivePulleyDiameterIn}"`);
  }

  // For tail: check tail_pulley_catalog_key first
  const catalogTailDia = getEffectiveDiameterByKey(migrated.tail_pulley_catalog_key);
  const manualTailDia = migrated.tail_pulley_diameter_in ?? drivePulleyDiameterIn;
  const tailPulleyDiameterIn = catalogTailDia ?? manualTailDia;

  // Warn if catalog key was provided but lookup failed
  if (migrated.tail_pulley_catalog_key && catalogTailDia === undefined && process.env.NODE_ENV !== 'production') {
    console.warn(`[Migrate] Tail pulley catalog key "${migrated.tail_pulley_catalog_key}" not found. Using fallback: ${tailPulleyDiameterIn}"`);
  }

  return { drivePulleyDiameterIn, tailPulleyDiameterIn };
}

/**
 * Normalize inputs before calculation (v1.10)
 *
 * Extended version that includes geometry normalization.
 * Returns pulley diameters AND derived geometry values.
 *
 * v1.16: CATALOG AUTHORITY RULE
 * If a catalog key is selected for a station, that catalog's effective diameter
 * is the source of truth. Manual diameter is only used when no catalog is selected.
 */
export function normalizeInputsForCalculationV2(inputs: SliderbedInputs): {
  drivePulleyDiameterIn: number;
  tailPulleyDiameterIn: number;
  geometry: DerivedGeometry;
  normalizedInputs: Partial<SliderbedInputs>;
} {
  // Apply migration if needed
  const migrated = migrateInputs(inputs);

  // v1.16: Catalog diameter takes precedence over manual
  // For drive: check head_pulley_catalog_key first
  const catalogDriveDia = getEffectiveDiameterByKey(migrated.head_pulley_catalog_key);
  const manualDriveDia = migrated.drive_pulley_diameter_in ?? migrated.pulley_diameter_in ?? DEFAULT_PULLEY_DIAMETER_IN;
  const drivePulleyDiameterIn = catalogDriveDia ?? manualDriveDia;

  // Warn if catalog key was provided but lookup failed (stub returns undefined)
  if (migrated.head_pulley_catalog_key && catalogDriveDia === undefined && process.env.NODE_ENV !== 'production') {
    console.warn(`[Migrate] Drive pulley catalog key "${migrated.head_pulley_catalog_key}" not found. Using fallback: ${drivePulleyDiameterIn}"`);
  }

  // For tail: check tail_pulley_catalog_key first
  const catalogTailDia = getEffectiveDiameterByKey(migrated.tail_pulley_catalog_key);
  const manualTailDia = migrated.tail_pulley_diameter_in ?? drivePulleyDiameterIn;
  const tailPulleyDiameterIn = catalogTailDia ?? manualTailDia;

  // Warn if catalog key was provided but lookup failed
  if (migrated.tail_pulley_catalog_key && catalogTailDia === undefined && process.env.NODE_ENV !== 'production') {
    console.warn(`[Migrate] Tail pulley catalog key "${migrated.tail_pulley_catalog_key}" not found. Using fallback: ${tailPulleyDiameterIn}"`);
  }

  // Normalize geometry (v1.10)
  const { normalized, derived } = normalizeGeometry(migrated);

  return {
    drivePulleyDiameterIn,
    tailPulleyDiameterIn,
    geometry: derived,
    normalizedInputs: normalized,
  };
}

/**
 * Build cleat summary string for outputs
 */
export function buildCleatsSummary(inputs: SliderbedInputs): string | undefined {
  if (!inputs.cleats_enabled) {
    return undefined;
  }

  // v1.23: Prefer catalog-based summary if available
  if (inputs.cleat_profile && inputs.cleat_size && inputs.cleat_pattern) {
    const style = inputs.cleat_style === 'DRILL_SIPED_1IN' ? ' (D&S)' : '';
    const centers = inputs.cleat_centers_in ?? 12;
    return `${inputs.cleat_profile} ${inputs.cleat_size} ${inputs.cleat_pattern}${style} @ ${centers}" c/c`;
  }

  // Fallback to legacy fields
  const height = inputs.cleat_height_in;
  const spacing = inputs.cleat_spacing_in;
  const offset = inputs.cleat_edge_offset_in;

  if (height === undefined || spacing === undefined || offset === undefined) {
    return 'Cleats: Configuration incomplete';
  }

  return `Cleats: ${height}" high @ ${spacing}" c/c, ${offset}" from belt edge`;
}

// ============================================================================
// v1.4: HEIGHT GEOMETRY HELPERS
// v1.10: DEPRECATED - Use geometry.ts functions instead
// ============================================================================

/**
 * @deprecated Use calculateImpliedAngleFromTobs from geometry.ts instead.
 *
 * BUG (v1.4-v1.9): This function incorrectly uses conveyor_length_cc_in (axis length)
 * as if it were horizontal run. For inclined conveyors, H_cc = L_cc * cos(theta),
 * so using L_cc directly produces wrong angles.
 *
 * This function is kept for backward compatibility but should not be used.
 * Use geometry.calculateImpliedAngleFromTobs() which correctly uses horizontal_run_in.
 */
export function calculateImpliedAngleDeg(
  tailTobIn: number,
  driveTobIn: number,
  conveyorLengthCcIn: number
): number {
  // DEPRECATED: Kept for backward compatibility only
  // This calculation is WRONG for inclined conveyors!
  if (conveyorLengthCcIn <= 0) {
    return 0;
  }
  const rise = driveTobIn - tailTobIn;
  return Math.atan(rise / conveyorLengthCcIn) * (180 / Math.PI);
}

/**
 * @deprecated Use calculateOppositeTobFromAngle from geometry.ts instead.
 *
 * BUG (v1.4-v1.9): This function incorrectly uses conveyor_length_cc_in (axis length)
 * as if it were horizontal run. For inclined conveyors, the rise should be
 * tan(theta) * H_cc, not tan(theta) * L_cc.
 *
 * Additionally, this function doesn't account for different pulley diameters
 * when converting between TOB and centerline heights.
 *
 * Use geometry.calculateOppositeTobFromAngle() which correctly uses horizontal_run_in
 * and properly handles pulley diameter offsets.
 */
export function calculateOppositeTob(
  referenceTobIn: number,
  angleDeg: number,
  conveyorLengthCcIn: number,
  referenceEnd: 'tail' | 'drive'
): number {
  // DEPRECATED: Kept for backward compatibility only
  // This calculation is WRONG for inclined conveyors and ignores pulley diameters!
  const rise = Math.tan(angleDeg * Math.PI / 180) * conveyorLengthCcIn;
  if (referenceEnd === 'tail') {
    // Reference is tail, calculating drive
    return referenceTobIn + rise;
  } else {
    // Reference is drive, calculating tail
    return referenceTobIn - rise;
  }
}

/**
 * Check if implied angle differs from entered angle beyond tolerance.
 *
 * @param impliedAngleDeg - Angle calculated from TOB heights
 * @param enteredAngleDeg - User-entered conveyor_incline_deg
 * @param toleranceDeg - Maximum allowed difference (default: 0.5°)
 * @returns True if mismatch exceeds tolerance
 */
export function hasAngleMismatch(
  impliedAngleDeg: number,
  enteredAngleDeg: number,
  toleranceDeg: number = 0.5
): boolean {
  return Math.abs(impliedAngleDeg - enteredAngleDeg) > toleranceDeg;
}

/**
 * Clear all TOB fields from inputs.
 * Used when switching height input modes (A↔B) or changing reference_end.
 *
 * Mode switching MUST clear TOB values to avoid "ghost ownership" -
 * we can't safely keep any TOB because we lose track of which was user-entered vs derived.
 *
 * @param inputs - The inputs object to mutate
 */
export function clearTobFields(inputs: Partial<SliderbedInputs>): void {
  delete (inputs as unknown as Record<string, unknown>).tail_tob_in;
  delete (inputs as unknown as Record<string, unknown>).drive_tob_in;
}
