/**
 * SLIDERBED CONVEYOR v1.29 - CALCULATION FORMULAS
 *
 * All formulas match Excel behavior exactly.
 * Units are explicit in variable names and comments.
 * No hidden conversions. No magic numbers.
 *
 * Execution order matters - formulas must be called in dependency order.
 *
 * CHANGELOG:
 * v1.29 (2026-01-01): Product Definition vNext - PARTS vs BULK material support
 *                     New BULK load formula using residence-time method
 *                     New canonical outputs: mass_flow_lbs_per_hr, time_on_belt_min
 *                     PARTS mode unchanged (no math drift)
 *                     Return Support configuration - explicit user selection
 *                     Replaces frame-height-derived snub roller logic
 *                     New: return_frame_style, return_snub_mode, return_gravity_roller_count
 *                     New outputs: return_snubs_enabled, return_span_in, return_gravity_roller_centers_in
 * v1.27 (2025-12-30): PCI Pulley Guide integration - tube stress checks
 *                     Wires shaftCalc radial_load, T1, T2 to outputs
 *                     New PCI tube stress calculation per Appendix A formula
 * v1.24 (2025-12-30): Pulley family/variant support - new inputs drive_pulley_variant_key,
 *                     tail_pulley_variant_key; new outputs drive/tail_pulley_shell_od_in,
 *                     drive/tail_pulley_finished_od_in
 * v1.23 (2025-12-30): Cleats catalog integration - catalog-driven min pulley diameter calculation
 *                     Aggregate constraint: required_min_pulley_diameter_in = max(belt, vguide, cleats)
 * v1.12 (2025-12-25): Von Mises-based shaft diameter calculation, belt_width_in rename
 * v1.11 Phase 4 (2025-12-24): Cleat spacing multiplier for hot-welded PVC cleats
 * v1.11 (2025-12-24): Belt minimum pulley diameter outputs
 * v1.7 (2025-12-22): Chain ratio stage for bottom-mount gearmotor configuration
 * v1.6 (2025-12-22): Speed mode - Belt Speed + Motor RPM as primary inputs, derive Drive RPM
 * v1.5 (2025-12-21): Frame height modes, snub roller requirements, cost flags
 * v1.3 (2025-12-21): Split pulley diameter into drive/tail, update belt length formula
 * v1.2 (2025-12-19): Make key parameters power-user editable (safety_factor, belt coeffs, base pull)
 * v1.1 (2025-12-19): Fix open-belt wrap length: use πD not 2πD
 * v1.0 (2024-12-19): Initial implementation
 */

import {
  SliderbedInputs,
  SliderbedParameters,
  SliderbedOutputs,
  Orientation,
  BeltTrackingMethod,
  ShaftDiameterMode,
  FrameHeightMode,
  SpeedMode,
  GearmotorMountingStyle,
  FrameConstructionType,
  SheetMetalGauge,
  StructuralChannelSeries,
  MaterialForm,
  BulkInputMethod,
  DensitySource,
  RiskFlag,
  // v1.29: Return Support
  ReturnFrameStyle,
  ReturnSnubMode,
} from './schema';
import { buildCleatsSummary } from './migrate';
import { getCleatSpacingMultiplier, roundUpToIncrement } from '../../lib/belt-catalog';
import { getShaftSizingFromOutputs, ShaftSizingResult } from './shaftCalc';
import {
  calculatePciTubeStress,
  getTubeStressLimit,
  isVGroovePulley as detectVGroovePulley,
  PciTubeStressResult,
} from './pciChecks';
import { calculateTrackingRecommendation } from '../../lib/tracking';
import {
  SHEET_METAL_GAUGE_THICKNESS,
  STRUCTURAL_CHANNEL_THICKNESS,
} from '../../lib/frame-catalog';
// PHASE 0: Legacy pulley catalog imports removed - will be replaced by application_pulleys in Phase 2
// Stub functions to maintain API compatibility during transition
// WARNING: These stubs return undefined - callers MUST fall through to backup values
function getEffectiveDiameterByKey(_key: string | undefined): number | undefined {
  // Legacy catalog removed - resolution moved to application_pulleys
  // Callers should fall through to manual diameter inputs
  return undefined;
}
function getFinishedOdByVariantKey(_key: string | undefined): number | undefined {
  // Pulley variant catalog not yet connected - resolution moved to application_pulleys
  // Callers should fall through to manual diameter inputs
  return undefined;
}
function getShellOdByVariantKey(_key: string | undefined): number | undefined {
  // Pulley variant catalog not yet connected - resolution moved to application_pulleys
  // Callers should fall through to manual diameter inputs
  return undefined;
}
import {
  getCachedCleatCatalog,
  getCachedCleatCenterFactors,
  lookupCleatsMinPulleyDia,
  CleatPattern,
  CleatStyle,
  CleatCenters,
  DEFAULT_CLEAT_MATERIAL_FAMILY,
} from '../../lib/cleat-catalog';

// ============================================================================
// NAN DETECTION (dev/test only)
// ============================================================================

/**
 * Check if value is NaN and throw descriptive error.
 * Only active in dev/test mode (NODE_ENV !== 'production').
 *
 * Usage: assertNotNaN(value, 'variableName', { dep1: val1, dep2: val2 });
 */
function assertNotNaN(
  value: number,
  name: string,
  dependencies: Record<string, number | undefined | null> = {}
): void {
  if (process.env.NODE_ENV === 'production') return;

  if (Number.isNaN(value)) {
    const depInfo = Object.entries(dependencies)
      .map(([k, v]) => `${k}=${v === undefined ? 'undefined' : v === null ? 'null' : Number.isNaN(v) ? 'NaN' : v}`)
      .join(', ');
    const nanDeps = Object.entries(dependencies)
      .filter(([, v]) => v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v)))
      .map(([k]) => k);

    const cause = nanDeps.length > 0
      ? `caused by: ${nanDeps.join(', ')}`
      : 'check formula logic';

    throw new Error(`NaN detected in ${name} - ${cause}. Dependencies: {${depInfo}}`);
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PI = Math.PI;

// ============================================================================
// v1.17: EFFECTIVE PULLEY DIAMETER RESOLUTION
// v1.24: Extended to support pulley family/variant selection
// ============================================================================

/**
 * Get effective pulley diameters based on override flags and variant selection.
 *
 * v1.24: Priority order for diameter resolution:
 * 1. Manual override → use drive_pulley_diameter_in / tail_pulley_diameter_in
 * 2. Variant key → use finished_od_in from variant (or shell_od_in fallback)
 * 3. Legacy catalog key → use diameter from pulley_catalog
 * 4. undefined if nothing selected
 *
 * Also returns shell_od and finished_od for output when variant is selected.
 *
 * @returns Object with effective diameters and variant info (undefined if not available)
 */
export function getEffectivePulleyDiameters(inputs: SliderbedInputs): {
  effectiveDrivePulleyDiameterIn: number | undefined;
  effectiveTailPulleyDiameterIn: number | undefined;
  driveShellOdIn: number | undefined;
  driveFinishedOdIn: number | undefined;
  tailShellOdIn: number | undefined;
  tailFinishedOdIn: number | undefined;
  pulleyResolutionWarnings: string[];
} {
  const pulleyResolutionWarnings: string[] = [];

  // Drive pulley: check variant first, then legacy catalog, then manual values
  // IMPORTANT: Fall through to backup values if lookup returns undefined
  let effectiveDrivePulleyDiameterIn: number | undefined;
  let driveShellOdIn: number | undefined;
  let driveFinishedOdIn: number | undefined;

  if (inputs.drive_pulley_manual_override) {
    // Manual override takes precedence
    effectiveDrivePulleyDiameterIn = inputs.drive_pulley_diameter_in;
  } else {
    // Try variant key first
    if (inputs.drive_pulley_variant_key) {
      driveFinishedOdIn = getFinishedOdByVariantKey(inputs.drive_pulley_variant_key);
      driveShellOdIn = getShellOdByVariantKey(inputs.drive_pulley_variant_key);
      effectiveDrivePulleyDiameterIn = driveFinishedOdIn;
      if (effectiveDrivePulleyDiameterIn === undefined) {
        pulleyResolutionWarnings.push(
          `Drive pulley variant key "${inputs.drive_pulley_variant_key}" not found in catalog. Falling back to manual diameter.`
        );
      }
    }
    // Try legacy catalog key if variant failed or not set
    if (effectiveDrivePulleyDiameterIn === undefined && inputs.head_pulley_catalog_key) {
      effectiveDrivePulleyDiameterIn = getEffectiveDiameterByKey(inputs.head_pulley_catalog_key);
      if (effectiveDrivePulleyDiameterIn === undefined) {
        pulleyResolutionWarnings.push(
          `Drive pulley catalog key "${inputs.head_pulley_catalog_key}" not found. Falling back to manual diameter.`
        );
      }
    }
    // Try manual diameter (backward compatibility)
    if (effectiveDrivePulleyDiameterIn === undefined && inputs.drive_pulley_diameter_in !== undefined && inputs.drive_pulley_diameter_in > 0) {
      effectiveDrivePulleyDiameterIn = inputs.drive_pulley_diameter_in;
    }
    // Try legacy single pulley_diameter_in
    if (effectiveDrivePulleyDiameterIn === undefined && inputs.pulley_diameter_in !== undefined && inputs.pulley_diameter_in > 0) {
      effectiveDrivePulleyDiameterIn = inputs.pulley_diameter_in;
    }
  }

  // Tail pulley: check variant first, then legacy catalog, then manual values
  // IMPORTANT: Fall through to backup values if lookup returns undefined
  let effectiveTailPulleyDiameterIn: number | undefined;
  let tailShellOdIn: number | undefined;
  let tailFinishedOdIn: number | undefined;

  if (inputs.tail_pulley_manual_override) {
    // Manual override takes precedence
    effectiveTailPulleyDiameterIn = inputs.tail_pulley_diameter_in;
  } else {
    // Try variant key first
    if (inputs.tail_pulley_variant_key) {
      tailFinishedOdIn = getFinishedOdByVariantKey(inputs.tail_pulley_variant_key);
      tailShellOdIn = getShellOdByVariantKey(inputs.tail_pulley_variant_key);
      effectiveTailPulleyDiameterIn = tailFinishedOdIn;
      if (effectiveTailPulleyDiameterIn === undefined) {
        pulleyResolutionWarnings.push(
          `Tail pulley variant key "${inputs.tail_pulley_variant_key}" not found in catalog. Falling back to manual diameter.`
        );
      }
    }
    // Try legacy catalog key if variant failed or not set
    if (effectiveTailPulleyDiameterIn === undefined && inputs.tail_pulley_catalog_key) {
      effectiveTailPulleyDiameterIn = getEffectiveDiameterByKey(inputs.tail_pulley_catalog_key);
      if (effectiveTailPulleyDiameterIn === undefined) {
        pulleyResolutionWarnings.push(
          `Tail pulley catalog key "${inputs.tail_pulley_catalog_key}" not found. Falling back to manual diameter.`
        );
      }
    }
    // Try manual diameter (backward compatibility)
    if (effectiveTailPulleyDiameterIn === undefined && inputs.tail_pulley_diameter_in !== undefined && inputs.tail_pulley_diameter_in > 0) {
      effectiveTailPulleyDiameterIn = inputs.tail_pulley_diameter_in;
    }
    // Tail defaults to drive if not specified
    if (effectiveTailPulleyDiameterIn === undefined && effectiveDrivePulleyDiameterIn !== undefined) {
      effectiveTailPulleyDiameterIn = effectiveDrivePulleyDiameterIn;
    }
  }

  return {
    effectiveDrivePulleyDiameterIn,
    effectiveTailPulleyDiameterIn,
    driveShellOdIn,
    driveFinishedOdIn,
    tailShellOdIn,
    tailFinishedOdIn,
    pulleyResolutionWarnings,
  };
}

// ============================================================================
// INTERMEDIATE CALCULATIONS
// ============================================================================

/**
 * Calculate effective belt PIW/PIL values
 *
 * v1.3: Compute effective values from override → catalog → parameter defaults chain
 *
 * Priority order:
 *   1. belt_piw_override / belt_pil_override (user-entered values)
 *   2. belt_piw / belt_pil (from catalog when belt is selected)
 *   3. belt_coeff_piw / belt_coeff_pil (advanced parameter overrides)
 *   4. Parameter defaults (pulley-diameter-based: 0.138 for 2.5", 0.109 otherwise)
 */
export function calculateEffectiveBeltCoefficients(
  pulleyDiameterIn: number,
  params: SliderbedParameters,
  beltPiwOverride?: number,
  beltPilOverride?: number,
  beltPiwFromCatalog?: number,
  beltPilFromCatalog?: number,
  advancedPiw?: number,
  advancedPil?: number
): { piw: number; pil: number; belt_piw_effective: number; belt_pil_effective: number } {
  // Compute belt-specific effective values (override → catalog)
  const beltPiwEffective = beltPiwOverride ?? beltPiwFromCatalog;
  const beltPilEffective = beltPilOverride ?? beltPilFromCatalog;

  // Compute final PIW/PIL used in calculations (belt effective → advanced → default)
  const defaultPiw = pulleyDiameterIn === 2.5 ? params.piw_2p5 : params.piw_other;
  const defaultPil = pulleyDiameterIn === 2.5 ? params.pil_2p5 : params.pil_other;

  const piw = beltPiwEffective ?? advancedPiw ?? defaultPiw;
  const pil = beltPilEffective ?? advancedPil ?? defaultPil;

  return {
    piw,
    pil,
    belt_piw_effective: beltPiwEffective ?? piw,
    belt_pil_effective: beltPilEffective ?? pil,
  };
}

