/**
 * BELT CONVEYOR v1.0 - TYPE DEFINITIONS
 *
 * Source of Truth: Belt Conveyor Model Specification (Authoritative)
 * Model Key: belt_conveyor_v1
 * Excel Parity: Required
 *
 * This file defines the complete type system for inputs, parameters, and outputs.
 * All units are explicit. No hidden conversions.
 *
 * MIGRATION NOTE:
 * This model supersedes sliderbed_conveyor_v1. The old model key is aliased to this one.
 * Legacy configs without bed_type default to 'slider_bed' for backward compatibility.
 *
 * CHANGELOG:
 * v1.0 (2025-12-21): Initial belt_conveyor_v1 with bed_type support
 *   - Renamed from sliderbed_conveyor_v1
 *   - Added BedType enum (slider_bed, roller_bed, other)
 *   - Added bed-type-specific COF defaults
 *   - Added premium feature flags
 *   - All legacy sliderbed_v1 behavior preserved via aliases
 */

// ============================================================================
// RE-EXPORT ALL ENUMS FROM SLIDERBED (unchanged)
// ============================================================================

// Enum re-exports
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
} from '../sliderbed_v1/schema';

// Type re-exports (must use export type for isolatedModules)
export type { ValidationError, ValidationWarning } from '../sliderbed_v1/schema';

// ============================================================================
// NEW ENUMS FOR BELT CONVEYOR
// ============================================================================

/**
 * Bed Type - determines support method under belt
 *
 * slider_bed: Belt slides over flat plate (higher friction, standard)
 * roller_bed: Belt rides on rollers (lower friction, premium)
 * other: Placeholder for future bed types
 */
export enum BedType {
  SliderBed = 'slider_bed',
  RollerBed = 'roller_bed',
  Other = 'other',
}

/**
 * Premium level classification for build cost estimation
 */
export enum PremiumLevel {
  Standard = 'standard',
  Premium = 'premium',
  PremiumPlus = 'premium_plus',
}

// ============================================================================
// COF PRESETS BY BED TYPE
// ============================================================================

/**
 * Default friction coefficients by bed type
 * These are used when friction_coeff is not explicitly overridden
 */
export const BED_TYPE_COF_DEFAULTS: Record<BedType, number> = {
  [BedType.SliderBed]: 0.25, // Belt sliding on plate - legacy default
  [BedType.RollerBed]: 0.03, // Belt riding on rollers - much lower
  [BedType.Other]: 0.25, // Fallback to slider bed behavior
};

// ============================================================================
// INPUTS SCHEMA
// ============================================================================

import type {
  SliderbedInputs,
  SliderbedParameters,
  SliderbedOutputs,
} from '../sliderbed_v1/schema';

import {
  DEFAULT_PARAMETERS as SLIDERBED_DEFAULT_PARAMETERS,
  DEFAULT_INPUT_VALUES as SLIDERBED_DEFAULT_INPUT_VALUES,
} from '../sliderbed_v1/schema';

/**
 * Belt Conveyor Inputs
 *
 * Extends SliderbedInputs with:
 * - bed_type: Required enum for bed support type
 *
 * For backward compatibility:
 * - Missing bed_type defaults to 'slider_bed'
 * - Explicit friction_coeff override takes precedence over bed_type default
 */
export interface BeltConveyorInputs extends SliderbedInputs {
  /**
   * Bed type - determines support method under belt
   * Defaults to 'slider_bed' for legacy compatibility
   */
  bed_type?: BedType | string;
}

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

/**
 * Belt Conveyor Parameters
 *
 * Extends SliderbedParameters with bed-type-specific friction defaults
 */
export interface BeltConveyorParameters extends SliderbedParameters {
  /** Friction coefficient for slider bed (legacy default) */
  friction_coeff_slider_bed: number;

  /** Friction coefficient for roller bed */
  friction_coeff_roller_bed: number;
}

// ============================================================================
// OUTPUTS SCHEMA
// ============================================================================

/**
 * Premium flags for build cost estimation
 */
export interface PremiumFlags {
  /** Whether any premium feature is selected */
  is_premium: boolean;

  /** List of reasons for premium classification */
  premium_reasons: string[];

  /** Overall premium level */
  premium_level: PremiumLevel;
}

/**
 * Belt Conveyor Outputs
 *
 * Extends SliderbedOutputs with:
 * - bed_type_used: Resolved bed type
 * - premium_flags: Premium feature detection
 */
