/**
 * Belt Compatibility Validation (v1.38)
 *
 * Validates belt selection against part temperature and oil/fluid conditions.
 * Returns errors (blocking) and warnings (non-blocking) for UI display.
 *
 * This is a read-only validation module - it does not modify any state.
 */

// ============================================================================
// Types
// ============================================================================

// Accept both enum values ('F', 'C') and string literals ('Fahrenheit', 'Celsius')
export type TemperatureUnit = 'F' | 'C' | 'Fahrenheit' | 'Celsius';

export type FluidsOnMaterial = 'NO' | 'YES' | 'UNKNOWN';

export type MaterialFluidType =
  | 'WATER'
  | 'COOLANT'
  | 'OIL'
  | 'MIXED'
  | 'OTHER'
  | 'UNKNOWN';

export interface BeltCompatibilityIssue {
  /** Unique code for this issue type */
  code: string;
  /** User-friendly message */
  message: string;
  /** Optional additional detail */
  detail?: string;
  /** Severity: error blocks save, warning allows progress */
  severity: 'error' | 'warning';
  /** UI section key for routing the issue */
  sectionKey: 'belt' | 'application';
}

export interface BeltCompatibilityInput {
  /** Part temperature value (nullable if not entered) */
  partTempValue: number | null;
  /** Part temperature unit */
  partTempUnit: TemperatureUnit;
  /** Whether fluids are present on material */
  fluidsOnMaterial: FluidsOnMaterial | null;
  /** Type of fluid (only relevant if fluidsOnMaterial === 'YES') */
  materialFluidType: MaterialFluidType | null;
}

export interface BeltInfo {
  /** Minimum operating temperature in Fahrenheit (nullable) */
  temp_min_f: number | null;
  /** Maximum operating temperature in Fahrenheit (nullable) */
  temp_max_f: number | null;
  /** Whether belt is oil resistant */
  oil_resistant: boolean;
}

