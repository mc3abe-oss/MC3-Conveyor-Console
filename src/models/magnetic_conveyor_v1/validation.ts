/**
 * MAGNETIC CONVEYOR v1.0 - VALIDATION RULES
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 *
 * Validation functions for magnetic conveyor calculations:
 * - Input validation (before calculation)
 * - Output validation (after calculation)
 * - Combined validation
 *
 * Validation Types:
 * - Errors: Blocking issues that prevent valid calculation
 * - Warnings: Non-blocking issues that should be reviewed
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

import {
  MagneticInputs,
  MagneticOutputs,
  ConveyorStyle,
  ConveyorClass,
  MaterialType,
  ChipType,
  TemperatureClass,
  FluidType,
} from './schema';

import {
  HEAVY_DUTY_THRESHOLDS,
  GEOMETRY_LIMITS,
  THROUGHPUT_MARGIN_THRESHOLDS,
} from './constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Validation message returned by validation functions.
 */
export interface ValidationMessage {
  /** Type of validation issue */
  type: 'warning' | 'error';
  /** Unique code for programmatic handling */
  code: string;
  /** Human-readable message */
  message: string;
  /** Field name that triggered the validation (optional) */
  field?: string;
}

/**
 * Combined validation result.
 */
export interface ValidationResult {
  /** Warning messages (non-blocking) */
  warnings: ValidationMessage[];
  /** Error messages (blocking) */
  errors: ValidationMessage[];
  /** Whether the configuration is valid (no errors) */
  isValid: boolean;
}

// ============================================================================
// ERROR CODES
// ============================================================================

export const ValidationCodes = {
  // Errors
  INVALID_MATERIAL_ALUMINUM: 'INVALID_MATERIAL_ALUMINUM',
  INVALID_MATERIAL_STAINLESS: 'INVALID_MATERIAL_STAINLESS',
  STYLE_C_REQUIRED_ZERO_HEIGHT: 'STYLE_C_REQUIRED_ZERO_HEIGHT',
  STYLE_C_REQUIRED_ZERO_ANGLE: 'STYLE_C_REQUIRED_ZERO_ANGLE',

  // Warnings - Geometry
  CUSTOM_TAIL_TRACKS_REQUIRED: 'CUSTOM_TAIL_TRACKS_REQUIRED',
  SPEED_TOO_HIGH: 'SPEED_TOO_HIGH',

  // Warnings - Material
  MATERIAL_NON_MAGNETIC: 'MATERIAL_NON_MAGNETIC',
  CHIP_TYPE_BRIDGING: 'CHIP_TYPE_BRIDGING',
  TEMPERATURE_RED_HOT: 'TEMPERATURE_RED_HOT',
  FLUID_OIL_BASED: 'FLUID_OIL_BASED',

  // Warnings - Throughput
  THROUGHPUT_UNDERSIZED_CHIPS: 'THROUGHPUT_UNDERSIZED_CHIPS',
  THROUGHPUT_UNDERSIZED_PARTS: 'THROUGHPUT_UNDERSIZED_PARTS',

  // Warnings - Heavy Duty suggestion
  CONSIDER_HD_MAGNET_WIDTH: 'CONSIDER_HD_MAGNET_WIDTH',
  CONSIDER_HD_LOAD: 'CONSIDER_HD_LOAD',
  CONSIDER_HD_DISCHARGE_HEIGHT: 'CONSIDER_HD_DISCHARGE_HEIGHT',
  CONSIDER_HD_CHAIN_LENGTH: 'CONSIDER_HD_CHAIN_LENGTH',
} as const;

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate inputs before calculation.
 *
 * Checks for:
 * - Invalid material types (errors)
 * - Style C configuration errors
 * - Geometry warnings (infeed, speed)
 * - Material/chip type warnings
 * - Heavy Duty suggestions (when using Standard class)
 *
 * @param inputs - User inputs to validate
 * @returns Array of validation messages
 */
