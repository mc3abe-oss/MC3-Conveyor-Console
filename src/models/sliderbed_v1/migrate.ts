/**
 * SLIDERBED CONVEYOR v1.14 - INPUT MIGRATION
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
 */

import {
  SliderbedInputs,
  SupportOption,
  EndSupportType,
  derivedLegsRequired,
  TOB_FIELDS,
  SpeedMode,
  GeometryMode,
  FrameConstructionType,
  SheetMetalGauge,
} from './schema';
import { horizontalFromAxis, normalizeGeometry, DerivedGeometry } from './geometry';

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
    migrated.tail_matches_drive = true;
    migrated.drive_pulley_preset = undefined; // Custom since migrated
    migrated.tail_pulley_preset = undefined;
  } else if (hasDrive && !hasTail) {
    // Drive exists but tail missing - set tail = drive
    migrated.tail_pulley_diameter_in = migrated.drive_pulley_diameter_in;
    migrated.tail_matches_drive = true;
  } else if (!hasDrive && hasTail) {
    // Tail exists but drive missing - set drive = tail
    migrated.drive_pulley_diameter_in = migrated.tail_pulley_diameter_in;
    migrated.tail_matches_drive = true;
  }
  // If both exist, keep them as-is

  // Ensure pulley_diameter_in stays in sync (for backward compatibility in formulas)
  // Use drive pulley as the "primary" for legacy compatibility
  if (migrated.drive_pulley_diameter_in) {
    migrated.pulley_diameter_in = migrated.drive_pulley_diameter_in;
  }

  // =========================================================================
  // CLEAT MIGRATION
  // =========================================================================

  if (migrated.cleats_enabled === undefined) {
    migrated.cleats_enabled = false;
  }

  // If cleats disabled, clear the cleat fields (optional, keeps data clean)
  if (!migrated.cleats_enabled) {
    migrated.cleat_height_in = undefined;
    migrated.cleat_spacing_in = undefined;
    migrated.cleat_edge_offset_in = undefined;
  }

  // =========================================================================
  // TAIL MATCHES DRIVE SYNC
  // =========================================================================

  // If tail_matches_drive is true, ensure tail actually matches drive
  if (migrated.tail_matches_drive === true && migrated.drive_pulley_diameter_in !== undefined) {
    migrated.tail_pulley_diameter_in = migrated.drive_pulley_diameter_in;
  }

  // Default tail_matches_drive if not set
  if (migrated.tail_matches_drive === undefined) {
    // Check if they're equal
    migrated.tail_matches_drive =
      migrated.drive_pulley_diameter_in === migrated.tail_pulley_diameter_in;
  }

  // =========================================================================
  // v1.4: SUPPORT OPTION MIGRATION
  // =========================================================================

  // Migrate legacy support_option to per-end support types
  if (inputs.support_option !== undefined && migrated.tail_support_type === undefined) {
    const supportOption = inputs.support_option;

    if (supportOption === SupportOption.FloorMounted || supportOption === 'Floor Mounted') {
      migrated.tail_support_type = EndSupportType.Legs;
      migrated.drive_support_type = EndSupportType.Legs;
    } else if (supportOption === SupportOption.Suspended || supportOption === 'Suspended') {
      migrated.tail_support_type = EndSupportType.External;
      migrated.drive_support_type = EndSupportType.External;
    } else if (supportOption === SupportOption.IntegratedFrame || supportOption === 'Integrated Frame') {
      migrated.tail_support_type = EndSupportType.External;
      migrated.drive_support_type = EndSupportType.External;
    } else {
      // Default to External for unknown values
      migrated.tail_support_type = EndSupportType.External;
      migrated.drive_support_type = EndSupportType.External;
    }

    // Remove deprecated field after migration
    delete (migrated as unknown as Record<string, unknown>).support_option;
  }

  // Default to External if per-end types not set
  if (migrated.tail_support_type === undefined) {
    migrated.tail_support_type = EndSupportType.External;
  }
  if (migrated.drive_support_type === undefined) {
    migrated.drive_support_type = EndSupportType.External;
  }

  // =========================================================================
  // v1.4: TOB FIELD ENFORCEMENT
  // =========================================================================

  const legsRequired = derivedLegsRequired(migrated.tail_support_type, migrated.drive_support_type);

  if (!legsRequired) {
    // Remove TOB fields that must not exist when legs_required=false
    for (const field of TOB_FIELDS) {
      delete (migrated as unknown as Record<string, unknown>)[field];
    }
  }

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

  return migrated;
}

/**
 * Normalize inputs before calculation
 *
 * This ensures all required pulley diameter fields are populated.
 * Call this at the start of calculate() to handle any legacy configs.
 */
export function normalizeInputsForCalculation(inputs: SliderbedInputs): {
  drivePulleyDiameterIn: number;
  tailPulleyDiameterIn: number;
} {
  // Apply migration if needed
  const migrated = migrateInputs(inputs);

  // At this point, both should be defined
  const drivePulleyDiameterIn = migrated.drive_pulley_diameter_in ?? migrated.pulley_diameter_in ?? DEFAULT_PULLEY_DIAMETER_IN;
  const tailPulleyDiameterIn = migrated.tail_pulley_diameter_in ?? drivePulleyDiameterIn;

  return { drivePulleyDiameterIn, tailPulleyDiameterIn };
}

/**
 * Normalize inputs before calculation (v1.10)
 *
 * Extended version that includes geometry normalization.
 * Returns pulley diameters AND derived geometry values.
 */
export function normalizeInputsForCalculationV2(inputs: SliderbedInputs): {
  drivePulleyDiameterIn: number;
  tailPulleyDiameterIn: number;
  geometry: DerivedGeometry;
  normalizedInputs: Partial<SliderbedInputs>;
} {
  // Apply migration if needed
  const migrated = migrateInputs(inputs);

  // Normalize pulley diameters
  const drivePulleyDiameterIn = migrated.drive_pulley_diameter_in ?? migrated.pulley_diameter_in ?? DEFAULT_PULLEY_DIAMETER_IN;
  const tailPulleyDiameterIn = migrated.tail_pulley_diameter_in ?? drivePulleyDiameterIn;

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
