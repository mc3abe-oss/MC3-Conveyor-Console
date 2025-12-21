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
  DEFAULT_PARAMETERS,
} from '../../models/sliderbed_v1/schema';
import { calculate } from '../../models/sliderbed_v1/formulas';
import { validate } from '../../models/sliderbed_v1/rules';

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
    inputs,
    parameters: parameterOverrides,
    model_version_id = 'sliderbed_v1_factory_default',
  } = request;

  // Merge default parameters with any overrides
  const parameters: SliderbedParameters = {
    ...DEFAULT_PARAMETERS,
    ...parameterOverrides,
  };

  // Step 1: Validate inputs and parameters
  const { errors, warnings } = validate(inputs, parameters);

  // Step 2: If there are errors, return early (do not calculate)
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
      metadata: {
        model_version_id,
        calculated_at: new Date().toISOString(),
        model_key: 'sliderbed_conveyor_v1',
      },
    };
  }

  // Step 3: Execute calculations
  const outputs = calculate(inputs, parameters);

  // Step 4: Return successful result
  return {
    success: true,
    outputs,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      model_version_id,
      calculated_at: new Date().toISOString(),
      model_key: 'sliderbed_conveyor_v1',
    },
  };
}

/**
 * Convenience function for running calculations with default parameters
 */
export function calculateSliderbed(inputs: SliderbedInputs): CalculationResult {
  return runCalculation({ inputs });
}
