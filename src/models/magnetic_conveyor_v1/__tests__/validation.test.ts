/**
 * MAGNETIC CONVEYOR v1.0 - VALIDATION TESTS
 *
 * Unit tests for validation functions.
 */

import {
  validateInputs,
  validateOutputs,
  validate,
  hasErrors,
  hasWarnings,
  getMessagesForField,
  getMessageByCode,
  ValidationCodes,
  ValidationMessage,
} from '../validation';

import {
  MagneticInputs,
  MagneticOutputs,
  ConveyorStyle,
  ConveyorClass,
  MagnetType,
  ChipType,
  MaterialType,
  TemperatureClass,
  FluidType,
} from '../schema';

import { calculate } from '../formulas';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Clean Standard conveyor - should produce no warnings or errors.
 */
const cleanInputs: MagneticInputs = {
  style: ConveyorStyle.B,
  conveyor_class: ConveyorClass.Standard,
  infeed_length_in: 48, // Above 39" threshold
  discharge_height_in: 100,
  incline_angle_deg: 60,
  discharge_length_in: 22,
  magnet_width_in: 12, // Below 24" threshold
  magnet_type: MagnetType.Ceramic8,
  magnet_centers_in: 12,
  belt_speed_fpm: 30, // Below 120 FPM threshold
  load_lbs_per_hr: 1000, // Below 5000 lbs/hr threshold
  material_type: MaterialType.Steel, // Valid magnetic material
  chip_type: ChipType.Small, // No bridging issues
  temperature_class: TemperatureClass.Ambient, // Not red hot
  fluid_type: FluidType.WaterSoluble, // Not oil based
};

/**
 * Helper to create partial inputs with overrides.
 */
function createInputs(overrides: Partial<MagneticInputs>): MagneticInputs {
  return { ...cleanInputs, ...overrides };
}

/**
 * Helper to get calculated outputs for inputs.
 */
function getOutputs(inputs: MagneticInputs): MagneticOutputs {
  return calculate(inputs);
}

// ============================================================================
// CLEAN CONFIGURATION TESTS
// ============================================================================

describe('validateInputs - clean configuration', () => {
  it('should return no messages for valid configuration', () => {
    const messages = validateInputs(cleanInputs);
    expect(messages).toHaveLength(0);
  });

  it('should return no errors for valid configuration', () => {
    const messages = validateInputs(cleanInputs);
    expect(hasErrors(messages)).toBe(false);
  });

  it('should return no warnings for valid configuration', () => {
    const messages = validateInputs(cleanInputs);
    expect(hasWarnings(messages)).toBe(false);
  });
});

describe('validate - clean configuration', () => {
  it('should return no errors for valid configuration', () => {
    const outputs = getOutputs(cleanInputs);
    const result = validate(cleanInputs, outputs);

    expect(result.errors).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('should return throughput warning due to placeholder margin', () => {
    // Note: The throughput calculation is a placeholder that returns margin = 1.0
    // This triggers the "undersized for chips" warning (threshold 1.5)
    // Once real throughput calculation is implemented, this test should be updated
    const outputs = getOutputs(cleanInputs);
    const result = validate(cleanInputs, outputs);

    // Expect throughput warning due to placeholder
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(
      result.warnings.some(
        (w) => w.code === ValidationCodes.THROUGHPUT_UNDERSIZED_CHIPS
      )
    ).toBe(true);
  });
});

// ============================================================================
// ERROR TESTS - Material Type
// ============================================================================

describe('validateInputs - material errors', () => {
  it('should error for aluminum material', () => {
    const inputs = createInputs({ material_type: MaterialType.Aluminum });
    const messages = validateInputs(inputs);

    expect(hasErrors(messages)).toBe(true);

    const error = getMessageByCode(
      messages,
      ValidationCodes.INVALID_MATERIAL_ALUMINUM
    );
    expect(error).toBeDefined();
    expect(error?.type).toBe('error');
    expect(error?.message).toBe('Invalid - Aluminum cannot be magnetized');
    expect(error?.field).toBe('material_type');
  });

  it('should error for stainless steel material', () => {
    const inputs = createInputs({ material_type: MaterialType.StainlessSteel });
    const messages = validateInputs(inputs);

    expect(hasErrors(messages)).toBe(true);

    const error = getMessageByCode(
      messages,
      ValidationCodes.INVALID_MATERIAL_STAINLESS
    );
    expect(error).toBeDefined();
    expect(error?.type).toBe('error');
    expect(error?.message).toBe('Invalid - Stainless steel cannot be magnetized');
    expect(error?.field).toBe('material_type');
  });

  it('should not error for steel material', () => {
    const inputs = createInputs({ material_type: MaterialType.Steel });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.INVALID_MATERIAL_ALUMINUM)
    ).toBeUndefined();
    expect(
      getMessageByCode(messages, ValidationCodes.INVALID_MATERIAL_STAINLESS)
    ).toBeUndefined();
  });

  it('should not error for cast iron material', () => {
    const inputs = createInputs({ material_type: MaterialType.CastIron });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.INVALID_MATERIAL_ALUMINUM)
    ).toBeUndefined();
    expect(
      getMessageByCode(messages, ValidationCodes.INVALID_MATERIAL_STAINLESS)
    ).toBeUndefined();
  });
});