export interface BeltCompatibilityResult {
  /** All issues found (both errors and warnings) */
  issues: BeltCompatibilityIssue[];
  /** Convenience: just the errors */
  errors: BeltCompatibilityIssue[];
  /** Convenience: just the warnings */
  warnings: BeltCompatibilityIssue[];
  /** Whether there are any blocking errors */
  hasErrors: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Warning margin for approaching maximum temperature */
const TEMP_WARNING_MARGIN_F = 10;

// Rules Telemetry - Observability only, no behavior changes
import {
  emitRuleEvent,
  createContext,
  isEnabled,
} from '../rules-telemetry';

// Issue codes
export const ISSUE_CODES = {
  BELT_TEMP_EXCEEDED: 'BELT_TEMP_EXCEEDED',
  BELT_TEMP_NEAR_MAX: 'BELT_TEMP_NEAR_MAX',
  BELT_TEMP_BELOW_MIN: 'BELT_TEMP_BELOW_MIN',
  BELT_TEMP_RATING_MISSING: 'BELT_TEMP_RATING_MISSING',
  BELT_OIL_INCOMPATIBLE: 'BELT_OIL_INCOMPATIBLE',
  BELT_FLUID_TYPE_UNKNOWN: 'BELT_FLUID_TYPE_UNKNOWN',
} as const;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert temperature to Fahrenheit.
 *
 * @param value - Temperature value
 * @param unit - Temperature unit (accepts 'F', 'C', 'Fahrenheit', 'Celsius')
 * @returns Temperature in Fahrenheit
 */
export function toFahrenheit(value: number, unit: TemperatureUnit): number {
  if (unit === 'Celsius' || unit === 'C') {
    return (value * 9) / 5 + 32;
  }
  return value;
}

/**
 * Check if a fluid type indicates oil is present.
 * Per spec: Only OIL or MIXED triggers the oil-resistance check.
 *
 * @param fluidType - Material fluid type
 * @returns True if oil is present
 */
function isOilPresent(fluidType: MaterialFluidType | null): boolean {
  return fluidType === 'OIL' || fluidType === 'MIXED';
}

/**
 * Check if fluid type is unknown or unspecified.
 *
 * @param fluidType - Material fluid type
 * @returns True if fluid type is ambiguous
 */
function isFluidTypeUnknown(fluidType: MaterialFluidType | null): boolean {
  return fluidType === 'UNKNOWN' || fluidType === 'OTHER' || fluidType === null;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Check belt compatibility with part temperature and fluid conditions.
 *
 * @param input - Part/application conditions
 * @param belt - Belt specifications
 * @returns Validation result with issues
 */
export function checkBeltCompatibility(
  input: BeltCompatibilityInput,
  belt: BeltInfo
): BeltCompatibilityResult {
  const issues: BeltCompatibilityIssue[] = [];

  // -------------------------------------------------------------------------
  // Temperature Checks
  // -------------------------------------------------------------------------

  if (input.partTempValue !== null && input.partTempValue !== undefined) {
    const partTempF = toFahrenheit(input.partTempValue, input.partTempUnit);

    // Check if belt has temperature ratings
    const hasTempRatings = belt.temp_max_f !== null || belt.temp_min_f !== null;

    if (!hasTempRatings) {
      // Belt has no temperature ratings - warn admin
      issues.push({
        code: ISSUE_CODES.BELT_TEMP_RATING_MISSING,
        message:
          'Selected belt has no temperature rating set. Temperature suitability cannot be verified.',
        detail: 'Contact admin to set belt temperature limits.',
        severity: 'warning',
        sectionKey: 'belt',
      });
    } else {
      // Check maximum temperature
      if (belt.temp_max_f !== null) {
        if (partTempF > belt.temp_max_f) {
          // ERROR: Exceeds maximum
          issues.push({
            code: ISSUE_CODES.BELT_TEMP_EXCEEDED,
            message:
              'Part temperature exceeds the maximum rating of the selected belt.',
            detail: `Part: ${Math.round(partTempF)}°F, Belt max: ${belt.temp_max_f}°F`,
            severity: 'error',
            sectionKey: 'belt',
          });
        } else if (partTempF >= belt.temp_max_f - TEMP_WARNING_MARGIN_F) {
          // WARNING: Approaching maximum
          issues.push({
            code: ISSUE_CODES.BELT_TEMP_NEAR_MAX,
            message:
              "Part temperature is close to the belt's maximum rating. Expect accelerated wear.",
            detail: `Part: ${Math.round(partTempF)}°F, Belt max: ${belt.temp_max_f}°F`,
            severity: 'warning',
            sectionKey: 'belt',
          });
        }
      }

      // Check minimum temperature
      if (belt.temp_min_f !== null && partTempF < belt.temp_min_f) {
        // WARNING: Below minimum
        issues.push({
          code: ISSUE_CODES.BELT_TEMP_BELOW_MIN,
          message:
            "Part temperature is below the belt's minimum rating. Belt stiffness and tracking may be affected.",
          detail: `Part: ${Math.round(partTempF)}°F, Belt min: ${belt.temp_min_f}°F`,
          severity: 'warning',
          sectionKey: 'belt',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Oil/Fluid Checks
  // -------------------------------------------------------------------------

  if (input.fluidsOnMaterial === 'YES') {
    if (isOilPresent(input.materialFluidType)) {
      // Oil is present - check belt resistance
      if (!belt.oil_resistant) {
        // ERROR: Oil present but belt not oil resistant
        issues.push({
          code: ISSUE_CODES.BELT_OIL_INCOMPATIBLE,
          message:
            'Oil is present on material, but the selected belt is not oil resistant.',
          severity: 'error',
          sectionKey: 'belt',
        });
      }
    } else if (isFluidTypeUnknown(input.materialFluidType)) {
      // Fluid present but type unknown - warn
      issues.push({
        code: ISSUE_CODES.BELT_FLUID_TYPE_UNKNOWN,
        message:
          'Fluid is present but type is not specified. If oil is present, an oil-resistant belt may be required.',
        severity: 'warning',
        sectionKey: 'application',
      });
    }
    // WATER or COOLANT: No oil error (as per spec - Option A)
  }

  // -------------------------------------------------------------------------
  // Build Result
  // -------------------------------------------------------------------------

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  // Telemetry: Capture belt compatibility events (observability only)
  if (isEnabled() && issues.length > 0) {
    const ctx = createContext(
      'src/lib/validation/beltCompatibility.ts:checkBeltCompatibility',
      'belt_conveyor_v1'
    );
    for (const issue of issues) {
      emitRuleEvent(issue.severity, issue.message, ctx, issue.sectionKey);
    }
  }

  return {
    issues,
    errors,
    warnings,
    hasErrors: errors.length > 0,
  };
}
