/**
 * BELT CONVEYOR v1.0 - PUBLIC API
 *
 * This module exports the complete belt conveyor calculation engine.
 * It supersedes sliderbed_conveyor_v1 with full backward compatibility.
 *
 * USAGE:
 *   import { calculate, BeltConveyorInputs, BedType } from './belt_conveyor_v1';
 *
 *   const inputs: BeltConveyorInputs = {
 *     bed_type: BedType.SliderBed,  // or BedType.RollerBed
 *     // ... other fields
 *   };
 *
 *   const result = calculate(inputs, DEFAULT_PARAMETERS);
 */

// ============================================================================
// SCHEMA EXPORTS
// ============================================================================

// Enums and values
export {
  BedType,
  PremiumLevel,
  BED_TYPE_COF_DEFAULTS,
  DEFAULT_PARAMETERS,
  DEFAULT_INPUT_VALUES,
  resolveModelKey,
  isLegacyModelKey,
  migrateLegacyInputs,
  resolveEffectiveCOF,
  resolveBedType,
} from './schema';

// Types (must use export type for isolatedModules)
export type {
  BeltConveyorInputs,
  BeltConveyorParameters,
  BeltConveyorOutputs,
  PremiumFlags,
  CalculationMetadata,
  CalculationResult,
  SliderbedInputsAlias,
  SliderbedParametersAlias,
  SliderbedOutputsAlias,
} from './schema';

// Re-export all enums from sliderbed (via schema)
export {
  // Application Basics
  MaterialType,
  ProcessType,
  PartsSharp,
  // Environment and Temperature
  EnvironmentFactors,
  FluidType,
  PartTemperatureClass,
  AmbientTemperature,
  // Electrical and Controls
  PowerFeed,
  ControlsPackage,
  // Build Options and Deliverables
  SpecSource,
  SupportOption,
  FieldWiringRequired,
  BearingGrade,
  DocumentationPackage,
  FinishPaintSystem,
  LabelsRequired,
  SendToEstimating,
  MotorBrand,
  // Core enums
  Orientation,
  // Features & Options
  SideRails,
  EndGuards,
  LacingStyle,
  LacingMaterial,
  SensorOption,
  // Application / Demand
  PulleySurfaceType,
  DirectionMode,
  SideLoadingDirection,
  SideLoadingSeverity,
  // Specifications
  DriveLocation,
  GearmotorOrientation,
  DriveHand,
  // Belt Tracking & Pulley
  BeltTrackingMethod,
  VGuideProfile,
  ShaftDiameterMode,
} from './schema';

// Validation types
export type { ValidationError, ValidationWarning } from './schema';

// ============================================================================
// FORMULA EXPORTS
// ============================================================================

export {
  // Master calculation function
  calculate,
  calculateSliderbed, // Legacy alias
  // Individual formulas (all unchanged from sliderbed)
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
} from './formulas';

// ============================================================================
// RULES EXPORTS
// ============================================================================

// Phase 2 dedup: belt_conveyor_v1/rules.ts deleted — use shared sliderbed rules
export { validate, validateInputs, validateParameters, applyApplicationRules } from '../sliderbed_v1/rules';

// ============================================================================
// PREMIUM FLAGS EXPORTS
// ============================================================================

export {
  calculatePremiumFlags,
  getPremiumLevelDescription,
  getPremiumLevelColor,
} from './premium-flags';

// ============================================================================
// TRACKING GUIDANCE EXPORTS
// ============================================================================

export { TrackingRiskLevel, getRiskLevelColor } from './tracking-guidance';

export type { TrackingRiskFactor, TrackingGuidance } from './tracking-guidance';

export {
  calculateTrackingGuidance,
  getTrackingTooltip,
  isTrackingSelectionOptimal,
} from './tracking-guidance';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { calculate } from './formulas';
import { validate } from '../sliderbed_v1/rules';
import type { BeltConveyorInputs, BeltConveyorParameters, CalculationResult } from './schema';
import { DEFAULT_PARAMETERS } from './schema';
import { MODEL_KEY, MODEL_VERSION_ID } from '../../lib/model-identity';

/**
 * Convenience function to run full calculation with validation
 *
 * @param inputs - Belt conveyor inputs
 * @param parameters - Optional parameters (defaults to DEFAULT_PARAMETERS)
 * @returns CalculationResult with outputs, errors, warnings, and metadata
 */
export function calculateBeltConveyor(
  inputs: BeltConveyorInputs,
  parameters: BeltConveyorParameters = DEFAULT_PARAMETERS
): CalculationResult {
  // Run validation
  const { errors, warnings } = validate(inputs, parameters, 'belt_conveyor_v1');

  // If validation errors, return early
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
      metadata: {
        model_version_id: MODEL_VERSION_ID,
        calculated_at: new Date().toISOString(),
        model_key: MODEL_KEY,
      },
    };
  }

  // Run calculation
  const outputs = calculate(inputs, parameters);

  return {
    success: true,
    outputs,
    warnings,
    metadata: {
      model_version_id: MODEL_VERSION_ID,
      calculated_at: new Date().toISOString(),
      model_key: MODEL_KEY,
    },
  };
}