// ============================================================================
// ERROR TESTS - Style C Configuration
// ============================================================================

describe('validateInputs - Style C errors', () => {
  it('should error when discharge height is 0 but style is not C', () => {
    const inputs = createInputs({
      style: ConveyorStyle.A,
      discharge_height_in: 0,
    });
    const messages = validateInputs(inputs);

    expect(hasErrors(messages)).toBe(true);

    const error = getMessageByCode(
      messages,
      ValidationCodes.STYLE_C_REQUIRED_ZERO_HEIGHT
    );
    expect(error).toBeDefined();
    expect(error?.type).toBe('error');
    expect(error?.message).toBe(
      'Style C required for horizontal-only configuration'
    );
    expect(error?.field).toBe('style');
  });

  it('should error when angle is 0 but style is not C', () => {
    const inputs = createInputs({
      style: ConveyorStyle.B,
      incline_angle_deg: 0,
    });
    const messages = validateInputs(inputs);

    expect(hasErrors(messages)).toBe(true);

    const error = getMessageByCode(
      messages,
      ValidationCodes.STYLE_C_REQUIRED_ZERO_ANGLE
    );
    expect(error).toBeDefined();
    expect(error?.type).toBe('error');
    expect(error?.message).toBe('Style C required for 0° angle');
    expect(error?.field).toBe('style');
  });

  it('should not error when Style C has 0 height and 0 angle', () => {
    const inputs = createInputs({
      style: ConveyorStyle.C,
      discharge_height_in: 0,
      incline_angle_deg: 0,
    });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.STYLE_C_REQUIRED_ZERO_HEIGHT)
    ).toBeUndefined();
    expect(
      getMessageByCode(messages, ValidationCodes.STYLE_C_REQUIRED_ZERO_ANGLE)
    ).toBeUndefined();
  });

  it('should error for both conditions when Style A with 0 height and 0 angle', () => {
    const inputs = createInputs({
      style: ConveyorStyle.A,
      discharge_height_in: 0,
      incline_angle_deg: 0,
    });
    const messages = validateInputs(inputs);

    expect(hasErrors(messages)).toBe(true);
    expect(
      getMessageByCode(messages, ValidationCodes.STYLE_C_REQUIRED_ZERO_HEIGHT)
    ).toBeDefined();
    expect(
      getMessageByCode(messages, ValidationCodes.STYLE_C_REQUIRED_ZERO_ANGLE)
    ).toBeDefined();
  });
});

// ============================================================================
// WARNING TESTS - Geometry
// ============================================================================

