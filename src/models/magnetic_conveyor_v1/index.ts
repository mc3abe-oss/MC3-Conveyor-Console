/**
 * MAGNETIC CONVEYOR v1.0 - PUBLIC API
 *
 * Source of Truth: docs/reference/mc3-magnetic-conveyor-master-reference.md
 * Model Key: magnetic_conveyor_v1
 *
 * CHANGELOG:
 * v1.0 (2026-01-23): Initial implementation
 */

// Type definitions
export * from './schema';

// Constants and parameters
export {
  STANDARD_PARAMS,
  HEAVY_DUTY_PARAMS,
  MAGNET_WEIGHT_INTERCEPT,
  MAGNET_WEIGHT_SLOPE,
  STARTING_BELT_PULL_LB,
  MOTOR_BASE_RPM,
  DEFAULT_DISCHARGE_LENGTH_IN,
  getParametersForClass,
  HEAVY_DUTY_THRESHOLDS,
  GEOMETRY_LIMITS,
  STANDARD_MAGNET_WIDTHS_IN,
  THROUGHPUT_MARGIN_THRESHOLDS,
} from './constants';

// Geometry calculations (Phase 2)
export {
  calculateInclineLength,
  calculateInclineRun,
  calculateHorizontalLength,
  calculatePathLength,
  calculateBeltLength,
  calculateChainLength,
  calculateGeometry,
  type GeometryResult,
} from './geometry';

// Magnet calculations (Phase 3)
export {
  calculateMagnetWeight,
  calculateMagnetWeightCustom,
  calculateMagnetQuantity,
  calculateTotalMagnetWeight,
  calculateMagnets,
  type MagnetResult,
} from './magnets';

// Load calculations (Phase 4)
export {
  calculateWeightPerFoot,
  calculateBeltPullFriction,
  calculateBeltPullGravity,
  calculateTotalLoad,
  calculateLoads,
  type LoadResult,
} from './loads';

// Drive calculations (Phase 5)
export {
  calculateTotalBeltPull,
  calculateRunningTorque,
  calculateTotalTorque,
  calculateRequiredRpm,
  calculateSuggestedGearRatio,
  calculateDrive,
  type DriveResult,
} from './drive';

// Master calculate function (Phase 6)
export {
  calculate,
  resolveParameters,
  calculateThroughput,
  type ThroughputResult,
} from './formulas';

// Validation (Phase 7)
export {
  validate,
  validateInputs,
  validateOutputs,
  hasErrors,
  hasWarnings,
  getMessagesForField,
  getMessageByCode,
  ValidationCodes,
  type ValidationMessage,
  type ValidationResult,
} from './validation';
