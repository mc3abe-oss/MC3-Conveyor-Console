/**
 * SLIDERBED CONVEYOR v1.40 - VALIDATION RULES
 *
 * This file implements all validation rules, hard errors, warnings, and info messages
 * as defined in the Model v1 specification.
 *
 * CHANGELOG:
 * v1.40 (2026-01-02): Floor Support Logic - Decouple TOB from Legs/Casters
 *                     TOB required when floor_supported (independent of hardware)
 *                     Leg model required when include_legs=true
 *                     Caster config required when include_casters=true
 *                     Legs and Casters can both be enabled simultaneously
 * v1.32 (2026-01-01): Feed behavior validation (surge_multiplier >= 1.0)
 *                     Warning for missing density in Weight Flow mode (optional but encouraged)
 * v1.31 (2026-01-01): Lump size validation (smallest_lump_size_in <= largest_lump_size_in)
 *                     Update max lump warning to use largest_lump_size_in with fallback
 * v1.30 (2026-01-01): PCI Hub Connection validation (warnings only, no hard stops)
 *                     applyHubConnectionRules for Taper-Lock and drive pulley hub type warnings
 * v1.29 (2026-01-01): Product Definition vNext - PARTS vs BULK material support
 *                     New BULK validation: bulk_input_method, mass_flow, volume_flow, density
 *                     Existing PARTS validation unchanged (no math drift)
 *                     Return Support explicit configuration validation
 *                     - Cleats+snubs check now uses explicit user selection (not frame-height-derived)
 *                     - Low Profile without snubs warning
 *                     - Gravity roller centers warnings (>72" sag, <24" over-engineered)
 * v1.28 (2025-12-31): Fix cleats+snub false failure - use getEffectivePulleyDiameters for consistent
 *                     pulley resolution; show error in Frame section (not just Cleats)
 * v1.27 (2025-12-30): PCI tube stress output validation (applyPciOutputRules)
 * v1.15 (2025-12-26): Pulley catalog selection info messages
 * v1.14 (2025-12-26): Conveyor frame construction validation (gauge/channel conditional requirements)
 * v1.11 (2025-12-24): Belt minimum pulley diameter warnings
 * v1.10 (2025-12-24): Geometry mode validation (L_ANGLE, H_ANGLE, H_TOB)
 * v1.7 (2025-12-22): Sprocket validation for bottom-mount gearmotor configuration
 * v1.6 (2025-12-22): Speed mode validation, belt_speed_fpm and drive_rpm_input validation
 * v1.5 (2025-12-21): Frame height validation, snub roller warnings, cost flag notifications
 * v1.4 (2025-12-21): Per-end support types, height model validation, draft/commit modes
 * v1.3 (2025-12-21): Split pulley diameter into drive/tail, add cleat validation
 * v1.2 (2025-12-19): Make key parameters power-user editable (safety_factor, belt coeffs, base pull)
 * v1.1 (2025-12-19): Fix open-belt wrap length: use πD not 2πD
 * v1.0 (2024-12-19): Initial implementation
 */

import {
  SliderbedInputs,
  SliderbedOutputs,
  SliderbedParameters,
  ValidationError,
  ValidationWarning,
  PartTemperatureClass,
  FluidType,
  EndGuards,
  LacingStyle,
  SideLoadingDirection,
  SideLoadingSeverity,
  BeltTrackingMethod,
  ShaftDiameterMode,
  ValidationMode,
  FrameHeightMode,
  SpeedMode,
  GearmotorMountingStyle,
  GeometryMode,
  MaterialForm,
  BulkInputMethod,
  DensitySource,
  FeedBehavior,
  // v1.29: Return Support enums
  ReturnFrameStyle,
  ReturnSnubMode,
  // v1.40: Unified Support Method
  SupportMethod,
  isFloorSupported,
} from './schema';
import { hasAngleMismatch } from './migrate';
import {
  calculateImpliedAngleFromTobs,
  horizontalFromAxis,
} from './geometry';
import {
  FRAME_HEIGHT_CONSTANTS,
  SNUB_ROLLER_CLEARANCE_THRESHOLD_IN,
  calculateEffectiveFrameHeight,
  calculateRequiresSnubRollers,
  getEffectivePulleyDiameters,
  // v1.29: Return Support functions
  calculateReturnSnubsEnabled,
  calculateReturnSpan,
  calculateGravityRollerCenters,
  calculateDefaultGravityRollerCount,
  DEFAULT_RETURN_END_OFFSET_IN,
  // v1.33: Cleat height for frame calculation
  getEffectiveCleatHeight,
} from './formulas';

// Rules Telemetry - Observability only, no behavior changes
import {
  wrapValidationResult,
  createContext,
} from '../../lib/rules-telemetry';

/**
 * v1.24: Parse cleat height from cleat_size string.
 * UI derives cleat_height_in from cleat_size, but this provides a model-layer
 * safety net for old saved configs or edge cases.
 * Handles: "3", '3"', '3 inch', '3 in', '3 inches'
 */