describe('validateInputs - geometry warnings', () => {
  it('should warn when infeed < 39"', () => {
    const inputs = createInputs({ infeed_length_in: 30 });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.CUSTOM_TAIL_TRACKS_REQUIRED
    );
    expect(warning).toBeDefined();
    expect(warning?.type).toBe('warning');
    expect(warning?.message).toBe('Custom tail tracks and tail end required');
    expect(warning?.field).toBe('infeed_length_in');
  });

  it('should not warn when infeed >= 39"', () => {
    const inputs = createInputs({ infeed_length_in: 39 });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CUSTOM_TAIL_TRACKS_REQUIRED)
    ).toBeUndefined();
  });

  it('should warn when belt speed > 120 FPM', () => {
    const inputs = createInputs({ belt_speed_fpm: 150 });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(messages, ValidationCodes.SPEED_TOO_HIGH);
    expect(warning).toBeDefined();
    expect(warning?.type).toBe('warning');
    expect(warning?.message).toBe('Material could be flung off');
    expect(warning?.field).toBe('belt_speed_fpm');
  });

  it('should not warn when belt speed <= 120 FPM', () => {
    const inputs = createInputs({ belt_speed_fpm: 120 });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.SPEED_TOO_HIGH)
    ).toBeUndefined();
  });
});

// ============================================================================
// WARNING TESTS - Chip Type
// ============================================================================

describe('validateInputs - chip type warnings', () => {
  it('should warn for stringers chip type', () => {
    const inputs = createInputs({ chip_type: ChipType.Stringers });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.CHIP_TYPE_BRIDGING
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe('Poor option due to magnet bridging');
    expect(warning?.field).toBe('chip_type');
  });

  it('should warn for bird nests chip type', () => {
    const inputs = createInputs({ chip_type: ChipType.BirdNests });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.CHIP_TYPE_BRIDGING
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe('Poor option due to magnet bridging');
  });

  it('should not warn for small chips', () => {
    const inputs = createInputs({ chip_type: ChipType.Small });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CHIP_TYPE_BRIDGING)
    ).toBeUndefined();
  });

  it('should not warn for saw fines', () => {
    const inputs = createInputs({ chip_type: ChipType.SawFines });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CHIP_TYPE_BRIDGING)
    ).toBeUndefined();
  });
});

// ============================================================================
// WARNING TESTS - Temperature
// ============================================================================

describe('validateInputs - temperature warnings', () => {
  it('should warn for red hot temperature', () => {
    const inputs = createInputs({ temperature_class: TemperatureClass.RedHot });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.TEMPERATURE_RED_HOT
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe('Poor choice for magnetic conveyor');
    expect(warning?.field).toBe('temperature_class');
  });

  it('should not warn for ambient temperature', () => {
    const inputs = createInputs({
      temperature_class: TemperatureClass.Ambient,
    });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.TEMPERATURE_RED_HOT)
    ).toBeUndefined();
  });

  it('should not warn for warm temperature', () => {
    const inputs = createInputs({ temperature_class: TemperatureClass.Warm });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.TEMPERATURE_RED_HOT)
    ).toBeUndefined();
  });
});

// ============================================================================
// WARNING TESTS - Fluid Type
// ============================================================================

describe('validateInputs - fluid type warnings', () => {
  it('should warn for oil-based fluid', () => {
    const inputs = createInputs({ fluid_type: FluidType.OilBased });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(messages, ValidationCodes.FLUID_OIL_BASED);
    expect(warning).toBeDefined();
    expect(warning?.message).toBe('Require SS rigidized cover');
    expect(warning?.field).toBe('fluid_type');
  });

  it('should not warn for water-soluble fluid', () => {
    const inputs = createInputs({ fluid_type: FluidType.WaterSoluble });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.FLUID_OIL_BASED)
    ).toBeUndefined();
  });

  it('should not warn for no fluid', () => {
    const inputs = createInputs({ fluid_type: FluidType.None });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.FLUID_OIL_BASED)
    ).toBeUndefined();
  });
});

// ============================================================================
// WARNING TESTS - Heavy Duty Suggestions
// ============================================================================