/**
 * Check whether a belt is explicitly selected (v1.48)
 *
 * A belt is considered "selected" if PIW/PIL coefficients are explicitly provided
 * through any of these sources:
 *   1. belt_catalog_key (belt from catalog lookup)
 *   2. belt_piw_override + belt_pil_override (user manual override)
 *   3. belt_piw + belt_pil (from catalog when belt is selected)
 *   4. belt_coeff_piw + belt_coeff_pil (advanced parameter mode)
 *
 * If none of these are set, PIW/PIL would fall back to parameter defaults,
 * which produces "implicit" belt calculations that should be gated.
 *
 * @returns true if belt is explicitly selected, false otherwise
 */
export function hasBeltSelection(inputs: SliderbedInputs): boolean {
  // Primary: belt selected from catalog
  if (inputs.belt_catalog_key !== undefined && inputs.belt_catalog_key !== null) {
    return true;
  }

  // User override (both PIW and PIL must be provided)
  if (inputs.belt_piw_override !== undefined && inputs.belt_pil_override !== undefined) {
    return true;
  }

  // Catalog lookup values (both PIW and PIL must be provided)
  if (inputs.belt_piw !== undefined && inputs.belt_pil !== undefined) {
    return true;
  }

  // Advanced coefficient mode (both PIW and PIL must be provided)
  if (inputs.belt_coeff_piw !== undefined && inputs.belt_coeff_pil !== undefined) {
    return true;
  }

  return false;
}

/**
 * Calculate belt weight coefficients (piw, pil)
 *
 * v1.2: Now accepts user overrides, otherwise falls back to pulley-diameter-based defaults
 * @deprecated Use calculateEffectiveBeltCoefficients for new code
 *
 * Logic:
 *   If user provided belt_coeff_piw/pil, use those
 *   Otherwise: piw = IF(pulley_diameter_in == 2.5, 0.138, 0.109), pil = piw
 */
export function calculateBeltWeightCoefficients(
  pulleyDiameterIn: number,
  params: SliderbedParameters,
  userPiw?: number,
  userPil?: number
): { piw: number; pil: number } {
  const piw = userPiw ?? (pulleyDiameterIn === 2.5 ? params.piw_2p5 : params.piw_other);
  const pil = userPil ?? (pulleyDiameterIn === 2.5 ? params.pil_2p5 : params.pil_other);

  return { piw, pil };
}

/**
 * Calculate total belt length in inches (LEGACY - single pulley diameter)
 *
 * Formula:
 *   total_belt_length_in = (2 * cc_length_in) + (PI * pulley_diameter_in)
 *
 * Note: Uses πD (half wrap) not 2πD (full wrap) for open-belt configuration
 *
 * @deprecated Use calculateTotalBeltLengthSplit for v1.3+ calculations
 */
export function calculateTotalBeltLength(
  conveyorLengthCcIn: number,
  pulleyDiameterIn: number
): number {
  return 2 * conveyorLengthCcIn + PI * pulleyDiameterIn;
}

/**
 * Calculate total belt length in inches (v1.3 - split pulley diameters)
 *
 * Formula:
 *   total_belt_length_in = (2 * cc_length_in) + PI * (drive_pulley_diameter_in + tail_pulley_diameter_in) / 2
 *
 * PARITY GUARANTEE: When drive == tail == D:
 *   = 2 * cc + PI * (D + D) / 2
 *   = 2 * cc + PI * D
 *   = legacy formula (bit-for-bit identical)
 *
 * Note: Uses half-wrap for each pulley in open-belt configuration
 */
export function calculateTotalBeltLengthSplit(
  conveyorLengthCcIn: number,
  drivePulleyDiameterIn: number,
  tailPulleyDiameterIn: number
): number {
  return 2 * conveyorLengthCcIn + PI * (drivePulleyDiameterIn + tailPulleyDiameterIn) / 2;
}

/**
 * Calculate belt weight in lbf (pounds-force)
 *
 * Formula:
 *   belt_weight_lb = belt_coeff_piw * belt_coeff_pil * belt_width_in * total_belt_length_in
 */
export function calculateBeltWeight(
  piw: number,
  pil: number,
  beltWidthIn: number,
  totalBeltLengthIn: number
): number {
  return piw * pil * beltWidthIn * totalBeltLengthIn;
}

/**
 * Calculate number of parts on belt
 *
 * Formula:
 *   parts_on_belt = conveyor_length_cc_in / (travel_dim_in + part_spacing_in)
 *
 * Where travel_dim_in is part_length_in (lengthwise) or part_width_in (crosswise)
 */
export function calculatePartsOnBelt(
  conveyorLengthCcIn: number,
  partLengthIn: number,
  partWidthIn: number,
  partSpacingIn: number,
  orientation: Orientation
): number {
  const travelDim = orientation === Orientation.Lengthwise ? partLengthIn : partWidthIn;
  return conveyorLengthCcIn / (travelDim + partSpacingIn);
}

/**
 * Calculate load on belt from parts in lbf
 *
 * Formula:
 *   load_on_belt_lbs = parts_on_belt * part_weight_lbs
 */
export function calculateLoadOnBelt(
  partsOnBelt: number,
  partWeightLbs: number
): number {
  return partsOnBelt * partWeightLbs;
}

// ============================================================================
// v1.29: BULK LOAD CALCULATIONS
// ============================================================================

/**
 * Calculate residence time on belt in minutes (v1.29)
 *
 * Formula:
 *   time_on_belt_min = conveyor_length_cc_in / (belt_speed_fpm × 12)
 *
 * Note: belt_speed_fpm × 12 converts FPM to inches per minute
 *
 * Guards:
 *   - belt_speed_fpm > 0 (required, validated by rules.ts)
 *   - Returns 0 if belt_speed_fpm <= 0 (fallback, rules should catch first)
 */
export function calculateTimeOnBeltMin(
  conveyorLengthCcIn: number,
  beltSpeedFpm: number
): number {
  if (beltSpeedFpm <= 0) {
    return 0; // Fallback - rules should catch this first
  }
  return conveyorLengthCcIn / (beltSpeedFpm * 12);
}

/**
 * Calculate load on belt for BULK material using residence-time method (v1.29)
 *
 * Formula:
 *   load_on_belt_lbf = (mass_flow_lbs_per_hr / 60) × time_on_belt_min
 *
 * Where:
 *   - mass_flow_lbs_per_hr / 60 = mass arriving on belt per minute (lbs/min)
 *   - time_on_belt_min = residence time on belt
 *
 * This is the steady-state load: material arrives at rate R, spends time T on belt,
 * so instantaneous load = R × T.
 */
export function calculateBulkLoadOnBelt(
  massFlowLbsPerHr: number,
  timeOnBeltMin: number
): number {
  return (massFlowLbsPerHr / 60) * timeOnBeltMin;
}

/**
 * Calculate mass flow from volume flow and density (v1.29)
 *
 * Formula:
 *   mass_flow_lbs_per_hr = volume_flow_ft3_per_hr × density_lbs_per_ft3
 *
 * Used when bulk_input_method = VOLUME_FLOW
 */
export function calculateMassFlowFromVolume(
  volumeFlowFt3PerHr: number,
  densityLbsPerFt3: number
): number {
  return volumeFlowFt3PerHr * densityLbsPerFt3;
}

/**
 * Calculate mass flow for PARTS mode (derived output, optional)
 *
 * Formula:
 *   mass_flow_lbs_per_hr = capacity_pph × part_weight_lbs
 *
 * This provides a canonical output that works across both modes.
 */
export function calculatePartsMassFlow(
  capacityPph: number,
  partWeightLbs: number
): number {
  return capacityPph * partWeightLbs;
}

/**
 * Get BULK load calculation results (v1.29)
 *
 * This is a helper that computes all BULK-specific outputs in one call.
 * Returns load_on_belt_lbf plus intermediate values for transparency.
 */
export interface BulkLoadResult {
  /** Effective mass flow rate used (lbs/hr) */
  massFlowLbsPerHr: number;
  /** Volume flow rate (ft³/hr) - only if VOLUME_FLOW method */
  volumeFlowFt3PerHr?: number;
  /** Density used (lbs/ft³) - only if VOLUME_FLOW method */
  densityLbsPerFt3Used?: number;
  /** Residence time on belt (minutes) */
  timeOnBeltMin: number;
  /** Load on belt (lbf) - canonical output */
  loadOnBeltLbf: number;
  /** Assumptions made during calculation */
  assumptions: string[];
  /** Risk flags for transparency */
  riskFlags: RiskFlag[];
}

export function calculateBulkLoad(
  inputs: SliderbedInputs,
  conveyorLengthCcIn: number,
  beltSpeedFpm: number
): BulkLoadResult {
  const assumptions: string[] = [];
  const riskFlags: RiskFlag[] = [];

  let massFlowLbsPerHr: number;
  let volumeFlowFt3PerHr: number | undefined;
  let densityLbsPerFt3Used: number | undefined;

  const method = inputs.bulk_input_method as BulkInputMethod;

  if (method === BulkInputMethod.VolumeFlow) {
    // VOLUME_FLOW: convert volume × density to mass
    volumeFlowFt3PerHr = inputs.volume_flow_ft3_per_hr ?? 0;
    densityLbsPerFt3Used = inputs.density_lbs_per_ft3 ?? 0;
    massFlowLbsPerHr = calculateMassFlowFromVolume(volumeFlowFt3PerHr, densityLbsPerFt3Used);

    // Check density source
    if (inputs.density_source === DensitySource.AssumedClass || inputs.density_source === 'ASSUMED_CLASS') {
      assumptions.push('Density assumed from material class. Verify for accuracy.');
      riskFlags.push({
        code: 'DENSITY_ASSUMED',
        level: 'warning',
        message: 'Density assumed from material class. Verify for accuracy.',
        field: 'density_lbs_per_ft3',
      });
    }
  } else {
    // WEIGHT_FLOW: use mass flow directly
    massFlowLbsPerHr = inputs.mass_flow_lbs_per_hr ?? 0;
  }

  // Calculate residence time and load
  const timeOnBeltMin = calculateTimeOnBeltMin(conveyorLengthCcIn, beltSpeedFpm);
  const loadOnBeltLbf = calculateBulkLoadOnBelt(massFlowLbsPerHr, timeOnBeltMin);

  // Add standard assumption for BULK mode
  assumptions.push('Bulk load on belt estimated from mass flow and residence time (length/speed).');

  return {
    massFlowLbsPerHr,
    volumeFlowFt3PerHr,
    densityLbsPerFt3Used,
    timeOnBeltMin,
    loadOnBeltLbf,
    assumptions,
    riskFlags,
  };
}

/**
 * Calculate total load (belt + parts) in lbf
 *
 * Formula:
 *   total_load_lbs = belt_weight_lbs + load_on_belt_lbs
 */
export function calculateTotalLoad(
  beltWeightLbf: number,
  loadOnBeltLbf: number
): number {
  return beltWeightLbf + loadOnBeltLbf;
}

/**
 * Calculate average load per foot in lbf/ft
 *
 * Formula:
 *   avg_load_per_ft = total_load_lbs / (cc_length_in / 12)
 *
 * Note: cc_length_in / 12 converts inches to feet
 */
export function calculateAvgLoadPerFoot(
  totalLoadLbf: number,
  conveyorLengthCcIn: number
): number {
  const conveyorLengthFt = conveyorLengthCcIn / 12;
  return totalLoadLbf / conveyorLengthFt;
}

/**
 * Calculate belt pull (friction-based) in lbf
 *
 * Formula:
 *   belt_pull_calc = (avg_load_per_ft * friction_coeff) * (cc_length_in / 12)
 */
export function calculateBeltPull(
  avgLoadPerFt: number,
  frictionCoeff: number,
  conveyorLengthCcIn: number
): number {
  const conveyorLengthFt = conveyorLengthCcIn / 12;
  return avgLoadPerFt * frictionCoeff * conveyorLengthFt;
}

/**
 * Calculate friction pull in lb
 *
 * Formula:
 *   friction_pull_lb = friction_coeff * total_load_lb * cos(incline_rad)
 *
 * Physics: On an incline, the normal force is W * cos(θ), so friction = μ * N = μ * W * cos(θ).
 * For flat conveyors (0°), cos(0) = 1, so this reduces to μ * W.
 *
 * Note: The incline angle is optional for backward compatibility (defaults to 0 = flat).
 */
export function calculateFrictionPull(
  frictionCoeff: number,
  totalLoadLb: number,
  inclineDeg: number = 0
): number {
  const inclineRad = (inclineDeg * PI) / 180;
  return frictionCoeff * totalLoadLb * Math.cos(inclineRad);
}

/**
 * Calculate incline pull in lb
 *
 * Formula:
 *   incline_pull_lb = total_load_lb * sin(incline_rad)
 *   where incline_rad = incline_deg * PI / 180
 */
export function calculateInclinePull(
  totalLoadLb: number,
  inclineDeg: number
): number {
  const inclineRad = (inclineDeg * PI) / 180;
  return totalLoadLb * Math.sin(inclineRad);
}

/**
 * Calculate total belt pull in lb
 *
 * Formula:
 *   total_belt_pull_lb = friction_pull_lb + incline_pull_lb + starting_belt_pull_lb
 *
 * Note: Starting belt pull is a fixed value (not per-foot)
 */
export function calculateTotalBeltPull(
  frictionPullLb: number,
  inclinePullLb: number,
  startingBeltPullLb: number
): number {
  return frictionPullLb + inclinePullLb + startingBeltPullLb;
}

