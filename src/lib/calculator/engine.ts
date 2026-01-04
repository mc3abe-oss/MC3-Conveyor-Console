/**
 * CALCULATION ENGINE - VERSION-AGNOSTIC ORCHESTRATOR
 *
 * This engine orchestrates the complete calculation flow:
 * 1. Validate inputs and parameters
 * 2. Execute calculations
 * 3. Apply application rules
 * 4. Return results with metadata
 *
 * The engine is model-agnostic and can work with any model version.
 */

import {
  SliderbedInputs,
  SliderbedParameters,
  CalculationResult,
} from '../../models/sliderbed_v1/schema';
import { validate } from '../../models/sliderbed_v1/rules';
import { MODEL_KEY, MODEL_VERSION_ID } from '../model-identity';
// Use belt_conveyor_v1 for COF resolution based on bed_type
import {
  calculate,
  DEFAULT_PARAMETERS,
  BeltConveyorParameters,
} from '../../models/belt_conveyor_v1';

// ============================================================================
// INPUT NORMALIZATION
// ============================================================================

/**
 * Normalize inputs for backward compatibility.
 * Handles legacy field names and applies defaults.
 *
 * - conveyor_width_in → belt_width_in (v1.12 rename)
 */
function normalizeInputs(inputs: SliderbedInputs): SliderbedInputs {
  const normalized = { ...inputs };

  // v1.12: conveyor_width_in renamed to belt_width_in
  // Support legacy configs that use conveyor_width_in
  if (normalized.belt_width_in === undefined && normalized.conveyor_width_in !== undefined) {
    normalized.belt_width_in = normalized.conveyor_width_in;
  }

  return normalized;
}

// ============================================================================
// CALCULATION ENGINE
// ============================================================================

export interface CalculationRequest {
  inputs: SliderbedInputs;
  parameters?: Partial<SliderbedParameters>;
  model_version_id?: string;
}

/**
 * Main calculation engine entry point
 *
 * Validates, calculates, and returns results with full metadata.
 * This is a pure function - no side effects, no database calls.
 */
export function runCalculation(request: CalculationRequest): CalculationResult {
  const {
    inputs: rawInputs,
    parameters: parameterOverrides,
    model_version_id = MODEL_VERSION_ID,
  } = request;

  // Normalize inputs for backward compatibility (legacy field names)
  const inputs = normalizeInputs(rawInputs);

  // Merge default parameters with any overrides
  // Use BeltConveyorParameters for bed-type-specific COF defaults
  const parameters: BeltConveyorParameters = {
    ...DEFAULT_PARAMETERS,
    ...parameterOverrides,
  };

  // Step 1: Validate inputs and parameters
  const { errors, warnings } = validate(inputs, parameters);

  // Step 2: Execute calculations (even with errors)
  // The formulas use NaN for missing values and propagate gracefully.
  // This allows users to see partial/calculated values while fixing errors.
  const outputs = calculate(inputs, parameters);

  // Step 3: Return result with both outputs and any errors/warnings
  if (errors.length > 0) {
    return {
      success: false,
      outputs, // Include outputs even on failure for partial results
      errors,
      warnings,
      metadata: {
        model_version_id,
        calculated_at: new Date().toISOString(),
        model_key: MODEL_KEY,
      },
    };
  }

  // Step 4: Return successful result
  return {
    success: true,
    outputs,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      model_version_id,
      calculated_at: new Date().toISOString(),
      model_key: MODEL_KEY,
    },
  };
}

/**
 * Convenience function for running calculations with default parameters
 */
export function calculateSliderbed(inputs: SliderbedInputs): CalculationResult {
  return runCalculation({ inputs });
}
