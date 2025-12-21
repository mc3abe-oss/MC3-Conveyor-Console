/**
 * SLIDERBED CONVEYOR v1.2 - VALIDATION RULES
 *
 * This file implements all validation rules, hard errors, warnings, and info messages
 * as defined in the Model v1 specification.
 *
 * CHANGELOG:
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
} from './schema';

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
// COMBINED VALIDATION
// ============================================================================

export function validate(
  inputs: SliderbedInputs,
  parameters: SliderbedParameters
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const inputErrors = validateInputs(inputs);
  const paramErrors = validateParameters(parameters);
  const { errors: ruleErrors, warnings } = applyApplicationRules(inputs);

  const allErrors = [...inputErrors, ...paramErrors, ...ruleErrors];

  return { errors: allErrors, warnings };
}