export interface BeltConveyorOutputs extends SliderbedOutputs {
  /** Bed type used for this calculation */
  bed_type_used: BedType;

  /** Premium feature flags */
  premium_flags: PremiumFlags;
}

// ============================================================================
// METADATA
// ============================================================================

export interface CalculationMetadata {
  model_version_id: string;
  calculated_at: string; // ISO 8601 timestamp
  model_key: 'belt_conveyor_v1' | 'sliderbed_conveyor_v1'; // Support both for migration
}

// ============================================================================
// CALCULATION RESULT
// ============================================================================

export interface CalculationResult {
  success: boolean;
  outputs?: BeltConveyorOutputs;
  errors?: import('../sliderbed_v1/schema').ValidationError[];
  warnings?: import('../sliderbed_v1/schema').ValidationWarning[];
  metadata: CalculationMetadata;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_PARAMETERS: BeltConveyorParameters = {
  ...SLIDERBED_DEFAULT_PARAMETERS,
  friction_coeff_slider_bed: 0.25,
  friction_coeff_roller_bed: 0.03,
};

export const DEFAULT_INPUT_VALUES = {
  ...SLIDERBED_DEFAULT_INPUT_VALUES,
  bed_type: BedType.SliderBed,
};

// ============================================================================
// LEGACY ALIASES (for backward compatibility)
// ============================================================================

/** @deprecated Use BeltConveyorInputs instead */
export type SliderbedInputsAlias = BeltConveyorInputs;

/** @deprecated Use BeltConveyorParameters instead */
export type SliderbedParametersAlias = BeltConveyorParameters;

/** @deprecated Use BeltConveyorOutputs instead */
export type SliderbedOutputsAlias = BeltConveyorOutputs;

// ============================================================================
// MODEL KEY RESOLUTION
// ============================================================================

/**
 * Resolve legacy model key to canonical model key
 */
export function resolveModelKey(modelKey: string): string {
  const aliases: Record<string, string> = {
    sliderbed_conveyor_v1: 'belt_conveyor_v1',
  };
  return aliases[modelKey] || modelKey;
}

/**
 * Check if a model key is a legacy alias
 */
export function isLegacyModelKey(modelKey: string): boolean {
  return modelKey === 'sliderbed_conveyor_v1';
}

// ============================================================================
// INPUT MIGRATION
// ============================================================================

/**
 * Migrate legacy SliderbedInputs to BeltConveyorInputs
 *
 * - Adds bed_type: 'slider_bed' if missing
 * - Preserves all existing fields
 * - Does NOT change friction_coeff (preserves explicit overrides)
 */
export function migrateLegacyInputs(inputs: SliderbedInputs): BeltConveyorInputs {
  return {
    ...inputs,
    bed_type: BedType.SliderBed, // Legacy behavior = slider bed
  };
}

/**
 * Resolve effective friction coefficient based on inputs and parameters
 *
 * Priority order:
 * 1. Explicit friction_coeff override in inputs
 * 2. Bed-type-specific preset
 * 3. Parameter default (legacy fallback)
 */
export function resolveEffectiveCOF(
  inputs: BeltConveyorInputs,
  parameters: BeltConveyorParameters
): number {
  // Priority 1: Explicit user override
  if (inputs.friction_coeff !== undefined) {
    return inputs.friction_coeff;
  }

  // Priority 2: Bed-type-specific preset
  const bedType = resolveBedType(inputs.bed_type);

  switch (bedType) {
    case BedType.SliderBed:
      return parameters.friction_coeff_slider_bed;
    case BedType.RollerBed:
      return parameters.friction_coeff_roller_bed;
    case BedType.Other:
    default:
      // Fallback to legacy default
      return parameters.friction_coeff;
  }
}

/**
 * Resolve bed type from input value (handles string and enum)
 */
export function resolveBedType(bedType: BedType | string | undefined): BedType {
  if (!bedType) {
    return BedType.SliderBed; // Legacy default
  }

  // Handle string values
  if (typeof bedType === 'string') {
    const normalized = bedType.toLowerCase().replace(/[^a-z_]/g, '_');
    if (normalized === 'slider_bed' || normalized === 'sliderbed') {
      return BedType.SliderBed;
    }
    if (normalized === 'roller_bed' || normalized === 'rollerbed') {
      return BedType.RollerBed;
    }
    if (normalized === 'other') {
      return BedType.Other;
    }
  }

  // Handle enum values
  if (Object.values(BedType).includes(bedType as BedType)) {
    return bedType as BedType;
  }

  return BedType.SliderBed; // Fallback
}
