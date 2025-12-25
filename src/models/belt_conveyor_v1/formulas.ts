/**
 * BELT CONVEYOR v1.0 - CALCULATION FORMULAS
 *
 * This module extends sliderbed formulas with:
 * - Bed-type-aware COF resolution
 * - Premium feature flag calculation
 *
 * All sliderbed formulas are preserved unchanged for math parity.
 *
 * CHANGELOG:
 * v1.0 (2025-12-21): Initial belt_conveyor_v1 with bed_type support
 */

import {
  BeltConveyorInputs,
  BeltConveyorParameters,
  BeltConveyorOutputs,
  BedType,
  resolveEffectiveCOF,
  resolveBedType,
} from './schema';

import { calculatePremiumFlags } from './premium-flags';

// Re-export all individual formulas from sliderbed (unchanged)
export {
  calculateEffectiveBeltCoefficients,
  calculateBeltWeightCoefficients,
  calculateTotalBeltLength,
  calculateBeltWeight,
  calculatePartsOnBelt,
  calculateLoadOnBelt,
  calculateTotalLoad,
  calculateAvgLoadPerFoot,
  calculateBeltPull,
  calculateFrictionPull,
  calculateInclinePull,
  calculateTotalBeltPull,
  calculateDriveShaftRpm,
  calculateTorqueDriveShaft,
  calculateGearRatio,
  calculatePitch,
  calculateBeltSpeed,
  calculateCapacity,
  calculateTargetThroughput,
  calculateRpmRequired,
  calculateMarginAchieved,
  calculateIsVGuided,
  calculatePulleyRequiresCrown,
  calculatePulleyFaceExtra,
  calculatePulleyFaceLength,
  calculateShaftDiameterLegacy,
} from '../sliderbed_v1/formulas';

import { calculate as sliderbedCalculate } from '../sliderbed_v1/formulas';
import type { SliderbedInputs } from '../sliderbed_v1/schema';

// ============================================================================
// MASTER CALCULATION FUNCTION
// ============================================================================

/**
 * Execute all calculations with bed-type-aware COF resolution
 *
 * This function:
 * 1. Resolves bed_type (defaults to slider_bed for legacy)
 * 2. Resolves effective COF based on bed_type and explicit overrides
 * 3. Calls sliderbed formulas with resolved COF
 * 4. Adds premium flags to output
 *
 * IMPORTANT: For legacy compatibility, missing bed_type = slider_bed
 */
export function calculate(
  inputs: BeltConveyorInputs,
  parameters: BeltConveyorParameters
): BeltConveyorOutputs {
  // Step 1: Resolve bed type (defaults to slider_bed for legacy configs)
  const bedTypeUsed = resolveBedType(inputs.bed_type);

  // Step 2: Resolve effective COF
  // Priority: explicit override > bed-type preset > parameter default
  const effectiveCOF = resolveEffectiveCOF(inputs, parameters);

  // Step 3: Create inputs with resolved COF for sliderbed calculation
  const resolvedInputs: SliderbedInputs = {
    ...inputs,
    friction_coeff: effectiveCOF, // Inject resolved COF
  };

  // Step 4: Run sliderbed calculation (all formulas unchanged)
  const sliderbedOutputs = sliderbedCalculate(resolvedInputs, parameters);

  // Step 5: Calculate premium flags
  const premiumFlags = calculatePremiumFlags(inputs);

  // Step 6: Return extended outputs
  return {
    ...sliderbedOutputs,
    bed_type_used: bedTypeUsed,
    premium_flags: premiumFlags,
  };
}

/**
 * Legacy alias for sliderbed calculation
 *
 * This function behaves exactly like the old sliderbed calculate(),
 * treating any input as a slider bed configuration.
 *
 * @deprecated Use calculate() with explicit bed_type instead
 */
export function calculateSliderbed(
  inputs: SliderbedInputs,
  parameters: BeltConveyorParameters
): BeltConveyorOutputs {
  // Treat as slider bed with no bed_type override
  const beltInputs: BeltConveyorInputs = {
    ...inputs,
    bed_type: BedType.SliderBed,
  };

  return calculate(beltInputs, parameters);
}
