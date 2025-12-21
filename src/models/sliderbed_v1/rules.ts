/**
 * SLIDERBED CONVEYOR v1.4 - VALIDATION RULES
 *
 * This file implements all validation rules, hard errors, warnings, and info messages
 * as defined in the Model v1 specification.
 *
 * CHANGELOG:
 * v1.4 (2025-12-21): Per-end support types, height model validation, draft/commit modes
 * v1.3 (2025-12-21): Split pulley diameter into drive/tail, add cleat validation
 * v1.2 (2025-12-19): Make key parameters power-user editable (safety_factor, belt coeffs, base pull)
 * v1.1 (2025-12-19): Fix open-belt wrap length: use πD not 2πD
 * v1.0 (2024-12-19): Initial implementation
 */

import {
  SliderbedInputs,
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
  PULLEY_DIAMETER_PRESETS,
  ValidationMode,
  HeightInputMode,
  derivedLegsRequired,
  TOB_FIELDS,
} from './schema';
import { calculateImpliedAngleDeg, hasAngleMismatch } from './migrate';

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export function validateInputs(
  inputs: SliderbedInputs
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

  if (inputs.conveyor_width_in <= 0) {
    errors.push({
      field: 'conveyor_width_in',
      message: 'Conveyor Width must be greater than 0',
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
    if (inputs.drive_pulley_diameter_in > 12) {
      errors.push({
        field: 'drive_pulley_diameter_in',
        message: 'Drive pulley diameter must be <= 12"',
        severity: 'error',
      });
    }
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
    if (inputs.tail_pulley_diameter_in > 12) {
      errors.push({
        field: 'tail_pulley_diameter_in',
        message: 'Tail pulley diameter must be <= 12"',
        severity: 'error',
      });
    }
  }

  // SPEED & THROUGHPUT
  if (inputs.drive_rpm <= 0) {
    errors.push({
      field: 'drive_rpm',
      message: 'Drive RPM must be greater than 0',
      severity: 'error',
    });
  }

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

  // PRODUCT / PART
  if (inputs.part_weight_lbs <= 0) {
    errors.push({
      field: 'part_weight_lbs',
      message: 'Part Weight must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.part_length_in <= 0) {
    errors.push({
      field: 'part_length_in',
      message: 'Part Length must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.part_width_in <= 0) {
    errors.push({
      field: 'part_width_in',
      message: 'Part Width must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.part_spacing_in < 0) {
    errors.push({
      field: 'part_spacing_in',
      message: 'Part Spacing must be >= 0',
      severity: 'error',
    });
  }

  // DROP HEIGHT
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
      message: 'Belt coefficient piw must be > 0',
      severity: 'error',
    });
  }

  if (inputs.belt_coeff_piw !== undefined && (inputs.belt_coeff_piw < 0.05 || inputs.belt_coeff_piw > 0.30)) {
    errors.push({
      field: 'belt_coeff_piw',
      message: 'Belt coefficient piw should be between 0.05 and 0.30',
      severity: 'error',
    });
  }

  if (inputs.belt_coeff_pil !== undefined && inputs.belt_coeff_pil <= 0) {
    errors.push({
      field: 'belt_coeff_pil',
      message: 'Belt coefficient pil must be > 0',
      severity: 'error',
    });
  }

  if (inputs.belt_coeff_pil !== undefined && (inputs.belt_coeff_pil < 0.05 || inputs.belt_coeff_pil > 0.30)) {
    errors.push({
      field: 'belt_coeff_pil',
      message: 'Belt coefficient pil should be between 0.05 and 0.30',
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
  const isVGuided = inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
                    inputs.belt_tracking_method === 'V-guided';
  if (isVGuided && !inputs.v_guide_profile) {
    errors.push({
      field: 'v_guide_profile',
      message: 'V-guide profile is required when belt tracking method is V-guided',
      severity: 'error',
    });
  }

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
  // v1.3: CLEAT VALIDATION
  // =========================================================================

  if (inputs.cleats_enabled) {
    // Cleat height required when enabled
    if (inputs.cleat_height_in === undefined || inputs.cleat_height_in <= 0) {
      errors.push({
        field: 'cleat_height_in',
        message: 'Cleat height is required when cleats are enabled',
        severity: 'error',
      });
    }

    // Cleat height range (0.5" - 6")
    if (inputs.cleat_height_in !== undefined) {
      if (inputs.cleat_height_in < 0.5) {
        errors.push({
          field: 'cleat_height_in',
          message: 'Cleat height must be >= 0.5"',
          severity: 'error',
        });
      }
      if (inputs.cleat_height_in > 6) {
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
  // v1.4: TOB FIELD EXISTENCE VALIDATION
  // =========================================================================

  const legsRequired = derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type);

  if (!legsRequired) {
    // When legs_required=false, TOB fields must NOT exist
    for (const field of TOB_FIELDS) {
      if (field in inputs && (inputs as unknown as Record<string, unknown>)[field] !== undefined) {
        errors.push({
          field,
          message: `Field '${field}' must not exist when legs are not required (both ends are External)`,
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
  // v1.3: PULLEY DIAMETER WARNINGS
  // =========================================================================

  // Mismatched pulley diameters warning
  const drivePulley = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in;
  const tailPulley = inputs.tail_pulley_diameter_in ?? inputs.pulley_diameter_in;

  if (drivePulley !== undefined && tailPulley !== undefined && drivePulley !== tailPulley) {
    warnings.push({
      field: 'tail_pulley_diameter_in',
      message: `Drive and tail pulleys have different diameters (${drivePulley}" vs ${tailPulley}"). This is valid but verify belt tracking is correct.`,
      severity: 'warning',
    });
  }

  // Non-standard pulley diameter info
  const presetArray = PULLEY_DIAMETER_PRESETS as readonly number[];
  if (drivePulley !== undefined && !presetArray.includes(drivePulley)) {
    warnings.push({
      field: 'drive_pulley_diameter_in',
      message: `Drive pulley diameter (${drivePulley}") is non-standard. Standard sizes: ${presetArray.join(', ')}"`,
      severity: 'info',
    });
  }
  if (tailPulley !== undefined && tailPulley !== drivePulley && !presetArray.includes(tailPulley)) {
    warnings.push({
      field: 'tail_pulley_diameter_in',
      message: `Tail pulley diameter (${tailPulley}") is non-standard. Standard sizes: ${presetArray.join(', ')}"`,
      severity: 'info',
    });
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

  // Cleat spacing vs part size
  if (inputs.cleats_enabled && inputs.cleat_spacing_in !== undefined) {
    const travelDim = inputs.orientation === 'Lengthwise' ? inputs.part_length_in : inputs.part_width_in;
    if (inputs.cleat_spacing_in < travelDim) {
      warnings.push({
        field: 'cleat_spacing_in',
        message: `Cleat spacing (${inputs.cleat_spacing_in}") is less than part travel dimension (${travelDim}"). Parts may not fit between cleats.`,
        severity: 'warning',
      });
    }
  }

  // Cleat edge offset vs belt width
  if (inputs.cleats_enabled && inputs.cleat_edge_offset_in !== undefined) {
    const maxOffset = inputs.conveyor_width_in / 2;
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
  // =========================================================================

  // Pulley diameter vs belt minimum (v1.3: check both drive and tail)
  if (inputs.belt_catalog_key) {
    const isVGuidedBelt = inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
                          inputs.belt_tracking_method === 'V-guided';
    const minPulleyDia = isVGuidedBelt
      ? inputs.belt_min_pulley_dia_with_vguide_in
      : inputs.belt_min_pulley_dia_no_vguide_in;

    // v1.3: Check drive pulley
    if (minPulleyDia !== undefined && drivePulley !== undefined && drivePulley < minPulleyDia) {
      errors.push({
        field: 'drive_pulley_diameter_in',
        message: `Drive pulley diameter (${drivePulley}") is below the belt minimum (${minPulleyDia}" for ${isVGuidedBelt ? 'V-guided' : 'crowned'} tracking). Increase pulley diameter or select a different belt.`,
        severity: 'error',
      });
    }

    // v1.3: Check tail pulley
    if (minPulleyDia !== undefined && tailPulley !== undefined && tailPulley < minPulleyDia) {
      errors.push({
        field: 'tail_pulley_diameter_in',
        message: `Tail pulley diameter (${tailPulley}") is below the belt minimum (${minPulleyDia}" for ${isVGuidedBelt ? 'V-guided' : 'crowned'} tracking). Increase pulley diameter or select a different belt.`,
        severity: 'error',
      });
    }
  }

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

  return { errors, warnings };
}

// ============================================================================
// v1.4: TOB VALIDATION (DRAFT VS COMMIT MODE)
// ============================================================================

/**
 * Validate TOB fields based on validation mode.
 *
 * - draft mode: Lenient - allows missing TOB even when legs_required=true
 *   (supports legacy configs that were migrated to legs but have no TOB data)
 * - commit mode: Strict - requires all TOB fields based on height_input_mode
 *
 * @param inputs - The inputs to validate
 * @param mode - 'draft' (lenient) or 'commit' (strict)
 */
export function validateTob(
  inputs: SliderbedInputs,
  mode: ValidationMode
): ValidationError[] {
  const errors: ValidationError[] = [];
  const legsRequired = derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type);

  // If legs not required, no TOB validation needed (field existence checked in validateInputs)
  if (!legsRequired) {
    return errors;
  }

  // In draft mode, allow missing TOB (legacy migrated configs)
  if (mode === 'draft') {
    return errors;
  }

  // Commit mode: strict validation
  const heightInputMode = inputs.height_input_mode ?? HeightInputMode.ReferenceAndAngle;

  if (heightInputMode === HeightInputMode.ReferenceAndAngle || heightInputMode === 'reference_and_angle') {
    // Mode A: Only reference TOB required
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
  } else {
    // Mode B: Both TOBs required
    if (inputs.tail_tob_in === undefined) {
      errors.push({
        field: 'tail_tob_in',
        message: 'Tail TOB is required in both-ends height input mode',
        severity: 'error',
      });
    }
    if (inputs.drive_tob_in === undefined) {
      errors.push({
        field: 'drive_tob_in',
        message: 'Drive TOB is required in both-ends height input mode',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Apply v1.4 height/support warnings.
 * Called as part of applyApplicationRules.
 */
function applyHeightWarnings(inputs: SliderbedInputs): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const legsRequired = derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type);

  if (!legsRequired) {
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

  // Angle mismatch warning (Mode B or when both TOBs are known)
  const conveyorInclineDeg = inputs.conveyor_incline_deg ?? 0;
  if (inputs.tail_tob_in !== undefined && inputs.drive_tob_in !== undefined) {
    const impliedAngle = calculateImpliedAngleDeg(
      inputs.tail_tob_in,
      inputs.drive_tob_in,
      inputs.conveyor_length_cc_in
    );
    if (hasAngleMismatch(impliedAngle, conveyorInclineDeg)) {
      warnings.push({
        field: 'conveyor_incline_deg',
        message: `Implied angle from TOB heights (${impliedAngle.toFixed(1)}°) differs from entered incline (${conveyorInclineDeg}°) by more than 0.5°`,
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
 */
export function validate(
  inputs: SliderbedInputs,
  parameters: SliderbedParameters
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const inputErrors = validateInputs(inputs);
  const paramErrors = validateParameters(parameters);
  const { errors: ruleErrors, warnings: ruleWarnings } = applyApplicationRules(inputs);

  // v1.4: Add height warnings
  const heightWarnings = applyHeightWarnings(inputs);

  const allErrors = [...inputErrors, ...paramErrors, ...ruleErrors];
  const allWarnings = [...ruleWarnings, ...heightWarnings];

  return { errors: allErrors, warnings: allWarnings };
}

/**
 * Validate inputs for commit (strict mode - required for saving)
 */
export function validateForCommit(
  inputs: SliderbedInputs,
  parameters: SliderbedParameters
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  // Start with standard validation
  const { errors, warnings } = validate(inputs, parameters);

  // Add commit-mode TOB validation
  const tobErrors = validateTob(inputs, 'commit');

  return {
    errors: [...errors, ...tobErrors],
    warnings,
  };
}
