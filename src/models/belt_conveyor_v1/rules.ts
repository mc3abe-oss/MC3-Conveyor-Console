/**
 * BELT CONVEYOR v1.0 - VALIDATION RULES
 *
 * This module extends sliderbed validation with:
 * - Updated error/warning messages (belt conveyor, not sliderbed)
 * - Premium feature info messages
 * - Bed type validation
 *
 * CHANGELOG:
 * v1.0 (2025-12-21): Initial belt_conveyor_v1 with updated terminology
 */

import type { BeltConveyorInputs, BeltConveyorParameters } from './schema';

import type { ValidationError, ValidationWarning } from '../sliderbed_v1/schema';

import {
  PartTemperatureClass,
  FluidType,
  EndGuards,
  LacingStyle,
  SideLoadingDirection,
  SideLoadingSeverity,
  BeltTrackingMethod,
  ShaftDiameterMode,
} from '../sliderbed_v1/schema';

import { calculatePremiumFlags } from './premium-flags';

// Re-export validation types
export type { ValidationError, ValidationWarning };

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate belt conveyor inputs
 *
 * Same as sliderbed validation, with added bed_type validation
 */
export function validateInputs(inputs: BeltConveyorInputs): ValidationError[] {
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

  if (inputs.pulley_diameter_in <= 0) {
    errors.push({
      field: 'pulley_diameter_in',
      message: 'Pulley Diameter must be greater than 0',
      severity: 'error',
    });
  }

  // SPEED & THROUGHPUT
  if (inputs.drive_rpm <= 0) {
    errors.push({
      field: 'drive_rpm',
      message: 'Drive RPM must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.required_throughput_pph !== undefined && inputs.required_throughput_pph < 0) {
    errors.push({
      field: 'required_throughput_pph',
      message: 'Required throughput must be >= 0',
      severity: 'error',
    });
  }

  if (inputs.throughput_margin_pct !== undefined && inputs.throughput_margin_pct < 0) {
    errors.push({
      field: 'throughput_margin_pct',
      message: 'Throughput margin must be >= 0',
      severity: 'error',
    });
  }

  // PRODUCT / PART (v1.48: fields are now optional, only validate if set)
  if (inputs.part_weight_lbs !== undefined && inputs.part_weight_lbs <= 0) {
    errors.push({
      field: 'part_weight_lbs',
      message: 'Part Weight must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.part_length_in !== undefined && inputs.part_length_in <= 0) {
    errors.push({
      field: 'part_length_in',
      message: 'Part Length must be greater than 0',
      severity: 'error',
    });
  }

  if (inputs.part_width_in !== undefined && inputs.part_width_in <= 0) {
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

  // POWER-USER PARAMETERS
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

  if (inputs.belt_coeff_piw !== undefined && (inputs.belt_coeff_piw < 0.05 || inputs.belt_coeff_piw > 0.3)) {
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

  if (inputs.belt_coeff_pil !== undefined && (inputs.belt_coeff_pil < 0.05 || inputs.belt_coeff_pil > 0.3)) {
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
  // Accept EITHER v_guide_profile (legacy) OR v_guide_key (v1.22+)
  const isVGuided =
    inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
    inputs.belt_tracking_method === 'V-guided';
  if (isVGuided && !inputs.v_guide_profile && !inputs.v_guide_key) {
    errors.push({
      field: 'v_guide_key',
      message: 'V-guide profile is required when belt tracking method is V-guided',
      severity: 'error',
    });
  }

  // Manual shaft diameters required if manual mode
  const isManualShaft =
    inputs.shaft_diameter_mode === ShaftDiameterMode.Manual || inputs.shaft_diameter_mode === 'Manual';
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

  // BELT PIW/PIL OVERRIDE VALIDATION
  if (inputs.belt_piw_override !== undefined && inputs.belt_piw_override <= 0) {
    errors.push({
      field: 'belt_piw_override',
      message: 'Belt PIW override must be > 0',
      severity: 'error',
    });
  }

  if (inputs.belt_piw_override !== undefined && (inputs.belt_piw_override < 0.05 || inputs.belt_piw_override > 0.3)) {
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

  if (inputs.belt_pil_override !== undefined && (inputs.belt_pil_override < 0.05 || inputs.belt_pil_override > 0.3)) {
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

  return errors;
}

// ============================================================================
// PARAMETER VALIDATION
// ============================================================================

export function validateParameters(parameters: BeltConveyorParameters): ValidationError[] {
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
  inputs: BeltConveyorInputs
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // HARD ERROR: Red hot parts (updated terminology)
  if (inputs.part_temperature_class === 'RED_HOT' || inputs.part_temperature_class === PartTemperatureClass.RedHot) {
    errors.push({
      field: 'part_temperature_class',
      message: 'Do not use belt conveyor for red hot parts',
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

  // INCLINE WARNINGS (updated terminology)
  const inclineDeg = inputs.conveyor_incline_deg ?? 0;

  // ERROR: Incline > 45°
  if (inclineDeg > 45) {
    errors.push({
      field: 'conveyor_incline_deg',
      message:
        'Incline exceeds 45°. Belt conveyor without positive engagement is not supported by this model.',
      severity: 'error',
    });
  }

  // STRONG WARNING: Incline > 35°
  if (inclineDeg > 35 && inclineDeg <= 45) {
    warnings.push({
      field: 'conveyor_incline_deg',
      message:
        'Incline exceeds 35°. Product retention by friction alone is unlikely. Cleats or positive engagement features are required for reliable operation.',
      severity: 'warning',
    });
  }

  // WARNING: Incline > 20°
  if (inclineDeg > 20 && inclineDeg <= 35) {
    warnings.push({
      field: 'conveyor_incline_deg',
      message:
        'Incline exceeds 20°. Product retention by friction alone may be insufficient. Cleats or other retention features are typically required at this angle.',
      severity: 'warning',
    });
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

  // =========================================================================
  // BELT SELECTION VALIDATION
  // =========================================================================

  // Pulley diameter vs belt minimum
  if (inputs.belt_catalog_key) {
    const isVGuidedBelt =
      inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
      inputs.belt_tracking_method === 'V-guided';
    const minPulleyDia = isVGuidedBelt
      ? inputs.belt_min_pulley_dia_with_vguide_in
      : inputs.belt_min_pulley_dia_no_vguide_in;

    if (minPulleyDia !== undefined && inputs.pulley_diameter_in < minPulleyDia) {
      errors.push({
        field: 'pulley_diameter_in',
        message: `Pulley diameter (${inputs.pulley_diameter_in}") is below the belt minimum (${minPulleyDia}" for ${isVGuidedBelt ? 'V-guided' : 'crowned'} tracking). Increase pulley diameter or select a different belt.`,
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
  // V-guide auto-select enforced in BeltConveyorPhysical.tsx
  const sideLoadSeverity = inputs.side_loading_severity;
  const isVGuidedTracking = inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
                            inputs.belt_tracking_method === 'V-guided';
  if (inputs.side_loading_direction !== SideLoadingDirection.None) {
    if (sideLoadSeverity === SideLoadingSeverity.Heavy) {
      if (!isVGuidedTracking) {
        // Safety backstop: Heavy side load without V-guided is a blocking error
        errors.push({
          field: 'belt_tracking_method',
          message: 'Heavy side loading requires V-guided tracking. Change tracking method to V-guided.',
          severity: 'error',
        });
      }
      warnings.push({
        field: 'side_loading_severity',
        message: 'Heavy side loading typically requires a V-guide for reliable tracking.',
        severity: 'warning',
      });
    } else if (sideLoadSeverity === SideLoadingSeverity.Moderate) {
      warnings.push({
        field: 'side_loading_severity',
        message: 'Moderate side loading may require a V-guide for reliable tracking.',
        severity: 'warning',
      });
    }
  }

  // =========================================================================
  // PREMIUM FEATURE INFO MESSAGES
  // =========================================================================

  const premiumFlags = calculatePremiumFlags(inputs);
  if (premiumFlags.is_premium) {
    for (const reason of premiumFlags.premium_reasons) {
      warnings.push({
        field: 'premium',
        message: `Premium feature: ${reason}`,
        severity: 'info',
      });
    }
  }

  return { errors, warnings };
}

// ============================================================================
// COMBINED VALIDATION
// ============================================================================

export function validate(
  inputs: BeltConveyorInputs,
  parameters: BeltConveyorParameters
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const inputErrors = validateInputs(inputs);
  const paramErrors = validateParameters(parameters);
  const { errors: ruleErrors, warnings } = applyApplicationRules(inputs);

  const allErrors = [...inputErrors, ...paramErrors, ...ruleErrors];

  return { errors: allErrors, warnings };
}