describe('validateInputs - Heavy Duty suggestions', () => {
  it('should warn when magnet width > 24" on Standard class', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.Standard,
      magnet_width_in: 30,
    });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.CONSIDER_HD_MAGNET_WIDTH
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe(
      'Consider Heavy Duty class for magnet width > 24"'
    );
    expect(warning?.field).toBe('magnet_width_in');
  });

  it('should not warn when magnet width > 24" on Heavy Duty class', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.HeavyDuty,
      magnet_width_in: 30,
    });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CONSIDER_HD_MAGNET_WIDTH)
    ).toBeUndefined();
  });

  it('should warn when load > 5000 lbs/hr on Standard class', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.Standard,
      load_lbs_per_hr: 6000,
    });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.CONSIDER_HD_LOAD
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe(
      'Consider Heavy Duty class for load > 5,000 lbs/hr'
    );
    expect(warning?.field).toBe('load_lbs_per_hr');
  });

  it('should not warn when load > 5000 lbs/hr on Heavy Duty class', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.HeavyDuty,
      load_lbs_per_hr: 6000,
    });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CONSIDER_HD_LOAD)
    ).toBeUndefined();
  });

  it('should warn when discharge height > 200" on Standard class', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.Standard,
      discharge_height_in: 250,
    });
    const messages = validateInputs(inputs);

    expect(hasWarnings(messages)).toBe(true);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.CONSIDER_HD_DISCHARGE_HEIGHT
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe(
      'Consider Heavy Duty class for discharge height > 200"'
    );
    expect(warning?.field).toBe('discharge_height_in');
  });

  it('should not warn when discharge height > 200" on Heavy Duty class', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.HeavyDuty,
      discharge_height_in: 250,
    });
    const messages = validateInputs(inputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CONSIDER_HD_DISCHARGE_HEIGHT)
    ).toBeUndefined();
  });
});

// ============================================================================
// OUTPUT VALIDATION TESTS - Chain Length
// ============================================================================

describe('validateOutputs - chain length warning', () => {
  it('should warn when chain length > 500" on Standard class', () => {
    // Create a large conveyor that will have chain > 500"
    const inputs = createInputs({
      conveyor_class: ConveyorClass.Standard,
      infeed_length_in: 100,
      discharge_height_in: 200,
      incline_angle_deg: 60,
    });
    const outputs = getOutputs(inputs);

    // Verify chain length is > 500"
    expect(outputs.chain_length_in).toBeGreaterThan(500);

    const messages = validateOutputs(inputs, outputs);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.CONSIDER_HD_CHAIN_LENGTH
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe(
      'Consider Heavy Duty class for chain length > 500"'
    );
    expect(warning?.field).toBe('chain_length_in');
  });

  it('should not warn when chain length <= 500"', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.Standard,
      infeed_length_in: 48,
      discharge_height_in: 50,
    });
    const outputs = getOutputs(inputs);

    // Verify chain length is <= 500"
    expect(outputs.chain_length_in).toBeLessThanOrEqual(500);

    const messages = validateOutputs(inputs, outputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CONSIDER_HD_CHAIN_LENGTH)
    ).toBeUndefined();
  });

  it('should not warn when chain length > 500" on Heavy Duty class', () => {
    const inputs = createInputs({
      conveyor_class: ConveyorClass.HeavyDuty,
      infeed_length_in: 100,
      discharge_height_in: 200,
      incline_angle_deg: 60,
    });
    const outputs = getOutputs(inputs);

    const messages = validateOutputs(inputs, outputs);

    expect(
      getMessageByCode(messages, ValidationCodes.CONSIDER_HD_CHAIN_LENGTH)
    ).toBeUndefined();
  });
});

// ============================================================================
// OUTPUT VALIDATION TESTS - Throughput Margin
// ============================================================================