export function parseCleatHeightFromSize(size: unknown): number | undefined {
  if (!size) return undefined;
  const s = String(size).toLowerCase().trim();
  const cleaned = s.replace(/["\s]/g, '').replace(/(in|inch|inches)$/i, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

// ============================================================================
// PRODUCT TYPE HELPERS
// ============================================================================

/**
 * Product keys that require belt selection.
 * Magnetic conveyors use chain/magnets, not belts.
 */
const BELT_PRODUCT_KEYS = ['belt_conveyor_v1', 'sliderbed_conveyor_v1', 'rollerbed_conveyor_v1'];

/**
 * Determines if belt selection/validation is required for this product.
 * Returns true for belt conveyor products, false for magnetic.
 */
export function requiresBeltValidation(productKey?: string): boolean {
  if (!productKey) return true; // Default to belt validation for backward compatibility
  return BELT_PRODUCT_KEYS.includes(productKey);
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate inputs.
 * @param inputs - The sliderbed inputs
 * @param productKey - Optional product key for product-scoped validation
 */
export function validateInputs(
  inputs: SliderbedInputs,
  productKey?: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // GEOMETRY & LAYOUT
  if (inputs.conveyor_length_cc_in <= 0) {
    errors.push({
      field: 'conveyor_length_cc_in',
      message: 'Conveyor Length (C-C) must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.belt_width_in <= 0) {
    errors.push({
      field: 'belt_width_in',
      message: 'Belt Width must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.conveyor_incline_deg !== undefined && inputs.conveyor_incline_deg < 0) {
    errors.push({
      field: 'conveyor_incline_deg',
      message: 'Incline Angle must be >= 0',
      severity: 'error',
    });
  }

  // v1.10: GEOMETRY MODE VALIDATION
  const mode = inputs.geometry_mode ?? GeometryMode.LengthAngle;

  // H_ANGLE and H_TOB modes require horizontal_run_in
  if (mode === GeometryMode.HorizontalAngle || mode === GeometryMode.HorizontalTob) {
    if (inputs.horizontal_run_in === undefined || inputs.horizontal_run_in <= 0) {
      // Fall back to conveyor_length_cc_in if available
      if (inputs.conveyor_length_cc_in <= 0) {
        errors.push({
          field: 'horizontal_run_in',
          message: 'Horizontal run must be greater than 0 for this geometry mode',
          severity: 'error',
        });
      }
    }
  }

  // H_TOB mode requires both TOB values
  if (mode === GeometryMode.HorizontalTob) {
    if (inputs.tail_tob_in === undefined) {
      errors.push({
        field: 'tail_tob_in',
        message: 'Tail TOB is required in Horizontal + TOBs geometry mode',
        severity: 'error',
      });
    }
    if (inputs.drive_tob_in === undefined) {
      errors.push({
        field: 'drive_tob_in',
        message: 'Drive TOB is required in Horizontal + TOBs geometry mode',
        severity: 'error',
      });
    }
  }

  if (inputs.pulley_diameter_in <= 0) {
    errors.push({
      field: 'pulley_diameter_in',
      message: 'Pulley Diameter must be greater than 0',
      severity: 'error',
    });
  }

  // v1.3: Drive pulley diameter validation
  if (inputs.drive_pulley_diameter_in !== undefined) {
    if (inputs.drive_pulley_diameter_in <= 0) {
      errors.push({
        field: 'drive_pulley_diameter_in',
        message: 'Drive pulley diameter must be greater than 0',
        severity: 'error',
      });
    }
    if (inputs.drive_pulley_diameter_in < 2.5) {
      errors.push({
        field: 'drive_pulley_diameter_in',
        message: 'Drive pulley diameter must be >= 2.5"',
        severity: 'error',
      });
    }
    // Max OD constraint removed - pulleys can be larger than 12" (e.g., 12.75" drum pulleys)
  }

  // v1.3: Tail pulley diameter validation
  if (inputs.tail_pulley_diameter_in !== undefined) {
    if (inputs.tail_pulley_diameter_in <= 0) {
      errors.push({
        field: 'tail_pulley_diameter_in',
        message: 'Tail pulley diameter must be greater than 0',
        severity: 'error',
      });
    }
    if (inputs.tail_pulley_diameter_in < 2.5) {
      errors.push({
        field: 'tail_pulley_diameter_in',
        message: 'Tail pulley diameter must be >= 2.5"',
        severity: 'error',
      });
    }
    // Max OD constraint removed - pulleys can be larger than 12" (e.g., 12.75" drum pulleys)
  }

  // =========================================================================
  // v1.6: SPEED MODE VALIDATION
  // =========================================================================

  const speedMode = inputs.speed_mode ?? SpeedMode.BeltSpeed;
  const isBeltSpeedMode = speedMode === SpeedMode.BeltSpeed || speedMode === 'belt_speed';

  if (isBeltSpeedMode) {
    // Belt Speed mode: belt_speed_fpm is required
    if (inputs.belt_speed_fpm <= 0) {
      errors.push({
        field: 'belt_speed_fpm',
        message: 'Belt Speed (FPM) must be greater than 0',
        severity: 'error',
      });
    }
  } else {
    // Drive RPM mode: drive_rpm_input (or legacy drive_rpm) is required
    const driveRpmValue = inputs.drive_rpm_input ?? inputs.drive_rpm;
    if (driveRpmValue <= 0) {
      errors.push({
        field: 'drive_rpm_input',
        message: 'Drive RPM must be greater than 0',
        severity: 'error',
      });
    }
  }

  // Pulley diameter validation (required for speed calculations)
  const pulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in;
  if (pulleyDia <= 0) {
    errors.push({
      field: 'drive_pulley_diameter_in',
      message: 'Drive pulley diameter must be greater than 0 for speed calculations',
      severity: 'error',
    });
  }

  // =========================================================================
  // v1.7: SPROCKET VALIDATION (BOTTOM MOUNT)
  // =========================================================================

  const mountingStyle = inputs.gearmotor_mounting_style ?? GearmotorMountingStyle.ShaftMounted;
  const isBottomMount = mountingStyle === GearmotorMountingStyle.BottomMount || mountingStyle === 'bottom_mount';

  if (isBottomMount) {
    // Gearmotor sprocket teeth required and must be positive integer
    if (inputs.gm_sprocket_teeth === undefined || inputs.gm_sprocket_teeth <= 0) {
      errors.push({
        field: 'gm_sprocket_teeth',
        message: 'Gearmotor sprocket teeth must be greater than 0',
        severity: 'error',
      });
    } else if (!Number.isInteger(inputs.gm_sprocket_teeth)) {
      errors.push({
        field: 'gm_sprocket_teeth',
        message: 'Sprocket teeth must be a whole number',
        severity: 'error',
      });
    }

    // Drive shaft sprocket teeth required and must be positive integer
    if (inputs.drive_shaft_sprocket_teeth === undefined || inputs.drive_shaft_sprocket_teeth <= 0) {
      errors.push({
        field: 'drive_shaft_sprocket_teeth',
        message: 'Drive shaft sprocket teeth must be greater than 0',
        severity: 'error',
      });
    } else if (!Number.isInteger(inputs.drive_shaft_sprocket_teeth)) {
      errors.push({
        field: 'drive_shaft_sprocket_teeth',
        message: 'Sprocket teeth must be a whole number',
        severity: 'error',
      });
    }
  }

  // =========================================================================
  // v1.9: ENVIRONMENT FACTORS VALIDATION
  // User Feedback 2: Removed min(1) requirement - empty selection is valid
  // Empty selection means "no environmental concerns"
  // =========================================================================

  // THROUGHPUT
  if (
    inputs.required_throughput_pph !== undefined &&
    inputs.required_throughput_pph < 0
  ) {
    errors.push({
      field: 'required_throughput_pph',
      message: 'Required throughput must be >= 0',
      severity: 'error',
    });
  }

  if (
    inputs.throughput_margin_pct !== undefined &&
    inputs.throughput_margin_pct < 0
  ) {
    errors.push({
      field: 'throughput_margin_pct',
      message: 'Throughput margin must be >= 0',
      severity: 'error',
    });
  }

  // =========================================================================
  // v1.48: MATERIAL FORM REQUIRED VALIDATION
  // =========================================================================

  const materialForm = inputs.material_form as MaterialForm | string | undefined;
  const isPartsMode = materialForm === MaterialForm.Parts || materialForm === 'PARTS';
  const isBulkMode = materialForm === MaterialForm.Bulk || materialForm === 'BULK';

  // v1.48: Material form is REQUIRED for new applications
  // Block calculation until user explicitly selects PARTS or BULK
  if (!materialForm) {
    errors.push({
      field: 'material_form',
      message: 'Material form not selected. Choose PARTS or BULK to proceed.',
      severity: 'error',
    });
    // Return early - no point validating other fields if material form is not set
    return errors;
  }

  // =========================================================================
  // v1.48: PARTS MODE VALIDATION - explicit dimensional entry required
  // =========================================================================

  if (isPartsMode) {
    // part_weight_lbs is required
    if (inputs.part_weight_lbs === undefined || inputs.part_weight_lbs <= 0) {
      errors.push({
        field: 'part_weight_lbs',
        message: 'Part weight is required and must be greater than 0',
        severity: 'error',
      });
    }

    // part_length_in is required
    if (inputs.part_length_in === undefined || inputs.part_length_in <= 0) {
      errors.push({
        field: 'part_length_in',
        message: 'Part length is required and must be greater than 0',
        severity: 'error',
      });
    }

    // part_width_in is required
    if (inputs.part_width_in === undefined || inputs.part_width_in <= 0) {
      errors.push({
        field: 'part_width_in',
        message: 'Part width is required and must be greater than 0',
        severity: 'error',
      });
    }
  }

  // =========================================================================
  // v1.29: BULK MODE VALIDATION
  // =========================================================================

  if (isBulkMode) {
    // -------------------------------------------------------------------------
    // BULK MODE VALIDATION
    // -------------------------------------------------------------------------

    const bulkMethod = inputs.bulk_input_method as BulkInputMethod | string | undefined;

    // bulk_input_method is required
    if (!bulkMethod) {
      errors.push({
        field: 'bulk_input_method',
        message: 'Bulk input method must be selected when Material Form is Bulk',
        severity: 'error',
      });
    }

    if (bulkMethod === BulkInputMethod.WeightFlow || bulkMethod === 'WEIGHT_FLOW') {
      // WEIGHT_FLOW: mass_flow_lbs_per_hr is required
      if (inputs.mass_flow_lbs_per_hr === undefined || inputs.mass_flow_lbs_per_hr <= 0) {
        errors.push({
          field: 'mass_flow_lbs_per_hr',
          message: 'Mass flow rate must be greater than 0',
          severity: 'error',
        });
      }
    }

    if (bulkMethod === BulkInputMethod.VolumeFlow || bulkMethod === 'VOLUME_FLOW') {
      // VOLUME_FLOW: volume_flow, density, and density_source are all required
      if (inputs.volume_flow_ft3_per_hr === undefined || inputs.volume_flow_ft3_per_hr <= 0) {
        errors.push({
          field: 'volume_flow_ft3_per_hr',
          message: 'Volume flow rate must be greater than 0',
          severity: 'error',
        });
      }

      if (inputs.density_lbs_per_ft3 === undefined || inputs.density_lbs_per_ft3 <= 0) {
        errors.push({
          field: 'density_lbs_per_ft3',
          message: 'Material density must be greater than 0',
          severity: 'error',
        });
      }

      if (!inputs.density_source) {
        errors.push({
          field: 'density_source',
          message: 'Density source must be specified',
          severity: 'error',
        });
      }
    }

    // Note: PARTS fields (part_weight_lbs, part_length_in, etc.) are NOT validated in BULK mode
    // They are not required and should be ignored.
  }

  // v1.48: PARTS validation moved to isPartsMode block above (lines 372-398)
  // The part_spacing_in validation remains here as it applies to both modes when relevant
  if (isPartsMode && inputs.part_spacing_in < 0) {
    errors.push({
      field: 'part_spacing_in',
      message: 'Part Spacing must be >= 0',
      severity: 'error',
    });
  }

  // DROP HEIGHT (applies to both modes)
  if (inputs.drop_height_in < 0) {
    errors.push({
      field: 'drop_height_in',
      message: 'Drop height cannot be negative.',
      severity: 'error',
    });
  }

  // POWER-USER PARAMETERS (v1.2)
  if (inputs.safety_factor !== undefined && inputs.safety_factor < 1.0) {
    errors.push({
      field: 'safety_factor',
      message: 'Safety factor must be >= 1.0',
      severity: 'error',
    });
  }

  if (inputs.safety_factor !== undefined && inputs.safety_factor > 5.0) {
    errors.push({
      field: 'safety_factor',
      message: 'Safety factor must be <= 5.0',
      severity: 'error',
    });
  }

  if (inputs.belt_coeff_piw !== undefined && inputs.belt_coeff_piw <= 0) {
    errors.push({
      field: 'belt_coeff_piw',
      message: 'PIW must be > 0',
      severity: 'error',
    });
  }

  if (inputs.belt_coeff_piw !== undefined && (inputs.belt_coeff_piw < 0.05 || inputs.belt_coeff_piw > 0.30)) {
    errors.push({
      field: 'belt_coeff_piw',
      message: 'PIW should be between 0.05 and 0.30 lb/in',
      severity: 'error',
    });
  }

  if (inputs.belt_coeff_pil !== undefined && inputs.belt_coeff_pil <= 0) {
    errors.push({
      field: 'belt_coeff_pil',
      message: 'PIL must be > 0',
      severity: 'error',
    });
  }

  if (inputs.belt_coeff_pil !== undefined && (inputs.belt_coeff_pil < 0.05 || inputs.belt_coeff_pil > 0.30)) {
    errors.push({
      field: 'belt_coeff_pil',
      message: 'PIL should be between 0.05 and 0.30 lb/in',
      severity: 'error',
    });
  }

  if (inputs.starting_belt_pull_lb !== undefined && inputs.starting_belt_pull_lb < 0) {
    errors.push({
      field: 'starting_belt_pull_lb',
      message: 'Starting belt pull must be >= 0',
      severity: 'error',
    });
  }

  if (inputs.starting_belt_pull_lb !== undefined && inputs.starting_belt_pull_lb > 2000) {
    errors.push({
      field: 'starting_belt_pull_lb',
      message: 'Starting belt pull must be <= 2000',
      severity: 'error',
    });
  }

  if (inputs.friction_coeff !== undefined && inputs.friction_coeff < 0.05) {
    errors.push({
      field: 'friction_coeff',
      message: 'Friction coefficient must be >= 0.05',
      severity: 'error',
    });
  }

  if (inputs.friction_coeff !== undefined && inputs.friction_coeff > 0.6) {
    errors.push({
      field: 'friction_coeff',
      message: 'Friction coefficient must be <= 0.6',
      severity: 'error',
    });
  }

  if (inputs.motor_rpm !== undefined && inputs.motor_rpm < 800) {
    errors.push({
      field: 'motor_rpm',
      message: 'Motor RPM must be >= 800',
      severity: 'error',
    });
  }

  if (inputs.motor_rpm !== undefined && inputs.motor_rpm > 3600) {
    errors.push({
      field: 'motor_rpm',
      message: 'Motor RPM must be <= 3600',
      severity: 'error',
    });
  }

  // BELT TRACKING & PULLEY VALIDATION

  // V-guide profile required if V-guided
  // Accept EITHER v_guide_profile (legacy) OR v_guide_key (v1.22+)
  const isVGuided = inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
                    inputs.belt_tracking_method === 'V-guided';
  if (isVGuided && !inputs.v_guide_profile && !inputs.v_guide_key) {
    errors.push({
      field: 'v_guide_key',
      message: 'V-guide profile is required when belt tracking method is V-guided',
      severity: 'error',
    });
  }

  // v1.26: PU belt with V-guide missing PU data
  if (isVGuided && inputs.belt_family === 'PU' && inputs.v_guide_key) {
    // Check if V-guide has PU min pulley data
    if (inputs.vguide_min_pulley_dia_solid_pu_in == null) {
      errors.push({
        field: 'v_guide_key',
        message: 'Selected V-guide does not support PU belts. Choose a different V-guide or belt.',
        severity: 'error',
      });
    }
  }

  // Note: FLEECE belt with V-guide warning is in applyApplicationRules (not here)
  // since it's a non-blocking warning, not a validation error.

  // Manual shaft diameters required if manual mode
  const isManualShaft = inputs.shaft_diameter_mode === ShaftDiameterMode.Manual ||
                        inputs.shaft_diameter_mode === 'Manual';
  if (isManualShaft) {
    if (inputs.drive_shaft_diameter_in === undefined || inputs.drive_shaft_diameter_in <= 0) {
      errors.push({
        field: 'drive_shaft_diameter_in',
        message: 'Drive shaft diameter is required when shaft diameter mode is Manual',
        severity: 'error',
      });
    }
    if (inputs.tail_shaft_diameter_in === undefined || inputs.tail_shaft_diameter_in <= 0) {
      errors.push({
        field: 'tail_shaft_diameter_in',
        message: 'Tail shaft diameter is required when shaft diameter mode is Manual',
        severity: 'error',
      });
    }
  }

  // BELT PIW/PIL OVERRIDE VALIDATION (v1.3)
  if (inputs.belt_piw_override !== undefined && inputs.belt_piw_override <= 0) {
    errors.push({
      field: 'belt_piw_override',
      message: 'Belt PIW override must be > 0',
      severity: 'error',
    });
  }

  if (inputs.belt_piw_override !== undefined && (inputs.belt_piw_override < 0.05 || inputs.belt_piw_override > 0.30)) {
    errors.push({
      field: 'belt_piw_override',
      message: 'Belt PIW override should be between 0.05 and 0.30 lb/in',
      severity: 'error',
    });
  }

  if (inputs.belt_pil_override !== undefined && inputs.belt_pil_override <= 0) {
    errors.push({
      field: 'belt_pil_override',
      message: 'Belt PIL override must be > 0',
      severity: 'error',
    });
  }

  if (inputs.belt_pil_override !== undefined && (inputs.belt_pil_override < 0.05 || inputs.belt_pil_override > 0.30)) {
    errors.push({
      field: 'belt_pil_override',
      message: 'Belt PIL override should be between 0.05 and 0.30 lb/in',
      severity: 'error',
    });
  }

  // v1.48: Belt selection is REQUIRED (for belt conveyor products only)
  // Magnetic conveyors use chain/magnets, not belts - skip belt validation for them.
  // Belt is considered "selected" if PIW/PIL coefficients are explicitly provided
  // through any of these sources:
  //   1. belt_catalog_key (belt from catalog lookup)
  //   2. belt_piw_override + belt_pil_override (user manual override)
  //   3. belt_piw + belt_pil (from catalog when belt is selected)
  //   4. belt_coeff_piw + belt_coeff_pil (advanced parameter mode)
  if (requiresBeltValidation(productKey)) {
    const hasBeltSelection =
      (inputs.belt_catalog_key !== undefined && inputs.belt_catalog_key !== null) ||
      (inputs.belt_piw_override !== undefined && inputs.belt_pil_override !== undefined) ||
      (inputs.belt_piw !== undefined && inputs.belt_pil !== undefined) ||
      (inputs.belt_coeff_piw !== undefined && inputs.belt_coeff_pil !== undefined);

    if (!hasBeltSelection) {
      errors.push({
        field: 'belt_catalog_key',
        message: 'Belt selection is required. Please select a belt from the catalog or provide belt coefficients.',
      severity: 'error',
      });
    }
  }

  // Shaft diameter range validation
  if (inputs.drive_shaft_diameter_in !== undefined) {
    if (inputs.drive_shaft_diameter_in < 0.5) {
      errors.push({
        field: 'drive_shaft_diameter_in',
        message: 'Drive shaft diameter must be >= 0.5"',
        severity: 'error',
      });
    }
    if (inputs.drive_shaft_diameter_in > 4.0) {
      errors.push({
        field: 'drive_shaft_diameter_in',
        message: 'Drive shaft diameter must be <= 4.0"',
        severity: 'error',
      });
    }
  }

  if (inputs.tail_shaft_diameter_in !== undefined) {
    if (inputs.tail_shaft_diameter_in < 0.5) {
      errors.push({
        field: 'tail_shaft_diameter_in',
        message: 'Tail shaft diameter must be >= 0.5"',
        severity: 'error',
      });
    }
    if (inputs.tail_shaft_diameter_in > 4.0) {
      errors.push({
        field: 'tail_shaft_diameter_in',
        message: 'Tail shaft diameter must be <= 4.0"',
        severity: 'error',
      });
    }
  }

  // =========================================================================
  // v1.3/v1.24: CLEAT VALIDATION
  // v1.24: Derive cleat_height_in from cleat_size if not set
  // =========================================================================

  if (inputs.cleats_enabled) {
    // v1.24: Compute effective height (from input OR derived from cleat_size)
    const effectiveHeight = inputs.cleat_height_in ?? parseCleatHeightFromSize(inputs.cleat_size);

    // Cleat height required when enabled
    if (effectiveHeight === undefined || effectiveHeight <= 0) {
      errors.push({
        field: 'cleat_height_in',
        message: 'Cleat height is required when cleats are enabled (set via Size dropdown)',
        severity: 'error',
      });
    }

    // Cleat height range (0.5" - 6")
    if (effectiveHeight !== undefined) {
      if (effectiveHeight < 0.5) {
        errors.push({
          field: 'cleat_height_in',
          message: 'Cleat height must be >= 0.5"',
          severity: 'error',
        });
      }
      if (effectiveHeight > 6) {
        errors.push({
          field: 'cleat_height_in',
          message: 'Cleat height must be <= 6"',
          severity: 'error',
        });
      }
    }

    // Cleat spacing required when enabled
    if (inputs.cleat_spacing_in === undefined || inputs.cleat_spacing_in <= 0) {
      errors.push({
        field: 'cleat_spacing_in',
        message: 'Cleat spacing is required when cleats are enabled',
        severity: 'error',
      });
    }

    // Cleat spacing range (2" - 48")
    if (inputs.cleat_spacing_in !== undefined) {
      if (inputs.cleat_spacing_in < 2) {
        errors.push({
          field: 'cleat_spacing_in',
          message: 'Cleat spacing must be >= 2"',
          severity: 'error',
        });
      }
      if (inputs.cleat_spacing_in > 48) {
        errors.push({
          field: 'cleat_spacing_in',
          message: 'Cleat spacing must be <= 48"',
          severity: 'error',
        });
      }
    }

    // Cleat edge offset required when enabled
    if (inputs.cleat_edge_offset_in === undefined || inputs.cleat_edge_offset_in < 0) {
      errors.push({
        field: 'cleat_edge_offset_in',
        message: 'Cleat edge offset is required when cleats are enabled',
        severity: 'error',
      });
    }

    // Cleat edge offset range (0" - 12")
    if (inputs.cleat_edge_offset_in !== undefined) {
      if (inputs.cleat_edge_offset_in < 0) {
        errors.push({
          field: 'cleat_edge_offset_in',
          message: 'Cleat edge offset must be >= 0"',
          severity: 'error',
        });
      }
      if (inputs.cleat_edge_offset_in > 12) {
        errors.push({
          field: 'cleat_edge_offset_in',
          message: 'Cleat edge offset must be <= 12"',
          severity: 'error',
        });
      }
    }
  }

  // =========================================================================
  // v1.4: TOB VALUE VALIDATION (when present)
  // =========================================================================

  if (inputs.tail_tob_in !== undefined && inputs.tail_tob_in < 0) {
    errors.push({
      field: 'tail_tob_in',
      message: 'Tail TOB must be >= 0"',
      severity: 'error',
    });
  }

  if (inputs.drive_tob_in !== undefined && inputs.drive_tob_in < 0) {
    errors.push({
      field: 'drive_tob_in',
      message: 'Drive TOB must be >= 0"',
      severity: 'error',
    });
  }

  if (inputs.adjustment_required_in !== undefined && inputs.adjustment_required_in < 0) {
    errors.push({
      field: 'adjustment_required_in',
      message: 'Adjustment range must be >= 0"',
      severity: 'error',
    });
  }

  // =========================================================================
  // v1.40: UNIFIED SUPPORT METHOD & MODEL SELECTION VALIDATION
  // =========================================================================

  const floorSupported = isFloorSupported(inputs.support_method);
  const includeLegs = inputs.include_legs === true;
  const includeCasters = inputs.include_casters === true;

  // v1.40: TOB required when floor supported (regardless of legs/casters)
  if (floorSupported) {
    // Check for reference TOB based on reference_end
    const referenceEnd = inputs.reference_end ?? 'tail';
    const referenceTob = referenceEnd === 'tail' ? inputs.tail_tob_in : inputs.drive_tob_in;

    if (referenceTob === undefined) {
      errors.push({
        field: referenceEnd === 'tail' ? 'tail_tob_in' : 'drive_tob_in',
        message: 'Top of Belt (TOB) is required when conveyor is floor supported',
        severity: 'error',
      });
    }
  }

  // Leg model required when include_legs=true
  if (floorSupported && includeLegs) {
    if (!inputs.leg_model_key) {
      errors.push({
        field: 'leg_model_key',
        message: 'Leg model selection is required when legs are included',
        severity: 'error',
      });
    }
  }

  // Caster configuration validation when include_casters=true
  if (floorSupported && includeCasters) {
    const rigidQty = inputs.caster_rigid_qty ?? 0;
    const swivelQty = inputs.caster_swivel_qty ?? 0;
    const totalCasters = rigidQty + swivelQty;

    // At least one caster required
    if (totalCasters === 0) {
      errors.push({
        field: 'caster_rigid_qty',
        message: 'At least one caster (rigid or swivel) is required when casters are included',
        severity: 'error',
      });
    }

    // Model required when qty > 0
    if (rigidQty > 0 && !inputs.caster_rigid_model_key) {
      errors.push({
        field: 'caster_rigid_model_key',
        message: 'Rigid caster model is required when rigid quantity is greater than 0',
        severity: 'error',
      });
    }

    if (swivelQty > 0 && !inputs.caster_swivel_model_key) {
      errors.push({
        field: 'caster_swivel_model_key',
        message: 'Swivel caster model is required when swivel quantity is greater than 0',
        severity: 'error',
      });
    }
  }

  // Legacy support: also validate if using old support_method values ('legs' or 'casters')
  const supportMethodValue = inputs.support_method;
  const isLegacyLegs = supportMethodValue === 'legs' || supportMethodValue === SupportMethod.Legs;
  const isLegacyCasters = supportMethodValue === 'casters' || supportMethodValue === SupportMethod.Casters;

  if (isLegacyLegs && !inputs.leg_model_key) {
    // Only add error if not already added above
    if (!includeLegs) {
      errors.push({
        field: 'leg_model_key',
        message: 'Leg model selection is required when using floor-standing legs',
        severity: 'error',
      });
    }
  }

  if (isLegacyCasters && !includeCasters) {
    const rigidQty = inputs.caster_rigid_qty ?? 0;
    const swivelQty = inputs.caster_swivel_qty ?? 0;
    const totalCasters = rigidQty + swivelQty;

    if (totalCasters === 0) {
      errors.push({
        field: 'caster_rigid_qty',
        message: 'At least one caster (rigid or swivel) is required when using casters',
        severity: 'error',
      });
    }

    // Model required when qty > 0 (legacy validation)
    if (rigidQty > 0 && !inputs.caster_rigid_model_key) {
      errors.push({
        field: 'caster_rigid_model_key',
        message: 'Rigid caster model is required when rigid quantity is greater than 0',
        severity: 'error',
      });
    }

    if (swivelQty > 0 && !inputs.caster_swivel_model_key) {
      errors.push({
        field: 'caster_swivel_model_key',
        message: 'Swivel caster model is required when swivel quantity is greater than 0',
        severity: 'error',
      });
    }
  }

  // =========================================================================
  // v1.5: FRAME HEIGHT VALIDATION
  // =========================================================================

  // Custom frame height required when mode is Custom
  const isCustomFrameHeight = inputs.frame_height_mode === FrameHeightMode.Custom ||
                               inputs.frame_height_mode === 'Custom';
  if (isCustomFrameHeight) {
    if (inputs.custom_frame_height_in === undefined) {
      errors.push({
        field: 'custom_frame_height_in',
        message: 'Custom frame height is required when frame height mode is Custom',
        severity: 'error',
      });
    } else if (inputs.custom_frame_height_in < FRAME_HEIGHT_CONSTANTS.MIN_FRAME_HEIGHT_IN) {
      errors.push({
        field: 'custom_frame_height_in',
        message: `Custom frame height must be >= ${FRAME_HEIGHT_CONSTANTS.MIN_FRAME_HEIGHT_IN}"`,
        severity: 'error',
      });
    }
  }

  // Custom frame height range validation (when provided)
  if (inputs.custom_frame_height_in !== undefined) {
    if (inputs.custom_frame_height_in <= 0) {
      errors.push({
        field: 'custom_frame_height_in',
        message: 'Custom frame height must be > 0"',
        severity: 'error',
      });
    }
  }

  // =========================================================================
  // v1.14: FRAME CONSTRUCTION VALIDATION
  // =========================================================================

  // Only validate frame construction fields when explicitly set
  // This maintains backward compatibility with legacy configs
  const frameConstructionType = inputs.frame_construction_type;

  // Sheet metal gauge required when construction type is explicitly set to sheet_metal
  if (frameConstructionType === 'sheet_metal') {
    if (!inputs.frame_sheet_metal_gauge) {
      errors.push({
        field: 'frame_sheet_metal_gauge',
        message: 'Sheet metal gauge is required when frame construction type is Sheet Metal',
        severity: 'error',
      });
    }
  }

  // Structural channel series required when construction type is structural_channel
  if (frameConstructionType === 'structural_channel') {
    if (!inputs.frame_structural_channel_series) {
      errors.push({
        field: 'frame_structural_channel_series',
        message: 'Channel series is required when frame construction type is Structural Channel',
        severity: 'error',
      });
    }
  }

  // Pulley end to frame inside distance validation
  if (inputs.pulley_end_to_frame_inside_in !== undefined) {
    if (inputs.pulley_end_to_frame_inside_in < 0) {
      errors.push({
        field: 'pulley_end_to_frame_inside_in',
        message: 'Pulley end to frame inside distance must be >= 0"',
        severity: 'error',
      });
    }
    if (inputs.pulley_end_to_frame_inside_in > 6) {
      errors.push({
        field: 'pulley_end_to_frame_inside_in',
        message: 'Pulley end to frame inside distance must be <= 6" (unusually large value)',
        severity: 'error',
      });
    }
  }

  return errors;
}

// ============================================================================
// PARAMETER VALIDATION
// ============================================================================

export function validateParameters(parameters: SliderbedParameters): ValidationError[] {
  const errors: ValidationError[] = [];

  if (parameters.friction_coeff < 0.1 || parameters.friction_coeff > 1.0) {
    errors.push({
      field: 'friction_coeff',
      message: 'Friction coefficient must be between 0.1 and 1.0',
      severity: 'error',
    });
  }

  if (parameters.safety_factor < 1.0) {
    errors.push({
      field: 'safety_factor',
      message: 'Safety factor must be >= 1.0',
      severity: 'error',
    });
  }

  if (parameters.starting_belt_pull_lb < 0) {
    errors.push({
      field: 'starting_belt_pull_lb',
      message: 'Starting belt pull must be >= 0',
      severity: 'error',
    });
  }

  if (parameters.motor_rpm <= 0) {
    errors.push({
      field: 'motor_rpm',
      message: 'Motor RPM must be greater than 0',
      severity: 'error',
    });
  }

  if (parameters.gravity_in_per_s2 <= 0) {
    errors.push({
      field: 'gravity_in_per_s2',
      message: 'Gravity constant must be greater than 0',
      severity: 'error',
    });
  }

  return errors;
}

// ============================================================================
// APPLICATION RULES (ERRORS, WARNINGS, INFO)
// ============================================================================

export function applyApplicationRules(
  inputs: SliderbedInputs
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // v1.48: Material form check for conditional validation
  const materialForm = inputs.material_form as MaterialForm | string | undefined;
  const isPartsMode = materialForm === MaterialForm.Parts || materialForm === 'PARTS';

  // HARD ERROR: Red hot parts
  if (inputs.part_temperature_class === 'RED_HOT' || inputs.part_temperature_class === PartTemperatureClass.RedHot) {
    errors.push({
      field: 'part_temperature_class',
      message: 'Do not use sliderbed conveyor for red hot parts',
      severity: 'error',
    });
  }

  // WARNING: Considerable oil/liquid
  if (inputs.fluid_type === 'CONSIDERABLE' || inputs.fluid_type === FluidType.ConsiderableOilLiquid) {
    warnings.push({
      field: 'fluid_type',
      message: 'Consider ribbed or specialty belt',
      severity: 'warning',
    });
  }

  // WARNING: Long conveyor
  if (inputs.conveyor_length_cc_in > 120) {
    warnings.push({
      field: 'conveyor_length_cc_in',
      message: 'Consider multi-section body',
      severity: 'warning',
    });
  }

  // WARNING: Hot parts
  if (inputs.part_temperature_class === 'HOT' || inputs.part_temperature_class === PartTemperatureClass.Hot) {
    warnings.push({
      field: 'part_temperature_class',
      message: 'Consider high-temperature belt',
      severity: 'warning',
    });
  }

  // INFO: Minimal residual oil
  if (inputs.fluid_type === 'MINIMAL' || inputs.fluid_type === FluidType.MinimalResidualOil) {
    warnings.push({
      field: 'fluid_type',
      message: 'Minimal residual oil present',
      severity: 'info',
    });
  }

  // DROP HEIGHT WARNING
  if (inputs.drop_height_in >= 24) {
    warnings.push({
      field: 'drop_height_in',
      message: 'Drop height is high. Consider impact or wear protection.',
      severity: 'warning',
    });
  }

  // INCLINE WARNINGS
  const inclineDeg = inputs.conveyor_incline_deg ?? 0;

  // ERROR: Incline > 45°
  if (inclineDeg > 45) {
    errors.push({
      field: 'conveyor_incline_deg',
      message: 'Incline exceeds 45°. Sliderbed conveyor without positive engagement is not supported by this model.',
      severity: 'error',
    });
  }

  // STRONG WARNING: Incline > 35°
  if (inclineDeg > 35 && inclineDeg <= 45) {
    warnings.push({
      field: 'conveyor_incline_deg',
      message: 'Incline exceeds 35°. Product retention by friction alone is unlikely. Cleats or positive engagement features are required for reliable operation.',
      severity: 'warning',
    });
  }

  // WARNING: Incline > 20°
  if (inclineDeg > 20 && inclineDeg <= 35) {
    warnings.push({
      field: 'conveyor_incline_deg',
      message: 'Incline exceeds 20°. Product retention by friction alone may be insufficient. Cleats or other retention features are typically required at this angle.',
      severity: 'warning',
    });
  }

  // =========================================================================
  // v1.29: BULK MODE WARNINGS
  // =========================================================================

  // v1.48: materialForm already declared at function top, just compute isBulkMode
  const isBulkMode = materialForm === MaterialForm.Bulk || materialForm === 'BULK';

  if (isBulkMode) {
    // ASSUMED_CLASS density warning
    if (inputs.density_source === DensitySource.AssumedClass || inputs.density_source === 'ASSUMED_CLASS') {
      warnings.push({
        field: 'density_lbs_per_ft3',
        message: 'Density assumed from material class. Verify for accuracy.',
        severity: 'warning',
      });
    }

    // v1.31: Lump size validation - smallest must be <= largest if both provided
    const smallestLump = inputs.smallest_lump_size_in;
    const largestLump = inputs.largest_lump_size_in ?? inputs.max_lump_size_in; // fallback to legacy

    if (smallestLump !== undefined && smallestLump < 0) {
      errors.push({
        field: 'smallest_lump_size_in',
        message: 'Smallest lump size must be >= 0',
        severity: 'error',
      });
    }

    if (largestLump !== undefined && largestLump < 0) {
      errors.push({
        field: 'largest_lump_size_in',
        message: 'Largest lump size must be >= 0',
        severity: 'error',
      });
    }

    if (smallestLump !== undefined && largestLump !== undefined && smallestLump > largestLump) {
      errors.push({
        field: 'smallest_lump_size_in',
        message: `Smallest lump size (${smallestLump}") cannot exceed largest lump size (${largestLump}")`,
        severity: 'error',
      });
    }

    // Largest lump size warning (if provided) - check against belt width
    if (largestLump !== undefined && largestLump > 0) {
      const beltWidthIn = inputs.belt_width_in ?? 0;
      const lumpThreshold = beltWidthIn * 0.8;
      if (largestLump > lumpThreshold) {
        warnings.push({
          field: 'largest_lump_size_in',
          message: `Largest lump size (${largestLump}") exceeds 80% of belt width (${lumpThreshold.toFixed(1)}"). Consider wider belt or material screening.`,
          severity: 'warning',
        });
      }
    }

    // =========================================================================
    // v1.32: FEED BEHAVIOR & SURGE VALIDATION
    // =========================================================================

    const feedBehavior = inputs.feed_behavior as FeedBehavior | string | undefined;
    const isSurge = feedBehavior === FeedBehavior.Surge || feedBehavior === 'SURGE';

    // Surge multiplier validation (only when surge is selected)
    if (isSurge) {
      if (inputs.surge_multiplier !== undefined && inputs.surge_multiplier < 1.0) {
        errors.push({
          field: 'surge_multiplier',
          message: 'Surge multiplier must be >= 1.0 (peak cannot be less than average)',
          severity: 'error',
        });
      }
      // Warn if surge is selected but multiplier is not provided
      if (inputs.surge_multiplier === undefined) {
        warnings.push({
          field: 'surge_multiplier',
          message: 'Surge feed selected but no surge multiplier specified. Default of 1.5x will be assumed.',
          severity: 'warning',
        });
      }
    }

    // v1.32: Warn if weight flow mode has no density (optional but encouraged)
    const bulkMethod = inputs.bulk_input_method as BulkInputMethod | string | undefined;
    const isWeightFlow = bulkMethod === BulkInputMethod.WeightFlow || bulkMethod === 'WEIGHT_FLOW';
    if (isWeightFlow && inputs.density_lbs_per_ft3 === undefined) {
      warnings.push({
        field: 'density_lbs_per_ft3',
        message: 'Bulk density not provided. Specify for more accurate belt loading analysis.',
        severity: 'warning',
      });
    }
  }

  // =========================================================================
  // v1.3: PULLEY DIAMETER WARNINGS
  // =========================================================================

  // v1.24: Removed outdated pulley diameter warnings:
  // - "Different diameters" warning (valid in our system, no value)
  // - "Non-standard diameter" info (catalog now defines valid options)

  // v1.28: Use getEffectivePulleyDiameters for consistent resolution with formulas.ts
  // This ensures frame height, snub roller checks, etc. use the same pulley values
  // as the calculation engine, avoiding false positives from stale legacy fields.
  const { effectiveDrivePulleyDiameterIn, effectiveTailPulleyDiameterIn } =
    getEffectivePulleyDiameters(inputs);
  const drivePulley = effectiveDrivePulleyDiameterIn;
  const tailPulley = effectiveTailPulleyDiameterIn;

  // =========================================================================
  // v1.11: BELT MINIMUM PULLEY DIAMETER WARNINGS
  // =========================================================================

  // Determine tracking method and minimum required diameter from belt
  const isVGuided =
    inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
    inputs.belt_tracking_method === 'V-guided';
  const minPulleyRequired = isVGuided
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;

  // v1.27: FLEECE belt with V-guide - no V-guide rules defined (warning, non-blocking)
  if (isVGuided && inputs.belt_family === 'FLEECE' && inputs.v_guide_key) {
    warnings.push({
      field: 'v_guide_key',
      message: 'V-guide pulley rules not defined for FLEECE belt family. Min pulley constraint from V-guide will not be applied.',
      severity: 'warning',
    });
  }

  // Only warn if belt has a minimum requirement (belt is selected)
  if (minPulleyRequired !== undefined) {
    const trackingType = isVGuided ? 'V-guided' : 'crowned';

    // Check drive pulley
    if (drivePulley !== undefined && drivePulley < minPulleyRequired) {
      warnings.push({
        field: 'drive_pulley_diameter_in',
        message: `Drive pulley (${drivePulley}") is below belt minimum (${minPulleyRequired}" for ${trackingType} tracking). Belt may not track properly or could be damaged.`,
        severity: 'warning',
      });
    }

    // v1.16: Check tail pulley independently (always)
    if (tailPulley !== undefined && tailPulley < minPulleyRequired) {
      warnings.push({
        field: 'tail_pulley_diameter_in',
        message: `Tail pulley (${tailPulley}") is below belt minimum (${minPulleyRequired}" for ${trackingType} tracking). Belt may not track properly or could be damaged.`,
        severity: 'warning',
      });
    }
  }

  // =========================================================================
  // v1.3: CLEAT WARNINGS
  // =========================================================================

  // Cleats on high incline
  if (inputs.cleats_enabled && inclineDeg > 20) {
    // This is good - cleats are appropriate for high inclines
    // No warning needed, but we could add an info message if desired
  }

  // High incline WITHOUT cleats (already covered above in incline warnings)
  // Just reinforce: if incline > 20° and no cleats, already warned

  // Cleat spacing vs part size (v1.48: only check if part dimensions are set)
  if (inputs.cleats_enabled && inputs.cleat_spacing_in !== undefined && isPartsMode) {
    const travelDim = inputs.orientation === 'Lengthwise' ? inputs.part_length_in : inputs.part_width_in;
    if (travelDim !== undefined && inputs.cleat_spacing_in < travelDim) {
      warnings.push({
        field: 'cleat_spacing_in',
        message: `Cleat spacing (${inputs.cleat_spacing_in}") is less than part travel dimension (${travelDim}"). Parts may not fit between cleats.`,
        severity: 'warning',
      });
    }
  }

  // Cleat edge offset vs belt width
  if (inputs.cleats_enabled && inputs.cleat_edge_offset_in !== undefined) {
    const maxOffset = inputs.belt_width_in / 2;
    if (inputs.cleat_edge_offset_in > maxOffset) {
      warnings.push({
        field: 'cleat_edge_offset_in',
        message: `Cleat edge offset (${inputs.cleat_edge_offset_in}") exceeds half of belt width (${maxOffset}"). Cleats would overlap.`,
        severity: 'warning',
      });
    }
  }

  // =========================================================================
  // FEATURES & OPTIONS WARNINGS
  // =========================================================================

  // FINGER SAFE + END GUARDS
  if (inputs.finger_safe && inputs.end_guards === EndGuards.None) {
    warnings.push({
      field: 'end_guards',
      message: 'Finger safety may require end guards depending on layout.',
      severity: 'warning',
    });
  }

  // FINGER SAFE + BOTTOM COVERS
  if (inputs.finger_safe && !inputs.bottom_covers) {
    warnings.push({
      field: 'bottom_covers',
      message: 'Bottom covers may be required to achieve finger-safe access underneath.',
      severity: 'warning',
    });
  }

  // CLIPPER LACING + END GUARDS
  if (inputs.lacing_style === LacingStyle.ClipperLacing) {
    warnings.push({
      field: 'lacing_style',
      message: 'Clipper lacing may interfere with end guards due to protrusion.',
      severity: 'warning',
    });
  }

  // MAGNETIZED BED + LACING MATERIAL (future: check bed_type when added)
  // For now, skip magnetized bed check since bed_type field doesn't exist yet

  // =========================================================================
  // BELT SELECTION VALIDATION
  // v1.24: Changed from hard errors to warnings (NON-BLOCKING)
  // =========================================================================

  // Pulley diameter vs belt minimum (v1.3: check both drive and tail)
  // v1.24: Changed to warnings only - not hard stops
  if (inputs.belt_catalog_key) {
    const isVGuidedBelt = inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
                          inputs.belt_tracking_method === 'V-guided';
    const minPulleyDia = isVGuidedBelt
      ? inputs.belt_min_pulley_dia_with_vguide_in
      : inputs.belt_min_pulley_dia_no_vguide_in;

    // v1.3/v1.24: Check drive pulley (WARNING only)
    if (minPulleyDia !== undefined && drivePulley !== undefined && drivePulley < minPulleyDia) {
      warnings.push({
        field: 'drive_pulley_diameter_in',
        message: `Drive pulley diameter (${drivePulley}") is below the belt minimum (${minPulleyDia}" for ${isVGuidedBelt ? 'V-guided' : 'crowned'} tracking). This may cause belt damage or tracking issues.`,
        severity: 'warning',
      });
    }

    // v1.3/v1.24: Check tail pulley (WARNING only)
    if (minPulleyDia !== undefined && tailPulley !== undefined && tailPulley < minPulleyDia) {
      warnings.push({
        field: 'tail_pulley_diameter_in',
        message: `Tail pulley diameter (${tailPulley}") is below the belt minimum (${minPulleyDia}" for ${isVGuidedBelt ? 'V-guided' : 'crowned'} tracking). This may cause belt damage or tracking issues.`,
        severity: 'warning',
      });
    }
  }

  // =========================================================================
  // v1.15-v1.17: PULLEY CATALOG SELECTION (REMOVED in v1.24)
  // Legacy catalog validation removed - pulleys now configured via application_pulleys table
  // =========================================================================

  // =========================================================================
  // APPLICATION / DEMAND WARNINGS
  // =========================================================================

  // START/STOP + SHORT CYCLE TIME
  if (inputs.start_stop_application && inputs.cycle_time_seconds !== undefined && inputs.cycle_time_seconds < 10) {
    warnings.push({
      field: 'cycle_time_seconds',
      message: 'Frequent start/stop applications may require a higher-duty gearbox.',
      severity: 'warning',
    });
  }

  // SIDE LOADING SEVERITY - moderate/heavy without V-guide
  // Note: V-guide field doesn't exist yet, so we just warn about severity
  const severity = inputs.side_loading_severity;
  if (inputs.side_loading_direction !== SideLoadingDirection.None) {
    if (severity === SideLoadingSeverity.Heavy) {
      warnings.push({
        field: 'side_loading_severity',
        message: 'Heavy side loading typically requires a V-guide for reliable tracking.',
        severity: 'warning',
      });
    } else if (severity === SideLoadingSeverity.Moderate) {
      warnings.push({
        field: 'side_loading_severity',
        message: 'Moderate side loading may require a V-guide for reliable tracking.',
        severity: 'warning',
      });
    }
  }

  // =========================================================================
  // v1.5: FRAME HEIGHT WARNINGS
  // =========================================================================

  const effectiveFrameHeight = calculateEffectiveFrameHeight(
    inputs.frame_height_mode,
    drivePulley ?? 4, // Default pulley diameter if not set
    inputs.custom_frame_height_in
  );

  // Design review warning for low frame heights
  if (effectiveFrameHeight < FRAME_HEIGHT_CONSTANTS.DESIGN_REVIEW_THRESHOLD_IN) {
    warnings.push({
      field: 'frame_height_mode',
      message: `Frame height (${effectiveFrameHeight.toFixed(1)}") is below ${FRAME_HEIGHT_CONSTANTS.DESIGN_REVIEW_THRESHOLD_IN}". Design review required.`,
      severity: 'warning',
    });
  }

  // Snub roller requirement info
  // v1.5 FIX: Use largest pulley + 2.5" threshold
  const largestPulley = Math.max(drivePulley ?? 4, tailPulley ?? 4);
  const snubThreshold = largestPulley + SNUB_ROLLER_CLEARANCE_THRESHOLD_IN;
  const requiresSnubRollers = calculateRequiresSnubRollers(effectiveFrameHeight, drivePulley ?? 4, tailPulley ?? 4);
  if (requiresSnubRollers) {
    warnings.push({
      field: 'frame_height_mode',
      message: `Frame height (${effectiveFrameHeight.toFixed(1)}") is below snub roller threshold (${snubThreshold.toFixed(1)}"). Snub rollers will be required at pulley ends.`,
      severity: 'info',
    });
  }

  // =========================================================================
  // v1.29: RETURN SUPPORT VALIDATION
  // Uses explicit user configuration instead of frame-height-derived logic
  // =========================================================================

  const returnSnubsEnabled = calculateReturnSnubsEnabled(
    inputs.return_frame_style,
    inputs.return_snub_mode
  );
  const returnEndOffsetIn = inputs.return_end_offset_in ?? DEFAULT_RETURN_END_OFFSET_IN;
  const returnSpanIn = calculateReturnSpan(
    inputs.conveyor_length_cc_in,
    returnSnubsEnabled,
    returnEndOffsetIn
  );
  const returnGravityRollerCount =
    inputs.return_gravity_roller_count ??
    calculateDefaultGravityRollerCount(returnSpanIn);
  const returnGravityRollerCentersIn = calculateGravityRollerCenters(
    returnSpanIn,
    returnGravityRollerCount
  );

  // v1.37: Cleats + Snub rollers warning (allowed but warn)
  // Cleats can interfere with snub wrap - user should verify clearance
  // Uses explicit returnSnubsEnabled (user selection) instead of frame-height-derived
  const cleatsEnabled = inputs.cleats_enabled === true || inputs.cleats_mode === 'cleated';
  if (cleatsEnabled && returnSnubsEnabled) {
    // Warning in Return Support section
    warnings.push({
      field: 'return_snub_mode',
      message: 'Snub rollers with cleats: Cleats can interfere with snub wrap and may cause noise, wear, or belt damage. Verify clearance and snub diameter.',
      severity: 'warning',
    });
  }

  // v1.29: Low Profile without Snubs warning
  // When user explicitly disables snubs on Low Profile, warn that this may cause belt sag
  const returnFrameStyle = inputs.return_frame_style ?? ReturnFrameStyle.Standard;
  const returnSnubMode = inputs.return_snub_mode ?? ReturnSnubMode.Auto;
  if (
    (returnFrameStyle === ReturnFrameStyle.LowProfile || returnFrameStyle === 'LOW_PROFILE') &&
    (returnSnubMode === ReturnSnubMode.No || returnSnubMode === 'NO')
  ) {
    warnings.push({
      field: 'return_snub_mode',
      message: 'Low Profile frame without snub rollers may cause belt sag at pulley ends. Consider enabling snub rollers.',
      severity: 'warning',
    });
  }

  // v1.29: Gravity roller centers warnings
  if (returnGravityRollerCentersIn !== null) {
    if (returnGravityRollerCentersIn > 72) {
      warnings.push({
        field: 'return_gravity_roller_count',
        message: `Gravity roller spacing (${returnGravityRollerCentersIn.toFixed(1)}") exceeds 72". Belt may sag between rollers. Consider adding more rollers.`,
        severity: 'warning',
      });
    }
    if (returnGravityRollerCentersIn < 24) {
      warnings.push({
        field: 'return_gravity_roller_count',
        message: `Gravity roller spacing (${returnGravityRollerCentersIn.toFixed(1)}") is less than 24". This may be over-engineered.`,
        severity: 'info',
      });
    }
  }

  // v1.29: End offset soft warning (outside 6-60 in range)
  if (returnEndOffsetIn < 6) {
    warnings.push({
      field: 'return_end_offset_in',
      message: `End offset (${returnEndOffsetIn.toFixed(1)}") is less than 6". Rollers may be too close to pulley.`,
      severity: 'warning',
    });
  }
  if (returnEndOffsetIn > 60) {
    warnings.push({
      field: 'return_end_offset_in',
      message: `End offset (${returnEndOffsetIn.toFixed(1)}") exceeds 60". Consider reducing to avoid excessive unsupported span near pulleys.`,
      severity: 'warning',
    });
  }

  // Low profile mode info (legacy frame height)
  const frameHeightMode = inputs.frame_height_mode ?? FrameHeightMode.Standard;
  if (frameHeightMode === FrameHeightMode.LowProfile || frameHeightMode === 'Low Profile') {
    warnings.push({
      field: 'frame_height_mode',
      message: 'Low profile frame selected. This is a cost option.',
      severity: 'info',
    });
  }

  // Custom frame mode info
  if (frameHeightMode === FrameHeightMode.Custom || frameHeightMode === 'Custom') {
    warnings.push({
      field: 'frame_height_mode',
      message: 'Custom frame height selected. This is a cost option.',
      severity: 'info',
    });
  }

  // v1.33: Cleat height contribution to frame height
  const cleatsEnabledForFrame = inputs.cleats_enabled === true;
  const effectiveCleatHeightForWarning = getEffectiveCleatHeight(
    cleatsEnabledForFrame,
    inputs.cleat_height_in,
    inputs.cleat_size
  );
  if (effectiveCleatHeightForWarning > 0) {
    warnings.push({
      field: 'frame_height_mode',
      message: `Frame height includes 2 × cleat height (carry + return): 2 × ${effectiveCleatHeightForWarning.toFixed(2)}" = ${(2 * effectiveCleatHeightForWarning).toFixed(2)}"`,
      severity: 'info',
    });
  }

  // v1.35: Low Profile + cleats = HARD ERROR
  // Low Profile requires snub rollers, and cleated belts cannot run on snubs.
  // This is a hard invalid configuration, not just a warning.
  if (
    (frameHeightMode === FrameHeightMode.LowProfile || frameHeightMode === 'Low Profile') &&
    effectiveCleatHeightForWarning > 0
  ) {
    // v1.36: This is a hard error, not a warning - add to errors array instead
    errors.push({
      field: 'frame_height_mode',
      message: 'Low Profile not compatible with cleats. Low Profile requires snub rollers, and cleated belts cannot run on snubs. Choose Standard or Custom frame standard.',
      severity: 'error',
    });
  }

  // =========================================================================
  // v1.7: SPROCKET WARNINGS
  // =========================================================================

  const mountingStyleWarning = inputs.gearmotor_mounting_style ?? GearmotorMountingStyle.ShaftMounted;
  const isBottomMountWarning = mountingStyleWarning === GearmotorMountingStyle.BottomMount || mountingStyleWarning === 'bottom_mount';

  if (isBottomMountWarning) {
    const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
    const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;

    // Calculate chain ratio for warnings
    if (gmTeeth > 0 && driveTeeth > 0) {
      const chainRatio = driveTeeth / gmTeeth;

      // Extreme ratio warnings
      if (chainRatio < 0.5) {
        warnings.push({
          field: 'gm_sprocket_teeth',
          message: `Chain ratio (${chainRatio.toFixed(3)}) is below 0.5. This is an unusual speed-up configuration.`,
          severity: 'warning',
        });
      }
      if (chainRatio > 3.0) {
        warnings.push({
          field: 'drive_shaft_sprocket_teeth',
          message: `Chain ratio (${chainRatio.toFixed(3)}) exceeds 3.0. Consider using a higher gearbox ratio instead.`,
          severity: 'warning',
        });
      }
    }

    // Small sprocket warnings
    if (gmTeeth > 0 && gmTeeth < 12) {
      warnings.push({
        field: 'gm_sprocket_teeth',
        message: `Gearmotor sprocket (${gmTeeth}T) is smaller than recommended minimum (12T). This may cause accelerated wear.`,
        severity: 'warning',
      });
    }
    if (driveTeeth > 0 && driveTeeth < 12) {
      warnings.push({
        field: 'drive_shaft_sprocket_teeth',
        message: `Drive shaft sprocket (${driveTeeth}T) is smaller than recommended minimum (12T). This may cause accelerated wear.`,
        severity: 'warning',
      });
    }
  }

  // =========================================================================
  // v1.6: SPEED MODE WARNINGS
  // =========================================================================

  // High belt speed warning
  if (inputs.belt_speed_fpm > 300) {
    warnings.push({
      field: 'belt_speed_fpm',
      message: `Belt speed (${inputs.belt_speed_fpm} FPM) exceeds 300 FPM. Verify this is intentional for the application.`,
      severity: 'warning',
    });
  }

  // Calculate implied gear ratio for warning check
  const speedModeWarning = inputs.speed_mode ?? SpeedMode.BeltSpeed;
  const isBeltSpeedModeWarning = speedModeWarning === SpeedMode.BeltSpeed || speedModeWarning === 'belt_speed';
  const motorRpmWarning = inputs.motor_rpm ?? 1750;

  let impliedGearRatio: number | undefined;
  if (drivePulley && drivePulley > 0) {
    if (isBeltSpeedModeWarning && inputs.belt_speed_fpm > 0) {
      // Calculate drive RPM from belt speed
      const driveRpmCalc = inputs.belt_speed_fpm * 12 / (Math.PI * drivePulley);
      impliedGearRatio = motorRpmWarning / driveRpmCalc;
    } else if (!isBeltSpeedModeWarning) {
      const driveRpmInput = inputs.drive_rpm_input ?? inputs.drive_rpm;
      if (driveRpmInput > 0) {
        impliedGearRatio = motorRpmWarning / driveRpmInput;
      }
    }
  }

  // Gear ratio warnings
  if (impliedGearRatio !== undefined) {
    if (impliedGearRatio < 5) {
      warnings.push({
        field: 'belt_speed_fpm',
        message: `Calculated gear ratio (${impliedGearRatio.toFixed(2)}) is below 5. This may require a special gearbox.`,
        severity: 'warning',
      });
    }
    if (impliedGearRatio > 60) {
      warnings.push({
        field: 'belt_speed_fpm',
        message: `Calculated gear ratio (${impliedGearRatio.toFixed(2)}) exceeds 60. This may require multiple reduction stages.`,
        severity: 'warning',
      });
    }
  }

  return { errors, warnings };
}

// ============================================================================
// v1.40: TOB VALIDATION (DRAFT VS COMMIT MODE)
// ============================================================================

/**
 * Validate TOB fields based on validation mode.
 *
 * - draft mode: Lenient - allows missing TOB
 * - commit mode: Strict - requires TOB based on reference_end
 *
 * @param inputs - The inputs to validate
 * @param mode - 'draft' (lenient) or 'commit' (strict)
 */
export function validateTob(
  inputs: SliderbedInputs,
  mode: ValidationMode
): ValidationError[] {
  const errors: ValidationError[] = [];
  const floorSupported = isFloorSupported(inputs.support_method);
  const usingHtobGeometry = inputs.geometry_mode === GeometryMode.HorizontalTob;

  // TOB validation only applies when floor supported or using H_TOB geometry
  if (!floorSupported && !usingHtobGeometry) {
    return errors;
  }

  // In draft mode, allow missing TOB
  if (mode === 'draft') {
    return errors;
  }

  // Commit mode: validate based on reference_end
  // H_TOB mode requires both TOBs
  if (usingHtobGeometry) {
    if (inputs.tail_tob_in === undefined) {
      errors.push({
        field: 'tail_tob_in',
        message: 'Tail TOB is required in H_TOB geometry mode',
        severity: 'error',
      });
    }
    if (inputs.drive_tob_in === undefined) {
      errors.push({
        field: 'drive_tob_in',
        message: 'Drive TOB is required in H_TOB geometry mode',
        severity: 'error',
      });
    }
  } else if (floorSupported) {
    // Floor supported: require reference TOB based on reference_end
    const referenceEnd = inputs.reference_end ?? 'tail';

    if (referenceEnd === 'tail') {
      if (inputs.tail_tob_in === undefined) {
        errors.push({
          field: 'tail_tob_in',
          message: 'Tail TOB is required when reference end is tail',
          severity: 'error',
        });
      }
    } else {
      if (inputs.drive_tob_in === undefined) {
        errors.push({
          field: 'drive_tob_in',
          message: 'Drive TOB is required when reference end is drive',
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

/**
 * Apply height/support warnings.
 * Called as part of applyApplicationRules.
 */
function applyHeightWarnings(inputs: SliderbedInputs): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const floorSupported = isFloorSupported(inputs.support_method);

  if (!floorSupported) {
    return warnings;
  }

  // Adjustment range warnings
  if (inputs.adjustment_required_in !== undefined) {
    if (inputs.adjustment_required_in > 12) {
      warnings.push({
        field: 'adjustment_required_in',
        message: `Very large adjustment range (${inputs.adjustment_required_in}") — verify leg feasibility`,
        severity: 'warning',
      });
    } else if (inputs.adjustment_required_in > 6) {
      warnings.push({
        field: 'adjustment_required_in',
        message: `Large adjustment range (${inputs.adjustment_required_in}") may require special leg design`,
        severity: 'info',
      });
    }
  }

  // v1.10: Angle mismatch warning - uses corrected geometry calculation
  // Only show in L_ANGLE or H_ANGLE modes when both TOBs are known
  // In H_TOB mode, the angle IS derived from TOBs, so no mismatch is possible
  const geometryMode = inputs.geometry_mode ?? GeometryMode.LengthAngle;
  const conveyorInclineDeg = inputs.conveyor_incline_deg ?? 0;

  if (geometryMode !== GeometryMode.HorizontalTob &&
      inputs.tail_tob_in !== undefined &&
      inputs.drive_tob_in !== undefined) {
    // Get pulley diameters for accurate centerline calculation
    const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;
    const tailPulleyDia = inputs.tail_pulley_diameter_in ?? inputs.pulley_diameter_in ?? drivePulleyDia;

    // Calculate horizontal run from axis length (for L_ANGLE) or use directly (H_ANGLE)
    const H_cc = inputs.horizontal_run_in ??
      horizontalFromAxis(inputs.conveyor_length_cc_in, conveyorInclineDeg);

    // Use the CORRECTED implied angle calculation
    const impliedAngle = calculateImpliedAngleFromTobs(
      inputs.tail_tob_in,
      inputs.drive_tob_in,
      H_cc,
      tailPulleyDia,
      drivePulleyDia
    );

    if (hasAngleMismatch(impliedAngle, conveyorInclineDeg)) {
      warnings.push({
        field: 'conveyor_incline_deg',
        message: `Implied angle from TOB heights (${impliedAngle.toFixed(1)}°) differs from entered incline (${conveyorInclineDeg.toFixed(1)}°) by more than 0.5°. Consider using Horizontal + TOBs geometry mode.`,
        severity: 'warning',
      });
    }
  }

  return warnings;
}

// ============================================================================
// COMBINED VALIDATION
// ============================================================================

/**
 * Validate inputs (draft mode - lenient for loading)
 * @param inputs - The sliderbed inputs
 * @param parameters - The sliderbed parameters
 * @param productKey - Optional product key for product-scoped validation
 */
export function validate(
  inputs: SliderbedInputs,
  parameters: SliderbedParameters,
  productKey?: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const inputErrors = validateInputs(inputs, productKey);
  const paramErrors = validateParameters(parameters);
  const { errors: ruleErrors, warnings: ruleWarnings } = applyApplicationRules(inputs);

  // v1.4: Add height warnings
  const heightWarnings = applyHeightWarnings(inputs);

  const allErrors = [...inputErrors, ...paramErrors, ...ruleErrors];
  const allWarnings = [...ruleWarnings, ...heightWarnings];

  const result = { errors: allErrors, warnings: allWarnings };

  // Telemetry: Capture validation events (observability only)
  return wrapValidationResult(result, createContext(
    'src/models/sliderbed_v1/rules.ts:validate',
    productKey,
    inputs as unknown as Record<string, unknown>
  ));
}

/**
 * Validate inputs for commit (strict mode - required for saving)
 * @param inputs - The sliderbed inputs
 * @param parameters - The sliderbed parameters
 * @param productKey - Optional product key for product-scoped validation
 */
export function validateForCommit(
  inputs: SliderbedInputs,
  parameters: SliderbedParameters,
  productKey?: string
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  // Start with standard validation
  const { errors, warnings } = validate(inputs, parameters, productKey);

  // Add commit-mode TOB validation
  const tobErrors = validateTob(inputs, 'commit');

  const result = {
    errors: [...errors, ...tobErrors],
    warnings,
  };

  // Telemetry: Capture commit validation events (observability only)
  return wrapValidationResult(result, createContext(
    'src/models/sliderbed_v1/rules.ts:validateForCommit',
    productKey,
    inputs as unknown as Record<string, unknown>
  ));
}

// ============================================================================
// v1.27: PCI OUTPUT VALIDATION
// ============================================================================

/**
 * Apply PCI tube stress validation rules based on calculation outputs.
 *
 * This function should be called after calculation to generate warnings/errors
 * based on the computed PCI check status.
 *
 * @param inputs - Calculator inputs (for enforce_pci_checks flag)
 * @param outputs - Calculator outputs (for PCI tube stress results)
 * @returns Object containing errors and warnings arrays
 */
export function applyPciOutputRules(
  inputs: SliderbedInputs,
  outputs: SliderbedOutputs
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const status = outputs.pci_tube_stress_status;
  const limit = outputs.pci_tube_stress_limit_psi;
  const driveStress = outputs.pci_drive_tube_stress_psi;
  const tailStress = outputs.pci_tail_tube_stress_psi;
  // Note: enforceChecks already reflected in status ('fail' vs 'warn')

  // Error: Invalid tube geometry
  if (status === 'error') {
    errors.push({
      field: 'drive_tube_od_in',
      message: outputs.pci_tube_stress_error_message ?? 'Invalid tube geometry',
      severity: 'error',
    });
  }

  // Fail: Stress exceeds limit (enforce mode)
  if (status === 'fail') {
    if (driveStress !== undefined && limit !== undefined && driveStress > limit) {
      errors.push({
        field: 'drive_tube_od_in',
        message: `Drive pulley tube stress (${driveStress.toLocaleString()} psi) exceeds PCI limit (${limit.toLocaleString()} psi). Consider larger shell diameter or thicker wall.`,
        severity: 'error',
      });
    }
    if (tailStress !== undefined && limit !== undefined && tailStress > limit) {
      errors.push({
        field: 'tail_tube_od_in',
        message: `Tail pulley tube stress (${tailStress.toLocaleString()} psi) exceeds PCI limit (${limit.toLocaleString()} psi). Consider larger shell diameter or thicker wall.`,
        severity: 'error',
      });
    }
  }

  // Warn: Stress exceeds limit (default mode)
  if (status === 'warn') {
    if (driveStress !== undefined && limit !== undefined && driveStress > limit) {
      warnings.push({
        field: 'drive_tube_od_in',
        message: `Drive pulley tube stress (${driveStress.toLocaleString()} psi) exceeds PCI limit (${limit.toLocaleString()} psi). Consider larger shell diameter or thicker wall.`,
        severity: 'warning',
      });
    }
    if (tailStress !== undefined && limit !== undefined && tailStress > limit) {
      warnings.push({
        field: 'tail_tube_od_in',
        message: `Tail pulley tube stress (${tailStress.toLocaleString()} psi) exceeds PCI limit (${limit.toLocaleString()} psi). Consider larger shell diameter or thicker wall.`,
        severity: 'warning',
      });
    }
  }

  // Info: Hub centers estimated (not user-provided)
  if (outputs.pci_hub_centers_estimated && status !== 'incomplete') {
    warnings.push({
      field: 'hub_centers_in',
      message: `Hub centers defaulted to belt width (${inputs.belt_width_in}"). For accurate PCI tube stress check, provide actual hub centers.`,
      severity: 'info',
    });
  }

  // Info: PCI check status is 'estimated' (hub centers defaulted, stress OK)
  if (status === 'estimated') {
    warnings.push({
      field: 'hub_centers_in',
      message: 'PCI tube stress check passed with estimated hub centers. Provide actual hub centers for authoritative verification.',
      severity: 'info',
    });
  }

  const result = { errors, warnings };

  // Telemetry: Capture PCI output validation events (observability only)
  return wrapValidationResult(result, createContext(
    'src/models/sliderbed_v1/rules.ts:applyPciOutputRules',
    undefined,
    inputs as unknown as Record<string, unknown>
  ));
}

// ============================================================================
// v1.30: PCI HUB CONNECTION VALIDATION
// ============================================================================

/**
 * Apply PCI hub connection validation rules.
 * These are warnings only (no hard stops per task requirements).
 *
 * @param inputs - Calculator inputs (hub connection selections)
 * @returns Object with arrays of warnings
 */
export function applyHubConnectionRules(
  inputs: SliderbedInputs
): { warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];

  // Hub types not ideal for drive pulley
  const NOT_IDEAL_FOR_DRIVE = ['ER_INTERNAL_BEARINGS', 'DEAD_SHAFT_ASSEMBLY'];

  // Check drive pulley hub connection
  if (inputs.drive_pulley_hub_connection_type) {
    if (NOT_IDEAL_FOR_DRIVE.includes(inputs.drive_pulley_hub_connection_type)) {
      warnings.push({
        field: 'drive_pulley_hub_connection_type',
        message: `PCI: ${inputs.drive_pulley_hub_connection_type === 'ER_INTERNAL_BEARINGS' ? 'ER internal bearings' : 'Dead shaft assembly'} is not ideal for drive pulleys.`,
        severity: 'warning',
      });
    }
  }

  // Check Taper-Lock bushing system (not recommended for two-hub pulleys)
  if (inputs.drive_pulley_bushing_system === 'TAPER_LOCK') {
    warnings.push({
      field: 'drive_pulley_bushing_system',
      message: 'PCI: Taper-Lock is not recommended for two-hub pulleys. Prefer XT for improved alignment/runout.',
      severity: 'warning',
    });
  }

  if (inputs.tail_pulley_bushing_system === 'TAPER_LOCK') {
    warnings.push({
      field: 'tail_pulley_bushing_system',
      message: 'PCI: Taper-Lock is not recommended for two-hub pulleys. Prefer XT for improved alignment/runout.',
      severity: 'warning',
    });
  }

  const result = { errors: [] as ValidationError[], warnings };

  // Telemetry: Capture hub connection validation events (observability only)
  wrapValidationResult(result, createContext(
    'src/models/sliderbed_v1/rules.ts:applyHubConnectionRules',
    undefined,
    inputs as unknown as Record<string, unknown>
  ));

  return { warnings };
}
