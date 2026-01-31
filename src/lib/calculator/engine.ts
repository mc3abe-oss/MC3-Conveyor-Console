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
// Use belt_conveyor_v1 for default parameters and COF resolution
import {
  DEFAULT_PARAMETERS,
  BeltConveyorParameters,
} from '../../models/belt_conveyor_v1';
// Product registry for product-specific calculation dispatch
import { getProduct, beltConveyorV1 } from '../../products';

// ============================================================================
// TELEMETRY HOOKS
// ============================================================================

/**
 * Optional telemetry callbacks for observing calculation events.
 * These are called by the engine but do not affect control flow.
 */
export interface CalcTelemetryHooks {
  onCalcStart?: (calcKey: string, context: { productKey?: string; modelKey?: string }) => void;
  onCalcSuccess?: (calcKey: string, durationMs: number, context: { productKey?: string; modelKey?: string }) => void;
  onCalcError?: (calcKey: string, error: string, context: { productKey?: string; modelKey?: string; stack?: string }) => void;
}

let telemetryHooks: CalcTelemetryHooks = {};

/**
 * Set telemetry hooks for calculation events.
 * Call this from client-side code to wire up telemetry.
 */
export function setCalcTelemetryHooks(hooks: CalcTelemetryHooks): void {
  telemetryHooks = hooks;
}

/**
 * Clear telemetry hooks.
 */
export function clearCalcTelemetryHooks(): void {
  telemetryHooks = {};
}

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
// PRODUCT RESOLVER
// ============================================================================

/**
 * Resolve the product module for calculation dispatch.
 * Falls back to belt conveyor if productKey is missing or unknown.
 *
 * @param productKey - Product key to look up
 * @returns Product module with calculate function
 */
function resolveProductForCalculation(productKey?: string) {
  // No productKey provided - fall back to belt (existing behavior)
  if (!productKey) {
    return beltConveyorV1;
  }

  // Look up product in registry
  const product = getProduct(productKey);
  if (product) {
    return product;
  }

  // Unknown productKey - warn in dev, fall back to belt
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[engine] Unknown productKey "${productKey}", falling back to belt_conveyor_v1`
    );
  }
  return beltConveyorV1;
}

// ============================================================================
// CALCULATION ENGINE
// ============================================================================

export interface CalculationRequest {
  inputs: SliderbedInputs;
  parameters?: Partial<SliderbedParameters>;
  model_version_id?: string;
  /** Product key for product-scoped validation (e.g., 'belt_conveyor_v1', 'magnetic_conveyor_v1') */
  productKey?: string;
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
    productKey,
  } = request;

  const calcKey = `calc_${productKey || 'default'}`;
  const telemetryContext = { productKey, modelKey: MODEL_KEY };
  const startTime = Date.now();

  // Emit calc start telemetry
  telemetryHooks.onCalcStart?.(calcKey, telemetryContext);

  try {
    // Normalize inputs for backward compatibility (legacy field names)
    const inputs = normalizeInputs(rawInputs);

    // Merge default parameters with any overrides
    // Use BeltConveyorParameters for bed-type-specific COF defaults
    const parameters: BeltConveyorParameters = {
      ...DEFAULT_PARAMETERS,
      ...parameterOverrides,
    };

    // Step 1: Validate inputs and parameters
    // Pass productKey for product-scoped validation (e.g., skip belt validation for magnetic)
    const { errors, warnings } = validate(inputs, parameters, productKey);

    // Step 2: Execute calculations (even with errors)
    // The formulas use NaN for missing values and propagate gracefully.
    // This allows users to see partial/calculated values while fixing errors.
    // Dispatch to product-specific calculator based on productKey
    const product = resolveProductForCalculation(productKey);
    const outputs = product.calculate(inputs, parameters as unknown as Record<string, unknown>);

    const durationMs = Date.now() - startTime;

    // Step 3: Return result with both outputs and any errors/warnings
    if (errors.length > 0) {
      // Emit error telemetry for validation failures
      telemetryHooks.onCalcError?.(calcKey, `Validation failed: ${errors.length} error(s)`, telemetryContext);

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

    // Emit success telemetry
    telemetryHooks.onCalcSuccess?.(calcKey, durationMs, telemetryContext);

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
  } catch (error) {
    // Emit error telemetry for exceptions
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    telemetryHooks.onCalcError?.(calcKey, errorMessage, { ...telemetryContext, stack: errorStack });

    throw error;
  }
}

/**
 * Convenience function for running calculations with default parameters
 */
export function calculateSliderbed(inputs: SliderbedInputs): CalculationResult {
  return runCalculation({ inputs });
}