describe('validateOutputs - throughput margin warnings', () => {
  it('should warn for chips when margin < 1.5', () => {
    const inputs = createInputs({ chip_type: ChipType.Small });
    // Create outputs with low margin
    const outputs: MagneticOutputs = {
      ...getOutputs(inputs),
      throughput_margin: 1.2, // Below 1.5 threshold
    };

    const messages = validateOutputs(inputs, outputs);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.THROUGHPUT_UNDERSIZED_CHIPS
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe('Undersized for chips');
  });

  it('should not warn for chips when margin >= 1.5', () => {
    const inputs = createInputs({ chip_type: ChipType.Small });
    const outputs: MagneticOutputs = {
      ...getOutputs(inputs),
      throughput_margin: 1.5,
    };

    const messages = validateOutputs(inputs, outputs);

    expect(
      getMessageByCode(messages, ValidationCodes.THROUGHPUT_UNDERSIZED_CHIPS)
    ).toBeUndefined();
  });

  it('should warn for parts when margin < 1.25', () => {
    const inputs = createInputs({ chip_type: ChipType.Parts });
    const outputs: MagneticOutputs = {
      ...getOutputs(inputs),
      throughput_margin: 1.1, // Below 1.25 threshold
    };

    const messages = validateOutputs(inputs, outputs);

    const warning = getMessageByCode(
      messages,
      ValidationCodes.THROUGHPUT_UNDERSIZED_PARTS
    );
    expect(warning).toBeDefined();
    expect(warning?.message).toBe('Undersized for parts');
  });

  it('should not warn for parts when margin >= 1.25', () => {
    const inputs = createInputs({ chip_type: ChipType.Parts });
    const outputs: MagneticOutputs = {
      ...getOutputs(inputs),
      throughput_margin: 1.25,
    };

    const messages = validateOutputs(inputs, outputs);

    expect(
      getMessageByCode(messages, ValidationCodes.THROUGHPUT_UNDERSIZED_PARTS)
    ).toBeUndefined();
  });

  it('should not warn for chips when margin is 0 (no throughput requested)', () => {
    const inputs = createInputs({ chip_type: ChipType.Small });
    const outputs: MagneticOutputs = {
      ...getOutputs(inputs),
      throughput_margin: 0,
    };

    const messages = validateOutputs(inputs, outputs);

    expect(
      getMessageByCode(messages, ValidationCodes.THROUGHPUT_UNDERSIZED_CHIPS)
    ).toBeUndefined();
  });
});

// ============================================================================
// COMBINED VALIDATION TESTS
// ============================================================================