export function validateInputs(inputs: MagneticInputs): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  // =========================================================================
  // ERRORS - Blocking issues
  // =========================================================================

  // Material validation - Aluminum (error)
  if (inputs.material_type === MaterialType.Aluminum) {
    messages.push({
      type: 'error',
      code: ValidationCodes.INVALID_MATERIAL_ALUMINUM,
      message: 'Invalid - Aluminum cannot be magnetized',
      field: 'material_type',
    });
  }

  // Material validation - Stainless Steel (error)
  if (inputs.material_type === MaterialType.StainlessSteel) {
    messages.push({
      type: 'error',
      code: ValidationCodes.INVALID_MATERIAL_STAINLESS,
      message: 'Invalid - Stainless steel cannot be magnetized',
      field: 'material_type',
    });
  }

  // Style C required for zero discharge height
  if (
    inputs.discharge_height_in === 0 &&
    inputs.style !== ConveyorStyle.C
  ) {
    messages.push({
      type: 'error',
      code: ValidationCodes.STYLE_C_REQUIRED_ZERO_HEIGHT,
      message: 'Style C required for horizontal-only configuration',
      field: 'style',
    });
  }

  // Style C required for zero angle
  if (
    inputs.incline_angle_deg === 0 &&
    inputs.style !== ConveyorStyle.C
  ) {
    messages.push({
      type: 'error',
      code: ValidationCodes.STYLE_C_REQUIRED_ZERO_ANGLE,
      message: 'Style C required for 0° angle',
      field: 'style',
    });
  }

  // =========================================================================
  // WARNINGS - Non-blocking issues
  // =========================================================================

  // Infeed length warning
  if (inputs.infeed_length_in < GEOMETRY_LIMITS.min_infeed_warning_in) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.CUSTOM_TAIL_TRACKS_REQUIRED,
      message: 'Custom tail tracks and tail end required',
      field: 'infeed_length_in',
    });
  }

  // Belt speed warning
  if (inputs.belt_speed_fpm > GEOMETRY_LIMITS.max_belt_speed_fpm) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.SPEED_TOO_HIGH,
      message: 'Material could be flung off',
      field: 'belt_speed_fpm',
    });
  }

  // Chip type warnings - Stringers
  if (inputs.chip_type === ChipType.Stringers) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.CHIP_TYPE_BRIDGING,
      message: 'Poor option due to magnet bridging',
      field: 'chip_type',
    });
  }

  // Chip type warnings - Bird Nests
  if (inputs.chip_type === ChipType.BirdNests) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.CHIP_TYPE_BRIDGING,
      message: 'Poor option due to magnet bridging',
      field: 'chip_type',
    });
  }

  // Temperature warning - Red Hot
  if (inputs.temperature_class === TemperatureClass.RedHot) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.TEMPERATURE_RED_HOT,
      message: 'Poor choice for magnetic conveyor',
      field: 'temperature_class',
    });
  }

  // Fluid warning - Oil Based
  if (inputs.fluid_type === FluidType.OilBased) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.FLUID_OIL_BASED,
      message: 'Require SS rigidized cover',
      field: 'fluid_type',
    });
  }

  // =========================================================================
  // HEAVY DUTY SUGGESTIONS (only when using Standard class)
  // =========================================================================

  if (inputs.conveyor_class === ConveyorClass.Standard) {
    // Magnet width > 24"
    if (inputs.magnet_width_in > HEAVY_DUTY_THRESHOLDS.magnet_width_in) {
      messages.push({
        type: 'warning',
        code: ValidationCodes.CONSIDER_HD_MAGNET_WIDTH,
        message: 'Consider Heavy Duty class for magnet width > 24"',
        field: 'magnet_width_in',
      });
    }

    // Load > 5000 lbs/hr
    if (inputs.load_lbs_per_hr > HEAVY_DUTY_THRESHOLDS.load_lbs_per_hr) {
      messages.push({
        type: 'warning',
        code: ValidationCodes.CONSIDER_HD_LOAD,
        message: 'Consider Heavy Duty class for load > 5,000 lbs/hr',
        field: 'load_lbs_per_hr',
      });
    }

    // Discharge height > 200"
    if (inputs.discharge_height_in > HEAVY_DUTY_THRESHOLDS.discharge_height_in) {
      messages.push({
        type: 'warning',
        code: ValidationCodes.CONSIDER_HD_DISCHARGE_HEIGHT,
        message: 'Consider Heavy Duty class for discharge height > 200"',
        field: 'discharge_height_in',
      });
    }
  }

  return messages;
}

