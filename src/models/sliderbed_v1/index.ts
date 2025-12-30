/**
 * SLIDERBED CONVEYOR v1 - PUBLIC API
 *
 * @deprecated Use belt_conveyor_v1 instead. This module is kept for backward compatibility.
 *
 * The sliderbed_conveyor_v1 model has been superseded by belt_conveyor_v1.
 * All exports remain functional for legacy code.
 *
 * Migration path:
 *   // Old code:
 *   import { calculate, SliderbedInputs } from './sliderbed_v1';
 *
 *   // New code:
 *   import { calculate, BeltConveyorInputs, BedType } from './belt_conveyor_v1';
 *   const inputs: BeltConveyorInputs = { bed_type: BedType.SliderBed, ... };
 */

// Type definitions
export * from './schema';

// Calculation functions
export { calculate } from './formulas';

// Validation
export { validate, validateInputs, validateParameters, applyApplicationRules, applyPciOutputRules } from './rules';

// Test fixtures
export * from './fixtures';