describe('validate - combined', () => {
  it('should combine input and output validations', () => {
    // Create inputs with multiple warnings
    const inputs = createInputs({
      infeed_length_in: 30, // Warning: custom tail tracks
      belt_speed_fpm: 150, // Warning: speed too high
    });
    const outputs = getOutputs(inputs);

    const result = validate(inputs, outputs);

    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('should mark as invalid when errors present', () => {
    const inputs = createInputs({
      material_type: MaterialType.Aluminum,
    });
    const outputs = getOutputs(inputs);

    const result = validate(inputs, outputs);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.isValid).toBe(false);
  });

  it('should mark as valid when only warnings present', () => {
    const inputs = createInputs({
      infeed_length_in: 30, // Warning only
    });
    const outputs = getOutputs(inputs);

    const result = validate(inputs, outputs);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('should handle multiple errors', () => {
    const inputs = createInputs({
      material_type: MaterialType.Aluminum,
      style: ConveyorStyle.A,
      discharge_height_in: 0,
      incline_angle_deg: 0,
    });
    const outputs = getOutputs(inputs);

    const result = validate(inputs, outputs);

    // Should have material error + style C errors
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.isValid).toBe(false);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('utility functions', () => {
  const testMessages: ValidationMessage[] = [
    {
      type: 'error',
      code: 'ERR1',
      message: 'Error 1',
      field: 'field_a',
    },
    {
      type: 'warning',
      code: 'WARN1',
      message: 'Warning 1',
      field: 'field_a',
    },
    {
      type: 'warning',
      code: 'WARN2',
      message: 'Warning 2',
      field: 'field_b',
    },
  ];

  describe('hasErrors', () => {
    it('should return true when errors present', () => {
      expect(hasErrors(testMessages)).toBe(true);
    });

    it('should return false when no errors', () => {
      const warningsOnly = testMessages.filter((m) => m.type === 'warning');
      expect(hasErrors(warningsOnly)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasErrors([])).toBe(false);
    });
  });

  describe('hasWarnings', () => {
    it('should return true when warnings present', () => {
      expect(hasWarnings(testMessages)).toBe(true);
    });

    it('should return false when no warnings', () => {
      const errorsOnly = testMessages.filter((m) => m.type === 'error');
      expect(hasWarnings(errorsOnly)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasWarnings([])).toBe(false);
    });
  });

  describe('getMessagesForField', () => {
    it('should return messages for specific field', () => {
      const fieldAMessages = getMessagesForField(testMessages, 'field_a');
      expect(fieldAMessages).toHaveLength(2);
    });

    it('should return empty array for non-existent field', () => {
      const noMessages = getMessagesForField(testMessages, 'nonexistent');
      expect(noMessages).toHaveLength(0);
    });
  });

  describe('getMessageByCode', () => {
    it('should return message for specific code', () => {
      const message = getMessageByCode(testMessages, 'WARN1');
      expect(message).toBeDefined();
      expect(message?.message).toBe('Warning 1');
    });

    it('should return undefined for non-existent code', () => {
      const message = getMessageByCode(testMessages, 'NONEXISTENT');
      expect(message).toBeUndefined();
    });
  });
});

// ============================================================================
// COMBINED SCENARIO TESTS
// ============================================================================

describe('validation - real-world scenarios', () => {
  it('should validate typical Standard conveyor without errors', () => {
    const inputs: MagneticInputs = {
      style: ConveyorStyle.B,
      conveyor_class: ConveyorClass.Standard,
      infeed_length_in: 48,
      discharge_height_in: 100,
      incline_angle_deg: 60,
      discharge_length_in: 22,
      magnet_width_in: 12,
      magnet_type: MagnetType.Ceramic8,
      magnet_centers_in: 12,
      belt_speed_fpm: 30,
      load_lbs_per_hr: 1000,
      material_type: MaterialType.Steel,
      chip_type: ChipType.Small,
    };

    const outputs = getOutputs(inputs);
    const result = validate(inputs, outputs);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    // Note: Throughput warning expected due to placeholder calculation (margin = 1.0)
  });

  it('should validate Style C horizontal conveyor', () => {
    const inputs: MagneticInputs = {
      style: ConveyorStyle.C,
      conveyor_class: ConveyorClass.Standard,
      infeed_length_in: 100,
      discharge_height_in: 0,
      incline_angle_deg: 0,
      magnet_width_in: 9.5,
      magnet_type: MagnetType.Ceramic5,
      magnet_centers_in: 12,
      belt_speed_fpm: 45,
      load_lbs_per_hr: 500,
      material_type: MaterialType.Steel,
      chip_type: ChipType.Small,
    };

    const outputs = getOutputs(inputs);
    const result = validate(inputs, outputs);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn for Heavy Duty candidate on Standard class', () => {
    const inputs: MagneticInputs = {
      style: ConveyorStyle.B,
      conveyor_class: ConveyorClass.Standard,
      infeed_length_in: 60,
      discharge_height_in: 250, // HD trigger
      incline_angle_deg: 70,
      magnet_width_in: 30, // HD trigger
      magnet_type: MagnetType.Neo35,
      magnet_centers_in: 12,
      belt_speed_fpm: 30,
      load_lbs_per_hr: 6000, // HD trigger
      material_type: MaterialType.CastIron,
      chip_type: ChipType.Small,
    };

    const outputs = getOutputs(inputs);
    const result = validate(inputs, outputs);

    expect(result.isValid).toBe(true);
    // Should have multiple HD warnings
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);

    const hdWarnings = result.warnings.filter((w) =>
      w.code.startsWith('CONSIDER_HD_')
    );
    expect(hdWarnings.length).toBeGreaterThanOrEqual(3);
  });

  it('should not warn for Heavy Duty config on Heavy Duty class', () => {
    const inputs: MagneticInputs = {
      style: ConveyorStyle.B,
      conveyor_class: ConveyorClass.HeavyDuty,
      infeed_length_in: 60,
      discharge_height_in: 250,
      incline_angle_deg: 70,
      magnet_width_in: 30,
      magnet_type: MagnetType.Neo35,
      magnet_centers_in: 12,
      belt_speed_fpm: 30,
      load_lbs_per_hr: 6000,
      material_type: MaterialType.CastIron,
      chip_type: ChipType.Small,
    };

    const outputs = getOutputs(inputs);
    const result = validate(inputs, outputs);

    expect(result.isValid).toBe(true);

    // Should not have HD suggestions when already HD class
    const hdWarnings = result.warnings.filter((w) =>
      w.code.startsWith('CONSIDER_HD_')
    );
    expect(hdWarnings).toHaveLength(0);
  });
});