/**
 * Calculate drive shaft RPM
 *
 * Formula:
 *   drive_shaft_rpm = belt_speed_fpm / ((pulley_diameter_in / 12) * PI)
 *
 * Note: pulley_diameter_in / 12 converts inches to feet
 */
export function calculateDriveShaftRpm(
  beltSpeedFpm: number,
  pulleyDiameterIn: number
): number {
  const pulleyDiameterFt = pulleyDiameterIn / 12;
  return beltSpeedFpm / (pulleyDiameterFt * PI);
}

/**
 * Calculate torque on drive shaft in in-lbf (inch-pounds-force)
 *
 * Formula:
 *   torque_drive_shaft_inlb = total_belt_pull_lb * (pulley_diameter_in/2) * safety_factor
 */
export function calculateTorqueDriveShaft(
  totalBeltPullLbf: number,
  pulleyDiameterIn: number,
  safetyFactor: number
): number {
  return totalBeltPullLbf * (pulleyDiameterIn / 2) * safetyFactor;
}

/**
 * Calculate gear ratio
 *
 * Formula:
 *   gear_ratio = motor_rpm / drive_shaft_rpm
 */
export function calculateGearRatio(motorRpm: number, driveShaftRpm: number): number {
  return motorRpm / driveShaftRpm;
}

// ============================================================================
// THROUGHPUT CALCULATIONS
// ============================================================================

/**
 * Calculate pitch in inches
 *
 * Formula:
 *   pitch_in = travel_dim_in + part_spacing_in
 *
 * Where travel_dim_in is part_length_in (lengthwise) or part_width_in (crosswise)
 */
export function calculatePitch(
  partLengthIn: number,
  partWidthIn: number,
  partSpacingIn: number,
  orientation: Orientation
): number {
  const travelDim = orientation === Orientation.Lengthwise ? partLengthIn : partWidthIn;
  return travelDim + partSpacingIn;
}

/**
 * Calculate belt speed in FPM from drive RPM
 *
 * Formula:
 *   belt_speed_fpm = drive_rpm * (PI * (pulley_diameter_in / 12))
 *
 * Note: pulley_diameter_in / 12 converts inches to feet
 * This is the inverse of calculateDriveShaftRpm
 */
export function calculateBeltSpeed(
  driveRpm: number,
  pulleyDiameterIn: number
): number {
  const pulleyDiameterFt = pulleyDiameterIn / 12;
  return driveRpm * (PI * pulleyDiameterFt);
}

/**
 * Calculate actual belt speed from selected gearmotor output RPM (v1.38)
 *
 * This computes the actual belt speed that will result from a selected gearmotor,
 * accounting for the drive ratio (chain/sprocket configuration).
 *
 * Formula:
 *   drive_ratio = gm_sprocket_teeth / drive_shaft_sprocket_teeth (inverse of chain_ratio)
 *   drive_pulley_rpm = gearmotor_output_rpm * drive_ratio
 *   actual_belt_speed_fpm = drive_pulley_rpm * PI * (pulley_diameter_in / 12)
 *
 * Guards against division-by-zero and invalid inputs with warning codes.
 *
 * @param gearmotorOutputRpm - Output RPM of the selected gearmotor
 * @param pulleyDiameterIn - Drive pulley diameter in inches
 * @param gmSprocketTeeth - Gearmotor sprocket teeth (driver)
 * @param driveShaftSprocketTeeth - Drive shaft sprocket teeth (driven)
 * @param isBottomMount - Whether mounting style is bottom_mount (uses chain drive)
 * @returns ActualBeltSpeedResult with computed values and optional warning code
 */
export interface ActualBeltSpeedResult {
  actualBeltSpeedFpm: number | null;
  actualDriveShaftRpm: number | null;
  /** Warning code if calculation couldn't be performed */
  warningCode: string | null;
}

export function calculateActualBeltSpeed(
  gearmotorOutputRpm: number | null | undefined,
  pulleyDiameterIn: number | null | undefined,
  gmSprocketTeeth: number | null | undefined,
  driveShaftSprocketTeeth: number | null | undefined,
  isBottomMount: boolean = false
): ActualBeltSpeedResult {
  // Guard: Gearmotor RPM must be positive
  if (gearmotorOutputRpm === null || gearmotorOutputRpm === undefined || gearmotorOutputRpm <= 0) {
    return {
      actualBeltSpeedFpm: null,
      actualDriveShaftRpm: null,
      warningCode: gearmotorOutputRpm === 0 ? 'ACTUAL_GM_RPM_INVALID' : null,
    };
  }

  // Guard: Pulley diameter must be positive
  if (pulleyDiameterIn === null || pulleyDiameterIn === undefined || pulleyDiameterIn <= 0) {
    return {
      actualBeltSpeedFpm: null,
      actualDriveShaftRpm: null,
      warningCode: 'PULLEY_DIAMETER_MISSING',
    };
  }

  // Calculate drive ratio based on mounting style
  let driveRatio = 1.0;
  if (isBottomMount) {
    // Guard: Both sprocket teeth must be positive for bottom mount
    const gmTeeth = gmSprocketTeeth ?? 0;
    const driveTeeth = driveShaftSprocketTeeth ?? 0;

    if (gmTeeth <= 0 || driveTeeth <= 0) {
      return {
        actualBeltSpeedFpm: null,
        actualDriveShaftRpm: null,
        warningCode: 'SPROCKET_TEETH_MISSING',
      };
    }
    // drive_ratio = driver/driven = gm_teeth / drive_shaft_teeth
    driveRatio = gmTeeth / driveTeeth;
  }

  // Calculate actual drive shaft RPM
  const actualDriveShaftRpm = gearmotorOutputRpm * driveRatio;

  // Calculate actual belt speed
  const pulleyDiameterFt = pulleyDiameterIn / 12;
  const actualBeltSpeedFpm = actualDriveShaftRpm * PI * pulleyDiameterFt;

  return {
    actualBeltSpeedFpm,
    actualDriveShaftRpm,
    warningCode: null,
  };
}

/**
 * Calculate speed delta between desired and actual belt speed (v1.38)
 *
 * @param desiredFpm - Desired belt speed (user input or calculated)
 * @param actualFpm - Actual belt speed from selected gearmotor
 * @returns Delta percentage: positive = faster than desired, negative = slower
 */
export function calculateSpeedDeltaPct(
  desiredFpm: number,
  actualFpm: number
): number {
  if (desiredFpm <= 0) return 0;
  return ((actualFpm - desiredFpm) / desiredFpm) * 100;
}

/**
 * Calculate capacity in parts per hour
 *
 * Formula:
 *   capacity_pph = (belt_speed_fpm * 12 * 60) / pitch_in
 *
 * Note: 12 converts feet to inches, 60 converts minutes to hours
 */
export function calculateCapacity(
  beltSpeedFpm: number,
  pitchIn: number
): number {
  return (beltSpeedFpm * 12 * 60) / pitchIn;
}

/**
 * Calculate target throughput with margin
 *
 * Formula:
 *   target_pph = required_throughput_pph * (1 + throughput_margin_pct / 100)
 */
export function calculateTargetThroughput(
  requiredThroughputPph: number,
  throughputMarginPct: number
): number {
  return requiredThroughputPph * (1 + throughputMarginPct / 100);
}

/**
 * Calculate RPM required to achieve target throughput
 *
 * Formula:
 *   rpm_required = (target_pph * pitch_in) / (12 * 60 * PI * (pulley_diameter_in / 12))
 *
 * This is derived by solving capacity formula for drive_rpm
 */
export function calculateRpmRequired(
  targetPph: number,
  pitchIn: number,
  pulleyDiameterIn: number
): number {
  const pulleyDiameterFt = pulleyDiameterIn / 12;
  return (targetPph * pitchIn) / (12 * 60 * PI * pulleyDiameterFt);
}

/**
 * Calculate throughput margin achieved in percent
 *
 * Formula:
 *   margin_achieved_pct = (capacity_pph / required_throughput_pph - 1) * 100
 *
 * Note: Returns 0 if required_throughput_pph is 0 (guard against division by zero)
 */
export function calculateMarginAchieved(
  capacityPph: number,
  requiredThroughputPph: number
): number {
  if (requiredThroughputPph === 0) return 0;
  return (capacityPph / requiredThroughputPph - 1) * 100;
}

// ============================================================================
// BELT TRACKING & PULLEY CALCULATIONS
// ============================================================================

/**
 * Determine if belt tracking method is V-guided
 *
 * Formula:
 *   is_v_guided = (belt_tracking_method === 'V-guided')
 */
export function calculateIsVGuided(beltTrackingMethod: BeltTrackingMethod | string): boolean {
  return beltTrackingMethod === BeltTrackingMethod.VGuided || beltTrackingMethod === 'V-guided';
}

/**
 * Determine if pulley requires crown
 *
 * Formula:
 *   pulley_requires_crown = !is_v_guided
 *
 * Note: V-guided belts don't need crown, crowned belts need crown on at least one pulley
 */
export function calculatePulleyRequiresCrown(isVGuided: boolean): boolean {
  return !isVGuided;
}

/**
 * Calculate pulley face extra allowance in inches
 *
 * Formula:
 *   pulley_face_extra_in = is_v_guided ? 0.5 : 2.0
 *
 * Note: V-guided needs less extra face width since the V-guide keeps belt centered
 */
export function calculatePulleyFaceExtra(
  isVGuided: boolean,
  params: SliderbedParameters
): number {
  return isVGuided
    ? params.pulley_face_extra_v_guided_in
    : params.pulley_face_extra_crowned_in;
}

/**
 * Calculate pulley face length in inches
 *
 * v1.28: If configuredFaceWidthIn is provided (from application_pulleys modal),
 * use that value directly. Otherwise, compute legacy: belt_width + extra
 *
 * Formula:
 *   pulley_face_length_in = configuredFaceWidthIn ?? (belt_width_in + pulley_face_extra_in)
 */
export function calculatePulleyFaceLength(
  beltWidthIn: number,
  pulleyFaceExtraIn: number,
  configuredFaceWidthIn?: number
): number {
  // v1.28: Use configured face width from pulley modal if available
  if (configuredFaceWidthIn != null && configuredFaceWidthIn > 0) {
    return configuredFaceWidthIn;
  }
  // Legacy calculation
  return beltWidthIn + pulleyFaceExtraIn;
}

/**
 * Calculate shaft diameter in inches (legacy heuristic method)
 *
 * @deprecated Use getShaftSizingFromOutputs from shaftCalc.ts for von Mises-based calculation
 *
 * If shaft_diameter_mode is 'Manual', use the provided value
 * If shaft_diameter_mode is 'Calculated', use a default lookup (simplified for now)
 *
 * Formula (simplified):
 *   For calculated mode, use a torque-based lookup or a simple heuristic
 *   Current implementation uses a simplified approach:
 *   - For small conveyors (width <= 18"): 1.0"
 *   - For medium conveyors (width <= 36"): 1.25"
 *   - For large conveyors (width > 36"): 1.5"
 *
 * Note: In production, this would reference a shaft selection table
 */
export function calculateShaftDiameterLegacy(
  shaftDiameterMode: ShaftDiameterMode | string,
  manualDiameter: number | undefined,
  conveyorWidthIn: number,
  _torqueDriveShaftInlbf: number // Reserved for future torque-based shaft sizing
): number {
  if (shaftDiameterMode === ShaftDiameterMode.Manual || shaftDiameterMode === 'Manual') {
    return manualDiameter ?? 1.0;
  }

  // Calculated mode: simple heuristic based on width and torque
  // This is a simplified placeholder - real implementation would use shaft selection tables
  if (conveyorWidthIn <= 18) {
    return 1.0;
  } else if (conveyorWidthIn <= 36) {
    return 1.25;
  } else {
    return 1.5;
  }
}

// ============================================================================
// v1.33: CLEAT HEIGHT PARSING
// ============================================================================

/**
 * Parse cleat height from cleat_size string (v1.33)
 * Handles: "3", '3"', '3 inch', '3 in', '3 inches'
 *
 * @param size - Cleat size string (e.g., '1"', '1.5"', '2"')
 * @returns Numeric height in inches, or 0 if invalid/missing
 */