// ============================================================================
// OUTPUT VALIDATION
// ============================================================================

/**
 * Validate outputs after calculation.
 *
 * Checks for:
 * - Chain length HD threshold
 * - Throughput margin warnings
 *
 * @param inputs - User inputs
 * @param outputs - Calculated outputs
 * @returns Array of validation messages
 */
export function validateOutputs(
  inputs: MagneticInputs,
  outputs: MagneticOutputs
): ValidationMessage[] {
  const messages: ValidationMessage[] = [];

  // =========================================================================
  // HEAVY DUTY SUGGESTION - Chain Length (requires calculated value)
  // =========================================================================

  if (inputs.conveyor_class === ConveyorClass.Standard) {
    if (outputs.chain_length_in > HEAVY_DUTY_THRESHOLDS.chain_length_in) {
      messages.push({
        type: 'warning',
        code: ValidationCodes.CONSIDER_HD_CHAIN_LENGTH,
        message: 'Consider Heavy Duty class for chain length > 500"',
        field: 'chain_length_in',
      });
    }
  }

  // =========================================================================
  // THROUGHPUT MARGIN WARNINGS
  // =========================================================================

  // Undersized for chips
  if (
    inputs.chip_type !== ChipType.Parts &&
    outputs.throughput_margin > 0 &&
    outputs.throughput_margin < THROUGHPUT_MARGIN_THRESHOLDS.chips
  ) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.THROUGHPUT_UNDERSIZED_CHIPS,
      message: 'Undersized for chips',
      field: 'throughput_margin',
    });
  }

  // Undersized for parts
  if (
    inputs.chip_type === ChipType.Parts &&
    outputs.throughput_margin > 0 &&
    outputs.throughput_margin < THROUGHPUT_MARGIN_THRESHOLDS.parts
  ) {
    messages.push({
      type: 'warning',
      code: ValidationCodes.THROUGHPUT_UNDERSIZED_PARTS,
      message: 'Undersized for parts',
      field: 'throughput_margin',
    });
  }

  return messages;
}

// ============================================================================
// COMBINED VALIDATION
// ============================================================================

/**
 * Run all validation checks and return combined result.
 *
 * @param inputs - User inputs
 * @param outputs - Calculated outputs
 * @returns Combined validation result with warnings, errors, and validity flag
 */
export function validate(
  inputs: MagneticInputs,
  outputs: MagneticOutputs
): ValidationResult {
  const inputMessages = validateInputs(inputs);
  const outputMessages = validateOutputs(inputs, outputs);

  const allMessages = [...inputMessages, ...outputMessages];

  const warnings = allMessages.filter((m) => m.type === 'warning');
  const errors = allMessages.filter((m) => m.type === 'error');

  return {
    warnings,
    errors,
    isValid: errors.length === 0,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if there are any errors in validation messages.
 */
export function hasErrors(messages: ValidationMessage[]): boolean {
  return messages.some((m) => m.type === 'error');
}

/**
 * Check if there are any warnings in validation messages.
 */
export function hasWarnings(messages: ValidationMessage[]): boolean {
  return messages.some((m) => m.type === 'warning');
}

/**
 * Get messages for a specific field.
 */
export function getMessagesForField(
  messages: ValidationMessage[],
  field: string
): ValidationMessage[] {
  return messages.filter((m) => m.field === field);
}

/**
 * Get message by code.
 */
export function getMessageByCode(
  messages: ValidationMessage[],
  code: string
): ValidationMessage | undefined {
  return messages.find((m) => m.code === code);
}