export function parseCleatHeightFromSize(size: unknown): number {
  if (!size) return 0;
  const s = String(size).toLowerCase().trim();
  const cleaned = s.replace(/["\s]/g, '').replace(/(in|inch|inches)$/i, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

/**
 * Get effective cleat height (v1.33)
 * Uses explicit cleat_height_in if provided, otherwise parses from cleat_size.
 *
 * @param cleatsEnabled - Whether cleats are enabled
 * @param cleatHeightIn - Explicit cleat height (legacy/override)
 * @param cleatSize - Cleat size string from catalog
 * @returns Effective cleat height in inches (0 if cleats disabled)
 */
export function getEffectiveCleatHeight(
  cleatsEnabled: boolean,
  cleatHeightIn?: number,
  cleatSize?: string
): number {
  if (!cleatsEnabled) return 0;
  if (typeof cleatHeightIn === 'number' && cleatHeightIn > 0) return cleatHeightIn;
  return parseCleatHeightFromSize(cleatSize);
}

// ============================================================================
// v1.43: CLEAT WEIGHT & SPACING CALCULATIONS
// ============================================================================

/**
 * T-Cleat geometry constants (hardcoded assumptions)
 * These are NOT user-editable - displayed read-only in UI
 */
export const CLEAT_GEOMETRY = {
  /** Material thickness (inches) */
  THICKNESS_IN: 0.25,
  /** Base length (inches) */
  BASE_LENGTH_IN: 1.5,
  /** Material: PVC */
  MATERIAL: 'PVC',
  /** PVC density (lb/in³) */
  DENSITY_LB_PER_IN3: 0.045,
} as const;

/**
 * Cleat spacing layout result
 */
export interface CleatLayoutResult {
  /** Actual number of cleats */
  cleat_count: number;
  /** Actual pitch between cleats (inches) */
  pitch_in: number;
  /** Odd gap size if applicable (inches) */
  odd_gap_in?: number;
  /** Odd gap location if applicable */
  odd_gap_location?: 'head' | 'tail' | 'center';
  /** Human-readable layout summary */
  summary: string;
}

/**
 * Calculate cleat width from belt width and edge offset
 * cleat_width = belt_width - (2 × edge_offset)
 */
export function calculateCleatWidth(
  beltWidthIn: number,
  edgeOffsetIn: number
): number {
  const width = beltWidthIn - (2 * edgeOffsetIn);
  return Math.max(0, width);
}

/**
 * Calculate T-cleat cross-section area
 * A = thickness × (base_length + stem_height)
 * where stem_height = cleat_height
 */
export function calculateCleatCrossSection(cleatHeightIn: number): number {
  return CLEAT_GEOMETRY.THICKNESS_IN * (CLEAT_GEOMETRY.BASE_LENGTH_IN + cleatHeightIn);
}

/**
 * Calculate weight per cleat
 * W = cross_section × cleat_width × density
 */
export function calculateCleatWeightEach(
  cleatHeightIn: number,
  cleatWidthIn: number
): number {
  const crossSection = calculateCleatCrossSection(cleatHeightIn);
  const volume = crossSection * cleatWidthIn;
  return volume * CLEAT_GEOMETRY.DENSITY_LB_PER_IN3;
}

/**
 * Calculate cleat layout based on spacing mode
 */
export function calculateCleatLayout(
  conveyorLengthIn: number,
  spacingMode: 'divide_evenly' | 'use_nominal',
  cleatCount?: number,
  desiredSpacingIn?: number,
  remainderMode?: 'spread_evenly' | 'one_odd_gap',
  oddGapSize?: 'smaller' | 'larger',
  oddGapLocation?: 'head' | 'tail' | 'center'
): CleatLayoutResult {
  if (spacingMode === 'divide_evenly') {
    // User specifies count, we calculate pitch
    const count = cleatCount ?? 1;
    if (count <= 0) {
      return { cleat_count: 0, pitch_in: 0, summary: 'No cleats' };
    }
    const pitch = conveyorLengthIn / count;
    return {
      cleat_count: count,
      pitch_in: pitch,
      summary: `${count} cleats evenly spaced at ${pitch.toFixed(1)}" pitch`,
    };
  }

  // use_nominal mode: user specifies desired spacing
  const nominalSpacing = desiredSpacingIn ?? 12;
  if (nominalSpacing <= 0) {
    return { cleat_count: 0, pitch_in: 0, summary: 'Invalid spacing' };
  }

  // Calculate how many cleats fit at nominal spacing
  const count = Math.floor(conveyorLengthIn / nominalSpacing);
  if (count <= 0) {
    return { cleat_count: 1, pitch_in: conveyorLengthIn, summary: '1 cleat (conveyor shorter than spacing)' };
  }

  const remainder = conveyorLengthIn - (count * nominalSpacing);

  if (remainderMode === 'spread_evenly' || remainder < 0.1) {
    // Spread remainder across all gaps
    const adjustedPitch = conveyorLengthIn / count;
    return {
      cleat_count: count,
      pitch_in: adjustedPitch,
      summary: `${count} cleats evenly spaced at ${adjustedPitch.toFixed(1)}"`,
    };
  }

  // one_odd_gap mode
  const location = oddGapLocation ?? 'tail';
  let oddGap: number;

  if (oddGapSize === 'smaller') {
    // Odd gap is smaller: use one more cleat than fits at nominal
    oddGap = remainder;
    return {
      cleat_count: count + 1,
      pitch_in: nominalSpacing,
      odd_gap_in: oddGap,
      odd_gap_location: location,
      summary: `${count} cleats at ${nominalSpacing.toFixed(1)}", 1 odd gap = ${oddGap.toFixed(1)}" at ${location}`,
    };
  } else {
    // Odd gap is larger: use count-1 at nominal, one larger gap
    if (count <= 1) {
      return {
        cleat_count: 1,
        pitch_in: conveyorLengthIn,
        summary: '1 cleat (not enough length for odd gap)',
      };
    }
    oddGap = nominalSpacing + remainder;
    return {
      cleat_count: count,
      pitch_in: nominalSpacing,
      odd_gap_in: oddGap,
      odd_gap_location: location,
      summary: `${count - 1} cleats at ${nominalSpacing.toFixed(1)}", 1 odd gap = ${oddGap.toFixed(1)}" at ${location}`,
    };
  }
}

/**
 * Calculate cleat weight per foot of belt
 * W_per_ft = W_each × (12 / pitch)
 */
export function calculateCleatWeightPerFoot(
  cleatWeightEach: number,
  pitchIn: number
): number {
  if (pitchIn <= 0) return 0;
  return cleatWeightEach * (12 / pitchIn);
}

/**
 * Calculate belt weight per foot (base, without cleats)
 */
export function calculateBeltWeightPerFoot(
  beltWeightLbf: number,
  totalBeltLengthIn: number
): number {
  if (totalBeltLengthIn <= 0) return 0;
  return beltWeightLbf / (totalBeltLengthIn / 12);
}

/**
 * Full cleat weight calculation result
 */
export interface CleatWeightResult {
  cleat_width_in: number;
  cleat_weight_lb_each: number;
  cleat_pitch_in: number;
  cleat_count_actual: number;
  cleat_odd_gap_in?: number;
  cleat_weight_lb_per_ft: number;
  cleat_layout_summary: string;
}

/**
 * Calculate complete cleat weight data
 */
export function calculateCleatWeight(
  inputs: {
    cleats_enabled?: boolean;
    belt_width_in: number;
    cleat_edge_offset_in?: number;
    cleat_height_in?: number;
    conveyor_length_cc_in: number;
    cleat_spacing_mode?: 'divide_evenly' | 'use_nominal';
    cleat_count?: number;
    cleat_spacing_in?: number;
    cleat_remainder_mode?: 'spread_evenly' | 'one_odd_gap';
    cleat_odd_gap_size?: 'smaller' | 'larger';
    cleat_odd_gap_location?: 'head' | 'tail' | 'center';
  }
): CleatWeightResult | null {
  if (!inputs.cleats_enabled) return null;

  const edgeOffset = inputs.cleat_edge_offset_in ?? 0;
  const cleatHeight = inputs.cleat_height_in ?? 0;

  if (cleatHeight <= 0) return null;

  // Calculate cleat width
  const cleatWidth = calculateCleatWidth(inputs.belt_width_in, edgeOffset);
  if (cleatWidth <= 0) return null;

  // Calculate weight per cleat
  const weightEach = calculateCleatWeightEach(cleatHeight, cleatWidth);

  // Calculate layout
  const spacingMode = inputs.cleat_spacing_mode ?? 'use_nominal';
  const layout = calculateCleatLayout(
    inputs.conveyor_length_cc_in,
    spacingMode,
    inputs.cleat_count,
    inputs.cleat_spacing_in,
    inputs.cleat_remainder_mode,
    inputs.cleat_odd_gap_size,
    inputs.cleat_odd_gap_location
  );

  // Calculate weight per foot
  const weightPerFt = calculateCleatWeightPerFoot(weightEach, layout.pitch_in);

  return {
    cleat_width_in: cleatWidth,
    cleat_weight_lb_each: weightEach,
    cleat_pitch_in: layout.pitch_in,
    cleat_count_actual: layout.cleat_count,
    cleat_odd_gap_in: layout.odd_gap_in,
    cleat_weight_lb_per_ft: weightPerFt,
    cleat_layout_summary: layout.summary,
  };
}

// ============================================================================
// v1.5: FRAME HEIGHT CALCULATIONS (v1.33: Updated with cleat/pulley awareness)
// ============================================================================

/**
 * Frame height constants (v1.5, v1.33, v1.36)
 */
export const FRAME_HEIGHT_CONSTANTS = {
  /** Default frame clearance (v1.36: single value for both modes) */
  DEFAULT_CLEARANCE_IN: 0.5,
  /** Minimum allowed frame height */
  MIN_FRAME_HEIGHT_IN: 3.0,
  /** Threshold below which design review is required */
  DESIGN_REVIEW_THRESHOLD_IN: 4.0,
  /** Default return roller diameter (v1.33) */
  DEFAULT_RETURN_ROLLER_DIAMETER_IN: 2.0,
} as const;

/**
 * Frame height breakdown result (v1.33, v1.34: required vs reference separation)
 */
export interface FrameHeightBreakdown {
  largest_pulley_in: number;
  cleat_height_in: number;
  cleat_adder_in: number;
  return_roller_in: number;
  total_in: number; // Legacy: same as required_total_in for backward compatibility
  // v1.34: Required vs Reference separation
  required_total_in: number; // Physical envelope (always calculated)
  clearance_in: number; // Clearance for selected frame standard
  reference_total_in: number; // required + clearance (for quoting/reference)
  formula: string;
}

/**
 * Calculate frame height with full breakdown (v1.33, v1.34, v1.35, v1.36)
 *
 * v1.36: Single explicit clearance for BOTH Standard and Low Profile modes.
 * No mode-specific hidden clearances.
 *
 *   LOW PROFILE (snubs required):
 *     Required = largest_pulley (physical envelope only)
 *     - Snub rollers handle belt return at pulley ends
 *     - Cleats are NOT ALLOWED with Low Profile (validated separately as ERROR)
 *     - Reference = Required + clearance_in
 *
 *   STANDARD (gravity rollers):
 *     Required = largest_pulley + (2 * cleat_height) + return_roller_diameter
 *     - Must clear gravity return rollers
 *     - Reference = Required + clearance_in
 *
 *   CUSTOM:
 *     Required = (same as Standard calculation)
 *     Reference = user-specified custom_frame_height_in
 *
 * @param drivePulleyOdIn - Drive pulley finished OD in inches
 * @param tailPulleyOdIn - Tail pulley finished OD in inches
 * @param cleatHeightIn - Cleat height in inches (0 if cleats disabled)
 * @param returnRollerDiameterIn - Return roller diameter (default 2.0")
 * @param frameHeightMode - Frame height mode/standard (Standard, Low Profile, Custom)
 * @param customFrameHeightIn - Custom frame height (only used if mode is Custom)
 * @param clearanceIn - Explicit frame clearance (default 0.5", same for all modes)
 * @returns Frame height breakdown with required and reference heights
 */
export function calculateFrameHeightWithBreakdown(
  drivePulleyOdIn: number,
  tailPulleyOdIn: number,
  cleatHeightIn: number,
  returnRollerDiameterIn: number,
  frameHeightMode?: FrameHeightMode | string,
  customFrameHeightIn?: number,
  clearanceIn: number = 0.5
): FrameHeightBreakdown {
  const largestPulley = Math.max(drivePulleyOdIn, tailPulleyOdIn);
  const mode = frameHeightMode ?? FrameHeightMode.Standard;
  const isLowProfile = mode === FrameHeightMode.LowProfile || mode === 'Low Profile';

  // v1.36: Low Profile - snubs handle return, so no return roller in required
  if (isLowProfile) {
    // Low Profile: required = largestPulley only (physical envelope)
    // Note: cleats are disallowed with Low Profile (enforced via validation ERROR)
    const requiredTotal = largestPulley;
    const referenceTotal = requiredTotal + clearanceIn;

    const parts: string[] = [];
    parts.push(`Largest pulley: ${largestPulley.toFixed(2)}"`);
    parts.push(`Required: ${requiredTotal.toFixed(2)}"`);
    parts.push(`Clearance: +${clearanceIn.toFixed(2)}"`);
    parts.push(`Reference: ${referenceTotal.toFixed(2)}"`);
    parts.push(`(Low Profile uses snubs - no gravity roller clearance)`);

    return {
      largest_pulley_in: largestPulley,
      cleat_height_in: 0, // Cleats not allowed with Low Profile
      cleat_adder_in: 0,
      return_roller_in: 0, // Snubs, not gravity rollers
      total_in: referenceTotal, // Legacy: use reference for backward compatibility
      required_total_in: requiredTotal,
      clearance_in: clearanceIn,
      reference_total_in: referenceTotal,
      formula: parts.join('; '),
    };
  }

  // Standard / Custom: gravity rollers, include cleat and return roller
  const cleatAdder = 2 * cleatHeightIn;
  const requiredTotal = largestPulley + cleatAdder + returnRollerDiameterIn;

  // Custom mode: user specifies exact reference height
  if (mode === FrameHeightMode.Custom || mode === 'Custom') {
    const customTotal = customFrameHeightIn ?? requiredTotal;
    const impliedClearance = Math.max(0, customTotal - requiredTotal);
    return {
      largest_pulley_in: largestPulley,
      cleat_height_in: cleatHeightIn,
      cleat_adder_in: cleatAdder,
      return_roller_in: returnRollerDiameterIn,
      total_in: customTotal,
      required_total_in: requiredTotal,
      clearance_in: impliedClearance,
      reference_total_in: customTotal,
      formula: `Custom: ${customTotal.toFixed(2)}" (required: ${requiredTotal.toFixed(2)}", implied clearance: ${impliedClearance.toFixed(2)}")`,
    };
  }

  // Standard mode: use explicit clearance
  const referenceTotal = requiredTotal + clearanceIn;

  // Build human-readable formula
  const parts: string[] = [];
  parts.push(`Largest pulley: ${largestPulley.toFixed(2)}"`);
  if (cleatHeightIn > 0) {
    parts.push(`Cleats: 2 × ${cleatHeightIn.toFixed(2)}" = ${cleatAdder.toFixed(2)}"`);
  }
  parts.push(`Return roller: ${returnRollerDiameterIn.toFixed(2)}"`);
  parts.push(`Required: ${requiredTotal.toFixed(2)}"`);
  parts.push(`Clearance: +${clearanceIn.toFixed(2)}"`);
  parts.push(`Reference: ${referenceTotal.toFixed(2)}"`);

  return {
    largest_pulley_in: largestPulley,
    cleat_height_in: cleatHeightIn,
    cleat_adder_in: cleatAdder,
    return_roller_in: returnRollerDiameterIn,
    total_in: referenceTotal, // Legacy: use reference for backward compatibility
    required_total_in: requiredTotal,
    clearance_in: clearanceIn,
    reference_total_in: referenceTotal,
    formula: parts.join('; '),
  };
}

/**
 * Calculate effective frame height in inches based on mode (LEGACY - kept for compatibility)
 *
 * @deprecated Use calculateFrameHeightWithBreakdown for new code
 *
 * v1.36: Updated to use single default clearance for all modes.
 *
 * @param frameHeightMode - The frame height mode
 * @param drivePulleyDiameterIn - Drive pulley diameter in inches
 * @param customFrameHeightIn - Custom frame height (required if mode is Custom)
 * @returns Effective frame height in inches
 */
export function calculateEffectiveFrameHeight(
  frameHeightMode: FrameHeightMode | string | undefined,
  drivePulleyDiameterIn: number,
  customFrameHeightIn?: number
): number {
  const mode = frameHeightMode ?? FrameHeightMode.Standard;
  const defaultClearance = FRAME_HEIGHT_CONSTANTS.DEFAULT_CLEARANCE_IN;

  if (mode === FrameHeightMode.Custom || mode === 'Custom') {
    // Custom mode: use user-specified value, or fall back to default if not provided
    return customFrameHeightIn ?? (drivePulleyDiameterIn + defaultClearance);
  }

  // v1.36: Both Standard and Low Profile use the same default clearance
  return drivePulleyDiameterIn + defaultClearance;
}

/**
 * Snub roller clearance threshold constant (inches)
 *
 * Snub rollers are required when frame height doesn't provide sufficient clearance
 * above the largest pulley. This 2.5" threshold accounts for belt return path
 * geometry and pulley bearing housings in the high-tension zones near pulleys.
 */
export const SNUB_ROLLER_CLEARANCE_THRESHOLD_IN = 2.5;

/**
 * Determine if snub rollers are required
 *
 * Snub rollers handle HIGH-TENSION zones near the drive and tail pulleys.
 * They are required when the frame height doesn't provide enough clearance
 * above the largest pulley for the belt return path.
 *
 * Formula:
 *   requires_snub_rollers = frame_height_in < (largest_pulley_diameter_in + 2.5")
 *
 * Note: Snub rollers do NOT replace all gravity return rollers - they only
 * replace the ones at the ends (near pulleys). Gravity rollers still support
 * the mid-span belt return path.
 *
 * @param effectiveFrameHeightIn - Effective frame height in inches
 * @param drivePulleyDiameterIn - Drive pulley diameter in inches
 * @param tailPulleyDiameterIn - Tail pulley diameter in inches
 * @returns True if snub rollers are required
 */
export function calculateRequiresSnubRollers(
  effectiveFrameHeightIn: number,
  drivePulleyDiameterIn: number,
  tailPulleyDiameterIn: number
): boolean {
  const largestPulleyDiameter = Math.max(drivePulleyDiameterIn, tailPulleyDiameterIn);
  return effectiveFrameHeightIn < (largestPulleyDiameter + SNUB_ROLLER_CLEARANCE_THRESHOLD_IN);
}

// ============================================================================
// v1.14: FRAME CONSTRUCTION THICKNESS
// ============================================================================

/**
 * Resolve frame side thickness from construction type
 *
 * @param constructionType - Frame construction type
 * @param gauge - Sheet metal gauge (required if sheet_metal)
 * @param channelSeries - Structural channel series (required if structural_channel)
 * @returns Thickness in inches, or null for special construction
 */
export function resolveFrameThickness(
  constructionType: FrameConstructionType | undefined,
  gauge: SheetMetalGauge | undefined,
  channelSeries: StructuralChannelSeries | undefined
): number | null {
  // Default to sheet_metal if not specified
  const type = constructionType ?? 'sheet_metal';

  if (type === 'sheet_metal') {
    // Use gauge to derive thickness
    if (gauge && gauge in SHEET_METAL_GAUGE_THICKNESS) {
      return SHEET_METAL_GAUGE_THICKNESS[gauge];
    }
    // Default to 12 gauge if gauge not specified
    return SHEET_METAL_GAUGE_THICKNESS['12_GA'];
  }

  if (type === 'structural_channel') {
    // Use channel series to derive thickness
    if (channelSeries && channelSeries in STRUCTURAL_CHANNEL_THICKNESS) {
      return STRUCTURAL_CHANNEL_THICKNESS[channelSeries];
    }
    // Default to C4 if channel not specified
    return STRUCTURAL_CHANNEL_THICKNESS['C4'];
  }

  // Special construction type - thickness unknown
  return null;
}

/**
 * Gravity return roller spacing constant (inches)
 * Standard spacing for gravity return rollers under the belt return path
 */
export const GRAVITY_ROLLER_SPACING_IN = 60;

/**
 * Calculate the number of gravity return rollers needed
 *
 * Gravity return rollers support the belt in the FREE-SPAN zone (mid-section)
 * of the return path. They are spaced at regular intervals (typically 60" / 5 feet).
 *
 * IMPORTANT: When snub rollers are present, they handle the HIGH-TENSION zones
 * at both ends (near the pulleys). In this case, gravity rollers only cover
 * the mid-span, so we subtract 2 from the total count (one end roller replaced
 * by each snub).
 *
 * Layout:
 *   Without snubs: [gravity]---[gravity]---[gravity]---[gravity]
 *   With snubs:    [snub]---[gravity]---[gravity]---[snub]
 *
 * Formula:
 *   total_positions = floor(conveyor_length_cc_in / spacing) + 1
 *   gravity_count = requiresSnubs ? max(total_positions - 2, 0) : max(total_positions, 2)
 *
 * @param conveyorLengthCcIn - Center-to-center conveyor length in inches
 * @param requiresSnubRollers - Whether snub rollers are required (ends handled by snubs)
 * @param spacingIn - Spacing between rollers (default: 60")
 * @returns Number of gravity return rollers
 */
export function calculateGravityRollerQuantity(
  conveyorLengthCcIn: number,
  requiresSnubRollers: boolean,
  spacingIn: number = GRAVITY_ROLLER_SPACING_IN
): number {
  if (conveyorLengthCcIn <= 0) {
    return 0;
  }

  // Calculate total roller positions based on spacing
  const totalPositions = Math.floor(conveyorLengthCcIn / spacingIn) + 1;

  if (requiresSnubRollers) {
    // Snubs replace the end positions, gravity rollers cover mid-span only
    // If total positions <= 2, snubs handle everything, no gravity rollers needed
    return Math.max(totalPositions - 2, 0);
  }

  // No snubs: gravity rollers at all positions, minimum of 2
  return Math.max(totalPositions, 2);
}

/**
 * Calculate the number of snub rollers needed
 *
 * Snub rollers handle the HIGH-TENSION zones near the drive and tail pulleys.
 * They are required when frame height is below the clearance threshold.
 * Typically 2 rollers are needed (one at each end near the pulleys).
 *
 * Note: Snub rollers replace the END positions of gravity return rollers,
 * so gravity roller count should be reduced by 2 when snubs are present.
 *
 * @param requiresSnubRollers - Whether snub rollers are required
 * @returns Number of snub rollers (0 if not required, 2 if required)
 */
export function calculateSnubRollerQuantity(
  requiresSnubRollers: boolean
): number {
  return requiresSnubRollers ? 2 : 0;
}

/**
 * Calculate all cost flags for frame height configuration
 *
 * @param frameHeightMode - The frame height mode
 * @param effectiveFrameHeightIn - Effective frame height in inches
 * @param requiresSnubRollers - Whether snub rollers are required
 * @returns Object with all cost flag booleans
 */
export function calculateFrameHeightCostFlags(
  frameHeightMode: FrameHeightMode | string | undefined,
  effectiveFrameHeightIn: number,
  requiresSnubRollers: boolean
): {
  cost_flag_low_profile: boolean;
  cost_flag_custom_frame: boolean;
  cost_flag_snub_rollers: boolean;
  cost_flag_design_review: boolean;
} {
  const mode = frameHeightMode ?? FrameHeightMode.Standard;

  return {
    cost_flag_low_profile: mode === FrameHeightMode.LowProfile || mode === 'Low Profile',
    cost_flag_custom_frame: mode === FrameHeightMode.Custom || mode === 'Custom',
    cost_flag_snub_rollers: requiresSnubRollers,
    cost_flag_design_review: effectiveFrameHeightIn < FRAME_HEIGHT_CONSTANTS.DESIGN_REVIEW_THRESHOLD_IN,
  };
}

// ============================================================================
// v1.29: RETURN SUPPORT CONFIGURATION
// ============================================================================

/**
 * Default end offset per end (inches)
 * Distance from pulley center to first return roller center.
 */
export const DEFAULT_RETURN_END_OFFSET_IN = 24;

/**
 * Determine if snub rollers are enabled based on explicit configuration
 *
 * v1.29: This replaces the frame-height-derived logic.
 * Snub roller usage is now an explicit user choice.
 *
 * Auto mode behavior:
 * - Standard frame style → No snubs
 * - Low Profile frame style → Yes snubs
 *
 * @param frameStyle - Return frame style (STANDARD or LOW_PROFILE)
 * @param snubMode - Return snub mode (AUTO, YES, NO)
 * @returns True if snub rollers should be used
 */
export function calculateReturnSnubsEnabled(
  frameStyle: ReturnFrameStyle | string | undefined,
  snubMode: ReturnSnubMode | string | undefined
): boolean {
  const style = frameStyle ?? ReturnFrameStyle.Standard;
  const mode = snubMode ?? ReturnSnubMode.Auto;

  if (mode === ReturnSnubMode.Yes || mode === 'YES') {
    return true;
  }
  if (mode === ReturnSnubMode.No || mode === 'NO') {
    return false;
  }
  // Auto mode: Standard → No, Low Profile → Yes
  return style === ReturnFrameStyle.LowProfile || style === 'LOW_PROFILE';
}

/**
 * Calculate the return span to support with gravity rollers
 *
 * When snubs are enabled, they handle the high-tension zones at each end,
 * so gravity rollers only need to cover the middle section.
 *
 * @param conveyorLengthCcIn - Conveyor center-to-center length in inches
 * @param snubsEnabled - Whether snub rollers are enabled
 * @param endOffsetIn - End offset per end in inches (default: 24")
 * @returns Span in inches that gravity rollers must support
 */
export function calculateReturnSpan(
  conveyorLengthCcIn: number,
  snubsEnabled: boolean,
  endOffsetIn: number = DEFAULT_RETURN_END_OFFSET_IN
): number {
  if (snubsEnabled) {
    // With snubs, gravity rollers don't cover the ends
    // Total reduction = 2 * endOffsetIn (once per end)
    return Math.max(conveyorLengthCcIn - 2 * endOffsetIn, 0);
  }
  return conveyorLengthCcIn;
}

/**
 * Calculate gravity roller centers from span and count
 *
 * @param spanIn - Return span to support in inches
 * @param rollerCount - Number of gravity rollers
 * @returns Spacing between rollers in inches, or null if count < 2
 */
export function calculateGravityRollerCenters(
  spanIn: number,
  rollerCount: number
): number | null {
  if (rollerCount < 2) return null;
  return spanIn / (rollerCount - 1);
}

/**
 * Calculate default gravity roller count from span
 *
 * Uses the standard 60" spacing as a baseline.
 *
 * @param spanIn - Return span to support in inches
 * @returns Default number of gravity rollers
 */
export function calculateDefaultGravityRollerCount(spanIn: number): number {
  if (spanIn <= 0) return 2;
  return Math.max(Math.floor(spanIn / GRAVITY_ROLLER_SPACING_IN) + 1, 2);
}

// ============================================================================
// MASTER CALCULATION FUNCTION
// ============================================================================

/**
 * Execute all calculations in proper dependency order
 *
 * This is a pure function - no side effects, no I/O, no mutations.
 * Given inputs and parameters, it returns outputs.
 */
export function calculate(
  inputs: SliderbedInputs,
  parameters: SliderbedParameters
): SliderbedOutputs {
  // Apply defaults for optional inputs
  // Note: conveyor_incline_deg is not used in current formula set but reserved for future incline calculations
  const partSpacingIn = inputs.part_spacing_in ?? 0;
  const throughputMarginPct = inputs.throughput_margin_pct ?? 0;

  // v1.2: Extract power-user parameters with fallbacks
  const safetyFactor = inputs.safety_factor ?? parameters.safety_factor;
  const startingBeltPullLb = inputs.starting_belt_pull_lb ?? parameters.starting_belt_pull_lb;
  const frictionCoeff = inputs.friction_coeff ?? parameters.friction_coeff;
  const motorRpm = inputs.motor_rpm ?? parameters.motor_rpm;

  // v1.48: Check if belt is explicitly selected (gates belt-dependent outputs)
  const beltSelected = hasBeltSelection(inputs);

  // v1.17: Get effective pulley diameters (override-based, no silent defaults)
  // v1.24: Extended to support pulley family/variant selection
  // If diameters are undefined, use NaN to propagate through calculations
  // Validation layer (rules.ts) will produce errors for missing configurations
  const {
    effectiveDrivePulleyDiameterIn,
    effectiveTailPulleyDiameterIn,
    driveShellOdIn,
    driveFinishedOdIn,
    tailShellOdIn,
    tailFinishedOdIn,
    pulleyResolutionWarnings,
  } = getEffectivePulleyDiameters(inputs);

  // Log pulley resolution warnings in dev/test mode
  if (process.env.NODE_ENV !== 'production' && pulleyResolutionWarnings.length > 0) {
    pulleyResolutionWarnings.forEach((w) => console.warn('[Pulley Resolution]', w));
  }

  const drivePulleyDiameterIn = effectiveDrivePulleyDiameterIn ?? NaN;
  const tailPulleyDiameterIn = effectiveTailPulleyDiameterIn ?? NaN;

  // NaN detection for pulley diameters (these are the upstream source of many NaN issues)
  assertNotNaN(drivePulleyDiameterIn, 'drivePulleyDiameterIn', {
    effectiveDrivePulleyDiameterIn,
    drive_pulley_diameter_in: inputs.drive_pulley_diameter_in,
    drive_pulley_manual_override: inputs.drive_pulley_manual_override ? 1 : 0,
    drive_pulley_variant_key: inputs.drive_pulley_variant_key ? 1 : 0,
  });
  assertNotNaN(tailPulleyDiameterIn, 'tailPulleyDiameterIn', {
    effectiveTailPulleyDiameterIn,
    tail_pulley_diameter_in: inputs.tail_pulley_diameter_in,
    tail_pulley_manual_override: inputs.tail_pulley_manual_override ? 1 : 0,
    tail_pulley_variant_key: inputs.tail_pulley_variant_key ? 1 : 0,
  });

  // Step 1: Belt weight coefficients (v1.3: uses drive pulley for PIW/PIL lookup)
  const { piw, pil, belt_piw_effective, belt_pil_effective } = calculateEffectiveBeltCoefficients(
    drivePulleyDiameterIn, // Use drive pulley for coefficient lookup
    parameters,
    inputs.belt_piw_override,
    inputs.belt_pil_override,
    inputs.belt_piw,
    inputs.belt_pil,
    inputs.belt_coeff_piw,
    inputs.belt_coeff_pil
  );

  // Step 2: Total belt length (v1.3: uses split pulley diameters)
  const totalBeltLengthIn = calculateTotalBeltLengthSplit(
    inputs.conveyor_length_cc_in,
    drivePulleyDiameterIn,
    tailPulleyDiameterIn
  );

  // Step 3: Belt weight (base, before cleats)
  const beltWeightLbfBase = calculateBeltWeight(
    piw,
    pil,
    inputs.belt_width_in,
    totalBeltLengthIn
  );

  // Step 3b: Cleat weight calculation (v1.43)
  const cleatWeightData = calculateCleatWeight(inputs);
  const cleatTotalWeightLbf = cleatWeightData
    ? cleatWeightData.cleat_weight_lb_each * cleatWeightData.cleat_count_actual
    : 0;

  // Effective belt weight (base + cleats)
  const beltWeightLbf = beltWeightLbfBase + cleatTotalWeightLbf;

  // Belt weight per foot calculations
  const beltWeightLbPerFtBase = calculateBeltWeightPerFoot(beltWeightLbfBase, totalBeltLengthIn);
  const cleatWeightLbPerFt = cleatWeightData?.cleat_weight_lb_per_ft ?? 0;
  const beltWeightLbPerFtEffective = beltWeightLbPerFtBase + cleatWeightLbPerFt;

  // =========================================================================
  // v1.29: MATERIAL FORM BRANCHING (PARTS vs BULK)
  // =========================================================================
  // Determine material form (default to PARTS for backwards compatibility)
  const materialFormUsed = (inputs.material_form as MaterialForm | string) ?? MaterialForm.Parts;
  const isBulkMode = materialFormUsed === MaterialForm.Bulk || materialFormUsed === 'BULK';

  // Variables that will be populated differently based on material form
  let partsOnBelt: number;
  let loadOnBeltLbf: number;
  let pitchIn: number;
  let massFlowLbsPerHr: number | undefined;
  let volumeFlowFt3PerHr: number | undefined;
  let densityLbsPerFt3Used: number | undefined;
  let timeOnBeltMin: number | undefined;
  let assumptions: string[] = [];
  let riskFlags: RiskFlag[] = [];

  if (isBulkMode) {
    // BULK MODE: Calculate load from mass flow and residence time
    const bulkResult = calculateBulkLoad(
      inputs,
      inputs.conveyor_length_cc_in,
      inputs.belt_speed_fpm
    );

    // BULK mode doesn't have discrete parts
    partsOnBelt = 0;
    loadOnBeltLbf = bulkResult.loadOnBeltLbf;
    pitchIn = 0; // Not applicable for BULK

    // Capture BULK-specific outputs
    massFlowLbsPerHr = bulkResult.massFlowLbsPerHr;
    volumeFlowFt3PerHr = bulkResult.volumeFlowFt3PerHr;
    densityLbsPerFt3Used = bulkResult.densityLbsPerFt3Used;
    timeOnBeltMin = bulkResult.timeOnBeltMin;
    assumptions = bulkResult.assumptions;
    riskFlags = bulkResult.riskFlags;
  } else {
    // PARTS MODE: Existing calculation (unchanged)
    // v1.48: Use nullish coalescing - validation blocks if these are undefined
    const partLengthIn = inputs.part_length_in ?? 0;
    const partWidthIn = inputs.part_width_in ?? 0;
    const partWeightLbs = inputs.part_weight_lbs ?? 0;

    // Step 4: Parts on belt
    partsOnBelt = calculatePartsOnBelt(
      inputs.conveyor_length_cc_in,
      partLengthIn,
      partWidthIn,
      partSpacingIn,
      inputs.orientation
    );

    // Step 5: Load on belt from parts
    loadOnBeltLbf = calculateLoadOnBelt(partsOnBelt, partWeightLbs);

    // Step 12 (moved here): Pitch (travel dimension + spacing)
    pitchIn = calculatePitch(
      partLengthIn,
      partWidthIn,
      partSpacingIn,
      inputs.orientation
    );
  }

  // Step 6: Total load
  const totalLoadLbf = calculateTotalLoad(beltWeightLbf, loadOnBeltLbf);

  // Step 7: Average load per foot
  const avgLoadPerFt = calculateAvgLoadPerFoot(
    totalLoadLbf,
    inputs.conveyor_length_cc_in
  );

  // Step 8: Legacy belt pull calculation (kept for compatibility)
  const beltPullCalcLb = calculateBeltPull(
    avgLoadPerFt,
    frictionCoeff,
    inputs.conveyor_length_cc_in
  );

  // Step 9: Get incline angle for friction and incline calculations
  const inclineDeg = inputs.conveyor_incline_deg ?? 0;

  // Step 10: Friction pull (uses cos(incline) for normal force component)
  const frictionPullLb = calculateFrictionPull(frictionCoeff, totalLoadLbf, inclineDeg);

  // Step 11: Incline pull (gravitational component = W * sin(θ))
  const inclinePullLb = calculateInclinePull(totalLoadLbf, inclineDeg);

  // Step 12: Total belt pull (friction + incline + starting)
  const totalBeltPullLb = calculateTotalBeltPull(
    frictionPullLb,
    inclinePullLb,
    startingBeltPullLb
  );

  // =========================================================================
  // v1.6: SPEED MODE CALCULATION
  // =========================================================================
  // Determine speed mode (default to belt_speed for new behavior)
  const speedMode = inputs.speed_mode ?? SpeedMode.BeltSpeed;
  const isBeltSpeedMode = speedMode === SpeedMode.BeltSpeed || speedMode === 'belt_speed';

  let beltSpeedFpm: number;
  let driveShaftRpm: number;

  if (isBeltSpeedMode) {
    // Belt Speed mode (v1.6 default): User specifies belt_speed_fpm, derive drive_rpm
    // Formula: drive_rpm = belt_speed_fpm * 12 / (PI * drive_pulley_diameter_in)
    beltSpeedFpm = inputs.belt_speed_fpm;
    driveShaftRpm = calculateDriveShaftRpm(beltSpeedFpm, drivePulleyDiameterIn);
  } else {
    // Drive RPM mode (legacy): User specifies drive_rpm_input, derive belt_speed
    // Use drive_rpm_input if available, otherwise fall back to legacy drive_rpm
    const driveRpmInput = inputs.drive_rpm_input ?? inputs.drive_rpm;
    driveShaftRpm = driveRpmInput;
    beltSpeedFpm = calculateBeltSpeed(driveShaftRpm, drivePulleyDiameterIn);
  }

  // Step 12: Capacity (parts per hour)
  const capacityPph = calculateCapacity(beltSpeedFpm, pitchIn);

  // Step 14: Torque on drive shaft (v1.2: now uses user safety_factor if provided, v1.3: uses drive pulley)
  const torqueDriveShaftInlbf = calculateTorqueDriveShaft(
    totalBeltPullLb,
    drivePulleyDiameterIn,
    safetyFactor
  );

  // Step 15: Gear ratio (v1.2: now uses user motor_rpm if provided)
  const gearRatio = calculateGearRatio(motorRpm, driveShaftRpm);

  // =========================================================================
  // v1.7: CHAIN RATIO STAGE
  // =========================================================================
  // Calculate chain ratio based on gearmotor mounting style
  const mountingStyle = inputs.gearmotor_mounting_style ?? GearmotorMountingStyle.ShaftMounted;
  const isBottomMount = mountingStyle === GearmotorMountingStyle.BottomMount || mountingStyle === 'bottom_mount';

  let chainRatio: number;
  if (isBottomMount) {
    // Chain ratio = driven_teeth / driver_teeth
    // driver = gearmotor sprocket, driven = drive shaft sprocket
    const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
    const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;
    chainRatio = gmTeeth > 0 ? driveTeeth / gmTeeth : 1;
  } else {
    // Shaft-mounted: no chain, ratio = 1
    chainRatio = 1;
  }

  // Gearmotor output RPM required = drive_shaft_rpm * chain_ratio
  const gearmotorOutputRpm = driveShaftRpm * chainRatio;

  // Total drive ratio = gear_ratio * chain_ratio
  const totalDriveRatio = gearRatio * chainRatio;

  // v1.38: Actual belt speed from selected gearmotor
  // Only computed when a gearmotor has been selected (actual_gearmotor_output_rpm is set)
  let actualBeltSpeedFpm: number | null = null;
  let actualBeltSpeedDeltaPct: number | null = null;
  let speedDifferenceFpm: number | null = null; // v1.39: FPM difference (informational only)
  let actualDriveShaftRpm: number | null = null;
  let actualSpeedWarningCode: string | null = null;

  if (
    inputs.actual_gearmotor_output_rpm !== undefined &&
    inputs.actual_gearmotor_output_rpm !== null
  ) {
    // Calculate actual belt speed - function handles all guards and returns warning codes
    const actualSpeedResult = calculateActualBeltSpeed(
      inputs.actual_gearmotor_output_rpm,
      drivePulleyDiameterIn,
      inputs.gm_sprocket_teeth,
      inputs.drive_shaft_sprocket_teeth,
      isBottomMount
    );
    actualBeltSpeedFpm = actualSpeedResult.actualBeltSpeedFpm;
    actualDriveShaftRpm = actualSpeedResult.actualDriveShaftRpm;
    actualSpeedWarningCode = actualSpeedResult.warningCode;

    // Calculate delta vs desired belt speed (only if actual speed was computed)
    if (actualBeltSpeedFpm !== null) {
      actualBeltSpeedDeltaPct = calculateSpeedDeltaPct(beltSpeedFpm, actualBeltSpeedFpm);
      // v1.39: Speed difference in FPM (informational only, no warnings)
      speedDifferenceFpm = actualBeltSpeedFpm - beltSpeedFpm;
    }
  }

  // Step 16: Throughput calculations (optional - only if required_throughput_pph provided)
  let targetPph: number | undefined;
  let meetsThroughput: boolean | undefined;
  let rpmRequiredForTarget: number | undefined;
  let throughputMarginAchievedPct: number | undefined;

  if (inputs.required_throughput_pph !== undefined && inputs.required_throughput_pph > 0) {
    targetPph = calculateTargetThroughput(inputs.required_throughput_pph, throughputMarginPct);
    meetsThroughput = capacityPph >= targetPph;
    rpmRequiredForTarget = calculateRpmRequired(targetPph, pitchIn, drivePulleyDiameterIn);
    throughputMarginAchievedPct = calculateMarginAchieved(capacityPph, inputs.required_throughput_pph);
  }

  // Step 17: Belt tracking & pulley face calculations
  const beltTrackingMethod = inputs.belt_tracking_method ?? BeltTrackingMethod.Crowned;
  const isVGuided = calculateIsVGuided(beltTrackingMethod);
  const pulleyRequiresCrown = calculatePulleyRequiresCrown(isVGuided);
  const pulleyFaceExtraIn = calculatePulleyFaceExtra(isVGuided, parameters);
  // v1.28: Use configured face width from application_pulleys if available
  const pulleyFaceLengthIn = calculatePulleyFaceLength(
    inputs.belt_width_in,
    pulleyFaceExtraIn,
    inputs.drive_pulley_face_width_in
  );

  // Step 18: Shaft diameter calculations (v1.12 - von Mises based)
  // v1.27: Also extract radial_load, T1, T2 for PCI tube stress
  const shaftDiameterMode = inputs.shaft_diameter_mode ?? ShaftDiameterMode.Calculated;

  let driveShaftDiameterIn: number;
  let tailShaftDiameterIn: number;
  let driveShaftSizing: ShaftSizingResult | undefined;
  let tailShaftSizing: ShaftSizingResult | undefined;

  if (shaftDiameterMode === ShaftDiameterMode.Manual || shaftDiameterMode === 'Manual') {
    // Manual mode: use user-specified values
    driveShaftDiameterIn = inputs.drive_shaft_diameter_in ?? 1.0;
    tailShaftDiameterIn = inputs.tail_shaft_diameter_in ?? 1.0;
    // Still compute shaftCalc for radial load / T1 / T2 outputs
    driveShaftSizing = getShaftSizingFromOutputs(
      inputs.belt_width_in,
      drivePulleyDiameterIn,
      totalBeltPullLb,
      true // is drive pulley
    );
    tailShaftSizing = getShaftSizingFromOutputs(
      inputs.belt_width_in,
      tailPulleyDiameterIn,
      totalBeltPullLb,
      false // is tail pulley
    );
  } else {
    // Calculated mode: use von Mises-based shaft sizing
    driveShaftSizing = getShaftSizingFromOutputs(
      inputs.belt_width_in,
      drivePulleyDiameterIn,
      totalBeltPullLb,
      true // is drive pulley
    );
    tailShaftSizing = getShaftSizingFromOutputs(
      inputs.belt_width_in,
      tailPulleyDiameterIn,
      totalBeltPullLb,
      false // is tail pulley
    );

    driveShaftDiameterIn = driveShaftSizing.required_diameter_in;
    tailShaftDiameterIn = tailShaftSizing.required_diameter_in;
  }

  // v1.27: Extract PCI pulley load outputs (wire-only, no new math)
  const drivePulleyResultantLoadLbf = driveShaftSizing?.radial_load_lbf;
  const tailPulleyResultantLoadLbf = tailShaftSizing?.radial_load_lbf;
  const driveT1Lbf = driveShaftSizing?.T1_lbf;
  const driveT2Lbf = driveShaftSizing?.T2_lbf;

  // v1.27: PCI Tube Stress Calculations
  // Auto-populate tube geometry from pulley variant/family if available (Edit #1)
  const driveOD = inputs.drive_tube_od_in ?? driveShellOdIn;
  const driveWall = inputs.drive_tube_wall_in; // TODO: Could auto-populate from family.shell_wall_in
  const tailOD = inputs.tail_tube_od_in ?? tailShellOdIn;
  const tailWall = inputs.tail_tube_wall_in;

  // Hub centers: user override > default to belt width (flagged as estimated) (Edit #2)
  const hubCentersProvided = inputs.hub_centers_in !== undefined;
  const hubCentersIn = inputs.hub_centers_in ?? inputs.belt_width_in;

  // Detect V-groove for stress limit (Edit #4 - documented limitation)
  const isVGroove = detectVGroovePulley(inputs.belt_tracking_method, inputs.v_guide_key);
  const tubeStressLimitPsi = getTubeStressLimit(isVGroove);
  const enforceChecks = inputs.enforce_pci_checks === true;

  // Calculate drive pulley tube stress
  let pciDriveTubeStress: PciTubeStressResult | undefined;
  if (driveOD !== undefined && driveWall !== undefined && drivePulleyResultantLoadLbf !== undefined) {
    pciDriveTubeStress = calculatePciTubeStress(
      {
        tube_od_in: driveOD,
        tube_wall_in: driveWall,
        hub_centers_in: hubCentersIn,
        radial_load_lbf: drivePulleyResultantLoadLbf,
      },
      tubeStressLimitPsi,
      !hubCentersProvided,
      enforceChecks
    );
  }

  // Calculate tail pulley tube stress
  let pciTailTubeStress: PciTubeStressResult | undefined;
  if (tailOD !== undefined && tailWall !== undefined && tailPulleyResultantLoadLbf !== undefined) {
    pciTailTubeStress = calculatePciTubeStress(
      {
        tube_od_in: tailOD,
        tube_wall_in: tailWall,
        hub_centers_in: hubCentersIn,
        radial_load_lbf: tailPulleyResultantLoadLbf,
      },
      tubeStressLimitPsi,
      !hubCentersProvided,
      enforceChecks
    );
  }

  // Determine overall PCI status (worst of drive/tail, or incomplete if neither computed)
  let pciTubeStressStatus: 'pass' | 'estimated' | 'warn' | 'fail' | 'incomplete' | 'error' = 'incomplete';
  let pciTubeStressErrorMessage: string | undefined;

  if (pciDriveTubeStress || pciTailTubeStress) {
    // Priority: error > fail > warn > estimated > pass > incomplete
    const statuses = [pciDriveTubeStress?.status, pciTailTubeStress?.status].filter(Boolean) as string[];
    if (statuses.includes('error')) {
      pciTubeStressStatus = 'error';
      pciTubeStressErrorMessage = pciDriveTubeStress?.error_message ?? pciTailTubeStress?.error_message;
    } else if (statuses.includes('fail')) {
      pciTubeStressStatus = 'fail';
    } else if (statuses.includes('warn')) {
      pciTubeStressStatus = 'warn';
    } else if (statuses.includes('estimated')) {
      pciTubeStressStatus = 'estimated';
    } else if (statuses.includes('pass')) {
      pciTubeStressStatus = 'pass';
    }
  }

  // Step 19: Frame height calculations (v1.5, v1.33: cleat/pulley awareness, v1.34: required vs reference)
  const cleatsEnabledForFrame = inputs.cleats_enabled === true;
  const effectiveCleatHeightIn = getEffectiveCleatHeight(
    cleatsEnabledForFrame,
    inputs.cleat_height_in,
    inputs.cleat_size
  );
  const returnRollerDiameterIn = parameters.return_roller_diameter_in ?? FRAME_HEIGHT_CONSTANTS.DEFAULT_RETURN_ROLLER_DIAMETER_IN;

  // v1.34: Use finished OD from pulley configurator (same source as pulley cards)
  // Priority: driveFinishedOdIn (from variant) > drivePulleyDiameterIn (from inputs sync)
  const driveOdForFrame = driveFinishedOdIn ?? drivePulleyDiameterIn;
  const tailOdForFrame = tailFinishedOdIn ?? tailPulleyDiameterIn;

  // v1.36: Single explicit clearance (user input > parameter default)
  const frameClearanceIn = inputs.frame_clearance_in ?? parameters.frame_clearance_default_in ?? 0.5;

  // v1.33, v1.34, v1.36: Calculate frame height with full breakdown (required + reference)
  const frameHeightBreakdown = calculateFrameHeightWithBreakdown(
    driveOdForFrame,
    tailOdForFrame,
    effectiveCleatHeightIn,
    returnRollerDiameterIn,
    inputs.frame_height_mode,
    inputs.custom_frame_height_in,
    frameClearanceIn
  );

  // v1.34: Extract both required and reference heights
  const requiredFrameHeightIn = frameHeightBreakdown.required_total_in;
  const referenceFrameHeightIn = frameHeightBreakdown.reference_total_in;
  const clearanceForStandardIn = frameHeightBreakdown.clearance_in;
  const largestPulleyOdIn = frameHeightBreakdown.largest_pulley_in;

  // Legacy outputs for backward compatibility
  const effectiveFrameHeightIn = frameHeightBreakdown.total_in;
  const largestPulleyDiameterIn = frameHeightBreakdown.largest_pulley_in;

  // v1.5 FIX: Use largest pulley + 2.5" threshold for snub roller requirement
  const requiresSnubRollers = calculateRequiresSnubRollers(
    effectiveFrameHeightIn,
    drivePulleyDiameterIn,
    tailPulleyDiameterIn
  );
  const costFlags = calculateFrameHeightCostFlags(
    inputs.frame_height_mode,
    effectiveFrameHeightIn,
    requiresSnubRollers
  );

  // Step 20: Return Support configuration (v1.29)
  // Explicit user selection replaces frame-height-derived snub roller logic
  const returnSnubsEnabled = calculateReturnSnubsEnabled(
    inputs.return_frame_style,
    inputs.return_snub_mode
  );
  const returnEndOffsetIn = inputs.return_end_offset_in ?? DEFAULT_RETURN_END_OFFSET_IN;
  const returnSpanIn = calculateReturnSpan(
    inputs.conveyor_length_cc_in,
    returnSnubsEnabled,
    returnEndOffsetIn
  );
  // Use user-specified count or calculate default from span
  const returnGravityRollerCount =
    inputs.return_gravity_roller_count ??
    calculateDefaultGravityRollerCount(returnSpanIn);
  const returnGravityRollerCentersIn = calculateGravityRollerCenters(
    returnSpanIn,
    returnGravityRollerCount
  );

  // Step 20b: Legacy roller quantities (kept for backwards compatibility)
  // Note: snub_roller_quantity and gravity_roller_quantity are legacy outputs
  const snubRollerQuantity = calculateSnubRollerQuantity(returnSnubsEnabled);
  const gravityRollerQuantity = returnGravityRollerCount;

  // Step 21: Belt minimum pulley diameter requirements (v1.11)
  // Determine base minimum pulley diameter based on belt spec and tracking method
  const minPulleyBaseFromBelt = isVGuided
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;

  // Step 21a: V-guide min pulley diameter (v1.27)
  // Select PU, PVC, or FLEECE values based on belt family
  const beltFamily = inputs.belt_family ?? 'PVC';
  let vguideMinPulleyDiaIn: number | undefined;
  let vguidePuDataMissing = false;
  // Note: FLEECE belts have no V-guide rules - vguideMinPulleyDiaIn stays undefined
  // Warning is emitted in applyApplicationRules()

  if (isVGuided && inputs.v_guide_key) {
    // V-guide is selected - determine which min pulley value to use
    // For now, use "solid" values (notched belt support can be added later)
    if (beltFamily === 'FLEECE') {
      // FLEECE belt - no V-guide rules defined (v1.27)
      // Leave vguideMinPulleyDiaIn undefined - warning emitted in applyApplicationRules
    } else if (beltFamily === 'PU') {
      // PU belt - try PU values first
      if (inputs.vguide_min_pulley_dia_solid_pu_in != null) {
        vguideMinPulleyDiaIn = inputs.vguide_min_pulley_dia_solid_pu_in;
      } else {
        // PU values not available - flag as missing
        vguidePuDataMissing = true;
        // Fall back to PVC values (validation will emit error)
        vguideMinPulleyDiaIn = inputs.vguide_min_pulley_dia_solid_in;
      }
    } else {
      // PVC belt - use PVC values
      vguideMinPulleyDiaIn = inputs.vguide_min_pulley_dia_solid_in;
    }
  }

  // Step 21b: Apply cleat spacing multiplier for hot-welded cleats (v1.11 Phase 4)
  // This is the LEGACY approach using inputs.cleat_spacing_in
  // Multiplier applies when:
  // 1. Belt has a minimum requirement (belt is selected)
  // 2. Cleats are enabled
  // 3. Belt uses hot_welded cleat method
  const cleatsEnabled = inputs.cleats_enabled === true;
  const isHotWeldedCleats = inputs.belt_cleat_method === 'hot_welded';
  const cleatSpacingIn = inputs.cleat_spacing_in ?? 12; // Default to 12" if not specified

  let cleatSpacingMultiplier: number | undefined;
  let minPulleyDriveRequiredIn: number | undefined;
  let minPulleyTailRequiredIn: number | undefined;

  if (minPulleyBaseFromBelt !== undefined) {
    if (cleatsEnabled && isHotWeldedCleats) {
      // Apply multiplier and round UP to nearest 0.25"
      cleatSpacingMultiplier = getCleatSpacingMultiplier(cleatSpacingIn);
      const adjustedMin = roundUpToIncrement(
        minPulleyBaseFromBelt * cleatSpacingMultiplier,
        0.25
      );
      minPulleyDriveRequiredIn = adjustedMin;
      minPulleyTailRequiredIn = adjustedMin; // Same as drive in v1.11
    } else {
      // No multiplier - use base value
      cleatSpacingMultiplier = undefined;
      minPulleyDriveRequiredIn = minPulleyBaseFromBelt;
      minPulleyTailRequiredIn = minPulleyBaseFromBelt;
    }
  }

  // Step 21c: v1.23 Cleats Catalog-Driven Min Pulley Diameter
  // This is the NEW approach using cleat_profile, cleat_size, cleat_pattern, cleat_style, cleat_centers_in
  // When catalog fields are populated, use catalog lookup; otherwise outputs are undefined
  let cleatsBaseMinPulleyDia12In: number | undefined;
  let cleatsCentersFactor: number | undefined;
  let cleatsMinPulleyDiaIn: number | undefined;
  let cleatsRuleSource: string | undefined;
  let cleatsDrillSipedCaution = false;

  // Only compute if cleats are enabled AND catalog fields are populated
  if (
    cleatsEnabled &&
    inputs.cleat_profile &&
    inputs.cleat_size &&
    inputs.cleat_pattern
  ) {
    const cleatCatalog = getCachedCleatCatalog();
    const centerFactors = getCachedCleatCenterFactors();

    if (cleatCatalog && centerFactors && cleatCatalog.length > 0 && centerFactors.length > 0) {
      const materialFamily = inputs.cleat_material_family ?? DEFAULT_CLEAT_MATERIAL_FAMILY;
      const style = (inputs.cleat_style ?? 'SOLID') as CleatStyle;
      const centersIn = (inputs.cleat_centers_in ?? 12) as CleatCenters;

      const result = lookupCleatsMinPulleyDia(
        cleatCatalog,
        centerFactors,
        materialFamily,
        inputs.cleat_profile,
        inputs.cleat_size,
        inputs.cleat_pattern as CleatPattern,
        style,
        centersIn
      );

      if (result.success && result.roundedMinDia !== null) {
        cleatsBaseMinPulleyDia12In = result.baseMinDia12In ?? undefined;
        cleatsCentersFactor = result.centersFactor;
        cleatsMinPulleyDiaIn = result.roundedMinDia;
        cleatsRuleSource = result.ruleSource;
        cleatsDrillSipedCaution = result.drillSipedCaution;
      }
      // If lookup fails, outputs remain undefined (validation will catch missing catalog entry)
    }
  }

  // Step 21d: Aggregate required min pulley diameter (v1.26)
  // required_min_pulley_diameter_in = max(belt_min, vguide_min, cleats_min)
  // v1.26: Now includes V-guide min pulley requirement separately
  const requiredMinPulleyDiaIn = Math.max(
    minPulleyDriveRequiredIn ?? 0,
    vguideMinPulleyDiaIn ?? 0,
    cleatsMinPulleyDiaIn ?? 0
  ) || undefined; // Return undefined if all are 0/undefined

  // Check if current pulleys meet the minimum (undefined if no belt selected)
  const drivePulleyMeetsMinimum = minPulleyDriveRequiredIn !== undefined
    ? drivePulleyDiameterIn >= minPulleyDriveRequiredIn
    : undefined;
  const tailPulleyMeetsMinimum = minPulleyTailRequiredIn !== undefined
    ? tailPulleyDiameterIn >= minPulleyTailRequiredIn
    : undefined;

  // Step 22: Tracking recommendation (v1.13)
  const trackingRecommendation = calculateTrackingRecommendation({
    conveyor_length_cc_in: inputs.conveyor_length_cc_in,
    belt_width_in: inputs.belt_width_in,
    application_class: inputs.application_class,
    belt_construction: inputs.belt_construction,
    reversing_operation: inputs.reversing_operation,
    disturbance_side_loading: inputs.disturbance_side_loading,
    disturbance_load_variability: inputs.disturbance_load_variability,
    disturbance_environment: inputs.disturbance_environment,
    disturbance_installation_risk: inputs.disturbance_installation_risk,
    tracking_preference: inputs.tracking_preference,
  });

  // Return all outputs
  // v1.48: Belt-dependent outputs are gated to null when no belt is selected
  return {
    // Intermediate outputs
    parts_on_belt: partsOnBelt,
    load_on_belt_lbf: loadOnBeltLbf,
    belt_weight_lbf: beltSelected ? beltWeightLbf : null,
    total_load_lbf: beltSelected ? totalLoadLbf : null,
    total_belt_length_in: totalBeltLengthIn,
    friction_pull_lb: beltSelected ? frictionPullLb : null,
    incline_pull_lb: beltSelected ? inclinePullLb : null,
    starting_belt_pull_lb: startingBeltPullLb,
    total_belt_pull_lb: beltSelected ? totalBeltPullLb : null,
    belt_pull_calc_lb: beltSelected ? beltPullCalcLb : null,
    piw_used: beltSelected ? piw : null,
    pil_used: beltSelected ? pil : null,
    belt_piw_effective: beltSelected ? belt_piw_effective : undefined,
    belt_pil_effective: beltSelected ? belt_pil_effective : undefined,

    // v1.6: Speed mode
    speed_mode_used: speedMode,

    // v1.29: Material Form & BULK outputs
    material_form_used: materialFormUsed as MaterialForm,
    mass_flow_lbs_per_hr: massFlowLbsPerHr,
    volume_flow_ft3_per_hr: volumeFlowFt3PerHr,
    density_lbs_per_ft3_used: densityLbsPerFt3Used,
    time_on_belt_min: timeOnBeltMin,
    assumptions,
    risk_flags: riskFlags,

    // Throughput outputs (PARTS mode only when non-zero)
    pitch_in: pitchIn,
    belt_speed_fpm: beltSpeedFpm,
    capacity_pph: capacityPph,
    target_pph: targetPph,
    meets_throughput: meetsThroughput,
    rpm_required_for_target: rpmRequiredForTarget,
    throughput_margin_achieved_pct: throughputMarginAchievedPct,

    // Final outputs
    drive_shaft_rpm: driveShaftRpm,
    torque_drive_shaft_inlbf: beltSelected ? torqueDriveShaftInlbf : null,
    gear_ratio: gearRatio,

    // v1.7: Chain ratio stage
    chain_ratio: chainRatio,
    gearmotor_output_rpm: gearmotorOutputRpm,
    total_drive_ratio: totalDriveRatio,

    // v1.38: Explicit speed chain outputs (required vs actual)
    // Required: computed from desired belt speed
    required_drive_shaft_rpm: driveShaftRpm,
    required_gearmotor_output_rpm: gearmotorOutputRpm,
    // Actual: computed from selected/configured gearmotor
    actual_belt_speed_fpm: actualBeltSpeedFpm,
    actual_belt_speed_delta_pct: actualBeltSpeedDeltaPct,
    speed_difference_fpm: speedDifferenceFpm,
    actual_drive_shaft_rpm: actualDriveShaftRpm,
    actual_speed_warning_code: actualSpeedWarningCode,

    safety_factor_used: safetyFactor,
    starting_belt_pull_lb_used: startingBeltPullLb,
    friction_coeff_used: frictionCoeff,
    motor_rpm_used: motorRpm,

    // Belt tracking & pulley outputs
    is_v_guided: isVGuided,
    pulley_requires_crown: pulleyRequiresCrown,
    pulley_face_extra_in: pulleyFaceExtraIn,
    pulley_face_length_in: pulleyFaceLengthIn,
    drive_shaft_diameter_in: driveShaftDiameterIn,
    tail_shaft_diameter_in: tailShaftDiameterIn,

    // v1.37: Shaft step-down pass-through
    drive_shaft_stepdown_to_dia_in: inputs.drive_shaft_stepdown_to_dia_in,
    drive_shaft_stepdown_left_len_in: inputs.drive_shaft_stepdown_left_len_in,
    drive_shaft_stepdown_right_len_in: inputs.drive_shaft_stepdown_right_len_in,
    tail_shaft_stepdown_to_dia_in: inputs.tail_shaft_stepdown_to_dia_in,
    tail_shaft_stepdown_left_len_in: inputs.tail_shaft_stepdown_left_len_in,
    tail_shaft_stepdown_right_len_in: inputs.tail_shaft_stepdown_right_len_in,

    // v1.3: Split pulley diameters
    drive_pulley_diameter_in: drivePulleyDiameterIn,
    tail_pulley_diameter_in: tailPulleyDiameterIn,

    // v1.24: Pulley family/variant outputs
    drive_pulley_shell_od_in: driveShellOdIn,
    tail_pulley_shell_od_in: tailShellOdIn,
    drive_pulley_finished_od_in: driveFinishedOdIn,
    tail_pulley_finished_od_in: tailFinishedOdIn,

    // v1.11: Belt minimum pulley diameter outputs
    min_pulley_drive_required_in: minPulleyDriveRequiredIn,
    min_pulley_tail_required_in: minPulleyTailRequiredIn,
    drive_pulley_meets_minimum: drivePulleyMeetsMinimum,
    tail_pulley_meets_minimum: tailPulleyMeetsMinimum,

    // v1.11 Phase 4: Cleat spacing multiplier outputs (legacy)
    min_pulley_base_in: minPulleyBaseFromBelt,
    cleat_spacing_multiplier: cleatSpacingMultiplier,

    // v1.3: Cleats (spec-only, no calculation impact)
    cleats_enabled: inputs.cleats_enabled ?? false,
    cleats_summary: buildCleatsSummary(inputs),

    // v1.23: Cleats catalog-driven outputs
    cleats_base_min_pulley_diameter_12in_in: cleatsBaseMinPulleyDia12In,
    cleats_centers_factor: cleatsCentersFactor,
    cleats_min_pulley_diameter_in: cleatsMinPulleyDiaIn,
    cleats_rule_source: cleatsRuleSource,
    cleats_drill_siped_caution: cleatsDrillSipedCaution,

    // v1.43: Cleat weight & spacing outputs
    cleat_width_in: cleatWeightData?.cleat_width_in,
    cleat_weight_lb_each: cleatWeightData?.cleat_weight_lb_each,
    cleat_pitch_in: cleatWeightData?.cleat_pitch_in,
    cleat_count_actual: cleatWeightData?.cleat_count_actual,
    cleat_odd_gap_in: cleatWeightData?.cleat_odd_gap_in,
    cleat_weight_lb_per_ft: cleatWeightLbPerFt > 0 ? cleatWeightLbPerFt : undefined,
    belt_weight_lb_per_ft_base: beltWeightLbPerFtBase,
    belt_weight_lb_per_ft_effective: beltWeightLbPerFtEffective,
    cleat_layout_summary: cleatWeightData?.cleat_layout_summary,

    // v1.26: V-guide min pulley outputs
    belt_family_used: beltFamily,
    vguide_min_pulley_dia_in: vguideMinPulleyDiaIn,
    vguide_pu_data_missing: vguidePuDataMissing,

    // Aggregate required min pulley diameter
    required_min_pulley_diameter_in: requiredMinPulleyDiaIn,

    // v1.5, v1.33, v1.34: Frame height & snub roller outputs (with breakdown + required/reference)
    largest_pulley_diameter_in: largestPulleyDiameterIn, // Legacy, kept for backward compatibility
    largest_pulley_od_in: largestPulleyOdIn, // v1.34: Uses actual configured pulley OD
    effective_cleat_height_in: effectiveCleatHeightIn,
    required_frame_height_in: requiredFrameHeightIn, // v1.34: Physical envelope
    reference_frame_height_in: referenceFrameHeightIn, // v1.34: With clearance for selected standard
    clearance_for_selected_standard_in: clearanceForStandardIn, // v1.34: Clearance based on frame standard
    effective_frame_height_in: effectiveFrameHeightIn, // Legacy, kept for backward compatibility
    frame_height_breakdown: frameHeightBreakdown,
    requires_snub_rollers: requiresSnubRollers,
    ...costFlags,

    // v1.5: Roller quantities (legacy - kept for backwards compatibility)
    gravity_roller_quantity: gravityRollerQuantity,
    gravity_roller_spacing_in: GRAVITY_ROLLER_SPACING_IN,
    snub_roller_quantity: snubRollerQuantity,

    // v1.29: Return Support outputs (explicit user configuration)
    return_snubs_enabled: returnSnubsEnabled,
    return_span_in: returnSpanIn,
    return_gravity_roller_count: returnGravityRollerCount,
    return_gravity_roller_centers_in: returnGravityRollerCentersIn ?? undefined,
    return_gravity_roller_diameter_in: inputs.return_gravity_roller_diameter_in ?? 1.9,
    return_snub_roller_diameter_in: returnSnubsEnabled
      ? (inputs.return_snub_roller_diameter_in ?? 2.5)
      : undefined,
    return_frame_style: (inputs.return_frame_style ?? ReturnFrameStyle.Standard) as ReturnFrameStyle,
    return_snub_mode: (inputs.return_snub_mode ?? ReturnSnubMode.Auto) as ReturnSnubMode,
    return_end_offset_in: returnEndOffsetIn,

    // v1.13: Tracking recommendation outputs
    tracking_lw_ratio: trackingRecommendation.tracking_lw_ratio,
    tracking_lw_band: trackingRecommendation.tracking_lw_band,
    tracking_disturbance_count: trackingRecommendation.tracking_disturbance_count,
    tracking_disturbance_severity_raw: trackingRecommendation.tracking_disturbance_severity_raw,
    tracking_disturbance_severity_modified: trackingRecommendation.tracking_disturbance_severity_modified,
    tracking_mode_recommended: trackingRecommendation.tracking_mode_recommended,
    tracking_recommendation_note: trackingRecommendation.tracking_recommendation_note,
    tracking_recommendation_rationale: trackingRecommendation.tracking_recommendation_rationale,

    // v1.14: Frame construction outputs
    frame_construction_type: inputs.frame_construction_type,
    frame_side_thickness_in: resolveFrameThickness(
      inputs.frame_construction_type,
      inputs.frame_sheet_metal_gauge,
      inputs.frame_structural_channel_series
    ),
    pulley_end_to_frame_inside_out_in: inputs.pulley_end_to_frame_inside_in,

    // v1.27: PCI Pulley Load outputs (wired from shaftCalc)
    drive_pulley_resultant_load_lbf: drivePulleyResultantLoadLbf,
    tail_pulley_resultant_load_lbf: tailPulleyResultantLoadLbf,
    drive_T1_lbf: driveT1Lbf,
    drive_T2_lbf: driveT2Lbf,

    // v1.27: PCI Tube Stress outputs
    pci_drive_tube_stress_psi: pciDriveTubeStress?.stress_psi,
    pci_tail_tube_stress_psi: pciTailTubeStress?.stress_psi,
    pci_tube_stress_limit_psi: (pciDriveTubeStress || pciTailTubeStress) ? tubeStressLimitPsi : undefined,
    pci_tube_stress_status: pciTubeStressStatus,
    pci_tube_stress_error_message: pciTubeStressErrorMessage,
    pci_hub_centers_estimated: !hubCentersProvided,
  };
}
